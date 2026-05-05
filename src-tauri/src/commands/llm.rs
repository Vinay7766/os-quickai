// ─────────────────────────────────────────────────────────────────────────────
// llm.rs — AI model query handler
// ─────────────────────────────────────────────────────────────────────────────
// Routes user queries to the appropriate AI provider:
//   • Free models  → Pollinations AI (no API key required)
//   • Paid models   → Direct provider APIs (requires user's own API key)
//
// Free models are powered by Pollinations.ai, which provides an OpenAI-
// compatible endpoint at no cost, making it ideal for users who want to
// try the app without setting up API keys.
// ─────────────────────────────────────────────────────────────────────────────

use crate::error::AppError;
use reqwest::Client;
use serde_json::{json, Value};

// ── Free Model Names ─────────────────────────────────────────────────────────
// These are the user-facing model names shown in the UI.
// They map to actual model IDs on the Pollinations API.

/// Maps a user-friendly free model name to the Pollinations model ID.
fn free_model_id(model: &str) -> &str {
    match model {
        "qwen-3.6"   => "openai-fast",   // Best available on Pollinations
        "nemotron"   => "openai-fast",   // Uses GPT-OSS 20B reasoning model
        _            => "openai-fast",   // Default (minimax-2.5 and fallback)
    }
}

/// Checks if a given model name is one of the free (no-key) models.
fn is_free_model(model: &str) -> bool {
    matches!(model, "minimax-2.5" | "qwen-3.6" | "nemotron")
}

// ── Pollinations API Helper ──────────────────────────────────────────────────
// Pollinations.ai provides free, anonymous access to LLMs via an OpenAI-
// compatible chat completions endpoint. No API key is needed.

/// Sends a query to the Pollinations AI API and returns the response text.
/// Returns `None` if the request fails or returns an empty response.
async fn query_pollinations(client: &Client, query: &str, model: &str) -> Option<String> {
    let response = client
        .post("https://text.pollinations.ai/openai")
        .json(&json!({
            "model": model,
            "private": true,
            "messages": [
                {
                    "role": "system",
                    "content": "You are a concise, helpful assistant. Give clear, well-structured answers. Use markdown formatting for code blocks."
                },
                {
                    "role": "user",
                    "content": query
                }
            ]
        }))
        .send()
        .await
        .ok()?;

    // Only process successful responses
    if !response.status().is_success() {
        return None;
    }

    let body: Value = response.json().await.ok()?;
    let content = body["choices"][0]["message"]["content"]
        .as_str()
        .filter(|s| !s.is_empty())?;

    // ── Clean Response ───────────────────────────────────────────────────
    // Remove any attribution signatures or "ads" that the API might inject.
    let cleaned = content
        .replace("Powered by Pollinations.ai", "")
        .replace("Powered by Pollinations", "")
        .replace("pollinations.ai", "")
        .replace("Pollinations.ai", "")
        .replace("Check out Pollinations", "")
        .replace("Visit text.pollinations.ai", "")
        .replace("(Note: This answer was generated using Pollinations AI)", "")
        .trim()
        .to_string();

    if cleaned.is_empty() { None } else { Some(cleaned) }
}

// ── Main Query Handler ───────────────────────────────────────────────────────

/// Lists available Gemini models using the provided API key.
#[tauri::command]
pub async fn list_gemini_models(api_key: String) -> Result<Vec<String>, AppError> {
    if api_key.is_empty() {
        return Err(AppError::InvalidApiKey);
    }

    let client = Client::new();
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models?key={}",
        api_key
    );

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| AppError::NetworkError(e.to_string()))?;

    if response.status().is_success() {
        let body: Value = response.json().await.map_err(|e| AppError::NetworkError(e.to_string()))?;
        let models = body["models"]
            .as_array()
            .ok_or_else(|| AppError::NetworkError("Failed to parse models list".to_string()))?
            .iter()
            .filter_map(|m| {
                let name = m["name"].as_str()?;
                // Only return models that support content generation
                if m["supportedGenerationMethods"]
                    .as_array()?
                    .iter()
                    .any(|g| g.as_str() == Some("generateContent"))
                {
                    Some(name.replace("models/", ""))
                } else {
                    None
                }
            })
            .collect();
        Ok(models)
    } else {
        Err(AppError::ProviderError {
            status: response.status().as_u16(),
            message: response.text().await.unwrap_or_default(),
        })
    }
}

/// The main Tauri command that the frontend calls to get AI responses.
#[tauri::command]
pub async fn query_llm(query: String, model: String, api_key: String) -> Result<String, AppError> {
    if query.len() > 4000 {
        return Err(AppError::NetworkError(
            "Query is too long. Please limit your query to 4000 characters.".to_string()
        ));
    }

    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .user_agent("Quickno/1.0 (Desktop AI Assistant)")
        .build()
        .map_err(|e| AppError::NetworkError(e.to_string()))?;

    // ── Free Models ──────────────────────────────────────────────────────
    if is_free_model(&model) {
        let target_model = free_model_id(&model);
        if let Some(answer) = query_pollinations(&client, &query, target_model).await {
            return Ok(answer);
        }
        let fallback_models = ["openai-fast", "openai"];
        for fallback in fallback_models {
            if let Some(answer) = query_pollinations(&client, &query, fallback).await {
                return Ok(answer);
            }
        }
        return Err(AppError::ProviderError {
            status: 503,
            message: "Free model service is unavailable. Please try again or use a premium model.".into(),
        });
    }

    // ── Paid Models ──────────────────────────────────────────────────────
    if api_key.is_empty() {
        return Err(AppError::InvalidApiKey);
    }

    // Determine provider based on model name or external knowledge
    // We try to be smart about routing based on the model ID prefix or name
    let is_gemini = model.contains("gemini") || model.contains("learnlm");
    let is_claude = model.contains("claude");
    let is_grok = model.contains("grok");

    if is_gemini {
        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
            model, api_key
        );
        let response = client
            .post(&url)
            .json(&json!({"contents": [{"parts": [{"text": &query}]}]}))
            .send()
            .await
            .map_err(|e| AppError::NetworkError(e.to_string()))?;

        if response.status().is_success() {
            let body: Value = response.json().await.map_err(|e| AppError::NetworkError(e.to_string()))?;
            return Ok(body["candidates"][0]["content"]["parts"][0]["text"]
                .as_str()
                .unwrap_or("(no response)")
                .to_string());
        } else {
            return Err(AppError::ProviderError {
                status: response.status().as_u16(),
                message: response.text().await.unwrap_or_default(),
            });
        }
    }

    if is_claude {
        let response = client
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", &api_key)
            .header("anthropic-version", "2023-06-01")
            .json(&json!({
                "model": model,
                "max_tokens": 2048,
                "system": "You are a concise, helpful assistant. Use markdown for code.",
                "messages": [{"role": "user", "content": &query}]
            }))
            .send()
            .await
            .map_err(|e| AppError::NetworkError(e.to_string()))?;

        if response.status().is_success() {
            let body: Value = response.json().await.map_err(|e| AppError::NetworkError(e.to_string()))?;
            return Ok(body["content"][0]["text"].as_str().unwrap_or("(no response)").to_string());
        } else {
            return Err(AppError::ProviderError {
                status: response.status().as_u16(),
                message: response.text().await.unwrap_or_default(),
            });
        }
    }

    // Default to OpenAI-compatible (ChatGPT, Grok, etc.)
    let endpoint = if is_grok {
        "https://api.x.ai/v1/chat/completions"
    } else {
        "https://api.openai.com/v1/chat/completions"
    };

    let response = client
        .post(endpoint)
        .bearer_auth(&api_key)
        .json(&json!({
            "model": model,
            "messages": [
                {"role": "system", "content": "You are a concise, helpful assistant. Use markdown for code."},
                {"role": "user", "content": &query}
            ]
        }))
        .send()
        .await
        .map_err(|e| AppError::NetworkError(e.to_string()))?;

    match response.status().as_u16() {
        200 => {
            let body: Value = response.json().await.map_err(|e| AppError::NetworkError(e.to_string()))?;
            Ok(body["choices"][0]["message"]["content"]
                .as_str()
                .unwrap_or("(no response)")
                .to_string())
        }
        401 => Err(AppError::InvalidApiKey),
        429 => Err(AppError::RateLimitExceeded),
        s => Err(AppError::ProviderError {
            status: s,
            message: response.text().await.unwrap_or_default(),
        }),
    }
}

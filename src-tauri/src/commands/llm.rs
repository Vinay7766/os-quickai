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

/// The main Tauri command that the frontend calls to get AI responses.
///
/// # Arguments
/// * `query`   - The user's question or prompt
/// * `model`   - The selected model identifier (e.g., "minimax-2.5" or "gpt-4o")
/// * `api_key` - The user's API key (empty string for free models)
///
/// # Returns
/// The AI model's response text, or an error if the request fails.
#[tauri::command]
pub async fn query_llm(query: String, model: String, api_key: String) -> Result<String, AppError> {
    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .user_agent("Quickno/1.0 (Desktop AI Assistant)")
        .build()
        .map_err(|e| AppError::NetworkError(e.to_string()))?;

    // ── Free Models (Pollinations API) ───────────────────────────────────
    if is_free_model(&model) {
        let target_model = free_model_id(&model);

        // Try the requested model first
        if let Some(answer) = query_pollinations(&client, &query, target_model).await {
            return Ok(answer);
        }

        // If the primary attempt fails, try alternative model IDs as fallback
        let fallback_models = ["openai-fast", "openai"];
        for fallback in fallback_models {
            if let Some(answer) = query_pollinations(&client, &query, fallback).await {
                return Ok(answer);
            }
        }

        return Err(AppError::ProviderError {
            status: 503,
            message: "Free model service is temporarily unavailable. Please try again in a moment, or use a premium model with your own API key.".into(),
        });
    }

    // ── Paid Models (Direct Provider APIs) ───────────────────────────────
    // All paid models require the user to provide their own API key (BYOK).

    // ── Claude (Anthropic) ───────────────────────────────────────────────
    if model == "claude-3-opus" {
        if api_key.is_empty() {
            return Err(AppError::InvalidApiKey);
        }

        let response = client
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", &api_key)
            .header("anthropic-version", "2023-06-01")
            .json(&json!({
                "model": "claude-3-opus-20240229",
                "max_tokens": 2048,
                "system": "You are a concise, helpful assistant. Use markdown for code.",
                "messages": [{"role": "user", "content": &query}]
            }))
            .send()
            .await
            .map_err(|e| AppError::NetworkError(e.to_string()))?;

        return if response.status().is_success() {
            let body: Value = response.json().await.map_err(|e| AppError::NetworkError(e.to_string()))?;
            Ok(body["content"][0]["text"].as_str().unwrap_or("(no response)").to_string())
        } else {
            Err(AppError::ProviderError {
                status: response.status().as_u16(),
                message: response.text().await.unwrap_or_default(),
            })
        };
    }

    // ── Gemini (Google) ──────────────────────────────────────────────────
    if model == "gemini-1.5-pro" {
        if api_key.is_empty() {
            return Err(AppError::InvalidApiKey);
        }

        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key={}",
            api_key
        );

        let response = client
            .post(&url)
            .json(&json!({"contents": [{"parts": [{"text": &query}]}]}))
            .send()
            .await
            .map_err(|e| AppError::NetworkError(e.to_string()))?;

        return if response.status().is_success() {
            let body: Value = response.json().await.map_err(|e| AppError::NetworkError(e.to_string()))?;
            Ok(body["candidates"][0]["content"]["parts"][0]["text"]
                .as_str()
                .unwrap_or("(no response)")
                .to_string())
        } else {
            Err(AppError::ProviderError {
                status: response.status().as_u16(),
                message: response.text().await.unwrap_or_default(),
            })
        };
    }

    // ── OpenAI (ChatGPT) / Grok (xAI) ───────────────────────────────────
    // Both use OpenAI-compatible chat completions endpoints.
    if api_key.is_empty() {
        return Err(AppError::InvalidApiKey);
    }

    let (endpoint, actual_model) = if model.starts_with("grok") {
        ("https://api.x.ai/v1/chat/completions", "grok-beta")
    } else {
        ("https://api.openai.com/v1/chat/completions", model.as_str())
    };

    let response = client
        .post(endpoint)
        .bearer_auth(&api_key)
        .json(&json!({
            "model": actual_model,
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

// Copyright 2026 Vinay7766
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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


/// Checks if a given model name is one of the free (no-key) models.
fn is_free_model(model: &str) -> bool {
    matches!(model, "free-model" | "openai-fast")
}

// ── Pollinations API Helper ──────────────────────────────────────────────────
// Pollinations.ai provides free, anonymous access to LLMs via an OpenAI-
// compatible chat completions endpoint. No API key is needed.

/// Sends a query to the Pollinations AI API and returns the response text.
/// Returns `None` if the request fails or returns an empty response.
/// Sends a query to the Pollinations AI API and returns the response text.
/// Returns the response or an error code so we can retry on 503.
async fn query_pollinations(client: &Client, query: &str, model: &str) -> Result<String, (u16, String)> {
    // ── Attempt 1: Primary OpenAI-compatible Endpoint ────────────────────────
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
        .await;

    match response {
        Ok(res) if res.status().is_success() => {
            let body: Value = res.json().await.map_err(|e| (500, e.to_string()))?;
            let content = body["choices"][0]["message"]["content"]
                .as_str()
                .filter(|s| !s.is_empty())
                .ok_or_else(|| (500, "Empty response from AI".to_string()))?;
            return Ok(clean_pollinations_response(content));
        }
        _ => {
            // ── Attempt 2: Failover to Anonymous GET Endpoint ────────────────
            // This endpoint is often on a different server/queue and might be up
            // even if the OpenAI-compatible one is full.
            let encoded_query = urlencoding::encode(query);
            let url = format!("https://text.pollinations.ai/{}?model={}&system={}", 
                encoded_query, 
                model,
                urlencoding::encode("You are a concise, helpful assistant.")
            );

            let failover_res = client.get(&url).send().await.map_err(|e| (500, e.to_string()))?;
            
            if failover_res.status().is_success() {
                let content = failover_res.text().await.map_err(|e| (500, e.to_string()))?;
                if !content.is_empty() {
                    return Ok(clean_pollinations_response(&content));
                }
            }
            
            // If both fail, return the original error status if possible
            Err((500, "Free AI models are currently experiencing high demand. Please try again in a few minutes or use your own API key in Settings.".to_string()))
        }
    }
}

/// Helper to remove branding from Pollinations responses.
fn clean_pollinations_response(content: &str) -> String {
    content
        .replace("Powered by Pollinations.ai", "")
        .replace("Powered by Pollinations", "")
        .replace("pollinations.ai", "")
        .replace("Pollinations.ai", "")
        .replace("Check out Pollinations", "")
        .replace("Visit text.pollinations.ai", "")
        .replace("(Note: This answer was generated using Pollinations AI)", "")
        .trim()
        .to_string()
}

// ── Main Query Handler ───────────────────────────────────────────────────────

/// Lists available Gemini models using the provided API key.
async fn list_gemini_internal(api_key: &str) -> Result<Vec<String>, AppError> {
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

#[tauri::command]
pub async fn list_openai_compatible(api_key: String, url: String) -> Result<Vec<String>, AppError> {
    let client = Client::new();
    let response = client
        .get(url)
        .bearer_auth(api_key)
        .send()
        .await
        .map_err(|e| AppError::NetworkError(e.to_string()))?;

    if response.status().is_success() {
        let body: Value = response.json().await.map_err(|e| AppError::NetworkError(e.to_string()))?;
        let models = body["data"]
            .as_array()
            .ok_or_else(|| AppError::NetworkError("Failed to parse models list".to_string()))?
            .iter()
            .filter_map(|m| {
                let id = m["id"].as_str()?;
                // Filter out non-chat models for OpenAI
                if id.starts_with("gpt") || id.contains("grok") {
                    Some(id.to_string())
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
#[tauri::command]
pub async fn list_ollama_models(url: String) -> Result<Vec<String>, AppError> {
    let client = Client::new();
    let tags_url = format!("{}/api/tags", url.trim_end_matches('/'));
    
    let response = client
        .get(tags_url)
        .send()
        .await
        .map_err(|e| AppError::NetworkError(e.to_string()))?;

    if response.status().is_success() {
        let body: Value = response.json().await.map_err(|e| AppError::NetworkError(e.to_string()))?;
        let models = body["models"]
            .as_array()
            .ok_or_else(|| AppError::NetworkError("Failed to parse Ollama models".to_string()))?
            .iter()
            .filter_map(|m| Some(m["name"].as_str()?.to_string()))
            .collect();
        Ok(models)
    } else {
        Err(AppError::ProviderError {
            status: response.status().as_u16(),
            message: response.text().await.unwrap_or_default(),
        })
    }
}

#[tauri::command]
pub async fn pull_ollama_model(url: String, name: String) -> Result<(), AppError> {
    let client = Client::new();
    let pull_url = format!("{}/api/pull", url.trim_end_matches('/'));
    
    let response = client
        .post(pull_url)
        .json(&json!({ "name": name, "stream": false }))
        .send()
        .await
        .map_err(|e| AppError::NetworkError(e.to_string()))?;

    if response.status().is_success() {
        Ok(())
    } else {
        Err(AppError::ProviderError {
            status: response.status().as_u16(),
            message: response.text().await.unwrap_or_default(),
        })
    }
}

async fn list_claude_internal(api_key: &str) -> Result<Vec<String>, AppError> {
    let client = Client::new();
    let response = client
        .get("https://api.anthropic.com/v1/models")
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .send()
        .await
        .map_err(|e| AppError::NetworkError(e.to_string()))?;

    if response.status().is_success() {
        let body: Value = response.json().await.map_err(|e| AppError::NetworkError(e.to_string()))?;
        let models = body["data"]
            .as_array()
            .ok_or_else(|| AppError::NetworkError("Failed to parse models list".to_string()))?
            .iter()
            .filter_map(|m| Some(m["id"].as_str()?.to_string()))
            .collect();
        Ok(models)
    } else {
        // Fallback for Anthropic if models endpoint fails (it might not be enabled for all keys)
        Ok(vec![
            "claude-3-5-sonnet-20240620".to_string(),
            "claude-3-opus-20240229".to_string(),
            "claude-3-sonnet-20240229".to_string(),
            "claude-3-haiku-20240307".to_string(),
        ])
    }
}

/// Unified command to list models for a specific provider.
#[tauri::command]
pub async fn list_provider_models(api_key: String, provider: String) -> Result<Vec<String>, AppError> {
    if api_key.is_empty() {
        return Err(AppError::InvalidApiKey);
    }

    match provider.to_lowercase().as_str() {
        "gemini" => list_gemini_internal(&api_key).await,
        "openai" => list_openai_compatible(api_key.clone(), "https://api.openai.com/v1/models".to_string()).await,
        "grok"   => list_openai_compatible(api_key.clone(), "https://api.x.ai/v1/models".to_string()).await,
        "claude" => list_claude_internal(&api_key).await,
        _ => Err(AppError::NetworkError("Unknown provider".to_string())),
    }
}

#[tauri::command]
pub async fn list_gemini_models(api_key: String) -> Result<Vec<String>, AppError> {
    list_gemini_internal(&api_key).await
}

/// The main Tauri command that the frontend calls to get AI responses.
#[tauri::command]
pub async fn query_llm(
    query: String, 
    model: String, 
    api_key: String,
    provider: Option<String>,
    base_url: Option<String>,
) -> Result<String, AppError> {
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

    // ── Ollama Routing ──────────────────────────────────────────
    if model.starts_with("ollama:") {
        let actual_model = model.replace("ollama:", "");
        let ollama_url = base_url.unwrap_or_else(|| "http://localhost:11434".to_string());
        let chat_url = format!("{}/api/chat", ollama_url.trim_end_matches('/'));

        let response = client
            .post(chat_url)
            .json(&json!({
                "model": actual_model,
                "messages": [{"role": "user", "content": &query}],
                "stream": false
            }))
            .send()
            .await
            .map_err(|e| AppError::NetworkError(e.to_string()))?;

        if response.status().is_success() {
            let body: Value = response.json().await.map_err(|e| AppError::NetworkError(e.to_string()))?;
            return Ok(body["message"]["content"].as_str().unwrap_or("(no response)").to_string());
        } else {
            return Err(AppError::ProviderError {
                status: response.status().as_u16(),
                message: response.text().await.unwrap_or_default(),
            });
        }
    }

    // ── Custom Provider (BYOK) Routing ──────────────────────────
    if let Some(url) = base_url {
        let chat_url = if url.ends_with("/chat/completions") { 
            url 
        } else { 
            format!("{}/chat/completions", url.trim_end_matches('/')) 
        };

        let response = client
            .post(chat_url)
            .bearer_auth(&api_key)
            .json(&json!({
                "model": model,
                "messages": [{"role": "user", "content": &query}]
            }))
            .send()
            .await
            .map_err(|e| AppError::NetworkError(e.to_string()))?;

        if response.status().is_success() {
            let body: Value = response.json().await.map_err(|e| AppError::NetworkError(e.to_string()))?;
            return Ok(body["choices"][0]["message"]["content"].as_str().unwrap_or("(no response)").to_string());
        } else {
            return Err(AppError::ProviderError {
                status: response.status().as_u16(),
                message: response.text().await.unwrap_or_default(),
            });
        }
    }

    // ── Free Models (Stable Direct Call) ────────────────────────
    if is_free_model(&model) {
        match query_pollinations(&client, &query, "openai-fast").await {
            Ok(answer) => return Ok(answer),
            Err((s, m)) => return Err(AppError::ProviderError { status: s, message: m }),
        }
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

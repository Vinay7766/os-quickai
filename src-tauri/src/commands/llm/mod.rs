// ─────────────────────────────────────────────────────────────────────────────
// llm/mod.rs — AI model orchestration
// ─────────────────────────────────────────────────────────────────────────────
// This module provides a unified interface for multiple AI providers.
// Orchestrates routing between:
//   • Free models (Pollinations)
//   • Local models (Ollama)
//   • Paid models (Gemini, Claude, OpenAI, Grok)
// ─────────────────────────────────────────────────────────────────────────────

pub mod pollinations;
pub mod ollama;
pub mod providers;

pub use ollama::{list_ollama_models, pull_ollama_model};
pub use providers::{list_provider_models, list_openai_compatible, list_gemini_internal};

#[tauri::command]
pub async fn list_gemini_models(api_key: String) -> Result<Vec<String>, AppError> {
    list_gemini_internal(&api_key).await
}

use crate::error::AppError;
use reqwest::Client;
use serde_json::{json, Value};
use self::pollinations::{is_free_model, query_pollinations};

/// Main Tauri command to query AI models.
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
        .timeout(std::time::Duration::from_secs(10))
        .user_agent("Quickno/1.0 (Desktop AI Assistant)")
        .build()
        .map_err(|e| AppError::NetworkError(e.to_string()))?;

    // ── Ollama Routing ──────────────────────────────────────────
    if model.starts_with("ollama:") {
        let actual_model = model.replace("ollama:", "");
        let base_input = base_url.unwrap_or_else(|| "http://localhost:11434".to_string());
        
        let mut url = base_input.clone();
        if !url.starts_with("http://") && !url.starts_with("https://") {
            url = format!("http://{}", url);
        }

        let chat_url = format!("{}/api/chat", url.trim_end_matches('/'));
        let response = client.post(chat_url)
            .json(&json!({
                "model": actual_model,
                "messages": [{"role": "user", "content": &query}],
                "stream": false
            }))
            .send()
            .await;

        match response {
            Ok(res) if res.status().is_success() => {
                let body: Value = res.json().await.map_err(|e| AppError::NetworkError(e.to_string()))?;
                return Ok(body["message"]["content"].as_str().unwrap_or("(no response)").to_string());
            }
            _ => {
                // Fallback for localhost -> 127.0.0.1
                if base_input.contains("localhost") {
                    let failover_url = base_input.replace("localhost", "127.0.0.1");
                    let chat_url = format!("{}/api/chat", failover_url.trim_end_matches('/'));
                    if let Ok(res) = client.post(chat_url)
                        .json(&json!({ "model": actual_model, "messages": [{"role": "user", "content": &query}], "stream": false }))
                        .send().await 
                    {
                        if res.status().is_success() {
                            let body: Value = res.json().await.map_err(|e| AppError::NetworkError(e.to_string()))?;
                            return Ok(body["message"]["content"].as_str().unwrap_or("(no response)").to_string());
                        }
                    }
                }
                return Err(AppError::NetworkError("Failed to connect to Ollama. Ensure the app is running.".to_string()));
            }
        }
    }

    // ── Custom Provider (BYOK) Routing ──────────────────────────
    if let Some(url) = base_url {
        let mut base = url;
        if !base.starts_with("http://") && !base.starts_with("https://") {
            base = format!("https://{}", base);
        }

        let chat_url = if base.ends_with("/chat/completions") { 
            base 
        } else { 
            format!("{}/chat/completions", base.trim_end_matches('/')) 
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

    // ── Free Models (Pollinations) ──────────────────────────────
    if is_free_model(&model) {
        match query_pollinations(&client, &query, "openai-fast").await {
            Ok(answer) => return Ok(answer),
            Err((s, m)) => return Err(AppError::ProviderError { status: s, message: m }),
        }
    }

    // ── Paid Models (Gemini, Claude, OpenAI) ────────────────────
    if api_key.is_empty() { return Err(AppError::InvalidApiKey); }

    let provider_str = provider.unwrap_or_default().to_lowercase();
    let is_gemini = provider_str == "gemini" || model.contains("gemini");
    let is_claude = provider_str == "claude" || model.contains("claude");
    let is_grok   = provider_str == "grok"   || model.contains("grok");

    if is_gemini {
        let url = format!(
            "https://generativelanguage.googleapis.com/v1/models/{}:generateContent?key={}",
            model, api_key
        );
        let res = client.post(&url)
            .json(&json!({"contents": [{"parts": [{"text": &query}]}]}))
            .send().await.map_err(|e| AppError::NetworkError(e.to_string()))?;

        if res.status().is_success() {
            let body: Value = res.json().await.map_err(|e| AppError::NetworkError(e.to_string()))?;
            return Ok(body["candidates"][0]["content"]["parts"][0]["text"].as_str().unwrap_or("(no response)").to_string());
        }
    }

    if is_claude {
        let res = client.post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", &api_key)
            .header("anthropic-version", "2023-06-01")
            .json(&json!({
                "model": model, "max_tokens": 2048,
                "system": "You are a concise, helpful assistant. Use markdown for code.",
                "messages": [{"role": "user", "content": &query}]
            }))
            .send().await.map_err(|e| AppError::NetworkError(e.to_string()))?;

        if res.status().is_success() {
            let body: Value = res.json().await.map_err(|e| AppError::NetworkError(e.to_string()))?;
            return Ok(body["content"][0]["text"].as_str().unwrap_or("(no response)").to_string());
        }
    }

    // Default to OpenAI-compatible
    let endpoint = if is_grok { "https://api.x.ai/v1/chat/completions" } else { "https://api.openai.com/v1/chat/completions" };
    let res = client.post(endpoint)
        .bearer_auth(&api_key)
        .json(&json!({
            "model": model,
            "messages": [{"role": "system", "content": "You are a concise, helpful assistant."}, {"role": "user", "content": &query}]
        }))
        .send().await.map_err(|e| AppError::NetworkError(e.to_string()))?;

    if res.status().is_success() {
        let body: Value = res.json().await.map_err(|e| AppError::NetworkError(e.to_string()))?;
        Ok(body["choices"][0]["message"]["content"].as_str().unwrap_or("(no response)").to_string())
    } else {
        Err(AppError::ProviderError { status: res.status().as_u16(), message: res.text().await.unwrap_or_default() })
    }
}

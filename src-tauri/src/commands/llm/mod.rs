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

use providers::list_gemini_internal;

#[tauri::command]
pub async fn list_gemini_models(api_key: String) -> Result<Vec<String>, AppError> {
    list_gemini_internal(&api_key).await
}

use crate::error::AppError;
use reqwest::Client;
use serde_json::{json, Value};
use self::pollinations::{is_free_model, query_pollinations};
use tauri::Emitter;

/// Main Tauri command to query AI models.
#[tauri::command]
pub async fn query_llm(
    app: tauri::AppHandle,
    query: String, 
    model: String, 
    api_key: String,
    provider: Option<String>,
    base_url: Option<String>,
    image_base64: Option<String>,
) -> Result<String, AppError> {
    if query.len() > 4000 {
        return Err(AppError::NetworkError(
            "Query is too long. Please limit your query to 4000 characters.".to_string()
        ));
    }

    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .user_agent("Quickno/1.0 (Desktop AI Assistant)")
        .danger_accept_invalid_certs(true)
        .build()
        .map_err(|e| AppError::NetworkError(e.to_string()))?;

    // ── Ollama Routing ──────────────────────────────────────────
    if model.starts_with("ollama:") {
        let actual_model = model.replace("ollama:", "");
        let base_input = base_url.unwrap_or_else(|| "http://127.0.0.1:11434".to_string());
        
        let mut url = base_input.clone();
        if !url.starts_with("http://") && !url.starts_with("https://") {
            url = format!("http://{}", url);
        }

        // Dedicated local client that bypasses proxies entirely for local Ollama
        let local_client = Client::builder()
            .danger_accept_invalid_certs(true)
            .no_proxy()
            .build()
            .unwrap();

        let chat_url = format!("{}/api/chat", url.trim_end_matches('/'));
        let mut message_obj = json!({
            "role": "user",
            "content": &query
        });

        if let Some(ref img) = image_base64 {
            message_obj = json!({
                "role": "user",
                "content": &query,
                "images": [img]
            });
        }

        let mut response = local_client.post(chat_url.clone())
            .json(&json!({
                "model": actual_model,
                "messages": [message_obj],
                "stream": true
            }))
            .send()
            .await.map_err(|e| AppError::NetworkError(e.to_string()))?;

        let mut full_text = String::new();
        while let Ok(Some(chunk)) = response.chunk().await {
            let text = String::from_utf8_lossy(&chunk);
            for line in text.lines() {
                if line.trim().is_empty() { continue; }
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(line) {
                    if let Some(content) = json["message"]["content"].as_str() {
                        full_text.push_str(content);
                        let _ = app.emit("llm-token", content);
                    }
                }
            }
        }
        if !full_text.is_empty() {
            return Ok(full_text);
        }

        // Fallback for localhost -> 127.0.0.1
        if base_input.contains("localhost") {
            let failover_url = base_input.replace("localhost", "127.0.0.1");
            let chat_url = format!("{}/api/chat", failover_url.trim_end_matches('/'));
            if let Ok(mut res) = local_client.post(chat_url)
                .json(&json!({ "model": actual_model, "messages": [{"role": "user", "content": &query}], "stream": true }))
                .send().await 
            {
                while let Ok(Some(chunk)) = res.chunk().await {
                    let text = String::from_utf8_lossy(&chunk);
                    for line in text.lines() {
                        if line.trim().is_empty() { continue; }
                        if let Ok(json) = serde_json::from_str::<serde_json::Value>(line) {
                            if let Some(content) = json["message"]["content"].as_str() {
                                full_text.push_str(content);
                                let _ = app.emit("llm-token", content);
                            }
                        }
                    }
                }
                if !full_text.is_empty() {
                    return Ok(full_text);
                }
            }
        }
        return Err(AppError::NetworkError("Failed to connect to Ollama. Ensure the app is running.".to_string()));
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

        let mut user_content = json!(&query);
        if let Some(ref img) = image_base64 {
            user_content = json!([
                {"type": "text", "text": &query},
                {"type": "image_url", "image_url": {"url": format!("data:image/png;base64,{}", img)}}
            ]);
        }

        let mut response = client
            .post(chat_url)
            .bearer_auth(&api_key)
            .json(&json!({
                "model": model,
                "messages": [{"role": "user", "content": user_content}],
                "stream": true
            }))
            .send()
            .await
            .map_err(|e| AppError::NetworkError(e.to_string()))?;

        if !response.status().is_success() {
            return Err(AppError::ProviderError {
                status: response.status().as_u16(),
                message: response.text().await.unwrap_or_default(),
            });
        }

        let mut full_text = String::new();
        while let Ok(Some(chunk)) = response.chunk().await {
            let text = String::from_utf8_lossy(&chunk);
            for line in text.lines() {
                let trimmed = line.trim();
                if trimmed.starts_with("data: ") && trimmed != "data: [DONE]" {
                    let data = &trimmed[6..];
                    if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                        if let Some(choices) = json["choices"].as_array() {
                            if let Some(delta) = choices.get(0).and_then(|c| c["delta"]["content"].as_str()) {
                                full_text.push_str(delta);
                                let _ = app.emit("llm-token", delta);
                            }
                        }
                    }
                }
            }
        }
        return Ok(full_text);
    }

    // ── Free Models (Pollinations) ──────────────────────────────
    if is_free_model(&model) {
        if image_base64.is_some() {
            return Err(AppError::ProviderError { 
                status: 400, 
                message: "The Free Model does not support Screen Capture (Vision). Please configure a Gemini API key in Settings to unlock Vision features.".to_string() 
            });
        }
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
            "https://generativelanguage.googleapis.com/v1/models/{}:streamGenerateContent?alt=sse&key={}",
            model, api_key
        );
        let mut parts = vec![json!({"text": &query})];
        if let Some(ref img) = image_base64 {
            parts.push(json!({
                "inlineData": {
                    "mimeType": "image/png",
                    "data": img
                }
            }));
        }

        let mut response = client.post(&url)
            .json(&json!({"contents": [{"parts": parts}]}))
            .send().await.map_err(|e| AppError::NetworkError(e.to_string()))?;

        if !response.status().is_success() {
            let status = response.status().as_u16();
            let body = response.text().await.unwrap_or_default();
            return Err(AppError::ProviderError { status, message: body });
        }

        let mut full_text = String::new();
        while let Ok(Some(chunk)) = response.chunk().await {
            let text = String::from_utf8_lossy(&chunk);
            for line in text.lines() {
                let trimmed = line.trim();
                if trimmed.starts_with("data: ") && trimmed != "data: [DONE]" {
                    let data = &trimmed[6..];
                    if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                        if let Some(candidates) = json["candidates"].as_array() {
                            if let Some(parts) = candidates.get(0).and_then(|c| c["content"]["parts"].as_array()) {
                                if let Some(delta) = parts.get(0).and_then(|p| p["text"].as_str()) {
                                    full_text.push_str(delta);
                                    let _ = app.emit("llm-token", delta);
                                }
                            }
                        }
                    }
                }
            }
        }
        return Ok(full_text);
    }

    if is_claude {
        let mut user_content = json!([{"type": "text", "text": &query}]);
        if let Some(ref img) = image_base64 {
            user_content = json!([
                {"type": "text", "text": &query},
                {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": img}}
            ]);
        }

        let mut response = client.post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", &api_key)
            .header("anthropic-version", "2023-06-01")
            .json(&json!({
                "model": model, "max_tokens": 2048,
                "system": "You are a concise, helpful assistant. Use markdown for code.",
                "messages": [{"role": "user", "content": user_content}],
                "stream": true
            }))
            .send().await.map_err(|e| AppError::NetworkError(e.to_string()))?;

        if !response.status().is_success() {
            let status = response.status().as_u16();
            let body = response.text().await.unwrap_or_default();
            return Err(AppError::ProviderError { status, message: body });
        }

        let mut full_text = String::new();
        while let Ok(Some(chunk)) = response.chunk().await {
            let text = String::from_utf8_lossy(&chunk);
            for line in text.lines() {
                let trimmed = line.trim();
                if trimmed.starts_with("data: ") {
                    let data = &trimmed[6..];
                    if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                        if json["type"] == "content_block_delta" {
                            if let Some(delta) = json["delta"]["text"].as_str() {
                                full_text.push_str(delta);
                                let _ = app.emit("llm-token", delta);
                            }
                        }
                    }
                }
            }
        }
        return Ok(full_text);
    }

    let mut user_content = json!(&query);
    if let Some(ref img) = image_base64 {
        user_content = json!([
            {"type": "text", "text": &query},
            {"type": "image_url", "image_url": {"url": format!("data:image/png;base64,{}", img)}}
        ]);
    }

    let endpoint = if let Some(ref url) = base_url {
        format!("{}/chat/completions", url.trim_end_matches('/'))
    } else if is_grok { 
        "https://api.x.ai/v1/chat/completions".to_string()
    } else { 
        "https://api.openai.com/v1/chat/completions".to_string()
    };
    let mut response = client.post(&endpoint)
        .bearer_auth(&api_key)
        .json(&json!({
            "model": model,
            "messages": [{"role": "system", "content": "You are a concise, helpful assistant."}, {"role": "user", "content": user_content}],
            "stream": true
        }))
        .send().await.map_err(|e| AppError::NetworkError(e.to_string()))?;

    if !response.status().is_success() {
        let status = response.status().as_u16();
        let body = response.text().await.unwrap_or_default();
        return Err(AppError::ProviderError { status, message: body });
    }

    let mut full_text = String::new();
    while let Ok(Some(chunk)) = response.chunk().await {
        let text = String::from_utf8_lossy(&chunk);
        for line in text.lines() {
            let trimmed = line.trim();
            if trimmed.starts_with("data: ") && trimmed != "data: [DONE]" {
                let data = &trimmed[6..];
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                    if let Some(choices) = json["choices"].as_array() {
                        if let Some(delta) = choices.get(0).and_then(|c| c["delta"]["content"].as_str()) {
                            full_text.push_str(delta);
                            let _ = app.emit("llm-token", delta);
                        }
                    }
                }
            }
        }
    }
    return Ok(full_text);
}

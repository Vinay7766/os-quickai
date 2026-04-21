use crate::error::AppError;
use reqwest::Client;
use serde_json::{json, Value};

async fn try_pollinations_post(client: &Client, query: &str, model: &str) -> Option<String> {
    let res = client
        .post("https://text.pollinations.ai/openai")
        .json(&json!({
            "model": model,
            "private": true,
            "messages": [
                {"role": "system", "content": "You are a concise, helpful assistant. Answer clearly."},
                {"role": "user", "content": query}
            ]
        }))
        .send().await.ok()?;
    if !res.status().is_success() { return None; }
    let body: Value = res.json().await.ok()?;
    body["choices"][0]["message"]["content"].as_str()
        .filter(|s| !s.is_empty()).map(|s| s.to_string())
}

async fn try_pollinations_get(client: &Client, query: &str) -> Option<String> {
    // Simple GET endpoint — returns plain text
    let encoded = urlencoding::encode(query);
    let url = format!("https://text.pollinations.ai/{}", encoded);
    let res = client.get(&url).send().await.ok()?;
    if !res.status().is_success() { return None; }
    let text = res.text().await.ok()?;
    if text.is_empty() { return None; }
    Some(text)
}

#[tauri::command]
pub async fn query_llm(query: String, model: String, api_key: String) -> Result<String, AppError> {
    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) OSQuickAI/1.0")
        .build()
        .map_err(|e| AppError::NetworkError(e.to_string()))?;

    let is_free = matches!(model.as_str(), "minimax-2.5" | "qwen-3.6" | "nemotron");

    // ── Free models ──────────────────────────────────────────────────────────
    if is_free {
        let (tx, mut rx) = tokio::sync::mpsc::channel(1);
        
        let q = query.clone();
        let c = client.clone();
        let tx1 = tx.clone();
        tokio::spawn(async move {
            if let Some(ans) = try_pollinations_get(&c, &q).await {
                let _ = tx1.send(ans).await;
            }
        });

        for m in ["mistral", "openai", "llama", "flux"] {
            let q = query.clone();
            let c = client.clone();
            let tx_clone = tx.clone();
            tokio::spawn(async move {
                if let Some(ans) = try_pollinations_post(&c, &q, m).await {
                    let _ = tx_clone.send(ans).await;
                }
            });
        }
        
        let result = tokio::time::timeout(std::time::Duration::from_secs(15), rx.recv()).await;
        if let Ok(Some(ans)) = result {
            return Ok(ans);
        }

        return Err(AppError::ProviderError {
            status: 503,
            message: "Free model service is temporarily unavailable. Please try again in a moment, or set an API key and use a premium model.".into(),
        });
    }

    // ── Claude ───────────────────────────────────────────────────────────────
    if model == "claude-3-opus" {
        if api_key.is_empty() { return Err(AppError::InvalidApiKey); }
        let res = client
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", &api_key)
            .header("anthropic-version", "2023-06-01")
            .json(&json!({
                "model": "claude-3-opus-20240229",
                "max_tokens": 2048,
                "system": "You are a concise, helpful assistant.",
                "messages": [{"role": "user", "content": &query}]
            }))
            .send().await
            .map_err(|e| AppError::NetworkError(e.to_string()))?;
        return if res.status().is_success() {
            let b: Value = res.json().await.map_err(|e| AppError::NetworkError(e.to_string()))?;
            Ok(b["content"][0]["text"].as_str().unwrap_or("(no response)").to_string())
        } else {
            Err(AppError::ProviderError { status: res.status().as_u16(), message: res.text().await.unwrap_or_default() })
        };
    }

    // ── Gemini ───────────────────────────────────────────────────────────────
    if model == "gemini-1.5-pro" {
        if api_key.is_empty() { return Err(AppError::InvalidApiKey); }
        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key={}",
            api_key
        );
        let res = client
            .post(&url)
            .json(&json!({"contents": [{"parts": [{"text": &query}]}]}))
            .send().await
            .map_err(|e| AppError::NetworkError(e.to_string()))?;
        return if res.status().is_success() {
            let b: Value = res.json().await.map_err(|e| AppError::NetworkError(e.to_string()))?;
            Ok(b["candidates"][0]["content"]["parts"][0]["text"]
                .as_str().unwrap_or("(no response)").to_string())
        } else {
            Err(AppError::ProviderError { status: res.status().as_u16(), message: res.text().await.unwrap_or_default() })
        };
    }

    // ── OpenAI / Grok ────────────────────────────────────────────────────────
    if api_key.is_empty() { return Err(AppError::InvalidApiKey); }
    let (endpoint, actual_model) = if model.starts_with("grok") {
        ("https://api.x.ai/v1/chat/completions", "grok-beta")
    } else {
        ("https://api.openai.com/v1/chat/completions", model.as_str())
    };
    let res = client
        .post(endpoint)
        .bearer_auth(&api_key)
        .json(&json!({
            "model": actual_model,
            "messages": [
                {"role": "system", "content": "You are a concise, helpful assistant. Use markdown for code."},
                {"role": "user", "content": &query}
            ]
        }))
        .send().await
        .map_err(|e| AppError::NetworkError(e.to_string()))?;
    match res.status().as_u16() {
        200 => {
            let b: Value = res.json().await.map_err(|e| AppError::NetworkError(e.to_string()))?;
            Ok(b["choices"][0]["message"]["content"].as_str().unwrap_or("(no response)").to_string())
        }
        401 => Err(AppError::InvalidApiKey),
        429 => Err(AppError::RateLimitExceeded),
        s   => Err(AppError::ProviderError { status: s, message: res.text().await.unwrap_or_default() }),
    }
}

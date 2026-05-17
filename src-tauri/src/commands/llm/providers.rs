// ─────────────────────────────────────────────────────────────────────────────
// providers.rs — External AI provider integrations (BYOK)
// ─────────────────────────────────────────────────────────────────────────────
// This module manages model discovery for direct provider APIs.
// Supported: Google Gemini, Anthropic Claude, OpenAI, and xAI Grok.
//
// Depends on: reqwest, serde_json
// Used by: commands::llm::mod, frontend::Settings
// ─────────────────────────────────────────────────────────────────────────────

use reqwest::Client;
use serde_json::Value;
use crate::error::AppError;

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

pub async fn list_gemini_internal(api_key: &str) -> Result<Vec<String>, AppError> {
    let client = Client::new();
    let url = format!(
        "https://generativelanguage.googleapis.com/v1/models?key={}",
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
                    .any(|g: &Value| g.as_str() == Some("generateContent"))
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

pub async fn list_claude_internal(api_key: &str) -> Result<Vec<String>, AppError> {
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
        Ok(vec![
            "claude-3-5-sonnet-20240620".to_string(),
            "claude-3-opus-20240229".to_string(),
            "claude-3-sonnet-20240229".to_string(),
            "claude-3-haiku-20240307".to_string(),
        ])
    }
}

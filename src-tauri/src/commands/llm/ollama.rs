// ─────────────────────────────────────────────────────────────────────────────
// ollama.rs — Local AI model management (Ollama)
// ─────────────────────────────────────────────────────────────────────────────
// This module provides commands for interacting with local Ollama instances.
// Handles model listing and pulling (downloading) directly from the local API.
//
// Depends on: reqwest, serde_json
// Used by: commands::llm::mod, frontend::Settings
// ─────────────────────────────────────────────────────────────────────────────

use reqwest::Client;
use serde_json::{json, Value};

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

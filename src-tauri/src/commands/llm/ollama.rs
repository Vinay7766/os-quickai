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
use crate::error::AppError;
use tauri::{Emitter, Listener};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

fn normalize_url(url: &str) -> String {
    let trimmed = url.trim();
    if trimmed.starts_with("http://") || trimmed.starts_with("https://") {
        trimmed.to_string()
    } else {
        format!("http://{}", trimmed)
    }
}

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct OllamaModel {
    pub name: String,
    pub size: u64,
}

#[tauri::command]
pub async fn list_ollama_models(url: String) -> Result<Vec<OllamaModel>, AppError> {
    let client = Client::builder()
        .danger_accept_invalid_certs(true)
        .no_proxy()
        .build()
        .unwrap();
    let final_url = normalize_url(&url);
    let tags_url = format!("{}/api/tags", final_url.trim_end_matches('/'));
    
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
            .filter_map(|m| {
                Some(OllamaModel {
                    name: m["name"].as_str()?.to_string(),
                    size: m["size"].as_u64().unwrap_or(0),
                })
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
pub async fn pull_ollama_model(app: tauri::AppHandle, url: String, name: String) -> Result<(), AppError> {
    let client = Client::builder()
        .danger_accept_invalid_certs(true)
        .no_proxy()
        .build()
        .unwrap();
    let final_url = normalize_url(&url);
    let pull_url = format!("{}/api/pull", final_url.trim_end_matches('/'));
    
    let mut response = client
        .post(pull_url)
        .json(&json!({ "name": name, "stream": true }))
        .send()
        .await
        .map_err(|e| AppError::NetworkError(e.to_string()))?;

    if !response.status().is_success() {
        return Err(AppError::ProviderError {
            status: response.status().as_u16(),
            message: response.text().await.unwrap_or_default(),
        });
    }

    let cancel_flag = Arc::new(AtomicBool::new(false));
    let cancel_flag_clone = cancel_flag.clone();
    
    let event_id = app.listen("cancel-ollama-pull", move |_| {
        cancel_flag_clone.store(true, Ordering::SeqCst);
    });

    while let Ok(Some(chunk)) = response.chunk().await {
        if cancel_flag.load(Ordering::SeqCst) {
            app.unlisten(event_id);
            return Err(AppError::NetworkError("Pull cancelled by user".to_string()));
        }
        
        let text = String::from_utf8_lossy(&chunk);
        for line in text.lines() {
            if line.trim().is_empty() { continue; }
            if let Ok(json) = serde_json::from_str::<Value>(line) {
                let _ = app.emit("ollama-pull-progress", json);
            }
        }
    }
    
    app.unlisten(event_id);
    Ok(())
}

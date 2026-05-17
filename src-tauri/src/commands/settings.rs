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
// settings.rs — Secure API key management
// ─────────────────────────────────────────────────────────────────────────────
// Uses the Windows Credential Manager (via the `keyring` crate) to securely
// store and retrieve API keys. Keys are encrypted by the OS and tied to the
// current user account — they never leave the machine in plaintext.
// ─────────────────────────────────────────────────────────────────────────────

use crate::error::AppError;
use keyring::Entry;

/// Service name used to identify Quickno's credentials in Windows Credential Manager.
const SERVICE_NAME: &str = "os_quickai";

/// Returns the account name for a specific provider to ensure separate storage.
fn get_account_name(provider: &str) -> String {
    format!("{}_api_key", provider.to_lowercase().replace("chatgpt", "openai"))
}

/// Saves an API key to the Windows Credential Manager for a specific provider.
#[tauri::command]
pub async fn save_api_key(key: String, provider: String) -> Result<(), AppError> {
    tokio::task::spawn_blocking(move || {
        let account = get_account_name(&provider);
        let entry = Entry::new(SERVICE_NAME, &account)
            .map_err(|e| AppError::StorageError(e.to_string()))?;
        entry
            .set_password(&key)
            .map_err(|e| AppError::StorageError(e.to_string()))
    })
    .await
    .map_err(|_| AppError::UnknownError("Thread dropped".into()))?
}

/// Retrieves the stored API key for a specific provider.
#[tauri::command]
pub async fn get_api_key(provider: String) -> Result<Option<String>, AppError> {
    tokio::task::spawn_blocking(move || {
        let account = get_account_name(&provider);
        let entry = Entry::new(SERVICE_NAME, &account)
            .map_err(|e| AppError::StorageError(e.to_string()))?;
        match entry.get_password() {
            Ok(pw) => Ok(Some(pw)),
            Err(keyring::Error::NoEntry) => {
                // Migration: Check for the old generic key if this is an 'openai' request
                if provider.to_lowercase() == "openai" || provider.to_lowercase() == "chatgpt" {
                    if let Ok(old_entry) = Entry::new(SERVICE_NAME, "openai_api_key") {
                        if let Ok(pw) = old_entry.get_password() {
                            return Ok(Some(pw));
                        }
                    }
                }
                Ok(None)
            },
            Err(e) => Err(AppError::StorageError(e.to_string())),
        }
    })
    .await
    .unwrap_or(Err(AppError::UnknownError("Thread dropped".into())))
}

/// Deletes the stored API key for a specific provider.
#[tauri::command]
pub async fn delete_api_key(provider: String) -> Result<(), AppError> {
    tokio::task::spawn_blocking(move || {
        let account = get_account_name(&provider);
        if let Ok(entry) = Entry::new(SERVICE_NAME, &account) {
            let _ = entry.delete_credential();
        }
    })
    .await
    .unwrap_or(());
    Ok(())
}

/// Tests whether an API key is valid by making a lightweight request
/// to the OpenAI models endpoint.
///
/// Note: This only validates OpenAI keys. Other providers' keys are
/// validated on first actual use.
/// Detects the current Windows system theme by reading the registry.
///
/// WebView2 does not reliably forward the OS `prefers-color-scheme` to CSS,
/// so we read the registry key directly:
///   HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Themes\Personalize
///     → AppsUseLightTheme: 0 = dark, 1 = light
///
/// Returns "dark" or "light".
#[tauri::command]
pub fn get_system_theme() -> String {
    #[cfg(target_os = "windows")]
    {
        use winreg::enums::*;
        use winreg::RegKey;

        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let theme_key = hkcu.open_subkey(
            r"SOFTWARE\Microsoft\Windows\CurrentVersion\Themes\Personalize",
        );

        match theme_key {
            Ok(key) => {
                let uses_light: u32 = key.get_value("AppsUseLightTheme").unwrap_or(1);
                if uses_light == 0 { "dark".to_string() } else { "light".to_string() }
            }
            Err(_) => "light".to_string(), // Fallback to light if registry read fails
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        "dark".to_string() // Default to dark for Mac/Linux or handle via frontend
    }
}

#[tauri::command]
pub async fn test_api_key(key: String) -> Result<bool, AppError> {
    let client = reqwest::Client::builder()
        .danger_accept_invalid_certs(true)
        .build()
        .unwrap();
    let response = client
        .get("https://api.openai.com/v1/models")
        .bearer_auth(&key)
        .send()
        .await
        .map_err(|e| AppError::NetworkError(e.to_string()))?;
    Ok(response.status().is_success())
}

use tauri::Manager;
use std::fs;
use std::path::PathBuf;

fn get_settings_path(app: &tauri::AppHandle) -> Result<PathBuf, AppError> {
    let app_dir = app.path().app_data_dir().map_err(|e| AppError::StorageError(e.to_string()))?;
    if !app_dir.exists() {
        fs::create_dir_all(&app_dir).map_err(|e| AppError::StorageError(e.to_string()))?;
    }
    Ok(app_dir.join("settings.json"))
}

#[tauri::command]
pub async fn get_setting(app: tauri::AppHandle, key: String) -> Result<serde_json::Value, AppError> {
    let path = get_settings_path(&app)?;
    if !path.exists() {
        return Ok(serde_json::Value::Null);
    }
    let content = fs::read_to_string(path).map_err(|e| AppError::StorageError(e.to_string()))?;
    let json: serde_json::Value = serde_json::from_str(&content).unwrap_or(serde_json::json!({}));
    Ok(json.get(&key).cloned().unwrap_or(serde_json::Value::Null))
}

#[tauri::command]
pub async fn save_setting(app: tauri::AppHandle, key: String, value: serde_json::Value) -> Result<(), AppError> {
    let path = get_settings_path(&app)?;
    let mut json = if path.exists() {
        let content = fs::read_to_string(&path).unwrap_or_else(|_| "{}".to_string());
        serde_json::from_str(&content).unwrap_or(serde_json::json!({}))
    } else {
        serde_json::json!({})
    };

    if let Some(obj) = json.as_object_mut() {
        obj.insert(key, value);
    }

    let content = serde_json::to_string_pretty(&json).map_err(|e| AppError::StorageError(e.to_string()))?;
    fs::write(path, content).map_err(|e| AppError::StorageError(e.to_string()))?;
    Ok(())
}
#[tauri::command]
pub async fn factory_reset(app: tauri::AppHandle) -> Result<(), AppError> {
    // 1. Delete settings.json
    let path = get_settings_path(&app)?;
    if path.exists() {
        let _ = fs::remove_file(path);
    }

    // 2. Wipe API keys from Credential Manager
    // We try to wipe the main ones we know about
    let providers = ["gemini", "grok", "openai", "claude", "perplexity"];
    for provider in providers {
        let account = get_account_name(provider);
        if let Ok(entry) = Entry::new(SERVICE_NAME, &account) {
            let _ = entry.delete_credential();
        }
    }

    // 3. Remove Registry marker for first run (Windows only)
    #[cfg(target_os = "windows")]
    {
        use winreg::enums::*;
        use winreg::RegKey;
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        if let Ok(key) = hkcu.open_subkey_with_flags(r"SOFTWARE\Quickno", KEY_ALL_ACCESS) {
            let _ = key.delete_value("v1_0_1Installed");
        }
    }

    // 4. Exit the app
    app.exit(0);
    Ok(())
}

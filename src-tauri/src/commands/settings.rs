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

/// Account name for the stored API key entry.
const ACCOUNT_NAME: &str = "openai_api_key";

/// Saves an API key to the Windows Credential Manager.
///
/// The key is encrypted using DPAPI (Data Protection API) and can only
/// be accessed by the current Windows user account.
#[tauri::command]
pub async fn save_api_key(key: String) -> Result<(), AppError> {
    tokio::task::spawn_blocking(move || {
        let entry = Entry::new(SERVICE_NAME, ACCOUNT_NAME)
            .map_err(|e| AppError::StorageError(e.to_string()))?;
        entry
            .set_password(&key)
            .map_err(|e| AppError::StorageError(e.to_string()))
    })
    .await
    .map_err(|_| AppError::UnknownError("Thread dropped".into()))?
}

/// Retrieves the stored API key from Windows Credential Manager.
///
/// Returns `None` if no key has been saved yet.
#[tauri::command]
pub async fn get_api_key() -> Result<Option<String>, AppError> {
    tokio::task::spawn_blocking(|| {
        let entry = Entry::new(SERVICE_NAME, ACCOUNT_NAME)
            .map_err(|e| AppError::StorageError(e.to_string()))?;
        match entry.get_password() {
            Ok(pw) => Ok(Some(pw)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(e) => Err(AppError::StorageError(e.to_string())),
        }
    })
    .await
    .unwrap_or(Err(AppError::UnknownError("Thread dropped".into())))
}

/// Deletes the stored API key from both the app and Windows Credential Manager.
///
/// After this operation, the key is permanently removed from the system.
/// The user will need to enter a new key to use premium models again.
#[tauri::command]
pub async fn delete_api_key() -> Result<(), AppError> {
    tokio::task::spawn_blocking(|| {
        if let Ok(entry) = Entry::new(SERVICE_NAME, ACCOUNT_NAME) {
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

#[tauri::command]
pub async fn test_api_key(key: String) -> Result<bool, AppError> {
    let client = reqwest::Client::new();
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

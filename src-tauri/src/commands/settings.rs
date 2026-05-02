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

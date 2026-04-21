use crate::error::AppError;
use keyring::Entry;

const SERVICE_NAME: &str = "os_quickai";
const ACCOUNT_NAME: &str = "openai_api_key";

#[tauri::command]
pub async fn save_api_key(key: String) -> Result<(), AppError> {
    tokio::task::spawn_blocking(move || {
        let entry = Entry::new(SERVICE_NAME, ACCOUNT_NAME).map_err(|e| AppError::StorageError(e.to_string()))?;
        entry.set_password(&key).map_err(|e| AppError::StorageError(e.to_string()))
    })
    .await
    .map_err(|_| AppError::UnknownError("Thread dropped".into()))?
}

#[tauri::command]
pub async fn get_api_key() -> Result<Option<String>, AppError> {
    tokio::task::spawn_blocking(|| {
        let entry = Entry::new(SERVICE_NAME, ACCOUNT_NAME).map_err(|e| AppError::StorageError(e.to_string()))?;
        match entry.get_password() {
            Ok(pw) => Ok(Some(pw)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(e) => Err(AppError::StorageError(e.to_string())),
        }
    })
    .await
    .unwrap_or(Err(AppError::UnknownError("Thread dropped".into())))
}

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

#[tauri::command]
pub async fn test_api_key(key: String) -> Result<bool, AppError> {
    let client = reqwest::Client::new();
    let res = client
        .get("https://api.openai.com/v1/models")
        .bearer_auth(&key)
        .send()
        .await
        .map_err(|e| AppError::NetworkError(e.to_string()))?;
    Ok(res.status().is_success())
}

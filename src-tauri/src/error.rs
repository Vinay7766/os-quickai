// ─────────────────────────────────────────────────────────────────────────────
// error.rs — Application error types
// ─────────────────────────────────────────────────────────────────────────────
// Defines a unified error enum used across all Tauri commands.
// Each variant is serialized as a plain string for the frontend to display.
// ─────────────────────────────────────────────────────────────────────────────

use serde::Serialize;
use thiserror::Error;

/// All possible errors that can occur in Quickno's backend commands.
#[derive(Debug, Error)]
pub enum AppError {
    /// The provided API key is empty or invalid.
    #[error("Invalid API Key provided")]
    InvalidApiKey,

    /// The AI provider has rate-limited the request.
    #[error("Rate Limit Exceeded")]
    RateLimitExceeded,

    /// The AI provider returned an error response.
    #[error("Provider error ({status}): {message}")]
    ProviderError { status: u16, message: String },

    /// A network request failed (timeout, DNS, etc.).
    #[error("Network connection failed: {0}")]
    NetworkError(String),

    /// Failed to read/write to the Windows Credential Manager.
    #[error("OS Storage error: {0}")]
    StorageError(String),

    /// A catch-all for unexpected errors.
    #[error("Unknown error: {0}")]
    UnknownError(String),
}

/// Serializes AppError as a plain string for Tauri's IPC layer.
/// The frontend receives this as a string in the `catch` handler.
impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

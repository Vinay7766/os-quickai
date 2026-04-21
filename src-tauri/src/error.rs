use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("Invalid API Key provided")]
    InvalidApiKey,
    #[error("Rate Limit Exceeded")]
    RateLimitExceeded,
    #[error("Provider error ({status}): {message}")]
    ProviderError { status: u16, message: String },
    #[error("Network connection failed: {0}")]
    NetworkError(String),
    #[error("OS Storage error: {0}")]
    StorageError(String),
    #[error("Unknown error: {0}")]
    UnknownError(String),
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

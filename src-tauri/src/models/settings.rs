use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct AppSettings {
    pub llm_model: String,
    pub search_engine: String,
    pub llm_site: String,
    pub hotkey: String,
    pub theme: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            llm_model: "gpt-4o-mini".to_string(),
            search_engine: "google".to_string(),
            llm_site: "chatgpt".to_string(),
            hotkey: "alt+a".to_string(),
            theme: "dark".to_string(),
        }
    }
}

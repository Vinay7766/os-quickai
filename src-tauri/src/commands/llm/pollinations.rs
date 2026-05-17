// ─────────────────────────────────────────────────────────────────────────────
// pollinations.rs — Free AI model provider integration
// ─────────────────────────────────────────────────────────────────────────────
// This module handles communication with the Pollinations AI API.
// It provides failover logic across multiple endpoints to ensure high 
// availability for free, anonymous users.
//
// Depends on: reqwest, serde_json
// Used by: commands::llm::mod
// ─────────────────────────────────────────────────────────────────────────────

use serde_json::{json, Value};

/// Checks if a given model name is one of the free (no-key) models.
pub fn is_free_model(model: &str) -> bool {
    matches!(model, "free-model" | "openai-fast")
}

/// Sends a query to the Pollinations AI API and returns the response text.
pub async fn query_pollinations(client: &Client, query: &str, model: &str) -> Result<String, (u16, String)> {
    // ── Attempt 1: Primary OpenAI-compatible Endpoint ────────────────────────
    let response = client
        .post("https://text.pollinations.ai/openai")
        .json(&json!({
            "model": model,
            "private": true,
            "messages": [
                {
                    "role": "system",
                    "content": "You are a concise, helpful assistant. Give clear, well-structured answers. Use markdown formatting for code blocks."
                },
                {
                    "role": "user",
                    "content": query
                }
            ]
        }))
        .send()
        .await;

    match response {
        Ok(res) if res.status().is_success() => {
            let body: Value = res.json().await.map_err(|e| (500, e.to_string()))?;
            let content = body["choices"][0]["message"]["content"]
                .as_str()
                .filter(|s| !s.is_empty())
                .ok_or_else(|| (500, "Empty response from AI".to_string()))?;
            return Ok(clean_pollinations_response(content));
        }
        _ => {
            // ── Attempt 2: Failover to Anonymous GET Endpoint ────────────────
            let encoded_query = urlencoding::encode(query);
            let url = format!("https://text.pollinations.ai/{}?model={}&system={}", 
                encoded_query, 
                model,
                urlencoding::encode("You are a concise, helpful assistant.")
            );

            if let Ok(failover_res) = client.get(&url).send().await {
                if failover_res.status().is_success() {
                    if let Ok(content) = failover_res.text().await {
                        if !content.is_empty() {
                            return Ok(clean_pollinations_response(&content));
                        }
                    }
                }
            }

            // ── Attempt 3: Final Failover to Different Model ID ──────────────
            let fallback_url = format!("https://text.pollinations.ai/{}?model=mistral&system={}", 
                encoded_query,
                urlencoding::encode("You are a concise, helpful assistant.")
            );

            if let Ok(last_res) = client.get(&fallback_url).send().await {
                if last_res.status().is_success() {
                    if let Ok(content) = last_res.text().await {
                        if !content.is_empty() {
                            return Ok(clean_pollinations_response(&content));
                        }
                    }
                }
            }
            
            Err((500, "Failed to connect to Free AI Provider (Pollinations). The service may be overloaded or your network is blocking the connection. Please try again later or use your own API Key in Settings.".to_string()))
        }
    }
}

/// Helper to remove branding from Pollinations responses.
fn clean_pollinations_response(content: &str) -> String {
    content
        .replace("Powered by Pollinations.ai", "")
        .replace("Powered by Pollinations", "")
        .replace("pollinations.ai", "")
        .replace("Pollinations.ai", "")
        .replace("Check out Pollinations", "")
        .replace("Visit text.pollinations.ai", "")
        .replace("(Note: This answer was generated using Pollinations AI)", "")
        .trim()
        .to_string()
}

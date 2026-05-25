use boa_engine::{Context, Source};

#[tauri::command]
pub async fn run_plugin(code: String, input: String) -> Result<String, String> {
    let mut context = Context::default();
    
    // We wrap the user's plugin code inside a function.
    // This sandbox injects `PluginInput` as the input data.
    // The plugin must return a string or an object that can be serialized.
    let wrapped_code = format!(
        r#"(function() {{
            const PluginInput = {};
            try {{
                {}
            }} catch (err) {{
                return "Error: " + err.toString();
            }}
        }})()"#,
        serde_json::to_string(&input).unwrap_or_else(|_| "\"\"".to_string()),
        code
    );

    match context.eval(Source::from_bytes(wrapped_code.as_bytes())) {
        Ok(result) => {
            // Convert JS result to JSON string
            let json_str = result.display().to_string();
            Ok(json_str)
        },
        Err(e) => Err(e.to_string()),
    }
}

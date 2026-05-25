use std::process::Command;
use serde::Deserialize;

#[derive(Deserialize)]
pub struct UIAction {
    pub action: String, // "move_mouse", "left_click", "right_click", "double_click", "type_text", "key_press", "sleep"
    pub x: Option<i32>,
    pub y: Option<i32>,
    pub text: Option<String>,
    pub key: Option<String>,
    pub duration_ms: Option<u64>,
}

#[tauri::command]
pub async fn execute_ui_actions(actions: Vec<UIAction>) -> Result<String, String> {
    use enigo::{Enigo, Mouse, Keyboard, Settings, Button, Coordinate, Direction, Key};
    
    let mut enigo = match Enigo::new(&Settings::default()) {
        Ok(e) => e,
        Err(e) => return Err(format!("Failed to initialize Enigo: {}", e))
    };

    for act in actions {
        match act.action.as_str() {
            "move_mouse" => {
                if let (Some(x), Some(y)) = (act.x, act.y) {
                    let _ = enigo.move_mouse(x, y, Coordinate::Abs);
                }
            }
            "left_click" => {
                let _ = enigo.button(Button::Left, Direction::Click);
            }
            "right_click" => {
                let _ = enigo.button(Button::Right, Direction::Click);
            }
            "double_click" => {
                let _ = enigo.button(Button::Left, Direction::Click);
                std::thread::sleep(std::time::Duration::from_millis(100));
                let _ = enigo.button(Button::Left, Direction::Click);
            }
            "type_text" => {
                if let Some(text) = act.text {
                    let _ = enigo.text(&text);
                }
            }
            "key_press" => {
                if let Some(key_str) = act.key {
                    let key = match key_str.to_lowercase().as_str() {
                        "enter" | "return" => Key::Return,
                        "tab" => Key::Tab,
                        "space" => Key::Space,
                        "backspace" => Key::Backspace,
                        "escape" | "esc" => Key::Escape,
                        "up" => Key::UpArrow,
                        "down" => Key::DownArrow,
                        "left" => Key::LeftArrow,
                        "right" => Key::RightArrow,
                        _ => {
                            // Single character fallback
                            if key_str.len() == 1 {
                                Key::Unicode(key_str.chars().next().unwrap())
                            } else {
                                Key::Return // fallback
                            }
                        }
                    };
                    let _ = enigo.key(key, Direction::Click);
                }
            }
            "sleep" => {
                if let Some(ms) = act.duration_ms {
                    std::thread::sleep(std::time::Duration::from_millis(ms));
                }
            }
            _ => {}
        }
    }

    Ok("UI actions executed successfully".to_string())
}

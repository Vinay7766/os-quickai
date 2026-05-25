use tauri::command;
use screenshots::Screen;
use base64::{Engine as _, engine::general_purpose::STANDARD};

#[command]
pub async fn capture_screen() -> Result<String, String> {
    // Get all screens
    let screens = Screen::all().map_err(|e| e.to_string())?;
    
    // For now, capture the primary screen. 
    // In the future, we could capture a region or a specific monitor.
    let screen = screens.first().ok_or("No screens found")?;
    
    // Capture the entire screen
    let image = screen.capture().map_err(|e| e.to_string())?;
    
    // Encode to PNG buffer using the image crate
    let mut buffer = std::io::Cursor::new(Vec::new());
    image.write_to(&mut buffer, screenshots::image::ImageFormat::Png).map_err(|e| e.to_string())?;
    
    // Convert to base64
    let base64_img = STANDARD.encode(buffer.into_inner());
    
    // Return base64 string
    Ok(base64_img)
}

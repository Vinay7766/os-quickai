use tauri::Manager;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};
use crate::{OVERLAY_OPEN, HotkeyState};
use std::sync::atomic::Ordering;

#[tauri::command]
pub async fn close_overlay(app: tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("overlay") { let _ = w.hide(); }
    OVERLAY_OPEN.store(false, Ordering::Relaxed);
}

#[tauri::command]
pub async fn open_settings(app: tauri::AppHandle) {
    if let Some(g) = app.get_webview_window("guide")    { let _ = g.hide(); }
    if let Some(s) = app.get_webview_window("settings") { let _ = s.show(); let _ = s.set_focus(); }
}

/// Unregisters the old hotkey and registers the new one live — no restart needed.
#[tauri::command]
pub fn update_shortcut(app: tauri::AppHandle, new_shortcut: String) -> Result<(), String> {
    let state = app.state::<HotkeyState>();

    // Get and unregister old hotkey
    let old = state.0.lock().unwrap().clone();
    if !old.is_empty() {
        let _ = app.global_shortcut().unregister(old.as_str());
    }

    // Register new hotkey with the same toggle behaviour
    app.global_shortcut()
        .on_shortcut(new_shortcut.as_str(), |app, _shortcut, event| {
            if event.state == ShortcutState::Pressed {
                crate::toggle_overlay(app);
            }
        })
        .map_err(|e| e.to_string())?;

    // Save new hotkey in state
    *state.0.lock().unwrap() = new_shortcut;
    Ok(())
}

// ─────────────────────────────────────────────────────────────────────────────
// window.rs — Window management commands
// ─────────────────────────────────────────────────────────────────────────────
// Provides Tauri commands for controlling window visibility and updating
// the global keyboard shortcut at runtime.
// ─────────────────────────────────────────────────────────────────────────────

use crate::{HotkeyState, OVERLAY_OPEN};
use std::sync::atomic::Ordering;
use tauri::Manager;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

/// Hides the search overlay window and updates the visibility flag.
#[tauri::command]
pub async fn close_overlay(app: tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("overlay") {
        let _ = w.hide();
    }
    OVERLAY_OPEN.store(false, Ordering::Relaxed);
}

/// Shows the main settings window and gives it focus.
#[tauri::command]
pub async fn open_settings(app: tauri::AppHandle) {
    if let Some(s) = app.get_webview_window("settings") {
        let _ = s.show();
        let _ = s.set_focus();
    }
}

/// Unregisters the current global hotkey and registers a new one.
/// This allows users to change their shortcut without restarting the app.
#[tauri::command]
pub fn update_shortcut(app: tauri::AppHandle, new_shortcut: String) -> Result<(), String> {
    let state = app.state::<HotkeyState>();

    // Unregister the old hotkey
    let old = state.0.lock().unwrap().clone();
    if !old.is_empty() {
        let _ = app.global_shortcut().unregister(old.as_str());
    }

    // Register the new hotkey with the same toggle behaviour
    app.global_shortcut()
        .on_shortcut(new_shortcut.as_str(), |app, _shortcut, event| {
            if event.state == ShortcutState::Pressed {
                crate::toggle_overlay(app);
            }
        })
        .map_err(|e| e.to_string())?;

    // Persist the new hotkey in app state
    *state.0.lock().unwrap() = new_shortcut;
    Ok(())
}

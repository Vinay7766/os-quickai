// ─────────────────────────────────────────────────────────────────────────────
// main.rs — Application entry point for Quickno
// ─────────────────────────────────────────────────────────────────────────────
// This file handles:
//   • Single-instance enforcement (via TCP port)
//   • System tray icon and menu
//   • Global hotkey registration for toggling the search overlay
//   • First-run detection (shows the welcome screen in the main window)
//   • Autostart registration (Windows registry)
// ─────────────────────────────────────────────────────────────────────────────

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod error;

use std::sync::{
    atomic::{AtomicBool, Ordering},
    Mutex,
};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    Manager,
};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};
use winreg::enums::*;
use winreg::RegKey;

// ── Shared State ─────────────────────────────────────────────────────────────

/// Tracks whether the search overlay is currently visible.
pub(crate) static OVERLAY_OPEN: AtomicBool = AtomicBool::new(false);

/// Holds the currently registered global hotkey string (e.g. "alt+a").
/// Wrapped in a Mutex so it can be updated at runtime when the user
/// changes their shortcut preference.
pub(crate) struct HotkeyState(pub Mutex<String>);

// ── Registry Helpers ─────────────────────────────────────────────────────────
// These use the `winreg` crate to interact with the Windows registry directly,
// avoiding any subprocess spawning (which would flash a terminal window).

/// Registers Quickno to start automatically when the user logs in.
fn set_autostart(exe_path: &str) {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    if let Ok(run) = hkcu.open_subkey_with_flags(
        r"SOFTWARE\Microsoft\Windows\CurrentVersion\Run",
        KEY_SET_VALUE,
    ) {
        let _ = run.set_value("Quickno", &format!("\"{}\" --autostart", exe_path));
    }
}

/// Checks if this is the first time the app has been launched for this version.
fn is_first_run() -> bool {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    hkcu.open_subkey(r"SOFTWARE\Quickno")
        .and_then(|k| k.get_value::<String, _>("v1_0_1Installed"))
        .is_err()
}

/// Marks the app as "installed" for this version.
fn mark_installed() {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    if let Ok((key, _)) = hkcu.create_subkey(r"SOFTWARE\Quickno") {
        let _ = key.set_value("v1_0_1Installed", &"1");
    }
}

// ── Overlay Toggle ───────────────────────────────────────────────────────────

/// Toggles the search overlay window between visible and hidden.
/// Called by the global hotkey handler and the tray icon click.
fn toggle_overlay(app: &tauri::AppHandle) {
    if let Some(win) = app.get_webview_window("overlay") {
        if OVERLAY_OPEN.load(Ordering::Relaxed) {
            let _ = win.hide();
            OVERLAY_OPEN.store(false, Ordering::Relaxed);
        } else {
            let _ = win.show();
            let _ = win.set_focus();
            OVERLAY_OPEN.store(true, Ordering::Relaxed);
        }
    }
}

// ── Main Entry Point ─────────────────────────────────────────────────────────

fn main() {
    // ── Single-instance guard ────────────────────────────────────────────
    // We bind a TCP port to ensure only one instance of the app runs.
    // If the port is already in use, we send a message to the existing
    // instance to show its settings window, then exit.
    let listener = std::net::TcpListener::bind("127.0.0.1:14205");
    if listener.is_err() {
        if let Ok(mut stream) = std::net::TcpStream::connect("127.0.0.1:14205") {
            use std::io::Write;
            let _ = stream.write_all(b"show_settings");
        }
        std::process::exit(0);
    }
    let main_listener = listener.unwrap();

    tauri::Builder::default()
        // ── Plugin Registration ──────────────────────────────────────────
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        // ── Managed State ────────────────────────────────────────────────
        .manage(HotkeyState(Mutex::new("alt+a".to_string())))
        // ── Tauri Command Handlers ───────────────────────────────────────
        // These are the Rust functions that the frontend can call via `invoke()`.
        .invoke_handler(tauri::generate_handler![
            commands::llm::query_llm,
            commands::settings::save_api_key,
            commands::settings::get_api_key,
            commands::settings::delete_api_key,
            commands::settings::test_api_key,
            commands::settings::get_system_theme,
            commands::settings::get_setting,
            commands::settings::save_setting,
            commands::browser::search_in_browser,
            commands::window::close_overlay,
            commands::window::open_settings,
            commands::window::update_shortcut,
            commands::browser::check_browser_exists,
            commands::browser::launch_app,
            commands::llm::list_gemini_models,
            commands::llm::list_provider_models,
        ])
        .setup(move |app| {
            // ── Transparent overlay background ───────────────────────────
            // WebView2 on Windows defaults to a white background even when
            // the window has `transparent: true`. We must explicitly clear it.
            if let Some(overlay) = app.get_webview_window("overlay") {
                let _ = overlay.set_background_color(Some(tauri::window::Color(0, 0, 0, 0)));
            }

            // ── Second-instance listener ─────────────────────────────────
            // Listens for messages from a second instance trying to launch.
            // When received, it shows and focuses the main settings window.
            let app_handle = app.handle().clone();
            std::thread::spawn(move || {
                for stream in main_listener.incoming() {
                    if let Ok(mut s) = stream {
                        use std::io::Read;
                        let mut buf = [0; 64];
                        if let Ok(n) = s.read(&mut buf) {
                            let msg = String::from_utf8_lossy(&buf[..n]);
                            if msg.starts_with("show_settings") {
                                if let Some(w) = app_handle.get_webview_window("settings") {
                                    let _ = w.show();
                                    let _ = w.set_focus();
                                }
                            }
                        }
                    }
                }
            });

            // ── System Tray ──────────────────────────────────────────────
            let quit_i     = MenuItem::with_id(app, "quit",     "✕  Quit",             true, None::<&str>)?;
            let settings_i = MenuItem::with_id(app, "settings", "⚙  Main Page",        true, None::<&str>)?;
            let toggle_i   = MenuItem::with_id(app, "toggle",   "⌨  Toggle (Alt+A)",   true, None::<&str>)?;
            let discord_i  = MenuItem::with_id(app, "discord",  "💬  Join Discord",     true, None::<&str>)?;
            let feedback_i = MenuItem::with_id(app, "feedback", "📝  Feedback",         true, None::<&str>)?;

            let menu = Menu::with_items(
                app,
                &[&toggle_i, &settings_i, &discord_i, &feedback_i, &quit_i],
            )?;

            TrayIconBuilder::new()
                .tooltip("Quickno — Alt+A")
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => app.exit(0),
                    "toggle" => toggle_overlay(app),
                    "settings" => {
                        if let Some(w) = app.get_webview_window("settings") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                    "discord" => {
                        let _ = open::that("https://discord.gg/tJXcYePghn");
                    }
                    "feedback" => {
                        let _ = open::that("https://discord.gg/CpMW6AMsKC");
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button: MouseButton::Left, .. } = event {
                        toggle_overlay(tray.app_handle());
                    }
                })
                .build(app)?;

            // ── Load and Register Global Hotkey ──────────────────────────
            // We read the saved hotkey from settings.json. If it doesn't exist,
            // we default to "alt+a".
            let settings_path = app.path().app_data_dir().unwrap_or_default().join("settings.json");
            let saved_hotkey = if settings_path.exists() {
                let content = std::fs::read_to_string(settings_path).unwrap_or_default();
                let json: serde_json::Value = serde_json::from_str(&content).unwrap_or_default();
                json.get("hotkey")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
                    .unwrap_or_else(|| "alt+a".to_string())
            } else {
                "alt+a".to_string()
            };

            // Store the hotkey in app state so it can be updated later
            *app.state::<HotkeyState>().0.lock().unwrap() = saved_hotkey.clone();

            // Register the hotkey
            app.global_shortcut().on_shortcut(&saved_hotkey, |app, _shortcut, event| {
                if event.state == ShortcutState::Pressed {
                    toggle_overlay(app);
                }
            })?;

            // ── Autostart ────────────────────────────────────────────────
            if let Ok(exe) = std::env::current_exe() {
                set_autostart(&exe.to_string_lossy());
            }

            // ── Show Main Window Logic ─────────────────────────
            // We only show the settings/welcome window on the very first run.
            // After that, the app starts silently in the tray.
            if is_first_run() {
                if let Some(s) = app.get_webview_window("settings") {
                    let _ = s.show();
                    let _ = s.set_focus();
                    mark_installed();
                }
            }

            Ok(())
        })
        // ── Window Close Behavior ────────────────────────────────────────
        // Instead of closing windows, we hide them. This keeps the app
        // running in the system tray for instant access.
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                if window.label() == "overlay" {
                    OVERLAY_OPEN.store(false, Ordering::Relaxed);
                }
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("tauri error");
}

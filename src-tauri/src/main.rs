// Copyright 2026 Vinay7766
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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
    Manager, Emitter,
};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};
use enigo::{Enigo, Keyboard, Settings, Direction, Key};
use walkdir::{WalkDir, DirEntry};
#[cfg(target_os = "windows")]
use winreg::enums::*;
#[cfg(target_os = "windows")]
use winreg::RegKey;

// ── Shared State ─────────────────────────────────────────────────────────────

/// Tracks whether the search overlay is currently visible.
pub(crate) static OVERLAY_OPEN: AtomicBool = AtomicBool::new(false);

/// Holds the currently registered global hotkey string (e.g. "alt+a").
/// Wrapped in a Mutex so it can be updated at runtime when the user
/// changes their shortcut preference.
pub(crate) struct HotkeyState(pub Mutex<String>);

/// Holds background indexed user files for fast system-wide search.
pub struct FileIndexState(pub std::sync::RwLock<Vec<commands::browser::FileInfo>>);

// ── Registry Helpers ─────────────────────────────────────────────────────────
// These use the `winreg` crate to interact with the Windows registry directly,
// avoiding any subprocess spawning (which would flash a terminal window).

/// Registers Quickno to start automatically when the user logs in.
#[cfg(target_os = "windows")]
fn set_autostart(exe_path: &str) {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    if let Ok(run) = hkcu.open_subkey_with_flags(
        r"SOFTWARE\Microsoft\Windows\CurrentVersion\Run",
        KEY_SET_VALUE,
    ) {
        let _ = run.set_value("Quickno", &format!("\"{}\" --autostart", exe_path));
    }
}

#[cfg(target_os = "macos")]
fn set_autostart(exe_path: &str) {
    if let Some(home) = std::env::var_os("HOME") {
        let plist_dir = std::path::Path::new(&home).join("Library").join("LaunchAgents");
        let _ = std::fs::create_dir_all(&plist_dir);
        let plist_path = plist_dir.join("com.quickno.app.plist");
        
        let plist_content = format!(
            r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.quickno.app</string>
    <key>ProgramArguments</key>
    <array>
        <string>{}</string>
        <string>--autostart</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>"#,
            exe_path
        );
        let _ = std::fs::write(plist_path, plist_content);
    }
}

#[cfg(target_os = "linux")]
fn set_autostart(exe_path: &str) {
    if let Some(home) = std::env::var_os("HOME") {
        let autostart_dir = std::path::Path::new(&home).join(".config").join("autostart");
        let _ = std::fs::create_dir_all(&autostart_dir);
        let desktop_path = autostart_dir.join("quickno.desktop");

        let desktop_content = format!(
            r#"[Desktop Entry]
Type=Application
Version=1.0
Name=Quickno
Comment=Quickno AI Desktop Assistant
Exec="{}" --autostart
Icon=quickno
Terminal=false
StartupNotify=false
Categories=Utility;
"#,
            exe_path
        );
        let _ = std::fs::write(desktop_path, desktop_content);
    }
}

#[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
fn set_autostart(_exe_path: &str) {}

/// Checks if this is the first time the app has been launched for this version.
#[cfg(target_os = "windows")]
fn is_first_run(version: &str, app_handle: &tauri::AppHandle) -> bool {
    use tauri::Manager;
    let settings_path = app_handle.path().app_data_dir().unwrap_or_default().join("settings.json");
    if !settings_path.exists() {
        return true;
    }

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let key_name = format!("v{}_installed", version.replace('.', "_"));
    hkcu.open_subkey(r"SOFTWARE\Quickno")
        .and_then(|k| k.get_value::<String, _>(&key_name))
        .is_err()
}

#[cfg(not(target_os = "windows"))]
fn is_first_run(_version: &str, _app_handle: &tauri::AppHandle) -> bool { false }

/// Marks the app as "installed" for this version.
#[cfg(target_os = "windows")]
fn mark_installed(version: &str) {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let key_name = format!("v{}_installed", version.replace('.', "_"));
    if let Ok((key, _)) = hkcu.create_subkey(r"SOFTWARE\Quickno") {
        let _ = key.set_value(&key_name, &"1");
    }
}

#[cfg(not(target_os = "windows"))]
fn mark_installed(_version: &str) {}

// ── Overlay Toggle ───────────────────────────────────────────────────────────

/// Toggles the search overlay window between visible and hidden.
/// Called by the global hotkey handler and the tray icon click.
fn toggle_overlay(app: &tauri::AppHandle) {
    if let Some(win) = app.get_webview_window("overlay") {
        if OVERLAY_OPEN.load(Ordering::Relaxed) {
            let _ = win.hide();
            OVERLAY_OPEN.store(false, Ordering::Relaxed);
        } else {
            // FAKE CTRL+C MAGIC:
            // Before we steal focus by showing the overlay, we simulate a Ctrl+C keystroke.
            // This grabs whatever text the user has highlighted in their current app (Chrome, Word, etc.)
            // and puts it in the clipboard so Quickno can instantly auto-paste it!
            if let Ok(mut enigo) = Enigo::new(&Settings::default()) {
                let _ = enigo.key(Key::Control, Direction::Press);
                let _ = enigo.key(Key::Unicode('c'), Direction::Click);
                let _ = enigo.key(Key::Control, Direction::Release);
            }
            
            // Wait 50ms for the OS clipboard to actually register the copy
            std::thread::sleep(std::time::Duration::from_millis(50));

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
        .plugin(tauri_plugin_os::init())
        // ── Managed State ────────────────────────────────────────────────
        .manage(HotkeyState(Mutex::new("alt+a".to_string())))
        .manage(FileIndexState(std::sync::RwLock::new(Vec::new())))
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
            commands::browser::list_installed_apps,
            commands::browser::list_local_files,
            commands::llm::list_gemini_models,
            commands::llm::providers::list_provider_models,
            commands::llm::ollama::list_ollama_models,
            commands::llm::providers::list_openai_compatible,
            commands::llm::ollama::pull_ollama_model,
            commands::settings::factory_reset,
            commands::terminal::execute_terminal_command,
            commands::automation::execute_desktop_command,
            commands::ui_automation::execute_ui_actions,
            commands::vision::capture_screen,
            commands::plugins::run_plugin,
        ])
        .setup(move |app| {
            // ── Transparent overlay background ───────────────────────────
            // WebView2 on Windows defaults to a white background even when
            // the window has `transparent: true`. We must explicitly clear it.
            if let Some(overlay) = app.get_webview_window("overlay") {
                let _ = overlay.set_background_color(Some(tauri::window::Color(0, 0, 0, 0)));
                // Force size to ensure it matches the new compact design
                let _ = overlay.set_size(tauri::Size::Logical(tauri::LogicalSize {
                    width: 480.0,
                    height: 52.0,
                }));
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
            // ── Load Global Hotkey ──────────────────────────────────────
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

            // ── System Tray ──────────────────────────────────────────────
            let quit_i     = MenuItem::with_id(app, "quit",     "Quit",               true, None::<&str>)?;
            let settings_i = MenuItem::with_id(app, "settings", "Settings",           true, None::<&str>)?;
            
            // Dynamic label for the toggle menu item
            let toggle_label = format!("Toggle ({})", saved_hotkey.replace('+', " + ").to_uppercase());
            let toggle_i   = MenuItem::with_id(app, "toggle", &toggle_label,   true, None::<&str>)?;
            
            let discord_i  = MenuItem::with_id(app, "discord",  "Join Discord",       true, None::<&str>)?;
            let feedback_i = MenuItem::with_id(app, "feedback", "Feedback",           true, None::<&str>)?;

            let menu = Menu::with_items(
                app,
                &[&toggle_i, &settings_i, &discord_i, &feedback_i, &quit_i],
            )?;

            TrayIconBuilder::new()
                .tooltip(&format!("Quickno — {}", saved_hotkey.to_uppercase()))
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

            // ── Global Hotkey Registration ──────────────────────────────
            // Register the hotkey with a fallback to "alt+a" if it fails.
            // We use a match to ensure we don't register both.
            let registration_result = app.global_shortcut().on_shortcut(saved_hotkey.as_str(), |app, _shortcut, event| {
                if event.state == ShortcutState::Pressed {
                    toggle_overlay(app);
                }
            });
            
            // Secondary Hotkey for "Instant Search" (e.g. Alt+S)
            // This emits an event to tell the frontend to auto-paste and auto-search immediately
            let _ = app.global_shortcut().on_shortcut("alt+s", |app, _shortcut, event| {
                if event.state == ShortcutState::Pressed {
                    toggle_overlay(app);
                    let _ = app.emit("instant-search", ());
                }
            });

            // Voice Control (Jarvis Mode) - Alt+V
            let _ = app.global_shortcut().on_shortcut("alt+v", |app, _shortcut, event| {
                if event.state == ShortcutState::Pressed {
                    if let Some(window) = app.get_webview_window("main") {
                        if !window.is_visible().unwrap_or(false) {
                            toggle_overlay(app);
                        }
                    }
                    let _ = app.emit("voice-start", ());
                } else if event.state == ShortcutState::Released {
                    let _ = app.emit("voice-stop", ());
                }
            });

            if let Err(_) = registration_result {
                // If custom failed, AND it wasn't already alt+a, then fallback
                if saved_hotkey != "alt+a" {
                    let _ = app.global_shortcut().on_shortcut("alt+a", |app, _shortcut, event| {
                        if event.state == ShortcutState::Pressed {
                            toggle_overlay(app);
                        }
                    });
                }
            }

            // ── Autostart ────────────────────────────────────────────────
            if let Ok(exe) = std::env::current_exe() {
                set_autostart(&exe.to_string_lossy());
            }

            // ── Show Main Window Logic ─────────────────────────
            // We only show the settings/welcome window on the very first run.
            // After that, the app starts silently in the tray.
            let version = app.package_info().version.to_string();
            if is_first_run(&version, app.handle()) {
                if let Some(s) = app.get_webview_window("settings") {
                    let _ = s.show();
                    let _ = s.set_focus();
                    mark_installed(&version);
                }
            }
            // Spawn the high-performance background directory indexer thread
            let app_handle = app.handle().clone();
            std::thread::spawn(move || {
                // IMPORTANT: Delay the heavy disk indexing by 15 seconds!
                // During Windows logon, starting a massive recursive WalkDir immediately 
                // causes massive Disk I/O contention, delaying the WebView2 UI initialization.
                std::thread::sleep(std::time::Duration::from_secs(15));

                let root_dir = if cfg!(target_os = "windows") {
                    std::env::var("USERPROFILE").unwrap_or_else(|_| "C:\\".to_string())
                } else {
                    std::env::var("HOME").unwrap_or_else(|_| "/".to_string())
                };

                let indexed_files = index_user_files_concurrently(&root_dir);
                
                if let Some(state) = app_handle.try_state::<FileIndexState>() {
                    if let Ok(mut writer) = state.0.write() {
                        *writer = indexed_files;
                    }
                }
            });

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

fn is_hidden_or_system(entry: &DirEntry) -> bool {
    let name = entry.file_name().to_string_lossy();
    if name.starts_with('.') {
        return true;
    }
    match name.as_ref() {
        "node_modules" | "AppData" | "Local Settings" | "Application Data" | "Cookies" |
        "SendTo" | "Templates" | "PrintHood" | "NetHood" | "Recent" | "Windows" |
        "Program Files" | "Program Files (x86)" | "ProgramData" |
        "System Volume Information" | "$Recycle.Bin" | "Recovery" |
        "Documents and Settings" | "MSOCache" => true,
        _ => false,
    }
}

fn index_user_files_concurrently(root: &str) -> Vec<commands::browser::FileInfo> {
    let mut files = Vec::new();
    let walker = WalkDir::new(root).max_depth(6).into_iter();
    for entry in walker.filter_entry(|e| !is_hidden_or_system(e)) {
        if let Ok(e) = entry {
            if e.file_type().is_file() {
                files.push(commands::browser::FileInfo {
                    name: e.file_name().to_string_lossy().to_string(),
                    path: e.path().to_string_lossy().to_string(),
                });
            }
        }
    }
    files
}

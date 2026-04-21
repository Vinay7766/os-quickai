#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod error;
mod models;

use std::sync::{atomic::{AtomicBool, Ordering}, Mutex};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    Manager,
};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};
use winreg::enums::*;
use winreg::RegKey;

// Tracks whether the overlay is currently visible
pub(crate) static OVERLAY_OPEN: AtomicBool = AtomicBool::new(false);

// Managed state for the currently registered hotkey string
pub(crate) struct HotkeyState(pub Mutex<String>);

// ── Registry helpers (winreg — no subprocess, no terminal popup) ──────────
fn set_autostart(exe_path: &str) {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    if let Ok(run) = hkcu.open_subkey_with_flags(
        r"SOFTWARE\Microsoft\Windows\CurrentVersion\Run",
        KEY_SET_VALUE,
    ) {
        let _ = run.set_value("Quickno", &format!("\"{}\"", exe_path));
    }
}

fn is_first_run() -> bool {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    hkcu.open_subkey(r"SOFTWARE\Quickno")
        .and_then(|k| k.get_value::<String, _>("v1Installed"))
        .is_err()
}

fn mark_installed() {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    if let Ok((key, _)) = hkcu.create_subkey(r"SOFTWARE\Quickno") {
        let _ = key.set_value("v1Installed", &"1");
    }
}

// ── Toggle helper ────────────────────────────────────────────────────────
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

fn main() {
    // Single-instance via TCP port. If port is in use, we're the second instance.
    let listener = std::net::TcpListener::bind("127.0.0.1:14205");
    if listener.is_err() {
        // We are the second instance. Send message to open settings.
        if let Ok(mut stream) = std::net::TcpStream::connect("127.0.0.1:14205") {
            use std::io::Write;
            let _ = stream.write_all(b"show_settings");
        }
        std::process::exit(0);
    }
    let main_listener = listener.unwrap();

    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        // Initialize global-shortcut plugin (no shortcuts registered yet — done in setup)
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .manage(HotkeyState(Mutex::new("alt+a".to_string())))
        .invoke_handler(tauri::generate_handler![
            commands::llm::query_llm,
            commands::settings::save_api_key,
            commands::settings::get_api_key,
            commands::settings::delete_api_key,
            commands::settings::test_api_key,
            commands::browser::search_in_browser,
            commands::window::close_overlay,
            commands::window::open_settings,
            commands::window::update_shortcut,
        ])
        .setup(move |app| {
            // ── Force WebView2 transparent background ────────────────────
            // On Windows, WebView2 has a default white background even when
            // the window has transparent: true. We must explicitly clear it.
            if let Some(overlay) = app.get_webview_window("overlay") {
                // RGBA(0,0,0,0) = fully transparent
                let _ = overlay.set_background_color(Some(tauri::window::Color(0, 0, 0, 0)));
            }

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

            // ── Tray menu ────────────────────────────────────────────────
            let quit_i     = MenuItem::with_id(app, "quit",     "Quit",               true, None::<&str>)?;
            let settings_i = MenuItem::with_id(app, "settings", "Settings",           true, None::<&str>)?;
            let guide_i    = MenuItem::with_id(app, "guide",    "User Guide",          true, None::<&str>)?;
            let discord_i  = MenuItem::with_id(app, "discord",  "Join Discord",        true, None::<&str>)?;
            let feedback_i = MenuItem::with_id(app, "feedback", "Feedback / Bug Report", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&settings_i, &guide_i, &discord_i, &feedback_i, &quit_i])?;

            TrayIconBuilder::new()
                .tooltip("Quickno — Alt+A")
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit"     => app.exit(0),
                    "settings" => {
                        if let Some(w) = app.get_webview_window("settings") {
                            let _ = w.show(); let _ = w.set_focus();
                        }
                    }
                    "guide" => {
                        if let Some(w) = app.get_webview_window("guide") {
                            let _ = w.show(); let _ = w.set_focus();
                        }
                    }
                    "discord" => {
                        let _ = open::that("https://discord.gg/29a3qkEsX");
                    }
                    "feedback" => {
                        let _ = open::that("https://github.com/Vinay7766/os-quickai/issues/new/choose");
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button: MouseButton::Left, .. } = event {
                        toggle_overlay(tray.app_handle());
                    }
                })
                .build(app)?;

            // ── Register default hotkey ──────────────────────────────────
            let default_hotkey = "alt+a";
            app.global_shortcut().on_shortcut(default_hotkey, |app, _shortcut, event| {
                if event.state == ShortcutState::Pressed {
                    toggle_overlay(app);
                }
            })?;

            // ── Autostart ────────────────────────────────────────────────
            if let Ok(exe) = std::env::current_exe() {
                set_autostart(&exe.to_string_lossy());
            }

            // ── First-run → show guide ────────────────────────────────────
            if is_first_run() {
                mark_installed();
                if let Some(g) = app.get_webview_window("guide") {
                    let _ = g.show(); let _ = g.set_focus();
                }
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("tauri error");
}

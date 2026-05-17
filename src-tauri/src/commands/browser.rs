// ─────────────────────────────────────────────────────────────────────────────
// browser.rs — Browser detection and launch commands
// ─────────────────────────────────────────────────────────────────────────────
// Provides commands to:
//   • Open a URL in a specific browser
//   • Verify if a browser is installed on the user's system
// ─────────────────────────────────────────────────────────────────────────────

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;
use std::process::Command;

/// Maps a user-friendly browser name to its executable filename.
#[cfg(target_os = "windows")]
fn browser_exe(browser: &str) -> &str {
    match browser {
        "chrome"  => "chrome.exe",
        "firefox" => "firefox.exe",
        "brave"   => "brave.exe",
        "bing"    => "msedge.exe",    // Microsoft Edge
        "opera"   => "launcher.exe",  // Opera uses launcher.exe or opera.exe
        "comet"   => "comet.exe",
        _         => "explorer.exe",  // Fallback: Windows default handler
    }
}

/// Maps a browser identifier to its human-readable display name.
fn browser_display_name(browser: &str) -> &str {
    match browser {
        "chrome"  => "Google Chrome",
        "firefox" => "Firefox",
        "brave"   => "Brave",
        "bing"    => "Microsoft Edge",
        "opera"   => "Opera",
        "comet"   => "Comet",
        _         => "the selected browser",
    }
}

/// Opens a URL in the specified browser.
#[tauri::command]
pub async fn search_in_browser(browser: String, url: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let exe_name = browser_exe(&browser);
        let safe_url = url.replace("'", "''");

        let ps_script = format!(
            r#"
$exe = '{exe}'
$url = '{url}'
$reg1 = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\$exe"
$reg2 = "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\$exe"

if ($exe -eq 'launcher.exe' -and !(Test-Path $reg1) -and !(Test-Path $reg2)) {{
    $reg1 = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\opera.exe"
    $reg2 = "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\opera.exe"
}}

if (Test-Path $reg1) {{
    $path = (Get-ItemProperty $reg1).'(default)'
    Start-Process -FilePath $path -ArgumentList $url
    exit 0
}} elseif (Test-Path $reg2) {{
    $path = (Get-ItemProperty $reg2).'(default)'
    Start-Process -FilePath $path -ArgumentList $url
    exit 0
}} elseif (Get-Command $exe -ErrorAction SilentlyContinue) {{
    Start-Process -FilePath $exe -ArgumentList $url
    exit 0
}} else {{
    exit 1
}}
"#,
            exe = exe_name,
            url = safe_url
        );

        const CREATE_NO_WINDOW: u32 = 0x08000000;
        let status = Command::new("powershell")
            .creation_flags(CREATE_NO_WINDOW)
            .args(["-NoProfile", "-WindowStyle", "Hidden", "-Command", &ps_script])
            .status();

        if let Ok(s) = status {
            if s.success() { return Ok(()); }
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        // On Mac/Linux, we use the 'open' crate which handles defaults and paths automatically
        if open::that(&url).is_ok() {
            return Ok(());
        }
    }

    Err(format!(
        "{} is not installed on your system. Please install it first or choose a different browser.",
        browser_display_name(&browser)
    ))
}

/// Checks whether a specific browser is installed on the system.
#[tauri::command]
pub async fn check_browser_exists(browser: String) -> bool {
    #[cfg(target_os = "windows")]
    {
        let exe_name = browser_exe(&browser);
        if browser == "default" || exe_name == "explorer.exe" {
            return true;
        }

        use winreg::enums::*;
        use winreg::RegKey;

        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
        let subkey = format!(r"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\{}", exe_name);

        if hklm.open_subkey(&subkey).is_ok() || hkcu.open_subkey(&subkey).is_ok() {
            return true;
        }

        if browser == "opera" {
            let opera_subkey = r"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\opera.exe";
            if hklm.open_subkey(opera_subkey).is_ok() || hkcu.open_subkey(opera_subkey).is_ok() {
                return true;
            }
        }
        return false;
    }

    #[cfg(not(target_os = "windows"))]
    {
        // Simple fallback for non-windows: assume common browsers exist or handle via defaults
        true
    }
}
    
/// Launches an application by its name.
#[tauri::command]
pub async fn launch_app(name: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let safe_name = name.replace("'", "''");
        let ps_script = format!(
            r#"
$query = '{name}'
$app = Get-StartApps | Where-Object {{ $_.Name -like "*$query*" }} | Select-Object -First 1
if ($app) {{
    Start-Process "shell:AppsFolder\$($app.AppId)"
    exit 0
}} else {{
    if (Get-Command $query -ErrorAction SilentlyContinue) {{
        Start-Process $query
        exit 0
    }}
    exit 1
}}
"#,
            name = safe_name
        );

        const CREATE_NO_WINDOW: u32 = 0x08000000;
        let status = Command::new("powershell")
            .creation_flags(CREATE_NO_WINDOW)
            .args(["-NoProfile", "-WindowStyle", "Hidden", "-Command", &ps_script])
            .status();

        if let Ok(s) = status {
            if s.success() { return Ok(()); }
        }
    }

    #[cfg(target_os = "macos")]
    {
        // 1. Try 'open -a "Name"'
        if Command::new("open").args(["-a", &name]).status().map(|s| s.success()).unwrap_or(false) {
            return Ok(());
        }

        // 2. Search common locations for .app bundles
        let search_dirs = [
            "/Applications",
            "/System/Applications",
            &format!("{}/Applications", std::env::var("HOME").unwrap_or_default())
        ];

        for dir in search_dirs {
            if let Ok(entries) = std::fs::read_dir(dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if let Some(filename) = path.file_name().and_then(|n| n.to_str()) {
                        if filename.to_lowercase().contains(&name.to_lowercase()) && filename.ends_with(".app") {
                            if Command::new("open").arg(&path).status().map(|s| s.success()).unwrap_or(false) {
                                return Ok(());
                            }
                        }
                    }
                }
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        // 1. Try direct command if it's in PATH
        if Command::new("sh").args(["-c", &format!("command -v {}", name)]).status().map(|s| s.success()).unwrap_or(false) {
            if Command::new(&name).spawn().is_ok() {
                return Ok(());
            }
        }

        // 2. Search for .desktop files
        let desktop_dirs = [
            "/usr/share/applications",
            "/usr/local/share/applications",
            &format!("{}/.local/share/applications", std::env::var("HOME").unwrap_or_default())
        ];

        for dir in desktop_dirs {
            if let Ok(entries) = std::fs::read_dir(dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.extension().map_or(false, |e| e == "desktop") {
                        if let Ok(content) = std::fs::read_to_string(&path) {
                            let mut found_name = false;
                            for line in content.lines() {
                                if line.to_lowercase().starts_with("name=") && line.to_lowercase().contains(&name.to_lowercase()) {
                                    found_name = true;
                                    break;
                                }
                            }

                            if found_name {
                                // Try launching via gtk-launch
                                if let Some(file_name) = path.file_name() {
                                    if Command::new("gtk-launch").arg(file_name).spawn().is_ok() {
                                        return Ok(());
                                    }
                                }

                                // Fallback: Parse Exec line
                                for line in content.lines() {
                                    if line.starts_with("Exec=") {
                                        let exec = line[5..].split_whitespace().next().unwrap_or("");
                                        if !exec.is_empty() && Command::new(exec).spawn().is_ok() {
                                            return Ok(());
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Generic fallback for any other Unix-like or if specific searches fail
    #[cfg(not(target_os = "windows"))]
    {
        if open::that(&name).is_ok() {
            return Ok(());
        }
    }

    Err(format!("Could not find or launch application: {}", name))
}

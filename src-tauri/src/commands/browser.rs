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

    #[cfg(target_os = "macos")]
    {
        if browser == "default" {
            return true;
        }
        let paths = match browser.as_str() {
            "chrome" => vec!["/Applications/Google Chrome.app"],
            "firefox" => vec!["/Applications/Firefox.app"],
            "brave" => vec!["/Applications/Brave Browser.app"],
            "bing" => vec!["/Applications/Microsoft Edge.app"],
            "opera" => vec!["/Applications/Opera.app"],
            _ => vec![],
        };

        for path in paths {
            if std::path::Path::new(path).exists() {
                return true;
            }
        }
        
        let app_name = match browser.as_str() {
            "chrome" => "Google Chrome",
            "firefox" => "Firefox",
            "brave" => "Brave Browser",
            "bing" => "Microsoft Edge",
            "opera" => "Opera",
            _ => &browser,
        };
        if Command::new("open").args(["-Ra", app_name]).status().map(|s| s.success()).unwrap_or(false) {
            return true;
        }
        return false;
    }

    #[cfg(target_os = "linux")]
    {
        if browser == "default" {
            return true;
        }
        let execs = match browser.as_str() {
            "chrome" => vec!["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"],
            "firefox" => vec!["firefox"],
            "brave" => vec!["brave", "brave-browser"],
            "bing" => vec!["microsoft-edge", "microsoft-edge-stable"],
            "opera" => vec!["opera"],
            "comet" => vec!["comet"],
            _ => vec![browser.as_str()],
        };

        for exe in execs {
            if Command::new("which").arg(exe).status().map(|s| s.success()).unwrap_or(false) {
                return true;
            }
            if Command::new("sh").args(["-c", &format!("command -v {}", exe)]).status().map(|s| s.success()).unwrap_or(false) {
                return true;
            }
        }
        return false;
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        true
    }
}
    
#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct AppInfo {
    pub name: String,
    #[serde(rename = "appId")]
    pub app_id: String,
}

#[derive(serde::Deserialize)]
#[allow(non_snake_case)]
struct AppInfoRaw {
    Name: String,
    #[serde(alias = "AppId", alias = "AppID")]
    AppId: String,
}

/// Lists all installed applications on the system.
#[tauri::command]
pub async fn list_installed_apps() -> Result<Vec<AppInfo>, String> {
    #[cfg(target_os = "windows")]
    {
        let ps_script = "Get-StartApps | Select-Object Name, AppId | ConvertTo-Json -Compress";

        const CREATE_NO_WINDOW: u32 = 0x08000000;
        let output = Command::new("powershell")
            .creation_flags(CREATE_NO_WINDOW)
            .args(["-NoProfile", "-WindowStyle", "Hidden", "-Command", ps_script])
            .output();

        match output {
            Ok(out) => {
                let stdout = String::from_utf8_lossy(&out.stdout).trim().to_string();
                if stdout.is_empty() {
                    return Ok(Vec::new());
                }
                if stdout.starts_with('{') {
                    if let Ok(item) = serde_json::from_str::<AppInfoRaw>(&stdout) {
                        return Ok(vec![AppInfo {
                            name: item.Name,
                            app_id: item.AppId,
                        }]);
                    }
                } else if stdout.starts_with('[') {
                    if let Ok(items) = serde_json::from_str::<Vec<AppInfoRaw>>(&stdout) {
                        return Ok(items.into_iter().map(|item| AppInfo {
                            name: item.Name,
                            app_id: item.AppId,
                        }).collect());
                    }
                }
                Ok(Vec::new())
            }
            Err(e) => Err(e.to_string()),
        }
    }

    #[cfg(target_os = "macos")]
    {
        let search_dirs = [
            "/Applications",
            "/Applications/Utilities",
            "/System/Applications",
            "/System/Applications/Utilities",
        ];
        let mut apps = Vec::new();
        for dir in search_dirs {
            if let Ok(entries) = std::fs::read_dir(dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.extension().map_or(false, |e| e == "app") {
                        if let Some(name) = path.file_stem().and_then(|n| n.to_str()) {
                            apps.push(AppInfo {
                                name: name.to_string(),
                                app_id: path.to_string_lossy().to_string(),
                            });
                        }
                    }
                }
            }
        }
        Ok(apps)
    }

    #[cfg(target_os = "linux")]
    {
        let desktop_dirs = [
            "/usr/share/applications",
            "/usr/local/share/applications",
        ];
        let mut apps = Vec::new();
        for dir in desktop_dirs {
            if let Ok(entries) = std::fs::read_dir(dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.extension().map_or(false, |e| e == "desktop") {
                        if let Ok(content) = std::fs::read_to_string(&path) {
                            let mut name_opt = None;
                            for line in content.lines() {
                                if line.starts_with("Name=") {
                                    name_opt = Some(line[5..].trim().to_string());
                                    break;
                                }
                            }
                            if let Some(name) = name_opt {
                                apps.push(AppInfo {
                                    name,
                                    app_id: path.to_string_lossy().to_string(),
                                });
                            }
                        }
                    }
                }
            }
        }
        Ok(apps)
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        Ok(Vec::new())
    }
}

/// Launches an application by its name or app_id.
#[tauri::command]
pub async fn launch_app(name: String, app_id: Option<String>) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        if let Some(ref id) = app_id {
            if !id.is_empty() {
                let safe_id = id.replace("'", "''");
                let ps_script = format!(
                    r#"
Start-Process "shell:AppsFolder\{}"
exit 0
"#,
                    safe_id
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
        }

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
            "/Applications/Utilities",
            "/System/Applications",
            "/System/Applications/Utilities",
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
                                // Fallback: Parse Exec line and execute it via shell (handles snap, flatpak, quotes, and parameters)
                                for line in content.lines() {
                                    if line.starts_with("Exec=") {
                                        let clean_exec = line[5..]
                                            .replace("%u", "")
                                            .replace("%U", "")
                                            .replace("%f", "")
                                            .replace("%F", "")
                                            .replace("%k", "")
                                            .replace("%v", "")
                                            .trim()
                                            .to_string();

                                        if !clean_exec.is_empty() {
                                            if Command::new("sh").args(["-c", &clean_exec]).spawn().is_ok() {
                                                return Ok(());
                                            }
                                        }
                                    }
                                }

                                // Try launching via gtk-launch as a secondary option
                                if let Some(file_name) = path.file_name() {
                                    if Command::new("gtk-launch").arg(file_name).spawn().is_ok() {
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

    // Generic fallback for any other Unix-like or if specific searches fail
    #[cfg(not(target_os = "windows"))]
    {
        if open::that(&name).is_ok() {
            return Ok(());
        }
    }

    Err(format!("Could not find or launch application: {}", name))
}

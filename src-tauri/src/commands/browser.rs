// ─────────────────────────────────────────────────────────────────────────────
// browser.rs — Browser detection and launch commands
// ─────────────────────────────────────────────────────────────────────────────
// Provides commands to:
//   • Open a URL in a specific browser (checks App Paths registry)
//   • Verify if a browser is installed on the user's system
// ─────────────────────────────────────────────────────────────────────────────

use std::os::windows::process::CommandExt;
use std::process::Command;

/// Maps a user-friendly browser name to its executable filename.
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
///
/// Uses a PowerShell script (hidden, no terminal popup) to look up the
/// browser's installation path from the Windows registry and launch it.
///
/// # Errors
/// Returns an error message if the browser is not found or fails to launch.
#[tauri::command]
pub async fn search_in_browser(browser: String, url: String) -> Result<(), String> {
    let exe_name = browser_exe(&browser);

    // Escape single-quotes for safe PowerShell single-quoted string embedding
    // In PowerShell, single quotes are escaped by doubling them ('')
    let safe_url = url.replace("'", "''");

    // PowerShell script that:
    //   1. Checks HKLM and HKCU App Paths for the browser executable
    //   2. Falls back to checking PATH
    //   3. Launches the browser with the URL as an argument
    let ps_script = format!(
        r#"
$exe = '{exe}'
$url = '{url}'
$reg1 = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\$exe"
$reg2 = "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\$exe"

# Opera sometimes registers as opera.exe instead of launcher.exe
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

    // CREATE_NO_WINDOW flag prevents a terminal window from flashing
    const CREATE_NO_WINDOW: u32 = 0x08000000;
    let status = Command::new("powershell")
        .creation_flags(CREATE_NO_WINDOW)
        .args(["-NoProfile", "-WindowStyle", "Hidden", "-Command", &ps_script])
        .status();

    match status {
        Ok(s) if s.success() => Ok(()),
        _ => Err(format!(
            "{} is not installed on your system. Please install it first or choose a different browser.",
            browser_display_name(&browser)
        )),
    }
}

/// Checks whether a specific browser is installed on the system.
///
/// Looks up the browser's executable in the Windows App Paths registry.
/// Returns `true` if found, `false` otherwise.
#[tauri::command]
pub async fn check_browser_exists(browser: String) -> bool {
    let exe_name = browser_exe(&browser);

    // "default" or unknown browsers are assumed to exist (handled by explorer.exe)
    if browser == "default" || exe_name == "explorer.exe" {
        return true;
    }

    use winreg::enums::*;
    use winreg::RegKey;

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let subkey = format!(
        r"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\{}",
        exe_name
    );

    // Check both HKLM and HKCU for the browser's App Paths entry
    if hklm.open_subkey(&subkey).is_ok() || hkcu.open_subkey(&subkey).is_ok() {
        return true;
    }

    // Special case: Opera may be registered under opera.exe instead of launcher.exe
    if browser == "opera" {
        let opera_subkey = r"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\opera.exe";
        if hklm.open_subkey(opera_subkey).is_ok() || hkcu.open_subkey(opera_subkey).is_ok() {
            return true;
        }
    }

    false
}

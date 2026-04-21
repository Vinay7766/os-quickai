use std::process::Command;
use std::os::windows::process::CommandExt;

#[tauri::command]
pub async fn search_in_browser(browser: String, url: String) -> Result<(), String> {
    let exe_name = match browser.as_str() {
        "chrome" => "chrome.exe",
        "firefox" => "firefox.exe",
        "brave" => "brave.exe",
        "bing" => "msedge.exe",
        "opera" => "launcher.exe", // Opera often uses launcher.exe or opera.exe
        "comet" => "comet.exe",
        _ => "explorer.exe",
    };

    // Safe escaping for the URL inside a double-quoted PowerShell string
    let safe_url = url.replace("\"", "`\"");

    let ps_script = format!(
        r#"
$exe = "{exe}"
$url = "{url}"
$reg1 = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\$exe"
$reg2 = "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\$exe"

# special case for opera which might be opera.exe
if ($exe -eq "launcher.exe" -and !(Test-Path $reg1) -and !(Test-Path $reg2)) {{
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

    match status {
        Ok(s) if s.success() => Ok(()),
        _ => {
            let browser_name = match browser.as_str() {
                "chrome" => "Google Chrome",
                "firefox" => "Firefox",
                "brave" => "Brave",
                "bing" => "Bing (Edge)",
                "opera" => "Opera",
                "comet" => "Comet",
                _ => "the selected browser",
            };
            Err(format!(
                "Please install {} and fix all the issues and errors.",
                browser_name
            ))
        }
    }
}

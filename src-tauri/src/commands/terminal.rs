// ─────────────────────────────────────────────────────────────────────────────
// terminal.rs — System command execution handler
// ─────────────────────────────────────────────────────────────────────────────
// Allows users to execute terminal commands directly from the search overlay.
// Handles cross-platform shell spawning:
//   • Windows → powershell -Command
//   • macOS/Linux → sh -c
// ─────────────────────────────────────────────────────────────────────────────

use crate::error::AppError;
use std::process::Command;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[tauri::command]
pub async fn execute_terminal_command(command: String) -> Result<String, AppError> {
    let mut cmd = if cfg!(target_os = "windows") {
        let mut c = Command::new("powershell.exe");
        c.args(["-NoProfile", "-NonInteractive", "-Command", &command]);
        #[cfg(target_os = "windows")]
        c.creation_flags(0x08000000); // CREATE_NO_WINDOW
        c
    } else {
        let mut c = Command::new("/bin/sh");
        c.args(["-c", &command]);
        c
    };

    let output = cmd.output().map_err(|e| AppError::NetworkError(e.to_string()))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if output.status.success() {
        if stdout.is_empty() && stderr.is_empty() {
            Ok("Command executed successfully (no output).".to_string())
        } else if !stdout.is_empty() {
            Ok(stdout)
        } else {
            Ok(stderr)
        }
    } else {
        Err(AppError::NetworkError(format!(
            "Command failed with exit code {}.\n\nSTDOUT: {}\n\nSTDERR: {}",
            output.status.code().unwrap_or(-1),
            stdout,
            stderr
        )))
    }
}

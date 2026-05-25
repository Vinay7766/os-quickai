use std::process::Command;

#[tauri::command]
pub async fn execute_desktop_command(app: tauri::AppHandle, command: String) -> Result<String, String> {
    let cmd_lower = command.trim().to_lowercase();
    
    // 1. Process Closing
    if cmd_lower.starts_with("close ") || cmd_lower.starts_with("kill ") {
        let app_name = if cmd_lower.starts_with("close ") {
            &command[6..]
        } else {
            &command[5..]
        }.trim();
        return close_system_process(app_name).await;
    }

    // 2. File Operations (copy, move, delete)
    if cmd_lower.starts_with("copy ") {
        return handle_file_copy(app, &command).await;
    }
    if cmd_lower.starts_with("move ") {
        return handle_file_move(app, &command).await;
    }
    if cmd_lower.starts_with("delete ") || cmd_lower.starts_with("remove ") {
        let file_path = if cmd_lower.starts_with("delete ") {
            &command[7..]
        } else {
            &command[7..]
        }.trim();
        return handle_file_delete(app, file_path).await;
    }
    if cmd_lower.starts_with("create folder ") {
        let folder_path = &command[14..].trim();
        return handle_create_folder(folder_path).await;
    }
    if cmd_lower.starts_with("create file ") {
        let file_path = &command[12..].trim();
        return handle_create_file(file_path).await;
    }

    // Load custom power command triggers
    let lock_triggers_val = crate::commands::settings::get_setting(app.clone(), "customLockCommand".to_string()).await
        .unwrap_or(serde_json::Value::Null);
    let lock_triggers_str = lock_triggers_val.as_str()
        .unwrap_or("lock, lock pc, lock laptop, lock computer, lock my pc, lock my laptop, lock my computer");

    let sleep_triggers_val = crate::commands::settings::get_setting(app.clone(), "customSleepCommand".to_string()).await
        .unwrap_or(serde_json::Value::Null);
    let sleep_triggers_str = sleep_triggers_val.as_str()
        .unwrap_or("sleep, sleep pc, sleep laptop, sleep computer, sleep my pc, sleep my laptop, sleep my computer, hibernate");

    let restart_triggers_val = crate::commands::settings::get_setting(app.clone(), "customRestartCommand".to_string()).await
        .unwrap_or(serde_json::Value::Null);
    let restart_triggers_str = restart_triggers_val.as_str()
        .unwrap_or("restart, reboot, restart pc, restart computer, reboot pc, reboot computer");

    let shutdown_triggers_val = crate::commands::settings::get_setting(app.clone(), "customShutdownCommand".to_string()).await
        .unwrap_or(serde_json::Value::Null);
    let shutdown_triggers_str = shutdown_triggers_val.as_str()
        .unwrap_or("shutdown, power off, turn off, turn off pc, turn off computer, power off pc, power off computer");

    let matches_trigger = |triggers_csv: &str, input: &str| -> bool {
        for trigger in triggers_csv.split(',') {
            let t_trimmed = trigger.trim().to_lowercase();
            if !t_trimmed.is_empty() && (input == t_trimmed || input.starts_with(&format!("{} ", t_trimmed)) || input.ends_with(&format!(" {}", t_trimmed))) {
                return true;
            }
        }
        false
    };

    // 3. System Power & Session Controls
    if matches_trigger(lock_triggers_str, &cmd_lower) {
        return handle_lock_pc().await;
    }
    if matches_trigger(sleep_triggers_str, &cmd_lower) {
        return handle_sleep_pc().await;
    }
    if matches_trigger(restart_triggers_str, &cmd_lower) {
        return handle_restart_pc().await;
    }
    if matches_trigger(shutdown_triggers_str, &cmd_lower) {
        return handle_shutdown_pc().await;
    }

    // 4. Notes Task Additions ("add buy milk to notes")
    if cmd_lower.starts_with("add ") && (cmd_lower.contains(" to notes") || cmd_lower.contains(" to todo") || cmd_lower.contains(" to notepad")) {
        return handle_add_note_task(&command).await;
    }

    Err("Not a recognized desktop command".to_string())
}

async fn close_system_process(app_name: &str) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        let app_clean = app_name.replace(".exe", "");
        let output = Command::new("powershell")
            .args(["-NoProfile", "-WindowStyle", "Hidden", "-Command", &format!("Stop-Process -Name '{}' -Force", app_clean)])
            .output();
        match output {
            Ok(out) if out.status.success() => Ok(format!("Successfully closed all instances of '{}'!", app_clean)),
            _ => Err(format!("Could not find or close app matching '{}'.", app_clean)),
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        let output = Command::new("killall").arg(app_name).status();
        match output {
            Ok(s) if s.success() => Ok(format!("Successfully closed '{}'!", app_name)),
            _ => Err(format!("Could not close app matching '{}'.", app_name)),
        }
    }
}

async fn handle_file_copy(app: tauri::AppHandle, cmd: &str) -> Result<String, String> {
    use tauri::{Emitter, Manager};
    use tokio::io::{AsyncReadExt, AsyncWriteExt};

    if let Some(pet) = app.get_webview_window("pet") {
        let _ = pet.show();
    }

    let parts: Vec<&str> = cmd.splitn(2, " to ").collect();
    if parts.len() != 2 {
        let parts_upper: Vec<&str> = cmd.splitn(2, " TO ").collect();
        if parts_upper.len() != 2 {
            return Err("Invalid copy command format. Use: 'copy [file] to [destination]'".to_string());
        }
    }
    let src = parts[0][5..].trim().trim_matches('"');
    let dest = parts[1].trim().trim_matches('"');

    let src_path = std::path::Path::new(src);
    if !src_path.exists() {
        return Err(format!("Source file does not exist: {}", src));
    }

    let mut dest_path_buf = std::path::PathBuf::from(dest);
    if dest_path_buf.is_dir() {
        if let Some(file_name) = src_path.file_name() {
            dest_path_buf.push(file_name);
        }
    }

    let file_name = src_path.file_name().unwrap_or_default().to_string_lossy().to_string();

    let mut src_file = tokio::fs::File::open(&src_path).await.map_err(|e| format!("Failed to open source: {}", e))?;
    let mut dest_file = tokio::fs::File::create(&dest_path_buf).await.map_err(|e| format!("Failed to create destination: {}", e))?;
    
    let metadata = src_file.metadata().await.map_err(|e| format!("Failed to read metadata: {}", e))?;
    let total_size = metadata.len();
    
    let mut buffer = vec![0; 65536];
    let mut copied = 0u64;
    let mut last_emit = std::time::Instant::now();
    
    let _ = app.emit("file-progress", serde_json::json!({ "progress": 0, "operation": "Copying", "file": file_name }));

    loop {
        let n = src_file.read(&mut buffer).await.map_err(|e| format!("Read error: {}", e))?;
        if n == 0 { break; }
        dest_file.write_all(&buffer[..n]).await.map_err(|e| format!("Write error: {}", e))?;
        copied += n as u64;
        
        if last_emit.elapsed().as_millis() > 50 || copied == total_size {
            let progress = if total_size == 0 { 100 } else { ((copied as f64 / total_size as f64) * 100.0) as u8 };
            let _ = app.emit("file-progress", serde_json::json!({ "progress": progress, "operation": "Copying", "file": file_name }));
            last_emit = std::time::Instant::now();
        }
    }

    let _ = app.emit("file-progress", serde_json::json!({ "progress": 100, "operation": "Copying", "file": file_name }));

    Ok(format!(
        "Successfully copied '{}' to '{}'!",
        file_name,
        dest_path_buf.to_string_lossy()
    ))
}

async fn handle_file_move(app: tauri::AppHandle, cmd: &str) -> Result<String, String> {
    use tauri::{Emitter, Manager};
    use tokio::io::{AsyncReadExt, AsyncWriteExt};

    if let Some(pet) = app.get_webview_window("pet") {
        let _ = pet.show();
    }

    let parts: Vec<&str> = cmd.splitn(2, " to ").collect();
    if parts.len() != 2 {
        return Err("Invalid move command format. Use: 'move [file] to [destination]'".to_string());
    }
    let src = parts[0][5..].trim().trim_matches('"');
    let dest = parts[1].trim().trim_matches('"');

    let src_path = std::path::Path::new(src);
    if !src_path.exists() {
        return Err(format!("Source path does not exist: {}", src));
    }

    let mut dest_path_buf = std::path::PathBuf::from(dest);
    if dest_path_buf.is_dir() {
        if let Some(file_name) = src_path.file_name() {
            dest_path_buf.push(file_name);
        }
    }

    let file_name = src_path.file_name().unwrap_or_default().to_string_lossy().to_string();

    let _ = app.emit("file-progress", serde_json::json!({ "progress": 0, "operation": "Moving", "file": file_name }));

    // Try rename first (instant if same drive)
    if let Err(e) = tokio::fs::rename(src_path, &dest_path_buf).await {
        // If rename fails (e.g. cross-device link), fallback to copy + delete
        if src_path.is_file() {
            let mut src_file = tokio::fs::File::open(&src_path).await.map_err(|err| format!("Failed to open source: {}", err))?;
            let mut dest_file = tokio::fs::File::create(&dest_path_buf).await.map_err(|err| format!("Failed to create destination: {}", err))?;
            
            let metadata = src_file.metadata().await.map_err(|err| format!("Failed to read metadata: {}", err))?;
            let total_size = metadata.len();
            
            let mut buffer = vec![0; 65536];
            let mut copied = 0u64;
            let mut last_emit = std::time::Instant::now();
            
            loop {
                let n = src_file.read(&mut buffer).await.map_err(|err| format!("Read error: {}", err))?;
                if n == 0 { break; }
                dest_file.write_all(&buffer[..n]).await.map_err(|err| format!("Write error: {}", err))?;
                copied += n as u64;
                
                if last_emit.elapsed().as_millis() > 50 || copied == total_size {
                    let progress = if total_size == 0 { 100 } else { ((copied as f64 / total_size as f64) * 100.0) as u8 };
                    let _ = app.emit("file-progress", serde_json::json!({ "progress": progress, "operation": "Moving", "file": file_name }));
                    last_emit = std::time::Instant::now();
                }
            }
            let _ = tokio::fs::remove_file(src_path).await;
            let _ = app.emit("file-progress", serde_json::json!({ "progress": 100, "operation": "Moving", "file": file_name }));
            return Ok(format!("Successfully moved '{}' to '{}'!", file_name, dest_path_buf.to_string_lossy()));
        }
        return Err(format!("Failed to move file: {}", e));
    }

    let _ = app.emit("file-progress", serde_json::json!({ "progress": 100, "operation": "Moving", "file": file_name }));

    Ok(format!(
        "Successfully moved '{}' to '{}'!",
        file_name,
        dest_path_buf.to_string_lossy()
    ))
}

async fn handle_file_delete(app: tauri::AppHandle, path: &str) -> Result<String, String> {
    let clean_path = path.trim_matches('"');
    let target = std::path::Path::new(clean_path);
    if !target.exists() {
        return Err(format!("Path does not exist: {}", clean_path));
    }

    #[cfg(target_os = "windows")]
    {
        let escaped_path = clean_path.replace("'", "''");
        let ps_script = format!(
            r#"
Add-Type -AssemblyName Microsoft.VisualBasic
if (Test-Path -Path '{path}' -PathType Container) {{
    [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory('{path}', 'OnlyErrorDialogs', 'SendToRecycleBin')
}} else {{
    [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile('{path}', 'OnlyErrorDialogs', 'SendToRecycleBin')
}}
exit 0
"#,
            path = escaped_path
        );

        let output = Command::new("powershell")
            .args(["-NoProfile", "-WindowStyle", "Hidden", "-Command", &ps_script])
            .status();

        match output {
            Ok(s) if s.success() => Ok(format!("Successfully moved '{}' to the Recycle Bin!", clean_path)),
            _ => Err(format!("Failed to move '{}' to the Recycle Bin.", clean_path)),
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        if target.is_dir() {
            if let Err(e) = std::fs::remove_dir_all(target) {
                return Err(format!("Failed to delete folder: {}", e));
            }
            Ok(format!("Successfully deleted directory: {}!", clean_path))
        } else {
            if let Err(e) = std::fs::remove_file(target) {
                return Err(format!("Failed to delete file: {}", e));
            }
            Ok(format!("Successfully deleted file: {}!", clean_path))
        }
    }
}

async fn handle_create_folder(path: &str) -> Result<String, String> {
    let clean_path = path.trim_matches('"');
    if let Err(e) = std::fs::create_dir_all(clean_path) {
        return Err(format!("Failed to create folder: {}", e));
    }
    Ok(format!("Successfully created folder at: {}!", clean_path))
}

async fn handle_create_file(path: &str) -> Result<String, String> {
    let clean_path = path.trim_matches('"');
    if let Err(e) = std::fs::write(clean_path, "") {
        return Err(format!("Failed to create empty file: {}", e));
    }
    Ok(format!("Successfully created empty file at: {}!", clean_path))
}

async fn handle_lock_pc() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        let _ = Command::new("rundll32.exe")
            .args(["user32.dll,LockWorkStation"])
            .status();
        Ok("Locking computer...".to_string())
    }
    #[cfg(not(target_os = "windows"))]
    {
        Err("Lock command only supported on Windows currently.".to_string())
    }
}

async fn handle_sleep_pc() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        let _ = Command::new("powershell")
            .args(["-NoProfile", "-WindowStyle", "Hidden", "-Command", "Add-Type -Assembly System.Windows.Forms; [System.Windows.Forms.Application]::SetSuspendState([System.Windows.Forms.PowerState]::Suspend, $false, $false)"])
            .status();
        Ok("Putting computer to sleep...".to_string())
    }
    #[cfg(not(target_os = "windows"))]
    {
        Err("Sleep command only supported on Windows currently.".to_string())
    }
}

async fn handle_restart_pc() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        let _ = Command::new("shutdown")
            .args(["/r", "/t", "0"])
            .status();
        Ok("Restarting computer...".to_string())
    }
    #[cfg(not(target_os = "windows"))]
    {
        Err("Restart command only supported on Windows currently.".to_string())
    }
}

async fn handle_shutdown_pc() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        let _ = Command::new("shutdown")
            .args(["/s", "/t", "0"])
            .status();
        Ok("Shutting down computer...".to_string())
    }
    #[cfg(not(target_os = "windows"))]
    {
        Err("Shutdown command only supported on Windows currently.".to_string())
    }
}

async fn handle_add_note_task(cmd: &str) -> Result<String, String> {
    let cmd_lower = cmd.to_lowercase();
    let suffix = if cmd_lower.contains(" to notes") {
        " to notes"
    } else if cmd_lower.contains(" to todo") {
        " to todo"
    } else {
        " to notepad"
    };

    let task_end_idx = cmd_lower.find(suffix).unwrap_or(cmd.len());
    let task = cmd[4..task_end_idx].trim().trim_matches('"');
    
    let home_dir = if cfg!(target_os = "windows") {
        std::env::var("USERPROFILE").ok()
    } else {
        std::env::var("HOME").ok()
    };

    if let Some(ref home) = home_dir {
        let doc_path = std::path::Path::new(home).join("Documents").join("Quickno_Notes.txt");
        
        let timestamp = if cfg!(target_os = "windows") {
            let out = Command::new("powershell")
                .args(["-NoProfile", "-WindowStyle", "Hidden", "-Command", "Get-Date -Format 'yyyy-MM-dd HH:mm:ss'"])
                .output()
                .ok();
            out.and_then(|o| String::from_utf8(o.stdout).ok())
                .unwrap_or_else(|| "".to_string())
                .trim()
                .to_string()
        } else {
            let out = Command::new("date")
                .arg("+%Y-%m-%d %H:%M:%S")
                .output()
                .ok();
            out.and_then(|o| String::from_utf8(o.stdout).ok())
                .unwrap_or_else(|| "".to_string())
                .trim()
                .to_string()
        };

        let note_line = format!("[{}] - {}\n", timestamp, task);
        
        use std::io::Write;
        let mut file = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&doc_path);
            
        match file {
            Ok(mut f) => {
                if f.write_all(note_line.as_bytes()).is_ok() {
                    Ok(format!("Added task: '{}' to your Quickno_Notes.txt!", task))
                } else {
                    Err("Failed to write to Quickno_Notes.txt".to_string())
                }
            }
            Err(e) => Err(format!("Failed to open Quickno_Notes.txt: {}", e)),
        }
    } else {
        Err("Could not locate Documents folder to store note.".to_string())
    }
}

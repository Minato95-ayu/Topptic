use crate::{fs_ops, models::{ExportRequest, ExportResponse}};
use std::{fs, io::{BufRead, BufReader}, path::PathBuf, process::{Command, Stdio}};
use tauri::{AppHandle, Emitter};

pub fn export_project(app: AppHandle, request: ExportRequest) -> Result<ExportResponse, String> {
    let working_dir = fs_ops::resolve_workspace_path(&request.project_path)?;
    
    // Defaulting to host OS for MVP as requested
    let command = if working_dir.join("Cargo.toml").exists() {
        "cargo"
    } else {
        return Err("Export currently only supports Rust (Cargo) projects for MVP.".to_string());
    };
    
    let args = vec!["build", "--release"];
    
    let mut child = Command::new(command)
        .args(&args)
        .current_dir(&working_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start export build: {}", e))?;

    let stdout = child.stdout.take().unwrap();
    let stderr = child.stderr.take().unwrap();

    let app_clone = app.clone();
    std::thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            if let Ok(line) = line {
                 let _ = app_clone.emit("export-log", format!("STDOUT: {}", line));
            }
        }
    });

    let app_clone2 = app.clone();
    std::thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines() {
            if let Ok(line) = line {
                let _ = app_clone2.emit("export-log", format!("STDERR: {}", line));
            }
        }
    });

    let mut status = None;
    let start_time = std::time::Instant::now();
    let timeout = std::time::Duration::from_secs(300); // 5 minute timeout

    loop {
        match child.try_wait() {
            Ok(Some(s)) => {
                status = Some(s);
                break;
            }
            Ok(None) => {
                if start_time.elapsed() > timeout {
                    let _ = child.kill(); // Kills child and closes stdout/stderr, terminating reader threads
                    return Err("Compilation timed out after 5 minutes.".to_string());
                }
                std::thread::sleep(std::time::Duration::from_millis(500));
            }
            Err(e) => return Err(format!("Failed to wait on child: {}", e)),
        }
    }

    let status = status.unwrap();

    if !status.success() {
        return Err("Compilation failed. Check logs for details.".to_string());
    }

    // Attempt to locate the built binary
    let release_dir = working_dir.join("target").join("release");
    let mut binary_path: Option<PathBuf> = None;
    
    if let Ok(entries) = fs::read_dir(&release_dir) {
        for entry in entries.flatten() {
            if let Ok(meta) = entry.metadata() {
                if meta.is_file() {
                    let path = entry.path();
                    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
                    // Look for .exe on Windows, or files without extension on Linux/Mac (simplified)
                    if ext == "exe" || ext == "" && !path.file_name().unwrap().to_string_lossy().contains(".") {
                        binary_path = Some(path);
                        break;
                    }
                }
            }
        }
    }

    let Some(src_bin) = binary_path else {
         return Err(format!("Build succeeded but could not find the executable in {:?}", release_dir));
    };

    // Determine target location (e.g. Downloads folder)
    let home_dir = dirs::download_dir().or_else(dirs::desktop_dir).unwrap_or_else(|| PathBuf::from("."));
    
    // Generate a clean output name
    let project_name = working_dir.file_name().unwrap_or_default().to_string_lossy();
    let ext = src_bin.extension().and_then(|e| e.to_str()).unwrap_or("");
    let out_name = if ext.is_empty() {
        format!("{}_Setup", project_name)
    } else {
        format!("{}_Setup.{}", project_name, ext)
    };

    let dest_bin = home_dir.join(out_name);

    fs::copy(&src_bin, &dest_bin).map_err(|e| format!("Failed to copy binary to export destination: {}", e))?;

    Ok(ExportResponse {
        success: true,
        message: format!("Successfully exported to {:?}", dest_bin),
        output_path: dest_bin.to_string_lossy().to_string(),
    })
}

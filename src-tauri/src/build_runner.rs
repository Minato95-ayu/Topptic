use crate::{
    ai, fs_ops,
    models::{BuildRequest, BuildResponse},
};
use std::{fs, path::Path, process::Command};

const DEFAULT_MAX_RETRIES: u8 = 3;

pub fn run_build(request: BuildRequest) -> Result<BuildResponse, String> {
    let working_dir = fs_ops::resolve_workspace_path(&request.project_path)?;
    let source_path = request
        .source_path
        .as_deref()
        .map(fs_ops::resolve_workspace_path)
        .transpose()?;
    let command = request
        .command
        .clone()
        .unwrap_or_else(|| infer_build_command(&working_dir));
    let args = request.args.clone().unwrap_or_else(|| infer_build_args(&command, &working_dir));
    let max_retries = request.max_retries.unwrap_or(DEFAULT_MAX_RETRIES).min(3);

    if let (Some(source_path), Some(code)) = (source_path.as_ref(), request.code.as_ref()) {
        write_code(source_path, code)?;
    }

    let original_code = source_path
        .as_ref()
        .map(fs::read_to_string)
        .transpose()
        .map_err(|error| error.to_string())?
        .or_else(|| request.code.clone());
    let mut attempts = 0;
    let mut healed = false;
    let mut final_code = request.code.clone();

    loop {
        attempts += 1;
        let output = run_command(&command, &args, &working_dir)?;
        let mut stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();

        if command == "cmd" && args.iter().any(|arg| arg.contains("start")) {
            stdout = "Launching HTML project in default browser...\n".to_string();
        }

        if output.status.success() || !stderr_has_error(&stderr) {
            return Ok(BuildResponse {
                success: output.status.success(),
                command: format_command(&command, &args),
                exit_code: output.status.code(),
                stdout,
                stderr,
                attempts,
                healed,
                final_code,
            });
        }

        if attempts > max_retries {
            return Ok(BuildResponse {
                success: false,
                command: format_command(&command, &args),
                exit_code: output.status.code(),
                stdout,
                stderr,
                attempts,
                healed,
                final_code,
            });
        }

        let Some(source_path) = source_path.as_ref() else {
            return Ok(BuildResponse {
                success: false,
                command: format_command(&command, &args),
                exit_code: output.status.code(),
                stdout,
                stderr,
                attempts,
                healed,
                final_code,
            });
        };

        let code_for_fix = final_code
            .as_deref()
            .ok_or_else(|| "source code is required for self-healing builds".to_string())?;
        let fixed_code = ai::fix_compilation_error(
            code_for_fix,
            &stderr,
            request.source_path.as_deref(),
            request.model.as_deref(),
        )?;

        write_code(source_path, &fixed_code)?;
        final_code = Some(fixed_code);
        healed = true;
    }
}

fn run_command(
    command: &str,
    args: &[String],
    working_dir: &Path,
) -> Result<std::process::Output, String> {
    let mut child = Command::new(command)
        .args(args)
        .current_dir(working_dir)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|error| error.to_string())?;

    let mut stdout = child.stdout.take().unwrap();
    let mut stderr = child.stderr.take().unwrap();

    let stdout_handle = std::thread::spawn(move || {
        let mut out = Vec::new();
        std::io::Read::read_to_end(&mut stdout, &mut out).unwrap_or_default();
        out
    });

    let stderr_handle = std::thread::spawn(move || {
        let mut err = Vec::new();
        std::io::Read::read_to_end(&mut stderr, &mut err).unwrap_or_default();
        err
    });

    let mut status = None;
    let start_time = std::time::Instant::now();
    let timeout = std::time::Duration::from_secs(120); // 2 minute timeout

    loop {
        match child.try_wait() {
            Ok(Some(s)) => {
                status = Some(s);
                break;
            }
            Ok(None) => {
                if start_time.elapsed() > timeout {
                    let _ = child.kill();
                    return Err("Command timed out after 2 minutes.".to_string());
                }
                std::thread::sleep(std::time::Duration::from_millis(500));
            }
            Err(e) => return Err(format!("Failed to wait on child: {}", e)),
        }
    }

    Ok(std::process::Output {
        status: status.unwrap(),
        stdout: stdout_handle.join().unwrap_or_default(),
        stderr: stderr_handle.join().unwrap_or_default(),
    })
}

fn write_code(path: &Path, code: &str) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }

    fs::write(path, code).map_err(|error| error.to_string())
}

fn stderr_has_error(stderr: &str) -> bool {
    let stderr = stderr.trim();

    !stderr.is_empty() && stderr.to_ascii_lowercase().contains("error")
}

fn infer_build_command(working_dir: &std::path::Path) -> String {
    if working_dir.join("Cargo.toml").exists() {
        "cargo".to_string()
    } else if working_dir.join("package.json").exists() {
        "npm".to_string()
    } else {
        // Check for HTML files
        if let Ok(entries) = fs::read_dir(working_dir) {
            for entry in entries.flatten() {
                if let Some(ext) = entry.path().extension() {
                    if ext == "html" || ext == "htm" {
                        return "cmd".to_string();
                    }
                }
            }
        }
        "cmd".to_string()
    }
}

fn infer_build_args(command: &str, working_dir: &std::path::Path) -> Vec<String> {
    match command {
        "cargo" => vec!["build".to_string(), "--release".to_string()],
        "npm" => vec!["run".to_string(), "build".to_string()],
        "cmd" => {
            // Find any html file in the working directory
            let mut target_html = None;
            if let Ok(entries) = fs::read_dir(working_dir) {
                let files: Vec<_> = entries.flatten().collect();
                
                // Prioritize index.html or home.html
                for file in &files {
                    let name = file.file_name().to_string_lossy().to_lowercase();
                    if name == "index.html" || name == "home.html" {
                        target_html = Some(file.file_name().to_string_lossy().into_owned());
                        break;
                    }
                }
                // Fallback to any html file
                if target_html.is_none() {
                    for file in &files {
                        if let Some(ext) = file.path().extension() {
                            if ext == "html" || ext == "htm" {
                                target_html = Some(file.file_name().to_string_lossy().into_owned());
                                break;
                            }
                        }
                    }
                }
            }

            if let Some(html_file) = target_html {
                vec![
                    "/C".to_string(),
                    "start".to_string(),
                    "".to_string(),
                    html_file,
                ]
            } else {
                vec![
                    "/C".to_string(),
                    "echo No build file detected. Add Cargo.toml or package.json.".to_string(),
                ]
            }
        }
        _ => Vec::new(),
    }
}

fn format_command(command: &str, args: &[String]) -> String {
    if args.is_empty() {
        command.to_string()
    } else {
        format!("{command} {}", args.join(" "))
    }
}

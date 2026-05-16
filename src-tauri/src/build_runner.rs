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
    let args = request.args.clone().unwrap_or_else(|| infer_build_args(&command));
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
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();

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
    Command::new(command)
        .args(args)
        .current_dir(working_dir)
        .output()
        .map_err(|error| error.to_string())
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
        "cmd".to_string()
    }
}

fn infer_build_args(command: &str) -> Vec<String> {
    match command {
        "cargo" => vec!["build".to_string(), "--release".to_string()],
        "npm" => vec!["run".to_string(), "build".to_string()],
        "cmd" => vec![
            "/C".to_string(),
            "echo No build file detected. Add Cargo.toml or package.json.".to_string(),
        ],
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

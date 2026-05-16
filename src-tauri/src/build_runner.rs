use crate::{
    fs_ops,
    models::{BuildRequest, BuildResponse},
};
use std::process::Command;

pub fn run_build(request: BuildRequest) -> Result<BuildResponse, String> {
    let working_dir = fs_ops::resolve_workspace_path(&request.project_path)?;
    let command = request.command.unwrap_or_else(|| infer_build_command(&working_dir));
    let args = request.args.unwrap_or_else(|| infer_build_args(&command));

    let output = Command::new(&command)
        .args(&args)
        .current_dir(&working_dir)
        .output()
        .map_err(|error| error.to_string())?;

    Ok(BuildResponse {
        success: output.status.success(),
        command: format_command(&command, &args),
        exit_code: output.status.code(),
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
    })
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

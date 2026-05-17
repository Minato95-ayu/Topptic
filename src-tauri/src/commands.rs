use crate::{
    ai, build_runner, db, fs_ops,
    models::{
        AiChatRequest, AiChatResponse, AiSuggestRequest, AiSuggestResponse, BackendStatus,
        BuildRequest, BuildResponse, CreateProjectRequest, ExportRequest, ExportResponse,
        FileEntry, FileReadRequest, FileWriteRequest, FormatCodeRequest, Project,
    },
};
use tauri::{AppHandle, Emitter};

#[tauri::command]
pub fn get_backend_status() -> BackendStatus {
    BackendStatus {
        tauri: true,
        ai_engine: ai::detect_ai_engine(),
        database: "sqlite".to_string(),
        workspace: fs_ops::workspace_label(),
    }
}

#[tauri::command]
pub fn list_projects(app: AppHandle) -> Result<Vec<Project>, String> {
    db::get_projects(&app)
}

#[tauri::command]
pub fn get_projects(app: AppHandle) -> Result<Vec<Project>, String> {
    db::get_projects(&app)
}

#[tauri::command]
pub fn create_project(app: AppHandle, request: CreateProjectRequest) -> Result<Project, String> {
    db::create_project(&app, request)
}

#[tauri::command]
pub fn list_files(path: Option<String>) -> Result<Vec<FileEntry>, String> {
    fs_ops::list_files(path)
}

#[tauri::command]
pub fn read_file(request: FileReadRequest) -> Result<String, String> {
    fs_ops::read_file(request)
}

#[tauri::command]
pub fn write_file(request: FileWriteRequest) -> Result<(), String> {
    fs_ops::write_file(request)
}

#[tauri::command]
pub fn ai_chat(request: AiChatRequest) -> AiChatResponse {
    ai::chat(request)
}

#[tauri::command]
pub fn ai_suggest(request: AiSuggestRequest) -> AiSuggestResponse {
    ai::suggest(request)
}

#[tauri::command]
pub fn format_code(request: FormatCodeRequest) -> String {
    let extension = request.path.rsplit('.').next().unwrap_or_default();

    match extension {
        "ts" | "tsx" | "js" | "jsx" | "rs" => request.content.trim().to_string() + "\n",
        _ => request.content,
    }
}

#[tauri::command]
pub fn search_workspace_rag(query: String) -> Result<String, String> {
    fs_ops::search_workspace(&query)
}

#[tauri::command]
pub fn run_build(request: BuildRequest) -> Result<BuildResponse, String> {
    build_runner::run_build(request)
}

#[tauri::command]
pub fn export_project(app: AppHandle, request: ExportRequest) -> Result<ExportResponse, String> {
    crate::build_engine::export_project(app, request)
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalOutputPayload {
    pub stdout: Option<String>,
    pub stderr: Option<String>,
    pub is_exit: bool,
    pub exit_code: Option<i32>,
}

#[tauri::command]
pub fn execute_terminal_command(
    app: AppHandle,
    command: String,
    cwd: Option<String>,
) -> Result<String, String> {
    use std::process::{Command, Stdio};
    use std::io::{BufRead, BufReader};
    use std::thread;

    thread::spawn(move || {
        let os = std::env::consts::OS;
        
        let mut shell_cmd = if os == "windows" {
            let mut c = Command::new("powershell.exe");
            c.arg("-Command").arg(&command);
            c
        } else {
            let mut c = Command::new("sh");
            c.arg("-c").arg(&command);
            c
        };

        if let Some(ref dir) = cwd {
            shell_cmd.current_dir(dir);
        } else if let Ok(workspace_dir) = fs_ops::workspace_root() {
            shell_cmd.current_dir(workspace_dir);
        }

        shell_cmd.stdout(Stdio::piped());
        shell_cmd.stderr(Stdio::piped());

        let mut child = match shell_cmd.spawn() {
            Ok(child) => child,
            Err(e) => {
                let err_msg = format!("Failed to spawn command: {}\n", e);
                let _ = app.emit("terminal-output", TerminalOutputPayload {
                    stdout: None,
                    stderr: Some(err_msg),
                    is_exit: true,
                    exit_code: Some(1),
                });
                return;
            }
        };

        let stdout = child.stdout.take().unwrap();
        let stderr = child.stderr.take().unwrap();

        let app_stdout = app.clone();
        let stdout_thread = thread::spawn(move || {
            let reader = BufReader::new(stdout);
            for line in reader.lines() {
                if let Ok(line_content) = line {
                    let _ = app_stdout.emit("terminal-output", TerminalOutputPayload {
                        stdout: Some(line_content + "\n"),
                        stderr: None,
                        is_exit: false,
                        exit_code: None,
                    });
                }
            }
        });

        let app_stderr = app.clone();
        let stderr_thread = thread::spawn(move || {
            let reader = BufReader::new(stderr);
            for line in reader.lines() {
                if let Ok(line_content) = line {
                    let _ = app_stderr.emit("terminal-output", TerminalOutputPayload {
                        stdout: None,
                        stderr: Some(line_content + "\n"),
                        is_exit: false,
                        exit_code: None,
                    });
                }
            }
        });

        let _ = stdout_thread.join();
        let _ = stderr_thread.join();

        let exit_code = match child.wait() {
            Ok(status) => status.code(),
            Err(_) => None,
        };

        let _ = app.emit("terminal-output", TerminalOutputPayload {
            stdout: None,
            stderr: None,
            is_exit: true,
            exit_code,
        });
    });

    Ok("Command started".to_string())
}

#[tauri::command]
pub fn create_directory(path: String) -> Result<(), String> {
    fs_ops::create_directory(&path)
}


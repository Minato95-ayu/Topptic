use crate::{
    ai, build_runner, db, fs_ops,
    models::{
        AiChatRequest, AiChatResponse, AiSuggestRequest, AiSuggestResponse, BackendStatus,
        BuildRequest, BuildResponse, CreateProjectRequest, ExportRequest, ExportResponse,
        FileEntry, FileReadRequest, FileWriteRequest, FormatCodeRequest, Project,
    },
};
use tauri::AppHandle;

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
pub fn run_build(request: BuildRequest) -> Result<BuildResponse, String> {
    build_runner::run_build(request)
}

#[tauri::command]
pub fn export_project(app: AppHandle, request: ExportRequest) -> Result<ExportResponse, String> {
    crate::build_engine::export_project(app, request)
}

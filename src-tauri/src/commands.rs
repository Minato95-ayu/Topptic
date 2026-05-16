use crate::{
    ai, build_runner, fs_ops,
    models::{
        AiChatRequest, AiChatResponse, AiSuggestRequest, AiSuggestResponse, BackendStatus,
        BuildRequest, BuildResponse, FileEntry, FileReadRequest, FileWriteRequest,
        FormatCodeRequest, Project,
    },
};

#[tauri::command]
pub fn get_backend_status() -> BackendStatus {
    BackendStatus {
        tauri: true,
        ai_engine: ai::detect_ai_engine(),
        database: "mock".to_string(),
        workspace: fs_ops::workspace_label(),
    }
}

#[tauri::command]
pub fn list_projects() -> Vec<Project> {
    let now = "2026-05-17T00:00:00.000Z".to_string();

    vec![
        Project {
            id: "sample-web".to_string(),
            name: "E-commerce App".to_string(),
            description: "A local TypeScript starter project".to_string(),
            language: "typescript".to_string(),
            created_at: now.clone(),
            updated_at: now.clone(),
            is_active: true,
        },
        Project {
            id: "sample-ai".to_string(),
            name: "AI Assistant".to_string(),
            description: "Python assistant workspace".to_string(),
            language: "python".to_string(),
            created_at: now.clone(),
            updated_at: now.clone(),
            is_active: false,
        },
        Project {
            id: "sample-rust".to_string(),
            name: "Mobile Game".to_string(),
            description: "Rust game prototype".to_string(),
            language: "rust".to_string(),
            created_at: now.clone(),
            updated_at: now,
            is_active: false,
        },
    ]
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

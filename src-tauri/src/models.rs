use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackendStatus {
    pub tauri: bool,
    pub ai_engine: String,
    pub database: String,
    pub workspace: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub id: String,
    pub name: String,
    pub description: String,
    pub language: String,
    pub created_at: String,
    pub updated_at: String,
    pub is_active: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiChatRequest {
    pub message: String,
    pub code_context: Option<String>,
    pub file_path: Option<String>,
    pub model: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiSuggestRequest {
    pub code: String,
    pub file_path: Option<String>,
    pub instruction: Option<String>,
    pub model: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct AiChatResponse {
    pub message: String,
    pub engine: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiSuggestResponse {
    pub suggestions: String,
    pub engine: String,
}

#[derive(Debug, Deserialize)]
pub struct OllamaGenerateResponse {
    pub response: String,
}

#[derive(Debug, Deserialize)]
pub struct FileReadRequest {
    pub path: String,
}

#[derive(Debug, Deserialize)]
pub struct FileWriteRequest {
    pub path: String,
    pub content: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileEntry {
    pub path: String,
    pub name: String,
    pub is_directory: bool,
}

#[derive(Debug, Deserialize)]
pub struct FormatCodeRequest {
    pub path: String,
    pub content: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BuildRequest {
    pub project_path: String,
    pub command: Option<String>,
    pub args: Option<Vec<String>>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BuildResponse {
    pub success: bool,
    pub command: String,
    pub exit_code: Option<i32>,
    pub stdout: String,
    pub stderr: String,
}

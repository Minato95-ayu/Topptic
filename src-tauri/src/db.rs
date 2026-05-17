use crate::models::{CreateProjectRequest, Project};
use rusqlite::{params, Connection};
use std::{
    fs,
    path::PathBuf,
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Manager};

const DB_FILE_NAME: &str = "topptic_data.db";

pub fn init_database(app: &AppHandle) -> Result<(), String> {
    let connection = open_connection(app)?;

    connection
        .execute_batch(
            "
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                path TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS ai_history (
                id TEXT PRIMARY KEY NOT NULL,
                project_id TEXT,
                prompt TEXT NOT NULL,
                response TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(project_id) REFERENCES projects(id)
            );

            CREATE VIRTUAL TABLE IF NOT EXISTS project_memory USING fts5(
                file_path UNINDEXED, 
                file_content, 
                file_imports
            );

            CREATE TABLE IF NOT EXISTS project_symbols (
                id TEXT PRIMARY KEY NOT NULL,
                project_id TEXT NOT NULL,
                file_path TEXT NOT NULL,
                symbol_name TEXT NOT NULL,
                symbol_type TEXT NOT NULL, -- 'class' | 'function' | 'import' | 'export'
                line_number INTEGER NOT NULL,
                code_snippet TEXT NOT NULL,
                FOREIGN KEY(project_id) REFERENCES projects(id)
            );
            ",
        )
        .map_err(|error| error.to_string())
}

pub fn create_project(app: &AppHandle, request: CreateProjectRequest) -> Result<Project, String> {
    let name = request.name.trim();
    let path = request.path.trim();

    if name.is_empty() {
        return Err("project name is required".to_string());
    }

    if path.is_empty() {
        return Err("project path is required".to_string());
    }

    let connection = open_connection(app)?;
    let now = now_timestamp();
    let project = Project {
        id: stable_id("project"),
        name: name.to_string(),
        description: None,
        language: None,
        path: Some(path.to_string()),
        created_at: now.clone(),
        updated_at: now.clone(),
        is_active: false,
    };

    connection
        .execute(
            "INSERT INTO projects (id, name, path, created_at) VALUES (?1, ?2, ?3, ?4)",
            params![&project.id, &project.name, path, &project.created_at],
        )
        .map_err(|error| error.to_string())?;

    Ok(project)
}

pub fn get_projects(app: &AppHandle) -> Result<Vec<Project>, String> {
    let connection = open_connection(app)?;
    let mut statement = connection
        .prepare("SELECT id, name, path, created_at FROM projects ORDER BY created_at DESC")
        .map_err(|error| error.to_string())?;

    let rows = statement
        .query_map([], |row| {
            let created_at: String = row.get(3)?;

            Ok(Project {
                id: row.get(0)?,
                name: row.get(1)?,
                description: None,
                language: None,
                path: Some(row.get(2)?),
                created_at: created_at.clone(),
                updated_at: created_at,
                is_active: false,
            })
        })
        .map_err(|error| error.to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())
}

pub fn save_ai_history(
    app: &AppHandle,
    project_id: Option<&str>,
    prompt: &str,
    response: &str,
) -> Result<(), String> {
    let connection = open_connection(app)?;

    connection
        .execute(
            "INSERT INTO ai_history (id, project_id, prompt, response, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![stable_id("ai"), project_id, prompt, response, now_timestamp()],
        )
        .map(|_| ())
        .map_err(|error| error.to_string())
}

fn open_connection(app: &AppHandle) -> Result<Connection, String> {
    let path = database_path(app)?;
    let connection = Connection::open(path).map_err(|error| error.to_string())?;

    connection
        .execute_batch(
            "PRAGMA journal_mode=WAL;
             PRAGMA synchronous=NORMAL;
             PRAGMA busy_timeout=5000;",
        )
        .map_err(|error| error.to_string())?;

    Ok(connection)
}

fn database_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;

    fs::create_dir_all(&app_data_dir).map_err(|error| error.to_string())?;
    Ok(app_data_dir.join(DB_FILE_NAME))
}

fn stable_id(prefix: &str) -> String {
    format!("{prefix}-{}", now_millis())
}

fn now_timestamp() -> String {
    now_millis().to_string()
}

fn now_millis() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or_default()
}

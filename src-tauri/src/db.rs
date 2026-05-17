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

            CREATE TABLE IF NOT EXISTS patch_history (
                id TEXT PRIMARY KEY NOT NULL,
                file_path TEXT NOT NULL,
                backup_path TEXT NOT NULL,
                operation TEXT NOT NULL, -- 'write' | 'ai_patch' | 'build_fix'
                created_at TEXT NOT NULL
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

pub fn index_file_symbols(
    app: &AppHandle,
    project_id: &str,
    file_path: &str,
    content: &str,
) -> Result<(), String> {
    let connection = open_connection(app)?;

    // First clean up any old cached symbols for this exact file to avoid duplication
    connection
        .execute(
            "DELETE FROM project_symbols WHERE project_id = ?1 AND file_path = ?2",
            params![project_id, file_path],
        )
        .map_err(|error| error.to_string())?;

    // Populate FTS5 project_memory index for instant full-text search
    // Remove old entry first, then insert fresh content
    let _ = connection.execute(
        "DELETE FROM project_memory WHERE file_path = ?1",
        params![file_path],
    );

    // Extract imports for the FTS5 imports column
    let imports: Vec<&str> = content
        .lines()
        .filter(|line| {
            let t = line.trim();
            t.starts_with("import ") || t.contains("require(") || t.starts_with("from ") || t.starts_with("use ")
        })
        .collect();
    let imports_str = imports.join("\n");

    // Truncate content to 4000 chars for FTS5 to avoid bloating the index
    let fts_content = if content.len() > 4000 { &content[..4000] } else { content };

    let _ = connection.execute(
        "INSERT INTO project_memory (file_path, file_content, file_imports) VALUES (?1, ?2, ?3)",
        params![file_path, fts_content, imports_str],
    );

    let lines: Vec<&str> = content.split('\n').collect();

    for (idx, line) in lines.iter().enumerate() {
        let line_num = (idx + 1) as i64;
        let trimmed = line.trim();

        // 1. Match Classes: e.g., "class Calculator" or "export class User"
        if (trimmed.contains("class ") || trimmed.contains("struct ")) && !trimmed.contains(";") && !trimmed.contains("//") {
            let words: Vec<&str> = trimmed.split_whitespace().collect();
            if let Some(pos) = words.iter().position(|&w| w == "class" || w == "struct") {
                if let Some(name) = words.get(pos + 1) {
                    let symbol_name = name.split('{').next().unwrap_or(name).trim().to_string();
                    connection.execute(
                        "INSERT INTO project_symbols (id, project_id, file_path, symbol_name, symbol_type, line_number, code_snippet) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                        params![stable_id("sym"), project_id, file_path, symbol_name, "class", line_num, trimmed],
                    ).map_err(|error| error.to_string())?;
                }
            }
        }

        // 2. Match Functions: e.g., "function add(a, b)" or "const login = () =>" or "def subtract(a, b):"
        if (trimmed.contains("function ") || trimmed.contains("=>") || trimmed.contains("def ")) && !trimmed.contains("//") {
            let symbol_name = if trimmed.contains("def ") {
                let name = trimmed.split("def ").nth(1).unwrap_or("").split('(').next().unwrap_or("").trim();
                name.split(':').next().unwrap_or(name).trim().to_string()
            } else if trimmed.contains("function ") {
                let name = trimmed.split("function ").nth(1).unwrap_or("").split('(').next().unwrap_or("").trim();
                name.split('{').next().unwrap_or(name).trim().to_string()
            } else if trimmed.contains("const ") || trimmed.contains("let ") {
                trimmed.split_whitespace().nth(1).unwrap_or("").split('=').next().unwrap_or("").trim().to_string()
            } else {
                "".to_string()
            };

            if !symbol_name.is_empty() && symbol_name != "=" && symbol_name.len() > 1 {
                connection.execute(
                    "INSERT INTO project_symbols (id, project_id, file_path, symbol_name, symbol_type, line_number, code_snippet) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                    params![stable_id("sym"), project_id, file_path, symbol_name, "function", line_num, trimmed],
                ).map_err(|error| error.to_string())?;
            }
        }

        // 3. Match Imports: e.g., "import express" or "const auth = require" or "import {"
        if (trimmed.contains("import ") || trimmed.contains("require(") || trimmed.contains("from ")) && !trimmed.contains("//") {
            let symbol_name = if trimmed.contains("require(") {
                trimmed.split("require(").nth(1).unwrap_or("").split(')').next().unwrap_or("").replace("'", "").replace("\"", "").trim().to_string()
            } else {
                trimmed.split_whitespace().last().unwrap_or("").replace("'", "").replace("\"", "").replace(";", "").trim().to_string()
            };

            if !symbol_name.is_empty() && symbol_name.len() > 1 {
                connection.execute(
                    "INSERT INTO project_symbols (id, project_id, file_path, symbol_name, symbol_type, line_number, code_snippet) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                    params![stable_id("sym"), project_id, file_path, symbol_name, "import", line_num, trimmed],
                ).map_err(|error| error.to_string())?;
            }
        }
    }

    Ok(())
}

pub fn save_patch_record(
    app: &AppHandle,
    file_path: &str,
    backup_path: &str,
    operation: &str,
) -> Result<(), String> {
    let connection = open_connection(app)?;

    connection
        .execute(
            "INSERT INTO patch_history (id, file_path, backup_path, operation, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![stable_id("patch"), file_path, backup_path, operation, now_timestamp()],
        )
        .map(|_| ())
        .map_err(|error| error.to_string())
}

pub fn get_latest_patch(
    app: &AppHandle,
    file_path: &str,
) -> Result<Option<String>, String> {
    let connection = open_connection(app)?;

    let mut stmt = connection
        .prepare("SELECT backup_path FROM patch_history WHERE file_path = ?1 ORDER BY created_at DESC LIMIT 1")
        .map_err(|e| e.to_string())?;

    let result = stmt
        .query_row(params![file_path], |row| row.get::<_, String>(0))
        .ok();

    Ok(result)
}

/// Smart Context Ranker: Builds a compact, highly-relevant context string
/// by combining FTS5 full-text search results with AST symbol lookups.
/// This replaces raw file truncation with intelligent snippet extraction.
pub fn smart_context_for_query(
    app: &AppHandle,
    query: &str,
) -> Result<String, String> {
    let connection = open_connection(app)?;
    let mut context = String::new();

    // 1. FTS5 search — find files whose content matches the query
    let fts_query = query
        .split_whitespace()
        .filter(|w| w.len() > 1)
        .map(|w| format!("\"{}\"", w))
        .collect::<Vec<_>>()
        .join(" OR ");

    if !fts_query.is_empty() {
        if let Ok(mut stmt) = connection.prepare(
            "SELECT file_path, snippet(project_memory, 1, '>>>', '<<<', '...', 60) FROM project_memory WHERE project_memory MATCH ?1 LIMIT 3"
        ) {
            let rows: Vec<(String, String)> = stmt
                .query_map(params![fts_query], |row| {
                    Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
                })
                .map_err(|e| e.to_string())?
                .filter_map(|r| r.ok())
                .collect();

            if !rows.is_empty() {
                context.push_str("\n\n### Relevant code from workspace:\n");
                for (path, snippet) in &rows {
                    context.push_str(&format!("\n**{}:**\n```\n{}\n```\n", path, snippet));
                }
            }
        }
    }

    // 2. Symbol search — find matching function/class/import names
    let query_lower = query.to_lowercase();
    let terms: Vec<&str> = query_lower.split_whitespace().filter(|w| w.len() > 2).collect();

    if !terms.is_empty() {
        // Build a LIKE query for each term
        let like_clause = terms
            .iter()
            .map(|t| format!("LOWER(symbol_name) LIKE '%{}%'", t))
            .collect::<Vec<_>>()
            .join(" OR ");

        let sql = format!(
            "SELECT DISTINCT file_path, symbol_name, symbol_type, line_number, code_snippet FROM project_symbols WHERE {} LIMIT 8",
            like_clause
        );

        if let Ok(mut stmt) = connection.prepare(&sql) {
            let symbols: Vec<(String, String, String, i64, String)> = stmt
                .query_map([], |row| {
                    Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, String>(1)?,
                        row.get::<_, String>(2)?,
                        row.get::<_, i64>(3)?,
                        row.get::<_, String>(4)?,
                    ))
                })
                .map_err(|e| e.to_string())?
                .filter_map(|r| r.ok())
                .collect();

            if !symbols.is_empty() {
                context.push_str("\n\n### Relevant symbols in project:\n");
                for (path, name, stype, line, snippet) in &symbols {
                    context.push_str(&format!(
                        "- `{}` ({}) at {}:{} → `{}`\n",
                        name, stype, path, line, snippet.trim()
                    ));
                }
            }
        }
    }

    Ok(context)
}


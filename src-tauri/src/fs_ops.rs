use crate::models::{FileEntry, FileReadRequest, FileWriteRequest};
use std::{
    fs,
    path::{Component, Path, PathBuf},
};

pub fn workspace_root() -> Result<PathBuf, String> {
    let mut dir = std::env::current_dir().map_err(|error| error.to_string())?;
    
    // If running in development (inside src-tauri), step out to the main project root
    if dir.ends_with("src-tauri") {
        if let Some(parent) = dir.parent() {
            dir = parent.to_path_buf();
        }
    }
    
    let workspace = dir.join("workspace");
    fs::create_dir_all(&workspace).map_err(|error| error.to_string())?;
    Ok(workspace)
}

pub fn workspace_label() -> String {
    workspace_root()
        .map(|path| path.display().to_string())
        .unwrap_or_else(|_| "unknown".to_string())
}

fn get_relative_path(root: &Path, full_path: &Path) -> Result<String, String> {
    let root_str = root.to_string_lossy().to_lowercase().replace('\\', "/");
    let full_str = full_path.to_string_lossy().to_lowercase().replace('\\', "/");
    
    if full_str.starts_with(&root_str) {
        let rel = &full_path.to_string_lossy()[root_str.len()..];
        let trimmed = rel.trim_start_matches('\\').trim_start_matches('/');
        Ok(trimmed.replace('\\', "/"))
    } else {
        Err(format!(
            "Path '{}' is not relative to root '{}'",
            full_path.display(),
            root.display()
        ))
    }
}

pub fn read_file(request: FileReadRequest) -> Result<String, String> {
    let path = resolve_workspace_path(&request.path)?;
    fs::read_to_string(path).map_err(|error| error.to_string())
}

pub fn write_file(request: FileWriteRequest) -> Result<(), String> {
    let path = resolve_workspace_path(&request.path)?;

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }

    if path.exists() {
        let mut backup_path = path.clone();
        backup_path.set_extension("bak");
        let _ = fs::copy(&path, backup_path);
    }

    let tmp_path = path.with_extension("tmp");
    fs::write(&tmp_path, request.content).map_err(|error| error.to_string())?;
    fs::rename(&tmp_path, path).map_err(|error| error.to_string())
}

pub fn list_files(path: Option<String>) -> Result<Vec<FileEntry>, String> {
    let relative_path = path.unwrap_or_else(|| ".".to_string());
    let directory = resolve_workspace_path(&relative_path)?;
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    let entries = fs::read_dir(directory).map_err(|error| error.to_string())?;

    entries
        .map(|entry| {
            let entry = entry.map_err(|error| error.to_string())?;
            let metadata = entry.metadata().map_err(|error| error.to_string())?;
            let full_path = entry.path();
            let root = workspace_root()?;
            let relative = get_relative_path(&root, &full_path)?;

            Ok(FileEntry {
                path: relative,
                name: entry.file_name().to_string_lossy().to_string(),
                is_directory: metadata.is_dir(),
            })
        })
        .collect()
}

pub fn resolve_workspace_path(path: &str) -> Result<PathBuf, String> {
    let mut cleaned = path.trim().replace('\\', "/");
    if cleaned.starts_with("./") {
        cleaned = cleaned[2..].to_string();
    }
    if cleaned.starts_with("workspace/") {
        cleaned = cleaned[10..].to_string();
    }
    if cleaned.starts_with("workspace") && cleaned.len() == 9 {
        cleaned = ".".to_string();
    }

    let requested = Path::new(&cleaned);
    let stays_relative = requested
        .components()
        .all(|component| matches!(component, Component::Normal(_) | Component::CurDir));

    if requested.is_absolute() || !stays_relative {
        return Err("path must be relative and stay inside the Topptic workspace".to_string());
    }

    let workspace = workspace_root()?;
    let candidate = workspace.join(requested);

    let workspace_str = workspace.to_string_lossy().to_lowercase().replace('\\', "/");
    let candidate_str = candidate.to_string_lossy().to_lowercase().replace('\\', "/");

    if candidate_str.starts_with(&workspace_str) {
        Ok(candidate)
    } else {
        Err("path must stay inside the Topptic workspace".to_string())
    }
}

pub fn search_workspace(query: &str) -> Result<String, String> {
    let root = workspace_root()?;
    let mut results: Vec<(String, String, usize)> = Vec::new();

    let query_terms: Vec<String> = query
        .to_lowercase()
        .split_whitespace()
        .map(|s| s.chars().filter(|c| c.is_alphanumeric()).collect())
        .filter(|s: &String| s.len() > 1)
        .collect();

    if query_terms.is_empty() {
        return Ok("No query terms to search for.".to_string());
    }

    // Recursively walk directory structure
    fn walk_dir(dir: &std::path::Path, files: &mut Vec<std::path::PathBuf>) {
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    let dir_name = path.file_name().unwrap_or_default().to_string_lossy();
                    if dir_name != "node_modules" && dir_name != "target" && !dir_name.starts_with('.') {
                        walk_dir(&path, files);
                    }
                } else {
                    let ext = path.extension().unwrap_or_default().to_string_lossy().to_lowercase();
                    if matches!(ext.as_str(), "rs" | "js" | "jsx" | "ts" | "tsx" | "py" | "json" | "md" | "html" | "css") {
                        files.push(path);
                    }
                }
            }
        }
    }

    let mut files = Vec::new();
    walk_dir(&root, &mut files);

    for file_path in files {
        if let Ok(content) = std::fs::read_to_string(&file_path) {
            let chunks: Vec<&str> = content.split('\n').collect();
            let mut current_chunk = String::new();
            
            for line in chunks {
                current_chunk.push_str(line);
                current_chunk.push('\n');
                
                if current_chunk.len() >= 800 {
                    let score = calculate_score(&current_chunk, &query_terms);
                    if score > 0 {
                        let relative_path = get_relative_path(&root, &file_path).unwrap_or_else(|_| file_path.to_string_lossy().to_string());
                        results.push((relative_path, current_chunk.clone(), score));
                    }
                    current_chunk.clear();
                }
            }
            
            if !current_chunk.is_empty() {
                let score = calculate_score(&current_chunk, &query_terms);
                if score > 0 {
                    let relative_path = get_relative_path(&root, &file_path).unwrap_or_else(|_| file_path.to_string_lossy().to_string());
                    results.push((relative_path, current_chunk, score));
                }
            }
        }
    }

    // Sort matching chunks based on highest tf-idf proxy score
    results.sort_by(|a, b| b.2.cmp(&a.2));

    if results.is_empty() {
        return Ok("No matching code chunks found in the workspace.".to_string());
    }

    let mut context_msg = String::from("Retrieved local workspace context:\n\n");
    for (i, (path, chunk, _score)) in results.into_iter().take(4).enumerate() {
        context_msg.push_str(&format!("### Chunk {} from `{}`:\n```\n{}\n```\n\n", i + 1, path, chunk.trim()));
    }

    Ok(context_msg)
}

fn calculate_score(chunk: &str, query_terms: &[String]) -> usize {
    let lower_chunk = chunk.to_lowercase();
    let mut score = 0;
    for term in query_terms {
        let matches = lower_chunk.matches(term).count();
        if matches > 0 {
            // Reward unique keyword matches + term frequency
            score += 10 + matches;
        }
    }
    score
}

pub fn create_directory(path: &str) -> Result<(), String> {
    let path = resolve_workspace_path(path)?;
    fs::create_dir_all(path).map_err(|error| error.to_string())
}

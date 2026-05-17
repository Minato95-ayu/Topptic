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

pub fn write_file(request: FileWriteRequest) -> Result<String, String> {
    let path = resolve_workspace_path(&request.path)?;

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }

    let mut backup_path_str = String::new();
    if path.exists() {
        // Create proper .topptic/backups/ directory for rollback history
        let backup_dir = workspace_root()?.parent().unwrap_or(std::path::Path::new(".")).join(".topptic").join("backups");
        fs::create_dir_all(&backup_dir).map_err(|e| e.to_string())?;

        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis();
        let file_name = path.file_name().unwrap_or_default().to_string_lossy();
        let backup_file = backup_dir.join(format!("{}_{}", timestamp, file_name));
        let _ = fs::copy(&path, &backup_file);
        backup_path_str = backup_file.to_string_lossy().to_string();
    }

    let tmp_path = path.with_extension("tmp");
    fs::write(&tmp_path, request.content).map_err(|error| error.to_string())?;
    fs::rename(&tmp_path, path).map_err(|error| error.to_string())?;
    Ok(backup_path_str)
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

pub fn log_failure(working_dir: &std::path::Path, command: &str, error: &str) -> Result<(), String> {
    use std::io::Write;
    let fail_path = working_dir.join("FAILURES.md");
    let mut file = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&fail_path)
        .map_err(|e| e.to_string())?;
    
    let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs();
    let log = format!("\n## Failure [{}]\n**Command:** `{}`\n**Error:**\n```\n{}\n```\n", now, command, error);
    
    file.write_all(log.as_bytes()).map_err(|e| e.to_string())
}

pub fn delete_file_or_folder(path: &str) -> Result<(), String> {
    let resolved = resolve_workspace_path(path)?;
    if !resolved.exists() {
        return Err(format!("Path not found: {}", path));
    }
    if resolved.is_dir() {
        fs::remove_dir_all(resolved).map_err(|e| e.to_string())
    } else {
        fs::remove_file(resolved).map_err(|e| e.to_string())
    }
}

pub fn rename_file_or_folder(old_path: &str, new_name: &str) -> Result<(), String> {
    let resolved_old = resolve_workspace_path(old_path)?;
    if !resolved_old.exists() {
        return Err(format!("Path not found: {}", old_path));
    }
    let parent = resolved_old.parent().ok_or("Cannot rename root")?;
    let resolved_new = parent.join(new_name);
    fs::rename(resolved_old, resolved_new).map_err(|e| e.to_string())
}

pub fn reveal_in_explorer(path: &str) -> Result<(), String> {
    let resolved = resolve_workspace_path(path)?;
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg("/select,")
            .arg(resolved.to_string_lossy().into_owned())
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg("-R")
            .arg(resolved.to_string_lossy().into_owned())
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        // For linux, there's no standard cross-DE select, so we just open the parent folder
        if let Some(parent) = resolved.parent() {
            std::process::Command::new("xdg-open")
                .arg(parent.to_string_lossy().into_owned())
                .spawn()
                .map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

/// Import an external folder from anywhere on the computer into the Topptic workspace.
/// Recursively copies all files and sub-directories, preserving the full folder structure.
/// Skips heavy/unnecessary directories (node_modules, .git, target, etc.)
pub fn import_external_folder(source_path: &str) -> Result<String, String> {
    let source = std::path::Path::new(source_path);
    if !source.exists() {
        return Err(format!("Source folder not found: {}", source_path));
    }
    if !source.is_dir() {
        return Err(format!("Source path is not a directory: {}", source_path));
    }

    let folder_name = source
        .file_name()
        .ok_or("Invalid folder name")?
        .to_string_lossy()
        .to_string();

    let workspace = workspace_root()?;
    let dest = workspace.join(&folder_name);

    // Create destination directory
    fs::create_dir_all(&dest).map_err(|e| e.to_string())?;

    // Directories to skip during import (heavy/unnecessary)
    let skip_dirs = [
        "node_modules", "target", ".git", ".next", "dist", "build", "out",
        ".cargo", "__pycache__", ".topptic", "venv", ".venv", "env",
    ];

    fn copy_dir_recursive(
        src: &std::path::Path,
        dst: &std::path::Path,
        skip: &[&str],
        count: &mut usize,
    ) -> Result<(), String> {
        let entries = fs::read_dir(src).map_err(|e| format!("Failed to read {}: {}", src.display(), e))?;

        for entry in entries {
            let entry = entry.map_err(|e| e.to_string())?;
            let path = entry.path();
            let name = entry.file_name().to_string_lossy().to_string();

            // Skip heavy directories
            if path.is_dir() && skip.contains(&name.as_str()) {
                continue;
            }

            let dest_path = dst.join(&name);

            if path.is_dir() {
                fs::create_dir_all(&dest_path).map_err(|e| e.to_string())?;
                copy_dir_recursive(&path, &dest_path, skip, count)?;
            } else {
                // Skip very large files (>10MB) to protect low-RAM systems
                if let Ok(meta) = path.metadata() {
                    if meta.len() > 10_000_000 {
                        continue;
                    }
                }
                fs::copy(&path, &dest_path).map_err(|e| {
                    format!("Failed to copy {}: {}", path.display(), e)
                })?;
                *count += 1;
            }
        }
        Ok(())
    }

    let mut file_count = 0;
    copy_dir_recursive(source, &dest, &skip_dirs, &mut file_count)?;

    Ok(format!(
        "Imported '{}' → {} files copied to workspace/{}",
        source_path, file_count, folder_name
    ))
}


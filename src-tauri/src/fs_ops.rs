use crate::models::{FileEntry, FileReadRequest, FileWriteRequest};
use std::{
    fs,
    path::{Component, Path, PathBuf},
};

pub fn workspace_root() -> Result<PathBuf, String> {
    std::env::current_dir()
        .map(|path| path.join("workspace"))
        .map_err(|error| error.to_string())
}

pub fn workspace_label() -> String {
    workspace_root()
        .map(|path| path.display().to_string())
        .unwrap_or_else(|_| "unknown".to_string())
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
            let relative = full_path
                .strip_prefix(root)
                .map_err(|error| error.to_string())?
                .to_string_lossy()
                .replace('\\', "/");

            Ok(FileEntry {
                path: relative,
                name: entry.file_name().to_string_lossy().to_string(),
                is_directory: metadata.is_dir(),
            })
        })
        .collect()
}

pub fn resolve_workspace_path(path: &str) -> Result<PathBuf, String> {
    let requested = Path::new(path);
    let stays_relative = requested
        .components()
        .all(|component| matches!(component, Component::Normal(_) | Component::CurDir));

    if requested.is_absolute() || !stays_relative {
        return Err("path must be relative and stay inside the Topptic workspace".to_string());
    }

    let workspace = workspace_root()?;
    let candidate = workspace.join(requested);
    let parent = candidate.parent().unwrap_or(&workspace);

    if parent.starts_with(&workspace) {
        Ok(candidate)
    } else {
        Err("path must stay inside the Topptic workspace".to_string())
    }
}

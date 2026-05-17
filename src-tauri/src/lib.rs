mod ai;
mod build_engine;
mod build_runner;
mod commands;
mod db;
mod fs_ops;
mod models;

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // Force strict low-RAM constraints for Ollama backend
            std::env::set_var("OLLAMA_NUM_PARALLEL", "1");
            std::env::set_var("OLLAMA_MAX_LOADED_MODELS", "1");
            
            db::init_database(app.handle())
                .map_err(|error| std::io::Error::new(std::io::ErrorKind::Other, error))?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_backend_status,
            commands::list_projects,
            commands::get_projects,
            commands::create_project,
            commands::list_files,
            commands::read_file,
            commands::write_file,
            commands::create_directory,
            commands::ai_suggest,
            commands::ai_chat,
            commands::format_code,
            commands::run_build,
            commands::export_project,
            commands::execute_terminal_command,
            commands::search_workspace_rag,
            commands::start_vertex_training,
            commands::open_workspace_folder,
            commands::run_git_command,
            commands::rollback_patch,
            commands::list_mcp_servers,
            commands::register_mcp_server,
            commands::delete_file_or_folder,
            commands::rename_file_or_folder,
            commands::reveal_in_explorer,
            commands::import_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running Topptic");
}

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
            commands::start_vertex_training
        ])
        .run(tauri::generate_context!())
        .expect("error while running Topptic");
}

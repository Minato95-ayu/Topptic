mod ai;
mod build_runner;
mod commands;
mod fs_ops;
mod models;

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::get_backend_status,
            commands::list_projects,
            commands::list_files,
            commands::read_file,
            commands::write_file,
            commands::ai_suggest,
            commands::ai_chat,
            commands::format_code,
            commands::run_build
        ])
        .run(tauri::generate_context!())
        .expect("error while running Topptic");
}

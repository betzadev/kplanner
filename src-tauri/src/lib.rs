mod commands;
mod models;
mod storage;

use commands::*;
use storage::StorageManager;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let data_dir = app.path().app_data_dir().unwrap_or_else(|_| {
                std::env::current_dir().unwrap_or_else(|_| std::path::PathBuf::from("."))
            });
            app.manage(StorageManager::new(data_dir));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            load_daily_sheet,
            save_daily_sheet,
            get_all_sheets,
            load_subjects,
            save_subjects,
            load_timer_config,
            save_timer_config,
            export_data,
            import_data,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

mod commands;
mod models;
mod storage;
mod turso;

use commands::*;
use std::sync::Arc;
use storage::StorageManager;
use tauri::Manager;
use tokio::sync::Mutex;
use turso::TursoManager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_haptics::init())
        .setup(|app| {
            let data_dir = app.path().app_data_dir().unwrap_or_else(|_| {
                std::env::current_dir().unwrap_or_else(|_| std::path::PathBuf::from("."))
            });
            app.manage(StorageManager::new(data_dir.clone()));

            // Inicializar Turso Manager (SQLite embebido con soporte de replicación)
            let turso_holder: Arc<Mutex<Option<TursoManager>>> = Arc::new(Mutex::new(None));
            let holder_clone = turso_holder.clone();

            tauri::async_runtime::spawn(async move {
                let db_path = data_dir.join("kplanner_local.db");
                let turso_url = std::env::var("TURSO_DATABASE_URL").ok();
                let turso_token = std::env::var("TURSO_AUTH_TOKEN").ok();

                match TursoManager::init(db_path, turso_url, turso_token).await {
                    Ok(manager) => {
                        let mut lock = holder_clone.lock().await;
                        *lock = Some(manager);
                    }
                    Err(e) => {
                        eprintln!("[Turso] Error initializing libsql: {:?}", e);
                    }
                }
            });

            app.manage(turso_holder);
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
            load_dday_events,
            save_dday_events,
            load_bottom_memo_preset,
            save_bottom_memo_preset,
            export_data,
            import_data,
            sync_turso_database,
            get_gamification_profile,
            save_gamification_profile,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

use crate::models::{DailySheet, SubjectItem, TimerConfig};
use crate::storage::StorageManager;
use crate::turso::TursoManager;
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;

#[tauri::command]
pub fn load_daily_sheet(storage: State<'_, StorageManager>, date: String) -> DailySheet {
    storage.get_daily_sheet(&date)
}

#[tauri::command]
pub fn save_daily_sheet(
    storage: State<'_, StorageManager>,
    sheet: DailySheet,
) -> Result<(), String> {
    storage.save_daily_sheet(sheet)
}

#[tauri::command]
pub fn get_all_sheets(storage: State<'_, StorageManager>) -> Vec<DailySheet> {
    storage.get_all_sheets()
}

#[tauri::command]
pub fn load_subjects(storage: State<'_, StorageManager>) -> Vec<SubjectItem> {
    storage.get_subjects()
}

#[tauri::command]
pub fn save_subjects(
    storage: State<'_, StorageManager>,
    subjects: Vec<SubjectItem>,
) -> Result<(), String> {
    storage.save_subjects(subjects)
}

#[tauri::command]
pub fn load_timer_config(storage: State<'_, StorageManager>) -> TimerConfig {
    storage.get_timer_config()
}

#[tauri::command]
pub fn save_timer_config(
    storage: State<'_, StorageManager>,
    config: TimerConfig,
) -> Result<(), String> {
    storage.save_timer_config(config)
}

#[tauri::command]
pub fn export_data(storage: State<'_, StorageManager>) -> Result<String, String> {
    storage.export_json()
}

#[tauri::command]
pub fn import_data(storage: State<'_, StorageManager>, json: String) -> Result<(), String> {
    storage.import_json(&json)
}

/// Comando Tauri para sincronización nativa con la base de datos Turso
#[tauri::command]
pub async fn sync_turso_database(
    turso: State<'_, Arc<Mutex<Option<TursoManager>>>>,
) -> Result<usize, String> {
    let guard = turso.lock().await;
    if let Some(ref manager) = *guard {
        manager.sync().await.map_err(|e| e.to_string())
    } else {
        Err("Turso database manager not initialized".to_string())
    }
}

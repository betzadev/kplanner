use crate::models::{DailySheet, SubjectItem, TimerConfig};
use crate::storage::StorageManager;
use tauri::State;

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

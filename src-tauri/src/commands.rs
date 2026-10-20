use crate::models::{DDayEvent, DailySheet, SubjectItem, TimerConfig};
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
pub async fn save_daily_sheet(
    storage: State<'_, StorageManager>,
    turso: State<'_, Arc<Mutex<Option<TursoManager>>>>,
    sheet: DailySheet,
) -> Result<(), String> {
    let date = sheet.date.clone();
    let goal = sheet.main_goal.clone();
    let total_mins = sheet.total_minutes_studied;
    let json_data = serde_json::to_string(&sheet).unwrap_or_default();

    storage.save_daily_sheet(sheet)?;

    // Idempotent write to SQLite / Turso WAL database
    let turso_clone = turso.inner().clone();
    tokio::spawn(async move {
        let guard = turso_clone.lock().await;
        if let Some(ref manager) = *guard {
            let _ = manager
                .upsert_daily_sheet(&date, &goal, total_mins, &json_data)
                .await;
        }
    });

    Ok(())
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
pub async fn save_subjects(
    storage: State<'_, StorageManager>,
    turso: State<'_, Arc<Mutex<Option<TursoManager>>>>,
    subjects: Vec<SubjectItem>,
) -> Result<(), String> {
    let subjects_clone = subjects.clone();
    storage.save_subjects(subjects)?;

    let turso_clone = turso.inner().clone();
    tokio::spawn(async move {
        let guard = turso_clone.lock().await;
        if let Some(ref manager) = *guard {
            let _ = manager.upsert_subjects(&subjects_clone).await;
        }
    });

    Ok(())
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
pub fn load_dday_events(storage: State<'_, StorageManager>) -> Vec<DDayEvent> {
    storage.get_dday_events()
}

#[tauri::command]
pub async fn save_dday_events(
    storage: State<'_, StorageManager>,
    turso: State<'_, Arc<Mutex<Option<TursoManager>>>>,
    events: Vec<DDayEvent>,
) -> Result<(), String> {
    let events_clone = events.clone();
    storage.save_dday_events(events)?;

    let turso_clone = turso.inner().clone();
    tokio::spawn(async move {
        let guard = turso_clone.lock().await;
        if let Some(ref manager) = *guard {
            let _ = manager.upsert_dday_events(&events_clone).await;
        }
    });

    Ok(())
}

#[tauri::command]
pub fn load_bottom_memo_preset(storage: State<'_, StorageManager>) -> String {
    storage.get_bottom_memo_preset()
}

#[tauri::command]
pub fn save_bottom_memo_preset(
    storage: State<'_, StorageManager>,
    preset: String,
) -> Result<(), String> {
    storage.save_bottom_memo_preset(preset)
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

#[tauri::command]
pub async fn get_gamification_profile(
    storage: State<'_, StorageManager>,
    turso: State<'_, Arc<Mutex<Option<TursoManager>>>>,
) -> Result<Option<String>, String> {
    let turso_clone = turso.inner().clone();
    let guard = turso_clone.lock().await;
    if let Some(ref manager) = *guard {
        if let Ok(Some(payload)) = manager.get_gamification_profile().await {
            return Ok(Some(payload));
        }
    }
    Ok(storage.get_gamification_profile())
}

#[tauri::command]
pub async fn save_gamification_profile(
    storage: State<'_, StorageManager>,
    turso: State<'_, Arc<Mutex<Option<TursoManager>>>>,
    payload_json: String,
) -> Result<(), String> {
    storage.save_gamification_profile(payload_json.clone())?;

    let turso_clone = turso.inner().clone();
    tokio::spawn(async move {
        let guard = turso_clone.lock().await;
        if let Some(ref manager) = *guard {
            let _ = manager.upsert_gamification_profile(&payload_json).await;
        }
    });

    Ok(())
}

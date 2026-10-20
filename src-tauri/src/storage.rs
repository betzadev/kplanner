use crate::models::{
    create_empty_daily_sheet, AppData, DDayEvent, DailySheet, SubjectItem, TimerConfig,
};
use std::fs::{self, File};
use std::io::{BufReader, BufWriter};
use std::path::{Path, PathBuf};
use std::sync::Mutex;

pub struct StorageManager {
    file_path: PathBuf,
    data: Mutex<AppData>,
}

impl StorageManager {
    pub fn new<P: AsRef<Path>>(data_dir: P) -> Self {
        let dir = data_dir.as_ref();
        let _ = fs::create_dir_all(dir);
        let file_path = dir.join("kplanner_data.json");

        let initial_data = if file_path.exists() {
            match File::open(&file_path) {
                Ok(file) => {
                    let reader = BufReader::new(file);
                    serde_json::from_reader(reader).unwrap_or_else(|_| AppData::default())
                }
                Err(_) => AppData::default(),
            }
        } else {
            let def = AppData::default();
            let _ = Self::save_to_disk(&file_path, &def);
            def
        };

        Self {
            file_path,
            data: Mutex::new(initial_data),
        }
    }

    fn save_to_disk(path: &Path, data: &AppData) -> Result<(), String> {
        let file = File::create(path).map_err(|e| e.to_string())?;
        let writer = BufWriter::new(file);
        serde_json::to_writer_pretty(writer, data).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_daily_sheet(&self, date: &str) -> DailySheet {
        let mut guard = self.data.lock().unwrap();
        if let Some(sheet) = guard.daily_sheets.get(date) {
            sheet.clone()
        } else {
            let new_sheet = create_empty_daily_sheet(date);
            guard
                .daily_sheets
                .insert(date.to_string(), new_sheet.clone());
            let _ = Self::save_to_disk(&self.file_path, &guard);
            new_sheet
        }
    }

    pub fn save_daily_sheet(&self, sheet: DailySheet) -> Result<(), String> {
        let mut guard = self.data.lock().unwrap();
        guard.daily_sheets.insert(sheet.date.clone(), sheet);
        Self::save_to_disk(&self.file_path, &guard)
    }

    pub fn get_all_sheets(&self) -> Vec<DailySheet> {
        let guard = self.data.lock().unwrap();
        guard.daily_sheets.values().cloned().collect()
    }

    pub fn get_subjects(&self) -> Vec<SubjectItem> {
        let guard = self.data.lock().unwrap();
        guard.subjects.clone()
    }

    pub fn save_subjects(&self, subjects: Vec<SubjectItem>) -> Result<(), String> {
        let mut guard = self.data.lock().unwrap();
        guard.subjects = subjects;
        Self::save_to_disk(&self.file_path, &guard)
    }

    pub fn get_timer_config(&self) -> TimerConfig {
        let guard = self.data.lock().unwrap();
        guard.timer_config.clone()
    }

    pub fn save_timer_config(&self, config: TimerConfig) -> Result<(), String> {
        let mut guard = self.data.lock().unwrap();
        guard.timer_config = config;
        Self::save_to_disk(&self.file_path, &guard)
    }

    pub fn get_dday_events(&self) -> Vec<DDayEvent> {
        let guard = self.data.lock().unwrap();
        guard.dday_events.clone()
    }

    pub fn save_dday_events(&self, events: Vec<DDayEvent>) -> Result<(), String> {
        let mut guard = self.data.lock().unwrap();
        guard.dday_events = events;
        Self::save_to_disk(&self.file_path, &guard)
    }

    pub fn get_bottom_memo_preset(&self) -> String {
        let guard = self.data.lock().unwrap();
        guard
            .bottom_memo_preset
            .clone()
            .unwrap_or_else(|| "classic".to_string())
    }

    pub fn save_bottom_memo_preset(&self, preset: String) -> Result<(), String> {
        let mut guard = self.data.lock().unwrap();
        guard.bottom_memo_preset = Some(preset);
        Self::save_to_disk(&self.file_path, &guard)
    }

    pub fn export_json(&self) -> Result<String, String> {
        let guard = self.data.lock().unwrap();
        serde_json::to_string_pretty(&*guard).map_err(|e| e.to_string())
    }

    pub fn import_json(&self, json_content: &str) -> Result<(), String> {
        let parsed: AppData = serde_json::from_str(json_content).map_err(|e| e.to_string())?;
        let mut guard = self.data.lock().unwrap();
        *guard = parsed;
        Self::save_to_disk(&self.file_path, &guard)
    }
}

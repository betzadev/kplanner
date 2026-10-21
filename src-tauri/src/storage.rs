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

    pub fn get_gamification_profile(&self) -> Option<String> {
        let guard = self.data.lock().unwrap();
        guard.gamification_profile.clone()
    }

    pub fn save_gamification_profile(&self, payload_json: String) -> Result<(), String> {
        let mut guard = self.data.lock().unwrap();
        guard.gamification_profile = Some(payload_json);
        Self::save_to_disk(&self.file_path, &guard)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::{params, Connection};

    fn init_test_db() -> Connection {
        let conn = Connection::open_in_memory().expect("failed to open in-memory sqlite");
        conn.execute(
            "CREATE TABLE IF NOT EXISTS daily_sheets (
                date TEXT PRIMARY KEY,
                main_goal TEXT,
                total_minutes INTEGER,
                data_json TEXT NOT NULL,
                updated_at INTEGER NOT NULL
            );",
            [],
        )
        .expect("create daily_sheets table");

        conn.execute(
            "CREATE TABLE IF NOT EXISTS dday_events (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                target_date TEXT NOT NULL,
                color_id TEXT NOT NULL,
                is_pinned INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            );",
            [],
        )
        .expect("create dday_events table");

        conn.execute(
            "CREATE TABLE IF NOT EXISTS gamification_profile (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                payload_json TEXT NOT NULL,
                updated_at INTEGER NOT NULL
            );",
            [],
        )
        .expect("create gamification_profile table");

        conn
    }

    #[test]
    fn test_schema_initialization() {
        let conn = init_test_db();

        let mut stmt = conn
            .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
            .unwrap();
        let tables: Vec<String> = stmt
            .query_map([], |row| row.get(0))
            .unwrap()
            .map(|r| r.unwrap())
            .collect();

        assert!(tables.contains(&"daily_sheets".to_string()));
        assert!(tables.contains(&"dday_events".to_string()));
        assert!(tables.contains(&"gamification_profile".to_string()));
    }

    #[test]
    fn test_idempotent_daily_sheet_upsert() {
        let conn = init_test_db();
        let date = "2026-10-20";

        let mut sheet = create_empty_daily_sheet(date);
        sheet.main_goal = "Master Rust & Algorithms".to_string();
        sheet.total_minutes_studied = 120;
        sheet.completion_stamp = Some("100% Focus".to_string());
        sheet.memo_labels = Some([
            "Concepts".into(),
            "Questions".into(),
            "Vocab".into(),
            "Wins".into(),
            "Fixes".into(),
            "Notes".into(),
        ]);

        if let Some(block) = sheet.time_grid.get_mut("9-0") {
            block.planned_subject_id = Some("subj_math".to_string());
            block.actual_subject_id = Some("subj_math".to_string());
            block.subject_id = Some("subj_math".to_string());
            block.is_verified_timer = Some(true);
        }

        let json1 = serde_json::to_string(&sheet).unwrap();

        // 1st insert
        conn.execute(
            "INSERT INTO daily_sheets (date, main_goal, total_minutes, data_json, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(date) DO UPDATE SET
                 main_goal = excluded.main_goal,
                 total_minutes = excluded.total_minutes,
                 data_json = excluded.data_json,
                 updated_at = excluded.updated_at;",
            params![
                date,
                &sheet.main_goal,
                sheet.total_minutes_studied,
                &json1,
                1000i64
            ],
        )
        .unwrap();

        // Update sheet and re-upsert (idempotency check)
        sheet.main_goal = "Master Rust, Algorithms & Systems".to_string();
        sheet.total_minutes_studied = 180;
        let json2 = serde_json::to_string(&sheet).unwrap();

        conn.execute(
            "INSERT INTO daily_sheets (date, main_goal, total_minutes, data_json, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(date) DO UPDATE SET
                 main_goal = excluded.main_goal,
                 total_minutes = excluded.total_minutes,
                 data_json = excluded.data_json,
                 updated_at = excluded.updated_at;",
            params![
                date,
                &sheet.main_goal,
                sheet.total_minutes_studied,
                &json2,
                2000i64
            ],
        )
        .unwrap();

        let mut stmt = conn
            .prepare(
                "SELECT main_goal, total_minutes, data_json FROM daily_sheets WHERE date = ?1;",
            )
            .unwrap();
        let (saved_goal, saved_mins, saved_json): (String, u32, String) = stmt
            .query_row(params![date], |row| {
                Ok((row.get(0)?, row.get(1)?, row.get(2)?))
            })
            .unwrap();

        assert_eq!(saved_goal, "Master Rust, Algorithms & Systems");
        assert_eq!(saved_mins, 180);

        let parsed: DailySheet = serde_json::from_str(&saved_json).unwrap();
        assert_eq!(parsed.completion_stamp, Some("100% Focus".to_string()));
        let block = parsed.time_grid.get("9-0").unwrap();
        assert_eq!(block.planned_subject_id, Some("subj_math".to_string()));
        assert_eq!(block.is_verified_timer, Some(true));
    }

    #[test]
    fn test_dday_crud_and_gamification_profile() {
        let conn = init_test_db();

        // D-Day Insert & Read
        conn.execute(
            "INSERT INTO dday_events (id, title, target_date, color_id, is_pinned, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6);",
            params!["dday_exam", "SAT Exam", "2026-11-15", "#F6A6A1", 1, 1000i64],
        )
        .unwrap();

        let title: String = conn
            .query_row(
                "SELECT title FROM dday_events WHERE id = ?1;",
                params!["dday_exam"],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(title, "SAT Exam");

        // D-Day Delete
        conn.execute(
            "DELETE FROM dday_events WHERE id = ?1;",
            params!["dday_exam"],
        )
        .unwrap();
        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM dday_events WHERE id = ?1;",
                params!["dday_exam"],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(count, 0);

        // Gamification Profile Upsert & Read
        let profile_payload = r#"{"xp":350,"gems":180,"streakCount":5,"unlockedThemes":["dreamy_pastel","matcha_cafe"]}"#;
        conn.execute(
            "INSERT INTO gamification_profile (id, payload_json, updated_at)
             VALUES (1, ?1, ?2)
             ON CONFLICT(id) DO UPDATE SET
                 payload_json = excluded.payload_json,
                 updated_at = excluded.updated_at;",
            params![profile_payload, 5000i64],
        )
        .unwrap();

        let read_payload: String = conn
            .query_row(
                "SELECT payload_json FROM gamification_profile WHERE id = 1;",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(read_payload, profile_payload);
    }
}

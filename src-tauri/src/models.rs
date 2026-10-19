use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubjectItem {
    pub id: String,
    pub name: String,
    pub color: String,
    pub slot_index: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlannerTask {
    pub id: String,
    pub date: String,
    pub subject_id: String,
    pub title: String,
    pub is_completed: bool,
    pub order: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimeBlock {
    pub hour: u8,
    pub ten_min_index: u8,
    pub subject_id: Option<String>,
    pub task_id: Option<String>,
    #[serde(default = "default_fill_ratio")]
    pub fill_ratio: f32,
}

fn default_fill_ratio() -> f32 {
    1.0
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DailySheet {
    pub date: String,
    pub main_goal: String,
    pub total_minutes_studied: u32,
    pub tasks: Vec<PlannerTask>,
    pub time_grid: HashMap<String, TimeBlock>,
    pub bottom_memos: [String; 6],
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimerConfig {
    pub pomodoro_work_minutes: u32,
    pub pomodoro_short_break_minutes: u32,
    pub pomodoro_long_break_minutes: u32,
    pub long_break_interval: u32,
    pub auto_start_breaks: bool,
    pub auto_start_pomodoros: bool,
    pub sound_alerts_enabled: bool,
}

impl Default for TimerConfig {
    fn default() -> Self {
        Self {
            pomodoro_work_minutes: 25,
            pomodoro_short_break_minutes: 5,
            pomodoro_long_break_minutes: 15,
            long_break_interval: 4,
            auto_start_breaks: true,
            auto_start_pomodoros: false,
            sound_alerts_enabled: true,
        }
    }
}

pub fn default_subjects() -> Vec<SubjectItem> {
    vec![
        SubjectItem {
            id: "subj_korean".to_string(),
            name: "Korean Language".to_string(),
            color: "#A7D8DE".to_string(),
            slot_index: 0,
        },
        SubjectItem {
            id: "subj_math".to_string(),
            name: "Mathematics".to_string(),
            color: "#F6A6A1".to_string(),
            slot_index: 1,
        },
        SubjectItem {
            id: "subj_english".to_string(),
            name: "English Literature".to_string(),
            color: "#FBE8A6".to_string(),
            slot_index: 2,
        },
        SubjectItem {
            id: "subj_science".to_string(),
            name: "Natural Science".to_string(),
            color: "#B4D4F0".to_string(),
            slot_index: 3,
        },
        SubjectItem {
            id: "subj_history".to_string(),
            name: "World History".to_string(),
            color: "#D5C6E8".to_string(),
            slot_index: 4,
        },
        SubjectItem {
            id: "subj_cs".to_string(),
            name: "Computer Science".to_string(),
            color: "#F8C291".to_string(),
            slot_index: 5,
        },
        SubjectItem {
            id: "subj_reading".to_string(),
            name: "General Reading".to_string(),
            color: "#F3B0C3".to_string(),
            slot_index: 6,
        },
        SubjectItem {
            id: "subj_review".to_string(),
            name: "Exam Review".to_string(),
            color: "#C1E1C1".to_string(),
            slot_index: 7,
        },
    ]
}

pub fn create_empty_daily_sheet(date: &str) -> DailySheet {
    let mut time_grid = HashMap::new();
    for hour in 0..24 {
        for ten_min in 0..6 {
            let key = format!("{}-{}", hour, ten_min);
            time_grid.insert(
                key,
                TimeBlock {
                    hour,
                    ten_min_index: ten_min,
                    subject_id: None,
                    task_id: None,
                    fill_ratio: 0.0,
                },
            );
        }
    }

    DailySheet {
        date: date.to_string(),
        main_goal: String::new(),
        total_minutes_studied: 0,
        tasks: Vec::new(),
        time_grid,
        bottom_memos: [
            String::new(),
            String::new(),
            String::new(),
            String::new(),
            String::new(),
            String::new(),
        ],
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppData {
    pub daily_sheets: HashMap<String, DailySheet>,
    pub subjects: Vec<SubjectItem>,
    pub timer_config: TimerConfig,
}

impl Default for AppData {
    fn default() -> Self {
        Self {
            daily_sheets: HashMap::new(),
            subjects: default_subjects(),
            timer_config: TimerConfig::default(),
        }
    }
}

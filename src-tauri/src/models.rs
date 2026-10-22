use serde::{Deserialize, Serialize};
use specta::Type;
use std::collections::HashMap;
use validator::Validate;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Type, Validate)]
#[serde(rename_all = "camelCase")]
pub struct SubjectItem {
    pub id: String,
    #[validate(length(min = 1, max = 50))]
    pub name: String,
    pub color: String,
    pub slot_index: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type, Validate)]
#[serde(rename_all = "camelCase")]
pub struct PlannerTask {
    pub id: String,
    pub date: String,
    pub subject_id: String,
    #[validate(length(min = 1, max = 200))]
    pub title: String,
    pub is_completed: bool,
    #[validate(range(max = 10000))]
    pub order: u32,
    pub is_rolled_over: Option<bool>,
    pub original_date: Option<String>,
    pub original_task_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct TimeBlock {
    pub hour: u8,
    pub ten_min_index: u8,
    pub subject_id: Option<String>,
    pub planned_subject_id: Option<String>,
    pub actual_subject_id: Option<String>,
    pub task_id: Option<String>,
    pub fill_ratio: f32,
    pub is_verified_timer: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type, Validate)]
#[serde(rename_all = "camelCase")]
pub struct DailySheet {
    pub date: String,
    pub main_goal: String,
    #[validate(range(max = 1440))]
    pub total_minutes_studied: u32,
    #[validate(nested)]
    pub tasks: Vec<PlannerTask>,
    pub time_grid: HashMap<String, TimeBlock>,
    pub bottom_memos: [String; 6],
    pub memo_labels: Option<[String; 6]>,
    pub completion_stamp: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type, Validate)]
#[serde(rename_all = "camelCase")]
pub struct DDayEvent {
    pub id: String,
    #[validate(length(min = 1, max = 100))]
    pub title: String,
    pub target_date: String,
    pub color_id: String,
    pub is_pinned: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type, Validate)]
#[serde(rename_all = "camelCase")]
pub struct GamificationProfile {
    pub xp: u32,
    pub gems: u32,
    pub streak_freezes: u32,
    pub daily_goal_minutes: u32,
    pub claimed_milestones: Vec<String>,
    pub claimed_weekly_chests: Vec<String>,
    pub unlocked_themes: Vec<String>,
    pub unlocked_stamps: Vec<String>,
    pub unlocked_chimes: Vec<String>,
}

impl Default for GamificationProfile {
    fn default() -> Self {
        Self {
            xp: 0,
            gems: 0,
            streak_freezes: 1,
            daily_goal_minutes: 60,
            claimed_milestones: Vec::new(),
            claimed_weekly_chests: Vec::new(),
            unlocked_themes: vec!["dreamy_pastel".to_string()],
            unlocked_stamps: Vec::new(),
            unlocked_chimes: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Type)]
#[serde(default, rename_all = "camelCase")]
pub struct TimerConfig {
    pub pomodoro_work_minutes: u32,
    pub pomodoro_short_break_minutes: u32,
    pub pomodoro_long_break_minutes: u32,
    pub long_break_interval: u32,
    pub auto_start_breaks: bool,
    pub auto_start_pomodoros: bool,
    pub sound_alerts_enabled: bool,
    #[serde(default = "default_chime")]
    pub chime_preset: String,
    #[serde(default = "default_ambient")]
    pub ambient_sound: String,
    #[serde(default = "default_volume")]
    pub ambient_volume: f32,
    #[serde(default)]
    pub flowtime_overtime_enabled: Option<bool>,
}

fn default_chime() -> String {
    "default".to_string()
}
fn default_ambient() -> String {
    "none".to_string()
}
fn default_volume() -> f32 {
    0.5
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
            chime_preset: default_chime(),
            ambient_sound: default_ambient(),
            ambient_volume: default_volume(),
            flowtime_overtime_enabled: Some(false),
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
                    planned_subject_id: None,
                    actual_subject_id: None,
                    task_id: None,
                    fill_ratio: 0.0,
                    is_verified_timer: None,
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
        memo_labels: None,
        completion_stamp: None,
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AppData {
    pub daily_sheets: HashMap<String, DailySheet>,
    pub subjects: Vec<SubjectItem>,
    pub timer_config: TimerConfig,
    #[serde(default)]
    pub dday_events: Vec<DDayEvent>,
    #[serde(default)]
    pub bottom_memo_preset: Option<String>,
    #[serde(default)]
    pub gamification_profile: Option<String>,
}

impl Default for AppData {
    fn default() -> Self {
        Self {
            daily_sheets: HashMap::new(),
            subjects: default_subjects(),
            timer_config: TimerConfig::default(),
            dday_events: Vec::new(),
            bottom_memo_preset: Some("classic".to_string()),
            gamification_profile: None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_subject_item_roundtrip() {
        let item = SubjectItem {
            id: "subj_1".to_string(),
            name: "Math".to_string(),
            color: "#C2D8FC".to_string(),
            slot_index: 1,
        };
        let json = serde_json::to_string(&item).expect("serialize");
        let deserialized: SubjectItem = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(item, deserialized);
    }

    #[test]
    fn test_timer_config_defaults() {
        let json = "{}";
        let config: TimerConfig = serde_json::from_str(json).expect("deserialize empty json");
        assert_eq!(config.pomodoro_work_minutes, 25);
        assert_eq!(config.pomodoro_short_break_minutes, 5);
        assert_eq!(config.pomodoro_long_break_minutes, 15);
        assert_eq!(config.long_break_interval, 4);
        assert_eq!(config.chime_preset, "default");
        assert_eq!(config.ambient_sound, "none");
        assert!((config.ambient_volume - 0.5).abs() < f32::EPSILON);
    }
}

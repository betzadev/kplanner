use crate::models::{DailySheet, GamificationProfile};
use chrono::{Datelike, Duration, NaiveDate};
use serde::{Deserialize, Serialize};
use specta::Type;
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct WeekDayStudy {
    pub date: String,
    pub day_label: String,
    pub studied: bool,
    pub is_today: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct StreakResult {
    pub streak_count: u32,
    pub has_studied_today: bool,
    pub today_minutes: u32,
    pub week_days: Vec<WeekDayStudy>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct GamificationError {
    pub message: String,
}

pub fn check_date_has_study(sheet: Option<&DailySheet>) -> bool {
    let Some(sheet) = sheet else { return false };
    if sheet.total_minutes_studied > 0 {
        return true;
    }
    if sheet.tasks.iter().any(|t| t.is_completed) {
        return true;
    }
    sheet
        .time_grid
        .values()
        .any(|c| c.subject_id.is_some() && c.fill_ratio > 0.0)
}

pub fn compute_streak(
    _profile: &GamificationProfile,
    daily_sheets: &HashMap<String, DailySheet>,
    today: &str,
) -> StreakResult {
    let has_studied_today = check_date_has_study(daily_sheets.get(today));

    let today_minutes = if let Some(sheet) = daily_sheets.get(today) {
        if sheet.total_minutes_studied > 0 {
            sheet.total_minutes_studied
        } else {
            sheet
                .time_grid
                .values()
                .filter(|c| c.subject_id.is_some())
                .map(|c| (10.0 * c.fill_ratio).round() as u32)
                .sum()
        }
    } else {
        0
    };

    let mut streak = 0;
    if let Ok(current_date) = NaiveDate::parse_from_str(today, "%Y-%m-%d") {
        let mut check_date = if has_studied_today {
            streak = 1;
            current_date.pred_opt()
        } else {
            current_date.pred_opt()
        };

        for _ in 0..365 {
            if let Some(date) = check_date {
                let d_str = date.format("%Y-%m-%d").to_string();
                if check_date_has_study(daily_sheets.get(&d_str)) {
                    streak += 1;
                    check_date = date.pred_opt();
                } else {
                    break;
                }
            } else {
                break;
            }
        }
    }

    let day_labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    let mut week_days = Vec::new();
    if let Ok(current_date) = NaiveDate::parse_from_str(today, "%Y-%m-%d") {
        for i in (0..=6).rev() {
            if let Some(d) = current_date.checked_sub_signed(Duration::days(i)) {
                let d_str = d.format("%Y-%m-%d").to_string();
                let day_idx = d.weekday().num_days_from_sunday() as usize;
                week_days.push(WeekDayStudy {
                    date: d_str.clone(),
                    day_label: day_labels.get(day_idx).unwrap_or(&"").to_string(),
                    studied: check_date_has_study(daily_sheets.get(&d_str)),
                    is_today: d_str == today,
                });
            }
        }
    }

    StreakResult {
        streak_count: streak,
        has_studied_today,
        today_minutes,
        week_days,
    }
}

pub fn compute_xp_gain(action: &str, multiplier: Option<f32>) -> u32 {
    let base_xp = match action {
        "ten_min_block" => 10,
        "task_complete" => 25,
        "pomodoro_session" => 50,
        "daily_goal_met" => 100,
        "streak_milestone" => 200,
        _ => 5,
    };
    let mult = multiplier.unwrap_or(1.0).max(1.0);
    (base_xp as f32 * mult).round() as u32
}

pub fn apply_streak_freeze(
    profile: &mut GamificationProfile,
    _date: &str,
) -> Result<GamificationProfile, GamificationError> {
    if profile.streak_freezes == 0 {
        return Err(GamificationError {
            message: "No streak freezes available".to_string(),
        });
    }
    profile.streak_freezes -= 1;
    Ok(profile.clone())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{create_empty_daily_sheet, GamificationProfile};

    fn dummy_profile() -> GamificationProfile {
        GamificationProfile {
            xp: 100,
            gems: 50,
            streak_freezes: 1,
            daily_goal_minutes: 60,
            claimed_milestones: vec![],
            claimed_weekly_chests: vec![],
            unlocked_themes: vec!["dreamy_pastel".into()],
            unlocked_stamps: vec![],
            unlocked_chimes: vec![],
        }
    }

    #[test]
    fn test_streak_consecutive_days() {
        let profile = dummy_profile();
        let mut sheets = HashMap::new();

        let mut s1 = create_empty_daily_sheet("2026-10-20");
        s1.total_minutes_studied = 50;
        sheets.insert("2026-10-20".into(), s1);

        let mut s2 = create_empty_daily_sheet("2026-10-21");
        s2.total_minutes_studied = 60;
        sheets.insert("2026-10-21".into(), s2);

        let res = compute_streak(&profile, &sheets, "2026-10-21");
        assert_eq!(res.streak_count, 2);
        assert!(res.has_studied_today);
    }

    #[test]
    fn test_streak_broken_by_gap() {
        let profile = dummy_profile();
        let mut sheets = HashMap::new();

        let mut s1 = create_empty_daily_sheet("2026-10-18");
        s1.total_minutes_studied = 50;
        sheets.insert("2026-10-18".into(), s1);

        let mut s2 = create_empty_daily_sheet("2026-10-21");
        s2.total_minutes_studied = 60;
        sheets.insert("2026-10-21".into(), s2);

        let res = compute_streak(&profile, &sheets, "2026-10-21");
        assert_eq!(res.streak_count, 1);
    }

    #[test]
    fn test_streak_freeze_consumed() {
        let mut profile = dummy_profile();
        assert_eq!(profile.streak_freezes, 1);

        let updated = apply_streak_freeze(&mut profile, "2026-10-20").unwrap();
        assert_eq!(updated.streak_freezes, 0);

        let err = apply_streak_freeze(&mut profile, "2026-10-21");
        assert!(err.is_err());
    }

    #[test]
    fn test_streak_xp_milestone_multiplier() {
        let xp_normal = compute_xp_gain("streak_milestone", None);
        assert_eq!(xp_normal, 200);

        let xp_multiplied = compute_xp_gain("streak_milestone", Some(1.5));
        assert_eq!(xp_multiplied, 300);
    }
}

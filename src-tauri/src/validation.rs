use crate::models::{DDayEvent, DailySheet};
use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use specta::Type;
use validator::{Validate, ValidationErrors};

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct DDayStatus {
    pub days_remaining: i32,
    pub is_past: bool,
    pub is_today: bool,
    pub formatted: String,
}

pub fn validate_sheet(sheet: &DailySheet) -> Result<(), ValidationErrors> {
    sheet.validate()
}

pub fn compute_dday_remaining(event: &DDayEvent, now: &str) -> Result<DDayStatus, String> {
    let target = NaiveDate::parse_from_str(&event.target_date, "%Y-%m-%d")
        .map_err(|e| format!("Invalid target_date '{}': {}", event.target_date, e))?;
    let current = NaiveDate::parse_from_str(now, "%Y-%m-%d")
        .map_err(|e| format!("Invalid now date '{}': {}", now, e))?;

    let diff = (target - current).num_days();
    let days_remaining = i32::try_from(diff).map_err(|e| e.to_string())?;

    let formatted = if days_remaining == 0 {
        "D-DAY".into()
    } else if days_remaining < 0 {
        format!("D+{}", -days_remaining)
    } else {
        format!("D-{}", days_remaining)
    };

    Ok(DDayStatus {
        days_remaining,
        is_past: days_remaining < 0,
        is_today: days_remaining == 0,
        formatted,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::create_empty_daily_sheet;

    #[test]
    fn test_validate_sheet_rejects_excessive_minutes() {
        let mut sheet = create_empty_daily_sheet("2026-10-21");
        sheet.total_minutes_studied = 1500; // > 1440 max
        let err = validate_sheet(&sheet);
        assert!(err.is_err());
    }

    #[test]
    fn test_dday_remaining_negative_after_past() {
        let event = DDayEvent {
            id: "dday_past".into(),
            title: "Old Exam".into(),
            target_date: "2026-10-10".into(),
            color_id: "#C2D8FC".into(),
            is_pinned: false,
        };
        let status = compute_dday_remaining(&event, "2026-10-21").expect("valid dates");
        assert!(status.is_past);
        assert!(!status.is_today);
        assert_eq!(status.days_remaining, -11);
        assert_eq!(status.formatted, "D+11");
    }

    #[test]
    fn test_dday_remaining_zero_on_event_day() {
        let event = DDayEvent {
            id: "dday_today".into(),
            title: "Today Exam".into(),
            target_date: "2026-10-21".into(),
            color_id: "#C2D8FC".into(),
            is_pinned: true,
        };
        let status = compute_dday_remaining(&event, "2026-10-21").expect("valid dates");
        assert!(!status.is_past);
        assert!(status.is_today);
        assert_eq!(status.days_remaining, 0);
        assert_eq!(status.formatted, "D-DAY");
    }

    #[test]
    fn test_dday_remaining_fails_on_invalid_date() {
        let event = DDayEvent {
            id: "dday_invalid".into(),
            title: "Empty Target Date".into(),
            target_date: "".into(),
            color_id: "#C2D8FC".into(),
            is_pinned: false,
        };
        let res = compute_dday_remaining(&event, "2026-10-21");
        assert!(res.is_err());
    }
}

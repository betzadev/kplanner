use crate::models::TimeBlock;
use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Slot {
    pub hour: u8,
    pub ten_min_index: u8,
    pub label: String,
    pub key: String,
}

pub fn build_day_slots(_date: &str) -> Vec<Slot> {
    let mut slots = Vec::with_capacity(144);
    for hour in 0..24 {
        for ten_min in 0..6 {
            let key = format!("{}-{}", hour, ten_min);
            let label = format!("{:02}:{:02}", hour, ten_min * 10);
            slots.push(Slot {
                hour,
                ten_min_index: ten_min,
                label,
                key,
            });
        }
    }
    slots
}

pub fn slot_to_timeblock(slot: &Slot) -> TimeBlock {
    TimeBlock {
        hour: slot.hour,
        ten_min_index: slot.ten_min_index,
        subject_id: None,
        planned_subject_id: None,
        actual_subject_id: None,
        task_id: None,
        fill_ratio: 0.0,
        is_verified_timer: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_day_slots_returns_144() {
        let slots = build_day_slots("2026-10-21");
        assert_eq!(slots.len(), 144);
    }

    #[test]
    fn test_slot_boundaries_align_to_ten_minutes() {
        let slots = build_day_slots("2026-10-21");
        assert_eq!(slots[0].label, "00:00");
        assert_eq!(slots[0].key, "0-0");
        assert_eq!(slots[1].label, "00:10");
        assert_eq!(slots[1].key, "0-1");
        assert_eq!(slots[143].label, "23:50");
        assert_eq!(slots[143].key, "23-5");

        let tb = slot_to_timeblock(&slots[1]);
        assert_eq!(tb.hour, 0);
        assert_eq!(tb.ten_min_index, 1);
        assert_eq!(tb.fill_ratio, 0.0);
    }
}

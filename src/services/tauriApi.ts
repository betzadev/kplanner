import { invoke } from '@tauri-apps/api/core';
import { DailySheet, SubjectItem, TimerConfig } from '../types';

// Check if Tauri environment is available
function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export const tauriApi = {
  async loadDailySheet(date: string): Promise<DailySheet | null> {
    if (!isTauri()) return null;
    try {
      return await invoke<DailySheet>('load_daily_sheet', { date });
    } catch (e) {
      console.warn('Tauri invoke load_daily_sheet error:', e);
      return null;
    }
  },

  async saveDailySheet(sheet: DailySheet): Promise<boolean> {
    if (!isTauri()) return false;
    try {
      await invoke('save_daily_sheet', { sheet });
      return true;
    } catch (e) {
      console.warn('Tauri invoke save_daily_sheet error:', e);
      return false;
    }
  },

  async getAllSheets(): Promise<DailySheet[] | null> {
    if (!isTauri()) return null;
    try {
      return await invoke<DailySheet[]>('get_all_sheets');
    } catch (e) {
      console.warn('Tauri invoke get_all_sheets error:', e);
      return null;
    }
  },

  async loadSubjects(): Promise<SubjectItem[] | null> {
    if (!isTauri()) return null;
    try {
      return await invoke<SubjectItem[]>('load_subjects');
    } catch (e) {
      console.warn('Tauri invoke load_subjects error:', e);
      return null;
    }
  },

  async saveSubjects(subjects: SubjectItem[]): Promise<boolean> {
    if (!isTauri()) return false;
    try {
      await invoke('save_subjects', { subjects });
      return true;
    } catch (e) {
      console.warn('Tauri invoke save_subjects error:', e);
      return false;
    }
  },

  async loadTimerConfig(): Promise<TimerConfig | null> {
    if (!isTauri()) return null;
    try {
      return await invoke<TimerConfig>('load_timer_config');
    } catch (e) {
      console.warn('Tauri invoke load_timer_config error:', e);
      return null;
    }
  },

  async saveTimerConfig(config: TimerConfig): Promise<boolean> {
    if (!isTauri()) return false;
    try {
      await invoke('save_timer_config', { config });
      return true;
    } catch (e) {
      console.warn('Tauri invoke save_timer_config error:', e);
      return false;
    }
  },

  async exportData(): Promise<string | null> {
    if (!isTauri()) return null;
    try {
      return await invoke<string>('export_data');
    } catch (e) {
      console.warn('Tauri invoke export_data error:', e);
      return null;
    }
  },

  async importData(json: string): Promise<boolean> {
    if (!isTauri()) return false;
    try {
      await invoke('import_data', { json });
      return true;
    } catch (e) {
      console.warn('Tauri invoke import_data error:', e);
      return false;
    }
  },
};

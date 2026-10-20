import React, { useState } from 'react';
import { useSubjectStore } from '../../store/useSubjectStore';
import { useTimerStore } from '../../store/useTimerStore';
import { useThemeStore } from '../../store/useThemeStore';
import { ColorCircle } from '../ui/ColorCircle';
import { DEFAULT_PASTEL_PALETTE, EntityId, HexColor, SubjectLegendItem } from '../../types';
import { tauriApi } from '../../services/tauriApi';
import { SubjectModal } from '../planner/SubjectModal';
import {
  RotateCcw,
  Download,
  Upload,
  Bell,
  Clock,
  Palette,
  Sun,
  Moon,
  Laptop,
  Plus,
  Trash2,
  Pencil,
  Sparkles,
} from 'lucide-react';

export function SettingsView() {
  const subjects = useSubjectStore((state) => state.subjects);
  const addSubject = useSubjectStore((state) => state.addSubject);
  const updateSubject = useSubjectStore((state) => state.updateSubject);
  const deleteSubject = useSubjectStore((state) => state.deleteSubject);
  const resetSubjects = useSubjectStore((state) => state.resetToDefaults);

  const timerConfig = useTimerStore((state) => state.timerConfig);
  const updateTimerConfig = useTimerStore((state) => state.updateConfig);

  const { themePreference, resolvedTheme, setThemePreference } = useThemeStore();

  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [subjectToEdit, setSubjectToEdit] = useState<SubjectLegendItem | null>(null);

  const handleOpenAdd = () => {
    if (subjects.length >= 8) {
      alert('Maximum of 8 subjects reached.');
      return;
    }
    setModalMode('add');
    setSubjectToEdit(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (sub: SubjectLegendItem) => {
    setModalMode('edit');
    setSubjectToEdit(sub);
    setModalOpen(true);
  };

  const handleDeleteSubject = (id: EntityId, name: string) => {
    if (window.confirm(`Delete subject "${name}"?`)) {
      deleteSubject(id);
    }
  };

  const handleSaveModal = (name: string, color: HexColor, id?: string) => {
    if (modalMode === 'edit' && id) {
      updateSubject(id as EntityId, { name, color });
    } else {
      addSubject(name, color);
    }
  };

  const handleExport = async () => {
    const data = await tauriApi.exportData();
    if (data) {
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kplanner_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExportMessage('Data exported successfully!');
      setTimeout(() => setExportMessage(null), 3000);
    } else {
      // Fallback from localStorage
      const sheets = localStorage.getItem('korean_planner_daily_sheets');
      const subj = localStorage.getItem('korean_planner_subjects');
      const timer = localStorage.getItem('korean_planner_timer_state');
      const backup = JSON.stringify({ sheets, subj, timer }, null, 2);
      const blob = new Blob([backup], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kplanner_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExportMessage('Data exported successfully!');
      setTimeout(() => setExportMessage(null), 3000);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const success = await tauriApi.importData(text);
      if (success) {
        setExportMessage('Data imported successfully! Reloading...');
        setTimeout(() => window.location.reload(), 1000);
      } else {
        alert('Invalid JSON file format.');
      }
    } catch {
      alert('Failed to read import file.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Theme & Appearance */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs transition-colors">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={16} className="text-slate-600 dark:text-slate-300" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Appearance & Theme
          </h3>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Choose your interface style. System mode automatically detects and matches your device&apos;s OS preference on PC or Android.
        </p>

        <div className="grid grid-cols-3 gap-2.5">
          {/* System Option */}
          <button
            type="button"
            onClick={() => setThemePreference('system')}
            className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              themePreference === 'system'
                ? 'border-slate-900 dark:border-white bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs ring-1 ring-slate-900 dark:ring-white'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Laptop size={20} className="mb-1.5" />
            <span>System</span>
            <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500 mt-0.5">
              Auto PC / Android
            </span>
          </button>

          {/* Light Option */}
          <button
            type="button"
            onClick={() => setThemePreference('light')}
            className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              themePreference === 'light'
                ? 'border-slate-900 dark:border-white bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs ring-1 ring-slate-900 dark:ring-white'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Sun size={20} className="mb-1.5" />
            <span>Light</span>
            <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500 mt-0.5">
              Clean paper
            </span>
          </button>

          {/* Dark Option */}
          <button
            type="button"
            onClick={() => setThemePreference('dark')}
            className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              themePreference === 'dark'
                ? 'border-slate-900 dark:border-white bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs ring-1 ring-slate-900 dark:ring-white'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Moon size={20} className="mb-1.5" />
            <span>Dark</span>
            <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500 mt-0.5">
              Slate dark
            </span>
          </button>
        </div>

        <div className="mt-3 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <span>Current active theme:</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200 text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">
            {resolvedTheme} {themePreference === 'system' ? '(System)' : '(Manual)'}
          </span>
        </div>
      </div>

      {/* Subject Palette Management */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs transition-colors">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Palette size={16} className="text-slate-600 dark:text-slate-300" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Subjects Management ({subjects.length}/8)
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {subjects.length < 8 && (
              <button
                type="button"
                onClick={handleOpenAdd}
                className="flex items-center gap-1 text-[11px] font-bold text-white bg-slate-900 dark:bg-white dark:text-slate-900 hover:opacity-90 px-2.5 py-1 rounded-lg cursor-pointer transition-opacity"
              >
                <Plus size={12} />
                Add Subject
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Reset all subjects to default names and pastel colors?')) {
                  resetSubjects();
                }
              }}
              className="flex items-center gap-1 text-[11px] font-semibold text-red-600 dark:text-red-400 hover:text-red-700 px-2 py-1 rounded cursor-pointer"
            >
              <RotateCcw size={12} />
              Reset Defaults
            </button>
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {subjects.map((sub) => (
            <div key={sub.id} className="py-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <label className="relative cursor-pointer shrink-0" title="Click to pick color">
                  <ColorCircle color={sub.color} size={22} />
                  <input
                    type="color"
                    value={sub.color}
                    onChange={(e) => updateSubject(sub.id, { color: e.target.value as HexColor })}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </label>

                <input
                  type="text"
                  value={sub.name}
                  onChange={(e) => updateSubject(sub.id, { name: e.target.value })}
                  className="text-xs font-semibold text-slate-800 dark:text-slate-100 border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-slate-900 dark:focus:border-white bg-transparent px-1 py-0.5 focus:outline-none flex-1 max-w-[200px]"
                />
              </div>

              {/* Quick Preset Colors & Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="hidden sm:flex items-center gap-1 mr-2">
                  {DEFAULT_PASTEL_PALETTE.map((palColor) => (
                    <button
                      key={palColor}
                      type="button"
                      onClick={() => updateSubject(sub.id, { color: palColor })}
                      className="w-4 h-4 rounded-full border border-black/10 hover:scale-125 transition-transform cursor-pointer"
                      style={{ backgroundColor: palColor }}
                      title={palColor}
                    />
                  ))}
                </div>

                {/* Edit Button */}
                <button
                  type="button"
                  onClick={() => handleOpenEdit(sub)}
                  className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="Edit Subject"
                >
                  <Pencil size={14} />
                </button>

                {/* Delete Button */}
                <button
                  type="button"
                  onClick={() => handleDeleteSubject(sub.id, sub.name)}
                  className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                  title="Delete Subject"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pomodoro Configuration */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs transition-colors">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={16} className="text-slate-600 dark:text-slate-300" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Study Timer Configuration
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mb-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Focus Work (Minutes)
            </label>
            <input
              type="number"
              min={1}
              max={120}
              value={timerConfig.pomodoroWorkMinutes}
              onChange={(e) => updateTimerConfig({ pomodoroWorkMinutes: Number(e.target.value) })}
              className="w-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-100 font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Short Break (Minutes)
            </label>
            <input
              type="number"
              min={1}
              max={30}
              value={timerConfig.pomodoroShortBreakMinutes}
              onChange={(e) =>
                updateTimerConfig({ pomodoroShortBreakMinutes: Number(e.target.value) })
              }
              className="w-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-100 font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Long Break (Minutes)
            </label>
            <input
              type="number"
              min={1}
              max={60}
              value={timerConfig.pomodoroLongBreakMinutes}
              onChange={(e) =>
                updateTimerConfig({ pomodoroLongBreakMinutes: Number(e.target.value) })
              }
              className="w-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-100 font-mono"
            />
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={timerConfig.soundAlertsEnabled}
              onChange={(e) => updateTimerConfig({ soundAlertsEnabled: e.target.checked })}
              className="rounded text-slate-800 dark:text-slate-200 cursor-pointer"
            />
            <Bell size={13} className="text-slate-500 dark:text-slate-400" />
            Play gentle chime when session completes
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={timerConfig.autoStartBreaks}
              onChange={(e) => updateTimerConfig({ autoStartBreaks: e.target.checked })}
              className="rounded text-slate-800 dark:text-slate-200 cursor-pointer"
            />
            Auto-start break when focus timer completes
          </label>
        </div>
      </div>

      {/* Backup & Local Storage */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs transition-colors">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2">
          Data Backups & Storage
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          All study sheets, 10-minute records, and subject settings are continuously synchronized and safely saved to your local disk by the Tauri Rust backend.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold rounded-lg cursor-pointer transition-colors"
          >
            <Download size={14} />
            Export Backup (JSON)
          </button>

          <label className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-colors">
            <Upload size={14} />
            Import Backup
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>
        </div>

        {exportMessage && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-2.5">
            {exportMessage}
          </p>
        )}
      </div>

      {/* Subject Modal */}
      <SubjectModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        mode={modalMode}
        subjectToEdit={subjectToEdit}
        onSave={handleSaveModal}
        onDelete={(id) => deleteSubject(id as EntityId)}
      />
    </div>
  );
}

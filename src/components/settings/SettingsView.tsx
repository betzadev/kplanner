import React, { useState } from 'react';
import { useSubjectStore } from '../../store/useSubjectStore';
import { useTimerStore } from '../../store/useTimerStore';
import { ColorCircle } from '../ui/ColorCircle';
import { DEFAULT_PASTEL_PALETTE } from '../../types';
import { tauriApi } from '../../services/tauriApi';
import { RotateCcw, Download, Upload, Bell, Clock, Palette } from 'lucide-react';

export function SettingsView() {
  const subjects = useSubjectStore((state) => state.subjects);
  const updateSubject = useSubjectStore((state) => state.updateSubject);
  const resetSubjects = useSubjectStore((state) => state.resetToDefaults);

  const timerConfig = useTimerStore((state) => state.timerConfig);
  const updateTimerConfig = useTimerStore((state) => state.updateConfig);

  const [exportMessage, setExportMessage] = useState<string | null>(null);

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
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Subject Palette Management */}
      <div className="bg-white border border-slate-300 rounded-md p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Palette size={16} className="text-slate-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Subject Palette (Up to 8)
            </h3>
          </div>
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Reset all subjects to default names and pastel colors?')) {
                resetSubjects();
              }
            }}
            className="flex items-center gap-1 text-[11px] font-semibold text-red-600 hover:text-red-700 cursor-pointer"
          >
            <RotateCcw size={12} />
            Reset Defaults
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {subjects.map((sub) => (
            <div key={sub.id} className="py-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1">
                <label className="relative cursor-pointer" title="Change Color">
                  <ColorCircle color={sub.color} size={20} />
                  <input
                    type="color"
                    value={sub.color}
                    onChange={(e) => updateSubject(sub.id, { color: e.target.value })}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </label>

                <input
                  type="text"
                  value={sub.name}
                  onChange={(e) => updateSubject(sub.id, { name: e.target.value })}
                  className="text-xs font-bold text-slate-800 border-b border-transparent hover:border-slate-300 focus:border-slate-800 bg-transparent px-1 py-0.5 focus:outline-none flex-1 max-w-[200px]"
                />
              </div>

              <div className="flex items-center gap-1.5">
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
            </div>
          ))}
        </div>
      </div>

      {/* Pomodoro Configuration */}
      <div className="bg-white border border-slate-300 rounded-md p-4 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={16} className="text-slate-600" />
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Pomodoro Timer Configuration
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mb-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Focus Work (Minutes)
            </label>
            <input
              type="number"
              min={1}
              max={120}
              value={timerConfig.pomodoroWorkMinutes}
              onChange={(e) => updateTimerConfig({ pomodoroWorkMinutes: Number(e.target.value) })}
              className="w-full border border-slate-300 rounded px-2 py-1 text-slate-800 font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
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
              className="w-full border border-slate-300 rounded px-2 py-1 text-slate-800 font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
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
              className="w-full border border-slate-300 rounded px-2 py-1 text-slate-800 font-mono"
            />
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
          <label className="flex items-center gap-2 cursor-pointer text-slate-700">
            <input
              type="checkbox"
              checked={timerConfig.soundAlertsEnabled}
              onChange={(e) => updateTimerConfig({ soundAlertsEnabled: e.target.checked })}
              className="rounded text-slate-800 cursor-pointer"
            />
            <Bell size={13} className="text-slate-500" />
            Play gentle chime when session completes
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-slate-700">
            <input
              type="checkbox"
              checked={timerConfig.autoStartBreaks}
              onChange={(e) => updateTimerConfig({ autoStartBreaks: e.target.checked })}
              className="rounded text-slate-800 cursor-pointer"
            />
            Auto-start break when focus timer completes
          </label>
        </div>
      </div>

      {/* Backup & Rust Storage */}
      <div className="bg-white border border-slate-300 rounded-md p-4 shadow-xs">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
          Rust Backend Data & Backups
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          All your study records, 10-minute grids, and settings are continuously synchronized and safely saved to your local disk by the Tauri Rust backend.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded cursor-pointer transition-colors"
          >
            <Download size={14} />
            Export Backup (JSON)
          </button>

          <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-semibold rounded cursor-pointer transition-colors">
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
          <p className="text-xs text-green-600 font-semibold mt-2">{exportMessage}</p>
        )}
      </div>
    </div>
  );
}

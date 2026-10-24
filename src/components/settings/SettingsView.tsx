import React, { useState } from 'react';
import { useSubjectStore } from '../../store/useSubjectStore';
import { useTimerStore } from '../../store/useTimerStore';
import { useThemeStore } from '../../store/useThemeStore';
import { useLanguageStore } from '../../store/useLanguageStore';
import { SUPPORTED_LANGUAGES, LanguageCode } from '../../i18n';
import { ColorCircle } from '../ui/ColorCircle';
import { DEFAULT_PASTEL_PALETTE, EntityId, HexColor, SubjectLegendItem } from '../../types';
import { tauriApi } from '../../services/tauriApi';
import { SubjectModal } from '../planner/SubjectModal';
import { useGamificationStore, AVAILABLE_CHIMES } from '../../store/useGamificationStore';
import { ambientAudio, ChimePresetType } from '../../utils/ambientAudio';
import { triggerHaptic } from '../../utils/haptics';
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
  Globe,
  Play,
  Check,
  CheckCircle2,
} from 'lucide-react';

export function SettingsView() {
  const t = useLanguageStore((state) => state.t);
  const currentLang = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);

  const subjects = useSubjectStore((state) => state.subjects);
  const addSubject = useSubjectStore((state) => state.addSubject);
  const updateSubject = useSubjectStore((state) => state.updateSubject);
  const deleteSubject = useSubjectStore((state) => state.deleteSubject);
  const resetSubjects = useSubjectStore((state) => state.resetToDefaults);

  const timerConfig = useTimerStore((state) => state.timerConfig);
  const updateTimerConfig = useTimerStore((state) => state.updateConfig);

  const unlockedChimes = useGamificationStore((state) => state.unlockedChimes) ?? ['default'];

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
    triggerHaptic('light');
  };

  const handleOpenEdit = (sub: SubjectLegendItem) => {
    setModalMode('edit');
    setSubjectToEdit(sub);
    setModalOpen(true);
    triggerHaptic('light');
  };

  const handleDeleteSubject = (id: EntityId, name: string) => {
    if (window.confirm(`Delete subject "${name}"?`)) {
      deleteSubject(id);
      triggerHaptic('warning');
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
      triggerHaptic('success');
    } else {
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
      triggerHaptic('success');
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

  const handlePreviewChime = (chimeId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    ambientAudio.playChime(chimeId as ChimePresetType);
    triggerHaptic('light');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-8">
      {/* Language Switcher (Enhancement 12) */}
      <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-sm border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs transition-colors">
        <div className="flex items-center gap-2 mb-2">
          <Globe size={18} className="text-blue-600 dark:text-[#9FC6FC]" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
            {t.language}
          </h3>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          {t.languageDesc}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = currentLang === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => {
                  setLanguage(lang.code as LanguageCode);
                  triggerHaptic('light');
                }}
                className={`min-h-[44px] flex items-center justify-between px-3 py-2 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'border-blue-600 dark:border-[#9FC6FC] bg-[#E4EDFC] dark:bg-blue-950/80 text-blue-950 dark:text-white shadow-2xs ring-1 ring-blue-500'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                <span className="flex items-center gap-1.5 truncate">
                  <span className="text-base">{lang.flag}</span>
                  <span className="truncate">{lang.nativeName}</span>
                </span>
                {isSelected && <Check size={14} className="text-blue-600 dark:text-[#9FC6FC] shrink-0 ml-1" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Theme & Appearance */}
      <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-sm border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs transition-colors">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={18} className="text-blue-600 dark:text-[#9FC6FC]" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
            {t.appearance}
          </h3>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          {t.appearanceDesc}
        </p>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => {
              setThemePreference('system');
              triggerHaptic('light');
            }}
            className={`min-h-[48px] flex flex-col items-center justify-center p-2.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
              themePreference === 'system'
                ? 'border-blue-600 dark:border-[#9FC6FC] bg-[#E4EDFC] dark:bg-blue-950/80 text-blue-950 dark:text-white shadow-2xs ring-1 ring-blue-500'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
            }`}
          >
            <Laptop size={18} className="mb-1" />
            <span>{t.themeSystem}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setThemePreference('light');
              triggerHaptic('light');
            }}
            className={`min-h-[48px] flex flex-col items-center justify-center p-2.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
              themePreference === 'light'
                ? 'border-blue-600 dark:border-[#9FC6FC] bg-[#E4EDFC] dark:bg-blue-950/80 text-blue-950 dark:text-white shadow-2xs ring-1 ring-blue-500'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
            }`}
          >
            <Sun size={18} className="mb-1" />
            <span>{t.themeLight}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setThemePreference('dark');
              triggerHaptic('light');
            }}
            className={`min-h-[48px] flex flex-col items-center justify-center p-2.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
              themePreference === 'dark'
                ? 'border-blue-600 dark:border-[#9FC6FC] bg-[#E4EDFC] dark:bg-blue-950/80 text-blue-950 dark:text-white shadow-2xs ring-1 ring-blue-500'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
            }`}
          >
            <Moon size={18} className="mb-1" />
            <span>{t.themeDark}</span>
          </button>
        </div>

        <div className="mt-3 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <span>{t.activeTheme}:</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
            {resolvedTheme.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Subject Palette Management */}
      <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-sm border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs transition-colors">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Palette size={18} className="text-blue-600 dark:text-[#9FC6FC]" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {t.subjectsTitle} ({subjects.length}/8)
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {subjects.length < 8 && (
              <button
                type="button"
                onClick={handleOpenAdd}
                className="min-h-[36px] flex items-center gap-1 text-[11px] font-bold text-white bg-slate-900 hover:bg-black dark:bg-white dark:text-slate-900 px-3 py-1.5 rounded-xl cursor-pointer transition-colors shadow-2xs"
              >
                <Plus size={13} />
                <span>{t.addSubject}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Reset all subjects to default names and pastel colors?')) {
                  resetSubjects();
                  triggerHaptic('warning');
                }
              }}
              className="min-h-[36px] flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 px-2.5 py-1.5 rounded-xl cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>{t.resetDefaults}</span>
            </button>
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {subjects.map((sub) => (
            <div key={sub.id} className="py-2.5 flex items-center justify-between gap-3 min-h-[44px]">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <label className="relative cursor-pointer shrink-0 min-h-[44px] min-w-[36px] flex items-center justify-center" title="Click to pick color">
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
                  className="text-xs font-semibold text-slate-800 dark:text-slate-100 border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-blue-600 dark:focus:border-[#9FC6FC] bg-transparent px-1 py-1 focus:outline-none flex-1 max-w-[200px]"
                />
              </div>

              {/* Quick Preset Colors & Actions */}
              <div className="flex items-center gap-1 shrink-0">
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

                <button
                  type="button"
                  onClick={() => handleOpenEdit(sub)}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  title={t.editSubject}
                  aria-label={t.editSubject}
                >
                  <Pencil size={15} />
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteSubject(sub.id, sub.name)}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors cursor-pointer"
                  title="Delete Subject"
                  aria-label="Delete Subject"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pomodoro & Timer Configuration */}
      <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-sm border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs transition-colors space-y-3">
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-blue-600 dark:text-[#9FC6FC]" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
            {t.timerConfig}
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              {t.workMinutes}
            </label>
            <input
              type="number"
              min={1}
              max={120}
              value={timerConfig.pomodoroWorkMinutes}
              onChange={(e) => updateTimerConfig({ pomodoroWorkMinutes: Number(e.target.value) })}
              className="w-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 font-mono min-h-[44px]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              {t.shortBreakMinutes}
            </label>
            <input
              type="number"
              min={1}
              max={30}
              value={timerConfig.pomodoroShortBreakMinutes}
              onChange={(e) =>
                updateTimerConfig({ pomodoroShortBreakMinutes: Number(e.target.value) })
              }
              className="w-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 font-mono min-h-[44px]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              {t.longBreakMinutes}
            </label>
            <input
              type="number"
              min={1}
              max={60}
              value={timerConfig.pomodoroLongBreakMinutes}
              onChange={(e) =>
                updateTimerConfig({ pomodoroLongBreakMinutes: Number(e.target.value) })
              }
              className="w-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 font-mono min-h-[44px]"
            />
          </div>
        </div>

        {/* Chime Sound Preset Selector */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-2">
            {t.soundChime}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {AVAILABLE_CHIMES.map((chime) => {
              const isUnlocked = unlockedChimes.includes(chime.id);
              const isSelected = (timerConfig.chimePreset || 'default') === chime.id;

              return (
                <div
                  key={chime.id}
                  onClick={() => {
                    if (isUnlocked) {
                      updateTimerConfig({ chimePreset: chime.id });
                      ambientAudio.playChime(chime.id as ChimePresetType);
                      triggerHaptic('success');
                    }
                  }}
                  className={`p-2.5 rounded-2xl border flex items-center justify-between transition-all min-h-[44px] ${
                    isSelected
                      ? 'border-blue-600 dark:border-[#9FC6FC] bg-[#E4EDFC] dark:bg-blue-950/80 text-blue-950 dark:text-white ring-1 ring-blue-500 shadow-2xs cursor-pointer'
                      : isUnlocked
                      ? 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-100/40 dark:bg-slate-900/40 text-slate-400 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div className="min-w-0 pr-1">
                    <div className="text-xs font-bold truncate flex items-center gap-1">
                      {isSelected && <Check size={13} className="text-blue-600 dark:text-[#9FC6FC] shrink-0" />}
                      <span className="truncate">{chime.name}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {isUnlocked ? chime.description : `${chime.priceGems} Gems (Shop)`}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handlePreviewChime(chime.id, e)}
                    className="min-h-[36px] min-w-[36px] flex items-center justify-center p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-[#9FC6FC] rounded-lg transition-colors cursor-pointer shrink-0"
                    title={t.soundPreview}
                  >
                    <Play size={13} className="fill-slate-400 hover:fill-blue-600" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <label className="min-h-[44px] flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={timerConfig.soundAlertsEnabled}
              onChange={(e) => updateTimerConfig({ soundAlertsEnabled: e.target.checked })}
              className="w-4 h-4 rounded text-blue-600 cursor-pointer"
            />
            <Bell size={15} className="text-slate-500 dark:text-slate-400" />
            <span>{t.chimeOnComplete}</span>
          </label>

          <label className="min-h-[44px] flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={timerConfig.autoStartBreaks}
              onChange={(e) => updateTimerConfig({ autoStartBreaks: e.target.checked })}
              className="w-4 h-4 rounded text-blue-600 cursor-pointer"
            />
            <span>{t.autoStartBreaks}</span>
          </label>
        </div>
      </div>

      {/* Backup & Local Storage */}
      <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-sm border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs transition-colors">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">
          {t.backupTitle}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          {t.backupDesc}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="min-h-[44px] flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold rounded-2xl cursor-pointer transition-colors shadow-xs active:scale-95"
          >
            <Download size={15} />
            <span>{t.exportJson}</span>
          </button>

          <label className="min-h-[44px] flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-bold rounded-2xl cursor-pointer transition-colors active:scale-95">
            <Upload size={15} />
            <span>{t.importJson}</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>
        </div>

        {exportMessage && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-2.5 flex items-center gap-1">
            <CheckCircle2 size={14} />
            <span>{exportMessage}</span>
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

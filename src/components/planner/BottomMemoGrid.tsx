import { useState, useEffect } from 'react';
import { LayoutGrid, Check, Pencil } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';
import { tauriApi } from '../../services/tauriApi';
import { useLanguageStore } from '../../store/useLanguageStore';

interface BottomMemoGridProps {
  memos: [string, string, string, string, string, string];
  customLabels?: [string, string, string, string, string, string] | null | undefined;
  onMemoChange: (index: 0 | 1 | 2 | 3 | 4 | 5, text: string) => void;
  onLabelsChange?: ((labels: [string, string, string, string, string, string]) => void) | undefined;
}

export const MEMO_PRESETS = {
  classic: {
    id: 'classic',
    name: 'Classic Study',
    labels: [
      '1. Key Concepts',
      '2. Questions / Research',
      '3. Formulas / Vocab',
      '4. What Went Well',
      '5. Improve Tomorrow',
      '6. Reminders',
    ] as [string, string, string, string, string, string],
  },
  review: {
    id: 'review',
    name: 'Review & Retain',
    labels: [
      '1. Core Topic',
      '2. Misconceptions',
      '3. Memory Cues',
      '4. Practice Scores',
      '5. Next Review Date',
      '6. Final Summary',
    ] as [string, string, string, string, string, string],
  },
  exam: {
    id: 'exam',
    name: 'Exam Sprint',
    labels: [
      '1. High-Yield Topics',
      '2. Weak Points',
      '3. Time Management',
      '4. Mock Test Notes',
      '5. Sleep & Health',
      '6. Mindset / Motivation',
    ] as [string, string, string, string, string, string],
  },
} as const;

export function BottomMemoGrid({
  memos,
  customLabels,
  onMemoChange,
  onLabelsChange,
}: BottomMemoGridProps) {
  const t = useLanguageStore((state) => state.t);
  const [isEditingLabels, setIsEditingLabels] = useState(false);
  const [activePreset, setActivePreset] = useState<string>('classic');

  // Fallback labels if customLabels not set
  const defaultLabels = MEMO_PRESETS[activePreset as keyof typeof MEMO_PRESETS]?.labels ?? MEMO_PRESETS.classic.labels;
  const currentLabels: [string, string, string, string, string, string] =
    customLabels && customLabels.length === 6 ? customLabels : defaultLabels;

  const [tempLabels, setTempLabels] = useState<[string, string, string, string, string, string]>(currentLabels);

  useEffect(() => {
    setTempLabels(currentLabels);
  }, [customLabels, activePreset]);

  // Load saved preset from Tauri if present
  useEffect(() => {
    tauriApi.loadBottomMemoPreset().then((preset) => {
      if (preset && preset in MEMO_PRESETS) {
        setActivePreset(preset);
      }
    });
  }, []);

  const handleApplyPreset = (presetKey: string) => {
    setActivePreset(presetKey);
    const newLabels = MEMO_PRESETS[presetKey as keyof typeof MEMO_PRESETS]?.labels;
    if (newLabels && onLabelsChange) {
      onLabelsChange(newLabels);
      setTempLabels(newLabels);
    }
    tauriApi.saveBottomMemoPreset(presetKey);
    triggerHaptic('light');
  };

  const handleSaveCustomLabels = () => {
    if (onLabelsChange) {
      onLabelsChange(tempLabels);
    }
    setIsEditingLabels(false);
    triggerHaptic('medium');
  };

  return (
    <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-sm border border-[#C2D8FC]/60 dark:border-slate-800 rounded-3xl p-3.5 sm:p-5 shadow-xs transition-colors space-y-3">
      {/* Header with Title and Preset Selection */}
      <div className="flex items-center justify-between pb-2 border-b border-[#E4EDFC] dark:border-slate-800 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <LayoutGrid size={18} className="text-blue-600 dark:text-[#9FC6FC]" />
          <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
            {t.notesTitle}
          </h3>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Preset Buttons */}
          <div className="flex items-center bg-[#E4EDFC]/80 dark:bg-slate-800 p-0.5 rounded-xl border border-[#C2D8FC] dark:border-slate-700">
            {Object.entries(MEMO_PRESETS).map(([key, p]) => (
              <button
                key={key}
                type="button"
                onClick={() => handleApplyPreset(key)}
                className={`min-h-[36px] px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${
                  activePreset === key && !isEditingLabels
                    ? 'bg-blue-600 dark:bg-[#9FC6FC] text-white dark:text-slate-900 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {p.name.split(' ')[0]}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              if (isEditingLabels) handleSaveCustomLabels();
              else setIsEditingLabels(true);
            }}
            className="min-h-[36px] px-2.5 py-1 rounded-xl text-[10px] sm:text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
          >
            {isEditingLabels ? (
              <>
                <Check size={13} className="text-emerald-500" />
                <span>Done</span>
              </>
            ) : (
              <>
                <Pencil size={12} />
                <span>Edit</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 6 Grid Cells */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {([0, 1, 2, 3, 4, 5] as const).map((idx) => {
          const label = currentLabels[idx];
          const memoText = memos[idx];

          return (
            <div
              key={idx}
              className="flex flex-col bg-[#F0F5FD]/60 dark:bg-slate-950/40 border border-[#C2D8FC]/60 dark:border-slate-800 rounded-2xl p-3 transition-shadow focus-within:ring-2 focus-within:ring-blue-400 dark:focus-within:ring-[#9FC6FC]"
            >
              {isEditingLabels ? (
                <input
                  type="text"
                  value={tempLabels[idx]}
                  onChange={(e) => {
                    const next: [string, string, string, string, string, string] = [...tempLabels];
                    next[idx] = e.target.value;
                    setTempLabels(next);
                  }}
                  onBlur={handleSaveCustomLabels}
                  className="text-xs font-bold text-blue-700 dark:text-[#9FC6FC] bg-white dark:bg-slate-800 px-2 py-1 rounded-xl border border-blue-200 dark:border-blue-900 mb-2 focus:outline-none min-h-[36px]"
                />
              ) : (
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span className="truncate pr-1">{label}</span>
                  <span className="text-[10px] font-mono opacity-50 shrink-0">#{idx + 1}</span>
                </div>
              )}

              <textarea
                value={memoText}
                onChange={(e) => onMemoChange(idx, e.target.value)}
                placeholder={t.memoEmptyPlaceholder}
                rows={3}
                className="w-full text-xs text-slate-800 dark:text-slate-100 bg-transparent resize-none border-none focus:outline-none p-0 placeholder:text-slate-400 font-sans leading-relaxed min-h-[50px]"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

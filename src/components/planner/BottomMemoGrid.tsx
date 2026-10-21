import { useState, useEffect } from 'react';
import { LayoutGrid } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';
import { tauriApi } from '../../services/tauriApi';

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
      '6. Motivation / Mindset',
    ] as [string, string, string, string, string, string],
  },
} as const;

export function BottomMemoGrid({
  memos,
  customLabels,
  onMemoChange,
  onLabelsChange,
}: BottomMemoGridProps) {
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
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm mb-4">
      {/* Header with Title and Preset Selection */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <LayoutGrid size={15} className="text-slate-500" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            6-Box Study Retrospective & Memos
          </h3>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Preset Buttons */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[10px]">
            {Object.entries(MEMO_PRESETS).map(([key, p]) => (
              <button
                key={key}
                type="button"
                onClick={() => handleApplyPreset(key)}
                className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                  activePreset === key && !isEditingLabels
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {p.name.split(' ')[0]}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsEditingLabels(!isEditingLabels)}
            className="text-[10px] px-2 py-0.5 rounded-md font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {isEditingLabels ? 'Done' : 'Edit Labels'}
          </button>
        </div>
      </div>

      {/* 6 Grid Cells (2 rows of 3 cols) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {([0, 1, 2, 3, 4, 5] as const).map((idx) => {
          const label = currentLabels[idx];
          const memoText = memos[idx];

          return (
            <div
              key={idx}
              className="flex flex-col bg-slate-50/60 dark:bg-slate-950/40 border border-slate-200/50 dark:border-slate-800/60 rounded-xl p-2.5 transition-shadow focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-400"
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
                  className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-900/50 mb-1.5 outline-hidden"
                />
              ) : (
                <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center justify-between">
                  <span>{label}</span>
                  <span className="text-[9px] font-mono opacity-50">#{idx + 1}</span>
                </div>
              )}

              <textarea
                value={memoText}
                onChange={(e) => onMemoChange(idx, e.target.value)}
                placeholder="Write reflections, key takeaways or formulas..."
                rows={3}
                className="w-full text-xs text-slate-800 dark:text-slate-200 bg-transparent resize-none border-none outline-hidden p-0 placeholder:text-slate-400/60 font-sans leading-relaxed"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { LayoutGrid } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';
import { tauriApi } from '../../services/tauriApi';

interface BottomMemoGridProps {
  memos: [string, string, string, string, string, string];
  customLabels?: [string, string, string, string, string, string];
  onMemoChange: (index: 0 | 1 | 2 | 3 | 4 | 5, text: string) => void;
  onLabelsChange?: (labels: [string, string, string, string, string, string]) => void;
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
  wellness: {
    id: 'wellness',
    name: 'Wellness & Focus',
    labels: [
      '1. Sleep Hours',
      '2. Energy Level',
      '3. Main Distraction',
      '4. Daily Win',
      '5. Reading / Extra',
      '6. Free Note',
    ] as [string, string, string, string, string, string],
  },
  custom: {
    id: 'custom',
    name: 'Blank / Custom',
    labels: [
      'Note 1',
      'Note 2',
      'Note 3',
      'Note 4',
      'Note 5',
      'Note 6',
    ] as [string, string, string, string, string, string],
  },
};

export type MemoPresetKey = keyof typeof MEMO_PRESETS;

export function BottomMemoGrid({
  memos,
  customLabels,
  onMemoChange,
  onLabelsChange,
}: BottomMemoGridProps) {
  const [selectedPreset, setSelectedPreset] = useState<MemoPresetKey>('classic');

  useEffect(() => {
    tauriApi.loadBottomMemoPreset().then((preset) => {
      if (preset && preset in MEMO_PRESETS) {
        setSelectedPreset(preset as MemoPresetKey);
      }
    });
  }, []);

  const handlePresetSelect = (presetKey: MemoPresetKey) => {
    setSelectedPreset(presetKey);
    tauriApi.saveBottomMemoPreset(presetKey);
    if (onLabelsChange) {
      onLabelsChange(MEMO_PRESETS[presetKey].labels);
    }
    triggerHaptic('light');
  };

  const currentLabels = customLabels || MEMO_PRESETS[selectedPreset].labels;

  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-[#C2D8FC]/60 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xs transition-colors">
      <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-[#E4EDFC] dark:border-slate-800">
        <div className="flex items-center gap-1.5">
          <LayoutGrid size={14} className="text-blue-600 dark:text-[#9FC6FC]" />
          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
            Daily Memos & Reflection
          </span>
        </div>

        {/* Phase 4.2: Selectable Template Presets */}
        <div className="flex items-center gap-1 bg-[#E4EDFC]/80 dark:bg-slate-800 p-0.5 rounded-xl border border-[#C2D8FC] dark:border-slate-700">
          {(Object.keys(MEMO_PRESETS) as MemoPresetKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => handlePresetSelect(key)}
              className={`px-2 py-0.5 rounded-lg text-[9px] font-bold transition-colors cursor-pointer ${
                selectedPreset === key
                  ? 'bg-blue-600 dark:bg-[#9FC6FC] text-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {MEMO_PRESETS[key].name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {([0, 1, 2, 3, 4, 5] as const).map((idx) => (
          <div
            key={idx}
            className="p-2.5 bg-white/70 dark:bg-slate-800/60 border border-[#E4EDFC] dark:border-slate-700/80 rounded-xl flex flex-col h-28 focus-within:border-[#9FC6FC] dark:focus-within:border-slate-400 transition-colors"
          >
            <span className="text-[9px] font-extrabold text-blue-600 dark:text-slate-400 uppercase tracking-wider mb-1 truncate">
              {currentLabels[idx]}
            </span>
            <textarea
              value={memos[idx]}
              onChange={(e) => onMemoChange(idx, e.target.value)}
              onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 250)}
              placeholder="Write note..."
              className="flex-1 w-full text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 bg-transparent resize-none focus:outline-none scrollbar-thin"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

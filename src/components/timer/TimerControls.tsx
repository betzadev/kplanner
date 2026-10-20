import { Play, Pause, RotateCcw } from 'lucide-react';
import { TimerMode, TimerStatus } from '../../types';

interface TimerControlsProps {
  status: TimerStatus;
  mode: TimerMode;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onToggleMode: (mode: TimerMode) => void;
}

export function TimerControls({
  status,
  mode,
  onStart,
  onPause,
  onResume,
  onReset,
  onToggleMode,
}: TimerControlsProps) {
  return (
    <div className="flex flex-col items-center gap-5 mt-2">
      {/* Mode Toggle */}
      <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
        <button
          type="button"
          onClick={() => onToggleMode('stopwatch')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            mode === 'stopwatch'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Stopwatch
        </button>
        <button
          type="button"
          onClick={() => onToggleMode('pomodoro')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            mode === 'pomodoro'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Pomodoro
        </button>
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-5">
        <button
          type="button"
          onClick={onReset}
          className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
          title="Reset Timer"
        >
          <RotateCcw size={18} />
        </button>

        {status === 'running' ? (
          <button
            type="button"
            onClick={onPause}
            className="w-16 h-16 rounded-full bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer"
            title="Pause Timer"
          >
            <Pause size={24} />
          </button>
        ) : (
          <button
            type="button"
            onClick={status === 'paused' ? onResume : onStart}
            className="w-16 h-16 rounded-full bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer pl-1"
            title="Start Timer"
          >
            <Play size={24} />
          </button>
        )}
      </div>
    </div>
  );
}

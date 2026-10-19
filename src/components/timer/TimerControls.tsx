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
    <div className="flex flex-col items-center gap-6">
      {/* Mode Toggle */}
      <div className="flex bg-slate-200 p-1 rounded-lg">
        <button
          type="button"
          onClick={() => onToggleMode('stopwatch')}
          className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
            mode === 'stopwatch'
              ? 'bg-white text-slate-800 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Stopwatch
        </button>
        <button
          type="button"
          onClick={() => onToggleMode('pomodoro')}
          className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
            mode === 'pomodoro'
              ? 'bg-white text-slate-800 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Pomodoro
        </button>
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-6">
        <button
          type="button"
          onClick={onReset}
          className="w-12 h-12 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
          title="Reset Timer"
        >
          <RotateCcw size={18} />
        </button>

        {status === 'running' ? (
          <button
            type="button"
            onClick={onPause}
            className="w-16 h-16 rounded-full bg-slate-800 hover:bg-slate-900 text-white flex items-center justify-center shadow-md transition-transform hover:scale-105 cursor-pointer"
            title="Pause Timer"
          >
            <Pause size={26} />
          </button>
        ) : (
          <button
            type="button"
            onClick={status === 'paused' ? onResume : onStart}
            className="w-16 h-16 rounded-full bg-slate-800 hover:bg-slate-900 text-white flex items-center justify-center shadow-md transition-transform hover:scale-105 cursor-pointer pl-1"
            title="Start Timer"
          >
            <Play size={26} />
          </button>
        )}
      </div>
    </div>
  );
}

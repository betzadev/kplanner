import { TimerMode, PomodoroPhase } from '../../types';

interface TimerDisplayProps {
  hours: string;
  minutes: string;
  seconds: string;
  mode: TimerMode;
  pomodoroPhase?: PomodoroPhase;
  subjectName?: string;
  subjectColor?: string;
}

export function TimerDisplay({
  hours,
  minutes,
  seconds,
  mode,
  pomodoroPhase,
  subjectName,
  subjectColor = '#A7D8DE',
}: TimerDisplayProps) {
  return (
    <div className="flex flex-col items-center justify-center py-6 select-none">
      {subjectName && (
        <div
          className="px-4 py-1.5 rounded-full text-xs font-bold text-slate-800 mb-3 shadow-xs border border-black/10"
          style={{ backgroundColor: subjectColor }}
        >
          {subjectName}
        </div>
      )}

      {mode === 'pomodoro' && (
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
          {pomodoroPhase === 'focus'
            ? '🔥 FOCUS SESSION'
            : pomodoroPhase === 'shortBreak'
            ? '☕ SHORT BREAK (5 MIN)'
            : '🌿 LONG BREAK (15 MIN)'}
        </span>
      )}

      <div className="flex items-center text-6xl md:text-7xl font-extrabold text-slate-800 font-mono tracking-tight bg-white px-8 py-4 rounded-xl border border-slate-300 shadow-xs">
        <span>{hours}</span>
        <span className="text-slate-400 mx-1">:</span>
        <span>{minutes}</span>
        <span className="text-slate-400 mx-1">:</span>
        <span>{seconds}</span>
      </div>
    </div>
  );
}

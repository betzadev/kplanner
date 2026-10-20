import { TimerMode, PomodoroPhase } from '../../types';
import { Flame, Coffee, Sparkles, SkipForward, SkipBack } from 'lucide-react';

interface TimerDisplayProps {
  hours: string;
  minutes: string;
  seconds: string;
  mode: TimerMode;
  pomodoroPhase?: PomodoroPhase;
  completedCycles?: number;
  longBreakInterval?: number;
  progressPercent?: number;
  subjectName?: string;
  subjectColor?: string;
  onSkipPhase?: () => void;
  onPreviousPhase?: () => void;
}

export function TimerDisplay({
  hours,
  minutes,
  seconds,
  mode,
  pomodoroPhase = 'focus',
  completedCycles = 0,
  longBreakInterval = 4,
  progressPercent = 0,
  subjectName,
  subjectColor = '#C2D8FC',
  onSkipPhase,
  onPreviousPhase,
}: TimerDisplayProps) {
  const isPomodoro = mode === 'pomodoro';
  const showHours = Number(hours) > 0;

  const currentCycleStep = (completedCycles % longBreakInterval) + 1;

  return (
    <div className="flex flex-col items-center justify-center py-2 sm:py-4 select-none w-full max-w-sm mx-auto">
      {/* Subject Badge */}
      {subjectName && (
        <div
          className="px-3 py-1 rounded-full text-xs font-semibold text-slate-900 mb-2.5 border border-black/10 transition-transform active:scale-95 shadow-xs"
          style={{ backgroundColor: subjectColor }}
        >
          {subjectName}
        </div>
      )}

      {/* Pomodoro Mode Phase & Cycle Indicator with Back & Forward Phase Navigation */}
      {isPomodoro && (
        <div className="flex flex-col items-center gap-1.5 mb-2.5">
          <div className="flex items-center gap-2">
            {/* Previous Cycle / Phase Button */}
            {onPreviousPhase && (
              <button
                type="button"
                onClick={onPreviousPhase}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl transition-colors cursor-pointer hover:bg-[#E4EDFC]/60 dark:hover:bg-slate-800"
                title="Regresar al ciclo / fase anterior"
              >
                <SkipBack size={15} />
              </button>
            )}

            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                pomodoroPhase === 'focus'
                  ? 'bg-[#E4EDFC] text-blue-900 dark:bg-blue-950/80 dark:text-blue-200 border border-[#C2D8FC] dark:border-blue-800'
                  : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
              }`}
            >
              {pomodoroPhase === 'focus' ? (
                <>
                  <Flame size={13} className="text-blue-600 dark:text-blue-400" />
                  <span>Focus Interval</span>
                </>
              ) : pomodoroPhase === 'shortBreak' ? (
                <>
                  <Coffee size={13} className="text-emerald-600 dark:text-emerald-400" />
                  <span>Short Break</span>
                </>
              ) : (
                <>
                  <Sparkles size={13} className="text-emerald-600 dark:text-emerald-400" />
                  <span>Long Break</span>
                </>
              )}
            </span>

            {/* Next Phase Button */}
            {onSkipPhase && (
              <button
                type="button"
                onClick={onSkipPhase}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl transition-colors cursor-pointer hover:bg-[#E4EDFC]/60 dark:hover:bg-slate-800"
                title="Avanzar a la siguiente fase"
              >
                <SkipForward size={15} />
              </button>
            )}
          </div>

          {/* Pomodoro Cycle Dots (e.g. 4 dots) */}
          <div className="flex items-center gap-1.5 pt-0.5">
            {Array.from({ length: longBreakInterval }).map((_, idx) => (
              <span
                key={idx}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  idx < currentCycleStep - 1
                    ? 'bg-blue-600 dark:bg-blue-400'
                    : idx === currentCycleStep - 1 && pomodoroPhase === 'focus'
                    ? 'bg-[#9FC6FC] dark:bg-blue-500 scale-125 ring-2 ring-blue-400/40'
                    : 'bg-slate-200 dark:bg-slate-700'
                }`}
                title={`Interval ${idx + 1}`}
              />
            ))}
            <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-1 font-mono">
              Cycle {Math.floor(completedCycles / longBreakInterval) + 1}
            </span>
          </div>
        </div>
      )}

      {/* Main Clock Face with Circular / Linear Progress */}
      <div className="relative flex flex-col items-center w-full">
        <div className="flex items-center justify-center text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 dark:text-slate-50 font-mono tracking-tight bg-white dark:bg-slate-800/90 px-6 py-3 sm:px-7 sm:py-4 rounded-3xl border border-[#C2D8FC]/80 dark:border-slate-700 shadow-sm w-full max-w-[280px] sm:max-w-[320px]">
          {showHours && (
            <>
              <span>{hours}</span>
              <span className="text-slate-300 dark:text-slate-600 mx-0.5 sm:mx-1">:</span>
            </>
          )}
          <span>{minutes}</span>
          <span className="text-slate-300 dark:text-slate-600 mx-0.5 sm:mx-1">:</span>
          <span>{seconds}</span>
        </div>

        {/* Pomodoro Progress Bar */}
        {isPomodoro && (
          <div className="w-full max-w-[280px] sm:max-w-[320px] mt-2.5 px-1">
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#9FC6FC] dark:bg-blue-400 rounded-full transition-colors duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-mono">
              <span>{Math.round(progressPercent)}% elapsed</span>
              <span>{pomodoroPhase === 'focus' ? 'Study Block' : 'Rest Block'}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

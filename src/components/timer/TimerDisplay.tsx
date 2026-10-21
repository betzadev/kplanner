import { TimerMode, PomodoroPhase } from '../../types';
import { Flame, Coffee, Sparkles, SkipForward, SkipBack } from 'lucide-react';

interface TimerDisplayProps {
  hours: string;
  minutes: string;
  seconds: string;
  mode: TimerMode;
  pomodoroPhase?: PomodoroPhase | undefined;
  completedCycles?: number | undefined;
  longBreakInterval?: number | undefined;
  progressPercent?: number | undefined;
  subjectName?: string | undefined;
  subjectColor?: string | undefined;
  onSkipPhase?: (() => void) | undefined;
  onPreviousPhase?: (() => void) | undefined;
  isOvertime?: boolean | undefined;
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
  isOvertime = false,
}: TimerDisplayProps) {
  const getPhaseDetails = () => {
    switch (pomodoroPhase) {
      case 'focus':
        return {
          title: 'Deep Focus',
          icon: <Flame size={18} className="text-orange-500 fill-orange-500 animate-pulse" />,
          ringColor: 'stroke-orange-500',
        };
      case 'shortBreak':
        return {
          title: 'Short Break',
          icon: <Coffee size={18} className="text-teal-500" />,
          ringColor: 'stroke-teal-500',
        };
      case 'longBreak':
        return {
          title: 'Long Break',
          icon: <Sparkles size={18} className="text-indigo-500" />,
          ringColor: 'stroke-indigo-500',
        };
    }
  };

  const phase = getPhaseDetails();
  const radius = 135;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center justify-center p-6 select-none">
      {/* SVG Ring Tracker */}
      <div className="relative w-72 h-72 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 320 320">
          {/* Background circle track */}
          <circle
            cx="160"
            cy="160"
            r={radius}
            className="stroke-slate-200/80 dark:stroke-slate-800/80 fill-none"
            strokeWidth="8"
          />
          {/* Active Progress Ring */}
          <circle
            cx="160"
            cy="160"
            r={radius}
            className={`transition-all duration-300 ease-linear fill-none ${
              mode === 'stopwatch' ? 'stroke-indigo-500' : phase.ringColor
            }`}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={mode === 'stopwatch' ? 0 : strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>

        {/* Center Clock Face */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {/* Phase Badge / Tag */}
          {mode === 'pomodoro' ? (
            <div className="flex items-center gap-1.5 px-3 py-1 mb-2 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 shadow-xs">
              {phase.icon}
              <span>{phase.title}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 mb-2 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-medium text-indigo-600 dark:text-indigo-400 shadow-xs">
              <Sparkles size={14} />
              <span>Stopwatch</span>
            </div>
          )}

          {/* Overtime Banner Indicator */}
          {isOvertime && (
            <div className="animate-bounce flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold tracking-wider uppercase mb-1">
              <span>+ Overtime Flow</span>
            </div>
          )}

          {/* Numbers Display with Monospace Layout */}
          <div className="flex items-baseline font-mono tracking-tight text-slate-900 dark:text-white">
            {hours !== '00' && (
              <>
                <span className="text-4xl md:text-5xl font-light">{hours}</span>
                <span className="text-xl mx-0.5 opacity-40">:</span>
              </>
            )}
            <span className="text-5xl md:text-6xl font-light">{minutes}</span>
            <span className="text-2xl mx-0.5 opacity-40">:</span>
            <span className="text-5xl md:text-6xl font-light">{seconds}</span>
          </div>

          {/* Active Subject Pill Indicator */}
          {subjectName && (
            <div className="flex items-center gap-1.5 mt-3 max-w-[200px]">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                style={{ backgroundColor: subjectColor }}
              />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                {subjectName}
              </span>
            </div>
          )}

          {/* Pomodoro Cycles Count & Phase Skip Controls */}
          {mode === 'pomodoro' && (
            <div className="mt-3 flex items-center gap-2">
              {/* Back to Previous Phase Button */}
              {onPreviousPhase && (
                <button
                  type="button"
                  onClick={onPreviousPhase}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Return to previous Pomodoro phase"
                >
                  <SkipBack size={13} />
                </button>
              )}

              {/* Cycle Dots */}
              <div className="flex items-center gap-1">
                {Array.from({ length: longBreakInterval }).map((_, idx) => (
                  <span
                    key={idx}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      idx < completedCycles % longBreakInterval
                        ? 'bg-orange-500 scale-125'
                        : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  />
                ))}
              </div>

              {/* Forward to Next Phase Button */}
              {onSkipPhase && (
                <button
                  type="button"
                  onClick={onSkipPhase}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Skip to next Pomodoro phase"
                >
                  <SkipForward size={13} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

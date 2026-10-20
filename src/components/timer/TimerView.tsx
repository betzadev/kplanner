import { useStudyTimer } from '../../hooks/useStudyTimer';
import { useSubjectStore } from '../../store/useSubjectStore';
import { useTimerStore } from '../../store/useTimerStore';
import { TimerDisplay } from './TimerDisplay';
import { TimerControls } from './TimerControls';
import { triggerHaptic } from '../../utils/haptics';

export function TimerView() {
  const subjects = useSubjectStore((state) => state.subjects);
  const selectedSubjectId = useSubjectStore((state) => state.selectedSubjectId);
  const selectSubject = useSubjectStore((state) => state.selectSubject);

  const {
    status,
    mode,
    pomodoroPhase,
    completedPomodorosInCycle,
    longBreakInterval,
    progressPercent,
    formatted,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    skipPomodoroPhase,
    previousPomodoroPhase,
  } = useStudyTimer();

  const setMode = useTimerStore((state) => state.setMode);
  const activeSubject = subjects.find((s) => s.id === selectedSubjectId) ?? subjects[0];

  const handleStart = () => {
    if (activeSubject) {
      startTimer(activeSubject.id);
      triggerHaptic('medium');
    }
  };

  const handlePause = () => {
    pauseTimer();
    triggerHaptic('light');
  };

  const handleResume = () => {
    resumeTimer();
    triggerHaptic('medium');
  };

  const handleReset = () => {
    resetTimer();
    triggerHaptic('warning');
  };

  const handleToggleMode = (newMode: 'stopwatch' | 'pomodoro') => {
    setMode(newMode);
    triggerHaptic('light');
  };

  return (
    <div className="max-w-md mx-auto space-y-4 pb-2 w-full flex flex-col items-center">
      {/* Timer Main Panel */}
      <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-sm border border-[#C2D8FC]/60 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col items-center transition-colors w-full">
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-3 tracking-wide">
          {mode === 'pomodoro' ? 'Pomodoro Focus Timer' : 'Stopwatch Study Timer'}
        </h2>

        {/* Subject Horizontal Selector */}
        <div className="w-full flex items-center justify-center gap-2 overflow-x-auto pb-2 mb-3 scrollbar-thin smooth-scroll">
          {subjects.map((sub) => (
            <button
              key={sub.id}
              type="button"
              onClick={() => {
                selectSubject(sub.id);
                triggerHaptic('light');
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer shrink-0 active:scale-95 ${
                sub.id === activeSubject?.id
                  ? 'border-blue-600 dark:border-[#9FC6FC] bg-[#E4EDFC] dark:bg-blue-950/80 text-blue-900 dark:text-white shadow-xs ring-1 ring-blue-500'
                  : 'border-[#E4EDFC] dark:border-slate-800 bg-white/90 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-[#E4EDFC]/50 dark:hover:bg-slate-800'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: sub.color }}
              />
              <span className="truncate max-w-[120px]">{sub.name}</span>
            </button>
          ))}
        </div>

        {/* Big Display Clock with Previous & Next cycle handlers */}
        <div className="my-2 w-full">
          <TimerDisplay
            hours={formatted.hours}
            minutes={formatted.minutes}
            seconds={formatted.seconds}
            mode={mode}
            pomodoroPhase={pomodoroPhase}
            completedCycles={completedPomodorosInCycle}
            longBreakInterval={longBreakInterval}
            progressPercent={progressPercent}
            subjectName={activeSubject?.name}
            subjectColor={activeSubject?.color}
            onSkipPhase={() => {
              skipPomodoroPhase();
              triggerHaptic('light');
            }}
            onPreviousPhase={() => {
              previousPomodoroPhase();
              triggerHaptic('light');
            }}
          />
        </div>

        {/* Large Ergonomic Controls */}
        <div className="mt-4 w-full flex justify-center">
          <TimerControls
            status={status}
            mode={mode}
            onStart={handleStart}
            onPause={handlePause}
            onResume={handleResume}
            onReset={handleReset}
            onToggleMode={handleToggleMode}
          />
        </div>

        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-5 text-center leading-relaxed max-w-xs">
          {mode === 'pomodoro'
            ? '25-minute focus sessions followed by 5-minute rest breaks. Study blocks log automatically.'
            : '10-minute intervals are colored in your planner automatically while studying.'}
        </p>
      </div>
    </div>
  );
}

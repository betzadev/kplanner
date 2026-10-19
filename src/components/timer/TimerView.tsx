import { useStudyTimer } from '../../hooks/useStudyTimer';
import { useSubjectStore } from '../../store/useSubjectStore';
import { usePlannerStore } from '../../store/usePlannerStore';
import { useTimerStore } from '../../store/useTimerStore';
import { TimerDisplay } from './TimerDisplay';
import { TimerControls } from './TimerControls';
import { TenMinGrid } from '../planner/TenMinGrid';
import { triggerHaptic } from '../../utils/haptics';

export function TimerView() {
  const currentDate = usePlannerStore((state) => state.currentDate);
  const subjects = useSubjectStore((state) => state.subjects);
  const selectedSubjectId = useSubjectStore((state) => state.selectedSubjectId);
  const selectSubject = useSubjectStore((state) => state.selectSubject);

  const {
    status,
    mode,
    pomodoroPhase,
    formatted,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
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
    <div className="max-w-md mx-auto space-y-4 pb-4">
      {/* Timer Main Panel */}
      <div className="bg-white border border-slate-300 rounded-lg p-5 shadow-xs flex flex-col items-center">
        <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">
          Live Study Timer
        </h2>

        {/* Subject Horizontal Selector for Mobile */}
        <div className="w-full flex items-center gap-2 overflow-x-auto pb-2 mb-2 scrollbar-thin smooth-scroll">
          {subjects.map((sub) => (
            <button
              key={sub.id}
              type="button"
              onClick={() => {
                selectSubject(sub.id);
                triggerHaptic('light');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer shrink-0 active:scale-95 ${
                sub.id === activeSubject?.id
                  ? 'border-slate-800 bg-slate-100 text-slate-900 shadow-xs ring-1 ring-slate-800'
                  : 'border-slate-200 bg-slate-50 text-slate-600'
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

        <TimerDisplay
          hours={formatted.hours}
          minutes={formatted.minutes}
          seconds={formatted.seconds}
          mode={mode}
          pomodoroPhase={pomodoroPhase}
          subjectName={activeSubject?.name}
          subjectColor={activeSubject?.color}
        />

        <TimerControls
          status={status}
          mode={mode}
          onStart={handleStart}
          onPause={handlePause}
          onResume={handleResume}
          onReset={handleReset}
          onToggleMode={handleToggleMode}
        />

        <p className="text-[10px] text-slate-400 mt-4 text-center leading-relaxed">
          ⚡ Cells for the current 10-minute block are colored automatically while studying.
        </p>
      </div>

      {/* Real-time Grid Preview for Today */}
      <div className="flex flex-col items-center pt-2">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
          Today's Visual Timeline ({currentDate})
        </span>
        <TenMinGrid date={currentDate} startHour={6} />
      </div>
    </div>
  );
}

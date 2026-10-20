import { useState, useEffect } from 'react';
import { useStudyTimer } from '../../hooks/useStudyTimer';
import { useSubjectStore } from '../../store/useSubjectStore';
import { useTimerStore } from '../../store/useTimerStore';
import { TimerDisplay } from './TimerDisplay';
import { TimerControls } from './TimerControls';
import { triggerHaptic } from '../../utils/haptics';
import {
  scheduleTimerNotification,
  cancelScheduledNotification,
  requestNotificationAccess,
} from '../../utils/notifications';
import { ambientAudio, AmbientSoundType } from '../../utils/ambientAudio';
import { Volume2, VolumeX, Waves, CloudRain, Wind } from 'lucide-react';

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
    remainingMs,
    formatted,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    skipPomodoroPhase,
    previousPomodoroPhase,
  } = useStudyTimer();

  const setMode = useTimerStore((state) => state.setMode);
  const timerConfig = useTimerStore((state) => state.timerConfig);
  const updateConfig = useTimerStore((state) => state.updateConfig);

  const [ambientSound, setAmbientSound] = useState<AmbientSoundType>(
    (timerConfig.ambientSound as AmbientSoundType) || 'none'
  );
  const [ambientVolume, setAmbientVolume] = useState<number>(timerConfig.ambientVolume ?? 0.5);

  const activeSubject = subjects.find((s) => s.id === selectedSubjectId) ?? subjects[0];

  // Schedule or cancel system-level background notifications
  useEffect(() => {
    if (status === 'running' && mode === 'pomodoro') {
      const title =
        pomodoroPhase === 'focus'
          ? '🎯 Focus Session Complete!'
          : '☕ Rest Break Finished!';
      const body =
        pomodoroPhase === 'focus'
          ? 'Outstanding focus! Time to relax during your scheduled break.'
          : 'Break time is over. Ready to begin your next study interval?';

      scheduleTimerNotification(title, body, remainingMs);
    } else {
      cancelScheduledNotification();
    }
  }, [status, mode, pomodoroPhase, remainingMs]);

  // Clean up ambient audio on unmount
  useEffect(() => {
    return () => {
      ambientAudio.stop();
    };
  }, []);

  const handleStart = async () => {
    if (activeSubject) {
      await requestNotificationAccess();
      startTimer(activeSubject.id);
      triggerHaptic('medium');

      if (ambientSound !== 'none') {
        ambientAudio.setSound(ambientSound, ambientVolume);
      }
    }
  };

  const handlePause = () => {
    pauseTimer();
    cancelScheduledNotification();
    ambientAudio.stop();
    triggerHaptic('light');
  };

  const handleResume = () => {
    resumeTimer();
    triggerHaptic('medium');
    if (ambientSound !== 'none') {
      ambientAudio.setSound(ambientSound, ambientVolume);
    }
  };

  const handleReset = () => {
    resetTimer();
    cancelScheduledNotification();
    ambientAudio.stop();
    triggerHaptic('warning');
  };

  const handleToggleMode = (newMode: 'stopwatch' | 'pomodoro') => {
    setMode(newMode);
    cancelScheduledNotification();
    ambientAudio.stop();
    triggerHaptic('light');
  };

  const handleSelectAmbient = (sound: AmbientSoundType) => {
    setAmbientSound(sound);
    updateConfig({ ambientSound: sound });
    triggerHaptic('light');

    if (status === 'running' || sound !== 'none') {
      ambientAudio.setSound(sound, ambientVolume);
    } else {
      ambientAudio.stop();
    }
  };

  const handleVolumeChange = (vol: number) => {
    setAmbientVolume(vol);
    updateConfig({ ambientVolume: vol });
    ambientAudio.setVolume(vol);
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
              cancelScheduledNotification();
              skipPomodoroPhase();
              triggerHaptic('light');
            }}
            onPreviousPhase={() => {
              cancelScheduledNotification();
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

        {/* Phase 3.4 Ambient Noise Synthesizer Selector */}
        <div className="mt-5 w-full pt-4 border-t border-[#E4EDFC] dark:border-slate-800 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Waves size={13} className="text-blue-500" />
              <span>Ambient Background Sound</span>
            </span>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              {ambientSound === 'none' ? <VolumeX size={13} /> : <Volume2 size={13} />}
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={ambientVolume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-16 h-1.5 bg-[#C2D8FC] dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                title="Ambient Volume"
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {[
              { id: 'none', label: 'Off', icon: VolumeX },
              { id: 'brown', label: 'Brown Noise', icon: Wind },
              { id: 'pink', label: 'Pink Noise', icon: Waves },
              { id: 'rain', label: 'Soft Rain', icon: CloudRain },
            ].map((item) => {
              const Icon = item.icon;
              const isSelected = ambientSound === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectAmbient(item.id as AmbientSoundType)}
                  className={`flex flex-col items-center justify-center p-2 rounded-2xl border text-[10px] font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#E4EDFC] dark:bg-blue-950/80 border-blue-500 text-blue-900 dark:text-white shadow-2xs ring-1 ring-blue-400'
                      : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                  }`}
                >
                  <Icon size={14} className="mb-0.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-4 text-center leading-relaxed max-w-xs">
          {mode === 'pomodoro'
            ? 'Verified Pomodoro sessions earn a 1.5x XP and Gems reward upon completion.'
            : '10-minute intervals are automatically verified and recorded in your planner.'}
        </p>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { useStudyTimer } from '../../hooks/useStudyTimer';
import { useSubjectStore } from '../../store/useSubjectStore';
import { useTimerStore } from '../../store/useTimerStore';
import { useGamificationStore, AVAILABLE_CHIMES } from '../../store/useGamificationStore';
import { TimerDisplay } from './TimerDisplay';
import { TimerControls } from './TimerControls';
import { triggerHaptic } from '../../utils/haptics';
import {
  scheduleTimerNotification,
  cancelScheduledNotification,
  requestNotificationAccess,
} from '../../utils/notifications';
import { ambientAudio, AmbientSoundType, ChimePresetType } from '../../utils/ambientAudio';
import {
  Volume2,
  VolumeX,
  Waves,
  CloudRain,
  Wind,
  Sun,
  Zap,
  BellRing,
  Play,
  Check,
  ShoppingBag,
} from 'lucide-react';
import { screenWakeLock } from '../../utils/wakeLock';
import { useLanguageStore } from '../../store/useLanguageStore';
import { StreakModal } from '../gamification/StreakModal';

export function TimerView() {
  const t = useLanguageStore((state) => state.t);
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
    isOvertime,
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

  const unlockedChimes = useGamificationStore((state) => state.unlockedChimes) ?? ['default'];
  const [shopOpen, setShopOpen] = useState(false);

  const [ambientSound, setAmbientSound] = useState<AmbientSoundType>(
    (timerConfig.ambientSound as AmbientSoundType) || 'none'
  );
  const [ambientVolume, setAmbientVolume] = useState<number>(timerConfig.ambientVolume ?? 0.5);

  const activeSubject = subjects.find((s) => s.id === selectedSubjectId) ?? subjects[0];
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  const toggleWakeLock = async () => {
    if (wakeLockActive) {
      await screenWakeLock.release();
      setWakeLockActive(false);
      triggerHaptic('light');
    } else {
      const ok = await screenWakeLock.acquire();
      if (ok) {
        setWakeLockActive(true);
        triggerHaptic('success');
      } else {
        triggerHaptic('warning');
      }
    }
  };

  const isFlowtime = Boolean(timerConfig.flowtimeOvertimeEnabled);
  const toggleFlowtime = () => {
    updateConfig({ flowtimeOvertimeEnabled: !isFlowtime });
    triggerHaptic('light');
  };

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

  const handlePreviewChime = (chimeId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    ambientAudio.playChime(chimeId as ChimePresetType);
    triggerHaptic('light');
  };

  const handleSelectChime = (chimeId: string) => {
    updateConfig({ chimePreset: chimeId });
    ambientAudio.playChime(chimeId as ChimePresetType);
    triggerHaptic('success');
  };

  return (
    <div className="max-w-md mx-auto space-y-4 pb-4 w-full flex flex-col items-center">
      {/* Timer Main Panel */}
      <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-sm border border-[#C2D8FC]/60 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-sm flex flex-col items-center transition-colors w-full">
        {/* Header mode title */}
        <h2 className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 mb-3 tracking-wide">
          {mode === 'pomodoro' ? t.timerPomodoro : t.timerStopwatch}
        </h2>

        {/* Fixed Activity Cards Carousel (Bug 7 fix: justify-start with proper padding/margins so first and last cards are fully visible) */}
        <div className="w-full relative mb-3">
          <div
            ref={carouselRef}
            className="w-full flex items-center justify-start gap-2 overflow-x-auto py-1 px-3 sm:px-4 scrollbar-thin smooth-scroll snap-x snap-mandatory"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {subjects.map((sub, idx) => {
              const isSelected = sub.id === activeSubject?.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => {
                    selectSubject(sub.id);
                    triggerHaptic('light');
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-2xl text-xs font-semibold border transition-all cursor-pointer shrink-0 snap-center active:scale-95 ${
                    isSelected
                      ? 'border-blue-600 dark:border-[#9FC6FC] bg-[#E4EDFC] dark:bg-blue-950/80 text-blue-950 dark:text-white shadow-xs ring-1 ring-blue-500'
                      : 'border-[#E4EDFC] dark:border-slate-800 bg-white/90 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-[#E4EDFC]/50 dark:hover:bg-slate-800'
                  } ${idx === 0 ? 'ml-0.5' : ''} ${idx === subjects.length - 1 ? 'mr-1' : ''}`}
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                    style={{ backgroundColor: sub.color }}
                  />
                  <span className="truncate max-w-[110px] select-none">{sub.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Desk Clock WakeLock & Flowtime Mode Toggles */}
        <div className="flex items-center gap-2 mb-2 flex-wrap justify-center">
          <button
            type="button"
            onClick={toggleWakeLock}
            className={`min-h-[40px] flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
              wakeLockActive
                ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-700 shadow-xs ring-1 ring-amber-400/40'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
            title="Keep Screen Awake"
          >
            <Sun size={13} className={wakeLockActive ? 'text-amber-500 fill-amber-500' : ''} />
            <span>{wakeLockActive ? t.deskClockOn : t.deskClock}</span>
          </button>

          {mode === 'pomodoro' && (
            <button
              type="button"
              onClick={toggleFlowtime}
              className={`min-h-[40px] flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                isFlowtime
                  ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950/80 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700 shadow-xs ring-1 ring-indigo-400/40'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
              title="Flowtime Mode"
            >
              <Zap size={13} className={isFlowtime ? 'text-indigo-500 fill-indigo-500' : ''} />
              <span>{isFlowtime ? t.flowtimeOn : t.flowtime}</span>
            </button>
          )}
        </div>

        {/* Big Display Clock Face */}
        <div className="my-1 w-full flex justify-center">
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
            isOvertime={isOvertime}
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
        <div className="mt-2 w-full flex justify-center">
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

        {/* Synthesized Completion Chime Sound Selector (Bug 6 fix: allows selecting and playing unlocked purchased sounds!) */}
        <div className="mt-4 w-full pt-3.5 border-t border-[#E4EDFC] dark:border-slate-800 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <BellRing size={14} className="text-amber-500" />
              <span>{t.soundChime}</span>
            </span>
            <button
              type="button"
              onClick={() => setShopOpen(true)}
              className="text-[10px] font-bold text-blue-600 dark:text-[#9FC6FC] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <ShoppingBag size={11} />
              <span>{t.tabShop}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {AVAILABLE_CHIMES.map((chime) => {
              const isUnlocked = unlockedChimes.includes(chime.id);
              const isSelected = (timerConfig.chimePreset || 'default') === chime.id;

              return (
                <div
                  key={chime.id}
                  onClick={() => {
                    if (isUnlocked) handleSelectChime(chime.id);
                    else setShopOpen(true);
                  }}
                  className={`p-2 rounded-xl border flex items-center justify-between transition-all cursor-pointer min-h-[44px] ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/80 border-blue-500 dark:border-[#9FC6FC] text-blue-950 dark:text-white shadow-2xs ring-1 ring-blue-400'
                      : isUnlocked
                      ? 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                      : 'bg-slate-100/40 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-400 opacity-60'
                  }`}
                >
                  <div className="min-w-0 pr-1">
                    <div className="text-[11px] font-bold truncate flex items-center gap-1">
                      {isSelected && <Check size={12} className="text-blue-600 dark:text-[#9FC6FC] shrink-0" />}
                      <span className="truncate">{chime.name}</span>
                    </div>
                    <div className="text-[9px] text-slate-400 truncate">
                      {isUnlocked ? chime.description : `${chime.priceGems} Gems`}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handlePreviewChime(chime.id, e)}
                    className="min-h-[36px] min-w-[36px] flex items-center justify-center p-1.5 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-[#9FC6FC] rounded-lg transition-colors cursor-pointer shrink-0"
                    title={t.soundPreview}
                    aria-label={`Preview ${chime.name}`}
                  >
                    <Play size={13} className="fill-slate-400 hover:fill-blue-600" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ambient Noise Synthesizer Selector */}
        <div className="mt-3 w-full pt-3 border-t border-[#E4EDFC] dark:border-slate-800 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Waves size={13} className="text-blue-500" />
              <span>{t.ambientSound}</span>
            </span>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              {ambientSound === 'none' ? <VolumeX size={14} /> : <Volume2 size={14} />}
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={ambientVolume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-16 h-2 bg-[#C2D8FC] dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                title={t.volume}
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {[
              { id: 'none', label: 'Off', icon: VolumeX },
              { id: 'brown', label: 'Brown', icon: Wind },
              { id: 'pink', label: 'Pink', icon: Waves },
              { id: 'rain', label: 'Rain', icon: CloudRain },
            ].map((item) => {
              const Icon = item.icon;
              const isSelected = ambientSound === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectAmbient(item.id as AmbientSoundType)}
                  className={`min-h-[44px] flex flex-col items-center justify-center p-1.5 rounded-xl border text-[10px] font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#E4EDFC] dark:bg-blue-950/80 border-blue-500 text-blue-950 dark:text-white shadow-2xs ring-1 ring-blue-400'
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

        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-3 text-center leading-relaxed max-w-xs">
          {mode === 'pomodoro' ? t.timerBonusHint : t.timerStopwatchHint}
        </p>
      </div>

      <StreakModal isOpen={shopOpen} onClose={() => setShopOpen(false)} />
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useTimerStore } from '../store/useTimerStore';
import { formatTimerMs } from '../utils/timeSlotMapper';

export function useStudyTimer() {
  const timerState = useTimerStore((state) => state.timerState);
  const timerConfig = useTimerStore((state) => state.timerConfig);
  const startTimer = useTimerStore((state) => state.startTimer);
  const pauseTimer = useTimerStore((state) => state.pauseTimer);
  const resumeTimer = useTimerStore((state) => state.resumeTimer);
  const resetTimer = useTimerStore((state) => state.resetTimer);
  const tick = useTimerStore((state) => state.tick);
  const skipPomodoroPhase = useTimerStore((state) => state.skipPomodoroPhase);
  const previousPomodoroPhase = useTimerStore((state) => state.previousPomodoroPhase);
  const getCurrentTargetDurationMs = useTimerStore((state) => state.getCurrentTargetDurationMs);

  const [currentMs, setCurrentMs] = useState<number>(0);

  useEffect(() => {
    const updateTime = () => {
      const now = Date.now();
      const currentRun =
        timerState.status === 'running' && timerState.startTimestamp
          ? now - timerState.startTimestamp
          : 0;
      setCurrentMs(timerState.accumulatedMs + currentRun);
    };

    updateTime();

    if (timerState.status !== 'running') {
      return;
    }

    const interval = setInterval(() => {
      updateTime();
      tick();
    }, 1000);

    return () => clearInterval(interval);
  }, [timerState.status, timerState.startTimestamp, timerState.accumulatedMs, tick]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && timerState.status === 'running') {
        tick();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [timerState.status, tick]);

  // Pomodoro countdown calculations
  const targetDurationMs = getCurrentTargetDurationMs();
  const isPomodoro = timerState.mode === 'pomodoro';
  const isOvertime = Boolean(
    timerConfig.flowtimeOvertimeEnabled &&
    isPomodoro &&
    timerState.pomodoroPhase === 'focus' &&
    currentMs > targetDurationMs
  );
  const remainingMs = isPomodoro
    ? Math.max(0, targetDurationMs - currentMs)
    : currentMs;
  const displayMs = isOvertime ? currentMs - targetDurationMs : remainingMs;
  const progressPercent = isPomodoro
    ? Math.min(100, Math.max(0, (currentMs / targetDurationMs) * 100))
    : 100;

  const formatted = formatTimerMs(displayMs);

  return {
    status: timerState.status,
    mode: timerState.mode,
    pomodoroPhase: timerState.pomodoroPhase,
    completedPomodorosInCycle: timerState.completedPomodorosInCycle,
    longBreakInterval: timerConfig.longBreakInterval,
    currentSubjectId: timerState.currentSubjectId,
    currentTaskId: timerState.currentTaskId,
    elapsedMs: currentMs,
    remainingMs,
    targetDurationMs,
    progressPercent,
    formatted,
    isOvertime,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    skipPomodoroPhase,
    previousPomodoroPhase,
  };
}

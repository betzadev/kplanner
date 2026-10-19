import { useEffect, useState } from 'react';
import { useTimerStore } from '../store/useTimerStore';
import { formatTimerMs } from '../utils/timeSlotMapper';
import { UnixTimestampMs } from '../types';

export function useStudyTimer() {
  const { timerState, startTimer, pauseTimer, resumeTimer, resetTimer, tick } = useTimerStore();
  const [displayMs, setDisplayMs] = useState<number>(0);

  useEffect(() => {
    if (timerState.status !== 'running') {
      setDisplayMs(timerState.accumulatedMs);
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now() as UnixTimestampMs;
      const runningDelta = timerState.startTimestamp ? now - timerState.startTimestamp : 0;
      setDisplayMs(timerState.accumulatedMs + runningDelta);
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

  const formatted = formatTimerMs(displayMs);

  return {
    status: timerState.status,
    mode: timerState.mode,
    pomodoroPhase: timerState.pomodoroPhase,
    currentSubjectId: timerState.currentSubjectId,
    currentTaskId: timerState.currentTaskId,
    elapsedMs: displayMs,
    formatted,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
  };
}

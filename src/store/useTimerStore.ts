import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  EntityId,
  PomodoroPhase,
  TimerConfig,
  TimerMode,
  TimerState,
  UnixTimestampMs,
} from '../types';
import { toDateString, dateToBlockIndex } from '../utils/timeSlotMapper';
import { usePlannerStore } from './usePlannerStore';
import { tauriApi } from '../services/tauriApi';

export interface TimerStoreState {
  timerState: TimerState;
  timerConfig: TimerConfig;
}

export interface TimerStoreActions {
  initFromRust: () => Promise<void>;
  startTimer: (subjectId: EntityId, taskId?: EntityId | null) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  tick: () => void;
  setMode: (mode: TimerMode) => void;
  setSubject: (subjectId: EntityId) => void;
  setTask: (taskId: EntityId | null) => void;
  updateConfig: (configUpdates: Partial<TimerConfig>) => void;
  transitionPomodoroPhase: () => void;
  syncCurrentTimeToGrid: () => void;
}

export type TimerStore = TimerStoreState & TimerStoreActions;

const DEFAULT_TIMER_CONFIG: TimerConfig = {
  pomodoroWorkMinutes: 25,
  pomodoroShortBreakMinutes: 5,
  pomodoroLongBreakMinutes: 15,
  longBreakInterval: 4,
  autoStartBreaks: true,
  autoStartPomodoros: false,
  soundAlertsEnabled: true,
};

const INITIAL_TIMER_STATE: TimerState = {
  status: 'idle',
  mode: 'stopwatch',
  startTimestamp: null,
  pausedTimestamp: null,
  accumulatedMs: 0,
  currentSubjectId: null,
  currentTaskId: null,
  pomodoroPhase: 'focus',
  completedPomodorosInCycle: 0,
};

function playChime() {
  if (typeof window === 'undefined') return;
  try {
    const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.3); // A5

    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.8);
  } catch {
    // Audio context may require user interaction
  }
}

export const useTimerStore = create<TimerStore>()(
  persist(
    (set, get) => ({
      timerState: INITIAL_TIMER_STATE,
      timerConfig: DEFAULT_TIMER_CONFIG,

      initFromRust: async () => {
        const loaded = await tauriApi.loadTimerConfig();
        if (loaded) {
          set({ timerConfig: loaded });
        }
      },

      startTimer: (subjectId: EntityId, taskId: EntityId | null = null) => {
        const now = Date.now() as UnixTimestampMs;
        set({
          timerState: {
            ...get().timerState,
            status: 'running',
            startTimestamp: now,
            pausedTimestamp: null,
            accumulatedMs: 0,
            currentSubjectId: subjectId,
            currentTaskId: taskId,
          },
        });
        get().syncCurrentTimeToGrid();
      },

      pauseTimer: () => {
        const { timerState } = get();
        if (timerState.status !== 'running' || !timerState.startTimestamp) return;

        const now = Date.now() as UnixTimestampMs;
        const currentElapsed = now - timerState.startTimestamp;

        set({
          timerState: {
            ...timerState,
            status: 'paused',
            pausedTimestamp: now,
            accumulatedMs: timerState.accumulatedMs + currentElapsed,
            startTimestamp: null,
          },
        });
      },

      resumeTimer: () => {
        const { timerState } = get();
        if (timerState.status !== 'paused') return;

        const now = Date.now() as UnixTimestampMs;
        set({
          timerState: {
            ...timerState,
            status: 'running',
            startTimestamp: now,
            pausedTimestamp: null,
          },
        });
      },

      resetTimer: () => {
        set({
          timerState: {
            ...INITIAL_TIMER_STATE,
            mode: get().timerState.mode,
            currentSubjectId: get().timerState.currentSubjectId,
          },
        });
      },

      tick: () => {
        const { timerState, timerConfig } = get();
        if (timerState.status !== 'running' || !timerState.startTimestamp) return;

        if (timerState.mode === 'stopwatch' || timerState.pomodoroPhase === 'focus') {
          get().syncCurrentTimeToGrid();
        }

        if (timerState.mode === 'pomodoro') {
          const now = Date.now() as UnixTimestampMs;
          const totalElapsedMs = timerState.accumulatedMs + (now - timerState.startTimestamp);

          let targetDurationMs = 0;
          if (timerState.pomodoroPhase === 'focus') {
            targetDurationMs = timerConfig.pomodoroWorkMinutes * 60 * 1000;
          } else if (timerState.pomodoroPhase === 'shortBreak') {
            targetDurationMs = timerConfig.pomodoroShortBreakMinutes * 60 * 1000;
          } else {
            targetDurationMs = timerConfig.pomodoroLongBreakMinutes * 60 * 1000;
          }

          if (totalElapsedMs >= targetDurationMs) {
            get().transitionPomodoroPhase();
          }
        }
      },

      transitionPomodoroPhase: () => {
        const { timerState, timerConfig } = get();
        let nextPhase: PomodoroPhase = 'focus';
        let completedCycles = timerState.completedPomodorosInCycle;

        if (timerState.pomodoroPhase === 'focus') {
          completedCycles += 1;
          if (completedCycles % timerConfig.longBreakInterval === 0) {
            nextPhase = 'longBreak';
          } else {
            nextPhase = 'shortBreak';
          }
        } else {
          nextPhase = 'focus';
        }

        if (timerConfig.soundAlertsEnabled) {
          playChime();
        }

        const autoStart =
          nextPhase === 'focus' ? timerConfig.autoStartPomodoros : timerConfig.autoStartBreaks;
        const now = Date.now() as UnixTimestampMs;

        set({
          timerState: {
            ...timerState,
            status: autoStart ? 'running' : 'idle',
            pomodoroPhase: nextPhase,
            completedPomodorosInCycle: completedCycles,
            startTimestamp: autoStart ? now : null,
            pausedTimestamp: null,
            accumulatedMs: 0,
          },
        });
      },

      setMode: (mode: TimerMode) => {
        get().resetTimer();
        set((state) => ({
          timerState: { ...state.timerState, mode },
        }));
      },

      setSubject: (subjectId: EntityId) => {
        set((state) => ({
          timerState: { ...state.timerState, currentSubjectId: subjectId },
        }));
      },

      setTask: (taskId: EntityId | null) => {
        set((state) => ({
          timerState: { ...state.timerState, currentTaskId: taskId },
        }));
      },

      updateConfig: (configUpdates: Partial<TimerConfig>) => {
        set((state) => {
          const updated = { ...state.timerConfig, ...configUpdates };
          tauriApi.saveTimerConfig(updated);
          return { timerConfig: updated };
        });
      },

      syncCurrentTimeToGrid: () => {
        const { timerState } = get();
        if (!timerState.currentSubjectId) return;

        const now = new Date();
        const dateStr = toDateString(now);
        const { hour, tenMinIndex } = dateToBlockIndex(now);

        usePlannerStore.getState().paintCell(
          dateStr,
          hour,
          tenMinIndex,
          timerState.currentSubjectId,
          timerState.currentTaskId,
          1.0
        );
      },
    }),
    {
      name: 'korean_planner_timer_state',
      partialize: (state) => ({
        timerConfig: state.timerConfig,
      }),
    }
  )
);

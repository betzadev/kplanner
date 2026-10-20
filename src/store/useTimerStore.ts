import { create } from 'zustand';
import {
  EntityId,
  PomodoroPhase,
  TimerConfig,
  TimerMode,
  TimerState,
  UnixTimestampMs,
} from '../types';
import { tauriApi } from '../services/tauriApi';
import { usePlannerStore } from './usePlannerStore';
import { useGamificationStore } from './useGamificationStore';
import { dateToBlockIndex, toDateString, buildGridCellKey } from '../utils/timeSlotMapper';

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
  skipPomodoroPhase: () => void;
  previousPomodoroPhase: () => void;
  syncCurrentTimeToGrid: () => void;
  getCurrentTargetDurationMs: () => number;
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
  mode: 'pomodoro',
  startTimestamp: null,
  pausedTimestamp: null,
  accumulatedMs: 0,
  currentSubjectId: null,
  currentTaskId: null,
  pomodoroPhase: 'focus',
  completedPomodorosInCycle: 0,
};

function playChime() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch {
    // Audio context not allowed or blocked
  }
}

export const useTimerStore = create<TimerStore>((set, get) => ({
  timerState: INITIAL_TIMER_STATE,
  timerConfig: DEFAULT_TIMER_CONFIG,

  initFromRust: async () => {
    const rustConfig = await tauriApi.loadTimerConfig();
    if (rustConfig) {
      set({ timerConfig: rustConfig });
    }
  },

  getCurrentTargetDurationMs: () => {
    const { timerState, timerConfig } = get();
    if (timerState.mode === 'stopwatch') return 0;

    switch (timerState.pomodoroPhase) {
      case 'focus':
        return timerConfig.pomodoroWorkMinutes * 60 * 1000;
      case 'shortBreak':
        return timerConfig.pomodoroShortBreakMinutes * 60 * 1000;
      case 'longBreak':
        return timerConfig.pomodoroLongBreakMinutes * 60 * 1000;
      default:
        return 25 * 60 * 1000;
    }
  },

  startTimer: (subjectId: EntityId, taskId: EntityId | null = null) => {
    const now = Date.now() as UnixTimestampMs;
    set((state) => ({
      timerState: {
        ...state.timerState,
        status: 'running',
        startTimestamp: now,
        pausedTimestamp: null,
        accumulatedMs: 0,
        currentSubjectId: subjectId,
        currentTaskId: taskId,
      },
    }));
  },

  pauseTimer: () => {
    const now = Date.now() as UnixTimestampMs;
    const { timerState } = get();

    if (timerState.status !== 'running') return;

    const sessionElapsed = timerState.startTimestamp ? now - timerState.startTimestamp : 0;
    const newAccumulated = timerState.accumulatedMs + sessionElapsed;

    set({
      timerState: {
        ...timerState,
        status: 'paused',
        pausedTimestamp: now,
        accumulatedMs: newAccumulated,
        startTimestamp: null,
      },
    });

    get().syncCurrentTimeToGrid();
  },

  resumeTimer: () => {
    const now = Date.now() as UnixTimestampMs;
    const { timerState } = get();

    if (timerState.status !== 'paused') return;

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
    get().syncCurrentTimeToGrid();

    set((state) => ({
      timerState: {
        ...state.timerState,
        status: 'idle',
        startTimestamp: null,
        pausedTimestamp: null,
        accumulatedMs: 0,
      },
    }));
  },

  tick: () => {
    const { timerState } = get();
    if (timerState.status !== 'running') return;

    const now = Date.now() as UnixTimestampMs;
    const currentRun = timerState.startTimestamp ? now - timerState.startTimestamp : 0;
    const totalElapsedMs = timerState.accumulatedMs + currentRun;

    get().syncCurrentTimeToGrid();

    if (timerState.mode === 'pomodoro') {
      const targetDurationMs = get().getCurrentTargetDurationMs();

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
      useGamificationStore.getState().awardXp(25);
      useGamificationStore.getState().awardGems(5);

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

  skipPomodoroPhase: () => {
    get().transitionPomodoroPhase();
  },

  previousPomodoroPhase: () => {
    const { timerState, timerConfig } = get();
    let prevPhase: PomodoroPhase = 'focus';
    let cycles = timerState.completedPomodorosInCycle;

    if (timerState.pomodoroPhase === 'shortBreak' || timerState.pomodoroPhase === 'longBreak') {
      prevPhase = 'focus';
      if (cycles > 0) cycles -= 1;
    } else {
      if (cycles > 0) {
        if (cycles % timerConfig.longBreakInterval === 0) {
          prevPhase = 'longBreak';
        } else {
          prevPhase = 'shortBreak';
        }
      } else {
        prevPhase = 'focus';
      }
    }

    set({
      timerState: {
        ...timerState,
        status: 'idle',
        pomodoroPhase: prevPhase,
        completedPomodorosInCycle: Math.max(0, cycles),
        startTimestamp: null,
        pausedTimestamp: null,
        accumulatedMs: 0,
      },
    });
  },

  setMode: (mode: TimerMode) => {
    set((state) => ({
      timerState: {
        ...INITIAL_TIMER_STATE,
        mode,
        currentSubjectId: state.timerState.currentSubjectId,
      },
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
    if (timerState.status !== 'running' || !timerState.currentSubjectId) return;
    if (timerState.mode === 'pomodoro' && timerState.pomodoroPhase !== 'focus') return;

    const now = new Date();
    const coord = dateToBlockIndex(now);
    const todayStr = toDateString(now);

    const plannerStore = usePlannerStore.getState();
    const currentSheet = plannerStore.dailySheets[todayStr];
    const key = buildGridCellKey(coord.hour, coord.tenMinIndex);
    const existingBlock = currentSheet?.timeGrid[key];

    if (!existingBlock || existingBlock.subjectId !== timerState.currentSubjectId) {
      plannerStore.paintCell(
        todayStr,
        coord.hour,
        coord.tenMinIndex,
        timerState.currentSubjectId,
        timerState.currentTaskId,
        1.0
      );
    }
  },
}));

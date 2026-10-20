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
import { ambientAudio, ChimePresetType } from '../utils/ambientAudio';

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
  chimePreset: 'default',
  ambientSound: 'none',
  ambientVolume: 0.5,
  flowtimeOvertimeEnabled: false,
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

export const useTimerStore = create<TimerStore>((set, get) => ({
  timerState: INITIAL_TIMER_STATE,
  timerConfig: DEFAULT_TIMER_CONFIG,

  initFromRust: async () => {
    const rustConfig = await tauriApi.loadTimerConfig();
    if (rustConfig) {
      set({ timerConfig: { ...DEFAULT_TIMER_CONFIG, ...rustConfig } });
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

    get().syncCurrentTimeToGrid();
  },

  pauseTimer: () => {
    const now = Date.now() as UnixTimestampMs;
    const { timerState } = get();

    if (timerState.status !== 'running') return;

    const currentRun = timerState.startTimestamp ? now - timerState.startTimestamp : 0;
    const newAccumulated = timerState.accumulatedMs + currentRun;

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
    const { timerState, timerConfig } = get();
    if (timerState.status !== 'running') return;

    const now = Date.now() as UnixTimestampMs;
    const currentRun = timerState.startTimestamp ? now - timerState.startTimestamp : 0;
    const totalElapsedMs = timerState.accumulatedMs + currentRun;

    get().syncCurrentTimeToGrid();

    if (timerState.mode === 'pomodoro') {
      const targetDurationMs = get().getCurrentTargetDurationMs();

      if (totalElapsedMs >= targetDurationMs) {
        if (timerConfig.flowtimeOvertimeEnabled && timerState.pomodoroPhase === 'focus') {
          // In flowtime overtime mode: continue counting upwards and painting blocks
          // User clicks transition/break when ready to leave flow state
        } else {
          get().transitionPomodoroPhase();
        }
      }
    }
  },

  transitionPomodoroPhase: () => {
    const { timerState, timerConfig } = get();
    let nextPhase: PomodoroPhase = 'focus';
    let completedCycles = timerState.completedPomodorosInCycle;

    if (timerState.pomodoroPhase === 'focus') {
      completedCycles += 1;
      // Phase 4.4: 1.5x XP and Gem bonus for verified study timer sessions
      const verifiedXP = Math.round(25 * 1.5); // 38 XP
      const verifiedGems = Math.round(5 * 1.5); // 8 Gems
      useGamificationStore.getState().awardXp(verifiedXP);
      useGamificationStore.getState().awardGems(verifiedGems);

      // Check daily quest progress
      useGamificationStore.getState().advanceQuest('quest_pomodoro', 1);

      if (completedCycles % timerConfig.longBreakInterval === 0) {
        nextPhase = 'longBreak';
      } else {
        nextPhase = 'shortBreak';
      }
    } else {
      nextPhase = 'focus';
    }

    if (timerConfig.soundAlertsEnabled) {
      ambientAudio.playChime((timerConfig.chimePreset as ChimePresetType) || 'default');
    }

    const autoStart =
      (nextPhase === 'focus' && timerConfig.autoStartPomodoros) ||
      (nextPhase !== 'focus' && timerConfig.autoStartBreaks);

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
    const { timerState } = get();
    let nextPhase: PomodoroPhase = 'focus';

    if (timerState.pomodoroPhase === 'focus') {
      nextPhase = 'shortBreak';
    } else {
      nextPhase = 'focus';
    }

    set({
      timerState: {
        ...timerState,
        status: 'idle',
        pomodoroPhase: nextPhase,
        startTimestamp: null,
        pausedTimestamp: null,
        accumulatedMs: 0,
      },
    });
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

    if (!existingBlock || existingBlock.subjectId !== timerState.currentSubjectId || !existingBlock.isVerifiedTimer) {
      plannerStore.paintCell(
        todayStr,
        coord.hour,
        coord.tenMinIndex,
        timerState.currentSubjectId,
        timerState.currentTaskId,
        1.0,
        false, // not plan mode
        true   // isVerifiedTimer: true
      );

      // Check Early Bird quest (before 9:00 AM)
      if (now.getHours() < 9) {
        useGamificationStore.getState().advanceQuest('quest_early_bird', 10);
      }
    }
  },
}));

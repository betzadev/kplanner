/**
 * Branded Primitives & Types for Korean Study Planner
 */
export type DateString = string & { readonly __brand: 'DateString' };
export type HexColor = string;
export type EntityId = string;
export type UnixTimestampMs = number;

export type TenMinuteIndex = 0 | 1 | 2 | 3 | 4 | 5;
export type HourValue =
  | 0  | 1  | 2  | 3  | 4  | 5
  | 6  | 7  | 8  | 9  | 10 | 11
  | 12 | 13 | 14 | 15 | 16 | 17
  | 18 | 19 | 20 | 21 | 22 | 23;

export interface GridCellCoordinate {
  hour: HourValue;
  tenMinIndex: TenMinuteIndex;
}

export type GridCellKey = `${HourValue}-${TenMinuteIndex}`;

export interface SubjectLegendItem {
  id: EntityId;
  name: string;
  color: HexColor;
  slotIndex: number; // 0 to 7
}

export type SubjectItem = SubjectLegendItem;

export interface PlannerTask {
  id: EntityId;
  date: DateString;
  subjectId: EntityId;
  title: string;
  isCompleted: boolean;
  order: number;
}

export interface TimeBlock {
  hour: HourValue;
  tenMinIndex: TenMinuteIndex;
  subjectId: EntityId | null;
  taskId?: EntityId | null;
  fillRatio: number; // 0.0 to 1.0
}

export interface DailySheet {
  date: DateString;
  mainGoal: string;
  totalMinutesStudied: number;
  tasks: PlannerTask[];
  timeGrid: Record<GridCellKey, TimeBlock>;
  bottomMemos: [string, string, string, string, string, string];
}

export type TimerStatus = 'idle' | 'running' | 'paused';
export type TimerMode = 'stopwatch' | 'pomodoro';
export type PomodoroPhase = 'focus' | 'shortBreak' | 'longBreak';

export interface TimerState {
  status: TimerStatus;
  mode: TimerMode;
  startTimestamp: UnixTimestampMs | null;
  pausedTimestamp: UnixTimestampMs | null;
  accumulatedMs: number;
  currentSubjectId: EntityId | null;
  currentTaskId: EntityId | null;
  pomodoroPhase: PomodoroPhase;
  completedPomodorosInCycle: number;
}

export interface TimerConfig {
  pomodoroWorkMinutes: number;
  pomodoroShortBreakMinutes: number;
  pomodoroLongBreakMinutes: number;
  longBreakInterval: number;
  autoStartBreaks: boolean;
  autoStartPomodoros: boolean;
  soundAlertsEnabled: boolean;
}

export const DEFAULT_PASTEL_PALETTE: readonly HexColor[] = [
  '#A7D8DE', // Pastel Mint
  '#F6A6A1', // Pastel Coral
  '#FBE8A6', // Pastel Lemon
  '#B4D4F0', // Pastel Sky
  '#D5C6E8', // Pastel Lilac
  '#F8C291', // Pastel Peach
  '#F3B0C3', // Pastel Rose
  '#C1E1C1', // Pastel Sage
] as const;

export type ActiveTab = 'planner' | 'timer' | 'analytics' | 'settings';

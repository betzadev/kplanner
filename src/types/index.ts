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
  isRolledOver?: boolean;
  originalDate?: DateString;
  originalTaskId?: EntityId;
}

export interface TimeBlock {
  hour: HourValue;
  tenMinIndex: TenMinuteIndex;
  subjectId: EntityId | null; // actual study subject
  actualSubjectId?: EntityId | null;
  plannedSubjectId?: EntityId | null; // Phase 3.1 planned subject
  taskId?: EntityId | null;
  fillRatio: number; // 0.0 to 1.0
  isVerifiedTimer?: boolean; // Phase 4.4 1.5x timer bonus
}

export interface DailySheet {
  date: DateString;
  mainGoal: string;
  totalMinutesStudied: number;
  tasks: PlannerTask[];
  timeGrid: Record<GridCellKey, TimeBlock>;
  bottomMemos: [string, string, string, string, string, string];
  memoLabels?: [string, string, string, string, string, string];
  completionStamp?: string | null;
}

export interface DDayEvent {
  id: EntityId;
  title: string;
  targetDate: string; // YYYY-MM-DD
  colorId: HexColor;
  isPinned: boolean;
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
  chimePreset?: string;
  ambientSound?: string;
  ambientVolume?: number;
}

export const DEFAULT_PASTEL_PALETTE: readonly HexColor[] = [
  '#C2D8FC', // Soft Dreamy Sky Blue
  '#9FC6FC', // Dreamy Periwinkle Accent
  '#E4EDFC', // Cloud Mist Tint
  '#FDE2E4', // Soft Sakura Pink
  '#E2ECE9', // Sage Mist Green
  '#FFF1C5', // Buttercream Yellow
  '#DFCCF1', // Lavender Dream
  '#FCE1D4', // Warm Peach
] as const;

export interface ColorThemePalette {
  id: string;
  name: string;
  priceGems: number;
  colors: readonly HexColor[];
}

export const UNLOCKABLE_THEMES: ColorThemePalette[] = [
  {
    id: 'dreamy_pastel',
    name: 'Dreamy Pastel',
    priceGems: 0,
    colors: DEFAULT_PASTEL_PALETTE,
  },
  {
    id: 'matcha_cafe',
    name: 'Matcha Cafe',
    priceGems: 150,
    colors: [
      '#C8D6AF', '#A3B899', '#E0E5D7', '#8A9A86',
      '#D4DF9E', '#B7CE95', '#F2E8CF', '#6A994E'
    ],
  },
  {
    id: 'autumn_library',
    name: 'Autumn Library',
    priceGems: 200,
    colors: [
      '#E9C46A', '#F4A261', '#E76F51', '#DDA15E',
      '#BC6C25', '#C77DFF', '#E29578', '#FFDDD2'
    ],
  },
  {
    id: 'monochrome_ink',
    name: 'Monochrome Ink',
    priceGems: 250,
    colors: [
      '#D1D5DB', '#9CA3AF', '#6B7280', '#4B5563',
      '#374151', '#E5E7EB', '#CBD5E1', '#94A3B8'
    ],
  },
  {
    id: 'cyberpunk_neon',
    name: 'Cyberpunk Neon',
    priceGems: 300,
    colors: [
      '#06D6A0', '#118AB2', '#FFD166', '#EF476F',
      '#7209B7', '#4CC9F0', '#F72585', '#3A0CA3'
    ],
  },
];

export type StampType = '100% Focus' | 'Goal Achieved' | 'Early Bird' | 'Deep Work' | 'Perseverance';

export interface DailyQuest {
  id: string;
  title: string;
  description: string;
  progress: number;
  goal: number;
  unit: string;
  xpReward: number;
  gemReward: number;
  isCompleted: boolean;
  isClaimed: boolean;
}

export type ActiveTab = 'planner' | 'timer' | 'analytics' | 'settings';

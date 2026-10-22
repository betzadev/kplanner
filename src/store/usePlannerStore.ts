import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  DailySheet,
  DateString,
  GridCellKey,
  HourValue,
  PlannerTask,
  TenMinuteIndex,
  TimeBlock,
  EntityId,
} from '../types';
import { toDateString, buildGridCellKey, parseDateString } from '../utils/timeSlotMapper';
import { tauriApi } from '../services/tauriApi';

export interface PlannerStoreState {
  currentDate: DateString;
  dailySheets: Record<string, DailySheet>;
  isLoading: boolean;
  error: string | null;
}

export interface PlannerStoreActions {
  setCurrentDate: (date: DateString) => void;
  loadSheetFromRust: (date: DateString) => Promise<DailySheet>;
  createSheetIfNotExists: (date: DateString) => DailySheet;
  updateMainGoal: (date: DateString, goal: string) => void;
  updateBottomMemo: (date: DateString, index: 0 | 1 | 2 | 3 | 4 | 5, content: string) => void;
  setBottomMemoLabels: (date: DateString, labels: [string, string, string, string, string, string]) => void;
  setCompletionStamp: (date: DateString, stamp: string | null) => void;
  addTask: (date: DateString, title: string, subjectId: EntityId) => PlannerTask;
  updateTask: (date: DateString, taskId: EntityId, updates: Partial<Omit<PlannerTask, 'id' | 'date'>>) => void;
  toggleTask: (date: DateString, taskId: EntityId) => void;
  deleteTask: (date: DateString, taskId: EntityId) => void;
  rolloverUnfinishedTasks: (targetDate: DateString) => void;
  paintCell: (
    date: DateString,
    hour: HourValue,
    tenMinIndex: TenMinuteIndex,
    subjectId: EntityId | null,
    taskId?: EntityId | null,
    fillRatio?: number,
    isPlanMode?: boolean,
    isVerifiedTimer?: boolean
  ) => void;
  paintRange: (
    date: DateString,
    cells: Array<{ hour: HourValue; tenMinIndex: TenMinuteIndex }>,
    subjectId: EntityId | null,
    taskId?: EntityId | null,
    isPlanMode?: boolean,
    isVerifiedTimer?: boolean
  ) => void;
  eraseCell: (date: DateString, hour: HourValue, tenMinIndex: TenMinuteIndex, isPlanMode?: boolean) => void;
  calculateTotalMinutes: (date: DateString) => number;
  getPlanFulfillmentRate: (date: DateString) => {
    plannedMinutes: number;
    actualMinutes: number;
    matchedMinutes: number;
    ratePercent: number;
  };
}

export type PlannerStore = PlannerStoreState & PlannerStoreActions;

export function createEmptyDailySheet(date: DateString): DailySheet {
  const timeGrid: Record<GridCellKey, TimeBlock> = {} as Record<GridCellKey, TimeBlock>;

  for (let h = 0; h < 24; h++) {
    for (let t = 0; t < 6; t++) {
      const key = buildGridCellKey(h as HourValue, t as TenMinuteIndex);
      timeGrid[key] = {
        hour: h as HourValue,
        tenMinIndex: t as TenMinuteIndex,
        subjectId: null,
        plannedSubjectId: null,
        actualSubjectId: null,
        taskId: null,
        fillRatio: 0.0,
        isVerifiedTimer: false,
      };
    }
  }

  return {
    date,
    mainGoal: '',
    totalMinutesStudied: 0,
    tasks: [],
    timeGrid,
    bottomMemos: ['', '', '', '', '', ''],
    memoLabels: null,
    completionStamp: null,
  };
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null;
function scheduleSaveToRust(sheet: DailySheet) {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    tauriApi.saveDailySheet(sheet);
  }, 250);
}

export const usePlannerStore = create<PlannerStore>()(
  persist(
    (set, get) => ({
      currentDate: toDateString(new Date()),
      dailySheets: {},
      isLoading: false,
      error: null,

      setCurrentDate: (date: DateString) => {
        set({ currentDate: date });
        get().createSheetIfNotExists(date);
        get().loadSheetFromRust(date);
        get().rolloverUnfinishedTasks(date);
      },

      loadSheetFromRust: async (date: DateString): Promise<DailySheet> => {
        const rustSheet = await tauriApi.loadDailySheet(date);
        if (rustSheet) {
          set((prev) => ({
            dailySheets: {
              ...prev.dailySheets,
              [date]: rustSheet,
            },
          }));
          return rustSheet;
        }
        return get().createSheetIfNotExists(date);
      },

      createSheetIfNotExists: (date: DateString): DailySheet => {
        const current = get().dailySheets[date];
        if (current) return current;

        const newSheet = createEmptyDailySheet(date);
        set((prev) => ({
          dailySheets: {
            ...prev.dailySheets,
            [date]: newSheet,
          },
        }));
        scheduleSaveToRust(newSheet);
        get().rolloverUnfinishedTasks(date);
        return newSheet;
      },

      updateMainGoal: (date: DateString, goal: string) => {
        set((prev) => {
          const sheet = prev.dailySheets[date] ?? createEmptyDailySheet(date);
          const updated = { ...sheet, mainGoal: goal };
          scheduleSaveToRust(updated);
          return {
            dailySheets: {
              ...prev.dailySheets,
              [date]: updated,
            },
          };
        });
      },

      updateBottomMemo: (date: DateString, index: 0 | 1 | 2 | 3 | 4 | 5, content: string) => {
        set((prev) => {
          const sheet = prev.dailySheets[date] ?? createEmptyDailySheet(date);
          const updatedMemos = [...sheet.bottomMemos] as [string, string, string, string, string, string];
          updatedMemos[index] = content;
          const updated = { ...sheet, bottomMemos: updatedMemos };
          scheduleSaveToRust(updated);
          return {
            dailySheets: {
              ...prev.dailySheets,
              [date]: updated,
            },
          };
        });
      },

      setBottomMemoLabels: (date: DateString, labels: [string, string, string, string, string, string]) => {
        set((prev) => {
          const sheet = prev.dailySheets[date] ?? createEmptyDailySheet(date);
          const updated = { ...sheet, memoLabels: labels };
          scheduleSaveToRust(updated);
          return {
            dailySheets: {
              ...prev.dailySheets,
              [date]: updated,
            },
          };
        });
      },

      setCompletionStamp: (date: DateString, stamp: string | null) => {
        set((prev) => {
          const sheet = prev.dailySheets[date] ?? createEmptyDailySheet(date);
          const updated = { ...sheet, completionStamp: stamp };
          scheduleSaveToRust(updated);
          return {
            dailySheets: {
              ...prev.dailySheets,
              [date]: updated,
            },
          };
        });
      },

      addTask: (date: DateString, title: string, subjectId: EntityId): PlannerTask => {
        const sheet = get().dailySheets[date] ?? createEmptyDailySheet(date);
        const newTask: PlannerTask = {
          id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}` as EntityId,
          date,
          subjectId,
          title: title.trim(),
          isCompleted: false,
          order: sheet.tasks.length,
          isRolledOver: null,
          originalDate: null,
          originalTaskId: null,
        };

        set((prev) => {
          const currentSheet = prev.dailySheets[date] ?? createEmptyDailySheet(date);
          const updated = {
            ...currentSheet,
            tasks: [...currentSheet.tasks, newTask],
          };
          scheduleSaveToRust(updated);
          return {
            dailySheets: {
              ...prev.dailySheets,
              [date]: updated,
            },
          };
        });

        return newTask;
      },

      updateTask: (date: DateString, taskId: EntityId, updates: Partial<Omit<PlannerTask, 'id' | 'date'>>) => {
        set((prev) => {
          const sheet = prev.dailySheets[date];
          if (!sheet) return prev;

          const updatedTasks = sheet.tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t));
          const updated = { ...sheet, tasks: updatedTasks };
          scheduleSaveToRust(updated);
          return {
            dailySheets: {
              ...prev.dailySheets,
              [date]: updated,
            },
          };
        });
      },

      toggleTask: (date: DateString, taskId: EntityId) => {
        set((prev) => {
          const sheet = prev.dailySheets[date];
          if (!sheet) return prev;

          const targetTask = sheet.tasks.find((t) => t.id === taskId);
          const updatedTasks = sheet.tasks.map((t) =>
            t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t
          );
          const updated = { ...sheet, tasks: updatedTasks };
          scheduleSaveToRust(updated);

          const newDailySheets = { ...prev.dailySheets, [date]: updated };
          if (targetTask?.originalTaskId && targetTask?.originalDate) {
            const origSheet = newDailySheets[targetTask.originalDate];
            if (origSheet) {
              const origTasks = origSheet.tasks.map((ot) =>
                ot.id === targetTask.originalTaskId ? { ...ot, isCompleted: !targetTask.isCompleted } : ot
              );
              const updatedOrigSheet = { ...origSheet, tasks: origTasks };
              newDailySheets[targetTask.originalDate] = updatedOrigSheet;
              scheduleSaveToRust(updatedOrigSheet);
            }
          }

          return {
            dailySheets: newDailySheets,
          };
        });
      },

      deleteTask: (date: DateString, taskId: EntityId) => {
        set((prev) => {
          const sheet = prev.dailySheets[date];
          if (!sheet) return prev;

          const filteredTasks = sheet.tasks
            .filter((t) => t.id !== taskId)
            .map((t, idx) => ({ ...t, order: idx }));

          const updated = { ...sheet, tasks: filteredTasks };
          scheduleSaveToRust(updated);
          return {
            dailySheets: {
              ...prev.dailySheets,
              [date]: updated,
            },
          };
        });
      },

      rolloverUnfinishedTasks: (targetDate: DateString) => {
        const state = get();
        const targetSheet = state.dailySheets[targetDate] ?? createEmptyDailySheet(targetDate);

        const targetDateObj = parseDateString(targetDate);
        const prevDateObj = new Date(targetDateObj);
        prevDateObj.setDate(prevDateObj.getDate() - 1);
        const prevDateStr = toDateString(prevDateObj);

        const prevSheet = state.dailySheets[prevDateStr];
        if (!prevSheet || !prevSheet.tasks || prevSheet.tasks.length === 0) return;

        const unfinishedTasks = prevSheet.tasks.filter((t) => !t.isCompleted);
        if (unfinishedTasks.length === 0) return;

        const newTasksToAdd: PlannerTask[] = [];

        unfinishedTasks.forEach((oldTask) => {
          const alreadyForwarded = targetSheet.tasks.some(
            (t) => t.originalTaskId === oldTask.id || (t.isRolledOver && t.title === oldTask.title)
          );

          if (!alreadyForwarded) {
            newTasksToAdd.push({
              id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}` as EntityId,
              date: targetDate,
              subjectId: oldTask.subjectId,
              title: oldTask.title,
              isCompleted: false,
              order: targetSheet.tasks.length + newTasksToAdd.length,
              isRolledOver: true,
              originalDate: oldTask.originalDate || oldTask.date,
              originalTaskId: oldTask.originalTaskId || oldTask.id,
            });
          }
        });

        if (newTasksToAdd.length > 0) {
          const updatedSheet = {
            ...targetSheet,
            tasks: [...targetSheet.tasks, ...newTasksToAdd],
          };

          set((prev) => ({
            dailySheets: {
              ...prev.dailySheets,
              [targetDate]: updatedSheet,
            },
          }));
          scheduleSaveToRust(updatedSheet);
        }
      },

      paintCell: (
        date: DateString,
        hour: HourValue,
        tenMinIndex: TenMinuteIndex,
        subjectId: EntityId | null,
        taskId?: EntityId | null,
        fillRatio = 1.0,
        isPlanMode = false,
        isVerifiedTimer = false
      ) => {
        const key = buildGridCellKey(hour, tenMinIndex);

        set((prev) => {
          const sheet = prev.dailySheets[date] ?? createEmptyDailySheet(date);
          const currentCell = sheet.timeGrid[key];

          const updatedCell: TimeBlock = {
            hour,
            tenMinIndex,
            subjectId: isPlanMode ? (currentCell?.subjectId ?? null) : subjectId,
            actualSubjectId: isPlanMode ? (currentCell?.actualSubjectId ?? null) : subjectId,
            plannedSubjectId: isPlanMode ? subjectId : (currentCell?.plannedSubjectId ?? null),
            taskId: taskId ?? currentCell?.taskId ?? null,
            fillRatio: isPlanMode
              ? (currentCell?.fillRatio ?? 0.0)
              : subjectId === null
              ? 0.0
              : fillRatio,
            isVerifiedTimer: isPlanMode ? (currentCell?.isVerifiedTimer ?? null) : (isVerifiedTimer ?? null),
          };

          const newTimeGrid = {
            ...sheet.timeGrid,
            [key]: updatedCell,
          };

          let totalMinutes = 0;
          Object.values(newTimeGrid).forEach((cell) => {
            if (cell.subjectId !== null) {
              totalMinutes += Math.round(10 * (cell.fillRatio ?? 1.0));
            }
          });

          const updatedSheet = {
            ...sheet,
            timeGrid: newTimeGrid,
            totalMinutesStudied: totalMinutes,
          };

          scheduleSaveToRust(updatedSheet);

          return {
            dailySheets: {
              ...prev.dailySheets,
              [date]: updatedSheet,
            },
          };
        });
      },

      paintRange: (
        date: DateString,
        cells: Array<{ hour: HourValue; tenMinIndex: TenMinuteIndex }>,
        subjectId: EntityId | null,
        taskId?: EntityId | null,
        isPlanMode = false,
        isVerifiedTimer = false
      ) => {
        set((prev) => {
          const sheet = prev.dailySheets[date] ?? createEmptyDailySheet(date);
          const newTimeGrid = { ...sheet.timeGrid };

          cells.forEach(({ hour, tenMinIndex }) => {
            const key = buildGridCellKey(hour, tenMinIndex);
            const currentCell = newTimeGrid[key];

            newTimeGrid[key] = {
              hour,
              tenMinIndex,
              subjectId: isPlanMode ? (currentCell?.subjectId ?? null) : subjectId,
              actualSubjectId: isPlanMode ? (currentCell?.actualSubjectId ?? null) : subjectId,
              plannedSubjectId: isPlanMode ? subjectId : (currentCell?.plannedSubjectId ?? null),
              taskId: taskId ?? currentCell?.taskId ?? null,
              fillRatio: isPlanMode
                ? (currentCell?.fillRatio ?? 0.0)
                : subjectId === null
                ? 0.0
                : 1.0,
              isVerifiedTimer: isPlanMode ? (currentCell?.isVerifiedTimer ?? null) : (isVerifiedTimer ?? null),
            };
          });

          let totalMinutes = 0;
          Object.values(newTimeGrid).forEach((cell) => {
            if (cell.subjectId !== null) {
              totalMinutes += Math.round(10 * (cell.fillRatio ?? 1.0));
            }
          });

          const updatedSheet = {
            ...sheet,
            timeGrid: newTimeGrid,
            totalMinutesStudied: totalMinutes,
          };

          scheduleSaveToRust(updatedSheet);

          return {
            dailySheets: {
              ...prev.dailySheets,
              [date]: updatedSheet,
            },
          };
        });
      },

      eraseCell: (date: DateString, hour: HourValue, tenMinIndex: TenMinuteIndex, isPlanMode = false) => {
        get().paintCell(date, hour, tenMinIndex, null, null, 0.0, isPlanMode, false);
      },

      calculateTotalMinutes: (date: DateString): number => {
        const sheet = get().dailySheets[date];
        if (!sheet) return 0;
        return sheet.totalMinutesStudied;
      },

      getPlanFulfillmentRate: (date: DateString) => {
        const sheet = get().dailySheets[date];
        if (!sheet || !sheet.timeGrid) {
          return { plannedMinutes: 0, actualMinutes: 0, matchedMinutes: 0, ratePercent: 0 };
        }

        let plannedBlocks = 0;
        let actualBlocks = 0;
        let matchedBlocks = 0;

        Object.values(sheet.timeGrid).forEach((cell) => {
          const hasPlan = Boolean(cell.plannedSubjectId);
          const hasActual = Boolean(cell.subjectId);

          if (hasPlan) plannedBlocks++;
          if (hasActual) actualBlocks++;
          if (hasPlan && hasActual && cell.plannedSubjectId === cell.subjectId) {
            matchedBlocks++;
          }
        });

        const plannedMinutes = plannedBlocks * 10;
        const actualMinutes = actualBlocks * 10;
        const matchedMinutes = matchedBlocks * 10;
        const ratePercent = plannedBlocks > 0 ? Math.round((matchedBlocks / plannedBlocks) * 100) : 0;

        return { plannedMinutes, actualMinutes, matchedMinutes, ratePercent };
      },
    }),
    {
      name: 'korean_planner_daily_sheets',
      partialize: (state) => ({
        dailySheets: state.dailySheets,
      }),
    }
  )
);

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
    fillRatio?: number
  ) => void;
  paintRange: (
    date: DateString,
    cells: Array<{ hour: HourValue; tenMinIndex: TenMinuteIndex }>,
    subjectId: EntityId | null,
    taskId?: EntityId | null
  ) => void;
  eraseCell: (date: DateString, hour: HourValue, tenMinIndex: TenMinuteIndex) => void;
  calculateTotalMinutes: (date: DateString) => number;
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
        taskId: null,
        fillRatio: 0.0,
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
          get().rolloverUnfinishedTasks(date);
          return rustSheet;
        }
        return get().createSheetIfNotExists(date);
      },

      rolloverUnfinishedTasks: (targetDate: DateString) => {
        const state = get();
        const currentSheet = state.dailySheets[targetDate];
        if (!currentSheet) return;

        const targetTime = parseDateString(targetDate).getTime();
        const pastDates = Object.keys(state.dailySheets)
          .filter((d) => {
            const time = parseDateString(d as DateString).getTime();
            return time < targetTime;
          })
          .sort((a, b) => parseDateString(b as DateString).getTime() - parseDateString(a as DateString).getTime());

        if (pastDates.length === 0) return;

        let hasNewRollovers = false;
        const newTasks: PlannerTask[] = [...currentSheet.tasks];

        pastDates.forEach((pastDateKey) => {
          const pastSheet = state.dailySheets[pastDateKey];
          if (!pastSheet || !pastSheet.tasks) return;

          pastSheet.tasks.forEach((pastTask) => {
            if (!pastTask.isCompleted) {
              const alreadyPresent = newTasks.some(
                (t) =>
                  t.originalTaskId === pastTask.id ||
                  (t.title === pastTask.title && t.subjectId === pastTask.subjectId)
              );

              if (!alreadyPresent) {
                hasNewRollovers = true;
                newTasks.push({
                  id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}` as EntityId,
                  date: targetDate,
                  subjectId: pastTask.subjectId,
                  title: pastTask.title,
                  isCompleted: false,
                  order: newTasks.length,
                  isRolledOver: true,
                  originalDate: pastTask.originalDate ?? (pastDateKey as DateString),
                  originalTaskId: pastTask.id,
                });
              }
            }
          });
        });

        if (hasNewRollovers) {
          const updatedSheet: DailySheet = {
            ...currentSheet,
            tasks: newTasks,
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

      createSheetIfNotExists: (date: DateString): DailySheet => {
        const state = get();
        if (state.dailySheets[date]) {
          get().rolloverUnfinishedTasks(date);
          return state.dailySheets[date];
        }

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

      addTask: (date: DateString, title: string, subjectId: EntityId): PlannerTask => {
        const sheet = get().dailySheets[date] ?? createEmptyDailySheet(date);
        const newTask: PlannerTask = {
          id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}` as EntityId,
          date,
          subjectId,
          title: title.trim(),
          isCompleted: false,
          order: sheet.tasks.length,
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
          if (targetTask?.originalTaskId && targetTask?.originalDate && newDailySheets[targetTask.originalDate]) {
            const origSheet = newDailySheets[targetTask.originalDate];
            const origTasks = origSheet.tasks.map((ot) =>
              ot.id === targetTask.originalTaskId ? { ...ot, isCompleted: !targetTask.isCompleted } : ot
            );
            const updatedOrigSheet = { ...origSheet, tasks: origTasks };
            newDailySheets[targetTask.originalDate] = updatedOrigSheet;
            scheduleSaveToRust(updatedOrigSheet);
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

      paintCell: (
        date: DateString,
        hour: HourValue,
        tenMinIndex: TenMinuteIndex,
        subjectId: EntityId | null,
        taskId?: EntityId | null,
        fillRatio = 1.0
      ) => {
        const key = buildGridCellKey(hour, tenMinIndex);

        set((prev) => {
          const sheet = prev.dailySheets[date] ?? createEmptyDailySheet(date);
          const currentCell = sheet.timeGrid[key];

          if (
            currentCell &&
            currentCell.subjectId === subjectId &&
            currentCell.taskId === taskId &&
            currentCell.fillRatio === fillRatio
          ) {
            return prev;
          }

          const updatedCell: TimeBlock = {
            hour,
            tenMinIndex,
            subjectId,
            taskId: taskId ?? null,
            fillRatio: subjectId === null ? 0.0 : fillRatio,
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
        taskId?: EntityId | null
      ) => {
        set((prev) => {
          const sheet = prev.dailySheets[date] ?? createEmptyDailySheet(date);
          const newTimeGrid = { ...sheet.timeGrid };

          cells.forEach(({ hour, tenMinIndex }) => {
            const key = buildGridCellKey(hour, tenMinIndex);
            newTimeGrid[key] = {
              hour,
              tenMinIndex,
              subjectId,
              taskId: taskId ?? null,
              fillRatio: subjectId === null ? 0.0 : 1.0,
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

      eraseCell: (date: DateString, hour: HourValue, tenMinIndex: TenMinuteIndex) => {
        get().paintCell(date, hour, tenMinIndex, null, null, 0.0);
      },

      calculateTotalMinutes: (date: DateString): number => {
        const sheet = get().dailySheets[date];
        if (!sheet) return 0;
        return sheet.totalMinutesStudied;
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

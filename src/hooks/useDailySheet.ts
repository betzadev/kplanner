import { useMemo } from 'react';
import { DateString, DailySheet, PlannerTask, EntityId } from '../types';
import { usePlannerStore } from '../store/usePlannerStore';

export interface UseDailySheetReturn {
  sheet: DailySheet;
  tasks: PlannerTask[];
  mainGoal: string;
  totalMinutes: number;
  bottomMemos: [string, string, string, string, string, string];
  updateMainGoal: (goal: string) => void;
  updateBottomMemo: (index: 0 | 1 | 2 | 3 | 4 | 5, content: string) => void;
  addTask: (title: string, subjectId: EntityId) => PlannerTask;
  toggleTask: (taskId: EntityId) => void;
  deleteTask: (taskId: EntityId) => void;
}

export function useDailySheet(date: DateString): UseDailySheetReturn {
  const sheet = usePlannerStore((state) => state.dailySheets[date] ?? state.createSheetIfNotExists(date));
  const updateMainGoal = usePlannerStore((state) => state.updateMainGoal);
  const updateBottomMemo = usePlannerStore((state) => state.updateBottomMemo);
  const addTask = usePlannerStore((state) => state.addTask);
  const toggleTask = usePlannerStore((state) => state.toggleTask);
  const deleteTask = usePlannerStore((state) => state.deleteTask);

  return useMemo(
    () => ({
      sheet,
      tasks: sheet.tasks,
      mainGoal: sheet.mainGoal,
      totalMinutes: sheet.totalMinutesStudied,
      bottomMemos: sheet.bottomMemos,
      updateMainGoal: (goal: string) => updateMainGoal(date, goal),
      updateBottomMemo: (index, content) => updateBottomMemo(date, index, content),
      addTask: (title, subjectId) => addTask(date, title, subjectId),
      toggleTask: (taskId) => toggleTask(date, taskId),
      deleteTask: (taskId) => deleteTask(date, taskId),
    }),
    [sheet, date, updateMainGoal, updateBottomMemo, addTask, toggleTask, deleteTask]
  );
}

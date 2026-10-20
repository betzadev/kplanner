import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DateString, EntityId, GridCellKey, HourValue, TenMinuteIndex } from '../types';
import { usePlannerStore } from './usePlannerStore';
import { toDateString } from '../utils/timeSlotMapper';

export interface RoutineTemplate {
  id: string;
  name: string;
  planBlocks: Record<string, EntityId>;
  createdAt: number;
}

interface RoutineState {
  templates: RoutineTemplate[];
  saveTemplate: (name: string, planBlocks: Record<GridCellKey, EntityId>) => void;
  saveCurrentDayAsTemplate: (name: string, date: DateString) => boolean;
  deleteTemplate: (id: string) => void;
  applyTemplateToDate: (templateId: string, date: DateString) => void;
  applyTemplateToWeek: (templateId: string, startDate: DateString, includeWeekends: boolean) => void;
}

export const useRoutineStore = create<RoutineState>()(
  persist(
    (set, get) => ({
      templates: [
        {
          id: 'routine_default_college',
          name: 'Weekday College Blueprint',
          planBlocks: {} as Record<GridCellKey, EntityId>,
          createdAt: Date.now(),
        },
      ],
      saveTemplate: (name, planBlocks) => {
        const newTemplate: RoutineTemplate = {
          id: `routine_${Date.now()}`,
          name: name.trim() || 'Custom Routine',
          planBlocks,
          createdAt: Date.now(),
        };
        set((state) => ({ templates: [...state.templates, newTemplate] }));
      },
      saveCurrentDayAsTemplate: (name, date) => {
        const plannerStore = usePlannerStore.getState();
        const sheet = plannerStore.dailySheets[date];
        if (!sheet || !sheet.timeGrid) return false;

        const planBlocks: Record<string, EntityId> = {};
        Object.entries(sheet.timeGrid).forEach(([key, cell]) => {
          if (cell.plannedSubjectId) {
            planBlocks[key as GridCellKey] = cell.plannedSubjectId;
          }
        });

        if (Object.keys(planBlocks).length === 0) {
          return false;
        }

        get().saveTemplate(name, planBlocks);
        return true;
      },
      deleteTemplate: (id) => {
        set((state) => ({ templates: state.templates.filter((t) => t.id !== id) }));
      },
      applyTemplateToDate: (templateId, date) => {
        const template = get().templates.find((t) => t.id === templateId);
        if (!template || Object.keys(template.planBlocks).length === 0) return;
        const plannerStore = usePlannerStore.getState();

        // Group cells by subjectId to batch paint
        const subjectCellsMap = new Map<EntityId, Array<{ hour: HourValue; tenMinIndex: TenMinuteIndex }>>();
        Object.entries(template.planBlocks).forEach(([key, subjectId]) => {
          const [hStr, tStr] = key.split('-');
          const hour = parseInt(hStr, 10) as HourValue;
          const tenMinIndex = parseInt(tStr, 10) as TenMinuteIndex;
          if (!subjectCellsMap.has(subjectId)) {
            subjectCellsMap.set(subjectId, []);
          }
          subjectCellsMap.get(subjectId)!.push({ hour, tenMinIndex });
        });

        subjectCellsMap.forEach((cells, subjectId) => {
          plannerStore.paintRange(date, cells, subjectId, null, true, false);
        });
      },
      applyTemplateToWeek: (templateId, startDate, includeWeekends) => {
        const cur = new Date(startDate + 'T00:00:00');
        for (let i = 0; i < 7; i++) {
          const d = new Date(cur);
          d.setDate(cur.getDate() + i);
          const dayOfWeek = d.getDay(); // 0 is Sunday, 6 is Saturday
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          if (includeWeekends || !isWeekend) {
            get().applyTemplateToDate(templateId, toDateString(d));
          }
        }
      },
    }),
    {
      name: 'korean_planner_routines',
    }
  )
);

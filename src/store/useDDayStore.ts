import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DDayEvent, EntityId, HexColor } from '../types';
import { tauriApi } from '../services/tauriApi';

interface DDayState {
  events: DDayEvent[];
  initFromRust: () => Promise<void>;
  addEvent: (title: string, targetDate: string, colorId: HexColor, isPinned?: boolean) => DDayEvent;
  updateEvent: (id: EntityId, updates: Partial<Omit<DDayEvent, 'id'>>) => void;
  deleteEvent: (id: EntityId) => void;
  togglePin: (id: EntityId) => void;
}

export function calculateDDay(targetDateStr: string, currentDateStr: string): {
  label: string;
  daysDiff: number;
  isToday: boolean;
  isPast: boolean;
} {
  const target = new Date(targetDateStr + 'T00:00:00');
  const current = new Date(currentDateStr + 'T00:00:00');

  const diffTime = target.getTime() - current.getTime();
  const daysDiff = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (daysDiff === 0) {
    return { label: 'D-Day', daysDiff: 0, isToday: true, isPast: false };
  } else if (daysDiff > 0) {
    return { label: `D-${daysDiff}`, daysDiff, isToday: false, isPast: false };
  } else {
    return { label: `D+${Math.abs(daysDiff)}`, daysDiff, isToday: false, isPast: true };
  }
}

export const useDDayStore = create<DDayState>()(
  persist(
    (set) => ({
      events: [
        {
          id: 'dday_exam' as EntityId,
          title: 'Final Exams',
          targetDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
          colorId: '#9FC6FC',
          isPinned: true,
        },
      ],

      initFromRust: async () => {
        const events = await tauriApi.loadDDayEvents();
        if (events && events.length > 0) {
          set({ events });
        }
      },

      addEvent: (title, targetDate, colorId, isPinned = true) => {
        const newEvent: DDayEvent = {
          id: `dday_${Date.now()}` as EntityId,
          title: title.trim(),
          targetDate,
          colorId,
          isPinned,
        };
        set((state) => {
          const updated = [...state.events, newEvent];
          tauriApi.saveDDayEvents(updated);
          return { events: updated };
        });
        return newEvent;
      },

      updateEvent: (id, updates) => {
        set((state) => {
          const updated = state.events.map((ev) => (ev.id === id ? { ...ev, ...updates } : ev));
          tauriApi.saveDDayEvents(updated);
          return { events: updated };
        });
      },

      deleteEvent: (id) => {
        set((state) => {
          const updated = state.events.filter((ev) => ev.id !== id);
          tauriApi.saveDDayEvents(updated);
          return { events: updated };
        });
      },

      togglePin: (id) => {
        set((state) => {
          const updated = state.events.map((ev) =>
            ev.id === id ? { ...ev, isPinned: !ev.isPinned } : ev
          );
          tauriApi.saveDDayEvents(updated);
          return { events: updated };
        });
      },
    }),
    {
      name: 'kplanner_dday_storage',
    }
  )
);

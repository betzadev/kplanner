import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { EntityId, HexColor, SubjectLegendItem, DEFAULT_PASTEL_PALETTE } from '../types';
import { tauriApi } from '../services/tauriApi';

export interface SubjectStoreState {
  subjects: SubjectLegendItem[];
  selectedSubjectId: EntityId | null;
}

export interface SubjectStoreActions {
  initFromRust: () => Promise<void>;
  addSubject: (name: string, color: HexColor) => SubjectLegendItem;
  updateSubject: (id: EntityId, updates: Partial<Omit<SubjectLegendItem, 'id' | 'slotIndex'>>) => void;
  deleteSubject: (id: EntityId) => void;
  selectSubject: (id: EntityId | null) => void;
  reorderSubjects: (subjectIds: EntityId[]) => void;
  resetToDefaults: () => void;
}

export type SubjectStore = SubjectStoreState & SubjectStoreActions;

export const INITIAL_DEFAULT_SUBJECTS: SubjectLegendItem[] = [
  { id: 'subj_korean' as EntityId, name: 'Korean Language', color: DEFAULT_PASTEL_PALETTE[0] as HexColor, slotIndex: 0 },
  { id: 'subj_math' as EntityId, name: 'Mathematics', color: DEFAULT_PASTEL_PALETTE[1] as HexColor, slotIndex: 1 },
  { id: 'subj_english' as EntityId, name: 'English Literature', color: DEFAULT_PASTEL_PALETTE[2] as HexColor, slotIndex: 2 },
  { id: 'subj_science' as EntityId, name: 'Natural Science', color: DEFAULT_PASTEL_PALETTE[3] as HexColor, slotIndex: 3 },
  { id: 'subj_history' as EntityId, name: 'World History', color: DEFAULT_PASTEL_PALETTE[4] as HexColor, slotIndex: 4 },
  { id: 'subj_cs' as EntityId, name: 'Computer Science', color: DEFAULT_PASTEL_PALETTE[5] as HexColor, slotIndex: 5 },
  { id: 'subj_reading' as EntityId, name: 'General Reading', color: DEFAULT_PASTEL_PALETTE[6] as HexColor, slotIndex: 6 },
  { id: 'subj_review' as EntityId, name: 'Exam Review', color: DEFAULT_PASTEL_PALETTE[7] as HexColor, slotIndex: 7 },
];

export const useSubjectStore = create<SubjectStore>()(
  persist(
    (set, get) => ({
      subjects: INITIAL_DEFAULT_SUBJECTS,
      selectedSubjectId: INITIAL_DEFAULT_SUBJECTS[0].id,

      initFromRust: async () => {
        const loaded = await tauriApi.loadSubjects();
        if (loaded && loaded.length > 0) {
          set({ subjects: loaded });
        }
      },

      addSubject: (name: string, color: HexColor): SubjectLegendItem => {
        const current = get().subjects;
        if (current.length >= 8) {
          throw new Error('Maximum of 8 subjects allowed in Korean Planner Legend');
        }

        const newSubject: SubjectLegendItem = {
          id: `subj_${Date.now()}` as EntityId,
          name: name.trim(),
          color,
          slotIndex: current.length,
        };

        const updated = [...current, newSubject];
        set({ subjects: updated });
        tauriApi.saveSubjects(updated);
        return newSubject;
      },

      updateSubject: (id: EntityId, updates: Partial<Omit<SubjectLegendItem, 'id' | 'slotIndex'>>) => {
        set((state) => {
          const updated = state.subjects.map((sub) => (sub.id === id ? { ...sub, ...updates } : sub));
          tauriApi.saveSubjects(updated);
          return { subjects: updated };
        });
      },

      deleteSubject: (id: EntityId) => {
        set((state) => {
          const filtered = state.subjects.filter((s) => s.id !== id);
          const reIndexed = filtered.map((sub, idx) => ({ ...sub, slotIndex: idx }));
          const nextSelected =
            state.selectedSubjectId === id ? (reIndexed[0]?.id ?? null) : state.selectedSubjectId;

          tauriApi.saveSubjects(reIndexed);
          return {
            subjects: reIndexed,
            selectedSubjectId: nextSelected,
          };
        });
      },

      selectSubject: (id: EntityId | null) => {
        set({ selectedSubjectId: id });
      },

      reorderSubjects: (subjectIds: EntityId[]) => {
        set((state) => {
          const map = new Map(state.subjects.map((s) => [s.id, s]));
          const reordered: SubjectLegendItem[] = [];

          subjectIds.forEach((id, idx) => {
            const item = map.get(id);
            if (item) {
              reordered.push({ ...item, slotIndex: idx });
            }
          });

          tauriApi.saveSubjects(reordered);
          return { subjects: reordered };
        });
      },

      resetToDefaults: () => {
        set({
          subjects: INITIAL_DEFAULT_SUBJECTS,
          selectedSubjectId: INITIAL_DEFAULT_SUBJECTS[0].id,
        });
        tauriApi.saveSubjects(INITIAL_DEFAULT_SUBJECTS);
      },
    }),
    {
      name: 'korean_planner_subjects',
    }
  )
);

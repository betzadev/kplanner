import { useMemo } from 'react';
import { DateString, EntityId } from '../types';
import { usePlannerStore } from '../store/usePlannerStore';
import { useSubjectStore } from '../store/useSubjectStore';

export interface SubjectDurationBreakdown {
  subjectId: EntityId;
  subjectName: string;
  color: string;
  minutes: number;
  percentage: number;
}

export function useTotalTimeCalculator(date: DateString) {
  const sheet = usePlannerStore((state) => state.dailySheets[date]);
  const subjects = useSubjectStore((state) => state.subjects);

  return useMemo(() => {
    if (!sheet) {
      return { totalMinutes: 0, breakdown: [] };
    }

    const minutesMap = new Map<EntityId, number>();

    Object.values(sheet.timeGrid).forEach((cell) => {
      if (cell.subjectId) {
        const current = minutesMap.get(cell.subjectId) ?? 0;
        const cellMinutes = Math.round(10 * (cell.fillRatio ?? 1.0));
        minutesMap.set(cell.subjectId, current + cellMinutes);
      }
    });

    const totalMinutes = sheet.totalMinutesStudied;
    const breakdown: SubjectDurationBreakdown[] = subjects
      .filter((s) => minutesMap.has(s.id))
      .map((s) => {
        const mins = minutesMap.get(s.id) ?? 0;
        return {
          subjectId: s.id,
          subjectName: s.name,
          color: s.color,
          minutes: mins,
          percentage: totalMinutes > 0 ? Math.round((mins / totalMinutes) * 100) : 0,
        };
      })
      .sort((a, b) => b.minutes - a.minutes);

    return { totalMinutes, breakdown };
  }, [sheet, subjects]);
}

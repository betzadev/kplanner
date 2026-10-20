import { useCallback } from 'react';
import { DateString, EntityId, HourValue, TenMinuteIndex, TimeBlock } from '../types';
import { usePlannerStore } from '../store/usePlannerStore';
import { buildGridCellKey } from '../utils/timeSlotMapper';

export interface UseTimeGridReturn {
  paintCell: (
    hour: HourValue,
    tenMinIndex: TenMinuteIndex,
    subjectId: EntityId | null,
    taskId?: EntityId | null,
    isPlanMode?: boolean,
    isVerifiedTimer?: boolean
  ) => void;
  paintRange: (
    cells: Array<{ hour: HourValue; tenMinIndex: TenMinuteIndex }>,
    subjectId: EntityId | null,
    taskId?: EntityId | null,
    isPlanMode?: boolean,
    isVerifiedTimer?: boolean
  ) => void;
  eraseCell: (hour: HourValue, tenMinIndex: TenMinuteIndex, isPlanMode?: boolean) => void;
  useCellState: (hour: HourValue, tenMinIndex: TenMinuteIndex) => TimeBlock | undefined;
}

export function useTimeGrid(date: DateString): UseTimeGridReturn {
  const paintCellStore = usePlannerStore((state) => state.paintCell);
  const paintRangeStore = usePlannerStore((state) => state.paintRange);
  const eraseCellStore = usePlannerStore((state) => state.eraseCell);

  const paintCell = useCallback(
    (
      hour: HourValue,
      tenMinIndex: TenMinuteIndex,
      subjectId: EntityId | null,
      taskId?: EntityId | null,
      isPlanMode = false,
      isVerifiedTimer = false
    ) => {
      paintCellStore(date, hour, tenMinIndex, subjectId, taskId, 1.0, isPlanMode, isVerifiedTimer);
    },
    [date, paintCellStore]
  );

  const paintRange = useCallback(
    (
      cells: Array<{ hour: HourValue; tenMinIndex: TenMinuteIndex }>,
      subjectId: EntityId | null,
      taskId?: EntityId | null,
      isPlanMode = false,
      isVerifiedTimer = false
    ) => {
      paintRangeStore(date, cells, subjectId, taskId, isPlanMode, isVerifiedTimer);
    },
    [date, paintRangeStore]
  );

  const eraseCell = useCallback(
    (hour: HourValue, tenMinIndex: TenMinuteIndex, isPlanMode = false) => {
      eraseCellStore(date, hour, tenMinIndex, isPlanMode);
    },
    [date, eraseCellStore]
  );

  const useCellState = (hour: HourValue, tenMinIndex: TenMinuteIndex): TimeBlock | undefined => {
    const cellKey = buildGridCellKey(hour, tenMinIndex);
    return usePlannerStore((state) => state.dailySheets[date]?.timeGrid[cellKey]);
  };

  return {
    paintCell,
    paintRange,
    eraseCell,
    useCellState,
  };
}

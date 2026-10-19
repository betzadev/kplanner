import {
  DateString,
  GridCellCoordinate,
  GridCellKey,
  HourValue,
  TenMinuteIndex,
  HexColor,
  DEFAULT_PASTEL_PALETTE,
} from '../types';

export function toDateString(date: Date = new Date()): DateString {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}` as DateString;
}

export function parseDateString(dateStr: DateString): Date {
  const parts = dateStr.split('-').map(Number);
  const year = parts[0] || new Date().getFullYear();
  const month = parts[1] || (new Date().getMonth() + 1);
  const day = parts[2] || new Date().getDate();
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

export function dateToBlockIndex(date: Date = new Date()): GridCellCoordinate {
  const hour = date.getHours() as HourValue;
  const minutes = date.getMinutes();
  const tenMinIndex = Math.min(Math.floor(minutes / 10), 5) as TenMinuteIndex;
  return { hour, tenMinIndex };
}

export function buildGridCellKey(hour: HourValue, tenMinIndex: TenMinuteIndex): GridCellKey {
  return `${hour}-${tenMinIndex}` as GridCellKey;
}

export function parseGridCellKey(key: GridCellKey): GridCellCoordinate {
  const [hStr, tStr] = key.split('-');
  return {
    hour: Number(hStr) as HourValue,
    tenMinIndex: Number(tStr) as TenMinuteIndex,
  };
}

export function coordinateToLinearIndex(coord: GridCellCoordinate): number {
  return coord.hour * 6 + coord.tenMinIndex;
}

export function linearIndexToCoordinate(index: number): GridCellCoordinate {
  const clamped = Math.max(0, Math.min(143, Math.floor(index)));
  const hour = Math.floor(clamped / 6) as HourValue;
  const tenMinIndex = (clamped % 6) as TenMinuteIndex;
  return { hour, tenMinIndex };
}

export function isCurrentBlock(hour: HourValue, tenMinIndex: TenMinuteIndex, now: Date = new Date()): boolean {
  const current = dateToBlockIndex(now);
  return current.hour === hour && current.tenMinIndex === tenMinIndex;
}

export function formatStudyDuration(minutes: number, format: 'korean' | 'digital' = 'korean'): string {
  const cleanMins = Math.max(0, Math.floor(minutes));
  const hours = Math.floor(cleanMins / 60);
  const remainingMins = cleanMins % 60;

  const hh = String(hours).padStart(2, '0');
  const mm = String(remainingMins).padStart(2, '0');

  if (format === 'digital') {
    return `${hh}:${mm}`;
  }
  return `${hh}H ${mm}M`;
}

export function formatTimerMs(ms: number): { hours: string; minutes: string; seconds: string } {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    hours: String(hours).padStart(2, '0'),
    minutes: String(minutes).padStart(2, '0'),
    seconds: String(seconds).padStart(2, '0'),
  };
}

export function generateDefaultPalette(): readonly HexColor[] {
  return DEFAULT_PASTEL_PALETTE;
}

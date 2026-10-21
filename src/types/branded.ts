/**
 * Branded Primitives & Types for Korean Study Planner consumers
 */
export type DateString = string & { readonly __brand: 'DateString' };
export type HexColor = string;
export type EntityId = string & { readonly __brand?: 'EntityId' };
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

// Explicit adapters for consumers
export const asEntityId = (s: string): EntityId => s as EntityId;
export const asDateString = (s: string): DateString => s as DateString;
export const asHourValue = (n: number): HourValue => n as HourValue;
export const asTenMinuteIndex = (n: number): TenMinuteIndex => n as TenMinuteIndex;
export const asGridCellKey = (hour: number, tenMinIndex: number): GridCellKey =>
  `${hour}-${tenMinIndex}` as GridCellKey;

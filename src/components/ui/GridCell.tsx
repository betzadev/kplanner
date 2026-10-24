import { memo } from 'react';
import { HourValue, TenMinuteIndex } from '../../types';

interface GridCellProps {
  hour: HourValue;
  tenMinIndex: TenMinuteIndex;
  color: string | null;
  plannedColor?: string | null;
  fillRatio?: number;
  isCurrent?: boolean;
  isPlanMode?: boolean;
  onMouseDown?: (hour: HourValue, tenMinIndex: TenMinuteIndex, e: React.MouseEvent) => void;
  onMouseEnter?: (hour: HourValue, tenMinIndex: TenMinuteIndex, e: React.MouseEvent) => void;
  onContextMenu?: (hour: HourValue, tenMinIndex: TenMinuteIndex, e: React.MouseEvent) => void;
}

const areEqual = (prev: GridCellProps, next: GridCellProps): boolean => {
  return (
    prev.color === next.color &&
    prev.plannedColor === next.plannedColor &&
    prev.fillRatio === next.fillRatio &&
    prev.isCurrent === next.isCurrent &&
    prev.isPlanMode === next.isPlanMode &&
    prev.hour === next.hour &&
    prev.tenMinIndex === next.tenMinIndex
  );
};

export const GridCell = memo(function GridCell({
  hour,
  tenMinIndex,
  color,
  plannedColor,
  fillRatio = 1.0,
  isCurrent = false,
  isPlanMode = false,
  onMouseDown,
  onMouseEnter,
  onContextMenu,
}: GridCellProps) {
  const widthPercent = Math.min(100, Math.max(0, fillRatio * 100));

  return (
    <div
      data-hour={hour}
      data-tenmin={tenMinIndex}
      onMouseDown={(e) => onMouseDown?.(hour, tenMinIndex, e)}
      onMouseEnter={(e) => onMouseEnter?.(hour, tenMinIndex, e)}
      onContextMenu={(e) => {
        if (onContextMenu) {
          e.preventDefault();
          onContextMenu(hour, tenMinIndex, e);
        }
      }}
      className={`relative h-[22px] sm:h-[19px] flex-1 min-w-[28px] sm:min-w-[26px] border-r border-b border-slate-200 dark:border-slate-800/80 select-none cursor-pointer transition-colors overflow-hidden ${
        isCurrent ? 'ring-1.5 ring-blue-500 ring-inset z-10' : ''
      }`}
      title={`${String(hour).padStart(2, '0')}:${tenMinIndex * 10} - ${
        tenMinIndex * 10 + 10
      }m ${color ? '• Actual Logged' : ''} ${plannedColor ? '• Planned' : ''}`}
      role="gridcell"
    >
      {/* Planned Subject Hatch / Border Indicator */}
      {plannedColor && (
        <div
          className={`absolute inset-0 pointer-events-none ${
            isPlanMode
              ? 'border-2 border-dashed'
              : 'border-l-2'
          }`}
          style={{
            borderColor: plannedColor,
            backgroundImage: isPlanMode
              ? `repeating-linear-gradient(45deg, ${plannedColor}40, ${plannedColor}40 4px, transparent 4px, transparent 8px)`
              : undefined,
          }}
        />
      )}

      {/* Actual Study Log Fill (Solid / Proportional) */}
      {color && !isPlanMode && (
        <div
          className="h-full pointer-events-none transition-all duration-75 ease-out"
          style={{
            backgroundColor: color,
            width: `${widthPercent}%`,
          }}
        />
      )}
    </div>
  );
}, areEqual);

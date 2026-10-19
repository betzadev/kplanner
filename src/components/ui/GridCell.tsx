import { memo } from 'react';
import { HourValue, TenMinuteIndex } from '../../types';

interface GridCellProps {
  hour: HourValue;
  tenMinIndex: TenMinuteIndex;
  color: string | null;
  fillRatio?: number;
  isCurrent?: boolean;
  onMouseDown?: (hour: HourValue, tenMinIndex: TenMinuteIndex, e: React.MouseEvent) => void;
  onMouseEnter?: (hour: HourValue, tenMinIndex: TenMinuteIndex, e: React.MouseEvent) => void;
}

const areEqual = (prev: GridCellProps, next: GridCellProps): boolean => {
  return (
    prev.color === next.color &&
    prev.fillRatio === next.fillRatio &&
    prev.isCurrent === next.isCurrent &&
    prev.hour === next.hour &&
    prev.tenMinIndex === next.tenMinIndex
  );
};

export const GridCell = memo(function GridCell({
  hour,
  tenMinIndex,
  color,
  fillRatio = 1.0,
  isCurrent = false,
  onMouseDown,
  onMouseEnter,
}: GridCellProps) {
  const widthPercent = Math.min(100, Math.max(0, fillRatio * 100));

  return (
    <div
      data-hour={hour}
      data-tenmin={tenMinIndex}
      onMouseDown={(e) => onMouseDown?.(hour, tenMinIndex, e)}
      onMouseEnter={(e) => onMouseEnter?.(hour, tenMinIndex, e)}
      className={`relative h-[20px] sm:h-[18px] flex-1 min-w-[28px] sm:min-w-[26px] border-r border-b border-slate-200 select-none cursor-pointer transition-colors ${
        isCurrent ? 'ring-1.5 ring-blue-500 ring-inset z-10' : ''
      }`}
      title={`${String(hour).padStart(2, '0')}:${tenMinIndex * 10} - ${tenMinIndex * 10 + 10}m`}
      role="gridcell"
    >
      {color && (
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

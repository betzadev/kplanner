import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { DateString, EntityId, HourValue, TenMinuteIndex } from '../../types';
import { GridCell } from '../ui/GridCell';
import { useTimeGrid } from '../../hooks/useTimeGrid';
import { useSubjectStore } from '../../store/useSubjectStore';
import { isCurrentBlock, toDateString } from '../../utils/timeSlotMapper';
import { triggerHaptic } from '../../utils/haptics';
import { Paintbrush, Hand } from 'lucide-react';

interface TenMinGridProps {
  date: DateString;
  startHour?: HourValue;
}

export function TenMinGrid({ date, startHour: defaultStartHour = 6 }: TenMinGridProps) {
  const [startHour, setStartHour] = useState<HourValue>(defaultStartHour);
  const [touchMode, setTouchMode] = useState<'paint' | 'scroll'>('paint');
  const { paintCell, paintRange, useCellState } = useTimeGrid(date);
  const subjects = useSubjectStore((state) => state.subjects);
  const selectedSubjectId = useSubjectStore((state) => state.selectedSubjectId);

  // Gesture state
  const isInteractingRef = useRef(false);
  const dragModeRef = useRef<'paint' | 'erase'>('paint');
  const draggedCellsRef = useRef<Map<string, { hour: HourValue; tenMinIndex: TenMinuteIndex }>>(new Map());
  const gridContainerRef = useRef<HTMLDivElement>(null);

  const subjectColorMap = useMemo(() => {
    return new Map<EntityId, string>(subjects.map((s) => [s.id, s.color]));
  }, [subjects]);

  const isToday = useMemo(() => {
    return date === toDateString(new Date());
  }, [date]);

  const hours = useMemo(() => {
    const list: HourValue[] = [];
    for (let i = 0; i < 24; i++) {
      list.push(((startHour + i) % 24) as HourValue);
    }
    return list;
  }, [startHour]);

  // Global mouse up to finalize mouse drags
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isInteractingRef.current) {
        isInteractingRef.current = false;
        if (draggedCellsRef.current.size > 0) {
          const cells = Array.from(draggedCellsRef.current.values());
          if (dragModeRef.current === 'erase') {
            paintRange(cells, null, null);
          } else if (selectedSubjectId) {
            paintRange(cells, selectedSubjectId, null);
          }
          draggedCellsRef.current.clear();
        }
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [paintRange, selectedSubjectId]);

  // Mouse interaction
  const handleCellMouseDown = useCallback(
    (hour: HourValue, tenMinIndex: TenMinuteIndex, currentSubjectId: EntityId | null | undefined) => {
      isInteractingRef.current = true;
      draggedCellsRef.current.clear();

      const key = `${hour}-${tenMinIndex}`;
      draggedCellsRef.current.set(key, { hour, tenMinIndex });

      if (currentSubjectId === selectedSubjectId && selectedSubjectId !== null) {
        dragModeRef.current = 'erase';
        paintCell(hour, tenMinIndex, null, null);
      } else {
        dragModeRef.current = 'paint';
        paintCell(hour, tenMinIndex, selectedSubjectId, null);
      }
      triggerHaptic('light');
    },
    [selectedSubjectId, paintCell]
  );

  const handleCellMouseEnter = useCallback(
    (hour: HourValue, tenMinIndex: TenMinuteIndex) => {
      if (!isInteractingRef.current) return;

      const key = `${hour}-${tenMinIndex}`;
      if (!draggedCellsRef.current.has(key)) {
        draggedCellsRef.current.set(key, { hour, tenMinIndex });
        if (dragModeRef.current === 'erase') {
          paintCell(hour, tenMinIndex, null, null);
        } else {
          paintCell(hour, tenMinIndex, selectedSubjectId, null);
        }
        triggerHaptic('light');
      }
    },
    [selectedSubjectId, paintCell]
  );

  // Mobile Touch handling
  const handleTouchStart = (e: React.TouchEvent) => {
    if (touchMode !== 'paint') return;

    const touch = e.touches[0];
    const elem = document.elementFromPoint(touch.clientX, touch.clientY);
    const cellElem = elem?.closest('[data-hour]') as HTMLElement | null;

    if (cellElem) {
      const h = Number(cellElem.dataset.hour) as HourValue;
      const t = Number(cellElem.dataset.tenmin) as TenMinuteIndex;

      isInteractingRef.current = true;
      draggedCellsRef.current.clear();

      const key = `${h}-${t}`;
      draggedCellsRef.current.set(key, { hour: h, tenMinIndex: t });

      paintCell(h, t, selectedSubjectId, null);
      triggerHaptic('medium');
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isInteractingRef.current || touchMode !== 'paint') return;

    // Prevent scrolling while actively painting
    if (e.cancelable) {
      e.preventDefault();
    }

    const touch = e.touches[0];
    const elem = document.elementFromPoint(touch.clientX, touch.clientY);
    const cellElem = elem?.closest('[data-hour]') as HTMLElement | null;

    if (cellElem) {
      const h = Number(cellElem.dataset.hour) as HourValue;
      const t = Number(cellElem.dataset.tenmin) as TenMinuteIndex;
      const key = `${h}-${t}`;

      if (!draggedCellsRef.current.has(key)) {
        draggedCellsRef.current.set(key, { hour: h, tenMinIndex: t });
        paintCell(h, t, selectedSubjectId, null);
        triggerHaptic('light');
      }
    }
  };

  const handleTouchEnd = () => {
    if (isInteractingRef.current) {
      isInteractingRef.current = false;
      if (draggedCellsRef.current.size > 0) {
        const cells = Array.from(draggedCellsRef.current.values());
        if (selectedSubjectId) {
          paintRange(cells, selectedSubjectId, null);
        }
        draggedCellsRef.current.clear();
        triggerHaptic('success');
      }
    }
  };

  return (
    <div className="bg-white border border-slate-300 rounded-lg p-2 sm:p-3 shadow-xs select-none w-full max-w-md mx-auto">
      {/* Mobile Top Controls Bar */}
      <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-200">
        <div>
          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
            10-Min Grid
          </span>
          <span className="text-[9px] text-slate-400">
            {selectedSubjectId ? 'Touch & drag to paint' : 'Select a subject first'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Touch Mode Toggle for Mobile Ergonomics */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-md border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setTouchMode('paint');
                triggerHaptic('light');
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition-all ${
                touchMode === 'paint'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Paint Mode: Drag across cells to fill"
            >
              <Paintbrush size={11} />
              <span>Paint</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTouchMode('scroll');
                triggerHaptic('light');
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition-all ${
                touchMode === 'scroll'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Scroll Mode: Scroll without painting"
            >
              <Hand size={11} />
              <span>Scroll</span>
            </button>
          </div>

          {/* Start Hour Selector */}
          <select
            value={startHour}
            onChange={(e) => {
              setStartHour(Number(e.target.value) as HourValue);
              triggerHaptic('light');
            }}
            className="text-[10px] font-bold bg-slate-100 border border-slate-200 rounded px-1.5 py-1 text-slate-700"
            title="Starting hour"
          >
            <option value={0}>00h</option>
            <option value={5}>05h</option>
            <option value={6}>06h</option>
            <option value={7}>07h</option>
            <option value={8}>08h</option>
            <option value={9}>09h</option>
          </select>
        </div>
      </div>

      {/* Grid Table */}
      <div
        ref={gridContainerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`border border-slate-300 rounded overflow-hidden bg-white w-full ${
          touchMode === 'paint' ? 'touch-none' : 'touch-auto'
        }`}
      >
        {/* Header Row: Column Labels 10m to 60m */}
        <div className="flex bg-slate-100 border-b border-slate-300">
          <div className="w-[34px] sm:w-[32px] border-r border-slate-300 text-[9px] font-extrabold text-slate-500 flex items-center justify-center py-1">
            H
          </div>
          {[10, 20, 30, 40, 50, 60].map((col) => (
            <div
              key={col}
              className="flex-1 border-r border-slate-200 last:border-r-0 text-[9px] sm:text-[8px] font-bold text-slate-500 text-center py-1 font-mono"
            >
              {col}
            </div>
          ))}
        </div>

        {/* 24 Hour Rows */}
        <div className="divide-y divide-slate-100">
          {hours.map((hour) => (
            <div key={hour} className="flex h-[20px] sm:h-[18px]">
              <div className="w-[34px] sm:w-[32px] border-r border-slate-300 bg-slate-50 flex items-center justify-center text-[10px] sm:text-[9px] font-bold text-slate-600 font-mono">
                {String(hour).padStart(2, '0')}
              </div>
              {([0, 1, 2, 3, 4, 5] as TenMinuteIndex[]).map((tIdx) => (
                <ConnectedCell
                  key={`${hour}-${tIdx}`}
                  hour={hour}
                  tenMinIndex={tIdx}
                  subjectColorMap={subjectColorMap}
                  isToday={isToday}
                  useCellState={useCellState}
                  onMouseDown={handleCellMouseDown}
                  onMouseEnter={handleCellMouseEnter}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface ConnectedCellProps {
  hour: HourValue;
  tenMinIndex: TenMinuteIndex;
  subjectColorMap: Map<EntityId, string>;
  isToday: boolean;
  useCellState: (hour: HourValue, tenMinIndex: TenMinuteIndex) => { subjectId?: EntityId | null; fillRatio?: number } | undefined;
  onMouseDown: (hour: HourValue, tenMinIndex: TenMinuteIndex, currentSubjectId: EntityId | null | undefined) => void;
  onMouseEnter: (hour: HourValue, tenMinIndex: TenMinuteIndex) => void;
}

const ConnectedCell = React.memo(function ConnectedCell({
  hour,
  tenMinIndex,
  subjectColorMap,
  isToday,
  useCellState,
  onMouseDown,
  onMouseEnter,
}: ConnectedCellProps) {
  const cell = useCellState(hour, tenMinIndex);
  const color = cell?.subjectId ? subjectColorMap.get(cell.subjectId) ?? null : null;
  const isCurrent = isToday && isCurrentBlock(hour, tenMinIndex);

  return (
    <GridCell
      hour={hour}
      tenMinIndex={tenMinIndex}
      color={color}
      fillRatio={cell?.fillRatio ?? 1.0}
      isCurrent={isCurrent}
      onMouseDown={() => onMouseDown(hour, tenMinIndex, cell?.subjectId)}
      onMouseEnter={() => onMouseEnter(hour, tenMinIndex)}
    />
  );
});

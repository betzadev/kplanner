import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { DateString, EntityId, HourValue, TenMinuteIndex } from '../../types';
import { GridCell } from '../ui/GridCell';
import { useTimeGrid } from '../../hooks/useTimeGrid';
import { useSubjectStore } from '../../store/useSubjectStore';
import { isCurrentBlock, toDateString } from '../../utils/timeSlotMapper';
import { triggerHaptic } from '../../utils/haptics';
import { Paintbrush, Hand, HelpCircle } from 'lucide-react';

interface TenMinGridProps {
  date: DateString;
  startHour?: HourValue;
}

export function TenMinGrid({ date, startHour: defaultStartHour = 6 }: TenMinGridProps) {
  const [startHour, setStartHour] = useState<HourValue>(defaultStartHour);
  const [touchMode, setTouchMode] = useState<'paint' | 'scroll'>('paint');
  const [showExplanation, setShowExplanation] = useState(false);
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

      const key = `${h}-${t}` as const;
      draggedCellsRef.current.set(key, { hour: h, tenMinIndex: t });

      paintCell(h, t, selectedSubjectId, null);
      triggerHaptic('medium');
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isInteractingRef.current || touchMode !== 'paint') return;

    // Prevent scrolling while actively painting in Paint mode
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
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-[#C2D8FC]/60 dark:border-slate-800 rounded-2xl p-2.5 sm:p-3 shadow-xs select-none w-full max-w-md mx-auto transition-colors">
      {/* Mobile Top Controls Bar */}
      <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-[#E4EDFC] dark:border-slate-800">
        <div>
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
              10-Min Grid
            </span>
            <button
              type="button"
              onClick={() => setShowExplanation(!showExplanation)}
              className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 p-0.5 rounded cursor-pointer"
              title="What is Paint vs Scroll?"
            >
              <HelpCircle size={12} />
            </button>
          </div>
          <span className="text-[9px] text-slate-400 dark:text-slate-500">
            {selectedSubjectId ? 'Drag across cells to paint' : 'Select a subject from palette first'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Touch Mode Toggle for Mobile: Paint vs Scroll */}
          <div className="flex items-center bg-[#E4EDFC]/80 dark:bg-slate-800 p-0.5 rounded-xl border border-[#C2D8FC] dark:border-slate-700">
            <button
              type="button"
              onClick={() => {
                setTouchMode('paint');
                triggerHaptic('light');
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                touchMode === 'paint'
                  ? 'bg-blue-600 dark:bg-[#9FC6FC] text-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Paint Mode: touching or dragging colors the study time blocks"
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
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                touchMode === 'scroll'
                  ? 'bg-blue-600 dark:bg-[#9FC6FC] text-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Scroll Mode: touching slides the screen without accidentally coloring blocks"
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
            className="text-[10px] font-bold bg-white/90 dark:bg-slate-800 border border-[#C2D8FC] dark:border-slate-700 rounded-xl px-1.5 py-1 text-slate-700 dark:text-slate-200 cursor-pointer"
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

      {/* Explanatory Info Card when Help icon is clicked */}
      {showExplanation && (
        <div className="mb-2 p-2 rounded-xl bg-[#E4EDFC] dark:bg-slate-800/90 border border-[#9FC6FC] dark:border-slate-700 text-[10px] text-slate-700 dark:text-slate-300 leading-snug space-y-1">
          <div className="font-bold flex items-center gap-1 text-blue-900 dark:text-[#9FC6FC]">
            <span>Paint vs Scroll:</span>
          </div>
          <p>
            • <strong>Paint</strong>: Tu dedo colorea los bloques de 10 min de estudio al deslizarlo sobre la cuadrícula.
          </p>
          <p>
            • <strong>Scroll</strong>: Tu dedo desplaza la pantalla arriba/abajo libremente sin pintar accidentalmente celdas de tiempo.
          </p>
        </div>
      )}

      {/* Grid Table */}
      <div
        ref={gridContainerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`border border-[#C2D8FC]/80 dark:border-slate-800 rounded-xl overflow-hidden bg-white/90 dark:bg-slate-950 w-full ${
          touchMode === 'paint' ? 'touch-none' : 'touch-auto'
        }`}
      >
        {/* Header Row: Column Labels 10m to 60m */}
        <div className="flex bg-[#E4EDFC]/60 dark:bg-slate-800/80 border-b border-[#C2D8FC]/80 dark:border-slate-800">
          <div className="w-[34px] sm:w-[32px] border-r border-[#C2D8FC]/80 dark:border-slate-800 text-[9px] font-extrabold text-blue-800 dark:text-slate-400 flex items-center justify-center py-1">
            H
          </div>
          {[10, 20, 30, 40, 50, 60].map((col) => (
            <div
              key={col}
              className="flex-1 border-r border-[#C2D8FC]/80 dark:border-slate-800 last:border-r-0 text-[9px] sm:text-[8px] font-bold text-slate-600 dark:text-slate-400 text-center py-1 font-mono"
            >
              {col}
            </div>
          ))}
        </div>

        {/* 24 Hour Rows */}
        <div className="divide-y divide-[#E4EDFC]/60 dark:divide-slate-800/80">
          {hours.map((hour) => (
            <div key={hour} className="flex h-[20px] sm:h-[18px]">
              <div className="w-[34px] sm:w-[32px] border-r border-[#C2D8FC]/80 dark:border-slate-800 bg-[#F0F5FD] dark:bg-slate-900 flex items-center justify-center text-[10px] sm:text-[9px] font-bold text-slate-700 dark:text-slate-400 font-mono">
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

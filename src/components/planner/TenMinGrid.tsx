import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { DateString, EntityId, HourValue, TenMinuteIndex } from '../../types';
import { GridCell } from '../ui/GridCell';
import { useTimeGrid } from '../../hooks/useTimeGrid';
import { useSubjectStore } from '../../store/useSubjectStore';
import { isCurrentBlock, toDateString } from '../../utils/timeSlotMapper';
import { triggerHaptic } from '../../utils/haptics';
import { Paintbrush, Hand, HelpCircle, CalendarRange, CheckCircle2 } from 'lucide-react';

interface TenMinGridProps {
  date: DateString;
  startHour?: HourValue;
}

export function TenMinGrid({ date, startHour: defaultStartHour = 6 }: TenMinGridProps) {
  const [startHour, setStartHour] = useState<HourValue>(defaultStartHour);
  const [touchMode, setTouchMode] = useState<'paint' | 'scroll'>('paint');
  const [gridMode, setGridMode] = useState<'actual' | 'plan'>('actual');
  const [showExplanation, setShowExplanation] = useState(false);

  const { paintRange, useCellState } = useTimeGrid(date);
  const subjects = useSubjectStore((state) => state.subjects);
  const selectedSubjectId = useSubjectStore((state) => state.selectedSubjectId);

  // Ephemeral touch buffer to prevent layout thrashing and IPC saturation
  const isInteractingRef = useRef(false);
  const dragActionRef = useRef<'paint' | 'erase'>('paint');
  const bufferedCellsRef = useRef<Map<string, { hour: HourValue; tenMinIndex: TenMinuteIndex }>>(new Map());
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

  // Commit ephemeral touch buffer to Zustand store and Rust backend
  const commitBufferedCells = useCallback(() => {
    if (!isInteractingRef.current) return;
    isInteractingRef.current = false;

    if (bufferedCellsRef.current.size > 0) {
      const cells = Array.from(bufferedCellsRef.current.values());
      const isPlan = gridMode === 'plan';

      if (dragActionRef.current === 'erase') {
        paintRange(cells, null, null, isPlan);
      } else if (selectedSubjectId) {
        paintRange(cells, selectedSubjectId, null, isPlan);
      }
      bufferedCellsRef.current.clear();
      triggerHaptic('success');
    }
  }, [gridMode, paintRange, selectedSubjectId]);

  // Window-level mouse up to catch cursor release outside grid
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      commitBufferedCells();
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('pointerup', handleGlobalMouseUp);
    window.addEventListener('pointercancel', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('pointerup', handleGlobalMouseUp);
      window.removeEventListener('pointercancel', handleGlobalMouseUp);
    };
  }, [commitBufferedCells]);

  // Desktop Mouse interactions with batching
  const handleCellMouseDown = useCallback(
    (hour: HourValue, tenMinIndex: TenMinuteIndex, currentSubjectId: EntityId | null | undefined) => {
      isInteractingRef.current = true;
      bufferedCellsRef.current.clear();

      const key = `${hour}-${tenMinIndex}`;
      bufferedCellsRef.current.set(key, { hour, tenMinIndex });

      if (currentSubjectId === selectedSubjectId && selectedSubjectId !== null) {
        dragActionRef.current = 'erase';
      } else {
        dragActionRef.current = 'paint';
      }
      triggerHaptic('light');
    },
    [selectedSubjectId]
  );

  const handleCellMouseEnter = useCallback(
    (hour: HourValue, tenMinIndex: TenMinuteIndex) => {
      if (!isInteractingRef.current) return;

      const key = `${hour}-${tenMinIndex}`;
      if (!bufferedCellsRef.current.has(key)) {
        bufferedCellsRef.current.set(key, { hour, tenMinIndex });
        triggerHaptic('light');
      }
    },
    []
  );

  // Mobile Touch handling with touch buffering
  const handleTouchStart = (e: React.TouchEvent) => {
    if (touchMode !== 'paint') return;

    const touch = e.touches[0];
    const elem = document.elementFromPoint(touch.clientX, touch.clientY);
    const cellElem = elem?.closest('[data-hour]') as HTMLElement | null;

    if (cellElem) {
      const h = Number(cellElem.dataset.hour) as HourValue;
      const t = Number(cellElem.dataset.tenmin) as TenMinuteIndex;

      isInteractingRef.current = true;
      bufferedCellsRef.current.clear();

      const key = `${h}-${t}`;
      bufferedCellsRef.current.set(key, { hour: h, tenMinIndex: t });
      dragActionRef.current = 'paint';
      triggerHaptic('medium');
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isInteractingRef.current || touchMode !== 'paint') return;

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

      if (!bufferedCellsRef.current.has(key)) {
        bufferedCellsRef.current.set(key, { hour: h, tenMinIndex: t });
        triggerHaptic('light');
      }
    }
  };

  const handleTouchEnd = () => {
    commitBufferedCells();
  };

  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-[#C2D8FC]/60 dark:border-slate-800 rounded-2xl p-2.5 sm:p-3 shadow-xs select-none w-full max-w-md mx-auto transition-colors">
      {/* Top Controls Bar */}
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
              title="Help and explanations"
            >
              <HelpCircle size={12} />
            </button>
          </div>
          <span className="text-[9px] text-slate-400 dark:text-slate-500">
            {gridMode === 'plan' ? 'Planning schedule mode' : 'Actual study logging mode'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Phase 3.1: Plan vs Actual Dual Grid Selector */}
          <div className="flex items-center bg-[#E4EDFC]/80 dark:bg-slate-800 p-0.5 rounded-xl border border-[#C2D8FC] dark:border-slate-700">
            <button
              type="button"
              onClick={() => {
                setGridMode('actual');
                triggerHaptic('light');
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                gridMode === 'actual'
                  ? 'bg-blue-600 dark:bg-[#9FC6FC] text-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Actual Mode: Colors recorded study sessions"
            >
              <CheckCircle2 size={11} />
              <span>Actual</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setGridMode('plan');
                triggerHaptic('light');
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                gridMode === 'plan'
                  ? 'bg-indigo-600 dark:bg-indigo-400 text-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Plan Mode: Set scheduled target blocks"
            >
              <CalendarRange size={11} />
              <span>Plan</span>
            </button>
          </div>

          {/* Touch Mode Toggle: Paint vs Scroll */}
          <div className="flex items-center bg-[#E4EDFC]/80 dark:bg-slate-800 p-0.5 rounded-xl border border-[#C2D8FC] dark:border-slate-700">
            <button
              type="button"
              onClick={() => {
                setTouchMode('paint');
                triggerHaptic('light');
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                touchMode === 'paint'
                  ? 'bg-blue-600 dark:bg-[#9FC6FC] text-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Paint Mode: dragging colors cells"
            >
              <Paintbrush size={11} />
            </button>
            <button
              type="button"
              onClick={() => {
                setTouchMode('scroll');
                triggerHaptic('light');
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                touchMode === 'scroll'
                  ? 'bg-blue-600 dark:bg-[#9FC6FC] text-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Scroll Mode: slides page without painting"
            >
              <Hand size={11} />
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

      {/* Explanatory Info Card */}
      {showExplanation && (
        <div className="mb-2 p-2.5 rounded-xl bg-[#E4EDFC] dark:bg-slate-800/90 border border-[#9FC6FC] dark:border-slate-700 text-[10px] text-slate-700 dark:text-slate-300 leading-snug space-y-1">
          <p>
            <strong>Actual vs Plan Mode:</strong> Plan allows you to outline target hours with diagonal hatching before studying. Actual records your real focused study time.
          </p>
          <p>
            <strong>Paint vs Scroll:</strong> Switch to Scroll to pan through your day without making marks.
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
                  isPlanMode={gridMode === 'plan'}
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
  isPlanMode: boolean;
  useCellState: (hour: HourValue, tenMinIndex: TenMinuteIndex) => {
    subjectId?: EntityId | null;
    plannedSubjectId?: EntityId | null;
    fillRatio?: number;
  } | undefined;
  onMouseDown: (hour: HourValue, tenMinIndex: TenMinuteIndex, currentSubjectId: EntityId | null | undefined) => void;
  onMouseEnter: (hour: HourValue, tenMinIndex: TenMinuteIndex) => void;
}

const ConnectedCell = React.memo(function ConnectedCell({
  hour,
  tenMinIndex,
  subjectColorMap,
  isToday,
  isPlanMode,
  useCellState,
  onMouseDown,
  onMouseEnter,
}: ConnectedCellProps) {
  const cell = useCellState(hour, tenMinIndex);
  const color = cell?.subjectId ? subjectColorMap.get(cell.subjectId) ?? null : null;
  const plannedColor = cell?.plannedSubjectId ? subjectColorMap.get(cell.plannedSubjectId) ?? null : null;
  const isCurrent = isToday && isCurrentBlock(hour, tenMinIndex);

  return (
    <GridCell
      hour={hour}
      tenMinIndex={tenMinIndex}
      color={color}
      plannedColor={plannedColor}
      fillRatio={cell?.fillRatio ?? 1.0}
      isCurrent={isCurrent}
      isPlanMode={isPlanMode}
      onMouseDown={(_h, _idx) => onMouseDown(hour, tenMinIndex, cell?.subjectId)}
      onMouseEnter={(_h, _idx) => onMouseEnter(hour, tenMinIndex)}
    />
  );
});

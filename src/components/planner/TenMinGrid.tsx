import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { DateString, EntityId, HourValue, TenMinuteIndex } from '../../types';
import { GridCell } from '../ui/GridCell';
import { useTimeGrid } from '../../hooks/useTimeGrid';
import { useSubjectStore } from '../../store/useSubjectStore';
import { isCurrentBlock, toDateString } from '../../utils/timeSlotMapper';
import { triggerHaptic } from '../../utils/haptics';
import {
  Paintbrush,
  Eraser,
  Hand,
  HelpCircle,
  CalendarRange,
  CheckCircle2,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { RoutineModal } from './RoutineModal';
import { useLanguageStore } from '../../store/useLanguageStore';

interface TenMinGridProps {
  date: DateString;
  startHour?: HourValue;
}

export function TenMinGrid({ date, startHour: defaultStartHour = 6 }: TenMinGridProps) {
  const t = useLanguageStore((state) => state.t);
  const [startHour, setStartHour] = useState<HourValue>(defaultStartHour);
  const [toolMode, setToolMode] = useState<'paint' | 'erase' | 'scroll'>('paint');
  const [gridMode, setGridMode] = useState<'actual' | 'plan'>('actual');
  const [showExplanation, setShowExplanation] = useState(false);
  const [showRoutineModal, setShowRoutineModal] = useState(false);

  const { paintRange, eraseCell, useCellState } = useTimeGrid(date);
  const subjects = useSubjectStore((state) => state.subjects);
  const selectedSubjectId = useSubjectStore((state) => state.selectedSubjectId);

  // Interaction tracking & touch disambiguation
  const isInteractingRef = useRef(false);
  const dragActionRef = useRef<'paint' | 'erase'>('paint');
  const bufferedCellsRef = useRef<Map<string, { hour: HourValue; tenMinIndex: TenMinuteIndex }>>(new Map());
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const isScrollingRef = useRef(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Commit buffered cells to store
  const commitBufferedCells = useCallback(() => {
    if (!isInteractingRef.current) return;
    isInteractingRef.current = false;
    isScrollingRef.current = false;

    if (bufferedCellsRef.current.size > 0) {
      const cells = Array.from(bufferedCellsRef.current.values());
      const isPlan = gridMode === 'plan';

      if (dragActionRef.current === 'erase' || toolMode === 'erase') {
        paintRange(cells, null, null, isPlan);
      } else if (selectedSubjectId) {
        paintRange(cells, selectedSubjectId, null, isPlan);
      }
      bufferedCellsRef.current.clear();
      triggerHaptic('success');
    }
  }, [gridMode, paintRange, selectedSubjectId, toolMode]);

  // Global mouse/pointer up listener to finish interaction
  useEffect(() => {
    const handleGlobalRelease = () => {
      commitBufferedCells();
    };

    window.addEventListener('mouseup', handleGlobalRelease);
    window.addEventListener('pointerup', handleGlobalRelease);
    window.addEventListener('pointercancel', handleGlobalRelease);
    return () => {
      window.removeEventListener('mouseup', handleGlobalRelease);
      window.removeEventListener('pointerup', handleGlobalRelease);
      window.removeEventListener('pointercancel', handleGlobalRelease);
    };
  }, [commitBufferedCells]);

  // Desktop Mouse interactions
  const handleCellMouseDown = useCallback(
    (
      hour: HourValue,
      tenMinIndex: TenMinuteIndex,
      activeColorId: EntityId | null | undefined,
      e: React.MouseEvent
    ) => {
      if (e.button === 2) {
        // Right click directly erases cell
        eraseCell(hour, tenMinIndex, gridMode === 'plan');
        triggerHaptic('light');
        return;
      }

      if (toolMode === 'scroll') return;

      isInteractingRef.current = true;
      bufferedCellsRef.current.clear();

      const key = `${hour}-${tenMinIndex}`;
      bufferedCellsRef.current.set(key, { hour, tenMinIndex });

      if (toolMode === 'erase') {
        dragActionRef.current = 'erase';
      } else if (activeColorId && activeColorId === selectedSubjectId) {
        // Toggling already painted cell back to empty
        dragActionRef.current = 'erase';
      } else {
        dragActionRef.current = 'paint';
      }
      triggerHaptic('light');
    },
    [eraseCell, gridMode, selectedSubjectId, toolMode]
  );

  const handleCellMouseEnter = useCallback(
    (hour: HourValue, tenMinIndex: TenMinuteIndex) => {
      if (!isInteractingRef.current || toolMode === 'scroll') return;

      const key = `${hour}-${tenMinIndex}`;
      if (!bufferedCellsRef.current.has(key)) {
        bufferedCellsRef.current.set(key, { hour, tenMinIndex });
        triggerHaptic('light');
      }
    },
    [toolMode]
  );

  const handleCellContextMenu = useCallback(
    (hour: HourValue, tenMinIndex: TenMinuteIndex) => {
      eraseCell(hour, tenMinIndex, gridMode === 'plan');
      triggerHaptic('warning');
    },
    [eraseCell, gridMode]
  );

  // Mobile Touch handling with smart gesture disambiguation
  const handleTouchStart = (e: React.TouchEvent) => {
    if (toolMode === 'scroll') return;

    const touch = e.touches[0];
    if (!touch) return;

    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    isScrollingRef.current = false;

    const elem = document.elementFromPoint(touch.clientX, touch.clientY);
    const cellElem = elem?.closest('[data-hour]') as HTMLElement | null;

    if (cellElem) {
      const h = Number(cellElem.dataset.hour) as HourValue;
      const tIdx = Number(cellElem.dataset.tenmin) as TenMinuteIndex;

      // Long press to erase support
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = setTimeout(() => {
        eraseCell(h, tIdx, gridMode === 'plan');
        triggerHaptic('warning');
        bufferedCellsRef.current.clear();
        isInteractingRef.current = false;
      }, 500);

      isInteractingRef.current = true;
      bufferedCellsRef.current.clear();

      const key = `${h}-${tIdx}`;
      bufferedCellsRef.current.set(key, { hour: h, tenMinIndex: tIdx });
      dragActionRef.current = toolMode === 'erase' ? 'erase' : 'paint';
      triggerHaptic('light');
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (toolMode === 'scroll' || isScrollingRef.current) return;

    const touch = e.touches[0];
    if (!touch || !touchStartPosRef.current) return;

    const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);

    // Gesture disambiguation: If movement is mostly vertical before multiple cells are hit, allow natural page scroll!
    if (dy > 18 && dy > dx * 1.6 && bufferedCellsRef.current.size <= 1) {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      isScrollingRef.current = true;
      isInteractingRef.current = false;
      bufferedCellsRef.current.clear();
      return; // Do not preventDefault, allows native scrolling
    }

    if (e.cancelable && isInteractingRef.current) {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      e.preventDefault();
    }

    const elem = document.elementFromPoint(touch.clientX, touch.clientY);
    const cellElem = elem?.closest('[data-hour]') as HTMLElement | null;

    if (cellElem && isInteractingRef.current) {
      const h = Number(cellElem.dataset.hour) as HourValue;
      const tIdx = Number(cellElem.dataset.tenmin) as TenMinuteIndex;
      const key = `${h}-${tIdx}`;

      if (!bufferedCellsRef.current.has(key)) {
        bufferedCellsRef.current.set(key, { hour: h, tenMinIndex: tIdx });
        triggerHaptic('light');
      }
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    commitBufferedCells();
  };

  return (
    <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-sm border border-[#C2D8FC]/60 dark:border-slate-800 rounded-3xl p-3 sm:p-4 shadow-xs select-none w-full max-w-md mx-auto transition-colors space-y-2.5">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between gap-1.5 pb-2 border-b border-[#E4EDFC] dark:border-slate-800">
        <div className="flex items-center gap-1.5">
          <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
            {t.gridTitle}
          </span>
          <button
            type="button"
            onClick={() => setShowExplanation(!showExplanation)}
            className="min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-blue-600 dark:hover:text-[#9FC6FC] rounded-lg cursor-pointer transition-colors"
            title={t.gridHelp}
            aria-label={t.gridHelp}
          >
            <HelpCircle size={15} />
          </button>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {/* Plan vs Actual Mode Selector */}
          <div className="flex items-center bg-[#E4EDFC]/80 dark:bg-slate-800 p-0.5 rounded-xl border border-[#C2D8FC] dark:border-slate-700">
            <button
              type="button"
              onClick={() => {
                setGridMode('actual');
                triggerHaptic('light');
              }}
              className={`flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                gridMode === 'actual'
                  ? 'bg-blue-600 dark:bg-[#9FC6FC] text-white dark:text-slate-900 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Actual Study Logged"
            >
              <CheckCircle2 size={13} />
              <span>{t.gridActual}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setGridMode('plan');
                triggerHaptic('light');
              }}
              className={`flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                gridMode === 'plan'
                  ? 'bg-indigo-600 dark:bg-indigo-400 text-white dark:text-slate-900 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Target Plan"
            >
              <CalendarRange size={13} />
              <span>{t.gridPlan}</span>
            </button>
          </div>

          {/* Routine Blueprints Button in Plan Mode */}
          {gridMode === 'plan' && (
            <button
              type="button"
              onClick={() => {
                setShowRoutineModal(true);
                triggerHaptic('light');
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] rounded-xl text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors shadow-2xs cursor-pointer"
              title="Routine Templates"
            >
              <Sparkles size={13} />
              <span className="hidden sm:inline">{t.templates}</span>
            </button>
          )}

          {/* Tool Modes: Paint, Eraser, Scroll */}
          <div className="flex items-center bg-[#E4EDFC]/80 dark:bg-slate-800 p-0.5 rounded-xl border border-[#C2D8FC] dark:border-slate-700">
            <button
              type="button"
              onClick={() => {
                setToolMode('paint');
                triggerHaptic('light');
              }}
              className={`min-h-[36px] min-w-[36px] flex items-center justify-center p-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                toolMode === 'paint'
                  ? 'bg-blue-600 dark:bg-[#9FC6FC] text-white dark:text-slate-900 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title={t.gridPaint}
              aria-label={t.gridPaint}
            >
              <Paintbrush size={14} />
            </button>

            <button
              type="button"
              onClick={() => {
                setToolMode('erase');
                triggerHaptic('light');
              }}
              className={`min-h-[36px] min-w-[36px] flex items-center justify-center p-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                toolMode === 'erase'
                  ? 'bg-rose-600 dark:bg-rose-400 text-white dark:text-slate-900 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title={t.gridErase}
              aria-label={t.gridErase}
            >
              <Eraser size={14} />
            </button>

            <button
              type="button"
              onClick={() => {
                setToolMode('scroll');
                triggerHaptic('light');
              }}
              className={`min-h-[36px] min-w-[36px] flex items-center justify-center p-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                toolMode === 'scroll'
                  ? 'bg-blue-600 dark:bg-[#9FC6FC] text-white dark:text-slate-900 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title={t.gridScroll}
              aria-label={t.gridScroll}
            >
              <Hand size={14} />
            </button>
          </div>

          {/* Starting Hour */}
          <div className="relative">
            <select
              value={startHour}
              onChange={(e) => {
                setStartHour(Number(e.target.value) as HourValue);
                triggerHaptic('light');
              }}
              className="text-[11px] font-bold bg-white dark:bg-slate-800 border border-[#C2D8FC] dark:border-slate-700 rounded-xl px-2 py-1.5 min-h-[36px] pr-5 text-slate-700 dark:text-slate-200 cursor-pointer appearance-none shadow-2xs"
              title={t.startingHour}
            >
              <option value={0}>00h</option>
              <option value={5}>05h</option>
              <option value={6}>06h</option>
              <option value={7}>07h</option>
              <option value={8}>08h</option>
              <option value={9}>09h</option>
            </select>
            <ChevronDown size={12} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
          </div>
        </div>
      </div>

      {/* Explanatory Help Card */}
      {showExplanation && (
        <div className="p-3 rounded-2xl bg-[#E4EDFC] dark:bg-slate-800/90 border border-[#9FC6FC] dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 leading-relaxed space-y-1.5 animate-in fade-in">
          <p>{t.gridHelpActualPlan}</p>
          <p>{t.gridHelpTools}</p>
        </div>
      )}

      {/* Grid Container */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`border border-[#C2D8FC]/80 dark:border-slate-800 rounded-2xl overflow-hidden bg-white/95 dark:bg-slate-950 w-full transition-shadow ${
          toolMode === 'scroll' ? 'touch-auto' : 'touch-pan-y'
        }`}
      >
        {/* Header Row: Column Labels 10m to 60m */}
        <div className="flex bg-[#E4EDFC]/70 dark:bg-slate-800/80 border-b border-[#C2D8FC]/80 dark:border-slate-800">
          <div className="w-[34px] sm:w-[32px] border-r border-[#C2D8FC]/80 dark:border-slate-800 text-[10px] font-extrabold text-blue-800 dark:text-slate-400 flex items-center justify-center py-1">
            {t.gridHour}
          </div>
          {[10, 20, 30, 40, 50, 60].map((col) => (
            <div
              key={col}
              className="flex-1 border-r border-[#C2D8FC]/80 dark:border-slate-800 last:border-r-0 text-[10px] sm:text-[9px] font-bold text-slate-600 dark:text-slate-400 text-center py-1 font-mono"
            >
              {col}
            </div>
          ))}
        </div>

        {/* 24 Hour Rows */}
        <div className="divide-y divide-[#E4EDFC]/60 dark:divide-slate-800/80">
          {hours.map((hour) => (
            <div key={hour} className="flex h-[22px] sm:h-[19px]">
              {/* Hour Label Column is a dedicated edge scroll handle */}
              <div
                className="w-[34px] sm:w-[32px] border-r border-[#C2D8FC]/80 dark:border-slate-800 bg-[#F0F5FD] dark:bg-slate-900 flex items-center justify-center text-[10px] sm:text-[9px] font-bold text-slate-700 dark:text-slate-400 font-mono select-none touch-auto"
                title={`Hour ${String(hour).padStart(2, '0')}`}
              >
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
                  onContextMenu={handleCellContextMenu}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <RoutineModal
        isOpen={showRoutineModal}
        onClose={() => setShowRoutineModal(false)}
        date={date}
      />
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
    subjectId?: EntityId | null | undefined;
    plannedSubjectId?: EntityId | null | undefined;
    fillRatio?: number | null | undefined;
  } | undefined;
  onMouseDown: (
    hour: HourValue,
    tenMinIndex: TenMinuteIndex,
    activeColorId: EntityId | null | undefined,
    e: React.MouseEvent
  ) => void;
  onMouseEnter: (hour: HourValue, tenMinIndex: TenMinuteIndex) => void;
  onContextMenu: (hour: HourValue, tenMinIndex: TenMinuteIndex) => void;
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
  onContextMenu,
}: ConnectedCellProps) {
  const cell = useCellState(hour, tenMinIndex);
  const color = cell?.subjectId ? subjectColorMap.get(cell.subjectId) ?? null : null;
  const plannedColor = cell?.plannedSubjectId ? subjectColorMap.get(cell.plannedSubjectId) ?? null : null;
  const isCurrent = isToday && isCurrentBlock(hour, tenMinIndex);

  // In plan mode, check plannedSubjectId for toggle/erase; in actual mode, check subjectId
  const activeColorId = isPlanMode ? cell?.plannedSubjectId : cell?.subjectId;

  return (
    <GridCell
      hour={hour}
      tenMinIndex={tenMinIndex}
      color={color}
      plannedColor={plannedColor}
      fillRatio={cell?.fillRatio ?? 1.0}
      isCurrent={isCurrent}
      isPlanMode={isPlanMode}
      onMouseDown={(h, idx, e) => onMouseDown(h, idx, activeColorId, e)}
      onMouseEnter={(h, idx) => onMouseEnter(h, idx)}
      onContextMenu={(h, idx) => onContextMenu(h, idx)}
    />
  );
});

import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Cloud,
  CloudOff,
  RefreshCw,
  AlertCircle,
  Plus,
  Stamp,
} from 'lucide-react';
import { DateString } from '../../types';
import { formatStudyDuration, parseDateString, toDateString } from '../../utils/timeSlotMapper';
import { triggerHaptic } from '../../utils/haptics';
import { useBackButton } from '../../hooks/useBackButton';
import { useSyncStore } from '../../services/tursoSync';
import { useDDayStore, calculateDDay } from '../../store/useDDayStore';
import { DDayModal } from './DDayModal';
import { StampModal } from './StampModal';
import { usePlannerStore } from '../../store/usePlannerStore';
import { AVAILABLE_STAMPS } from '../../store/useGamificationStore';

interface PlannerHeaderProps {
  date: DateString;
  mainGoal: string;
  totalMinutes: number;
  onGoalChange: (goal: string) => void;
  onDateChange: (date: DateString) => void;
}

export function PlannerHeader({
  date,
  mainGoal,
  totalMinutes,
  onGoalChange,
  onDateChange,
}: PlannerHeaderProps) {
  const [ddayModalOpen, setDdayModalOpen] = useState(false);
  const [stampModalOpen, setStampModalOpen] = useState(false);
  useBackButton({
    activeTab: 'planner',
    setActiveTab: () => {},
    openModals: [
      { name: 'dday', isOpen: ddayModalOpen, close: () => setDdayModalOpen(false) },
      { name: 'stamp', isOpen: stampModalOpen, close: () => setStampModalOpen(false) },
    ],
  });
  const { status: syncStatus, syncNow } = useSyncStore();
  const { events: ddayEvents } = useDDayStore();
  const completionStamp = usePlannerStore((state) => state.dailySheets[date]?.completionStamp ?? null);
  const setCompletionStamp = usePlannerStore((state) => state.setCompletionStamp);

  const activeStampObj = AVAILABLE_STAMPS.find((s) => s.id === completionStamp);

  const parsedDate = parseDateString(date);
  const dayOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][parsedDate.getDay()];
  const formattedDate = `${parsedDate.getFullYear()}.${String(parsedDate.getMonth() + 1).padStart(2, '0')}.${String(parsedDate.getDate()).padStart(2, '0')} (${dayOfWeek})`;

  const pinnedEvents = ddayEvents.filter((e) => e.isPinned).slice(0, 3);

  const handlePrevDay = () => {
    const prev = new Date(parsedDate);
    prev.setDate(prev.getDate() - 1);
    onDateChange(toDateString(prev));
    triggerHaptic('light');
  };

  const handleNextDay = () => {
    const next = new Date(parsedDate);
    next.setDate(next.getDate() + 1);
    onDateChange(toDateString(next));
    triggerHaptic('light');
  };

  const handleDatePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      onDateChange(e.target.value as DateString);
      triggerHaptic('medium');
    }
  };

  const handleManualSync = () => {
    triggerHaptic('light');
    syncNow();
  };

  return (
    <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-sm border border-[#C2D8FC]/60 dark:border-slate-800 rounded-3xl p-3 sm:p-4 shadow-sm transition-colors space-y-2.5 w-full">
      {/* Top Date Navigator & Total Time Badge */}
      <div className="flex items-center justify-between gap-2 w-full">
        <div className="flex items-center gap-1 bg-[#E4EDFC]/70 dark:bg-slate-800 border border-[#C2D8FC] dark:border-slate-700 rounded-2xl p-0.5 shrink min-w-0">
          <button
            type="button"
            onClick={handlePrevDay}
            className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white active:bg-white dark:active:bg-slate-700 rounded-xl transition-colors cursor-pointer shrink-0"
            title="Previous Day"
          >
            <ChevronLeft size={16} />
          </button>

          <span className="text-[11px] sm:text-xs font-black text-slate-800 dark:text-slate-100 tracking-tight sm:tracking-wide font-mono px-1 truncate">
            {formattedDate}
          </span>

          <button
            type="button"
            onClick={handleNextDay}
            className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white active:bg-white dark:active:bg-slate-700 rounded-xl transition-colors cursor-pointer shrink-0"
            title="Next Day"
          >
            <ChevronRight size={16} />
          </button>

          <label
            className="relative flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 active:bg-white dark:active:bg-slate-700 rounded-xl cursor-pointer shrink-0"
            title="Pick Date"
          >
            <CalendarIcon size={14} />
            <input
              type="date"
              value={date}
              onChange={handleDatePick}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </label>
        </div>

        {/* Right Header: Sync Status & Total Study Time */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Reactive Sync Status Badge */}
          <button
            type="button"
            onClick={handleManualSync}
            className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white/80 dark:bg-slate-800 border border-[#C2D8FC] dark:border-slate-700 hover:bg-[#E4EDFC] transition-colors cursor-pointer"
            title={`Database Sync Status: ${syncStatus.toUpperCase()} (Click to sync now)`}
          >
            {syncStatus === 'syncing' ? (
              <RefreshCw size={13} className="text-blue-500 animate-spin" />
            ) : syncStatus === 'offline' ? (
              <CloudOff size={13} className="text-slate-400" />
            ) : syncStatus === 'error' ? (
              <AlertCircle size={13} className="text-rose-500" />
            ) : (
              <Cloud size={13} className="text-emerald-500" />
            )}
          </button>

          {/* Total Time Pill */}
          <div className="flex items-center gap-1.5 bg-[#E4EDFC] dark:bg-slate-800 border border-[#9FC6FC] dark:border-slate-700 px-3 py-1.5 rounded-2xl shrink-0 shadow-2xs">
            <Clock size={13} className="text-blue-700 dark:text-[#9FC6FC]" />
            <span className="text-xs sm:text-sm font-extrabold text-blue-900 dark:text-slate-100 font-mono">
              {formatStudyDuration(totalMinutes, 'standard')}
            </span>
          </div>
        </div>
      </div>

      {/* D-Day Countdown Strip (Phase 3.2) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
        {pinnedEvents.map((ev) => {
          const dday = calculateDDay(ev.targetDate, date);
          return (
            <button
              key={ev.id}
              type="button"
              onClick={() => {
                setDdayModalOpen(true);
                triggerHaptic('light');
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-[#C2D8FC] dark:border-slate-700 text-[10px] font-semibold text-slate-700 dark:text-slate-200 shrink-0 shadow-2xs hover:scale-102 transition-transform cursor-pointer"
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: ev.colorId }}
              />
              <span className="truncate max-w-[85px]">{ev.title}</span>
              <span
                className={`font-mono font-black px-1.5 py-0.2 rounded-md ${
                  dday.isToday
                    ? 'bg-rose-500 text-white'
                    : 'bg-[#9FC6FC]/30 text-blue-900 dark:text-[#9FC6FC]'
                }`}
              >
                {dday.label}
              </span>
            </button>
          );
        })}

        {/* Add/Manage D-Day Button */}
        <button
          type="button"
          onClick={() => {
            setDdayModalOpen(true);
            triggerHaptic('light');
          }}
          className="flex items-center gap-1 px-2 py-1 rounded-xl bg-[#E4EDFC]/60 dark:bg-slate-800/60 border border-dashed border-[#9FC6FC] dark:border-slate-700 text-[10px] font-bold text-blue-800 dark:text-slate-300 hover:bg-[#E4EDFC] transition-colors shrink-0 cursor-pointer"
          title="Manage D-Day Countdowns"
        >
          <Plus size={11} />
          <span>D-Day</span>
        </button>
      </div>

      {/* Daily Goal & Completion Stamp Row */}
      <div className="pt-1.5 border-t border-[#E4EDFC] dark:border-slate-800 w-full flex items-center gap-2">
        <input
          type="text"
          value={mainGoal}
          onChange={(e) => onGoalChange(e.target.value)}
          placeholder="Daily Goal & Focus: Linear Algebra chapter..."
          maxLength={100}
          className="flex-1 min-w-0 text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 bg-white/80 dark:bg-slate-800/60 border border-[#C2D8FC] dark:border-slate-700 rounded-2xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#9FC6FC] dark:focus:ring-blue-400 shadow-2xs"
        />

        {/* Phase 4.1 Daily Completion Rubber Stamp Display */}
        {completionStamp ? (
          <button
            type="button"
            onClick={() => {
              setStampModalOpen(true);
              triggerHaptic('light');
            }}
            className="cursor-pointer group shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border-2 border-dashed border-rose-500/80 bg-rose-50/80 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-black tracking-wider text-[11px] uppercase shadow-xs transform -rotate-2 hover:scale-105 active:scale-95 transition-all select-none"
            title="Daily Completion Stamp (Click to change)"
          >
            <span className="text-sm">{activeStampObj?.icon ?? '🎯'}</span>
            <span className="truncate max-w-[100px]">{completionStamp}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setStampModalOpen(true);
              triggerHaptic('light');
            }}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-dashed border-rose-300 dark:border-rose-800/70 text-[11px] font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer shadow-2xs"
            title="Stamp Daily Sheet"
          >
            <Stamp size={13} className="text-rose-500" />
            <span className="hidden sm:inline">Stamp Sheet</span>
          </button>
        )}
      </div>

      {/* D-Day Management Modal */}
      <DDayModal
        isOpen={ddayModalOpen}
        onClose={() => setDdayModalOpen(false)}
        currentDate={date}
      />

      {/* Daily Stamp Modal */}
      <StampModal
        isOpen={stampModalOpen}
        onClose={() => setStampModalOpen(false)}
        currentStamp={completionStamp}
        onSelectStamp={(stampId) => setCompletionStamp(date, stampId)}
      />
    </div>
  );
}

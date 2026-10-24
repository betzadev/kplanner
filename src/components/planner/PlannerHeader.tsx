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
  X,
  CheckCircle2,
  HardDrive,
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
import { useLanguageStore } from '../../store/useLanguageStore';

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
  const t = useLanguageStore((state) => state.t);
  const [ddayModalOpen, setDdayModalOpen] = useState(false);
  const [stampModalOpen, setStampModalOpen] = useState(false);
  const [syncModalOpen, setSyncModalOpen] = useState(false);

  useBackButton({
    activeTab: 'planner',
    setActiveTab: () => {},
    openModals: [
      { name: 'dday', isOpen: ddayModalOpen, close: () => setDdayModalOpen(false) },
      { name: 'stamp', isOpen: stampModalOpen, close: () => setStampModalOpen(false) },
      { name: 'sync', isOpen: syncModalOpen, close: () => setSyncModalOpen(false) },
    ],
  });

  const { status: syncStatus, syncNow, lastSynced, errorMessage, dismissError } = useSyncStore();
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

  const handleOpenSyncModal = () => {
    triggerHaptic('light');
    setSyncModalOpen(true);
  };

  const handleDoSync = async () => {
    triggerHaptic('medium');
    await syncNow();
  };

  return (
    <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-sm border border-[#C2D8FC]/60 dark:border-slate-800 rounded-3xl p-3 sm:p-4 shadow-xs transition-colors space-y-2.5 w-full">
      {/* Top Date Navigator & Total Time Badge */}
      <div className="flex items-center justify-between gap-2 w-full">
        <div className="flex items-center gap-0.5 sm:gap-1 bg-[#E4EDFC]/70 dark:bg-slate-800 border border-[#C2D8FC] dark:border-slate-700 rounded-2xl p-0.5 shrink min-w-0">
          <button
            type="button"
            onClick={handlePrevDay}
            className="min-h-[44px] min-w-[44px] sm:min-h-[38px] sm:min-w-[38px] flex items-center justify-center text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white active:bg-white dark:active:bg-slate-700 rounded-xl transition-colors cursor-pointer shrink-0"
            title={t.previousDay}
            aria-label={t.previousDay}
          >
            <ChevronLeft size={18} />
          </button>

          <span className="text-[11px] sm:text-xs font-black text-slate-800 dark:text-slate-100 tracking-tight sm:tracking-wide font-mono px-1 truncate select-none">
            {formattedDate}
          </span>

          <button
            type="button"
            onClick={handleNextDay}
            className="min-h-[44px] min-w-[44px] sm:min-h-[38px] sm:min-w-[38px] flex items-center justify-center text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white active:bg-white dark:active:bg-slate-700 rounded-xl transition-colors cursor-pointer shrink-0"
            title={t.nextDay}
            aria-label={t.nextDay}
          >
            <ChevronRight size={18} />
          </button>

          <label
            className="relative min-h-[44px] min-w-[44px] sm:min-h-[38px] sm:min-w-[38px] flex items-center justify-center text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 active:bg-white dark:active:bg-slate-700 rounded-xl cursor-pointer shrink-0"
            title={t.pickDate}
            aria-label={t.pickDate}
          >
            <CalendarIcon size={16} />
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
          {/* Cloud Selection button with clear error handling & modal */}
          <button
            type="button"
            onClick={handleOpenSyncModal}
            className="min-h-[44px] min-w-[44px] sm:min-h-[38px] sm:min-w-[38px] flex items-center justify-center rounded-2xl bg-white/80 dark:bg-slate-800 border border-[#C2D8FC] dark:border-slate-700 hover:bg-[#E4EDFC] transition-colors cursor-pointer shadow-2xs"
            title={t.syncTitle}
            aria-label={t.syncTitle}
          >
            {syncStatus === 'syncing' ? (
              <RefreshCw size={15} className="text-blue-500 animate-spin" />
            ) : syncStatus === 'offline' ? (
              <CloudOff size={15} className="text-slate-400" />
            ) : syncStatus === 'error' ? (
              <AlertCircle size={15} className="text-amber-500" />
            ) : (
              <Cloud size={15} className="text-emerald-500" />
            )}
          </button>

          {/* Total Time Pill */}
          <div className="min-h-[44px] sm:min-h-[38px] flex items-center gap-1.5 bg-[#E4EDFC] dark:bg-slate-800 border border-[#9FC6FC] dark:border-slate-700 px-3 py-1.5 rounded-2xl shrink-0 shadow-2xs">
            <Clock size={15} className="text-blue-700 dark:text-[#9FC6FC]" />
            <span className="text-xs sm:text-sm font-extrabold text-blue-900 dark:text-slate-100 font-mono">
              {formatStudyDuration(totalMinutes, 'standard')}
            </span>
          </div>
        </div>
      </div>

      {/* D-Day Countdown Strip */}
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
              className="min-h-[36px] flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-[#C2D8FC] dark:border-slate-700 text-[10px] sm:text-xs font-semibold text-slate-700 dark:text-slate-200 shrink-0 shadow-2xs hover:scale-102 transition-transform cursor-pointer"
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: ev.colorId }}
              />
              <span className="truncate max-w-[90px]">{ev.title}</span>
              <span
                className={`font-mono font-black px-1.5 py-0.5 rounded-md ${
                  dday.isPast
                    ? 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                    : dday.daysDiff <= 7
                    ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 font-bold'
                    : 'bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-[#9FC6FC]'
                }`}
              >
                {dday.label}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => {
            setDdayModalOpen(true);
            triggerHaptic('light');
          }}
          className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl bg-[#E4EDFC]/60 dark:bg-slate-800/60 border border-[#C2D8FC] dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-[#C2D8FC] transition-colors cursor-pointer shrink-0"
          title="Add D-Day Target"
          aria-label="Add D-Day Target"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Main Daily Goal Banner with Rubber Stamp Badge */}
      <div className="relative flex items-center gap-2 bg-[#F0F5FD] dark:bg-slate-800/60 border border-[#C2D8FC] dark:border-slate-700/80 rounded-2xl px-3 py-1.5 shadow-2xs">
        <input
          type="text"
          value={mainGoal}
          onChange={(e) => onGoalChange(e.target.value)}
          placeholder="🎯 Today's Core Focus / Target Exam Goal..."
          maxLength={100}
          className="flex-1 min-w-0 bg-transparent text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none min-h-[38px]"
        />

        {/* Rubber Stamp Button */}
        <button
          type="button"
          onClick={() => {
            setStampModalOpen(true);
            triggerHaptic('light');
          }}
          className={`min-h-[38px] px-2.5 py-1 rounded-xl text-xs font-bold border flex items-center gap-1 shrink-0 transition-transform cursor-pointer active:scale-95 ${
            completionStamp
              ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 shadow-2xs rotate-[-2deg]'
              : 'bg-white/80 dark:bg-slate-800 border-[#C2D8FC] dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-white'
          }`}
          title="Daily Completion Verification Stamp"
        >
          {activeStampObj ? (
            <>
              <span className="text-sm">{activeStampObj.icon}</span>
              <span className="text-[10px] uppercase tracking-wider hidden xs:inline">{completionStamp}</span>
            </>
          ) : (
            <>
              <Stamp size={14} className="text-slate-400" />
              <span className="text-[10px] hidden xs:inline">Stamp</span>
            </>
          )}
        </button>
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
        onSelectStamp={(stamp) => setCompletionStamp(date, stamp)}
      />

      {/* Cloud Selection / Sync Diagnostic Modal */}
      {syncModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSyncModalOpen(false);
          }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
        >
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-[#C2D8FC] dark:border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-[#9FC6FC]">
                  <Cloud size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {t.syncTitle}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    K-Planner Persistence Engine
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSyncModalOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl cursor-pointer"
                aria-label={t.syncClose}
              >
                <X size={18} />
              </button>
            </div>

            {/* Current State Info */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Status
                </span>
                <span className="text-xs font-bold flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={14} />
                  <span>
                    {syncStatus === 'syncing'
                      ? t.syncStatusSyncing
                      : syncStatus === 'offline'
                      ? t.syncStatusOffline
                      : syncStatus === 'error'
                      ? t.syncStatusError
                      : t.syncStatusLocal}
                  </span>
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <HardDrive size={12} />
                  <span>Local SQLite Storage</span>
                </span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  Active & Saved
                </span>
              </div>

              {lastSynced && (
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700">
                  <span>{t.syncLastSynced}</span>
                  <span className="font-mono text-slate-600 dark:text-slate-300">
                    {lastSynced.toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-amber-600" />
                <div className="flex-1">
                  <div className="font-bold">Sync Notice</div>
                  <div>{errorMessage}</div>
                  <button
                    type="button"
                    onClick={dismissError}
                    className="mt-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 underline cursor-pointer"
                  >
                    Dismiss Notice
                  </button>
                </div>
              </div>
            )}

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {t.syncDesc}
            </p>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSyncModalOpen(false)}
                className="min-h-[44px] py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {t.syncClose}
              </button>
              <button
                type="button"
                onClick={handleDoSync}
                disabled={syncStatus === 'syncing'}
                className="min-h-[44px] py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-98 disabled:opacity-50"
              >
                <RefreshCw size={14} className={syncStatus === 'syncing' ? 'animate-spin' : ''} />
                <span>{t.syncNow}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

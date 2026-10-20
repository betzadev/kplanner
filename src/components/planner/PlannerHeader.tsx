import React from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { DateString } from '../../types';
import { formatStudyDuration, parseDateString, toDateString } from '../../utils/timeSlotMapper';
import { triggerHaptic } from '../../utils/haptics';

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
  const parsedDate = parseDateString(date);
  const dayOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][parsedDate.getDay()];
  const formattedDate = `${parsedDate.getFullYear()}.${String(parsedDate.getMonth() + 1).padStart(2, '0')}.${String(parsedDate.getDate()).padStart(2, '0')} (${dayOfWeek})`;

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

        {/* Total Time Pill */}
        <div className="flex items-center gap-1.5 bg-[#E4EDFC] dark:bg-slate-800 border border-[#9FC6FC] dark:border-slate-700 px-3 py-1.5 rounded-2xl shrink-0 shadow-2xs">
          <Clock size={13} className="text-blue-700 dark:text-[#9FC6FC]" />
          <span className="text-xs sm:text-sm font-extrabold text-blue-900 dark:text-slate-100 font-mono">
            {formatStudyDuration(totalMinutes, 'standard')}
          </span>
        </div>
      </div>

      {/* Daily Goal Input Field */}
      <div className="pt-1.5 border-t border-[#E4EDFC] dark:border-slate-800 w-full">
        <input
          type="text"
          value={mainGoal}
          onChange={(e) => onGoalChange(e.target.value)}
          placeholder="Daily Goal & Focus: Linear Algebra chapter..."
          maxLength={100}
          className="w-full text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 bg-white/80 dark:bg-slate-800/60 border border-[#C2D8FC] dark:border-slate-700 rounded-2xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#9FC6FC] dark:focus:ring-blue-400 shadow-2xs"
        />
      </div>
    </div>
  );
}

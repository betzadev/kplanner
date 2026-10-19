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
    <div className="bg-white border border-slate-300 rounded-lg p-3 shadow-xs">
      {/* Top Date Navigator & Total Time Badge */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-md p-1">
          <button
            type="button"
            onClick={handlePrevDay}
            className="w-8 h-8 flex items-center justify-center text-slate-600 active:text-slate-900 active:bg-slate-200 rounded transition-colors cursor-pointer"
            title="Previous Day"
          >
            <ChevronLeft size={18} />
          </button>

          <span className="text-xs sm:text-sm font-extrabold text-slate-800 tracking-wider font-mono px-1">
            {formattedDate}
          </span>

          <button
            type="button"
            onClick={handleNextDay}
            className="w-8 h-8 flex items-center justify-center text-slate-600 active:text-slate-900 active:bg-slate-200 rounded transition-colors cursor-pointer"
            title="Next Day"
          >
            <ChevronRight size={18} />
          </button>

          <label className="relative flex items-center justify-center w-8 h-8 text-slate-500 hover:text-slate-800 active:bg-slate-200 rounded cursor-pointer" title="Pick Date">
            <CalendarIcon size={16} />
            <input
              type="date"
              value={date}
              onChange={handleDatePick}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </label>
        </div>

        {/* Total Time Pill */}
        <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-md shrink-0">
          <Clock size={13} className="text-slate-500" />
          <span className="text-xs sm:text-sm font-extrabold text-slate-900 font-mono">
            {formatStudyDuration(totalMinutes, 'digital')}
          </span>
        </div>
      </div>

      {/* Daily Goal Input Field */}
      <div className="pt-2 border-t border-slate-100">
        <div className="text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
          Daily Goal / 오늘의 목표
        </div>
        <input
          type="text"
          value={mainGoal}
          onChange={(e) => onGoalChange(e.target.value)}
          placeholder="오늘의 목표 (e.g. Study TOPIK II Vocab & Practice Math...)"
          maxLength={100}
          className="w-full text-xs font-medium text-slate-800 placeholder-slate-400 bg-slate-50/70 border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1.5 focus:ring-slate-700"
        />
      </div>
    </div>
  );
}

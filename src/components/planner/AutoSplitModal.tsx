import React, { useState, useEffect } from 'react';
import { X, Calendar, Layers, CheckCircle2 } from 'lucide-react';
import { useSubjectStore } from '../../store/useSubjectStore';
import { usePlannerStore } from '../../store/usePlannerStore';
import { DateString, EntityId } from '../../types';
import { triggerHaptic } from '../../utils/haptics';

interface AutoSplitModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDate: DateString;
}

export function AutoSplitModal({ isOpen, onClose, currentDate }: AutoSplitModalProps) {
  const subjects = useSubjectStore((state) => state.subjects);
  const selectedSubjectId = useSubjectStore((state) => state.selectedSubjectId) ?? subjects[0]?.id ?? ('' as EntityId);
  const addTask = usePlannerStore((state) => state.addTask);

  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState<EntityId>(selectedSubjectId);
  const [unitType, setUnitType] = useState<'pages' | 'chapters' | 'hours' | 'problems'>('pages');
  const [totalUnits, setTotalUnits] = useState<number>(100);
  const [deadlineDate, setDeadlineDate] = useState<string>('');
  const [includeWeekends, setIncludeWeekends] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (selectedSubjectId) {
      setSubjectId(selectedSubjectId);
    }
  }, [selectedSubjectId]);

  if (!isOpen) return null;

  const calculateDays = (): DateString[] => {
    if (!deadlineDate) return [];
    const start = new Date(currentDate);
    const end = new Date(deadlineDate);
    if (end <= start) return [];

    const days: DateString[] = [];
    const curr = new Date(start);

    while (curr <= end) {
      const dayOfWeek = curr.getDay(); // 0 is Sunday, 6 is Saturday
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      if (includeWeekends || !isWeekend) {
        const y = curr.getFullYear();
        const m = String(curr.getMonth() + 1).padStart(2, '0');
        const d = String(curr.getDate()).padStart(2, '0');
        days.push(`${y}-${m}-${d}` as DateString);
      }
      curr.setDate(curr.getDate() + 1);
    }

    return days;
  };

  const activeDays = calculateDays();
  const daysCount = activeDays.length;
  const unitsPerDay = daysCount > 0 ? Math.ceil(totalUnits / daysCount) : 0;

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || totalUnits <= 0 || daysCount <= 0) return;

    let remaining = totalUnits;
    let currentStart = 1;

    activeDays.forEach((targetDate, idx) => {
      const dayAmount = Math.min(unitsPerDay, remaining);
      if (dayAmount <= 0) return;

      const currentEnd = currentStart + dayAmount - 1;
      let taskTitle = '';

      if (unitType === 'pages') {
        taskTitle = `${title}: pp. ${currentStart}-${currentEnd}`;
      } else if (unitType === 'chapters') {
        taskTitle = `${title}: Ch. ${currentStart}${currentStart !== currentEnd ? `-${currentEnd}` : ''}`;
      } else if (unitType === 'problems') {
        taskTitle = `${title}: Problems #${currentStart}-${currentEnd}`;
      } else {
        taskTitle = `${title}: ${dayAmount} hours (Part ${idx + 1})`;
      }

      addTask(targetDate, subjectId, taskTitle);
      remaining -= dayAmount;
      currentStart = currentEnd + 1;
    });

    triggerHaptic('medium');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400">
              <Layers size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Auto-Split Syllabus / Book
              </h2>
              <p className="text-xs text-slate-500">Divide chapters or pages automatically into daily study tasks</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleGenerate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Title / Resource Name
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Organic Chemistry Vol. 1"
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Subject
              </label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value as EntityId)}
                className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Unit Type
              </label>
              <select
                value={unitType}
                onChange={(e) => setUnitType(e.target.value as any)}
                className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="pages">Pages (pp.)</option>
                <option value="chapters">Chapters</option>
                <option value="problems">Practice Problems</option>
                <option value="hours">Hours</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Total {unitType.charAt(0).toUpperCase() + unitType.slice(1)}
              </label>
              <input
                type="number"
                min="1"
                required
                value={totalUnits}
                onChange={(e) => setTotalUnits(parseInt(e.target.value) || 0)}
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Deadline Date
              </label>
              <input
                type="date"
                required
                min={currentDate}
                value={deadlineDate}
                onChange={(e) => setDeadlineDate(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="weekends"
              checked={includeWeekends}
              onChange={(e) => setIncludeWeekends(e.target.checked)}
              className="rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="weekends" className="text-xs text-slate-600 dark:text-slate-400 select-none cursor-pointer">
              Include weekends in calculation
            </label>
          </div>

          {/* Breakdown Preview Banner */}
          {daysCount > 0 && (
            <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-2.5">
              <Calendar className="text-indigo-500 shrink-0 mt-0.5" size={16} />
              <div>
                <p className="font-semibold">
                  {daysCount} study days scheduled
                </p>
                <p className="opacity-80 mt-0.5">
                  Approx. <strong className="text-indigo-600 dark:text-indigo-300">{unitsPerDay} {unitType}/day</strong> will be appended to each day's study list.
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={daysCount <= 0 || !title.trim()}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20"
            >
              <CheckCircle2 size={15} />
              Generate Schedule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

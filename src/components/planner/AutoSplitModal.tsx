import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { DateString, EntityId } from '../../types';
import { useSubjectStore } from '../../store/useSubjectStore';
import { usePlannerStore } from '../../store/usePlannerStore';
import { triggerHaptic } from '../../utils/haptics';
import { parseDateString, toDateString } from '../../utils/timeSlotMapper';
import { X, Layers, Sparkles } from 'lucide-react';

interface AutoSplitModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDate: DateString;
}

export function AutoSplitModal({ isOpen, onClose, currentDate }: AutoSplitModalProps) {
  const subjects = useSubjectStore((state) => state.subjects);
  const selectedSubjectId = useSubjectStore((state) => state.selectedSubjectId) ?? subjects[0]?.id;
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

  if (!isOpen || typeof document === "undefined") return null;

  // Calculate days count
  const startDate = parseDateString(currentDate);
  const endDate = deadlineDate ? new Date(deadlineDate + 'T00:00:00') : null;

  let daysAvailable: DateString[] = [];
  if (endDate && endDate >= startDate) {
    const cur = new Date(startDate);
    while (cur <= endDate) {
      const dayOfWeek = cur.getDay(); // 0 is Sunday, 6 is Saturday
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      if (includeWeekends || !isWeekend) {
        daysAvailable.push(toDateString(cur));
      }
      cur.setDate(cur.getDate() + 1);
    }
  }

  const daysCount = daysAvailable.length;
  const unitsPerDay = daysCount > 0 ? Math.ceil(totalUnits / daysCount) : 0;

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !subjectId || daysCount === 0 || totalUnits <= 0) return;

    let currentStart = 1;
    daysAvailable.forEach((dayStr, index) => {
      const isLastDay = index === daysCount - 1;
      const currentEnd = isLastDay ? totalUnits : Math.min(totalUnits, currentStart + unitsPerDay - 1);

      let taskLabel = '';
      if (unitType === 'pages') {
        taskLabel = `${title.trim()}: pp. ${currentStart}-${currentEnd}`;
      } else if (unitType === 'chapters') {
        taskLabel = currentStart === currentEnd
          ? `${title.trim()}: Ch. ${currentStart}`
          : `${title.trim()}: Ch. ${currentStart}-${currentEnd}`;
      } else if (unitType === 'problems') {
        taskLabel = `${title.trim()}: Problems #${currentStart}-${currentEnd}`;
      } else {
        taskLabel = `${title.trim()}: ${unitsPerDay}h study session`;
      }

      addTask(dayStr, taskLabel, subjectId);
      currentStart = currentEnd + 1;
    });

    triggerHaptic('success');
    onClose();
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
    >
      <div className="bg-white dark:bg-slate-900 border border-[#C2D8FC] dark:border-slate-800 rounded-3xl p-5 w-full max-w-sm shadow-xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E4EDFC] dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#E4EDFC] dark:bg-slate-800 flex items-center justify-center text-blue-600 dark:text-[#9FC6FC]">
              <Layers size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Workload Auto-Splitter
              </h3>
              <p className="text-[10px] text-slate-400">Distribute macro goals across days</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleGenerate} className="space-y-3">
          <div>
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Goal or Book Title
            </label>
            <input
              type="text"
              placeholder="e.g. Calculus Vol. 1, History Review"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-[#C2D8FC] dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#9FC6FC]"
              required
            />
          </div>

          {/* Subject selector */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Subject
            </label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-[#C2D8FC] dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#9FC6FC] cursor-pointer"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Unit Type & Total Units */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Unit Type
              </label>
              <select
                value={unitType}
                onChange={(e) => setUnitType(e.target.value as 'pages' | 'chapters' | 'hours' | 'problems')}
                className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-[#C2D8FC] dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#9FC6FC] cursor-pointer"
              >
                <option value="pages">Pages</option>
                <option value="chapters">Chapters</option>
                <option value="problems">Problems</option>
                <option value="hours">Hours</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Total Amount
              </label>
              <input
                type="number"
                min={1}
                value={totalUnits}
                onChange={(e) => setTotalUnits(Number(e.target.value))}
                className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-[#C2D8FC] dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#9FC6FC]"
                required
              />
            </div>
          </div>

          {/* Deadline Date */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Target Deadline
            </label>
            <input
              type="date"
              min={currentDate}
              value={deadlineDate}
              onChange={(e) => setDeadlineDate(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-[#C2D8FC] dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#9FC6FC] cursor-pointer"
              required
            />
          </div>

          {/* Weekend Toggle */}
          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={includeWeekends}
              onChange={(e) => setIncludeWeekends(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs text-slate-600 dark:text-slate-300">
              Include weekend study days
            </span>
          </label>

          {/* Distribution Preview Card */}
          {daysCount > 0 && (
            <div className="p-3 rounded-2xl bg-[#E4EDFC]/60 dark:bg-slate-800/60 border border-[#C2D8FC] dark:border-slate-700 text-xs space-y-1">
              <div className="flex items-center justify-between font-bold text-blue-900 dark:text-[#9FC6FC]">
                <span>Daily Target:</span>
                <span className="font-mono text-sm">~{unitsPerDay} {unitType}/day</span>
              </div>
              <p className="text-[10px] text-slate-500">
                Spans across <strong>{daysCount}</strong> study days starting today.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={!title.trim() || daysCount === 0 || totalUnits <= 0}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <Sparkles size={14} />
            <span>Distribute Tasks Across Sheets</span>
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}

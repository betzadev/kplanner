import React, { useState, useEffect } from 'react';
import { X, Calendar, Plus, Trash2, Pin } from 'lucide-react';
import { useDDayStore } from '../../store/useDDayStore';
import { DateString, HexColor, DEFAULT_PASTEL_PALETTE } from '../../types';
import { triggerHaptic } from '../../utils/haptics';

interface DDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDate: DateString;
}

export function DDayModal({ isOpen, onClose, currentDate }: DDayModalProps) {
  const { events, addEvent, deleteEvent, togglePin } = useDDayStore();
  const [newTitle, setNewTitle] = useState('');
  const [newTargetDate, setNewTargetDate] = useState('');
  const [newColor, setNewColor] = useState<HexColor>(DEFAULT_PASTEL_PALETTE[0] ?? ('#C2D8FC' as HexColor));


  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newTargetDate) return;
    addEvent(newTitle, newTargetDate, newColor, true);
    setNewTitle('');
    setNewTargetDate('');
    triggerHaptic('medium');
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-rose-50 dark:bg-rose-950/60 rounded-xl text-rose-600 dark:text-rose-400">
              <Calendar size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                D-Day Milestones
              </h2>
              <p className="text-xs text-slate-500">Track exams, certifications, or major goals</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Existing Events List */}
        <div className="space-y-2 mb-6 max-h-56 overflow-y-auto pr-1">
          {events.length === 0 ? (
            <p className="text-center py-6 text-xs text-slate-400">No D-Day goals yet. Add one below!</p>
          ) : (
            events.map((ev) => {
              const target = new Date(ev.targetDate);
              const current = new Date(currentDate);
              const diffTime = target.getTime() - current.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              const dDayStr = diffDays === 0 ? 'D-Day' : diffDays > 0 ? `D-${diffDays}` : `D+${Math.abs(diffDays)}`;

              return (
                <div
                  key={ev.id}
                  className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: ev.colorId }}
                    />
                    <div className="truncate">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{ev.title}</p>
                      <p className="text-[10px] text-slate-400">{ev.targetDate}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-lg text-xs font-black tracking-tight ${
                        diffDays <= 7 && diffDays >= 0
                          ? 'bg-rose-500 text-white animate-pulse'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {dDayStr}
                    </span>
                    <button
                      onClick={() => togglePin(ev.id)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        ev.isPinned
                          ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40'
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      <Pin size={14} className={ev.isPinned ? 'fill-amber-500' : ''} />
                    </button>
                    <button
                      onClick={() => deleteEvent(ev.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Add New Event Form */}
        <form onSubmit={handleAdd} className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Goal / Exam Name
            </label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. TOPIK II Exam"
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Target Date
              </label>
              <input
                type="date"
                required
                value={newTargetDate}
                onChange={(e) => setNewTargetDate(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Color Tag
              </label>
              <div className="flex gap-1.5 items-center h-9 overflow-x-auto">
                {DEFAULT_PASTEL_PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    className={`w-5 h-5 rounded-full shrink-0 transition-transform ${
                      newColor === c ? 'scale-125 ring-2 ring-slate-900 dark:ring-white' : 'opacity-80'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 mt-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-rose-500/20"
          >
            <Plus size={16} />
            Add Milestone
          </button>
        </form>
      </div>
    </div>
  );
}

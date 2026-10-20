import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HexColor, DEFAULT_PASTEL_PALETTE } from '../../types';
import { useDDayStore, calculateDDay } from '../../store/useDDayStore';
import { triggerHaptic } from '../../utils/haptics';
import { X, Plus, Trash2, Pin, Flame } from 'lucide-react';

interface DDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDate: string;
}

export function DDayModal({ isOpen, onClose, currentDate }: DDayModalProps) {
  const { events, addEvent, deleteEvent, togglePin } = useDDayStore();
  const [newTitle, setNewTitle] = useState('');
  const [newTargetDate, setNewTargetDate] = useState('');
  const [newColor, setNewColor] = useState<HexColor>(DEFAULT_PASTEL_PALETTE[0]);


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

  if (!isOpen || typeof document === "undefined") return null;

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
              <Flame size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                D-Day Countdowns
              </h3>
              <p className="text-[10px] text-slate-400">Track exams, targets & milestones</p>
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

        {/* Existing Events List */}
        <div className="max-h-52 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
          {events.length === 0 ? (
            <p className="text-xs text-center text-slate-400 py-4">No countdowns created yet.</p>
          ) : (
            events.map((ev) => {
              const dday = calculateDDay(ev.targetDate, currentDate);
              return (
                <div
                  key={ev.id}
                  className="flex items-center justify-between p-2.5 rounded-2xl border border-[#E4EDFC] dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: ev.colorId }}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                        {ev.title}
                      </p>
                      <p className="text-[10px] text-slate-400">{ev.targetDate}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`text-xs font-black font-mono px-2 py-0.5 rounded-full ${
                        dday.isToday
                          ? 'bg-rose-500 text-white'
                          : dday.isPast
                          ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          : 'bg-[#9FC6FC]/40 text-blue-900 dark:text-[#9FC6FC]'
                      }`}
                    >
                      {dday.label}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        togglePin(ev.id);
                        triggerHaptic('light');
                      }}
                      className={`p-1 rounded-lg cursor-pointer transition-colors ${
                        ev.isPinned
                          ? 'text-amber-500'
                          : 'text-slate-300 dark:text-slate-600 hover:text-slate-400'
                      }`}
                      title={ev.isPinned ? 'Pinned to header' : 'Pin to header'}
                    >
                      <Pin size={14} className={ev.isPinned ? 'fill-amber-500' : ''} />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        deleteEvent(ev.id);
                        triggerHaptic('warning');
                      }}
                      className="p-1 rounded-lg text-slate-300 hover:text-rose-500 cursor-pointer transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Create New Form */}
        <form onSubmit={handleAdd} className="border-t border-[#E4EDFC] dark:border-slate-800 pt-3 space-y-2.5">
          <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Add New Target</p>
          <input
            type="text"
            placeholder="e.g. SAT Exam, Biology Final..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-[#C2D8FC] dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#9FC6FC]"
          />

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="date"
                value={newTargetDate}
                onChange={(e) => setNewTargetDate(e.target.value)}
                className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-[#C2D8FC] dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#9FC6FC]"
              />
            </div>

            {/* Color Swatches */}
            <div className="flex items-center gap-1">
              {DEFAULT_PASTEL_PALETTE.slice(0, 4).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-5 h-5 rounded-full cursor-pointer transition-transform ${
                    newColor === c ? 'scale-125 ring-2 ring-blue-500' : ''
                  }`}
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={!newTitle.trim() || !newTargetDate}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <Plus size={14} />
            <span>Add Countdown</span>
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}

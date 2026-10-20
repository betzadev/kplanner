import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { DateString } from '../../types';
import { useRoutineStore } from '../../store/useRoutineStore';
import { usePlannerStore } from '../../store/usePlannerStore';
import { triggerHaptic } from '../../utils/haptics';
import { X, CalendarRange, Plus, Trash2, Check, Sparkles, Layers } from 'lucide-react';

interface RoutineModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: DateString;
}

export function RoutineModal({ isOpen, onClose, date }: RoutineModalProps) {
  const { templates, saveCurrentDayAsTemplate, deleteTemplate, applyTemplateToDate, applyTemplateToWeek } =
    useRoutineStore();
  const dailySheet = usePlannerStore((state) => state.dailySheets[date]);
  const [templateName, setTemplateName] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const currentPlanBlockCount = useMemo(() => {
    if (!dailySheet || !dailySheet.timeGrid) return 0;
    return Object.values(dailySheet.timeGrid).filter((c) => Boolean(c.plannedSubjectId)).length;
  }, [dailySheet]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === "undefined") return null;

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 2500);
  };

  const handleSaveCurrent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim()) return;

    const success = saveCurrentDayAsTemplate(templateName, date);
    if (success) {
      triggerHaptic('success');
      showFeedback(`Routine "${templateName}" saved!`);
      setTemplateName('');
    } else {
      triggerHaptic('error');
      showFeedback('No planned blocks on current date to save.');
    }
  };

  const handleApplyDay = (templateId: string, name: string) => {
    applyTemplateToDate(templateId, date);
    triggerHaptic('medium');
    showFeedback(`Applied "${name}" to ${date}`);
  };

  const handleApplyWeekdays = (templateId: string, name: string) => {
    applyTemplateToWeek(templateId, date, false);
    triggerHaptic('success');
    showFeedback(`Applied "${name}" to weekdays!`);
  };

  const handleApplyFullWeek = (templateId: string, name: string) => {
    applyTemplateToWeek(templateId, date, true);
    triggerHaptic('success');
    showFeedback(`Applied "${name}" to entire week (7 days)!`);
  };

  return createPortal(
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
    >
      <div className="bg-white dark:bg-slate-900 border border-[#C2D8FC] dark:border-slate-800 rounded-3xl p-5 w-full max-w-sm shadow-xl space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E4EDFC] dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <CalendarRange size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Routine Blueprints
              </h3>
              <p className="text-[10px] text-slate-400">Reusable schedule templates</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedbackMsg && (
          <div className="bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs px-3 py-2 rounded-xl flex items-center gap-2 animate-in fade-in">
            <Sparkles size={14} className="shrink-0" />
            <span className="font-semibold">{feedbackMsg}</span>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Save Current Plan as Blueprint */}
          <div className="bg-[#F0F5FD] dark:bg-slate-800/60 border border-[#C2D8FC]/80 dark:border-slate-700/80 rounded-2xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Layers size={13} className="text-indigo-500" />
                Save Active Day as Template
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {currentPlanBlockCount} blocks
              </span>
            </div>

            <form onSubmit={handleSaveCurrent} className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Weekday College, Weekend Cram"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="flex-1 text-xs bg-white dark:bg-slate-900 border border-[#C2D8FC] dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={!templateName.trim() || currentPlanBlockCount === 0}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
              >
                <Plus size={14} />
                Save
              </button>
            </form>
            {currentPlanBlockCount === 0 && (
              <p className="text-[9px] text-amber-600 dark:text-amber-400">
                No planned blocks painted for this date yet. Paint blocks in Plan Mode first.
              </p>
            )}
          </div>

          {/* Saved Templates List */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Saved Blueprints ({templates.length})
            </h4>

            {templates.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                No routine blueprints saved yet.
              </div>
            ) : (
              templates.map((tpl) => {
                const blockCount = Object.keys(tpl.planBlocks || {}).length;
                return (
                  <div
                    key={tpl.id}
                    className="bg-white dark:bg-slate-800/90 border border-[#C2D8FC]/70 dark:border-slate-700 rounded-2xl p-3 shadow-xs space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          {tpl.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {blockCount} planned blocks ({Math.round(blockCount * 10 / 60)}h {Math.round(blockCount * 10 % 60)}m)
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          deleteTemplate(tpl.id);
                          triggerHaptic('medium');
                        }}
                        className="text-slate-300 hover:text-rose-500 p-1 rounded-lg transition-colors cursor-pointer"
                        title="Delete Blueprint"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {/* Apply Options */}
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleApplyDay(tpl.id, tpl.name)}
                        className="py-1 px-1.5 bg-[#E4EDFC] hover:bg-blue-100 dark:bg-slate-700 dark:hover:bg-slate-600 text-blue-700 dark:text-blue-300 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        title="Apply to current date"
                      >
                        <Check size={11} />
                        Today
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyWeekdays(tpl.id, tpl.name)}
                        className="py-1 px-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        title="Apply Mon-Fri starting this week"
                      >
                        Weekdays
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyFullWeek(tpl.id, tpl.name)}
                        className="py-1 px-1.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        title="Apply across next 7 days"
                      >
                        All 7 Days
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-[#E4EDFC] dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

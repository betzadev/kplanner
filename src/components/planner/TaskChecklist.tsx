import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  Trash2,
  CheckCircle2,
  History,
  Layers,
  Play,
  Sparkles,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import { usePlannerStore } from '../../store/usePlannerStore';
import { parseDateString, toDateString } from '../../utils/timeSlotMapper';
import { DateString, EntityId, PlannerTask } from '../../types';
import { CheckBox } from '../ui/CheckBox';
import { ColorCircle } from '../ui/ColorCircle';
import { useSubjectStore } from '../../store/useSubjectStore';
import { triggerHaptic } from '../../utils/haptics';
import { AutoSplitModal } from './AutoSplitModal';
import { useBackButton } from '../../hooks/useBackButton';
import { useLanguageStore } from '../../store/useLanguageStore';

interface TaskChecklistProps {
  date: DateString;
  tasks: PlannerTask[];
  onAddTask: (title: string, subjectId: EntityId) => void;
  onUpdateTask?: (taskId: EntityId, updates: Partial<Omit<PlannerTask, 'id' | 'date'>>) => void;
  onToggleTask: (taskId: EntityId) => void;
  onDeleteTask: (taskId: EntityId) => void;
  onStartFocus?: (taskId: EntityId, subjectId: EntityId) => void;
}

export function TaskChecklist({
  date,
  tasks,
  onAddTask,
  onUpdateTask,
  onToggleTask,
  onDeleteTask,
  onStartFocus,
}: TaskChecklistProps) {
  const t = useLanguageStore((state) => state.t);
  const [newTitle, setNewTitle] = useState('');
  const [autoSplitOpen, setAutoSplitOpen] = useState(false);
  const [isSpacedReview, setIsSpacedReview] = useState(false);

  // Task editing state
  const [editingTaskId, setEditingTaskId] = useState<EntityId | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSubjectId, setEditSubjectId] = useState<EntityId | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const currentSheet = usePlannerStore((state) => state.dailySheets[date]);
  const taskMinutesMap = React.useMemo(() => {
    const map = new Map<EntityId, number>();
    if (currentSheet?.timeGrid) {
      Object.values(currentSheet.timeGrid).forEach((cell) => {
        if (cell.taskId && cell.subjectId) {
          const mins = Math.round(10 * (cell.fillRatio ?? 1.0));
          map.set(cell.taskId, (map.get(cell.taskId) || 0) + mins);
        }
      });
    }
    return map;
  }, [currentSheet]);

  useBackButton({
    activeTab: 'planner',
    setActiveTab: () => {},
    openModals: [
      { name: 'autoSplit', isOpen: autoSplitOpen, close: () => setAutoSplitOpen(false) },
    ],
  });

  const subjects = useSubjectStore((state) => state.subjects);
  const selectedSubjectId = useSubjectStore((state) => state.selectedSubjectId) ?? subjects[0]?.id;
  const [taskSubjectId, setTaskSubjectId] = useState<EntityId | null>(null);

  const activeSubjectId = taskSubjectId || selectedSubjectId;
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  useEffect(() => {
    if (editingTaskId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingTaskId]);

  const handleStartEdit = (task: PlannerTask, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditSubjectId(task.subjectId);
    triggerHaptic('light');
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setEditTitle('');
    setEditSubjectId(null);
    triggerHaptic('light');
  };

  const handleSaveEdit = (taskId: EntityId, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = editTitle.trim();
    if (!trimmed) return;

    if (onUpdateTask) {
      onUpdateTask(taskId, {
        title: trimmed,
        ...(editSubjectId ? { subjectId: editSubjectId } : {}),
      });
    } else {
      usePlannerStore.getState().updateTask(date, taskId, {
        title: trimmed,
        ...(editSubjectId ? { subjectId: editSubjectId } : {}),
      });
    }

    setEditingTaskId(null);
    setEditTitle('');
    setEditSubjectId(null);
    triggerHaptic('success');
  };

  const handleAdd = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTitle.trim() || !activeSubjectId) return;

    onAddTask(newTitle, activeSubjectId);

    // Ebbinghaus Spaced Repetition Scheduler (1-3-7-14 Days)
    if (isSpacedReview) {
      const baseDate = parseDateString(date);
      const intervals = [
        { days: 1, label: '[Review D+1]' },
        { days: 3, label: '[Review D+3]' },
        { days: 7, label: '[Review D+7]' },
        { days: 14, label: '[Review D+14]' },
      ];

      intervals.forEach(({ days, label }) => {
        const revDate = new Date(baseDate);
        revDate.setDate(revDate.getDate() + days);
        const revDateStr = toDateString(revDate);
        usePlannerStore.getState().addTask(revDateStr, `${label} ${newTitle}`, activeSubjectId);
      });
      setIsSpacedReview(false);
    }

    setNewTitle('');
    triggerHaptic('medium');
  };

  const handleToggle = (taskId: EntityId) => {
    onToggleTask(taskId);
    triggerHaptic('success');
  };

  const handleDelete = (taskId: EntityId) => {
    onDeleteTask(taskId);
    triggerHaptic('warning');
  };

  const completedCount = tasks.filter((t) => t.isCompleted).length;

  return (
    <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-sm border border-[#C2D8FC]/60 dark:border-slate-800 rounded-3xl p-3.5 sm:p-5 flex flex-col h-full shadow-xs transition-colors space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[#E4EDFC] dark:border-slate-800">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={18} className="text-blue-600 dark:text-[#9FC6FC]" />
          <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
            {t.dailyTasks}
          </span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => {
              setAutoSplitOpen(true);
              triggerHaptic('light');
            }}
            className="text-[10px] sm:text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-[#E4EDFC] dark:bg-indigo-950/60 hover:bg-[#C2D8FC] dark:hover:bg-indigo-900/80 px-2.5 py-1.5 min-h-[36px] rounded-xl flex items-center gap-1 transition-colors cursor-pointer border border-indigo-200 dark:border-indigo-800"
            title="Auto-Split workload across days"
          >
            <Layers size={13} />
            <span className="hidden xs:inline">{t.autoSplit}</span>
          </button>

          {tasks.some((t) => t.isRolledOver) && (
            <span
              className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-[#E4EDFC] dark:bg-blue-950/60 px-2 py-1 rounded-full flex items-center gap-1"
              title="Includes unfinished tasks rolled over"
            >
              <History size={11} />
              <span className="hidden sm:inline">{t.rolledOver}</span>
            </span>
          )}
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 font-mono bg-[#E4EDFC]/70 dark:bg-slate-800 px-2.5 py-1.5 rounded-xl">
            {completedCount} / {tasks.length}
          </span>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto space-y-2 min-h-[140px] max-h-[320px] pr-0.5 scrollbar-thin">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-28 text-slate-400 dark:text-slate-500 text-xs italic gap-1.5 px-4 text-center">
            <span>{t.noTasks}</span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              {t.unfinishedRollover}
            </span>
          </div>
        ) : (
          tasks.map((task) => {
            const subject = subjectMap.get(task.subjectId);
            const isEditing = editingTaskId === task.id;

            if (isEditing) {
              return (
                <form
                  key={task.id}
                  onSubmit={(e) => handleSaveEdit(task.id, e)}
                  className="p-2.5 rounded-2xl border-2 border-blue-500 dark:border-[#9FC6FC] bg-blue-50/50 dark:bg-blue-950/40 shadow-xs space-y-2 animate-in fade-in duration-100"
                >
                  <div className="flex items-center gap-2">
                    <select
                      value={editSubjectId || task.subjectId}
                      onChange={(e) => setEditSubjectId(e.target.value as EntityId)}
                      className="text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-1.5 focus:outline-none min-h-[36px] cursor-pointer"
                    >
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id} className="dark:bg-slate-900">
                          {s.name}
                        </option>
                      ))}
                    </select>

                    <input
                      ref={editInputRef}
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                      placeholder={t.editTaskTitle}
                      className="flex-1 min-w-0 text-xs sm:text-sm px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[36px]"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="min-h-[44px] min-w-[44px] px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      title={t.cancel}
                    >
                      <X size={15} />
                      <span>{t.cancel}</span>
                    </button>
                    <button
                      type="submit"
                      disabled={!editTitle.trim()}
                      className="min-h-[44px] min-w-[44px] px-3.5 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white dark:bg-[#9FC6FC] dark:text-slate-900 rounded-xl flex items-center justify-center gap-1 cursor-pointer shadow-xs disabled:opacity-40 transition-transform active:scale-95"
                      title={t.saveChanges}
                    >
                      <Check size={15} />
                      <span>{t.saveChanges}</span>
                    </button>
                  </div>
                </form>
              );
            }

            return (
              <div
                key={task.id}
                className={`flex items-center gap-2.5 py-2 px-3 rounded-2xl border transition-colors min-h-[48px] ${
                  task.isCompleted
                    ? 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                    : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-[#9FC6FC] dark:hover:border-slate-700'
                }`}
              >
                <div title={subject?.name ?? 'Subject'} className="shrink-0 p-1">
                  <ColorCircle color={subject?.color ?? '#CBD5E1'} size={14} />
                </div>

                <div
                  onClick={() => handleToggle(task.id)}
                  className="flex-1 cursor-pointer select-none min-w-0 py-1"
                >
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`text-xs sm:text-sm font-medium leading-tight ${
                        task.isCompleted
                          ? 'line-through text-slate-400 dark:text-slate-500'
                          : 'text-slate-800 dark:text-slate-100'
                      }`}
                    >
                      {task.title}
                    </span>
                    {task.isRolledOver && (
                      <span
                        className="text-[9px] font-semibold text-blue-600 dark:text-blue-400 bg-[#E4EDFC]/80 dark:bg-slate-800 px-1.5 py-0.5 rounded-md"
                        title={task.originalDate ? `From ${task.originalDate}` : 'Rolled over'}
                      >
                        {t.fromEarlier}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {taskMinutesMap.has(task.id) && (
                    <span className="text-[10px] font-bold font-mono text-blue-700 dark:text-[#9FC6FC] bg-blue-100/80 dark:bg-blue-950/80 px-2 py-0.5 rounded-full">
                      {taskMinutesMap.get(task.id)}m {t.loggedTime}
                    </span>
                  )}

                  {!task.isCompleted && onStartFocus && (
                    <button
                      type="button"
                      onClick={() => onStartFocus(task.id, task.subjectId)}
                      className="min-h-[44px] min-w-[44px] p-2 text-blue-600 hover:text-blue-700 dark:text-[#9FC6FC] hover:bg-[#E4EDFC] dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer flex items-center justify-center"
                      title={t.focusNow}
                      aria-label={t.focusNow}
                    >
                      <Play size={14} className="fill-blue-600 dark:fill-[#9FC6FC]" />
                    </button>
                  )}

                  {/* Task Edit Button */}
                  <button
                    type="button"
                    onClick={(e) => handleStartEdit(task, e)}
                    className="min-h-[44px] min-w-[44px] p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer flex items-center justify-center"
                    title={t.editTask}
                    aria-label={t.editTask}
                  >
                    <Pencil size={15} />
                  </button>

                  <div className="flex items-center justify-center min-h-[44px] min-w-[36px]">
                    <CheckBox checked={task.isCompleted} onToggle={() => handleToggle(task.id)} size={22} />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(task.id)}
                    className="min-h-[44px] min-w-[44px] p-2 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 active:text-rose-600 rounded-xl transition-colors cursor-pointer flex items-center justify-center"
                    title={t.deleteTask}
                    aria-label={t.deleteTask}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Task Input Form */}
      <form onSubmit={handleAdd} className="pt-2 border-t border-[#E4EDFC] dark:border-slate-800 flex items-center gap-2 w-full">
        <select
          value={activeSubjectId}
          onChange={(e) => setTaskSubjectId(e.target.value as EntityId)}
          className="text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-[#C2D8FC] dark:border-slate-700 rounded-2xl px-2.5 py-2.5 min-h-[44px] focus:outline-none max-w-[110px] truncate cursor-pointer shadow-2xs"
          title="Select Subject"
        >
          {subjects.map((s) => (
            <option key={s.id} value={s.id} className="dark:bg-slate-900">
              {s.name}
            </option>
          ))}
        </select>

        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder={t.addTaskPlaceholder}
          className="flex-1 min-w-0 text-xs sm:text-sm px-3 py-2.5 min-h-[44px] text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-[#C2D8FC] dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#9FC6FC] dark:focus:ring-blue-400 placeholder-slate-400 dark:placeholder-slate-500 shadow-2xs"
        />

        <button
          type="submit"
          disabled={!newTitle.trim()}
          className="min-h-[44px] min-w-[44px] p-2.5 bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded-2xl cursor-pointer transition-transform active:scale-95 shadow-xs shrink-0 disabled:opacity-30 flex items-center justify-center"
          title={t.addTaskButton}
          aria-label={t.addTaskButton}
        >
          <Plus size={20} />
        </button>
      </form>

      {/* Spaced Repetition Toggle */}
      <div className="flex items-center justify-between pt-0.5 px-1">
        <button
          type="button"
          onClick={() => {
            setIsSpacedReview(!isSpacedReview);
            triggerHaptic('light');
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-xl text-[10px] sm:text-xs font-bold border transition-all cursor-pointer ${
            isSpacedReview
              ? 'bg-purple-100 text-purple-900 dark:bg-purple-950/80 dark:text-purple-200 border-purple-300 dark:border-purple-700 shadow-2xs ring-1 ring-purple-400/40'
              : 'bg-white/80 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
          }`}
          title="Schedule Ebbinghaus Spaced Reviews on D+1, D+3, D+7, and D+14"
        >
          <Sparkles size={12} className={isSpacedReview ? 'text-purple-600 dark:text-purple-300' : ''} />
          <span>{isSpacedReview ? t.spacedReviewOn : t.spacedReview}</span>
        </button>
      </div>

      {/* Auto Split Workload Modal */}
      <AutoSplitModal
        isOpen={autoSplitOpen}
        onClose={() => setAutoSplitOpen(false)}
        currentDate={date}
      />
    </div>
  );
}

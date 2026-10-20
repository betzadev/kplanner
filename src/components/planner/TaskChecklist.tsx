import React, { useState } from 'react';
import { Plus, Trash2, CheckCircle2, History, Layers } from 'lucide-react';
import { DateString, EntityId, PlannerTask } from '../../types';
import { CheckBox } from '../ui/CheckBox';
import { ColorCircle } from '../ui/ColorCircle';
import { useSubjectStore } from '../../store/useSubjectStore';
import { triggerHaptic } from '../../utils/haptics';
import { AutoSplitModal } from './AutoSplitModal';

interface TaskChecklistProps {
  date: DateString;
  tasks: PlannerTask[];
  onAddTask: (title: string, subjectId: EntityId) => void;
  onToggleTask: (taskId: EntityId) => void;
  onDeleteTask: (taskId: EntityId) => void;
}

export function TaskChecklist({
  date,
  tasks,
  onAddTask,
  onToggleTask,
  onDeleteTask,
}: TaskChecklistProps) {
  const [newTitle, setNewTitle] = useState('');
  const [autoSplitOpen, setAutoSplitOpen] = useState(false);
  const subjects = useSubjectStore((state) => state.subjects);
  const selectedSubjectId = useSubjectStore((state) => state.selectedSubjectId) ?? subjects[0]?.id;
  const [taskSubjectId, setTaskSubjectId] = useState<EntityId | null>(null);

  const activeSubjectId = taskSubjectId || selectedSubjectId;
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  const handleAdd = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTitle.trim() || !activeSubjectId) return;
    onAddTask(newTitle, activeSubjectId);
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
    <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-sm border border-[#C2D8FC]/60 dark:border-slate-800 rounded-3xl p-4 sm:p-5 flex flex-col h-full shadow-sm transition-colors space-y-3">
      <div className="flex items-center justify-between pb-2.5 border-b border-[#E4EDFC] dark:border-slate-800">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={17} className="text-blue-600 dark:text-[#9FC6FC]" />
          <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200">
            Daily Tasks
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Phase 3.3 Auto-Split Workload Generator Button */}
          <button
            type="button"
            onClick={() => {
              setAutoSplitOpen(true);
              triggerHaptic('light');
            }}
            className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-[#E4EDFC] dark:bg-indigo-950/60 hover:bg-[#C2D8FC] dark:hover:bg-indigo-900/80 px-2.5 py-1 rounded-xl flex items-center gap-1 transition-colors cursor-pointer border border-indigo-200 dark:border-indigo-800"
            title="Auto-Split a big workload (pages/chapters) across future days"
          >
            <Layers size={11} />
            <span>Auto-Split</span>
          </button>

          {tasks.some((t) => t.isRolledOver) && (
            <span
              className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-[#E4EDFC] dark:bg-blue-950/60 px-2 py-0.5 rounded-full flex items-center gap-1"
              title="Includes unfinished tasks forwarded from previous days"
            >
              <History size={11} />
              <span>Rolled over</span>
            </span>
          )}
          <span className="text-xs font-bold text-slate-600 dark:text-slate-400 font-mono bg-[#E4EDFC]/60 dark:bg-slate-800 px-2.5 py-1 rounded-xl">
            {completedCount} / {tasks.length}
          </span>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto space-y-2 min-h-[140px] max-h-[300px] pr-0.5 scrollbar-thin">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-28 text-slate-400 dark:text-slate-500 text-xs italic gap-1">
            <span>No tasks planned for today.</span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">Unfinished tasks will roll over automatically.</span>
          </div>
        ) : (
          tasks.map((task) => {
            const subject = subjectMap.get(task.subjectId);
            return (
              <div
                key={task.id}
                className={`flex items-center gap-3 py-2.5 px-3 rounded-2xl border transition-colors ${
                  task.isCompleted
                    ? 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                    : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-[#9FC6FC] dark:hover:border-slate-700'
                }`}
              >
                <div title={subject?.name ?? 'Subject'} className="shrink-0">
                  <ColorCircle color={subject?.color ?? '#CBD5E1'} size={16} />
                </div>
                <div
                  onClick={() => handleToggle(task.id)}
                  className="flex-1 cursor-pointer select-none min-w-0"
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
                        title={task.originalDate ? `Carried over from ${task.originalDate}` : 'Carried over from earlier day'}
                      >
                        from {task.originalDate?.substring(5) || 'earlier'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <CheckBox checked={task.isCompleted} onToggle={() => handleToggle(task.id)} size={22} />
                  <button
                    type="button"
                    onClick={() => handleDelete(task.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 active:text-red-600 rounded-xl transition-colors cursor-pointer"
                    title="Delete"
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
          className="text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-[#C2D8FC] dark:border-slate-700 rounded-2xl px-2.5 py-2.5 focus:outline-none max-w-[100px] truncate cursor-pointer shadow-2xs"
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
          placeholder="+ Add task..."
          className="flex-1 min-w-0 text-xs sm:text-sm px-3 py-2.5 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-[#C2D8FC] dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#9FC6FC] dark:focus:ring-blue-400 placeholder-slate-400 dark:placeholder-slate-500 shadow-2xs"
        />

        <button
          type="submit"
          disabled={!newTitle.trim()}
          className="p-2.5 bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded-2xl cursor-pointer transition-transform active:scale-95 shadow-xs shrink-0 disabled:opacity-30"
          title="Add Task"
        >
          <Plus size={18} />
        </button>
      </form>

      {/* Auto Split Workload Modal */}
      <AutoSplitModal
        isOpen={autoSplitOpen}
        onClose={() => setAutoSplitOpen(false)}
        currentDate={date}
      />
    </div>
  );
}

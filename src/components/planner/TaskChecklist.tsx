import React, { useState } from 'react';
import { Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { DateString, EntityId, PlannerTask } from '../../types';
import { CheckBox } from '../ui/CheckBox';
import { ColorCircle } from '../ui/ColorCircle';
import { useSubjectStore } from '../../store/useSubjectStore';
import { triggerHaptic } from '../../utils/haptics';

interface TaskChecklistProps {
  date: DateString;
  tasks: PlannerTask[];
  onAddTask: (title: string, subjectId: EntityId) => void;
  onToggleTask: (taskId: EntityId) => void;
  onDeleteTask: (taskId: EntityId) => void;
}

export function TaskChecklist({
  tasks,
  onAddTask,
  onToggleTask,
  onDeleteTask,
}: TaskChecklistProps) {
  const [newTitle, setNewTitle] = useState('');
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
    <div className="bg-white border border-slate-300 rounded-lg p-3 flex flex-col h-full shadow-xs">
      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 size={14} className="text-slate-600" />
          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
            Daily Tasks / 할 일
          </span>
        </div>
        <span className="text-[11px] font-bold text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded">
          {completedCount} / {tasks.length}
        </span>
      </div>

      {/* Task List with Mobile Touch Targets */}
      <div className="flex-1 overflow-y-auto space-y-1.5 min-h-[160px] max-h-[380px] pr-0.5 scrollbar-thin">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-400 text-xs italic gap-1">
            <span>No tasks planned for today.</span>
            <span className="text-[10px] text-slate-300">Tap below to add your first study task!</span>
          </div>
        ) : (
          tasks.map((task) => {
            const subject = subjectMap.get(task.subjectId);
            return (
              <div
                key={task.id}
                className={`flex items-center gap-2.5 py-2 px-2.5 rounded-md border transition-all ${
                  task.isCompleted
                    ? 'bg-slate-50/70 border-slate-200'
                    : 'bg-white border-slate-200 shadow-2xs hover:border-slate-300'
                }`}
              >
                <div title={subject?.name ?? 'Subject'} className="shrink-0">
                  <ColorCircle color={subject?.color ?? '#CBD5E1'} size={14} />
                </div>
                <span
                  onClick={() => handleToggle(task.id)}
                  className={`flex-1 text-xs font-medium cursor-pointer leading-tight select-none ${
                    task.isCompleted ? 'line-through text-slate-400' : 'text-slate-800'
                  }`}
                >
                  {task.title}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <CheckBox checked={task.isCompleted} onToggle={() => handleToggle(task.id)} size={20} />
                  <button
                    type="button"
                    onClick={() => handleDelete(task.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 active:text-red-600 rounded transition-colors cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Mobile Input Field */}
      <form onSubmit={handleAdd} className="mt-2.5 pt-2 border-t border-slate-200 flex items-center gap-2">
        <select
          value={activeSubjectId}
          onChange={(e) => setTaskSubjectId(e.target.value as EntityId)}
          className="text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-300 rounded-md px-2 py-2 focus:outline-none max-w-[110px] truncate"
        >
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="+ Add task..."
          className="flex-1 text-xs px-2.5 py-2 text-slate-800 bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-1.5 focus:ring-slate-700"
        />

        <button
          type="submit"
          disabled={!newTitle.trim()}
          className="p-2 bg-slate-800 active:bg-slate-950 disabled:opacity-30 text-white rounded-md cursor-pointer transition-transform active:scale-95 shadow-xs shrink-0"
          title="Add"
        >
          <Plus size={16} />
        </button>
      </form>
    </div>
  );
}

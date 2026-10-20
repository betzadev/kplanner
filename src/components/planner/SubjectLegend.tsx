import { EntityId } from '../../types';
import { ColorCircle } from '../ui/ColorCircle';
import { useSubjectStore } from '../../store/useSubjectStore';
import { triggerHaptic } from '../../utils/haptics';

interface SubjectLegendProps {
  onEditSubject?: (subjectId: EntityId) => void;
}

export function SubjectLegend({ onEditSubject }: SubjectLegendProps) {
  const subjects = useSubjectStore((state) => state.subjects);
  const selectedSubjectId = useSubjectStore((state) => state.selectedSubjectId);
  const selectSubject = useSubjectStore((state) => state.selectSubject);

  const handleSelect = (id: EntityId) => {
    selectSubject(selectedSubjectId === id ? null : id);
    triggerHaptic('light');
  };

  return (
    <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-sm border border-[#C2D8FC]/60 dark:border-slate-800 rounded-3xl p-3 sm:p-4 shadow-sm transition-colors space-y-2">
      {/* Header with Title and hint */}
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
          Subject Palette
        </span>
        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
          {selectedSubjectId ? 'Ready to paint grid' : 'Tap a subject to paint'}
        </span>
      </div>

      {/* Subjects horizontal list */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-thin smooth-scroll">
        {subjects.map((item) => {
          const isSelected = item.id === selectedSubjectId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item.id)}
              onDoubleClick={() => onEditSubject?.(item.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 active:scale-95 ${
                isSelected
                  ? 'border-blue-600 dark:border-[#9FC6FC] bg-[#E4EDFC] dark:bg-blue-950/80 text-blue-900 dark:text-white ring-1 ring-blue-500 shadow-xs'
                  : 'border-[#E4EDFC] dark:border-slate-800 bg-white/90 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-[#E4EDFC]/50 dark:hover:bg-slate-800'
              }`}
            >
              <ColorCircle color={item.color} size={14} isSelected={isSelected} />
              <span className="truncate max-w-[120px] select-none text-xs">{item.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

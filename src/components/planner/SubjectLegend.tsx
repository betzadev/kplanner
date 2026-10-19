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
    <div className="bg-white border border-slate-300 rounded-lg p-2.5 shadow-xs">
      <div className="flex items-center justify-between mb-1.5 px-0.5">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Subject Palette / 과목 선택
        </span>
        <span className="text-[10px] text-slate-400 font-medium">
          {selectedSubjectId ? 'Paintbrush active' : 'Tap to select'}
        </span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin smooth-scroll">
        {subjects.map((item) => {
          const isSelected = item.id === selectedSubjectId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item.id)}
              onDoubleClick={() => onEditSubject?.(item.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 active:scale-95 ${
                isSelected
                  ? 'border-slate-800 bg-slate-100 text-slate-900 shadow-xs ring-1 ring-slate-800'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ColorCircle color={item.color} size={15} isSelected={isSelected} />
              <span className="truncate max-w-[130px]">{item.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

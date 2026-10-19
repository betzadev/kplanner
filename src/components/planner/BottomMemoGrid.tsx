interface BottomMemoGridProps {
  memos: [string, string, string, string, string, string];
  onMemoChange: (index: 0 | 1 | 2 | 3 | 4 | 5, text: string) => void;
}

const MEMO_LABELS = ['REVIEW 1', 'REVIEW 2', 'REFLECTION', 'NOTES', 'VOCAB', 'TOMORROW'];

export function BottomMemoGrid({ memos, onMemoChange }: BottomMemoGridProps) {
  return (
    <div className="bg-white border border-slate-300 rounded-lg p-3 shadow-xs">
      <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
        Daily Reflection & Notes / 메모 및 복습
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {([0, 1, 2, 3, 4, 5] as const).map((idx) => (
          <div
            key={idx}
            className="p-2.5 bg-slate-50/70 border border-slate-200 rounded-md flex flex-col h-28 focus-within:border-slate-500 transition-colors"
          >
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
              {MEMO_LABELS[idx]}
            </span>
            <textarea
              value={memos[idx]}
              onChange={(e) => onMemoChange(idx, e.target.value)}
              placeholder="Write note..."
              className="flex-1 w-full text-xs text-slate-800 placeholder-slate-300 bg-transparent resize-none focus:outline-none scrollbar-thin"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

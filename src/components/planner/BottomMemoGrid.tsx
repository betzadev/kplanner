interface BottomMemoGridProps {
  memos: [string, string, string, string, string, string];
  onMemoChange: (index: 0 | 1 | 2 | 3 | 4 | 5, text: string) => void;
}

const MEMO_LABELS = ['REVIEW 1', 'REVIEW 2', 'REFLECTION', 'KEY NOTES', 'VOCAB & CONCEPTS', 'TOMORROW PLAN'];

export function BottomMemoGrid({ memos, onMemoChange }: BottomMemoGridProps) {
  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-[#C2D8FC]/60 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xs transition-colors">
      <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
        Daily Notes & Reflection
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {([0, 1, 2, 3, 4, 5] as const).map((idx) => (
          <div
            key={idx}
            className="p-2.5 bg-white/70 dark:bg-slate-800/60 border border-[#E4EDFC] dark:border-slate-700/80 rounded-xl flex flex-col h-28 focus-within:border-[#9FC6FC] dark:focus-within:border-slate-400 transition-colors"
          >
            <span className="text-[9px] font-extrabold text-blue-600 dark:text-slate-400 uppercase tracking-wider mb-1">
              {MEMO_LABELS[idx]}
            </span>
            <textarea
              value={memos[idx]}
              onChange={(e) => onMemoChange(idx, e.target.value)}
              placeholder="Write note..."
              className="flex-1 w-full text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 bg-transparent resize-none focus:outline-none scrollbar-thin"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

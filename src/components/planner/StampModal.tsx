import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AVAILABLE_STAMPS, useGamificationStore } from '../../store/useGamificationStore';
import { triggerHaptic } from '../../utils/haptics';
import { Stamp, X, Check, Gem, Sparkles, Trash2 } from 'lucide-react';

interface StampModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStamp: string | null;
  onSelectStamp: (stampId: string | null) => void;
}

export function StampModal({
  isOpen,
  onClose,
  currentStamp,
  onSelectStamp,
}: StampModalProps) {
  const gems = useGamificationStore((state) => state.gems) ?? 0;
  const unlockedStamps = useGamificationStore((state) => state.unlockedStamps) ?? ['100% Focus'];
  const buyStamp = useGamificationStore((state) => state.buyStamp);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === "undefined") return null;

  const handleApply = (stampId: string) => {
    onSelectStamp(stampId);
    triggerHaptic('success');
    onClose();
  };

  const handleClear = () => {
    onSelectStamp(null);
    triggerHaptic('medium');
    onClose();
  };

  const handleBuy = (stampId: string, price: number) => {
    if (buyStamp(stampId, price)) {
      triggerHaptic('success');
      onSelectStamp(stampId);
      onClose();
    } else {
      triggerHaptic('warning');
    }
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
      <div className="bg-white dark:bg-slate-900 border border-[#C2D8FC] dark:border-slate-800 rounded-3xl p-5 w-full max-w-sm shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E4EDFC] dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <Stamp size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Daily Completion Stamp
              </h3>
              <p className="text-[10px] text-slate-400">
                Stamp your daily sheet to celebrate focus
              </p>
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

        {/* Gems Balance Banner */}
        <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-[#E4EDFC]/60 dark:bg-slate-800 border border-[#C2D8FC] dark:border-slate-700 text-xs font-semibold">
          <span className="text-slate-600 dark:text-slate-300">Your Gems</span>
          <span className="font-mono font-black text-blue-700 dark:text-[#9FC6FC] flex items-center gap-1">
            <Gem size={13} className="text-cyan-500" />
            {gems}
          </span>
        </div>

        {/* Current Stamp Status */}
        {currentStamp && (
          <div className="p-3 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">
                Active Stamp
              </span>
              <span className="text-xs font-black text-rose-700 dark:text-rose-300">
                {currentStamp}
              </span>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-xl transition-colors cursor-pointer"
            >
              <Trash2 size={13} />
              <span>Clear</span>
            </button>
          </div>
        )}

        {/* Stamp List */}
        <div className="space-y-2">
          {AVAILABLE_STAMPS.map((stamp) => {
            const isUnlocked = unlockedStamps.includes(stamp.id);
            const isSelected = currentStamp === stamp.id;

            return (
              <div
                key={stamp.id}
                className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-2.5 ${
                  isSelected
                    ? 'border-rose-400 dark:border-rose-600 bg-rose-50/40 dark:bg-rose-950/20 shadow-xs'
                    : 'border-[#E4EDFC] dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40'
                }`}
              >
                {/* Stamp Preview */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border-2 border-dashed border-rose-500/80 bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 font-black tracking-wider text-[11px] uppercase transform -rotate-2 select-none shadow-2xs shrink-0">
                    <span>{stamp.icon}</span>
                    <span className="truncate max-w-[110px]">{stamp.name}</span>
                  </div>
                </div>

                {/* Action button */}
                <div className="shrink-0">
                  {isSelected ? (
                    <span className="flex items-center gap-1 text-[11px] font-black text-emerald-600 dark:text-emerald-400 px-2 py-1">
                      <Check size={14} /> Applied
                    </span>
                  ) : isUnlocked ? (
                    <button
                      type="button"
                      onClick={() => handleApply(stamp.id)}
                      className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-transform cursor-pointer"
                    >
                      Apply
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleBuy(stamp.id, stamp.priceGems)}
                      disabled={gems < stamp.priceGems}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        gems >= stamp.priceGems
                          ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs active:scale-95'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <Sparkles size={12} />
                      <span>{stamp.priceGems} Gems</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
}

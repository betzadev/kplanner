import { Flame, Shield, Zap, Sparkles, Check, X, Award, Crown } from 'lucide-react';
import { useGamificationStore, STREAK_MILESTONES, getLevelInfo } from '../../store/useGamificationStore';
import { triggerHaptic } from '../../utils/haptics';

interface StreakModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StreakModal({ isOpen, onClose }: StreakModalProps) {
  if (!isOpen) return null;

  const {
    xp,
    gems,
    streakFreezes,
    claimedMilestones,
    calculateStreak,
    buyStreakFreeze,
    claimMilestone,
  } = useGamificationStore();

  const { streakCount, hasStudiedToday, todayMinutes, weekDays } = calculateStreak();
  const levelInfo = getLevelInfo(xp);

  const handleBuyShield = () => {
    if (buyStreakFreeze()) {
      triggerHaptic('success');
    } else {
      triggerHaptic('warning');
    }
  };

  const handleClaim = (milestoneId: string) => {
    claimMilestone(milestoneId);
    triggerHaptic('success');
  };

  const getMilestoneIcon = (iconType: string) => {
    switch (iconType) {
      case 'flame':
        return <Flame size={18} className="text-orange-500" />;
      case 'zap':
        return <Zap size={18} className="text-amber-500" />;
      case 'shield':
        return <Shield size={18} className="text-blue-500" />;
      case 'crown':
        return <Crown size={18} className="text-amber-400" />;
      default:
        return <Award size={18} className="text-blue-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-sm sm:max-w-md bg-white dark:bg-slate-900 border border-[#C2D8FC]/80 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-2xl max-h-[88vh] overflow-y-auto scrollbar-thin space-y-3.5">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Flame size={20} className="text-amber-500 fill-amber-500" />
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
                Streak & Study Rewards
              </h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                Level up your daily learning habit
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Duolingo Hero Flame Banner */}
        <div className="bg-[#E4EDFC] dark:bg-slate-800/90 border border-[#C2D8FC] dark:border-slate-700 rounded-2xl p-3.5 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white dark:bg-slate-900 shadow-xs mb-1.5">
            <Flame size={32} className="text-amber-500 fill-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-950 dark:text-white font-mono leading-none">
            {streakCount} {streakCount === 1 ? 'Day' : 'Days'}
          </div>
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1 leading-tight">
            {hasStudiedToday
              ? `You kept your streak alive today with ${todayMinutes}m of focus!`
              : 'Study at least 10 minutes today to maintain your streak!'}
          </p>

          {/* 7-Day Flame Track */}
          <div className="flex items-center justify-between gap-1 mt-3 pt-2.5 border-t border-blue-200/60 dark:border-slate-700/60">
            {weekDays.map((d) => (
              <div key={d.date} className="flex flex-col items-center gap-1 flex-1 min-w-0">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-transform ${
                    d.studied
                      ? 'bg-amber-500 text-white font-bold shadow-xs scale-105'
                      : d.isToday
                      ? 'border-2 border-dashed border-amber-400 text-amber-500'
                      : 'bg-white/80 dark:bg-slate-700 text-slate-400'
                  }`}
                >
                  {d.studied ? (
                    <Flame size={13} className="fill-white" />
                  ) : d.isToday ? (
                    <span className="font-mono text-[8px]">Now</span>
                  ) : (
                    <span className="text-slate-400 text-[10px]">•</span>
                  )}
                </div>
                <span className="text-[9px] font-semibold text-slate-600 dark:text-slate-400">
                  {d.dayLabel}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Level Progression */}
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Sparkles size={14} className="text-blue-500" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Level {levelInfo.level}: {levelInfo.title}
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
              {levelInfo.currentLevelXp} / {levelInfo.xpNeeded} XP
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#9FC6FC] dark:bg-blue-400 rounded-full transition-colors duration-300"
              style={{ width: `${Math.min(100, levelInfo.progressPercent)}%` }}
            />
          </div>
        </div>

        {/* Gems & Power-ups */}
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-cyan-100 dark:bg-cyan-950 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
              <Shield size={18} />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                Streak Freeze Shield
              </div>
              <div className="text-[10px] text-slate-500">
                {streakFreezes} active • Costs 100 Gems
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleBuyShield}
            disabled={gems < 100}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              gems >= 100
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
            }`}
          >
            Buy (100 Gems)
          </button>
        </div>

        {/* Milestone Badges List */}
        <div>
          <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
            Milestone Rewards
          </div>
          <div className="space-y-1.5">
            {STREAK_MILESTONES.map((m) => {
              const isUnlocked = streakCount >= m.daysRequired;
              const isClaimed = claimedMilestones.includes(m.id);

              return (
                <div
                  key={m.id}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors ${
                    isClaimed
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-300'
                      : isUnlocked
                      ? 'bg-[#E4EDFC]/80 dark:bg-slate-800 border-[#C2D8FC] dark:border-slate-700 shadow-xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="shrink-0">{getMilestoneIcon(m.iconType)}</div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate">{m.title}</div>
                      <div className="text-[10px] opacity-80 truncate">{m.description}</div>
                    </div>
                  </div>

                  <div className="shrink-0 ml-2">
                    {isClaimed ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        <Check size={12} /> Claimed
                      </span>
                    ) : isUnlocked ? (
                      <button
                        type="button"
                        onClick={() => handleClaim(m.id)}
                        className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold rounded-lg shadow-xs flex items-center gap-1 cursor-pointer active:scale-95"
                      >
                        Claim +{m.gemReward} Gems
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-mono">
                        {m.daysRequired}d goal
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

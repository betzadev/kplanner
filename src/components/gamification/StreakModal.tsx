import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Flame,
  Shield,
  Zap,
  Sparkles,
  Check,
  X,
  Award,
  Crown,
  Palette,
  Stamp,
  BellRing,
  ShoppingBag,
  ListTodo,
  Gift,
  Medal,
  Gem,
  Play,
} from 'lucide-react';
import {
  useGamificationStore,
  STREAK_MILESTONES,
  AVAILABLE_STAMPS,
  AVAILABLE_CHIMES,
  getLevelInfo,
  WEEKLY_CHESTS,
  getCurrentWeekMonday,
} from '../../store/useGamificationStore';
import { UNLOCKABLE_THEMES } from '../../types';
import { triggerHaptic } from '../../utils/haptics';
import { useLanguageStore } from '../../store/useLanguageStore';
import { useTimerStore } from '../../store/useTimerStore';
import { ambientAudio, ChimePresetType } from '../../utils/ambientAudio';

interface StreakModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StreakModal({ isOpen, onClose }: StreakModalProps) {
  const t = useLanguageStore((state) => state.t);
  const [activeTab, setActiveTab] = useState<'streak' | 'quests' | 'shop'>('streak');

  const xp = useGamificationStore((state) => state.xp) ?? 120;
  const gems = useGamificationStore((state) => state.gems) ?? 120;
  const streakFreezes = useGamificationStore((state) => state.streakFreezes) ?? 1;
  const claimedMilestones = useGamificationStore((state) => state.claimedMilestones) ?? [];
  const unlockedThemes = useGamificationStore((state) => state.unlockedThemes) ?? [];
  const unlockedStamps = useGamificationStore((state) => state.unlockedStamps) ?? ['100% Focus'];
  const unlockedChimes = useGamificationStore((state) => state.unlockedChimes) ?? ['default'];
  const dailyQuests = useGamificationStore((state) => state.dailyQuests) ?? [];
  const calculateStreak = useGamificationStore((state) => state.calculateStreak);
  const buyStreakFreeze = useGamificationStore((state) => state.buyStreakFreeze);
  const buyTheme = useGamificationStore((state) => state.buyTheme);
  const buyStamp = useGamificationStore((state) => state.buyStamp);
  const buyChime = useGamificationStore((state) => state.buyChime);
  const claimMilestone = useGamificationStore((state) => state.claimMilestone);
  const claimQuest = useGamificationStore((state) => state.claimQuest);
  const claimedWeeklyChests = useGamificationStore((state) => state.claimedWeeklyChests) ?? [];
  const getWeeklyStudyMinutes = useGamificationStore((state) => state.getWeeklyStudyMinutes);
  const claimWeeklyChest = useGamificationStore((state) => state.claimWeeklyChest);

  const currentChimePreset = useTimerStore((state) => state.timerConfig.chimePreset || 'default');
  const updateTimerConfig = useTimerStore((state) => state.updateConfig);

  const currentMonday = getCurrentWeekMonday();
  const weeklyMins = getWeeklyStudyMinutes ? getWeeklyStudyMinutes() : 0;
  const weeklyHours = Math.round((weeklyMins / 60) * 10) / 10;

  const streakResult = calculateStreak ? calculateStreak() : { streakCount: 0, hasStudiedToday: false, todayMinutes: 0, weekDays: [] };
  const { streakCount = 0, hasStudiedToday = false, todayMinutes = 0, weekDays = [] } = streakResult || {};
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

  const handleClaimQuest = (questId: string) => {
    claimQuest(questId);
    triggerHaptic('success');
  };

  const handlePreviewChime = (chimeId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    ambientAudio.playChime(chimeId as ChimePresetType);
    triggerHaptic('light');
  };

  const handleSelectActiveChime = (chimeId: string) => {
    updateTimerConfig({ chimePreset: chimeId });
    ambientAudio.playChime(chimeId as ChimePresetType);
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

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
    >
      <div data-ui="modal" className="w-full max-w-sm sm:max-w-md bg-white dark:bg-slate-900 border border-[#C2D8FC]/80 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-2xl max-h-[88vh] overflow-y-auto scrollbar-thin space-y-3.5">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Flame size={22} className="text-amber-500 fill-amber-500" />
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
                {t.streakRewardsTitle}
              </h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                {t.streakRewardsSubtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center bg-[#E4EDFC]/70 dark:bg-slate-800 p-0.5 rounded-2xl border border-[#C2D8FC] dark:border-slate-700">
          <button
            type="button"
            onClick={() => {
              setActiveTab('streak');
              triggerHaptic('light');
            }}
            className={`flex-1 min-h-[38px] py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1 ${
              activeTab === 'streak'
                ? 'bg-blue-600 dark:bg-[#9FC6FC] text-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Flame size={14} />
            <span>{t.tabStreak}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('quests');
              triggerHaptic('light');
            }}
            className={`flex-1 min-h-[38px] py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1 ${
              activeTab === 'quests'
                ? 'bg-blue-600 dark:bg-[#9FC6FC] text-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ListTodo size={14} />
            <span>{t.tabQuests}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('shop');
              triggerHaptic('light');
            }}
            className={`flex-1 min-h-[38px] py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1 ${
              activeTab === 'shop'
                ? 'bg-blue-600 dark:bg-[#9FC6FC] text-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShoppingBag size={14} />
            <span>{t.tabShop}</span>
          </button>
        </div>

        {/* 1. STREAK TAB */}
        {activeTab === 'streak' && (
          <div className="space-y-3">
            <div className="bg-[#E4EDFC] dark:bg-slate-800/90 border border-[#C2D8FC] dark:border-slate-700 rounded-2xl p-3.5 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white dark:bg-slate-900 shadow-xs mb-1.5">
                <Flame size={32} className="text-amber-500 fill-amber-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-blue-950 dark:text-white tabular-nums leading-none">
                {streakCount} {streakCount === 1 ? 'Day' : 'Days'}
              </div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1 leading-tight">
                {hasStudiedToday
                  ? `You kept your streak alive today with ${todayMinutes}m of focus!`
                  : 'Study at least 10 minutes today to maintain your streak!'}
              </p>

              {/* 7-Day Flame Track */}
              <div className="flex items-center justify-between gap-1 mt-3 pt-2.5">
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
                        <span className="tabular-nums text-[8px]">Now</span>
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
                <span className="text-[10px] tabular-nums text-slate-500 dark:text-slate-400">
                  {levelInfo.currentLevelXp} / {levelInfo.xpNeeded} XP
                </span>
              </div>

              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#9FC6FC] dark:bg-blue-400 rounded-full transition-colors duration-300"
                  style={{ width: `${Math.min(100, levelInfo.progressPercent)}%` }}
                />
              </div>
            </div>

            {/* Weekly Milestone Study Chests */}
            <div className="bg-[#F0F5FD] dark:bg-slate-800/80 border border-[#C2D8FC] dark:border-slate-700 rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Gift size={15} className="text-blue-700 dark:text-[#9FC6FC]" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    {t.weeklyChestsTitle}
                  </span>
                </div>
                <span className="text-[9px] font-semibold text-slate-600 dark:text-slate-400 bg-white/90 dark:bg-slate-900 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                  Resets Mon • {weeklyHours}h / 35h
                </span>
              </div>

              <div className="space-y-1">
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 dark:bg-[#9FC6FC] rounded-full transition-[width] duration-300"
                    style={{ width: `${Math.min(100, (weeklyMins / 2100) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-slate-500 dark:text-slate-400 px-0.5">
                  <span>0h</span>
                  <span>10h (Bronze)</span>
                  <span>20h (Silver)</span>
                  <span>35h (Gold)</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5 pt-1">
                {WEEKLY_CHESTS.map((chest) => {
                  const weekKey = `${chest.id}_${currentMonday}`;
                  const isClaimed = claimedWeeklyChests.includes(weekKey);
                  const isUnlocked = weeklyMins >= chest.minutesRequired;
                  const isGold = chest.id === 'gold';

                  return (
                    <div
                      key={chest.id}
                      className={`flex flex-col items-center text-center p-2 rounded-xl border transition-colors ${
                        isClaimed
                          ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300'
                          : isUnlocked
                          ? 'bg-white dark:bg-slate-900 border-blue-300 dark:border-blue-600 shadow-xs'
                          : 'bg-white/70 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 opacity-80'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-1">
                        {chest.id === 'bronze' ? (
                          <Medal size={17} className="text-amber-700" />
                        ) : chest.id === 'silver' ? (
                          <Medal size={17} className="text-slate-400" />
                        ) : (
                          <Crown size={17} className="text-amber-500" />
                        )}
                      </div>
                      <div className="text-[10px] font-bold text-slate-800 dark:text-slate-100 leading-tight">
                        {chest.title}
                      </div>
                      <div className="text-[9px] text-slate-500 dark:text-slate-400">
                        {chest.hoursRequired}h
                      </div>
                      <div className="flex flex-col items-center justify-center text-[8px] sm:text-[9px] text-blue-700 dark:text-[#9FC6FC] font-bold mt-1 leading-tight">
                        <span className="flex items-center gap-0.5">
                          +{chest.gemReward} <Gem size={9} className="text-cyan-500" />
                        </span>
                        <span>+{chest.xpReward} XP</span>
                      </div>
                      {isGold && (
                        <div className="text-[8px] text-amber-600 dark:text-amber-400 font-bold truncate max-w-full mt-0.5">
                          Crown Stamp
                        </div>
                      )}

                      <div className="mt-1.5 w-full">
                        {isClaimed ? (
                          <span className="flex items-center justify-center gap-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 min-h-[32px]">
                            <Check size={10} /> {t.claimed}
                          </span>
                        ) : isUnlocked ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (claimWeeklyChest(chest.id)) {
                                triggerHaptic('success');
                              }
                            }}
                            className="w-full min-h-[32px] py-1 bg-amber-500 hover:bg-amber-600 text-white text-[9px] font-bold rounded-lg shadow-xs cursor-pointer active:scale-95 transition-transform"
                          >
                            {t.claim}
                          </button>
                        ) : (
                          <span className="text-[8px] text-slate-400 block text-center min-h-[32px] flex items-center justify-center">
                            {Math.max(0, Math.round(((chest.minutesRequired - weeklyMins) / 60) * 10) / 10)}h left
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Milestone Badges List */}
            <div>
              <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                {t.milestonesTitle}
              </div>
              <div className="space-y-1.5">
                {STREAK_MILESTONES.map((m) => {
                  const isUnlocked = streakCount >= m.daysRequired;
                  const isClaimed = claimedMilestones.includes(m.id);

                  return (
                    <div
                      key={m.id}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors min-h-[44px] ${
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
                            <Check size={12} /> {t.claimed}
                          </span>
                        ) : isUnlocked ? (
                          <button
                            type="button"
                            onClick={() => handleClaim(m.id)}
                            className="min-h-[36px] px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold rounded-lg shadow-xs flex items-center gap-1 cursor-pointer active:scale-95"
                          >
                            {t.claim} +{m.gemReward} Gems
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 tabular-nums">
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
        )}

        {/* 2. DAILY QUESTS TAB */}
        {activeTab === 'quests' && (
          <div className="space-y-2.5">
            <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              {t.dailyQuestsTitle}
            </div>

            {dailyQuests.map((quest) => {
              const pct = Math.min(100, Math.round((quest.progress / quest.goal) * 100));
              return (
                <div
                  key={quest.id}
                  className={`p-3 rounded-2xl border transition-colors space-y-2 ${
                    quest.isClaimed
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 opacity-70'
                      : quest.isCompleted
                      ? 'bg-amber-50/80 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800 shadow-xs'
                      : 'bg-slate-50/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        {quest.title}
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {quest.description}
                      </p>
                    </div>
                    <span className="text-[10px] tabular-nums font-bold text-blue-700 dark:text-[#9FC6FC]">
                      +{quest.xpReward} XP / +{quest.gemReward} Gems
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] tabular-nums text-slate-400">
                      <span>Progress</span>
                      <span>
                        {quest.progress} / {quest.goal} {quest.unit}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 dark:bg-[#9FC6FC] rounded-full transition-[width] duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {quest.isCompleted && !quest.isClaimed && (
                    <button
                      type="button"
                      onClick={() => handleClaimQuest(quest.id)}
                      className="w-full min-h-[40px] py-1.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                    >
                      {t.claim} (+{quest.gemReward} Gems)
                    </button>
                  )}
                  {quest.isClaimed && (
                    <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      <Check size={12} />
                      <span>{t.claimed}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 3. GEM SHOP TAB */}
        {activeTab === 'shop' && (
          <div className="space-y-3.5">
            {/* Balance banner */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-[#E4EDFC] dark:bg-slate-800 border border-[#9FC6FC] dark:border-slate-700">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                {t.availableGems}
              </span>
              <span className="text-base font-black tabular-nums text-cyan-600 dark:text-cyan-400">
                <Gem size={15} className="inline text-cyan-500 mr-1" />
                {gems}
              </span>
            </div>

            {/* Streak Freeze item */}
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex items-center justify-between min-h-[48px]">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-cyan-100 dark:bg-cyan-950 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                  <Shield size={18} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    Streak Freeze
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {streakFreezes} in stock • Protects 1 missed day
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleBuyShield}
                disabled={gems < 80}
                className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  gems >= 80
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                }`}
              >
                {t.buy} (80 Gems)
              </button>
            </div>

            {/* Synthesized Chimes (Bug 6 fix: immediate purchase persistence & select button) */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <BellRing size={14} className="text-amber-500" />
                <span>{t.soundThemes}</span>
              </div>

              {AVAILABLE_CHIMES.map((chime) => {
                const isOwned = unlockedChimes.includes(chime.id);
                const isActive = currentChimePreset === chime.id;

                return (
                  <div
                    key={chime.id}
                    className={`p-2.5 rounded-2xl border transition-colors flex items-center justify-between min-h-[48px] ${
                      isActive
                        ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 dark:border-blue-700'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-1">
                      <button
                        type="button"
                        onClick={(e) => handlePreviewChime(chime.id, e)}
                        className="min-h-[36px] min-w-[36px] flex items-center justify-center p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-blue-950 rounded-xl text-slate-600 dark:text-slate-300 cursor-pointer transition-colors shrink-0"
                        title={t.soundPreview}
                      >
                        <Play size={13} className="fill-slate-600 dark:fill-slate-300" />
                      </button>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate flex items-center gap-1">
                          <span>{chime.name}</span>
                          {isActive && (
                            <span className="text-[9px] bg-blue-600 dark:bg-[#9FC6FC] text-white dark:text-slate-900 font-extrabold px-1.5 py-0.2 rounded-md">
                              {t.active}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">{chime.description}</div>
                      </div>
                    </div>

                    <div className="shrink-0 ml-1">
                      {isOwned ? (
                        isActive ? (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 min-h-[44px]">
                            <Check size={14} /> {t.active}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSelectActiveChime(chime.id)}
                            className="min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-[#E4EDFC] text-blue-700 dark:text-[#9FC6FC] border border-blue-200 dark:border-blue-900 cursor-pointer transition-colors"
                          >
                            {t.select}
                          </button>
                        )
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (buyChime(chime.id, chime.priceGems)) {
                              triggerHaptic('success');
                            } else {
                              triggerHaptic('warning');
                            }
                          }}
                          disabled={gems < chime.priceGems}
                          className={`min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                            gems >= chime.priceGems
                              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-2xs'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          {chime.priceGems} Gems
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Unlockable Subject Color Themes */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Palette size={14} className="text-blue-600" />
                <span>{t.colorThemes}</span>
              </div>

              {UNLOCKABLE_THEMES.map((theme) => {
                const isOwned = theme.priceGems === 0 || unlockedThemes.includes(theme.id);
                return (
                  <div
                    key={theme.id}
                    className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between min-h-[48px]"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                        <span>{theme.name}</span>
                        {theme.priceGems === 0 && (
                          <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-bold px-1.5 py-0.2 rounded-md">
                            Free
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        {theme.colors.slice(0, 6).map((c) => (
                          <span
                            key={c}
                            className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-2xs"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>

                    {isOwned ? (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 min-h-[44px]">
                        <Check size={14} /> {t.owned}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (buyTheme(theme.id, theme.priceGems)) triggerHaptic('success');
                          else triggerHaptic('warning');
                        }}
                        disabled={gems < theme.priceGems}
                        className={`min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                          gems >= theme.priceGems
                            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-2xs'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {theme.priceGems} Gems
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Daily Rubber Stamps */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Stamp size={14} className="text-rose-500" />
                <span>{t.completionStamps}</span>
              </div>

              {AVAILABLE_STAMPS.filter((s) => s.priceGems > 0).map((stamp) => {
                const isOwned = unlockedStamps.includes(stamp.id);
                return (
                  <div
                    key={stamp.id}
                    className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between min-h-[48px]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{stamp.icon}</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        {stamp.name}
                      </span>
                    </div>

                    {isOwned ? (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 min-h-[44px]">
                        <Check size={14} /> {t.owned}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (buyStamp(stamp.id, stamp.priceGems)) triggerHaptic('success');
                          else triggerHaptic('warning');
                        }}
                        disabled={gems < stamp.priceGems}
                        className={`min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                          gems >= stamp.priceGems
                            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-2xs'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {stamp.priceGems} Gems
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { usePlannerStore } from './usePlannerStore';
import { toDateString } from '../utils/timeSlotMapper';
import { DailyQuest } from '../types';

export interface StreakMilestone {
  id: string;
  daysRequired: number;
  title: string;
  description: string;
  gemReward: number;
  xpReward: number;
  iconType: 'flame' | 'zap' | 'shield' | 'crown';
}

export const STREAK_MILESTONES: StreakMilestone[] = [
  {
    id: 'streak_3',
    daysRequired: 3,
    title: 'Warm Up',
    description: 'Maintain a 3-day study streak',
    gemReward: 50,
    xpReward: 100,
    iconType: 'flame',
  },
  {
    id: 'streak_7',
    daysRequired: 7,
    title: 'One Week Strong',
    description: 'Reach a full 7-day study streak',
    gemReward: 100,
    xpReward: 250,
    iconType: 'zap',
  },
  {
    id: 'streak_14',
    daysRequired: 14,
    title: 'Unstoppable Habit',
    description: 'Maintain a 14-day study streak',
    gemReward: 250,
    xpReward: 500,
    iconType: 'shield',
  },
  {
    id: 'streak_30',
    daysRequired: 30,
    title: 'Master of Focus',
    description: 'Achieve a legendary 30-day streak',
    gemReward: 500,
    xpReward: 1000,
    iconType: 'crown',
  },
];

export const AVAILABLE_STAMPS: Array<{ id: string; name: string; priceGems: number; icon: string }> = [
  { id: '100% Focus', name: '100% Focus', priceGems: 0, icon: '🎯' },
  { id: 'Goal Achieved', name: 'Goal Achieved', priceGems: 60, icon: '🏆' },
  { id: 'Early Bird', name: 'Early Bird', priceGems: 80, icon: '🌅' },
  { id: 'Deep Work', name: 'Deep Work', priceGems: 100, icon: '⚡' },
  { id: 'Perseverance', name: 'Perseverance', priceGems: 120, icon: '🌱' },
];

export const AVAILABLE_CHIMES: Array<{ id: string; name: string; priceGems: number; description: string }> = [
  { id: 'default', name: 'Soft Chirp (Default)', priceGems: 0, description: 'Gentle sine chime' },
  { id: 'marimba', name: 'Warm Marimba', priceGems: 50, description: 'Natural wooden percussion' },
  { id: 'tibetan', name: 'Tibetan Bowl', priceGems: 100, description: 'Resonant meditation bell' },
  { id: 'retro', name: 'Retro 8-Bit', priceGems: 100, description: 'Chiptune victory arpeggio' },
];

export interface GamificationState {
  xp: number;
  gems: number;
  streakFreezes: number;
  dailyGoalMinutes: number;
  claimedMilestones: string[];
  unlockedThemes: string[];
  unlockedStamps: string[];
  unlockedChimes: string[];
  dailyQuests: DailyQuest[];
  lastQuestDate: string;
}

export interface GamificationActions {
  awardXp: (amount: number) => void;
  awardGems: (amount: number) => void;
  claimMilestone: (id: string) => void;
  buyStreakFreeze: () => boolean;
  buyTheme: (themeId: string, cost: number) => boolean;
  buyStamp: (stampId: string, cost: number) => boolean;
  buyChime: (chimeId: string, cost: number) => boolean;
  setDailyGoalMinutes: (mins: number) => void;
  initDailyQuests: () => void;
  advanceQuest: (questId: string, amount: number) => void;
  claimQuest: (questId: string) => void;
  calculateStreak: () => {
    streakCount: number;
    hasStudiedToday: boolean;
    todayMinutes: number;
    weekDays: Array<{ date: string; dayLabel: string; studied: boolean; isToday: boolean }>;
  };
}

export type GamificationStore = GamificationState & GamificationActions;

export function getLevelInfo(xp: number = 0) {
  const safeXp = Number.isFinite(xp) && xp >= 0 ? xp : 0;
  const xpPerLevel = 150;
  const level = Math.floor(safeXp / xpPerLevel) + 1;
  const currentLevelXp = safeXp % xpPerLevel;
  const progressPercent = Math.min(100, Math.round((currentLevelXp / xpPerLevel) * 100));

  const titles = [
    'Curious Novice',
    'Dedicated Student',
    'Focus Apprentice',
    'Deep Diver',
    'Knowledge Seeker',
    'Study Virtuoso',
    'Grand Polymath',
  ];
  const title = titles[Math.min(titles.length - 1, Math.max(0, level - 1))];

  return {
    level,
    title,
    currentLevelXp,
    xpNeeded: xpPerLevel,
    progressPercent,
  };
}

function createDefaultQuests(): DailyQuest[] {
  return [
    {
      id: 'quest_early_bird',
      title: 'Early Bird',
      description: 'Log 30 minutes of study before 09:00 AM',
      progress: 0,
      goal: 30,
      unit: 'min',
      xpReward: 30,
      gemReward: 10,
      isCompleted: false,
      isClaimed: false,
    },
    {
      id: 'quest_tasks',
      title: 'Task Crusher',
      description: 'Complete at least 4 tasks from the daily checklist',
      progress: 0,
      goal: 4,
      unit: 'tasks',
      xpReward: 40,
      gemReward: 15,
      isCompleted: false,
      isClaimed: false,
    },
    {
      id: 'quest_pomodoro',
      title: 'Deep Focus',
      description: 'Complete a full Pomodoro focus cycle',
      progress: 0,
      goal: 1,
      unit: 'cycle',
      xpReward: 25,
      gemReward: 10,
      isCompleted: false,
      isClaimed: false,
    },
  ];
}

export const useGamificationStore = create<GamificationStore>()(
  persist(
    (set, get) => ({
      xp: 120,
      gems: 120,
      streakFreezes: 1,
      dailyGoalMinutes: 30,
      claimedMilestones: [],
      unlockedThemes: ['dreamy_pastel'],
      unlockedStamps: ['100% Focus'],
      unlockedChimes: ['default'],
      dailyQuests: createDefaultQuests(),
      lastQuestDate: '',

      awardXp: (amount: number) => {
        set((state) => ({ xp: state.xp + amount }));
      },

      awardGems: (amount: number) => {
        set((state) => ({ gems: state.gems + amount }));
      },

      claimMilestone: (id: string) => {
        const milestone = STREAK_MILESTONES.find((m) => m.id === id);
        if (!milestone) return;
        const claimed = get().claimedMilestones || [];
        if (claimed.includes(id)) return;

        set((state) => ({
          claimedMilestones: [...(state.claimedMilestones || []), id],
          gems: (state.gems || 0) + milestone.gemReward,
          xp: (state.xp || 0) + milestone.xpReward,
        }));
      },

      buyStreakFreeze: () => {
        const cost = 80;
        if ((get().gems || 0) < cost) return false;
        set((state) => ({
          gems: (state.gems || 0) - cost,
          streakFreezes: (state.streakFreezes || 0) + 1,
        }));
        return true;
      },

      buyTheme: (themeId: string, cost: number) => {
        const themes = get().unlockedThemes || ['dreamy_pastel'];
        if ((get().gems || 0) < cost || themes.includes(themeId)) return false;
        set((state) => ({
          gems: (state.gems || 0) - cost,
          unlockedThemes: [...(state.unlockedThemes || ['dreamy_pastel']), themeId],
        }));
        return true;
      },

      buyStamp: (stampId: string, cost: number) => {
        const stamps = get().unlockedStamps || ['100% Focus'];
        if ((get().gems || 0) < cost || stamps.includes(stampId)) return false;
        set((state) => ({
          gems: (state.gems || 0) - cost,
          unlockedStamps: [...(state.unlockedStamps || ['100% Focus']), stampId],
        }));
        return true;
      },

      buyChime: (chimeId: string, cost: number) => {
        const chimes = get().unlockedChimes || ['default'];
        if ((get().gems || 0) < cost || chimes.includes(chimeId)) return false;
        set((state) => ({
          gems: (state.gems || 0) - cost,
          unlockedChimes: [...(state.unlockedChimes || ['default']), chimeId],
        }));
        return true;
      },

      setDailyGoalMinutes: (mins: number) => {
        set({ dailyGoalMinutes: mins });
      },

      initDailyQuests: () => {
        const todayStr = toDateString(new Date());
        const quests = get().dailyQuests;
        if (!quests || !Array.isArray(quests) || quests.length === 0 || get().lastQuestDate !== todayStr) {
          set({
            dailyQuests: createDefaultQuests(),
            lastQuestDate: todayStr,
          });
        }
      },

      advanceQuest: (questId: string, amount: number) => {
        set((state) => {
          const quests = Array.isArray(state.dailyQuests) && state.dailyQuests.length > 0 ? state.dailyQuests : createDefaultQuests();
          const updated = quests.map((q) => {
            if (q.id === questId) {
              const newProgress = Math.min(q.goal, q.progress + amount);
              return {
                ...q,
                progress: newProgress,
                isCompleted: newProgress >= q.goal,
              };
            }
            return q;
          });
          return { dailyQuests: updated };
        });
      },

      claimQuest: (questId: string) => {
        const quests = get().dailyQuests || [];
        const quest = quests.find((q) => q.id === questId);
        if (!quest || !quest.isCompleted || quest.isClaimed) return;

        set((state) => ({
          gems: (state.gems || 0) + quest.gemReward,
          xp: (state.xp || 0) + quest.xpReward,
          dailyQuests: (state.dailyQuests || []).map((q) =>
            q.id === questId ? { ...q, isClaimed: true } : q
          ),
        }));
      },

      calculateStreak: () => {
        const sheets = usePlannerStore.getState().dailySheets;
        const today = new Date();
        const todayStr = toDateString(today);

        const checkDateHasStudy = (dStr: string) => {
          const sheet = sheets[dStr];
          if (!sheet) return false;
          if (sheet.totalMinutesStudied && sheet.totalMinutesStudied > 0) return true;
          if (sheet.tasks && sheet.tasks.some((t) => t.isCompleted)) return true;
          if (sheet.timeGrid) {
            return Object.values(sheet.timeGrid).some(
              (c) => c.subjectId !== null && (c.fillRatio ?? 1.0) > 0
            );
          }
          return false;
        };

        const todaySheet = sheets[todayStr];
        let todayMinutes = 0;
        if (todaySheet) {
          if (todaySheet.totalMinutesStudied) {
            todayMinutes = todaySheet.totalMinutesStudied;
          } else if (todaySheet.timeGrid) {
            Object.values(todaySheet.timeGrid).forEach((c) => {
              if (c.subjectId) todayMinutes += Math.round(10 * (c.fillRatio ?? 1.0));
            });
          }
        }

        const hasStudiedToday = checkDateHasStudy(todayStr);

        // Calculate consecutive streak
        let streak = 0;
        const currentCheck = new Date(today);

        if (hasStudiedToday) {
          streak = 1;
          currentCheck.setDate(currentCheck.getDate() - 1);
        } else {
          currentCheck.setDate(currentCheck.getDate() - 1);
        }

        while (true) {
          const dStr = toDateString(currentCheck);
          if (checkDateHasStudy(dStr)) {
            streak++;
            currentCheck.setDate(currentCheck.getDate() - 1);
          } else {
            break;
          }
        }

        const weekDays = [];
        const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        for (let i = 6; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const dStr = toDateString(d);
          weekDays.push({
            date: dStr,
            dayLabel: dayLabels[d.getDay()],
            studied: checkDateHasStudy(dStr),
            isToday: dStr === todayStr,
          });
        }

        return {
          streakCount: streak,
          hasStudiedToday,
          todayMinutes,
          weekDays,
        };
      },
    }),
    {
      name: 'korean_planner_gamification',
      merge: (persistedState: unknown, currentState: GamificationStore) => {
        const p = (persistedState as Partial<GamificationState>) || {};
        return {
          ...currentState,
          xp: typeof p.xp === 'number' && Number.isFinite(p.xp) ? p.xp : currentState.xp,
          gems: typeof p.gems === 'number' && Number.isFinite(p.gems) ? p.gems : currentState.gems,
          streakFreezes: typeof p.streakFreezes === 'number' ? p.streakFreezes : currentState.streakFreezes,
          dailyGoalMinutes: typeof p.dailyGoalMinutes === 'number' ? p.dailyGoalMinutes : currentState.dailyGoalMinutes,
          claimedMilestones: Array.isArray(p.claimedMilestones) ? p.claimedMilestones : [],
          unlockedThemes: Array.isArray(p.unlockedThemes) && p.unlockedThemes.length > 0 ? p.unlockedThemes : ['dreamy_pastel'],
          unlockedStamps: Array.isArray(p.unlockedStamps) && p.unlockedStamps.length > 0 ? p.unlockedStamps : ['100% Focus'],
          unlockedChimes: Array.isArray(p.unlockedChimes) && p.unlockedChimes.length > 0 ? p.unlockedChimes : ['default'],
          dailyQuests: Array.isArray(p.dailyQuests) && p.dailyQuests.length > 0 ? p.dailyQuests : createDefaultQuests(),
          lastQuestDate: typeof p.lastQuestDate === 'string' ? p.lastQuestDate : '',
        };
      },
    }
  )
);

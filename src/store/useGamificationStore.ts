import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { usePlannerStore } from './usePlannerStore';
import { toDateString } from '../utils/timeSlotMapper';

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

export interface GamificationState {
  xp: number;
  gems: number;
  streakFreezes: number;
  dailyGoalMinutes: number;
  claimedMilestones: string[];
  lastCalculatedDate: string;
}

export interface GamificationActions {
  awardXp: (amount: number) => void;
  awardGems: (amount: number) => void;
  claimMilestone: (id: string) => void;
  buyStreakFreeze: () => boolean;
  setDailyGoalMinutes: (mins: number) => void;
  calculateStreak: () => {
    streakCount: number;
    hasStudiedToday: boolean;
    todayMinutes: number;
    weekDays: Array<{ date: string; dayLabel: string; studied: boolean; isToday: boolean }>;
  };
}

export type GamificationStore = GamificationState & GamificationActions;

export function getLevelInfo(xp: number) {
  const xpPerLevel = 150;
  const level = Math.floor(xp / xpPerLevel) + 1;
  const currentLevelXp = xp % xpPerLevel;
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
  const title = titles[Math.min(titles.length - 1, level - 1)];

  return {
    level,
    title,
    currentLevelXp,
    xpNeeded: xpPerLevel,
    progressPercent,
  };
}

export const useGamificationStore = create<GamificationStore>()(
  persist(
    (set, get) => ({
      xp: 120,
      gems: 100,
      streakFreezes: 1,
      dailyGoalMinutes: 30,
      claimedMilestones: [],
      lastCalculatedDate: '',

      awardXp: (amount: number) => {
        set((state) => ({ xp: state.xp + amount }));
      },

      awardGems: (amount: number) => {
        set((state) => ({ gems: state.gems + amount }));
      },

      claimMilestone: (id: string) => {
        const milestone = STREAK_MILESTONES.find((m) => m.id === id);
        if (!milestone) return;
        if (get().claimedMilestones.includes(id)) return;

        set((state) => ({
          claimedMilestones: [...state.claimedMilestones, id],
          gems: state.gems + milestone.gemReward,
          xp: state.xp + milestone.xpReward,
        }));
      },

      buyStreakFreeze: () => {
        const cost = 80;
        if (get().gems < cost) return false;
        set((state) => ({
          gems: state.gems - cost,
          streakFreezes: state.streakFreezes + 1,
        }));
        return true;
      },

      setDailyGoalMinutes: (mins: number) => {
        set({ dailyGoalMinutes: mins });
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
          // If not studied today, streak could be active from yesterday
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

        // Calculate 7-day week view for visualization
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
    }
  )
);

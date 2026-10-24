import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { usePlannerStore } from './usePlannerStore';
import { toDateString } from '../utils/timeSlotMapper';
import { DailyQuest, StreakResult, GamificationProfile, UNLOCKABLE_THEMES } from '../types';
import { commands } from '../types/bindings';
import { tauriApi } from '../services/tauriApi';

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
  { id: 'Master Scholar', name: 'Master Scholar', priceGems: 0, icon: '👑' },
];

export const AVAILABLE_CHIMES: Array<{ id: string; name: string; priceGems: number; description: string }> = [
  { id: 'default', name: 'Soft Chirp (Default)', priceGems: 0, description: 'Gentle sine chirp' },
  { id: 'marimba', name: 'Warm Marimba', priceGems: 50, description: 'Natural wooden percussion' },
  { id: 'tibetan', name: 'Tibetan Bowl', priceGems: 100, description: 'Resonant meditation bell' },
  { id: 'retro', name: 'Retro 8-Bit', priceGems: 100, description: 'Chiptune victory arpeggio' },
];

export interface WeeklyChestInfo {
  id: 'bronze' | 'silver' | 'gold';
  hoursRequired: number;
  minutesRequired: number;
  title: string;
  gemReward: number;
  xpReward: number;
  stampUnlock?: string;
}

export const WEEKLY_CHESTS: WeeklyChestInfo[] = [
  {
    id: 'bronze',
    hoursRequired: 10,
    minutesRequired: 600,
    title: 'Bronze Chest',
    gemReward: 50,
    xpReward: 100,
  },
  {
    id: 'silver',
    hoursRequired: 20,
    minutesRequired: 1200,
    title: 'Silver Chest',
    gemReward: 120,
    xpReward: 250,
  },
  {
    id: 'gold',
    hoursRequired: 35,
    minutesRequired: 2100,
    title: 'Gold Chest',
    gemReward: 300,
    xpReward: 500,
    stampUnlock: 'Master Scholar',
  },
];

export function getCurrentWeekMonday(refDate: Date = new Date()): string {
  const d = new Date(refDate);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  return toDateString(d);
}

const ALL_FREE_THEMES = UNLOCKABLE_THEMES.filter((t) => t.priceGems === 0).map((t) => t.id);

export interface GamificationState {
  xp: number;
  gems: number;
  streakFreezes: number;
  dailyGoalMinutes: number;
  claimedMilestones: string[];
  claimedWeeklyChests: string[];
  unlockedThemes: string[];
  unlockedStamps: string[];
  unlockedChimes: string[];
  dailyQuests: DailyQuest[];
  lastQuestDate: string;
  cachedStreak?: StreakResult | null;
}

export interface GamificationActions {
  awardXp: (amount: number) => void;
  awardGems: (amount: number) => void;
  claimMilestone: (id: string) => void;
  claimWeeklyChest: (chestId: 'bronze' | 'silver' | 'gold') => boolean;
  getWeeklyStudyMinutes: () => number;
  buyStreakFreeze: () => boolean;
  buyTheme: (themeId: string, cost: number) => boolean;
  buyStamp: (stampId: string, cost: number) => boolean;
  buyChime: (chimeId: string, cost: number) => boolean;
  setDailyGoalMinutes: (mins: number) => void;
  initDailyQuests: () => void;
  initFromRust: () => Promise<void>;
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

let gamificationSaveTimeout: ReturnType<typeof setTimeout> | null = null;
function scheduleSaveGamificationToRust(state: GamificationState) {
  if (gamificationSaveTimeout) clearTimeout(gamificationSaveTimeout);
  gamificationSaveTimeout = setTimeout(() => {
    const payload = JSON.stringify({
      xp: state.xp,
      gems: state.gems,
      streakFreezes: state.streakFreezes,
      dailyGoalMinutes: state.dailyGoalMinutes,
      claimedMilestones: state.claimedMilestones,
      claimedWeeklyChests: state.claimedWeeklyChests,
      unlockedThemes: state.unlockedThemes,
      unlockedStamps: state.unlockedStamps,
      unlockedChimes: state.unlockedChimes,
      dailyQuests: state.dailyQuests,
      lastQuestDate: state.lastQuestDate,
    });
    tauriApi.saveGamificationProfile(payload);
  }, 250);
}

export const useGamificationStore = create<GamificationStore>()(
  persist(
    (set, get) => ({
      xp: 120,
      gems: 120,
      streakFreezes: 1,
      dailyGoalMinutes: 30,
      claimedMilestones: [],
      claimedWeeklyChests: [],
      unlockedThemes: ALL_FREE_THEMES,
      unlockedStamps: ['100% Focus'],
      unlockedChimes: ['default'],
      dailyQuests: createDefaultQuests(),
      lastQuestDate: '',

      awardXp: (amount: number) => {
        set((state) => ({ xp: state.xp + amount }));
        scheduleSaveGamificationToRust(get());
      },

      awardGems: (amount: number) => {
        set((state) => ({ gems: state.gems + amount }));
        scheduleSaveGamificationToRust(get());
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
        scheduleSaveGamificationToRust(get());
      },

      getWeeklyStudyMinutes: () => {
        const sheets = usePlannerStore.getState().dailySheets || {};
        const mondayStr = getCurrentWeekMonday(new Date());
        const mondayDate = new Date(mondayStr + 'T00:00:00');
        let totalMinutes = 0;

        for (let i = 0; i < 7; i++) {
          const d = new Date(mondayDate);
          d.setDate(mondayDate.getDate() + i);
          const dStr = toDateString(d);
          const sheet = sheets[dStr];
          if (sheet) {
            if (sheet.totalMinutesStudied) {
              totalMinutes += sheet.totalMinutesStudied;
            } else if (sheet.timeGrid) {
              Object.values(sheet.timeGrid).forEach((c) => {
                if (c.subjectId) totalMinutes += Math.round(10 * (c.fillRatio ?? 1.0));
              });
            }
          }
        }
        return totalMinutes;
      },

      claimWeeklyChest: (chestId: 'bronze' | 'silver' | 'gold') => {
        const chest = WEEKLY_CHESTS.find((c) => c.id === chestId);
        if (!chest) return false;

        const mondayStr = getCurrentWeekMonday(new Date());
        const weekKey = `${chestId}_${mondayStr}`;
        const claimed = get().claimedWeeklyChests || [];
        if (claimed.includes(weekKey)) return false;

        const weeklyMins = get().getWeeklyStudyMinutes();
        if (weeklyMins < chest.minutesRequired) return false;

        set((state) => {
          const newUnlockedStamps = [...(state.unlockedStamps || ['100% Focus'])];
          if (chest.stampUnlock && !newUnlockedStamps.includes(chest.stampUnlock)) {
            newUnlockedStamps.push(chest.stampUnlock);
          }

          return {
            claimedWeeklyChests: [...(state.claimedWeeklyChests || []), weekKey],
            gems: (state.gems || 0) + chest.gemReward,
            xp: (state.xp || 0) + chest.xpReward,
            unlockedStamps: newUnlockedStamps,
          };
        });

        scheduleSaveGamificationToRust(get());
        return true;
      },

      buyStreakFreeze: () => {
        const cost = 80;
        if ((get().gems || 0) < cost) return false;
        const prevGems = get().gems || 0;
        const prevFreezes = get().streakFreezes || 0;
        try {
          set((state) => ({
            gems: (state.gems || 0) - cost,
            streakFreezes: (state.streakFreezes || 0) + 1,
          }));
          scheduleSaveGamificationToRust(get());
          return true;
        } catch {
          set({ gems: prevGems, streakFreezes: prevFreezes });
          return false;
        }
      },

      buyTheme: (themeId: string, cost: number) => {
        const themes = get().unlockedThemes || ALL_FREE_THEMES;
        if ((get().gems || 0) < cost || themes.includes(themeId)) return false;
        const prevGems = get().gems || 0;
        const prevThemes = [...themes];
        try {
          const newThemes = Array.from(new Set([...themes, themeId]));
          set({
            gems: prevGems - cost,
            unlockedThemes: newThemes,
          });
          scheduleSaveGamificationToRust(get());
          return true;
        } catch {
          set({ gems: prevGems, unlockedThemes: prevThemes });
          return false;
        }
      },

      buyStamp: (stampId: string, cost: number) => {
        const stamps = get().unlockedStamps || ['100% Focus'];
        if ((get().gems || 0) < cost || stamps.includes(stampId)) return false;
        const prevGems = get().gems || 0;
        const prevStamps = [...stamps];
        try {
          const newStamps = Array.from(new Set([...stamps, stampId]));
          set({
            gems: prevGems - cost,
            unlockedStamps: newStamps,
          });
          scheduleSaveGamificationToRust(get());
          return true;
        } catch {
          set({ gems: prevGems, unlockedStamps: prevStamps });
          return false;
        }
      },

      buyChime: (chimeId: string, cost: number) => {
        const chimes = get().unlockedChimes || ['default'];
        if ((get().gems || 0) < cost || chimes.includes(chimeId)) return false;
        const prevGems = get().gems || 0;
        const prevChimes = [...chimes];

        try {
          const newChimes = Array.from(new Set([...chimes, chimeId]));
          set({
            gems: prevGems - cost,
            unlockedChimes: newChimes,
          });
          scheduleSaveGamificationToRust(get());
          return true;
        } catch (err) {
          console.error('Failed to save purchased chime, rolling back:', err);
          set({
            gems: prevGems,
            unlockedChimes: prevChimes,
          });
          return false;
        }
      },

      setDailyGoalMinutes: (mins: number) => {
        set({ dailyGoalMinutes: mins });
      },

      initFromRust: async () => {
        try {
          const profileJson = await tauriApi.loadGamificationProfile();
          if (profileJson) {
            const parsed = JSON.parse(profileJson);
            set((current) => ({
              ...current,
              xp: typeof parsed.xp === 'number' ? parsed.xp : current.xp,
              gems: typeof parsed.gems === 'number' ? parsed.gems : current.gems,
              streakFreezes: typeof parsed.streakFreezes === 'number' ? parsed.streakFreezes : current.streakFreezes,
              dailyGoalMinutes: typeof parsed.dailyGoalMinutes === 'number' ? parsed.dailyGoalMinutes : current.dailyGoalMinutes,
              claimedMilestones: Array.isArray(parsed.claimedMilestones) ? parsed.claimedMilestones : current.claimedMilestones,
              claimedWeeklyChests: Array.isArray(parsed.claimedWeeklyChests) ? parsed.claimedWeeklyChests : current.claimedWeeklyChests,
              unlockedThemes: Array.from(new Set([
                ...ALL_FREE_THEMES,
                ...(Array.isArray(current.unlockedThemes) ? current.unlockedThemes : []),
                ...(Array.isArray(parsed.unlockedThemes) ? parsed.unlockedThemes : []),
              ])),
              unlockedStamps: Array.from(new Set([
                '100% Focus',
                ...(Array.isArray(current.unlockedStamps) ? current.unlockedStamps : []),
                ...(Array.isArray(parsed.unlockedStamps) ? parsed.unlockedStamps : []),
              ])),
              unlockedChimes: Array.from(new Set([
                'default',
                ...(Array.isArray(current.unlockedChimes) ? current.unlockedChimes : []),
                ...(Array.isArray(parsed.unlockedChimes) ? parsed.unlockedChimes : []),
              ])),
              dailyQuests: Array.isArray(parsed.dailyQuests) && parsed.dailyQuests.length > 0 ? parsed.dailyQuests : current.dailyQuests,
              lastQuestDate: typeof parsed.lastQuestDate === 'string' ? parsed.lastQuestDate : current.lastQuestDate,
            }));
          }
        } catch (e) {
          console.warn('Failed to load gamification profile from Rust:', e);
        }
      },

      initDailyQuests: () => {
        const todayStr = toDateString(new Date());
        const quests = get().dailyQuests;
        if (!quests || !Array.isArray(quests) || quests.length === 0 || get().lastQuestDate !== todayStr) {
          set({
            dailyQuests: createDefaultQuests(),
            lastQuestDate: todayStr,
          });
          scheduleSaveGamificationToRust(get());
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
        scheduleSaveGamificationToRust(get());
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
        const sheets = usePlannerStore.getState().dailySheets || {};
        const todayStr = toDateString(new Date());

        const profile: GamificationProfile = {
          xp: get().xp,
          gems: get().gems,
          streakFreezes: get().streakFreezes,
          dailyGoalMinutes: get().dailyGoalMinutes,
          claimedMilestones: get().claimedMilestones,
          claimedWeeklyChests: get().claimedWeeklyChests,
          unlockedThemes: get().unlockedThemes,
          unlockedStamps: get().unlockedStamps,
          unlockedChimes: get().unlockedChimes,
        };

        if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
          void (async () => {
            const res = await commands.computeStreak(profile, sheets, todayStr);
            if (res.status === 'error') {
              console.error(res.error);
              return;
            }
            const data = res.data;
            const cur = get().cachedStreak;
            if (!cur || cur.streakCount !== data.streakCount || cur.hasStudiedToday !== data.hasStudiedToday) {
              set({ cachedStreak: data });
            }
          })();
        }

        const cached = get().cachedStreak;
        if (cached) return cached;

        return {
          streakCount: 0,
          hasStudiedToday: false,
          todayMinutes: 0,
          weekDays: [],
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
          claimedWeeklyChests: Array.isArray(p.claimedWeeklyChests) ? p.claimedWeeklyChests : [],
          unlockedThemes: Array.from(new Set([
            ...ALL_FREE_THEMES,
            ...(Array.isArray(p.unlockedThemes) && p.unlockedThemes.length > 0 ? p.unlockedThemes : []),
          ])),
          unlockedStamps: Array.from(new Set([
            '100% Focus',
            ...(Array.isArray(p.unlockedStamps) && p.unlockedStamps.length > 0 ? p.unlockedStamps : []),
          ])),
          unlockedChimes: Array.from(new Set([
            'default',
            ...(Array.isArray(p.unlockedChimes) && p.unlockedChimes.length > 0 ? p.unlockedChimes : []),
          ])),
          dailyQuests: Array.isArray(p.dailyQuests) && p.dailyQuests.length > 0 ? p.dailyQuests : createDefaultQuests(),
          lastQuestDate: typeof p.lastQuestDate === 'string' ? p.lastQuestDate : '',
        };
      },
    }
  )
);

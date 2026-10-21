import { useState, useMemo } from 'react';
import { DateString, EntityId } from '../../types';
import { usePlannerStore } from '../../store/usePlannerStore';
import { useSubjectStore } from '../../store/useSubjectStore';
import { useGamificationStore, getLevelInfo } from '../../store/useGamificationStore';
import { formatStudyDuration, parseDateString } from '../../utils/timeSlotMapper';
import {
  BarChart3,
  Flame,
  Calendar as CalendarIcon,
  PieChart as PieChartIcon,
  TrendingUp,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Award,
  Target,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { StreakModal } from '../gamification/StreakModal';
import { useBackButton } from '../../hooks/useBackButton';

type AnalyticsPeriod = 'daily' | 'weekly' | 'annual';

export function AnalyticsView() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('daily');
  const [streakModalOpen, setStreakModalOpen] = useState(false);
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);
  const [hoveredSlice, setHoveredSlice] = useState<number | null>(null);

  useBackButton({
    openModals: [
      { name: "streak", isOpen: streakModalOpen, close: () => setStreakModalOpen(false) },
    ],
  });

  const currentDate = usePlannerStore((state) => state.currentDate);
  const setCurrentDate = usePlannerStore((state) => state.setCurrentDate);
  const dailySheets = usePlannerStore((state) => state.dailySheets);
  const getPlanFulfillmentRate = usePlannerStore((state) => state.getPlanFulfillmentRate);
  const subjects = useSubjectStore((state) => state.subjects);
  const { calculateStreak, gems, xp } = useGamificationStore();

  const { streakCount, hasStudiedToday, todayMinutes } = calculateStreak();
  const levelInfo = getLevelInfo(xp);
  const fulfillment = getPlanFulfillmentRate(currentDate);

  const currentSheet = dailySheets[currentDate];
  const parsedDate = parseDateString(currentDate);

  const dayOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][parsedDate.getDay()];
  const formattedDate = `${parsedDate.getFullYear()}.${String(parsedDate.getMonth() + 1).padStart(2, '0')}.${String(parsedDate.getDate()).padStart(2, '0')} (${dayOfWeek})`;

  // Daily subject breakdown
  const { breakdown, totalMinutes } = useMemo(() => {
    if (!currentSheet || !currentSheet.timeGrid) {
      return { breakdown: [], totalMinutes: 0 };
    }

    const minutesMap = new Map<EntityId, number>();
    let total = 0;

    Object.values(currentSheet.timeGrid).forEach((cell) => {
      if (cell.subjectId) {
        const mins = Math.round(10 * (cell.fillRatio ?? 1.0));
        minutesMap.set(cell.subjectId, (minutesMap.get(cell.subjectId) || 0) + mins);
        total += mins;
      }
    });

    const list = Array.from(minutesMap.entries()).map(([subId, mins]) => {
      const sub = subjects.find((s) => s.id === subId);
      return {
        id: subId,
        name: sub ? sub.name : 'General',
        color: sub ? sub.color : '#94A3B8',
        minutes: mins,
        percentage: total > 0 ? Math.round((mins / total) * 100) : 0,
      };
    });

    list.sort((a, b) => b.minutes - a.minutes);
    return { breakdown: list, totalMinutes: total };
  }, [currentSheet, subjects]);

  // Hourly distribution for Daily (24h)
  const hourlyActivity = useMemo(() => {
    const hours = Array(24).fill(0);
    if (!currentSheet || !currentSheet.timeGrid) return hours;

    Object.values(currentSheet.timeGrid).forEach((cell) => {
      if (cell.subjectId && cell.hour >= 0 && cell.hour < 24) {
        hours[cell.hour] += Math.round(10 * (cell.fillRatio ?? 1.0));
      }
    });
    return hours;
  }, [currentSheet]);

  const maxHourMinutes = useMemo(() => {
    return Math.max(10, ...hourlyActivity);
  }, [hourlyActivity]);

  // Weekly Trend (7 Days)
  const weeklyData = useMemo(() => {
    const days = [];
    const baseDate = parseDateString(currentDate);

    for (let i = 6; i >= 0; i--) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() - i);
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` as DateString;
      const sheet = dailySheets[dStr];

      let dayMins = 0;
      if (sheet) {
        dayMins = sheet.totalMinutesStudied ?? 0;
        if (dayMins === 0 && sheet.timeGrid) {
          Object.values(sheet.timeGrid).forEach((cell) => {
            if (cell.subjectId) dayMins += Math.round(10 * (cell.fillRatio ?? 1.0));
          });
        }
      }

      days.push({
        date: dStr,
        dayLabel: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()],
        dateNum: d.getDate(),
        minutes: dayMins,
        isCurrent: dStr === currentDate,
      });
    }
    return days;
  }, [dailySheets, currentDate]);

  const weeklyTotal = useMemo(() => weeklyData.reduce((acc, d) => acc + d.minutes, 0), [weeklyData]);
  const weeklyAvg = Math.round(weeklyTotal / 7);
  const maxWeeklyMinutes = Math.max(60, ...weeklyData.map((d) => d.minutes));

  // Annual Overview (12 Months of current year)
  const currentYear = parsedDate.getFullYear();
  const annualMonths = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      // SAFETY: i < 12 and labels has 12 items
      label: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i]!,
      minutes: 0,
      daysStudied: 0,
    }));

    Object.entries(dailySheets).forEach(([dateStr, sheet]) => {
      if (dateStr.startsWith(String(currentYear))) {
        const parts = dateStr.split('-');
        const m = parseInt(parts[1] ?? '0', 10);
        let mins = sheet.totalMinutesStudied ?? 0;
        if (mins === 0 && sheet.timeGrid) {
          Object.values(sheet.timeGrid).forEach((cell) => {
            if (cell.subjectId) mins += Math.round(10 * (cell.fillRatio ?? 1.0));
          });
        }
        const targetMonth = months[m - 1];
        if (targetMonth && mins > 0) {
          targetMonth.minutes += mins;
          targetMonth.daysStudied += 1;
        }
      }
    });

    return months;
  }, [dailySheets, currentYear]);

  const annualTotalMinutes = useMemo(() => annualMonths.reduce((acc, m) => acc + m.minutes, 0), [annualMonths]);
  const annualDaysStudied = useMemo(() => annualMonths.reduce((acc, m) => acc + m.daysStudied, 0), [annualMonths]);
  const maxMonthMinutes = Math.max(60, ...annualMonths.map((m) => m.minutes));

  // Phase 4.1: Verified Focus Ratio (%) Computation
  const verifiedStats = useMemo(() => {
    let totalStudiedBlocks = 0;
    let verifiedBlocks = 0;

    const countBlocksInSheet = (sheet?: any) => {
      if (!sheet || !sheet.timeGrid) return;
      Object.values(sheet.timeGrid).forEach((cell: any) => {
        if (cell.subjectId) {
          totalStudiedBlocks++;
          if (cell.isVerifiedTimer) {
            verifiedBlocks++;
          }
        }
      });
    };

    if (period === "daily") {
      countBlocksInSheet(currentSheet);
    } else if (period === "weekly") {
      weeklyData.forEach((d) => countBlocksInSheet(dailySheets[d.date]));
    } else {
      Object.values(dailySheets).forEach((sheet) => countBlocksInSheet(sheet));
    }

    const ratio = totalStudiedBlocks > 0 ? Math.round((verifiedBlocks / totalStudiedBlocks) * 100) : 0;
    return {
      ratio,
      verifiedBlocks,
      totalStudiedBlocks,
      verifiedMinutes: verifiedBlocks * 10,
    };
  }, [period, currentSheet, weeklyData, dailySheets]);

  // Phase 4.1: Automated Productivity Insights from past 7 days
  const weeklyInsights = useMemo(() => {
    const hourlyDistribution = Array(24).fill(0);
    const subjectActualMinutes = new Map<EntityId, number>();
    const subjectPlannedMinutes = new Map<EntityId, number>();
    const subjectMatchedMinutes = new Map<EntityId, number>();

    weeklyData.forEach((d) => {
      const sheet = dailySheets[d.date];
      if (!sheet || !sheet.timeGrid) return;

      Object.values(sheet.timeGrid).forEach((cell) => {
        if (cell.subjectId) {
          const mins = Math.round(10 * (cell.fillRatio ?? 1.0));
          hourlyDistribution[cell.hour] += mins;
          subjectActualMinutes.set(cell.subjectId, (subjectActualMinutes.get(cell.subjectId) || 0) + mins);
        }
        if (cell.plannedSubjectId) {
          subjectPlannedMinutes.set(cell.plannedSubjectId, (subjectPlannedMinutes.get(cell.plannedSubjectId) || 0) + 10);
          if (cell.subjectId === cell.plannedSubjectId) {
            subjectMatchedMinutes.set(cell.plannedSubjectId, (subjectMatchedMinutes.get(cell.plannedSubjectId) || 0) + 10);
          }
        }
      });
    });

    let max2hMins = 0;
    let peakStartHour = 9;
    for (let h = 0; h < 24; h++) {
      const h2 = (h + 1) % 24;
      const windowSum = (hourlyDistribution[h] ?? 0) + (hourlyDistribution[h2] ?? 0);
      if (windowSum > max2hMins) {
        max2hMins = windowSum;
        peakStartHour = h;
      }
    }
    const peakEndHour = (peakStartHour + 2) % 24;
    const peakWindowStr = `${String(peakStartHour).padStart(2, "0")}:00 - ${String(peakEndHour).padStart(2, "0")}:00`;

    let mostConsistentSubjectName = "None";
    let maxSubMins = 0;
    subjectActualMinutes.forEach((mins, subId) => {
      if (mins > maxSubMins) {
        maxSubMins = mins;
        const sub = subjects.find((s) => s.id === subId);
        if (sub) mostConsistentSubjectName = sub.name;
      }
    });

    let mostNeglectedSubjectName: string | null = null;
    let lowestRate = 101;
    subjectPlannedMinutes.forEach((plannedMins, subId) => {
      if (plannedMins > 0) {
        const matchedMins = subjectMatchedMinutes.get(subId) || 0;
        const rate = Math.round((matchedMins / plannedMins) * 100);
        if (rate < lowestRate) {
          lowestRate = rate;
          const sub = subjects.find((s) => s.id === subId);
          if (sub) mostNeglectedSubjectName = sub.name;
        }
      }
    });

    return {
      peakWindowStr,
      max2hMins,
      mostConsistentSubjectName,
      maxSubMins,
      mostNeglectedSubjectName,
      lowestRate: lowestRate <= 100 ? lowestRate : null,
    };
  }, [weeklyData, dailySheets, subjects]);

  // Compute donut chart angles for Daily
  const donutSlices = useMemo(() => {
    if (totalMinutes === 0) return [];
    let cumAngle = 0;
    return breakdown.map((item) => {
      const angle = (item.minutes / totalMinutes) * 360;
      const slice = {
        ...item,
        startAngle: cumAngle,
        endAngle: cumAngle + angle,
      };
      cumAngle += angle;
      return slice;
    });
  }, [breakdown, totalMinutes]);

  const topSubject = breakdown.length > 0 ? breakdown[0] : null;

  return (
    <div className="max-w-3xl mx-auto space-y-3.5 w-full pb-4">
      {/* Duolingo Streak Hero Card */}
      <div className="bg-[#E4EDFC]/80 dark:bg-slate-900 border border-[#C2D8FC] dark:border-slate-800 rounded-3xl p-3.5 sm:p-4 shadow-sm transition-colors w-full">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-xs shrink-0">
              <Flame size={22} className="text-amber-500 fill-amber-500" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono leading-none">
                  {streakCount} {streakCount === 1 ? 'Day Streak' : 'Days Streak'}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 text-blue-700 dark:text-[#9FC6FC] border border-blue-100 dark:border-slate-700">
                  Lv. {levelInfo.level} {levelInfo.title}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 truncate">
                {hasStudiedToday
                  ? `Goal achieved today (${todayMinutes}m)! Streak active.`
                  : 'Study at least 10 minutes today to maintain your streak!'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setStreakModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold rounded-2xl transition-colors cursor-pointer shadow-xs self-end sm:self-center shrink-0"
          >
            <Sparkles size={13} />
            <span>Rewards ({gems} Gems)</span>
          </button>
        </div>
      </div>

      {/* Analytics Period Switcher */}
      <div className="bg-white/85 dark:bg-slate-900 border border-[#C2D8FC]/60 dark:border-slate-800 rounded-3xl p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-2.5 shadow-sm transition-colors w-full">
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="p-2 bg-[#E4EDFC] dark:bg-slate-800 rounded-2xl text-blue-700 dark:text-[#9FC6FC]">
            <BarChart3 size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Study Analytics & Reports
            </h2>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              {period === 'daily'
                ? formattedDate
                : period === 'weekly'
                ? 'Past 7 Days Overview'
                : `Annual Progress ${currentYear}`}
            </p>
          </div>
        </div>

        {/* Segmented Period Switcher */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center bg-[#E4EDFC]/60 dark:bg-slate-800 p-0.5 rounded-2xl border border-[#C2D8FC] dark:border-slate-700">
            <button
              type="button"
              onClick={() => setPeriod('daily')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                period === 'daily'
                  ? 'bg-blue-600 dark:bg-[#9FC6FC] text-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Daily
            </button>
            <button
              type="button"
              onClick={() => setPeriod('weekly')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                period === 'weekly'
                  ? 'bg-blue-600 dark:bg-[#9FC6FC] text-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Weekly
            </button>
            <button
              type="button"
              onClick={() => setPeriod('annual')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                period === 'annual'
                  ? 'bg-blue-600 dark:bg-[#9FC6FC] text-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Annual
            </button>
          </div>

          {period === 'daily' && (
            <div className="flex items-center gap-1 bg-[#E4EDFC]/60 dark:bg-slate-800 p-0.5 rounded-2xl border border-[#C2D8FC] dark:border-slate-700">
              <button
                type="button"
                onClick={() => {
                  const prev = new Date(parsedDate);
                  prev.setDate(prev.getDate() - 1);
                  setCurrentDate(
                    `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(prev.getDate()).padStart(2, '0')}` as DateString
                  );
                }}
                className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-xl"
                title="Previous Day"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = new Date(parsedDate);
                  next.setDate(next.getDate() + 1);
                  setCurrentDate(
                    `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}` as DateString
                  );
                }}
                className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-xl"
                title="Next Day"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* KPI Stats Cards (Includes Plan Fulfillment Rate) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="bg-white/85 dark:bg-slate-900 border border-[#C2D8FC]/60 dark:border-slate-800 rounded-3xl p-3 sm:p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-1">
            <span className="text-[10px] font-bold">
              {period === 'daily' ? 'Total Time' : period === 'weekly' ? 'Weekly Sum' : 'Yearly Sum'}
            </span>
            <CalendarIcon size={14} className="text-blue-500" />
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 font-mono">
            {period === 'daily'
              ? formatStudyDuration(totalMinutes, 'standard')
              : period === 'weekly'
              ? formatStudyDuration(weeklyTotal, 'standard')
              : formatStudyDuration(annualTotalMinutes, 'standard')}
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            {period === 'daily'
              ? `${Math.round(totalMinutes / 10)} blocks (10m)`
              : period === 'weekly'
              ? `Avg ${weeklyAvg}m/day`
              : `${annualDaysStudied} active days`}
          </span>
        </div>

        {/* Phase 4.1: Verified Focus Ratio (%) Card */}
        <div className="bg-white/85 dark:bg-slate-900 border border-[#C2D8FC]/60 dark:border-slate-800 rounded-3xl p-3 sm:p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-1">
            <span className="text-[10px] font-bold">Verified Focus</span>
            <ShieldCheck size={14} className="text-emerald-500" />
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 font-mono">
            {verifiedStats.totalStudiedBlocks > 0 ? `${verifiedStats.ratio}%` : "N/A"}
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate block">
            {verifiedStats.totalStudiedBlocks > 0
              ? `${verifiedStats.verifiedBlocks} of ${verifiedStats.totalStudiedBlocks} blocks`
              : "No study logged"}
          </span>
        </div>

        {/* Phase 3.1: Plan Fulfillment Rate (%) Card */}
        <div className="bg-white/85 dark:bg-slate-900 border border-[#C2D8FC]/60 dark:border-slate-800 rounded-3xl p-3 sm:p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-1">
            <span className="text-[10px] font-bold">Plan Fulfillment</span>
            <Target size={14} className="text-indigo-500" />
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 font-mono">
            {fulfillment.plannedMinutes > 0 ? `${fulfillment.ratePercent}%` : 'N/A'}
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate block">
            {fulfillment.plannedMinutes > 0
              ? `${fulfillment.matchedMinutes}m of ${fulfillment.plannedMinutes}m`
              : 'No plan set'}
          </span>
        </div>

        <div className="bg-white/85 dark:bg-slate-900 border border-[#C2D8FC]/60 dark:border-slate-800 rounded-3xl p-3 sm:p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-1">
            <span className="text-[10px] font-bold">Top Subject</span>
            <PieChartIcon size={14} className="text-blue-400" />
          </div>
          <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
            {topSubject ? topSubject.name : 'None'}
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            {topSubject ? `${topSubject.percentage}% proportion` : 'No study logged'}
          </span>
        </div>

        <div className="bg-white/85 dark:bg-slate-900 border border-[#C2D8FC]/60 dark:border-slate-800 rounded-3xl p-3 sm:p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-1">
            <span className="text-[10px] font-bold">Active Streak</span>
            <Flame size={14} className="text-amber-500 fill-amber-500" />
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 font-mono">
            {streakCount} {streakCount === 1 ? 'Day' : 'Days'}
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            {hasStudiedToday ? 'Streak maintained' : 'Study 10m today'}
          </span>
        </div>

        <div className="bg-white/85 dark:bg-slate-900 border border-[#C2D8FC]/60 dark:border-slate-800 rounded-3xl p-3 sm:p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-1">
            <span className="text-[10px] font-bold">XP Level</span>
            <Award size={14} className="text-blue-500" />
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 font-mono">
            Lv. {levelInfo.level}
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate block">
            {xp} XP • {levelInfo.title}
          </span>
        </div>
      </div>

      {/* Phase 4.1: Automated Productivity Insights Banner */}
      <div className="bg-gradient-to-r from-[#E4EDFC]/90 via-indigo-50/70 to-purple-50/70 dark:from-slate-900 dark:via-slate-900/90 dark:to-indigo-950/40 border border-[#C2D8FC] dark:border-slate-800 rounded-3xl p-3.5 sm:p-4 shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white dark:bg-slate-800 rounded-xl text-indigo-600 dark:text-indigo-400 shadow-2xs">
              <Sparkles size={16} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                Automated Productivity Insights
                <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                  Weekly AI Coach
                </span>
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Local heuristic analysis of your study patterns over the past 7 days
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
          {/* Peak Productivity Window */}
          <div className="bg-white/80 dark:bg-slate-800/80 border border-[#C2D8FC]/60 dark:border-slate-700 rounded-2xl p-2.5 flex items-start gap-2">
            <Clock size={16} className="text-blue-500 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Peak Focus Window
              </div>
              <div className="text-xs font-extrabold text-slate-800 dark:text-slate-100 font-mono">
                {weeklyInsights.peakWindowStr}
              </div>
              <div className="text-[9px] text-slate-400 truncate">
                {weeklyInsights.max2hMins > 0 ? `${weeklyInsights.max2hMins}m logged in this 2h block` : "Log study time to discover"}
              </div>
            </div>
          </div>

          {/* Consistency & Balance */}
          <div className="bg-white/80 dark:bg-slate-800/80 border border-[#C2D8FC]/60 dark:border-slate-700 rounded-2xl p-2.5 flex items-start gap-2">
            <TrendingUp size={16} className="text-emerald-500 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Most Consistent Subject
              </div>
              <div className="text-xs font-extrabold text-slate-800 dark:text-slate-100 truncate">
                {weeklyInsights.mostConsistentSubjectName}
              </div>
              <div className="text-[9px] text-slate-400 truncate">
                {weeklyInsights.maxSubMins > 0 ? `${weeklyInsights.maxSubMins}m total this week` : "No study logged"}
              </div>
            </div>
          </div>

          {/* Plan Attention Needed */}
          <div className="bg-white/80 dark:bg-slate-800/80 border border-[#C2D8FC]/60 dark:border-slate-700 rounded-2xl p-2.5 flex items-start gap-2">
            <Target size={16} className="text-amber-500 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Plan Attention Area
              </div>
              <div className="text-xs font-extrabold text-slate-800 dark:text-slate-100 truncate">
                {weeklyInsights.mostNeglectedSubjectName ? weeklyInsights.mostNeglectedSubjectName : "All on track!"}
              </div>
              <div className="text-[9px] text-slate-400 truncate">
                {weeklyInsights.lowestRate !== null
                  ? `${weeklyInsights.lowestRate}% plan fulfillment rate`
                  : "All scheduled targets met"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 1. DAILY VIEW: 24h Column Chart + Donut Subject Distribution */}
      {period === 'daily' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-start">
          {/* 24-Hour Column Chart */}
          <div className="md:col-span-7 bg-white/85 dark:bg-slate-900 border border-[#C2D8FC]/60 dark:border-slate-800 rounded-3xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Hourly Distribution (24 Hours)
                </h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                  Touch bar to inspect time blocks
                </p>
              </div>
              <span className="text-[10px] font-mono text-slate-500 bg-[#E4EDFC]/60 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                Peak: {maxHourMinutes}m
              </span>
            </div>

            <div className="pt-2 pb-1 overflow-x-auto scrollbar-thin">
              <div className="flex items-end gap-1 h-36 min-w-[280px] px-1 border-b border-[#E4EDFC] dark:border-slate-800 pb-1">
                {hourlyActivity.map((mins, h) => {
                  const heightPercent = maxHourMinutes > 0 ? (mins / maxHourMinutes) * 100 : 0;
                  const isHovered = hoveredHour === h;
                  const hasStudy = mins > 0;

                  return (
                    <div
                      key={h}
                      className="flex-1 flex flex-col items-center justify-end h-full relative group cursor-pointer"
                      onClick={() => setHoveredHour(isHovered ? null : h)}
                    >
                      {isHovered && hasStudy && (
                        <div className="absolute -top-9 z-20 bg-slate-900 text-white text-[9px] py-1 px-2 rounded-lg shadow-md whitespace-nowrap pointer-events-none">
                          <span className="font-bold">{String(h).padStart(2, '0')}:00</span> — {mins}m
                        </div>
                      )}
                      <div
                        className={`w-full rounded-t-md transition-colors ${
                          hasStudy
                            ? isHovered
                              ? 'bg-blue-600 dark:bg-blue-300'
                              : 'bg-[#9FC6FC] dark:bg-blue-400'
                            : 'bg-[#E4EDFC]/40 dark:bg-slate-800/60'
                        }`}
                        style={{ height: hasStudy ? `${Math.max(14, heightPercent)}%` : '4px' }}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between text-[9px] text-slate-400 dark:text-slate-500 mt-1.5 px-1 font-mono">
                <span>00h</span>
                <span>06h</span>
                <span>12h</span>
                <span>18h</span>
                <span>23h</span>
              </div>
            </div>
          </div>

          {/* Donut Chart & Subject Breakdown */}
          <div className="md:col-span-5 bg-white/85 dark:bg-slate-900 border border-[#C2D8FC]/60 dark:border-slate-800 rounded-3xl p-4 shadow-sm flex flex-col justify-between">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Subject Distribution
            </h3>

            {breakdown.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-44 text-slate-400 text-xs italic">
                No study sessions recorded for this date yet.
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="relative w-36 h-36 my-2">
                  <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                    {donutSlices.map((slice, idx) => {
                      const radius = 38;
                      const circ = 2 * Math.PI * radius;
                      const sDash = `${(slice.percentage * circ) / 100} ${circ}`;
                      const sOffset = -((slice.startAngle / 360) * circ);

                      return (
                        <circle
                          key={slice.id}
                          cx="50"
                          cy="50"
                          r={radius}
                          fill="transparent"
                          stroke={slice.color}
                          strokeWidth={hoveredSlice === idx ? '16' : '13'}
                          strokeDasharray={sDash}
                          strokeDashoffset={sOffset}
                          className="transition-colors cursor-pointer"
                          onClick={() => setHoveredSlice(hoveredSlice === idx ? null : idx)}
                        />
                      );
                    })}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-lg font-black text-slate-900 dark:text-slate-100 font-mono">
                      {totalMinutes}
                    </span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase">Mins</span>
                  </div>
                </div>

                <div className="w-full space-y-1.5 mt-2">
                  {breakdown.map((item, idx) => (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-1.5 rounded-xl text-xs transition-colors cursor-pointer ${
                        hoveredSlice === idx ? 'bg-[#E4EDFC]/60 dark:bg-slate-800' : ''
                      }`}
                      onClick={() => setHoveredSlice(hoveredSlice === idx ? null : idx)}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                          {item.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 font-mono">
                        <span className="text-slate-500 dark:text-slate-400">{item.minutes}m</span>
                        <span className="text-slate-400 font-bold w-7 text-right">
                          {item.percentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. WEEKLY VIEW: 7-Day Performance Bars & Averages */}
      {period === 'weekly' && (
        <div className="bg-white/85 dark:bg-slate-900 border border-[#C2D8FC]/60 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#E4EDFC] dark:border-slate-800">
            <div>
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                7-Day Study Trend
              </h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                Consistency tracker for the current week
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-800 dark:text-[#9FC6FC] bg-[#E4EDFC] dark:bg-blue-950/60 border border-[#C2D8FC] dark:border-blue-900 px-3 py-1 rounded-xl">
              <TrendingUp size={13} />
              <span>Avg: {weeklyAvg}m / day</span>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            {weeklyData.map((d) => {
              const percent = maxWeeklyMinutes > 0 ? (d.minutes / maxWeeklyMinutes) * 100 : 0;
              return (
                <div key={d.date} className="flex items-center gap-3">
                  <div className="w-16 text-right shrink-0">
                    <span
                      className={`text-xs font-semibold ${
                        d.isCurrent
                          ? 'text-blue-700 dark:text-[#9FC6FC] font-extrabold'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {d.dayLabel} {d.dateNum}
                    </span>
                  </div>

                  <div className="flex-1 bg-[#E4EDFC]/50 dark:bg-slate-800 h-6 rounded-xl overflow-hidden relative">
                    <div
                      className={`h-full rounded-xl transition-colors ${
                        d.isCurrent
                          ? 'bg-[#9FC6FC] dark:bg-blue-400'
                          : d.minutes >= 60
                          ? 'bg-blue-500 dark:bg-blue-600'
                          : 'bg-[#C2D8FC] dark:bg-slate-700'
                      }`}
                      style={{ width: `${Math.max(d.minutes > 0 ? 5 : 0, percent)}%` }}
                    />
                  </div>

                  <div className="w-14 text-right shrink-0 font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                    {d.minutes}m
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. ANNUAL VIEW: 12-Month Heatmap & Performance Matrix */}
      {period === 'annual' && (
        <div className="bg-white/85 dark:bg-slate-900 border border-[#C2D8FC]/60 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#E4EDFC] dark:border-slate-800">
            <div>
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Annual Progress ({currentYear})
              </h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                12-month aggregated study hours & active day matrix
              </p>
            </div>
            <span className="text-xs font-mono font-bold bg-[#E4EDFC] dark:bg-slate-800 text-blue-900 dark:text-white px-2.5 py-1 rounded-xl">
              {annualDaysStudied} Active Study Days
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-1">
            {annualMonths.map((m) => {
              const fillPct = maxMonthMinutes > 0 ? (m.minutes / maxMonthMinutes) * 100 : 0;
              const hours = (m.minutes / 60).toFixed(1);

              return (
                <div
                  key={m.label}
                  className="p-3 rounded-2xl border border-[#E4EDFC] dark:border-slate-800 bg-[#F0F5FD]/60 dark:bg-slate-800/50 flex flex-col justify-between h-24"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {m.label}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {m.daysStudied}d active
                    </span>
                  </div>

                  <div>
                    <div className="text-sm font-black text-slate-900 dark:text-slate-100 font-mono">
                      {hours}h
                    </div>
                    <div className="w-full bg-[#C2D8FC]/40 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1.5">
                      <div
                        className="h-full bg-blue-500 dark:bg-[#9FC6FC] rounded-full transition-colors"
                        style={{ width: `${fillPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Duolingo Rewards & Streak Modal */}
      <StreakModal isOpen={streakModalOpen} onClose={() => setStreakModalOpen(false)} />
    </div>
  );
}

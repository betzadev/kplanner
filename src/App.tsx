import { useState, useEffect } from 'react';
import './App.css';
import { ActiveTab } from './types';
import { usePlannerStore } from './store/usePlannerStore';
import { useSubjectStore } from './store/useSubjectStore';
import { useTimerStore } from './store/useTimerStore';
import { useThemeStore } from './store/useThemeStore';
import { useGamificationStore } from './store/useGamificationStore';
import { useDDayStore } from './store/useDDayStore';
import { useLanguageStore } from './store/useLanguageStore';
import { useDailySheet } from './hooks/useDailySheet';

import { PlannerHeader } from './components/planner/PlannerHeader';
import { SubjectLegend } from './components/planner/SubjectLegend';
import { TaskChecklist } from './components/planner/TaskChecklist';
import { TenMinGrid } from './components/planner/TenMinGrid';
import { BottomMemoGrid } from './components/planner/BottomMemoGrid';
import { ShareCardModal } from './components/planner/ShareCardModal';
import { TimerView } from './components/timer/TimerView';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { SettingsView } from './components/settings/SettingsView';
import { StreakModal } from './components/gamification/StreakModal';
import { triggerHaptic } from './utils/haptics';
import { useBackButton } from './hooks/useBackButton';

import {
  Calendar,
  Clock,
  BarChart3,
  Settings,
  Grid3X3,
  CheckSquare,
  Layers,
  Flame,
  Gem,
  FileText,
  Share2,
} from 'lucide-react';
import { TbPlant2 } from 'react-icons/tb';

type SheetSubView = 'tasks' | 'grid' | 'memos' | 'all';

export default function App() {
  const t = useLanguageStore((state) => state.t);
  const initLanguage = useLanguageStore((state) => state.initLanguage);

  const [activeTab, setActiveTab] = useState<ActiveTab>('planner');
  const [sheetSubView, setSheetSubView] = useState<SheetSubView>('tasks');
  const [streakModalOpen, setStreakModalOpen] = useState(false);
  const [shareCardOpen, setShareCardOpen] = useState(false);

  useBackButton({
    activeTab,
    setActiveTab,
    openModals: [
      { name: 'streak', isOpen: streakModalOpen, close: () => setStreakModalOpen(false) },
      { name: 'shareCard', isOpen: shareCardOpen, close: () => setShareCardOpen(false) },
    ],
  });

  const currentDate = usePlannerStore((state) => state.currentDate);
  const setCurrentDate = usePlannerStore((state) => state.setCurrentDate);
  const loadSheetFromRust = usePlannerStore((state) => state.loadSheetFromRust);
  const dailySheets = usePlannerStore((state) => state.dailySheets);
  const setBottomMemoLabels = usePlannerStore((state) => state.setBottomMemoLabels);

  const initSubjects = useSubjectStore((state) => state.initFromRust);
  const selectSubject = useSubjectStore((state) => state.selectSubject);
  const initTimer = useTimerStore((state) => state.initFromRust);
  const setTask = useTimerStore((state) => state.setTask);
  const initTheme = useThemeStore((state) => state.initTheme);
  const initDDay = useDDayStore((state) => state.initFromRust);
  const initGamification = useGamificationStore((state) => state.initFromRust);

  const { calculateStreak, gems, initDailyQuests } = useGamificationStore();
  const { streakCount = 0, hasStudiedToday = false } = calculateStreak ? calculateStreak() : { streakCount: 0, hasStudiedToday: false };

  // Initialize data and stores from Rust backend / system
  useEffect(() => {
    initLanguage();
    initTheme();
    initSubjects();
    initTimer();
    initDDay();
    initGamification();
    initDailyQuests();
    loadSheetFromRust(currentDate);
  }, []);

  const {
    tasks,
    mainGoal,
    totalMinutes,
    bottomMemos,
    updateMainGoal,
    updateBottomMemo,
    addTask,
    updateTask,
    toggleTask,
    deleteTask,
  } = useDailySheet(currentDate);

  const currentSheet = dailySheets[currentDate] || {
    date: currentDate,
    mainGoal,
    totalMinutesStudied: totalMinutes,
    tasks,
    timeGrid: {},
    bottomMemos,
    memoLabels: null,
    completionStamp: null,
  };

  const handleTabSwitch = (tab: ActiveTab) => {
    setActiveTab(tab);
    triggerHaptic('light');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen dreamy-bg flex flex-col font-sans text-slate-800 dark:text-slate-100 pb-28 select-none transition-colors duration-200">
      {/* Mobile & Desktop Top Header */}
      <header className="bg-white/85 dark:bg-[#0B1120]/85 backdrop-blur-md border-b border-[#C2D8FC]/60 dark:border-slate-800 sticky top-0 z-30 shadow-2xs pt-[env(safe-area-inset-top,0px)] transition-colors">
        <div className="max-w-md md:max-w-4xl mx-auto px-3.5 sm:px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#9FC6FC] text-blue-950 dark:text-slate-900 flex items-center justify-center shadow-xs">
              <TbPlant2 size={24} className="text-blue-950 dark:text-slate-900" />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-black tracking-wider text-slate-900 dark:text-white block leading-none">
                {t.appTitle}
              </span>
              <span className="text-[10px] font-semibold text-blue-600 dark:text-[#9FC6FC] leading-none">
                {t.appSubtitle}
              </span>
            </div>
          </div>

          {/* Right Header: Share Card, Streak & Gems */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Shareable Studygram Card Exporter Button */}
            <button
              type="button"
              onClick={() => {
                setShareCardOpen(true);
                triggerHaptic('light');
              }}
              className="min-h-[44px] sm:min-h-[38px] px-2.5 py-1.5 rounded-full bg-white/80 dark:bg-slate-800 border border-[#C2D8FC] dark:border-slate-700 hover:scale-105 transition-transform cursor-pointer shadow-2xs text-blue-700 dark:text-[#9FC6FC] flex items-center gap-1"
              title={t.shareTitle}
              aria-label={t.shareTitle}
            >
              <Share2 size={14} />
              <span className="text-xs font-bold hidden sm:inline">{t.share}</span>
            </button>

            {/* Streak Pill */}
            <button
              type="button"
              onClick={() => {
                setStreakModalOpen(true);
                triggerHaptic('light');
              }}
              className="min-h-[44px] sm:min-h-[38px] flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#E4EDFC] dark:bg-slate-800 border border-[#9FC6FC] dark:border-slate-700 hover:scale-105 transition-transform cursor-pointer shadow-2xs"
              title={t.streak}
              aria-label={t.streak}
            >
              <Flame
                size={15}
                className={hasStudiedToday ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}
              />
              <span className="text-xs font-bold font-mono text-blue-950 dark:text-slate-200">
                {streakCount}
              </span>
            </button>

            {/* Gems Pill */}
            <button
              type="button"
              onClick={() => {
                setStreakModalOpen(true);
                triggerHaptic('light');
              }}
              className="min-h-[44px] sm:min-h-[38px] flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 dark:bg-slate-800 border border-[#C2D8FC] dark:border-slate-700 hover:scale-105 transition-transform cursor-pointer shadow-2xs"
              title={t.gems}
              aria-label={t.gems}
            >
              <Gem size={14} className="text-cyan-500" />
              <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200">
                {gems}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-md md:max-w-4xl w-full mx-auto p-3 sm:p-4 smooth-scroll">
        {activeTab === 'planner' && (
          <div className="space-y-3.5 relative">
            {/* Header: Date, Goal, D-Days, Total Time */}
            <PlannerHeader
              date={currentDate}
              mainGoal={mainGoal}
              totalMinutes={totalMinutes}
              onGoalChange={updateMainGoal}
              onDateChange={setCurrentDate}
            />

            {/* Subject Palette Selection */}
            <SubjectLegend onEditSubject={() => setActiveTab('settings')} />

            {/* View Switching on Mobile */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
              {/* Checklist Sub-view */}
              {(sheetSubView === 'tasks' || sheetSubView === 'all') && (
                <div className={`w-full ${sheetSubView === 'all' ? 'lg:col-span-7' : 'col-span-12'}`}>
                  <TaskChecklist
                    date={currentDate}
                    tasks={tasks}
                    onAddTask={addTask}
                    onUpdateTask={updateTask}
                    onToggleTask={toggleTask}
                    onDeleteTask={deleteTask}
                    onStartFocus={(taskId, subjectId) => {
                      selectSubject(subjectId);
                      setTask(taskId);
                      setActiveTab('timer');
                      triggerHaptic('medium');
                    }}
                  />
                </div>
              )}

              {/* 10-Minute Grid Sub-view */}
              {(sheetSubView === 'grid' || sheetSubView === 'all') && (
                <div
                  className={`w-full flex justify-center ${
                    sheetSubView === 'all' ? 'lg:col-span-5 lg:justify-end' : 'col-span-12'
                  }`}
                >
                  <TenMinGrid date={currentDate} startHour={6} />
                </div>
              )}

              {/* Bottom 6-Box Memo Grid Sub-view */}
              {(sheetSubView === 'memos' || sheetSubView === 'all') && (
                <div className="col-span-12">
                  <BottomMemoGrid
                    memos={bottomMemos}
                    customLabels={currentSheet.memoLabels}
                    onMemoChange={updateBottomMemo}
                    onLabelsChange={(labels) => setBottomMemoLabels(currentDate, labels)}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'timer' && <TimerView />}

        {activeTab === 'analytics' && <AnalyticsView />}

        {activeTab === 'settings' && <SettingsView />}
      </main>

      {/* Floating Submenu for Mobile Sheet (Tasks / Grid / Memos / All) */}
      {activeTab === 'planner' && (
        <div className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] left-0 right-0 z-30 flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-[#9FC6FC]/80 dark:border-slate-700 rounded-full p-1 shadow-lg flex items-center gap-1 transition-all">
            <button
              type="button"
              onClick={() => {
                setSheetSubView('tasks');
                triggerHaptic('light');
              }}
              className={`min-h-[44px] flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                sheetSubView === 'tasks'
                  ? 'bg-blue-600 dark:bg-[#9FC6FC] text-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CheckSquare size={14} />
              <span>{t.dailyTasks} ({tasks.filter((task) => !task.isCompleted).length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSheetSubView('grid');
                triggerHaptic('light');
              }}
              className={`min-h-[44px] flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                sheetSubView === 'grid'
                  ? 'bg-blue-600 dark:bg-[#9FC6FC] text-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Grid3X3 size={14} />
              <span>{t.gridTitle}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSheetSubView('memos');
                triggerHaptic('light');
              }}
              className={`min-h-[44px] flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                sheetSubView === 'memos'
                  ? 'bg-blue-600 dark:bg-[#9FC6FC] text-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText size={14} />
              <span>{t.notesTitle}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSheetSubView('all');
                triggerHaptic('light');
              }}
              className={`hidden sm:flex min-h-[44px] items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                sheetSubView === 'all'
                  ? 'bg-blue-600 dark:bg-[#9FC6FC] text-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers size={14} />
              <span>All</span>
            </button>
          </div>
        </div>
      )}

      {/* Fixed Mobile & Desktop Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0B1120]/95 backdrop-blur-md border-t border-[#C2D8FC]/60 dark:border-slate-800 pb-[env(safe-area-inset-bottom,0px)] shadow-lg transition-colors">
        <div className="max-w-md md:max-w-xl mx-auto flex items-center justify-around h-16 px-2">
          <button
            type="button"
            onClick={() => handleTabSwitch('planner')}
            className={`min-h-[44px] flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer active:scale-95 ${
              activeTab === 'planner'
                ? 'text-blue-700 dark:text-[#9FC6FC] font-extrabold'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 font-semibold'
            }`}
          >
            <div
              className={`p-1.5 rounded-2xl transition-colors ${
                activeTab === 'planner' ? 'bg-[#E4EDFC] dark:bg-slate-800 text-blue-700 dark:text-[#9FC6FC]' : ''
              }`}
            >
              <Calendar size={20} strokeWidth={activeTab === 'planner' ? 2.5 : 2} />
            </div>
            <span className="text-[11px] mt-0.5 tracking-tight">{t.navSheet}</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabSwitch('timer')}
            className={`min-h-[44px] flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer active:scale-95 ${
              activeTab === 'timer'
                ? 'text-blue-700 dark:text-[#9FC6FC] font-extrabold'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 font-semibold'
            }`}
          >
            <div
              className={`p-1.5 rounded-2xl transition-colors ${
                activeTab === 'timer' ? 'bg-[#E4EDFC] dark:bg-slate-800 text-blue-700 dark:text-[#9FC6FC]' : ''
              }`}
            >
              <Clock size={20} strokeWidth={activeTab === 'timer' ? 2.5 : 2} />
            </div>
            <span className="text-[11px] mt-0.5 tracking-tight">{t.navTimer}</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabSwitch('analytics')}
            className={`min-h-[44px] flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer active:scale-95 ${
              activeTab === 'analytics'
                ? 'text-blue-700 dark:text-[#9FC6FC] font-extrabold'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 font-semibold'
            }`}
          >
            <div
              className={`p-1.5 rounded-2xl transition-colors ${
                activeTab === 'analytics' ? 'bg-[#E4EDFC] dark:bg-slate-800 text-blue-700 dark:text-[#9FC6FC]' : ''
              }`}
            >
              <BarChart3 size={20} strokeWidth={activeTab === 'analytics' ? 2.5 : 2} />
            </div>
            <span className="text-[11px] mt-0.5 tracking-tight">{t.navStats}</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabSwitch('settings')}
            className={`min-h-[44px] flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer active:scale-95 ${
              activeTab === 'settings'
                ? 'text-blue-700 dark:text-[#9FC6FC] font-extrabold'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 font-semibold'
            }`}
          >
            <div
              className={`p-1.5 rounded-2xl transition-colors ${
                activeTab === 'settings' ? 'bg-[#E4EDFC] dark:bg-slate-800 text-blue-700 dark:text-[#9FC6FC]' : ''
              }`}
            >
              <Settings size={20} strokeWidth={activeTab === 'settings' ? 2.5 : 2} />
            </div>
            <span className="text-[11px] mt-0.5 tracking-tight">{t.navSettings}</span>
          </button>
        </div>
      </nav>

      {/* Modals */}
      <StreakModal isOpen={streakModalOpen} onClose={() => setStreakModalOpen(false)} />
      <ShareCardModal
        isOpen={shareCardOpen}
        onClose={() => setShareCardOpen(false)}
        date={currentDate}
        sheet={currentSheet}
      />
    </div>
  );
}

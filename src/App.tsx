import { useState, useEffect } from 'react';
import './App.css';
import { ActiveTab } from './types';
import { usePlannerStore } from './store/usePlannerStore';
import { useSubjectStore } from './store/useSubjectStore';
import { useTimerStore } from './store/useTimerStore';
import { useDailySheet } from './hooks/useDailySheet';

import { PlannerHeader } from './components/planner/PlannerHeader';
import { SubjectLegend } from './components/planner/SubjectLegend';
import { TaskChecklist } from './components/planner/TaskChecklist';
import { TenMinGrid } from './components/planner/TenMinGrid';
import { BottomMemoGrid } from './components/planner/BottomMemoGrid';
import { TimerView } from './components/timer/TimerView';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { SettingsView } from './components/settings/SettingsView';
import { triggerHaptic } from './utils/haptics';

import { Calendar, Clock, BarChart3, Settings, Grid3X3, CheckSquare, Layers } from 'lucide-react';

type SheetSubView = 'all' | 'grid' | 'tasks';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('planner');
  const [sheetSubView, setSheetSubView] = useState<SheetSubView>('all');

  const currentDate = usePlannerStore((state) => state.currentDate);
  const setCurrentDate = usePlannerStore((state) => state.setCurrentDate);
  const loadSheetFromRust = usePlannerStore((state) => state.loadSheetFromRust);
  const initSubjects = useSubjectStore((state) => state.initFromRust);
  const initTimer = useTimerStore((state) => state.initFromRust);

  // Initialize data from Rust backend
  useEffect(() => {
    initSubjects();
    initTimer();
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
    toggleTask,
    deleteTask,
  } = useDailySheet(currentDate);

  const handleTabSwitch = (tab: ActiveTab) => {
    setActiveTab(tab);
    triggerHaptic('light');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#FDFCF7] flex flex-col font-sans text-slate-800 pb-20 select-none">
      {/* Mobile Top Header */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-300 sticky top-0 z-30 shadow-2xs pt-[env(safe-area-inset-top,0px)]">
        <div className="max-w-md md:max-w-4xl mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-slate-900 text-white flex items-center justify-center font-extrabold text-xs shadow-xs">
              KP
            </span>
            <span className="text-xs font-black tracking-wider text-slate-900">
              K-PLANNER
            </span>
          </div>

          {/* Subview switcher on Daily Sheet tab for mobile */}
          {activeTab === 'planner' && (
            <div className="flex items-center bg-slate-100 p-0.5 rounded-md border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setSheetSubView('all');
                  triggerHaptic('light');
                }}
                className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition-all ${
                  sheetSubView === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500'
                }`}
                title="Full Sheet"
              >
                <Layers size={11} />
                <span>All</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSheetSubView('grid');
                  triggerHaptic('light');
                }}
                className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition-all ${
                  sheetSubView === 'grid'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500'
                }`}
                title="10-Min Grid Focus"
              >
                <Grid3X3 size={11} />
                <span>Grid</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSheetSubView('tasks');
                  triggerHaptic('light');
                }}
                className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition-all ${
                  sheetSubView === 'tasks'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500'
                }`}
                title="Checklist Focus"
              >
                <CheckSquare size={11} />
                <span>Tasks</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-md md:max-w-4xl w-full mx-auto p-3 sm:p-4 smooth-scroll">
        {activeTab === 'planner' && (
          <div className="space-y-3">
            {/* Header: Date, Goal, Total Time */}
            <PlannerHeader
              date={currentDate}
              mainGoal={mainGoal}
              totalMinutes={totalMinutes}
              onGoalChange={updateMainGoal}
              onDateChange={setCurrentDate}
            />

            {/* Subject Palette Selection */}
            <SubjectLegend onEditSubject={() => setActiveTab('settings')} />

            {/* Mobile View: Dynamic based on segment, Tablet/Desktop: Split layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
              {/* Checklist Column */}
              {(sheetSubView === 'all' || sheetSubView === 'tasks') && (
                <div className={`w-full ${sheetSubView === 'all' ? 'lg:col-span-7' : 'col-span-12'}`}>
                  <TaskChecklist
                    date={currentDate}
                    tasks={tasks}
                    onAddTask={addTask}
                    onToggleTask={toggleTask}
                    onDeleteTask={deleteTask}
                  />
                </div>
              )}

              {/* 10-Minute Grid Column */}
              {(sheetSubView === 'all' || sheetSubView === 'grid') && (
                <div
                  className={`w-full flex justify-center ${
                    sheetSubView === 'all' ? 'lg:col-span-5 lg:justify-end' : 'col-span-12'
                  }`}
                >
                  <TenMinGrid date={currentDate} startHour={6} />
                </div>
              )}
            </div>

            {/* Bottom 6-Box Memo Grid */}
            {(sheetSubView === 'all' || sheetSubView === 'tasks') && (
              <BottomMemoGrid memos={bottomMemos} onMemoChange={updateBottomMemo} />
            )}
          </div>
        )}

        {activeTab === 'timer' && <TimerView />}

        {activeTab === 'analytics' && <AnalyticsView />}

        {activeTab === 'settings' && <SettingsView />}
      </main>

      {/* Fixed Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 pb-[env(safe-area-inset-bottom,0px)] shadow-lg">
        <div className="max-w-md md:max-w-xl mx-auto flex items-center justify-around h-15 px-2">
          <button
            type="button"
            onClick={() => handleTabSwitch('planner')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer active:scale-95 ${
              activeTab === 'planner'
                ? 'text-slate-900 font-extrabold'
                : 'text-slate-400 hover:text-slate-600 font-semibold'
            }`}
          >
            <div
              className={`p-1 rounded-full transition-colors ${
                activeTab === 'planner' ? 'bg-slate-100 text-slate-900' : ''
              }`}
            >
              <Calendar size={19} strokeWidth={activeTab === 'planner' ? 2.5 : 2} />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Sheet</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabSwitch('timer')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer active:scale-95 ${
              activeTab === 'timer'
                ? 'text-slate-900 font-extrabold'
                : 'text-slate-400 hover:text-slate-600 font-semibold'
            }`}
          >
            <div
              className={`p-1 rounded-full transition-colors ${
                activeTab === 'timer' ? 'bg-slate-100 text-slate-900' : ''
              }`}
            >
              <Clock size={19} strokeWidth={activeTab === 'timer' ? 2.5 : 2} />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Timer</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabSwitch('analytics')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer active:scale-95 ${
              activeTab === 'analytics'
                ? 'text-slate-900 font-extrabold'
                : 'text-slate-400 hover:text-slate-600 font-semibold'
            }`}
          >
            <div
              className={`p-1 rounded-full transition-colors ${
                activeTab === 'analytics' ? 'bg-slate-100 text-slate-900' : ''
              }`}
            >
              <BarChart3 size={19} strokeWidth={activeTab === 'analytics' ? 2.5 : 2} />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Stats</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabSwitch('settings')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer active:scale-95 ${
              activeTab === 'settings'
                ? 'text-slate-900 font-extrabold'
                : 'text-slate-400 hover:text-slate-600 font-semibold'
            }`}
          >
            <div
              className={`p-1 rounded-full transition-colors ${
                activeTab === 'settings' ? 'bg-slate-100 text-slate-900' : ''
              }`}
            >
              <Settings size={19} strokeWidth={activeTab === 'settings' ? 2.5 : 2} />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Settings</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

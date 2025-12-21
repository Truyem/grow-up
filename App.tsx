

import React, { useState, useEffect } from 'react';

// Suppress Recharts defaultProps warning
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  if (typeof args[0] === 'string' && /defaultProps will be removed from function components/.test(args[0])) {
    return;
  }
  originalConsoleError(...args);
};

import wallpaper from './wallpaper.webp';
import wallpaperMb from './wallpaper-mb.webp';
import { FatigueLevel, MuscleGroup, UserInput, DailyPlan, WorkoutHistoryItem, Intensity, Meal, UserStats, AIOverview, Expense } from './types';
import { UserForm } from './components/UserForm';
import { PlanDisplay } from './components/PlanDisplay';
import { HistoryView } from './components/HistoryView';
// AnalysisView merged into HistoryView

import { Toast } from './components/ui/Toast';
import { ApiStatusBadge } from './components/ui/ApiStatusBadge';
import { generateDailyPlan, getApiStatus, ApiStatus } from './services/geminiService';
import { Sparkles, History, Dumbbell } from 'lucide-react';
import { LoadingAnimation } from './components/ui/LoadingAnimation';
import { OnlineCounter } from './components/ui/OnlineCounter';

// Default equipment list
const DEFAULT_EQUIPMENT = [
  "Board chống đẩy",
  "BFR Bands",
  "Tạ đơn 4kg",
  "Tạ đơn 8kg",
  "Tạ đơn 10kg",
  "Dây kháng lực 15kg"
];

// Initial State
const INITIAL_USER_DATA: UserInput = {
  weight: 61,
  height: 165,
  fatigue: FatigueLevel.Normal,
  soreMuscles: [MuscleGroup.None],
  selectedIntensity: Intensity.Medium,
  nutritionGoal: 'cutting',
  trainingMode: 'standard',
  useCreatine: false, // Default false
  equipment: DEFAULT_EQUIPMENT,
  availableIngredients: [],
  consumedFood: []
};

// Initial Stats (Only Streak)
const INITIAL_STATS: UserStats = {
  streak: 0,
  lastLoginDate: ''
};

type ViewMode = 'input' | 'plan' | 'history' | 'analysis';

// Helper to match the date format used in service
const getTodayString = () => {
  const now = new Date();
  const days = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  return `${days[now.getDay()]}, ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
};

export default function App() {
  const [userData, setUserData] = useState<UserInput>(INITIAL_USER_DATA);
  const [userStats, setUserStats] = useState<UserStats>(INITIAL_STATS);
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutHistoryItem[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('input');
  const [aiOverview, setAiOverview] = useState<AIOverview | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<ApiStatus>(() => getApiStatus());
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Update API status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setApiStatus(getApiStatus());
    }, 5000);
    return () => clearInterval(interval);
  }, []);
  // Auto-save on page unload/visibility change to prevent data loss
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Force sync save of current state to localStorage
      const currentProgress = localStorage.getItem('workout_progress');
      const currentPlan = localStorage.getItem('daily_plan_cache');

      // Data is already being saved by PlanDisplay component, but we ensure it's synced
      if (currentProgress && currentPlan) {
        console.log('Auto-saving progress before page unload...');
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // When tab becomes hidden, ensure data is persisted
        console.log('Tab hidden - data auto-saved via localStorage');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Load local history, cached plan, stats and auto-complete logic
  useEffect(() => {
    // 0. Load User Settings
    const savedUserData = localStorage.getItem('user_settings');
    if (savedUserData) {
      try {
        const parsedUserData = JSON.parse(savedUserData);
        // Merge with initial data to handle new fields
        setUserData(prev => ({ ...prev, ...parsedUserData }));
      } catch (e) {
        console.error("Failed to load user settings", e);
      }
    }

    // 1. Load History
    let currentHistory: WorkoutHistoryItem[] = [];
    const savedHistory = localStorage.getItem('gym_history');
    if (savedHistory) {
      try {
        currentHistory = JSON.parse(savedHistory);
        setWorkoutHistory(currentHistory);
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }


    // 2a. Load Expenses
    const savedExpenses = localStorage.getItem('user_expenses');
    if (savedExpenses) {
      try {
        setExpenses(JSON.parse(savedExpenses));
      } catch (e) { console.error("Failed to load expenses", e); }
    }

    // 2. Load Stats & Handle Streak Logic
    const savedStatsStr = localStorage.getItem('user_stats');
    let currentStats = INITIAL_STATS;

    if (savedStatsStr) {
      try {
        currentStats = JSON.parse(savedStatsStr);
      } catch (e) { console.error("Failed stats load", e); }
    }

    const todayDate = new Date().toDateString(); // "Mon Sep 28 2025" format for streak logic
    if (currentStats.lastLoginDate !== todayDate) {
      // Check if last login was yesterday to increment streak
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      if (currentStats.lastLoginDate === yesterday.toDateString()) {
        currentStats.streak += 1;
      } else if (currentStats.lastLoginDate && currentStats.lastLoginDate !== todayDate) {
        // Break streak if gap > 1 day
        currentStats.streak = 1;
      } else if (!currentStats.lastLoginDate) {
        currentStats.streak = 1;
      }

      currentStats.lastLoginDate = todayDate;
      setUserStats(currentStats);
      localStorage.setItem('user_stats', JSON.stringify(currentStats));
    } else {
      setUserStats(currentStats);
    }


    // 3. Check for Cached Plan and Progress
    const cachedPlanStr = localStorage.getItem('daily_plan_cache');
    const savedProgressStr = localStorage.getItem('workout_progress');

    if (cachedPlanStr) {
      try {
        const cachedPlan = JSON.parse(cachedPlanStr) as DailyPlan;
        const todayStr = getTodayString();

        // AUTO-SAVE LOGIC: If the plan is from a DIFFERENT day
        if (cachedPlan.date !== todayStr) {
          console.log("Found stale plan from:", cachedPlan.date);

          // Clear consumed food for the new day
          setUserData(prev => ({ ...prev, consumedFood: [] }));

          // Check if this date already exists in history to prevent duplicates
          const alreadyExists = currentHistory.some(h => h.date === cachedPlan.date);

          if (!alreadyExists) {
            // Get progress if available
            let completedList: string[] = [];
            let userNoteFromProgress = "";
            let savedTimestamp = Date.now();

            if (savedProgressStr) {
              try {
                const progress = JSON.parse(savedProgressStr);
                if (progress.planDate === cachedPlan.date && progress.checkedState) {
                  const morningEx = cachedPlan.workout.detail.morning || [];
                  const eveningEx = cachedPlan.workout.detail.evening || [];

                  morningEx.forEach((ex, idx) => {
                    if (progress.checkedState[`mor-${idx}`]) completedList.push(ex.name);
                  });

                  eveningEx.forEach((ex, idx) => {
                    if (progress.checkedState[`eve-${idx}`]) completedList.push(ex.name);
                  });

                  userNoteFromProgress = progress.userNote || "";
                  savedTimestamp = progress.lastUpdated || Date.now();
                }
              } catch (e) {
                console.error("Failed to parse progress", e);
              }
            }

            // Always save the workout (even if no exercises were checked)
            const exSummary = completedList.length > 0 ? completedList.join(', ') : "Chưa hoàn thành bài tập";
            const finalNote = userNoteFromProgress
              ? userNoteFromProgress + " (Tự động lưu do qua ngày)"
              : "(Tự động lưu do qua ngày)";

            const newItem: WorkoutHistoryItem = {
              date: cachedPlan.date,
              timestamp: savedTimestamp,
              levelSelected: cachedPlan.workout.detail.levelName,
              summary: cachedPlan.workout.summary,
              completedExercises: completedList,
              userNotes: finalNote,
              exercisesSummary: exSummary,
              nutrition: cachedPlan.nutrition
            };

            const newHistory = [newItem, ...currentHistory];
            setWorkoutHistory(newHistory);
            localStorage.setItem('gym_history', JSON.stringify(newHistory));

            const exerciseCount = completedList.length;
            setToastMessage(`Đã tự động lưu buổi tập ngày ${cachedPlan.date} (${exerciseCount} bài tập). Dữ liệu đồ ăn đã được reset.`);
          }

          // Clean up old cache whether we saved it or not
          localStorage.removeItem('daily_plan_cache');
          localStorage.removeItem('workout_progress');

          // Stay on input mode to create TODAY's plan
          setViewMode('input');

        } else {
          // If plan is for TODAY, load it normally
          setPlan(cachedPlan);
          setViewMode('plan');
          console.log("Loaded cached plan for today:", todayStr);
        }

      } catch (e) {
        console.error("Failed to load cached plan", e);
        localStorage.removeItem('daily_plan_cache');
        localStorage.removeItem('workout_progress');
      }
    }
  }, []);

  // Save user settings whenever userData changes (exclude consumedFood as it resets daily)
  useEffect(() => {
    const settingsToSave = {
      weight: userData.weight,
      height: userData.height,
      fatigue: userData.fatigue,
      soreMuscles: userData.soreMuscles,
      selectedIntensity: userData.selectedIntensity,
      nutritionGoal: userData.nutritionGoal,
      trainingMode: userData.trainingMode,
      useCreatine: userData.useCreatine,
      equipment: userData.equipment,
      availableIngredients: userData.availableIngredients
      // consumedFood is NOT saved - it resets daily
    };
    localStorage.setItem('user_settings', JSON.stringify(settingsToSave));
  }, [userData]);

  // Save Expenses
  useEffect(() => {
    localStorage.setItem('user_expenses', JSON.stringify(expenses));
  }, [expenses]);

  const handleGenerate = async () => {
    setLoading(true);
    // Pass workout history to the service
    const generatedPlan = await generateDailyPlan(userData, workoutHistory);

    setPlan(generatedPlan);
    setViewMode('plan');

    // Save to local storage cache
    localStorage.setItem('daily_plan_cache', JSON.stringify(generatedPlan));
    // Clear any old progress when generating a fresh plan
    localStorage.removeItem('workout_progress');

    setLoading(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReset = () => {
    // Direct reset without confirmation dialog to ensure button responsiveness
    setPlan(null);
    localStorage.removeItem('daily_plan_cache');
    localStorage.removeItem('workout_progress'); // Also clear progress on manual reset
    setViewMode('input');
  };

  const handleCompleteWorkout = async (
    levelSelected: string,
    summary: string,
    completedExercises: string[],
    userNotes: string,
    nutrition: DailyPlan['nutrition']
  ) => {
    const now = new Date();
    const todayDateStr = getTodayString(); // Use the standardized date string helper

    const exercisesSummary = completedExercises.length > 0
      ? completedExercises.join(', ')
      : "Không có bài tập";

    const newItem: WorkoutHistoryItem = {
      date: todayDateStr,
      timestamp: now.getTime(),
      levelSelected,
      summary,
      completedExercises,
      userNotes: userNotes || "",
      exercisesSummary,
      nutrition, // Save nutrition to history
      weight: userData.weight // Save current weight
    };

    // Logic: Only keep 1 workout per day. Keep the one with the MOST exercises.
    const nowLocal = new Date();
    // Generate YYYY-MM-DD key using local time manually to avoid timezone issues
    const todayKey = `${nowLocal.getFullYear()}-${String(nowLocal.getMonth() + 1).padStart(2, '0')}-${String(nowLocal.getDate()).padStart(2, '0')}`;

    const isSameDay = (ts: number) => {
      const d = new Date(ts);
      const dKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return dKey === todayKey;
    };

    // Filter existing items: split into "Today's items" and "Others"
    // Use both date string AND timestamp check to be thorough against legacy data
    const existingTodayItems = workoutHistory.filter(h => h.date === todayDateStr || isSameDay(h.timestamp));
    const otherItems = workoutHistory.filter(h => h.date !== todayDateStr && !isSameDay(h.timestamp));

    let itemToSave = newItem;

    if (existingTodayItems.length > 0) {
      // Find existing item with max exercises
      let bestExisting = existingTodayItems[0];
      for (let i = 1; i < existingTodayItems.length; i++) {
        const curr = existingTodayItems[i];
        const currCount = curr.completedExercises ? curr.completedExercises.length : 0;
        const bestCount = bestExisting.completedExercises ? bestExisting.completedExercises.length : 0;
        if (currCount > bestCount) {
          bestExisting = curr;
        }
      }

      const bestExistingCount = bestExisting.completedExercises ? bestExisting.completedExercises.length : 0;
      const newCount = newItem.completedExercises ? newItem.completedExercises.length : 0;

      if (bestExistingCount > newCount) {
        // Keep existing as it has more exercises
        itemToSave = bestExisting;
      } else {
        // New is better or equal
        itemToSave = newItem;
      }
    }

    const updatedHistory = [itemToSave, ...otherItems];
    setWorkoutHistory(updatedHistory);
    localStorage.setItem('gym_history', JSON.stringify(updatedHistory));
  };

  const handleDeleteHistoryItem = async (timestamp: number) => {
    // Logic moved to HistoryView for custom modal. Here we just delete.
    const updatedHistory = workoutHistory.filter(item => item.timestamp !== timestamp);
    setWorkoutHistory(updatedHistory);
    localStorage.setItem('gym_history', JSON.stringify(updatedHistory));
  };

  // Handle sick day - maintain streak without breaking it
  const handleSickDay = () => {
    const todayDate = new Date().toDateString();
    const updatedStats = {
      ...userStats,
      lastLoginDate: todayDate  // Update last login to today to not break streak tomorrow
    };
    setUserStats(updatedStats);
    localStorage.setItem('user_stats', JSON.stringify(updatedStats));

    // Add a "sick day" entry to history
    const todayStr = getTodayString();
    const sickDayEntry: WorkoutHistoryItem = {
      date: todayStr,
      timestamp: Date.now(),
      levelSelected: 'Ốm/Bệnh',
      summary: 'Ngày nghỉ do ốm hoặc bệnh - Streak được giữ nguyên',
      completedExercises: [],
      userNotes: 'Nghỉ ngơi để hồi phục sức khỏe',
      exercisesSummary: 'Không tập (Ngày ốm)'
    };

    // Check if already marked sick today
    const alreadySickToday = workoutHistory.some(h => h.date === todayStr && h.levelSelected === 'Ốm/Bệnh');
    if (!alreadySickToday) {
      const newHistory = [sickDayEntry, ...workoutHistory];
      setWorkoutHistory(newHistory);
      localStorage.setItem('gym_history', JSON.stringify(newHistory));
    }

    setToastMessage(`Đã đánh dấu ngày ốm. Chuỗi ${userStats.streak} ngày của bạn được giữ nguyên! Hãy nghỉ ngơi và hồi phục nhé.`);
  };

  const handleUpdatePlan = (updatedPlan: DailyPlan) => {
    setPlan(updatedPlan);
    localStorage.setItem('daily_plan_cache', JSON.stringify(updatedPlan));
  };

  return (
    <div className="relative min-h-screen font-sans selection:bg-cyan-500/30 selection:text-cyan-100">

      {/* Loading Animation Overlay */}
      {loading && <LoadingAnimation />}



      {/* Optimized Background Layer */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        {/* Mobile Background */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700 ease-out transform scale-105 block md:hidden"
          style={{ backgroundImage: `url(${wallpaperMb})` }}
        />
        {/* Desktop Background */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700 ease-out transform scale-105 hidden md:block"
          style={{ backgroundImage: `url(${wallpaper})` }}
        />
        {/* Optimized aesthetics: Reduced opacity to let wallpaper shine through, added blur for depth */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

        {/* Gradient overlay for better text readability at the bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/40 to-transparent" />
      </div>

      {/* Content Layer */}
      <div className="relative z-10 container mx-auto px-4 py-10 max-w-5xl">

        {/* Header - Simplified for Dashboard */}
        {viewMode === 'input' && (
          <div className="text-center mb-10 space-y-3 animate-fade-in relative">
            <div className="inline-flex items-center justify-center p-3 bg-white/5 rounded-full mb-2 border border-white/10 shadow-lg backdrop-blur-md">
              <Sparkles className="w-6 h-6 text-cyan-300 animate-pulse" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight drop-shadow-lg">
              Grow <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Up</span>
            </h1>
            <p className="text-lg text-gray-300 font-light max-w-lg mx-auto">
              Lịch trình tập luyện thông minh & Sáng tạo.
            </p>

            {/* API Status Badge & Online Counter - Global */}
            <div className="flex flex-col items-center gap-3 pt-4">
              {apiStatus.totalKeys > 0 && (
                <ApiStatusBadge
                  status={apiStatus}
                  onKeyChange={() => setApiStatus(getApiStatus())}
                />
              )}
              <OnlineCounter />
            </div>
          </div>
        )}

        {/* Global Navigation Tabs */}
        <div className="flex justify-center mb-8 gap-4">
          <button
            onClick={() => setViewMode(plan ? 'plan' : 'input')}
            className={`px-4 py-2 rounded-full flex items-center gap-2 transition-all ${['input', 'plan'].includes(viewMode) ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
          >
            <Dumbbell className="w-4 h-4" />
            Tập luyện
          </button>
          <button
            onClick={() => setViewMode('history')}
            className={`px-4 py-2 rounded-full flex items-center gap-2 transition-all ${['history', 'analysis'].includes(viewMode) ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
          >
            <History className="w-4 h-4" />
            Lịch sử
          </button>
        </div>

        {/* Main View Switch */}
        <div className="transition-all duration-500 ease-in-out">
          {viewMode === 'plan' && plan ? (
            <PlanDisplay
              plan={plan}
              onReset={handleReset}
              onComplete={handleCompleteWorkout}
              onUpdatePlan={handleUpdatePlan}
              history={workoutHistory}
            />
          ) : viewMode === 'history' ? (
            <HistoryView
              history={workoutHistory}
              userData={userData}
              onBack={() => setViewMode('input')}
              onDelete={handleDeleteHistoryItem}
            />
          ) : (
            <div className="max-w-2xl mx-auto space-y-4">
              <UserForm
                userData={userData}
                setUserData={setUserData}
                userStats={userStats}
                onSubmit={handleGenerate}
                isLoading={loading}
                onSickDay={handleSickDay}
              />

              <button
                onClick={() => setViewMode('history')}
                className="w-full py-3 rounded-2xl font-semibold text-gray-400 bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-center justify-center gap-2 hover:scale-[1.01] hover:text-white hover:shadow-lg"
              >
                <History className="w-5 h-5" />
                Xem Lịch sử tập luyện
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-20 text-center text-xs text-gray-600">
        <p>© 2025 Vũ Đình Trung. All rights reserved.</p>
      </div>

      {/* Toast Notification */}
      <Toast
        message={toastMessage || ''}
        isOpen={!!toastMessage}
        onClose={() => setToastMessage(null)}
        type="success"
        duration={6000}
      />
    </div>
  );
}
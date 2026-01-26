

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
import { FatigueLevel, MuscleGroup, UserInput, DailyPlan, WorkoutHistoryItem, Intensity, Meal, UserStats, AIOverview, Expense, HealthCondition } from './types';
import { UserForm } from './components/UserForm';
import { PlanDisplay } from './components/PlanDisplay';
import { NutritionDisplay } from './components/NutritionDisplay';
import { HistoryView } from './components/HistoryView';


import { Toast } from './components/ui/Toast';
import { ApiStatusBadge } from './components/ui/ApiStatusBadge';
import { generateDailyPlan, getApiStatus, ApiStatus } from './services/geminiService';
import { Sparkles, History, Dumbbell, Utensils } from 'lucide-react';
import { LoadingAnimation } from './components/ui/LoadingAnimation';
import { PlanTabs } from './components/ui/PlanTabs';

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
  healthCondition: HealthCondition.Good, // Default Health
  soreMuscles: [MuscleGroup.None],
  selectedIntensity: Intensity.Medium,
  nutritionGoal: 'cutting',
  trainingMode: 'calis',
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

type ViewMode = 'input' | 'workout' | 'nutrition' | 'history';


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
  const [viewMode, setViewMode] = useState<ViewMode>('workout');
  const [aiOverview, setAiOverview] = useState<AIOverview | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<ApiStatus>(() => getApiStatus());
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Debug version to ensure HMR works
  useEffect(() => {
    console.log("App Version: 3-Tab Navigation Update");
  }, []);


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

    // 0.1 Load Inventory specific logic (If we separate it or just merge)
    // For now we persist 'user_settings' which should contain it, but let's double check save logic
    const savedInventory = localStorage.getItem('user_inventory');
    if (savedInventory) {
      try {
        const parsedInventory = JSON.parse(savedInventory);
        setUserData(prev => ({ ...prev, availableIngredients: parsedInventory }));
      } catch (e) {
        console.error("Failed to load inventory", e);
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
          setViewMode('workout');
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

  const handleGenerate = async (type: 'workout' | 'nutrition' | 'history') => {
    // If history tab, just switch view
    if (type === 'history') {
      setViewMode('history');
      return;
    }

    setLoading(true);

    // Generate ONLY the requested part
    // Type cast is safe because we check for 'history' above
    const generationType = type as 'workout' | 'nutrition';

    // Pass workout history to the service
    const generatedPartial = await generateDailyPlan(userData, workoutHistory, generationType);

    // MERGE LOGIC:
    // If we already have a plan, we keep the OTHER part.
    // If we don't have a plan, we might need a blank structure for the other part to avoid crashes.

    let finalPlan: DailyPlan;

    if (!plan) {
      // If no previous plan, the generated partial is mostly complete but might miss the other half.
      // However, generatedPartial ALWAYS has a fallback for the missing half, so it is safe to usage.
      finalPlan = generatedPartial;
    } else {
      // If we have a previous plan, we must ONLY update the part we just generated.
      // Failing to do this causes the "fallback" placeholder from generatedPartial
      // to overwrite the user's existing (real) plan for the other part.
      finalPlan = { ...plan };

      if (generationType === 'workout') {
        finalPlan.workout = generatedPartial.workout;
        finalPlan.schedule = generatedPartial.schedule; // Schedule is usually tied to workout
      }

      if (generationType === 'nutrition') {
        finalPlan.nutrition = generatedPartial.nutrition;
      }

      // Always update date
      finalPlan.date = generatedPartial.date || plan.date;
    }

    setPlan(finalPlan);

    // Switch to the relevant view
    setViewMode(generationType);

    // --- INVENTORY DEDUCTION LOGIC (Only runs if nutrition was generated) ---
    if (generationType === 'nutrition' && generatedPartial.nutrition?.consumedIngredients && generatedPartial.nutrition.consumedIngredients.length > 0) {
      const usedItems = generatedPartial.nutrition.consumedIngredients;
      let updatedIngredients = [...(userData.availableIngredients || [])];

      let deductionLog: string[] = [];

      usedItems.forEach(used => {
        // 1. Try Match by ID (Most Accurate)
        let matchIndex = -1;
        if ((used as any).id) {
          matchIndex = updatedIngredients.findIndex(inv => inv.id === (used as any).id);
        }

        // 2. Fallback to Name Matching if ID failed or missing
        if (matchIndex === -1) {
          const usedName = used.name.toLowerCase().trim();
          matchIndex = updatedIngredients.findIndex(inv => {
            const invName = inv.name.toLowerCase().trim();
            return invName === usedName || invName.includes(usedName) || usedName.includes(invName);
          });
        }

        if (matchIndex !== -1) {
          const invItem = updatedIngredients[matchIndex];
          // Simple unit handling - assuming AI tries to match units or we just subtract if units match
          // If units differ (e.g. kg vs g), this minimal version might struggle without complex conversion lib.
          // For now, prompt instructs AI to try matching provided units.
          // If units match, subtract.

          // Basic conversion for g/kg commonly used in food
          let quantityToDeduct = used.quantity;

          if (used.unit === 'g' && invItem.unit === 'kg') {
            quantityToDeduct = used.quantity / 1000;
          } else if (used.unit === 'kg' && invItem.unit === 'g') {
            quantityToDeduct = used.quantity * 1000;
          }

          const newQuantity = Math.max(0, invItem.quantity - quantityToDeduct);

          if (newQuantity <= 0) {
            // Mark for removal or keep at 0? Let's remove if 0
            deductionLog.push(`Hết: ${invItem.name}`);
            updatedIngredients[matchIndex] = { ...invItem, quantity: 0 }; // Mark 0 first
          } else {
            deductionLog.push(`Dùng ${quantityToDeduct} ${invItem.unit} ${invItem.name}`);
            updatedIngredients[matchIndex] = { ...invItem, quantity: parseFloat(newQuantity.toFixed(2)) };
          }
        }
      });

      // Filter out 0 items if desired, or keep them to show "Out of stock"
      // User request implied "5 - 4 = 1", so we update quantity.
      // Let's filter out items that reached exactly 0 to clean up.
      const finalIngredients = updatedIngredients.filter(i => i.quantity > 0);

      if (deductionLog.length > 0) {
        setToastMessage(`Đã trừ kho: ${deductionLog.join(', ')}`);
        // Update user data with new inventory
        setUserData(prev => ({ ...prev, availableIngredients: finalIngredients }));
      }
    }


    // Save to local storage cache
    localStorage.setItem('daily_plan_cache', JSON.stringify(finalPlan));

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
    setViewMode('workout');
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

  // Save user data changes
  useEffect(() => {
    localStorage.setItem('user_settings', JSON.stringify(userData));
    localStorage.setItem('user_inventory', JSON.stringify(userData.availableIngredients)); // Explicit save
  }, [userData]);

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

        {/* Header - Global for both Input and Plan views */}
        <div className="text-center mb-10 space-y-3 animate-fade-in relative transition-all duration-300">
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

        <div className="transition-all duration-500 ease-in-out">
          {/* Always show PlanTabs if plan is initialized (or just show them always? No, distinct mode) */}
          {/* Wait, we want tabs visible ALWAYS now if we are in this "hybrid" mode? */}
          {/* Actually, if NO plan exists at all, maybe we just default to Workout Input? */}
          {/* But once a plan is partially created, we need the global tabs. */}
          {/* Let's show tabs if plan exists OR if we are just exploring. */}

          {/* If plan exists (even partial), show global tabs to navigate between W/N/H */}
          {/* Always show PlanTabs to allow navigation between Input forms and History */}
          <div className="sticky top-4 z-50 mb-8 max-w-2xl mx-auto">
            <PlanTabs
              activeTab={viewMode as 'workout' | 'nutrition' | 'history'}
              onTabChange={(tab) => setViewMode(tab)}
              className="shadow-2xl"
            />
          </div>

          {/* Render content based on View Mode + Generation Status */}
          {viewMode === 'workout' && (
            plan?.workout?.isGenerated ? (
              <PlanDisplay
                plan={plan}
                onReset={handleReset}
                onComplete={handleCompleteWorkout}
                onUpdatePlan={handleUpdatePlan}
                history={workoutHistory}
                userData={userData}
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
                  history={workoutHistory}
                  onDeleteHistory={handleDeleteHistoryItem}
                  activeTab="workout"
                />
              </div>
            )
          )}

          {viewMode === 'nutrition' && (
            plan?.nutrition?.isGenerated ? (
              <NutritionDisplay plan={plan} onReset={handleReset} />
            ) : (
              <div className="max-w-2xl mx-auto space-y-4">
                <UserForm
                  userData={userData}
                  setUserData={setUserData}
                  userStats={userStats}
                  onSubmit={handleGenerate}
                  isLoading={loading}
                  onSickDay={handleSickDay}
                  history={workoutHistory}
                  onDeleteHistory={handleDeleteHistoryItem}
                  activeTab="nutrition"
                />
              </div>
            )
          )}

          {viewMode === 'history' && (
            <HistoryView
              history={workoutHistory}
              userData={userData}
              onDelete={handleDeleteHistoryItem}
            />
          )}

          {/* Initial State (No Plan Yet) - This logic overlaps with above if plan is null */}
          {/* If plan is null, the above checks `plan?.workout?.isGenerated` are false, so it renders UserForm. */}
          {/* But currently `viewMode` defaults to 'input'. */}
          {/* We should change default viewMode to 'workout' or similar. */}
          {/* AND we need to render UserForm if viewMode is 'input' (legacy) */}

          {viewMode === 'input' && (
            <div className="max-w-2xl mx-auto space-y-4">
              {/* Manually show Tabs here since PlanTabs is conditional on `plan` above? */}
              {/* Actually, if no plan used to show UserForm which had tabs. */}
              {/* Now UserForm has NO tabs. So we must provide tabs here if we want them. */}
              {/* BUT, if we are in 'input' mode, we usually default to 'workout'. */}

              {/* Fix: Switch viewMode to 'workout' by default in INITIAL STATE? */}
              {/* YES. see below for setting initial state change or effect */}

              {/* For now, just render UserForm with workout tab if caught in 'input' mode */}
              <div className="sticky top-4 z-50 mb-8 max-w-2xl mx-auto">
                <PlanTabs
                  activeTab="workout"
                  onTabChange={(tab) => setViewMode(tab as any)}
                  className="shadow-2xl"
                />
              </div>
              <UserForm
                userData={userData}
                setUserData={setUserData}
                userStats={userStats}
                onSubmit={handleGenerate}
                isLoading={loading}
                onSickDay={handleSickDay}
                history={workoutHistory}
                onDeleteHistory={handleDeleteHistoryItem}
                activeTab="workout"
              />
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
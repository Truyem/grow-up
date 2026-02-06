

import React, { useState, useEffect, lazy, Suspense } from 'react';

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
import { FatigueLevel, MuscleGroup, UserInput, DailyPlan, WorkoutHistoryItem, Intensity, Meal, UserStats, AIOverview, Expense, HealthCondition, Ingredient } from './types';
import { UserForm } from './components/UserForm';
import { PlanDisplay } from './components/PlanDisplay';
import { NutritionDisplay } from './components/NutritionDisplay';
import { HistoryView } from './components/HistoryView';

// Lazy load heavy auth components - only needed when user is not logged in or accessing settings
const AuthPage = lazy(() => import('./components/AuthPage').then(m => ({ default: m.AuthPage })));
const AccountSettings = lazy(() => import('./components/AccountSettings').then(m => ({ default: m.AccountSettings })));

import { supabase } from './services/supabase';
import { Session } from '@supabase/supabase-js';


import { Toast } from './components/ui/Toast';
import { ApiStatusBadge } from './components/ui/ApiStatusBadge';
import { generateDailyPlan, getApiStatus, ApiStatus, getBasicNutritionPlan } from './services/geminiService';
import { Sparkles, History, Dumbbell, Utensils, Settings } from 'lucide-react';
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
  nutritionGoal: 'bulking',
  trainingMode: 'gym',
  useCreatine: false, // Default false
  useOnlyAvailableIngredients: false, // New field 
  allowExtraVeggies: true, // Default to true for health
  equipment: DEFAULT_EQUIPMENT,
  availableIngredients: [],
  consumedFood: []
};

// Initial Stats (Only Streak)
const INITIAL_STATS: UserStats = {
  streak: 0,
  lastLoginDate: ''
};

type ViewMode = 'workout' | 'nutrition' | 'history' | 'settings';


// Helper to match the date format used in service
const getTodayString = () => {
  const now = new Date();
  const days = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  return `${days[now.getDay()]}, ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
};

// Calculate Streak based on Workout History (Weekly >= 4 sessions)
const calculateWeeklyStreak = (history: WorkoutHistoryItem[]) => {
  if (!history || history.length === 0) return 0;

  // Group by week (Monday start)
  const weeks: Record<string, number> = {};
  history.forEach(item => {
    const d = new Date(item.timestamp);
    const day = d.getDay() || 7; // 1=Mon, 7=Sun
    d.setHours(0, 0, 0, 0);
    const monday = new Date(d);
    monday.setDate(d.getDate() - day + 1);
    const weekKey = monday.toISOString().split('T')[0];
    weeks[weekKey] = (weeks[weekKey] || 0) + 1;
  });

  const today = new Date();
  const currentDay = today.getDay() || 7;
  const currentMonday = new Date(today);
  currentMonday.setDate(today.getDate() - currentDay + 1);
  currentMonday.setHours(0, 0, 0, 0);

  let streak = 0;
  let checkDate = new Date(currentMonday);

  // Limit iterations to prevent infinite loops (e.g. max 52 weeks)
  for (let i = 0; i < 100; i++) {
    const weekKey = checkDate.toISOString().split('T')[0];
    const count = weeks[weekKey] || 0;

    if (count >= 4) {
      streak++;
    } else {
      // If it's the CURRENT week, we don't break yet, just exclude it if incomplete
      if (checkDate.getTime() === currentMonday.getTime()) {
        // Continue to check previous week
      } else {
        // Past week failed -> Streak broken
        break;
      }
    }
    checkDate.setDate(checkDate.getDate() - 7);
  }
  return streak;
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

  const [session, setSession] = useState<Session | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Debug version to ensure HMR works
  useEffect(() => {
    console.log("App Version: Supabase Integration");
  }, []);

  // Update API status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setApiStatus(getApiStatus());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Check Auth Session & Handle URL Errors
  useEffect(() => {
    // Check for errors in URL (e.g., OTP expired)
    const hash = window.location.hash;
    if (hash && hash.includes('error_code=otp_expired')) {
      setToastMessage('Link xác thực đã hết hạn hoặc không hợp lệ. Vui lòng thử lại.');
      // Clear hash to prevent repeated errors
      window.history.replaceState(null, '', window.location.pathname);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsAuthChecking(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sync Data with Supabase on Login
  useEffect(() => {
    if (!session?.user) return;

    const syncData = async () => {
      try {
        setLoading(true);
        const { user } = session;

        // 1. Check Profile & Settings
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profile?.settings) {
          // Load settings from server
          setUserData(prev => ({ ...prev, ...profile.settings }));
        } else if (!profileError || profileError.code === 'PGRST116') {
          // No profile or empty settings -> Migration from LocalStorage?
          // If we have local settings, upload them.
          const localSettings = localStorage.getItem('user_settings');
          if (localSettings) {
            const parsed = JSON.parse(localSettings);
            // Upload to Supabase
            await supabase.from('profiles').upsert({
              id: user.id,
              email: user.email,
              settings: parsed,
              updated_at: new Date().toISOString()
            });
            setUserData(prev => ({ ...prev, ...parsed }));
            console.log("Migrated local settings to Supabase");
          }
        }

        // 2. Load Workout History
        const { data: logs, error: logsError } = await supabase
          .from('workout_logs')
          .select('id, data, timestamp') // Select ID
          .eq('user_id', user.id)
          .order('date', { ascending: false });

        if (logs) {
          let serverHistory = logs.map(l => ({
            ...(l.data as WorkoutHistoryItem),
            id: l.id // Attach the database ID
          }));

          // 3. Local Storage Migration (Check & Upload missing)
          const localHistJson = localStorage.getItem('gym_history');
          if (localHistJson) {
            try {
              const localHist: WorkoutHistoryItem[] = JSON.parse(localHistJson);
              const serverTimestamps = new Set(serverHistory.map(s => s.timestamp));

              // Identify items that are on local but NOT on server (by timestamp)
              const missingOnServer = localHist.filter(l => !serverTimestamps.has(l.timestamp));

              if (missingOnServer.length > 0) {
                console.log(`Found ${missingOnServer.length} local items to migrate.`);
                const rowsToInsert = missingOnServer.map(item => {
                  const d = new Date(item.timestamp);
                  const localDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                  return {
                    user_id: user.id,
                    date: localDateStr,
                    timestamp: item.timestamp,
                    data: item
                  };
                });

                // Upload missing items
                const { data: inserted, error: migErr } = await supabase.from('workout_logs')
                  .insert(rowsToInsert)
                  .select('id, data, timestamp');

                if (!migErr && inserted) {
                  console.log("Migration successful.");
                  // Add new server items to our list
                  const newItems = inserted.map(l => ({
                    ...(l.data as WorkoutHistoryItem),
                    id: l.id
                  }));
                  serverHistory = [...serverHistory, ...newItems];
                } else {
                  console.error("Migration failed:", migErr);
                }
              }

              // Clear Local Storage after attempt (Success or partial) to enforce Server Source of Truth
              // User requirement: "check if any stored on local, delete all and upload all to server"
              localStorage.removeItem('gym_history');
              console.log("Local history cleared.");

            } catch (e) {
              console.error("Local history parse error:", e);
            }
          }

          // Deduplicate Combined History (Server + Newly Migrated)
          const uniqueHistoryMap = new Map<string, WorkoutHistoryItem>();
          serverHistory.forEach(item => {
            // Priority: Keep item with ID (should be all now), or later timestamp
            if (uniqueHistoryMap.has(item.date)) {
              const existing = uniqueHistoryMap.get(item.date)!;
              const existingCount = existing.completedExercises?.length || 0;
              const newCount = item.completedExercises?.length || 0;
              // Resolution: Prefer existing server record unless new one has significantly more data. 
              // Actually, simplest is to just keep what we have. If timestamp differs -> different item.
              // IF existing has same date but different timestamp -> Keep BOTH?
              // User said: "duplicate date different ID still up" -> Allow multiples per day?
              // BUT existing dedupe logic enforces 1 per day.
              // Let's STICK to the existing dedupe logic for now to stay consistent with UI.
              if (newCount > existingCount || (newCount === existingCount && item.timestamp > existing.timestamp)) {
                uniqueHistoryMap.set(item.date, item);
              }
            } else {
              uniqueHistoryMap.set(item.date, item);
            }
          });

          const finalHistory = Array.from(uniqueHistoryMap.values())
            .sort((a, b) => b.timestamp - a.timestamp);

          setWorkoutHistory(finalHistory);
        }

      } catch (err) {
        console.error("Sync error:", err);
      } finally {
        setLoading(false);
      }
    };

    syncData();
  }, [session]);

  // Recalculate Streak when workoutHistory changes
  useEffect(() => {
    const newStreak = calculateWeeklyStreak(workoutHistory);
    if (newStreak !== userStats.streak) {
      setUserStats(prev => ({ ...prev, streak: newStreak }));
      // Optional: Save to local storage for persistence if needed, 
      // though it is derivative data now.
      const updatedStats = { ...userStats, streak: newStreak };
      localStorage.setItem('user_stats', JSON.stringify(updatedStats));
    }
  }, [workoutHistory]);


  // Auto-save on page unload/visibility change to prevent data loss - REDUNDANT NOW with Supabase saves? 
  // We will keep it for cached plan (still local for now)
  useEffect(() => {
    const handleBeforeUnload = () => { /* ... */ };
    // ... Simplified
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



    // 1. Load History (Supabase handled above, but keeping local cache load if not auth? No, strict auth)
    // If not logged in, we shouldn't show data. 
    // The previous useEffect handles loading data when session exists.



    // 2a. Load Expenses
    const savedExpenses = localStorage.getItem('user_expenses');
    if (savedExpenses) {
      try {
        setExpenses(JSON.parse(savedExpenses));
      } catch (e) { console.error("Failed to load expenses", e); }
    }

    // 2. Load Stats
    const savedStatsStr = localStorage.getItem('user_stats');
    let currentStats = INITIAL_STATS;

    if (savedStatsStr) {
      try {
        currentStats = JSON.parse(savedStatsStr);
      } catch (e) { console.error("Failed stats load", e); }
    }
    setUserStats(currentStats);



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

          let currentHistory: WorkoutHistoryItem[] = [];
          try {
            const localHist = localStorage.getItem('gym_history');
            if (localHist) currentHistory = JSON.parse(localHist);
          } catch (e) { }

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
          setViewMode('workout');

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

  // Save user settings whenever userData changes
  useEffect(() => {
    // Local backup
    localStorage.setItem('user_settings', JSON.stringify(userData));
    localStorage.setItem('user_inventory', JSON.stringify(userData.availableIngredients));

    // Supabase Sync
    if (session?.user) {
      const settingsToSave = {
        ...userData,
        // ensure we save inventory too
        availableIngredients: userData.availableIngredients
      };

      // Debounce this? For now direct save
      supabase.from('profiles').update({
        settings: settingsToSave,
        updated_at: new Date().toISOString()
      }).eq('id', session.user.id).then(({ error }) => {
        if (error) console.error("Failed to save settings to Supabase", error);
      });
    }
  }, [userData, session]);

  // Save Expenses
  useEffect(() => {
    localStorage.setItem('user_expenses', JSON.stringify(expenses));
  }, [expenses]);

  const handleGenerate = async (type: ViewMode) => {
    // If history or settings tab, just switch view
    if (type === 'history') {
      setViewMode('history');
      return;
    }
    if (type === 'settings') {
      setViewMode('settings');
      return;
    }

    setLoading(true);

    // Generate ONLY the requested part
    // Type cast is safe because we check for 'history' and 'settings' above
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

  const handleStartTracking = () => {
    const basicPlan = getBasicNutritionPlan(userData);

    // Merge with existing workout if available?
    // Since specific request for nutrition tracking substitute, we just set nutrition part.
    // But we need a complete Plan object.
    // getBasicNutritionPlan returns a full structure (with empty workout).

    let finalPlan = basicPlan;
    if (plan) {
      finalPlan = {
        ...plan,
        nutrition: basicPlan.nutrition
      };
    }

    setPlan(finalPlan);
    setViewMode('nutrition');

    // Save cache
    localStorage.setItem('daily_plan_cache', JSON.stringify(finalPlan));
  };

  // Handle adding suggested ingredient to fridge
  const handleAddSuggestedIngredient = (ingredient: Ingredient) => {
    setUserData(prev => ({
      ...prev,
      availableIngredients: [
        ...(prev.availableIngredients || []),
        { ...ingredient, id: ingredient.id || Date.now().toString() }
      ]
    }));

    // Remove from suggested list in plan
    if (plan?.nutrition?.suggestedIngredients) {
      const updatedPlan = { ...plan };
      updatedPlan.nutrition.suggestedIngredients = updatedPlan.nutrition.suggestedIngredients.filter(
        i => i.id !== ingredient.id
      );
      setPlan(updatedPlan);
      localStorage.setItem('daily_plan_cache', JSON.stringify(updatedPlan));
    }

    setToastMessage(`Đã thêm "${ingredient.name}" vào tủ lạnh!`);
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
    // localStorage.setItem('gym_history', JSON.stringify(updatedHistory));

    // Save to Supabase
    // Save to Supabase
    if (session?.user) {
      // Use LOCAL time date for the DB Key (YYYY-MM-DD)
      const d = new Date(itemToSave.timestamp);
      const localDateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      // CHECK BEFORE INSERT: Do we already have a log for this day?
      const { data: existingData } = await supabase.from('workout_logs')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('date', localDateKey)
        .maybeSingle();

      if (existingData) {
        // Update existing
        await supabase.from('workout_logs').update({
          timestamp: itemToSave.timestamp,
          data: itemToSave
        }).eq('id', existingData.id);
      } else {
        // Insert new
        await supabase.from('workout_logs').insert({
          user_id: session.user.id,
          date: localDateKey,
          timestamp: itemToSave.timestamp,
          data: itemToSave
        });
      }
    }
  };

  const handleDeleteHistoryItem = async (timestamp: number) => {
    // Optimistic Update
    const itemToDelete = workoutHistory.find(item => item.timestamp === timestamp);
    const updatedHistory = workoutHistory.filter(item => item.timestamp !== timestamp);
    setWorkoutHistory(updatedHistory);
    // localStorage.setItem('gym_history', JSON.stringify(updatedHistory));

    if (session?.user) {
      // 1. Delete by ID if we have it (Specific row optimization)
      if (itemToDelete?.id) {
        console.log("Deleting by ID:", itemToDelete.id);
        await supabase.from('workout_logs')
          .delete()
          .eq('id', itemToDelete.id)
          .eq('user_id', session.user.id);
      }

      // 2. Delete by Timestamp (Cleanup Duplicates)
      // This is critical because we have duplicate rows with different IDs but SAME timestamp.
      // We must delete ALL rows with this timestamp to ensure the entry is truly gone.
      console.log("Deleting by Timestamp:", timestamp);
      const { error: tsError } = await supabase.from('workout_logs')
        .delete()
        .eq('user_id', session.user.id)
        .eq('timestamp', timestamp); // Targets the top-level BIGINT timestamp column

      if (tsError) console.error("Supabase delete failed (Timestamp):", tsError);
    }
  };

  // Refresh workout history from server
  const handleRefreshHistory = async () => {
    if (!session?.user) return;

    setIsRefreshing(true);
    try {
      const { data: logs, error } = await supabase
        .from('workout_logs')
        .select('id, data, timestamp')
        .eq('user_id', session.user.id)
        .order('date', { ascending: false });

      if (error) {
        console.error("Refresh failed:", error);
        setToastMessage("Không thể làm mới lịch sử");
        return;
      }

      if (logs) {
        const serverHistory = logs.map(l => ({
          ...(l.data as WorkoutHistoryItem),
          id: l.id
        }));

        // Deduplicate by date (keep the one with most exercises)
        const uniqueHistoryMap = new Map<string, WorkoutHistoryItem>();
        serverHistory.forEach(item => {
          if (uniqueHistoryMap.has(item.date)) {
            const existing = uniqueHistoryMap.get(item.date)!;
            const existingCount = existing.completedExercises?.length || 0;
            const newCount = item.completedExercises?.length || 0;
            if (newCount > existingCount || (newCount === existingCount && item.timestamp > existing.timestamp)) {
              uniqueHistoryMap.set(item.date, item);
            }
          } else {
            uniqueHistoryMap.set(item.date, item);
          }
        });

        const finalHistory = Array.from(uniqueHistoryMap.values())
          .sort((a, b) => b.timestamp - a.timestamp);

        setWorkoutHistory(finalHistory);
        setToastMessage("Đã làm mới lịch sử thành công!");
      }
    } catch (err) {
      console.error("Refresh error:", err);
      setToastMessage("Có lỗi xảy ra khi làm mới");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle sick day - maintain streak without breaking it
  const handleSickDay = async () => {
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
      // localStorage.setItem('gym_history', JSON.stringify(newHistory));

      if (session?.user) {
        // IDEMPOTENT SAVE: Check if entry exists for this date/user
        const dateStr = new Date(sickDayEntry.timestamp).toISOString().split('T')[0];
        // Only insert if NOT exists (though logic above checks locally, let's be safe)
        const { data: existing } = await supabase.from('workout_logs')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('date', dateStr)
          .single();

        if (!existing) {
          await supabase.from('workout_logs').insert({
            user_id: session.user.id,
            date: dateStr,
            timestamp: sickDayEntry.timestamp,
            data: sickDayEntry
          });
        }
      }
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
      {(loading || isAuthChecking) && <LoadingAnimation />}

      {!isAuthChecking && !session ? (
        <Suspense fallback={<LoadingAnimation />}>
          <AuthPage />
        </Suspense>
      ) : (
        <>



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
              <button
                onClick={() => setViewMode('settings')}
                className="text-lg text-gray-300 font-light max-w-lg mx-auto hover:text-white transition-colors duration-200 cursor-pointer group flex items-center gap-2 justify-center"
              >
                Xin chào, <span className="text-cyan-400 font-semibold group-hover:text-cyan-300">{session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || 'Member'}</span>
                <Settings className="w-4 h-4 text-gray-400 group-hover:text-cyan-400 transition-colors" />
              </button>

              {/* API Status Badge & Online Counter - Global Removed as requested */}
              {/* <div className="flex flex-col items-center gap-3 pt-4">
            {apiStatus.totalKeys > 0 && (
              <ApiStatusBadge
                status={apiStatus}
                onKeyChange={() => setApiStatus(getApiStatus())}
              />
            )}
            <OnlineCounter />
          </div> */}
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
                  activeTab={viewMode}
                  onTabChange={(tab) => setViewMode(tab)}
                  className="shadow-2xl"
                />
              </div>

              {/* Render content based on View Mode + Generation Status */}
              {viewMode === 'settings' && session?.user ? (
                <Suspense fallback={<LoadingAnimation />}>
                  <AccountSettings
                    user={session.user}
                    onLogout={() => supabase.auth.signOut()}
                  />
                </Suspense>
              ) : null}

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
                      onStartTracking={handleStartTracking}
                      onRefreshHistory={handleRefreshHistory}
                      isRefreshing={isRefreshing}
                    />
                  </div>
                )
              )}

              {viewMode === 'nutrition' && (
                plan?.nutrition?.isGenerated ? (
                  <NutritionDisplay
                    plan={plan}
                    onReset={handleReset}
                    onUpdatePlan={handleUpdatePlan}
                    onAddSuggestedIngredient={handleAddSuggestedIngredient}
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
                      activeTab="nutrition"
                      onStartTracking={handleStartTracking}
                      onRefreshHistory={handleRefreshHistory}
                      isRefreshing={isRefreshing}
                    />
                  </div>
                )
              )}

              {viewMode === 'history' && (
                <HistoryView
                  history={workoutHistory}
                  userData={userData}
                  onDelete={handleDeleteHistoryItem}
                  onRefresh={handleRefreshHistory}
                  isRefreshing={isRefreshing}
                />
              )}
            </div>
          </div>
        </>
      )}

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
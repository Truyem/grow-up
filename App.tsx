

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
import { FatigueLevel, MuscleGroup, UserInput, DailyPlan, WorkoutHistoryItem, Intensity, Meal, UserStats, AIOverview, Expense, HealthCondition, Exercise, ExerciseLog } from './types';
import { UserForm } from './components/UserForm';
import { PlanDisplay } from './components/PlanDisplay';
import { NutritionDisplay } from './components/NutritionDisplay';
import { HistoryView } from './components/HistoryView';
import { ScheduleView } from './components/ScheduleView';

import { OnboardingTour, TourStep } from './components/OnboardingTour';


const SCHEDULE_LABELS: Record<string, string> = {
  'smor-0': 'Thức dậy',
  'smor-1': 'Vệ sinh cá nhân',
  'smor-2': 'Chuẩn bị ăn sáng',
  'smor-3': 'Ăn sáng',
  'smor-4': 'Đến phòng tập',
  'smor-5': 'Tập luyện chính',
  'smor-6': 'Về nhà',
  'smor-7': 'Mua đồ ăn trưa',
  'smor-8': 'Chuẩn bị đồ ăn',
  'smor-9': 'Nấu ăn',
  'smor-10': 'Ăn trưa',
  'smor-11': 'Rửa bát, nghỉ ngơi',
  'smor-12': 'Đến trường',
  'saft-0': 'Về nhà rèn luyện',
  'saft-1': 'Ngủ trưa',
  'saft-2': 'Chuẩn bị bữa tối',
  'saft-3': 'Bật nóng lạnh, cắm cơm',
  'saft-4': 'Nấu ăn',
  'saft-5': 'Ăn cơm',
  'saft-6': 'Tắm rửa',
  'saft-7': 'Giặt quần áo',
  'saft-8': 'Ôn bài',
  'saft-9': 'Tập Isolation (Nhẹ)',
  'saft-10': 'Giải trí & Thực phẩm bổ sung',
  'saft-11': 'Screen-off',
  'saft-12': 'Đi ngủ',
};

const getCompletedScheduleText = (state?: Record<string, boolean>) => {
  if (!state) return [];
  const res: string[] = [];
  Object.entries(state).forEach(([key, isChecked]) => {
    if (isChecked && SCHEDULE_LABELS[key]) {
      res.push(SCHEDULE_LABELS[key]);
    }
  });
  return res;
};

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
  equipment: DEFAULT_EQUIPMENT,
  consumedFood: [],
  hasSeenOnboarding: false // Default to false
};

// Initial Stats (Only Streak)
const INITIAL_STATS: UserStats = {
  streak: 0,
  lastLoginDate: ''
};

type ViewMode = 'workout' | 'nutrition' | 'history' | 'settings' | 'schedule';


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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);

  // Tour Configuration
  const tourSteps: TourStep[] = [
    {
      targetId: 'tour-streak',
      title: 'Chuỗi Streak 🔥',
      content: 'Theo dõi chuỗi ngày tập luyện liên tục của bạn tại đây. Đừng để dứt chuỗi nhé!',
      placement: 'bottom',
      onBeforeShow: () => setViewMode('workout')
    },
    {
      targetId: 'tour-body-stats',
      title: 'Chỉ Số Cơ Thể 📏',
      content: 'Cập nhật cân nặng và chiều cao thường xuyên để AI tính toán chính xác nhất.',
      placement: 'bottom',
      onBeforeShow: () => setViewMode('workout')
    },
    {
      targetId: 'tour-training-mode',
      title: 'Chế Độ Tập 🏋️',
      content: 'Chọn nơi bạn tập luyện: Gym, Ở nhà (Home) hoặc Calisthenics.',
      placement: 'top',
      onBeforeShow: () => {
        setViewMode('workout');
        setPlan(null);
      }
    },
    {
      targetId: 'tour-input-intensity',
      title: 'Cường Độ 🔥',
      content: 'Chọn cường độ mong muốn: Vừa sức (Normal) hoặc Thử thách (Hard).',
      placement: 'top'
    },
    {
      targetId: 'tour-input-fatigue',
      title: 'Mức Độ Mệt Mỏi 🔋',
      content: 'Bạn đang cảm thấy thế nào? Hãy khai báo thật để AI điều chỉnh volume bài tập.',
      placement: 'bottom'
    },
    {
      targetId: 'tour-input-muscle',
      title: 'Nhóm Cơ Đau 🩹',
      content: 'Nếu đang đau cơ nào, hãy chọn ở đây để AI tránh hoặc giảm tải nhóm cơ đó.',
      placement: 'top'
    },
    {
      targetId: 'tour-generate-btn',
      title: 'Tạo Lịch Tập ⚡',
      content: 'Sau khi điền thông tin, bấm nút này để nhận lịch tập cá nhân hóa ngay lập tức.',
      placement: 'top'
    },
    {
      targetId: 'tour-tabs',
      title: 'Điều Hướng 🧭',
      content: 'Chuyển sang "Dinh Dưỡng" để xem thực đơn hôm nay nào!',
      placement: 'bottom'
    },

    {
      targetId: 'tour-nutri-goals',
      title: 'Mục Tiêu Dinh Dưỡng 🎯',
      content: 'Chọn chế độ (Bulking/Cutting) và bật Creatine để tối ưu hóa kế hoạch.',
      placement: 'bottom',
      onBeforeShow: () => {
        setViewMode('nutrition');
        setPlan(null);
      }
    },

    {
      targetId: 'tour-nutri-diary',
      title: 'Nhật Ký Ăn Uống 📝',
      content: 'Ghi lại những món bạn đã ăn trong ngày để theo dõi chính xác hơn.',
      placement: 'top'
    },
    {
      targetId: 'tour-nutrition-ai-btn',
      title: 'Tạo Kế Hoạch AI ✨',
      content: 'Bấm nút này để AI thiết kế thực đơn chi tiết cho cả ngày của bạn.',
      placement: 'top'
    },
    {
      targetId: 'tour-check-calo',
      title: 'Check Calo 📸',
      content: 'Chụp ảnh món ăn để AI tự động tính Calorie cho bạn. Rất tiện lợi!',
      placement: 'bottom',
      onBeforeShow: () => setViewMode('nutrition')
    },
    {
      targetId: 'tour-nutri-camera',
      title: 'Chụp Ảnh Món Ăn 📷',
      content: 'Bấm vào đây để mở camera và quét nhanh món ăn của bạn.',
      placement: 'bottom',
      onBeforeShow: () => handleStartTracking() // Simulate entering the feature
    },
    {
      targetId: 'tour-nutri-manual',
      title: 'Nhập Tay ⌨️',
      content: 'Hoặc gõ tên món ăn nếu bạn không tiện chụp ảnh (VD: "1 bát phở bò").',
      placement: 'bottom'
    },
    {
      targetId: 'tour-nutri-macros',
      title: 'Theo Dõi Macro 📊',
      content: 'Xem biểu đồ tròn thể hiện lượng Calo, Đạm, Béo, Tinh bột đã nạp trong ngày.',
      placement: 'top'
    },
    {
      targetId: 'tour-nutri-meals',
      title: 'Danh Sách Món Ăn 🥗',
      content: 'Nhấn vào từng món để đánh dấu đã ăn hoặc xem chi tiết dinh dưỡng.',
      placement: 'top'
    },
    {
      targetId: 'tour-nutri-reset',
      title: 'Tạo Lại Kế Hoạch 🔄',
      content: 'Nếu muốn thay đổi hoặc reset ngày mới, hãy bấm vào đây.',
      placement: 'top'
    },
    {
      targetId: 'tour-history-calendar',
      title: 'Lịch Sử Tập Luyện 📅',
      content: 'Theo dõi lại quá trình và thành quả tập luyện của bạn tại đây.',
      placement: 'top',
      onBeforeShow: () => setViewMode('history')
    },
    {
      targetId: 'tour-settings',
      title: 'Cài Đặt ⚙️',
      content: 'Chỉnh sửa thông tin cá nhân và thiết bị tập luyện của bạn.',
      placement: 'bottom',
      onBeforeShow: () => setViewMode('workout') // Return to main view
    },
  ];

  // Auto-start tour if new user
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    // Check if user is loaded and hasn't seen onboarding
    const localSettings = localStorage.getItem('user_settings');
    const localHasSeen = localSettings ? JSON.parse(localSettings).hasSeenOnboarding : false;

    if (!loading && userData.hasSeenOnboarding === false) {
      // Small delay to ensure UI is ready
      timeoutId = setTimeout(() => {
        if (userData.hasSeenOnboarding === false) {
          setIsTourOpen(true);
        }
      }, 1000);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [loading, userData.hasSeenOnboarding]);

  const handleTourComplete = async () => {
    setIsTourOpen(false);

    // Update local state
    const newUserData = { ...userData, hasSeenOnboarding: true };
    setUserData(newUserData);

    // Save to Local Storage
    localStorage.setItem('user_settings', JSON.stringify(newUserData));

    setToastMessage("Chào mừng bạn đến với Grow Up! Chúc bạn tập luyện hiệu quả.");
  };

  // Debug version to ensure HMR works
  useEffect(() => {
    console.log("App Version: Local Storage Only (No Supabase)");
  }, []);

  // Update API status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setApiStatus(getApiStatus());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

   // Sync Data: Load from localStorage instead of Supabase
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

  // === AUTO-SAVE FUNCTION: Save nutrition + workout when day changes ===
  const performAutoSave = async (cachedPlan: DailyPlan) => {
    const todayStr = getTodayString();
    console.log("[AutoSave] Triggered for stale plan from:", cachedPlan.date);

    // Clear consumed food for the new day
    setUserData(prev => ({ ...prev, consumedFood: [] }));

    const currentHistory = [...workoutHistory];
    const alreadyExists = currentHistory.some(h => h.date === cachedPlan.date);

    if (!alreadyExists) {
      let completedList: string[] = [];
      let userNoteFromProgress = "";
      let savedTimestamp = Date.now();
      let scheduleStateObj = {};

      // Try to get progress from localStorage (offline fallback) or plan data
      const savedProgressStr = localStorage.getItem('workout_progress');
      if (savedProgressStr) {
        try {
          const progress = JSON.parse(savedProgressStr);
          if (progress.planDate === cachedPlan.date && progress.checkedState) {
            const morningEx = cachedPlan.workout.detail.morning || [];
            const eveningEx = cachedPlan.workout.detail.evening || [];

            morningEx.forEach((ex: Exercise, idx: number) => {
              if (progress.checkedState[`mor-${idx}`]) completedList.push(ex.name);
            });

            eveningEx.forEach((ex: Exercise, idx: number) => {
              if (progress.checkedState[`eve-${idx}`]) completedList.push(ex.name);
            });

            userNoteFromProgress = progress.userNote || "";
            savedTimestamp = progress.lastUpdated || Date.now();
            scheduleStateObj = progress.scheduleState || {};
          }
        } catch (e) {
          console.error("[AutoSave] Failed to parse progress", e);
        }
      }

      const exSummary = completedList.length > 0 ? completedList.join(', ') : "Chưa hoàn thành bài tập";
      const finalNote = userNoteFromProgress
        ? userNoteFromProgress + " (Tự động lưu do qua ngày)"
        : "(Tự động lưu do qua ngày)";

      const completedSchedule = getCompletedScheduleText(scheduleStateObj);

      const newItem: WorkoutHistoryItem = {
        date: cachedPlan.date,
        timestamp: savedTimestamp,
        levelSelected: cachedPlan.workout.detail.levelName,
        completedSchedule,
        summary: cachedPlan.workout.summary,
        completedExercises: completedList,
        userNotes: finalNote,
        exercisesSummary: exSummary,
        nutrition: cachedPlan.nutrition,
        weight: userData.weight
      };

      const newHistory = [newItem, ...currentHistory];
      setWorkoutHistory(newHistory);

      // Save to localStorage only (no Supabase)
      localStorage.setItem('gym_history', JSON.stringify(newHistory));

      const exerciseCount = completedList.length;
      setToastMessage(`Đã tự động lưu buổi tập ngày ${cachedPlan.date} (${exerciseCount} bài tập). Dữ liệu đồ ăn đã được reset.`);
    }

    // Clean up old cache
    localStorage.removeItem('daily_plan_cache');
    localStorage.removeItem('workout_progress');

    // Reset plan to create TODAY's plan
    setPlan(null);
    setViewMode('workout');
  };

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
          // Delegate to the extracted performAutoSave function
          performAutoSave(cachedPlan);
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

  // === REAL-TIME MIDNIGHT DETECTION ===
  // Check every 30s if the day has changed while the app is open
  useEffect(() => {
    const checkMidnight = () => {
      const cachedPlanStr = localStorage.getItem('daily_plan_cache');
      if (!cachedPlanStr) return;

      try {
        const cachedPlan = JSON.parse(cachedPlanStr) as DailyPlan;
        const todayStr = getTodayString();

        if (cachedPlan.date !== todayStr) {
          console.log("[MidnightCheck] Day changed! Auto-saving...");
          performAutoSave(cachedPlan);
        }
      } catch (e) {
        console.error("[MidnightCheck] Error:", e);
      }
    };

    const interval = setInterval(checkMidnight, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, [workoutHistory, userData]);

  // Save user settings to localStorage
  useEffect(() => {
    localStorage.setItem('user_settings', JSON.stringify(userData));
  }, [userData]);

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
    if (type === 'schedule') {
      setViewMode('schedule');
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
      // No previous plan: generatedPartial has blank (not fallback) data for the non-generated part
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


    // Save to local storage cache only
    localStorage.setItem('daily_plan_cache', JSON.stringify(finalPlan));
    localStorage.removeItem('workout_progress');

    setLoading(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };


  const handleReset = (type: 'workout' | 'nutrition') => {
    if (!plan) {
      // No plan to reset
      setPlan(null);
      localStorage.removeItem('daily_plan_cache');
      localStorage.removeItem('workout_progress');
      return;
    }

    const updatedPlan = { ...plan };

    if (type === 'workout') {
      updatedPlan.workout = {
        summary: '', detail: { levelName: '', description: '', morning: [], evening: [] },
        isGenerated: false
      };
      updatedPlan.workoutProgress = undefined;
      localStorage.removeItem('workout_progress');
    }

    if (type === 'nutrition') {
      updatedPlan.nutrition = {
        totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0,
        advice: '', isGenerated: false, meals: []
      };
    }

    // If BOTH parts are now non-generated, fully clear the plan
    const bothBlank = !updatedPlan.workout?.isGenerated && !updatedPlan.nutrition?.isGenerated;
    if (bothBlank) {
      setPlan(null);
      localStorage.removeItem('daily_plan_cache');
    } else {
      // One part still has data — update, don't delete
      setPlan(updatedPlan);
      localStorage.setItem('daily_plan_cache', JSON.stringify(updatedPlan));
    }
  };

  const handleStartTracking = () => {
    const basicPlan = getBasicNutritionPlan(userData);

    // Merge with existing workout if available
    let finalPlan = basicPlan;
    if (plan) {
      finalPlan = {
        ...plan,
        nutrition: basicPlan.nutrition
      };
    }

    setPlan(finalPlan);
    setViewMode('nutrition');

    // Save cache only
    localStorage.setItem('daily_plan_cache', JSON.stringify(finalPlan));
  };



  const handleCompleteWorkout = async (
    levelSelected: string,
    summary: string,
    completedExercises: string[],
    userNotes: string,
    nutrition: DailyPlan['nutrition'],
    exerciseLogs?: ExerciseLog[]
  ) => {
    const now = new Date();
    const todayDateStr = getTodayString();

    const exercisesSummary = completedExercises.length > 0
      ? completedExercises.join(', ')
      : "Không có bài tập";

    // Generate YYYY-MM-DD key using local time
    const nowLocal = new Date();
    const todayKey = `${nowLocal.getFullYear()}-${String(nowLocal.getMonth() + 1).padStart(2, '0')}-${String(nowLocal.getDate()).padStart(2, '0')}`;

    const isSameDay = (ts: number) => {
      const d = new Date(ts);
      const dKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return dKey === todayKey;
    };

    // Find existing entry for today (might have nutrition saved separately)
    const existingTodayItems = workoutHistory.filter(h => h.date === todayDateStr || isSameDay(h.timestamp));
    const otherItems = workoutHistory.filter(h => h.date !== todayDateStr && !isSameDay(h.timestamp));

    // Merge: keep nutrition from existing entry if it was saved separately
    const existingToday = existingTodayItems.length > 0 ? existingTodayItems[0] : null;
    const mergedNutrition = existingToday?.nutrition || undefined;

    const newItem: WorkoutHistoryItem = {
      date: todayDateStr,
      timestamp: now.getTime(),
      levelSelected,
      summary,
      completedExercises,
      completedSchedule: getCompletedScheduleText(plan?.workoutProgress?.scheduleState),
      userNotes: userNotes || "",
      exercisesSummary,
      exerciseLogs: exerciseLogs || undefined,
      nutrition: mergedNutrition, // Keep existing nutrition if saved separately
      weight: userData.weight
    };

    let itemToSave = newItem;

    if (existingToday) {
      const bestExistingCount = existingToday.completedExercises ? existingToday.completedExercises.length : 0;
      const newCount = newItem.completedExercises ? newItem.completedExercises.length : 0;

      if (bestExistingCount > newCount) {
        // Keep existing workout but merge
        itemToSave = { ...existingToday, nutrition: mergedNutrition };
      }
    }

    const updatedHistory = [itemToSave, ...otherItems];
    setWorkoutHistory(updatedHistory);

    // Save to localStorage
    localStorage.setItem('gym_history', JSON.stringify(updatedHistory));

    // Mark workout as completed (not generated), keep nutrition if it exists
    if (plan) {
      const updatedPlan = { ...plan };
      updatedPlan.workout = { ...updatedPlan.workout, isGenerated: false };
      updatedPlan.workoutProgress = undefined;

      // If BOTH parts are now non-generated, fully clear
      const bothBlank = !updatedPlan.workout?.isGenerated && !updatedPlan.nutrition?.isGenerated;
      if (bothBlank) {
        setPlan(null);
        localStorage.removeItem('daily_plan_cache');
        localStorage.removeItem('workout_progress');
      } else {
        setPlan(updatedPlan);
        localStorage.setItem('daily_plan_cache', JSON.stringify(updatedPlan));
        localStorage.removeItem('workout_progress');
      }
    }
    setToastMessage(`Đã lưu buổi tập: ${completedExercises.length} bài tập hoàn thành!`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // === COMPLETE NUTRITION: Save nutrition separately, merge with existing workout if any ===
  const handleCompleteNutrition = async (nutrition: DailyPlan['nutrition']) => {
    const now = new Date();
    const todayDateStr = getTodayString();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const isSameDay = (ts: number) => {
      const d = new Date(ts);
      const dKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return dKey === todayKey;
    };

    // Find existing entry for today (might have workout saved separately)
    const existingTodayItems = workoutHistory.filter(h => h.date === todayDateStr || isSameDay(h.timestamp));
    const otherItems = workoutHistory.filter(h => h.date !== todayDateStr && !isSameDay(h.timestamp));
    const existingToday = existingTodayItems.length > 0 ? existingTodayItems[0] : null;

    let itemToSave: WorkoutHistoryItem;

    if (existingToday) {
      // Merge nutrition into existing workout entry
      itemToSave = {
        ...existingToday,
        nutrition,
        weight: userData.weight,
        timestamp: Math.max(existingToday.timestamp, now.getTime()), // Keep latest timestamp
        completedSchedule: existingToday.completedSchedule || getCompletedScheduleText(plan?.workoutProgress?.scheduleState)
      };
    } else {
      // Create new entry with only nutrition
      itemToSave = {
        date: todayDateStr,
        timestamp: now.getTime(),
        levelSelected: 'Chỉ dinh dưỡng',
        summary: 'Chỉ lưu thực đơn dinh dưỡng',
        completedExercises: [],
        exercisesSummary: 'Không có bài tập',
        nutrition,
        weight: userData.weight,
        completedSchedule: getCompletedScheduleText(plan?.workoutProgress?.scheduleState)
      };
    }

    const updatedHistory = [itemToSave, ...otherItems];
    setWorkoutHistory(updatedHistory);

    // Save to localStorage
    localStorage.setItem('gym_history', JSON.stringify(updatedHistory));

    // Reset nutrition part of the plan, keep workout if it exists
    if (plan) {
      const updatedPlan = { ...plan };
      updatedPlan.nutrition = { ...updatedPlan.nutrition, isGenerated: false };
      setPlan(updatedPlan);
      localStorage.setItem('daily_plan_cache', JSON.stringify(updatedPlan));
    }

    setViewMode('nutrition');
    setToastMessage(`Đã lưu thực đơn dinh dưỡng: ${nutrition.totalCalories} kcal, ${nutrition.totalProtein}g protein!`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteHistoryItem = (timestamp: number) => {
    // Optimistic Update
    const updatedHistory = workoutHistory.filter(item => item.timestamp !== timestamp);
    setWorkoutHistory(updatedHistory);
    
    // Save to localStorage
    localStorage.setItem('gym_history', JSON.stringify(updatedHistory));
  };

  // Refresh workout history from localStorage
  const handleRefreshHistory = async () => {
    setIsRefreshing(true);
    try {
      const savedHistoryStr = localStorage.getItem('gym_history');
      if (savedHistoryStr) {
        const loadedHistory: WorkoutHistoryItem[] = JSON.parse(savedHistoryStr);
        
        // Deduplicate by date (keep the one with most exercises)
        const uniqueHistoryMap = new Map<string, WorkoutHistoryItem>();
        loadedHistory.forEach(item => {
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

    // Sync to Supabase (debounced to avoid spamming on rapid toggles)
    if (session?.user) {
      debouncedSavePlan(session.user.id, updatedPlan);
    }
  };

  const handleToggleSchedule = (id: string) => {
    if (!plan) return;
    const progress = plan.workoutProgress || { checkedState: {} };
    const scheduleState = progress.scheduleState || {};
    const newState = { ...scheduleState, [id]: !scheduleState[id] };

    const updatedPlan = {
      ...plan,
      workoutProgress: {
        ...progress,
        scheduleState: newState
      }
    };

    // Optimistic UI update
    setPlan(updatedPlan);

    // Save to local storage for offline fallback matching PlanDisplay's approach
    const progressData = {
      planDate: updatedPlan.date,
      checkedState: progress.checkedState,
      scheduleState: newState,
      userNote: progress.userNote || '',
      exerciseLogs: progress.exerciseLogs || {},
      lastUpdated: Date.now()
    };
    localStorage.setItem('workout_progress', JSON.stringify(progressData));

    // Save to Supabase (debounced save)
    if (session?.user) {
      debouncedSavePlan(session.user.id, updatedPlan);
    }

    // === Update workoutHistory as well to reflect schedule completion ===
    const now = new Date();
    const todayDateStr = getTodayString();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const isSameDay = (ts: number) => {
      const d = new Date(ts);
      const dKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return dKey === todayKey;
    };

    const existingTodayItems = workoutHistory.filter(h => h.date === todayDateStr || isSameDay(h.timestamp));
    const otherItems = workoutHistory.filter(h => h.date !== todayDateStr && !isSameDay(h.timestamp));
    const existingToday = existingTodayItems.length > 0 ? existingTodayItems[0] : null;

    let itemToSave: WorkoutHistoryItem;

    const completedSchedule = getCompletedScheduleText(newState);

    if (existingToday) {
      itemToSave = {
        ...existingToday,
        completedSchedule,
        timestamp: Math.max(existingToday.timestamp, now.getTime())
      };
    } else {
      itemToSave = {
        date: todayDateStr,
        timestamp: now.getTime(),
        levelSelected: 'Chỉ lịch trình',
        summary: 'Chỉ lưu lịch trình',
        completedExercises: [],
        exercisesSummary: 'Không có bài tập',
        completedSchedule,
        weight: userData.weight
      };
    }

    const updatedHistory = [itemToSave, ...otherItems];
    setWorkoutHistory(updatedHistory);

    if (session?.user) {
      const saveScheduleToSupabase = async () => {
        const { data: existingData } = await supabase.from('daily_schedules_logs')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('date', todayKey)
          .maybeSingle();

        if (existingData) {
          await supabase.from('daily_schedules_logs').update({
            timestamp: now.getTime(),
            completed_schedule: completedSchedule
          }).eq('id', existingData.id);
        } else {
          await supabase.from('daily_schedules_logs').insert({
            user_id: session.user.id,
            date: todayKey,
            timestamp: now.getTime(),
            completed_schedule: completedSchedule
          });
        }
      };
      saveScheduleToSupabase().catch(console.error);
    }
  };

  return (
    <div className="relative min-h-screen font-sans selection:bg-cyan-500/30 selection:text-cyan-100">

      {/* Loading Animation Overlay */}
      {(loading || isAuthChecking) && <LoadingAnimation />}

      {!isAuthChecking && !session ? (
        <AuthPage />
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

              <div className="flex items-center justify-center gap-4">
                <button
                  id="tour-settings"
                  onClick={() => setViewMode('settings')}
                  className="text-lg text-gray-300 font-light hover:text-white transition-colors duration-200 cursor-pointer group flex items-center gap-2"
                >
                  <span className="text-cyan-400 font-semibold group-hover:text-cyan-300">{session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || 'Member'}</span>
                  <Settings className="w-4 h-4 text-gray-400 group-hover:text-cyan-400 transition-colors" />
                </button>

                <div className="h-4 w-px bg-gray-700"></div>

                <button
                  id="tour-guide"
                  onClick={() => setViewMode('history')}
                  className="text-lg text-gray-300 font-light hover:text-white transition-colors duration-200 cursor-pointer group flex items-center gap-2"
                >
                  <span className="group-hover:text-cyan-300">Lịch sử</span>
                  <History className="w-4 h-4 text-gray-400 group-hover:text-cyan-400 transition-colors" />
                </button>
              </div>

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
              <div id="tour-tabs" className="sticky top-4 z-50 mb-8 max-w-2xl mx-auto">
                <PlanTabs
                  activeTab={viewMode}
                  onTabChange={(tab) => setViewMode(tab)}
                  className="shadow-2xl"
                />
              </div>

              {/* Render content based on View Mode + Generation Status */}
              {viewMode === 'settings' && session?.user ? (
                <AccountSettings
                  user={session.user}
                  onLogout={() => supabase.auth.signOut()}
                />
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

                    onCompleteNutrition={handleCompleteNutrition}
                    userId={userData.id}
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

              {viewMode === 'schedule' && (
                <ScheduleView
                  scheduleState={plan?.workoutProgress?.scheduleState}
                  onToggleSchedule={handleToggleSchedule}
                />
              )}




              {/* Onboarding Tour */}
              {isTourOpen && (
                <OnboardingTour
                  steps={tourSteps}
                  isOpen={isTourOpen}
                  onComplete={handleTourComplete}
                  onSkip={handleTourComplete}
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
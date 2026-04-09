import { useState, useCallback, useEffect } from 'react';
import { WorkoutHistoryItem, UserInput, UserStats, DailyPlan, ExerciseLog } from '../types';
import { syncWorkoutHistoryToSupabase } from '../services/supabasePlanSync';

// Helper: get today string in Vietnamese format (matches original App.tsx)
const getTodayString = (): string => {
  const now = new Date();
  const days = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  return `${days[now.getDay()]}, ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
};

// Calculate Streak based on Workout History (Weekly >= 4 sessions)
const calculateWeeklyStreak = (history: WorkoutHistoryItem[]): number => {
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

  for (let i = 0; i < 100; i++) {
    const weekKey = checkDate.toISOString().split('T')[0];
    const count = weeks[weekKey] || 0;

    if (count >= 4) {
      streak++;
    } else {
      if (checkDate.getTime() === currentMonday.getTime()) {
        // Current week incomplete - continue checking previous
      } else {
        break;
      }
    }
    checkDate.setDate(checkDate.getDate() - 7);
  }
  return streak;
};

export interface UseWorkoutHistoryReturn {
  workoutHistory: WorkoutHistoryItem[];
  setWorkoutHistory: React.Dispatch<React.SetStateAction<WorkoutHistoryItem[]>>;
  handleCompleteWorkout: (
    levelSelected: string,
    summary: string,
    completedExercises: string[],
    userNotes: string,
    nutrition: DailyPlan['nutrition'],
    exerciseLogs?: ExerciseLog[]
  ) => void;
  handleCompleteNutrition: (nutrition: DailyPlan['nutrition']) => void;
  handleDeleteHistoryItem: (timestamp: number) => void;
  handleRefreshHistory: () => Promise<void>;
  handleSickDay: () => void;
  isRefreshing: boolean;
  calculateStreak: () => number;
}

/**
 * Hook for managing workout history CRUD operations.
 * All data persisted in localStorage key 'gym_history'.
 */
export function useWorkoutHistory(
  userData: UserInput,
  userStats: UserStats,
  setUserStats: React.Dispatch<React.SetStateAction<UserStats>>,
  plan: DailyPlan | null,
  setPlan: React.Dispatch<React.SetStateAction<DailyPlan | null>>,
  showToast: (msg: string) => void
): UseWorkoutHistoryReturn {
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutHistoryItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const savedHistoryStr = localStorage.getItem('gym_history');
    if (savedHistoryStr) {
      try {
        const loadedHistory: WorkoutHistoryItem[] = JSON.parse(savedHistoryStr);
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
      } catch (e) {
        console.error("Failed to load workout history", e);
      }
    }
  }, []);

  const calculateStreak = useCallback(() => {
    return calculateWeeklyStreak(workoutHistory);
  }, [workoutHistory]);

  const handleCompleteWorkout = useCallback((
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

    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const isSameDay = (ts: number) => {
      const d = new Date(ts);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` === todayKey;
    };

    const existingTodayItems = workoutHistory.filter(h => h.date === todayDateStr || isSameDay(h.timestamp));
    const otherItems = workoutHistory.filter(h => h.date !== todayDateStr && !isSameDay(h.timestamp));
    const existingToday = existingTodayItems.length > 0 ? existingTodayItems[0] : null;
    const mergedNutrition = existingToday?.nutrition || undefined;

    const newItem: WorkoutHistoryItem = {
      date: todayDateStr,
      timestamp: now.getTime(),
      levelSelected,
      summary,
      completedExercises,
      userNotes: userNotes || "",
      exercisesSummary,
      exerciseLogs: exerciseLogs || undefined,
      nutrition: mergedNutrition,
      weight: userData.weight
    };

    let itemToSave = newItem;
    if (existingToday) {
      const bestExistingCount = existingToday.completedExercises ? existingToday.completedExercises.length : 0;
      const newCount = newItem.completedExercises ? newItem.completedExercises.length : 0;
      if (bestExistingCount > newCount) {
        itemToSave = { ...existingToday, nutrition: mergedNutrition };
      }
    }

    const updatedHistory = [itemToSave, ...otherItems];
    setWorkoutHistory(updatedHistory);
    localStorage.setItem('gym_history', JSON.stringify(updatedHistory));

    // Mark workout as completed in plan
    if (plan) {
      const updatedPlan = { ...plan };
      updatedPlan.workout = { ...updatedPlan.workout, isGenerated: false };
      updatedPlan.workoutProgress = undefined;

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

    showToast(`Đã lưu buổi tập: ${completedExercises.length} bài tập hoàn thành!`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [workoutHistory, userData.weight, plan, setPlan, showToast]);

  const handleCompleteNutrition = useCallback((nutrition: DailyPlan['nutrition']) => {
    const now = new Date();
    const todayDateStr = getTodayString();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const isSameDay = (ts: number) => {
      const d = new Date(ts);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` === todayKey;
    };

    const existingTodayItems = workoutHistory.filter(h => h.date === todayDateStr || isSameDay(h.timestamp));
    const otherItems = workoutHistory.filter(h => h.date !== todayDateStr && !isSameDay(h.timestamp));
    const existingToday = existingTodayItems.length > 0 ? existingTodayItems[0] : null;

    let itemToSave: WorkoutHistoryItem;
    if (existingToday) {
      itemToSave = {
        ...existingToday,
        nutrition,
        weight: userData.weight,
        timestamp: Math.max(existingToday.timestamp, now.getTime()),
      };
    } else {
      itemToSave = {
        date: todayDateStr,
        timestamp: now.getTime(),
        levelSelected: 'Chỉ dinh dưỡng',
        summary: 'Chỉ lưu thực đơn dinh dưỡng',
        completedExercises: [],
        exercisesSummary: 'Không có bài tập',
        nutrition,
        weight: userData.weight
      };
    }

    const updatedHistory = [itemToSave, ...otherItems];
    setWorkoutHistory(updatedHistory);
    localStorage.setItem('gym_history', JSON.stringify(updatedHistory));

    if (plan) {
      const updatedPlan = { ...plan };
      updatedPlan.nutrition = { ...updatedPlan.nutrition, isGenerated: false };
      setPlan(updatedPlan);
      localStorage.setItem('daily_plan_cache', JSON.stringify(updatedPlan));
    }

    showToast(`Đã lưu thực đơn dinh dưỡng: ${nutrition.totalCalories} kcal, ${nutrition.totalProtein}g protein!`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [workoutHistory, userData.weight, plan, setPlan, showToast]);

  const handleDeleteHistoryItem = useCallback((timestamp: number) => {
    const updatedHistory = workoutHistory.filter(item => item.timestamp !== timestamp);
    setWorkoutHistory(updatedHistory);
    localStorage.setItem('gym_history', JSON.stringify(updatedHistory));
  }, [workoutHistory]);

  const handleRefreshHistory = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const savedHistoryStr = localStorage.getItem('gym_history');
      if (savedHistoryStr) {
        const loadedHistory: WorkoutHistoryItem[] = JSON.parse(savedHistoryStr);
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
        showToast("Đã làm mới lịch sử thành công!");
      }
    } catch (err) {
      console.error("Refresh error:", err);
      showToast("Có lỗi xảy ra khi làm mới");
    } finally {
      setIsRefreshing(false);
    }
  }, [showToast]);

  const handleSickDay = useCallback(() => {
    const todayDate = new Date().toDateString();
    const updatedStats = { ...userStats, lastLoginDate: todayDate };
    setUserStats(updatedStats);
    localStorage.setItem('user_stats', JSON.stringify(updatedStats));

    const todayStr = getTodayString();
    const sickDayEntry: WorkoutHistoryItem = {
      date: todayStr,
      timestamp: Date.now(),
      levelSelected: 'Ốm/Bệnh',
      summary: 'Ngày nghỉ do ốm hoặc bệnh - Streak được giữ nguyên',
      completedExercises: [],
      userNotes: 'Nghỉ ngơi để hồi phục sức khỏe',
      exercisesSummary: 'Không tập (Ngày ốm)',
      weight: userData.weight
    };

    const alreadySickToday = workoutHistory.some(h => h.date === todayStr && h.levelSelected === 'Ốm/Bệnh');
    if (!alreadySickToday) {
      const newHistory = [sickDayEntry, ...workoutHistory];
      setWorkoutHistory(newHistory);
      localStorage.setItem('gym_history', JSON.stringify(newHistory));
    }

    showToast(`Đã đánh dấu ngày ốm. Chuỗi ${userStats.streak} ngày của bạn được giữ nguyên! Hãy nghỉ ngơi và hồi phục nhé.`);
  }, [workoutHistory, userData.weight, userStats, setUserStats, showToast]);

  return {
    workoutHistory,
    setWorkoutHistory,
    handleCompleteWorkout,
    handleCompleteNutrition,
    handleDeleteHistoryItem,
    handleRefreshHistory,
    handleSickDay,
    isRefreshing,
    calculateStreak,
  };
}

export function useSupabaseWorkoutHistorySync(userId?: string, workoutHistory?: WorkoutHistoryItem[]) {
  useEffect(() => {
    if (!userId || !workoutHistory) return;
    syncWorkoutHistoryToSupabase(userId, workoutHistory);
  }, [userId, workoutHistory]);
}

export { getTodayString, calculateWeeklyStreak };

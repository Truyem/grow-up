import { useEffect, useCallback } from 'react';
import { DailyPlan, WorkoutHistoryItem, UserInput, Exercise } from '../types';
import { getTodayString } from './useWorkoutHistory';

/**
 * Hook for auto-saving plan when day changes (midnight detection).
 * Runs a 30-second interval to check if the cached plan is from a previous day.
 */
export function useAutoSave(
  workoutHistory: WorkoutHistoryItem[],
  setWorkoutHistory: React.Dispatch<React.SetStateAction<WorkoutHistoryItem[]>>,
  userData: UserInput,
  setPlan: React.Dispatch<React.SetStateAction<DailyPlan | null>>,
  setViewMode: (mode: 'workout' | 'nutrition' | 'history' | 'settings') => void,
  setUserData: React.Dispatch<React.SetStateAction<UserInput>>,
  showToast: (msg: string) => void
) {
  const performAutoSave = useCallback((cachedPlan: DailyPlan) => {
    console.log("[AutoSave] Triggered for stale plan from:", cachedPlan.date);

    // Clear consumed food for the new day
    setUserData(prev => ({ ...prev, consumedFood: [] }));

    let currentHistory = [...workoutHistory];
    if (currentHistory.length === 0) {
      const savedHistoryStr = localStorage.getItem('gym_history');
      if (savedHistoryStr) {
        try {
          currentHistory = JSON.parse(savedHistoryStr) as WorkoutHistoryItem[];
        } catch (e) {
          console.error("[AutoSave] Failed to parse history", e);
        }
      }
    }
    const alreadyExists = currentHistory.some(h => h.date === cachedPlan.date);

    if (!alreadyExists) {
      let completedList: string[] = [];
      let userNoteFromProgress = "";
      let savedTimestamp = Date.now();

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
          }
        } catch (e) {
          console.error("[AutoSave] Failed to parse progress", e);
        }
      }

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
        nutrition: cachedPlan.nutrition,
        weight: userData.weight
      };

      const newHistory = [newItem, ...currentHistory];
      setWorkoutHistory(newHistory);
      localStorage.setItem('gym_history', JSON.stringify(newHistory));

      showToast(`Đã tự động lưu buổi tập ngày ${cachedPlan.date} (${completedList.length} bài tập). Dữ liệu đồ ăn đã được reset.`);
    }

    // Clean up old cache
    localStorage.removeItem('daily_plan_cache');
    localStorage.removeItem('workout_progress');

    setPlan(null);
    setViewMode('workout');
  }, [workoutHistory, userData.weight, setWorkoutHistory, setUserData, setPlan, setViewMode, showToast]);

  // Load cached plan on mount
  useEffect(() => {
    const cachedPlanStr = localStorage.getItem('daily_plan_cache');
    if (cachedPlanStr) {
      try {
        const cachedPlan = JSON.parse(cachedPlanStr) as DailyPlan;
        const todayStr = getTodayString();

        if (cachedPlan.date !== todayStr) {
          performAutoSave(cachedPlan);
        } else {
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

  // Midnight detection: check every 30s
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

    const interval = setInterval(checkMidnight, 30000);
    return () => clearInterval(interval);
  }, [performAutoSave]);
}

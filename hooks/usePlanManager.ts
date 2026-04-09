import { useState, useCallback } from 'react';
import type { WorkoutHistoryItem } from '../types';
import { DailyPlan, UserInput } from '../types';
import { generateDailyPlan, getBasicNutritionPlan } from '../services/geminiService';
import { debouncedSavePlan } from '../services/supabasePlanSync';
import { enrichWorkoutWithWarmupCooldown } from '../services/warmupCooldownService';

type ViewMode = 'workout' | 'nutrition' | 'history' | 'settings';

export interface UsePlanManagerReturn {
  plan: DailyPlan | null;
  setPlan: React.Dispatch<React.SetStateAction<DailyPlan | null>>;
  loading: boolean;
  streamingText: string;
  isStreaming: boolean;
  viewMode: ViewMode;
  setViewMode: React.Dispatch<React.SetStateAction<ViewMode>>;
  handleGenerate: (type: ViewMode, currentHistory: WorkoutHistoryItem[]) => Promise<void>;
  handleReset: (type: 'workout' | 'nutrition') => void;
  handleStartTracking: () => void;
  handleUpdatePlan: (updatedPlan: DailyPlan) => void;
}

/**
 * Hook for managing the daily plan lifecycle:
 * generation, reset, tracking start, and plan updates.
 */
export function usePlanManager(
  userData: UserInput,
  session: any
): UsePlanManagerReturn {
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<ViewMode>('workout');

  const handleGenerate = useCallback(async (type: ViewMode, currentHistory: WorkoutHistoryItem[]) => {
    if (type === 'history') {
      setViewMode('history');
      return;
    }
    if (type === 'settings') {
      setViewMode('settings');
      return;
    }

    setLoading(true);
    setIsStreaming(true);
    setStreamingText("");

    const generationType = type as 'workout' | 'nutrition';
    let generatedPartial: DailyPlan;
    try {
      generatedPartial = await generateDailyPlan(userData, currentHistory, session?.user?.id, generationType, (chunkText) => {
        setStreamingText(chunkText);
      });
    } catch (error) {
      console.error('[PlanManager] generateDailyPlan failed:', error);
      setLoading(false);
      setIsStreaming(false);
      return;
    }

    let finalPlan: DailyPlan;
    setPlan(currentPlan => {
      if (!currentPlan) {
        finalPlan = generatedPartial;
      } else {
        finalPlan = { ...currentPlan };
        if (generationType === 'workout') {
          finalPlan.workout = generatedPartial.workout;
        }
        if (generationType === 'nutrition') {
          finalPlan.nutrition = generatedPartial.nutrition;
        }
        finalPlan.date = generatedPartial.date || currentPlan.date;
      }

      if (generationType === 'workout') {
        finalPlan = enrichWorkoutWithWarmupCooldown(finalPlan, userData);
      }

      localStorage.setItem('daily_plan_cache', JSON.stringify(finalPlan));
      localStorage.removeItem('workout_progress');
      return finalPlan;
    });

    setViewMode(generationType);
    setLoading(false);
    setIsStreaming(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [session?.user?.id, userData]);

  const handleReset = useCallback((type: 'workout' | 'nutrition') => {
    setPlan(currentPlan => {
      if (!currentPlan) {
        localStorage.removeItem('daily_plan_cache');
        localStorage.removeItem('workout_progress');
        return null;
      }

      const updatedPlan = { ...currentPlan };

      if (type === 'workout') {
        updatedPlan.workout = {
          summary: '', detail: { levelName: '', description: '', warmup: [], morning: [], evening: [], cooldown: [] },
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

      const bothBlank = !updatedPlan.workout?.isGenerated && !updatedPlan.nutrition?.isGenerated;
      if (bothBlank) {
        localStorage.removeItem('daily_plan_cache');
        return null;
      } else {
        localStorage.setItem('daily_plan_cache', JSON.stringify(updatedPlan));
        return updatedPlan;
      }
    });
  }, []);

  const handleStartTracking = useCallback(() => {
    const basicPlan = getBasicNutritionPlan(userData);

    setPlan(currentPlan => {
      let finalPlan = basicPlan;
      if (currentPlan) {
        finalPlan = { ...currentPlan, nutrition: basicPlan.nutrition };
      }
      localStorage.setItem('daily_plan_cache', JSON.stringify(finalPlan));
      return finalPlan;
    });

    setViewMode('nutrition');
  }, [userData]);

  const handleUpdatePlan = useCallback((updatedPlan: DailyPlan) => {
    setPlan(updatedPlan);
    localStorage.setItem('daily_plan_cache', JSON.stringify(updatedPlan));

    if (session?.user) {
      debouncedSavePlan(session.user.id, updatedPlan);
    }
  }, [session]);

  return {
    plan,
    setPlan,
    loading,
    streamingText,
    isStreaming,
    viewMode,
    setViewMode,
    handleGenerate,
    handleReset,
    handleStartTracking,
    handleUpdatePlan,
  };
}

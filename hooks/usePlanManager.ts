import { useState, useCallback, useEffect } from 'react';
import { DailyPlan, ExerciseLog, UserInput, WorkoutHistoryItem } from '../types';
import { generateDailyPlan, getBasicNutritionPlan } from '../services/geminiService';
import { debouncedSavePlan, deletePlanByDate, loadPlanFromSupabase, savePlanToSupabase } from '../services/supabasePlanSync';
import { enrichWorkoutWithWarmupCooldown } from '../services/warmupCooldownService';
import { canPerformOnlineAction } from '../services/onlineGuard';
import { useOnlineStatus } from './useOnlineStatus';

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
  handleRefreshPlan: () => Promise<void>;
}

/**
 * Hook for managing the daily plan lifecycle:
 * generation, reset, tracking start, and plan updates.
 */
export function usePlanManager(
  userData: UserInput,
  session: any,
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void
): UsePlanManagerReturn {
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<ViewMode>('workout');
  const userId = session?.user?.id as string | undefined;
  const online = useOnlineStatus();

  useEffect(() => {
    if (!userId) {
      setPlan(null);
      return;
    }
    if (!online) return;

    let isCancelled = false;
    (async () => {
      const { plan: cloudPlan, workoutProgress } = await loadPlanFromSupabase(userId);
      if (isCancelled) return;

      if (!cloudPlan) {
        setPlan(null);
        return;
      }

      setPlan({
        ...cloudPlan,
        workoutProgress: workoutProgress && typeof workoutProgress === 'object' && 'checkedState' in workoutProgress
          ? workoutProgress as { checkedState: Record<string, boolean>; userNote?: string; exerciseLogs?: Record<string, ExerciseLog> }
          : cloudPlan.workoutProgress,
      });
    })();

    return () => {
      isCancelled = true;
    };
  }, [userId, online]);

  const handleGenerate = useCallback(async (type: ViewMode, currentHistory: WorkoutHistoryItem[]) => {
    if (type === 'history') {
      setViewMode('history');
      return;
    }
    if (type === 'settings') {
      setViewMode('settings');
      return;
    }

    if (!userId) {
      showToast('Bạn cần đăng nhập để tạo kế hoạch.', 'error');
      return;
    }
    if (!canPerformOnlineAction('plan-generate', showToast)) return;

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

    let finalPlan: DailyPlan = generatedPartial;
    
    // Nếu có dữ liệu đã lưu (ví dụ userData.consumedFood), có thể xóa ở đây nếu cần.
    // Xoá hoàn toàn dữ liệu kế hoạch cũ bằng cách ghi đè trực tiếp bằng kế hoạch mới được sinh ra.

    if (generationType === 'workout') {
      finalPlan = enrichWorkoutWithWarmupCooldown(finalPlan, userData);
      finalPlan.workoutProgress = undefined;
    }

    setPlan(finalPlan);
    const saved = await savePlanToSupabase(userId, finalPlan, undefined);
    if (saved === false) {
      showToast('Không thể lưu kế hoạch lên máy chủ.', 'error');
      setLoading(false);
      setIsStreaming(false);
      return;
    }

    setViewMode(generationType);
    setLoading(false);
    setIsStreaming(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [plan, showToast, userData, userId]);

  const handleReset = useCallback((type: 'workout' | 'nutrition') => {
    if (!userId) {
      showToast('Bạn cần đăng nhập để reset kế hoạch.', 'error');
      return;
    }
    if (!canPerformOnlineAction('plan-reset', showToast)) return;

    if (!plan) {
      const dateKey = new Date().toISOString().split('T')[0];
      void deletePlanByDate(userId, dateKey);
      setPlan(null);
      return;
    }

    const updatedPlan = { ...plan };

    if (type === 'workout') {
      updatedPlan.workout = {
        summary: '', detail: { levelName: '', description: '', warmup: [], morning: [], evening: [], cooldown: [] },
        isGenerated: false
      };
      updatedPlan.workoutProgress = undefined;
    }

    if (type === 'nutrition') {
      updatedPlan.nutrition = {
        totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0,
        advice: '', isGenerated: false, meals: []
      };
    }

    const bothBlank = !updatedPlan.workout?.isGenerated && !updatedPlan.nutrition?.isGenerated;
    if (bothBlank) {
      const dateKey = new Date().toISOString().split('T')[0];
      void deletePlanByDate(userId, dateKey);
      setPlan(null);
    } else {
      setPlan(updatedPlan);
      void savePlanToSupabase(userId, updatedPlan, undefined);
    }
  }, [plan, showToast, userId]);

  const handleStartTracking = useCallback(() => {
    if (!userId) {
      showToast('Bạn cần đăng nhập để lưu kế hoạch.', 'error');
      return;
    }
    if (!canPerformOnlineAction('plan-start-tracking', showToast)) return;

    const basicPlan = getBasicNutritionPlan(userData);

    let finalPlan = basicPlan;
    if (plan) {
      finalPlan = { ...plan, nutrition: basicPlan.nutrition };
    }

    setPlan(finalPlan);
    void savePlanToSupabase(userId, finalPlan, undefined);

    setViewMode('nutrition');
  }, [plan, showToast, userData, userId]);

  const handleUpdatePlan = useCallback((updatedPlan: DailyPlan) => {
    if (!userId) {
      showToast('Bạn cần đăng nhập để cập nhật kế hoạch.', 'error');
      return;
    }
    if (!canPerformOnlineAction('plan-update', showToast)) return;

    setPlan(updatedPlan);

    debouncedSavePlan(userId, updatedPlan);
  }, [showToast, userId]);

  const handleRefreshPlan = useCallback(async () => {
    if (!userId || !online) return;
    setLoading(true);
    try {
      const { plan: cloudPlan, workoutProgress } = await loadPlanFromSupabase(userId);
      if (!cloudPlan) {
        setPlan(null);
      } else {
        setPlan({
          ...cloudPlan,
          workoutProgress: workoutProgress && typeof workoutProgress === 'object' && 'checkedState' in workoutProgress
            ? workoutProgress as { checkedState: Record<string, boolean>; userNote?: string; exerciseLogs?: Record<string, ExerciseLog> }
            : cloudPlan.workoutProgress,
        });
      }
    } catch (e) {
      console.error('[PlanManager] Refresh plan error:', e);
    } finally {
      setLoading(false);
    }
  }, [userId, online]);

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
    handleRefreshPlan,
  };
}

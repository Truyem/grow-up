import { useState, useCallback, useEffect } from 'react';
import { DailyPlan, ExerciseLog, UserInput, WorkoutHistoryItem } from '../types';
import { generateDailyPlan } from '../services/aiService';
import { debouncedSavePlan, deletePlanByDate, loadPlanFromSupabase, savePlanToSupabase } from '../services/supabasePlanSync';
import { enrichWorkoutWithWarmupCooldown } from '../services/warmupCooldownService';

type ViewMode = 'workout' | 'history' | 'settings';

export interface UsePlanManagerReturn {
  plan: DailyPlan | null;
  setPlan: React.Dispatch<React.SetStateAction<DailyPlan | null>>;
  loading: boolean;
  streamingText: string;
  isStreaming: boolean;
  viewMode: ViewMode;
  setViewMode: React.Dispatch<React.SetStateAction<ViewMode>>;
  handleGenerate: (type: ViewMode, currentHistory: WorkoutHistoryItem[]) => Promise<void>;
  handleReset: (type: 'workout') => void;
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
  userStats: any,
  session: any,
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void
): UsePlanManagerReturn {
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<ViewMode>('workout');
  const userId = session?.user?.id as string | undefined;

  useEffect(() => {
    if (!userId) {
      setPlan(null);
      return;
    }
  }, [userId]);

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
      console.log('[PlanManager] No userId, user not logged in');
      showToast?.('Bạn cần đăng nhập để tạo kế hoạch.', 'error');
      return;
    }

    console.log('[PlanManager] Starting generation for type:', type, 'userId:', userId);
    console.log('[PlanManager] userData:', userData);

    setLoading(true);
    setIsStreaming(true);
    setStreamingText("");

    let generatedPartial: DailyPlan;
    try {
      generatedPartial = await generateDailyPlan(userData, currentHistory, session?.user?.id, 'workout', (chunkText) => {
        setStreamingText(chunkText);
      });
    } catch (error) {
      console.error('[PlanManager] generateDailyPlan failed:', error);
      setLoading(false);
      setIsStreaming(false);
      showToast?.('Không thể tạo kế hoạch. Vui lòng thử lại.', 'error');
      return;
    }

    console.log('[PlanManager] Generated plan:', generatedPartial);
    console.log('[PlanManager] Workout detail:', generatedPartial.workout?.detail);

    let finalPlan: DailyPlan = generatedPartial;

    finalPlan.workoutProgress = undefined;

    setPlan(finalPlan);
    const saved = await savePlanToSupabase(userId, finalPlan, undefined);
    if (saved === false) {
      showToast?.('Không thể lưu kế hoạch.', 'error');
      setLoading(false);
      setIsStreaming(false);
      return;
    }

    setViewMode('workout');
    setLoading(false);
    setIsStreaming(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [plan, showToast, userData, userId]);

  const handleReset = useCallback((type: 'workout') => {
    if (!userId) {
      showToast?.('Bạn cần đăng nhập để reset kế hoạch.', 'error');
      return;
    }

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

    const bothBlank = !updatedPlan.workout?.isGenerated;
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
    setViewMode('workout');
  }, []);

  const handleUpdatePlan = useCallback((updatedPlan: DailyPlan) => {
    if (!userId) {
      showToast?.('Bạn cần đăng nhập để cập nhật kế hoạch.', 'error');
      return;
    }

    setPlan(updatedPlan);

    debouncedSavePlan(userId, updatedPlan);
  }, [showToast, userId]);

  const handleUpdatePlanImmediate = useCallback(async (updatedPlan: DailyPlan) => {
    if (!userId) return;

    setPlan(updatedPlan);

    await savePlanToSupabase(userId, updatedPlan, undefined);
  }, [userId]);

  const handleRefreshPlan = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const { plan: cloudPlan, workoutProgress } = await loadPlanFromSupabase(userId);
      console.log('Loaded plan from Supabase:', cloudPlan);
      if (!cloudPlan) {
        setPlan(null);
      } else {
        setPlan({
          ...cloudPlan,
          workoutProgress: workoutProgress && typeof workoutProgress === 'object' && 'checkedState' in workoutProgress
            ? workoutProgress as { checkedState: Record<string, boolean>; userNote?: string; exerciseLogs?: Record<string, ExerciseLog> }
            : cloudPlan?.workoutProgress,
        });
        showToast?.('Đã tải kế hoạch từ máy chủ', 'success');
      }
    } catch (e) {
      console.error('[PlanManager] Refresh plan error:', e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

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
    handleUpdatePlanImmediate,
    handleRefreshPlan,
  };
}

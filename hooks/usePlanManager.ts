import { useState, useCallback, useEffect } from 'react';
import { DailyPlan, ExerciseLog, UserInput, WorkoutHistoryItem } from '../types';
import { generateDailyPlan, getBasicNutritionPlan } from '../services/geminiService';
import { debouncedSavePlan, deletePlanByDate, loadPlanFromSupabase, savePlanToSupabase } from '../services/supabasePlanSync';
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

    if (type === 'workout') {
      if (!plan?.nutrition) {
        showToast?.('Vui lòng tạo Dinh dưỡng trước khi tạo Bài tập!', 'error');
        return;
      }
      
      const meals = plan.nutrition.meals || [];
      const mainMealsEaten = meals.some(m => 
        (m.name.includes('Sáng') || m.name.includes('Trưa') || m.name.includes('Tối')) && m.consumed
      );
      
      if (!mainMealsEaten) {
        showToast?.('Bạn phải hoàn thành (ăn) ít nhất 1 bữa chính (Sáng/Trưa/Tối) mới được tạo bài tập!', 'error');
        return;
      }
    }

    console.log('[PlanManager] Starting generation for type:', type, 'userId:', userId);
    console.log('[PlanManager] userData:', userData);

    setLoading(true);
    setIsStreaming(true);
    setStreamingText("");

    const generationType = type === 'workout' ? 'workout' : 'nutrition';
    let generatedPartial: DailyPlan;
    try {
      generatedPartial = await generateDailyPlan(userData, currentHistory, session?.user?.id, generationType, (chunkText) => {
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
    
    // Nếu có dữ liệu đã lưu (ví dụ userData.consumedFood), có thể xóa ở đây nếu cần.
    // Xoá hoàn toàn dữ liệu kế hoạch cũ bằng cách ghi đè trực tiếp bằng kế hoạch mới được sinh ra.

    if (generationType === 'workout') {
      finalPlan.workoutProgress = undefined;
    }

    setPlan(finalPlan);
    const saved = await savePlanToSupabase(userId, finalPlan, undefined);
    if (saved === false) {
      showToast?.('Không thể lưu kế hoạch.', 'error');
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
      showToast?.('Bạn cần đăng nhập để lưu kế hoạch.', 'error');
      return;
    }
    

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
      showToast?.('Bạn cần đăng nhập để cập nhật kế hoạch.', 'error');
      return;
    }

    setPlan(updatedPlan);

    debouncedSavePlan(userId, updatedPlan);
  }, [showToast, userId]);

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
    handleRefreshPlan,
  };
}

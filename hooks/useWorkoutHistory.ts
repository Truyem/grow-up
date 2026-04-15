import { useState, useCallback, useEffect } from 'react';
import { WorkoutHistoryItem, UserInput, UserStats, DailyPlan, ExerciseLog } from '../types';
import { deletePlanByDate, deleteWorkoutHistoryItemFromSupabase, loadWorkoutHistoryFromSupabase, savePlanToSupabase, syncUserStatsToSupabase, upsertWorkoutHistoryItemToSupabase, upsertSleepLogToWorkoutLogs } from '../services/supabasePlanSync';
import { canPerformOnlineAction } from '../services/onlineGuard';
import { useOnlineStatus } from './useOnlineStatus';
import { initializeUserLevel, saveUserLevel, addXP } from '../services/levelService';
import { XP_REWARDS, getRankFromLevel, getXPForNextLevel, MAX_LEVEL } from '../constants/rankConfig';

// Helper: get today string in Vietnamese format (matches original App.tsx)
const getTodayString = (): string => {
  const now = new Date();
  const days = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  return `${days[now.getDay()]}, ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
};

// Calculate Streak based on consecutive days
const calculateWeeklyStreak = (history: WorkoutHistoryItem[]): number => {
  if (!history || history.length === 0) return 0;

  const validRecords = history.filter(item => item.recordType !== 'sleep');
  if (validRecords.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const workoutDates = new Set<string>();
  validRecords.forEach(item => {
    const d = new Date(item.timestamp);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    workoutDates.add(dateStr);
  });

  let streak = 0;
  let checkDate = new Date(today);

  for (let i = 0; i < 365; i++) {
    const dateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
    
    if (workoutDates.has(dateStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      if (i === 0) {
        checkDate.setDate(checkDate.getDate() - 1);
        const yesterdayStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
        if (workoutDates.has(yesterdayStr)) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      } else {
        break;
      }
    }
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
  ) => Promise<void>;
  handleCompleteNutrition: (nutrition: DailyPlan['nutrition']) => Promise<void>;
  handleDeleteHistoryItem: (timestamp: number) => Promise<void>;
  handleRefreshHistory: () => Promise<void>;
  handleSickDay: () => Promise<void>;
  handleSaveSleep: (sleepStart: string, sleepEnd: string) => Promise<void>;
  isRefreshing: boolean;
  calculateStreak: () => number;
  onXPAdded?: (newLevel: import('../types').UserLevel) => void;
}

/**
 * Hook for managing workout history CRUD operations backed by Supabase.
 */
export function useWorkoutHistory(
  userData: UserInput,
  userStats: UserStats,
  setUserStats: React.Dispatch<React.SetStateAction<UserStats>>,
  plan: DailyPlan | null,
  setPlan: React.Dispatch<React.SetStateAction<DailyPlan | null>>,
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void,
  userId?: string,
  onXPAdded?: (newLevel: import('../types').UserLevel) => void
): UseWorkoutHistoryReturn {
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutHistoryItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const online = useOnlineStatus();

  useEffect(() => {
    if (!userId || !online) {
      setWorkoutHistory([]);
      return;
    }

    let isCancelled = false;

    (async () => {
      const history = await loadWorkoutHistoryFromSupabase(userId);
      if (isCancelled) return;
      // Trong component UI, lịch sử hiển thị chỉ tính 'workout', 'nutrition' (không lấy 'sleep')
      setWorkoutHistory(history.filter(item => item.recordType !== 'sleep'));
    })();

    return () => {
      isCancelled = true;
    };
  }, [userId, online]);

  const calculateStreak = useCallback(() => {
    return calculateWeeklyStreak(workoutHistory);
  }, [workoutHistory]);

  const handleCompleteWorkout = useCallback(async (
    levelSelected: string,
    summary: string,
    completedExercises: string[],
    userNotes: string,
    exerciseLogs?: ExerciseLog[]
  ) => {
    if (!userId) {
      showToast('Bạn cần đăng nhập để lưu dữ liệu.', 'error');
      throw new Error('AUTH_REQUIRED');
    }
    if (!canPerformOnlineAction('history-complete-workout', showToast)) {
      throw new Error('OFFLINE_BLOCKED');
    }

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

    const newItem: WorkoutHistoryItem = {
      date: todayDateStr,
      timestamp: now.getTime(),
      levelSelected,
      summary,
      completedExercises,
      userNotes: userNotes || "",
      exercisesSummary,
      exerciseLogs: exerciseLogs || undefined,
      weight: userData.weight,
      recordType: 'workout'
    };

    let itemToSave = newItem;
    if (existingToday) {
      const bestExistingCount = existingToday.completedExercises ? existingToday.completedExercises.length : 0;
      const newCount = newItem.completedExercises ? newItem.completedExercises.length : 0;
      if (bestExistingCount > newCount) {
        itemToSave = { ...existingToday };
      }
    }

    const savedHistory = await upsertWorkoutHistoryItemToSupabase(userId, itemToSave);
    if (!savedHistory) {
      showToast('Đã có dữ liệu tập luyện trong ngày, vui lòng tạo lịch tập mới để lưu!', 'error');
      throw new Error('SAVE_FAILED_DUPLICATE');
    }

    const updatedHistory = [itemToSave, ...otherItems];
    setWorkoutHistory(updatedHistory);

    // Update streak and sync to Supabase immediately after saving
    const newStreak = calculateWeeklyStreak(updatedHistory);
    const todayDate = new Date().toDateString();
    const updatedStats = { ...userStats, streak: newStreak, lastLoginDate: todayDate };
    setUserStats(updatedStats);
    await syncUserStatsToSupabase(userId, updatedStats);

    // Mark workout as completed in plan
    if (plan) {
      const updatedPlan = { ...plan };
      updatedPlan.workout = { ...updatedPlan.workout, isGenerated: false };
      updatedPlan.workoutProgress = undefined;
      const dateKey = now.toISOString().split('T')[0];

      const bothBlank = !updatedPlan.workout?.isGenerated && !updatedPlan.nutrition?.isGenerated;
      if (bothBlank) {
        setPlan(null);
        await deletePlanByDate(userId, dateKey);
      } else {
        setPlan(updatedPlan);
        await savePlanToSupabase(userId, updatedPlan, undefined, dateKey);
      }
    }

    showToast(`Đã lưu buổi tập: ${completedExercises.length} bài tập hoàn thành!`);
    
    // --- ADD XP REWARD ---
    try {
      const todayKey = now.toISOString().split('T')[0];
      const todayXPHistory = workoutHistory.filter(h => {
        const hDate = h.date?.split('T')[0] || h.date;
        return hDate === todayKey && h.xpAdded === true;
      });
      if (todayXPHistory.length > 0) {
        console.log('XP already added today for workout, skipping');
      } else {
        let userLevel = await initializeUserLevel(userId);
        if (!userLevel) {
          console.warn('Failed to initialize user level');
        } else {
          const exerciseCount = completedExercises.length;
          const consistencyStreak = userStats.streak || 0;
          
          let intensity: 'low' | 'medium' | 'hard' = 'medium';
          if (levelSelected.toLowerCase().includes('hard') || levelSelected.toLowerCase().includes('advanced')) {
            intensity = 'hard';
          } else if (levelSelected.toLowerCase().includes('beginner')) {
            intensity = 'low';
          }

          let baseXP = XP_REWARDS.BASE_WORKOUT;
          const exerciseBonus = exerciseCount * XP_REWARDS.PER_EXERCISE;
          const difficultyBonus = XP_REWARDS.DIFFICULTY_BONUS[intensity] || 0;
          const consistencyBonus = consistencyStreak > 0 ? XP_REWARDS.CONSISTENCY_BONUS : 0;
          const totalXP = baseXP + exerciseBonus + difficultyBonus + consistencyBonus;

          let updated = { ...userLevel };
          let currentLevelXP = updated.currentLevelXP + totalXP;
          let leveledUp = false;
          let oldRank = updated.currentRankNumber;

          while (currentLevelXP >= getXPForNextLevel(updated.currentLevel) && updated.currentLevel < MAX_LEVEL) {
            currentLevelXP -= getXPForNextLevel(updated.currentLevel);
            updated.currentLevel += 1;
            updated.currentRankNumber = Math.floor((updated.currentLevel - 1) / 10) + 1;
            if (updated.currentRankNumber > oldRank) {
              updated.previousRankNumber = oldRank;
            }
            leveledUp = true;
          }

          updated.currentLevelXP = currentLevelXP;
          updated.nextLevelXP = getXPForNextLevel(updated.currentLevel);
          updated.totalXP += totalXP;
          updated.lifetimeXP += totalXP;
          updated.lastLevelUpDate = leveledUp ? new Date().toISOString() : updated.lastLevelUpDate;

          const saved = await saveUserLevel(userId, updated);
          if (saved) {
            if (onXPAdded) {
              onXPAdded(updated);
            }
            const xpNeeded = getXPForNextLevel(updated.currentLevel);
            if (leveledUp) {
              showToast(`🎉 Lên Level ${updated.currentLevel}! +${totalXP} XP`, 'success');
            } else {
              showToast(`+${totalXP} XP (${currentLevelXP}/${xpNeeded})`, 'info');
            }
          }
        }
      }
    } catch (error) {
      console.error('Error adding XP reward:', error);
      // Don't show error toast to user, silently fail
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [workoutHistory, userData.weight, plan, setPlan, showToast, userId, userStats, calculateStreak, setUserStats]);

  const handleDeleteHistoryItem = useCallback(async (timestamp: number) => {
    if (!userId) {
      showToast('Bạn cần đăng nhập để xoá dữ liệu.', 'error');
      return;
    }
    if (!canPerformOnlineAction('history-delete-item', showToast)) return;

    const updatedHistory = workoutHistory.filter(item => item.timestamp !== timestamp);
    const deleted = await deleteWorkoutHistoryItemFromSupabase(userId, timestamp);
    if (!deleted) {
      showToast('Không thể xoá lịch sử tập trên máy chủ.', 'error');
      return;
    }
    setWorkoutHistory(updatedHistory);
  }, [workoutHistory, showToast, userId]);

  const handleRefreshHistory = useCallback(async () => {
    if (!userId) {
      showToast('Bạn cần đăng nhập để làm mới lịch sử.', 'error');
      return;
    }
    if (!canPerformOnlineAction('history-refresh', showToast)) return;

    setIsRefreshing(true);
    try {
      const finalHistory = await loadWorkoutHistoryFromSupabase(userId);
      setWorkoutHistory(finalHistory.filter(item => item.recordType !== 'sleep'));
      showToast("Đã làm mới lịch sử thành công!");
    } catch (err) {
      console.error("Refresh error:", err);
      showToast("Có lỗi xảy ra khi làm mới", 'error');
    } finally {
      setIsRefreshing(false);
    }
  }, [showToast, userId]);

  const handleSickDay = useCallback(async () => {
    if (!userId) {
      showToast('Bạn cần đăng nhập để lưu ngày ốm.', 'error');
      return;
    }
    if (!canPerformOnlineAction('history-sick-day', showToast)) return;

    const todayDate = new Date().toDateString();
    const updatedStats = { ...userStats, lastLoginDate: todayDate };
    setUserStats(updatedStats);
    await syncUserStatsToSupabase(userId, updatedStats);

    const todayStr = getTodayString();
    const sickDayEntry: WorkoutHistoryItem = {
      recordType: 'workout',
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
      const saved = await upsertWorkoutHistoryItemToSupabase(userId, sickDayEntry);
      if (!saved) {
        showToast('Đã có dữ liệu tập luyện trong ngày, vui lòng tạo ngày mới để lưu!', 'error');
        return;
      }
      setWorkoutHistory(newHistory);
    }

    showToast(`Đã đánh dấu ngày ốm. Chuỗi ${userStats.streak} ngày của bạn được giữ nguyên! Hãy nghỉ ngơi và hồi phục nhé.`);
  }, [workoutHistory, userData.weight, userStats, setUserStats, showToast, userId]);

  const handleSaveSleep = useCallback(async (sleepStart: string, sleepEnd: string) => {
    if (!userId) return;
    if (!canPerformOnlineAction('history-save-sleep', showToast)) return;
    const saved = await upsertSleepLogToWorkoutLogs(userId, sleepStart, sleepEnd);
    if (!saved) {
      showToast('Không thể lưu giấc ngủ lên máy chủ.', 'error');
      return;
    }
    const refreshed = await loadWorkoutHistoryFromSupabase(userId);
    setWorkoutHistory(refreshed.filter(item => item.recordType !== 'sleep'));
  }, [showToast, userId]);

  return {
    workoutHistory,
    setWorkoutHistory,
    handleCompleteWorkout,
    handleDeleteHistoryItem,
    handleRefreshHistory,
    handleSickDay,
    handleSaveSleep,
    isRefreshing,
    calculateStreak,
  };
}

export { getTodayString, calculateWeeklyStreak };

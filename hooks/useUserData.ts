import { useState, useEffect, useRef } from 'react';
import { UserInput, UserStats, Expense, UserGoals, FatigueLevel, Intensity, HealthCondition, MuscleGroup, SleepRecoveryEntry } from '../types';
import { loadSleepRecoveryFromSupabase, syncSleepRecoveryToSupabase, syncUserGoalsToSupabase, syncUserSettingsToSupabase, syncUserStatsToSupabase, loadProfileSettingsFromSupabase } from '../services/supabasePlanSync';
import { useOnlineStatus } from './useOnlineStatus';

const DEFAULT_EQUIPMENT = [
  "Board chống đẩy",
  "BFR Bands",
  "Tạ đơn",
  "Dây kháng lực",
];

const INITIAL_USER_DATA: UserInput = {
  weight: 61,
  height: 165,
  age: 18,
  fatigue: FatigueLevel.Normal,
  healthCondition: HealthCondition.Good,
  soreMuscles: [MuscleGroup.None],
  selectedIntensity: Intensity.Medium,
  nutritionGoal: 'bulking',
  trainingMode: 'gym',
  useCreatine: false,
  equipment: DEFAULT_EQUIPMENT,
  consumedFood: [],
  hasSeenOnboarding: false,
};

const INITIAL_STATS: UserStats = {
  streak: 0,
  lastLoginDate: '',
};

export interface UseUserDataReturn {
  userData: UserInput;
  setUserData: React.Dispatch<React.SetStateAction<UserInput>>;
  userStats: UserStats;
  setUserStats: React.Dispatch<React.SetStateAction<UserStats>>;
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  userGoals: UserGoals | null;
  setUserGoals: React.Dispatch<React.SetStateAction<UserGoals | null>>;
  sleepRecovery: SleepRecoveryEntry[];
  setSleepRecovery: React.Dispatch<React.SetStateAction<SleepRecoveryEntry[]>>;
}

/**
 * Hook for managing all user-related data in memory.
 * Persistence is handled by Supabase sync hooks.
 */
export function useUserData(): UseUserDataReturn {
  const [userData, setUserData] = useState<UserInput>(INITIAL_USER_DATA);
  const [userStats, setUserStats] = useState<UserStats>(INITIAL_STATS);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [userGoals, setUserGoals] = useState<UserGoals | null>(null);
  const [sleepRecovery, setSleepRecovery] = useState<SleepRecoveryEntry[]>([]);

  return {
    userData,
    setUserData,
    userStats,
    setUserStats,
    expenses,
    setExpenses,
    userGoals,
    setUserGoals,
    sleepRecovery,
    setSleepRecovery,
  };
}

export function useSupabaseProfileSync(
  userId?: string,
  userData?: UserInput,
  setUserData?: React.Dispatch<React.SetStateAction<UserInput>>,
  userStats?: UserStats,
  setUserStats?: React.Dispatch<React.SetStateAction<UserStats>>,
  userGoals?: UserGoals | null,
  setUserGoals?: React.Dispatch<React.SetStateAction<UserGoals | null>>
) {
  const online = useOnlineStatus();
  const isHydratedRef = useRef(false);

  useEffect(() => {
    if (!userId || !online) return;

    isHydratedRef.current = false;

    let isCancelled = false;
    (async () => {
      const cloudSettings = await loadProfileSettingsFromSupabase(userId);
      if (isCancelled) return;

      if (cloudSettings) {
        if (cloudSettings.userData && setUserData) {
          setUserData((prev) => ({ ...prev, ...cloudSettings.userData }));
        }
        if (cloudSettings.userStats && setUserStats) {
          setUserStats(cloudSettings.userStats);
        }
        if (cloudSettings.userGoals && setUserGoals) {
          setUserGoals(cloudSettings.userGoals);
        }
      }
      isHydratedRef.current = true;
    })();

    return () => {
      isCancelled = true;
    };
  }, [userId, setUserData, setUserStats, setUserGoals, online]);

  useEffect(() => {
    if (!userId || !userData || !isHydratedRef.current) return;
    if (!online) return;
    syncUserSettingsToSupabase(userId, userData);
  }, [userId, userData, online]);

  useEffect(() => {
    if (!userId || !userStats || !isHydratedRef.current) return;
    if (!online) return;
    syncUserStatsToSupabase(userId, userStats);
  }, [userId, userStats, online]);

  useEffect(() => {
    if (!userId || !isHydratedRef.current) return;
    if (!online) return;
    syncUserGoalsToSupabase(userId, userGoals || null);
  }, [userId, userGoals, online]);
}

export function useSupabaseSleepRecoverySync(
  userId?: string,
  sleepRecovery?: SleepRecoveryEntry[],
  setSleepRecovery?: React.Dispatch<React.SetStateAction<SleepRecoveryEntry[]>>
) {
  const online = useOnlineStatus();
  const isHydratedRef = useRef(false);

  useEffect(() => {
    if (!userId || !online) return;

    isHydratedRef.current = false;

    let isCancelled = false;
    (async () => {
      const cloudSleep = await loadSleepRecoveryFromSupabase(userId);
      if (isCancelled) return;

      const sorted = [...cloudSleep].sort((a, b) => b.timestamp - a.timestamp);
      if (setSleepRecovery) {
        setSleepRecovery(sorted);
      }
      isHydratedRef.current = true;
    })();

    return () => {
      isCancelled = true;
    };
  }, [userId, setSleepRecovery, online]);

  useEffect(() => {
    if (!userId || !sleepRecovery) return;
    if (!isHydratedRef.current) return;
    if (!online) return;
    syncSleepRecoveryToSupabase(userId, sleepRecovery);
  }, [userId, sleepRecovery, online]);
}

export { INITIAL_USER_DATA, INITIAL_STATS, DEFAULT_EQUIPMENT };

import { useState, useEffect, useRef } from 'react';
import { UserInput, UserStats, Expense, UserGoals, FatigueLevel, Intensity, HealthCondition, MuscleGroup, SleepRecoveryEntry } from '../types';
import { loadSleepRecoveryFromSupabase, syncSleepRecoveryToSupabase, syncUserGoalsToSupabase, syncUserSettingsToSupabase, syncUserStatsToSupabase, loadProfileSettingsFromSupabase } from '../services/supabasePlanSync';

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
 * Hook for managing all user-related data with localStorage persistence.
 * Handles: userData, userStats, expenses, userGoals.
 */
export function useUserData(): UseUserDataReturn {
  const [userData, setUserData] = useState<UserInput>(INITIAL_USER_DATA);
  const [userStats, setUserStats] = useState<UserStats>(INITIAL_STATS);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [userGoals, setUserGoals] = useState<UserGoals | null>(null);
  const [sleepRecovery, setSleepRecovery] = useState<SleepRecoveryEntry[]>([]);

  // Load all user data from localStorage on mount
  useEffect(() => {
    // Load user settings
    const savedUserData = localStorage.getItem('user_settings');
    if (savedUserData) {
      try {
        const parsed = JSON.parse(savedUserData);
        setUserData(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error("Failed to load user settings", e);
      }
    }

    // Load stats
    const savedStats = localStorage.getItem('user_stats');
    if (savedStats) {
      try {
        setUserStats(JSON.parse(savedStats));
      } catch (e) {
        console.error("Failed to load stats", e);
      }
    }

    // Load expenses
    const savedExpenses = localStorage.getItem('user_expenses');
    if (savedExpenses) {
      try {
        setExpenses(JSON.parse(savedExpenses));
      } catch (e) {
        console.error("Failed to load expenses", e);
      }
    }

    // Load goals
    const savedGoals = localStorage.getItem('user_goals');
    if (savedGoals) {
      try {
        setUserGoals(JSON.parse(savedGoals));
      } catch (e) {
        console.error("Failed to load goals", e);
      }
    }

  }, []);

  // Persist userData
  useEffect(() => {
    localStorage.setItem('user_settings', JSON.stringify(userData));
  }, [userData]);

  // Persist expenses
  useEffect(() => {
    localStorage.setItem('user_expenses', JSON.stringify(expenses));
  }, [expenses]);

  // Persist userStats
  useEffect(() => {
    localStorage.setItem('user_stats', JSON.stringify(userStats));
  }, [userStats]);

  // Persist goals
  useEffect(() => {
    if (userGoals) {
      localStorage.setItem('user_goals', JSON.stringify(userGoals));
    }
  }, [userGoals]);

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
  const isHydratedRef = useRef(false);

  useEffect(() => {
    if (!userId) return;

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
  }, [userId, setUserData, setUserStats, setUserGoals]);

  useEffect(() => {
    if (!userId || !userData || !isHydratedRef.current) return;
    syncUserSettingsToSupabase(userId, userData);
  }, [userId, userData]);

  useEffect(() => {
    if (!userId || !userStats || !isHydratedRef.current) return;
    syncUserStatsToSupabase(userId, userStats);
  }, [userId, userStats]);

  useEffect(() => {
    if (!userId || !isHydratedRef.current) return;
    syncUserGoalsToSupabase(userId, userGoals || null);
  }, [userId, userGoals]);
}

export function useSupabaseSleepRecoverySync(
  userId?: string,
  sleepRecovery?: SleepRecoveryEntry[],
  setSleepRecovery?: React.Dispatch<React.SetStateAction<SleepRecoveryEntry[]>>
) {
  const isHydratedRef = useRef(false);

  useEffect(() => {
    if (!userId) return;

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
  }, [userId, setSleepRecovery]);

  useEffect(() => {
    if (!userId || !sleepRecovery) return;
    if (!isHydratedRef.current) return;
    syncSleepRecoveryToSupabase(userId, sleepRecovery);
  }, [userId, sleepRecovery]);
}

export { INITIAL_USER_DATA, INITIAL_STATS, DEFAULT_EQUIPMENT };

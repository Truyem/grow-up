import { useState, useEffect, useRef } from 'react';
import { UserInput, UserStats, UserGoals, FatigueLevel, Intensity, HealthCondition, MuscleGroup, AchievementBadge } from '../types';
import { syncUserGoalsToSupabase, syncUserSettingsToSupabase, syncUserStatsToSupabase, loadProfileSettingsFromSupabase, syncAchievementsToSupabase } from '../services/supabasePlanSync';
import { useOnlineStatus } from './useOnlineStatus';

const DEFAULT_EQUIPMENT = [
  'Board chống đẩy',
  'BFR Bands',
  'Tạ đơn',
  'Dây kháng lực',
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
  userGoals: UserGoals | null;
  setUserGoals: React.Dispatch<React.SetStateAction<UserGoals | null>>;
  achievements: AchievementBadge[];
  setAchievements: React.Dispatch<React.SetStateAction<AchievementBadge[]>>;
}

export function useUserData(): UseUserDataReturn {
  const [userData, setUserData] = useState<UserInput>(INITIAL_USER_DATA);
  const [userStats, setUserStats] = useState<UserStats>(INITIAL_STATS);
  const [userGoals, setUserGoals] = useState<UserGoals | null>(null);
  const [achievements, setAchievements] = useState<AchievementBadge[]>([]);

  return { userData, setUserData, userStats, setUserStats, userGoals, setUserGoals, achievements, setAchievements };
}

export function useSupabaseProfileSync(
  userId?: string,
  userData?: UserInput,
  setUserData?: React.Dispatch<React.SetStateAction<UserInput>>,
  userStats?: UserStats,
  setUserStats?: React.Dispatch<React.SetStateAction<UserStats>>,
  userGoals?: UserGoals | null,
  setUserGoals?: React.Dispatch<React.SetStateAction<UserGoals | null>>,
  achievements?: AchievementBadge[],
  setAchievements?: React.Dispatch<React.SetStateAction<AchievementBadge[]>>,
  hasInitialSynced: boolean = false
) {
  const online = useOnlineStatus();
  const isHydratedRef = useRef(false);

  useEffect(() => {
    if (!userId || !online) return;

    // Nếu App.tsx đang lo phần load lần đầu (hasInitialSynced = false) thì skip ở đây
    // để tránh race condition gọi load data 2 lần song song.
    if (!hasInitialSynced) return;

    isHydratedRef.current = false;
    let isCancelled = false;

    (async () => {
      try {
        const cloudSettings = await loadProfileSettingsFromSupabase(userId);
        if (isCancelled) return;

        if (cloudSettings) {
          if (cloudSettings.userData && setUserData) setUserData((prev) => ({ ...prev, ...cloudSettings.userData }));
          if (cloudSettings.userStats && setUserStats) setUserStats(cloudSettings.userStats);
          if (cloudSettings.userGoals && setUserGoals) setUserGoals(cloudSettings.userGoals);
          if (Array.isArray(cloudSettings.achievements) && setAchievements) setAchievements(cloudSettings.achievements);
        }
      } catch (err) {
        console.error('[ProfileSync] Error loading settings:', err);
      } finally {
        isHydratedRef.current = true;
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [userId, setUserData, setUserStats, setUserGoals, setAchievements, online, hasInitialSynced]);

  useEffect(() => {
    if (!userId || !userData || !isHydratedRef.current || !hasInitialSynced) return;
    if (!online) return;
    syncUserSettingsToSupabase(userId, userData);
  }, [userId, userData, online]);

  useEffect(() => {
    if (!userId || !userStats || !isHydratedRef.current || !hasInitialSynced) return;
    if (!online) return;
    syncUserStatsToSupabase(userId, userStats);
  }, [userId, userStats, online, hasInitialSynced]);

  useEffect(() => {
    if (!userId || !userGoals || !isHydratedRef.current || !hasInitialSynced) return;
    if (!online) return;
    syncUserGoalsToSupabase(userId, userGoals);
  }, [userId, userGoals, online, hasInitialSynced]);

  useEffect(() => {
    if (!userId || !achievements || !isHydratedRef.current || !hasInitialSynced) return;
    if (!online) return;
    syncAchievementsToSupabase(userId, achievements);
  }, [userId, achievements, online, hasInitialSynced]);
}

export { INITIAL_USER_DATA, INITIAL_STATS, DEFAULT_EQUIPMENT };

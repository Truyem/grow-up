import { useState, useEffect, useRef } from 'react';
import { UserInput, UserStats, UserGoals, FatigueLevel, Intensity, HealthCondition, MuscleGroup, AchievementBadge } from '../types';
import { syncUserGoalsToSupabase, syncUserSettingsToSupabase, syncUserStatsToSupabase, loadProfileSettingsFromSupabase, syncAchievementsToSupabase, loadAchievementsFromSupabase } from '../services/supabasePlanSync';
import { useOnlineStatus } from './useOnlineStatus';
import { RANK_CONFIG, MAX_LEVEL } from '../constants/rankConfig';

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
  dislikedFoods: [],
  hasSeenOnboarding: false,
};

const INITIAL_STATS: UserStats = {
  streak: 0,
  lastLoginDate: '',
};

const DEFAULT_ACHIEVEMENTS: AchievementBadge[] = [
  {
    id: 'first_workout',
    title: 'Khởi đầu',
    description: 'Hoàn thành buổi tập đầu tiên',
    unlocked: false,
    progressText: '0/1 buổi tập',
  },
  {
    id: 'streak_7',
    title: 'Kiên trì',
    description: 'Tập liên tục 7 ngày',
    unlocked: false,
    progressText: '0/7 ngày',
  },
  {
    id: 'streak_30',
    title: 'Thói quen',
    description: 'Tập liên tục 30 ngày',
    unlocked: false,
    progressText: '0/30 ngày',
  },
  {
    id: 'level_10',
    title: 'Người tập',
    description: 'Đạt Level 10',
    unlocked: false,
    progressText: 'Level 0/10',
  },
  {
    id: 'level_50',
    title: 'Võ sĩ',
    description: 'Đạt Level 50',
    unlocked: false,
    progressText: 'Level 0/50',
  },
  {
    id: 'workout_100',
    title: 'Trăm bài',
    description: 'Hoàn thành 100 buổi tập',
    unlocked: false,
    progressText: '0/100 buổi tập',
  },
  ...RANK_CONFIG.map((rank) => ({
    id: `rank_${rank.rankNumber}`,
    title: rank.rankName,
    description: `Hoàn thành Rank ${rank.rankName} (Level ${rank.endLevel})`,
    unlocked: false,
    progressText: `${rank.endLevel}/${MAX_LEVEL}`,
  })),
];

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
  const [achievements, setAchievements] = useState<AchievementBadge[]>(DEFAULT_ACHIEVEMENTS);

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
          if (setAchievements) {
            const unlockedIds = await loadAchievementsFromSupabase(userId);
            if (unlockedIds) {
              const mergedAchievements = DEFAULT_ACHIEVEMENTS.map(a => ({
                ...a,
                unlocked: unlockedIds.has(a.id),
              }));
              setAchievements(mergedAchievements);
            }
          }
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

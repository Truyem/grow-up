import { useState, useCallback, useEffect } from 'react';
import { UserLevel, XPReward } from '../types';
import { 
  XP_PER_LEVEL, 
  XP_REWARDS, 
  getXPForNextLevel,
  getRankFromLevel,
  LEVEL_UP_REWARDS,
  RANK_CONFIG
} from '../constants/rankConfig';
import { initializeUserLevel as initializeLevelFromDB, saveUserLevel } from '../services/levelService';

interface LevelUpInfo {
  newLevel: number;
  oldLevel: number;
  xpGained: number;
  totalXP: number;
  rewards: string[];
}

/**
 * Validate và fix user level data nếu không nhất quán
 */
function validateAndFixLevelData(level: UserLevel): UserLevel {
  // Tính lại tất cả từ totalXP (source of truth)
  let remainingXP = level.totalXP;
  let calculatedLevel = 0;
  
  while (remainingXP >= (calculatedLevel + 1) * XP_PER_LEVEL && calculatedLevel < 70) {
    remainingXP -= (calculatedLevel + 1) * XP_PER_LEVEL;
    calculatedLevel++;
  }

  const calculatedNextXP = (calculatedLevel + 1) * XP_PER_LEVEL;
  const calculatedTotalXP = level.totalXP;

  // Kiểm tra có cần fix không
  const needsLevelFix = calculatedLevel !== level.currentLevel;
  const needsXPFix = remainingXP !== level.currentLevelXP;
  const needsNextXPFix = calculatedNextXP !== level.nextLevelXP;

  if (needsLevelFix || needsXPFix || needsNextXPFix) {
    console.log(`[LevelSystem] Fixing data:`, {
      from: { level: level.currentLevel, xp: level.currentLevelXP, nextXP: level.nextLevelXP },
      to: { level: calculatedLevel, xp: remainingXP, nextXP: calculatedNextXP }
    });
    
    return {
      ...level,
      currentLevel: calculatedLevel,
      currentLevelXP: remainingXP,
      nextLevelXP: calculatedNextXP,
      totalXP: calculatedTotalXP,
      lifetimeXP: Math.max(level.lifetimeXP, calculatedTotalXP),
    };
  }

  return level;
}

export function useLevelSystem(userId?: string) {
  const [userLevel, setUserLevel] = useState<UserLevel | null>(null);
  const [levelUpInfo, setLevelUpInfo] = useState<LevelUpInfo | null>(null);
  const [isLevelingUp, setIsLevelingUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Auto-load user level from Supabase when userId changes
  useEffect(() => {
    if (!userId) {
      setUserLevel(null);
      return;
    }

    const loadUserLevel = async () => {
      setIsLoading(true);
      try {
        const level = await initializeLevelFromDB(userId);
        if (level) {
          // Validate và fix nếu cần
          const fixedLevel = validateAndFixLevelData(level);
          setUserLevel(fixedLevel);
          // Save fixed data back to DB if there were changes
          if (fixedLevel !== level) {
            await saveUserLevel(userId, fixedLevel);
          }
        }
      } catch (error) {
        console.error('Error loading user level:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserLevel();
  }, [userId]);

  // Save user level to Supabase whenever it changes (only for user actions)
  useEffect(() => {
    if (!userId || !userLevel) return;

    const saveLevel = async () => {
      // Always save the current state (it's already validated)
      await saveUserLevel(userId, userLevel);
    };

    // Debounce save
    const timeoutId = setTimeout(saveLevel, 1000);
    return () => clearTimeout(timeoutId);
  }, [userId, userLevel]);

  /**
   * Tính toán XP reward dựa vào workout info
   */
  const calculateXPReward = useCallback(
    (
      exerciseCount: number = 0,
      intensity: 'low' | 'medium' | 'hard' = 'medium',
      hasNutrition: boolean = false,
      consistencyStreak: number = 0
    ): XPReward => {
      let baseXP = XP_REWARDS.BASE_WORKOUT;
      const exerciseBonus = exerciseCount * XP_REWARDS.PER_EXERCISE;
      const difficultyBonus = XP_REWARDS.DIFFICULTY_BONUS[intensity] || 0;
      const consistencyBonus = consistencyStreak > 0 ? XP_REWARDS.CONSISTENCY_BONUS : 0;
      const nutritionBonus = hasNutrition ? XP_REWARDS.NUTRITION_BONUS : 0;

      const totalXP = baseXP + exerciseBonus + difficultyBonus + consistencyBonus + nutritionBonus;

      return {
        baseXP,
        exerciseCount,
        exerciseBonus,
        consistency: consistencyBonus,
        difficulty: difficultyBonus,
        totalXP,
      };
    },
    []
  );

  /**
   * Thêm XP và kiểm tra level up
   */
  const addXP = useCallback(
    (xpAmount: number, userLevelData: UserLevel): UserLevel | null => {
      if (!userLevelData) return null;

      const updatedLevel = { ...userLevelData };
      let currentLevelXP = updatedLevel.currentLevelXP + xpAmount;
      let levelUps: LevelUpInfo[] = [];

      // Kiểm tra level up
      while (currentLevelXP >= getXPForNextLevel(updatedLevel.currentLevel)) {
        const xpForNextLevel = getXPForNextLevel(updatedLevel.currentLevel);
        currentLevelXP -= xpForNextLevel;
        updatedLevel.currentLevel += 1;

        const rewards = LEVEL_UP_REWARDS[updatedLevel.currentLevel] || [];
        levelUps.push({
          newLevel: updatedLevel.currentLevel,
          oldLevel: updatedLevel.currentLevel - 1,
          xpGained: xpAmount,
          totalXP: updatedLevel.totalXP,
          rewards,
        });
      }

      updatedLevel.currentLevelXP = currentLevelXP;
      updatedLevel.nextLevelXP = getXPForNextLevel(updatedLevel.currentLevel);
      updatedLevel.totalXP += xpAmount;
      updatedLevel.lifetimeXP += xpAmount;

      // Nếu có level up, show notification
      if (levelUps.length > 0) {
        setIsLevelingUp(true);
        setLevelUpInfo(levelUps[levelUps.length - 1]);
        setTimeout(() => setIsLevelingUp(false), 3000);
      }

      return updatedLevel;
    },
    []
  );

  /**
   * Lấy thông tin rank từ level hiện tại
   */
  const getRankInfo = useCallback(() => {
    if (!userLevel) return null;
    return getRankFromLevel(userLevel.currentLevel);
  }, [userLevel]);

  /**
   * Lấy % tiến độ trong rank hiện tại
   */
  const getRankProgress = useCallback(() => {
    if (!userLevel) return 0;
    const rank = getRankFromLevel(userLevel.currentLevel);
    const totalXPInRank = rank.endXP - rank.startXP;
    const currentXPInRank = userLevel.currentLevelXP;
    return Math.min(100, (currentXPInRank / getXPForNextLevel(userLevel.currentLevel)) * 100);
  }, [userLevel]);

  /**
   * Lấy XP cần thiết để lên level tiếp theo
   */
  const getXPToNextLevel = useCallback(() => {
    if (!userLevel) return 0;
    return getXPForNextLevel(userLevel.currentLevel) - userLevel.currentLevelXP;
  }, [userLevel]);

  /**
   * Khởi tạo level cho user mới
   */
  const initializeUserLevel = useCallback((userId: string): UserLevel => {
    const newUserLevel: UserLevel = {
      userId,
      currentLevel: 0,
      totalXP: 0,
      currentLevelXP: 0,
      nextLevelXP: getXPForNextLevel(0),
      lifetimeXP: 0,
    };
    setUserLevel(newUserLevel);
    return newUserLevel;
  }, []);

  /**
   * Set user level từ data - kiểm tra level up và trigger animation nếu cần
   */
  const setUserLevelData = useCallback((levelData: UserLevel) => {
    const fixed = validateAndFixLevelData(levelData);
    const oldLevel = userLevel?.currentLevel || 0;
    const newLevel = fixed.currentLevel;

    // Kiểm tra nếu có level up
    if (newLevel > oldLevel) {
      const levelUps: LevelUpInfo[] = [];
      for (let lv = oldLevel + 1; lv <= newLevel; lv++) {
        levelUps.push({
          newLevel: lv,
          oldLevel: lv - 1,
          xpGained: fixed.totalXP - (userLevel?.totalXP || 0),
          totalXP: fixed.totalXP,
          rewards: LEVEL_UP_REWARDS[lv] || [],
        });
      }
      setIsLevelingUp(true);
      setLevelUpInfo(levelUps[levelUps.length - 1]);
      setTimeout(() => setIsLevelingUp(false), 4000);
    }

    setUserLevel(fixed);
  }, [userLevel]);

  return {
    userLevel,
    setUserLevelData,
    initializeUserLevel,
    addXP,
    calculateXPReward,
    getRankInfo,
    getRankProgress,
    getXPToNextLevel,
    levelUpInfo,
    isLevelingUp,
    isLoading,
  };
}

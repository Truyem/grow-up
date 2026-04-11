/**
 * EXAMPLE: Cách tích hợp Gamification vào App.tsx
 * Đây là một ví dụ hoàn chỉnh về cách sử dụng hệ thống XP & Level
 */

import React, { useEffect, useState } from 'react';

// Import gamification hooks và components
import { useLevelSystem } from './hooks/useLevelSystem';
import { LevelUpPopup } from './components/ui/LevelUpPopup';
import { XPStatusBar } from './components/ui/XPStatusBar';
import { XPDisplay } from './components/ui/XPDisplay';
import { GamificationDashboard } from './components/ui/GamificationDashboard';

// Import services
import { 
  getUserLevel, 
  initializeUserLevel,
  addXPToUser 
} from './services/levelService';

export default function AppExample() {
  // ============================================================
  // EXAMPLE 1: Setup gamification system
  // ============================================================
  
  // Level system hook
  const {
    userLevel,
    setUserLevelData,
    calculateXPReward,
    getRankInfo,
    getRankProgress,
    getXPToNextLevel,
    levelUpInfo,
    isLevelingUp,
  } = useLevelSystem();

  // Local state
  const [userId, setUserId] = useState<string | null>(null);
  const [showGamification, setShowGamification] = useState(false);

  // ============================================================
  // EXAMPLE 2: Initialize user level on login
  // ============================================================
  
  useEffect(() => {
    const initUserLevel = async () => {
      if (!userId) return;

      try {
        // Cố gắng load level hiện có
        const existingLevel = await getUserLevel(userId);

        if (existingLevel) {
          // User đã có level
          setUserLevelData(existingLevel);
          console.log('Level loaded:', existingLevel);
        } else {
          // User mới, tạo level mới
          const newLevel = await initializeUserLevel(userId);
          if (newLevel) {
            setUserLevelData(newLevel);
            console.log('New level created:', newLevel);
          }
        }
      } catch (error) {
        console.error('Error initializing level:', error);
      }
    };

    initUserLevel();
  }, [userId]);

  // ============================================================
  // EXAMPLE 3: Thêm XP khi hoàn thành workout
  // ============================================================

  const handleCompleteWorkout = async (
    exerciseCount: number,
    intensity: 'low' | 'medium' | 'hard' = 'medium',
    hasNutrition: boolean = false,
    consistencyStreak: number = 0
  ) => {
    if (!userId || !userLevel) {
      console.error('User not logged in or level not initialized');
      return;
    }

    try {
      // Tính toán XP reward
      const xpReward = calculateXPReward(
        exerciseCount,
        intensity,
        hasNutrition,
        consistencyStreak
      );

      console.log('XP Reward Breakdown:', {
        baseXP: xpReward.baseXP,
        exercisesBonus: xpReward.exerciseBonus,
        difficultyBonus: xpReward.difficulty,
        consistencyBonus: xpReward.consistency,
        totalXP: xpReward.totalXP,
      });

      // Thêm XP vào user
      const updatedLevel = await addXPToUser(
        userId,
        xpReward.totalXP,
        userLevel
      );

      if (updatedLevel) {
        // Update local state
        setUserLevelData(updatedLevel);

        // Log kết quả
        console.log('Level updated:', {
          level: updatedLevel.currentLevel,
          totalXP: updatedLevel.totalXP,
          currentLevelXP: updatedLevel.currentLevelXP,
          nextLevelXP: updatedLevel.nextLevelXP,
        });

        // Level up notification sẽ hiển thị tự động
        // thông qua LevelUpPopup component
      }
    } catch (error) {
      console.error('Error adding XP:', error);
    }
  };

  // ============================================================
  // EXAMPLE 4: UI Components
  // ============================================================

  return (
    <div className="app">
      {/* 1. XP Status Bar - Hiển thị ở header */}
      <header className="app-header">
        <h1>Grow Up App</h1>
        {userLevel && (
          <XPStatusBar
            userLevel={userLevel}
            onClick={() => setShowGamification(true)}
          />
        )}
      </header>

      {/* 2. Main Content */}
      <main className="app-content">
        {userLevel ? (
          <>
            {/* Hiển thị XP Display đầy đủ */}
            <XPDisplay
              userLevel={userLevel}
              xpProgress={
                (userLevel.currentLevelXP / userLevel.nextLevelXP) * 100
              }
              xpToNextLevel={
                userLevel.nextLevelXP - userLevel.currentLevelXP
              }
            />

            {/* Nút test: Complete workout */}
            <button
              onClick={() => {
                // Ví dụ: 5 bài tập, độ khó hard, có nutrition, 3 streak
                handleCompleteWorkout(5, 'hard', true, 3);
              }}
              style={{
                marginTop: '20px',
                padding: '12px 24px',
                fontSize: '16px',
                backgroundColor: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              Test: Hoàn Thành Workout (+340 XP)
            </button>

            {/* Debug Info */}
            <div
              style={{
                marginTop: '20px',
                padding: '16px',
                backgroundColor: '#f0f0f0',
                borderRadius: '8px',
                fontSize: '12px',
                fontFamily: 'monospace',
              }}
            >
              <h4>Debug Info:</h4>
              <p>Level: {userLevel.currentLevel}</p>
              <p>Total XP: {userLevel.totalXP}</p>
              <p>Current Level XP: {userLevel.currentLevelXP}</p>
              <p>Next Level XP: {userLevel.nextLevelXP}</p>
              <p>XP To Next: {getXPToNextLevel()}</p>
              <p>Rank: {getRankInfo()?.rankName}</p>
            </div>
          </>
        ) : (
          <p>Loading level data...</p>
        )}
      </main>

      {/* 3. Level Up Popup - Tự động hiển thị khi level up */}
      <LevelUpPopup
        isVisible={isLevelingUp}
        newLevel={levelUpInfo?.newLevel || 0}
        xpGained={levelUpInfo?.xpGained || 0}
        rewards={levelUpInfo?.rewards || []}
        onClose={() => console.log('Level up popup closed')}
      />

      {/* 4. Gamification Dashboard Modal */}
      {showGamification && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setShowGamification(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              maxHeight: '90vh',
              maxWidth: '90vw',
              overflow: 'auto',
            }}
          >
            <GamificationDashboard
              userLevel={userLevel}
              onClose={() => setShowGamification(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// EXAMPLE 5: Custom hooks để sử dụng gamification
// ============================================================

/**
 * Hook tính toán XP từ workout details
 */
export function useWorkoutXP() {
  const { calculateXPReward } = useLevelSystem();

  const getXPForWorkout = (
    exerciseCount: number,
    exercises: Array<{ reps: number; weight: number }>,
    intensity: 'low' | 'medium' | 'hard',
    hasCompletedNutrition: boolean,
    streakDays: number
  ) => {
    const xpReward = calculateXPReward(
      exerciseCount,
      intensity,
      hasCompletedNutrition,
      streakDays
    );

    return {
      xpReward,
      breakdown: {
        base: xpReward.baseXP,
        exercises: `${exerciseCount} x ${20} = ${xpReward.exerciseBonus}`,
        difficulty: `${intensity} = ${xpReward.difficulty}`,
        consistency: `${streakDays} days = ${xpReward.consistency}`,
        nutrition: hasCompletedNutrition ? 30 : 0,
      },
    };
  };

  return { getXPForWorkout };
}

// ============================================================
// EXAMPLE 6: Integration với completeWorkout handler
// ============================================================

/**
 * Ví dụ cách thêm XP vào existing completeWorkout handler
 */
export async function completeWorkoutWithXP(
  userId: string,
  workoutData: {
    exercises: Array<any>;
    nutrition: any;
    intensity: 'low' | 'medium' | 'hard';
    streak: number;
  },
  userLevel: any,
  onXPGained?: (xp: number) => void
) {
  try {
    // 1. Save workout như bình thường
    // await saveWorkoutToSupabase(userId, workoutData);

    // 2. Calculate XP
    const xpReward = calculateXPReward(
      workoutData.exercises.length,
      workoutData.intensity,
      !!workoutData.nutrition,
      workoutData.streak
    );

    // 3. Add XP to user
    const updatedLevel = await addXPToUser(
      userId,
      xpReward.totalXP,
      userLevel
    );

    // 4. Callback khi XP tăng
    if (onXPGained) {
      onXPGained(xpReward.totalXP);
    }

    return {
      success: true,
      updatedLevel,
      xpGained: xpReward.totalXP,
    };
  } catch (error) {
    console.error('Error in completeWorkoutWithXP:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

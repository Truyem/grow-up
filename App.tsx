import React, { useEffect, useState, Suspense, lazy } from 'react';

// Suppress Recharts defaultProps warning
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  if (typeof args[0] === 'string' && /defaultProps will be removed from function components/.test(args[0])) {
    return;
  }
  originalConsoleError(...args);
};

import wallpaper from './wallpaper.webp';
import wallpaperMb from './wallpaper-mb.webp';

const UserForm = lazy(() => import('./components/UserForm').then(m => ({ default: m.UserForm })));
const PlanDisplay = lazy(() => import('./components/PlanDisplay').then(m => ({ default: m.PlanDisplay })));
const AuthPage = lazy(() => import('./components/AuthPage').then(m => ({ default: m.AuthPage })));
const OnboardingTour = lazy(() => import('./components/OnboardingTour').then(m => ({ default: m.OnboardingTour })));
const AccountSettings = lazy(() => import('./components/AccountSettings').then(m => ({ default: m.AccountSettings })));

import { Toast } from './components/ui/Toast';
import { LoadingAnimation } from './components/ui/LoadingAnimation';
import { PlanTabs } from './components/ui/PlanTabs';
import { XPStatusBar } from './components/ui/XPStatusBar';
import { LevelUpAnimation } from './components/ui/LevelUpAnimation';
import { WeatherDisplay } from './components/ui/WeatherDisplay';
import { RankShowcase } from './components/ui/RankShowcase';
import { Sparkles, Settings } from 'lucide-react';

import { scheduleAllDailyNotifications } from './services/scheduleNotifications';
import { AppProvider } from './context';
import { canPerformOnlineAction } from './services/onlineGuard';
import { loadProfileSettingsFromSupabase } from './services/supabasePlanSync';

import {
  useAuth,
  useUserData,
  useWorkoutHistory,
  usePlanManager,
  useTour,
  useSupabaseProfileSync,
  useLevelSystem,
} from './hooks';
import { UserGoals, UserInput } from './types';
import { RANK_CONFIG } from './constants/rankConfig';

export default function App() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'info' | 'error'>('success');
  const showToast = (msg: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
  };

  // Preload rank images
  useEffect(() => {
    const preloadImages = async () => {
      const promises = [];
      for (let i = 0; i <= 70; i++) {
        promises.push(
          new Promise((resolve) => {
            const img = new Image();
            img.onload = resolve;
            img.onerror = resolve;
            img.src = `/ranks/lv${i}.webp`;
          })
        );
      }
      await Promise.all(promises);
      console.log('[Preload] All rank images loaded');
    };
    preloadImages();
  }, []);

  // 1. Auth Hook
  const { session, isAuthChecking, signOut } = useAuth();

  // 2. User Data Hook
  const {
    userData, setUserData,
    userStats, setUserStats,
    userGoals, setUserGoals,
    achievements, setAchievements,
  } = useUserData();

  const setUserDataOnline: React.Dispatch<React.SetStateAction<UserInput>> = (value) => {
    if (!canPerformOnlineAction('user-settings-update', showToast)) return;
    setUserData(value);
  };

  const setUserGoalsOnline: React.Dispatch<React.SetStateAction<UserGoals | null>> = (value) => {
    if (!canPerformOnlineAction('user-goals-update', showToast)) return;
    setUserGoals(value);
  };

  // 3. Plan Manager Hook
  const {
    plan, setPlan,
    loading: planLoading,
    streamingText,
    isStreaming,
    viewMode, setViewMode,
    handleGenerate,
    handleReset,
    handleStartTracking,
    handleUpdatePlan,
    handleUpdatePlanImmediate,
    handleRefreshPlan
  } = usePlanManager(userData, userStats, session, showToast);

  // 4. Workout History Hook
  const {
    workoutHistory,
    handleCompleteWorkout,
    handleDeleteHistoryItem,
    handleRefreshHistory,
    handleSickDay,
    handleSaveSleep,
    isRefreshing,
    calculateStreak
  } = useWorkoutHistory(userData, userStats, setUserStats, plan, setPlan, showToast, session?.user?.id, (newLevel) => {
    if (newLevel) {
      setUserLevelData(newLevel);
    }
  });

  // Auto-update streak
  useEffect(() => {
    const newStreak = calculateStreak();
    if (newStreak !== userStats.streak) {
      const updatedStats = { ...userStats, streak: newStreak };
      setUserStats(updatedStats);
    }
  }, [workoutHistory, calculateStreak, userStats, setUserStats]);

  // 5. Tour Hook
  const { isTourOpen, tourSteps, handleTourComplete } = useTour(
    userData, setUserDataOnline, planLoading, setViewMode, setPlan, handleStartTracking, showToast
  );

  const isLoading = planLoading || isAuthChecking;
  const [hasInitialSynced, setHasInitialSynced] = useState(false);

  // 6. Supabase background sync (state -> cloud)
  useSupabaseProfileSync(
    session?.user?.id,
    userData, setUserData,
    userStats, setUserStats,
    userGoals, setUserGoals,
    achievements, setAchievements,
    hasInitialSynced
  );

  // 7. Level System Hook
  const { userLevel, setUserLevelData, isLevelingUp, levelUpInfo } = useLevelSystem(session?.user?.id);

  // 8. Update achievements based on progress
  useEffect(() => {
    if (!userLevel || !achievements) return;

    const newAchievements = achievements.map(achievement => {
      const updated = { ...achievement };
      
      if (achievement.id.startsWith('rank_')) {
        const rankNum = parseInt(achievement.id.replace('rank_', ''));
        const rankConfig = RANK_CONFIG.find(r => r.rankNumber === rankNum);
        if (rankConfig) {
          const currentRank = Math.floor((userLevel.currentLevel - 1) / 10) + 1;
          updated.unlocked = currentRank >= rankNum;
          updated.progressText = `Lv ${rankConfig.startLevel}-${rankConfig.endLevel}`;
        }
        return updated;
      }
      
      switch (achievement.id) {
        case 'first_workout':
          if (workoutHistory.length >= 1 && !updated.unlocked) {
            updated.unlocked = true;
            updated.progressText = '1/1 buổi tập ✓';
          }
          break;
        case 'streak_7':
          if (userStats.streak >= 7) {
            updated.unlocked = true;
            updated.progressText = '7/7 ngày ✓';
          } else {
            updated.progressText = `${userStats.streak}/7 ngày`;
          }
          break;
        case 'streak_30':
          if (userStats.streak >= 30) {
            updated.unlocked = true;
            updated.progressText = '30/30 ngày ✓';
          } else {
            updated.progressText = `${userStats.streak}/30 ngày`;
          }
          break;
        case 'level_10':
          if (userLevel.currentLevel >= 10) {
            updated.unlocked = true;
            updated.progressText = 'Level 10/10 ✓';
          } else {
            updated.progressText = `Level ${userLevel.currentLevel}/10`;
          }
          break;
        case 'level_50':
          if (userLevel.currentLevel >= 50) {
            updated.unlocked = true;
            updated.progressText = 'Level 50/50 ✓';
          } else {
            updated.progressText = `Level ${userLevel.currentLevel}/50`;
          }
          break;
        case 'complete_rank_bronze':
          if (userLevel.currentLevel >= 10) {
            updated.unlocked = true;
            updated.progressText = 'Level 10/10 ✓';
          } else {
            updated.progressText = `Level ${userLevel.currentLevel}/10`;
          }
          break;
        case 'complete_rank_silver':
          if (userLevel.currentLevel >= 20) {
            updated.unlocked = true;
            updated.progressText = 'Level 20/20 ✓';
          } else {
            updated.progressText = `Level ${userLevel.currentLevel}/20`;
          }
          break;
        case 'complete_rank_gold':
          if (userLevel.currentLevel >= 30) {
            updated.unlocked = true;
            updated.progressText = 'Level 30/30 ✓';
          } else {
            updated.progressText = `Level ${userLevel.currentLevel}/30`;
          }
          break;
        case 'workout_100':
          if (workoutHistory.length >= 100) {
            updated.unlocked = true;
            updated.progressText = '100/100 buổi tập ✓';
          } else {
            updated.progressText = `${workoutHistory.length}/100 buổi tập`;
          }
          break;
        case 'max_level':
          if (userLevel.currentLevel >= 70) {
            updated.unlocked = true;
            updated.progressText = 'Level 70/70 ✓';
          } else {
            updated.progressText = `Level ${userLevel.currentLevel}/70`;
          }
          break;
      }
      return updated;
    });

    const hasChanges = newAchievements.some((newAch, i) => 
      newAch.unlocked !== achievements[i].unlocked || 
      newAch.progressText !== achievements[i].progressText
    );

    if (hasChanges) {
      setAchievements(newAchievements);
    }
  }, [userLevel, userStats.streak, workoutHistory.length, achievements, setAchievements]);

  // Track levels for animation
  const [animationLevels, setAnimationLevels] = useState<{ old: number; new: number } | null>(null);

  // Handle level up animation - capture levels immediately when triggered
  useEffect(() => {
    if (isLevelingUp && levelUpInfo) {
      setAnimationLevels({
        old: levelUpInfo.oldLevel,
        new: levelUpInfo.newLevel
      });
    }
  }, [isLevelingUp, levelUpInfo]);

  const handleLevelUpComplete = () => {
    setAnimationLevels(null);
  };

  // Cheat codes console
  useEffect(() => {
    const addXP = (amount: number) => {
      if (!session?.user?.id || !userLevel) {
        console.log('❌ Chưa đăng nhập hoặc chưa có userLevel');
        return;
      }
      const newLevel = { ...userLevel };
      newLevel.currentLevelXP += amount;
      newLevel.totalXP += amount;
      newLevel.lifetimeXP += amount;
      setUserLevelData(newLevel);
      console.log(`✅ +${amount} XP!`, newLevel);
    };
  }, [session?.user?.id, userLevel, setUserLevelData]);

  const handleSyncAll = async () => {
    if (!session?.user?.id) return;
    if (!canPerformOnlineAction('sync-all', showToast)) return;

    try {
      showToast('Đang đồng bộ dữ liệu...', 'info');
      // 1. Sync Profile Settings
      const cloudSettings = await loadProfileSettingsFromSupabase(session.user.id);
      if (cloudSettings) {
        if (cloudSettings.userData) setUserData((prev) => ({ ...prev, ...cloudSettings.userData }));
        if (cloudSettings.userStats) setUserStats(cloudSettings.userStats);
        if (cloudSettings.userGoals) setUserGoals(cloudSettings.userGoals);
        if (Array.isArray(cloudSettings.achievements)) setAchievements(cloudSettings.achievements);
      }

      // 2. Sync Plan
      await handleRefreshPlan();

      // 3. Sync History
      await handleRefreshHistory();

      showToast('Đồng bộ thành công!', 'success');
    } catch (error) {
      console.error('[Sync] Error syncing all data:', error);
      showToast('Có lỗi xảy ra khi đồng bộ.', 'error');
    }
  };

  const handleCompleteWorkoutWithSleep = async (
    levelSelected: string,
    summary: string,
    completedExercises: string[],
    userNotes: string,
    exerciseLogs?: any[]
  ) => {
    if (!canPerformOnlineAction('complete-workout', showToast)) return;

    try {
      await handleCompleteWorkout(levelSelected, summary, completedExercises, userNotes, exerciseLogs);
    } catch {
      return;
    }
  };

  // Native Notifications
  useEffect(() => {
    if (!session?.user) return;
    
    // Schedule notifications
    scheduleAllDailyNotifications(plan || undefined).catch((e) => {
      console.warn('[Notifications] Failed to schedule daily notifications:', e);
    });
  }, [session?.user?.id, plan]);

  useEffect(() => {
    if (session?.user?.id && !hasInitialSynced && !isAuthChecking) {
      setHasInitialSynced(true);
      // Thay vì gọi handleSyncAll (có thể bị chặn bởi toast/delay), ta gọi trực tiếp Refresh
      const doInitialSync = async () => {
        try {
          console.log('[Initial Sync] Fetching profile, plan & history...');
          // 1. Sync Profile Settings
          const cloudSettings = await loadProfileSettingsFromSupabase(session.user.id);
          if (cloudSettings) {
            if (cloudSettings.userData) setUserData((prev) => ({ ...prev, ...cloudSettings.userData }));
            if (cloudSettings.userStats) setUserStats(cloudSettings.userStats);
            if (cloudSettings.userGoals) setUserGoals(cloudSettings.userGoals);
            if (Array.isArray(cloudSettings.achievements)) setAchievements(cloudSettings.achievements);
          }

          // 2. Sync Plan
          await handleRefreshPlan();

          // 3. Sync History
          await handleRefreshHistory();
          console.log('[Initial Sync] Success.');
        } catch (error) {
          console.error('[Initial Sync] Error:', error);
        }
      };
      
      doInitialSync();
    }
  }, [session?.user?.id, hasInitialSynced, isAuthChecking, setUserData, setUserStats, setUserGoals, setAchievements, handleRefreshPlan, handleRefreshHistory]);

  const appContextValue = {
    userId: session?.user?.id,
    userData,
    setUserData: setUserDataOnline,
    userStats,
    userGoals,
    setUserGoals: setUserGoalsOnline,
    achievements,
    plan,
    isLoading: planLoading,
    workoutHistory,
    isRefreshing,
    generatePlan: (type: 'workout' | 'nutrition' | 'history' | 'settings') => handleGenerate(type, workoutHistory),
    resetPlan: handleReset,
    startTracking: handleStartTracking,
    updatePlan: handleUpdatePlan,
    saveSleep: handleSaveSleep,
    completeWorkout: handleCompleteWorkoutWithSleep,
    deleteHistoryItem: handleDeleteHistoryItem,
    refreshHistory: handleRefreshHistory,
    sickDay: handleSickDay,
    showToast,
  };

  return (
    <AppProvider value={appContextValue}>
      <div className="relative h-dvh min-h-dvh font-sans selection:bg-cyan-500/30 selection:text-cyan-100">
        {isLoading && <LoadingAnimation streamingText={isStreaming ? streamingText : undefined} />}

        {!isAuthChecking && !session ? (
          <Suspense fallback={<LoadingAnimation />}>
            <AuthPage />
          </Suspense>
        ) : (
          <>
            {/* Optimized Background Layer */}
            <div className="fixed inset-0 z-0 overflow-hidden">
              <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700 ease-out transform scale-105 block md:hidden"
                style={{ backgroundImage: `url(${wallpaperMb})` }}
              />
              <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700 ease-out transform scale-105 hidden md:block"
                style={{ backgroundImage: `url(${wallpaper})` }}
              />
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/40 to-transparent" />
            </div>

            {/* Content Layer */}
            <div className="relative z-10 container mx-auto px-4 py-10 max-w-5xl">
              {/* Header */}
              <div className="text-center mb-10 space-y-3 animate-fade-in relative transition-all duration-300">
                <div className="inline-flex items-center justify-center p-3 bg-white/5 rounded-full mb-2 border border-white/10 shadow-lg backdrop-blur-md">
                  <Sparkles className="w-6 h-6 text-cyan-300 animate-pulse" />
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight drop-shadow-lg">
                  Grow <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Up</span>
                </h1>

                <div className="flex items-center justify-center gap-4">
                  <button
                    id="tour-settings"
                    onClick={() => setViewMode('settings')}
                    className="text-lg text-gray-300 font-light hover:text-white transition-colors duration-200 cursor-pointer group flex items-center gap-2"
                  >
                    <span className="text-cyan-400 font-semibold group-hover:text-cyan-300">
                      {session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || 'Member'}
                    </span>
                    <Settings className="w-4 h-4 text-gray-400 group-hover:text-cyan-400 transition-colors" />
                  </button>
                </div>
                <WeatherDisplay />
              </div>

              <div className="transition-all duration-500 ease-in-out">
                <div id="tour-tabs" className="sticky top-4 z-50 mb-8 max-w-2xl mx-auto">
                  <PlanTabs
                    activeTab={viewMode}
                    onTabChange={(tab) => setViewMode(tab)}
                    className="shadow-2xl"
                  />
                </div>

                {session?.user && (
                  <div className="max-w-2xl mx-auto mb-6">
                    <XPStatusBar
                      userLevel={userLevel}
                    />
                  </div>
                )}

                {viewMode === 'settings' && session?.user ? (
                  <Suspense fallback={<div className="h-64 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div></div>}>
                    <AccountSettings
                      user={session.user}
                      onLogout={signOut}
                      onSyncAll={handleSyncAll}
                      isSyncing={isRefreshing || planLoading}
                    />
                  </Suspense>
                ) : null}

                {viewMode === 'workout' && (
                  plan?.workout?.isGenerated ? (
                    <Suspense fallback={<div className="h-64 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div></div>}>
                      <PlanDisplay
                        plan={plan}
                        onReset={handleReset}
                        onComplete={handleCompleteWorkoutWithSleep}
                        onUpdatePlan={handleUpdatePlan}
                        onUpdatePlanImmediate={handleUpdatePlanImmediate}
                      />
                    </Suspense>
                  ) : (
                    <div className="max-w-2xl mx-auto space-y-4">
                      <Suspense fallback={<div className="h-64 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div></div>}>
                        <UserForm activeTab="workout" />
                      </Suspense>
                    </div>
                  )
                )}

                {viewMode === 'history' && (
                  <div className="max-w-2xl mx-auto space-y-4">
                    <Suspense fallback={<div className="h-64 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div></div>}>
                      <UserForm activeTab="history" />
                    </Suspense>
                  </div>
                )}

                {viewMode === 'rank' && session?.user && (
                  <div className="max-w-2xl mx-auto space-y-4 overflow-visible">
                    <Suspense fallback={<div className="h-64 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div></div>}>
                      <RankShowcase userLevel={userLevel} />
                    </Suspense>
                  </div>
                )}

                {isTourOpen && (
                  <Suspense fallback={null}>
                    <OnboardingTour
                      steps={tourSteps}
                      isOpen={isTourOpen}
                      onComplete={handleTourComplete}
                      onSkip={handleTourComplete}
                    />
                  </Suspense>
                )}
              </div>
            </div>
          </>
        )}

        <div className="mt-20 text-center text-xs text-gray-600">
          <p>© 2025 Vũ Đình Trung. All rights reserved.</p>
        </div>

        <Toast
          message={toastMessage || ''}
          isOpen={!!toastMessage}
          onClose={() => setToastMessage(null)}
          type={toastType}
          duration={6000}
        />

        <LevelUpAnimation
          isVisible={!!animationLevels}
          oldLevel={animationLevels?.old || 0}
          newLevel={animationLevels?.new || 0}
          onComplete={handleLevelUpComplete}
        />
      </div>
    </AppProvider>
  );
}

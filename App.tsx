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
const NutritionDisplay = lazy(() => import('./components/NutritionDisplay').then(m => ({ default: m.NutritionDisplay })));
const AuthPage = lazy(() => import('./components/AuthPage').then(m => ({ default: m.AuthPage })));
const OnboardingTour = lazy(() => import('./components/OnboardingTour').then(m => ({ default: m.OnboardingTour })));
const AccountSettings = lazy(() => import('./components/AccountSettings').then(m => ({ default: m.AccountSettings })));

import { Toast } from './components/ui/Toast';
import { LoadingAnimation } from './components/ui/LoadingAnimation';
import { PlanTabs } from './components/ui/PlanTabs';
import { Sparkles, Settings } from 'lucide-react';

import { scheduleAllDailyNotifications } from './services/scheduleNotifications';
import { AppProvider } from './context';
import { canPerformOnlineAction } from './services/onlineGuard';

import {
  useAuth,
  useUserData,
  useWorkoutHistory,
  usePlanManager,
  useTour,
  useSupabaseSleepRecoverySync,
  useSupabaseProfileSync,
} from './hooks';
import { UserGoals, UserInput } from './types';

export default function App() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'info' | 'error'>('success');
  const showToast = (msg: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
  };

  // 1. Auth Hook
  const { session, isAuthChecking, signOut } = useAuth();

  // 2. User Data Hook
  const {
    userData, setUserData,
    userStats, setUserStats,
    userGoals, setUserGoals,
    sleepRecovery, setSleepRecovery,
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
    handleUpdatePlan
  } = usePlanManager(userData, session, showToast);

  // 4. Workout History Hook
  const {
    workoutHistory,
    handleCompleteWorkout,
    handleCompleteNutrition,
    handleDeleteHistoryItem,
    handleRefreshHistory,
    handleSickDay,
    isRefreshing,
    calculateStreak
  } = useWorkoutHistory(userData, userStats, setUserStats, plan, setPlan, showToast, session?.user?.id);

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

  // 6. Supabase background sync (state -> cloud)
  useSupabaseProfileSync(
    session?.user?.id,
    userData, setUserData,
    userStats, setUserStats,
    userGoals, setUserGoals
  );
  useSupabaseSleepRecoverySync(session?.user?.id, sleepRecovery, setSleepRecovery);

  // Native Notifications
  useEffect(() => {
    if (!session?.user) return;
    scheduleAllDailyNotifications(plan || undefined).catch((e) => {
      console.warn('[Notifications] Failed to schedule daily notifications:', e);
    });
  }, [session?.user?.id, plan]);

  const isLoading = planLoading || isAuthChecking;
  const handleCompleteWorkoutWithSleep = async (
    levelSelected: string,
    summary: string,
    completedExercises: string[],
    userNotes: string,
    nutrition: any,
    exerciseLogs?: any[]
  ) => {
    if (!canPerformOnlineAction('complete-workout', showToast)) return;

    try {
      await handleCompleteWorkout(levelSelected, summary, completedExercises, userNotes, nutrition, exerciseLogs);
    } catch {
      return;
    }

    if (userData.tempSleepHours !== undefined && userData.tempSleepHours > 0) {
      const { createSleepRecoveryEntry } = require('./services/sleepRecoveryService');
      const entry = createSleepRecoveryEntry({ sleepHours: userData.tempSleepHours });
      setSleepRecovery((prev) => [entry, ...prev].sort((a, b) => b.timestamp - a.timestamp));
      setUserData(prev => ({ ...prev, tempSleepHours: undefined }));
    }
  };

  const appContextValue = {
    userId: session?.user?.id,
    userData,
    setUserData: setUserDataOnline,
    userStats,
    userGoals,
    setUserGoals: setUserGoalsOnline,
    sleepRecovery,
    setSleepRecovery,
    plan,
    isLoading: planLoading,
    workoutHistory,
    isRefreshing,
    generatePlan: (type: 'workout' | 'nutrition' | 'history' | 'settings') => handleGenerate(type, workoutHistory),
    resetPlan: handleReset,
    startTracking: handleStartTracking,
    updatePlan: handleUpdatePlan,
    completeWorkout: handleCompleteWorkoutWithSleep,
    completeNutrition: handleCompleteNutrition,
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
              </div>

              <div className="transition-all duration-500 ease-in-out">
                <div id="tour-tabs" className="sticky top-4 z-50 mb-8 max-w-2xl mx-auto">
                  <PlanTabs
                    activeTab={viewMode}
                    onTabChange={(tab) => setViewMode(tab)}
                    className="shadow-2xl"
                  />
                </div>

                {viewMode === 'settings' && session?.user ? (
                  <Suspense fallback={<div className="h-64 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div></div>}>
                    <AccountSettings
                      user={session.user}
                      onLogout={signOut}
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

                {viewMode === 'nutrition' && (
                  plan?.nutrition?.isGenerated ? (
                    <Suspense fallback={<div className="h-64 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div></div>}>
                      <NutritionDisplay
                        plan={plan}
                        onReset={handleReset}
                        onUpdatePlan={handleUpdatePlan}
                        onCompleteNutrition={handleCompleteNutrition}
                      />
                    </Suspense>
                  ) : (
                    <div className="max-w-2xl mx-auto space-y-4">
                      <Suspense fallback={<div className="h-64 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div></div>}>
                        <UserForm activeTab="nutrition" />
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
      </div>
    </AppProvider>
  );
}

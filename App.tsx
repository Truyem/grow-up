import React, { useEffect, useState } from 'react';

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

import { UserForm } from './components/UserForm';
import { PlanDisplay } from './components/PlanDisplay';
import { NutritionDisplay } from './components/NutritionDisplay';
import { AuthPage } from './components/AuthPage';
import { OnboardingTour } from './components/OnboardingTour';
import { AccountSettings } from './components/AccountSettings';

import { Toast } from './components/ui/Toast';
import { LoadingAnimation } from './components/ui/LoadingAnimation';
import { PlanTabs } from './components/ui/PlanTabs';
import { Sparkles, Settings } from 'lucide-react';

import { scheduleAllDailyNotifications } from './services/scheduleNotifications';
import { AppProvider } from './context';

import {
  useAuth,
  useUserData,
  useWorkoutHistory,
  usePlanManager,
  useAutoSave,
  useTour,
  useSupabaseSleepRecoverySync,
  useSupabaseProfileSync,
  useSupabaseWorkoutHistorySync,
} from './hooks';

export default function App() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => setToastMessage(msg);

  // 1. Auth Hook
  const { session, isAuthChecking, signOut } = useAuth();

  // 2. User Data Hook
  const {
    userData, setUserData,
    userStats, setUserStats,
    userGoals, setUserGoals,
    sleepRecovery, setSleepRecovery,
  } = useUserData();

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
  } = usePlanManager(userData, session);

  // 4. Workout History Hook
  const {
    workoutHistory, setWorkoutHistory,
    handleCompleteWorkout,
    handleCompleteNutrition,
    handleDeleteHistoryItem,
    handleRefreshHistory,
    handleSickDay,
    isRefreshing,
    calculateStreak
  } = useWorkoutHistory(userData, userStats, setUserStats, plan, setPlan, showToast);

  // Auto-update streak
  useEffect(() => {
    const newStreak = calculateStreak();
    if (newStreak !== userStats.streak) {
      const updatedStats = { ...userStats, streak: newStreak };
      setUserStats(updatedStats);
    }
  }, [workoutHistory, calculateStreak, userStats, setUserStats]);

  // 5. Auto Save Hook
  useAutoSave(workoutHistory, setWorkoutHistory, userData, setPlan, setViewMode, setUserData, showToast);

  // 6. Tour Hook
  const { isTourOpen, tourSteps, handleTourComplete } = useTour(
    userData, setUserData, planLoading, setViewMode, setPlan, handleStartTracking, showToast
  );

  // 7. Supabase background sync (localStorage -> cloud)
  useSupabaseProfileSync(
    session?.user?.id,
    userData, setUserData,
    userStats, setUserStats,
    userGoals, setUserGoals
  );
  useSupabaseWorkoutHistorySync(session?.user?.id, workoutHistory);
  useSupabaseSleepRecoverySync(session?.user?.id, sleepRecovery, setSleepRecovery);

  // Native Notifications
  useEffect(() => {
    if (!session?.user) return;
    scheduleAllDailyNotifications(plan || undefined).catch((e) => {
      console.warn('[Notifications] Failed to schedule daily notifications:', e);
    });
  }, [session?.user?.id, plan]);

  const isLoading = planLoading || isAuthChecking;
  const handleCompleteWorkoutWithSleep = (
    levelSelected: string,
    summary: string,
    completedExercises: string[],
    userNotes: string,
    nutrition: any,
    exerciseLogs?: any[]
  ) => {
    handleCompleteWorkout(levelSelected, summary, completedExercises, userNotes, nutrition, exerciseLogs);

    if (userData.tempSleepHours !== undefined && userData.tempSleepHours > 0) {
      const { createSleepRecoveryEntry } = require('./services/sleepRecoveryService');
      const entry = createSleepRecoveryEntry({ sleepHours: userData.tempSleepHours });
      setSleepRecovery((prev) => [entry, ...prev].sort((a, b) => b.timestamp - a.timestamp));
      setUserData(prev => ({ ...prev, tempSleepHours: undefined }));
    }
  };

  const appContextValue = {
    userData,
    setUserData,
    userStats,
    userGoals,
    setUserGoals,
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
  };

  return (
    <AppProvider value={appContextValue}>
      <div className="relative h-dvh min-h-dvh font-sans selection:bg-cyan-500/30 selection:text-cyan-100">
        {isLoading && <LoadingAnimation streamingText={isStreaming ? streamingText : undefined} />}

        {!isAuthChecking && !session ? (
          <AuthPage />
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
                  <AccountSettings
                    user={session.user}
                    onLogout={signOut}
                  />
                ) : null}

                {viewMode === 'workout' && (
                  plan?.workout?.isGenerated ? (
                    <PlanDisplay
                      plan={plan}
                      onReset={handleReset}
                      onComplete={handleCompleteWorkout}
                      onUpdatePlan={handleUpdatePlan}
                    />
                  ) : (
                    <div className="max-w-2xl mx-auto space-y-4">
                      <UserForm activeTab="workout" />
                    </div>
                  )
                )}

                {viewMode === 'nutrition' && (
                  plan?.nutrition?.isGenerated ? (
                    <NutritionDisplay
                      plan={plan}
                      onReset={handleReset}
                      onUpdatePlan={handleUpdatePlan}
                      onCompleteNutrition={handleCompleteNutrition}
                    />
                  ) : (
                    <div className="max-w-2xl mx-auto space-y-4">
                      <UserForm activeTab="nutrition" />
                    </div>
                  )
                )}

                {viewMode === 'history' && (
                  <div className="max-w-2xl mx-auto space-y-4">
                    <UserForm activeTab="history" />
                  </div>
                )}

                {isTourOpen && (
                  <OnboardingTour
                    steps={tourSteps}
                    isOpen={isTourOpen}
                    onComplete={handleTourComplete}
                    onSkip={handleTourComplete}
                  />
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
          type="success"
          duration={6000}
        />
      </div>
    </AppProvider>
  );
}

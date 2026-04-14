import React, { createContext, useContext } from 'react';
import type { ExerciseLog, UserGoals, UserInput, UserStats, WorkoutHistoryItem, DailyPlan, AchievementBadge } from '../types';

type GenerateType = 'workout' | 'history' | 'settings';

export interface AppContextValue {
  userId?: string;
  userData: UserInput;
  setUserData: React.Dispatch<React.SetStateAction<UserInput>>;
  userStats: UserStats;
  userGoals: UserGoals | null;
  setUserGoals: React.Dispatch<React.SetStateAction<UserGoals | null>>;
  achievements: AchievementBadge[];
  plan: DailyPlan | null;
  isLoading: boolean;
  workoutHistory: WorkoutHistoryItem[];
  isRefreshing: boolean;
  generatePlan: (type: GenerateType) => Promise<void>;
  resetPlan: (type: 'workout') => void;
  startTracking: () => void;
  updatePlan: (updatedPlan: DailyPlan) => void;
  saveSleep: (sleepStart: string, sleepEnd: string) => Promise<void>;
  completeWorkout: (
    levelSelected: string,
    summary: string,
    completedExercises: string[],
    userNotes: string,
    nutrition: DailyPlan['nutrition'],
    exerciseLogs?: ExerciseLog[]
  ) => Promise<void>;
  deleteHistoryItem: (timestamp: number) => Promise<void>;
  refreshHistory: () => Promise<void>;
  sickDay: () => Promise<void>;
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ value: AppContextValue; children: React.ReactNode }> = ({ value, children }) => {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = (): AppContextValue => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

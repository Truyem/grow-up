import React, { createContext, useContext } from 'react';
import type { ExerciseLog, UserGoals, UserInput, UserStats, WorkoutHistoryItem, DailyPlan, SleepRecoveryEntry } from '../types';

type GenerateType = 'workout' | 'nutrition' | 'history' | 'settings';

export interface AppContextValue {
  userData: UserInput;
  setUserData: React.Dispatch<React.SetStateAction<UserInput>>;
  userStats: UserStats;
  userGoals: UserGoals | null;
  setUserGoals: React.Dispatch<React.SetStateAction<UserGoals | null>>;
  sleepRecovery: SleepRecoveryEntry[];
  setSleepRecovery: React.Dispatch<React.SetStateAction<SleepRecoveryEntry[]>>;
  plan: DailyPlan | null;
  isLoading: boolean;
  workoutHistory: WorkoutHistoryItem[];
  isRefreshing: boolean;
  generatePlan: (type: GenerateType) => Promise<void>;
  resetPlan: (type: 'workout' | 'nutrition') => void;
  startTracking: () => void;
  updatePlan: (updatedPlan: DailyPlan) => void;
  completeWorkout: (
    levelSelected: string,
    summary: string,
    completedExercises: string[],
    userNotes: string,
    nutrition: DailyPlan['nutrition'],
    exerciseLogs?: ExerciseLog[]
  ) => void;
  completeNutrition: (nutrition: DailyPlan['nutrition']) => void;
  deleteHistoryItem: (timestamp: number) => void;
  refreshHistory: () => Promise<void>;
  sickDay: () => void;
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

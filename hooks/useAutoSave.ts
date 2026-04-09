import { DailyPlan, WorkoutHistoryItem, UserInput } from '../types';

/**
 * Deprecated in strict online-only mode.
 * Kept as no-op for backward compatibility.
 */
export function useAutoSave(
  _workoutHistory: WorkoutHistoryItem[],
  _setWorkoutHistory: React.Dispatch<React.SetStateAction<WorkoutHistoryItem[]>>,
  _userData: UserInput,
  _setPlan: React.Dispatch<React.SetStateAction<DailyPlan | null>>,
  _setViewMode: (mode: 'workout' | 'nutrition' | 'history' | 'settings') => void,
  _setUserData: React.Dispatch<React.SetStateAction<UserInput>>,
  _showToast: (msg: string) => void
) {
  return;
}

import { supabase } from './supabase';
import { MuscleGroup } from '../types';

export interface WeeklyWorkoutAnalysis {
  sessionsThisWeek: number;
  recommendedSplit: 'full_body' | 'upper_lower' | 'ppl' | 'ppls';
  musclesWorkedThisWeek: MuscleGroup[];
  soreMuscles: MuscleGroup[];
  lastWorkoutDate: string | null;
  totalVolume: number; // Total sets across all exercises
  averageIntensity: number; // 1-10 scale
}

export interface WeeklyNutritionAnalysis {
  totalCaloriesConsumed: number;
  averageCaloriesPerDay: number;
  totalProteinConsumed: number;
  totalCarbsConsumed: number;
  totalFatsConsumed: number;
  mealsLogged: number;
  daysWithLogs: number;
}

export interface FullWeeklyAnalysis {
  workout: WeeklyWorkoutAnalysis;
  nutrition: WeeklyNutritionAnalysis;
  shouldAdjustPlan: boolean;
  notes: string;
}

/**
 * Get workout logs from last 7 days
 */
export const getWeeklyWorkoutLogs = async (userId: string) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);

  const { data: logs, error } = await supabase
    .from('workout_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate.toISOString().split('T')[0])
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching workout logs:', error);
    return [];
  }

  return logs || [];
};

/**
 * Extract muscle groups from workout data
 */
export const extractMuscleGroupsFromWorkout = (workoutData: any): MuscleGroup[] => {
  const muscleGroups = new Set<MuscleGroup>();

  if (!workoutData) return [];

  // Try to extract from detail or schedule field
  const content = workoutData.detail || workoutData.schedule || '';
  const contentStr = JSON.stringify(content).toLowerCase();

  // Map keywords to muscle groups
  const muscleKeywordMap: { [key: string]: MuscleGroup } = {
    'ngực|chest|bench|press': MuscleGroup.Chest,
    'vai|shoulder|deltoid|lateral raise': MuscleGroup.FrontDelts,
    'lưng|back|row|lat|lat pulldown': MuscleGroup.Lats,
    'tay trước|bicep|curl': MuscleGroup.Biceps,
    'tay sau|tricep|extension|dip': MuscleGroup.TricepsLong,
    'chân|leg|quad|squat|lunge': MuscleGroup.Quads,
    'đùi sau|hamstring|deadlift': MuscleGroup.Hamstrings,
    'mông|glute|hip thrust': MuscleGroup.Glutes,
    'bắp chân|calf': MuscleGroup.Calves,
    'bụng|ab|core|crunch': MuscleGroup.UpperAbs,
  };

  Object.entries(muscleKeywordMap).forEach(([keywords, muscle]) => {
    const keywordList = keywords.split('|');
    if (keywordList.some(kw => contentStr.includes(kw))) {
      muscleGroups.add(muscle);
    }
  });

  return Array.from(muscleGroups);
};

/**
 * Determine training split based on sessions per week
 */
export const determineTrainingSplit = (
  sessionsPerWeek: number,
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' = 'intermediate'
): 'full_body' | 'upper_lower' | 'ppl' | 'ppls' => {
  if (sessionsPerWeek <= 3) {
    return 'full_body';
  }
  if (sessionsPerWeek === 4) {
    return 'upper_lower';
  }
  if (sessionsPerWeek === 5) {
    return 'ppl';
  }
  if (sessionsPerWeek >= 6) {
    return experienceLevel === 'beginner' ? 'ppl' : 'ppls';
  }
  return 'full_body';
};

/**
 * Analyze weekly workout data
 */
export const analyzeWeeklyWorkouts = async (
  userId: string,
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' = 'intermediate'
): Promise<WeeklyWorkoutAnalysis> => {
  const logs = await getWeeklyWorkoutLogs(userId);

  const sessionsThisWeek = logs.length;
  const recommendedSplit = determineTrainingSplit(sessionsThisWeek, experienceLevel);

  // Extract muscle groups
  const allMusclesWorked = new Set<MuscleGroup>();
  logs.forEach(log => {
    const muscles = extractMuscleGroupsFromWorkout(log.data);
    muscles.forEach(m => allMusclesWorked.add(m));
  });

  // Calculate total volume (sets)
  let totalVolume = 0;
  logs.forEach(log => {
    if (log.data?.detail) {
      const detail = JSON.stringify(log.data.detail).toLowerCase();
      const setMatches = detail.match(/set|bộ|bộ|sets/g);
      totalVolume += setMatches ? setMatches.length : 3; // Default 3 sets per exercise
    }
  });

  // Average intensity (1-10)
  const averageIntensity = logs.length > 0 ? 6 : 0; // Default mid-range

  // Last workout date
  const lastWorkoutDate = logs.length > 0 ? logs[0].date : null;

  // Sore muscles (from UserInput or auto-detect)
  // For now, we'll leave this empty - should be updated from UserInput
  const soreMuscles: MuscleGroup[] = [];

  return {
    sessionsThisWeek,
    recommendedSplit,
    musclesWorkedThisWeek: Array.from(allMusclesWorked),
    soreMuscles,
    lastWorkoutDate,
    totalVolume,
    averageIntensity,
  };
};

/**
 * Get nutrition logs from last 7 days
 */
export const getWeeklyNutritionLogs = async (userId: string) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);

  const { data: logs, error } = await supabase
    .from('nutrition_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate.toISOString().split('T')[0])
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching nutrition logs:', error);
    return [];
  }

  return logs || [];
};

/**
 * Analyze weekly nutrition data
 */
export const analyzeWeeklyNutrition = async (userId: string): Promise<WeeklyNutritionAnalysis> => {
  const logs = await getWeeklyNutritionLogs(userId);

  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFats = 0;
  const daysWithLogs = new Set<string>();

  logs.forEach(log => {
    totalCalories += log.total_calories || 0;
    daysWithLogs.add(log.date);

    if (log.macros) {
      totalProtein += log.macros.protein || 0;
      totalCarbs += log.macros.carbs || 0;
      totalFats += log.macros.fats || 0;
    }
  });

  const averageCaloriesPerDay =
    daysWithLogs.size > 0 ? Math.round(totalCalories / daysWithLogs.size) : 0;

  return {
    totalCaloriesConsumed: totalCalories,
    averageCaloriesPerDay,
    totalProteinConsumed: totalProtein,
    totalCarbsConsumed: totalCarbs,
    totalFatsConsumed: totalFats,
    mealsLogged: logs.length,
    daysWithLogs: daysWithLogs.size,
  };
};

/**
 * Full weekly analysis combining workout and nutrition
 */
export const analyzeFullWeek = async (
  userId: string,
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' = 'intermediate'
): Promise<FullWeeklyAnalysis> => {
  const [workout, nutrition] = await Promise.all([
    analyzeWeeklyWorkouts(userId, experienceLevel),
    analyzeWeeklyNutrition(userId),
  ]);

  // Determine if plan should be adjusted
  let shouldAdjustPlan = false;
  let notes = '';

  if (workout.sessionsThisWeek === 0) {
    shouldAdjustPlan = true;
    notes = 'No workouts logged this week. Consider adding training sessions.';
  }

  if (nutrition.daysWithLogs < 4) {
    shouldAdjustPlan = true;
    notes += ' Insufficient nutrition logging data. Log more meals for better analysis.';
  }

  if (workout.averageIntensity < 5 && nutrition.averageCaloriesPerDay < 1500) {
    shouldAdjustPlan = true;
    notes += ' Low activity and calorie intake detected. May need to review plan.';
  }

  return {
    workout,
    nutrition,
    shouldAdjustPlan,
    notes: notes.trim(),
  };
};

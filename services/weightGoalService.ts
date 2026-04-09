import { NutritionGoal } from '../types';
import { supabase } from './supabase';

export interface WeightGoalAnalysis {
  currentWeight: number;
  targetWeight: number;
  weightDifference: number;
  weightTrend: 'increasing' | 'decreasing' | 'stable';
  weeklyWeightChangeTarget: number;
  bmr: number;
  tdee: number;
  dailyCalorieTarget: number;
  macros: {
    protein: number;
    carbs: number;
    fats: number;
  };
  estimatedWeeksToGoal: number;
}

/**
 * Calculate BMR using Mifflin-St Jeor formula
 * BMR = 10*weight(kg) + 6.25*height(cm) - 5*age(years) + s
 * s = +5 for male, -161 for female
 */
export const calculateBMR = (
  weight: number,
  height: number,
  age: number,
  isMale: boolean = true
): number => {
  return 10 * weight + 6.25 * height - 5 * age + (isMale ? 5 : -161);
};

/**
 * Calculate TDEE based on activity level
 * Activity factors:
 * - Sedentary: 1.2
 * - Lightly active (1-3 days/week): 1.375
 * - Moderately active (3-5 days/week): 1.55
 * - Very active (6-7 days/week): 1.725
 * - Extremely active (2x/day): 1.9
 */
export const calculateTDEE = (
  bmr: number,
  sessionsPerWeek: number
): number => {
  let activityFactor = 1.2; // Sedentary

  if (sessionsPerWeek >= 1 && sessionsPerWeek <= 3) {
    activityFactor = 1.375;
  } else if (sessionsPerWeek >= 3 && sessionsPerWeek <= 5) {
    activityFactor = 1.55;
  } else if (sessionsPerWeek >= 6 && sessionsPerWeek <= 7) {
    activityFactor = 1.725;
  } else if (sessionsPerWeek > 7) {
    activityFactor = 1.9;
  }

  return Math.round(bmr * activityFactor);
};

/**
 * Calculate daily calorie target based on goal
 * - Cutting: TDEE - 500 kcal (0.5 kg/week loss)
 * - Bulking: TDEE + 300 kcal (0.3 kg/week gain)
 */
export const calculateDailyCalorieTarget = (
  tdee: number,
  goal: NutritionGoal
): number => {
  if (goal === 'cutting') {
    return Math.round(tdee - 500);
  } else {
    // bulking
    return Math.round(tdee + 300);
  }
};

/**
 * Calculate macro targets (grams)
 * - Protein: varies by goal
 * - Carbs: remaining calories / 4
 * - Fats: remaining calories / 9
 */
export const calculateMacros = (
  weight: number,
  dailyCalories: number,
  goal: NutritionGoal
): { protein: number; carbs: number; fats: number } => {
  // Protein (g/kg)
  const proteinPerKg = goal === 'cutting' ? 2.2 : 2.0;
  const protein = Math.round(weight * proteinPerKg);
  const proteinCalories = protein * 4;

  // Remaining calories for carbs & fats (40% carbs, 60% fats ratio)
  const remainingCalories = dailyCalories - proteinCalories;
  const carbCalories = Math.round(remainingCalories * 0.6);
  const fatCalories = remainingCalories - carbCalories;

  return {
    protein,
    carbs: Math.round(carbCalories / 4),
    fats: Math.round(fatCalories / 9),
  };
};

/**
 * Get weight trend from last 7 days
 */
export const getWeightTrend = async (
  userId: string,
  days: number = 7
): Promise<'increasing' | 'decreasing' | 'stable'> => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data: weights, error } = await supabase
    .from('weight_logs')
    .select('weight, date')
    .eq('user_id', userId)
    .gte('date', startDate.toISOString().split('T')[0])
    .order('date', { ascending: true });

  if (error || !weights || weights.length < 2) {
    return 'stable';
  }

  const firstWeight = weights[0].weight;
  const lastWeight = weights[weights.length - 1].weight;
  const difference = lastWeight - firstWeight;

  if (difference > 0.5) return 'increasing';
  if (difference < -0.5) return 'decreasing';
  return 'stable';
};

/**
 * Get average weight from last N days
 */
export const getAverageWeight = async (
  userId: string,
  days: number = 7
): Promise<number> => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data: weights, error } = await supabase
    .from('weight_logs')
    .select('weight')
    .eq('user_id', userId)
    .gte('date', startDate.toISOString().split('T')[0]);

  if (error || !weights || weights.length === 0) {
    return 0;
  }

  const sum = weights.reduce((acc, w) => acc + parseFloat(w.weight.toString()), 0);
  return Math.round((sum / weights.length) * 100) / 100;
};

/**
 * Calculate comprehensive weight goal analysis
 */
export const analyzeWeightGoal = async (
  userId: string,
  height: number,
  age: number,
  isMale: boolean = true,
  goal: NutritionGoal,
  sessionsPerWeek: number
): Promise<WeightGoalAnalysis> => {
  // Get current and target weight from profiles
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('current_weight, target_weight, target_date')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    throw new Error('Failed to fetch user profile');
  }

  const currentWeight = profile.current_weight || 75; // Default if not set
  const targetWeight = profile.target_weight || 70;
  const weightDifference = targetWeight - currentWeight;

  // Calculate BMR and TDEE
  const bmr = calculateBMR(currentWeight, height, age, isMale);
  const tdee = calculateTDEE(bmr, sessionsPerWeek);
  const dailyCalorieTarget = calculateDailyCalorieTarget(tdee, goal);
  const macros = calculateMacros(currentWeight, dailyCalorieTarget, goal);

  // Get weight trend
  const weightTrend = await getWeightTrend(userId, 7);

  // Calculate weekly weight change target
  let weeklyWeightChangeTarget = 0;
  if (goal === 'cutting') {
    weeklyWeightChangeTarget = -0.5; // 0.5 kg/week loss
  } else {
    weeklyWeightChangeTarget = 0.3; // 0.3 kg/week gain
  }

  // Estimate weeks to goal
  const estimatedWeeksToGoal =
    Math.abs(weightDifference) > 0
      ? Math.ceil(Math.abs(weightDifference) / Math.abs(weeklyWeightChangeTarget))
      : 0;

  return {
    currentWeight,
    targetWeight,
    weightDifference,
    weightTrend,
    weeklyWeightChangeTarget,
    bmr,
    tdee,
    dailyCalorieTarget,
    macros,
    estimatedWeeksToGoal,
  };
};

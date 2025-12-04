
export enum FatigueLevel {
  Fresh = 'Khỏe',
  Normal = 'Bình thường',
  Tired = 'Mệt',
}

export enum MuscleGroup {
  Chest = 'Ngực',
  Shoulders = 'Vai',
  Arms = 'Tay',
  Back = 'Lưng',
  Legs = 'Chân',
  None = 'Không đau',
}

export enum Intensity {
  Medium = 'medium',
  Hard = 'hard',
}

export type NutritionGoal = 'bulking' | 'cutting';

export interface UserInput {
  weight: number;
  height: number;
  fatigue: FatigueLevel;
  soreMuscles: MuscleGroup[];
  selectedIntensity: Intensity;
  nutritionGoal: NutritionGoal; // New field
  equipment: string[]; // List of available equipment
  availableIngredients: string[]; // Ingredients currently in fridge
  consumedFood: string[]; // Food already consumed today
}

export interface UserStats {
  xp: number;
  level: number;
  streak: number;
  lastLoginDate: string;
}

export interface Exercise {
  name: string;
  sets: number;
  reps: string; 
  notes?: string;
  equipment?: string;
  colorCode?: 'Red' | 'Blue' | 'Yellow' | 'Green';
  isBFR?: boolean;
}

export interface Meal {
  name: string;
  calories: number;
  protein: number;
  description: string;
  estimatedPrice: number; // Price in VND
}

export interface WorkoutLevel {
  levelName: string; // "Vừa sức", "Thử thách"
  description: string;
  morning: Exercise[]; // Split session
  evening: Exercise[]; // Split session
}

export interface Schedule {
  suggestedWorkoutTime: string;
  suggestedSleepTime: string;
  reasoning: string;
}

export interface DailyPlan {
  date: string;
  schedule: Schedule; // New field for time optimization
  workout: {
    summary: string;
    detail: WorkoutLevel; // Changed from 'levels' object to single 'detail'
  };
  nutrition: {
    totalCalories: number;
    totalProtein: number;
    totalCost: number; // Total daily cost in VND
    meals: Meal[];
    advice: string;
  };
}

export interface WorkoutHistoryItem {
  date: string;
  timestamp: number;
  levelSelected: string;
  summary: string;
  completedExercises: string[];
  userNotes?: string;
  exercisesSummary?: string;
  nutrition?: { // Added nutrition to history
    totalCalories: number;
    totalProtein: number;
    totalCost?: number;
    meals: Meal[];
  };
  xpGained?: number; // New field for gamification history
}

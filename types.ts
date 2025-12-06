
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

export type TrainingMode = 'standard' | 'saitama';

export interface UserInput {
  weight: number;
  height: number;
  fatigue: FatigueLevel;
  soreMuscles: MuscleGroup[];
  selectedIntensity: Intensity;
  nutritionGoal: NutritionGoal;
  trainingMode: TrainingMode; // New field
  equipment: string[]; // List of available equipment
  availableIngredients: string[]; // Ingredients currently in fridge
  consumedFood: string[]; // Food already consumed today
}

export interface UserStats {
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
  schedule: Schedule;
  workout: {
    summary: string;
    detail: WorkoutLevel;
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
  nutrition?: {
    totalCalories: number;
    totalProtein: number;
    totalCost?: number;
    meals: Meal[];
  };
}


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

export interface UserInput {
  weight: number;
  height: number;
  fatigue: FatigueLevel;
  soreMuscles: MuscleGroup[];
  selectedIntensity: Intensity;
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
  exercises: Exercise[];
}

export interface DailyPlan {
  date: string;
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
}
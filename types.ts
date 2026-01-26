

export enum FatigueLevel {
  Fresh = 'Khỏe',
  Normal = 'Bình thường',
  Tired = 'Mệt',
}

export enum MuscleGroup {
  // Chest (Ngực)
  ChestUpper = 'Ngực trên',
  ChestMiddle = 'Ngực giữa',
  ChestLower = 'Ngực dưới',

  // Shoulders (Vai)
  FrontDelts = 'Vai trước',
  SideDelts = 'Vai giữa',
  RearDelts = 'Vai sau',

  // Back (Lưng)
  UpperBack = 'Lưng trên',
  Lats = 'Lưng xô',
  LowerBack = 'Lưng dưới',
  Traps = 'Cơ thang',

  // Arms (Tay)
  Biceps = 'Tay trước',
  TricepsLong = 'Tay sau (Đầu dài)',
  TricepsLateral = 'Tay sau (Đầu bên)',
  Forearms = 'Cẳng tay',

  // Legs (Chân)
  Quads = 'Đùi trước',
  Hamstrings = 'Đùi sau',
  Glutes = 'Mông',
  Calves = 'Bắp chân',

  // Core (Bụng)
  UpperAbs = 'Bụng trên',
  LowerAbs = 'Bụng dưới',
  Obliques = 'Bụng chéo',

  None = 'Không đau',
}

export enum Intensity {
  Low = 'low',
  Medium = 'medium',
  Hard = 'hard',
}

export enum HealthCondition {
  Good = 'Good',
  Tired = 'Tired',
  Injured = 'Injured',
}

export type NutritionGoal = 'bulking' | 'cutting';

export type TrainingMode = 'calis' | 'gym';

export interface UserInput {
  weight: number;
  height: number;
  fatigue: FatigueLevel;
  healthCondition: HealthCondition; // New field
  soreMuscles: MuscleGroup[];
  selectedIntensity: Intensity;
  nutritionGoal: NutritionGoal;
  trainingMode: TrainingMode;
  useCreatine: boolean; // New field
  equipment: string[];
  availableIngredients: Ingredient[];
  consumedFood: string[];
}

export interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category?: 'protein' | 'carb' | 'fat' | 'veg' | 'spice' | 'other';
  expiryDate?: string;
  caloriesPer100g?: number;
}

export interface Expense {
  id: string;
  name: string;
  category: 'supplement' | 'equipment' | 'food' | 'other';
  price: number;
  date: string;
  note?: string;
}

export interface UserStats {
  streak: number;
  lastLoginDate: string;
}

export type ExerciseColor = 'Red' | 'Blue' | 'Yellow' | 'Green' | 'Pink' | 'Purple' | 'Orange';

export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  notes?: string;
  equipment?: string;
  colorCode?: ExerciseColor;
  isBFR?: boolean;
  primaryMuscleGroups?: string[];    // Main muscles worked (e.g., "Chest - Upper", "Triceps")
  secondaryMuscleGroups?: string[];  // Supporting muscles
}

export interface Meal {
  name: string;
  calories: number;
  protein: number;
  description: string;
  carbs?: number;
  fat?: number;
}

export interface WorkoutLevel {
  levelName: string;
  description: string;
  morning: Exercise[];
  evening: Exercise[];
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
    isGenerated?: boolean; // New flag
  };
  nutrition: {
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
    consumedIngredients?: { name: string, quantity: number, unit: string }[];
    meals: Meal[];
    advice: string;
    isGenerated?: boolean; // New flag
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
    totalCarbs?: number; // Optional for backward compatibility
    totalFat?: number;   // Optional for backward compatibility
    totalCost?: number;
    consumedIngredients?: { name: string, quantity: number, unit: string }[];
    meals: Meal[];

  };
  weight?: number; // Recorded weight for that day
}

// AI Overview - Insights from Gemini AI about workout progress
export interface AIOverview {
  summary: string;           // Tóm tắt tiến trình tổng quan
  strengths: string[];       // Điểm mạnh của user
  improvements: string[];    // Những gì cần cải thiện
  recommendation: string;    // Đề xuất bước tiếp theo
  motivationalQuote: string; // Quote động viên
  weeklyStats: {
    workoutsCompleted: number;
    totalExercises: number;
    estimatedCaloriesBurned: number;
    consistency: number;     // 0-100 percentage
  };
}
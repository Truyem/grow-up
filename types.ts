

export enum FatigueLevel {
  Fresh = 'Khỏe',
  Normal = 'Bình thường',
  Tired = 'Mệt',
}

export enum MuscleGroup {
  // Chest (Ngực)
  Chest = 'Ngực',

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

export type TrainingMode = 'calis' | 'gym' | 'home';

// ============================================================
// Goal Setting
// ============================================================
export interface WeeklyGoal {
  sessionsPerWeek: number;      // Số buổi tập mục tiêu mỗi tuần
  targetWeightKg?: number;      // Cân nặng mục tiêu (kg)
  targetDate?: string;          // Ngày đạt mục tiêu (ISO string)
  weeklyCalorieDeficit?: number; // Thâm hụt/dư calo mỗi tuần (kcal)
  notes?: string;
}

export interface UserGoals {
  weekly: WeeklyGoal;
  createdAt: string;
  updatedAt: string;
}

export interface UserInput {
  weight: number;
  height: number;
  age: number;
  fatigue: FatigueLevel;
  healthCondition: HealthCondition; // New field
  soreMuscles: MuscleGroup[];
  selectedIntensity: Intensity;
  nutritionGoal: NutritionGoal;
  trainingMode: TrainingMode;
  useCreatine: boolean; // New field
  equipment: string[];
  consumedFood: string[];
  hasSeenOnboarding: boolean;
}

export interface UserStats {
  streak: number;
  lastLoginDate: string;
}

export type ExerciseColor = 'Red' | 'Blue' | 'Yellow' | 'Green' | 'Pink' | 'Purple' | 'Orange';

export interface ExerciseSetLog {
  weight: number; // kg
  reps: number;
}

export interface ExerciseLog {
  exerciseName: string;
  sets: ExerciseSetLog[];
  totalVolume: number; // Σ(weight × reps)
}

export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  notes?: string;
  equipment?: string;
  colorCode?: ExerciseColor;
  isBFR?: boolean;
   primaryMuscleGroups?: string[];    // Main muscles worked (e.g., "Chest", "Triceps")
  secondaryMuscleGroups?: string[];  // Supporting muscles
}

export interface Meal {
  name: string;
  calories: number;
  protein: number;
  description: string;
  carbs?: number;
  fat?: number;
  consumed?: boolean;
  usedFridgeItems?: { id: string; amountUsed: number }[];
  fridgeDeducted?: boolean;
}

export interface FridgeItem {
  id: string;
  user_id: string;
  name: string;
  quantity: number;
  unit: string;
  created_at?: string;
}

export interface WorkoutLevel {
  levelName: string;
  description: string;
  warmup?: Exercise[];
  morning: Exercise[];
  evening: Exercise[];
  cooldown?: Exercise[];
}

export interface DailyPlan {
  date: string;
  schedule?: {
    suggestedWorkoutTime?: string;
    suggestedSleepTime?: string;
    reasoning?: string;
  };
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
    meals: Meal[];
    advice: string;
    isGenerated?: boolean; // New flag
  };
  workoutProgress?: {
    checkedState: Record<string, boolean>;
    userNote?: string;
    exerciseLogs?: Record<string, ExerciseLog>; // key = exercise key (e.g. "mor-0")
  };
}

export interface WorkoutHistoryItem {
  id?: string; // Supabase UUID
  recordType?: 'workout' | 'nutrition' | 'sleep';
  date: string;
  timestamp: number;
  levelSelected: string;
  summary: string;
  completedExercises: string[];
  userNotes?: string;
  exercisesSummary?: string;
  exerciseLogs?: ExerciseLog[]; // Weight/rep tracking per exercise
  completedSchedule?: string[];
  nutrition?: {
    totalCalories: number;
    totalProtein: number;
    totalCarbs?: number; // Optional for backward compatibility
    totalFat?: number;   // Optional for backward compatibility
    meals: Meal[];

  };
  weight?: number; // Recorded weight for that day
  sleepHours?: number;
  sleepQuality?: SleepQuality;
}

export interface PersonalRecord {
  exerciseName: string;
  maxEstimated1RM: number;
  maxVolume: number;
  maxWeight: number;
  bestSetReps: number;
  achievedAt: number;
}

export type SleepQuality = 'bad' | 'average' | 'good';

export interface SleepRecoveryEntry {
  id: string;
  timestamp: number;
  date: string;
  sleepStart: string;
  sleepEnd: string;
  sleepHours: number;
  sleepQuality: SleepQuality;
}

export interface AchievementBadge {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  progressText: string;
}

export interface ProfileSettings {
  userData?: UserInput;
  userStats?: UserStats;
  userGoals?: UserGoals;
  supplementLog?: {
    date: string;
    water_ml: number;
    whey: boolean;
    creatine: boolean;
    vitamin: boolean;
    omega3: boolean;
    lastUpdated: number;
  };
  achievements?: AchievementBadge[];
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

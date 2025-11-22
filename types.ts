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

export interface UserInput {
  weight: number;
  height: number;
  fatigue: FatigueLevel;
  soreMuscles: MuscleGroup[];
  // Day is now handled automatically, removing manual input
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
}

export interface WorkoutLevel {
  levelName: string; // "Nhẹ nhàng", "Vừa sức", "Thử thách"
  description: string;
  exercises: Exercise[];
}

export interface DailyPlan {
  date: string;
  workout: {
    summary: string;
    levels: {
      easy: WorkoutLevel;
      medium: WorkoutLevel;
      hard: WorkoutLevel;
    }
  };
  nutrition: {
    totalCalories: number;
    totalProtein: number;
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
}
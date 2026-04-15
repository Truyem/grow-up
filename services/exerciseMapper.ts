// Wrkout to Grow-up muscle group mapping
export const MUSCLE_GROUP_MAPPING: Record<string, string[]> = {
  // Arms
  biceps: ['Tay trước'],
  triceps: ['Tay sau (Đầu dài)', 'Tay sau (Đầu bên)'],
  forearms: ['Cẳng tay'],
  
  // Chest
  chest: ['Ngực'],
  
  // Shoulders
  'front deltoids': ['Vai trước'],
  'front delts': ['Vai trước'],
  'side deltoids': ['Vai giữa'],
  'side delts': ['Vai giữa'],
  'rear deltoids': ['Vai sau'],
  'rear delts': ['Vai sau'],
  'deltoids': ['Vai trước', 'Vai giữa', 'Vai sau'],
  
  // Back
  lats: ['Lưng xô'],
  'upper back': ['Lưng trên'],
  traps: ['Cơ thang'],
  'lower back': ['Lưng dưới'],
  erector: ['Lưng dưới'],
  
  // Legs
  quadriceps: ['Đùi trước'],
  quads: ['Đùi trước'],
  hamstrings: ['Đùi sau'],
  glutes: ['Mông'],
  calves: ['Bắp chân'],
  adductors: ['Mông'],
  
  // Core
  abs: ['Bụng trên', 'Bụng dưới'],
  'abs (upper)': ['Bụng trên'],
  'abs (lower)': ['Bụng dưới'],
  obliques: ['Bụng chéo'],
  'full body': ['Full Body'],
  'cardiovascular system': ['Cardio'],
};

// Color mapping based on category
export const CATEGORY_TO_COLOR: Record<string, string> = {
  strength: 'Red',
  stretching: 'Green',
  cardio: 'Orange',
  'plyometrics': 'Yellow',
  strongman: 'Purple',
  olympic_lifting: 'Blue',
  powerlifting: 'Red',
  crossfit: 'Pink',
};

// Equipment mapping
export const EQUIPMENT_MAPPING: Record<string, string> = {
  barbell: 'Tạ đòn',
  dumbbell: 'Tạ đơn',
  kettlebell: 'Kettlebell',
  cable: 'Cable Machine',
  machine: 'Máy tập',
  bodyweight: 'Không cần',
  'weight plate': 'Đĩa tạ',
  bands: 'Dây kháng lực',
  'exercise ball': 'Bóng tập',
  'foam roll': 'Foam Roller',
  other: 'Khác',
  none: 'Không cần',
  ez_bar: 'Tạ EZ',
  smith_machine: 'Smith Machine',
  pullup_bar: 'Xà đơn',
  bench: 'Ghế tập',
};

// Force type to exercise characteristics
export const FORCE_MAPPING: Record<string, { primary?: string[]; secondary?: string[] }> = {
  pull: { primary: ['Tay trước', 'Lưng xô', 'Lưng trên'] },
  push: { primary: ['Ngực', 'Vai trước', 'Tay sau (Đầu dài)'] },
  pushdown: { primary: ['Tay sau (Đầu bên)'] },
  pullup: { primary: ['Lưng xô', 'Tay trước'] },
};

// Level mapping
export const LEVEL_MAPPING: Record<string, string> = {
  beginner: 'Dễ',
  intermediate: 'Trung bình',
  advanced: 'Khó',
  expert: 'Chuyên gia',
};

// Default sets/reps based on level
export const DEFAULT_SETS_REPS: Record<string, { sets: number; reps: string }> = {
  beginner: { sets: 3, reps: '12-15' },
  intermediate: { sets: 4, reps: '8-12' },
  advanced: { sets: 4, reps: '6-10' },
  expert: { sets: 5, reps: '5-8' },
};

// Category to Vietnamese translation
export const CATEGORY_TRANSLATION: Record<string, string> = {
  strength: 'Sức mạnh',
  stretching: 'Giãn cơ',
  cardio: 'Tim mạch',
  plyometrics: 'Bật nhảy',
  strongman: 'Sức mạnh',
  olympic_lifting: 'Olympic Lifting',
  powerlifting: 'Powerlifting',
  crossfit: 'Crossfit',
};

// Convert wrkout exercise to grow-up format
export function transformExercise(wrkoutExercise: WrkoutExercise): Exercise {
  const primaryMuscleGroups = (wrkoutExercise.primaryMuscles || []).flatMap(
    m => MUSCLE_GROUP_MAPPING[m.toLowerCase()] || []
  );
  
  const secondaryMuscleGroups = (wrkoutExercise.secondaryMuscles || []).flatMap(
    m => MUSCLE_GROUP_MAPPING[m.toLowerCase()] || []
  );
  
  const defaultSetsReps = DEFAULT_SETS_REPS[wrkoutExercise.level || 'beginner'] || DEFAULT_SETS_REPS.beginner;
  
  return {
    name: wrkoutExercise.name,
    sets: defaultSetsReps.sets,
    reps: defaultSetsReps.reps,
    notes: wrkoutExercise.instructions?.slice(0, 2).join('. '),
    equipment: EQUIPMENT_MAPPING[wrkoutExercise.equipment?.toLowerCase() || ''] || wrkoutExercise.equipment,
    colorCode: (CATEGORY_TO_COLOR[wrkoutExercise.category || ''] as ExerciseColor) || 'Blue',
    primaryMuscleGroups: primaryMuscleGroups.length > 0 ? primaryMuscleGroups : undefined,
    secondaryMuscleGroups: secondaryMuscleGroups.length > 0 ? secondaryMuscleGroups : undefined,
    // Additional metadata from wrkout
    force: wrkoutExercise.force,
    mechanic: wrkoutExercise.mechanic,
    difficulty: LEVEL_MAPPING[wrkoutExercise.level || ''] || wrkoutExercise.level,
    category: CATEGORY_TRANSLATION[wrkoutExercise.category || ''] || wrkoutExercise.category,
    isBFR: false,
  };
}

// Types for wrkout exercise data
export interface WrkoutExercise {
  name: string;
  force?: string;
  level?: string;
  mechanic?: string;
  equipment?: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions?: string[];
  category?: string;
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
  primaryMuscleGroups?: string[];
  secondaryMuscleGroups?: string[];
  force?: string;
  mechanic?: string;
  difficulty?: string;
  category?: string;
}
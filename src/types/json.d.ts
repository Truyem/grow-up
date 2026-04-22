type ExerciseColor = 'Red' | 'Blue' | 'Yellow' | 'Green' | 'Pink' | 'Purple' | 'Orange';

interface Exercise {
  name: string;
  sets: number;
  reps: string;
  notes?: string;
  equipment?: string | null;
  colorCode?: ExerciseColor;
  force?: string | null;
  mechanic?: string | null;
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  primaryMuscleGroups?: string[];
  secondaryMuscleGroups?: string[];
  category?: string;
  isBFR?: boolean;
}

interface ExercisesJson {
  exercises: Exercise[];
  count?: number;
}

declare module '*.json' {
  const value: ExercisesJson;
  export default value;
}
import { Exercise, ExerciseColor } from '../types';

let exerciseData: { exercises: Exercise[] } | null = null;

interface ExerciseCache {
  exercises: Map<string, Exercise>;
  byMuscleGroup: Map<string, Exercise[]>;
  byEquipment: Map<string, Exercise[]>;
  loaded: boolean;
}

const cache: ExerciseCache = {
  exercises: new Map(),
  byMuscleGroup: new Map(),
  byEquipment: new Map(),
  loaded: false,
};

async function loadExerciseData(): Promise<Exercise[]> {
  if (exerciseData) return exerciseData.exercises;
  
  try {
    const module = await import('../data/exercises.json');
    exerciseData = module.default || module;
    return exerciseData.exercises || [];
  } catch (e) {
    console.error('Failed to load local exercises:', e);
    return [];
  }
}

async function initializeCache(): Promise<void> {
  if (cache.loaded) return;
  
  const exercises = await loadExerciseData();
  
  for (const ex of exercises) {
    cache.exercises.set(ex.name, ex);
    
    // Index by muscle group
    for (const group of ex.primaryMuscleGroups || []) {
      if (!cache.byMuscleGroup.has(group)) {
        cache.byMuscleGroup.set(group, []);
      }
      cache.byMuscleGroup.get(group)!.push(ex);
    }
    
    // Index by equipment
    if (ex.equipment) {
      if (!cache.byEquipment.has(ex.equipment)) {
        cache.byEquipment.set(ex.equipment, []);
      }
      cache.byEquipment.get(ex.equipment)!.push(ex);
    }
  }
  
  cache.loaded = true;
  console.log(`Loaded ${exercises.length} exercises from local data`);
}

export async function loadExercisesFromWrkout(forceRefresh = false): Promise<Exercise[]> {
  if (!forceRefresh && cache.loaded && cache.exercises.size > 0) {
    return Array.from(cache.exercises.values());
  }
  
  await initializeCache();
  return Array.from(cache.exercises.values());
}

export function getExercisesByMuscleGroup(muscleGroup: string): Exercise[] {
  return cache.byMuscleGroup.get(muscleGroup) || [];
}

export function getExercisesByEquipment(equipment: string): Exercise[] {
  return cache.byEquipment.get(equipment) || [];
}

export function searchExercises(query: string): Exercise[] {
  const q = query.toLowerCase();
  return Array.from(cache.exercises.values()).filter(
    e => e.name.toLowerCase().includes(q) || 
         e.primaryMuscleGroups?.some(m => m.toLowerCase().includes(q)) ||
         e.equipment?.toLowerCase().includes(q)
  );
}

export function getAllExercises(): Exercise[] {
  return Array.from(cache.exercises.values());
}

export function getAllMuscleGroups(): string[] {
  return Array.from(cache.byMuscleGroup.keys());
}

export function getAllEquipment(): string[] {
  return Array.from(cache.byEquipment.keys());
}

export function getAlternatives(exerciseName: string, limit = 5): Exercise[] {
  const exercise = cache.exercises.get(exerciseName);
  if (!exercise || !exercise.primaryMuscleGroups) return [];
  
  const alternatives: Exercise[] = [];
  for (const group of exercise.primaryMuscleGroups) {
    const groupExercises = cache.byMuscleGroup.get(group) || [];
    alternatives.push(...groupExercises.filter(e => e.name !== exerciseName));
  }
  
  return [...new Set(alternatives)].slice(0, limit);
}

// Preload on module init
initializeCache().catch(console.error);
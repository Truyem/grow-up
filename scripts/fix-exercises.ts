// Script to fix muscle group mapping in exercises.json
// Run with: npx tsx scripts/fix-exercises.ts

import { readFileSync, writeFileSync } from 'fs';

const MUSCLE_GROUP_MAPPING: Record<string, string[]> = {
  // Arms
  biceps: ['Tay trước'], 
  triceps: ['Tay sau (Đầu dài)', 'Tay sau (Đầu bên)'], 
  forearms: ['Cẳng tay'],
  // Chest
  chest: ['Ngực'],
  // Shoulders
  'front deltoids': ['Vai trước'], 'front delts': ['Vai trước'], 
  'side deltoids': ['Vai giữa'], 'side delts': ['Vai giữa'],
  'rear deltoids': ['Vai sau'], 'rear delts': ['Vai sau'], 
  deltoids: ['Vai trước', 'Vai giữa', 'Vai sau'],
  // Back
  lats: ['Lưng xô'], 'upper back': ['Lưng trên'], 'traps': ['Cơ thang'], 
  'lower back': ['Lưng dưới'], erector: ['Lưng dưới'],
  // Legs
  quadriceps: ['Đùi trước'], quads: ['Đùi trước'], 
  hamstrings: ['Đùi sau'], glutes: ['Mông'], calves: ['Bắp chân'],
  adductors: ['Mông'],
  // Core
  abs: ['Bụng trên', 'Bụng dưới'], 'abs (upper)': ['Bụng trên'], 'abs (lower)': ['Bụng dưới'],
  obliques: ['Bụng chéo'],
  // Other
  'full body': ['Full Body'],
  'cardiovascular system': ['Cardio'],
  'calves ': ['Bắp chân'], // trailing space fix
};

function fixExercise(ex: any) {
  const primary = (ex.primaryMuscles || []).flatMap((m: string) => {
    const key = m.toLowerCase().trim();
    return MUSCLE_GROUP_MAPPING[key] || [];
  });
  const secondary = (ex.secondaryMuscles || []).flatMap((m: string) => {
    const key = m.toLowerCase().trim();
    return MUSCLE_GROUP_MAPPING[key] || [];
  });
  
  return {
    ...ex,
    primaryMuscleGroups: primary.length > 0 ? primary : undefined,
    secondaryMuscleGroups: secondary.length > 0 ? secondary : undefined,
  };
}

async function main() {
  const data = JSON.parse(readFileSync('./src/data/exercises.json', 'utf-8'));
  
  const fixed = data.exercises.map((ex: any) => {
    // Only fix if missing primaryMuscleGroups
    if (!ex.primaryMuscleGroups || ex.primaryMuscleGroups.length === 0) {
      return fixExercise(ex);
    }
    return ex;
  });
  
  const count = fixed.filter((e: any) => e.primaryMuscleGroups?.length > 0).length;
  console.log(`Exercises with muscle groups: ${count}/${fixed.length}`);
  
  writeFileSync('./src/data/exercises.json', JSON.stringify({ exercises: fixed, count: fixed.length }, null, 2));
  console.log('Done!');
}

main();
// Script to fetch exercises with proper muscle group mapping
// Run with: npx tsx scripts/fetch-exercises.ts

const API_URL = 'https://api.github.com/repos/wrkout/exercises.json/contents/exercises';
const RAW_BASE = 'https://raw.githubusercontent.com/wrkout/exercises.json/master/exercises';

const MUSCLE_GROUP_MAPPING: Record<string, string[]> = {
  biceps: ['Tay trước'], triceps: ['Tay sau (Đầu dài)', 'Tay sau (Đầu bên)'], forearms: ['Cẳng tay'],
  chest: ['Ngực'],
  'front deltoids': ['Vai trước'], 'front delts': ['Vai trước'], 'side deltoids': ['Vai giữa'], 'side delts': ['Vai giữa'],
  'rear deltoids': ['Vai sau'], 'rear delts': ['Vai sau'], deltoids: ['Vai trước', 'Vai giữa', 'Vai sau'],
  lats: ['Lưng xô'], 'upper back': ['Lưng trên'], traps: ['Cơ thang'], 'lower back': ['Lưng dưới'], erector: ['Lưng dưới'],
  quadriceps: ['Đùi trước'], quads: ['Đùi trước'], hamstrings: ['Đùi sau'], glutes: ['Mông'], calves: ['Bắp chân'],
  adductors: ['Mông'], abs: ['Bụng trên', 'Bụng dưới'], 'abs (upper)': ['Bụng trên'], 'abs (lower)': ['Bụng dưới'],
  obliques: ['Bụng chéo'], 'full body': ['Full Body'], 'cardiovascular system': ['Cardio'],
};

const CATEGORY_TO_COLOR: Record<string, string> = {
  strength: 'Red', stretching: 'Green', cardio: 'Orange', plyometrics: 'Yellow',
  strongman: 'Purple', olympic_lifting: 'Blue', powerlifting: 'Red', crossfit: 'Pink',
};

const EQUIPMENT_MAPPING: Record<string, string> = {
  barbell: 'Tạ đòn', dumbbell: 'Tạ đơn', kettlebell: 'Kettlebell', cable: 'Cable Machine',
  machine: 'Máy tập', bodyweight: 'Không cần', 'weight plate': 'Đĩa tạ', bands: 'Dây kháng lực',
  'exercise ball': 'Bóng tập', 'foam roll': 'Foam Roller', other: 'Khác', none: 'Không cần',
  ez_bar: 'Tạ EZ', smith_machine: 'Smith Machine', pullup_bar: 'Xà đơn', bench: 'Ghế tập',
};

const DEFAULT_SETS_REPS: Record<string, { sets: number; reps: string }> = {
  beginner: { sets: 3, reps: '12-15' }, intermediate: { sets: 4, reps: '8-12' },
  advanced: { sets: 4, reps: '6-10' }, expert: { sets: 5, reps: '5-8' },
};

function transformExercise(wrkout: any) {
  // Map muscle groups
  const primaryMuscleGroups = (wrkout.primaryMuscles || []).flatMap((m: string) => {
    const key = m.toLowerCase().trim();
    return MUSCLE_GROUP_MAPPING[key] || [];
  });
  
  const secondaryMuscleGroups = (wrkout.secondaryMuscles || []).flatMap((m: string) => {
    const key = m.toLowerCase().trim();
    return MUSCLE_GROUP_MAPPING[key] || [];
  });
  
  const defaultSetsReps = DEFAULT_SETS_REPS[wrkout.level || 'beginner'] || DEFAULT_SETS_REPS.beginner;
  
  return {
    name: wrkout.name,
    sets: defaultSetsReps.sets,
    reps: defaultSetsReps.reps,
    notes: wrkout.instructions?.slice(0, 2).join('. '),
    equipment: EQUIPMENT_MAPPING[wrkout.equipment?.toLowerCase() || ''] || wrkout.equipment,
    colorCode: CATEGORY_TO_COLOR[wrkout.category || ''] || 'Blue',
    primaryMuscleGroups: primaryMuscleGroups.length > 0 ? primaryMuscleGroups : undefined,
    secondaryMuscleGroups: secondaryMuscleGroups.length > 0 ? secondaryMuscleGroups : undefined,
    force: wrkout.force,
    mechanic: wrkout.mechanic,
    difficulty: wrkout.level,
    category: wrkout.category,
    isBFR: false,
  };
}

async function fetchExercise(folderName: string): Promise<any | null> {
  try {
    const res = await fetch(`${RAW_BASE}/${folderName}/exercise.json`);
    return res.ok ? await res.json() : null;
  } catch { return null; }
}

async function main() {
  const fs = await import('fs');
  const dataDir = './src/data';
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  
  const listRes = await fetch(API_URL);
  const listData = await listRes.json();
  const folders = listData.filter((item: any) => item.type === 'dir');
  console.log(`Total: ${folders.length}`);
  
  const exercises: any[] = [];
  const BATCH_SIZE = 30;
  
  for (let i = 0; i < folders.length; i += BATCH_SIZE) {
    const batch = folders.slice(i, Math.min(i + BATCH_SIZE, folders.length));
    const results = await Promise.all(batch.map(f => fetchExercise(f.name)));
    
    for (const wrkout of results) {
      if (wrkout) exercises.push(transformExercise(wrkout));
    }
    
    console.log(`Progress: ${exercises.length}/${folders.length}`);
    if (i + BATCH_SIZE < folders.length) await new Promise(r => setTimeout(r, 50));
  }
  
  fs.writeFileSync('./src/data/exercises.json', JSON.stringify({ exercises, count: exercises.length }, null, 2));
  console.log(`Done! ${exercises.length} exercises`);
}

main().catch(console.error);
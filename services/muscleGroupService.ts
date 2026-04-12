import { MuscleGroup } from '../types';
import { getWeeklyWorkoutLogs } from './weeklyAnalysisService';

export interface MuscleGroupMapping {
  push: MuscleGroup[];
  pull: MuscleGroup[];
  legs: MuscleGroup[];
  shoulders: MuscleGroup[];
}

/**
 * Categorize muscle groups by movement pattern
 */
export const categorizeByMovement = (): MuscleGroupMapping => {
  return {
    push: [MuscleGroup.Chest, MuscleGroup.FrontDelts, MuscleGroup.TricepsLong, MuscleGroup.TricepsLateral],
    pull: [MuscleGroup.Lats, MuscleGroup.UpperBack, MuscleGroup.Biceps, MuscleGroup.Traps],
    legs: [MuscleGroup.Quads, MuscleGroup.Hamstrings, MuscleGroup.Glutes, MuscleGroup.Calves],
    shoulders: [MuscleGroup.FrontDelts, MuscleGroup.SideDelts, MuscleGroup.RearDelts],
  };
};

/**
 * Categorize muscle groups by body split (UL)
 */
export const categorizeUpperLower = (): {
  upper: MuscleGroup[];
  lower: MuscleGroup[];
} => {
  return {
    upper: [
      MuscleGroup.Chest,
      MuscleGroup.FrontDelts,
      MuscleGroup.SideDelts,
      MuscleGroup.RearDelts,
      MuscleGroup.UpperBack,
      MuscleGroup.Lats,
      MuscleGroup.Traps,
      MuscleGroup.Biceps,
      MuscleGroup.TricepsLong,
      MuscleGroup.TricepsLateral,
      MuscleGroup.Forearms,
    ],
    lower: [MuscleGroup.Quads, MuscleGroup.Hamstrings, MuscleGroup.Glutes, MuscleGroup.Calves],
  };
};

/**
 * Get what was trained yesterday
 */
export const getYesterdayMuscleGroups = async (userId: string): Promise<MuscleGroup[]> => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const logs = await getWeeklyWorkoutLogs(userId);
  const yesterdayLog = logs.find(log => log.date === yesterdayStr);

  if (!yesterdayLog || !yesterdayLog.data) {
    return [];
  }

  // Extract muscle groups from workout data
  const muscles = new Set<MuscleGroup>();
  const contentStr = JSON.stringify(yesterdayLog.data).toLowerCase();

  const muscleKeywordMap: { [key: string]: MuscleGroup } = {
    'ngực|chest|bench|press': MuscleGroup.Chest,
    'vai trước|front shoulder|front deltoid': MuscleGroup.FrontDelts,
    'vai giữa|side shoulder|lateral raise': MuscleGroup.SideDelts,
    'vai sau|rear shoulder|rear deltoid': MuscleGroup.RearDelts,
    'lưng trên|upper back|row': MuscleGroup.UpperBack,
    'lưng xô|lat|lat pulldown': MuscleGroup.Lats,
    'lưng dưới|lower back|deadlift': MuscleGroup.LowerBack,
    'cơ thang|trap|shrug': MuscleGroup.Traps,
    'tay trước|bicep|curl': MuscleGroup.Biceps,
    'tay sau đầu dài|tricep long': MuscleGroup.TricepsLong,
    'tay sau đầu bên|tricep lateral': MuscleGroup.TricepsLateral,
    'cẳng tay|forearm': MuscleGroup.Forearms,
    'đùi trước|quad|squat|lunge': MuscleGroup.Quads,
    'đùi sau|hamstring|leg curl': MuscleGroup.Hamstrings,
    'mông|glute|hip thrust': MuscleGroup.Glutes,
    'bắp chân|calf|raise': MuscleGroup.Calves,
    'bụng trên|upper ab|crunch': MuscleGroup.UpperAbs,
    'bụng dưới|lower ab|leg raise': MuscleGroup.LowerAbs,
    'bụng chéo|oblique|side plank': MuscleGroup.Obliques,
  };

  Object.entries(muscleKeywordMap).forEach(([keywords, muscle]) => {
    const keywordList = keywords.split('|');
    if (keywordList.some(kw => contentStr.includes(kw))) {
      muscles.add(muscle);
    }
  });

  return Array.from(muscles);
};

/**
 * Get muscle group category (push/pull/legs/shoulders)
 */
export const getMuscleCategory = (muscle: MuscleGroup): string => {
  const categorization = categorizeByMovement();

  if (categorization.push.includes(muscle)) return 'push';
  if (categorization.pull.includes(muscle)) return 'pull';
  if (categorization.legs.includes(muscle)) return 'legs';
  if (categorization.shoulders.includes(muscle)) return 'shoulders';
  return 'core';
};

/**
 * Check if muscle groups conflict based on PPL split
 */
export const checkPPLConflict = (
  todayMuscles: MuscleGroup[],
  yesterdayMuscles: MuscleGroup[]
): boolean => {
  const categorization = categorizeByMovement();
  const todayCategories = new Set<string>();
  const yesterdayCategories = new Set<string>();

  todayMuscles.forEach(m => {
    const cat = getMuscleCategory(m);
    if (cat !== 'core') todayCategories.add(cat);
  });

  yesterdayMuscles.forEach(m => {
    const cat = getMuscleCategory(m);
    if (cat !== 'core') yesterdayCategories.add(cat);
  });

  // Check for overlap
  for (const cat of todayCategories) {
    if (yesterdayCategories.has(cat)) {
      return true; // Conflict detected
    }
  }

  return false;
};

/**
 * Check if muscle groups conflict based on UL split
 */
export const checkULConflict = (
  todayMuscles: MuscleGroup[],
  yesterdayMuscles: MuscleGroup[]
): boolean => {
  const { upper, lower } = categorizeUpperLower();

  const todayIsUpper = todayMuscles.some(m => upper.includes(m));
  const todayIsLower = todayMuscles.some(m => lower.includes(m));

  const yesterdayIsUpper = yesterdayMuscles.some(m => upper.includes(m));
  const yesterdayIsLower = yesterdayMuscles.some(m => lower.includes(m));

  // If today is same as yesterday, it's a conflict
  if (todayIsUpper && yesterdayIsUpper) return true;
  if (todayIsLower && yesterdayIsLower) return true;

  return false;
};

/**
 * Main conflict detection function
 * Returns true if there's a muscle group conflict
 */
export const checkMuscleGroupConflict = async (
  userId: string,
  plannedMuscles: MuscleGroup[],
  trainingGoal: 'bulking' | 'cutting',
  trainingFrequency: number
): Promise<{ hasConflict: boolean; reason?: string }> => {
  const yesterdayMuscles = await getYesterdayMuscleGroups(userId);

  if (yesterdayMuscles.length === 0) {
    // No data from yesterday, no conflict
    return { hasConflict: false };
  }

  // Determine split type based on frequency
  let hasConflict = false;
  let reason = '';

  if (trainingFrequency === 4) {
    // UL split
    hasConflict = checkULConflict(plannedMuscles, yesterdayMuscles);
    reason = 'UL split conflict: Cannot repeat upper or lower same day';
  } else if (trainingFrequency === 5 || trainingFrequency === 6) {
    // PPL or PPL-S split
    hasConflict = checkPPLConflict(plannedMuscles, yesterdayMuscles);
    reason = 'PPL split conflict: Cannot repeat same movement pattern';
  }

  return { hasConflict, reason };
};

/**
 * Get recommended muscles for today based on yesterday's workout
 */
export const getRecommendedMuscles = async (
  userId: string,
  trainingFrequency: number,
  trainingGoal: 'bulking' | 'cutting'
): Promise<MuscleGroup[]> => {
  const yesterdayMuscles = await getYesterdayMuscleGroups(userId);

  if (yesterdayMuscles.length === 0) {
    // Default: start with push
    return [MuscleGroup.Chest, MuscleGroup.FrontDelts, MuscleGroup.TricepsLong];
  }

  const categorization = categorizeByMovement();
  const yesterdayCategories = new Set<string>();

  yesterdayMuscles.forEach(m => {
    const cat = getMuscleCategory(m);
    if (cat !== 'core') yesterdayCategories.add(cat);
  });

  let recommendedMuscles: MuscleGroup[] = [];

  if (trainingFrequency === 4) {
    // UL split
    const { upper, lower } = categorizeUpperLower();
    const yesterdayIsUpper = yesterdayMuscles.some(m => upper.includes(m));

    recommendedMuscles = yesterdayIsUpper ? lower : upper;
  } else if (trainingFrequency === 5 || trainingFrequency === 6) {
    // PPL split
    if (yesterdayCategories.has('push')) {
      recommendedMuscles = categorization.pull;
    } else if (yesterdayCategories.has('pull')) {
      recommendedMuscles = categorization.legs;
    } else {
      recommendedMuscles = categorization.push;
    }
  }

  return recommendedMuscles;
};

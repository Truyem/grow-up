import { UserInput, FatigueLevel, MuscleGroup, WorkoutHistoryItem } from '../types';

export type PlanDuration = 4 | 8 | 12;
export type TrainingPhase = 'base' | 'build' | 'peak' | 'deload';
export type SplitType = 'full_body' | 'upper_lower' | 'ppl' | 'ppls';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

export interface PeriodizationPhase {
  weekNumber: number;
  phase: TrainingPhase;
  volumeMultiplier: number;
  intensityMultiplier: number;
}

export interface PeriodizationPlan {
  durationWeeks: PlanDuration;
  phases: PeriodizationPhase[];
  recommendedSplit: SplitType;
  muscleBalanceStrategy: string;
}

/**
 * Gợi ý split (full body / upper-lower / PPL) tối ưu cho lịch.
 */
export const determineOptimalSplit = (daysPerWeek: number, experienceLevel: ExperienceLevel): SplitType => {
  if (daysPerWeek <= 3) return 'full_body';
  if (daysPerWeek === 4) return 'upper_lower';
  if (daysPerWeek === 5) return 'ppl';
  if (daysPerWeek >= 6) {
    return experienceLevel === 'beginner' ? 'ppl' : 'ppls';
  }
  return 'full_body'; // Fallback
};

/**
 * Lập kế hoạch & periodization: chia phase (base/build/peak/deload).
 */
export const generatePeriodizationSchedule = (duration: PlanDuration): PeriodizationPhase[] => {
  const phases: PeriodizationPhase[] = [];
  
  if (duration === 4) {
    // 4 weeks: Base -> Build -> Peak -> Deload
    phases.push({ weekNumber: 1, phase: 'base', volumeMultiplier: 1.0, intensityMultiplier: 0.8 });
    phases.push({ weekNumber: 2, phase: 'build', volumeMultiplier: 1.1, intensityMultiplier: 0.9 });
    phases.push({ weekNumber: 3, phase: 'peak', volumeMultiplier: 1.2, intensityMultiplier: 1.0 });
    phases.push({ weekNumber: 4, phase: 'deload', volumeMultiplier: 0.6, intensityMultiplier: 0.7 });
  } else if (duration === 8) {
    // 8 weeks: 2 Base -> 3 Build -> 2 Peak -> 1 Deload
    for(let i=1; i<=2; i++) phases.push({ weekNumber: i, phase: 'base', volumeMultiplier: 1.0, intensityMultiplier: 0.8 });
    for(let i=3; i<=5; i++) phases.push({ weekNumber: i, phase: 'build', volumeMultiplier: 1.1, intensityMultiplier: 0.9 });
    for(let i=6; i<=7; i++) phases.push({ weekNumber: i, phase: 'peak', volumeMultiplier: 1.2, intensityMultiplier: 1.0 });
    phases.push({ weekNumber: 8, phase: 'deload', volumeMultiplier: 0.6, intensityMultiplier: 0.7 });
  } else if (duration === 12) {
    // 12 weeks: 3 Base -> 4 Build -> 3 Peak -> 2 Deload
    for(let i=1; i<=3; i++) phases.push({ weekNumber: i, phase: 'base', volumeMultiplier: 1.0, intensityMultiplier: 0.8 });
    for(let i=4; i<=7; i++) phases.push({ weekNumber: i, phase: 'build', volumeMultiplier: 1.1, intensityMultiplier: 0.9 });
    for(let i=8; i<=10; i++) phases.push({ weekNumber: i, phase: 'peak', volumeMultiplier: 1.2, intensityMultiplier: 1.0 });
    for(let i=11; i<=12; i++) phases.push({ weekNumber: i, phase: 'deload', volumeMultiplier: 0.6, intensityMultiplier: 0.7 });
  }
  
  return phases;
};

/**
 * Auto-deload khi tải tập tăng nhanh hoặc giấc ngủ xấu.
 */
export const shouldAutoDeload = (
  recentFatigue: FatigueLevel, 
  sleepQuality: 'good' | 'bad' | 'average', 
  isTrainingLoadSpiking: boolean,
  workoutHistory: WorkoutHistoryItem[] = []
): boolean => {
  // If extremely tired and bad sleep -> Auto deload
  if (recentFatigue === FatigueLevel.Tired && sleepQuality === 'bad') return true;
  
  // If training load spiked and they aren't fresh -> Auto deload
  if (isTrainingLoadSpiking && recentFatigue !== FatigueLevel.Fresh) return true;

  // AUTOMATIC DELOAD: If in the last 3 workouts, totalVolume decreased > 15%
  if (workoutHistory.length >= 3) {
    // Get last 3 workout sessions
    const recentWorkouts = workoutHistory
      .filter(h => h.recordType === 'workout') // Only workout records
      .slice(0, 3); // Last 3 workouts
    
    if (recentWorkouts.length === 3) {
      // Calculate total volume for each workout
      const volumes = recentWorkouts.map(workout => {
        return workout.exerciseLogs?.reduce((sum, log) => sum + log.totalVolume, 0) || 0;
      });
      
      // Check if volume decreased by more than 15% from first to third workout
      const firstVolume = volumes[0];
      const thirdVolume = volumes[2];
      
      if (firstVolume > 0) {
        const volumeDecreasePercent = ((firstVolume - thirdVolume) / firstVolume) * 100;
        if (volumeDecreasePercent > 15) {
          return true; // Auto deload triggered
        }
      }
    }
  }

  // Additional rule for poor health
  // if (recentHealth === HealthCondition.Tired or Injured) could be added here
  return false;
};

/**
 * Chọn bài theo “muscle balance” (đẩy–kéo, trước–sau).
 */
export const getMuscleBalancePrompt = (): string => {
  return "Exercise Selection Strategy: Ensure a 1:1 balanced ratio between push and pull movements (e.g., horizontal press vs horizontal row, vertical press vs vertical pull). Also, balance anterior and posterior chain exercises for the lower body (e.g., quads vs hamstrings/glutes) to prevent injury and promote balanced hypertrophy.";
};

/**
 * Tự phân bổ volume/tuần theo trình độ.
 */
export const getVolumeDistributionPrompt = (experienceLevel: ExperienceLevel): string => {
  switch (experienceLevel) {
    case 'beginner':
      return "Volume per muscle group per week: 10-12 sets. Focus on compound movements and perfecting form.";
    case 'intermediate':
      return "Volume per muscle group per week: 12-16 sets. Introduce more isolation exercises and moderate intensity techniques.";
    case 'advanced':
      return "Volume per muscle group per week: 16-20+ sets. Utilize advanced training techniques, varied intensities, and specific weak-point training.";
  }
};

/**
 * Tạo giáo án 4/8/12 tuần tự động theo mục tiêu bằng AI Prompt.
 */
export const buildPromptForMacrocycle = (
  durationWeeks: PlanDuration,
  daysPerWeek: number,
  experienceLevel: ExperienceLevel,
  user: UserInput,
  sleepQuality: 'good' | 'bad' | 'average' = 'average',
  isTrainingLoadSpiking: boolean = false
): string => {
  
  // Check for auto-deload override
  const requiresDeload = shouldAutoDeload(user.fatigue, sleepQuality, isTrainingLoadSpiking);

  const split = determineOptimalSplit(daysPerWeek, experienceLevel);
  const schedule = generatePeriodizationSchedule(durationWeeks);
  const balanceStrategy = getMuscleBalancePrompt();
  const volumeStrategy = getVolumeDistributionPrompt(experienceLevel);
  
  return `
You are an expert strength and conditioning AI coach.
Your task is to generate a comprehensive ${durationWeeks}-week training plan based on scientific periodization principles.

# Periodization Schedule
The macrocycle is divided into the following phases:
${JSON.stringify(schedule, null, 2)}

# User Profile
- Weight: ${user.weight}kg
- Height: ${user.height}cm
- Age: ${user.age}
- Primary Goal: ${user.nutritionGoal}
- Training Mode: ${user.trainingMode}
- Current Fatigue Level: ${user.fatigue}
- Sore Muscles: ${user.soreMuscles.join(', ')}

# Programming Directives
1. Optimal Split: Use a ${split.toUpperCase()} split (${daysPerWeek} days/week).
2. Muscle Balance: ${balanceStrategy}
3. Volume Distribution: ${volumeStrategy}

# Auto-Deload Protocol Trigger
${requiresDeload 
  ? "CRITICAL: The user's recent sleep and fatigue indicators suggest high systemic stress. PLEASE ENFORCE AN IMMEDIATE DELOAD (Volume x0.5, Intensity x0.7) for the first week before resuming the planned schedule." 
  : "Proceed with the normal periodization schedule."}

Please output a structured JSON plan detailing the exercises, sets, reps, and RPE (Rate of Perceived Exertion) for each week, reflecting the volume/intensity multipliers and muscle balance rules above.
`;
};

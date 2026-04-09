/**
 * metCalories.ts
 * Tính calo tiêu thụ dựa trên chỉ số MET (Metabolic Equivalent of Task)
 * Công thức: Calories = MET × 3.5 × weight(kg) / 200 × duration(min)
 * 
 * Nguồn: Compendium of Physical Activities
 */

export interface METExercise {
    name: string;
    met: number;
    category: 'gym' | 'calis' | 'cardio' | 'home' | 'other';
}

// Bảng MET chuẩn cho các bài tập phổ biến
export const MET_TABLE: METExercise[] = [
    // Gym - Weights
    { name: 'Bench Press', met: 5.0, category: 'gym' },
    { name: 'Squat', met: 5.0, category: 'gym' },
    { name: 'Deadlift', met: 6.0, category: 'gym' },
    { name: 'Shoulder Press', met: 4.5, category: 'gym' },
    { name: 'Lat Pulldown', met: 4.5, category: 'gym' },
    { name: 'Barbell Row', met: 4.5, category: 'gym' },
    { name: 'Dumbbell', met: 4.0, category: 'gym' },
    { name: 'Leg Press', met: 4.5, category: 'gym' },
    { name: 'Leg Curl', met: 4.0, category: 'gym' },
    { name: 'Leg Extension', met: 4.0, category: 'gym' },
    { name: 'Calf Raise', met: 3.5, category: 'gym' },
    { name: 'Cable', met: 4.0, category: 'gym' },
    { name: 'Machine', met: 3.5, category: 'gym' },
    { name: 'Weight Training', met: 4.5, category: 'gym' },
    { name: 'Resistance Training', met: 4.5, category: 'gym' },
    // Calisthenics
    { name: 'Push-up', met: 3.8, category: 'calis' },
    { name: 'Pull-up', met: 4.5, category: 'calis' },
    { name: 'Chin-up', met: 4.5, category: 'calis' },
    { name: 'Dips', met: 4.5, category: 'calis' },
    { name: 'Plank', met: 3.0, category: 'calis' },
    { name: 'Burpee', met: 8.0, category: 'calis' },
    { name: 'Jumping Jack', met: 7.0, category: 'calis' },
    { name: 'Mountain Climber', met: 8.0, category: 'calis' },
    { name: 'Bodyweight Squat', met: 3.5, category: 'calis' },
    { name: 'Lunge', met: 3.5, category: 'calis' },
    { name: 'Crunches', met: 3.0, category: 'calis' },
    { name: 'Sit-up', met: 3.5, category: 'calis' },
    { name: 'Leg Raise', met: 3.0, category: 'calis' },
    { name: 'Tricep Dip', met: 4.0, category: 'calis' },
    { name: 'Pike Push-up', met: 4.0, category: 'calis' },
    // Cardio
    { name: 'Running', met: 9.8, category: 'cardio' },
    { name: 'Jogging', met: 7.0, category: 'cardio' },
    { name: 'Cycling', met: 7.5, category: 'cardio' },
    { name: 'Treadmill', met: 8.0, category: 'cardio' },
    { name: 'Jump Rope', met: 11.0, category: 'cardio' },
    { name: 'Rowing', met: 7.0, category: 'cardio' },
    { name: 'Elliptical', met: 6.0, category: 'cardio' },
    { name: 'Swimming', met: 7.0, category: 'cardio' },
    // Home / Isolation
    { name: 'Resistance Band', met: 4.0, category: 'home' },
    { name: 'BFR', met: 3.5, category: 'home' },
    { name: 'Isolation', met: 3.5, category: 'home' },
    { name: 'Stretch', met: 2.5, category: 'home' },
    { name: 'Yoga', met: 2.5, category: 'home' },
    // Defaults
    { name: 'General Workout', met: 4.5, category: 'other' },
    { name: 'Warm-up', met: 3.5, category: 'other' },
    { name: 'Cool-down', met: 2.5, category: 'other' },
];

/**
 * Tìm MET cho bài tập theo tên (fuzzy match)
 */
export function getMETForExercise(exerciseName: string): number {
    const nameLower = exerciseName.toLowerCase();

    // Exact or partial match
    for (const entry of MET_TABLE) {
        if (nameLower.includes(entry.name.toLowerCase())) {
            return entry.met;
        }
    }

    // Keyword fallback
    if (nameLower.includes('run') || nameLower.includes('chạy')) return 9.8;
    if (nameLower.includes('jump') || nameLower.includes('nhảy')) return 8.0;
    if (nameLower.includes('plank') || nameLower.includes('abs')) return 3.0;
    if (nameLower.includes('cardio')) return 7.0;
    if (nameLower.includes('push') || nameLower.includes('đẩy')) return 3.8;
    if (nameLower.includes('pull') || nameLower.includes('kéo')) return 4.5;
    if (nameLower.includes('squat') || nameLower.includes('chân')) return 4.5;
    if (nameLower.includes('curl') || nameLower.includes('bicep')) return 3.5;
    if (nameLower.includes('press')) return 4.5;
    if (nameLower.includes('deadlift')) return 6.0;

    // Default: moderate weight training
    return 4.5;
}

/**
 * Tính Calories tiêu thụ cho một bài tập
 * @param exerciseName - Tên bài tập
 * @param sets - Số set
 * @param repsStr - Số reps (string VD: "8-12", "15", "30s")
 * @param weightKg - Cân nặng người dùng (kg)
 * @param restSeconds - Thời gian nghỉ giữa set (seconds), mặc định 90s
 */
export function calculateExerciseCalories(
    exerciseName: string,
    sets: number,
    repsStr: string,
    weightKg: number,
    restSeconds = 90
): number {
    const met = getMETForExercise(exerciseName);

    // Parse reps - lấy giá trị trung bình nếu có range
    let reps = 10;
    const repsNum = repsStr.replace(/[^0-9-]/g, '');
    if (repsNum.includes('-')) {
        const parts = repsNum.split('-').map(Number);
        reps = Math.round((parts[0] + parts[1]) / 2);
    } else if (repsNum) {
        reps = parseInt(repsNum) || 10;
    }

    // Thời gian thực hiện: ~3 giây/rep + thời gian nghỉ
    const timePerRep = 3; // seconds
    const activeTime = (sets * reps * timePerRep) / 60; // minutes
    const restTime = (sets * restSeconds) / 60; // minutes
    const totalMinutes = activeTime + restTime;

    // Calories = MET × 3.5 × weight / 200 × minutes
    const calories = met * 3.5 * weightKg / 200 * totalMinutes;
    return Math.max(1, Math.round(calories));
}

/**
 * Tính tổng calo cho một workout session
 */
export interface WorkoutCalorieResult {
    totalCalories: number;
    totalDurationMinutes: number;
    exerciseBreakdown: Array<{
        name: string;
        calories: number;
        met: number;
    }>;
}

export function calculateWorkoutCalories(
    exercises: Array<{ name: string; sets: number; reps: string; weight?: number }>,
    userWeightKg: number,
    warmupMinutes = 10,
    cooldownMinutes = 5
): WorkoutCalorieResult {
    let totalCalories = 0;
    let totalDurationMinutes = warmupMinutes + cooldownMinutes;
    const exerciseBreakdown: WorkoutCalorieResult['exerciseBreakdown'] = [];

    // Warmup calories
    const warmupCals = Math.round(3.5 * 3.5 * userWeightKg / 200 * warmupMinutes);
    totalCalories += warmupCals;

    for (const ex of exercises) {
        const cals = calculateExerciseCalories(ex.name, ex.sets, ex.reps, userWeightKg);
        const met = getMETForExercise(ex.name);

        // Estimate duration: 3s/rep active + 90s rest per set
        let reps = 10;
        const repsNum = ex.reps.replace(/[^0-9-]/g, '');
        if (repsNum.includes('-')) {
            const parts = repsNum.split('-').map(Number);
            reps = Math.round((parts[0] + parts[1]) / 2);
        } else if (repsNum) {
            reps = parseInt(repsNum) || 10;
        }
        const activeMin = (ex.sets * reps * 3) / 60;
        const restMin = (ex.sets * 90) / 60;
        totalDurationMinutes += activeMin + restMin;

        totalCalories += cals;
        exerciseBreakdown.push({ name: ex.name, calories: cals, met });
    }

    return {
        totalCalories: Math.round(totalCalories),
        totalDurationMinutes: Math.round(totalDurationMinutes),
        exerciseBreakdown,
    };
}

/**
 * Format thời gian theo phút -> "1h 30m" hoặc "45m"
 */
export function formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes}p`;
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return m > 0 ? `${h}h ${m}p` : `${h}h`;
}

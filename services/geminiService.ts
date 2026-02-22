import { GoogleGenAI, Type, Schema } from "@google/genai";
import { UserInput, DailyPlan, WorkoutHistoryItem, Intensity, WorkoutLevel, FatigueLevel, MuscleGroup, AIOverview, Exercise, Meal } from "../types";

// Multiple API keys are injected via vite.config.ts define into process.env.API_KEYS
const API_KEYS: string[] = (process.env.API_KEYS as unknown as string[]) || [];

const MODELS = {
  WORKOUT: "gemini-3-flash-preview", // "Model 3" / High Intelligence
  FOOD_SCAN: "gemma-3-27b-it",
  OVERVIEW: "gemini-2.5-flash",
  MENU: "gemini-2.5-flash",
  VISION: "gemini-1.5-flash",
  FOOD_RECOGNITION: "gemini-2.5-flash-lite", // User requested "Gemini 2.5 Flash-Lite"
  MACRO_CALC: "gemini-2.5-flash", // User requested "gemini-2.5-flash"
  FOOD_SUGGEST: "gemini-2.5-flash", // Gợi ý thức ăn bổ sung khi tạo plan
};


// ... lines 30-450 ...

// Track current API key index - persists across calls
let currentKeyIndex = 0;
// ... (rest of file)



// Track rate-limited API keys (index -> timestamp when it was rate limited)
const rateLimitedKeys: Map<number, number> = new Map();

// API Status type for external consumption
export interface ApiStatus {
  totalKeys: number;
  currentKeyIndex: number;
  activeKeysCount: number;
  rateLimitedKeysCount: number;
  rateLimitedKeyIndexes: number[];
}

// Get API status for UI display
export const getApiStatus = (): ApiStatus => {
  const rateLimitedKeyIndexes = Array.from(rateLimitedKeys.keys());
  return {
    totalKeys: API_KEYS.length,
    currentKeyIndex: currentKeyIndex,
    activeKeysCount: API_KEYS.length - rateLimitedKeys.size,
    rateLimitedKeysCount: rateLimitedKeys.size,
    rateLimitedKeyIndexes
  };
};

// Get current API key
const getCurrentApiKey = (): string | null => {
  if (API_KEYS.length === 0) return null;
  return API_KEYS[currentKeyIndex];
};

// Set current API key by index (for manual selection from UI)
export const setCurrentApiKey = (index: number): boolean => {
  if (index < 0 || index >= API_KEYS.length) {
    console.error("Invalid API key index: " + index);
    return false;
  }
  currentKeyIndex = index;
  console.log("Manually switched to API key " + (currentKeyIndex + 1) + "/" + API_KEYS.length);
  return true;
};

// Mark current key as rate limited and rotate to next
const markRateLimitedAndRotate = (): string | null => {
  if (API_KEYS.length === 0) return null;

  // Mark current key as rate limited
  rateLimitedKeys.set(currentKeyIndex, Date.now());
  console.log("API key " + (currentKeyIndex + 1) + " marked as rate limited");

  // Find next available key that's not rate limited
  let attempts = 0;
  while (attempts < API_KEYS.length) {
    currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
    if (!rateLimitedKeys.has(currentKeyIndex)) {
      console.log("Switched to API key " + (currentKeyIndex + 1) + "/" + API_KEYS.length);
      return API_KEYS[currentKeyIndex];
    }
    attempts++;
  }

  // All keys are rate limited, clear oldest and use it
  if (rateLimitedKeys.size > 0) {
    const oldestKey = Array.from(rateLimitedKeys.entries())
      .sort((a, b) => a[1] - b[1])[0][0];
    rateLimitedKeys.delete(oldestKey);
    currentKeyIndex = oldestKey;
    console.log("All keys rate limited, retrying oldest key " + (currentKeyIndex + 1));
    return API_KEYS[currentKeyIndex];
  }

  return null;
};

// Check if error is rate limit related
const isRateLimitError = (error: unknown): boolean => {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes('429') ||
      message.includes('rate limit') ||
      message.includes('quota') ||
      message.includes('resource exhausted') ||
      message.includes('too many requests') ||
      message.includes('503') ||
      message.includes('500');
  }
  return false;
};

// Helper to get current formatted date
const getCurrentDate = () => {
  const now = new Date();
  const days = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  return `${days[now.getDay()]}, ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
};

// Helper to clean and parse JSON
const cleanAndParseJSON = (text: string, context: string): any => {
  try {
    // Remove markdown code blocks if present (e.g. ```json ... ```)
    const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error(`JSON Parse Error in ${context}:`, e);
    // Log first 200 and last 200 chars to debug
    const preview = text.length > 400
      ? text.slice(0, 200) + " ... " + text.slice(-200)
      : text;
    console.log(`Raw Text (${context}):`, preview);
    throw e; // Re-throw to trigger retry logic
  }
};

// --- DYNAMIC CALCULATIONS ---

// 1. Calculate BMR (Mifflin-St Jeor) - Assuming Male, Age 22 (avg student age based on context)
const calculateBMR = (weight: number, height: number, age: number = 22): number => {
  return (10 * weight) + (6.25 * height) - (5 * age) + 5;
};

// 2. Calculate TDEE (Moderate Activity assumed for gym goer)
const calculateTDEE = (bmr: number): number => {
  return Math.round(bmr * 1.55);
};

// 3. Estimate Workout Burn (Rough avg for 60 mins)
const estimateWorkoutBurn = (intensity: Intensity): number => {
  return intensity === Intensity.Hard ? 450 : 300;
};

// 4. Calculate Final Target
const calculateTargetCalories = (weight: number, height: number, goal: 'bulking' | 'cutting', intensity: Intensity): { tdee: number, burn: number, target: number } => {
  const bmr = calculateBMR(weight, height);
  const tdee = calculateTDEE(bmr);
  const burn = estimateWorkoutBurn(intensity);

  // Formula: (TDEE) + (Workout Burn) +/- Goal Adjustment
  // Note: TDEE usually includes activity, but user requested: "Add workout burn to avg consumption".
  // So we take a baseline maintenance and add specific burn, then adjust.

  let adjustment = 0;
  if (goal === 'bulking') {
    adjustment = 400; // Minimum surplus
  } else {
    adjustment = -400; // Minimum deficit
  }

  const target = tdee + adjustment; // Combining TDEE (already includes some activity) with specific adjustment
  return { tdee, burn, target };
};

// 5. Calculate Water Intake
const calculateWaterIntake = (weight: number, useCreatine: boolean): number => {
  // Base: 40ml per kg (0.04L)
  let baseWater = weight * 0.04;
  if (useCreatine) {
    baseWater += 1.5; // Add 1.5L if taking Creatine
  }
  // Round to 1 decimal place
  return Math.round(baseWater * 10) / 10;
};


// Fallback plans tailored by intensity and goal
const getFallbackPlan = (userData: UserInput): DailyPlan => {
  const { tdee, burn, target } = calculateTargetCalories(userData.weight, userData.height, userData.nutritionGoal, userData.selectedIntensity);

  const isBulking = userData.nutritionGoal === 'bulking';
  const proteinTarget = Math.round(userData.weight * (isBulking ? 2.2 : 2.0)); // 2.2g or 2.0g per kg

  // Macro Calculation
  // Fat: 0.9g/kg (Moderate)
  const fatTarget = Math.round(userData.weight * 0.9);

  // Carbs: Remaining Calories / 4
  // 1g Protein = 4kcal, 1g Fat = 9kcal, 1g Carb = 4kcal
  const caloriesFromProtein = proteinTarget * 4;
  const caloriesFromFat = fatTarget * 9;
  const remainingCalories = target - caloriesFromProtein - caloriesFromFat;
  const carbTarget = Math.max(0, Math.round(remainingCalories / 4));

  const intensity = userData.selectedIntensity;

  const workout: WorkoutLevel = intensity === Intensity.Hard ? {
    levelName: "Cháy hết mình (Hard)",
    description: "Tăng cơ tối đa + Daily Abs & Cardio Hardcore.",
    morning: [
      { name: "Decline Push-up", sets: 4, reps: "Max", colorCode: "Red", equipment: "Board + Chân cao", notes: "OFFLINE MODE", primaryMuscleGroups: ["Front Delts", "Chest - Upper"], secondaryMuscleGroups: ["Triceps", "Core"] },
      { name: "Single Arm Walking Lunges", sets: 3, reps: "12/leg", colorCode: "Purple", equipment: "Tạ 10kg", notes: "OFFLINE MODE", primaryMuscleGroups: ["Quads", "Glutes"], secondaryMuscleGroups: ["Hamstrings", "Core"] }
    ],
    evening: [
      { name: "One Arm Bicep Curls", sets: 4, reps: "20/arm", isBFR: true, colorCode: "Pink", equipment: "Tạ 4kg + BFR Band", notes: "OFFLINE MODE", primaryMuscleGroups: ["Biceps"], secondaryMuscleGroups: ["Forearms"] },
      { name: "Hanging Leg Raise", sets: 4, reps: "15", colorCode: "Orange", equipment: "Xà đơn/Sàn", notes: "OFFLINE MODE (Daily Abs)", primaryMuscleGroups: ["Abs - Lower", "Core"], secondaryMuscleGroups: ["Hip Flexors"] },
      { name: "Burpees", sets: 3, reps: "15", colorCode: "Orange", equipment: "None", notes: "OFFLINE MODE (Daily Cardio)", primaryMuscleGroups: ["Full Body", "Cardio"], secondaryMuscleGroups: ["Chest", "Legs", "Core"] }
    ]
  } : {
    levelName: "Vừa sức (Normal)",
    description: "Duy trì cơ bắp + Daily Abs & Cardio.",
    morning: [
      { name: "Push-up", sets: 3, reps: "12", colorCode: "Blue", equipment: "Board", notes: "OFFLINE MODE", primaryMuscleGroups: ["Chest - Middle"], secondaryMuscleGroups: ["Triceps", "Front Delts", "Core"] },
      { name: "One Arm Dumbbell Squat", sets: 4, reps: "12/leg", colorCode: "Purple", equipment: "Tạ 10kg (1 tay)", notes: "OFFLINE MODE", primaryMuscleGroups: ["Quads", "Glutes"], secondaryMuscleGroups: ["Hamstrings", "Core"] }
    ],
    evening: [
      { name: "Band Pull Apart", sets: 3, reps: "15", colorCode: "Yellow", equipment: "Dây kháng lực 15kg", notes: "OFFLINE MODE", primaryMuscleGroups: ["Rear Delts", "Upper Back"], secondaryMuscleGroups: ["Traps"] },
      { name: "Plank", sets: 3, reps: "60s", colorCode: "Orange", equipment: "None", notes: "OFFLINE MODE (Daily Abs)", primaryMuscleGroups: ["Core", "Abs"], secondaryMuscleGroups: ["Shoulders", "Glutes"] },
      { name: "Jumping Jacks", sets: 3, reps: "50", colorCode: "Orange", equipment: "None", notes: "OFFLINE MODE (Daily Cardio)", primaryMuscleGroups: ["Cardio", "Full Body"], secondaryMuscleGroups: ["Shoulders", "Calves"] }
    ]
  };

  // Fallback Nutrition Construction
  const carbSource = isBulking ? "400g Cơm trắng" : "150g Cơm trắng (Ít carb)";
  const vegSource = "300g Súp lơ xanh";

  return {
    date: getCurrentDate(),
    schedule: {
      suggestedWorkoutTime: "17:30",
      suggestedSleepTime: "23:00",
      reasoning: "Offline Mode: Tính toán dựa trên công thức TDEE tiêu chuẩn."
    },
    workout: {
      summary: "Bạn đang Offline. Đây là lịch tập mẫu.",
      detail: workout,
      isGenerated: false
    },
    nutrition: {
      totalCalories: target,
      totalProtein: proteinTarget,
      totalCarbs: carbTarget, // Replaces Water
      totalFat: fatTarget, // Replaces Water
      advice: `Mục tiêu: ${isBulking ? 'Bulking (Tăng cân)' : 'Cutting (Giảm cân)'}. TDEE: ${tdee}. Macros: ${proteinTarget}g Protein, ${carbTarget}g Carbs, ${fatTarget}g Fat.`,
      isGenerated: false,
      meals: [
        {
          name: "Bữa Sáng (07:00)",
          calories: Math.round(target * 0.25),
          protein: Math.round(proteinTarget * 0.25),
          carbs: Math.round(carbTarget * 0.25),
          fat: Math.round(fatTarget * 0.25),
          description: "2 lát Bánh mì đen + 3 Lòng trắng trứng (Trứng ốp la bỏ lòng đỏ)",
        },
        {
          name: "Bữa Trưa (12:30)",
          calories: Math.round(target * 0.35),
          protein: Math.round(proteinTarget * 0.35),
          carbs: Math.round(carbTarget * 0.35),
          fat: Math.round(fatTarget * 0.35),
          description: `${carbSource} + 200g Ức gà áp chảo + ${vegSource}`,
        },
        {
          name: "Bữa Tối (19:00)",
          calories: Math.round(target * 0.25),
          protein: Math.round(proteinTarget * 0.25),
          carbs: Math.round(carbTarget * 0.25),
          fat: Math.round(fatTarget * 0.25),
          description: `${carbSource} + 200g Cá/Thịt nạc + ${vegSource}`,
        },
        {
          name: "Bữa Phụ (21:30)",
          calories: Math.round(target * 0.15),
          protein: Math.round(proteinTarget * 0.15),
          carbs: Math.round(carbTarget * 0.15),
          fat: Math.round(fatTarget * 0.15),
          description: "1 Hộp Sữa chua không đường + 1 quả Chuối",
        }
      ]
    }
  };
};

// --- HARDCODED GYM SCHEDULE ---
// --- HARDCODED GYM SCHEDULE (4 Days/Week - High Intensity) ---
const GYM_SCHEDULE: Record<number, any> = {
  1: {
    levelName: "Ngày 1: Upper Body Strength (Ngực/Lưng)",
    description: "Tập trung sức mạnh thân trên. Volume cao.",
    morning: [
      { name: "Barbell Bench Press", sets: 4, reps: "8-10", primaryMuscleGroups: ["Chest - Middle", "Triceps"], notes: "Tăng tạ mỗi set" },
      { name: "Bent Over Barbell Row", sets: 4, reps: "10-12", primaryMuscleGroups: ["Lats", "Upper Back"], notes: "Giữ lưng thẳng" },
      { name: "Incline Dumbbell Press", sets: 4, reps: "10-12", primaryMuscleGroups: ["Chest - Upper", "Front Delts"] },
      { name: "Lat Pulldown (Wide Grip)", sets: 4, reps: "12-15", primaryMuscleGroups: ["Lats"] },
      { name: "Dumbbell Lateral Raise", sets: 4, reps: "15-20", primaryMuscleGroups: ["Side Delts"], notes: "Dropset set cuối" },
      { name: "Face Pulls", sets: 4, reps: "15-20", primaryMuscleGroups: ["Rear Delts", "Traps"] }
    ],
    evening: []
  },
  2: {
    levelName: "Ngày 2: Lower Body (Quad Focus)",
    description: "Chân nặng, tập trung đùi trước và bắp chân.",
    morning: [
      { name: "Barbell Squat", sets: 4, reps: "6-8", primaryMuscleGroups: ["Quads", "Glutes"], notes: "Xuống sâu qua đầu gối" },
      { name: "Leg Press", sets: 4, reps: "12-15", primaryMuscleGroups: ["Quads", "Glutes"] },
      { name: "Bulgarian Split Squat", sets: 3, reps: "12/leg", primaryMuscleGroups: ["Quads", "Glutes"] },
      { name: "Leg Extension", sets: 4, reps: "15-20", primaryMuscleGroups: ["Quads"], notes: "Giữ 1s ở điểm cao nhất" },
      { name: "Calf Raise (Standing)", sets: 5, reps: "15-20", primaryMuscleGroups: ["Calves"] },
      { name: "Plank", sets: 3, reps: "60-90s", primaryMuscleGroups: ["Core"] }
    ],
    evening: []
  },
  3: {
    levelName: "Ngày 3: Active Rest (Nghỉ ngơi)",
    description: "Nghỉ ngơi hoặc Cardio nhẹ để phục hồi cho ngày mai.",
    morning: [
      { name: "Walking / Light Cardio", sets: 1, reps: "30-45 mins", primaryMuscleGroups: ["Cardio"] },
      { name: "Stretching / Rolling", sets: 1, reps: "15 mins", primaryMuscleGroups: ["Full Body"] }
    ],
    evening: []
  },
  4: {
    levelName: "Ngày 4: Upper Body Hypertrophy (Vai/Tay)",
    description: "Tập trung độ lớn cơ bắp. Vai và Tay.",
    morning: [
      { name: "Seated Dumbbell Shoulder Press", sets: 4, reps: "10-12", primaryMuscleGroups: ["Front Delts", "Triceps"] },
      { name: "Cable Lateral Raise", sets: 4, reps: "15-20", primaryMuscleGroups: ["Side Delts"] },
      { name: "Dumbbell Shrugs", sets: 4, reps: "15", primaryMuscleGroups: ["Traps"] },
      { name: "Barbell Curl (EZ Bar)", sets: 4, reps: "10-12", primaryMuscleGroups: ["Biceps"] },
      { name: "Skull Crushers", sets: 4, reps: "10-12", primaryMuscleGroups: ["Triceps - Long Head"] },
      { name: "Hammer Curls", sets: 3, reps: "12-15", primaryMuscleGroups: ["Forearms", "Biceps"] },
      { name: "Tricep Pushdown", sets: 3, reps: "15-20", primaryMuscleGroups: ["Triceps - Lateral Head"] }
    ],
    evening: []
  },
  5: {
    levelName: "Ngày 5: Lower Body (Hamstring/Glute Focus)",
    description: "Chân sau và Mông. Chuỗi xích sau (Posterior Chain).",
    morning: [
      { name: "Romanian Deadlift", sets: 4, reps: "8-10", primaryMuscleGroups: ["Hamstrings", "Glutes", "Lower Back"] },
      { name: "Hip Thrust", sets: 4, reps: "10-12", primaryMuscleGroups: ["Glutes"], notes: "Giữ 2s ở đỉnh" },
      { name: "Lying Leg Curls", sets: 4, reps: "12-15", primaryMuscleGroups: ["Hamstrings"] },
      { name: "Dumbbell Lunges (Walking)", sets: 3, reps: "12/leg", primaryMuscleGroups: ["Glutes", "Quads"] },
      { name: "Seated Calf Raise", sets: 4, reps: "15-20", primaryMuscleGroups: ["Calves"] },
      { name: "Hanging Leg Raise", sets: 3, reps: "15-20", primaryMuscleGroups: ["Abs - Lower"] }
    ],
    evening: []
  },
  6: {
    levelName: "Ngày 6: Rest & Recovery",
    description: "Nghỉ ngơi hoàn toàn.",
    morning: [
      { name: "Walking (Optional)", sets: 1, reps: "30 mins", primaryMuscleGroups: ["Cardio"] }
    ],
    evening: []
  },
  7: {
    levelName: "Ngày 7: Rest & Recovery",
    description: "Nghỉ ngơi hoàn toàn.",
    morning: [
      { name: "Walking (Optional)", sets: 1, reps: "30 mins", primaryMuscleGroups: ["Cardio"] }
    ],
    evening: []
  }
};

// --- HARDCODED HOME WORKOUT SCHEDULE (Gym + Calis Hybrid) ---
const HOME_WORKOUT_SCHEDULE: Record<number, any> = {
  1: {
    levelName: "Ngày 1: Push Day (Ngực, Vai, Tay sau)",
    description: "Đẩy tại nhà - kết hợp tạ đơn và bodyweight.",
    morning: [
      { name: "Push-up (Wide Grip)", sets: 4, reps: "12-15", equipment: "None", primaryMuscleGroups: ["Chest - Middle", "Triceps"] },
      { name: "Dumbbell Floor Press", sets: 3, reps: "10-12", equipment: "Tạ đơn", primaryMuscleGroups: ["Chest - Middle", "Triceps - Long Head"] },
      { name: "Pike Push-up", sets: 3, reps: "10-12", equipment: "None", primaryMuscleGroups: ["Front Delts", "Triceps"] },
      { name: "Dumbbell Shoulder Press", sets: 3, reps: "10-12", equipment: "Tạ đơn", primaryMuscleGroups: ["Front Delts", "Side Delts"] },
      { name: "Dumbbell Lateral Raise", sets: 3, reps: "15-20", equipment: "Tạ đơn", primaryMuscleGroups: ["Side Delts"] },
      { name: "Diamond Push-up", sets: 3, reps: "10-12", equipment: "None", primaryMuscleGroups: ["Triceps - Lateral Head", "Chest - Middle"] }
    ],
    evening: []
  },
  2: {
    levelName: "Ngày 2: Pull Day (Lưng, Tay Trước)",
    description: "Kéo tại nhà - bodyweight và tạ đơn.",
    morning: [
      { name: "Pull-up (Hoặc Inverted Row)", sets: 4, reps: "8-12", equipment: "Xà đơn/Bàn", primaryMuscleGroups: ["Lats", "Biceps"] },
      { name: "Dumbbell Bent Over Row", sets: 3, reps: "10-12", equipment: "Tạ đơn", primaryMuscleGroups: ["Upper Back", "Lats"] },
      { name: "Dumbbell Rear Delt Fly", sets: 3, reps: "15-20", equipment: "Tạ đơn", primaryMuscleGroups: ["Rear Delts", "Upper Back"] },
      { name: "Chin-up (Hoặc Curl)", sets: 3, reps: "8-10", equipment: "Xà đơn/Tạ đơn", primaryMuscleGroups: ["Biceps", "Lats"] },
      { name: "Dumbbell Bicep Curl", sets: 3, reps: "12-15", equipment: "Tạ đơn", primaryMuscleGroups: ["Biceps"] },
      { name: "Hammer Curl", sets: 3, reps: "10-12", equipment: "Tạ đơn", primaryMuscleGroups: ["Biceps", "Forearms"] }
    ],
    evening: []
  },
  3: {
    levelName: "Ngày 3: Legs Day (Chân + Core)",
    description: "Chân và core - bodyweight và tạ đơn.",
    morning: [
      { name: "Goblet Squat", sets: 4, reps: "12-15", equipment: "Tạ đơn", primaryMuscleGroups: ["Quads", "Glutes"] },
      { name: "Dumbbell Romanian Deadlift", sets: 3, reps: "10-12", equipment: "Tạ đơn", primaryMuscleGroups: ["Hamstrings", "Glutes"] },
      { name: "Bulgarian Split Squat", sets: 3, reps: "10/leg", equipment: "Ghế/Tạ đơn", primaryMuscleGroups: ["Quads", "Glutes"] },
      { name: "Calf Raise (Single Leg)", sets: 3, reps: "15-20", equipment: "None", primaryMuscleGroups: ["Calves"] },
      { name: "Plank", sets: 3, reps: "45-60s", equipment: "None", primaryMuscleGroups: ["Core", "Abs - Upper"] },
      { name: "Bicycle Crunch", sets: 3, reps: "20", equipment: "None", primaryMuscleGroups: ["Abs - Lower", "Obliques"] }
    ],
    evening: []
  },
  4: {
    levelName: "Ngày 4: Upper Body (Full)",
    description: "Toàn thân trên - cường độ trung bình.",
    morning: [
      { name: "Incline Push-up (Chân cao)", sets: 3, reps: "12-15", equipment: "Ghế", primaryMuscleGroups: ["Chest - Upper", "Front Delts"] },
      { name: "Dumbbell Floor Press", sets: 3, reps: "10-12", equipment: "Tạ đơn", primaryMuscleGroups: ["Chest - Middle", "Triceps"] },
      { name: "Dumbbell Row (Single Arm)", sets: 3, reps: "10-12/arm", equipment: "Tạ đơn", primaryMuscleGroups: ["Lats", "Upper Back"] },
      { name: "Arnold Press", sets: 3, reps: "10-12", equipment: "Tạ đơn", primaryMuscleGroups: ["Front Delts", "Side Delts"] },
      { name: "Dumbbell Skull Crusher", sets: 3, reps: "12-15", equipment: "Tạ đơn", primaryMuscleGroups: ["Triceps - Long Head"] },
      { name: "Concentration Curl", sets: 3, reps: "10-12", equipment: "Tạ đơn", primaryMuscleGroups: ["Biceps"] }
    ],
    evening: []
  },
  5: {
    levelName: "Ngày 5: Lower Body + Cardio",
    description: "Chân + cardio nhẹ.",
    morning: [
      { name: "Jump Squat", sets: 3, reps: "15", equipment: "None", primaryMuscleGroups: ["Quads", "Glutes"] },
      { name: "Dumbbell Sumo Squat", sets: 3, reps: "12-15", equipment: "Tạ đơn", primaryMuscleGroups: ["Quads", "Glutes"] },
      { name: "Glute Bridge (Single Leg)", sets: 3, reps: "12/leg", equipment: "None", primaryMuscleGroups: ["Glutes", "Hamstrings"] },
      { name: "Dumbbell Step Up", sets: 3, reps: "10/leg", equipment: "Ghế/Tạ đơn", primaryMuscleGroups: ["Quads", "Glutes"] },
      { name: "Mountain Climber", sets: 3, reps: "30s", equipment: "None", primaryMuscleGroups: ["Core", "Cardio"] },
      { name: "Burpees", sets: 3, reps: "10", equipment: "None", primaryMuscleGroups: ["Full Body", "Cardio"] }
    ],
    evening: []
  },
  6: {
    levelName: "Ngày 6: Full Body Circuit",
    description: "Circuit training - toàn thân, cường độ cao.",
    morning: [
      { name: "Dumbbell Thruster", sets: 3, reps: "12", equipment: "Tạ đơn", primaryMuscleGroups: ["Quads", "Front Delts"] },
      { name: "Push-up to Renegade Row", sets: 3, reps: "8/arm", equipment: "Tạ đơn", primaryMuscleGroups: ["Chest - Middle", "Lats"] },
      { name: "Dumbbell Swing", sets: 3, reps: "15", equipment: "Tạ đơn", primaryMuscleGroups: ["Glutes", "Hamstrings"] },
      { name: "Dips (Ghế/Sàn)", sets: 3, reps: "12-15", equipment: "Ghế", primaryMuscleGroups: ["Triceps", "Chest - Lower"] },
      { name: "Plank to Push-up", sets: 3, reps: "10", equipment: "None", primaryMuscleGroups: ["Core", "Triceps"] },
      { name: "Jumping Jacks", sets: 3, reps: "50", equipment: "None", primaryMuscleGroups: ["Cardio", "Full Body"] }
    ],
    evening: []
  },
  7: {
    levelName: "Ngày 7: Rest & Recovery",
    description: "Nghỉ ngơi tích cực, đi bộ nhẹ nhàng.",
    morning: [
      { name: "Walking (Light Cardio)", sets: 1, reps: "45-60 mins", primaryMuscleGroups: ["None"] }
    ],
    evening: []
  }
};

// --- SPLIT GENERATION PARTS ---

const generateWorkoutPart = async (userData: UserInput, history: WorkoutHistoryItem[], apiKey: string): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey });
  const model = MODELS.WORKOUT;

  // Determine Day Number (1-7)
  // Determine Day Number based on completed workouts this week (Mon-Sun)
  const now = new Date();
  const startOfWeek = new Date(now);
  const currentDay = startOfWeek.getDay() || 7; // Mon=1, ... Sun=7
  startOfWeek.setDate(now.getDate() - currentDay + 1);
  startOfWeek.setHours(0, 0, 0, 0);

  // Filter history for workouts completed on or after startOfWeek
  const workoutsThisWeek = history.filter(h => h.timestamp >= startOfWeek.getTime()).length;
  // Current day is (workouts completed + 1). If 0 completed, it's Day 1.
  const currentDayNumber = (workoutsThisWeek % 7) + 1;
  const dayNames = ["", "Day 1 (Push)", "Day 2 (Back/Biceps)", "Day 3 (Legs/Abs)", "Day 4 (Arms)", "Day 5 (Chest/Back)", "Day 6 (Shoulder/Arms)", "Day 7 (Rest/Walk)"];
  const currentSplitName = dayNames[currentDayNumber];

  let workoutInstructionBlock = "";
  if (userData.trainingMode === 'gym') {
    /* 
    // OLD AI PROMPT - BYPASSED FOR GYM MODE
    workoutInstructionBlock = `
    ### WORKOUT MODE: GYM BODYBUILDING (STRICT 6-DAY SPLIT)
    ...
    `; 
    */

    // DIRECTLY RETURN HARDCODED SCHEDULE
    let schedule = GYM_SCHEDULE[currentDayNumber] || GYM_SCHEDULE[1];

    // --- PERSONALIZATION LOGIC ---
    // Make a deep copy to avoid mutating the constant
    schedule = JSON.parse(JSON.stringify(schedule));

    const health = userData.healthCondition || 'Good';
    const intensity = userData.selectedIntensity || 'medium';

    if (schedule.morning && schedule.morning.length > 0) {
      schedule.morning = schedule.morning.map((ex: any) => {
        let sets = ex.sets;
        let note = "";

        // 1. HEALTH CONDITION ADJUSTMENTS
        if (health === 'Injured') {
          sets = Math.max(2, sets - 1); // Reduce volume
          note += " [CHẤN THƯƠNG: Tập nhẹ, focus form]";
        } else if (health === 'Tired') {
          sets = Math.max(2, sets - 1);
          note += " [MỆT MỎI: Giảm volume]";
        }

        // 2. INTENSITY ADJUSTMENTS
        if (intensity === 'hard' && health === 'Good') {
          sets += 1; // Increase volume
          note += " [HARDCORE: +1 Set]";
        } else if (intensity === 'low') {
          sets = Math.max(2, sets - 1);
          note += " [LITE: Giảm nhẹ]";
        }

        return {
          ...ex,
          sets: sets,
          notes: (ex.notes || "") + note
        };
      });
    }

    return {
      workout: {
        summary: `Hôm nay là ${schedule.levelName}. (Health: ${health}, Mode: ${intensity})`,
        detail: schedule
      },
      schedule: {
        suggestedWorkoutTime: "17:30",
        suggestedSleepTime: "23:00",
        reasoning: "Lịch tập cố định 6 ngày."
      }
    };
  } else if (userData.trainingMode === 'home') {
    // HOME WORKOUT MODE - AI Generated (Gym + Calis Hybrid)
    workoutInstructionBlock = `
    ### WORKOUT MODE: HOME WORKOUT (GYM + CALISTHENICS HYBRID)
    TODAY IS: ${currentSplitName}.
    FOCUS: Target the SAME MUSCLE GROUPS as traditional gym workouts, but using HOME EQUIPMENT and BODYWEIGHT.
    
    **GOAL**: Create a gym-quality workout at home. Each exercise should target specific muscle groups like gym machines do.
    
    **STRICT 6-DAY SPLIT (FOLLOW GYM MUSCLE TARGETING)**:
    - Day 1: PUSH (Chest - Upper/Middle/Lower, Front Delts, Side Delts, Triceps) - Like Bench Press, Shoulder Press
    - Day 2: PULL (Lats, Upper Back, Rear Delts, Biceps, Traps) - Like Cable Rows, Pull-downs
    - Day 3: LEGS + CORE (Quads, Hamstrings, Glutes, Calves, Abs) - Like Leg Press, Leg Curls
    - Day 4: UPPER BODY (Mix of Push/Pull - Chest, Back, Arms) - Hypertrophy focus
    - Day 5: LOWER BODY + CARDIO (Legs + Light Cardio) - Endurance focus
    - Day 6: FULL BODY CIRCUIT (All muscle groups, high intensity)
    - Day 7: REST & RECOVERY (Walking, Light stretching)
    
    **EXERCISE SELECTION RULES**:
    - Use bodyweight exercises that MIMIC gym movements (e.g., Push-ups instead of Bench Press)
    - Use dumbbells if available for isolation exercises
    - Include compound movements that hit multiple muscle groups
    - Each muscle group should get DIRECT stimulus like in gym
    
    **DAILY ABS & CARDIO**: Include 1 Abs + 1 Cardio in Evening if Day 1-6.
    **REST DAY RULES**: Main Activity: "Walking (Cardio)" - 45-60 Minutes.
    `;
  } else {
    workoutInstructionBlock = `
    ### WORKOUT MODE: CALISTHENICS & STREET WORKOUT
    TODAY IS: ${currentSplitName}. 
    FOCUS: BODYWEIGHT MASTERY, SKILLS (Planche, Front Lever progs), and RELATIVE STRENGTH.
    
    Reference Split (Flexible):
    - Day 1: Push (Push-ups, Dips, Handstand work)
    - Day 2: Pull (Pull-ups, Rows, Front Lever work)
    - Day 3: Legs & Core (Squats, Lunges, L-Sits)
    - Day 4: Skills & Isometrics
    - Day 5: Full Body Intensity
    - Day 6: Cardio & Endurance
    - Day 7: Active Recovery
    
    **DAILY ABS & CARDIO**: EVERY SINGLE DAY MUST include 1 Abs + 1 Cardio in Evening.
    **REST DAY RULES**: Main Activity: "Walking (Cardio)" - 60 Minutes + Light Abs.
    `;
  }

  const schema = {
    type: Type.OBJECT,
    properties: {
      date: { type: Type.STRING },
      schedule: {
        type: Type.OBJECT,
        properties: {
          suggestedWorkoutTime: { type: Type.STRING },
          suggestedSleepTime: { type: Type.STRING },
          reasoning: { type: Type.STRING }
        }
      },
      workout: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          detail: {
            type: Type.OBJECT,
            properties: {
              levelName: { type: Type.STRING },
              description: { type: Type.STRING },
              morning: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    sets: { type: Type.NUMBER },
                    reps: { type: Type.STRING },
                    notes: { type: Type.STRING },
                    equipment: { type: Type.STRING },
                    colorCode: { type: Type.STRING },
                    isBFR: { type: Type.BOOLEAN },
                    primaryMuscleGroups: { type: Type.ARRAY, items: { type: Type.STRING } },
                    secondaryMuscleGroups: { type: Type.ARRAY, items: { type: Type.STRING } }
                  }
                }
              },
              evening: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    sets: { type: Type.NUMBER },
                    reps: { type: Type.STRING },
                    notes: { type: Type.STRING },
                    equipment: { type: Type.STRING },
                    colorCode: { type: Type.STRING },
                    isBFR: { type: Type.BOOLEAN },
                    primaryMuscleGroups: { type: Type.ARRAY, items: { type: Type.STRING } },
                    secondaryMuscleGroups: { type: Type.ARRAY, items: { type: Type.STRING } }
                  }
                }
              }
            }
          }
        }
      }
    }
  };

  const prompt = `
    ACT AS A WORLD-CLASS PERSONAL TRAINER.
    GENERATE A 1-DAY WORKOUT PLAN FOR: ${getCurrentDate()}.
    TRAINING MODE: ${userData.trainingMode === 'home' ? 'HOME WORKOUT (GYM + CALIS HYBRID)' : 'CALISTHENICS/STREET WORKOUT'}.
    
    ${workoutInstructionBlock}

    ### LANGUAGE & LOCALIZATION RULES
    - **VIETNAMESE REQUIRED**: Summary, Description, Reasoning MUST be in **VIETNAMESE**.
    - **SUMMARY**: concise (max 2 sentences). NO motivational rants. NO repetition.
    - **REASONING**: strictly technical explanation of the split.
    - **LANGUAGE**: Vietnamese (except technical terms like "Bench Press").
    - **SCHEDULE**: reasonable times based on user habits.
    - **EXERCISE NAMES**: MUST be in **ENGLISH** (e.g., "Incline Bench Press").
    - **CONCISENESS**: Keep descriptions Short & Fast.
    
    ### STRICT OUTPUT RULES
    - Do NOT include long lists of quotes (e.g. "Never give up", "Stay strong").
    - Do NOT repeat phrases.
    - Keep it professional and direct.

    ### GENERAL WORKOUT RULES
    - **INTENSITY**: ${userData.selectedIntensity}.
    - **EQUIPMENT**: ${userData.equipment.join(', ')}.
    - **STRICT EQUIPMENT CHECK**: ONLY use listed tools. Substitute missing with BODYWEIGHT.
    - **ONE DUMBBELL RULE**: User only has ONE dumbbell unless "2x" specified.
    - **CARDIO NAMING**: Append "(Cardio)" to Walking/Running.

    ### COLOR CODING & MUSCLE GROUPS
    - Assign 'colorCode' (Blue=Chest, Red=Shoulder, Yellow=Back, Green=Triceps, Pink=Biceps, Purple=Legs, Orange=Abs/Cardio).
    - Specify 'primaryMuscleGroups' and 'secondaryMuscleGroups' using SPECIFIC anatomical names (e.g., "Chest - Upper", "Lats", "Front Delts").
    - **Danh Sách Nhóm Cơ Chi Tiết (BẮT BUỘC SỬ DỤNG CHÍNH XÁC)**:
      - Ngực: Chest - Upper, Chest - Middle, Chest - Lower
      - Vai: Front Delts, Side Delts, Rear Delts
      - Lưng: Lats, Upper Back, Lower Back, Traps
      - Tay: Biceps, Triceps - Long Head, Triceps - Lateral Head, Triceps, Forearms
      - Chân: Quads, Hamstrings, Glutes, Calves
      - Bụng: Abs - Upper, Abs - Lower, Obliques, Core

    ### DATA INPUTS
    - Sore Muscles: ${userData.soreMuscles.join(', ')}.
    - Fatigue: ${userData.fatigue}.

    Generate JSON response with 'date', 'schedule', and 'workout' fields.
  `;

  const response = await ai.models.generateContent({
    model: model,
    contents: prompt,
    config: { responseMimeType: "application/json", responseSchema: schema },
  });

  const jsonText = response.text;
  if (!jsonText) throw new Error("Empty workout response");
  return cleanAndParseJSON(jsonText, "WorkoutPart");
};

const generateNutritionPart = async (userData: UserInput, apiKey: string): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey });
  const model = MODELS.MENU;

  const { tdee, burn, target } = calculateTargetCalories(userData.weight, userData.height, userData.nutritionGoal, userData.selectedIntensity);
  const proteinMultiplier = userData.nutritionGoal === 'bulking' ? 2.2 : 2.0;
  const proteinTarget = Math.round(userData.weight * proteinMultiplier);
  const fatTarget = Math.round(userData.weight * 0.9);
  const caloriesFromProtFat = (proteinTarget * 4) + (fatTarget * 9);
  const carbTarget = Math.max(0, Math.round((target - caloriesFromProtFat) / 4));
  const goalText = userData.nutritionGoal === 'bulking' ? "BULKING (Tăng cân)" : "CUTTING (Giảm cân)";

  const schema = {
    type: Type.OBJECT,
    properties: {
      nutrition: {
        type: Type.OBJECT,
        properties: {
          totalCalories: { type: Type.NUMBER },
          totalProtein: { type: Type.NUMBER },
          totalCarbs: { type: Type.NUMBER },
          totalFat: { type: Type.NUMBER },
          advice: { type: Type.STRING },

          meals: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                calories: { type: Type.NUMBER },
                protein: { type: Type.NUMBER },
                carbs: { type: Type.NUMBER },
                fat: { type: Type.NUMBER },
                description: { type: Type.STRING },
              }
            }
          }
        }
      }
    }
  };

  const prompt = `
    ACT AS A NUTRITIONIST.
    GENERATE A 1-DAY MEAL PLAN.
    
    ### NUTRITION RULES (DYNAMIC MATH)
    - **CALCULATED TARGET**: ${Math.round(target)} kcal.
    - **MACROS TARGET**: Protein: ${proteinTarget}g, Carbs: ${carbTarget}g, Fat: ${fatTarget}g.
    - **GOAL**: ${goalText}.
    - **MEAL DESCRIPTIONS**: MUST BE IN VIETNAMESE. Simple (e.g., "200g Ức gà + Cơm").
    - **MEAL MACROS**: Estimate carbs/fat for EACH meal. Sum must match daily total.
    - **CARBS**: Breakfast: NO RICE. Lunch/Dinner: Rice allowed.
    - **FORMAT**: Meal names with time (e.g., "Bữa Sáng (07:00)").
 

    ### DATA INPUTS
    - Weight: ${userData.weight}kg, Height: ${userData.height}cm.
    - Food Consumed Today: ${userData.consumedFood.join(', ')} (Subtract these).
    - Creatine: ${userData.useCreatine ? "YES" : "NO"}.

    Generate JSON response with 'nutrition' field.
  `;

  const response = await ai.models.generateContent({
    model: model,
    contents: prompt,
    config: { responseMimeType: "application/json", responseSchema: schema },
  });

  const jsonText = response.text;
  if (!jsonText) throw new Error("Empty nutrition response");
  return cleanAndParseJSON(jsonText, "NutritionPart");
};

export const generateDailyPlan = async (
  userData: UserInput,
  fullHistory: WorkoutHistoryItem[],
  generationType: 'workout' | 'nutrition' | 'both' = 'both' // New parameter
): Promise<DailyPlan> => {
  // Optimization: Only use the last 14 days of history
  const history = fullHistory.slice(-14);
  let apiKey = getCurrentApiKey(); // Change to let

  if (!apiKey) {
    console.warn("No API Keys found. Using fallback plan.");
    return getFallbackPlan(userData);
  }

  let retriesLeft = API_KEYS.length;

  while (retriesLeft > 0) {
    try {
      console.log(`🚀 Generating Plan (${generationType}) with Key Index ${currentKeyIndex}...`);

      // ... (rest of logic uses apiKey)

      let workoutPart: any = {};
      let nutritionPart: any = {};

      if (generationType === 'workout' || generationType === 'both') {
        workoutPart = await generateWorkoutPart(userData, history, apiKey);
      }

      if (generationType === 'nutrition' || generationType === 'both') {
        nutritionPart = await generateNutritionPart(userData, apiKey);


      }

      // ... (rest of success logic)

      const fallback = getFallbackPlan(userData);

      // Build result: ONLY include the generated part.
      // The OTHER part should be blank (isGenerated: false, no data)
      // to avoid fallback meals/workout leaking into daily_plans.
      const blankNutrition = {
        totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0,
        advice: '', isGenerated: false, meals: [] as Meal[]
      };
      const blankWorkout = {
        summary: '', detail: { levelName: '', description: '', morning: [] as Exercise[], evening: [] as Exercise[] },
        isGenerated: false
      };

      const result: DailyPlan = {
        date: getCurrentDate(),
        schedule: (generationType === 'workout' || generationType === 'both')
          ? (workoutPart.schedule || fallback.schedule)
          : fallback.schedule,
        // Workout: use generated if applicable, otherwise blank
        workout: (generationType === 'workout' || generationType === 'both')
          ? { ...workoutPart.workout, isGenerated: true }
          : blankWorkout,
        // Nutrition: use generated if applicable, otherwise blank
        nutrition: (generationType === 'nutrition' || generationType === 'both')
          ? { ...nutritionPart.nutrition, isGenerated: true }
          : blankNutrition,
      };

      return result;

    } catch (error) {
      console.error("Gemini API Error (Parallel):", error);

      if (isRateLimitError(error) && retriesLeft > 1) {
        const newKey = markRateLimitedAndRotate();
        if (newKey) {
          console.log(`⚡ Rate limit detected, switching to next API key...`);
          apiKey = newKey; // Update the variable!
          retriesLeft--;
          continue;
        }
      }

      // If one part fails or no more keys, return fallback
      return getFallbackPlan(userData);
    }
  }

  return getFallbackPlan(userData);
};

// --- AI OVERVIEW GENERATION ---

const getFallbackAIOverview = (history: WorkoutHistoryItem[]): AIOverview => {
  const lastWeek = history.filter(h => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return h.timestamp >= weekAgo;
  });

  const workoutsCompleted = lastWeek.length;
  const totalExercises = lastWeek.reduce((acc, h) => acc + (h.completedExercises?.length || 0), 0);
  const consistency = Math.round((workoutsCompleted / 7) * 100);

  return {
    summary: history.length === 0
      ? "Chưa có dữ liệu tập luyện. Hãy bắt đầu lịch trình đầu tiên của bạn!"
      : `Bạn đã hoàn thành ${workoutsCompleted} buổi tập trong tuần này với ${totalExercises} bài tập.`,
    strengths: history.length > 0 ? ["Đã bắt đầu hành trình tập luyện"] : [],
    improvements: workoutsCompleted < 4 ? ["Tăng tần suất tập luyện lên 4-5 ngày/tuần"] : [],
    recommendation: "Tiếp tục duy trì lịch tập đều đặn và tập trung vào progressive overload.",
    motivationalQuote: "\"Điều duy nhất đáng sợ là sự sợ hãi chính nó.\" - David Goggins",
    weeklyStats: {
      workoutsCompleted,
      totalExercises,
      estimatedCaloriesBurned: workoutsCompleted * 350,
      consistency
    }
  };
};

export const generateAIOverview = async (
  history: WorkoutHistoryItem[],
  userData?: UserInput
): Promise<AIOverview> => {
  let apiKey = getCurrentApiKey();
  if (!apiKey || history.length === 0) {
    return getFallbackAIOverview(history);
  }

  let ai = new GoogleGenAI({ apiKey });
  let retriesLeft = API_KEYS.length;
  const model = MODELS.OVERVIEW;

  // Prepare history summary for context
  const lastWeekHistory = history.filter(h => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return h.timestamp >= weekAgo;
  });

  const historySummary = lastWeekHistory.map(h => ({
    date: h.date,
    level: h.levelSelected,
    exercises: h.completedExercises?.length || 0,
    exerciseNames: h.completedExercises?.slice(0, 5).join(', ') || 'N/A'
  }));

  const schema = {
    type: Type.OBJECT,
    properties: {
      summary: { type: Type.STRING },
      strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
      improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
      recommendation: { type: Type.STRING },
      motivationalQuote: { type: Type.STRING },
      weeklyStats: {
        type: Type.OBJECT,
        properties: {
          workoutsCompleted: { type: Type.NUMBER },
          totalExercises: { type: Type.NUMBER },
          estimatedCaloriesBurned: { type: Type.NUMBER },
          consistency: { type: Type.NUMBER }
        }
      }
    }
  };

  const prompt = `
ROLE: Huấn luyện viên cá nhân chuyên nghiệp, phân tích tiến trình tập luyện.

CONTEXT: Lịch sử tập (7 ngày gần nhất):
${JSON.stringify(historySummary, null, 2)}

Tổng buổi tập: ${history.length}
${userData ? `Mục tiêu: ${userData.nutritionGoal === 'bulking' ? 'Tăng cơ' : 'Giảm mỡ'}` : ''}

TASK: Phân tích tiến trình, tạo AI Overview bằng tiếng Việt.

RULES:
- summary: 1-2 câu tóm tắt tiến trình tuần
- strengths: 2-3 điểm mạnh (VD: "Tập đều đặn", "Focus compound movements")
- improvements: 2-3 điểm cần cải thiện
- recommendation: 1 gợi ý cụ thể cho tuần tới
- motivationalQuote: Quote tiếng Việt từ David Goggins/bodybuilder nổi tiếng
- weeklyStats: consistency = (workouts/7)*100

OUTPUT: JSON format.
  `;

  while (retriesLeft > 0) {
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
        },
      });

      const jsonText = response.text;
      if (!jsonText) throw new Error("Empty response");

      const parsed = cleanAndParseJSON(jsonText, "AIOverview");
      return {
        ...parsed,
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
        improvements: Array.isArray(parsed.improvements) ? parsed.improvements : []
      };
    } catch (error) {
      console.error("AI Overview Error:", error);

      // Check if rate limited and we have more keys to try
      if (isRateLimitError(error) && retriesLeft > 1) {
        const newKey = markRateLimitedAndRotate();
        if (newKey) {
          console.log(`⚡ Rate limit detected on AI Overview, switching to next API key...`);
          ai = new GoogleGenAI({ apiKey: newKey });
          apiKey = newKey; // Also update the local tracking var if needed, mostly for consistency
          retriesLeft--;
          continue;
        }
      }

      // No more retries or not a rate limit error
      return getFallbackAIOverview(history);
    }
  }

  return getFallbackAIOverview(history);
};



// --- SINGLE EXERCISE SUGGESTION ---

export const suggestNextExercises = async (
  currentPlan: DailyPlan,
  userData: UserInput,
  section: 'morning' | 'evening'
): Promise<Exercise[]> => {
  const apiKey = getCurrentApiKey();
  if (!apiKey) return []; // Should handle fallback but for single suggest maybe just fail

  let ai = new GoogleGenAI({ apiKey });
  let retriesLeft = API_KEYS.length;
  const model = MODELS.WORKOUT; // Use same workout model

  const existingExercises = section === 'morning'
    ? currentPlan.workout.detail.morning
    : currentPlan.workout.detail.evening;

  const existingNames = existingExercises.map(e => e.name).join(", ");

  const prompt = `
    ACT AS A PERSONAL TRAINER.
    THE USER IS CURRENTLY DOING A WORKOUT SESSION (${section.toUpperCase()}).
    
    CURRENT EXERCISES IN THIS SESSION: ${existingNames}
    USER GOAL: ${userData.nutritionGoal}
    USER EQUIPMENT: ${userData.equipment.join(', ')}
    
    TASK: SUGGEST 1 NEW EXERCISE to add to this session.
    It should complement the existing exercises (e.g., if they did Chest, maybe add Triceps or another Chest variation).
    
    OUTPUT FORMAT: JSON Array with 1 Exercise object.
    
    REQUIRED FIELDS: name (English), sets (number), reps (string), notes (Vietnamese, short motivation), colorCode, primaryMuscleGroups, secondaryMuscleGroups.
  `;

  const schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        sets: { type: Type.NUMBER },
        reps: { type: Type.STRING },
        notes: { type: Type.STRING },
        equipment: { type: Type.STRING },
        colorCode: { type: Type.STRING },
        isBFR: { type: Type.BOOLEAN },
        primaryMuscleGroups: { type: Type.ARRAY, items: { type: Type.STRING } },
        secondaryMuscleGroups: { type: Type.ARRAY, items: { type: Type.STRING } }
      }
    }
  };

  while (retriesLeft > 0) {
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: { responseMimeType: "application/json", responseSchema: schema },
      });

      const jsonText = response.text;
      if (!jsonText) throw new Error("Empty response");

      return cleanAndParseJSON(jsonText, "SuggestExercise");
    } catch (error) {
      console.error("Suggest Exercise Error:", error);
      if (isRateLimitError(error) && retriesLeft > 1) {
        const newKey = markRateLimitedAndRotate();
        if (newKey) {
          ai = new GoogleGenAI({ apiKey: newKey });
          retriesLeft--;
          continue;
        }
      }
      return [];
    }
  }
  return [];
};

export const getBasicNutritionPlan = (userData: UserInput): DailyPlan => {
  const { tdee, burn, target } = calculateTargetCalories(userData.weight, userData.height, userData.nutritionGoal, userData.selectedIntensity);

  const isBulking = userData.nutritionGoal === 'bulking';
  const proteinTarget = Math.round(userData.weight * (isBulking ? 2.2 : 2.0));
  const fatTarget = Math.round(userData.weight * 0.9);

  const caloriesFromProtein = proteinTarget * 4;
  const caloriesFromFat = fatTarget * 9;
  const remainingCalories = target - caloriesFromProtein - caloriesFromFat;
  const carbTarget = Math.max(0, Math.round(remainingCalories / 4));

  return {
    date: getCurrentDate(),
    schedule: {
      suggestedWorkoutTime: "17:30",
      suggestedSleepTime: "23:00",
      reasoning: "Chế độ theo dõi thủ công."
    },
    workout: {
      summary: "Chưa có lịch tập.",
      detail: { levelName: "N/A", description: "N/A", morning: [], evening: [] },
      isGenerated: false
    },
    nutrition: {
      totalCalories: target,
      totalProtein: proteinTarget,
      totalCarbs: carbTarget,
      totalFat: fatTarget,
      advice: `Mục tiêu: ${isBulking ? 'Bulking' : 'Cutting'}. TDEE: ${tdee}. Theo dõi calories hàng ngày.`,
      isGenerated: true, // Mark as true so NutritionDisplay renders
      meals: [] // Empty meals to start
    }
  };
};

export const analyzeFoodImage = async (base64Image: string, isVideo: boolean = false): Promise<Meal> => {
  const apiKey = getCurrentApiKey();
  if (!apiKey) throw new Error("No API Key available");

  const ai = new GoogleGenAI({ apiKey });

  // STEP 1: RECOGNIZE FOOD (Vision -> Text)
  // Model: Gemini 2.5 Flash-Lite
  const recognitionModel = MODELS.FOOD_RECOGNITION;

  const recognitionPrompt = isVideo
    ? `
      Analyze this video of food and describe what you see in detail in Vietnamese.
      - Identify all food items visible.
      - Estimate portion sizes (e.g., 1 bowl, 200g, 1 piece).
      - List visible ingredients.
      Return ONLY the description. No intro/outro.
    `
    : `
      Analyze this image and describe the food in detail in Vietnamese.
      - Identify the main dish name.
      - Estimate portion size (e.g., 1 bowl, 200g, 1 piece).
      - List visible ingredients.
      Return ONLY the description. No intro/outro.
    `;

  // Detect and remove data URL prefix, extract mimeType
  let cleanBase64 = base64Image;
  let mimeType = "image/jpeg"; // Default for images

  // Check for data URL format and extract mimeType
  const dataUrlMatch = base64Image.match(/^data:([^;]+);base64,/);
  if (dataUrlMatch) {
    mimeType = dataUrlMatch[1]; // e.g., "video/webm" or "image/jpeg"
    cleanBase64 = base64Image.replace(/^data:[^;]+;base64,/, "");
  } else if (isVideo) {
    mimeType = "video/webm";
  }

  console.log(`Analyzing food with mimeType: ${mimeType}, isVideo: ${isVideo}`);

  let foodDescription = "";
  try {
    const response = await ai.models.generateContent({
      model: recognitionModel,
      contents: [
        {
          role: "user",
          parts: [
            { text: recognitionPrompt },
            { inlineData: { mimeType: mimeType, data: cleanBase64 } }
          ]
        }
      ],
    });
    foodDescription = response.text || "";
    if (!foodDescription) throw new Error("Empty recognition response");
    console.log("Food Recognition Result:", foodDescription);
  } catch (error) {
    console.error("Recognition Error:", error);
    throw error;
  }

  // STEP 2: CALCULATE MACROS (Text -> JSON)
  // Model: Gemini 2.5 Flash
  const macroModel = MODELS.MACRO_CALC;

  const macroSchema = {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      calories: { type: Type.NUMBER },
      protein: { type: Type.NUMBER },
      carbs: { type: Type.NUMBER },
      fat: { type: Type.NUMBER },
      description: { type: Type.STRING },
    }
  };

  const macroPrompt = `
    ACT AS A NUTRITIONIST.
    Based on this food description: "${foodDescription}"
    
    Estimate nutritional content.
    Return the result in JSON format.
    
    RULES:
    - Name: Standard Vietnamese name.
    - Calories: Estimated total.
    - Macros: Protein, Carbs, Fat in grams.
    - Description: Use the input description but refine it to be short and clear.
  `;

  try {
    const response = await ai.models.generateContent({
      model: macroModel,
      contents: macroPrompt,
      config: { responseMimeType: "application/json", responseSchema: macroSchema },
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("Empty macro response");
    return cleanAndParseJSON(jsonText, "FoodAnalysis");
  } catch (error) {
    console.error("Macro Calc Error:", error);
    throw error;
  }
};

// --- ANALYZE FOOD TEXT (Manual Input) ---
// Phân tích đồ ăn từ text nhập tay, tính calo/macros
export const analyzeFoodText = async (foodText: string): Promise<Meal> => {
  const apiKey = getCurrentApiKey();
  if (!apiKey) {
    throw new Error("No API Key for food analysis");
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = MODELS.FOOD_SUGGEST; // gemini-2.5-flash

  const schema = {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      calories: { type: Type.NUMBER },
      protein: { type: Type.NUMBER },
      carbs: { type: Type.NUMBER },
      fat: { type: Type.NUMBER },
      description: { type: Type.STRING }
    }
  };

  const prompt = `
    ACT AS A NUTRITIONIST.
    Analyze this food item/meal: "${foodText}"
    
    Estimate nutritional content accurately.
    Return the result in JSON format.
    
    RULES:
    - Name: Standard Vietnamese name for the food (e.g., "Phở bò", "Cơm sườn")
    - Calories: Estimated total calories (number only)
    - Protein: Grams of protein (number only)
    - Carbs: Grams of carbs (number only)  
    - Fat: Grams of fat (number only)
    - Description: Short Vietnamese description (e.g., "1 tô lớn với thịt bò tái")
    
    Be accurate with Vietnamese portion sizes and common ingredients.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: { responseMimeType: "application/json", responseSchema: schema },
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("Empty food analysis response");

    const result = cleanAndParseJSON(jsonText, "FoodTextAnalysis");
    console.log("Analyzed food text:", result);
    return result;
  } catch (error) {
    console.error("Food Text Analysis Error:", error);
    throw error;
  }
};



import { GoogleGenAI, Type } from "@google/genai";
import { UserInput, DailyPlan, WorkoutHistoryItem, Intensity, WorkoutLevel, FatigueLevel, MuscleGroup, AIOverview, Exercise, Meal, SleepRecoveryEntry, FridgeItem } from "../types";
import { loadSleepRecoveryFromSupabase } from './supabasePlanSync';
import { fridgeService } from './fridgeService';

// Nemotron API endpoint (no API keys needed, service provides access)
const NEMOTRON_ENDPOINT = "https://wuxia-api.vdt99.workers.dev/v1/chat/completions";
const GPT_OSS_MODEL = "@cf/moonshotai/kimi-k2.5";

// Gemini API keys from environment (for food image analysis)
// Multiple keys are injected via vite.config.ts
const GEMINI_API_KEYS: string[] = (process.env.GEMINI_API_KEYS as unknown as string[]) || [];

// Model constants
const MODELS = {
  WORKOUT: "nemotron",
  OVERVIEW: "nemotron",
  MENU: "@cf/google/gemma-4-26b-a4b-it",
  FOOD_RECOGNITION: "gemini-2.5-flash-lite",
  MACRO_CALC: "nemotron",
  FOOD_SUGGEST: "@cf/google/gemma-4-26b-a4b-it",
};


// API Status type for external consumption
export interface ApiStatus {
  totalKeys: number;
  currentKeyIndex: number;
  activeKeysCount: number;
  rateLimitedKeysCount: number;
  rateLimitedKeyIndexes: number[];
}

// Track current Gemini API key index
let currentGeminiKeyIndex = 0;

// Track rate-limited Gemini API keys (index -> timestamp)
const rateLimitedGeminiKeys: Map<number, number> = new Map();

// Get API status for UI display (shows Gemini keys status)
export const getApiStatus = (): ApiStatus => {
  const rateLimitedKeyIndexes = Array.from(rateLimitedGeminiKeys.keys());
  return {
    totalKeys: GEMINI_API_KEYS.length,
    currentKeyIndex: currentGeminiKeyIndex,
    activeKeysCount: GEMINI_API_KEYS.length - rateLimitedGeminiKeys.size,
    rateLimitedKeysCount: rateLimitedGeminiKeys.size,
    rateLimitedKeyIndexes
  };
};

// Get current Gemini API key
const getCurrentGeminiApiKey = (): string | null => {
  if (GEMINI_API_KEYS.length === 0) return null;
  return GEMINI_API_KEYS[currentGeminiKeyIndex];
};

// Set current Gemini API key by index (for manual selection from UI)
export const setCurrentApiKey = (index: number): boolean => {
  if (index < 0 || index >= GEMINI_API_KEYS.length) {
    console.error("Invalid Gemini API key index: " + index);
    return false;
  }
  currentGeminiKeyIndex = index;
  console.log("Manually switched to Gemini API key " + (currentGeminiKeyIndex + 1) + "/" + GEMINI_API_KEYS.length);
  return true;
};

// Mark current Gemini key as rate limited and rotate to next
const markGeminiKeyRateLimitedAndRotate = (): string | null => {
  if (GEMINI_API_KEYS.length === 0) return null;

  // Mark current key as rate limited
  rateLimitedGeminiKeys.set(currentGeminiKeyIndex, Date.now());
  console.log("Gemini API key " + (currentGeminiKeyIndex + 1) + " marked as rate limited");

  // Find next available key that's not rate limited
  let attempts = 0;
  while (attempts < GEMINI_API_KEYS.length) {
    currentGeminiKeyIndex = (currentGeminiKeyIndex + 1) % GEMINI_API_KEYS.length;
    if (!rateLimitedGeminiKeys.has(currentGeminiKeyIndex)) {
      console.log("Switched to Gemini API key " + (currentGeminiKeyIndex + 1) + "/" + GEMINI_API_KEYS.length);
      return GEMINI_API_KEYS[currentGeminiKeyIndex];
    }
    attempts++;
  }

  // All keys are rate limited, clear oldest and use it
  if (rateLimitedGeminiKeys.size > 0) {
    const oldestKey = Array.from(rateLimitedGeminiKeys.entries())
      .sort((a, b) => a[1] - b[1])[0][0];
    rateLimitedGeminiKeys.delete(oldestKey);
    currentGeminiKeyIndex = oldestKey;
    console.log("All Gemini keys rate limited, retrying oldest key " + (currentGeminiKeyIndex + 1));
    return GEMINI_API_KEYS[currentGeminiKeyIndex];
  }

  return null;
};

// Helper function to call Nemotron API
const callNemotronAPI = async (
  messages: Array<{ role: string; content: string }>,
  options?: { maxTokens?: number; temperature?: number; signal?: AbortSignal }
): Promise<string> => {
  let history = [...messages];
  let fullContent = "";
  let attempts = 0;
  const MAX_ATTEMPTS = 10;

  while (attempts < MAX_ATTEMPTS) {
    attempts++;

    let response: Response;
    try {
      response = await fetch(NEMOTRON_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "x-model": GPT_OSS_MODEL,
        },
        body: JSON.stringify({
          model: GPT_OSS_MODEL,
          messages: history,
          max_tokens: options?.maxTokens ?? 131000,
          temperature: options?.temperature ?? 0.2,
          stream: false,
        }),
        signal: options?.signal,
      });
    } catch (err) {
      console.error("Nemotron fetch failed:", err);
      throw err;
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Nemotron API error (${response.status}):`, errorText);
      throw new Error(`Nemotron API error: ${response.status}`);
    }

    let data: any;
    try {
      data = await response.json();
    } catch {
      throw new Error("Nemotron returned non-JSON response");
    }

    const chunk: string =
      data?.choices?.[0]?.message?.content ??
      data?.response ??
      "";

    if (!chunk && attempts === 1) {
      throw new Error("Nemotron returned empty content");
    }

    fullContent += chunk;

    console.log(
      `[Nemotron] attempt=${attempts} chunk=${chunk.length}chars`,
      `finish_reason=${data?.choices?.[0]?.finish_reason}`
    );

    const hasMore =
      response.headers.get("x-has-more") === "true" ||
      data?.choices?.[0]?.finish_reason === "length";

    if (!hasMore) break;

    history = [
      ...history,
      { role: "assistant", content: chunk },
      { role: "user", content: "Tiếp tục từ chỗ vừa dừng, không lặp lại." },
    ];
  }

  if (!fullContent) throw new Error("Nemotron returned empty response");

  return fullContent;
};

// Check if error is rate limit related (not needed for Nemotron, but kept for compatibility)
const isRateLimitError = (error: unknown): boolean => {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes('429') ||
      message.includes('rate limit') ||
      message.includes('quota') ||
      message.includes('resource exhausted');
  }
  return false;
};

// Helper to get current formatted date
const getCurrentDate = () => {
  const now = new Date();
  const days = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  return `${days[now.getDay()]}, ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
};

const getCurrentDayPeriod = () => {
  const hour = new Date().getHours();
  if (hour < 11) return 'sáng';
  if (hour < 14) return 'trưa';
  if (hour < 18) return 'chiều';
  return 'tối';
};

// Get average weight from last 7 days
const getAverageWeight = (history: WorkoutHistoryItem[], days: number = 7): number => {
  const weekAgo = Date.now() - days * 24 * 60 * 60 * 1000;
  const recentRecords = history.filter(h => h.timestamp >= weekAgo && h.weight && h.weight > 0);
  
  if (recentRecords.length === 0) return 0;
  
  const totalWeight = recentRecords.reduce((sum, h) => sum + h.weight, 0);
  return Math.round((totalWeight / recentRecords.length) * 10) / 10;
};

// Get weight trend (positive = gaining, negative = losing, 0 = stable)
const getWeightTrend = (history: WorkoutHistoryItem[]): { trend: number; percentChange: number; direction: string } => {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentRecords = history.filter(h => h.timestamp >= sevenDaysAgo && h.weight && h.weight > 0);
  
  if (recentRecords.length < 2) {
    return { trend: 0, percentChange: 0, direction: 'ổn định' };
  }
  
  // Sort by timestamp ascending to get first and last
  const sorted = recentRecords.sort((a, b) => a.timestamp - b.timestamp);
  const firstWeight = sorted[0].weight;
  const lastWeight = sorted[sorted.length - 1].weight;
  const trend = lastWeight - firstWeight;
  const percentChange = (trend / firstWeight) * 100;
  
  let direction = 'ổn định';
  if (trend > 0.5) direction = 'tăng';
  if (trend < -0.5) direction = 'giảm';
  
  return { trend, percentChange: Math.round(percentChange * 100) / 100, direction };
};

// Evaluate food intake status
const evaluateFoodIntake = (consumedFood: string[], targetCalories: number, recentMeals: string[]): { status: string; adjustment: string; reason: string } => {
  const consumedCount = consumedFood.length;
  const mealsPerDay = 4; // Target meals per day
  const consumptionRatio = consumedCount / mealsPerDay;
  
  if (consumptionRatio < 0.5) {
    return {
      status: 'Ăn ít',
      adjustment: '-10%',
      reason: `Chỉ ăn ${consumedCount} bữa, cần tối thiểu 4 bữa. Giảm cường độ để tránh quá tải cơ thể.`
    };
  }
  
  if (consumptionRatio < 0.75) {
    return {
      status: 'Ăn vừa phải',
      adjustment: '-5%',
      reason: `Ăn ${consumedCount} bữa, chưa đủ ${mealsPerDay}. Giảm nhẹ cường độ.`
    };
  }
  
  if (consumptionRatio >= 1) {
    return {
      status: 'Ăn đủ',
      adjustment: '+5%',
      reason: `Ăn ${consumedCount} bữa ≥ ${mealsPerDay}. Có thể tăng cường độ.`
    };
  }
  
  return {
    status: 'Ăn cân bằng',
    adjustment: '0%',
    reason: `Ăn ${consumedCount} bữa, cân bằng. Duy trì cường độ bình thường.`
  };
};

// Helper to clean and parse JSON
const cleanAndParseJSON = (text: string, context: string): any => {
  try {
    let cleaned = text;
    // Extract json block if it exists
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      cleaned = jsonMatch[1].trim();
    } else {
      // Remove markdown code blocks if present (e.g. ```json ... ```)
      cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
    }
    
    // Sometimes the AI might add some text before the JSON, let's find the first `{` or `[` and last `}` or `]`
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    const firstBracket = cleaned.indexOf('[');
    const lastBracket = cleaned.lastIndexOf(']');
    
    // Determine which bracket type is the outermost
    let firstIndex = firstBrace;
    let lastIndex = lastBrace;
    
    if (firstBracket !== -1 && firstBrace !== -1) {
      firstIndex = Math.min(firstBracket, firstBrace);
      lastIndex = Math.max(lastBracket, lastBrace);
    } else if (firstBracket !== -1) {
      firstIndex = firstBracket;
      lastIndex = lastBracket;
    } else if (firstBrace !== -1) {
      firstIndex = firstBrace;
      lastIndex = lastBrace;
    }
    
    if (firstIndex !== -1 && lastIndex !== -1 && lastIndex >= firstIndex) {
      cleaned = cleaned.substring(firstIndex, lastIndex + 1);
    }
    
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

// 1. Calculate BMR (Mifflin-St Jeor) - Assuming Male, Age 18 (avg student age based on context)
const calculateBMR = (weight: number, height: number, age: number = 18): number => {
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
const calculateTargetCalories = (weight: number, height: number, age: number = 18, goal: 'bulking' | 'cutting', intensity: Intensity): { tdee: number, burn: number, target: number } => {
  const bmr = calculateBMR(weight, height, age);
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
const calculateWaterIntake = (weight: number): number => {
  // Base: 40ml per kg (0.04L)
  const baseWater = weight * 0.04;
  // Round to 1 decimal place
  return Math.round(baseWater * 10) / 10;
};


// Fallback plans tailored by intensity and goal
export const getFallbackPlan = (userData: UserInput): DailyPlan => {
  const { tdee, burn, target } = calculateTargetCalories(userData.weight, userData.height, userData.age || 18, userData.nutritionGoal, userData.selectedIntensity);

  const isBulking = userData.nutritionGoal === 'bulking';
  const proteinTarget = Math.round(userData.weight * (isBulking ? 2.2 : 2.0)); // 2.2g or 2.0g per kg

  // Macro Calculation
  // Fat: 0.9g/kg (Moderate)
  let fatTarget = Math.round(userData.weight * 0.9);

  // Carbs: Remaining Calories / 4
  // 1g Protein = 4kcal, 1g Fat = 9kcal, 1g Carb = 4kcal
  const caloriesFromProtein = proteinTarget * 4;
  let caloriesFromFat = fatTarget * 9;
  let remainingCalories = target - caloriesFromProtein - caloriesFromFat;
  let carbTarget = Math.max(0, Math.round(remainingCalories / 4));

  // MACRO-CYCLING (Xoay vòng dinh dưỡng)
  // Điều chỉnh lượng Carb dựa trên cường độ tập luyện của ngày đó.
  // Ngày tập nặng (Leg Day/Back Day) -> Tăng 20% Carb
  // Ngày nghỉ (Rest Day) -> Giảm 30% Carb, tăng Fat tốt để phục hồi hormone.
  if (userData.selectedIntensity === Intensity.Hard) {
    // Heavy training day - increase carbs by 20%
    carbTarget = Math.round(carbTarget * 1.2);
    // Adjust fat and protein to maintain target calories
    const carbCalories = carbTarget * 4;
    const proteinCalories = proteinTarget * 4;
    const fatCalories = target - carbCalories - proteinCalories;
    fatTarget = Math.max(0, Math.round(fatCalories / 9));
  } else if (userData.selectedIntensity === Intensity.Low) {
    // Rest/Light day - decrease carbs by 30%, increase fat
    carbTarget = Math.round(carbTarget * 0.7);
    // Adjust fat and protein to maintain target calories
    const carbCalories = carbTarget * 4;
    const proteinCalories = proteinTarget * 4;
    const fatCalories = target - carbCalories - proteinCalories;
    fatTarget = Math.max(0, Math.round(fatCalories / 9));
  }
  // For medium intensity, keep standard macro calculation

  const intensity = userData.selectedIntensity;

  const workout: WorkoutLevel = intensity === Intensity.Hard ? {
    levelName: "Cháy hết mình (Hard)",
    description: "Tăng cơ tối đa + Daily Abs & Cardio Hardcore.",
    morning: [
       { name: "Decline Push-up", sets: 4, reps: "Max", colorCode: "Red", equipment: "Board + Chân cao", notes: "OFFLINE MODE", primaryMuscleGroups: ["Front Delts", "Chest"], secondaryMuscleGroups: ["Triceps", "Core"] },
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
       { name: "Push-up", sets: 3, reps: "12", colorCode: "Blue", equipment: "Board", notes: "OFFLINE MODE", primaryMuscleGroups: ["Chest"], secondaryMuscleGroups: ["Triceps", "Front Delts", "Core"] },
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
       { name: "Barbell Bench Press", sets: 4, reps: "8-10", primaryMuscleGroups: ["Chest", "Triceps"], notes: "Tăng tạ mỗi set" },
      { name: "Bent Over Barbell Row", sets: 4, reps: "10-12", primaryMuscleGroups: ["Lats", "Upper Back"], notes: "Giữ lưng thẳng" },
       { name: "Incline Dumbbell Press", sets: 4, reps: "10-12", primaryMuscleGroups: ["Chest", "Front Delts"] },
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
       { name: "Push-up (Wide Grip)", sets: 4, reps: "12-15", equipment: "None", primaryMuscleGroups: ["Chest", "Triceps"] },
       { name: "Dumbbell Floor Press", sets: 3, reps: "10-12", equipment: "Tạ đơn", primaryMuscleGroups: ["Chest", "Triceps - Long Head"] },
      { name: "Pike Push-up", sets: 3, reps: "10-12", equipment: "None", primaryMuscleGroups: ["Front Delts", "Triceps"] },
      { name: "Dumbbell Shoulder Press", sets: 3, reps: "10-12", equipment: "Tạ đơn", primaryMuscleGroups: ["Front Delts", "Side Delts"] },
      { name: "Dumbbell Lateral Raise", sets: 3, reps: "15-20", equipment: "Tạ đơn", primaryMuscleGroups: ["Side Delts"] },
       { name: "Diamond Push-up", sets: 3, reps: "10-12", equipment: "None", primaryMuscleGroups: ["Triceps - Lateral Head", "Chest"] }
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
       { name: "Incline Push-up (Chân cao)", sets: 3, reps: "12-15", equipment: "Ghế", primaryMuscleGroups: ["Chest", "Front Delts"] },
       { name: "Dumbbell Floor Press", sets: 3, reps: "10-12", equipment: "Tạ đơn", primaryMuscleGroups: ["Chest", "Triceps"] },
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
       { name: "Push-up to Renegade Row", sets: 3, reps: "8/arm", equipment: "Tạ đơn", primaryMuscleGroups: ["Chest", "Lats"] },
      { name: "Dumbbell Swing", sets: 3, reps: "15", equipment: "Tạ đơn", primaryMuscleGroups: ["Glutes", "Hamstrings"] },
       { name: "Dips (Ghế/Sàn)", sets: 3, reps: "12-15", equipment: "Ghế", primaryMuscleGroups: ["Triceps", "Chest"] },
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

const generateWorkoutPart = async (
  userData: UserInput,
  history: WorkoutHistoryItem[],
  sleepRecovery7Days: SleepRecoveryEntry[],
  onProgress?: (text: string) => void
): Promise<any> => {
  const model = MODELS.WORKOUT;
  const dayPeriod = getCurrentDayPeriod();
  const { target } = calculateTargetCalories(userData.weight, userData.height, userData.age || 18, userData.nutritionGoal, userData.selectedIntensity);
  const proteinTarget = Math.round(userData.weight * (userData.nutritionGoal === 'bulking' ? 2.2 : 2.0));
  
  // Get weight trend analysis
  const weightTrend = getWeightTrend(history);
  const avgWeight = getAverageWeight(history, 7);
  
  // Get food intake assessment
  const foodAssessment = evaluateFoodIntake(userData.consumedFood, target, []);

  const inferEquipmentFromExerciseName = (exerciseName: string): string[] => {
    const name = (exerciseName || '').toLowerCase();
    const equipment = new Set<string>();
    if (name.includes('barbell')) equipment.add('Barbell');
    if (name.includes('dumbbell') || name.includes('db ')) equipment.add('Dumbbell');
    if (name.includes('cable')) equipment.add('Cable');
    if (name.includes('machine')) equipment.add('Machine');
    if (name.includes('bench')) equipment.add('Bench');
    if (name.includes('pull-up') || name.includes('chin-up') || name.includes('bar')) equipment.add('Pull-up Bar');
    if (name.includes('band')) equipment.add('Resistance Band');
    if (name.includes('bodyweight') || name.includes('push-up') || name.includes('plank') || name.includes('burpee')) equipment.add('Bodyweight');
    if (equipment.size === 0) equipment.add('Unknown');
    return Array.from(equipment);
  };

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const history7Days = history
    .filter((h) => h.timestamp >= sevenDaysAgo)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 7)
    .map((h) => ({
      date: h.date,
      level: h.levelSelected,
      completedExercises: h.completedExercises || [],
      exercisesSummary: h.exercisesSummary || '',
      weight: h.weight,
      nutrition: {
        totalCalories: h.nutrition?.totalCalories || 0,
        totalProtein: h.nutrition?.totalProtein || 0,
      },
      exerciseLogs: (h.exerciseLogs || []).map((log) => ({
        exerciseName: log.exerciseName,
        inferredEquipment: inferEquipmentFromExerciseName(log.exerciseName),
        totalVolume: log.totalVolume,
        lastVolume: log.lastVolume, // Σ(weight × reps) of the last workout for this exercise
        recoveryStatus: log.recoveryStatus, // Recovery status of the muscle group (e.g., 'Fresh', 'Tired', 'Injured')
        isBFR: log.isBFR, // Blood Flow Restriction flag
        sets: (log.sets || []).map((s, idx) => ({
          set: idx + 1,
          kg: s.weight,
          reps: s.reps,
        })),
      })),
    }));

  const avgSleepHours = sleepRecovery7Days.length > 0
    ? Number((sleepRecovery7Days.reduce((sum: number, s) => sum + (Number(s.sleepHours) || 0), 0) / sleepRecovery7Days.length).toFixed(1))
    : null;

  const prompt = `
    ACT AS A WORLD-CLASS PERSONAL TRAINER USING MODEL ${model}.
    GENERATE A 1-DAY WORKOUT PLAN FOR: ${getCurrentDate()}.

    BẮT BUỘC:
    - KHÔNG dùng lịch cố định có sẵn.
    - Dựa trên lịch sử 7 ngày gần nhất để tránh trùng nhóm cơ chưa hồi phục.
    - Tự động progressive overload dựa trên dữ liệu set/reps/kg đã tập.
    - Nếu dấu hiệu mệt/đau thì giảm tải hợp lý.

    DỮ LIỆU NGƯỜI DÙNG:
    - Training mode: ${userData.trainingMode}
    - Intensity: ${userData.selectedIntensity}
    - Fatigue: ${userData.fatigue}
    - Sore muscles: ${userData.soreMuscles.join(', ')}
    - Equipment: ${userData.equipment.join(', ')}, Thanh xà đơn (Pull-up bar), Thanh dips (Dip station), Tạ đơn (Dumbbells), Dây BFR (Blood Flow Restriction bands)
    - Tuổi: ${userData.age || 18}
    - Cân nặng hiện tại: ${userData.weight}kg
    - Cân nặng trung bình 7 ngày: ${avgWeight || userData.weight}kg
    - Xu hướng cân nặng: ${weightTrend.direction} (${weightTrend.trend > 0 ? '+' : ''}${weightTrend.trend}kg, ${weightTrend.percentChange}%)
    - Calories mục tiêu hôm nay: ${target} kcal
    - Protein mục tiêu hôm nay: ${proteinTarget} g
    - Mục tiêu: ${userData.nutritionGoal}
    - Đã ăn hôm nay: ${userData.consumedFood.join(', ') || 'Chưa có dữ liệu'}
    - Tình trạng ăn uống: ${foodAssessment.status} (${foodAssessment.reason})
    - Điều chỉnh cương độ dựa trên thức ăn: ${foodAssessment.adjustment}
    - Thời điểm hiện tại: ${dayPeriod}
    - Dữ liệu giấc ngủ 7 ngày: ${JSON.stringify(sleepRecovery7Days)}
    - Số giờ ngủ trung bình 7 ngày: ${avgSleepHours ?? 'Chưa có dữ liệu'}

     LỊCH SỬ 7 NGÀY (bao gồm bài tập đã tập, set, reps, kg, volume, cân nặng, calories, protein, dụng cụ, lastVolume, recoveryStatus, isBFR):
     ${JSON.stringify(history7Days, null, 2)}
     
     QUY TẮC CHỌN BÀI:
     - Không lặp nhóm cơ primary vừa tập nặng trong 48h gần nhất.
     - Đa dạng hóa bài tập: Luân phiên các góc độ, kỹ thuật và biến thể khác nhau để không gây nhàm chán và kích thích cơ toàn diện. Tận dụng triệt để Thanh xà đơn, Thanh dips, Tạ đơn và ưu tiên sử dụng BFR (đặt isBFR: true) cho các bài tập cô lập/isolation cuối buổi.
     - Mỗi bài phải có primaryMuscleGroups và secondaryMuscleGroups rõ ràng.
     - Dùng tiếng Anh cho tên bài tập.
     - Summary/description/reasoning viết tiếng Việt.
     - ĐỐI VỚI BÀI TẬP BODYWEIGHT (không dùng tạ ngoài, ví dụ: hít đất, kéo xà, plank, burpee, crunch...), 'equipment' BẮT BUỘC ghi là 'None'.
     - **PROGRESSIVE OVERLOAD**: So sánh totalVolume với lastVolume từ lịch sử tập. Nếu totalVolume >= lastVolume × 1.05 (tăng 5%), tăng trọng lượng 2.5kg hoặc tăng 2 reps cho lần tập tiếp theo.
     - **MUSCLE RECOVERY HEATMAP**: Sử dụng recoveryStatus để xác định nhóm cơ cần hồi phục. Nếu recoveryStatus là 'Tired' hoặc 'Injured', tránh tập nhóm cơ đó và tập trung vào các nhóm cơ có recoveryStatus là 'Fresh'.
     - **NẾU XU HƯỚNG CÂN NẶNG GIẢM (${weightTrend.direction === 'giảm' ? 'ĐÚNG' : 'SAI'})**:
       - Nếu đang giảm cân, ưu tiên bài tập volume vừa phải, tránh overtraining.
       - Tập trọng lượng nhẹ hơn, tập nhiều reps hơn để tránh mất cơ.
     - **NẾU ĂN ÍT (${foodAssessment.status === 'Ăn ít' ? 'ĐÚNG' : 'SAI'})**:
       - Giảm volume workout, tối ưu recovery.
       - Tập ngắn hơn, focus vào compound movements chính.
       - Có thể giảm ${foodAssessment.adjustment} cường độ.
     - Trong workout.summary HOẶC schedule.reasoning phải có 1 câu hỏi kiểm tra năng lượng theo thời điểm hiện tại, ví dụ: "Hiện tại là ${dayPeriod}, bạn đã nạp đủ calories (${target} kcal) và protein (${proteinTarget}g) chưa?"
     - Trong notes nên ghi rõ target tăng tiến bằng set/reps/kg khi phù hợp, và cảnh báo nếu cần tăng intake.

    YÊU CẦU ĐẦU RA (RẤT QUAN TRỌNG):
    CHỈ XUẤT RA ĐÚNG 1 MẢNG JSON CÓ 1 OBJECT (KHÔNG giải thích, KHÔNG chào hỏi, KHÔNG có văn bản nào khác ngoài JSON):
    \`\`\`json
    [{ "date": "...", "schedule": { "suggestedWorkoutTime": "...", "suggestedSleepTime": "...", "reasoning": "..." }, "workout": { "summary": "...", "detail": { "levelName": "...", "description": "...", "morning": [{ "name": "...", "sets": 0, "reps": "...", "notes": "...", "equipment": "...", "colorCode": "...", "isBFR": false, "primaryMuscleGroups": ["..."], "secondaryMuscleGroups": ["..."] }], "evening": [] } } }]
    \`\`\`
  `;

  const responseText = await callNemotronAPI([
    { role: "user", content: prompt }
    ], { maxTokens: 50000, temperature: 0.2 });

   if (!responseText) throw new Error("Empty workout response");
   const parsed = cleanAndParseJSON(responseText, "WorkoutPart");
   return Array.isArray(parsed) ? parsed[0] : parsed;
 };

const extractMealsFromHistory = (history: WorkoutHistoryItem[], days: number = 7): string[] => {
  const weekAgo = Date.now() - days * 24 * 60 * 60 * 1000;
  const recentMeals: string[] = [];
  
  history.forEach(item => {
    if (item.timestamp >= weekAgo && item.nutrition?.meals) {
      item.nutrition.meals.forEach(meal => {
        recentMeals.push(meal.name);
      });
    }
  });
  
  return recentMeals;
};

const generateMealForTime = async (
  mealName: string,
  targetCalories: number,
  targetProtein: number,
  targetCarbs: number,
  targetFat: number,
  recentMealsStr: string,
  avoidCurrentPlanMealsStr: string,
  dislikedFoodsStr: string,
  dayPeriod: string,
  weightTrendDirection: string,
  foodAssessment: any,
  extraRules: string,
  fridgeItems: any[]
): Promise<{ meals: any[], usedFridgeItems: { id: string, amountUsed: number }[] }> => {
  const fridgeStr = fridgeItems.length > 0
    ? fridgeItems.map(f => `- [ID: ${f.id}] ${f.name} (${f.quantity}${f.unit})`).join('\n')
    : "Trống";

  const prompt = `
ACT AS A NUTRITIONIST.
Return ONLY valid JSON (no markdown).

MEAL: ${mealName}
TARGETS FOR THIS MEAL:
- Calories: ~${targetCalories} kcal
- Protein: ~${targetProtein} g
- Carbs: ~${targetCarbs} g
- Fat: ~${targetFat} g

CONTEXT:
- Thời điểm: ${dayPeriod}
- Xu hướng cân nặng: ${weightTrendDirection}

FRIDGE INVENTORY (Nguyên liệu đang có trong tủ lạnh):
${fridgeStr}

MEALS CONSUMED RECENTLY (DO NOT REPEAT):
${recentMealsStr}

MEALS ALREADY GENERATED IN THIS PLAN (DO NOT REPEAT):
${avoidCurrentPlanMealsStr}

DISLIKED FOODS / EXCLUDED FOODS (ABSOLUTELY AVOID):
${dislikedFoodsStr}

RULES:
- MỖI MEAL CHỈ TỐI ĐA 2 MÓN/THÀNH PHẦN, ƯU TIÊN CÀNG ÍT THÀNH PHẦN CÀNG TỐT.
- **VERY IMPORTANT**: CHỈ SỬ DỤNG 100% NGUYÊN LIỆU TỪ FRIDGE INVENTORY. Nếu tủ lạnh có đủ nguyên liệu thì dùng tất cả từ tủ, KHÔNG cần thêm nguyên liệu bên ngoài.
- Nếu bạn sử dụng nguyên liệu từ FRIDGE INVENTORY, hãy trừ số lượng đi và liệt kê vào mảng "usedFridgeItems" (sử dụng đúng ID được cung cấp).
- **VERY IMPORTANT**: KHÔNG được đề xuất món có chứa bất kỳ nguyên liệu nào trong "DISLIKED FOODS / EXCLUDED FOODS" (bao gồm tên đồng nghĩa như oats/yến mạch, cacao/ca cao).

- RAU XANH (súp lơ, cải xanh, rau muống, rau cải, xà lách,...): DÙNG NẾU CÓ TRONG TỦ LẠNH, KO CÓ THÌ THÔI (không bắt buộc).
- Chỉ dùng nguyên liệu chính (thịt, cá, trứng, rau, carb,...) từ tủ lạnh. GIA VỊ (hành, tỏi, nước mắm, dầu, muối, tiêu,...) ĐƯỢC thêm ngoài tủ lạnh.
${extraRules}
- **VERY IMPORTANT**: AVOID suggesting meals from the "MEALS CONSUMED RECENTLY" list.
- **VERY IMPORTANT**: AVOID suggesting meals from the "MEALS ALREADY GENERATED IN THIS PLAN" list.
- Nếu một nguyên liệu trong tủ lạnh chỉ còn số lượng giới hạn (ví dụ còn 1 quả chuối), chỉ được dùng đúng phần còn lại và không dùng lặp ở các bữa tiếp theo.
- TÊN MÓN phải viết TIẾNG VIỆT 100% (không dùng tiếng Anh).
- DESCRIPTION phải chứa HƯỚNG DẪN LÀM MÓN CHI TIẾT bằng tiếng Việt, bao gồm:
  * Các bước làm món từ A-Z
  * Thời gian chuẩn bị và nấu ăn cho mỗi bước
  * Phương pháp chế biến (luộc, xào, hấp, nướng, v.v.)
  * Lượng sử dụng của từng nguyên liệu (nếu không được chỉ định cụ thể trong meal)
  * Mẹo nhỏ để món ngon hơn (tùy chọn)

YÊU CẦU ĐẦU RA (Đúng chuẩn JSON Object này):
\`\`\`json
{
  "meals": [
    {
      "name": "string (VD: Sáng: Phở bò)",
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number,
      "description": "string (Hướng dẫn làm món chi tiết bằng tiếng Việt)"
    }
  ],
  "usedFridgeItems": [
    { "id": "string (ID của món trong tủ lạnh)", "amountUsed": number }
  ]
}
\`\`\`
`;

  const responseText = await callNemotronAPI([
    { role: "user", content: prompt }
    ], { maxTokens: 50000, temperature: 0.2 });

  if (!responseText) throw new Error(`Empty response for ${mealName}`);
  return cleanAndParseJSON(responseText, `NutritionPart_${mealName}`);
  return cleanAndParseJSON(responseText, `NutritionPart_${mealName}`);
};

const generateNutritionPart = async (
  userData: UserInput,
  fullHistory: WorkoutHistoryItem[] = [],
  sleepRecovery7Days: SleepRecoveryEntry[],
  onProgress?: (text: string) => void
): Promise<any> => {
  const { tdee, burn, target } = calculateTargetCalories(userData.weight, userData.height, userData.age || 18, userData.nutritionGoal, userData.selectedIntensity);
  const proteinMultiplier = userData.nutritionGoal === 'bulking' ? 2.2 : 2.0;
  const proteinTarget = Math.round(userData.weight * proteinMultiplier);
  const fatTarget = Math.round(userData.weight * 0.9);
  const caloriesFromProtFat = (proteinTarget * 4) + (fatTarget * 9);
  const carbTarget = Math.max(0, Math.round((target - caloriesFromProtFat) / 4));

  const dayPeriod = getCurrentDayPeriod();
  const weightTrend = getWeightTrend(fullHistory);
  const foodAssessment = evaluateFoodIntake(userData.consumedFood, target, []);

  // Fetch fridge items to pass to AI
  let localFridgeItems: any[] = [];
  try {
    localFridgeItems = await fridgeService.getFridgeItems();
  } catch (error) {
    console.error("Failed to load fridge items for nutrition generation", error);
  }

  // Helper function to deduct local fridge items based on AI response
  const applyDeductions = (items: any[], used: {id: string, amountUsed: number}[] = []) => {
    if (!used || !Array.isArray(used)) return items;
    let newItems = [...items];
    used.forEach(u => {
      const idx = newItems.findIndex(i => i.id === u.id);
      if (idx !== -1) {
        const deductedAmount = newItems[idx].quantity - u.amountUsed;
        newItems[idx] = { ...newItems[idx], quantity: Math.max(0, deductedAmount) };
        if (newItems[idx].quantity <= 0) newItems.splice(idx, 1);
      }
    });
    return newItems;
  };

  const recentMeals = extractMealsFromHistory(fullHistory, 7);
  const uniqueRecentMeals = Array.from(new Set(recentMeals));
  const recentMealsStr = uniqueRecentMeals.length > 0 ? uniqueRecentMeals.join(', ') : 'none';
  const dislikedFoods = Array.isArray(userData.dislikedFoods) ? userData.dislikedFoods : [];
  const dislikedFoodsStr = dislikedFoods.length > 0 ? dislikedFoods.join(', ') : 'none';

  let adjustedCalories = Math.round(target);
  if (weightTrend.direction === 'giảm' && userData.nutritionGoal === 'bulking') {
    adjustedCalories = Math.round(target * 1.05);
  } else if (weightTrend.direction === 'tăng' && userData.nutritionGoal === 'cutting') {
    adjustedCalories = Math.round(target * 0.95);
  }

  // Split targets: Breakfast (30%), Lunch (40%), Dinner (30%)
  const breakfastTargets = {
    cal: Math.round(adjustedCalories * 0.30), pro: Math.round(proteinTarget * 0.30), carb: Math.round(carbTarget * 0.30), fat: Math.round(fatTarget * 0.30)
  };
  const lunchTargets = {
    cal: Math.round(adjustedCalories * 0.40), pro: Math.round(proteinTarget * 0.40), carb: Math.round(carbTarget * 0.40), fat: Math.round(fatTarget * 0.40)
  };
  const dinnerTargets = {
    cal: adjustedCalories - breakfastTargets.cal - lunchTargets.cal,
    pro: proteinTarget - breakfastTargets.pro - lunchTargets.pro,
    carb: carbTarget - breakfastTargets.carb - lunchTargets.carb,
    fat: fatTarget - breakfastTargets.fat - lunchTargets.fat
  };

  try {
    if (onProgress) onProgress("Đang tính toán thực đơn Sáng, Trưa, Tối...");
    let usedMealNamesInCurrentPlan: string[] = [];
    const getAvoidCurrentPlanMealsStr = () => usedMealNamesInCurrentPlan.length > 0
      ? usedMealNamesInCurrentPlan.join(', ')
      : 'none';

    const parseMealsWithDeductions = (m: any, used: any[]) => {
      const arr = Array.isArray(m) ? m : [];
      if (arr.length > 0 && used && used.length > 0) {
        arr[0] = { ...arr[0], usedFridgeItems: used };
      }
      return arr;
    };

    const breakfastData = await generateMealForTime(
      "Bữa Sáng", breakfastTargets.cal, breakfastTargets.pro, breakfastTargets.carb, breakfastTargets.fat,
      recentMealsStr, getAvoidCurrentPlanMealsStr(), dislikedFoodsStr, dayPeriod, weightTrend.direction, foodAssessment,
      "- **Bữa Sáng**: vẫn dùng cơm làm carb chính; ưu tiên đạm nạc + súp lơ hoặc cải xanh.",
      localFridgeItems
    );
    const breakfastMeals = parseMealsWithDeductions(breakfastData.meals, breakfastData.usedFridgeItems);
    usedMealNamesInCurrentPlan = [...usedMealNamesInCurrentPlan, ...breakfastMeals.map((m: any) => m?.name).filter(Boolean)];
    let remainingFridgeItems = applyDeductions(localFridgeItems, breakfastData.usedFridgeItems);

    const lunchData = await generateMealForTime(
      "Bữa Trưa", lunchTargets.cal, lunchTargets.pro, lunchTargets.carb, lunchTargets.fat,
      recentMealsStr, getAvoidCurrentPlanMealsStr(), dislikedFoodsStr, dayPeriod, weightTrend.direction, foodAssessment,
      "- **Bữa Trưa**: cơm + đạm + rau (ưu tiên súp lơ hoặc cải xanh), món đơn giản.",
      remainingFridgeItems
    );
    const lunchMeals = parseMealsWithDeductions(lunchData.meals, lunchData.usedFridgeItems);
    usedMealNamesInCurrentPlan = [...usedMealNamesInCurrentPlan, ...lunchMeals.map((m: any) => m?.name).filter(Boolean)];
    remainingFridgeItems = applyDeductions(remainingFridgeItems, lunchData.usedFridgeItems);

    const dinnerData = await generateMealForTime(
      "Bữa Tối", dinnerTargets.cal, dinnerTargets.pro, dinnerTargets.carb, dinnerTargets.fat,
      recentMealsStr, getAvoidCurrentPlanMealsStr(), dislikedFoodsStr, dayPeriod, weightTrend.direction, foodAssessment,
      "- **Bữa Tối**: cơm nhẹ hơn trưa, ưu tiên đạm nạc + súp lơ hoặc cải xanh, không thêm món vặt.",
      remainingFridgeItems
    );
    const dinnerMeals = parseMealsWithDeductions(dinnerData.meals, dinnerData.usedFridgeItems);
    usedMealNamesInCurrentPlan = [...usedMealNamesInCurrentPlan, ...dinnerMeals.map((m: any) => m?.name).filter(Boolean)];
    remainingFridgeItems = applyDeductions(remainingFridgeItems, dinnerData.usedFridgeItems);

    let allMeals = [
      ...breakfastMeals,
      ...lunchMeals,
      ...dinnerMeals
    ].flat().filter(m => m && m.name);

    // API call to calculate missing calories/protein and adjust if needed
    if (onProgress) onProgress("Đang kiểm tra tổng calo/protein...");
    const currentCal = allMeals.reduce((acc, m) => acc + (m.calories || 0), 0);
    const currentPro = allMeals.reduce((acc, m) => acc + (m.protein || 0), 0);

    if (currentCal < adjustedCalories * 0.9 || currentPro < proteinTarget * 0.9) {
      if (onProgress) onProgress("Đang thêm bữa phụ bù đắp dinh dưỡng...");
      const missingCal = Math.max(0, adjustedCalories - currentCal);
      const missingPro = Math.max(0, proteinTarget - currentPro);
      
      const extraMealData = await generateMealForTime(
        "Bữa Phụ", missingCal, missingPro, Math.round(missingCal / 8), Math.round(missingCal / 18),
        recentMealsStr, getAvoidCurrentPlanMealsStr(), dislikedFoodsStr, dayPeriod, weightTrend.direction, foodAssessment,
        "- Tạo MỘT bữa phụ cực nhanh gọn để bù đắp lượng protein/calo còn thiếu.",
        remainingFridgeItems
      );
      allMeals = [...allMeals, ...parseMealsWithDeductions(extraMealData.meals, extraMealData.usedFridgeItems)].flat().filter(m => m && m.name);
    }

    return {
      nutrition: {
        totalCalories: adjustedCalories,
        totalProtein: proteinTarget,
        totalCarbs: carbTarget,
        totalFat: fatTarget,
        advice: `Mục tiêu: ${userData.nutritionGoal === 'bulking' ? "Tăng cân" : "Giảm cân"}. AI đã lên món ưu tiên nguyên liệu trong tủ lạnh. ${weightTrend.direction === 'giảm' ? '⚠️ Đang giảm cân.' : ''}`,
        meals: allMeals
      }
    };
  } catch (error) {
    console.error("Partial meal generation failed, using fallback", error);
    throw error;
  }
};

export const generateDailyPlan = async (
  userData: UserInput,
  fullHistory: WorkoutHistoryItem[],
  userId?: string,
  generationType: 'workout' | 'nutrition' | 'both' = 'both',
  onProgress?: (text: string) => void
): Promise<DailyPlan> => {
  // Optimization: Only use the last 14 days of history
  const history = fullHistory.slice(-14);

  let sleepRecovery7Days: SleepRecoveryEntry[] = [];
  
  try {
    const sleepRecoveryAll = userId ? await loadSleepRecoveryFromSupabase(userId) : [];
    sleepRecovery7Days = [...sleepRecoveryAll]
      .filter((s) => typeof s.timestamp === 'number')
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 7);
  } catch (e) {
    console.warn('[Plan] Could not load sleep recovery:', e);
  }

  try {
    console.log(`🚀 Generating Plan (${generationType}) using Nemotron API...`);

    let workoutPart: any = {};
    let nutritionPart: any = {};

    if (generationType === 'workout' || generationType === 'both') {
      try {
        workoutPart = await generateWorkoutPart(userData, history, sleepRecovery7Days, onProgress);
      } catch (e) {
        console.warn('[Plan] Workout generation failed:', e);
      }
    }

    if (generationType === 'nutrition' || generationType === 'both') {
      try {
        nutritionPart = await generateNutritionPart(userData, fullHistory, sleepRecovery7Days, onProgress);
      } catch (e) {
        console.warn('[Plan] Nutrition generation failed:', e);
      }
    }

    const fallback = getFallbackPlan(userData);

    // Build result: ONLY include the generated part.
    // The OTHER part should be blank (isGenerated: false, no data)
    // to avoid fallback meals/workout leaking into daily_plans.
    const blankNutrition = {
      totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0,
      advice: '', isGenerated: false, meals: [] as Meal[]
    };
    const blankWorkout = {
      summary: '', detail: { levelName: '', description: '', warmup: [] as Exercise[], morning: [] as Exercise[], evening: [] as Exercise[], cooldown: [] as Exercise[] },
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
    console.error("Nemotron API Error:", error);
    // If generation fails, return fallback
    return getFallbackPlan(userData);
  }
};

// --- AI OVERVIEW GENERATION ---

const roundToOneDecimal = (value: number): number => Math.round(value * 10) / 10;

const calculateOverviewWeeklyStats = (history: WorkoutHistoryItem[]): AIOverview["weeklyStats"] => {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const lastWeek = history
    .filter((h) => h.timestamp >= weekAgo)
    .sort((a, b) => a.timestamp - b.timestamp);

  const workoutsCompleted = lastWeek.length;
  const activeDays = new Set(lastWeek.map((h) => h.date)).size;
  const totalExercises = lastWeek.reduce((acc, h) => acc + (h.completedExercises?.length || 0), 0);
  const avgExercisesPerWorkout = workoutsCompleted > 0 ? roundToOneDecimal(totalExercises / workoutsCompleted) : 0;

  const totalVolumeKg = lastWeek.reduce((acc, h) => {
    const workoutVolume = (h.exerciseLogs || []).reduce((sum, log) => sum + (log.totalVolume || 0), 0);
    return acc + workoutVolume;
  }, 0);
  const averageVolumePerWorkout = workoutsCompleted > 0 ? Math.round(totalVolumeKg / workoutsCompleted) : 0;

  const totalCaloriesIntake = lastWeek.reduce((acc, h) => acc + (h.nutrition?.totalCalories || 0), 0);
  const totalProteinIntake = lastWeek.reduce((acc, h) => acc + (h.nutrition?.totalProtein || 0), 0);

  const averageCaloriesPerDay = Math.round(totalCaloriesIntake / 7);
  const averageProteinPerDay = roundToOneDecimal(totalProteinIntake / 7);

  const sleepEntries = lastWeek
    .map((h) => h.sleepHours)
    .filter((hours): hours is number => typeof hours === 'number' && Number.isFinite(hours) && hours > 0);
  const averageSleepHours = sleepEntries.length > 0
    ? roundToOneDecimal(sleepEntries.reduce((sum, h) => sum + h, 0) / sleepEntries.length)
    : 0;

  const weightEntries = lastWeek
    .filter((h) => typeof h.weight === 'number' && Number.isFinite(h.weight) && h.weight > 0)
    .sort((a, b) => a.timestamp - b.timestamp);
  const weightTrendKg = weightEntries.length >= 2
    ? roundToOneDecimal((weightEntries[weightEntries.length - 1].weight || 0) - (weightEntries[0].weight || 0))
    : 0;

  return {
    workoutsCompleted,
    activeDays,
    totalExercises,
    avgExercisesPerWorkout,
    estimatedCaloriesBurned: workoutsCompleted * 350,
    totalVolumeKg: Math.round(totalVolumeKg),
    averageVolumePerWorkout,
    averageCaloriesPerDay,
    averageProteinPerDay,
    averageSleepHours,
    weightTrendKg,
    consistency: Math.round((activeDays / 7) * 100),
  };
};

const getFallbackAIOverview = (history: WorkoutHistoryItem[]): AIOverview => {
  const weeklyStats = calculateOverviewWeeklyStats(history);

  return {
    summary: history.length === 0
      ? "Chưa có dữ liệu tập luyện. Hãy bắt đầu lịch trình đầu tiên của bạn!"
      : `Tuần này bạn hoàn thành ${weeklyStats.workoutsCompleted} buổi, tổng ${weeklyStats.totalExercises} bài tập, độ đều đặn ${weeklyStats.consistency}%.`,
    strengths: history.length > 0 ? ["Đã bắt đầu hành trình tập luyện"] : [],
    improvements: weeklyStats.workoutsCompleted < 4 ? ["Tăng tần suất tập luyện lên 4-5 ngày/tuần"] : [],
    recommendation: "Tiếp tục duy trì lịch tập đều đặn và tập trung vào progressive overload.",
    motivationalQuote: "\"Điều duy nhất đáng sợ là sự sợ hãi chính nó.\" - David Goggins",
    weeklyStats
  };
};

export const generateAIOverview = async (
  history: WorkoutHistoryItem[],
  userData?: UserInput
): Promise<AIOverview> => {
  if (history.length === 0) {
    return getFallbackAIOverview(history);
  }

  try {
    const model = MODELS.OVERVIEW;
    const baselineStats = calculateOverviewWeeklyStats(history);

    // Prepare history summary for context
    const lastWeekHistory = history.filter(h => {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return h.timestamp >= weekAgo;
    });

    const historySummary = lastWeekHistory.map(h => ({
      date: h.date,
      level: h.levelSelected,
      exercises: h.completedExercises?.length || 0,
      exerciseNames: h.completedExercises?.slice(0, 5).join(', ') || 'N/A',
      totalVolumeKg: (h.exerciseLogs || []).reduce((sum, log) => sum + (log.totalVolume || 0), 0),
      calories: h.nutrition?.totalCalories || 0,
      protein: h.nutrition?.totalProtein || 0,
      sleepHours: h.sleepHours || 0,
      weight: h.weight || 0,
    }));

    const prompt = `
ROLE: Huấn luyện viên cá nhân chuyên nghiệp, phân tích tiến trình tập luyện.

CONTEXT: Lịch sử tập (7 ngày gần nhất):
${JSON.stringify(historySummary, null, 2)}

Tổng buổi tập: ${history.length}
${userData ? `Mục tiêu: ${userData.nutritionGoal === 'bulking' ? 'Tăng cơ' : 'Giảm mỡ'}\nTuổi: ${userData.age || 18}` : ''}

TASK: Phân tích tiến trình, tạo AI Overview bằng tiếng Việt.

RULES:
- Model đang dùng: ${model}
- summary: 1-2 câu tóm tắt tiến trình tuần
- strengths: 2-3 điểm mạnh (VD: "Tập đều đặn", "Focus compound movements")
- improvements: 2-3 điểm cần cải thiện
- recommendation: 1 gợi ý cụ thể cho tuần tới
- motivationalQuote: Quote tiếng Việt từ David Goggins/bodybuilder nổi tiếng
- weeklyStats phải có đủ các field sau:
  - workoutsCompleted (number)
  - activeDays (number)
  - totalExercises (number)
  - avgExercisesPerWorkout (number)
  - estimatedCaloriesBurned (number)
  - totalVolumeKg (number)
  - averageVolumePerWorkout (number)
  - averageCaloriesPerDay (number)
  - averageProteinPerDay (number)
  - averageSleepHours (number)
  - weightTrendKg (number, tăng là dương, giảm là âm)
  - consistency (number, công thức = activeDays/7*100)

Generate JSON response ONLY as a JSON Array with exactly 1 object inside: [{ "summary": "...", "strengths": [...], "improvements": [...], "recommendation": "...", "motivationalQuote": "...", "weeklyStats": { "workoutsCompleted": number, "activeDays": number, "totalExercises": number, "avgExercisesPerWorkout": number, "estimatedCaloriesBurned": number, "totalVolumeKg": number, "averageVolumePerWorkout": number, "averageCaloriesPerDay": number, "averageProteinPerDay": number, "averageSleepHours": number, "weightTrendKg": number, "consistency": number } }]
    `;

    const responseText = await callNemotronAPI([
      { role: "user", content: prompt }
    ], { maxTokens: 50000 });

    if (!responseText) throw new Error("Empty response");

    let parsed = cleanAndParseJSON(responseText, "AIOverview");
    if (Array.isArray(parsed)) parsed = parsed[0];

    const aiStats = parsed?.weeklyStats || {};
    const safeNumber = (value: unknown, fallback: number): number => (
      typeof value === 'number' && Number.isFinite(value) ? value : fallback
    );

    return {
      ...parsed,
      summary: typeof parsed?.summary === 'string' ? parsed.summary : getFallbackAIOverview(history).summary,
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
      recommendation: typeof parsed?.recommendation === 'string' ? parsed.recommendation : getFallbackAIOverview(history).recommendation,
      motivationalQuote: typeof parsed?.motivationalQuote === 'string' ? parsed.motivationalQuote : getFallbackAIOverview(history).motivationalQuote,
      weeklyStats: {
        workoutsCompleted: safeNumber(aiStats.workoutsCompleted, baselineStats.workoutsCompleted),
        activeDays: safeNumber(aiStats.activeDays, baselineStats.activeDays),
        totalExercises: safeNumber(aiStats.totalExercises, baselineStats.totalExercises),
        avgExercisesPerWorkout: safeNumber(aiStats.avgExercisesPerWorkout, baselineStats.avgExercisesPerWorkout),
        estimatedCaloriesBurned: safeNumber(aiStats.estimatedCaloriesBurned, baselineStats.estimatedCaloriesBurned),
        totalVolumeKg: safeNumber(aiStats.totalVolumeKg, baselineStats.totalVolumeKg),
        averageVolumePerWorkout: safeNumber(aiStats.averageVolumePerWorkout, baselineStats.averageVolumePerWorkout),
        averageCaloriesPerDay: safeNumber(aiStats.averageCaloriesPerDay, baselineStats.averageCaloriesPerDay),
        averageProteinPerDay: safeNumber(aiStats.averageProteinPerDay, baselineStats.averageProteinPerDay),
        averageSleepHours: safeNumber(aiStats.averageSleepHours, baselineStats.averageSleepHours),
        weightTrendKg: safeNumber(aiStats.weightTrendKg, baselineStats.weightTrendKg),
        consistency: safeNumber(aiStats.consistency, baselineStats.consistency),
      }
    };
  } catch (error) {
    console.error("AI Overview Error:", error);
    return getFallbackAIOverview(history);
  }
};



// --- SINGLE EXERCISE SUGGESTION ---

export const suggestNextExercises = async (
  currentPlan: DailyPlan,
  userData: UserInput,
  section: 'morning' | 'evening',
  history: WorkoutHistoryItem[] = []
): Promise<Exercise[]> => {
  try {
    const model = MODELS.WORKOUT;

    const existingExercises = section === 'morning'
      ? currentPlan.workout.detail.morning
      : currentPlan.workout.detail.evening;

    const allTodayExercises = [...currentPlan.workout.detail.morning, ...currentPlan.workout.detail.evening];
    const todayNamesAndMuscles = allTodayExercises.map(e => `${e.name} (Cơ chính: ${e.primaryMuscleGroups?.join(', ')}, Cơ phụ: ${e.secondaryMuscleGroups?.join(', ')})`).join(" | ");

    const existingNames = existingExercises.map(e => e.name).join(", ");
    
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentHistory = history
      .filter((h) => h.timestamp >= sevenDaysAgo)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 7)
      .map((h) => ({
        date: h.date,
        level: h.levelSelected,
        completedExercises: h.completedExercises || []
      }));

    const prompt = `
      ACT AS A PERSONAL TRAINER.
      THE USER IS CURRENTLY DOING A WORKOUT SESSION (${section.toUpperCase()}).
      
      CURRENT EXERCISES IN THIS SECTION: ${existingNames}
      ALL EXERCISES DONE TODAY (to understand current split): ${todayNamesAndMuscles}
      RECENT WORKOUT HISTORY (last 7 days): ${JSON.stringify(recentHistory)}
      
      USER GOAL: ${userData.nutritionGoal}
      USER AGE: ${userData.age || 18}
      USER EQUIPMENT: ${userData.equipment.join(', ')}, Thanh xà đơn (Pull-up bar), Thanh dips (Dip station), Tạ đơn (Dumbbells), Dây BFR (Blood Flow Restriction bands)
      
      TASK: SUGGEST 1 NEW EXERCISE to add to this session.
      
      RULES:
      1. Đa dạng hóa biến thể bài tập, kết hợp linh hoạt dụng cụ. Đánh dấu isBFR: true nếu đề xuất bài tập dùng BFR.
      2. KHÔNG đề xuất lại các bài tập có cùng chuyển động (movement pattern) hoặc bài tập giống y hệt đã có trong "ALL EXERCISES DONE TODAY" hoặc trong "RECENT WORKOUT HISTORY".
      3. TUY NHIÊN, bài tập mới BẮT BUỘC PHẢI THUỘC ĐÚNG NHÓM CƠ CỦA BUỔI TẬP HÔM NAY (tuân thủ nguyên tắc Upper/Lower). Ví dụ: nếu danh sách hôm nay toàn bài Upper Body, bài mới cũng phải là Upper Body (nhưng là một chuyển động/nhóm cơ Upper chưa được tập kỹ). KHÔNG được lấy nhóm cơ của ngày mai sang tập.
      4. Đối với bài tập BODYWEIGHT (không dùng tạ ngoài), 'equipment' BẮT BUỘC ghi là 'None'.
      
      OUTPUT FORMAT: JSON Array with 1 Exercise object. NO EXPLANATIONS. NO MARKDOWN TEXT OUTSIDE JSON.
      
      REQUIRED FIELDS: name (English), sets (number), reps (string), notes (Vietnamese, short motivation), colorCode, primaryMuscleGroups, secondaryMuscleGroups.
      
      Return as: [{ "name": "...", "sets": number, "reps": "...", "notes": "...", "equipment": "...", "colorCode": "...", "isBFR": boolean, "primaryMuscleGroups": [...], "secondaryMuscleGroups": [...] }]
    `;

    const responseText = await callNemotronAPI([
      { role: "user", content: prompt }
    ], { maxTokens: 50000 });

    if (!responseText) throw new Error("Empty response");

    return cleanAndParseJSON(responseText, "SuggestExercise");
  } catch (error) {
    console.error("Suggest Exercise Error:", error);
    return [];
  }
};

export const suggestAlternativeExercise = async (
  exercise: Exercise,
  currentPlan: DailyPlan,
  userData: UserInput,
  history: WorkoutHistoryItem[] = []
): Promise<Exercise | null> => {
  try {
    const model = MODELS.WORKOUT;

    const allTodayExercises = [...currentPlan.workout.detail.morning, ...currentPlan.workout.detail.evening];
    const todayNamesAndMuscles = allTodayExercises
      .filter(e => e.name !== exercise.name)
      .map(e => `${e.name} (Cơ chính: ${e.primaryMuscleGroups?.join(', ')})`)
      .join(' | ');

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentHistory = history
      .filter(h => h.timestamp >= sevenDaysAgo)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 7)
      .map(h => ({
        date: h.date,
        completedExercises: h.completedExercises || []
      }));

    const prompt = `
      ACT AS A PERSONAL TRAINER.
      THE USER NEEDS AN ALTERNATIVE EXERCISE because the equipment is currently in use.

      EXERCISE TO REPLACE: ${exercise.name}
      - Primary Muscle Groups: ${exercise.primaryMuscleGroups?.join(', ') || 'Unknown'}
      - Secondary Muscle Groups: ${exercise.secondaryMuscleGroups?.join(', ') || 'None'}
      - Equipment: ${exercise.equipment || 'None'}
      - Sets/Reps: ${exercise.sets} sets x ${exercise.reps}

      OTHER EXERCISES ALREADY IN TODAY'S PLAN: ${todayNamesAndMuscles}
      RECENT WORKOUT HISTORY (last 7 days): ${JSON.stringify(recentHistory)}

      USER GOAL: ${userData.nutritionGoal}
      USER AGE: ${userData.age || 18}
      USER EQUIPMENT: ${userData.equipment.join(', ')}, Thanh xà đơn (Pull-up bar), Thanh dips (Dip station), Tạ đơn (Dumbbells), Dây BFR (Blood Flow Restriction bands)

      TASK: SUGGEST 1 ALTERNATIVE EXERCISE that:
      1. Targets the SAME primary muscle groups as "${exercise.name}": [${exercise.primaryMuscleGroups?.join(', ')}]
      2. Uses DIFFERENT equipment or movement pattern (since the original equipment is occupied)
      3. Is NOT the same exercise as "${exercise.name}" and NOT already in today's plan
      4. Prefers bodyweight or dumbbell alternatives if the original used a machine
      5. Đánh dấu isBFR: true nếu đề xuất bài tập dùng BFR.
      6. Đối với bài tập BODYWEIGHT (không dùng tạ ngoài), 'equipment' BẮT BUỘC ghi là 'None'.

      OUTPUT FORMAT: JSON Array with 1 Exercise object. NO EXPLANATIONS. NO MARKDOWN TEXT OUTSIDE JSON.
      REQUIRED FIELDS: name (English), sets (number), reps (string), notes (Vietnamese, explain why this is a good alternative), colorCode, primaryMuscleGroups, secondaryMuscleGroups, equipment, isBFR.

      Return as: [{ "name": "...", "sets": number, "reps": "...", "notes": "...", "equipment": "...", "colorCode": "...", "isBFR": boolean, "primaryMuscleGroups": [...], "secondaryMuscleGroups": [...] }]
    `;

    const responseText = await callNemotronAPI([
      { role: "user", content: prompt }
    ], { maxTokens: 50000 });

    if (!responseText) throw new Error("Empty response");

    const results = cleanAndParseJSON(responseText, "SuggestAlternative");
    return results && results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error("Suggest Alternative Exercise Error:", error);
    return null;
  }
};

export const getBasicNutritionPlan = (userData: UserInput): DailyPlan => {
  const { tdee, burn, target } = calculateTargetCalories(userData.weight, userData.height, userData.age || 18, userData.nutritionGoal, userData.selectedIntensity);

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
      detail: { levelName: "N/A", description: "N/A", warmup: [], morning: [], evening: [], cooldown: [] },
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
  let apiKey = getCurrentGeminiApiKey();
  if (!apiKey) {
    throw new Error("No Gemini API keys configured for food image analysis");
  }

  let retriesLeft = GEMINI_API_KEYS.length;

  while (retriesLeft > 0) {
    try {
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

      console.log(`Analyzing food with mimeType: ${mimeType}, isVideo: ${isVideo}, using key ${currentGeminiKeyIndex + 1}`);

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

      // STEP 2: CALCULATE MACROS (Text -> JSON) using Nemotron
      // Model: previously Gemini; switch to Nemotron for macro calc to avoid 3.1-preview issues
      const macroPrompt = `
        ACT AS A NUTRITIONIST.
        Based on this food description: "${foodDescription}"
        
        Estimate nutritional content.
        Return the result in JSON format AS A SINGLE-ELEMENT ARRAY.
        
        RULES:
        - Name: Standard Vietnamese name.
        - Calories: Estimated total.
        - Macros: Protein, Carbs, Fat in grams.
        - Description: Use the input description but refine it to be short and clear.
        
        Return format: [{ "name": "...", "calories": number, "protein": number, "carbs": number, "fat": number, "description": "..." }]
      `;

      try {
        const responseText = await callNemotronAPI([
          { role: "user", content: macroPrompt }
        ]);
        if (!responseText) throw new Error("Empty macro response");
        let parsed = cleanAndParseJSON(responseText, "FoodAnalysis");
        if (Array.isArray(parsed)) parsed = parsed[0];
        return parsed;
      } catch (error) {
        console.error("Macro Calc Error:", error);
        throw error;
      }

    } catch (error) {
      console.error("Food Image Analysis Error (attempt " + (GEMINI_API_KEYS.length - retriesLeft + 1) + "):", error);

      if (isRateLimitError(error) && retriesLeft > 1) {
        const newKey = markGeminiKeyRateLimitedAndRotate();
        if (newKey) {
          console.log(`⚡ Rate limit detected on Gemini, switching to next API key...`);
          apiKey = newKey;
          retriesLeft--;
          continue;
        }
      }

      // If one part fails or no more keys, throw error
      throw error;
    }
  }

  throw new Error("All Gemini API keys exhausted for food image analysis");
};

// --- ANALYZE FOOD TEXT (Manual Input) ---
// Phân tích đồ ăn từ text nhập tay, tính calo/macros
export const analyzeFoodText = async (foodText: string): Promise<Meal> => {
  const model = MODELS.FOOD_SUGGEST;

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
    
    Return format: [{ "name": "...", "calories": number, "protein": number, "carbs": number, "fat": number, "description": "..." }]
  `;

  try {
    const responseText = await callNemotronAPI([
      { role: "user", content: prompt }
    ], { maxTokens: 50000 });

    if (!responseText) throw new Error("Empty food analysis response");

    let result = cleanAndParseJSON(responseText, "FoodTextAnalysis");
    if (Array.isArray(result)) result = result[0];
    console.log("Analyzed food text:", result);
    return result;
  } catch (error) {
    console.error("Food Text Analysis Error:", error);
    throw error;
  }
};

/**
 * Generate food calories analysis prompt for Nemotron
 * Used by Edge Functions to calculate nutrition from food input
 */
export const generateFoodCaloriesPrompt = (foodDescription: string): string => {
  return `Bạn là một nutritionist chuyên gia. Phân tích các thức ăn sau:
"${foodDescription}"

Hãy:
1. Xác định các loại thức phẩm và khối lượng
2. Tính toán tổng calo và macro (protein, carbs, fats)
3. Sử dụng dữ liệu từ bảng thành phần thức phẩm phổ biến

Vui lòng trả về JSON dạng:
{
  "foods": [
    {"name": "...", "quantity": "...", "unit": "..."},
    ...
  ],
  "total_calories": 0,
  "macros": {
    "protein": 0,
    "carbs": 0,
    "fats": 0
  }
}`;
};

/**
 * Generate daily workout plan prompt for Nemotron
 * Incorporates muscle group conflict detection and weight goal optimization
 */
export const parseAndDeductFridge = async (
  mealName: string, 
  fridgeItems: FridgeItem[]
): Promise<{ id: string, amount: number }[]> => {
  if (fridgeItems.length === 0) return [];

  const prompt = `
    USER MEAL/INGREDIENT: "${mealName}"
    
    FRIDGE INVENTORY:
    ${JSON.stringify(fridgeItems.map(f => ({ id: f.id, name: f.name, quantity: f.quantity, unit: f.unit })))}
    
    TASK:
    Identify if the user meal/ingredient consumes any items from the fridge inventory.
    Estimate how much quantity is consumed for each matching item based on the food name.
    Units convention: 
    - "g", "kg" -> convert to gam (g)
    - "ml", "l" -> convert to ml
    - "qty" or "số lượng" (quả, trái, chùm, con, chiếc, cái...) -> quantity/pieces (e.g. 1 quả trứng = 1, 2 trái chuối = 2, 1 chùm nho = 1).
    Make sure the deducted amount matches the fridge item's unit.
    If the text says "500g thit bo" and there is "thịt bò" (unit: g) in the fridge, deduct 500. 
    If the text says "2 quả trứng" and there is "trứng" (unit: qty) in the fridge, deduct 2.
    If the text says "1 tô phở bò", estimate the beef (e.g. 100) and deduct it if beef is in the fridge.
    
    CRITICAL: Return ONLY a valid JSON array of deductions: [{ "id": "string", "amount": number }]
    Do not include markdown blocks like \`\`\`json, just the raw JSON array.
    If nothing matches, return [].
  `;

  try {
    const response = await callNemotronAPI([{ role: 'user', content: prompt }]);
    const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(jsonStr);
    
    if (Array.isArray(result)) {
      return result;
    }
  } catch (err) {
    console.error('Error parsing fridge deductions:', err);
  }
  return [];
};

export const generateDailyWorkoutPrompt = (

  userProfile: {
    weight: number;
    height: number;
    age: number;
    trainingMode: string;
    goal: 'bulking' | 'cutting';
    experienceLevel: string;
  },
  analysisData: {
    recommendedSplit: string;
    sessionsThisWeek: number;
    focusMuscles: string[];
    yesterdayWorkout: string;
    tdee: number;
    dailyCalories: number;
    macroTargets: { protein: number; carbs: number; fats: number };
  },
  date: string
): string => {
  const calorieStrategy = analysisData.tdee > 2500 
    ? "tập trọng lượng nhẹ hơn, tập nhiều reps hơn để tránh mất cơ"
    : "ưu tiên compound movements để tối ưu calorie burn";

  return `ACT AS A WORLD-CLASS PERSONAL TRAINER.
GENERATE A 1-DAY WORKOUT PLAN FOR: ${date}.

NGUYÊN TẮC BẮT BUỘC:
- KHÔNG tập các nhóm cơ từ hôm qua: "${analysisData.yesterdayWorkout}"
- Dựa trên training split: ${analysisData.recommendedSplit.toUpperCase()}
- Focus muscles hôm nay: ${analysisData.focusMuscles.join(', ')}
- Progressive overload dựa trên 7 ngày gần nhất
- Phù hợp với mục tiêu: ${analysisData.tdee > 2500 ? 'CUTTING (Giảm cân)' : 'BULKING (Tăng cân)'}

THÔNG TIN NGƯỜI DÙNG:
- Cân nặng: ${userProfile.weight}kg
- Tuổi: ${userProfile.age}
- Chiều cao: ${userProfile.height}cm
- Trình độ: ${userProfile.experienceLevel}
- Training mode: ${userProfile.trainingMode}
- Calo mục tiêu hôm nay: ${analysisData.dailyCalories} kcal
- Macros: P/${analysisData.macroTargets.protein}g C/${analysisData.macroTargets.carbs}g F/${analysisData.macroTargets.fats}g

CHIẾN LƯỢC:
${calorieStrategy}

Xuất ra 5 bài tập chính cho hôm nay với sets/reps/notes rõ ràng.`;
};



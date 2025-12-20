import { GoogleGenAI, Type, Schema } from "@google/genai";
import { UserInput, DailyPlan, WorkoutHistoryItem, Intensity, WorkoutLevel, FatigueLevel, MuscleGroup, AIOverview } from "../types";

// Multiple API keys are injected via vite.config.ts define into process.env.API_KEYS
const API_KEYS: string[] = (process.env.API_KEYS as unknown as string[]) || [];

const MODELS = {
  WORKOUT: "gemini-3-flash-preview",
  FOOD_SCAN: "gemma-3-27b-it",
  OVERVIEW: "gemini-2.5-flash",
  MENU: "gemini-2.5-flash",
};

// Track current API key index - persists across calls
let currentKeyIndex = 0;

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
    console.error(`Invalid API key index: ${index}`);
    return false;
  }
  currentKeyIndex = index;
  console.log(`🔧 Manually switched to API key ${currentKeyIndex + 1}/${API_KEYS.length}`);
  return true;
};

// Mark current key as rate limited and rotate to next
const markRateLimitedAndRotate = (): string | null => {
  if (API_KEYS.length === 0) return null;

  // Mark current key as rate limited
  rateLimitedKeys.set(currentKeyIndex, Date.now());
  console.log(`⚠️ API key ${currentKeyIndex + 1} marked as rate limited`);

  // Find next available key that's not rate limited
  let attempts = 0;
  while (attempts < API_KEYS.length) {
    currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
    if (!rateLimitedKeys.has(currentKeyIndex)) {
      console.log(`🔄 Switched to API key ${currentKeyIndex + 1}/${API_KEYS.length}`);
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
    console.log(`🔄 All keys rate limited, retrying oldest key ${currentKeyIndex + 1}`);
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
      { name: "Decline Push-up", sets: 4, reps: "Max", colorCode: "Red", equipment: "Board + Chân cao", notes: "Ai sẽ vác những chiếc thuyền này?", primaryMuscleGroups: ["Front Delts", "Chest - Upper"], secondaryMuscleGroups: ["Triceps", "Core"] },
      { name: "Single Arm Walking Lunges", sets: 3, reps: "12/leg", colorCode: "Purple", equipment: "Tạ 10kg", notes: "Chiếm lấy linh hồn của chúng!", primaryMuscleGroups: ["Quads", "Glutes"], secondaryMuscleGroups: ["Hamstrings", "Core"] }
    ],
    evening: [
      { name: "One Arm Bicep Curls", sets: 4, reps: "20/arm", isBFR: true, colorCode: "Pink", equipment: "Tạ 4kg + BFR Band", notes: "Không đau đớn thì không có thành quả, STAY HARD!", primaryMuscleGroups: ["Biceps"], secondaryMuscleGroups: ["Forearms"] },
      { name: "Hanging Leg Raise", sets: 4, reps: "15", colorCode: "Orange", equipment: "Xà đơn/Sàn", notes: "Cơ bụng số 11! (Daily Abs)", primaryMuscleGroups: ["Abs - Lower", "Core"], secondaryMuscleGroups: ["Hip Flexors"] },
      { name: "Burpees", sets: 3, reps: "15", colorCode: "Orange", equipment: "None", notes: "Tim đập nhanh hơn! (Daily Cardio)", primaryMuscleGroups: ["Full Body", "Cardio"], secondaryMuscleGroups: ["Chest", "Legs", "Core"] }
    ]
  } : {
    levelName: "Vừa sức (Normal)",
    description: "Duy trì cơ bắp + Daily Abs & Cardio.",
    morning: [
      { name: "Push-up", sets: 3, reps: "12", colorCode: "Blue", equipment: "Board", notes: "Đừng làm thằng hèn, ngực chạm sàn đi!", primaryMuscleGroups: ["Chest - Middle"], secondaryMuscleGroups: ["Triceps", "Front Delts", "Core"] },
      { name: "One Arm Dumbbell Squat", sets: 4, reps: "12/leg", colorCode: "Purple", equipment: "Tạ 10kg (1 tay)", notes: "Chúng nó không biết tao là ai đâu con trai!", primaryMuscleGroups: ["Quads", "Glutes"], secondaryMuscleGroups: ["Hamstrings", "Core"] }
    ],
    evening: [
      { name: "Band Pull Apart", sets: 3, reps: "15", colorCode: "Yellow", equipment: "Dây kháng lực 15kg", notes: "Chai sạn tâm trí đi!", primaryMuscleGroups: ["Rear Delts", "Upper Back"], secondaryMuscleGroups: ["Traps"] },
      { name: "Plank", sets: 3, reps: "60s", colorCode: "Orange", equipment: "None", notes: "Gồng chặt bụng! (Daily Abs)", primaryMuscleGroups: ["Core", "Abs"], secondaryMuscleGroups: ["Shoulders", "Glutes"] },
      { name: "Jumping Jacks", sets: 3, reps: "50", colorCode: "Orange", equipment: "None", notes: "Đốt mỡ! (Daily Cardio)", primaryMuscleGroups: ["Cardio", "Full Body"], secondaryMuscleGroups: ["Shoulders", "Calves"] }
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
      detail: workout
    },
    nutrition: {
      totalCalories: target,
      totalProtein: proteinTarget,
      totalCarbs: carbTarget, // Replaces Water
      totalFat: fatTarget, // Replaces Water
      totalCost: 150000,
      advice: `Mục tiêu: ${isBulking ? 'Bulking (Tăng cân)' : 'Cutting (Giảm cân)'}. TDEE: ${tdee}. Macros: ${proteinTarget}g Protein, ${carbTarget}g Carbs, ${fatTarget}g Fat.`,
      meals: [
        {
          name: "Bữa Sáng (07:00)",
          calories: Math.round(target * 0.25),
          protein: Math.round(proteinTarget * 0.25),
          carbs: Math.round(carbTarget * 0.25),
          fat: Math.round(fatTarget * 0.25),
          description: "2 lát Bánh mì đen + 3 Lòng trắng trứng (Trứng ốp la bỏ lòng đỏ)",
          estimatedPrice: 20000
        },
        {
          name: "Bữa Trưa (12:30)",
          calories: Math.round(target * 0.35),
          protein: Math.round(proteinTarget * 0.35),
          carbs: Math.round(carbTarget * 0.35),
          fat: Math.round(fatTarget * 0.35),
          description: `${carbSource} + 200g Ức gà áp chảo + ${vegSource}`,
          estimatedPrice: 50000
        },
        {
          name: "Bữa Tối (19:00)",
          calories: Math.round(target * 0.25),
          protein: Math.round(proteinTarget * 0.25),
          carbs: Math.round(carbTarget * 0.25),
          fat: Math.round(fatTarget * 0.25),
          description: `${carbSource} + 200g Cá/Thịt nạc + ${vegSource}`,
          estimatedPrice: 60000
        },
        {
          name: "Bữa Phụ (21:30)",
          calories: Math.round(target * 0.15),
          protein: Math.round(proteinTarget * 0.15),
          carbs: Math.round(carbTarget * 0.15),
          fat: Math.round(fatTarget * 0.15),
          description: "1 Hộp Sữa chua không đường + 1 quả Chuối",
          estimatedPrice: 15000
        }
      ]
    }
  };
};

// --- SPLIT GENERATION PARTS ---

const generateWorkoutPart = async (userData: UserInput, history: WorkoutHistoryItem[], apiKey: string): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey, baseUrl: '/google-api' });
  const model = MODELS.WORKOUT;

  // Determine Day Number (1-7)
  const today = new Date();
  const dayIndex = today.getDay(); // 0 is Sunday, 1 is Monday...
  const currentDayNumber = dayIndex === 0 ? 7 : dayIndex;
  const dayNames = ["", "Day 1 (Push)", "Day 2 (Back/Biceps)", "Day 3 (Legs/Abs)", "Day 4 (Arms)", "Day 5 (Chest/Back)", "Day 6 (Shoulder/Arms)", "Day 7 (Rest/Walk)"];
  const currentSplitName = dayNames[currentDayNumber];

  let workoutInstructionBlock = "";
  if (userData.trainingMode === 'saitama') {
    workoutInstructionBlock = `
    ### WORKOUT MODE: SAITAMA CHALLENGE (ONE PUNCH MAN)
    IGNORE THE DATE AND SPLIT. TODAY IS SAITAMA DAY.
    YOU MUST GENERATE THE FOLLOWING EXERCISES:
    1. **Push-ups**: Total 100 reps target.
    2. **Sit-ups**: Total 100 reps target.
    3. **Squats**: Total 100 reps target.
    4. **Running**: 10km Run (Cardio). *IMPORTANT*: If user Intensity is 'Medium' or 'Fresh', scale this down to "60 Minutes Run/Walk (Cardio)".
    Structure this into Morning (Upper Body focus) and Evening (Lower Body/Run focus).
    `;
  } else {
    workoutInstructionBlock = `
    ### WORKOUT SCHEDULE (STRICT 7-DAY SPLIT)
    TODAY IS: ${currentSplitName}. FOLLOW THIS SPLIT STRICTLY:
    - Day 1 (Mon): Push (Chest, Shoulder, Triceps)
    - Day 2 (Tue): Pull (Back, Biceps)
    - Day 3 (Wed): Legs (Quads, Hamstring, Calves, Glutes) + Abs
    - Day 4 (Thu): Full Body / Arms & Abs
    - Day 5 (Fri): Chest & Back
    - Day 6 (Sat): Shoulder & Arms
    - Day 7 (Sun): REST DAY (Active Recovery)
    
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
    TRAINING MODE: ${userData.trainingMode === 'saitama' ? 'SAITAMA CHALLENGE' : 'STANDARD AI COACH'}.
    
    ${workoutInstructionBlock}

    ### LANGUAGE & LOCALIZATION RULES
    - **VIETNAMESE REQUIRED**: Summary, Description, Reasoning MUST be in **VIETNAMESE**.
    - **EXERCISE NAMES**: MUST be in **ENGLISH** (e.g., "Incline Bench Press").
    - **CONCISENESS**: Keep descriptions Short & Fast.

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
  const ai = new GoogleGenAI({ apiKey, baseUrl: '/google-api' });
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
          totalCost: { type: Type.NUMBER },
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
                estimatedPrice: { type: Type.NUMBER }
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
    - **VEGETABLES**: Prioritize: ${userData.availableIngredients.join(', ')}.
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
  fullHistory: WorkoutHistoryItem[]
): Promise<DailyPlan> => {
  // Optimization: Only use the last 14 days of history
  const history = fullHistory.slice(-14);
  const apiKey = getCurrentApiKey();

  if (!apiKey) {
    console.warn("No API Keys found. Using fallback plan.");
    return getFallbackPlan(userData);
  }

  let retriesLeft = API_KEYS.length;

  while (retriesLeft > 0) {
    try {
      console.log(`🚀 Generating Plan with Key Index ${currentKeyIndex}...`);

      // PARALLEL GENERATION
      const [workoutPart, nutritionPart] = await Promise.all([
        generateWorkoutPart(userData, history, apiKey),
        generateNutritionPart(userData, apiKey)
      ]);

      // MERGE RESULTS
      const finalPlan: DailyPlan = {
        ...workoutPart,
        ...nutritionPart,
        date: getCurrentDate() // Ensure date is consistent
      };

      return finalPlan;

    } catch (error) {
      console.error("Gemini API Error (Parallel):", error);

      if (isRateLimitError(error) && retriesLeft > 1) {
        const newKey = markRateLimitedAndRotate();
        if (newKey) {
          console.log(`⚡ Rate limit detected, switching to next API key...`);
          // Note: In a real parallel scenario, we'd need to retry the specific failed part or both.
          // For simplicity here, we retry the whole block with the new key.
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
  const apiKey = getCurrentApiKey();
  if (!apiKey || history.length === 0) {
    return getFallbackAIOverview(history);
  }

  let ai = new GoogleGenAI({ apiKey, baseUrl: '/google-api' });
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
          ai = new GoogleGenAI({ apiKey: newKey, baseUrl: '/google-api' });
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

// --- FRIDGE ARGUMENT PARSING ---

export const parseFridgeItems = async (text: string): Promise<{ id: string, name: string, quantity: number, unit: string }[]> => {
  const apiKey = getCurrentApiKey();
  if (!apiKey || !text.trim()) {
    console.warn("No API Key or empty text for fridge parsing");
    return [];
  }

  let ai = new GoogleGenAI({ apiKey, baseUrl: '/google-api' });
  let retriesLeft = API_KEYS.length;
  const model = MODELS.FOOD_SCAN;

  // Gemma-3-27b-it does not support JSON mode, so we remove responseSchema/responseMimeType
  // and rely on the prompt and manual parsing.

  const prompt = `
    ROLE: Data Parser specific to cooking ingredients.
    INPUT: "${text}"
    TASK: Parse the input string into a structured JSON array of ingredients.
    RULES:
    - Translate ingredient names to standard Vietnamese (e.g., "ức gà", "trứng", "gạo").
    - Extract approximate quantity and unit. If not specified, estimate reasonable default (e.g. 1 unit, 100g).
    - Assign a category (protein, carb, fat, veg, spice, other).
    - generate a random short ID for each item.
    - If input contains multiple items (e.g., "500g chicken and 10 eggs"), split them.
    
    OUTPUT FORMAT:
    Return ONLY a valid JSON Array. Do not include markdown formatting (like \`\`\`json).
    Example:
    [{"id":"1","name":"Trứng","quantity":10,"unit":"quả","category":"protein"}]
  `;

  while (retriesLeft > 0) {
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        // Config removed to avoid "JSON mode not enabled" error
      });

      let jsonText = response.text;
      if (!jsonText) throw new Error("Empty response");

      return cleanAndParseJSON(jsonText, "FridgeParse");
    } catch (error) {
      console.error("Fridge Parse Error:", error);
      if (isRateLimitError(error) && retriesLeft > 1) {
        const newKey = markRateLimitedAndRotate();
        if (newKey) {
          ai = new GoogleGenAI({ apiKey: newKey, baseUrl: '/google-api' });
          retriesLeft--;
          continue;
        }
      }
      return [];
    }
  }
  return [];
};
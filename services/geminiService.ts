

import { GoogleGenAI, Type, Schema } from "@google/genai";
import { UserInput, DailyPlan, WorkoutHistoryItem, Intensity, WorkoutLevel, FatigueLevel, MuscleGroup, AIOverview } from "../types";

// Multiple API keys are injected via vite.config.ts define into process.env.API_KEYS
const API_KEYS: string[] = (process.env.API_KEYS as unknown as string[]) || [];

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

  const intensity = userData.selectedIntensity;
  const waterIntake = calculateWaterIntake(userData.weight, userData.useCreatine);

  const workout: WorkoutLevel = intensity === Intensity.Hard ? {
    levelName: "Cháy hết mình (Hard)",
    description: "Tăng cơ tối đa + Daily Abs & Cardio Hardcore.",
    morning: [
      { name: "Decline Push-up (Red - Shoulder)", sets: 4, reps: "Max", colorCode: "Red", equipment: "Board + Chân cao", notes: "Ai sẽ vác những chiếc thuyền này?", primaryMuscleGroups: ["Front Delts", "Chest - Upper"], secondaryMuscleGroups: ["Triceps", "Core"] },
      { name: "Single Arm Walking Lunges (Purple - Legs)", sets: 3, reps: "12/leg", colorCode: "Purple", equipment: "Tạ 10kg", notes: "Chiếm lấy linh hồn của chúng!", primaryMuscleGroups: ["Quads", "Glutes"], secondaryMuscleGroups: ["Hamstrings", "Core"] }
    ],
    evening: [
      { name: "One Arm Bicep Curls (Pink - Biceps)", sets: 4, reps: "20/arm", isBFR: true, colorCode: "Pink", equipment: "Tạ 4kg + BFR Band", notes: "Không đau đớn thì không có thành quả, STAY HARD!", primaryMuscleGroups: ["Biceps"], secondaryMuscleGroups: ["Forearms"] },
      { name: "Hanging Leg Raise (Orange - Abs)", sets: 4, reps: "15", colorCode: "Orange", equipment: "Xà đơn/Sàn", notes: "Cơ bụng số 11! (Daily Abs)", primaryMuscleGroups: ["Abs - Lower", "Core"], secondaryMuscleGroups: ["Hip Flexors"] },
      { name: "Burpees (Orange - Cardio)", sets: 3, reps: "15", colorCode: "Orange", equipment: "None", notes: "Tim đập nhanh hơn! (Daily Cardio)", primaryMuscleGroups: ["Full Body", "Cardio"], secondaryMuscleGroups: ["Chest", "Legs", "Core"] }
    ]
  } : {
    levelName: "Vừa sức (Normal)",
    description: "Duy trì cơ bắp + Daily Abs & Cardio.",
    morning: [
      { name: "Push-up (Blue - Chest)", sets: 3, reps: "12", colorCode: "Blue", equipment: "Board", notes: "Đừng làm thằng hèn, ngực chạm sàn đi!", primaryMuscleGroups: ["Chest - Middle"], secondaryMuscleGroups: ["Triceps", "Front Delts", "Core"] },
      { name: "One Arm Dumbbell Squat (Purple - Legs)", sets: 4, reps: "12/leg", colorCode: "Purple", equipment: "Tạ 10kg (1 tay)", notes: "Chúng nó không biết tao là ai đâu con trai!", primaryMuscleGroups: ["Quads", "Glutes"], secondaryMuscleGroups: ["Hamstrings", "Core"] }
    ],
    evening: [
      { name: "Band Pull Apart (Yellow - Back)", sets: 3, reps: "15", colorCode: "Yellow", equipment: "Dây kháng lực 15kg", notes: "Chai sạn tâm trí đi!", primaryMuscleGroups: ["Rear Delts", "Upper Back"], secondaryMuscleGroups: ["Traps"] },
      { name: "Plank (Orange - Abs)", sets: 3, reps: "60s", colorCode: "Orange", equipment: "None", notes: "Gồng chặt bụng! (Daily Abs)", primaryMuscleGroups: ["Core", "Abs"], secondaryMuscleGroups: ["Shoulders", "Glutes"] },
      { name: "Jumping Jacks (Orange - Cardio)", sets: 3, reps: "50", colorCode: "Orange", equipment: "None", notes: "Đốt mỡ! (Daily Cardio)", primaryMuscleGroups: ["Cardio", "Full Body"], secondaryMuscleGroups: ["Shoulders", "Calves"] }
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
      waterIntake: waterIntake,
      totalCost: 150000,
      advice: `Mục tiêu: ${isBulking ? 'Bulking (+400kcal)' : 'Cutting (-400kcal)'}. TDEE: ${tdee}. Nước: ${waterIntake}L`,
      meals: [
        {
          name: "Bữa Sáng (07:00)",
          calories: Math.round(target * 0.25),
          protein: Math.round(proteinTarget * 0.25),
          description: "2 lát Bánh mì đen + 3 Lòng trắng trứng (Trứng ốp la bỏ lòng đỏ)",
          estimatedPrice: 20000
        },
        {
          name: "Bữa Trưa (12:30)",
          calories: Math.round(target * 0.35),
          protein: Math.round(proteinTarget * 0.35),
          description: `${carbSource} + 200g Ức gà áp chảo + ${vegSource}`,
          estimatedPrice: 50000
        },
        {
          name: "Bữa Tối (19:00)",
          calories: Math.round(target * 0.25),
          protein: Math.round(proteinTarget * 0.25),
          description: `${carbSource} + 200g Cá/Thịt nạc + ${vegSource}`,
          estimatedPrice: 60000
        },
        {
          name: "Bữa Phụ (21:30)",
          calories: Math.round(target * 0.15),
          protein: Math.round(proteinTarget * 0.15),
          description: "1 Hộp Sữa chua không đường + 1 quả Chuối",
          estimatedPrice: 15000
        }
      ]
    }
  };
};

export const generateDailyPlan = async (
  userData: UserInput,
  history: WorkoutHistoryItem[]
): Promise<DailyPlan> => {
  const apiKey = getCurrentApiKey();
  if (!apiKey) {
    console.warn("No API Keys found. Using fallback plan.");
    return getFallbackPlan(userData);
  }

  let ai = new GoogleGenAI({ apiKey });
  let retriesLeft = API_KEYS.length; // Try each key once
  const model = "gemini-2.5-flash";

  // --- PRE-CALCULATE MATH ---
  const { tdee, burn, target } = calculateTargetCalories(userData.weight, userData.height, userData.nutritionGoal, userData.selectedIntensity);
  const proteinMultiplier = userData.nutritionGoal === 'bulking' ? 2.2 : 2.0; // High protein
  const proteinTarget = Math.round(userData.weight * proteinMultiplier);
  const waterTarget = calculateWaterIntake(userData.weight, userData.useCreatine);
  const goalText = userData.nutritionGoal === 'bulking' ? "BULKING (Tăng cân)" : "CUTTING (Giảm cân)";

  // Determine Day Number (1-7)
  const today = new Date();
  const dayIndex = today.getDay(); // 0 is Sunday, 1 is Monday...
  // Map JS Day (0-6) to User Split Day (1-7) where Sunday is Day 7
  const currentDayNumber = dayIndex === 0 ? 7 : dayIndex;

  const dayNames = ["", "Day 1 (Push)", "Day 2 (Back/Biceps)", "Day 3 (Legs/Abs)", "Day 4 (Full Body/Arms)", "Day 5 (Chest/Back)", "Day 6 (Shoulder/Arms)", "Day 7 (Rest/Walk)"];
  const currentSplitName = dayNames[currentDayNumber];

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
      },
      nutrition: {
        type: Type.OBJECT,
        properties: {
          totalCalories: { type: Type.NUMBER },
          totalProtein: { type: Type.NUMBER },
          waterIntake: { type: Type.NUMBER }, // New field in schema
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
                description: { type: Type.STRING },
                estimatedPrice: { type: Type.NUMBER }
              }
            }
          }
        }
      }
    }
  };

  // --- CONDITIONAL PROMPT LOGIC ---
  let workoutInstructionBlock = "";

  if (userData.trainingMode === 'saitama') {
    workoutInstructionBlock = `
    ### WORKOUT MODE: SAITAMA CHALLENGE (ONE PUNCH MAN)
    IGNORE THE DATE AND SPLIT. TODAY IS SAITAMA DAY.
    YOU MUST GENERATE THE FOLLOWING EXERCISES:
    1. **Push-ups**: Total 100 reps target. (Break into manageable sets based on intensity, e.g., 5 sets of 20 or 10 sets of 10).
    2. **Sit-ups**: Total 100 reps target.
    3. **Squats**: Total 100 reps target (Bodyweight or Dumbbell if user wants extra hard).
    4. **Running**: 10km Run (Cardio). *IMPORTANT*: If user Intensity is 'Medium' or 'Fresh', scale this down to "60 Minutes Run/Walk (Cardio)" to be realistic. If 'Hard', keep it 10km.
    
    Structure this into Morning (Upper Body focus) and Evening (Lower Body/Run focus) or however fits best, but ALL 4 components must be present.
    `;
  } else {
    // Standard AI Mode
    workoutInstructionBlock = `
    ### WORKOUT SCHEDULE (STRICT 7-DAY SPLIT)
    TODAY IS: ${currentSplitName}. FOLLOW THIS SPLIT STRICTLY:
    - Day 1 (Mon): Push (Chest, Shoulder, Triceps)
    - Day 2 (Tue): Pull (Back, Biceps)
    - Day 3 (Wed): Legs (Quads, Hamstring, Calves, Glutes) + Abs
    - Day 4 (Thu): Full Body / Arms & Abs (Biceps, Triceps, Abs, Light Compound)
    - Day 5 (Fri): Chest & Back
    - Day 6 (Sat): Shoulder & Arms (Biceps, Triceps)
    - Day 7 (Sun): REST DAY (Active Recovery)

    **DAILY ABS & CARDIO (FOR STANDARD MODE)**: EVERY SINGLE DAY (Day 1-7) MUST include 1 Abs exercise + 1 Cardio exercise in the Evening session.
    **REST DAY RULES (Day 7 ONLY)**: Main Activity: "Đi bộ (Walking) (Cardio)" - 60 Minutes + Light Abs.
    `;
  }

  const prompt = `
    ACT AS A WORLD-CLASS PERSONAL TRAINER & NUTRITIONIST.
    GENERATE A 1-DAY PLAN FOR: ${getCurrentDate()}.
    USER GOAL: ${goalText}.
    TRAINING MODE: ${userData.trainingMode === 'saitama' ? 'SAITAMA CHALLENGE' : 'STANDARD AI COACH'}.
    
    ${workoutInstructionBlock}

    ### GENERAL WORKOUT RULES (APPLY TO ALL MODES)
    - **INTENSITY**: ${userData.selectedIntensity} (Medium=Hypertrophy, Hard=Failure/Overload).
    - **EQUIPMENT AVAILABLE**: ${userData.equipment.join(', ')}.
    - **STRICT EQUIPMENT CHECK**: You must ONLY use the tools listed above. If the user does not have a specific tool (e.g., Bench, Pull-up Bar, Machine), you MUST substitute with a **BODYWEIGHT** equivalent.
    - **ONE DUMBBELL RULE**: Unless equipment list says "2x" or "đôi", user only has ONE dumbbell. use UNILATERAL exercises.
    - **CARDIO NAMING**: If the exercise is Walking (Đi bộ) or Running (Chạy), you MUST append "(Cardio)" to the name.
    - **TIME OPTIMIZATION**: Avoid scheduling workout between 12:00 - 14:00 (Study time). Suggest optimal time.

    ### COLOR CODING RULES (MANDATORY)
    Assign a 'colorCode' to EVERY exercise based on the PRIMARY muscle group involved:
    - **Blue**: Chest (Ngực)
    - **Red**: Shoulders (Vai)
    - **Yellow**: Back (Lưng)
    - **Green**: Triceps (Tay sau)
    - **Pink**: Biceps (Tay trước)
    - **Purple**: Legs (Chân/Mông) & Lower Body
    - **Orange**: Abs (Bụng) & Cardio

    ### MUSCLE GROUP TRACKING (MANDATORY)
    For EVERY exercise, you MUST specify:
    - **primaryMuscleGroups**: Array of main muscles being worked (1-2 muscles)
    - **secondaryMuscleGroups**: Array of supporting muscles (0-3 muscles)

    **CRITICAL RULE - MUSCLE SPECIFICITY**: 
    - NEVER use generic terms like "Chest", "Back", "Shoulders", "Arms", or "Legs"
    - ALWAYS use specific anatomical regions (e.g., "Chest - Upper", "Lats", "Front Delts")
    - Be precise about which part of the muscle is being targeted

    **Examples:**
    - Incline Bench Press: primaryMuscleGroups: ["Chest - Upper", "Triceps"], secondaryMuscleGroups: ["Front Delts"]
    - Flat Bench Press: primaryMuscleGroups: ["Chest - Middle", "Triceps"], secondaryMuscleGroups: ["Front Delts"]
    - Decline Push-ups: primaryMuscleGroups: ["Chest - Lower", "Front Delts"], secondaryMuscleGroups: ["Triceps", "Core"]
    - Pull-ups: primaryMuscleGroups: ["Lats", "Upper Back"], secondaryMuscleGroups: ["Biceps", "Rear Delts"]
    - Barbell Rows: primaryMuscleGroups: ["Upper Back", "Lats"], secondaryMuscleGroups: ["Rear Delts", "Biceps"]
    - Squats: primaryMuscleGroups: ["Quads", "Glutes"], secondaryMuscleGroups: ["Hamstrings", "Core"]
    - Romanian Deadlifts: primaryMuscleGroups: ["Hamstrings", "Glutes"], secondaryMuscleGroups: ["Lower Back"]
    - Bicep Curls: primaryMuscleGroups: ["Biceps"], secondaryMuscleGroups: ["Forearms"]
    - Overhead Tricep Extension: primaryMuscleGroups: ["Triceps - Long Head"], secondaryMuscleGroups: ["Core"]
    - Tricep Pushdowns: primaryMuscleGroups: ["Triceps - Lateral Head"], secondaryMuscleGroups: []
    - Crunches: primaryMuscleGroups: ["Abs - Upper"], secondaryMuscleGroups: ["Core"]
    - Leg Raises: primaryMuscleGroups: ["Abs - Lower"], secondaryMuscleGroups: ["Hip Flexors"]
    - Russian Twists: primaryMuscleGroups: ["Obliques"], secondaryMuscleGroups: ["Abs - Upper"]
    - Plank: primaryMuscleGroups: ["Core", "Abs - Upper"], secondaryMuscleGroups: ["Shoulders", "Glutes"]

    **Muscle Group Options (BE SPECIFIC):**
    
    **Chest (Blue):**
    - "Chest - Upper" (Clavicular head, Incline movements)
    - "Chest - Middle" (Sternal head, Flat movements)
    - "Chest - Lower" (Costal head, Decline movements)
    
    **Shoulders (Red):**
    - "Front Delts" (Anterior deltoid, Pressing movements)
    - "Side Delts" (Lateral deltoid, Lateral raises)
    - "Rear Delts" (Posterior deltoid, Rows/Reverse flyes)
    
    **Back (Yellow):**
    - "Lats" (Latissimus dorsi, Pull-ups/Rows)
    - "Upper Back" (Rhomboids, Mid traps, Horizontal pulls)
    - "Lower Back" (Erector spinae, Deadlifts)
    - "Traps" (Upper trapezius, Shrugs)
    
    **Arms:**
    - "Biceps" (Biceps brachii, Curls) - Pink
    - "Triceps - Long Head" (Overhead extensions) - Green
    - "Triceps - Lateral Head" (Pushdowns) - Green
    - "Triceps" (General tricep work when both heads are equally targeted) - Green
    - "Forearms" (Wrist curls, Grip work) - Pink
    
    **Legs (Purple):**
    - "Quads" (Quadriceps, Squats/Leg extensions)
    - "Hamstrings" (Leg curls, RDLs)
    - "Glutes" (Hip thrusts, Lunges)
    - "Calves" (Calf raises)
    
    **Core (Orange):**
    - "Abs - Upper" (Upper rectus abdominis, Crunches)
    - "Abs - Lower" (Lower rectus abdominis, Leg raises)
    - "Obliques" (Side planks, Russian twists)
    - "Core" (General stability, Planks, Compound movements)


    ### NUTRITION RULES (DYNAMIC MATH)
    - **CALCULATED TARGET**: ${Math.round(target)} kcal. (This is TDEE + WorkoutBurn ${userData.nutritionGoal === 'bulking' ? '+ 400' : '- 400'}).
    - **PROTEIN TARGET**: ${proteinTarget}g (${proteinMultiplier}g/kg).
    - **WATER INTAKE TARGET**: ${waterTarget} Liters (Calculated based on weight + Creatine usage).
    - **GOAL**: ${userData.nutritionGoal === 'bulking' ? 'BULKING (High Carb/Rice)' : 'CUTTING'}.
    - **PROTEIN OPTIMIZATION**: Select foods with high protein density (e.g., Chicken Breast, Egg Whites, Whey, Lean Beef).
    - **VEGETABLES**: Prioritize user's fridge: ${userData.availableIngredients.join(', ')}. If empty, use generic economical veggies.
    - **CARBS**: 
       - Breakfast: NO RICE (Bread/Sweet Potato/Oats only).
       - Lunch/Dinner: White Rice is allowed (High amount for Bulk, Controlled amount for Cut).
    - **FORMAT**: Meal names MUST have time (e.g., "Bữa Sáng (07:00)"). Description MUST be specific (e.g., "300g Rice + 200g Chicken").

    ### DATA INPUTS
    - Weight: ${userData.weight}kg, Height: ${userData.height}cm.
    - Sore Muscles: ${userData.soreMuscles.join(', ')} (Avoid heavy load on these).
    - Fatigue: ${userData.fatigue}.
    - Food Consumed Today: ${userData.consumedFood.join(', ')} (Subtract these from the plan).
    - Creatine Supplement: ${userData.useCreatine ? "YES" : "NO"}.

    Generate JSON response.
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

      return JSON.parse(jsonText) as DailyPlan;
    } catch (error) {
      console.error("Gemini API Error:", error);

      // Check if rate limited and we have more keys to try
      if (isRateLimitError(error) && retriesLeft > 1) {
        const newKey = markRateLimitedAndRotate();
        if (newKey) {
          console.log(`⚡ Rate limit detected, switching to next API key...`);
          ai = new GoogleGenAI({ apiKey: newKey });
          retriesLeft--;
          continue;
        }
      }

      // No more retries or not a rate limit error
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

  let ai = new GoogleGenAI({ apiKey });
  let retriesLeft = API_KEYS.length;
  const model = "gemini-2.5-flash";

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

      return JSON.parse(jsonText) as AIOverview;
    } catch (error) {
      console.error("AI Overview Error:", error);

      // Check if rate limited and we have more keys to try
      if (isRateLimitError(error) && retriesLeft > 1) {
        const newKey = markRateLimitedAndRotate();
        if (newKey) {
          console.log(`⚡ Rate limit detected on AI Overview, switching to next API key...`);
          ai = new GoogleGenAI({ apiKey: newKey });
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
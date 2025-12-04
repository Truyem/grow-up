
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { UserInput, DailyPlan, WorkoutHistoryItem, Intensity, WorkoutLevel, FatigueLevel, MuscleGroup } from "../types";

// The API key is injected via vite.config.ts define into process.env.API_KEY
const API_KEY = process.env.API_KEY;

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


// Fallback plans tailored by intensity and goal
const getFallbackPlan = (userData: UserInput): DailyPlan => {
  const { tdee, burn, target } = calculateTargetCalories(userData.weight, userData.height, userData.nutritionGoal, userData.selectedIntensity);
  
  const isBulking = userData.nutritionGoal === 'bulking';
  const proteinTarget = Math.round(userData.weight * (isBulking ? 2.2 : 2.0)); // 2.2g or 2.0g per kg

  const intensity = userData.selectedIntensity;
  
  const workout: WorkoutLevel = intensity === Intensity.Hard ? {
    levelName: "Cháy hết mình (Hard)",
    description: "Tăng cơ tối đa + Daily Abs & Cardio Hardcore.",
    morning: [
      { name: "Decline Push-up (Red - Shoulder)", sets: 4, reps: "Max", colorCode: "Red", equipment: "Board + Chân cao", notes: "Ai sẽ vác những chiếc thuyền này?" },
      { name: "Single Arm Walking Lunges", sets: 3, reps: "12/leg", equipment: "Tạ 10kg", notes: "Chiếm lấy linh hồn của chúng!" }
    ],
    evening: [
      { name: "One Arm Bicep Curls", sets: 4, reps: "20/arm", isBFR: true, equipment: "Tạ 4kg + BFR Band", notes: "Không đau đớn thì không có thành quả, STAY HARD!" },
      { name: "Hanging Leg Raise (Abs)", sets: 4, reps: "15", equipment: "Xà đơn/Sàn", notes: "Cơ bụng số 11! (Daily Abs)" },
      { name: "Burpees (Cardio)", sets: 3, reps: "15", equipment: "None", notes: "Tim đập nhanh hơn! (Daily Cardio)" }
    ]
  } : {
    levelName: "Vừa sức (Normal)",
    description: "Duy trì cơ bắp + Daily Abs & Cardio.",
    morning: [
      { name: "Push-up (Blue - Chest)", sets: 3, reps: "12", colorCode: "Blue", equipment: "Board", notes: "Đừng làm thằng hèn, ngực chạm sàn đi!" },
      { name: "One Arm Dumbbell Squat", sets: 4, reps: "12/leg", equipment: "Tạ 10kg (1 tay)", notes: "Chúng nó không biết tao là ai đâu con trai!" }
    ],
    evening: [
       { name: "Band Pull Apart", sets: 3, reps: "15", equipment: "Dây kháng lực 15kg", notes: "Chai sạn tâm trí đi!" },
       { name: "Plank (Abs)", sets: 3, reps: "60s", equipment: "None", notes: "Gồng chặt bụng! (Daily Abs)" },
       { name: "Jumping Jacks (Cardio)", sets: 3, reps: "50", equipment: "None", notes: "Đốt mỡ! (Daily Cardio)" }
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
      totalCost: 150000,
      advice: `Mục tiêu: ${isBulking ? 'Bulking (+400kcal)' : 'Cutting (-400kcal)'}. TDEE: ${tdee}.`,
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
  if (!API_KEY) {
    console.warn("API Key not found. Using fallback plan.");
    return getFallbackPlan(userData);
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const model = "gemini-2.5-flash";

  // --- PRE-CALCULATE MATH ---
  const { tdee, burn, target } = calculateTargetCalories(userData.weight, userData.height, userData.nutritionGoal, userData.selectedIntensity);
  const proteinMultiplier = userData.nutritionGoal === 'bulking' ? 2.2 : 2.0; // High protein
  const proteinTarget = Math.round(userData.weight * proteinMultiplier);
  const goalText = userData.nutritionGoal === 'bulking' ? "BULKING (Tăng cân)" : "CUTTING (Giảm cân)";
  const mathExplanation = `
    - User Stats: ${userData.weight}kg, ${userData.height}cm.
    - Estimated Maintenance (TDEE): ~${tdee} kcal.
    - Estimated Workout Burn: +${burn} kcal (approx).
    - Goal Adjustment (${goalText}): ${userData.nutritionGoal === 'bulking' ? '+400' : '-400'} kcal.
    - FINAL DAILY TARGET: ~${target} kcal.
  `;

  // Determine Day Number (1-7)
  const today = new Date();
  const dayIndex = today.getDay(); // 0 is Sunday, 1 is Monday...
  // Map JS Day (0-6) to User Split Day (1-7) where Sunday is Day 7
  const currentDayNumber = dayIndex === 0 ? 7 : dayIndex; 
  
  const dayNames = ["", "Day 1 (Push)", "Day 2 (Back/Biceps)", "Day 3 (Legs/Abs)", "Day 4 (Rest)", "Day 5 (Chest/Back)", "Day 6 (Shoulder/Arms)", "Day 7 (Rest/Walk)"];
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
                    isBFR: { type: Type.BOOLEAN }
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
                    isBFR: { type: Type.BOOLEAN }
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

  const prompt = `
    ACT AS A WORLD-CLASS PERSONAL TRAINER & NUTRITIONIST.
    GENERATE A 1-DAY PLAN FOR: ${getCurrentDate()}.
    USER GOAL: ${goalText}.
    
    ### 1. WORKOUT SCHEDULE (STRICT 7-DAY SPLIT)
    TODAY IS: ${currentSplitName}. FOLLOW THIS SPLIT STRICTLY:
    - Day 1 (Mon): Push (Chest, Shoulder, Triceps)
    - Day 2 (Tue): Pull (Back, Biceps)
    - Day 3 (Wed): Legs (Quads, Hamstring, Calves, Glutes) + Abs
    - Day 4 (Thu): REST DAY (Active Recovery)
    - Day 5 (Fri): Chest & Back
    - Day 6 (Sat): Shoulder & Arms (Biceps, Triceps)
    - Day 7 (Sun): REST DAY (Active Recovery)

    ### 2. WORKOUT RULES (CRITICAL)
    - **INTENSITY**: ${userData.selectedIntensity} (Medium=Hypertrophy, Hard=Failure/Overload).
    - **EQUIPMENT AVAILABLE**: ${userData.equipment.join(', ')}.
    - **STRICT EQUIPMENT CHECK**: You must ONLY use the tools listed above. If the user does not have a specific tool (e.g., Bench, Pull-up Bar, Machine), you MUST substitute with a **BODYWEIGHT** equivalent (e.g., Floor Press instead of Bench Press, Australian Pull-up under table instead of Pull-up).
    - **ONE DUMBBELL RULE**: Unless equipment list says "2x" or "đôi", user only has ONE dumbbell. use UNILATERAL exercises (One Arm Row, Single Arm Press, Split Squat, etc.).
    - **DAILY ABS & CARDIO**: EVERY SINGLE DAY (Day 1-7) MUST include 1 Abs exercise + 1 Cardio exercise in the Evening session.
    - **CARDIO NAMING**: If the exercise is Walking (Đi bộ) or Running (Chạy), you MUST append "(Cardio)" to the name.
    - **REST DAY (Day 4 & 7)**: 
      - Main Activity: "Đi bộ (Walking) (Cardio)" - 60 Minutes.
      - Plus Light Abs exercise.
    - **TIME OPTIMIZATION**: Avoid scheduling workout between 12:00 - 14:00 (Study time). Suggest optimal time.

    ### 3. NUTRITION RULES (DYNAMIC MATH)
    - **CALCULATED TARGET**: ${Math.round(target)} kcal. (This is TDEE + WorkoutBurn ${userData.nutritionGoal === 'bulking' ? '+ 400' : '- 400'}).
    - **PROTEIN TARGET**: ${proteinTarget}g (${proteinMultiplier}g/kg).
    - **GOAL**: ${userData.nutritionGoal === 'bulking' ? 'BULKING (High Carb/Rice)' : 'CUTTING (Deficit < 2300 logic removed, adhere to calculated target)'}.
    - **PROTEIN OPTIMIZATION**: Select foods with high protein density (e.g., Chicken Breast, Egg Whites, Whey, Lean Beef) to hit ${proteinTarget}g within ${Math.round(target)} kcal.
    - **VEGETABLES**: Prioritize user's fridge: ${userData.availableIngredients.join(', ')}. If empty, use generic economical veggies.
    - **CARBS**: 
       - Breakfast: NO RICE (Bread/Sweet Potato/Oats only).
       - Lunch/Dinner: White Rice is allowed (High amount for Bulk, Controlled amount for Cut).
    - **FORMAT**: Meal names MUST have time (e.g., "Bữa Sáng (07:00)"). Description MUST be specific (e.g., "300g Rice + 200g Chicken").

    ### 4. DATA INPUTS
    - Weight: ${userData.weight}kg, Height: ${userData.height}cm.
    - Sore Muscles: ${userData.soreMuscles.join(', ')} (Avoid heavy load on these).
    - Fatigue: ${userData.fatigue}.
    - Food Consumed Today: ${userData.consumedFood.join(', ')} (Subtract these from the plan).

    Generate JSON response.
  `;

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
    return getFallbackPlan(userData);
  }
};

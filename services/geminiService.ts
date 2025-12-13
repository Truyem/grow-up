

import { UserInput, DailyPlan, WorkoutHistoryItem, Intensity, WorkoutLevel, FatigueLevel, MuscleGroup, AIOverview } from "../types";

// Determine API base URL - use relative path for production, localhost for dev
const API_BASE = '';

// API Status type for external consumption (simplified for frontend)
export interface ApiStatus {
  totalKeys: number;
  currentKeyIndex: number;
  activeKeysCount: number;
  rateLimitedKeysCount: number;
  rateLimitedKeyIndexes: number[];
}

// Get API status - now returns a simplified status since keys are server-side
export const getApiStatus = (): ApiStatus => {
  return {
    totalKeys: 10, // Approximate - actual count is on server
    currentKeyIndex: 0,
    activeKeysCount: 10,
    rateLimitedKeysCount: 0,
    rateLimitedKeyIndexes: []
  };
};

// Set current API key - no-op since keys are managed server-side
export const setCurrentApiKey = (index: number): boolean => {
  console.log(`API key management is now handled server-side`);
  return true;
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

  let adjustment = 0;
  if (goal === 'bulking') {
    adjustment = 400;
  } else {
    adjustment = -400;
  }

  const target = tdee + adjustment;
  return { tdee, burn, target };
};

// 5. Calculate Water Intake
const calculateWaterIntake = (weight: number, useCreatine: boolean): number => {
  let baseWater = weight * 0.04;
  if (useCreatine) {
    baseWater += 1.5;
  }
  return Math.round(baseWater * 10) / 10;
};


// Fallback plans tailored by intensity and goal
const getFallbackPlan = (userData: UserInput): DailyPlan => {
  const { tdee, burn, target } = calculateTargetCalories(userData.weight, userData.height, userData.nutritionGoal, userData.selectedIntensity);

  const isBulking = userData.nutritionGoal === 'bulking';
  const proteinTarget = Math.round(userData.weight * (isBulking ? 2.2 : 2.0));

  const intensity = userData.selectedIntensity;
  const waterIntake = calculateWaterIntake(userData.weight, userData.useCreatine);

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
  try {
    const response = await fetch(`${API_BASE}/api/generate-plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userData, history }),
    });

    if (!response.ok) {
      console.error("API Error:", response.status, response.statusText);
      return getFallbackPlan(userData);
    }

    const data = await response.json();
    return data as DailyPlan;
  } catch (error) {
    console.error("Network Error:", error);
    return getFallbackPlan(userData);
  }
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
  if (history.length === 0) {
    return getFallbackAIOverview(history);
  }

  try {
    const response = await fetch(`${API_BASE}/api/generate-overview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ history, userData }),
    });

    if (!response.ok) {
      console.error("API Error:", response.status, response.statusText);
      return getFallbackAIOverview(history);
    }

    const data = await response.json();
    return data as AIOverview;
  } catch (error) {
    console.error("Network Error:", error);
    return getFallbackAIOverview(history);
  }
};
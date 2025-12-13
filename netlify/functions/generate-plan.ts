import { GoogleGenAI, Type } from "@google/genai";
import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

// Types from the main app
interface UserInput {
    weight: number;
    height: number;
    equipment: string[];
    nutritionGoal: 'bulking' | 'cutting';
    selectedIntensity: 'Medium' | 'Hard';
    useCreatine: boolean;
    soreMuscles: string[];
    fatigue: string;
    consumedFood: string[];
    availableIngredients: string[];
    trainingMode: 'ai' | 'saitama';
}

interface WorkoutHistoryItem {
    date: string;
    timestamp: number;
    levelSelected: string;
    completedExercises?: string[];
}

// API Key management
interface ApiKeyState {
    keys: string[];
    currentIndex: number;
    rateLimitedIndices: Set<number>;
}

const state: ApiKeyState = {
    keys: [],
    currentIndex: 0,
    rateLimitedIndices: new Set(),
};

const initializeKeys = () => {
    if (state.keys.length === 0) {
        const keys: string[] = [];
        let i = 1;
        while (process.env[`API_KEY_${i}`]) {
            keys.push(process.env[`API_KEY_${i}`]!);
            i++;
        }
        if (keys.length === 0 && process.env.API_KEY) {
            keys.push(process.env.API_KEY);
        }
        if (keys.length === 0 && process.env.GEMINI_API_KEY) {
            keys.push(process.env.GEMINI_API_KEY);
        }
        state.keys = keys;
        console.log(`🔑 Loaded ${keys.length} API key(s)`);
    }
};

const getCurrentKey = (): string | undefined => {
    initializeKeys();
    return state.keys[state.currentIndex];
};

const rotateToNextKey = (): boolean => {
    initializeKeys();
    if (state.keys.length <= 1) return false;

    const startIndex = state.currentIndex;
    let nextIndex = (state.currentIndex + 1) % state.keys.length;

    while (nextIndex !== startIndex) {
        if (!state.rateLimitedIndices.has(nextIndex)) {
            state.currentIndex = nextIndex;
            console.log(`🔄 Switched to API key ${state.currentIndex + 1}/${state.keys.length}`);
            return true;
        }
        nextIndex = (nextIndex + 1) % state.keys.length;
    }

    state.currentIndex = (state.currentIndex + 1) % state.keys.length;
    return false;
};

const markCurrentKeyAsRateLimited = (): void => {
    state.rateLimitedIndices.add(state.currentIndex);
    console.log(`⚠️ API key ${state.currentIndex + 1} marked as rate limited`);
};

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

// Helper functions
const getCurrentDate = () => {
    const now = new Date();
    const days = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    return `${days[now.getDay()]}, ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
};

const calculateBMR = (weight: number, height: number, age: number = 22): number => {
    return (10 * weight) + (6.25 * height) - (5 * age) + 5;
};

const calculateTDEE = (bmr: number): number => {
    return Math.round(bmr * 1.55);
};

const estimateWorkoutBurn = (intensity: 'Medium' | 'Hard'): number => {
    return intensity === 'Hard' ? 450 : 300;
};

const calculateTargetCalories = (weight: number, height: number, goal: 'bulking' | 'cutting', intensity: 'Medium' | 'Hard') => {
    const bmr = calculateBMR(weight, height);
    const tdee = calculateTDEE(bmr);
    const burn = estimateWorkoutBurn(intensity);
    let adjustment = goal === 'bulking' ? 400 : -400;
    const target = tdee + adjustment;
    return { tdee, burn, target };
};

const calculateWaterIntake = (weight: number, useCreatine: boolean): number => {
    let baseWater = weight * 0.04;
    if (useCreatine) baseWater += 1.5;
    return Math.round(baseWater * 10) / 10;
};

// Fallback plan generator
const getFallbackPlan = (userData: UserInput) => {
    const { tdee, target } = calculateTargetCalories(userData.weight, userData.height, userData.nutritionGoal, userData.selectedIntensity);
    const isBulking = userData.nutritionGoal === 'bulking';
    const proteinTarget = Math.round(userData.weight * (isBulking ? 2.2 : 2.0));
    const waterIntake = calculateWaterIntake(userData.weight, userData.useCreatine);

    return {
        date: getCurrentDate(),
        schedule: {
            suggestedWorkoutTime: "17:30",
            suggestedSleepTime: "23:00",
            reasoning: "Offline Mode: Tính toán dựa trên công thức TDEE tiêu chuẩn."
        },
        workout: {
            summary: "Bạn đang Offline. Đây là lịch tập mẫu.",
            detail: {
                levelName: userData.selectedIntensity === 'Hard' ? "Cháy hết mình (Hard)" : "Vừa sức (Normal)",
                description: "Fallback workout plan",
                morning: [
                    { name: "Push-up", sets: 3, reps: "12", colorCode: "Blue", equipment: "None", notes: "Warm up exercise", primaryMuscleGroups: ["Chest - Middle"], secondaryMuscleGroups: ["Triceps"] }
                ],
                evening: [
                    { name: "Plank", sets: 3, reps: "60s", colorCode: "Orange", equipment: "None", notes: "Core exercise", primaryMuscleGroups: ["Core"], secondaryMuscleGroups: ["Abs"] }
                ]
            }
        },
        nutrition: {
            totalCalories: target,
            totalProtein: proteinTarget,
            waterIntake: waterIntake,
            totalCost: 150000,
            advice: `Mục tiêu: ${isBulking ? 'Bulking (+400kcal)' : 'Cutting (-400kcal)'}. TDEE: ${tdee}. Nước: ${waterIntake}L`,
            meals: [
                { name: "Bữa Sáng (07:00)", calories: Math.round(target * 0.25), protein: Math.round(proteinTarget * 0.25), description: "2 lát Bánh mì đen + 3 Lòng trắng trứng", estimatedPrice: 20000 },
                { name: "Bữa Trưa (12:30)", calories: Math.round(target * 0.35), protein: Math.round(proteinTarget * 0.35), description: "Cơm + 200g Ức gà", estimatedPrice: 50000 },
                { name: "Bữa Tối (19:00)", calories: Math.round(target * 0.25), protein: Math.round(proteinTarget * 0.25), description: "Cơm + 200g Cá/Thịt nạc", estimatedPrice: 60000 },
                { name: "Bữa Phụ (21:30)", calories: Math.round(target * 0.15), protein: Math.round(proteinTarget * 0.15), description: "1 Hộp Sữa chua + 1 Chuối", estimatedPrice: 15000 }
            ]
        }
    };
};

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json',
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const { userData, history } = body as { userData: UserInput; history: WorkoutHistoryItem[] };

        if (!userData) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing userData' }),
            };
        }

        const generateWithRetry = async (retryCount = 0): Promise<string> => {
            const apiKey = getCurrentKey();
            if (!apiKey) {
                console.warn("No API Keys found. Using fallback plan.");
                return JSON.stringify(getFallbackPlan(userData));
            }

            const ai = new GoogleGenAI({ apiKey });
            const model = "gemini-2.5-flash";

            // Pre-calculate values
            const { tdee, target } = calculateTargetCalories(userData.weight, userData.height, userData.nutritionGoal, userData.selectedIntensity);
            const proteinMultiplier = userData.nutritionGoal === 'bulking' ? 2.2 : 2.0;
            const proteinTarget = Math.round(userData.weight * proteinMultiplier);
            const waterTarget = calculateWaterIntake(userData.weight, userData.useCreatine);
            const goalText = userData.nutritionGoal === 'bulking' ? "BULKING (Tăng cân)" : "CUTTING (Giảm cân)";

            const today = new Date();
            const dayIndex = today.getDay();
            const currentDayNumber = dayIndex === 0 ? 7 : dayIndex;
            const dayNames = ["", "Day 1 (Push)", "Day 2 (Back/Biceps)", "Day 3 (Legs/Abs)", "Day 4 (Arms)", "Day 5 (Chest/Back)", "Day 6 (Shoulder/Arms)", "Day 7 (Rest/Walk)"];
            const currentSplitName = dayNames[currentDayNumber];

            // Schema definition
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
                            waterIntake: { type: Type.NUMBER },
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

            // Build workout instruction block
            let workoutInstructionBlock = "";
            if (userData.trainingMode === 'saitama') {
                workoutInstructionBlock = `
### WORKOUT MODE: SAITAMA CHALLENGE (ONE PUNCH MAN)
IGNORE THE DATE AND SPLIT. TODAY IS SAITAMA DAY.
YOU MUST GENERATE THE FOLLOWING EXERCISES:
1. **Push-ups**: Total 100 reps target.
2. **Sit-ups**: Total 100 reps target.
3. **Squats**: Total 100 reps target.
4. **Running**: 10km Run (Cardio).
`;
            } else {
                workoutInstructionBlock = `
### WORKOUT SCHEDULE (STRICT 7-DAY SPLIT)
TODAY IS: ${currentSplitName}. FOLLOW THIS SPLIT STRICTLY:
- Day 1 (Mon): Push (Chest, Shoulder, Triceps)
- Day 2 (Tue): Pull (Back, Biceps)
- Day 3 (Wed): Legs + Abs
- Day 4 (Thu): Full Body / Arms & Abs
- Day 5 (Fri): Chest & Back
- Day 6 (Sat): Shoulder & Arms
- Day 7 (Sun): REST DAY (Active Recovery)

**DAILY ABS & CARDIO**: EVERY DAY MUST include 1 Abs exercise + 1 Cardio exercise in the Evening session.
`;
            }

            const prompt = `
ACT AS A WORLD-CLASS PERSONAL TRAINER & NUTRITIONIST.
GENERATE A 1-DAY PLAN FOR: ${getCurrentDate()}.
USER GOAL: ${goalText}.
TRAINING MODE: ${userData.trainingMode === 'saitama' ? 'SAITAMA CHALLENGE' : 'STANDARD AI COACH'}.

${workoutInstructionBlock}

### GENERAL WORKOUT RULES
- **EXERCISE NAMES**: ALL exercise names MUST be in ENGLISH ONLY.
- **INTENSITY**: ${userData.selectedIntensity}.
- **EQUIPMENT AVAILABLE**: ${userData.equipment.join(', ')}.
- **ONE DUMBBELL RULE**: Unless equipment list says "2x", user only has ONE dumbbell.

### COLOR CODING RULES
- Blue: Chest | Red: Shoulders | Yellow: Back | Green: Triceps | Pink: Biceps | Purple: Legs | Orange: Abs & Cardio

### MUSCLE GROUP TRACKING
For EVERY exercise, specify primaryMuscleGroups and secondaryMuscleGroups with specific anatomical regions.

### NUTRITION RULES
- TARGET: ${Math.round(target)} kcal
- PROTEIN TARGET: ${proteinTarget}g
- WATER INTAKE TARGET: ${waterTarget} Liters
- GOAL: ${userData.nutritionGoal === 'bulking' ? 'BULKING' : 'CUTTING'}

### DATA INPUTS
- Weight: ${userData.weight}kg, Height: ${userData.height}cm
- Sore Muscles: ${userData.soreMuscles.join(', ')}
- Fatigue: ${userData.fatigue}
- Food Consumed Today: ${userData.consumedFood.join(', ')}
- Creatine: ${userData.useCreatine ? "YES" : "NO"}

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
                return jsonText;
            } catch (error) {
                console.error("Gemini API Error:", error);

                if (isRateLimitError(error) && retryCount < state.keys.length) {
                    markCurrentKeyAsRateLimited();
                    rotateToNextKey();
                    return generateWithRetry(retryCount + 1);
                }

                return JSON.stringify(getFallbackPlan(userData));
            }
        };

        const result = await generateWithRetry();

        return {
            statusCode: 200,
            headers,
            body: result,
        };
    } catch (error) {
        console.error("Function error:", error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    }
};

export { handler };

import type { Context } from "@netlify/functions";
import { GoogleGenAI, Type } from "@google/genai";

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

// Load API keys from environment
const getApiKeys = (): string[] => {
    const keys: string[] = [];
    let i = 1;
    while (process.env[`API_KEY_${i}`]) {
        keys.push(process.env[`API_KEY_${i}`]!);
        i++;
    }
    if (keys.length === 0 && process.env.API_KEY) {
        keys.push(process.env.API_KEY);
    }
    return keys;
};

// ===== SECURITY: Allowed Origins =====
// Add your production domains here
const ALLOWED_ORIGINS = [
    'https://grow-up.netlify.app',       // Your Netlify domain
    'https://your-custom-domain.com',     // Your custom domain (update this!)
    'http://localhost:5173',              // Local dev
    'http://localhost:8888',              // Netlify dev
];

// Check if origin is allowed
const isOriginAllowed = (origin: string | null): boolean => {
    if (!origin) return false;
    // Also allow any subdomain of netlify.app for preview deploys
    if (origin.endsWith('.netlify.app')) return true;
    return ALLOWED_ORIGINS.includes(origin);
};

// Get CORS origin (return specific origin if allowed, or null)
const getCorsOrigin = (origin: string | null): string | null => {
    if (isOriginAllowed(origin)) return origin;
    return null;
};

// Track rate-limited keys (in-memory, resets on cold start)
const rateLimitedKeys: Map<number, number> = new Map();
let currentKeyIndex = 0;

const getCurrentApiKey = (apiKeys: string[]): string | null => {
    if (apiKeys.length === 0) return null;
    return apiKeys[currentKeyIndex % apiKeys.length];
};

const markRateLimitedAndRotate = (apiKeys: string[]): string | null => {
    if (apiKeys.length === 0) return null;
    rateLimitedKeys.set(currentKeyIndex, Date.now());
    console.log(`⚠️ API key ${currentKeyIndex + 1} marked as rate limited`);

    let attempts = 0;
    while (attempts < apiKeys.length) {
        currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
        if (!rateLimitedKeys.has(currentKeyIndex)) {
            console.log(`🔄 Switched to API key ${currentKeyIndex + 1}/${apiKeys.length}`);
            return apiKeys[currentKeyIndex];
        }
        attempts++;
    }

    // All keys rate limited, clear oldest
    if (rateLimitedKeys.size > 0) {
        const oldestKey = Array.from(rateLimitedKeys.entries())
            .sort((a, b) => a[1] - b[1])[0][0];
        rateLimitedKeys.delete(oldestKey);
        currentKeyIndex = oldestKey;
        return apiKeys[currentKeyIndex];
    }
    return null;
};

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
    const { tdee, burn, target } = calculateTargetCalories(userData.weight, userData.height, userData.nutritionGoal, userData.selectedIntensity);
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

export default async (req: Request, context: Context) => {
    const origin = req.headers.get('origin');
    const corsOrigin = getCorsOrigin(origin);

    // ===== SECURITY: Block unauthorized origins =====
    if (!isOriginAllowed(origin)) {
        console.warn(`🚫 Blocked request from unauthorized origin: ${origin}`);
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': corsOrigin || '',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            }
        });
    }

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const API_KEYS = getApiKeys();

    try {
        const body = await req.json();
        const { userData, history } = body as { userData: UserInput; history: WorkoutHistoryItem[] };

        if (!userData) {
            return new Response(JSON.stringify({ error: 'Missing userData' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const apiKey = getCurrentApiKey(API_KEYS);
        if (!apiKey) {
            console.warn("No API Keys found. Using fallback plan.");
            return new Response(JSON.stringify(getFallbackPlan(userData)), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        let ai = new GoogleGenAI({ apiKey });
        let retriesLeft = API_KEYS.length;
        const model = "gemini-2.5-flash";

        // Pre-calculate values
        const { tdee, burn, target } = calculateTargetCalories(userData.weight, userData.height, userData.nutritionGoal, userData.selectedIntensity);
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

                return new Response(jsonText, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': corsOrigin || ''
                    }
                });
            } catch (error) {
                console.error("Gemini API Error:", error);

                if (isRateLimitError(error) && retriesLeft > 1) {
                    const newKey = markRateLimitedAndRotate(API_KEYS);
                    if (newKey) {
                        console.log(`⚡ Rate limit detected, switching to next API key...`);
                        ai = new GoogleGenAI({ apiKey: newKey });
                        retriesLeft--;
                        continue;
                    }
                }

                return new Response(JSON.stringify(getFallbackPlan(userData)), {
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': corsOrigin || ''
                    }
                });
            }
        }

        return new Response(JSON.stringify(getFallbackPlan(userData)), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': corsOrigin || ''
            }
        });
    } catch (error) {
        console.error("Function error:", error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': corsOrigin || ''
            }
        });
    }
};

import type { Context } from "@netlify/functions";
import { GoogleGenAI, Type } from "@google/genai";

interface WorkoutHistoryItem {
    date: string;
    timestamp: number;
    levelSelected: string;
    completedExercises?: string[];
}

interface UserInput {
    nutritionGoal: 'bulking' | 'cutting';
}

interface AIOverview {
    summary: string;
    strengths: string[];
    improvements: string[];
    recommendation: string;
    motivationalQuote: string;
    weeklyStats: {
        workoutsCompleted: number;
        totalExercises: number;
        estimatedCaloriesBurned: number;
        consistency: number;
    };
}

// Load API keys from environment
const getApiKeys = (): string[] => {
    const keys: string[] = [];

    // Try numbered keys first (API_KEY_1, API_KEY_2, etc.)
    let i = 1;
    while (process.env[`API_KEY_${i}`]) {
        keys.push(process.env[`API_KEY_${i}`]!);
        i++;
    }

    // Fallback to single API_KEY
    if (keys.length === 0 && process.env.API_KEY) {
        keys.push(process.env.API_KEY);
    }

    // Fallback to GEMINI_API_KEY (common naming convention)
    if (keys.length === 0 && process.env.GEMINI_API_KEY) {
        keys.push(process.env.GEMINI_API_KEY);
    }

    // Log for debugging
    console.log(`🔑 [Overview] Loaded ${keys.length} API key(s)`);

    return keys;
};

const rateLimitedKeys: Map<number, number> = new Map();
let currentKeyIndex = 0;

const getCurrentApiKey = (apiKeys: string[]): string | null => {
    if (apiKeys.length === 0) return null;
    return apiKeys[currentKeyIndex % apiKeys.length];
};

const markRateLimitedAndRotate = (apiKeys: string[]): string | null => {
    if (apiKeys.length === 0) return null;
    rateLimitedKeys.set(currentKeyIndex, Date.now());

    let attempts = 0;
    while (attempts < apiKeys.length) {
        currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
        if (!rateLimitedKeys.has(currentKeyIndex)) {
            return apiKeys[currentKeyIndex];
        }
        attempts++;
    }

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
            message.includes('too many requests');
    }
    return false;
};

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

export default async (req: Request, context: Context) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
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
        const { history, userData } = body as { history: WorkoutHistoryItem[]; userData?: UserInput };

        if (!history || history.length === 0) {
            return new Response(JSON.stringify(getFallbackAIOverview([])), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        const apiKey = getCurrentApiKey(API_KEYS);
        if (!apiKey) {
            return new Response(JSON.stringify(getFallbackAIOverview(history)), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        let ai = new GoogleGenAI({ apiKey });
        let retriesLeft = API_KEYS.length;
        const model = "gemini-2.5-flash";

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
- strengths: 2-3 điểm mạnh
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

                return new Response(jsonText, {
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
                });
            } catch (error) {
                console.error("AI Overview Error:", error);

                if (isRateLimitError(error) && retriesLeft > 1) {
                    const newKey = markRateLimitedAndRotate(API_KEYS);
                    if (newKey) {
                        ai = new GoogleGenAI({ apiKey: newKey });
                        retriesLeft--;
                        continue;
                    }
                }

                return new Response(JSON.stringify(getFallbackAIOverview(history)), {
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
                });
            }
        }

        return new Response(JSON.stringify(getFallbackAIOverview(history)), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    } catch (error) {
        console.error("Function error:", error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
};

import { GoogleGenAI, Type } from "@google/genai";
import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

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
        console.log(`🔑 [Overview] Loaded ${keys.length} API key(s)`);
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
            return true;
        }
        nextIndex = (nextIndex + 1) % state.keys.length;
    }

    state.currentIndex = (state.currentIndex + 1) % state.keys.length;
    return false;
};

const markCurrentKeyAsRateLimited = (): void => {
    state.rateLimitedIndices.add(state.currentIndex);
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
        const { history, userData } = body as { history: WorkoutHistoryItem[]; userData?: UserInput };

        if (!history || history.length === 0) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(getFallbackAIOverview([])),
            };
        }

        const generateWithRetry = async (retryCount = 0): Promise<string> => {
            const apiKey = getCurrentKey();
            if (!apiKey) {
                return JSON.stringify(getFallbackAIOverview(history));
            }

            const ai = new GoogleGenAI({ apiKey });
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
                console.error("AI Overview Error:", error);

                if (isRateLimitError(error) && retryCount < state.keys.length) {
                    markCurrentKeyAsRateLimited();
                    rotateToNextKey();
                    return generateWithRetry(retryCount + 1);
                }

                return JSON.stringify(getFallbackAIOverview(history));
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

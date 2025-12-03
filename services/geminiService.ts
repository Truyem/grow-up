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

// Fallback plans tailored by intensity
const FALLBACK_PLANS_BY_INTENSITY: Record<Intensity, WorkoutLevel> = {
  [Intensity.Medium]: {
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
  },
  [Intensity.Hard]: {
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
  }
};

const getFallbackPlan = (intensity: Intensity): DailyPlan => ({
  date: getCurrentDate(),
  schedule: {
    suggestedWorkoutTime: "17:30",
    suggestedSleepTime: "23:00",
    reasoning: "Offline mode: Default schedule."
  },
  workout: {
    summary: "Kế hoạch dự phòng (Offline).",
    detail: FALLBACK_PLANS_BY_INTENSITY[intensity]
  },
  nutrition: {
    totalCalories: 2600,
    totalProtein: 155,
    totalCost: 95000,
    advice: "BULKING: Ăn dư thừa Calo. Bữa sáng không cơm.",
    meals: [
      { name: "Bữa Sáng (07:00)", calories: 600, protein: 35, description: "300g Khoai lang luộc + 3 Trứng ốp la + 1 quả Chuối.", estimatedPrice: 20000 },
      { name: "Bữa Trưa (12:00)", calories: 950, protein: 60, description: "3 bát Cơm đầy (400g) + 200g Ức gà xào + 200g Rau trong tủ lạnh.", estimatedPrice: 45000 },
      { name: "Bữa Tối (18:30)", calories: 950, protein: 60, description: "3 bát Cơm đầy (400g) + 200g Thịt bò xào + 200g Rau xanh.", estimatedPrice: 30000 },
      { name: "Bữa Phụ (21:00)", calories: 100, protein: 0, description: "1 hộp sữa chua Vinamilk (100g) + 1 quả táo.", estimatedPrice: 5000 }
    ]
  }
});

const exerciseSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    sets: { type: Type.NUMBER },
    reps: { type: Type.STRING },
    notes: { type: Type.STRING },
    equipment: { type: Type.STRING },
    colorCode: { type: Type.STRING, enum: ["Red", "Blue", "Yellow", "Green"] },
    isBFR: { type: Type.BOOLEAN }
  },
  required: ["name", "sets", "reps", "notes"]
};

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    date: { type: Type.STRING },
    schedule: {
      type: Type.OBJECT,
      properties: {
        suggestedWorkoutTime: { type: Type.STRING },
        suggestedSleepTime: { type: Type.STRING },
        reasoning: { type: Type.STRING }
      },
      required: ["suggestedWorkoutTime", "suggestedSleepTime", "reasoning"]
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
            morning: { type: Type.ARRAY, items: exerciseSchema },
            evening: { type: Type.ARRAY, items: exerciseSchema }
          },
          required: ["levelName", "description", "morning", "evening"]
        }
      },
      required: ["summary", "detail"]
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
              estimatedPrice: { type: Type.NUMBER },
              description: { type: Type.STRING }
            },
            required: ["name", "calories", "protein", "description", "estimatedPrice"]
          }
        }
      },
      required: ["totalCalories", "totalProtein", "meals", "totalCost"]
    }
  },
  required: ["workout", "nutrition", "date", "schedule"]
};

export const generateDailyPlan = async (user: UserInput, history: WorkoutHistoryItem[]): Promise<DailyPlan> => {
  console.log("Checking API Key...", API_KEY ? "Present" : "Missing");

  if (!API_KEY) {
    alert("Không tìm thấy biến môi trường 'API_KEY'! Đang sử dụng lịch mẫu.");
    await new Promise(resolve => setTimeout(resolve, 800));
    return getFallbackPlan(user.selectedIntensity);
  }

  try {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const todayStr = getCurrentDate();
    
    // Condensed history to save tokens
    const recentHistory = history.slice(0, 7);
    const historyText = recentHistory.length > 0 
      ? recentHistory.map(h => `- ${h.date}: ${h.levelSelected}.`).join('\n')
      : "Chưa có lịch sử.";

    const ingredients = user.availableIngredients?.length ? user.availableIngredients.join(', ') : "Trống";

    const prompt = `
      Bạn là David Goggins.
      NHIỆM VỤ: Lịch tập hôm nay: ${todayStr}.
      
      === 1. LỊCH TẬP 7 NGÀY (STRICT) ===
      Dựa vào thứ hôm nay, chọn đúng:
      - T2: Push (Ngực, Vai, Tay sau).
      - T3: Back & Biceps.
      - T4: Legs & Abs.
      - T5: Rest (Đi bộ).
      - T6: Chest & Back.
      - T7: Shoulder & Arms.
      - CN: Rest (Đi bộ).

      === 2. DAILY MANDATORY (BẮT BUỘC) ===
      - MỖI NGÀY đều phải có: 1 bài ABS + 1 bài CARDIO.
      - NGÀY NGHỈ (T5, CN): Bài chính là "Đi bộ" (60p) + 1 bài Abs nhẹ.

      === 3. QUY TẮC DỤNG CỤ ===
      - Đồ có: ${user.equipment.join(', ')}.
      - QUAN TRỌNG: Chỉ có 1 TẠ ĐƠN (Single DB) trừ khi ghi "2x"/"đôi". Dùng bài 1 tay (Unilateral).

      === 4. THỜI GIAN ===
      - Tránh giờ học: 12:00 - 14:00.
      - Đề xuất giờ tập & giờ ngủ (22:30).

      === 5. DINH DƯỠNG (BULKING) ===
      - PROTEIN: CAO (2-2.2g/kg -> ~${(user.weight * 2.1).toFixed(0)}g).
      - CALO: Surplus.
      - TINH BỘT:
        + BỮA SÁNG: KHÔNG ĂN CƠM. Thay bằng Khoai lang/Yến mạch/Bánh mì.
        + CÁC BỮA KHÁC: Cơm trắng ăn thoải mái.
      - RAU: Ưu tiên tủ lạnh (${ingredients}).
      - ĐỊNH LƯỢNG: Phải ghi rõ gram/bát (Kể cả ngày nghỉ). VD: "400g Cơm + 200g Gà".
      - FORMAT TÊN BỮA: Ghi rõ giờ (VD: "Bữa Sáng (07:00)").
      - Budget < 80k.

      === USER ===
      - ${user.weight}kg, ${user.height}cm.
      - Mệt: ${user.fatigue}. Đau: ${user.soreMuscles.join(', ')}.
      - Style: Goggins, Tiếng Việt, gắt.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', 
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.7,
      }
    });

    if (response.text) {
      const result = JSON.parse(response.text) as DailyPlan;
      result.date = todayStr; 
      return result;
    }
    
    throw new Error("Empty response");

  } catch (error) {
    console.error("Gemini Error:", error);
    alert("Lỗi AI. Dùng lịch mẫu.");
    return getFallbackPlan(user.selectedIntensity);
  }
};
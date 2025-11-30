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
    description: "Duy trì cơ bắp, độ khó tiêu chuẩn. Chia 2 buổi.",
    morning: [
      { name: "Push-up (Blue - Chest)", sets: 3, reps: "12", colorCode: "Blue", equipment: "Board", notes: "Đừng làm thằng hèn, ngực chạm sàn đi!" },
      { name: "One Arm Dumbbell Squat", sets: 4, reps: "12/leg", equipment: "Tạ 10kg (1 tay)", notes: "Chúng nó không biết tao là ai đâu con trai!" }
    ],
    evening: [
       { name: "Band Pull Apart", sets: 3, reps: "15", equipment: "Dây kháng lực 15kg", notes: "Chai sạn tâm trí đi!" },
       { name: "Plank", sets: 3, reps: "45s", equipment: "None", notes: "STAY HARD! Cứng rắn lên!" }
    ]
  },
  [Intensity.Hard]: {
    levelName: "Cháy hết mình (Hard)",
    description: "Tăng cơ tối đa, cường độ cao. Chia 2 buổi.",
    morning: [
      { name: "Decline Push-up (Red - Shoulder)", sets: 4, reps: "Max", colorCode: "Red", equipment: "Board + Chân cao", notes: "Ai sẽ vác những chiếc thuyền này?" },
      { name: "Single Arm Walking Lunges", sets: 3, reps: "12/leg", equipment: "Tạ 10kg", notes: "Chiếm lấy linh hồn của chúng!" }
    ],
    evening: [
      { name: "One Arm Bicep Curls", sets: 4, reps: "20/arm", isBFR: true, equipment: "Tạ 4kg + BFR Band", notes: "Không đau đớn thì không có thành quả, STAY HARD!" },
      { name: "Diamond Push-up (Green)", sets: 3, reps: "Failure", colorCode: "Green", equipment: "Board", notes: "Rõ rồi. Chiến thôi!" }
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
    summary: "Kế hoạch dự phòng (Offline). Vui lòng kiểm tra biến môi trường 'API_KEY' hoặc kết nối mạng.",
    detail: FALLBACK_PLANS_BY_INTENSITY[intensity]
  },
  nutrition: {
    totalCalories: 1700,
    totalProtein: 110,
    totalCost: 75000,
    advice: "Thực đơn sinh viên tiết kiệm, sử dụng nguyên liệu cơ bản.",
    meals: [
      { name: "Sáng", calories: 350, protein: 15, description: "2 Trứng luộc + 1 bát cơm nguội rang ít dầu.", estimatedPrice: 10000 },
      { name: "Trưa", calories: 700, protein: 50, description: "Ức gà công nghiệp (200g) luộc/áp chảo + Đậu phụ sốt cà chua + Cơm.", estimatedPrice: 35000 },
      { name: "Tối", calories: 600, protein: 40, description: "Cá Basa kho tộ + Rau muống luộc + Cơm.", estimatedPrice: 30000 }
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
        totalCost: { type: Type.NUMBER, description: "Total cost in VND" },
        advice: { type: Type.STRING },
        meals: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              calories: { type: Type.NUMBER },
              protein: { type: Type.NUMBER },
              estimatedPrice: { type: Type.NUMBER, description: "Estimated price in VND based on Winmart" },
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
    console.warn("API Key missing. Returning fallback plan.");
    alert("Không tìm thấy biến môi trường 'API_KEY'! Đang sử dụng lịch mẫu.");
    await new Promise(resolve => setTimeout(resolve, 800)); // Slight fake delay
    return getFallbackPlan(user.selectedIntensity);
  }

  try {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const todayStr = getCurrentDate();
    
    const recentHistory = history.slice(0, 7);
    const historyText = recentHistory.length > 0 
      ? recentHistory.map(h => {
          const exercisesDone = h.completedExercises?.join(', ') || "Không có dữ liệu bài tập";
          return `- ${h.date}: ${h.levelSelected}. Bài đã tập: [${exercisesDone}]. Ăn uống: ${h.nutrition ? h.nutrition.totalCalories + 'kcal' : "N/A"}`;
        }).join('\n')
      : "Chưa có lịch sử tập trong tuần này.";

    const prompt = `
      Bạn là David Goggins (Motivational Speaker/Navy SEAL).
      
      NHIỆM VỤ: Thiết kế lịch tập dựa trên LỊCH CỐ ĐỊNH 7 NGÀY.
      
      LỊCH TẬP CỐ ĐỊNH (Strict Split):
      - Thứ 2 (Day 1): Push (Ngực, Vai, Tay sau).
      - Thứ 3 (Day 2): Pull (Lưng, Tay trước).
      - Thứ 4 (Day 3): Legs & Abs (Đùi trước, Đùi sau, Bắp chân, Mông, Bụng).
      - Thứ 5 (Day 4): Rest (Nghỉ ngơi hoàn toàn).
      - Thứ 6 (Day 5): Chest & Back (Ngực, Lưng - Upper Body 1).
      - Thứ 7 (Day 6): Shoulders & Arms (Vai, Tay trước, Tay sau - Upper Body 2).
      - Chủ Nhật (Day 7): Rest (Active Recovery).

      QUY TẮC NGÀY NGHỈ (REST):
      - Nếu là Rest Day: Bài tập là "Đi bộ" (Walking). Chủ nhật PHẢI là "Đi bộ 60 phút" (Reps: "60 phút").
      - Không thêm bài nặng vào ngày Rest.

      QUY TẮC DỤNG CỤ QUAN TRỌNG (ONE DUMBBELL LOGIC):
      - Dụng cụ người dùng: ${user.equipment.join(', ')}.
      - Nếu người dùng KHÔNG ghi rõ "2x", "đôi", hoặc "pair" trong danh sách tạ, HÃY MẶC ĐỊNH HỌ CHỈ CÓ 1 QUẢ TẠ (SINGLE DUMBBELL).
      - Vì vậy, ƯU TIÊN TUYỆT ĐỐI các bài tập 1 TAY (Unilateral Exercises). 
        Ví dụ: Thay vì "Dumbbell Press", hãy dùng "One Arm Dumbbell Press" hoặc "Floor Press (1 Arm)". Thay vì "Squat", dùng "Goblet Squat (1 tạ)" hoặc "Lunges".
      - Chỉ dùng bài 2 tay nếu là Bodyweight hoặc dùng dây (Band).

      QUY TẮC THỜI GIAN (TIME OPTIMIZATION):
      - Người dùng BẬN HỌC lúc 12:00 - 14:00.
      - Hãy đề xuất giờ tập (suggestedWorkoutTime) và giờ ngủ (suggestedSleepTime).
      - Giờ tập nên vào sáng sớm hoặc chiều tối (trừ khung giờ học).
      - Giờ ngủ nên đảm bảo phục hồi (thường là 22:30 - 23:00).

      THÔNG TIN KHÁC:
      - Cân nặng: ${user.weight}kg, Chiều cao: ${user.height}cm.
      - Hôm nay: ${todayStr}.
      - Mức độ: ${user.selectedIntensity}.
      - Style Goggins: Notes cực gắt, tiếng Việt, thúc đẩy tinh thần.

      DINH DƯỠNG:
      - Nguyên liệu: ${user.availableIngredients.length > 0 ? user.availableIngredients.join(', ') : "Không có"}.
      - Đã ăn: ${user.consumedFood.length > 0 ? user.consumedFood.join(', ') : "Chưa ăn"}.
      - Target: Body Recomposition.
      - Budget: <80k VND/ngày.

      Trả về JSON theo schema.
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
    
    throw new Error("Empty response from AI");

  } catch (error) {
    console.error("Gemini API Error Detail:", error);
    alert(`Lỗi kết nối AI: ${(error as any).message || "Unknown error"}. Đang hiển thị lịch mẫu.`);
    return getFallbackPlan(user.selectedIntensity);
  }
};
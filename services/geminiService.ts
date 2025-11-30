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
    totalCalories: 2600,
    totalProtein: 155,
    totalCost: 95000,
    advice: "Chế độ BULKING: Ăn dư thừa Calories và nạp >2g Protein/kg để tối đa hóa tăng cơ.",
    meals: [
      { name: "Bữa Sáng (07:00)", calories: 600, protein: 35, description: "Cơm trắng + 3 Trứng ốp la + Súp lơ luộc.", estimatedPrice: 20000 },
      { name: "Bữa Trưa (12:00)", calories: 950, protein: 60, description: "3 bát cơm + 200g Ức gà xào Súp lơ.", estimatedPrice: 45000 },
      { name: "Bữa Tối (18:30)", calories: 950, protein: 60, description: "3 bát cơm + 200g Thịt bò xào Súp lơ.", estimatedPrice: 30000 },
      { name: "Bữa Phụ (21:00)", calories: 100, protein: 0, description: "1 hộp sữa chua hoặc trái cây.", estimatedPrice: 5000 }
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
              name: { type: Type.STRING, description: "Name of the meal including time, e.g., 'Bữa Sáng (07:00)'" },
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
          return `- ${h.date}: ${h.levelSelected}. Bài đã tập: [${exercisesDone}].`;
        }).join('\n')
      : "Chưa có lịch sử tập trong tuần này.";

    const prompt = `
      Bạn là David Goggins (Motivational Speaker/Navy SEAL).
      
      NHIỆM VỤ: Thiết kế lịch tập cá nhân hóa cho ngày hôm nay: ${todayStr}.
      
      === 1. LỊCH TẬP CỐ ĐỊNH 7 NGÀY (STRICT SPLIT) ===
      Dựa vào thứ ngày hôm nay (${todayStr}), hãy chọn bài tập theo đúng lịch sau:
      
      - Thứ 2 (Day 1): Push (Ngực, Vai, Tay sau).
      - Thứ 3 (Day 2): Back & Biceps (Lưng, Tay trước).
      - Thứ 4 (Day 3): Legs & Abs (Đùi trước, Đùi sau, Bắp chân, Mông, Bụng).
      - Thứ 5 (Day 4): Rest (Nghỉ ngơi - Đi bộ).
      - Thứ 6 (Day 5): Chest & Back (Ngực, Lưng).
      - Thứ 7 (Day 6): Shoulders & Arms (Vai, Tay trước, Tay sau).
      - Chủ Nhật (Day 7): Rest (Active Recovery - Đi bộ).

      QUY TẮC NGÀY NGHỈ (REST DAYS - Day 4 & Day 7):
      - Nếu hôm nay là ngày nghỉ, bài tập DUY NHẤT là "Đi bộ" (Walking).
      - Reps phải ghi rõ: "60 phút".
      - Không thêm bài tạ vào ngày này.

      === 2. QUY TẮC DỤNG CỤ (ONE DUMBBELL RULE) ===
      - Dụng cụ hiện có: ${user.equipment.join(', ')}.
      - QUAN TRỌNG: Trừ khi tên dụng cụ có chữ "2x", "đôi", hoặc "pair", HÃY MẶC ĐỊNH NGƯỜI DÙNG CHỈ CÓ 1 QUẢ TẠ (SINGLE DUMBBELL).
      - ƯU TIÊN TUYỆT ĐỐI các bài tập 1 TAY (Unilateral):
        + Thay vì "Dumbbell Press" (cần 2 tạ) -> Dùng "One Arm Floor Press" hoặc "One Arm Dumbbell Press".
        + Thay vì "Squat" (khó cân bằng) -> Dùng "Goblet Squat (1 tạ)" hoặc "Single Arm Lunges".
        + Chỉ dùng bài 2 tay nếu là Bodyweight (Hít đất, Plank) hoặc dùng Dây kháng lực (Band).

      === 3. TỐI ƯU THỜI GIAN (SCHEDULE) ===
      - Người dùng BẬN HỌC lúc: 12:00 - 14:00 (Tránh giờ này).
      - Đề xuất giờ tập (suggestedWorkoutTime): Sáng sớm hoặc Chiều tối.
      - Đề xuất giờ ngủ (suggestedSleepTime): Để đảm bảo phục hồi (vd: 22:30).

      === 4. DINH DƯỠNG: TĂNG CÂN & TĂNG CƠ (BULKING) ===
      - MỤC TIÊU: Thiết kế thực đơn để TĂNG CÂN và TĂNG CƠ tối đa (Hypertrophy).
      - PROTEIN: Bắt buộc tính toán ở mức CAO: 2.0g - 2.2g Protein / kg trọng lượng cơ thể.
        (Ví dụ: User ${user.weight}kg -> Target khoảng ${(user.weight * 2.1).toFixed(0)}g Protein).
      - CALORIES: Phải đảm bảo Surplus (Dư thừa năng lượng).
      - Tinh bột: Cơm trắng (White Rice) - Ăn nhiều để nạp năng lượng.
      - Rau: Súp lơ (Cauliflower) là bắt buộc trong các bữa chính.
      - QUAN TRỌNG: Trong tên bữa ăn (field "name"), BẮT BUỘC ghi rõ GIỜ ĂN cụ thể.
        (Ví dụ: "Bữa Sáng (07:00)", "Bữa Trưa (11:30)", "Bữa Tối (19:00)").
      - Nguyên liệu có sẵn: ${user.availableIngredients.length > 0 ? user.availableIngredients.join(', ') : "Không có"}.
      - Budget: <80k VND/ngày. Hãy tối ưu chi phí nhưng vẫn đủ đạm (Ưu tiên Ức gà, Trứng, Đậu phụ nếu cần rẻ).

      === THÔNG TIN USER ===
      - Cân nặng: ${user.weight}kg, Chiều cao: ${user.height}cm.
      - Mức độ mệt mỏi: ${user.fatigue}.
      - Nhóm cơ đau: ${user.soreMuscles.join(', ')}.
      - Cường độ: ${user.selectedIntensity}.
      - Style Goggins: Notes cực gắt, tiếng Việt, thúc đẩy tinh thần "Who's gonna carry the boats?".

      Trả về JSON hợp lệ theo schema.
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
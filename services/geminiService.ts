
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
  [Intensity.Easy]: {
    levelName: "Nghỉ ngơi & Đi bộ (Rest & Walk)",
    description: "Cơ thể bạn cần nghỉ ngơi. Chỉ đi bộ nhẹ nhàng để thư giãn, không tập nặng, không Yoga phức tạp.",
    exercises: [
      { name: "Đi bộ nhẹ nhàng (Walking)", sets: 1, reps: "15-20 min", notes: "Đi dạo hít thở không khí, thả lỏng cơ thể." },
      { name: "Nghỉ ngơi hoàn toàn", sets: 1, reps: "N/A", notes: "Ngủ đủ giấc, uống nhiều nước." }
    ]
  },
  [Intensity.Medium]: {
    levelName: "Vừa sức (Normal)",
    description: "Duy trì cơ bắp, độ khó tiêu chuẩn.",
    exercises: [
      { name: "Push-up (Blue - Chest)", sets: 3, reps: "12", colorCode: "Blue", equipment: "Board" },
      { name: "Dumbbell Goblet Squat", sets: 4, reps: "12", equipment: "Tạ 10kg" },
      { name: "Band Pull Apart", sets: 3, reps: "15", equipment: "Dây kháng lực 15kg" }
    ]
  },
  [Intensity.Hard]: {
    levelName: "Cháy hết mình (Hard)",
    description: "Tăng cơ tối đa, cường độ cao.",
    exercises: [
      { name: "Decline Push-up (Red - Shoulder)", sets: 4, reps: "Max", colorCode: "Red", equipment: "Board + Chân cao" },
      { name: "BFR Bicep Curls", sets: 4, reps: "20", isBFR: true, equipment: "Tạ 4kg + BFR Band", notes: "Nghỉ 30s, tập chậm cảm nhận cơ" },
      { name: "Goblet Lunges", sets: 3, reps: "12/leg", equipment: "Tạ 10kg" }
    ]
  }
};

const getFallbackPlan = (intensity: Intensity): DailyPlan => ({
  date: getCurrentDate(),
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

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    date: { type: Type.STRING },
    workout: {
      type: Type.OBJECT,
      properties: {
        summary: { type: Type.STRING },
        detail: {
          type: Type.OBJECT,
          properties: {
            levelName: { type: Type.STRING },
            description: { type: Type.STRING },
            exercises: {
              type: Type.ARRAY,
              items: {
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
                required: ["name", "sets", "reps"]
              }
            }
          },
          required: ["levelName", "description", "exercises"]
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
  required: ["workout", "nutrition", "date"]
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

    // Logic detection for recovery
    const isRecoveryNeeded = user.fatigue === FatigueLevel.Tired || user.soreMuscles.filter(m => m !== MuscleGroup.None).length >= 2;
    const effectiveIntensity = isRecoveryNeeded ? Intensity.Easy : user.selectedIntensity;

    const intensityPrompt = {
      [Intensity.Easy]: "Tạo kế hoạch PHỤC HỒI (RECOVERY). Chỉ cho phép: 1. Đi bộ nhẹ (Walking) hoặc 2. Nghỉ ngơi hoàn toàn. TUYỆT ĐỐI KHÔNG YOGA, không Cardio nặng. Mục tiêu là để cơ bắp nghỉ ngơi.",
      [Intensity.Medium]: "Tạo bài tập Vừa sức (Hypertrophy). Tập trung vào kích thích cơ bắp chuẩn, số reps vừa phải.",
      [Intensity.Hard]: "Tạo bài tập Thử thách (Overload). Cường độ cao, sử dụng dropset hoặc tập đến ngưỡng thất bại nếu an toàn."
    };

    const nutritionPrompt = isRecoveryNeeded
      ? "Người dùng đang MỆT/ĐAU CƠ. Ưu tiên thực phẩm dễ tiêu, hồi phục."
      : "Sáng tạo các món ăn ngon, healthy trong tầm giá.";

    const prompt = `
      Bạn là PT Online và Chuyên gia dinh dưỡng tiết kiệm cho sinh viên. Hãy thiết kế **DUY NHẤT 1 LỊCH TẬP** cho mức độ: **"${effectiveIntensity.toUpperCase()}"**.
      
      MỤC TIÊU: Body Recomposition (Tăng cơ giảm mỡ).
      THÔNG TIN KHÁCH HÀNG: 61kg, 1m60.
      TRẠNG THÁI HÔM NAY: ${todayStr}. Mệt mỏi: "${user.fatigue}", Đau cơ: "${user.soreMuscles.join(', ')}".
      
      ${isRecoveryNeeded ? "**CẢNH BÁO: KHÁCH HÀNG ĐANG MỆT HOẶC ĐAU NHIỀU. CHUYỂN SANG CHẾ ĐỘ NGHỈ NGƠI/ĐI BỘ.**" : ""}

      LỊCH SỬ GẦN ĐÂY:
      ${historyText}

      YÊU CẦU BÀI TẬP (${intensityPrompt[effectiveIntensity]}):
      1. TRÁNH TUYỆT ĐỐI nhóm cơ đang đau: ${user.soreMuscles.join(', ')}.
      2. Dụng cụ có sẵn: Board chống đẩy (Red=Vai, Blue=Ngực, Yellow=Lưng, Green=Tay sau), BFR Bands, Tạ đơn (4,8,10kg), Dây kháng lực 15kg.
      
      YÊU CẦU DINH DƯỠNG SIÊU TIẾT KIỆM (SINH VIÊN):
      - **TỔNG CHI PHÍ 1 NGÀY: < 80.000 VNĐ (Bắt buộc)**. Tính giá dựa trên giá thị trường Winmart/Chợ dân sinh Việt Nam.
      - NGUYÊN LIỆU CHO PHÉP (Chỉ dùng những thứ này): Cơm, Trứng gà/vịt, Đậu phụ (Đậu hũ), Thịt Bò (ít), Gà (ưu tiên ức gà công nghiệp cho rẻ), Thịt Lợn (nạc), Cá Basa.
      - Calo ~1650, Protein ~110g.
      - ${nutritionPrompt}
      - Ưu tiên chế biến bằng NỒI CHIÊN KHÔNG DẦU (Air Fryer) cho tiện.
      - Hãy tính toán ước lượng giá tiền ("estimatedPrice") cho từng bữa và tổng cộng ("totalCost").

      Trả về JSON duy nhất cho mức độ đã chọn.
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

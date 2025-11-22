import { GoogleGenAI, Type, Schema } from "@google/genai";
import { UserInput, DailyPlan, WorkoutHistoryItem } from "../types";

// Note: Using the environment key or user provided key logic.
const API_KEY = process.env.API_KEY || '';

// Helper to get current formatted date
const getCurrentDate = () => {
  const now = new Date();
  const days = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  return `${days[now.getDay()]}, ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
};

const FALLBACK_PLAN: DailyPlan = {
  date: getCurrentDate(),
  workout: {
    summary: "Kế hoạch dự phòng (Offline). Chọn mức độ phù hợp với sức khỏe của bạn.",
    levels: {
      easy: {
        levelName: "Nhẹ nhàng (Light)",
        description: "Phục hồi, cardio nhẹ, tập kỹ thuật.",
        exercises: [
          { name: "Plank", sets: 3, reps: "30s", notes: "Giữ thẳng lưng" },
          { name: "Push-up (Knees)", sets: 3, reps: "10", notes: "Chống đẩy bằng đầu gối" },
          { name: "Squat bodyweight", sets: 3, reps: "15", notes: "Không tạ" }
        ]
      },
      medium: {
        levelName: "Vừa sức (Normal)",
        description: "Duy trì cơ bắp, độ khó tiêu chuẩn.",
        exercises: [
          { name: "Push-up (Blue - Chest)", sets: 3, reps: "12", colorCode: "Blue", equipment: "Board" },
          { name: "Dumbbell Goblet Squat", sets: 4, reps: "12", equipment: "Tạ 10kg" },
          { name: "Band Pull Apart", sets: 3, reps: "15", equipment: "Dây kháng lực 15kg" }
        ]
      },
      hard: {
        levelName: "Cháy hết mình (Hard)",
        description: "Tăng cơ tối đa, cường độ cao.",
        exercises: [
          { name: "Decline Push-up (Red - Shoulder)", sets: 4, reps: "Max", colorCode: "Red", equipment: "Board + Chân cao" },
          { name: "BFR Bicep Curls", sets: 4, reps: "20", isBFR: true, equipment: "Tạ 4kg + BFR Band", notes: "Nghỉ 30s, tập chậm cảm nhận cơ" },
          { name: "Goblet Lunges", sets: 3, reps: "12/leg", equipment: "Tạ 10kg" }
        ]
      }
    }
  },
  nutrition: {
    totalCalories: 1700,
    totalProtein: 115,
    advice: "Chế độ ăn tự nhiên, không thực phẩm bổ sung.",
    meals: [
      { name: "Sáng", calories: 400, protein: 25, description: "2 Trứng luộc + 1 củ Khoai lang nhỏ" },
      { name: "Trưa", calories: 600, protein: 45, description: "300g Ức gà luộc/áp chảo + 1 bát Cơm + Rau xanh" },
      { name: "Tối", calories: 500, protein: 35, description: "200g Cá hấp + Đậu phụ sốt + Ít cơm" }
    ]
  }
};

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    date: { type: Type.STRING },
    workout: {
      type: Type.OBJECT,
      properties: {
        summary: { type: Type.STRING },
        levels: {
          type: Type.OBJECT,
          properties: {
            easy: {
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
            },
            medium: {
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
            },
            hard: {
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
          required: ["easy", "medium", "hard"]
        }
      },
      required: ["summary", "levels"]
    },
    nutrition: {
      type: Type.OBJECT,
      properties: {
        totalCalories: { type: Type.NUMBER },
        totalProtein: { type: Type.NUMBER },
        advice: { type: Type.STRING },
        meals: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              calories: { type: Type.NUMBER },
              protein: { type: Type.NUMBER },
              description: { type: Type.STRING }
            },
            required: ["name", "calories", "protein", "description"]
          }
        }
      },
      required: ["totalCalories", "totalProtein", "meals"]
    }
  },
  required: ["workout", "nutrition", "date"]
};

export const generateDailyPlan = async (user: UserInput, history: WorkoutHistoryItem[]): Promise<DailyPlan> => {
  if (!API_KEY) {
    console.warn("API Key missing, returning fallback plan.");
    await new Promise(resolve => setTimeout(resolve, 1500));
    return FALLBACK_PLAN;
  }

  try {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const todayStr = getCurrentDate();
    
    // Get last 7 items from history for context
    const recentHistory = history.slice(0, 7);
    
    const historyText = recentHistory.length > 0 
      ? recentHistory.map(h => {
          const exercisesDone = h.completedExercises?.join(', ') || "Không có dữ liệu bài tập";
          const notes = h.userNotes ? `(Note: ${h.userNotes})` : "";
          return `- ${h.date}: Level ${h.levelSelected}. Bài đã tập: [${exercisesDone}] ${notes}`;
        }).join('\n')
      : "Chưa có lịch sử tập trong tuần này.";

    const prompt = `
      Bạn là PT Online chuyên nghiệp. Hãy thiết kế lịch tập và thực đơn 1 ngày cho nam, 61kg, 1m60, đang trong hành trình "Grow Up" (Body Recomposition - Tăng cơ giảm mỡ).
      
      THÔNG TIN:
      - Hôm nay: ${todayStr}
      - Body: Mệt "${user.fatigue}", Đau cơ: "${user.soreMuscles.join(', ')}".
      
      LỊCH SỬ TẬP (7 NGÀY GẦN NHẤT):
      ${historyText}
      
      QUY TẮC TẠO LỊCH:
      1. PHÂN TÍCH KỸ lịch sử trên. Nếu hôm qua hoặc hôm kia đã tập nặng một nhóm cơ (Ví dụ: Ngực/Vai), HÔM NAY PHẢI TRÁNH nhóm đó hoặc chỉ tập nhẹ để phục hồi.
      2. Nếu lịch sử trống, hãy bắt đầu bằng Full Body cơ bản.
      
      YÊU CẦU 3 LEVEL:
      1. Easy (Nhẹ): Active recovery hoặc Cardio nhẹ.
      2. Medium (Vừa): Kích thích cơ chuẩn.
      3. Hard (Thử thách): Overload.
      
      DỤNG CỤ CÓ SẴN (Sử dụng triệt để):
      - Board chống đẩy: Red=Vai (Shoulder), Blue=Ngực (Chest), Yellow=Lưng (Back), Green=Tay sau (Triceps).
      - BFR Bands: Hỗ trợ pump/hypertrophy cho tay/chân (kết hợp tạ nhẹ).
      - Tạ đơn (Dumbbells): 4kg, 8kg, 10kg (Có thể là tạ lẻ, ưu tiên bài Goblet hoặc Unilateral).
      - Dây kháng lực: 15kg.

      YÊU CẦU DINH DƯỠNG:
      - Calo ~1600-1750, Protein ~100-110g.
      - NGUYÊN LIỆU GIỚI HẠN: Ức gà, Cá, Trứng, Đậu/Đậu phụ, Sữa, Cơm, Khoai lang.
      - KHÔNG kê thực phẩm chức năng.

      QUAN TRỌNG: TUYỆT ĐỐI KHÔNG nhắc đến từ "skinny-fat" trong bất kỳ nội dung nào của kết quả trả về. Hãy dùng các từ ngữ tích cực như "Grow Up", "Tăng cường", "Săn chắc".

      Trả về JSON đúng định dạng Schema.
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
      // Ensure date matches UI
      result.date = todayStr; 
      return result;
    }
    
    throw new Error("Empty response from AI");

  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      ...FALLBACK_PLAN,
      date: getCurrentDate() // Always return current date even in fallback
    };
  }
};
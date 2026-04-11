/**
 * Rank Configuration
 * Mỗi Rank gồm 10 levels
 * Rank 1: Level 0-10
 * Rank 2: Level 11-20
 * v.v...
 */

export interface RankInfo {
  rankNumber: number;
  rankName: string;
  description: string;
  startLevel: number;
  endLevel: number;
  startXP: number;
  endXP: number;
}

export const RANK_CONFIG: RankInfo[] = [
  {
    rankNumber: 1,
    rankName: "Đồng",
    description: "Bước đầu trên con đường rèn luyện - Rank Đồng",
    startLevel: 0,
    endLevel: 10,
    startXP: 0,
    endXP: 11000,
  },
  {
    rankNumber: 2,
    rankName: "Sắt",
    description: "Kinh nghiệm cơ bản - Rank Sắt",
    startLevel: 11,
    endLevel: 20,
    startXP: 11000,
    endXP: 26000,
  },
  {
    rankNumber: 3,
    rankName: "Vàng",
    description: "Sự cố gắng bắt đầu cho thấy kết quả - Rank Vàng",
    startLevel: 21,
    endLevel: 30,
    startXP: 26000,
    endXP: 45000,
  },
  {
    rankNumber: 4,
    rankName: "Lưu Ly",
    description: "Bạn là một nhà vô địch thực sự - Rank Lưu Ly",
    startLevel: 31,
    endLevel: 40,
    startXP: 45000,
    endXP: 68000,
  },
  {
    rankNumber: 5,
    rankName: "Lục Bảo",
    description: "Bạn đang ở mức cao nhất - Rank Lục Bảo",
    startLevel: 41,
    endLevel: 50,
    startXP: 68000,
    endXP: 95000,
  },
  {
    rankNumber: 6,
    rankName: "Kim Cương",
    description: "Bạn là một huyền thoại sống - Rank Kim Cương",
    startLevel: 51,
    endLevel: 60,
    startXP: 95000,
    endXP: 126000,
  },
  {
    rankNumber: 7,
    rankName: "Thạch Anh Tím",
    description: "Bạn vượt qua tất cả những giới hạn - Rank Thạch Anh Tím",
    startLevel: 61,
    endLevel: 70,
    startXP: 126000,
    endXP: 161000,
  },
];

// XP Requirements cho mỗi level
export const XP_PER_LEVEL = 1100; // Base XP cho mỗi level

// Rewards khi lên cấp
export const LEVEL_UP_REWARDS: Record<number, string[]> = {
  0: ["Chào mừng bạn!"],
  5: ["🎉 Badge: Rank Đồng", "💪 Unlock milestone"],
  10: ["⭐ Hoàn thành Rank Đồng", "🎁 Bonus reward"],
  11: ["🚀 Vào Rank Sắt"],
  20: ["⭐ Hoàn thành Rank Sắt"],
  21: ["🚀 Vào Rank Vàng"],
  30: ["⭐ Hoàn thành Rank Vàng"],
  31: ["🚀 Vào Rank Lưu Ly"],
  40: ["⭐ Hoàn thành Rank Lưu Ly"],
  41: ["🚀 Vào Rank Lục Bảo"],
  50: ["⭐ Hoàn thành Rank Lục Bảo"],
  51: ["🚀 Vào Rank Kim Cương"],
  60: ["⭐ Hoàn thành Rank Kim Cương"],
  61: ["🚀 Vào Rank Thạch Anh Tím - CẤP ĐỘ TỐI ĐA!"],
  70: ["👑 Bạn là một HUYỀN THOẠI - Rank Thạch Anh Tím!"],
};

// XP Reward Config
export const XP_REWARDS = {
  BASE_WORKOUT: 100, // XP cơ bản cho mỗi buổi tập
  PER_EXERCISE: 20, // XP cho mỗi bài tập hoàn thành
  CONSISTENCY_BONUS: 50, // Bonus khi giữ streak
  DIFFICULTY_BONUS: {
    low: 0,
    medium: 30,
    hard: 60,
  },
  NUTRITION_BONUS: 30, // XP cho hoàn thành nutrition
};

/**
 * Hàm lấy thông tin rank từ level
 */
export function getRankFromLevel(level: number): RankInfo {
  const rank = RANK_CONFIG.find((r) => level >= r.startLevel && level <= r.endLevel);
  return rank || RANK_CONFIG[RANK_CONFIG.length - 1];
}

/**
 * Hàm tính XP cần thiết để lên level tiếp theo
 */
export function getXPForNextLevel(currentLevel: number): number {
  return (currentLevel + 1) * XP_PER_LEVEL;
}

/**
 * Hàm lấy ảnh rank từ level
 */
export function getRankImage(level: number): string {
  return `/ranks/lv${level}.png`;
}

/**
 * Hàm tính XP cần thiết để hoàn thành Rank hiện tại
 */
export function getXPToCompleteRank(level: number): number {
  const rank = getRankFromLevel(level);
  return rank.endXP - rank.startXP;
}

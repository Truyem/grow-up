/**
 * Rank Configuration
 * Mỗi Rank gồm 10 levels (tổng 20 ranks cho 200 levels)
 * Rank 1: Level 1-10 (Bronze)
 * Rank 2: Level 11-20 (Copper)
 * ...
 * Rank 20: Level 191-200 (Garnet)
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

export const COLOR_PALETTE: Array<{ name: string; hex: string }> = [
  { name: 'Bronze', hex: '#8D5A3C' },
  { name: 'Copper', hex: '#B87333' },
  { name: 'Amber', hex: '#FFBF00' },
  { name: 'Gold', hex: '#FFD700' },
  { name: 'Citrine', hex: '#E4D00A' },
  { name: 'Peridot', hex: '#B2D732' },
  { name: 'Jade', hex: '#00A86B' },
  { name: 'Emerald', hex: '#50C878' },
  { name: 'Turquoise', hex: '#40E0D0' },
  { name: 'Cyan', hex: '#00FFFF' },
  { name: 'Azure', hex: '#007FFF' },
  { name: 'Sapphire', hex: '#0F52BA' },
  { name: 'Cobalt', hex: '#0047AB' },
  { name: 'Amethyst', hex: '#9966CC' },
  { name: 'Mystic', hex: '#7209B7' },
  { name: 'Violet', hex: '#8F00FF' },
  { name: 'Magenta', hex: '#FF00FF' },
  { name: 'Fuchsia', hex: '#FF007F' },
  { name: 'Ruby', hex: '#E0115F' },
  { name: 'Garnet', hex: '#9B111E' }
];

export const MAX_LEVEL = 200;

// Derived rank info based on color blocks (10 levels per block)
export function deriveRankInfo(level: number): RankInfo {
  const leveled = Math.max(1, Math.min(MAX_LEVEL, level));
  const blockIndex = Math.floor((leveled - 1) / 10);
  const paletteIndex = blockIndex % COLOR_PALETTE.length;
  const color = COLOR_PALETTE[paletteIndex];
  const startLevel = blockIndex * 10 + 1;
  const endLevel = startLevel + 9;
  const startXP = (startLevel - 1) * XP_PER_LEVEL;
  const endXP = endLevel * XP_PER_LEVEL;
  return {
    rankNumber: blockIndex + 1,
    rankName: color.name,
    description: `Rank ${color.name}`,
    startLevel,
    endLevel,
    startXP,
    endXP,
  };
}

export const RANK_CONFIG: RankInfo[] = [
  { rankNumber: 1, rankName: "Bronze", description: "Bước đầu trên con đường rèn luyện", startLevel: 1, endLevel: 10, startXP: 0, endXP: 11000 },
  { rankNumber: 2, rankName: "Copper", description: "Tích lũy kinh nghiệm", startLevel: 11, endLevel: 20, startXP: 11000, endXP: 24000 },
  { rankNumber: 3, rankName: "Amber", description: "Bắt đầu thấy thành quả", startLevel: 21, endLevel: 30, startXP: 24000, endXP: 39000 },
  { rankNumber: 4, rankName: "Gold", description: "Nỗ lực được đền đáp", startLevel: 31, endLevel: 40, startXP: 39000, endXP: 56000 },
  { rankNumber: 5, rankName: "Citrine", description: "Kiên trì tạo nên sự khác biệt", startLevel: 41, endLevel: 50, startXP: 56000, endXP: 75000 },
  { rankNumber: 6, rankName: "Peridot", description: "Sự tiến bộ rõ rệt", startLevel: 51, endLevel: 60, startXP: 75000, endXP: 96000 },
  { rankNumber: 7, rankName: "Jade", description: "Kỷ luật tựSteel rèn luyện", startLevel: 61, endLevel: 70, startXP: 96000, endXP: 119000 },
  { rankNumber: 8, rankName: "Emerald", description: "Tự tin trên con đường đã chọn", startLevel: 71, endLevel: 80, startXP: 119000, endXP: 144000 },
  { rankNumber: 9, rankName: "Turquoise", description: "Thách thức giới hạn của bản thân", startLevel: 81, endLevel: 90, startXP: 144000, endXP: 171000 },
  { rankNumber: 10, rankName: "Cyan", description: "Không ngừng vươn lên", startLevel: 91, endLevel: 100, startXP: 171000, endXP: 200000 },
  { rankNumber: 11, rankName: "Azure", description: "Đam mê cháy bỏng", startLevel: 101, endLevel: 110, startXP: 200000, endXP: 231000 },
  { rankNumber: 12, rankName: "Sapphire", description: "Chiến binh thực sự", startLevel: 111, endLevel: 120, startXP: 231000, endXP: 264000 },
  { rankNumber: 13, rankName: "Cobalt", description: "Sức mạnh từ nội tâm", startLevel: 121, endLevel: 130, startXP: 264000, endXP: 299000 },
  { rankNumber: 14, rankName: "Amethyst", description: "Vượt qua mọi thử thách", startLevel: 131, endLevel: 140, startXP: 299000, endXP: 336000 },
  { rankNumber: 15, rankName: "Mystic", description: "Huyền thoại đang hình thành", startLevel: 141, endLevel: 150, startXP: 336000, endXP: 375000 },
  { rankNumber: 16, rankName: "Violet", description: " Ánh sáng dẫn đường", startLevel: 151, endLevel: 160, startXP: 375000, endXP: 416000 },
  { rankNumber: 17, rankName: "Magenta", description: "Biến ước mơ thành hiện thực", startLevel: 161, endLevel: 170, startXP: 416000, endXP: 459000 },
  { rankNumber: 18, rankName: "Fuchsia", description: "Đỉnh cao đang trong tầm tay", startLevel: 171, endLevel: 180, startXP: 459000, endXP: 504000 },
  { rankNumber: 19, rankName: "Ruby", description: "Huyền thoại trong làng fitness", startLevel: 181, endLevel: 190, startXP: 504000, endXP: 551000 },
  { rankNumber: 20, rankName: "Garnet", description: "VINX QUANG NHẤT - Đỉnh cao vinh quang!", startLevel: 191, endLevel: 200, startXP: 551000, endXP: 600000 },
];

// XP Requirements cho mỗi level
export const XP_PER_LEVEL = 1100; // Base XP cho mỗi level

export const LEVEL_UP_REWARDS: Record<number, string[]> = {
  1: ["🎉 Chào mừng bạn bắt đầu hành trình!"],
  10: ["⭐ Hoàn thành Rank Bronze", "🎁 Bonus reward"],
  11: ["🚀 Vào Rank Copper"],
  20: ["⭐ Hoàn thành Rank Copper", "🎁 Bonus reward"],
  21: ["🚀 Vào Rank Amber"],
  30: ["⭐ Hoàn thành Rank Amber", "🎁 Bonus reward"],
  31: ["🚀 Vào Rank Gold"],
  40: ["⭐ Hoàn thành Rank Gold", "🎁 Bonus reward"],
  41: ["🚀 Vào Rank Citrine"],
  50: ["⭐ Hoàn thành Rank Citrine", "🎁 Bonus reward"],
  51: ["🚀 Vào Rank Peridot"],
  60: ["⭐ Hoàn thành Rank Peridot", "🎁 Bonus reward"],
  61: ["🚀 Vào Rank Jade"],
  70: ["⭐ Hoàn thành Rank Jade", "🎁 Bonus reward"],
  71: ["🚀 Vào Rank Emerald"],
  80: ["⭐ Hoàn thành Rank Emerald", "🎁 Bonus reward"],
  81: ["🚀 Vào Rank Turquoise"],
  90: ["⭐ Hoàn thành Rank Turquoise", "🎁 Bonus reward"],
  91: ["🚀 Vào Rank Cyan"],
  100: ["⭐ Hoàn thành Rank Cyan", "🎁 Bonus reward"],
  101: ["🚀 Vào Rank Azure"],
  110: ["⭐ Hoàn thành Rank Azure", "🎁 Bonus reward"],
  111: ["🚀 Vào Rank Sapphire"],
  120: ["⭐ Hoàn thành Rank Sapphire", "🎁 Bonus reward"],
  121: ["🚀 Vào Rank Cobalt"],
  130: ["⭐ Hoàn thành Rank Cobalt", "🎁 Bonus reward"],
  131: ["🚀 Vào Rank Amethyst"],
  140: ["⭐ Hoàn thành Rank Amethyst", "🎁 Bonus reward"],
  141: ["🚀 Vào Rank Mystic"],
  150: ["⭐ Hoàn thành Rank Mystic", "🎁 Bonus reward"],
  151: ["🚀 Vào Rank Violet"],
  160: ["⭐ Hoàn thành Rank Violet", "🎁 Bonus reward"],
  161: ["🚀 Vào Rank Magenta"],
  170: ["⭐ Hoàn thành Rank Magenta", "🎁 Bonus reward"],
  171: ["🚀 Vào Rank Fuchsia"],
  180: ["⭐ Hoàn thành Rank Fuchsia", "🎁 Bonus reward"],
  181: ["🚀 Vào Rank Ruby"],
  190: ["⭐ Hoàn thành Rank Ruby", "🎁 Bonus reward"],
  191: ["🚀 Vào Rank Garnet - CẤP ĐỘ TỐI ĐA!"],
  200: ["👑 VINX QUANG NHẤT - Đỉnh cao vinh quang!"],
};

// XP Reward Config
export const XP_REWARDS = {
  BASE_WORKOUT: 150, // XP cơ bản cho mỗi buổi tập
  PER_EXERCISE: 50, // XP cho mỗi bài tập hoàn thành
  CONSISTENCY_BONUS: 100, // Bonus khi giữ streak
  DIFFICULTY_BONUS: {
    low: 0,
    medium: 50,
    hard: 100,
  },
  NUTRITION_BONUS: 50, // XP cho hoàn thành nutrition (mỗi bữa ăn)
};

/**
 * Hàm lấy thông tin rank từ level
 */
export function getRankFromLevel(level: number): RankInfo {
  const lvl = Math.max(1, level);
  return deriveRankInfo(lvl);
}

// 20-tier support: derive color tier for level blocks
export function generate20TierRankList(): RankInfo[] {
  const list: RankInfo[] = [];
  for (let block = 0; block < 20; block++) {
    list.push(deriveRankInfo(block * 10 + 1));
  }
return list;
}

// Helper: compute text color (black/white) for a hex
export function getTextColorForHex(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum > 0.6 ? '#000' : '#fff';
}

// Expose palette-based color for a given level
export function getTierColorForLevel(level: number): { hex: string; text: string } {
  const leveled = Math.max(1, Math.min(MAX_LEVEL, level));
  const block = Math.floor((leveled - 1) / 10);
  const color = COLOR_PALETTE[block % COLOR_PALETTE.length];
  return { hex: color.hex, text: getTextColorForHex(color.hex) };
}

/**
 * Hàm tính XP cần thiết để lên level tiếp theo
 */
export function getXPForNextLevel(currentLevel: number): number {
  const lvl = Math.max(1, currentLevel);
  return Math.min(5000, 1000 + Math.floor((lvl - 1) * 50));
}

export function getRankImage(level: number): string {
  const safeLevel = Math.max(1, Math.min(MAX_LEVEL, level));
  return `/ranks/lv${safeLevel}.webp`;
}

export function getTierImage(level: number): string {
  const rank = getRankFromLevel(level);
  return `/tier/${rank.rankName.toUpperCase()}.webp`;
}

export function getNextRankImage(level: number): string {
  const safeNext = level + 1;
  if (safeNext > MAX_LEVEL) return getRankImage(MAX_LEVEL);
  return `/ranks/lv${safeNext}.webp`;
}

/**
 * Hàm tính XP cần thiết để hoàn thành Rank hiện tại
 */
export function getXPToCompleteRank(level: number): number {
  const rank = getRankFromLevel(level);
  return rank.endXP - rank.startXP;
}

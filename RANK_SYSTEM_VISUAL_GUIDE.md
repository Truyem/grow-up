🏆 HỆ THỐNG RANK & LEVEL HOÀN CHỈNH
====================================

📈 RANK PROGRESSION:

┌─────────────────────────────────────────────────────────────┐
│                    RANK THẠCH ANH TÍM (Purple)              │
│                       Levels 61-70                          │
│                  👑 Max Level Achievement 👑                │
│                   "Bạn vượt qua tất cả"                     │
└─────────────────────────────────────────────────────────────┘
                            ⬆️
                    +12,600 XP to reach
                            ⬆️
┌─────────────────────────────────────────────────────────────┐
│                   RANK KIM CƯƠNG (Diamond)                  │
│                       Levels 51-60                          │
│                    Huyền thoại sống                          │
│                "Bạn là một huyền thoại sống"                │
└─────────────────────────────────────────────────────────────┘
                            ⬆️
                    +12,600 XP to reach
                            ⬆️
┌─────────────────────────────────────────────────────────────┐
│                   RANK LỤC BẢO (Emerald)                    │
│                       Levels 41-50                          │
│                  "Bạn đang ở mức cao nhất"                  │
└─────────────────────────────────────────────────────────────┘
                            ⬆️
                    +11,000 XP to reach
                            ⬆️
┌─────────────────────────────────────────────────────────────┐
│                 RANK LƯU LY (Lapis Lazuli)                  │
│                       Levels 31-40                          │
│              "Bạn là một nhà vô địch thực sự"               │
└─────────────────────────────────────────────────────────────┘
                            ⬆️
                    +11,000 XP to reach
                            ⬆️
┌─────────────────────────────────────────────────────────────┐
│                    RANK VÀNG (Gold)                         │
│                       Levels 21-30                          │
│           "Sự cố gắng bắt đầu cho thấy kết quả"            │
└─────────────────────────────────────────────────────────────┘
                            ⬆️
                    +11,000 XP to reach
                            ⬆️
┌─────────────────────────────────────────────────────────────┐
│                    RANK SẮT (Iron)                          │
│                       Levels 11-20                          │
│                  "Kinh nghiệm cơ bản"                       │
└─────────────────────────────────────────────────────────────┘
                            ⬆️
                    +11,000 XP to reach
                            ⬆️
┌─────────────────────────────────────────────────────────────┐
│                   RANK ĐỒNG (Bronze)                        │
│                       Levels 0-10                           │
│              "Bước đầu trên con đường"                      │
│                    🌟 Starting Rank 🌟                      │
└─────────────────────────────────────────────────────────────┘


🎯 XP THRESHOLDS:

Rank Đồng     → 0 - 11,000 XP       (11,000 XP)
Rank Sắt      → 11,000 - 26,000 XP   (15,000 XP)
Rank Vàng     → 26,000 - 45,000 XP   (19,000 XP)
Rank Lưu Ly   → 45,000 - 68,000 XP   (23,000 XP)
Rank Lục Bảo  → 68,000 - 95,000 XP   (27,000 XP)
Rank Kim Cương→ 95,000 - 126,000 XP  (31,000 XP)
Rank Thạch Anh→ 126,000 - 161,000 XP (35,000 XP)


💰 HOW TO EARN XP:

Each Workout:
┌──────────────────────┐
│ Base XP:        +100 │
│ Per Exercise:   +20  │  (5 exercises = +100)
│ Difficulty:           │
│  • Low:          +0  │
│  • Medium:      +30  │
│  • Hard:        +60  │
│ Consistency:    +50  │  (if streak maintained)
│ Nutrition:      +30  │  (if nutrition logged)
├──────────────────────┤
│ TOTAL:         +340 │  (with all bonuses)
└──────────────────────┘

Example XP Gains:
• Simple workout (1 ex, medium) = 150 XP
• Regular workout (5 ex, medium) = 230 XP
• Hard workout (5 ex, hard, nutrition) = 310 XP
• Epic workout (5 ex, hard, nutrition, streak) = 360 XP


📱 UI DISPLAY LOCATIONS:

1. Header Bar (XPStatusBar)
   Shows: Current Level + Progress + XP/NextXP + Rank

2. Main Page (XPDisplay)
   Shows: Full rank card + XP progress + Stats + All rewards

3. Level Up Modal (LevelUpPopup)
   Shows: Animation + New Level + XP Gained + Special Rewards

4. Dashboard (GamificationDashboard)
   Shows: All ranks, achievements, progress tracking


✨ SPECIAL REWARDS:

Level 5:  🎉 Badge: Rank Đồng
Level 10: ⭐ Hoàn thành Rank Đồng + 🎁 Bonus reward
Level 20: ⭐ Hoàn thành Rank Sắt
Level 30: ⭐ Hoàn thành Rank Vàng
Level 40: ⭐ Hoàn thành Rank Lưu Ly
Level 50: ⭐ Hoàn thành Rank Lục Bảo
Level 60: ⭐ Hoàn thành Rank Kim Cương
Level 70: 👑 HUYỀN THOẠI - Rank Thạch Anh Tím!


🔧 CUSTOMIZATION:

Để thay đổi XP requirements:
File: constants/rankConfig.ts
```typescript
export const XP_PER_LEVEL = 1100; // ← Change this
```

Để thay đổi rank names:
File: constants/rankConfig.ts
```typescript
export const RANK_CONFIG: RankInfo[] = [
  {
    rankNumber: 1,
    rankName: "Đồng",  // ← Change this
    // ...
  }
];
```

Để thay đổi rewards:
File: constants/rankConfig.ts
```typescript
export const LEVEL_UP_REWARDS: Record<number, string[]> = {
  10: ["Your reward text here"],  // ← Change this
};
```

STATUS: ✅ PRODUCTION READY

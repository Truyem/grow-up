# 🎮 Gamification System - XP & Level Integration

## 📖 Tổng Quan

Hệ thống gamification hoàn chỉnh cho ứng dụng tập luyện, bao gồm:
- **7 Ranks** (Rank 1-7), mỗi rank gồm **10 Levels** (0-70)
- **Dynamic XP System** dựa trên workout details
- **Level Up Animations** & **Popups**
- **Gamification Dashboard** hiển thị progress
- **Supabase Integration** để lưu trữ dữ liệu

---

## 📁 Cấu Trúc Files

### Mới Tạo:
```
constants/
  └── rankConfig.ts                    # Config ranks, levels, rewards
  
hooks/
  └── useLevelSystem.ts               # Hook quản lý level system
  
services/
  └── levelService.ts                 # Supabase integration
  
components/ui/
  ├── XPDisplay.tsx                   # XP display đầy đủ
  ├── XPStatusBar.tsx                 # XP status bar nhỏ (header)
  ├── LevelUpPopup.tsx                # Level up animation & popup
  └── GamificationDashboard.tsx       # Dashboard đầy đủ
  
components/styles/
  ├── XPDisplay.css
  ├── XPStatusBar.css
  ├── LevelUpPopup.css
  └── GamificationDashboard.css
  
migrations/
  └── create_user_levels_table.sql    # SQL untuk tạo table
```

### Đã Cập Nhật:
- `types.ts` - Thêm UserLevel, XPReward, LevelUp interfaces
- `hooks/index.ts` - Export useLevelSystem

---

## 🚀 Quick Start

### 1️⃣ Setup Database
```bash
# Mở Supabase Dashboard
# Vào SQL Editor
# Copy-paste nội dung từ: migrations/create_user_levels_table.sql
# Click RUN
```

### 2️⃣ Import Components Vào App.tsx
```typescript
import { useLevelSystem } from './hooks/useLevelSystem';
import { LevelUpPopup } from './components/ui/LevelUpPopup';
import { XPStatusBar } from './components/ui/XPStatusBar';
```

### 3️⃣ Add XP Khi Hoàn Thành Workout
```typescript
// Trong completeWorkout handler
const xpReward = calculateXPReward(
  exerciseCount,      // số bài tập
  intensity,          // 'low' | 'medium' | 'hard'
  hasNutrition,       // hoàn thành nutrition?
  streak              // consistency streak
);
```

---

## 📊 XP Rewards

| Action | Base XP | Bonus |
|--------|---------|-------|
| Hoàn thành workout | 100 | - |
| Mỗi bài tập | - | 20 |
| Intensity (Hard) | - | 60 |
| Consistency Streak | - | 50 |
| Nutrition Complete | - | 30 |

**Ví dụ**: 5 exercises + hard + nutrition + 3 streak = 100+100+60+50+30 = **340 XP**

---

## 🏆 Rank System

| Rank | Name | Levels | Description |
|------|------|--------|-------------|
| 1 | Đồng | 0-10 | Bước đầu trên con đường rèn luyện |
| 2 | Sắt | 11-20 | Kinh nghiệm cơ bản |
| 3 | Vàng | 21-30 | Sự cố gắng bắt đầu cho thấy kết quả |
| 4 | Lưu Ly | 31-40 | Bạn là một nhà vô địch thực sự |
| 5 | Lục Bảo | 41-50 | Bạn đang ở mức cao nhất |
| 6 | Kim Cương | 51-60 | Bạn là một huyền thoại sống |
| 7 | Thạch Anh Tím | 61-70 | Bạn vượt qua tất cả những giới hạn |

---

## 🎨 UI Components

### 1. XPStatusBar (Header)
```typescript
<XPStatusBar 
  userLevel={userLevel}
  onClick={() => setShowGamification(true)}
/>
```
**Hiển thị**: Level, progress bar, XP, Rank

### 2. XPDisplay (Full Details)
```typescript
<XPDisplay
  userLevel={userLevel}
  xpProgress={progress}
  xpToNextLevel={xpNeeded}
/>
```
**Hiển thị**: Rank card, XP bar, stats

### 3. LevelUpPopup (Animation)
```typescript
<LevelUpPopup
  isVisible={isLevelingUp}
  newLevel={newLevel}
  xpGained={xp}
  rewards={rewards}
  onClose={handleClose}
/>
```
**Hiển thị**: Animation khi level up

### 4. GamificationDashboard (Full Page)
```typescript
<GamificationDashboard
  userLevel={userLevel}
  onClose={handleClose}
/>
```
**Hiển thị**: Ranks, achievements, rewards

---

## 💾 Data Structure

### UserLevel (Stored in Supabase)
```typescript
{
  userId: string;
  currentLevel: number;        // 0-70
  totalXP: number;             // XP in current level
  currentLevelXP: number;      // XP accumulated
  nextLevelXP: number;         // XP needed for next
  lifetimeXP: number;          // Total XP ever earned
  lastLevelUpDate?: string;
}
```

---

## 🔄 Integration Flow

```
1. User Completes Workout
   ↓
2. Calculate XP Reward
   ↓
3. Add XP to User Level
   ↓
4. Check if Level Up
   ↓
5. Show Level Up Popup (if yes)
   ↓
6. Save to Supabase
   ↓
7. Update UI
```

---

## ⚙️ Configuration

### Thay Đổi XP Rewards
File: `constants/rankConfig.ts`
```typescript
export const XP_REWARDS = {
  BASE_WORKOUT: 100,      // ← Thay đây
  PER_EXERCISE: 20,       // ← Thay đây
  CONSISTENCY_BONUS: 50,
  DIFFICULTY_BONUS: { /* ... */ },
  NUTRITION_BONUS: 30,
};
```

### Thay Đổi Ranks
File: `constants/rankConfig.ts`
```typescript
export const RANK_CONFIG: RankInfo[] = [
  {
    rankNumber: 1,
    rankName: "Người Mới Bắt Đầu", // ← Thay đây
    startLevel: 0,
    endLevel: 10,
    // ... etc
  }
];
```

### Thay Đổi Rewards Khi Lên Cấp
File: `constants/rankConfig.ts`
```typescript
export const LEVEL_UP_REWARDS: Record<number, string[]> = {
  10: ["⭐ Hoàn thành Rank 1", "🎁 Unlock something"],
  // ← Thêm rewards tại level cụ thể
};
```

---

## 🧪 Testing

### Test 1: Add XP
```typescript
// Trigger completeWorkout
// Check: totalXP tăng
// Check: LevelUpPopup không hiển thị (nếu XP < nextLevelXP)
```

### Test 2: Level Up
```typescript
// Trigger completeWorkout nhiều lần
// Check: khi XP >= nextLevelXP
// Check: currentLevel tăng
// Check: LevelUpPopup hiển thị
// Check: Supabase data updated
```

### Test 3: Rank Transition
```typescript
// Level up từ lv10 → lv11
// Check: Rank 1 → Rank 2
// Check: Rewards hiển thị
```

---

## 📚 Files Reference

| File | Mục Đích |
|------|----------|
| `rankConfig.ts` | Config ranks, levels, XP |
| `useLevelSystem.ts` | Hook quản lý level logic |
| `levelService.ts` | Supabase CRUD operations |
| `XPDisplay.tsx` | Component hiển thị XP |
| `XPStatusBar.tsx` | Component hiển thị status |
| `LevelUpPopup.tsx` | Component animation |
| `GamificationDashboard.tsx` | Component dashboard |

---

## 🆘 Troubleshooting

**Q: Table user_levels không tồn tại?**
A: Chạy SQL migration từ `migrations/create_user_levels_table.sql`

**Q: Level không update?**
A: Kiểm tra:
1. userLevel đã load?
2. userId valid?
3. Supabase connection ok?
4. XP đủ để level up?

**Q: Popup không hiển thị?**
A: Kiểm tra:
1. `isLevelingUp` state?
2. `levelUpInfo` data?
3. CSS loaded?

---

## 📞 Support

Xem file `GAMIFICATION_INTEGRATION_GUIDE.md` để hướng dẫn chi tiết.
Xem file `GAMIFICATION_EXAMPLES.tsx` cho ví dụ code.

---

**Created**: 2026-04-11  
**Last Updated**: 2026-04-11  
**Status**: ✅ Ready for Integration

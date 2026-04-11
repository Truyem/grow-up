# Hướng Dẫn Tích Hợp Hệ Thống Gamification (XP & Level)

## 📋 Mục Lục
1. [Setup Cơ Sở Dữ Liệu](#setup-cơ-sở-dữ-liệu)
2. [Tích Hợp vào App.tsx](#tích-hợp-vào-apptsx)
3. [Tích Hợp XP vào completeWorkout](#tích-hợp-xp-vào-completeworkout)
4. [Hiển Thị Trên UI](#hiển-thị-trên-ui)
5. [Cấu Hình & Tùy Chỉnh](#cấu-hình--tùy-chỉnh)

---

## 🗄️ Setup Cơ Sở Dữ Liệu

### Step 1: Chạy SQL Migration

1. Vào Supabase Dashboard: https://app.supabase.com
2. Vào project của bạn
3. Mở **SQL Editor** 
4. Copy & Paste nội dung từ file `migrations/create_user_levels_table.sql`
5. Click **Run** để tạo table

Hoặc sử dụng Supabase CLI:
```bash
supabase db push
```

---

## 🔧 Tích Hợp vào App.tsx

### Step 1: Import cần thiết

Thêm vào top của `App.tsx`:

```typescript
import { useLevelSystem } from './hooks/useLevelSystem';
import { LevelUpPopup } from './components/ui/LevelUpPopup';
import { XPStatusBar } from './components/ui/XPStatusBar';
import { GamificationDashboard } from './components/ui/GamificationDashboard';
import { getUserLevel, initializeUserLevel } from './services/levelService';
```

### Step 2: Thêm state và hooks vào component

```typescript
export default function App() {
  // ... existing state

  // Thêm những dòng này
  const { 
    userLevel, 
    setUserLevelData, 
    initializeUserLevel: initLevelSystem,
    levelUpInfo, 
    isLevelingUp 
  } = useLevelSystem();
  
  const [showGamification, setShowGamification] = useState(false);

  // ... rest of component
}
```

### Step 3: Load UserLevel khi user đăng nhập

Tìm nơi load user data (thường là trong `useAuth` hook), thêm:

```typescript
// Sau khi user đăng nhập thành công
useEffect(() => {
  if (userId) {
    const loadLevel = async () => {
      const level = await getUserLevel(userId);
      if (level) {
        setUserLevelData(level);
      } else {
        // Khởi tạo level mới nếu không tồn tại
        const newLevel = await initializeUserLevel(userId);
        if (newLevel) {
          setUserLevelData(newLevel);
        }
      }
    };
    loadLevel();
  }
}, [userId]);
```

---

## 🎮 Tích Hợp XP vào completeWorkout

### Tìm hàm completeWorkout

Mở file `hooks/useWorkoutHistory.ts`, tìm hàm `handleCompleteWorkout` (khoảng line 127).

### Thêm XP logic

Thêm import:
```typescript
import { addXPToUser } from '../services/levelService';
import { useLevelSystem } from './useLevelSystem';
```

Trong hàm `handleCompleteWorkout`, sau khi save thành công:

```typescript
// Sau dòng: showToast(`Đã lưu buổi tập: ${completedExercises.length} bài tập hoàn thành!`);

// Thêm XP logic
if (userLevel && userId) {
  const xpReward = calculateXPReward(
    completedExercises.length,
    userData.selectedIntensity,
    !!nutrition,
    userStats.streak
  );

  const updatedLevel = await addXPToUser(userId, xpReward.totalXP, userLevel);
  if (updatedLevel) {
    setUserLevelData(updatedLevel);
    
    // Kiểm tra nếu level up
    if (updatedLevel.currentLevel > userLevel.currentLevel) {
      setLevelUpInfo({
        newLevel: updatedLevel.currentLevel,
        xpGained: xpReward.totalXP,
      });
    }
  }
}
```

---

## 📱 Hiển Thị Trên UI

### 1. Hiển Thị XP Status Bar (Header)

Thêm vào top navigation/header:

```typescript
<XPStatusBar 
  userLevel={userLevel}
  onClick={() => setShowGamification(true)}
/>
```

### 2. Hiển Thị Level Up Popup

Thêm vào App component:

```typescript
<LevelUpPopup
  isVisible={isLevelingUp}
  newLevel={levelUpInfo?.newLevel || 0}
  xpGained={levelUpInfo?.xpGained || 0}
  rewards={levelUpInfo?.rewards || []}
  onClose={() => setLevelUpInfo(null)}
/>
```

### 3. Hiển Thị Full Gamification Dashboard

Thêm modal hoặc page:

```typescript
{showGamification && (
  <GamificationDashboard
    userLevel={userLevel}
    onClose={() => setShowGamification(false)}
  />
)}
```

---

## ⚙️ Cấu Hình & Tùy Chỉnh

### 1. Thay Đổi XP Rewards

Mở `constants/rankConfig.ts`, chỉnh sửa:

```typescript
export const XP_REWARDS = {
  BASE_WORKOUT: 100,      // XP cơ bản mỗi buổi tập
  PER_EXERCISE: 20,       // XP mỗi bài tập
  CONSISTENCY_BONUS: 50,  // Bonus khi giữ streak
  DIFFICULTY_BONUS: {
    low: 0,
    medium: 30,
    hard: 60,
  },
  NUTRITION_BONUS: 30,
};
```

### 2. Thay Đổi Ranks

Mở `constants/rankConfig.ts`, chỉnh sửa `RANK_CONFIG` array.

### 3. Thêm Rewards Khi Lên Cấp

Mở `constants/rankConfig.ts`, chỉnh sửa `LEVEL_UP_REWARDS`:

```typescript
export const LEVEL_UP_REWARDS: Record<number, string[]> = {
  0: ["Chào mừng bạn!"],
  5: ["🎉 Badge: Người bắt đầu"],
  10: ["⭐ Hoàn thành Rank 1"],
  // ... thêm rewards khác
};
```

---

## 📊 Ví Dụ Tính Toán XP

Một buổi tập hoàn thành:
- **Base XP**: 100
- **Exercises**: 5 bài tập × 20 = 100 XP
- **Difficulty** (hard): 60 XP
- **Consistency** (3 streak): 50 XP
- **Nutrition**: 30 XP
- **Total**: 340 XP

---

## 🎨 Tùy Chỉnh Giao Diện

### CSS Classes Chính:
- `.xp-display-container` - Container XP Display chính
- `.level-up-popup` - Popup level up
- `.xp-status-bar` - Status bar nhỏ
- `.gamification-dashboard` - Dashboard đầy đủ

Tất cả CSS được lưu trong `components/styles/`:
- `XPDisplay.css`
- `LevelUpPopup.css`
- `XPStatusBar.css`
- `GamificationDashboard.css`

---

## ✅ Checklist Tích Hợp

- [ ] Chạy SQL Migration để tạo `user_levels` table
- [ ] Import `useLevelSystem` vào App.tsx
- [ ] Load UserLevel khi user đăng nhập
- [ ] Thêm XP logic vào `completeWorkout`
- [ ] Hiển Thị XPStatusBar trên header
- [ ] Hiển Thị LevelUpPopup
- [ ] Hiển Thị GamificationDashboard
- [ ] Test: Hoàn thành 1 buổi tập và kiểm tra XP tăng
- [ ] Test: Tích lũy XP cho đến khi level up
- [ ] Tùy chỉnh XP rewards theo yêu cầu

---

## 🐛 Troubleshooting

### Lỗi: "user_levels table not found"
- Đảm bảo chạy SQL migration

### Lỗi: "Cannot read property 'currentLevel'"
- Đảm bảo load UserLevel trước khi sử dụng

### LevelUp popup không hiển thị
- Kiểm tra `isLevelingUp` state
- Đảm bảo XP đủ để level up

---

## 📞 Hỗ Trợ

Nếu có vấn đề, kiểm tra:
1. Console browser (F12) để xem lỗi
2. Supabase Dashboard để kiểm tra table
3. Network tab để xem API calls


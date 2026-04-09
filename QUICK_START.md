# QUICK START GUIDE - GROW-UP WEEKLY PLANNING SYSTEM

## 🚀 What Was Built

A complete **weekly planning system** that reads 7 days of user data (training + nutrition) and generates intelligent daily workout plans with:
- ✅ Automatic training split detection (UL/PPL/PPL-S)
- ✅ Weight goal tracking with TDEE/macro calculations
- ✅ Muscle group conflict prevention
- ✅ AI-powered workout generation via Nemotron
- ✅ Food logging with automatic calorie/macro analysis

---

## 📋 Files Created/Modified

### **New Files**
```
services/
  ├── weightGoalService.ts      ← Weight tracking + BMR/TDEE/macro calculations
  ├── weeklyAnalysisService.ts   ← 7-day data analysis (workouts + nutrition)
  └── muscleGroupService.ts      ← Muscle conflict detection

API_DOCUMENTATION.md             ← Full API reference
```

### **Edge Functions Deployed** (Supabase)
```
✅ food-analysis              → Nemotron analyzes food (photo or text)
✅ update-weight              → Track weight + calculate trend
✅ weekly-analysis            → Analyze 7 days data for split decision
✅ generate-daily-plan        → Create 1 optimized daily plan
```

### **Database Migrations**
```sql
✅ Profiles: Added age, current_weight, target_weight, target_date, experience_level, preferred_split
✅ weight_logs: New table for weight tracking (tracks daily weight + trend)
✅ nutrition_logs: New table for meal logging (stores food items + calories + macros)
```

### **Modified Files**
```
services/geminiService.ts       ← Added 2 helper functions for prompts
services/periodizationService.ts ← Added PPL-S split support
```

---

## 🔧 How to Use

### **1. Track Weight**
```typescript
// POST /api/update-weight
const response = await fetch('https://your-project.supabase.co/functions/v1/update-weight', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${JWT_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    weight: 75.5,
    date: '2026-04-09',
    notes: 'Morning weight'
  })
});

const data = await response.json();
console.log(data.trend); // See weight direction
```

### **2. Log Food**
```typescript
// Two methods:

// Method A: Text input
await fetch('/api/food-analysis', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${JWT_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    method: 'text',
    data: 'Cơm trắng 200g, Cá hồi 150g, Rau xanh 100g'
  })
});

// Method B: Photo (future - Gemini integration)
const formData = new FormData();
formData.append('method', 'photo');
formData.append('data', base64_image);
```

### **3. Get Weekly Analysis**
```typescript
// GET /api/weekly-analysis
const analysis = await fetch(
  'https://your-project.supabase.co/functions/v1/weekly-analysis',
  {
    headers: { 'Authorization': `Bearer ${JWT_TOKEN}` }
  }
).then(r => r.json());

console.log(analysis.recommended_split);    // 'upper_lower' | 'ppl' | 'ppls'
console.log(analysis.sessions_this_week);   // 4
console.log(analysis.macro_targets);        // { protein: 166, carbs: 195, fats: 65 }
```

### **4. Generate Daily Plan**
```typescript
// POST /api/generate-daily-plan
const plan = await fetch(
  'https://your-project.supabase.co/functions/v1/generate-daily-plan',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${JWT_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ date: '2026-04-09' })
  }
).then(r => r.json());

console.log(plan.recommended_split);       // 'upper_lower'
console.log(plan.focus_muscles);           // ['Pull', 'Back', 'Biceps']
console.log(plan.key_recommendations);     // Array of 5 exercises with sets/reps
```

---

## 🧠 How The System Works

### **Flow Diagram**
```
User inputs weight → weight_logs saved
    ↓
Daily cron job calls /api/weekly-analysis
    ↓
System reads last 7 days:
  - workout_logs (number of sessions)
  - nutrition_logs (calories consumed)
  - weight_logs (weight trend)
    ↓
Determines training split:
  - 4 buổi → UL
  - 5 buổi → PPL
  - 6+ buổi → PPL-S
    ↓
Calculates targets:
  - BMR, TDEE, daily calories
  - Macro targets (protein, carbs, fats)
    ↓
User requests daily plan → /api/generate-daily-plan
    ↓
System checks yesterday's workout for muscle conflicts
    ↓
Nemotron generates 5 exercises with sets/reps
    ↓
Returns optimized daily plan
```

### **Muscle Conflict Detection**
```
For UL Split:
  - If yesterday was Upper → today must be Lower
  - If yesterday was Lower → today must be Upper
  
For PPL Split:
  - If yesterday was Push → today must be Pull
  - If yesterday was Pull → today must be Legs
  - If yesterday was Legs → today must be Push
  
→ Prevents overtraining same muscles
```

### **Goal-Based Adjustments**
```
Cutting (losing weight):
  - Lighter weights, more reps
  - Cardio emphasis
  - Protein = 2.2g/kg (preserve muscle)
  - Calorie deficit = -500 kcal/day

Bulking (gaining weight):
  - Heavy compound movements
  - Lower reps, higher weight
  - Protein = 2.0g/kg
  - Calorie surplus = +300 kcal/day
```

---

## 🧪 Testing

### **Test Update Weight**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/update-weight \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"weight": 75.5, "date": "2026-04-09"}'
```

### **Test Food Analysis**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/food-analysis \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "method": "text",
    "data": "Cơm trắng 200g, Cá hồi 150g"
  }'
```

### **Test Weekly Analysis**
```bash
curl -X GET https://your-project.supabase.co/functions/v1/weekly-analysis \
  -H "Authorization: Bearer YOUR_JWT"
```

### **Test Daily Plan Generation**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/generate-daily-plan \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"date": "2026-04-09"}'
```

---

## 🔑 Key Features

| Feature | Implementation | Status |
|---------|-----------------|--------|
| Weight tracking | `weight_logs` table | ✅ |
| Food logging | `nutrition_logs` table | ✅ |
| Calorie/macro calculation | Nemotron AI | ✅ |
| Training split detection | 4/5/6+ session logic | ✅ |
| Muscle conflict prevention | UL/PPL cycle detection | ✅ |
| Goal-based adjustments | Cutting/bulking strategies | ✅ |
| Daily plan generation | Nemotron + analysis | ✅ |
| Weight trend analysis | 7-day slope calculation | ✅ |

---

## 🚨 Important Notes

1. **All API calls require JWT authentication** - passed in Authorization header
2. **Nemotron provides the AI** - analyzes food, generates workouts, calculates macros
3. **7-day lookback window** - system always analyzes last 7 days for better context
4. **Muscle conflict detection works for UL/PPL splits** - prevents same muscle groups 2 days in a row
5. **Weight trend calculated automatically** - tracks direction (increasing/decreasing/stable)
6. **Nutrition logs saved automatically** - after food analysis completes

---

## 📞 Support

For full API documentation, see: `API_DOCUMENTATION.md`

For code reference:
- `services/weightGoalService.ts` - Weight calculations
- `services/weeklyAnalysisService.ts` - Data analysis
- `services/muscleGroupService.ts` - Muscle logic
- `services/geminiService.ts` - AI prompts (generateFoodCaloriesPrompt, generateDailyWorkoutPrompt)

---

## ✨ What Makes This Special

✅ **Smart Muscle Recovery** - Prevents overtraining same muscles based on training split
✅ **Goal-Aware Planning** - Adjusts intensity & volume based on cutting/bulking
✅ **AI-Powered Analysis** - Nemotron understands context and optimizes plans
✅ **Flexible Input** - Accepts both manual food entry and (future) photo recognition
✅ **Automatic Trend Detection** - Tracks weight direction without user input
✅ **One Daily Plan** - Simple, focused recommendation (not overwhelming)
✅ **Vietnamese Optimized** - All data & analysis in Vietnamese for better UX

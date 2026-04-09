# GROW-UP WEEKLY PLANNING API DOCUMENTATION

## 🎯 System Overview

**Purpose**: Automatically analyze 7-day user data (workouts + nutrition) and generate intelligent daily training plans based on:
- Training frequency → determine optimal split (UL/PPL/PPL-S)
- Weight goals → calculate TDEE, macros, calorie targets
- Muscle group conflicts → prevent overworking same muscles
- Nutrition data → adjust intensity based on calorie intake

---

## 📊 Database Schema

### Tables Created

#### 1. `profiles` (Extended)
```sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS 
  age INTEGER,
  current_weight NUMERIC(5,2),
  target_weight NUMERIC(5,2),
  target_date DATE,
  experience_level TEXT DEFAULT 'beginner',
  preferred_split TEXT;
```

#### 2. `weight_logs` (New)
```sql
CREATE TABLE public.weight_logs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  date DATE NOT NULL,
  weight NUMERIC(5,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);
```

#### 3. `nutrition_logs` (New)
```sql
CREATE TABLE public.nutrition_logs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  date DATE NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  food_items JSONB DEFAULT '[]',
  total_calories NUMERIC(7,2),
  macros JSONB,  -- {protein, carbs, fats}
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 🔌 Edge Functions API

### 1. POST `/api/food-analysis`

**Purpose**: Analyze food from 2 sources (photo recognition or manual text) and calculate calories/macros

**Request**:
```json
{
  "method": "photo" | "text",
  "data": "base64_image_or_food_description",
  "date": "2026-04-09"  // optional, defaults to today
}
```

**Response**:
```json
{
  "foods": [
    {
      "name": "Cơm trắng",
      "quantity": "200",
      "unit": "g"
    }
  ],
  "total_calories": 260,
  "macros": {
    "protein": 4,
    "carbs": 58,
    "fats": 0.3
  },
  "source": "photo_recognition" | "text_analysis",
  "timestamp": "2026-04-09T10:30:00Z"
}
```

**How it works**:
1. If `method = 'photo'`: Passes to Gemini for image recognition (future enhancement)
2. If `method = 'text'`: Sends food description to Nemotron for analysis
3. Nemotron calculates calories + macros using Vietnamese food database
4. Results saved to `nutrition_logs` table automatically

---

### 2. POST `/api/update-weight`

**Purpose**: Track user's daily weight and detect weight trends

**Request**:
```json
{
  "weight": 75.5,
  "date": "2026-04-09",  // optional
  "notes": "Morning measurement"  // optional
}
```

**Response**:
```json
{
  "success": true,
  "weight": 75.5,
  "date": "2026-04-09",
  "trend": {
    "direction": "decreasing",
    "change_kg": -0.8,
    "percent_change": -1.04,
    "days": 7
  },
  "message": "Weight updated: 75.5kg on 2026-04-09"
}
```

**Logic**:
- Saves to `weight_logs` table
- Updates `profiles.current_weight`
- Calculates 7-day trend automatically
- Returns weight direction (increasing/decreasing/stable)

---

### 3. GET `/api/weekly-analysis`

**Purpose**: Analyze all data from last 7 days to determine optimal training split

**Request**:
```
GET /api/weekly-analysis
Authorization: Bearer <JWT_TOKEN>
```

**Response**:
```json
{
  "userId": "user_uuid",
  "current_weight": 75.5,
  "target_weight": 70,
  "weight_difference": -5.5,
  "weight_trend": "decreasing",
  "sessions_this_week": 4,
  "recommended_split": "upper_lower",
  "muscles_worked_this_week": ["Chest", "Back", "Legs"],
  "tdee": 2450,
  "daily_calorie_target": 1950,
  "macro_targets": {
    "protein": 166,
    "carbs": 195,
    "fats": 65
  },
  "nutrition_data": {
    "avg_calories_per_day": 1880,
    "total_meals_logged": 15,
    "days_with_logs": 5
  },
  "analysis_summary": "User tập 4 buổi/tuần (upper_lower), cân nặng giảm, nạp 1880 kcal/ngày trung bình."
}
```

**Logic**:
- Reads last 7 days of `workout_logs`, `nutrition_logs`, `weight_logs`
- Counts workouts → determines training split:
  - **≤3 buổi** → Full Body
  - **4 buổi** → Upper/Lower (UL)
  - **5 buổi** → PPL (Push/Pull/Legs)
  - **≥6 buổi** → PPL-S (beginner) or PPL-S (advanced)
- Calculates BMR, TDEE, daily calorie target
- Computes macro targets based on goal (bulking/cutting)
- Analyzes weight trend from `weight_logs`

---

### 4. POST `/api/generate-daily-plan`

**Purpose**: Generate optimized 1-day workout plan based on weekly analysis

**Request**:
```json
{
  "date": "2026-04-09"  // optional, defaults to today
}
```

**Response**:
```json
{
  "success": true,
  "message": "Daily plan generated for 2026-04-09",
  "date": "2026-04-09",
  "recommended_split": "upper_lower",
  "sessions_planned": 4,
  "estimated_calories_to_burn": 1950,
  "focus_muscles": ["Pull", "Back", "Biceps"],
  "key_recommendations": [
    "1. Barbell Rows - 4x6-8 reps (Primary back exercise)",
    "2. Lat Pulldowns - 3x8-10 reps (Secondary back work)",
    "3. Face Pulls - 3x12-15 reps (Rear delts + upper back)",
    "4. Barbell Curls - 3x6-8 reps (Bicep strength)",
    "5. Incline DB Curls - 3x10-12 reps (Bicep hypertrophy)"
  ],
  "nemotron_prompt": "Full Nemotron response with detailed workout plan"
}
```

**Logic**:
1. Calls `/api/weekly-analysis` internally to get context
2. **Muscle Group Conflict Detection**:
   - Gets yesterday's workout data
   - Prevents training same muscle group 2 days in a row
   - For UL split: Alternates upper ↔ lower
   - For PPL split: Cycles push → pull → legs
3. **Nemotron Generation**:
   - Sends comprehensive prompt with:
     - User stats (weight, age, height)
     - Training split recommendation
     - Focus muscles for today
     - Weight goal (bulking/cutting) strategy
     - Calorie targets + macros
   - Nemotron returns 5 exercises with sets/reps
4. **Smart Adjustments**:
   - If cutting: Lighter weights, more reps, cardio emphasis
   - If bulking: Heavy compound movements, high volume
   - If low calories: Reduce workout intensity, prioritize recovery

---

## 🔄 Training Split Logic

### **4 Sessions/Week → Upper/Lower (UL)**
```
Monday:    Upper (Chest, Back, Shoulders, Arms)
Tuesday:   Lower (Quads, Hamstrings, Glutes, Calves)
Wednesday: Rest
Thursday:  Upper
Friday:    Lower
Sat-Sun:   Rest
```

### **5 Sessions/Week → PPL (Push/Pull/Legs)**
```
Monday:    Push (Chest, Shoulders, Triceps)
Tuesday:   Pull (Back, Biceps, Rear Delts)
Wednesday: Legs (Quads, Hamstrings, Glutes)
Thursday:  Push (Variation)
Friday:    Pull (Variation)
Sat-Sun:   Rest (or Light activity)
```

### **6+ Sessions/Week → PPL-S (Push/Pull/Legs/Shoulders)**
```
Monday:    Push
Tuesday:   Pull
Wednesday: Legs
Thursday:  Shoulders (Isolated)
Friday:    Push/Pull hybrid
Sat-Sun:   Active recovery or Legs
```

---

## 📐 Calorie & Macro Calculations

### **BMR (Basal Metabolic Rate)**
```
BMR = 10*weight(kg) + 6.25*height(cm) - 5*age(years) + 5 (male) / -161 (female)
```

### **TDEE (Total Daily Energy Expenditure)**
```
TDEE = BMR × Activity Factor

Activity Factors:
- 1 session/week = 1.375
- 3-5 sessions/week = 1.55
- 6-7 sessions/week = 1.725
- 2x/day training = 1.9
```

### **Daily Calorie Target**
```
Cutting: TDEE - 500 kcal (0.5 kg/week loss)
Bulking: TDEE + 300 kcal (0.3 kg/week gain)
```

### **Macros**
```
Protein (g):
  - Cutting = weight × 2.2
  - Bulking = weight × 2.0

Carbs (g) = (Remaining calories from protein) × 0.6 / 4

Fats (g) = (Remaining calories) × 0.4 / 9
```

---

## 🛠 Service Functions

### **weightGoalService.ts**
- `calculateBMR()` - Mifflin-St Jeor formula
- `calculateTDEE()` - Based on activity factor
- `calculateDailyCalorieTarget()` - Cutting/bulking adjustment
- `calculateMacros()` - Protein/carbs/fats split
- `getWeightTrend()` - 7-day direction analysis
- `analyzeWeightGoal()` - Comprehensive analysis

### **weeklyAnalysisService.ts**
- `getWeeklyWorkoutLogs()` - Last 7 days workouts
- `analyzeWeeklyWorkouts()` - Extract muscles, volume, intensity
- `getWeeklyNutritionLogs()` - Last 7 days meals
- `analyzeWeeklyNutrition()` - Total calories, macros, days logged
- `analyzeFullWeek()` - Combined workout + nutrition analysis

### **muscleGroupService.ts**
- `categorizeByMovement()` - Push/Pull/Legs/Shoulders
- `categorizeUpperLower()` - Upper/Lower split
- `getYesterdayMuscleGroups()` - What was trained yesterday
- `getMuscleCategory()` - Classify single muscle
- `checkMuscleGroupConflict()` - Detect PPL/UL conflicts
- `getRecommendedMuscles()` - Smart suggestion for today

### **geminiService.ts** (New helpers)
- `generateFoodCaloriesPrompt()` - Nemotron food analysis prompt
- `generateDailyWorkoutPrompt()` - Smart workout generation prompt

---

## 📱 Usage Flow

```
1. User updates weight
   POST /api/update-weight {weight: 75}
   ↓
2. System analyzes weekly data
   GET /api/weekly-analysis
   ↓
3. User logs food (2 ways)
   POST /api/food-analysis {method: 'text', data: 'cơm + cá'}
   or
   POST /api/food-analysis {method: 'photo', data: 'base64...'}
   ↓
4. System generates daily plan
   POST /api/generate-daily-plan {date: '2026-04-09'}
   ↓
5. AI recommends exercises (Nemotron)
   - Considers muscle conflicts
   - Adjusts intensity by calories
   - Matches training split
   - Returns optimized workout
```

---

## 🔐 Authentication

All Edge Functions require JWT authentication:
```
Authorization: Bearer <JWT_TOKEN>
```

Verify JWT is enabled on all functions for security.

---

## 🚀 Deployment Status

✅ **Migrations**: 3 tables created (profiles update, weight_logs, nutrition_logs)
✅ **Edge Functions**: 4 functions deployed & active
✅ **Service Functions**: 3 new services + 2 helpers in geminiService
✅ **Training Logic**: PPL-S support added to periodizationService

---

## 📝 Next Steps

1. **Frontend Integration**: Add UI for:
   - Weight tracking input
   - Food logging (photo + text)
   - Weekly analysis display
   - Daily plan recommendation

2. **Testing**: 
   - E2E test all 4 Edge Functions
   - Verify muscle conflict detection
   - Test calorie calculations

3. **Optional Enhancements**:
   - Gemini integration for actual photo recognition
   - Workout history charting
   - Progress visualization
   - Mobile app support

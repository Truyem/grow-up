import React, { useState, useEffect } from 'react';
import { FatigueLevel, MuscleGroup, UserInput, DailyPlan, WorkoutHistoryItem, Intensity, Meal } from './types';
import { UserForm } from './components/UserForm';
import { PlanDisplay } from './components/PlanDisplay';
import { HistoryView } from './components/HistoryView';
import { AnalysisView } from './components/AnalysisView';
import { generateDailyPlan } from './services/geminiService';
import { Sparkles, History } from 'lucide-react';

// Default equipment list
const DEFAULT_EQUIPMENT = [
  "Board chống đẩy",
  "BFR Bands",
  "Tạ đơn 4kg",
  "Tạ đơn 8kg",
  "Tạ đơn 10kg",
  "Dây kháng lực 15kg"
];

// Initial State
const INITIAL_USER_DATA: UserInput = {
  weight: 61,
  height: 160,
  fatigue: FatigueLevel.Normal,
  soreMuscles: [MuscleGroup.None],
  selectedIntensity: Intensity.Medium, // Default to Medium
  equipment: DEFAULT_EQUIPMENT,
};

type ViewMode = 'input' | 'plan' | 'history' | 'analysis';

// Helper to match the date format used in service
const getTodayString = () => {
  const now = new Date();
  const days = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  return `${days[now.getDay()]}, ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
};

export default function App() {
  const [userData, setUserData] = useState<UserInput>(INITIAL_USER_DATA);
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutHistoryItem[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('input');

  // Load local history, cached plan, and auto-complete logic
  useEffect(() => {
    // 1. Load History
    let currentHistory: WorkoutHistoryItem[] = [];
    const savedHistory = localStorage.getItem('gym_history');
    if (savedHistory) {
      try {
        currentHistory = JSON.parse(savedHistory);
        setWorkoutHistory(currentHistory);
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }

    // 2. Check for Cached Plan and Progress
    const cachedPlanStr = localStorage.getItem('daily_plan_cache');
    const savedProgressStr = localStorage.getItem('workout_progress');

    if (cachedPlanStr) {
      try {
        const cachedPlan = JSON.parse(cachedPlanStr) as DailyPlan;
        const todayStr = getTodayString();
        
        // AUTO-SAVE LOGIC: If the plan is from a DIFFERENT day
        if (cachedPlan.date !== todayStr) {
          console.log("Found stale plan from:", cachedPlan.date);
          
          let autoSaved = false;
          // Check if there was progress for this stale plan
          if (savedProgressStr) {
            const progress = JSON.parse(savedProgressStr);
            if (progress.planDate === cachedPlan.date && progress.checkedState) {
              
              // Count checked exercises
              const checkedKeys = Object.keys(progress.checkedState).filter(k => progress.checkedState[k]);
              
              if (checkedKeys.length > 0) {
                // Determine completed exercises strings
                const morningEx = cachedPlan.workout.detail.morning || [];
                const eveningEx = cachedPlan.workout.detail.evening || [];
                
                // Helper to map back from "mor-X" or "eve-X"
                const completedList: string[] = [];
                
                morningEx.forEach((ex, idx) => {
                   if (progress.checkedState[`mor-${idx}`]) completedList.push(ex.name);
                });
                
                eveningEx.forEach((ex, idx) => {
                   if (progress.checkedState[`eve-${idx}`]) completedList.push(ex.name);
                });
                
                // Construct summary
                const exSummary = completedList.join(', ');
                const finalNote = (progress.userNote || "") + " (Tự động lưu do qua ngày)";

                // Create History Item
                const newItem: WorkoutHistoryItem = {
                  date: cachedPlan.date, // Use the date of the PLAN, not today
                  timestamp: Date.now(), // timestamp of saving
                  levelSelected: cachedPlan.workout.detail.levelName,
                  summary: cachedPlan.workout.summary,
                  completedExercises: completedList,
                  userNotes: finalNote,
                  exercisesSummary: exSummary,
                  nutrition: cachedPlan.nutrition
                };

                // Add to history (prepend)
                const newHistory = [newItem, ...currentHistory];
                setWorkoutHistory(newHistory);
                localStorage.setItem('gym_history', JSON.stringify(newHistory));
                
                alert(`Hệ thống đã tự động lưu buổi tập ngày ${cachedPlan.date} vì bạn đã qua ngày mới.`);
                autoSaved = true;
              }
            }
          }

          // Clean up old cache whether we saved it or not
          localStorage.removeItem('daily_plan_cache');
          localStorage.removeItem('workout_progress');
          
          // Stay on input mode to create TODAY's plan
          setViewMode('input');

        } else {
          // If plan is for TODAY, load it normally
          setPlan(cachedPlan);
          setViewMode('plan');
          console.log("Loaded cached plan for today:", todayStr);
        }

      } catch (e) {
        console.error("Failed to load cached plan", e);
        localStorage.removeItem('daily_plan_cache');
        localStorage.removeItem('workout_progress');
      }
    }
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    // Pass workout history to the service
    const generatedPlan = await generateDailyPlan(userData, workoutHistory);
    
    setPlan(generatedPlan);
    setViewMode('plan');
    
    // Save to local storage cache
    localStorage.setItem('daily_plan_cache', JSON.stringify(generatedPlan));
    // Clear any old progress when generating a fresh plan
    localStorage.removeItem('workout_progress');
    
    setLoading(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReset = () => {
    // Direct reset without confirmation dialog to ensure button responsiveness
    setPlan(null);
    localStorage.removeItem('daily_plan_cache'); 
    localStorage.removeItem('workout_progress'); // Also clear progress on manual reset
    setViewMode('input');
  };

  const handleCompleteWorkout = async (
    levelSelected: string, 
    summary: string, 
    completedExercises: string[], 
    userNotes: string,
    nutrition: { totalCalories: number; totalProtein: number; totalCost: number; meals: Meal[] }
  ) => {
    const now = new Date();
    const todayDateStr = getTodayString(); // Use the standardized date string helper
    
    const exercisesSummary = completedExercises.length > 0 
      ? completedExercises.join(', ') 
      : "Không có bài tập";

    const newItem: WorkoutHistoryItem = {
      date: todayDateStr,
      timestamp: now.getTime(),
      levelSelected,
      summary,
      completedExercises,
      userNotes: userNotes || "",
      exercisesSummary,
      nutrition // Save nutrition to history
    };

    let updatedHistory: WorkoutHistoryItem[] = [];
    updatedHistory = [newItem, ...workoutHistory];

    setWorkoutHistory(updatedHistory);
    localStorage.setItem('gym_history', JSON.stringify(updatedHistory));
  };

  const handleDeleteHistoryItem = async (timestamp: number) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa lịch sử tập luyện của ngày này không?")) {
      const updatedHistory = workoutHistory.filter(item => item.timestamp !== timestamp);
      setWorkoutHistory(updatedHistory);
      localStorage.setItem('gym_history', JSON.stringify(updatedHistory));
    }
  };

  return (
    <div className="relative min-h-screen font-sans selection:bg-cyan-500/30 selection:text-cyan-100">
      
      {/* Background Image */}
      <div className="fixed inset-0 z-0">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ 
            backgroundImage: `url('https://images.pexels.com/photos/268533/pexels-photo-268533.jpeg?cs=srgb&dl=pexels-pixabay-268533.jpg&fm=jpg')` 
          }}
        />
        <div className="absolute inset-0 bg-black/80" />
      </div>

      {/* Content Layer */}
      <div className="relative z-10 container mx-auto px-4 py-10 max-w-5xl">
        
        {/* Header */}
        {viewMode === 'input' && (
          <div className="text-center mb-10 space-y-3 animate-fade-in relative">
            <div className="inline-flex items-center justify-center p-3 bg-white/5 rounded-full mb-2 border border-white/10 shadow-lg backdrop-blur-md">
              <Sparkles className="w-6 h-6 text-cyan-300 animate-pulse" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight drop-shadow-lg">
              Grow <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Up</span>
            </h1>
            <p className="text-lg text-gray-300 font-light max-w-lg mx-auto">
              Lịch trình tập luyện thông minh & Sáng tạo.
            </p>
          </div>
        )}

        {/* Main View Switch */}
        <div className="transition-all duration-500 ease-in-out">
          {viewMode === 'plan' && plan ? (
            <PlanDisplay 
              plan={plan} 
              onReset={handleReset} 
              onComplete={handleCompleteWorkout}
            />
          ) : viewMode === 'history' ? (
            <HistoryView 
              history={workoutHistory}
              onBack={() => setViewMode('input')}
              onDelete={handleDeleteHistoryItem}
              onAnalyze={() => setViewMode('analysis')}
            />
          ) : viewMode === 'analysis' ? (
            <AnalysisView 
              history={workoutHistory} 
              onBack={() => setViewMode('history')} 
            />
          ) : (
            <div className="max-w-2xl mx-auto space-y-4">
               <UserForm 
                 userData={userData} 
                 setUserData={setUserData} 
                 onSubmit={handleGenerate}
                 isLoading={loading}
               />
               
               <button 
                 onClick={() => setViewMode('history')}
                 className="w-full py-3 rounded-2xl font-semibold text-gray-400 bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-center justify-center gap-2 hover:scale-[1.01] hover:text-white hover:shadow-lg"
               >
                 <History className="w-5 h-5" />
                 Xem Lịch sử tập luyện
               </button>
            </div>
          )}
        </div>

        <div className="mt-20 text-center text-xs text-gray-600">
          <p>© 2025 Vũ Đình Trung. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
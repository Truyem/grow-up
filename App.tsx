
import React, { useState, useEffect } from 'react';
import { FatigueLevel, MuscleGroup, UserInput, DailyPlan, WorkoutHistoryItem } from './types';
import { UserForm } from './components/UserForm';
import { PlanDisplay } from './components/PlanDisplay';
import { HistoryView } from './components/HistoryView';
import { generateDailyPlan } from './services/geminiService';
import { Sparkles, History } from 'lucide-react';

// Initial State
const INITIAL_USER_DATA: UserInput = {
  weight: 61,
  height: 160,
  fatigue: FatigueLevel.Normal,
  soreMuscles: [MuscleGroup.None], // Default to No Soreness
};

type ViewMode = 'input' | 'plan' | 'history';

export default function App() {
  const [userData, setUserData] = useState<UserInput>(INITIAL_USER_DATA);
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutHistoryItem[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('input');

  // Load local history on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('gym_history');
    if (savedHistory) {
      try {
        setWorkoutHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    // Pass workout history to the service
    const generatedPlan = await generateDailyPlan(userData, workoutHistory);
    setPlan(generatedPlan);
    setViewMode('plan');
    setLoading(false);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReset = () => {
    setPlan(null);
    setViewMode('input');
  };

  // Called when user finishes a workout in PlanDisplay
  const handleCompleteWorkout = async (levelSelected: string, summary: string, completedExercises: string[], userNotes: string) => {
    const now = new Date();
    const todayDateStr = now.toLocaleDateString('vi-VN');
    
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
      exercisesSummary
    };

    // Logic: Update existing entry if today, else prepend
    let updatedHistory: WorkoutHistoryItem[] = [];
    const existingIndex = workoutHistory.findIndex(h => h.date === todayDateStr);

    if (existingIndex >= 0) {
      // Update existing
      updatedHistory = [...workoutHistory];
      updatedHistory[existingIndex] = newItem;
    } else {
      // Add new
      updatedHistory = [newItem, ...workoutHistory];
    }

    // Save to state and LocalStorage
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
              Lịch trình tập luyện thông minh.
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
            />
          ) : (
            <div className="max-w-2xl mx-auto space-y-4">
               <UserForm 
                 userData={userData} 
                 setUserData={setUserData} 
                 onSubmit={handleGenerate}
                 isLoading={loading}
               />
               
               {/* History Button */}
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

        {/* Footer */}
        <div className="mt-20 text-center text-xs text-gray-600">
          <p>© 2025 Vũ Đình Trung. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}

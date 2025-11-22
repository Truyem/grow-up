import React, { useState, useEffect } from 'react';
import { FatigueLevel, MuscleGroup, UserInput, DailyPlan, WorkoutHistoryItem } from './types';
import { UserForm } from './components/UserForm';
import { PlanDisplay } from './components/PlanDisplay';
import { HistoryView } from './components/HistoryView';
import { generateDailyPlan } from './services/geminiService';
import { sendDiscordCheckIn } from './services/discordService';
import { Sparkles, CheckCircle2, History } from 'lucide-react';

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
  const [checkInStatus, setCheckInStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutHistoryItem[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('input');

  // Load history from LocalStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('gym_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setWorkoutHistory(parsed);
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

  // Manual Check-in (Top Right)
  const handleManualCheckIn = async () => {
    setCheckInStatus('sending');
    const dateStr = new Date().toLocaleDateString('vi-VN');
    const note = `Điểm danh thủ công. Ngày: ${dateStr}, Cân nặng: ${userData.weight}kg, Trạng thái: ${userData.fatigue}`;
    
    await performDiscordCheckIn(note);
  };

  // Called when user finishes a workout in PlanDisplay
  const handleCompleteWorkout = async (levelSelected: string, summary: string, completedExercises: string[], userNotes: string) => {
    const now = new Date();
    const todayDateStr = now.toLocaleDateString('vi-VN');
    
    const newItem: WorkoutHistoryItem = {
      date: todayDateStr,
      timestamp: now.getTime(),
      levelSelected,
      summary,
      completedExercises,
      userNotes: userNotes || ""
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

    // Auto Check-in to Discord
    setCheckInStatus('sending');
    
    // Format the exercise list for Discord
    const exerciseListStr = completedExercises.length > 0 
      ? completedExercises.map(ex => `- ${ex}`).join('\n') 
      : "Chưa tích bài nào";

    const note = `✅ **HOÀN THÀNH TẬP LUYỆN!**
**Ngày:** ${todayDateStr}
**Cân nặng:** ${userData.weight}kg
**Level:** ${levelSelected}
**Ghi chú:** ${userNotes || "Không có"}
**Bài đã tập:**
${exerciseListStr}`;

    await performDiscordCheckIn(note);
  };

  const handleDeleteHistoryItem = (timestamp: number) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa lịch sử tập luyện của ngày này không?")) {
      const updatedHistory = workoutHistory.filter(item => item.timestamp !== timestamp);
      setWorkoutHistory(updatedHistory);
      localStorage.setItem('gym_history', JSON.stringify(updatedHistory));
    }
  };

  const performDiscordCheckIn = async (note: string) => {
    const success = await sendDiscordCheckIn(note);
    if (success) {
      setCheckInStatus('success');
      setTimeout(() => setCheckInStatus('idle'), 3000);
    } else {
      setCheckInStatus('error');
      setTimeout(() => setCheckInStatus('idle'), 3000);
    }
  };

  return (
    <div className="relative min-h-screen font-sans selection:bg-cyan-500/30 selection:text-cyan-100">
      
      {/* Background Image (Same as Liquid Glass but static) */}
      <div className="fixed inset-0 z-0">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ 
            backgroundImage: `url('https://images.pexels.com/photos/268533/pexels-photo-268533.jpeg?cs=srgb&dl=pexels-pixabay-268533.jpg&fm=jpg')` 
          }}
        />
        {/* Dark Overlay for readability */}
        <div className="absolute inset-0 bg-black/80" />
      </div>

      {/* Content Layer */}
      <div className="relative z-10 container mx-auto px-4 py-10 max-w-5xl">
        
        {/* Header */}
        {viewMode === 'input' && (
          <div className="text-center mb-10 space-y-3 animate-fade-in relative">
            <div className="absolute top-0 right-0 md:right-10">
               <button 
                onClick={handleManualCheckIn}
                disabled={checkInStatus !== 'idle'}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold backdrop-blur-md border shadow-lg transition-all
                  ${checkInStatus === 'success' ? 'bg-green-500/20 border-green-500 text-green-300' : 
                    checkInStatus === 'error' ? 'bg-red-500/20 border-red-500 text-red-300' :
                    'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'}
                `}
               >
                 <CheckCircle2 className="w-4 h-4" />
                 {checkInStatus === 'idle' && "Điểm danh Online"}
                 {checkInStatus === 'sending' && "Đang gửi..."}
                 {checkInStatus === 'success' && "Đã xong!"}
                 {checkInStatus === 'error' && "Lỗi!"}
               </button>
            </div>

            <div className="inline-flex items-center justify-center p-3 bg-white/5 rounded-full mb-2 border border-white/10 shadow-lg backdrop-blur-md">
              <Sparkles className="w-6 h-6 text-cyan-300 animate-pulse" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight drop-shadow-lg">
              Grow <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Up</span>
            </h1>
            <p className="text-lg text-gray-300 font-light max-w-lg mx-auto">
              Lịch trình tập luyện thông minh. Tự động điều chỉnh theo lịch sử và thể trạng.
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
               
               {/* History Button positioned below UserForm */}
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
import React, { useEffect, useState } from 'react';
import { UserInput, UserStats, Intensity, WorkoutHistoryItem, UserGoals } from '../types';
import { GlassCard } from './ui/GlassCard';
import { LiquidGlassContainer } from './ui/LiquidGlassContainer';
import { Calendar, Ruler, Weight, Activity, Flame, Dumbbell, Utensils, History, Loader2, ChevronRight, Camera } from 'lucide-react';
import { WorkoutInput } from './forms/WorkoutInput';
import { NutritionInput } from './forms/NutritionInput';
import { HistoryView } from './HistoryView';
import { PlanTabs } from './ui/PlanTabs';
import { BodyMetricsCard } from './ui/BodyMetricsCard';
import { GoalSettingCard } from './ui/GoalSettingCard';
import { SupplementTracker } from './ui/SupplementTracker';

interface UserFormProps {
  userData: UserInput;
  setUserData: React.Dispatch<React.SetStateAction<UserInput>>;
  userStats: UserStats;
  onSubmit: (type: 'workout' | 'nutrition' | 'history') => void;
  isLoading: boolean;
  onSickDay: () => void;
  history: WorkoutHistoryItem[];
  onDeleteHistory: (timestamp: number) => void;
  activeTab: 'workout' | 'nutrition' | 'history'; // New prop
  onStartTracking?: () => void;
  onRefreshHistory?: () => void;
  isRefreshing?: boolean;
  userGoals: UserGoals | null;
  onGoalsUpdate: (goals: UserGoals) => void;
}

type TabType = 'workout' | 'nutrition' | 'history';

export const UserForm: React.FC<UserFormProps> = ({
  userData, setUserData, userStats, onSubmit, isLoading, onSickDay,
  history, onDeleteHistory,
  activeTab, onStartTracking, onRefreshHistory, isRefreshing,
  userGoals, onGoalsUpdate,
}) => {
  const [currentDate, setCurrentDate] = useState('');
  // const [activeTab, setActiveTab] = useState<TabType>('workout'); // Removed internal state

  // Local state for weight input to handle commas/dots
  const [weightInput, setWeightInput] = useState(userData.weight.toString());

  useEffect(() => {
    if (Math.abs(parseFloat(weightInput.replace(',', '.')) - userData.weight) > 0.01) {
      setWeightInput(userData.weight.toString());
    }
  }, [userData.weight]);

  useEffect(() => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    setCurrentDate(now.toLocaleDateString('vi-VN', options));
  }, []);

  return (
    <div className="space-y-6 animate-fade-in relative pb-32">
      <LiquidGlassContainer intensity="medium" className="p-8 space-y-6">
        {/* --- STREAK CARD --- */}
        <div id="tour-streak" className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-900/60 to-red-900/60 border border-orange-500/30 shadow-[0_0_20px_rgba(249,115,22,0.2)] p-4">
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-yellow-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/40">
                <Flame className="w-7 h-7 text-white fill-white animate-pulse" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg leading-tight">Chuỗi Ngày Tập Luyện</h3>
                <p className="text-orange-200 text-xs font-medium">Đừng để ngọn lửa vụt tắt!</p>
              </div>
            </div>
            <div className="text-right">
              <span className="block text-3xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                {userStats.streak}
              </span>
              <span className="text-[10px] text-orange-200 uppercase tracking-widest font-bold">Ngày liên tiếp</span>
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12">
            <Flame className="w-32 h-32" />
          </div>
        </div>

        {/* --- GOAL SETTING CARD --- */}
        {activeTab !== 'history' && (
          <GoalSettingCard
            goals={userGoals}
            onSave={onGoalsUpdate}
            history={history}
            userData={userData}
          />
        )}

        {/* --- SUPPLEMENT & WATER TRACKER --- */}
        {activeTab !== 'history' && (
          <SupplementTracker useCreatine={userData.useCreatine} />
        )}


        {/* --- COMMON INFO (Visible only on Workout/Nutrition Tabs) --- */}
        {/* Hide Body Profile on History Tab to save space */}
        {activeTab !== 'history' && (
          <div id="tour-body-stats">
            <GlassCard title="Hồ sơ cơ thể" icon={<Ruler className="w-6 h-6" />}>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Cân nặng (kg)</label>
                  <div className="relative">
                    <Weight className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      inputMode="decimal"
                      value={weightInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setWeightInput(val);
                        const parsed = parseFloat(val.replace(',', '.'));
                        if (!isNaN(parsed)) {
                          setUserData(prev => ({ ...prev, weight: parsed }));
                        }
                      }}
                      className="w-full bg-black/20 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Chiều cao (cm)</label>
                  <div className="relative">
                    <Ruler className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      value={userData.height}
                      onChange={(e) => setUserData({ ...userData, height: Number(e.target.value) })}
                      className="w-full bg-black/20 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Tuổi</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      value={userData.age || ''}
                      onChange={(e) => setUserData({ ...userData, age: Number(e.target.value) })}
                      className="w-full bg-black/20 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                    />
                  </div>
                </div>
              </div>
              {/* BMI/BMR/TDEE Card - realtime */}
              <BodyMetricsCard userData={userData} />
            </GlassCard>
          </div>
        )}

        {/* --- CONDITIONAL VIEWS --- */}
        <div className="min-h-[400px]">
          {activeTab === 'workout' && (
            <div id="tour-workout-input-area" className="space-y-6">
              <WorkoutInput
                userData={userData}
                setUserData={setUserData}
                onSickDay={onSickDay}
              />
              <button
                id="tour-generate-btn"
                onClick={() => onSubmit('workout')}
                disabled={isLoading}
                className="group relative w-full py-4 rounded-2xl font-bold text-lg transition-all duration-300 cursor-pointer shadow-2xl bg-gradient-to-r from-cyan-600 to-blue-600 border-cyan-400/50 hover:shadow-[0_0_40px_rgba(6,182,212,0.6)] border text-white hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:grayscale component-shadow"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2 relative z-10">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang khởi tạo AI...
                  </span>
                ) : (
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <Dumbbell className="w-6 h-6" />
                    Tạo Kế Hoạch Tập Luyện
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Custom Nutrition Options Redesign */}
          {activeTab === 'nutrition' && (
            <div className="space-y-6">
              <NutritionInput
                userData={userData}
                setUserData={setUserData}
              />

              <div className="grid grid-cols-1 gap-4 mt-2">
                {/* Option 1: AI Plan (Primary) */}
                <button
                  id="tour-nutrition-ai-btn"
                  onClick={() => onSubmit('nutrition')}
                  disabled={isLoading}
                  className="group relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 p-5 text-left transition-all hover:border-emerald-500/50 hover:from-emerald-500/20 hover:to-teal-500/20 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] active:scale-[0.98]"
                >
                  <div className="absolute right-0 top-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl transition-all group-hover:bg-emerald-500/20" />

                  <div className="relative z-10 flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-400 shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform duration-300">
                      {isLoading ? <Loader2 className="animate-spin h-6 w-6 text-white" /> : <Utensils className="h-6 w-6 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-white group-hover:text-emerald-50 transition-colors">
                        Tạo Kế Hoạch AI
                      </h3>
                      <p className="text-sm font-medium text-emerald-200/60 group-hover:text-emerald-200/80 leading-snug">
                        AI tự động thiết kế thực đơn phù hợp với bạn
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-emerald-500/50 transition-all group-hover:translate-x-1 group-hover:text-emerald-400" />
                  </div>
                </button>

                {/* Option 2: Quick Check (Secondary) */}
                <button
                  id="tour-check-calo"
                  onClick={onStartTracking}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 text-left transition-all hover:border-white/20 hover:bg-white/10 active:scale-[0.98]"
                >
                  <div className="relative z-10 flex items-center gap-4">
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-800/50 border border-white/5 group-hover:border-emerald-500/30 group-hover:bg-emerald-500/10 transition-all duration-300">
                      <Camera className="h-6 w-6 text-gray-400 group-hover:text-emerald-400 transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-200 group-hover:text-white transition-colors">
                        Tự Check Calo
                      </h3>
                      <p className="text-sm font-medium text-gray-500 group-hover:text-gray-400 leading-snug">
                        Chụp ảnh kiểm tra nhanh, không tạo thực đơn
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-gray-600 transition-all group-hover:translate-x-1 group-hover:text-gray-400" />
                  </div>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <HistoryView
              history={history}
              onDelete={onDeleteHistory}
              userData={userData}
              onRefresh={onRefreshHistory}
              isRefreshing={isRefreshing}
            />
          )}
        </div>
      </LiquidGlassContainer>
    </div>
  );
};


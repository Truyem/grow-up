import React, { useEffect, useMemo, useState } from 'react';
import { GlassCard } from './ui/GlassCard';
import { Calendar, Ruler, Weight, Dumbbell } from 'lucide-react';
import { WorkoutInput } from './forms/WorkoutInput';
import { HistoryView } from './HistoryView';
import { BodyMetricsCard } from './ui/BodyMetricsCard';
import { PersonalRecordCard } from './ui/PersonalRecordCard';
import { SleepRecoveryCard } from './ui/SleepRecoveryCard';
import { ActiveRecoveryCard } from './ui/ActiveRecoveryCard';
import { AchievementBadgesCard } from './ui/AchievementBadgesCard';
import { useAppContext } from '../context';
import { calculatePersonalRecords } from '../services/personalRecordService';
import { SleepRecoveryEntry } from '../types';

interface UserFormProps {
  activeTab: 'workout' | 'history';
}

export const UserForm: React.FC<UserFormProps> = ({ activeTab }) => {
  const {
    userData,
    setUserData,
    userStats,
    workoutHistory,
    achievements,
    saveSleep,
    plan,
    isLoading,
    isRefreshing,
    generatePlan,
    startTracking,
    sickDay,
    deleteHistoryItem,
    refreshHistory,
    showToast,
  } = useAppContext();
  const [currentDate, setCurrentDate] = useState('');
  // const [activeTab, setActiveTab] = useState<TabType>('workout'); // Removed internal state

  // Local state for weight input to handle commas/dots
  const [weightInput, setWeightInput] = useState(userData.weight.toString());
  const [sleepStart, setSleepStart] = useState('23:00');
  const [sleepEnd, setSleepEnd] = useState('07:00');

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

  const sleepRecovery = useMemo(() => {
    return workoutHistory
      .filter((item) => item.recordType === 'sleep' || item.sleepHours != null)
      .map((item) => ({
        id: item.id || String(item.timestamp),
        timestamp: item.timestamp,
        date: item.date,
        sleepHours: item.sleepHours || 0,
        sleepQuality: item.sleepQuality || 'average',
      }));
  }, [workoutHistory]);

  // Removed internal handleAddSleepRecovery since we will pass it dynamically or handle on complete

  return (
    <div className="space-y-6 animate-fade-in relative pb-32">


      {/* --- STREAK CARD --- */}
      <div 
        id="tour-streak" 
        className={`relative overflow-hidden rounded-2xl p-4 ${
          userStats.streak === 0 
            ? 'bg-gray-700/60 border border-gray-500/30 shadow-[0_0_20px_rgba(128,128,128,0.2)]'
            : userStats.streak >= 100 
              ? 'bg-gradient-to-r from-purple-900/60 to-violet-900/60 border border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.2)]'
              : 'bg-gradient-to-r from-orange-900/60 to-red-900/60 border border-orange-500/30 shadow-[0_0_20px_rgba(249,115,22,0.2)]'
        }`}
      >
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0">
            <video
              key={userStats.streak >= 100 ? 'streak-100' : userStats.streak > 0 ? 'streak-active' : 'no-streak'}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
              src={
                userStats.streak === 0 
                  ? '/streak/No_streak.webm'
                  : userStats.streak >= 100 
                    ? '/streak/Day_100_streak.webm'
                    : '/streak/Streak.webm'
              }
            />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-bold text-lg leading-tight">Chuỗi Ngày Tập Luyện</h3>
            <p className="text-orange-200 text-xs font-medium">Đừng để ngọn lửa vụt tắt!</p>
            <div className="mt-1">
              <span className="text-3xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                {userStats.streak}
              </span>
              <span className="text-[10px] text-orange-200 uppercase tracking-widest font-bold ml-1">Ngày</span>
            </div>
          </div>
        </div>
      </div>

      {/* --- GOAL SETTING CARD --- */}
      {activeTab === 'history' && (
        <PersonalRecordCard records={calculatePersonalRecords(workoutHistory)} />
      )}

      {activeTab === 'workout' && (
          <SleepRecoveryCard
            entries={sleepRecovery}
            onAddEntry={() => {}} // No longer used directly here
            onSleepChange={(start, end) => {
              setSleepStart(start);
              setSleepEnd(end);
            }}
            suggestedSleepTime={plan?.schedule?.suggestedSleepTime}
          />
      )}

      {activeTab === 'history' && (
        <ActiveRecoveryCard history={workoutHistory} />
      )}

      {activeTab === 'history' && (
        <AchievementBadgesCard badges={achievements} />
      )}

      {/* --- COMMON INFO (Visible only on Workout Tabs) --- */}
      {activeTab === 'workout' && (
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
                        setUserData(prev => {
                          const newState = { ...prev, weight: parsed };
                          return newState;
                        });
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
                     onChange={(e) => setUserData(prev => ({ ...prev, height: Number(e.target.value) }))}
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
                     onChange={(e) => setUserData(prev => ({ ...prev, age: Number(e.target.value) }))}
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
              onSickDay={sickDay}
            />
            <button
              id="tour-generate-btn"
              onClick={() => {
                saveSleep(sleepStart, sleepEnd).catch((e) => {
                  console.error('Lỗi khi lưu giấc ngủ:', e);
                });
                generatePlan('workout').catch((e) => {
                  console.error('Lỗi tạo kế hoạch workout:', e);
                  showToast('Không thể tạo kế hoạch. Vui lòng thử lại.', 'error');
                });
              }}
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

        {activeTab === 'history' && (
          <HistoryView
            history={workoutHistory}
            onDelete={deleteHistoryItem}
            userData={userData}
            onRefresh={refreshHistory}
            isRefreshing={isRefreshing}
            sleepRecovery={sleepRecovery}
            userStats={userStats}
          />
        )}
      </div>
    </div>
  );
};

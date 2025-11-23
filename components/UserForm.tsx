
import React, { useEffect, useState } from 'react';
import { FatigueLevel, MuscleGroup, UserInput, Intensity } from '../types';
import { GlassCard } from './ui/GlassCard';
import { Activity, Calendar, Ruler, Weight, BatteryCharging, BatteryFull, AlertCircle } from 'lucide-react';

interface UserFormProps {
  userData: UserInput;
  setUserData: React.Dispatch<React.SetStateAction<UserInput>>;
  onSubmit: () => void;
  isLoading: boolean;
}

export const UserForm: React.FC<UserFormProps> = ({ userData, setUserData, onSubmit, isLoading }) => {
  const [currentDate, setCurrentDate] = useState('');
  const [suggestionMessage, setSuggestionMessage] = useState<string | null>(null);

  useEffect(() => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    setCurrentDate(now.toLocaleDateString('vi-VN', options));
  }, []);

  // Auto-switch to Easy if tired or very sore
  useEffect(() => {
    const isTired = userData.fatigue === FatigueLevel.Tired;
    const manySoreMuscles = userData.soreMuscles.filter(m => m !== MuscleGroup.None).length >= 2;

    if (isTired || manySoreMuscles) {
      if (userData.selectedIntensity !== Intensity.Easy) {
        setUserData(prev => ({ ...prev, selectedIntensity: Intensity.Easy }));
        setSuggestionMessage("Hệ thống tự động chọn mức độ 'Nhẹ nhàng' để giúp cơ thể bạn phục hồi tốt nhất.");
        
        // Clear message after 5 seconds
        const timer = setTimeout(() => setSuggestionMessage(null), 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [userData.fatigue, userData.soreMuscles, setUserData]);
  
  const handleMuscleChange = (muscle: MuscleGroup) => {
    setUserData(prev => {
      let newSore: MuscleGroup[] = [];
      
      if (muscle === MuscleGroup.None) {
        if (prev.soreMuscles.includes(MuscleGroup.None)) return prev; 
        newSore = [MuscleGroup.None];
      } else {
        const cleanPrev = prev.soreMuscles.filter(m => m !== MuscleGroup.None);
        
        if (cleanPrev.includes(muscle)) {
          newSore = cleanPrev.filter(m => m !== muscle);
        } else {
          newSore = [...cleanPrev, muscle];
        }

        if (newSore.length === 0) newSore = [MuscleGroup.None];
      }

      return { ...prev, soreMuscles: newSore };
    });
  };

  const getIntensityLabel = (intensity: Intensity) => {
    switch (intensity) {
      case Intensity.Easy: return "Nhẹ nhàng (Cardio/Recovery)";
      case Intensity.Medium: return "Vừa sức (Hypertrophy)";
      case Intensity.Hard: return "Thử thách (Overload)";
      default: return "";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <GlassCard title="Thông tin hôm nay" icon={<Calendar className="w-6 h-6" />}>
        <div className="text-center p-4 bg-white/5 rounded-xl border border-white/10">
          <p className="text-sm text-gray-400 uppercase tracking-widest mb-1">Hôm nay là</p>
          <p className="text-2xl md:text-3xl font-bold text-cyan-300 capitalize">{currentDate}</p>
        </div>
      </GlassCard>

      <GlassCard title="Chỉ số cơ thể" icon={<Ruler className="w-6 h-6" />}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-300 mb-2">Cân nặng (kg)</label>
            <div className="relative">
              <Weight className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="number"
                value={userData.weight}
                onChange={(e) => setUserData({ ...userData, weight: Number(e.target.value) })}
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
        </div>
      </GlassCard>

      <GlassCard title="Tình trạng sức khỏe" icon={<Activity className="w-6 h-6" />}>
        <div className="mb-6">
          <label className="block text-sm text-gray-300 mb-2">Mức độ mệt mỏi</label>
          <div className="flex gap-2">
            {Object.values(FatigueLevel).map((level) => (
              <button
                key={level}
                onClick={() => setUserData({ ...userData, fatigue: level })}
                className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                  userData.fatigue === level
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 border shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                    : 'bg-black/20 border-transparent text-gray-400 hover:bg-black/30'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-300 mb-2">Nhóm cơ đang đau (Để tránh tập nặng)</label>
          <div className="flex flex-wrap gap-2">
            {Object.values(MuscleGroup).map((muscle) => (
              <button
                key={muscle}
                onClick={() => handleMuscleChange(muscle)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                  userData.soreMuscles.includes(muscle)
                    ? muscle === MuscleGroup.None 
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                      : 'bg-pink-500/20 border-pink-500 text-pink-300'
                    : 'bg-black/20 border-white/5 text-gray-400 hover:border-white/20'
                }`}
              >
                {muscle}
              </button>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* Intensity Selection */}
      <GlassCard title="Mục tiêu hôm nay" icon={<BatteryCharging className="w-6 h-6" />}>
        <div className="space-y-3">
          {suggestionMessage && (
             <div className="flex items-start gap-3 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-200 text-sm animate-fade-in">
               <AlertCircle className="w-5 h-5 flex-shrink-0" />
               <p>{suggestionMessage}</p>
             </div>
          )}
          
          <label className="block text-sm text-gray-300">Chọn cường độ tập luyện:</label>
          <div className="grid grid-cols-1 gap-3">
            {/* Easy option removed from manual selection, but preserved in logic for auto-recovery */}

            <button
              onClick={() => setUserData({ ...userData, selectedIntensity: Intensity.Medium })}
              className={`p-4 rounded-xl border flex items-center gap-4 transition-all ${
                userData.selectedIntensity === Intensity.Medium
                  ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                  : 'bg-black/20 border-white/10 text-gray-400 hover:bg-white/5'
              }`}
            >
              <BatteryCharging className="w-6 h-6 flex-shrink-0" />
              <div className="text-left">
                <div className="font-bold">Vừa sức (Normal)</div>
                <div className="text-xs opacity-70">Tăng cơ (Hypertrophy), tiêu chuẩn.</div>
              </div>
            </button>

            <button
              onClick={() => setUserData({ ...userData, selectedIntensity: Intensity.Hard })}
              className={`p-4 rounded-xl border flex items-center gap-4 transition-all ${
                userData.selectedIntensity === Intensity.Hard
                  ? 'bg-red-500/20 border-red-500 text-red-300'
                  : 'bg-black/20 border-white/10 text-gray-400 hover:bg-white/5'
              }`}
            >
              <BatteryFull className="w-6 h-6 flex-shrink-0" />
              <div className="text-left">
                <div className="font-bold">Thử thách (Hard)</div>
                <div className="text-xs opacity-70">Cường độ cao, Overload, đẩy giới hạn.</div>
              </div>
            </button>
          </div>
        </div>
      </GlassCard>

      <button
        onClick={onSubmit}
        disabled={isLoading}
        className={`
          group relative w-full py-4 rounded-2xl font-bold text-lg transition-all duration-300
          bg-cyan-500/20 border border-cyan-500/40 text-cyan-100
          hover:bg-cyan-500/30 hover:border-cyan-400 hover:text-white
          hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(6,182,212,0.4)]
          active:scale-[0.98]
          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
          overflow-hidden
        `}
      >
        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
        {isLoading ? (
          <span className="flex items-center justify-center gap-2 relative z-10">
            <svg className="animate-spin h-5 w-5 text-cyan-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Đang tạo lịch {getIntensityLabel(userData.selectedIntensity).split('(')[0].trim()}...
          </span>
        ) : (
          <span className="relative z-10 flex items-center justify-center gap-2">
             <Activity className="w-5 h-5" /> Tạo Lịch Tập Ngay
          </span>
        )}
      </button>
      
      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

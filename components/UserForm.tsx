import React, { useEffect, useState } from 'react';
import { FatigueLevel, MuscleGroup, UserInput } from '../types';
import { GlassCard } from './ui/GlassCard';
import { Activity, Calendar, Ruler, Weight } from 'lucide-react';

interface UserFormProps {
  userData: UserInput;
  setUserData: React.Dispatch<React.SetStateAction<UserInput>>;
  onSubmit: () => void;
  isLoading: boolean;
}

export const UserForm: React.FC<UserFormProps> = ({ userData, setUserData, onSubmit, isLoading }) => {
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    setCurrentDate(now.toLocaleDateString('vi-VN', options));
  }, []);
  
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
            Đang phân tích dữ liệu...
          </span>
        ) : (
          <span className="relative z-10 flex items-center justify-center gap-2">
             <Activity className="w-5 h-5" /> Tạo Lịch Tập Hôm Nay
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
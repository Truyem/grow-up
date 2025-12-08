import React, { useMemo } from 'react';
import { WorkoutHistoryItem } from '../types';
import { GlassCard } from './ui/GlassCard';
import { ArrowLeft, TrendingUp, Activity, CalendarCheck, Award } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface AnalysisViewProps {
  history: WorkoutHistoryItem[];
  onBack: () => void;
}

export const AnalysisView: React.FC<AnalysisViewProps> = ({ history, onBack }) => {

  // Calculate Statistics
  const stats = useMemo(() => {
    const totalWorkouts = history.length;

    const totalExercises = history.reduce((acc, item) => {
      return acc + (item.completedExercises ? item.completedExercises.length : 0);
    }, 0);

    // Calculate Streak (Naive implementation based on sorted history)
    let streak = 0;
    if (history.length > 0) {
      const sortedHistory = [...history].sort((a, b) => b.timestamp - a.timestamp);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Check if last workout was today or yesterday to start counting
      const lastWorkoutDate = new Date(sortedHistory[0].timestamp);
      lastWorkoutDate.setHours(0, 0, 0, 0);

      const diffTime = Math.abs(today.getTime() - lastWorkoutDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 1) {
        streak = 1;
        for (let i = 0; i < sortedHistory.length - 1; i++) {
          const current = new Date(sortedHistory[i].timestamp);
          const next = new Date(sortedHistory[i + 1].timestamp);
          current.setHours(0, 0, 0, 0);
          next.setHours(0, 0, 0, 0);

          const d = (current.getTime() - next.getTime()) / (1000 * 3600 * 24);
          if (d === 1) {
            streak++;
          } else if (d > 1) {
            break;
          }
        }
      }
    }

    return { totalWorkouts, totalExercises, streak };
  }, [history]);

  // Prepare Chart Data (Last 7 Days)
  const chartData = useMemo(() => {
    const days = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' });

      // Find workouts on this day
      // Note: Comparing by simplified date string for robustness
      const dayStart = new Date(d.setHours(0, 0, 0, 0)).getTime();
      const dayEnd = new Date(d.setHours(23, 59, 59, 999)).getTime();

      const workoutOnDay = history.find(h => h.timestamp >= dayStart && h.timestamp <= dayEnd);

      days.push({
        name: i === 0 ? 'Hôm nay' : dateStr,
        exercises: workoutOnDay?.completedExercises?.length || 0,
        level: workoutOnDay?.levelSelected || '',
        summary: workoutOnDay?.summary || '',
      });
    }
    return days;
  }, [history]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-black/80 border border-white/10 p-3 rounded-xl shadow-xl backdrop-blur-md">
          <p className="text-cyan-300 font-bold mb-1">{label}</p>
          <p className="text-white text-sm">Bài tập: {data.exercises}</p>
          {data.level && <p className="text-gray-400 text-xs mt-1">{data.level}</p>}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="p-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-white cursor-pointer"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold text-white">Phân tích & Tiến độ</h2>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400">
            <Activity className="w-8 h-8" />
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wider">Tổng buổi tập</p>
            <p className="text-3xl font-bold text-white">{stats.totalWorkouts}</p>
          </div>
        </GlassCard>

        <GlassCard className="flex items-center gap-4">
          <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400">
            <TrendingUp className="w-8 h-8" />
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wider">Bài đã tập</p>
            <p className="text-3xl font-bold text-white">{stats.totalExercises}</p>
          </div>
        </GlassCard>

        <GlassCard className="flex items-center gap-4">
          <div className="p-3 bg-orange-500/20 rounded-xl text-orange-400">
            <Award className="w-8 h-8" />
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wider">Chuỗi ngày (Streak)</p>
            <p className="text-3xl font-bold text-white">{stats.streak} <span className="text-sm font-normal text-gray-500">ngày</span></p>
          </div>
        </GlassCard>
      </div>

      {/* Chart Section */}
      <GlassCard title="Hoạt động 7 ngày qua" icon={<CalendarCheck className="w-6 h-6" />}>
        <div className="h-[300px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis
                dataKey="name"
                stroke="#94a3b8"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis
                hide
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
              <Bar dataKey="exercises" radius={[6, 6, 6, 6]} barSize={40}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.exercises > 0 ? 'url(#colorGradient)' : 'rgba(255,255,255,0.05)'}
                  />
                ))}
              </Bar>
              <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity={1} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.8} />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-center text-xs text-gray-500 mt-4">Biểu đồ thể hiện số lượng bài tập hoàn thành mỗi ngày</p>
      </GlassCard>

    </div>
  );
};
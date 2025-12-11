import React, { useMemo, useState, useEffect } from 'react';
import { WorkoutHistoryItem, AIOverview, MuscleGroup } from '../types';
import { GlassCard } from './ui/GlassCard';
import { HumanBodyMuscleMap } from './ui/HumanBodyMuscleMap';
import { generateAIOverview } from '../services/geminiService';
import {
  ArrowLeft, TrendingUp, Activity, CalendarCheck, Award,
  Sparkles, Flame, Droplets, DollarSign, Target,
  CheckCircle2, AlertCircle, Lightbulb, Quote, Loader2
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, LineChart, Line } from 'recharts';

interface AnalysisViewProps {
  history: WorkoutHistoryItem[];
  onBack: () => void;
}

// Color palette for muscle groups
const MUSCLE_COLORS: Record<string, string> = {
  'Ngực': '#3b82f6',    // Blue
  'Vai': '#ef4444',     // Red
  'Lưng': '#eab308',    // Yellow
  'Tay': '#22c55e',     // Green
  'Chân': '#a855f7',    // Purple
  'Bụng': '#f97316',    // Orange
  'Cardio': '#06b6d4',  // Cyan
};

export const AnalysisView: React.FC<AnalysisViewProps> = ({ history, onBack }) => {
  const [aiOverview, setAIOverview] = useState<AIOverview | null>(null);
  const [loadingAI, setLoadingAI] = useState(true);

  // Fetch AI Overview on mount
  useEffect(() => {
    const fetchAIOverview = async () => {
      setLoadingAI(true);
      try {
        const overview = await generateAIOverview(history);
        setAIOverview(overview);
      } catch (error) {
        console.error("Failed to fetch AI Overview:", error);
      } finally {
        setLoadingAI(false);
      }
    };
    fetchAIOverview();
  }, [history]);

  // Calculate Basic Statistics
  const stats = useMemo(() => {
    const totalWorkouts = history.length;

    const totalExercises = history.reduce((acc, item) => {
      return acc + (item.completedExercises ? item.completedExercises.length : 0);
    }, 0);

    // Calculate Streak
    let streak = 0;
    if (history.length > 0) {
      const sortedHistory = [...history].sort((a, b) => b.timestamp - a.timestamp);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

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

  // Weekly Nutrition Stats
  const weeklyNutrition = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const weeklyHistory = history.filter(h => h.timestamp >= weekAgo);

    let totalCalories = 0;
    let totalProtein = 0;
    let totalWater = 0;
    let totalCost = 0;

    weeklyHistory.forEach(h => {
      if (h.nutrition) {
        totalCalories += h.nutrition.totalCalories || 0;
        totalProtein += h.nutrition.totalProtein || 0;
        totalWater += h.nutrition.waterIntake || 0;
        totalCost += h.nutrition.totalCost || 0;
      }
    });

    return {
      calories: totalCalories,
      protein: totalProtein,
      water: Math.round(totalWater * 10) / 10,
      cost: totalCost,
      days: weeklyHistory.length
    };
  }, [history]);

  // Muscle Group Distribution
  const muscleDistribution = useMemo(() => {
    const muscleCount: Record<string, number> = {};

    history.forEach(h => {
      h.completedExercises?.forEach(ex => {
        // Parse muscle group from exercise name
        if (ex.includes('Push') || ex.includes('Chest') || ex.includes('Ngực')) {
          muscleCount['Ngực'] = (muscleCount['Ngực'] || 0) + 1;
        } else if (ex.includes('Shoulder') || ex.includes('Vai')) {
          muscleCount['Vai'] = (muscleCount['Vai'] || 0) + 1;
        } else if (ex.includes('Back') || ex.includes('Lưng') || ex.includes('Pull')) {
          muscleCount['Lưng'] = (muscleCount['Lưng'] || 0) + 1;
        } else if (ex.includes('Bicep') || ex.includes('Tricep') || ex.includes('Arm') || ex.includes('Tay')) {
          muscleCount['Tay'] = (muscleCount['Tay'] || 0) + 1;
        } else if (ex.includes('Leg') || ex.includes('Squat') || ex.includes('Lunge') || ex.includes('Chân')) {
          muscleCount['Chân'] = (muscleCount['Chân'] || 0) + 1;
        } else if (ex.includes('Ab') || ex.includes('Plank') || ex.includes('Bụng') || ex.includes('Core')) {
          muscleCount['Bụng'] = (muscleCount['Bụng'] || 0) + 1;
        } else if (ex.includes('Cardio') || ex.includes('Run') || ex.includes('Walk') || ex.includes('Jump')) {
          muscleCount['Cardio'] = (muscleCount['Cardio'] || 0) + 1;
        }
      });
    });

    return Object.entries(muscleCount).map(([name, value]) => ({
      name,
      value,
      color: MUSCLE_COLORS[name] || '#94a3b8'
    }));
  }, [history]);

  // Chart Data (Last 7 Days)
  const chartData = useMemo(() => {
    const days = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' });

      const dayStart = new Date(d.setHours(0, 0, 0, 0)).getTime();
      const dayEnd = new Date(d.setHours(23, 59, 59, 999)).getTime();

      const workoutOnDay = history.find(h => h.timestamp >= dayStart && h.timestamp <= dayEnd);

      days.push({
        name: i === 0 ? 'Hôm nay' : dateStr,
        exercises: workoutOnDay?.completedExercises?.length || 0,
        calories: workoutOnDay?.nutrition?.totalCalories || 0,
        protein: workoutOnDay?.nutrition?.totalProtein || 0,
      });
    }
    return days;
  }, [history]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-black/90 border border-white/10 p-3 rounded-xl shadow-xl backdrop-blur-md">
          <p className="text-cyan-300 font-bold mb-1">{label}</p>
          <p className="text-white text-sm">Bài tập: {data.exercises}</p>
          {data.calories > 0 && <p className="text-orange-400 text-xs">Calories: {data.calories} kcal</p>}
          {data.protein > 0 && <p className="text-emerald-400 text-xs">Protein: {data.protein}g</p>}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="p-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-white cursor-pointer"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold text-white">Phân tích & Tiến độ</h2>
      </div>

      {/* AI Overview Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600/20 via-blue-600/20 to-cyan-600/20 border border-white/10 p-6">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-transparent to-cyan-500/5" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-xl">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white">AI Overview</h3>
            {loadingAI && <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />}
          </div>

          {loadingAI ? (
            <div className="space-y-3">
              <div className="h-4 bg-white/10 rounded animate-pulse w-3/4" />
              <div className="h-4 bg-white/10 rounded animate-pulse w-1/2" />
              <div className="h-4 bg-white/10 rounded animate-pulse w-2/3" />
            </div>
          ) : aiOverview ? (
            <div className="space-y-4">
              {/* Summary */}
              <p className="text-gray-200 text-lg leading-relaxed">{aiOverview.summary}</p>

              {/* Stats Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-4">
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-cyan-400">{aiOverview.weeklyStats.workoutsCompleted}</p>
                  <p className="text-xs text-gray-400">Buổi tập/tuần</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-400">{aiOverview.weeklyStats.totalExercises}</p>
                  <p className="text-xs text-gray-400">Bài tập</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-orange-400">{aiOverview.weeklyStats.estimatedCaloriesBurned}</p>
                  <p className="text-xs text-gray-400">Kcal đốt</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-purple-400">{aiOverview.weeklyStats.consistency}%</p>
                  <p className="text-xs text-gray-400">Consistency</p>
                </div>
              </div>

              {/* Strengths & Improvements */}
              <div className="grid md:grid-cols-2 gap-4">
                {aiOverview.strengths.length > 0 && (
                  <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <span className="font-semibold text-emerald-300">Điểm mạnh</span>
                    </div>
                    <ul className="space-y-1">
                      {aiOverview.strengths.map((s, i) => (
                        <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                          <span className="text-emerald-400">•</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {aiOverview.improvements.length > 0 && (
                  <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-5 h-5 text-amber-400" />
                      <span className="font-semibold text-amber-300">Cần cải thiện</span>
                    </div>
                    <ul className="space-y-1">
                      {aiOverview.improvements.map((s, i) => (
                        <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                          <span className="text-amber-400">•</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Recommendation */}
              <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-5 h-5 text-blue-400" />
                  <span className="font-semibold text-blue-300">Đề xuất</span>
                </div>
                <p className="text-gray-300">{aiOverview.recommendation}</p>
              </div>

              {/* Quote */}
              <div className="flex items-start gap-3 pt-2 border-t border-white/10">
                <Quote className="w-5 h-5 text-purple-400 flex-shrink-0 mt-1" />
                <p className="text-gray-400 italic">{aiOverview.motivationalQuote}</p>
              </div>
            </div>
          ) : (
            <p className="text-gray-400">Không thể tải AI Overview. Vui lòng thử lại sau.</p>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400">
            <Activity className="w-7 h-7" />
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wider">Tổng buổi tập</p>
            <p className="text-2xl font-bold text-white">{stats.totalWorkouts}</p>
          </div>
        </GlassCard>

        <GlassCard className="flex items-center gap-4">
          <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400">
            <TrendingUp className="w-7 h-7" />
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wider">Bài đã tập</p>
            <p className="text-2xl font-bold text-white">{stats.totalExercises}</p>
          </div>
        </GlassCard>

        <GlassCard className="flex items-center gap-4">
          <div className="p-3 bg-orange-500/20 rounded-xl text-orange-400">
            <Award className="w-7 h-7" />
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wider">Streak</p>
            <p className="text-2xl font-bold text-white">{stats.streak} <span className="text-sm font-normal text-gray-500">ngày</span></p>
          </div>
        </GlassCard>

        <GlassCard className="flex items-center gap-4">
          <div className="p-3 bg-purple-500/20 rounded-xl text-purple-400">
            <Target className="w-7 h-7" />
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wider">Consistency</p>
            <p className="text-2xl font-bold text-white">{aiOverview?.weeklyStats.consistency || 0}%</p>
          </div>
        </GlassCard>
      </div>

      {/* Weekly Nutrition Summary */}
      {weeklyNutrition.days > 0 && (
        <GlassCard title="Dinh dưỡng tuần này" icon={<Flame className="w-6 h-6" />}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="text-center p-3 bg-orange-500/10 rounded-xl">
              <Flame className="w-6 h-6 text-orange-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{weeklyNutrition.calories.toLocaleString()}</p>
              <p className="text-xs text-gray-400">Calories tổng</p>
            </div>
            <div className="text-center p-3 bg-emerald-500/10 rounded-xl">
              <TrendingUp className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{weeklyNutrition.protein}g</p>
              <p className="text-xs text-gray-400">Protein tổng</p>
            </div>
            <div className="text-center p-3 bg-blue-500/10 rounded-xl">
              <Droplets className="w-6 h-6 text-blue-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{weeklyNutrition.water}L</p>
              <p className="text-xs text-gray-400">Nước uống</p>
            </div>
            <div className="text-center p-3 bg-yellow-500/10 rounded-xl">
              <DollarSign className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{(weeklyNutrition.cost / 1000).toFixed(0)}k</p>
              <p className="text-xs text-gray-400">Chi phí (VND)</p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Charts Section */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Activity Chart */}
        <GlassCard title="Hoạt động 7 ngày qua" icon={<CalendarCheck className="w-6 h-6" />}>
          <div className="h-[250px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis
                  dataKey="name"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar dataKey="exercises" radius={[6, 6, 6, 6]} barSize={35}>
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
        </GlassCard>


        {/* Muscle Distribution */}
        {muscleDistribution.length > 0 && (
          <GlassCard title="Phân bố nhóm cơ" icon={<Activity className="w-6 h-6" />}>
            <div className="mt-4">
              <HumanBodyMuscleMap
                selectedMuscles={(() => {
                  // Convert muscle distribution to MuscleGroup enum values
                  const muscleSet = new Set<MuscleGroup>();

                  muscleDistribution.forEach(muscle => {
                    // Map Vietnamese muscle names to MuscleGroup enum
                    if (muscle.name === 'Ngực') {
                      muscleSet.add(MuscleGroup.ChestUpper);
                      muscleSet.add(MuscleGroup.ChestMiddle);
                      muscleSet.add(MuscleGroup.ChestLower);
                    } else if (muscle.name === 'Vai') {
                      muscleSet.add(MuscleGroup.FrontDelts);
                      muscleSet.add(MuscleGroup.SideDelts);
                      muscleSet.add(MuscleGroup.RearDelts);
                    } else if (muscle.name === 'Lưng') {
                      muscleSet.add(MuscleGroup.Lats);
                      muscleSet.add(MuscleGroup.UpperBack);
                      muscleSet.add(MuscleGroup.LowerBack);
                      muscleSet.add(MuscleGroup.Traps);
                    } else if (muscle.name === 'Tay') {
                      muscleSet.add(MuscleGroup.Biceps);
                      muscleSet.add(MuscleGroup.TricepsLong);
                      muscleSet.add(MuscleGroup.TricepsLateral);
                      muscleSet.add(MuscleGroup.Forearms);
                    } else if (muscle.name === 'Chân') {
                      muscleSet.add(MuscleGroup.Quads);
                      muscleSet.add(MuscleGroup.Hamstrings);
                      muscleSet.add(MuscleGroup.Glutes);
                      muscleSet.add(MuscleGroup.Calves);
                    } else if (muscle.name === 'Bụng') {
                      muscleSet.add(MuscleGroup.UpperAbs);
                      muscleSet.add(MuscleGroup.LowerAbs);
                      muscleSet.add(MuscleGroup.Obliques);
                    }
                  });

                  return Array.from(muscleSet);
                })()}
                onMuscleToggle={() => { }} // Read-only
                showLabels={true}
                interactive={false} // Not interactive in analysis view
              />
            </div>

            {/* Stats below the body */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
              {muscleDistribution.map((m, i) => (
                <div key={i} className="bg-white/5 rounded-xl p-3 text-center border border-white/10">
                  <div className="w-4 h-4 rounded-full mx-auto mb-2" style={{ backgroundColor: m.color }} />
                  <p className="text-xs text-gray-400 mb-1">{m.name}</p>
                  <p className="text-lg font-bold text-white">{m.value}</p>
                  <p className="text-[10px] text-gray-500">bài tập</p>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-500 text-center mt-4 italic">
              Các nhóm cơ đã tập trong lịch sử
            </p>
          </GlassCard>
        )}
      </div>

      {/* Calories/Protein Trend */}
      {chartData.some(d => d.calories > 0) && (
        <GlassCard title="Xu hướng Calories & Protein" icon={<TrendingUp className="w-6 h-6" />}>
          <div className="h-[200px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.9)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px'
                  }}
                />
                <Line type="monotone" dataKey="calories" stroke="#f97316" strokeWidth={2} dot={{ fill: '#f97316' }} name="Calories" />
                <Line type="monotone" dataKey="protein" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e' }} name="Protein (g)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      )}

    </div>
  );
};
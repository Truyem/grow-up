import React, { useMemo, useState } from 'react';
import { WorkoutHistoryItem, MuscleGroup, UserInput, AIOverview } from '../types';
import { GlassCard } from './ui/GlassCard';
import { ArrowLeft, Calendar, Dumbbell, FileText, Trophy, Trash2, Utensils, Weight, Activity, TrendingUp, Award, Target, Flame, Droplets, DollarSign, CalendarCheck, AlertTriangle, X, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { HabitTracker } from './dashboard/HabitTracker';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, YAxis } from 'recharts';
import { HumanBodyMuscleMap } from './ui/HumanBodyMuscleMap';
import { generateAIOverview } from '../services/geminiService';

interface HistoryViewProps {
  history: WorkoutHistoryItem[];
  onBack: () => void;
  onDelete: (timestamp: number) => void;
  userData?: UserInput; // Needed for context
}

const formatCurrency = (amount?: number) => {
  if (amount === undefined) return '';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

const MUSCLE_COLORS: Record<string, string> = {
  'Ngực': '#3b82f6',
  'Vai': '#ef4444',
  'Lưng': '#eab308',
  'Tay': '#22c55e',
  'Chân': '#a855f7',
  'Bụng': '#f97316',
  'Cardio': '#06b6d4',
};

export const HistoryView: React.FC<HistoryViewProps> = ({ history, onBack, onDelete, userData }) => {
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null);
  const [deleteTimeout, setDeleteTimeout] = useState<NodeJS.Timeout | null>(null);
  const [aiOverview, setAiOverview] = useState<AIOverview | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAIOverview, setShowAIOverview] = useState(false); // Inline toggle

  // --- STATS CALCULATION ---
  const stats = useMemo(() => {
    const totalWorkouts = history.length;
    const totalExercises = history.reduce((acc, item) => acc + (item.completedExercises ? item.completedExercises.length : 0), 0);
    // Streak logic
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
          if (d === 1) streak++;
          else if (d > 1) break;
        }
      }
    }
    return { totalWorkouts, totalExercises, streak };
  }, [history]);

  // --- MUSCLE DISTRIBUTION ---
  const muscleDistribution = useMemo(() => {
    const muscleCount: Record<string, number> = {};
    history.forEach(h => {
      h.completedExercises?.forEach(ex => {
        if (ex.includes('Push') || ex.includes('Chest') || ex.includes('Ngực')) muscleCount['Ngực'] = (muscleCount['Ngực'] || 0) + 1;
        else if (ex.includes('Shoulder') || ex.includes('Vai')) muscleCount['Vai'] = (muscleCount['Vai'] || 0) + 1;
        else if (ex.includes('Back') || ex.includes('Lưng') || ex.includes('Pull')) muscleCount['Lưng'] = (muscleCount['Lưng'] || 0) + 1;
        else if (ex.includes('Bicep') || ex.includes('Tricep') || ex.includes('Arm') || ex.includes('Tay')) muscleCount['Tay'] = (muscleCount['Tay'] || 0) + 1;
        else if (ex.includes('Leg') || ex.includes('Squat') || ex.includes('Lunge') || ex.includes('Chân')) muscleCount['Chân'] = (muscleCount['Chân'] || 0) + 1;
        else if (ex.includes('Ab') || ex.includes('Plank') || ex.includes('Bụng') || ex.includes('Core')) muscleCount['Bụng'] = (muscleCount['Bụng'] || 0) + 1;
        else if (ex.includes('Cardio') || ex.includes('Run') || ex.includes('Walk')) muscleCount['Cardio'] = (muscleCount['Cardio'] || 0) + 1;
      });
    });
    return Object.entries(muscleCount).map(([name, value]) => ({ name, value, color: MUSCLE_COLORS[name] || '#94a3b8' }));
  }, [history]);

  // --- CHART DATA (7 DAYS) ---
  const chartData = useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' });
      const dayStart = new Date(d.setHours(0, 0, 0, 0)).getTime();
      const dayEnd = new Date(d.setHours(23, 59, 59, 999)).getTime();

      const workoutsOnDay = history.filter(h => h.timestamp >= dayStart && h.timestamp <= dayEnd);
      const exercises = workoutsOnDay.reduce((acc, w) => acc + (w.completedExercises?.length || 0), 0);
      const calories = workoutsOnDay.reduce((acc, w) => acc + (w.nutrition?.totalCalories || 0), 0);
      const protein = workoutsOnDay.reduce((acc, w) => acc + (w.nutrition?.totalProtein || 0), 0);
      const carbs = workoutsOnDay.reduce((acc, w) => acc + (w.nutrition?.totalCarbs || 0), 0);
      const fat = workoutsOnDay.reduce((acc, w) => acc + (w.nutrition?.totalFat || 0), 0);

      days.push({ name: i === 0 ? 'Hôm nay' : dateStr, exercises, calories, protein, carbs, fat });
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
          {data.carbs > 0 && <p className="text-blue-400 text-xs">Carbs: {data.carbs}g</p>}
          {data.fat > 0 && <p className="text-yellow-400 text-xs">Fat: {data.fat}g</p>}
        </div>
      );
    }
    return null;
  };

  const handleDeleteRequest = (timestamp: number) => {
    if (confirmingDeleteId === timestamp) {
      // Second click - confirm delete
      if (deleteTimeout) clearTimeout(deleteTimeout);
      onDelete(timestamp);
      setConfirmingDeleteId(null);
      setDeleteTimeout(null);
    } else {
      // First click - start confirmation
      if (deleteTimeout) clearTimeout(deleteTimeout);
      setConfirmingDeleteId(timestamp);

      const timeout = setTimeout(() => {
        setConfirmingDeleteId(null);
        setDeleteTimeout(null);
      }, 3000); // 3 second window

      setDeleteTimeout(timeout);
    }
  };

  const handleAnalyze = async () => {
    // If already checking/open, toggle off
    if (showAIOverview) {
      setShowAIOverview(false);
      return;
    }

    // If not open:
    // 1. If data exists, just show it
    if (aiOverview) {
      setShowAIOverview(true);
      return;
    }

    // 2. If no data, fetch it
    if (history.length === 0) return;
    setIsAnalyzing(true);
    try {
      const result = await generateAIOverview(history, userData);
      setAiOverview(result);
      setShowAIOverview(true);
    } catch (e) {
      console.error("AI Overview failed", e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-white cursor-pointer">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="text-2xl font-bold text-white">Lịch sử & Tiến độ</h2>
        </div>

        {/* AI Analyze Button (Toggle) */}
        {history.length > 0 && (
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border font-semibold text-sm transition-all shadow-lg
                ${isAnalyzing
                ? 'bg-purple-500/10 text-purple-300 border-purple-500/30 cursor-wait'
                : showAIOverview
                  ? 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                  : 'bg-purple-600 hover:bg-purple-500 text-white border-purple-500 shadow-purple-900/20 hover:shadow-purple-500/40'}`}
          >
            {isAnalyzing ? (
              <>
                <div className="w-4 h-4 border-2 border-purple-300 border-t-transparent rounded-full animate-spin" />
                Đang phân tích...
              </>
            ) : (
              <>
                <Sparkles className={`w-4 h-4 ${showAIOverview ? 'text-purple-400' : ''}`} />
                {showAIOverview ? 'Đóng AI Overview' : 'AI Overview'}
                {showAIOverview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </>
            )}
          </button>
        )}
      </div>

      {/* AI Overview INLINE Display */}
      {showAIOverview && aiOverview && (
        <div className="animate-fade-in-down mb-6">
          <GlassCard className="relative overflow-hidden !border-purple-500/30 !bg-[#0f172a]/80">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              <Sparkles className="w-32 h-32 text-purple-500" />
            </div>

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">AI Phân Tích</h3>
                  <p className="text-xs text-purple-300">Dựa trên dữ liệu tập luyện của bạn</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <p className="text-gray-200 text-sm leading-relaxed">{aiOverview.summary}</p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-emerald-500/5 rounded-xl p-4 border border-emerald-500/10">
                    <h4 className="text-sm font-bold text-emerald-400 mb-2 flex items-center gap-2"><Award className="w-3 h-3" /> Điểm mạnh</h4>
                    <ul className="space-y-1">
                      {aiOverview.strengths.slice(0, 3).map((s, i) => (
                        <li key={i} className="text-xs text-gray-300 flex items-start gap-2"><span className="text-emerald-500">•</span> {s}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-orange-500/5 rounded-xl p-4 border border-orange-500/10">
                    <h4 className="text-sm font-bold text-orange-400 mb-2 flex items-center gap-2"><Target className="w-3 h-3" /> Cải thiện</h4>
                    <ul className="space-y-1">
                      {aiOverview.improvements.slice(0, 3).map((s, i) => (
                        <li key={i} className="text-xs text-gray-300 flex items-start gap-2"><span className="text-orange-500">•</span> {s}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="bg-blue-500/5 rounded-xl p-3 border border-blue-500/10 flex gap-3 items-center">
                  <Flame className="w-8 h-8 text-blue-400 flex-shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-blue-300 uppercase mb-1">Lời khuyên</h4>
                    <p className="text-xs text-gray-300 italic">"{aiOverview.recommendation}"</p>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      <section>
        <HabitTracker history={history} />
      </section>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <GlassCard className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400"><Activity className="w-7 h-7" /></div>
          <div><p className="text-gray-400 text-xs uppercase tracking-wider">Tổng buổi tập</p><p className="text-2xl font-bold text-white">{stats.totalWorkouts}</p></div>
        </GlassCard>
        <GlassCard className="flex items-center gap-4">
          <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400"><TrendingUp className="w-7 h-7" /></div>
          <div><p className="text-gray-400 text-xs uppercase tracking-wider">Bài đã tập</p><p className="text-2xl font-bold text-white">{stats.totalExercises}</p></div>
        </GlassCard>
        <GlassCard className="flex items-center gap-4">
          <div className="p-3 bg-orange-500/20 rounded-xl text-orange-400"><Award className="w-7 h-7" /></div>
          <div><p className="text-gray-400 text-xs uppercase tracking-wider">Streak</p><p className="text-2xl font-bold text-white">{stats.streak} <span className="text-sm font-normal text-gray-500">ngày</span></p></div>
        </GlassCard>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <GlassCard title="Hoạt động 7 ngày qua" icon={<CalendarCheck className="w-6 h-6" />}>
          <div className="h-[200px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar dataKey="exercises" radius={[6, 6, 6, 6]} barSize={35}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.exercises > 0 ? 'url(#colorGradient)' : 'rgba(255,255,255,0.05)'} />
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
        <GlassCard title="Xu hướng Macros" icon={<Utensils className="w-6 h-6" />}>
          <div className="h-[200px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }} />
                <Line type="monotone" dataKey="protein" stroke="#22c55e" strokeWidth={2} dot={false} name="Protein" />
                <Line type="monotone" dataKey="carbs" stroke="#3b82f6" strokeWidth={2} dot={false} name="Carbs" />
                <Line type="monotone" dataKey="fat" stroke="#eab308" strokeWidth={2} dot={false} name="Fat" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      {muscleDistribution.length > 0 && (
        <GlassCard title="Phân bố nhóm cơ (Toàn thời gian)" icon={<Activity className="w-6 h-6" />}>
          <div className="mt-4">
            <HumanBodyMuscleMap
              selectedMuscles={(() => {
                const muscleSet = new Set<MuscleGroup>();
                muscleDistribution.forEach(muscle => {
                  if (muscle.name === 'Ngực') { muscleSet.add(MuscleGroup.ChestUpper); muscleSet.add(MuscleGroup.ChestMiddle); muscleSet.add(MuscleGroup.ChestLower); }
                  else if (muscle.name === 'Vai') { muscleSet.add(MuscleGroup.FrontDelts); muscleSet.add(MuscleGroup.SideDelts); muscleSet.add(MuscleGroup.RearDelts); }
                  else if (muscle.name === 'Lưng') { muscleSet.add(MuscleGroup.Lats); muscleSet.add(MuscleGroup.UpperBack); muscleSet.add(MuscleGroup.LowerBack); muscleSet.add(MuscleGroup.Traps); }
                  else if (muscle.name === 'Tay') { muscleSet.add(MuscleGroup.Biceps); muscleSet.add(MuscleGroup.TricepsLong); muscleSet.add(MuscleGroup.TricepsLateral); muscleSet.add(MuscleGroup.Forearms); }
                  else if (muscle.name === 'Chân') { muscleSet.add(MuscleGroup.Quads); muscleSet.add(MuscleGroup.Hamstrings); muscleSet.add(MuscleGroup.Glutes); muscleSet.add(MuscleGroup.Calves); }
                  else if (muscle.name === 'Bụng') { muscleSet.add(MuscleGroup.UpperAbs); muscleSet.add(MuscleGroup.LowerAbs); muscleSet.add(MuscleGroup.Obliques); }
                });
                return Array.from(muscleSet);
              })()}
              onMuscleToggle={() => { }}
              showLabels={false}
              interactive={false}
            />
          </div>
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            {muscleDistribution.map((m, i) => (
              <div key={i} className="bg-white/5 rounded-xl p-3 text-center border border-white/10">
                <div className="w-4 h-4 rounded-full mx-auto mb-2" style={{ backgroundColor: m.color }} />
                <p className="text-xs text-gray-400 mb-1">{m.name}</p>
                <p className="text-lg font-bold text-white">{m.value}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      <GlassCard title="Tiến độ cân nặng" icon={<Weight className="w-5 h-5" />}>
        <div className="flex items-center gap-4 overflow-x-auto pb-2">
          {history.filter(h => h.weight).slice(0, 10).map((h, i) => (
            <div key={i} className="flex-shrink-0 bg-white/5 px-4 py-2 rounded-lg border border-white/10 text-center min-w-[80px]">
              <div className="text-[10px] text-gray-400">{h.date.split(',')[1] || h.date}</div>
              <div className="text-lg font-bold text-cyan-300">{h.weight}kg</div>
            </div>
          ))}
          {history.filter(h => h.weight).length === 0 && (
            <p className="text-gray-500 italic text-sm">Chưa có dữ liệu cân nặng. Hãy hoàn thành buổi tập để ghi nhận.</p>
          )}
        </div>
      </GlassCard>

      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><FileText className="w-5 h-5" /> Danh sách buổi tập</h3>
      {history.length === 0 ? (
        <GlassCard className="text-center py-12">
          <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">Chưa có dữ liệu tập luyện nào.</p>
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {history.map((item) => (
            <GlassCard key={item.timestamp} className="relative group">
              <div className="flex flex-col md:flex-row md:items-start gap-4">
                <div className="flex-shrink-0 flex flex-col items-center gap-3 z-10">
                  <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-3 text-center w-24 shadow-inner shadow-cyan-500/5">
                    <Calendar className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
                    <span className="text-xs text-cyan-200 font-bold block">{item.date}</span>
                    {item.weight && <span className="text-[10px] text-cyan-200/50 block mt-1">{item.weight}kg</span>}
                  </div>
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteRequest(item.timestamp); }}
                    className={`relative flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-bold transition-all duration-200 w-24 group/btn ${confirmingDeleteId === item.timestamp
                      ? 'bg-red-600 text-white border-red-400 shadow-lg shadow-red-600/40 scale-105'
                      : 'text-red-400 bg-red-500/5 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-300'
                      }`}
                    title={confirmingDeleteId === item.timestamp ? "Nhấn lần nữa để xóa" : "Xóa lịch sử ngày này"}
                    type="button"
                  >
                    <Trash2 className={`w-3 h-3 transition-transform ${confirmingDeleteId === item.timestamp ? 'animate-pulse' : 'group-hover/btn:scale-110'}`} />
                    {confirmingDeleteId === item.timestamp ? "Xác nhận?" : "Xóa"}
                  </button>
                </div>

                <div className="flex-grow border-l border-white/5 md:pl-4 md:border-l-0 md:border-t-0 border-t pt-4 md:pt-0 opacity-90">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-lg font-bold text-white">{item.summary}</h3>
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold mt-1 uppercase tracking-wider ${item.levelSelected.includes('Hard') ? 'bg-red-500/20 text-red-300' : item.levelSelected.includes('Medium') ? 'bg-blue-500/20 text-blue-300' : 'bg-green-500/20 text-green-300'}`}>
                        {item.levelSelected}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                    <div className="bg-black/20 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-gray-400 text-xs mb-2 uppercase tracking-wide">
                        <Dumbbell className="w-3 h-3" /> Bài đã hoàn thành
                      </div>
                      {item.exercisesSummary && (
                        <div className="mb-2 text-xs text-cyan-300/80 italic border-b border-white/5 pb-2">
                          {item.exercisesSummary}
                        </div>
                      )}
                      {item.completedExercises && item.completedExercises.length > 0 ? (
                        <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                          {item.completedExercises.map((ex, i) => React.createElement('li', { key: i, className: "truncate" }, ex))}
                        </ul>
                      ) : (
                        <span className="text-sm text-gray-500 italic">Không có bài nào được tích</span>
                      )}
                    </div>

                    {item.nutrition && (
                      <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-3">
                        <div className="flex items-center justify-between text-emerald-400/80 text-xs mb-2 uppercase tracking-wide">
                          <span className="flex items-center gap-2"><Utensils className="w-3 h-3" /> Thực đơn đã lưu</span>
                          {item.nutrition.totalCost && (
                            <div className="flex gap-3">
                              <span className="text-emerald-400 font-bold">{item.nutrition.totalProtein}g Pro</span>
                              <span className="text-blue-400 font-bold">{item.nutrition.totalCarbs || 0}g Carb</span>
                              <span className="text-yellow-400 font-bold">{item.nutrition.totalFat || 0}g Fat</span>
                              <span className="text-yellow-400 font-bold border-l border-white/10 pl-3">{formatCurrency(item.nutrition.totalCost)}</span>
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          {item.nutrition.meals.map((meal, idx) => (
                            <div key={idx} className="text-xs">
                              <span className="font-bold text-emerald-200">{meal.name}:</span> <span className="text-gray-400">{meal.description}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {item.userNotes && (
                    <div className="mt-3 bg-yellow-500/5 border border-yellow-500/10 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-yellow-500/70 text-xs mb-1 uppercase tracking-wide">
                        <FileText className="w-3 h-3" /> Ghi chú
                      </div>
                      <p className="text-sm text-yellow-100/80 italic">"{item.userNotes}"</p>
                    </div>
                  )}
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}


    </div>
  );
};

import React, { useMemo, useState, lazy, Suspense } from 'react';
import { WorkoutHistoryItem, MuscleGroup, UserInput, AIOverview } from '../types';
import { GlassCard } from './ui/GlassCard';
import { Calendar, Dumbbell, FileText, Trophy, Trash2, Utensils, Weight, Activity, TrendingUp, Award, Target, Flame, ChevronDown, ChevronUp, Sparkles, BarChart2, LayoutList, RefreshCw } from 'lucide-react';
import { HabitTracker } from './dashboard/HabitTracker';
import { generateAIOverview } from '../services/geminiService';

// Lazy load the heavy charts component (contains all recharts)
const StatsCharts = lazy(() => import('./ui/StatsCharts'));

interface HistoryViewProps {
  history: WorkoutHistoryItem[];
  onDelete: (timestamp: number) => void;
  userData?: UserInput; // Needed for context
  onRefresh?: () => void;
  isRefreshing?: boolean;
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

export const HistoryView: React.FC<HistoryViewProps> = ({ history, onDelete, userData, onRefresh, isRefreshing }) => {
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null);
  const [showStats, setShowStats] = useState(false);

  const [deleteTimeout, setDeleteTimeout] = useState<NodeJS.Timeout | null>(null);
  const [aiOverview, setAiOverview] = useState<AIOverview | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAIOverview, setShowAIOverview] = useState(false);

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

  const handleDeleteRequest = (timestamp: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent toggling accordion
    if (confirmingDeleteId === timestamp) {
      if (deleteTimeout) clearTimeout(deleteTimeout);
      onDelete(timestamp);
      setConfirmingDeleteId(null);
      setDeleteTimeout(null);
    } else {
      if (deleteTimeout) clearTimeout(deleteTimeout);
      setConfirmingDeleteId(timestamp);
      const timeout = setTimeout(() => {
        setConfirmingDeleteId(null);
        setDeleteTimeout(null);
      }, 3000);
      setDeleteTimeout(timeout);
    }
  };

  const handleAnalyze = async () => {
    if (showAIOverview) {
      setShowAIOverview(false);
      return;
    }
    if (aiOverview) {
      setShowAIOverview(true);
      return;
    }
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

  const toggleExpand = (id: number) => {
    setExpandedItemId(expandedItemId === id ? null : id);
  };

  return (
    <div id="tour-history-calendar" className="space-y-6 animate-fade-in relative pb-8">

      {/* --- HEADER & CONTROLS --- */}
      <div className="flex flex-col gap-4">
        {/* Top Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-purple-900/20 border border-purple-500/20 rounded-2xl p-4 flex flex-col justify-center items-center shadow-lg">
            <Trophy className="w-6 h-6 text-purple-400 mb-2" />
            <span className="text-2xl font-bold text-white">{stats.totalWorkouts}</span>
            <span className="text-[10px] text-purple-300 uppercase tracking-wider">Tổng buổi</span>
          </div>
          <div className="bg-blue-900/20 border border-blue-500/20 rounded-2xl p-4 flex flex-col justify-center items-center shadow-lg">
            <TrendingUp className="w-6 h-6 text-blue-400 mb-2" />
            <span className="text-2xl font-bold text-white">{stats.totalExercises}</span>
            <span className="text-[10px] text-blue-300 uppercase tracking-wider">Bài tập</span>
          </div>
          <div className="bg-orange-900/20 border border-orange-500/20 rounded-2xl p-4 flex flex-col justify-center items-center shadow-lg md:col-span-1">
            <Flame className="w-6 h-6 text-orange-400 mb-2" />
            <span className="text-2xl font-bold text-white">{stats.streak}</span>
            <span className="text-[10px] text-orange-300 uppercase tracking-wider">Ngày Streak</span>
          </div>
          {/* Add AI Button Card */}
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || history.length === 0}
            className={`
                rounded-2xl p-4 flex flex-col justify-center items-center shadow-lg border transition-all
                ${showAIOverview ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-indigo-900/20 border-indigo-500/20 text-indigo-300 hover:bg-indigo-900/40'}
              `}
          >
            {isAnalyzing ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mb-2" />
            ) : (
              <Sparkles className="w-6 h-6 mb-2" />
            )}
            <span className="text-sm font-bold">{showAIOverview ? 'Đóng AI' : 'AI Phân Tích'}</span>
          </button>
        </div>

        {/* Toggle Stats View */}
        <button
          onClick={() => setShowStats(!showStats)}
          className="w-full py-3 flex items-center justify-center gap-2 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all font-medium text-sm"
        >
          {showStats ? <ChevronUp className="w-4 h-4" /> : <BarChart2 className="w-4 h-4" />}
          {showStats ? 'Thu gọn biểu đồ' : 'Xem biểu đồ & thống kê chi tiết'}
        </button>
      </div>

      {/* --- STATS SECTION (Collapsible) --- */}
      {showStats && (
        <Suspense fallback={
          <div className="animate-pulse space-y-4">
            <div className="h-[200px] bg-white/5 rounded-xl" />
            <div className="h-[200px] bg-white/5 rounded-xl" />
          </div>
        }>
          <StatsCharts chartData={chartData} muscleDistribution={muscleDistribution} />
        </Suspense>
      )}

      {/* --- AI OVERVIEW CARD --- */}
      {showAIOverview && aiOverview && (
        <div className="animate-fade-in-down">
          <GlassCard className="!border-indigo-500/50 !bg-indigo-950/40 relative overflow-hidden">
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-indigo-500 rounded-xl text-white shadow-lg shadow-indigo-500/40">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">Phân Tích Thông Minh</h3>
                  <p className="text-sm text-indigo-200">{aiOverview.summary}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-black/20 rounded-xl p-3 border border-indigo-500/20">
                  <div className="text-xs font-bold text-emerald-400 mb-2 uppercase">Điểm mạnh</div>
                  <ul className="space-y-1">
                    {aiOverview.strengths.slice(0, 3).map((s, i) => <li key={i} className="text-xs text-gray-300">• {s}</li>)}
                  </ul>
                </div>
                <div className="bg-black/20 rounded-xl p-3 border border-indigo-500/20">
                  <div className="text-xs font-bold text-orange-400 mb-2 uppercase">Cần cải thiện</div>
                  <ul className="space-y-1">
                    {aiOverview.improvements.slice(0, 3).map((s, i) => <li key={i} className="text-xs text-gray-300">• {s}</li>)}
                  </ul>
                </div>
              </div>
              <div className="bg-indigo-500/10 p-3 rounded-xl border border-indigo-500/20 text-sm text-indigo-100 italic text-center">
                "{aiOverview.recommendation}"
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* --- HISTORY LIST (Accordion) --- */}
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <LayoutList className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-bold text-white">Nhật ký chi tiết</h3>
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50"
              title="Làm mới"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="text-center py-12 opacity-50">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-500" />
            <p className="text-gray-400">Chưa có dữ liệu lịch sử</p>
          </div>
        ) : (
          history.map((item) => {
            const isExpanded = expandedItemId === item.timestamp;
            const isConfirmingDelete = confirmingDeleteId === item.timestamp;

            return (
              <div
                key={item.timestamp}
                className={`
                        border rounded-xl transition-all duration-300 overflow-hidden
                        ${isExpanded
                    ? 'bg-purple-900/10 border-purple-500/30'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }
                     `}
              >
                {/* Summary Header (Always Visible) */}
                <div
                  onClick={() => toggleExpand(item.timestamp)}
                  className="p-4 flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center justify-center p-2 bg-black/30 rounded-lg min-w-[60px]">
                      <span className="text-xs text-gray-400 uppercase">{item.date.split(',')[0]}</span>
                      <span className="text-lg font-bold text-white">{item.date.split('/')[0].split(' ')[1] || item.date.split('/')[0]}</span>
                      <span className="text-[10px] text-gray-500">{item.date.split('/')[1]}/{item.date.split('/')[2]}</span>
                    </div>

                    <div>
                      <h4 className="font-bold text-white text-base md:text-lg">{item.summary}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase
                                    ${item.levelSelected.includes('Hard') ? 'bg-red-500/20 text-red-300' : 'bg-blue-500/20 text-blue-300'}
                                 `}>
                          {item.levelSelected}
                        </span>
                        {item.completedExercises && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Dumbbell className="w-3 h-3" /> {item.completedExercises.length} bài
                          </span>
                        )}
                        {item.weight && (
                          <span className="text-xs text-cyan-300 flex items-center gap-1 ml-2">
                            <Weight className="w-3 h-3" /> {item.weight}kg
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Delete Button */}
                    <button
                      onClick={(e) => handleDeleteRequest(item.timestamp, e)}
                      className={`p-2 rounded-lg transition-all ${isConfirmingDelete ? 'bg-red-600 text-white' : 'text-gray-500 hover:bg-red-500/20 hover:text-red-400'}`}
                      title="Xóa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {/* Expand Icon */}
                    <div className={`p-1 rounded-full transition-transform duration-300 ${isExpanded ? 'rotate-180 bg-white/10' : ''}`}>
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                <div className={`
                        overflow-hidden transition-all duration-300 bg-black/20
                        ${isExpanded ? 'max-h-[1000px] opacity-100 border-t border-white/5' : 'max-h-0 opacity-0'}
                     `}>
                  <div className="p-4 grid md:grid-cols-2 gap-4">
                    {/* Exercises */}
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                        <Dumbbell className="w-3 h-3" /> Chi tiết bài tập
                      </div>
                      <ul className="space-y-1 pl-1">
                        {item.completedExercises && item.completedExercises.length > 0 ? (
                          item.completedExercises.map((ex, idx) => (
                            <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                              <span className="text-blue-500 mt-1.5 w-1 h-1 rounded-full bg-blue-500 flex-shrink-0" />
                              {ex}
                            </li>
                          ))
                        ) : (
                          <li className="text-sm text-gray-500 italic">Không có bài tập nào</li>
                        )}
                      </ul>
                    </div>

                    {/* Nutrition & Notes */}
                    <div className="space-y-4">
                      {item.nutrition && (
                        <div className="bg-emerald-500/5 rounded-xl p-3 border border-emerald-500/10">
                          <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <Utensils className="w-3 h-3" /> Dinh dưỡng
                          </div>
                          <div className="flex gap-4 text-sm mb-2 pb-2 border-b border-white/5">
                            <div className="flex flex-col">
                              <span className="text-[10px] text-gray-400">Calories</span>
                              <span className="font-bold text-white">{item.nutrition.totalCalories}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] text-gray-400">Protein</span>
                              <span className="font-bold text-emerald-400">{item.nutrition.totalProtein}g</span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            {item.nutrition.meals.map((m, i) => (
                              <div key={i} className="text-xs text-gray-400 truncate">
                                <span className="text-emerald-300/80">{m.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {item.userNotes && (
                        <div className="bg-yellow-500/5 rounded-xl p-3 border border-yellow-500/10">
                          <div className="text-xs font-bold text-yellow-500 uppercase tracking-wider mb-1 flex items-center gap-2">
                            <FileText className="w-3 h-3" /> Ghi chú
                          </div>
                          <p className="text-sm text-gray-300 italic">"{item.userNotes}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

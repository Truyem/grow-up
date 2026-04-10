import React, { useMemo, useState, lazy, Suspense, useCallback } from 'react';
import { WorkoutHistoryItem, ExerciseLog, MuscleGroup, UserInput, AIOverview, SleepRecoveryEntry } from '../types';
import { GlassCard } from './ui/GlassCard';
import { ActivityRings } from './ui/ActivityRings';
import { Calendar, Dumbbell, FileText, Trophy, Trash2, Utensils, Weight, Activity, TrendingUp, Award, Target, Flame, ChevronDown, ChevronUp, Sparkles, BarChart2, LayoutList, RefreshCw, ChevronLeft, ChevronRight, Grid3X3 } from 'lucide-react';
import { HabitTracker } from './dashboard/HabitTracker';
import { generateAIOverview } from '../services/geminiService';
import { DEFAULT_SLEEP_HOURS, MAX_SLEEP_HOURS, MIN_SLEEP_HOURS, getSleepQualityLabel } from '../services/sleepRecoveryService';

// Lazy load the heavy charts component (contains all recharts)
const StatsCharts = lazy(() => import('./ui/StatsCharts'));

interface HistoryViewProps {
  history: WorkoutHistoryItem[];
  onDelete: (timestamp: number) => void;
  userData?: UserInput; // Needed for context
  onRefresh?: () => void;
  isRefreshing?: boolean;
  sleepRecovery?: SleepRecoveryEntry[];
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

const WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const MONTH_NAMES = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

// --- RING GOALS ---
const RING_GOALS = {
  exercises: 6,    // ~6 exercises per day
  calories: 2000,  // ~2000 kcal
  protein: 100,    // ~100g protein
};

const SLEEP_GOAL_HOURS = DEFAULT_SLEEP_HOURS;

export const HistoryView: React.FC<HistoryViewProps> = ({ history, onDelete, userData, onRefresh, isRefreshing, sleepRecovery = [] }) => {
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null);
  const [showStats, setShowStats] = useState(false);

  const [deleteTimeout, setDeleteTimeout] = useState<NodeJS.Timeout | null>(null);
  const [aiOverview, setAiOverview] = useState<AIOverview | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAIOverview, setShowAIOverview] = useState(false);

  // Calendar state
  const now = new Date();
  const [calendarDate, setCalendarDate] = useState({ month: now.getMonth(), year: now.getFullYear() });
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // --- Build lookup: dateKey → history item ---
  const historyByDate = useMemo(() => {
    const map = new Map<string, WorkoutHistoryItem>();
    history.forEach(item => {
      const d = new Date(item.timestamp);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      // Keep item with most exercises if duplicates
      const existing = map.get(key);
      if (!existing || (item.completedExercises?.length || 0) > (existing.completedExercises?.length || 0)) {
        map.set(key, item);
      }
    });
    return map;
  }, [history]);

  const sleepByDate = useMemo(() => {
    const map = new Map<string, SleepRecoveryEntry>();
    sleepRecovery.forEach((entry) => {
      const d = new Date(entry.timestamp);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const existing = map.get(key);
      if (!existing || entry.timestamp > existing.timestamp) {
        map.set(key, entry);
      }
    });
    return map;
  }, [sleepRecovery]);

  // --- Calendar grid ---
  const calendarGrid = useMemo(() => {
    const { month, year } = calendarDate;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    // getDay(): 0=Sun, 1=Mon ... 6=Sat
    // We want Mon=0, so shift: (getDay() + 6) % 7
    const startOffset = (firstDay.getDay() + 6) % 7;

    const cells: (number | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    // Pad to complete last row
    while (cells.length % 7 !== 0) cells.push(null);

    return cells;
  }, [calendarDate]);

  // --- Get history item for a day ---
  const getItemForDay = useCallback((day: number) => {
    const key = `${calendarDate.year}-${calendarDate.month}-${day}`;
    return historyByDate.get(key) || null;
  }, [calendarDate, historyByDate]);

  // --- Is today ---
  const isToday = useCallback((day: number) => {
    const t = new Date();
    return day === t.getDate() && calendarDate.month === t.getMonth() && calendarDate.year === t.getFullYear();
  }, [calendarDate]);

  // --- Navigate months ---
  const goMonth = (delta: number) => {
    setCalendarDate(prev => {
      let m = prev.month + delta;
      let y = prev.year;
      if (m < 0) { m = 11; y--; }
      if (m > 11) { m = 0; y++; }
      return { month: m, year: y };
    });
    setSelectedDay(null);
  };

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

  // --- Selected day details ---
  const selectedDayItem = selectedDay ? getItemForDay(selectedDay) : null;

  // --- Items for current month (for list below calendar) ---
  const monthItems = useMemo(() => {
    return history
      .filter(item => {
        const d = new Date(item.timestamp);
        return d.getMonth() === calendarDate.month && d.getFullYear() === calendarDate.year;
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [history, calendarDate]);

  const latestRecovery = useMemo(() => {
    if (!sleepRecovery.length) return null;
    return [...sleepRecovery].sort((a, b) => b.timestamp - a.timestamp)[0];
  }, [sleepRecovery]);

  const sleepStats = useMemo(() => {
    if (!sleepRecovery.length) {
      return {
        averageHours: 0,
        maxHours: 0,
        minHours: 0,
        totalEntries: 0,
        goodNights: 0,
      };
    }

    const totalHours = sleepRecovery.reduce((sum, item) => sum + item.sleepHours, 0);
    const averageHours = Number((totalHours / sleepRecovery.length).toFixed(1));
    const maxHours = Number(Math.max(...sleepRecovery.map((item) => item.sleepHours)).toFixed(1));
    const minHours = Number(Math.min(...sleepRecovery.map((item) => item.sleepHours)).toFixed(1));
    const goodNights = sleepRecovery.filter((item) => item.sleepQuality === 'good').length;

    return {
      averageHours,
      maxHours,
      minHours,
      totalEntries: sleepRecovery.length,
      goodNights,
    };
  }, [sleepRecovery]);

  return (
    <div id="tour-history-calendar" className="space-y-6 animate-fade-in relative pb-8">

      {/* --- HEADER & CONTROLS --- */}
      <div className="flex flex-col gap-4">
        <div className="bg-indigo-900/20 border border-indigo-500/20 rounded-2xl p-3 space-y-3 text-xs">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-indigo-300 uppercase tracking-wide">Thống kê giấc ngủ</div>
              <div className="text-gray-400">
                Mục tiêu vòng ngủ: {SLEEP_GOAL_HOURS}h (giới hạn {MIN_SLEEP_HOURS}h - {MAX_SLEEP_HOURS}h)
              </div>
            </div>
            {latestRecovery && (
              <div className="text-right text-gray-300">
                <div>Gần nhất: {latestRecovery.sleepHours}h</div>
                <div>{latestRecovery.date}</div>
              </div>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-indigo-200/80 border-b border-indigo-500/20">
                  <th className="py-1 pr-2 font-semibold">Chỉ số</th>
                  <th className="py-1 pr-2 font-semibold">Giá trị</th>
                </tr>
              </thead>
              <tbody className="text-white/90">
                <tr className="border-b border-white/5">
                  <td className="py-1 pr-2">Số bản ghi</td>
                  <td className="py-1 pr-2">{sleepStats.totalEntries}</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-1 pr-2">Trung bình</td>
                  <td className="py-1 pr-2">{sleepStats.totalEntries ? `${sleepStats.averageHours}h` : '--'}</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-1 pr-2">Cao nhất</td>
                  <td className="py-1 pr-2">{sleepStats.totalEntries ? `${sleepStats.maxHours}h` : '--'}</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-1 pr-2">Thấp nhất</td>
                  <td className="py-1 pr-2">{sleepStats.totalEntries ? `${sleepStats.minHours}h` : '--'}</td>
                </tr>
                <tr>
                  <td className="py-1 pr-2">Đêm ngủ tốt</td>
                  <td className="py-1 pr-2">{sleepStats.goodNights}/{sleepStats.totalEntries}</td>
                </tr>
              </tbody>
            </table>
          </div>
          {latestRecovery && (
            <div className="text-indigo-100 bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-2.5 py-2">
              Chất lượng gần nhất: <span className="font-semibold">{getSleepQualityLabel(latestRecovery.sleepQuality)}</span>
            </div>
          )}
        </div>
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
            <span className="text-sm font-bold">{showAIOverview ? 'Đóng AI' : 'Nemotron Phân Tích'}</span>
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
          <StatsCharts chartData={chartData} muscleDistribution={muscleDistribution} history={history} userData={userData} />
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
              <div className="bg-black/20 rounded-xl p-3 border border-indigo-500/20">
                <div className="text-xs font-bold text-indigo-300 mb-2 uppercase">Chỉ số 7 ngày</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  <div className="bg-black/30 rounded-lg p-2">
                    <div className="text-gray-400">Buổi tập</div>
                    <div className="text-white font-bold">{aiOverview.weeklyStats.workoutsCompleted}</div>
                  </div>
                  <div className="bg-black/30 rounded-lg p-2">
                    <div className="text-gray-400">Ngày active</div>
                    <div className="text-white font-bold">{aiOverview.weeklyStats.activeDays}/7</div>
                  </div>
                  <div className="bg-black/30 rounded-lg p-2">
                    <div className="text-gray-400">Consistency</div>
                    <div className="text-white font-bold">{aiOverview.weeklyStats.consistency}%</div>
                  </div>
                  <div className="bg-black/30 rounded-lg p-2">
                    <div className="text-gray-400">Tổng bài tập</div>
                    <div className="text-white font-bold">{aiOverview.weeklyStats.totalExercises}</div>
                  </div>
                  <div className="bg-black/30 rounded-lg p-2">
                    <div className="text-gray-400">TB bài/buổi</div>
                    <div className="text-white font-bold">{aiOverview.weeklyStats.avgExercisesPerWorkout}</div>
                  </div>
                  <div className="bg-black/30 rounded-lg p-2">
                    <div className="text-gray-400">Calo đốt ước tính</div>
                    <div className="text-white font-bold">{aiOverview.weeklyStats.estimatedCaloriesBurned}</div>
                  </div>
                  <div className="bg-black/30 rounded-lg p-2">
                    <div className="text-gray-400">Tổng volume</div>
                    <div className="text-white font-bold">{aiOverview.weeklyStats.totalVolumeKg.toLocaleString()} kg</div>
                  </div>
                  <div className="bg-black/30 rounded-lg p-2">
                    <div className="text-gray-400">TB volume/buổi</div>
                    <div className="text-white font-bold">{aiOverview.weeklyStats.averageVolumePerWorkout.toLocaleString()} kg</div>
                  </div>
                  <div className="bg-black/30 rounded-lg p-2">
                    <div className="text-gray-400">TB calo/ngày</div>
                    <div className="text-white font-bold">{aiOverview.weeklyStats.averageCaloriesPerDay}</div>
                  </div>
                  <div className="bg-black/30 rounded-lg p-2">
                    <div className="text-gray-400">TB protein/ngày</div>
                    <div className="text-white font-bold">{aiOverview.weeklyStats.averageProteinPerDay} g</div>
                  </div>
                  <div className="bg-black/30 rounded-lg p-2">
                    <div className="text-gray-400">TB giấc ngủ</div>
                    <div className="text-white font-bold">{aiOverview.weeklyStats.averageSleepHours} h</div>
                  </div>
                  <div className="bg-black/30 rounded-lg p-2">
                    <div className="text-gray-400">Xu hướng cân nặng</div>
                    <div className={`font-bold ${aiOverview.weeklyStats.weightTrendKg > 0 ? 'text-emerald-400' : aiOverview.weeklyStats.weightTrendKg < 0 ? 'text-orange-400' : 'text-white'}`}>
                      {aiOverview.weeklyStats.weightTrendKg > 0 ? '+' : ''}{aiOverview.weeklyStats.weightTrendKg} kg
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* ============================== */}
      {/* --- ACTIVITY RINGS CALENDAR --- */}
      {/* ============================== */}
      <div className="bg-black/40 border border-white/10 rounded-2xl overflow-hidden">
        {/* Calendar Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <button
            onClick={() => goMonth(-1)}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h3 className="text-lg font-bold text-white">
            {MONTH_NAMES[calendarDate.month]} {calendarDate.year !== now.getFullYear() ? calendarDate.year : ''}
          </h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => goMonth(1)}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Ring Legend */}
        <div className="flex items-center justify-center gap-4 px-4 py-2 border-b border-white/5">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#fa114f]" />
            <span className="text-[10px] text-gray-400">Bài tập</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#92e82a]" />
            <span className="text-[10px] text-gray-400">Calories</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#00d4aa]" />
            <span className="text-[10px] text-gray-400">Protein</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#60a5fa]" />
            <span className="text-[10px] text-gray-400">Giấc ngủ</span>
          </div>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 px-2 pt-2">
          {WEEKDAY_LABELS.map(d => (
            <div key={d} className="text-center text-[10px] font-semibold text-gray-500 uppercase py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 px-2 pb-3">
          {calendarGrid.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="p-1" />;
            }

            const item = getItemForDay(day);
            const today = isToday(day);
            const isSelected = selectedDay === day;

            // Calculate ring progress
            const exercisesCount = item?.completedExercises?.length || 0;
            const calories = item?.nutrition?.totalCalories || 0;
            const protein = item?.nutrition?.totalProtein || 0;

            const moveProgress = exercisesCount / RING_GOALS.exercises;
            const exerciseProgress = calories / RING_GOALS.calories;
            const standProgress = protein / RING_GOALS.protein;
            const sleepEntry = sleepByDate.get(`${calendarDate.year}-${calendarDate.month}-${day}`);
            const sleepProgress = (sleepEntry?.sleepHours || 0) / SLEEP_GOAL_HOURS;

            // Check if day is in the future
            const dayDate = new Date(calendarDate.year, calendarDate.month, day);
            const isFuture = dayDate > new Date();

            return (
              <div
                key={`day-${day}`}
                onClick={() => item && setSelectedDay(isSelected ? null : day)}
                className={`
                  flex flex-col items-center py-1.5 rounded-xl transition-all cursor-pointer
                  ${isSelected ? 'bg-white/10 ring-1 ring-purple-500/50' : ''}
                  ${today ? 'bg-white/5' : ''}
                  ${item ? 'hover:bg-white/5' : 'opacity-60'}
                `}
              >
                <span className={`text-[11px] mb-0.5 font-medium ${today ? 'text-purple-400' : isSelected ? 'text-white' : 'text-gray-400'}`}>
                  {day}
                </span>
                {isFuture ? (
                  <div className="w-[36px] h-[36px]" />
                ) : (
                  <ActivityRings
                    move={moveProgress}
                    exercise={exerciseProgress}
                    stand={standProgress}
                    sleep={sleepProgress}
                    size={36}
                    isToday={today}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Selected Day Detail Card */}
        {selectedDay && selectedDayItem && (
          <div className="px-3 pb-3 animate-fade-in">
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-sm">
                    {selectedDay}/{calendarDate.month + 1} — {selectedDayItem.summary}
                  </h4>
                  <div className="flex flex-wrap gap-2 items-center mt-1">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase
                      ${selectedDayItem.levelSelected.includes('Hard') ? 'bg-red-500/20 text-red-300' : 'bg-blue-500/20 text-blue-300'}
                    `}>
                      {selectedDayItem.levelSelected}
                    </span>
                    {selectedDayItem.weight && userData?.height && (
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300">
                        {selectedDayItem.weight} kg (BMI: {(selectedDayItem.weight / Math.pow(userData.height / 100, 2)).toFixed(1)})
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => handleDeleteRequest(selectedDayItem.timestamp, e)}
                  className={`p-2 rounded-lg transition-all ${confirmingDeleteId === selectedDayItem.timestamp ? 'bg-red-600 text-white' : 'text-gray-500 hover:bg-red-500/20 hover:text-red-400'}`}
                  title="Xóa"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Ring Stats */}
              <div className="grid grid-cols-6 gap-2 mt-2">
                <div className="text-center bg-black/30 rounded-lg p-2">
                  <div className="text-[10px] text-[#fa114f] font-bold">Bài tập</div>
                  <div className="text-sm font-bold text-white">{selectedDayItem.completedExercises?.length || 0}</div>
                </div>
                <div className="text-center bg-black/30 rounded-lg p-2">
                  <div className="text-[10px] text-[#92e82a] font-bold">Calories</div>
                  <div className="text-sm font-bold text-white">{selectedDayItem.nutrition?.totalCalories || 0}</div>
                </div>
                <div className="text-center bg-black/30 rounded-lg p-2">
                  <div className="text-[10px] text-[#00d4aa] font-bold">Protein</div>
                  <div className="text-sm font-bold text-white">{selectedDayItem.nutrition?.totalProtein || 0}g</div>
                </div>
                <div className="text-center bg-black/30 rounded-lg p-2">
                  <div className="text-[10px] text-orange-400 font-bold">Carbs</div>
                  <div className="text-sm font-bold text-white">{selectedDayItem.nutrition?.totalCarbs || 0}g</div>
                </div>
                <div className="text-center bg-black/30 rounded-lg p-2">
                  <div className="text-[10px] text-yellow-400 font-bold">Fat</div>
                  <div className="text-sm font-bold text-white">{selectedDayItem.nutrition?.totalFat || 0}g</div>
                </div>
                <div className="text-center bg-black/30 rounded-lg p-2 col-span-2">
                  <div className="text-[10px] text-[#60a5fa] font-bold">Gic ng</div>
                  <div className="text-sm font-bold text-white">
                    {(() => {
                      const sleep = sleepByDate.get(`${calendarDate.year}-${calendarDate.month}-${selectedDay}`);
                      if (sleep && sleep.sleepStart && sleep.sleepEnd) {
                        return `${sleep.sleepStart} - ${sleep.sleepEnd} (${sleep.sleepHours}h)`;
                      }
                      return `${sleep?.sleepHours || 0}h`;
                    })()}
                  </div>
                </div>
              </div>

              {/* Two-column: Meals (left) + Exercises (right) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                {/* LEFT: Meals */}
                <div className="bg-black/20 rounded-xl p-2.5 border border-emerald-500/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Utensils className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[10px] font-bold text-emerald-400 uppercase">Thực đơn</span>
                  </div>
                  {selectedDayItem.nutrition?.meals && selectedDayItem.nutrition.meals.length > 0 ? (
                    <ul className="space-y-1.5">
                      {selectedDayItem.nutrition.meals.map((meal, i) => (
                        <li key={i} className="bg-black/20 rounded-lg px-2 py-1.5">
                          <div className="flex items-start justify-between gap-1">
                            <span className="text-[11px] font-semibold text-white leading-tight">{meal.name}</span>
                            <span className="text-[9px] text-emerald-300 whitespace-nowrap">{meal.calories} kcal</span>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">{meal.description}</p>
                          <div className="flex gap-2 mt-0.5">
                            <span className="text-[9px] text-[#00d4aa]">P: {meal.protein}g</span>
                            {meal.carbs != null && <span className="text-[9px] text-orange-400">C: {meal.carbs}g</span>}
                            {meal.fat != null && <span className="text-[9px] text-yellow-400">F: {meal.fat}g</span>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[10px] text-gray-500 italic">Chưa có thực đơn</p>
                  )}
                </div>

                {/* RIGHT: Exercises */}
                <div className="bg-black/20 rounded-xl p-2.5 border border-blue-500/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Dumbbell className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-[10px] font-bold text-blue-400 uppercase">Bài tập</span>
                  </div>
                  {selectedDayItem.completedExercises && selectedDayItem.completedExercises.length > 0 ? (
                    <ul className="space-y-0.5">
                      {selectedDayItem.completedExercises.map((ex, i) => (
                        <li key={i} className="text-xs text-gray-300 flex items-start gap-1.5">
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-blue-500 flex-shrink-0" />
                          {ex}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[10px] text-gray-500 italic">Chưa tập</p>
                  )}
                </div>
              </div>

              {/* SCHEDULE SECTION (FULL WIDTH BELOW) */}
              {selectedDayItem.completedSchedule && selectedDayItem.completedSchedule.length > 0 && (
                <div className="bg-black/20 rounded-xl p-2.5 border border-purple-500/10 mt-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Calendar className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-[10px] font-bold text-purple-400 uppercase">Lịch trình đã hoàn thành ({selectedDayItem.completedSchedule.length}/26)</span>
                  </div>
                  <ul className="space-y-0.5 mt-1 grid grid-cols-1 sm:grid-cols-2 gap-x-2">
                    {selectedDayItem.completedSchedule.map((text, i) => (
                      <li key={i} className="text-[11px] text-gray-300 flex items-start gap-1.5">
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-purple-500 flex-shrink-0" />
                        {text}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Weight Tracking Section */}
              {selectedDayItem.exerciseLogs && selectedDayItem.exerciseLogs.length > 0 && (
                <div className="bg-black/30 rounded-xl p-2.5 border border-blue-500/10 mt-2">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Weight className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-[10px] font-bold text-blue-400 uppercase">Tracking Tạ</span>
                  </div>
                  <div className="space-y-2">
                    {selectedDayItem.exerciseLogs.map((log: ExerciseLog, logIdx: number) => {
                      // Progressive overload detection
                      const previousLogs = history
                        .filter(h => h.timestamp < selectedDayItem.timestamp && h.exerciseLogs)
                        .sort((a, b) => b.timestamp - a.timestamp)
                        .flatMap(h => h.exerciseLogs || [])
                        .filter((l: ExerciseLog) => l.exerciseName === log.exerciseName);
                      const prevLog = previousLogs.length > 0 ? previousLogs[0] : null;
                      const prevMaxWeight = prevLog ? Math.max(...prevLog.sets.map(s => s.weight)) : 0;
                      const currMaxWeight = Math.max(...log.sets.map(s => s.weight));
                      const weightUp = prevLog && currMaxWeight > prevMaxWeight;
                      const volumeUp = prevLog && log.totalVolume > prevLog.totalVolume;

                      return (
                        <div key={logIdx} className="bg-black/20 rounded-lg p-2">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] font-bold text-white">{log.exerciseName}</span>
                            <div className="flex items-center gap-1">
                              {weightUp && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">📈 +Kg</span>}
                              {volumeUp && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-bold">💪 +Vol</span>}
                              {prevLog && !weightUp && !volumeUp && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-500/20 text-gray-400 font-bold">➖ Giữ</span>}
                            </div>
                          </div>
                          <div className="grid grid-cols-[24px_1fr_1fr_1fr] gap-1 text-[9px] text-gray-500 font-bold uppercase mb-1">
                            <span>#</span>
                            <span>Kg</span>
                            <span>Reps</span>
                            <span>Vol</span>
                          </div>
                          {log.sets.map((set, sIdx) => (
                            <div key={sIdx} className="grid grid-cols-[24px_1fr_1fr_1fr] gap-1 text-[11px] text-gray-300">
                              <span className="text-gray-500">{sIdx + 1}</span>
                              <span>{set.weight}kg</span>
                              <span>{set.reps}</span>
                              <span className="text-emerald-400">{(set.weight * set.reps).toLocaleString()}</span>
                            </div>
                          ))}
                          <div className="mt-1 pt-1 border-t border-white/5 text-[10px] font-bold text-emerald-400 text-right">
                            Tổng Volume: {log.totalVolume.toLocaleString()} kg
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

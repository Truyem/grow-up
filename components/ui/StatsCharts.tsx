import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, YAxis, CartesianGrid, Area, AreaChart } from 'recharts';
import { Activity, Utensils, TrendingUp, Dumbbell, ChevronDown, ChevronUp } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { HumanBodyMuscleMap } from './HumanBodyMuscleMap';
import { MuscleGroup, WorkoutHistoryItem, ExerciseLog, UserInput } from '../../types';

interface ChartData {
    name: string;
    exercises: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
}

interface MuscleData {
    name: string;
    value: number;
    color: string;
}

interface StatsChartsProps {
    chartData: ChartData[];
    muscleDistribution: MuscleData[];
    history?: WorkoutHistoryItem[]; // Added history prop
    userData?: UserInput; // Added userData prop
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-black/90 border border-white/10 p-3 rounded-xl shadow-xl backdrop-blur-md">
                <p className="text-cyan-300 font-bold mb-1">{label}</p>
                {data.exercises !== undefined && <p className="text-white text-sm">Bài tập: {data.exercises}</p>}
                {data.calories > 0 && <p className="text-orange-400 text-xs">Calories: {data.calories} kcal</p>}
                {data.protein > 0 && <p className="text-emerald-400 text-xs">Protein: {data.protein}g</p>}

                {/* For Weight Tracking Charts */}
                {data.volume !== undefined && <p className="text-emerald-400 text-xs">Volume: {data.volume.toLocaleString()} kg</p>}
                {data.maxWeight !== undefined && <p className="text-cyan-400 text-xs">Max Weight: {data.maxWeight} kg</p>}
                
                {/* For Body Metrics Chart */}
                {data.weight !== undefined && <p className="text-purple-400 text-xs">Cân nặng: {data.weight} kg</p>}
                {data.bmi !== undefined && <p className="text-pink-400 text-xs">BMI: {data.bmi}</p>}
            </div>
        );
    }
    return null;
};

export const StatsCharts: React.FC<StatsChartsProps> = ({ chartData, muscleDistribution, history = [], userData }) => {
    const [expandedExercise, setExpandedExercise] = useState<string | null>(null);

    // Process history data for body metrics chart
    const bodyMetricsData = useMemo(() => {
        if (!history || history.length === 0 || !userData?.height) return [];

        const sortedHistory = [...history]
            .filter(item => item.weight)
            .sort((a, b) => a.timestamp - b.timestamp);

        // Map to daily metrics
        const metricsMap = new Map<string, { date: string, timestamp: number, weight: number, bmi: number }>();
        
        sortedHistory.forEach(item => {
            if (item.weight) {
                const d = new Date(item.timestamp);
                const dateStr = `${d.getDate()}/${d.getMonth() + 1}`;
                const bmi = item.weight / Math.pow(userData.height / 100, 2);
                
                // Overwrite so we keep the latest on that day
                metricsMap.set(dateStr, {
                    date: dateStr,
                    timestamp: item.timestamp,
                    weight: item.weight,
                    bmi: Number(bmi.toFixed(1))
                });
            }
        });

        return Array.from(metricsMap.values());
    }, [history, userData]);

    // Process history data for weight tracking charts
    const exerciseTrends = useMemo(() => {
        if (!history || history.length === 0) return [];

        const exerciseMap = new Map<string, { date: string; timestamp: number; volume: number; maxWeight: number }[]>();

        // Sort history by date ascending
        const sortedHistory = [...history].sort((a, b) => a.timestamp - b.timestamp);

        sortedHistory.forEach(item => {
            if (item.exerciseLogs) {
                item.exerciseLogs.forEach(log => {
                    if (!exerciseMap.has(log.exerciseName)) {
                        exerciseMap.set(log.exerciseName, []);
                    }

                    const d = new Date(item.timestamp);
                    exerciseMap.get(log.exerciseName)?.push({
                        date: `${d.getDate()}/${d.getMonth() + 1}`,
                        timestamp: item.timestamp,
                        volume: log.totalVolume,
                        maxWeight: Math.max(...log.sets.map(s => s.weight))
                    });
                });
            }
        });

        // Convert map to array and filter out exercises with less than 2 data points
        return Array.from(exerciseMap.entries())
            .map(([name, data]) => ({ name, data }))
            .filter(item => item.data.length >= 1)
            .sort((a, b) => b.data[b.data.length - 1].timestamp - a.data[a.data.length - 1].timestamp); // Sort by most recent activity
    }, [history]);

    return (
        <div className="animate-fade-in-down space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
                <GlassCard title="Hoạt động 7 ngày" icon={<Activity className="w-5 h-5" />}>
                    <div className="h-[180px] w-full mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} dy={5} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                                <Bar dataKey="exercises" radius={[4, 4, 4, 4]} barSize={20}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.exercises > 0 ? 'url(#purpleGradient)' : 'rgba(255,255,255,0.05)'} />
                                    ))}
                                </Bar>
                                <defs>
                                    <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#c084fc" stopOpacity={1} />
                                        <stop offset="100%" stopColor="#7e22ce" stopOpacity={0.8} />
                                    </linearGradient>
                                </defs>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </GlassCard>

                <GlassCard title="Biểu đồ dinh dưỡng" icon={<Utensils className="w-5 h-5" />}>
                    <div className="h-[180px] w-full mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }} />
                                <Line type="monotone" dataKey="protein" stroke="#22c55e" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="carbs" stroke="#3b82f6" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </GlassCard>
            </div>

            {/* BODY METRICS CHART */}
            {bodyMetricsData.length > 0 && (
                <GlassCard title="Chỉ số cơ thể (Cân nặng & BMI)" icon={<Activity className="w-5 h-5" />}>
                    <div className="h-[250px] w-full mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={bodyMetricsData}>
                                <defs>
                                    <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#c084fc" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#c084fc" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorBmi" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f472b6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#f472b6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} dy={5} />
                                <YAxis yAxisId="left" domain={['auto', 'auto']} stroke="#c084fc" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis yAxisId="right" orientation="right" domain={['auto', 'auto']} stroke="#f472b6" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
                                <Area yAxisId="left" type="monotone" dataKey="weight" name="Cân nặng" stroke="#c084fc" fillOpacity={1} fill="url(#colorWeight)" strokeWidth={2} />
                                <Area yAxisId="right" type="monotone" dataKey="bmi" name="BMI" stroke="#f472b6" fillOpacity={1} fill="url(#colorBmi)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-6 mt-2 text-[10px]">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-purple-400" />
                            <span className="text-gray-400">Cân nặng (kg)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-pink-400" />
                            <span className="text-gray-400">BMI</span>
                        </div>
                    </div>
                </GlassCard>
            )}

            {muscleDistribution.length > 0 && (
                <GlassCard title="Bản đồ cơ bắp" icon={<Activity className="w-5 h-5" />}>
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="w-full md:w-1/2 flex justify-center">
                            <div className="scale-75 origin-top">
                                <HumanBodyMuscleMap
                                    selectedMuscles={(() => {
                                        const muscleSet = new Set<MuscleGroup>();
                                        muscleDistribution.forEach(muscle => {
                                            if (muscle.name === 'Ngực') { muscleSet.add(MuscleGroup.Chest); }
                                            else if (muscle.name === 'Vai') { muscleSet.add(MuscleGroup.FrontDelts); muscleSet.add(MuscleGroup.SideDelts); muscleSet.add(MuscleGroup.RearDelts); }
                                            else if (muscle.name === 'Lưng') { muscleSet.add(MuscleGroup.Lats); muscleSet.add(MuscleGroup.UpperBack); muscleSet.add(MuscleGroup.LowerBack); muscleSet.add(MuscleGroup.Traps); }
                                            else if (muscle.name === 'Tay') { muscleSet.add(MuscleGroup.Biceps); muscleSet.add(MuscleGroup.TricepsLong); muscleSet.add(MuscleGroup.TricepsLateral); muscleSet.add(MuscleGroup.Forearms); }
                                            else if (muscle.name === 'Chân') { muscleSet.add(MuscleGroup.Quads); muscleSet.add(MuscleGroup.Hamstrings); muscleSet.add(MuscleGroup.Glutes); muscleSet.add(MuscleGroup.Calves); }
                                        });
                                        return Array.from(muscleSet);
                                    })()}
                                    onMuscleToggle={() => { }}
                                    showLabels={false}
                                    interactive={false}
                                />
                            </div>
                        </div>
                        <div className="w-full md:w-1/2 grid grid-cols-2 gap-3">
                            {muscleDistribution.map((m, i) => (
                                <div key={i} className="bg-white/5 rounded-lg p-2 flex items-center gap-3 border border-white/5">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: m.color }} />
                                    <div>
                                        <div className="text-xs text-gray-400">{m.name}</div>
                                        <div className="font-bold text-white">{m.value}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </GlassCard>
            )}

            {/* WEIGHT TRACKING CHARTS */}
            {exerciseTrends.length > 0 && (
                <GlassCard title="Tiến bộ bài tập (Tracking Tạ)" icon={<TrendingUp className="w-5 h-5" />}>
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {exerciseTrends.map((exercise, index) => {
                            const isExpanded = expandedExercise === exercise.name;
                            const first = exercise.data[0];
                            const last = exercise.data[exercise.data.length - 1];
                            const volChange = last.volume - first.volume;
                            const wtChange = last.maxWeight - first.maxWeight;

                            return (
                                <div key={index} className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                                    <button
                                        onClick={() => setExpandedExercise(isExpanded ? null : exercise.name)}
                                        className="w-full p-3 flex items-center justify-between hover:bg-white/5 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                                                <Dumbbell className="w-4 h-4" />
                                            </div>
                                            <div className="text-left">
                                                <div className="text-sm font-bold text-white">{exercise.name}</div>
                                                <div className="flex gap-3 text-[10px]">
                                                    <span className={volChange >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                                                        Vol: {volChange >= 0 ? '+' : ''}{volChange.toLocaleString()}
                                                    </span>
                                                    <span className={wtChange >= 0 ? 'text-cyan-400' : 'text-red-400'}>
                                                        Max: {wtChange >= 0 ? '+' : ''}{wtChange}kg
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                                    </button>

                                    {isExpanded && (
                                        <div className="p-3 pt-0 border-t border-white/5 animate-fade-in">
                                            <div className="h-[200px] w-full mt-4">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <AreaChart data={exercise.data}>
                                                        <defs>
                                                            <linearGradient id={`vol-${index}`} x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                                                                <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                                                            </linearGradient>
                                                            <linearGradient id={`wt-${index}`} x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                                                                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                                                            </linearGradient>
                                                        </defs>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} dy={5} />
                                                        <YAxis yAxisId="left" stroke="#34d399" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `${val / 1000}k`} />
                                                        <YAxis yAxisId="right" orientation="right" stroke="#22d3ee" fontSize={10} tickLine={false} axisLine={false} />
                                                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
                                                        <Area yAxisId="left" type="monotone" dataKey="volume" stroke="#34d399" fillOpacity={1} fill={`url(#vol-${index})`} strokeWidth={2} name="Volume" />
                                                        <Area yAxisId="right" type="monotone" dataKey="maxWeight" stroke="#22d3ee" fillOpacity={1} fill={`url(#wt-${index})`} strokeWidth={2} name="Max Weight" />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            </div>
                                            <div className="flex justify-center gap-6 mt-2 text-[10px]">
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                                                    <span className="text-gray-400">Total Volume (Trục trái)</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-2 h-2 rounded-full bg-cyan-400" />
                                                    <span className="text-gray-400">Max Weight (Trục phải)</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </GlassCard>
            )}
        </div>
    );
};

export default StatsCharts;
import React from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from 'recharts';
import { Activity, Utensils } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { HumanBodyMuscleMap } from './HumanBodyMuscleMap';
import { MuscleGroup } from '../../types';

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
}

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

export const StatsCharts: React.FC<StatsChartsProps> = ({ chartData, muscleDistribution }) => {
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

            {muscleDistribution.length > 0 && (
                <GlassCard title="Bản đồ cơ bắp" icon={<Activity className="w-5 h-5" />}>
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="w-full md:w-1/2 flex justify-center">
                            <div className="scale-75 origin-top">
                                <HumanBodyMuscleMap
                                    selectedMuscles={(() => {
                                        const muscleSet = new Set<MuscleGroup>();
                                        muscleDistribution.forEach(muscle => {
                                            if (muscle.name === 'Ngực') { muscleSet.add(MuscleGroup.ChestUpper); muscleSet.add(MuscleGroup.ChestMiddle); muscleSet.add(MuscleGroup.ChestLower); }
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
        </div>
    );
};

export default StatsCharts;

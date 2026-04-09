import React, { useMemo } from 'react';
import { UserInput, Intensity } from '../../types';
import { computeBodyMetrics, formatNumber } from '../../services/bodyMetrics';
import { Activity, Flame, Droplets, TrendingUp } from 'lucide-react';

interface BodyMetricsCardProps {
    userData: UserInput;
}

export const BodyMetricsCard: React.FC<BodyMetricsCardProps> = ({ userData }) => {
    const metrics = useMemo(() => {
        if (!userData.weight || !userData.height || !userData.age) return null;
        return computeBodyMetrics(
            userData.weight,
            userData.height,
            userData.age,
            userData.selectedIntensity,
            userData.nutritionGoal,
        );
    }, [userData.weight, userData.height, userData.age, userData.selectedIntensity, userData.nutritionGoal]);

    if (!metrics) return null;

    const MetricBox = ({
        label, value, unit, sub, color, icon,
    }: {
        label: string; value: string | number; unit: string; sub?: string; color: string; icon: React.ReactNode;
    }) => (
        <div className="flex flex-col gap-1 p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <span style={{ color }} className="opacity-80">{icon}</span>
                <span>{label}</span>
            </div>
            <div className="flex items-end gap-1">
                <span className="text-xl font-bold text-white">{value}</span>
                <span className="text-xs text-gray-400 mb-0.5">{unit}</span>
            </div>
            {sub && <span className="text-[10px] text-gray-500 leading-tight">{sub}</span>}
        </div>
    );

    return (
        <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-md p-4 space-y-3">
            {/* Header */}
            <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-semibold text-cyan-300 uppercase tracking-wide">Chỉ Số Cơ Thể</span>
                <span className="ml-auto text-[10px] text-gray-500 italic">Cập nhật tức thì</span>
            </div>

            {/* BMI - full width highlight */}
            <div
                className="flex items-center justify-between p-3 rounded-2xl border"
                style={{
                    borderColor: metrics.bmiColor + '40',
                    backgroundColor: metrics.bmiColor + '15',
                }}
            >
                <div>
                    <p className="text-xs text-gray-400 mb-1">BMI (Chỉ số khối cơ thể)</p>
                    <div className="flex items-end gap-2">
                        <span className="text-3xl font-black text-white">{metrics.bmi}</span>
                        <span
                            className="text-sm font-bold mb-1 px-2 py-0.5 rounded-full"
                            style={{ color: metrics.bmiColor, backgroundColor: metrics.bmiColor + '25' }}
                        >
                            {metrics.bmiCategory}
                        </span>
                    </div>
                </div>
                {/* BMI visual gauge */}
                <div className="w-16 h-16 flex items-center justify-center">
                    <svg viewBox="0 0 36 36" className="w-full h-full">
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                        <circle
                            cx="18" cy="18" r="15.9" fill="none"
                            stroke={metrics.bmiColor}
                            strokeWidth="3"
                            strokeDasharray={`${Math.min(100, Math.max(0, ((metrics.bmi - 10) / 30) * 100))} 100`}
                            strokeLinecap="round"
                            transform="rotate(-90 18 18)"
                            className="transition-all duration-700"
                        />
                        <text x="18" y="21" textAnchor="middle" className="text-[7px]" fill="white" fontSize="6" fontWeight="bold">
                            {metrics.bmi}
                        </text>
                    </svg>
                </div>
            </div>

            {/* Grid of metrics */}
            <div className="grid grid-cols-3 gap-2">
                <MetricBox
                    label="BMR"
                    value={formatNumber(metrics.bmr)}
                    unit="kcal"
                    sub="Năng lượng nghỉ ngơi"
                    color="#f97316"
                    icon={<Flame className="w-3 h-3" />}
                />
                <MetricBox
                    label="TDEE"
                    value={formatNumber(metrics.tdee)}
                    unit="kcal"
                    sub={metrics.tdeeDescription}
                    color="#ef4444"
                    icon={<Flame className="w-3 h-3" />}
                />
                <MetricBox
                    label={userData.nutritionGoal === 'bulking' ? 'Mục tiêu (+10%)' : 'Mục tiêu (-15%)'}
                    value={formatNumber(metrics.recommendedCalories)}
                    unit="kcal"
                    sub={userData.nutritionGoal === 'bulking' ? 'Tăng cân (Bulking)' : 'Giảm cân (Cutting)'}
                    color={userData.nutritionGoal === 'bulking' ? '#22c55e' : '#eab308'}
                    icon={<TrendingUp className="w-3 h-3" />}
                />
            </div>

            {/* Protein & Water row */}
            <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                    <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C9.33 5.47 5 10.45 5 14a7 7 0 0014 0c0-3.55-4.33-8.53-7-12z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-400">Protein mục tiêu</p>
                        <p className="text-lg font-bold text-white">{metrics.recommendedProtein}<span className="text-xs text-gray-400 ml-1">g/ngày</span></p>
                    </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
                    <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
                        <Droplets className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-400">Nước uống mục tiêu</p>
                        <p className="text-lg font-bold text-white">{(metrics.hydrationGoal / 1000).toFixed(1)}<span className="text-xs text-gray-400 ml-1">L/ngày</span></p>
                    </div>
                </div>
            </div>
        </div>
    );
};

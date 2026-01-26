
import React, { useState, useMemo } from 'react';
import { DailyPlan, Meal } from '../types';
import { GlassCard } from './ui/GlassCard';
import { Utensils, RefreshCw, Check, Flame, Beef, Wheat, Droplets } from 'lucide-react';

interface NutritionDisplayProps {
    plan: DailyPlan;
    onReset: () => void;
}

// --- MICRO COMPONENTS ---

const CircularProgress: React.FC<{
    value: number;
    max: number;
    color: string;
    label: string;
    unit: string;
    icon: React.ReactNode;
}> = ({ value, max, color, label, unit, icon }) => {
    const radius = 30;
    const circumference = 2 * Math.PI * radius;
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className="flex flex-col items-center gap-2 group">
            <div className="relative w-20 h-20 flex items-center justify-center">
                {/* Background Circle */}
                <svg className="w-full h-full transform -rotate-90">
                    <circle
                        cx="40"
                        cy="40"
                        r={radius}
                        stroke="currentColor"
                        strokeWidth="6"
                        fill="transparent"
                        className="text-white/5"
                    />
                    {/* Progress Circle */}
                    <circle
                        cx="40"
                        cy="40"
                        r={radius}
                        stroke={color}
                        strokeWidth="6"
                        fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                    />
                </svg>
                {/* Icon in Center */}
                <div className={`absolute inset-0 flex items-center justify-center text-white/80 group-hover:scale-110 transition-transform`}>
                    {icon}
                </div>
            </div>
            <div className="text-center">
                <p className="text-sm font-bold text-white">{value}/{max}</p>
                <p className="text-[10px] uppercase tracking-wider text-gray-400">{label}</p>
            </div>
        </div>
    );
};

const MealItem: React.FC<{
    meal: Meal;
    isConsumed: boolean;
    onToggle: () => void;
}> = ({ meal, isConsumed, onToggle }) => (
    <div
        onClick={onToggle}
        className={`group relative overflow-hidden border rounded-2xl p-4 transition-all duration-300 cursor-pointer 
        ${isConsumed
                ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20 hover:shadow-lg'}`}
    >
        {/* Background Accent */}
        <div className={`absolute -right-10 -top-10 w-40 h-40 bg-gradient-to-br from-emerald-500/20 to-transparent rounded-full blur-3xl transition-opacity duration-500 ${isConsumed ? 'opacity-100' : 'opacity-0'}`} />

        <div className="relative z-10 flex gap-4 items-center">
            {/* Checkbox / Status Icon */}
            <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center border transition-all duration-300
                ${isConsumed
                    ? 'bg-emerald-500 text-white border-emerald-400 scale-110'
                    : 'bg-white/5 border-white/10 text-white/20 group-hover:border-white/30'}`}
            >
                {isConsumed ? <Check className="w-6 h-6 stroke-[3]" /> : <Utensils className="w-5 h-5" />}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-1">
                    <h4 className={`font-bold text-lg transition-colors truncate pr-2 ${isConsumed ? 'text-emerald-300' : 'text-white group-hover:text-emerald-200'}`}>
                        {meal.name}
                    </h4>

                    {/* Macro Badges */}
                    <div className="flex flex-wrap gap-2 text-[10px] font-bold mt-1 sm:mt-0 opacity-80 group-hover:opacity-100 transition-opacity">
                        <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/20">{meal.calories} kcal</span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/20">{meal.protein}g Pro</span>
                    </div>
                </div>

                <p className={`text-sm leading-relaxed transition-colors line-clamp-2 ${isConsumed ? 'text-emerald-100/60' : 'text-gray-400'}`}>
                    {meal.description}
                </p>
            </div>
        </div>
    </div>
);

export const NutritionDisplay: React.FC<NutritionDisplayProps> = ({ plan, onReset }) => {
    // State to track consumed meal names (assuming names are unique for simplicity, ideally use ID)
    const [consumedMealNames, setConsumedMealNames] = useState<string[]>([]);

    const toggleMeal = (mealName: string) => {
        setConsumedMealNames(prev =>
            prev.includes(mealName)
                ? prev.filter(n => n !== mealName)
                : [...prev, mealName]
        );
    };

    // Calculate consumed totals
    const consumed = useMemo(() => {
        return plan.nutrition.meals.reduce((acc, meal) => {
            if (consumedMealNames.includes(meal.name)) {
                return {
                    calories: acc.calories + (meal.calories || 0),
                    protein: acc.protein + (meal.protein || 0),
                    carbs: acc.carbs + (meal.carbs || 0),
                    fat: acc.fat + (meal.fat || 0),
                };
            }
            return acc;
        }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
    }, [plan.nutrition.meals, consumedMealNames]);

    return (
        <div className="space-y-8 animate-fade-in relative pt-20 pb-10">
            {/* Header Section */}
            <div className="text-center space-y-2">
                <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                    Dinh Dưỡng Hôm Nay
                </h2>
                <p className="text-gray-400 text-sm">
                    Theo dõi lượng Macro đã tiêu thụ của bạn
                </p>
            </div>

            {/* Macro Visualization Ring Section */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

                <div className="relative z-10 flex flex-wrap justify-center gap-8 md:gap-12">
                    <CircularProgress
                        value={consumed.calories}
                        max={plan.nutrition.totalCalories}
                        color="#ef4444" // Red for Calories/Energy
                        label="Calories"
                        unit="kcal"
                        icon={<Flame className="w-5 h-5 text-red-400" />}
                    />
                    <CircularProgress
                        value={consumed.protein}
                        max={plan.nutrition.totalProtein}
                        color="#3b82f6" // Blue for Protein
                        label="Protein"
                        unit="g"
                        icon={<Beef className="w-5 h-5 text-blue-400" />}
                    />
                    <CircularProgress
                        value={consumed.carbs}
                        max={plan.nutrition.totalCarbs || 0}
                        color="#f59e0b" // Orange for Carbs
                        label="Carbs"
                        unit="g"
                        icon={<Wheat className="w-5 h-5 text-orange-400" />}
                    />
                    <CircularProgress
                        value={consumed.fat}
                        max={plan.nutrition.totalFat || 0}
                        color="#eab308" // Yellow for Fat
                        label="Fat"
                        unit="g"
                        icon={<Droplets className="w-5 h-5 text-yellow-400" />}
                    />
                </div>
            </div>

            {/* Plan Details & Meals */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Utensils className="w-5 h-5 text-emerald-400" />
                        Thực Đơn
                    </h3>
                    <div className="text-xs text-gray-500 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                        {consumedMealNames.length}/{plan.nutrition.meals.length} Hoàn thành
                    </div>
                </div>

                <div className="grid gap-3">
                    {plan.nutrition.meals.map((meal, index) => (
                        <MealItem
                            key={index}
                            meal={meal}
                            isConsumed={consumedMealNames.includes(meal.name)}
                            onToggle={() => toggleMeal(meal.name)}
                        />
                    ))}
                </div>
            </div>

            {/* Footer Actions */}
            <div className="text-center pt-8 border-t border-white/5">
                <p className="text-xs text-gray-500 mb-4 italic">
                    *Mẹo: Chạm vào món ăn để đánh dấu đã ăn
                </p>
                <button
                    onClick={onReset}
                    className="group relative px-8 py-3 rounded-2xl bg-white/5 overflow-hidden transition-all hover:scale-105 active:scale-95"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative flex items-center justify-center gap-2 text-gray-400 group-hover:text-emerald-300 transition-colors">
                        <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                        <span className="font-medium">Tạo Kế Hoạch Mới</span>
                    </div>
                </button>
            </div>
        </div>
    );
};

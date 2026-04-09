import React, { useState } from 'react';
import { UserInput } from '../../types';
import { GlassCard } from '../ui/GlassCard';
import { Utensils, Refrigerator, TrendingUp, TrendingDown, Leaf, Plus, X, Loader2, Beef, Carrot, Egg, Droplets, Nut } from 'lucide-react';



interface NutritionInputProps {
    userData: UserInput;
    setUserData: React.Dispatch<React.SetStateAction<UserInput>>;
}

export const NutritionInput: React.FC<NutritionInputProps> = ({ userData, setUserData }) => {
    const [newConsumedFood, setNewConsumedFood] = useState('');

    // --- Handlers ---
    const handleAddConsumedFood = () => {
        if (newConsumedFood.trim()) {
            setUserData(prev => ({
                ...prev,
                consumedFood: [...(prev.consumedFood || []), newConsumedFood.trim()]
            }));
            setNewConsumedFood('');
        }
    };

    const handleRemoveConsumedFood = (indexToRemove: number) => {
        setUserData(prev => ({
            ...prev,
            consumedFood: (prev.consumedFood || []).filter((_, index) => index !== indexToRemove)
        }));
    };

    const getCategoryIcon = (category?: string) => {
        switch (category) {
            case 'protein': return <Beef className="text-red-400" />;
            case 'veg': return <Carrot className="text-emerald-400" />;
            case 'carb': return <Nut className="text-orange-400" />; // Fallback icon for rice/carb
            case 'fat': return <Droplets className="text-yellow-400" />;
            case 'spice': return <Leaf className="text-pink-400" />;
            default: return <Leaf className="text-gray-400" />;
        }
    };


    return (
        <div className="space-y-6 animate-fade-in pb-20">

            {/* 1. GOAL DASHBOARD (Top) */}
            <GlassCard id="tour-nutri-goals" title="Mục tiêu dinh dưỡng" icon={<Leaf className="w-6 h-6 text-emerald-400" />}>
                <div className="grid grid-cols-2 gap-4 mb-6">
                    {/* Bulking Toggle */}
                    <button
                        onClick={() => setUserData({ ...userData, nutritionGoal: 'bulking' })}
                        className={`relative overflow-hidden p-4 rounded-2xl border transition-all duration-300 group ${userData.nutritionGoal === 'bulking'
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                            : 'bg-black/20 border-white/10 text-gray-400 hover:bg-white/5'
                            }`}
                    >
                        <div className="relative z-10 flex flex-col items-center gap-2">
                            <div className={`p-3 rounded-full ${userData.nutritionGoal === 'bulking' ? 'bg-emerald-500 text-white' : 'bg-white/10'}`}>
                                <TrendingUp className="w-6 h-6" />
                            </div>
                            <span className="font-bold">Bulking (Tăng cân)</span>
                            <span className="text-[10px] opacity-70">Calo dư thừa, Cơm trắng</span>
                        </div>
                    </button>

                    {/* Cutting Toggle */}
                    <button
                        onClick={() => setUserData({ ...userData, nutritionGoal: 'cutting' })}
                        className={`relative overflow-hidden p-4 rounded-2xl border transition-all duration-300 group ${userData.nutritionGoal === 'cutting'
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                            : 'bg-black/20 border-white/10 text-gray-400 hover:bg-white/5'
                            }`}
                    >
                        <div className="relative z-10 flex flex-col items-center gap-2">
                            <div className={`p-3 rounded-full ${userData.nutritionGoal === 'cutting' ? 'bg-amber-500 text-white' : 'bg-white/10'}`}>
                                <TrendingDown className="w-6 h-6" />
                            </div>
                            <span className="font-bold">Cutting (Giảm cân)</span>
                            <span className="text-[10px] opacity-70">Thâm hụt Calo, Giữ cơ</span>
                        </div>
                    </button>
                </div>
            </GlassCard>



            {/* 3. MEAL LOG (Bottom) */}
            < GlassCard id="tour-nutri-diary" title="Nhật ký ăn uống" icon={< Utensils className="w-6 h-6 text-amber-400" />}>
                <div className="space-y-3">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newConsumedFood}
                            onChange={(e) => setNewConsumedFood(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddConsumedFood()}
                            placeholder="Đã ăn gì? (VD: 1 bát phở bò...)"
                            className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                        />
                        <button
                            onClick={handleAddConsumedFood}
                            className="p-2.5 bg-amber-500/20 text-amber-300 rounded-xl border border-amber-500/30 hover:bg-amber-500/30 transition-all active:scale-95"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="space-y-2">
                        {userData.consumedFood && userData.consumedFood.length > 0 ? (
                            userData.consumedFood.map((item, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-colors group">
                                    <span className="text-sm text-gray-300">{item}</span>
                                    <button
                                        onClick={() => handleRemoveConsumedFood(index)}
                                        className="text-gray-600 hover:text-red-400 transition-colors px-2"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-xs text-gray-600 py-2">Chưa ăn gì hôm nay.</p>
                        )}
                    </div>
                </div>
            </GlassCard >
        </div >
    );
};

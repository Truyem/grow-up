import React, { useState } from 'react';
import { UserInput } from '../../types';
import { GlassCard } from '../ui/GlassCard';
import { Utensils, Refrigerator, Zap, TrendingUp, TrendingDown, Leaf, Plus, X, Loader2, Beef, Carrot, Egg, Droplets, Nut } from 'lucide-react';

import { parseFridgeItems } from '../../services/geminiService';

interface NutritionInputProps {
    userData: UserInput;
    setUserData: React.Dispatch<React.SetStateAction<UserInput>>;
}

export const NutritionInput: React.FC<NutritionInputProps> = ({ userData, setUserData }) => {
    const [newIngredient, setNewIngredient] = useState('');
    const [newConsumedFood, setNewConsumedFood] = useState('');
    const [isScanningFridge, setIsScanningFridge] = useState(false);

    // --- Handlers ---
    const handleAddIngredient = () => {
        if (newIngredient.trim()) {
            setUserData(prev => ({
                ...prev,
                availableIngredients: [...(prev.availableIngredients || []), { id: Date.now().toString(), name: newIngredient.trim(), quantity: 1, unit: 'unit' }]
            }));
            setNewIngredient('');
        }
    };

    const handleAIFridgeScan = async () => {
        if (!newIngredient.trim()) return;
        setIsScanningFridge(true);
        try {
            const parsedIngredients = await parseFridgeItems(newIngredient);
            setUserData(prev => ({
                ...prev,
                availableIngredients: [
                    ...(prev.availableIngredients || []),
                    ...parsedIngredients
                ]
            }));
            setNewIngredient('');
        } catch (error) {
            console.error("AI Scan Failed", error);
        } finally {
            setIsScanningFridge(false);
        }
    };

    const handleRemoveIngredient = (indexToRemove: number) => {
        setUserData(prev => ({
            ...prev,
            availableIngredients: (prev.availableIngredients || []).filter((_, index) => index !== indexToRemove)
        }));
    };

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
            <GlassCard title="Mục tiêu dinh dưỡng" icon={<Leaf className="w-6 h-6 text-emerald-400" />}>
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

                {/* Creatine Switch - Styled as a "Power Up" */}
                <div
                    onClick={() => setUserData({ ...userData, useCreatine: !userData.useCreatine })}
                    className={`
            cursor-pointer group relative overflow-hidden rounded-xl border p-4 transition-all duration-300
            ${userData.useCreatine
                            ? 'bg-blue-500/10 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                            : 'bg-black/20 border-white/10 hover:border-white/20'}
          `}
                >
                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg transition-colors duration-300 ${userData.useCreatine ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
                                <Zap className={`w-5 h-5 ${userData.useCreatine ? 'fill-white' : ''}`} />
                            </div>
                            <div>
                                <h4 className={`font-bold text-sm ${userData.useCreatine ? 'text-blue-300' : 'text-gray-300'}`}>Creatine Boost</h4>
                                <p className="text-[10px] text-gray-400">Tự động +1.5L nước vào thực đơn</p>
                            </div>
                        </div>
                        {/* Switch UI */}
                        <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${userData.useCreatine ? 'bg-blue-500' : 'bg-gray-700'}`}>
                            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${userData.useCreatine ? 'translate-x-6' : 'translate-x-0'}`} />
                        </div>
                    </div>
                </div>
        </div>
            </GlassCard >

    {/* 2. SMART FRIDGE (Middle) */ }
    < GlassCard title = "Tủ lạnh thông minh" icon = {< Refrigerator className = "w-6 h-6 text-emerald-400" />}>
        <div className="space-y-4">
            {/* Input Area */}
            <div className="relative group">
                <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative flex gap-2">
                    <input
                        type="text"
                        value={newIngredient}
                        onChange={(e) => setNewIngredient(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddIngredient()}
                        placeholder="Thêm nhanh (VD: 500g ức gà, trứng...)"
                        className="flex-1 bg-black/40 border border-emerald-500/30 rounded-xl px-4 py-3 text-white placeholder-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all backdrop-blur-md"
                    />
                    <button
                        onClick={handleAIFridgeScan}
                        disabled={isScanningFridge}
                        className="px-4 bg-emerald-500/20 text-emerald-300 rounded-xl border border-emerald-500/50 hover:bg-emerald-500/30 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                        title="AI Scan"
                    >
                        {isScanningFridge ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Ingredient Grid */}
            <div className="grid grid-cols-2 min-[450px]:grid-cols-3 gap-2">
                {userData.availableIngredients && userData.availableIngredients.length > 0 ? (
                    userData.availableIngredients.map((item, index) => (
                        <div key={index} className="relative group animate-scale-in">
                            <div className="absolute inset-0 bg-emerald-400/5 rounded-xl group-hover:bg-emerald-400/10 transition-colors" />
                            <div className="relative p-3 rounded-xl border border-emerald-500/20 flex flex-col gap-1">
                                <div className="flex justify-between items-start">
                                    <div className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center">
                                        {getCategoryIcon(item.category)}
                                    </div>

                                    <button
                                        onClick={() => handleRemoveIngredient(index)}
                                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 hover:text-red-400 rounded transition-all text-gray-500"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                                <span className="font-medium text-sm text-emerald-100 truncate">{item.name}</span>
                                <span className="text-[10px] text-emerald-400/70">{item.quantity} {item.unit}</span>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-8 text-center border border-dashed border-emerald-500/20 rounded-xl">
                        <p className="text-gray-500 text-sm">Tủ lạnh trống rỗng...</p>
                        <p className="text-[10px] text-gray-600 mt-1">Nhập nguyên liệu để AI gợi ý món ăn</p>
                    </div>
                )}
            </div>
        </div>
            </GlassCard >

    {/* 3. MEAL LOG (Bottom) */ }
    < GlassCard title = "Nhật ký ăn uống" icon = {< Utensils className = "w-6 h-6 text-amber-400" />}>
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



import React, { useEffect, useState } from 'react';
import { FatigueLevel, MuscleGroup, UserInput, Intensity, UserStats } from '../types';
import { GlassCard } from './ui/GlassCard';
import { Activity, Calendar, Ruler, Weight, BatteryCharging, BatteryFull, Dumbbell, Plus, X, Refrigerator, Utensils, Flame, TrendingUp, TrendingDown, Swords, BrainCircuit, Zap, Droplets, Target, ChevronDown, Thermometer, Sparkles, Loader2 } from 'lucide-react';
import { parseFridgeItems } from '../services/geminiService';

interface UserFormProps {
  userData: UserInput;
  setUserData: React.Dispatch<React.SetStateAction<UserInput>>;
  userStats: UserStats;
  onSubmit: () => void;
  isLoading: boolean;
  onSickDay: () => void;  // Callback when user marks sick day
}

export const UserForm: React.FC<UserFormProps> = ({ userData, setUserData, userStats, onSubmit, isLoading, onSickDay }) => {
  const [currentDate, setCurrentDate] = useState('');
  const [newEquipment, setNewEquipment] = useState('');
  const [newIngredient, setNewIngredient] = useState('');
  const [newConsumedFood, setNewConsumedFood] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isScanningFridge, setIsScanningFridge] = useState(false);

  // Local state for weight input to handle commas/dots
  const [weightInput, setWeightInput] = useState(userData.weight.toString());

  // Sync weightInput when userData.weight changes (e.g. loaded from storage), but avoid overriding user typing
  useEffect(() => {
    // Only sync if the numeric values are different to prevent cursor jumping/formatting overrides while typing
    if (Math.abs(parseFloat(weightInput.replace(',', '.')) - userData.weight) > 0.01) {
      setWeightInput(userData.weight.toString());
    }
  }, [userData.weight]);

  useEffect(() => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    setCurrentDate(now.toLocaleDateString('vi-VN', options));
  }, []);


  const handleMuscleChange = (muscle: MuscleGroup) => {
    setUserData(prev => {
      let newSore: MuscleGroup[] = [];

      if (muscle === MuscleGroup.None) {
        if (prev.soreMuscles.includes(MuscleGroup.None)) return prev;
        newSore = [MuscleGroup.None];
      } else {
        const cleanPrev = prev.soreMuscles.filter(m => m !== MuscleGroup.None);

        if (cleanPrev.includes(muscle)) {
          newSore = cleanPrev.filter(m => m !== muscle);
        } else {
          newSore = [...cleanPrev, muscle];
        }

        if (newSore.length === 0) newSore = [MuscleGroup.None];
      }

      return { ...prev, soreMuscles: newSore };
    });
  };

  const handleAddEquipment = () => {
    if (newEquipment.trim()) {
      setUserData(prev => ({
        ...prev,
        equipment: [...prev.equipment, newEquipment.trim()]
      }));
      setNewEquipment('');
    }
  };

  const handleRemoveEquipment = (indexToRemove: number) => {
    setUserData(prev => ({
      ...prev,
      equipment: prev.equipment.filter((_, index) => index !== indexToRemove)
    }));
  };

  const handleAddIngredient = () => {
    if (newIngredient.trim()) {
      setUserData(prev => ({
        ...prev,
        availableIngredients: [...(prev.availableIngredients || []), newIngredient.trim()]
      }));
      setNewIngredient('');
    }
  };

  const handleRemoveIngredient = (indexToRemove: number) => {
    setUserData(prev => ({
      ...prev,
      availableIngredients: (prev.availableIngredients || []).filter((_, index) => index !== indexToRemove)
    }));
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
      // Fallback or Toast? assuming simple console for now or internal error state
    } finally {
      setIsScanningFridge(false);
    }
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

  const getIntensityLabel = (intensity: Intensity) => {
    switch (intensity) {
      case Intensity.Medium: return "Vừa sức (Hypertrophy)";
      case Intensity.Hard: return "Thử thách (Overload)";
      default: return "";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* --- STREAK CARD --- */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-900/60 to-red-900/60 border border-orange-500/30 shadow-[0_0_20px_rgba(249,115,22,0.2)] p-4">
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-yellow-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/40">
              <Flame className="w-7 h-7 text-white fill-white animate-pulse" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg leading-tight">Chuỗi Ngày Tập Luyện</h3>
              <p className="text-orange-200 text-xs font-medium">Đừng để ngọn lửa vụt tắt!</p>
            </div>
          </div>
          <div className="text-right">
            <span className="block text-3xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
              {userStats.streak}
            </span>
            <span className="text-[10px] text-orange-200 uppercase tracking-widest font-bold">Ngày liên tiếp</span>
          </div>
        </div>
        {/* Decorative BG */}
        <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12">
          <Flame className="w-32 h-32" />
        </div>
      </div>

      {/* Standard Form Below */}
      <GlassCard title="Thông tin hôm nay" icon={<Calendar className="w-6 h-6" />}>
        <div className="text-center p-4 bg-white/5 rounded-xl border border-white/10">
          <p className="text-sm text-gray-400 uppercase tracking-widest mb-1">Hôm nay là</p>
          <p className="text-2xl md:text-3xl font-bold text-cyan-300 capitalize">{currentDate}</p>
        </div>
      </GlassCard>

      <GlassCard title="Chỉ số cơ thể" icon={<Ruler className="w-6 h-6" />}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-300 mb-2">Cân nặng (kg)</label>
            <div className="relative">
              <Weight className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Weight className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                inputMode="decimal"
                value={weightInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setWeightInput(val);
                  // Parse: replace comma with dot, allow partial inputs like "60."
                  const parsed = parseFloat(val.replace(',', '.'));
                  if (!isNaN(parsed)) {
                    setUserData(prev => ({ ...prev, weight: parsed }));
                  }
                }}
                className="w-full bg-black/20 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2">Chiều cao (cm)</label>
            <div className="relative">
              <Ruler className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="number"
                value={userData.height}
                onChange={(e) => setUserData({ ...userData, height: Number(e.target.value) })}
                className="w-full bg-black/20 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
              />
            </div>
          </div>
        </div>
      </GlassCard>

      {/* TRAINING MODE SELECTION */}
      <GlassCard title="Chế độ tập luyện" icon={<Swords className="w-6 h-6" />}>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setUserData({ ...userData, trainingMode: 'standard' })}
            className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer relative overflow-hidden ${userData.trainingMode === 'standard'
              ? 'bg-blue-600/20 border-blue-500 text-blue-300 shadow-[0_0_15px_rgba(37,99,235,0.3)]'
              : 'bg-black/20 border-white/10 text-gray-400 hover:bg-white/5 hover:border-white/20'
              }`}
          >
            <BrainCircuit className="w-8 h-8 flex-shrink-0" />
            <div className="text-center relative z-10">
              <div className="font-bold text-sm">AI Coach (7 Days)</div>
              <div className="text-[10px] opacity-70">Lịch tập chia nhóm cơ chuẩn</div>
            </div>
          </button>

          <button
            onClick={() => setUserData({ ...userData, trainingMode: 'saitama' })}
            className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer relative overflow-hidden group ${userData.trainingMode === 'saitama'
              ? 'bg-yellow-500/20 border-yellow-500 text-yellow-300 shadow-[0_0_15px_rgba(234,179,8,0.3)]'
              : 'bg-black/20 border-white/10 text-gray-400 hover:bg-white/5 hover:border-white/20'
              }`}
          >
            <Target className="w-8 h-8 flex-shrink-0" />
            <div className="text-center relative z-10">
              <div className="font-bold text-sm">Saitama Challenge</div>
              <div className="text-[10px] opacity-70">100 Push/Sit/Squat + 10km Run</div>
            </div>
            {userData.trainingMode === 'saitama' && (
              <div className="absolute inset-0 bg-yellow-500/10 animate-pulse" />
            )}
          </button>
        </div>
      </GlassCard>

      {/* Equipment Management Section */}
      <GlassCard title="Dụng cụ tập luyện" icon={<Dumbbell className="w-6 h-6" />}>
        <div className="space-y-4">
          <p className="text-xs text-gray-400 -mt-2">Hệ thống sẽ mặc định bạn chỉ có 1 quả tạ (1 tay) trừ khi bạn ghi rõ "2x" hoặc "đôi".</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={newEquipment}
              onChange={(e) => setNewEquipment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddEquipment()}
              placeholder="Nhập tên dụng cụ (VD: Tạ đơn 10kg)..."
              className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
            <button
              onClick={handleAddEquipment}
              className="p-3 bg-cyan-500/20 text-cyan-300 rounded-xl border border-cyan-500/30 hover:bg-cyan-500/30 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {userData.equipment.length > 0 ? (
              userData.equipment.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-200 group hover:border-white/20 transition-all"
                >
                  <span>{item}</span>
                  <button
                    onClick={() => handleRemoveEquipment(index)}
                    className="text-gray-500 hover:text-red-400 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm italic w-full text-center py-2">Chưa có dụng cụ nào. Hãy thêm vào!</p>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Nutrition Goal Selection */}
      <GlassCard title="Mục tiêu dinh dưỡng" icon={<Utensils className="w-6 h-6" />}>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => setUserData({ ...userData, nutritionGoal: 'bulking' })}
            className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${userData.nutritionGoal === 'bulking'
              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
              : 'bg-black/20 border-white/10 text-gray-400 hover:bg-white/5 hover:border-white/20'
              }`}
          >
            <TrendingUp className="w-8 h-8 flex-shrink-0" />
            <div className="text-center">
              <div className="font-bold text-sm">Tăng Cân (Bulking)</div>
              <div className="text-[10px] opacity-70">Calo dư thừa, Cơm trắng</div>
            </div>
          </button>

          <button
            onClick={() => setUserData({ ...userData, nutritionGoal: 'cutting' })}
            className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${userData.nutritionGoal === 'cutting'
              ? 'bg-red-500/20 border-red-500 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
              : 'bg-black/20 border-white/10 text-gray-400 hover:bg-white/5 hover:border-white/20'
              }`}
          >
            <TrendingDown className="w-8 h-8 flex-shrink-0" />
            <div className="text-center">
              <div className="font-bold text-sm">Giảm Cân (Cutting)</div>
              <div className="text-[10px] opacity-70">Thâm hụt Calo, Giữ cơ</div>
            </div>
          </button>
        </div>

        {/* Creatine Toggle */}
        <div
          onClick={() => setUserData({ ...userData, useCreatine: !userData.useCreatine })}
          className={`
            relative p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all
            ${userData.useCreatine
              ? 'bg-blue-600/20 border-blue-500/50 shadow-lg shadow-blue-500/10'
              : 'bg-black/20 border-white/10 hover:bg-white/5 hover:border-white/20'}
          `}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg transition-colors ${userData.useCreatine ? 'bg-blue-500 text-white' : 'bg-white/10 text-gray-400'}`}>
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className={`font-bold text-sm ${userData.useCreatine ? 'text-blue-300' : 'text-gray-300'}`}>
                Sử dụng Creatine Monohydrate
              </div>
              <div className="text-[10px] text-gray-400">
                Tự động tính thêm nước vào thực đơn (+1.5L)
              </div>
            </div>
          </div>

          <div className={`
             w-12 h-6 rounded-full p-1 transition-colors relative
             ${userData.useCreatine ? 'bg-blue-500' : 'bg-gray-600'}
          `}>
            <div className={`
                w-4 h-4 bg-white rounded-full shadow-md transition-transform
                ${userData.useCreatine ? 'translate-x-6' : 'translate-x-0'}
             `} />
          </div>
        </div>
      </GlassCard>

      <GlassCard title="Tình trạng sức khỏe" icon={<Activity className="w-6 h-6" />}>
        <div className="mb-4">
          <label className="block text-sm text-gray-300 mb-2">Mức độ mệt mỏi</label>
          <div className="flex gap-2">
            {Object.values(FatigueLevel).map((level) => (
              <button
                key={level}
                onClick={() => setUserData({ ...userData, fatigue: level })}
                className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${userData.fatigue === level
                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 border shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                  : 'bg-black/20 border-transparent text-gray-400 hover:bg-black/30 border'
                  }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Sick Day Button */}
        <button
          onClick={onSickDay}
          className="w-full mb-4 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-sm font-medium hover:bg-red-500/30 hover:border-red-500/50 transition-all cursor-pointer active:scale-[0.98]"
        >
          <Thermometer className="w-4 h-4" />
          <span>Hôm nay bị ốm/bệnh (Giữ chuỗi)</span>
        </button>

        {/* Muscle Group Selection - Grid Layout */}
        <div>
          <label className="block text-sm text-gray-300 mb-2">Nhóm cơ đang đau (Để tránh tập nặng)</label>

          {/* None Option */}
          <button
            onClick={() => handleMuscleChange(MuscleGroup.None)}
            className={`w-full py-3 rounded-xl text-sm font-medium transition-all cursor-pointer mb-3 border ${userData.soreMuscles.includes(MuscleGroup.None)
              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
              : 'bg-black/20 border-white/5 text-gray-400 hover:bg-white/5 hover:border-white/20'
              }`}
          >
            {MuscleGroup.None} (Không đau)
          </button>

          {/* Muscle Groups - Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 min-[400px]:gap-3">
            {Object.entries({
              'Ngực': [MuscleGroup.ChestUpper, MuscleGroup.ChestMiddle, MuscleGroup.ChestLower],
              'Vai': [MuscleGroup.FrontDelts, MuscleGroup.SideDelts, MuscleGroup.RearDelts],
              'Lưng': [MuscleGroup.UpperBack, MuscleGroup.Lats, MuscleGroup.LowerBack, MuscleGroup.Traps],
              'Tay': [MuscleGroup.Biceps, MuscleGroup.TricepsLong, MuscleGroup.TricepsLateral, MuscleGroup.Forearms],
              'Chân': [MuscleGroup.Quads, MuscleGroup.Hamstrings, MuscleGroup.Glutes, MuscleGroup.Calves],
              'Bụng': [MuscleGroup.UpperAbs, MuscleGroup.LowerAbs, MuscleGroup.Obliques],
            }).map(([category, muscles]) => {
              const selectedCount = muscles.filter(m => userData.soreMuscles.includes(m)).length;
              const isExpanded = activeCategory === category;
              const hasSelection = selectedCount > 0;

              return (
                <div
                  key={category}
                  className={`flex flex-col rounded-xl overflow-hidden transition-all duration-300 border ${hasSelection
                    ? 'bg-pink-500/5 border-pink-500/30'
                    : 'bg-black/20 border-white/10 hover:border-white/20'
                    }`}
                >
                  <button
                    onClick={() => setActiveCategory(isExpanded ? null : category)}
                    className="flex items-center justify-between p-3 w-full cursor-pointer hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`font-medium text-sm ${hasSelection ? 'text-pink-300' : 'text-gray-300'}`}>
                        {category}
                      </span>
                      {hasSelection && (
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-pink-500 text-[10px] font-bold text-white">
                          {selectedCount}
                        </span>
                      )}
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  <div className={`
                    overflow-hidden transition-all duration-300 bg-black/20
                    ${isExpanded ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0'}
                  `}>
                    <div className="p-2 grid grid-cols-1 gap-1.5">
                      {muscles.map((muscle) => (
                        <button
                          key={muscle}
                          onClick={() => handleMuscleChange(muscle)}
                          className={`
                            w-full px-3 py-2 rounded-lg text-xs font-medium text-left transition-all border
                            ${userData.soreMuscles.includes(muscle)
                              ? 'bg-pink-500/20 border-pink-500/50 text-pink-300'
                              : 'bg-transparent border-transparent text-gray-400 hover:bg-white/5 hover:text-gray-200'}
                          `}
                        >
                          {muscle}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </GlassCard>

      {/* Available Ingredients */}
      <GlassCard title="Nguyên liệu có sẵn (Tủ lạnh)" icon={<Refrigerator className="w-6 h-6" />}>
        <div className="space-y-4">
          <p className="text-xs text-gray-400 -mt-2">Nhập những món bạn đang có để AI gợi ý thực đơn tiết kiệm.</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={newIngredient}
              onChange={(e) => setNewIngredient(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddIngredient()}
              placeholder="VD: 500g Ức gà, 10 quả trứng..."
              className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
            {newIngredient.length > 5 ? (
              <button
                onClick={handleAIFridgeScan}
                disabled={isScanningFridge}
                className="p-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 rounded-xl border border-purple-500/30 hover:bg-purple-500/30 transition-all active:scale-95 cursor-pointer flex items-center gap-2"
                title="Thêm nhanh bằng AI (Tách món, phân loại)"
              >
                {isScanningFridge ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                <span className="hidden sm:inline font-bold text-xs">AI Scan</span>
              </button>
            ) : null}
            <button
              onClick={handleAddIngredient}
              disabled={isScanningFridge}
              className="p-3 bg-cyan-500/20 text-cyan-300 rounded-xl border border-cyan-500/30 hover:bg-cyan-500/30 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {(userData.availableIngredients || []).length > 0 ? (
              (userData.availableIngredients || []).map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm text-emerald-200 group hover:border-emerald-500/40 transition-all"
                >
                  <span>{typeof item === 'string' ? item : `${item.name} (${item.quantity}${item.unit})`}</span>
                  <button
                    onClick={() => handleRemoveIngredient(index)}
                    className="text-emerald-500/50 hover:text-red-400 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm italic w-full text-center py-2">Tủ lạnh đang trống...</p>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Consumed Food */}
      <GlassCard title="Đã ăn hôm nay (Tính Calories)" icon={<Utensils className="w-6 h-6" />}>
        <div className="space-y-4">
          <p className="text-xs text-gray-400 -mt-2">Nhập những gì bạn ĐÃ ăn để AI trừ đi và tính khẩu phần còn lại.</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={newConsumedFood}
              onChange={(e) => setNewConsumedFood(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddConsumedFood()}
              placeholder="VD: 1 bát phở bò, 1 ly cà phê sữa..."
              className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
            <button
              onClick={handleAddConsumedFood}
              className="p-3 bg-cyan-500/20 text-cyan-300 rounded-xl border border-cyan-500/30 hover:bg-cyan-500/30 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {(userData.consumedFood || []).length > 0 ? (
              (userData.consumedFood || []).map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-3 py-2 bg-orange-500/10 border border-orange-500/20 rounded-lg text-sm text-orange-200 group hover:border-orange-500/40 transition-all"
                >
                  <span>{item}</span>
                  <button
                    onClick={() => handleRemoveConsumedFood(index)}
                    className="text-orange-500/50 hover:text-red-400 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm italic w-full text-center py-2">Chưa ăn gì hôm nay...</p>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Intensity Selection */}
      <GlassCard title="Cường độ tập luyện" icon={<BatteryCharging className="w-6 h-6" />}>
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3">

            <button
              onClick={() => setUserData({ ...userData, selectedIntensity: Intensity.Medium })}
              className={`p-4 rounded-xl border flex items-center gap-4 transition-all cursor-pointer ${userData.selectedIntensity === Intensity.Medium
                ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                : 'bg-black/20 border-white/10 text-gray-400 hover:bg-white/5 hover:border-white/20'
                }`}
            >
              <BatteryCharging className="w-6 h-6 flex-shrink-0" />
              <div className="text-left">
                <div className="font-bold">Vừa sức (Normal)</div>
                <div className="text-xs opacity-70">Tăng cơ (Hypertrophy), tiêu chuẩn.</div>
              </div>
            </button>

            <button
              onClick={() => setUserData({ ...userData, selectedIntensity: Intensity.Hard })}
              className={`p-4 rounded-xl border flex items-center gap-4 transition-all cursor-pointer ${userData.selectedIntensity === Intensity.Hard
                ? 'bg-red-500/20 border-red-500 text-red-300'
                : 'bg-black/20 border-white/10 text-gray-400 hover:bg-white/5 hover:border-white/20'
                }`}
            >
              <BatteryFull className="w-6 h-6 flex-shrink-0" />
              <div className="text-left">
                <div className="font-bold">Thử thách (Hard)</div>
                <div className="text-xs opacity-70">Cường độ cao, Overload, đẩy giới hạn.</div>
              </div>
            </button>
          </div>
        </div>
      </GlassCard>

      <button
        onClick={onSubmit}
        disabled={isLoading}
        className={`
          group relative w-full py-4 rounded-2xl font-bold text-lg transition-all duration-300 cursor-pointer
          bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 text-cyan-100
          hover:from-cyan-500/30 hover:to-blue-500/30 hover:border-cyan-400 hover:text-white
          hover:shadow-[0_0_30px_rgba(6,182,212,0.4)]
          active:scale-[0.98]
          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
          overflow-hidden
        `}
      >
        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none" />
        {isLoading ? (
          <span className="flex items-center justify-center gap-2 relative z-10">
            <svg className="animate-spin h-5 w-5 text-cyan-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Đang tạo lịch {getIntensityLabel(userData.selectedIntensity).split('(')[0].trim()}...
          </span>
        ) : (
          <span className="relative z-10 flex items-center justify-center gap-2">
            <Activity className="w-5 h-5" /> Tạo Lịch Tập Ngay
          </span>
        )}
      </button>

      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};
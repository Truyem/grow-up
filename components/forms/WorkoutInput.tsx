import React, { useState } from 'react';
import { UserInput, Intensity, FatigueLevel, MuscleGroup } from '../../types';
import { GlassCard } from '../ui/GlassCard';
import { Swords, BrainCircuit, Dumbbell, BatteryCharging, BatteryFull, Activity, Thermometer, ChevronDown } from 'lucide-react';

interface WorkoutInputProps {
    userData: UserInput;
    setUserData: React.Dispatch<React.SetStateAction<UserInput>>;
    onSickDay: () => void;
}

export const WorkoutInput: React.FC<WorkoutInputProps> = ({ userData, setUserData, onSickDay }) => {
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [newEquipment, setNewEquipment] = useState('');

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

    return (
        <div className="space-y-6 animate-fade-in">
            {/* TRAINING MODE SELECTION */}
            <div id="tour-training-mode">
                <GlassCard title="Chế độ tập luyện" icon={<Swords className="w-6 h-6 text-cyan-400" />}>
                    <div className="grid grid-cols-3 gap-3">
                        <button
                            onClick={() => setUserData({ ...userData, trainingMode: 'calis' })}
                            className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer relative overflow-hidden ${userData.trainingMode === 'calis'
                                ? 'bg-blue-600/20 border-blue-500 text-blue-300 shadow-[0_0_15px_rgba(37,99,235,0.3)]'
                                : 'bg-black/20 border-white/10 text-gray-400 hover:bg-white/5 hover:border-white/20'
                                }`}
                        >
                            <BrainCircuit className="w-8 h-8 flex-shrink-0" />
                            <div className="text-center relative z-10">
                                <div className="font-bold text-sm">Calisthenics</div>
                                <div className="text-[10px] opacity-70">Street Workout</div>
                            </div>
                        </button>

                        <button
                            onClick={() => setUserData({ ...userData, trainingMode: 'gym' })}
                            className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer relative overflow-hidden group ${userData.trainingMode === 'gym'
                                ? 'bg-purple-500/20 border-purple-500 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                                : 'bg-black/20 border-white/10 text-gray-400 hover:bg-white/5 hover:border-white/20'
                                }`}
                        >
                            <Dumbbell className="w-8 h-8 flex-shrink-0" />
                            <div className="text-center relative z-10">
                                <div className="font-bold text-sm">Gym</div>
                                <div className="text-[10px] opacity-70">Bodybuilding</div>
                            </div>
                            {userData.trainingMode === 'gym' && (
                                <div className="absolute inset-0 bg-purple-500/10 animate-pulse" />
                            )}
                        </button>

                        <button
                            onClick={() => setUserData({ ...userData, trainingMode: 'home' })}
                            className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer relative overflow-hidden group ${userData.trainingMode === 'home'
                                ? 'bg-orange-500/20 border-orange-500 text-orange-300 shadow-[0_0_15px_rgba(249,115,22,0.3)]'
                                : 'bg-black/20 border-white/10 text-gray-400 hover:bg-white/5 hover:border-white/20'
                                }`}
                        >
                            <Activity className="w-8 h-8 flex-shrink-0" />
                            <div className="text-center relative z-10">
                                <div className="font-bold text-sm">Home</div>
                                <div className="text-[10px] opacity-70">Gym + Calis</div>
                            </div>
                            {userData.trainingMode === 'home' && (
                                <div className="absolute inset-0 bg-orange-500/10 animate-pulse" />
                            )}
                        </button>
                    </div>
                </GlassCard>
            </div>

            {/* Intensity Selection */}
            <div id="tour-input-intensity">
                <GlassCard title="Cường độ tập luyện" icon={<BatteryCharging className="w-6 h-6 text-cyan-400" />}>
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
                </GlassCard>
            </div>

            {/* Health Status */}
            <GlassCard title="Tình trạng sức khỏe" icon={<Activity className="w-6 h-6 text-cyan-400" />}>
                <div id="tour-input-fatigue" className="mb-4">
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

                {/* Muscle Group Selection */}
                <div id="tour-input-muscle">
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

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 min-[400px]:gap-3">
                         {Object.entries({
                            'Ngực': [MuscleGroup.Chest],
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

            {/* Equipment Management - Visible for Calisthenics and Home Workout */}
            {(userData.trainingMode === 'calis' || userData.trainingMode === 'home') && (
                <GlassCard title="Dụng cụ tập luyện" icon={<Dumbbell className="w-6 h-6 text-cyan-400" />}>
                    <div className="space-y-4">
                        <p className="text-xs text-gray-400 -mt-2">Hệ thống sẽ mặc định bạn chỉ có 1 quả tạ (1 tay) trừ khi bạn ghi rõ "2x" hoặc "đôi".</p>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newEquipment}
                                onChange={(e) => setNewEquipment(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddEquipment()}
                                placeholder="Nhập tên dụng cụ (VD: Tạ đơn, Dây kháng lực)..."
                                className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                            />
                            <button
                                onClick={handleAddEquipment}
                                className="p-3 bg-cyan-500/20 text-cyan-300 rounded-xl border border-cyan-500/30 hover:bg-cyan-500/30 transition-all active:scale-95 cursor-pointer"
                            >
                                <div className="w-5 h-5 flex items-center justify-center font-bold text-xl">+</div>
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
                                            ×
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500 text-sm italic w-full text-center py-2">Chưa có dụng cụ nào. Hãy thêm vào!</p>
                            )}
                        </div>
                    </div>
                </GlassCard>
            )}

        </div>
    );
};

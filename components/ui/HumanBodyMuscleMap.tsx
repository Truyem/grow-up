import React from 'react';
import { MuscleGroup } from '../../types';

interface HumanBodyMuscleMapProps {
    selectedMuscles: MuscleGroup[];
    onMuscleToggle: (muscle: MuscleGroup) => void;
    showLabels?: boolean;
    interactive?: boolean;
}

// Color mapping based on existing system
const getMuscleColor = (muscle: MuscleGroup): string => {
    // Chest - Blue
    if ([MuscleGroup.ChestUpper, MuscleGroup.ChestMiddle, MuscleGroup.ChestLower].includes(muscle)) {
        return '#3B82F6'; // blue-500
    }
    // Shoulders - Red
    if ([MuscleGroup.FrontDelts, MuscleGroup.SideDelts, MuscleGroup.RearDelts].includes(muscle)) {
        return '#EF4444'; // red-500
    }
    // Back - Yellow
    if ([MuscleGroup.UpperBack, MuscleGroup.Lats, MuscleGroup.LowerBack, MuscleGroup.Traps].includes(muscle)) {
        return '#FACC15'; // yellow-400
    }
    // Triceps - Green
    if ([MuscleGroup.TricepsLong, MuscleGroup.TricepsLateral].includes(muscle)) {
        return '#10B981'; // emerald-500
    }
    // Biceps & Forearms - Pink
    if ([MuscleGroup.Biceps, MuscleGroup.Forearms].includes(muscle)) {
        return '#EC4899'; // pink-500
    }
    // Legs - Purple
    if ([MuscleGroup.Quads, MuscleGroup.Hamstrings, MuscleGroup.Glutes, MuscleGroup.Calves].includes(muscle)) {
        return '#A855F7'; // purple-500
    }
    // Core - Orange
    if ([MuscleGroup.UpperAbs, MuscleGroup.LowerAbs, MuscleGroup.Obliques].includes(muscle)) {
        return '#F97316'; // orange-500
    }
    return '#6B7280'; // gray-500 default
};

export const HumanBodyMuscleMap: React.FC<HumanBodyMuscleMapProps> = ({
    selectedMuscles,
    onMuscleToggle,
    showLabels = true,
    interactive = true,
}) => {
    const isSelected = (muscle: MuscleGroup) => selectedMuscles.includes(muscle);

    const handleMuscleClick = (muscle: MuscleGroup) => {
        if (interactive) {
            onMuscleToggle(muscle);
        }
    };

    const getMuscleStyle = (muscle: MuscleGroup) => {
        const color = getMuscleColor(muscle);
        const selected = isSelected(muscle);

        return {
            fill: selected ? `${color}40` : 'transparent', // 40 = 25% opacity
            stroke: selected ? `${color}99` : '#ffffff33', // 99 = 60% opacity, 33 = 20%
            strokeWidth: selected ? 2.5 : 1.5,
            opacity: selected ? 1 : 0.6,
            cursor: interactive ? 'pointer' : 'default',
            transition: 'all 0.3s ease',
        };
    };

    return (
        <div className="flex flex-col items-center gap-4">
            {/* Front View */}
            <div className="relative">
                <svg
                    viewBox="0 0 300 600"
                    className="w-full max-w-[300px] h-auto"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    {/* Head */}
                    <ellipse cx="150" cy="40" rx="30" ry="35" fill="none" stroke="white" strokeWidth="2" opacity="0.3" />

                    {/* Neck */}
                    <path d="M 135 70 L 135 90 L 165 90 L 165 70" fill="none" stroke="white" strokeWidth="2" opacity="0.3" />

                    {/* CHEST */}
                    {/* Upper Chest */}
                    <path
                        d="M 110 95 Q 150 90 190 95 L 185 130 Q 150 125 115 130 Z"
                        {...getMuscleStyle(MuscleGroup.ChestUpper)}
                        onClick={() => handleMuscleClick(MuscleGroup.ChestUpper)}
                        className={interactive ? 'hover:opacity-80' : ''}
                    >
                        <title>Ngực trên</title>
                    </path>

                    {/* Middle Chest */}
                    <path
                        d="M 115 130 Q 150 125 185 130 L 180 170 Q 150 165 120 170 Z"
                        {...getMuscleStyle(MuscleGroup.ChestMiddle)}
                        onClick={() => handleMuscleClick(MuscleGroup.ChestMiddle)}
                        className={interactive ? 'hover:opacity-80' : ''}
                    >
                        <title>Ngực giữa</title>
                    </path>

                    {/* Lower Chest */}
                    <path
                        d="M 120 170 Q 150 165 180 170 L 175 200 Q 150 195 125 200 Z"
                        {...getMuscleStyle(MuscleGroup.ChestLower)}
                        onClick={() => handleMuscleClick(MuscleGroup.ChestLower)}
                        className={interactive ? 'hover:opacity-80' : ''}
                    >
                        <title>Ngực dưới</title>
                    </path>

                    {/* SHOULDERS */}
                    {/* Left Front Delt */}
                    <path
                        d="M 85 95 L 110 95 L 115 130 L 95 125 Z"
                        {...getMuscleStyle(MuscleGroup.FrontDelts)}
                        onClick={() => handleMuscleClick(MuscleGroup.FrontDelts)}
                        className={interactive ? 'hover:opacity-80' : ''}
                    >
                        <title>Vai trước</title>
                    </path>

                    {/* Right Front Delt */}
                    <path
                        d="M 215 95 L 190 95 L 185 130 L 205 125 Z"
                        {...getMuscleStyle(MuscleGroup.FrontDelts)}
                        onClick={() => handleMuscleClick(MuscleGroup.FrontDelts)}
                        className={interactive ? 'hover:opacity-80' : ''}
                    />

                    {/* Left Side Delt */}
                    <path
                        d="M 75 100 L 85 95 L 95 125 L 85 135 Z"
                        {...getMuscleStyle(MuscleGroup.SideDelts)}
                        onClick={() => handleMuscleClick(MuscleGroup.SideDelts)}
                        className={interactive ? 'hover:opacity-80' : ''}
                    >
                        <title>Vai giữa</title>
                    </path>

                    {/* Right Side Delt */}
                    <path
                        d="M 225 100 L 215 95 L 205 125 L 215 135 Z"
                        {...getMuscleStyle(MuscleGroup.SideDelts)}
                        onClick={() => handleMuscleClick(MuscleGroup.SideDelts)}
                        className={interactive ? 'hover:opacity-80' : ''}
                    />

                    {/* ARMS - BICEPS */}
                    {/* Left Bicep */}
                    <path
                        d="M 85 135 L 95 125 L 95 200 L 80 210 Z"
                        {...getMuscleStyle(MuscleGroup.Biceps)}
                        onClick={() => handleMuscleClick(MuscleGroup.Biceps)}
                        className={interactive ? 'hover:opacity-80' : ''}
                    >
                        <title>Tay trước</title>
                    </path>

                    {/* Right Bicep */}
                    <path
                        d="M 215 135 L 205 125 L 205 200 L 220 210 Z"
                        {...getMuscleStyle(MuscleGroup.Biceps)}
                        onClick={() => handleMuscleClick(MuscleGroup.Biceps)}
                        className={interactive ? 'hover:opacity-80' : ''}
                    />

                    {/* FOREARMS */}
                    {/* Left Forearm */}
                    <path
                        d="M 80 210 L 95 200 L 90 270 L 75 275 Z"
                        {...getMuscleStyle(MuscleGroup.Forearms)}
                        onClick={() => handleMuscleClick(MuscleGroup.Forearms)}
                        className={interactive ? 'hover:opacity-80' : ''}
                    >
                        <title>Cẳng tay</title>
                    </path>

                    {/* Right Forearm */}
                    <path
                        d="M 220 210 L 205 200 L 210 270 L 225 275 Z"
                        {...getMuscleStyle(MuscleGroup.Forearms)}
                        onClick={() => handleMuscleClick(MuscleGroup.Forearms)}
                        className={interactive ? 'hover:opacity-80' : ''}
                    />

                    {/* CORE/ABS */}
                    {/* Upper Abs */}
                    <path
                        d="M 125 200 Q 150 195 175 200 L 170 240 Q 150 235 130 240 Z"
                        {...getMuscleStyle(MuscleGroup.UpperAbs)}
                        onClick={() => handleMuscleClick(MuscleGroup.UpperAbs)}
                        className={interactive ? 'hover:opacity-80' : ''}
                    >
                        <title>Bụng trên</title>
                    </path>

                    {/* Lower Abs */}
                    <path
                        d="M 130 240 Q 150 235 170 240 L 165 280 Q 150 275 135 280 Z"
                        {...getMuscleStyle(MuscleGroup.LowerAbs)}
                        onClick={() => handleMuscleClick(MuscleGroup.LowerAbs)}
                        className={interactive ? 'hover:opacity-80' : ''}
                    >
                        <title>Bụng dưới</title>
                    </path>

                    {/* Left Oblique */}
                    <path
                        d="M 115 210 L 125 200 L 135 280 L 125 290 Z"
                        {...getMuscleStyle(MuscleGroup.Obliques)}
                        onClick={() => handleMuscleClick(MuscleGroup.Obliques)}
                        className={interactive ? 'hover:opacity-80' : ''}
                    >
                        <title>Bụng chéo</title>
                    </path>

                    {/* Right Oblique */}
                    <path
                        d="M 185 210 L 175 200 L 165 280 L 175 290 Z"
                        {...getMuscleStyle(MuscleGroup.Obliques)}
                        onClick={() => handleMuscleClick(MuscleGroup.Obliques)}
                        className={interactive ? 'hover:opacity-80' : ''}
                    />

                    {/* LEGS - QUADS */}
                    {/* Left Quad */}
                    <path
                        d="M 125 290 L 135 280 L 130 420 L 115 430 Z"
                        {...getMuscleStyle(MuscleGroup.Quads)}
                        onClick={() => handleMuscleClick(MuscleGroup.Quads)}
                        className={interactive ? 'hover:opacity-80' : ''}
                    >
                        <title>Đùi trước</title>
                    </path>

                    {/* Right Quad */}
                    <path
                        d="M 175 290 L 165 280 L 170 420 L 185 430 Z"
                        {...getMuscleStyle(MuscleGroup.Quads)}
                        onClick={() => handleMuscleClick(MuscleGroup.Quads)}
                        className={interactive ? 'hover:opacity-80' : ''}
                    />

                    {/* CALVES */}
                    {/* Left Calf */}
                    <path
                        d="M 115 430 L 130 420 L 125 530 L 110 540 Z"
                        {...getMuscleStyle(MuscleGroup.Calves)}
                        onClick={() => handleMuscleClick(MuscleGroup.Calves)}
                        className={interactive ? 'hover:opacity-80' : ''}
                    >
                        <title>Bắp chân</title>
                    </path>

                    {/* Right Calf */}
                    <path
                        d="M 185 430 L 170 420 L 175 530 L 190 540 Z"
                        {...getMuscleStyle(MuscleGroup.Calves)}
                        onClick={() => handleMuscleClick(MuscleGroup.Calves)}
                        className={interactive ? 'hover:opacity-80' : ''}
                    />

                    {/* Body outline for reference */}
                    <path
                        d="M 75 100 Q 70 250 80 290 L 125 290 L 115 430 L 110 540 M 225 100 Q 230 250 220 290 L 175 290 L 185 430 L 190 540"
                        fill="none"
                        stroke="white"
                        strokeWidth="1"
                        opacity="0.2"
                    />
                </svg>

                {showLabels && (
                    <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                        <div className="relative w-full h-full">
                            {/* Add text labels for selected muscles */}
                            {isSelected(MuscleGroup.ChestUpper) && (
                                <div className="absolute top-[18%] left-1/2 -translate-x-1/2 px-2 py-1 bg-blue-500/80 rounded text-[10px] font-bold text-white uppercase">
                                    Ngực trên
                                </div>
                            )}
                            {isSelected(MuscleGroup.FrontDelts) && (
                                <div className="absolute top-[17%] left-[20%] px-2 py-1 bg-red-500/80 rounded text-[10px] font-bold text-white uppercase">
                                    Vai
                                </div>
                            )}
                            {isSelected(MuscleGroup.Biceps) && (
                                <div className="absolute top-[30%] left-[18%] px-2 py-1 bg-pink-500/80 rounded text-[10px] font-bold text-white uppercase">
                                    Biceps
                                </div>
                            )}
                            {isSelected(MuscleGroup.UpperAbs) && (
                                <div className="absolute top-[37%] left-1/2 -translate-x-1/2 px-2 py-1 bg-orange-500/80 rounded text-[10px] font-bold text-white uppercase">
                                    Bụng
                                </div>
                            )}
                            {isSelected(MuscleGroup.Quads) && (
                                <div className="absolute top-[60%] left-1/2 -translate-x-1/2 px-2 py-1 bg-purple-500/80 rounded text-[10px] font-bold text-white uppercase">
                                    Đùi
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-2 justify-center text-xs">
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-gray-300">Ngực</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-gray-300">Vai</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <span className="text-gray-300">Lưng</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-pink-500"></div>
                    <span className="text-gray-300">Tay trước</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    <span className="text-gray-300">Tay sau</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                    <span className="text-gray-300">Chân</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                    <span className="text-gray-300">Bụng</span>
                </div>
            </div>
        </div>
    );
};

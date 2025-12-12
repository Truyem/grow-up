import React, { useState } from 'react';
import { MuscleGroup } from '../../types';

interface HumanBodyMuscleMapProps {
    selectedMuscles: MuscleGroup[];
    onMuscleToggle: (muscle: MuscleGroup) => void;
    showLabels?: boolean;
    interactive?: boolean;
    title?: string;  // Optional title - context-specific
    description?: string;  // Optional description
    hideHeader?: boolean;  // Hide title section entirely
}

// Vietnamese label mapping
const muscleLabels: Record<MuscleGroup, string> = {
    [MuscleGroup.ChestUpper]: 'Ngực trên',
    [MuscleGroup.ChestMiddle]: 'Ngực giữa',
    [MuscleGroup.ChestLower]: 'Ngực dưới',
    [MuscleGroup.FrontDelts]: 'Vai trước',
    [MuscleGroup.SideDelts]: 'Vai giữa',
    [MuscleGroup.RearDelts]: 'Vai sau',
    [MuscleGroup.UpperBack]: 'Lưng trên',
    [MuscleGroup.Lats]: 'Lưng xô',
    [MuscleGroup.LowerBack]: 'Lưng dưới',
    [MuscleGroup.Traps]: 'Cơ thang',
    [MuscleGroup.Biceps]: 'Tay trước',
    [MuscleGroup.TricepsLong]: 'Tay sau (dài)',
    [MuscleGroup.TricepsLateral]: 'Tay sau (bên)',
    [MuscleGroup.Forearms]: 'Cẳng tay',
    [MuscleGroup.Quads]: 'Đùi trước',
    [MuscleGroup.Hamstrings]: 'Đùi sau',
    [MuscleGroup.Glutes]: 'Mông',
    [MuscleGroup.Calves]: 'Bắp chân',
    [MuscleGroup.UpperAbs]: 'Bụng trên',
    [MuscleGroup.LowerAbs]: 'Bụng dưới',
    [MuscleGroup.Obliques]: 'Bụng chéo',
    [MuscleGroup.None]: 'Không đau',
};

// Color mapping for muscle groups with gradients
const getMuscleColors = (muscle: MuscleGroup): { base: string; light: string; glow: string } => {
    // Chest - Blue
    if ([MuscleGroup.ChestUpper, MuscleGroup.ChestMiddle, MuscleGroup.ChestLower].includes(muscle)) {
        return { base: '#3B82F6', light: '#60A5FA', glow: '#3B82F680' };
    }
    // Shoulders - Red
    if ([MuscleGroup.FrontDelts, MuscleGroup.SideDelts, MuscleGroup.RearDelts].includes(muscle)) {
        return { base: '#EF4444', light: '#F87171', glow: '#EF444480' };
    }
    // Back - Yellow
    if ([MuscleGroup.UpperBack, MuscleGroup.Lats, MuscleGroup.LowerBack, MuscleGroup.Traps].includes(muscle)) {
        return { base: '#FACC15', light: '#FDE047', glow: '#FACC1580' };
    }
    // Triceps - Green
    if ([MuscleGroup.TricepsLong, MuscleGroup.TricepsLateral].includes(muscle)) {
        return { base: '#10B981', light: '#34D399', glow: '#10B98180' };
    }
    // Biceps & Forearms - Pink
    if ([MuscleGroup.Biceps, MuscleGroup.Forearms].includes(muscle)) {
        return { base: '#EC4899', light: '#F472B6', glow: '#EC489980' };
    }
    // Legs - Purple
    if ([MuscleGroup.Quads, MuscleGroup.Hamstrings, MuscleGroup.Glutes, MuscleGroup.Calves].includes(muscle)) {
        return { base: '#A855F7', light: '#C084FC', glow: '#A855F780' };
    }
    // Core - Orange
    if ([MuscleGroup.UpperAbs, MuscleGroup.LowerAbs, MuscleGroup.Obliques].includes(muscle)) {
        return { base: '#F97316', light: '#FB923C', glow: '#F9731680' };
    }
    return { base: '#6B7280', light: '#9CA3AF', glow: '#6B728080' };
};

export const HumanBodyMuscleMap: React.FC<HumanBodyMuscleMapProps> = ({
    selectedMuscles,
    onMuscleToggle,
    showLabels = true,
    interactive = true,
    title,
    description,
    hideHeader = false,
}) => {
    const [hoveredMuscle, setHoveredMuscle] = useState<MuscleGroup | null>(null);

    const isSelected = (muscle: MuscleGroup) => selectedMuscles.includes(muscle);
    const isHovered = (muscle: MuscleGroup) => hoveredMuscle === muscle;

    const handleMuscleClick = (muscle: MuscleGroup) => {
        if (interactive) {
            onMuscleToggle(muscle);
        }
    };

    const getMuscleStyle = (muscle: MuscleGroup) => {
        const colors = getMuscleColors(muscle);
        const selected = isSelected(muscle);
        const hovered = isHovered(muscle);

        return {
            fill: selected ? `${colors.base}50` : hovered ? `${colors.base}30` : 'transparent',
            stroke: selected ? colors.light : hovered ? `${colors.base}99` : '#ffffff25',
            strokeWidth: selected ? 2.5 : hovered ? 2 : 1,
            filter: selected ? `drop-shadow(0 0 8px ${colors.glow})` : hovered ? `drop-shadow(0 0 4px ${colors.glow})` : 'none',
            cursor: interactive ? 'pointer' : 'default',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        };
    };

    // Label component with connecting line
    const MuscleLabel: React.FC<{
        muscle: MuscleGroup;
        x: number;
        y: number;
        lineX: number;
        lineY: number;
        align?: 'left' | 'right';
    }> = ({ muscle, x, y, lineX, lineY, align = 'left' }) => {
        const colors = getMuscleColors(muscle);
        const selected = isSelected(muscle);
        const hovered = isHovered(muscle);
        const visible = selected || hovered;

        if (!showLabels || !visible) return null;

        return (
            <g style={{ transition: 'opacity 0.2s' }}>
                {/* Connecting line */}
                <line
                    x1={lineX}
                    y1={lineY}
                    x2={x}
                    y2={y}
                    stroke={colors.base}
                    strokeWidth="1"
                    strokeDasharray="3,2"
                    opacity="0.6"
                />
                {/* Label background */}
                <rect
                    x={align === 'left' ? x - 2 : x - 58}
                    y={y - 10}
                    width="60"
                    height="18"
                    rx="4"
                    fill="rgba(0,0,0,0.7)"
                    stroke={colors.base}
                    strokeWidth="1"
                />
                {/* Label text */}
                <text
                    x={align === 'left' ? x + 28 : x - 28}
                    y={y + 3}
                    textAnchor="middle"
                    fill="white"
                    fontSize="9"
                    fontWeight="600"
                    style={{ textShadow: `0 0 4px ${colors.glow}` }}
                >
                    {muscleLabels[muscle]}
                </text>
            </g>
        );
    };

    return (
        <div className="flex flex-col items-center gap-6 w-full">
            {/* Title - Only show if not hidden and has content */}
            {!hideHeader && (title || description) && (
                <div className="text-center">
                    {title && (
                        <h3 className="text-lg font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                            {title}
                        </h3>
                    )}
                    {description && (
                        <p className="text-xs text-gray-400 mt-1">{description}</p>
                    )}
                </div>
            )}

            {/* Body Views Container */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 w-full">

                {/* FRONT VIEW */}
                <div className="relative flex flex-col items-center">
                    <div className="text-xs font-semibold text-blue-400 mb-2 uppercase tracking-wider">Mặt trước</div>
                    <div className="relative p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                        <svg
                            viewBox="0 0 200 400"
                            className="w-[160px] md:w-[180px] h-auto"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <defs>
                                {/* Gradient definitions */}
                                <radialGradient id="bodyGlow" cx="50%" cy="30%" r="70%">
                                    <stop offset="0%" stopColor="#ffffff10" />
                                    <stop offset="100%" stopColor="#00000000" />
                                </radialGradient>
                            </defs>

                            {/* Body silhouette glow */}
                            <ellipse cx="100" cy="180" rx="70" ry="150" fill="url(#bodyGlow)" />

                            {/* Head */}
                            <ellipse cx="100" cy="28" rx="20" ry="24" fill="none" stroke="#ffffff30" strokeWidth="1.5" />

                            {/* Neck */}
                            <rect x="90" y="50" width="20" height="15" fill="none" stroke="#ffffff20" strokeWidth="1" />

                            {/* === CHEST === */}
                            {/* Upper Chest */}
                            <path
                                d="M 75 68 Q 100 62 125 68 L 122 88 Q 100 84 78 88 Z"
                                {...getMuscleStyle(MuscleGroup.ChestUpper)}
                                onClick={() => handleMuscleClick(MuscleGroup.ChestUpper)}
                                onMouseEnter={() => setHoveredMuscle(MuscleGroup.ChestUpper)}
                                onMouseLeave={() => setHoveredMuscle(null)}
                            />
                            {/* Middle Chest */}
                            <path
                                d="M 78 88 Q 100 84 122 88 L 118 115 Q 100 110 82 115 Z"
                                {...getMuscleStyle(MuscleGroup.ChestMiddle)}
                                onClick={() => handleMuscleClick(MuscleGroup.ChestMiddle)}
                                onMouseEnter={() => setHoveredMuscle(MuscleGroup.ChestMiddle)}
                                onMouseLeave={() => setHoveredMuscle(null)}
                            />
                            {/* Lower Chest */}
                            <path
                                d="M 82 115 Q 100 110 118 115 L 115 135 Q 100 130 85 135 Z"
                                {...getMuscleStyle(MuscleGroup.ChestLower)}
                                onClick={() => handleMuscleClick(MuscleGroup.ChestLower)}
                                onMouseEnter={() => setHoveredMuscle(MuscleGroup.ChestLower)}
                                onMouseLeave={() => setHoveredMuscle(null)}
                            />

                            {/* === SHOULDERS (Front) === */}
                            {/* Left Front Delt */}
                            <path
                                d="M 55 68 L 75 68 L 78 88 L 60 85 Z"
                                {...getMuscleStyle(MuscleGroup.FrontDelts)}
                                onClick={() => handleMuscleClick(MuscleGroup.FrontDelts)}
                                onMouseEnter={() => setHoveredMuscle(MuscleGroup.FrontDelts)}
                                onMouseLeave={() => setHoveredMuscle(null)}
                            />
                            {/* Right Front Delt */}
                            <path
                                d="M 145 68 L 125 68 L 122 88 L 140 85 Z"
                                {...getMuscleStyle(MuscleGroup.FrontDelts)}
                                onClick={() => handleMuscleClick(MuscleGroup.FrontDelts)}
                                onMouseEnter={() => setHoveredMuscle(MuscleGroup.FrontDelts)}
                                onMouseLeave={() => setHoveredMuscle(null)}
                            />

                            {/* Left Side Delt */}
                            <path
                                d="M 48 72 L 55 68 L 60 85 L 52 92 Z"
                                {...getMuscleStyle(MuscleGroup.SideDelts)}
                                onClick={() => handleMuscleClick(MuscleGroup.SideDelts)}
                                onMouseEnter={() => setHoveredMuscle(MuscleGroup.SideDelts)}
                                onMouseLeave={() => setHoveredMuscle(null)}
                            />
                            {/* Right Side Delt */}
                            <path
                                d="M 152 72 L 145 68 L 140 85 L 148 92 Z"
                                {...getMuscleStyle(MuscleGroup.SideDelts)}
                                onClick={() => handleMuscleClick(MuscleGroup.SideDelts)}
                                onMouseEnter={() => setHoveredMuscle(MuscleGroup.SideDelts)}
                                onMouseLeave={() => setHoveredMuscle(null)}
                            />

                            {/* === BICEPS === */}
                            {/* Left Bicep */}
                            <path
                                d="M 52 92 L 60 85 L 62 140 L 50 145 Z"
                                {...getMuscleStyle(MuscleGroup.Biceps)}
                                onClick={() => handleMuscleClick(MuscleGroup.Biceps)}
                                onMouseEnter={() => setHoveredMuscle(MuscleGroup.Biceps)}
                                onMouseLeave={() => setHoveredMuscle(null)}
                            />
                            {/* Right Bicep */}
                            <path
                                d="M 148 92 L 140 85 L 138 140 L 150 145 Z"
                                {...getMuscleStyle(MuscleGroup.Biceps)}
                                onClick={() => handleMuscleClick(MuscleGroup.Biceps)}
                                onMouseEnter={() => setHoveredMuscle(MuscleGroup.Biceps)}
                                onMouseLeave={() => setHoveredMuscle(null)}
                            />

                            {/* === FOREARMS === */}
                            {/* Left Forearm */}
                            <path
                                d="M 50 145 L 62 140 L 58 185 L 45 190 Z"
                                {...getMuscleStyle(MuscleGroup.Forearms)}
                                onClick={() => handleMuscleClick(MuscleGroup.Forearms)}
                                onMouseEnter={() => setHoveredMuscle(MuscleGroup.Forearms)}
                                onMouseLeave={() => setHoveredMuscle(null)}
                            />
                            {/* Right Forearm */}
                            <path
                                d="M 150 145 L 138 140 L 142 185 L 155 190 Z"
                                {...getMuscleStyle(MuscleGroup.Forearms)}
                                onClick={() => handleMuscleClick(MuscleGroup.Forearms)}
                                onMouseEnter={() => setHoveredMuscle(MuscleGroup.Forearms)}
                                onMouseLeave={() => setHoveredMuscle(null)}
                            />

                            {/* === ABS === */}
                            {/* Upper Abs */}
                            <path
                                d="M 85 135 Q 100 130 115 135 L 112 165 Q 100 160 88 165 Z"
                                {...getMuscleStyle(MuscleGroup.UpperAbs)}
                                onClick={() => handleMuscleClick(MuscleGroup.UpperAbs)}
                                onMouseEnter={() => setHoveredMuscle(MuscleGroup.UpperAbs)}
                                onMouseLeave={() => setHoveredMuscle(null)}
                            />
                            {/* Lower Abs */}
                            <path
                                d="M 88 165 Q 100 160 112 165 L 110 195 Q 100 190 90 195 Z"
                                {...getMuscleStyle(MuscleGroup.LowerAbs)}
                                onClick={() => handleMuscleClick(MuscleGroup.LowerAbs)}
                                onMouseEnter={() => setHoveredMuscle(MuscleGroup.LowerAbs)}
                                onMouseLeave={() => setHoveredMuscle(null)}
                            />
                            {/* Left Oblique */}
                            <path
                                d="M 78 140 L 85 135 L 90 195 L 82 200 Z"
                                {...getMuscleStyle(MuscleGroup.Obliques)}
                                onClick={() => handleMuscleClick(MuscleGroup.Obliques)}
                                onMouseEnter={() => setHoveredMuscle(MuscleGroup.Obliques)}
                                onMouseLeave={() => setHoveredMuscle(null)}
                            />
                            {/* Right Oblique */}
                            <path
                                d="M 122 140 L 115 135 L 110 195 L 118 200 Z"
                                {...getMuscleStyle(MuscleGroup.Obliques)}
                                onClick={() => handleMuscleClick(MuscleGroup.Obliques)}
                                onMouseEnter={() => setHoveredMuscle(MuscleGroup.Obliques)}
                                onMouseLeave={() => setHoveredMuscle(null)}
                            />

                            {/* === QUADS === */}
                            {/* Left Quad */}
                            <path
                                d="M 82 200 L 90 195 L 88 290 L 75 295 Z"
                                {...getMuscleStyle(MuscleGroup.Quads)}
                                onClick={() => handleMuscleClick(MuscleGroup.Quads)}
                                onMouseEnter={() => setHoveredMuscle(MuscleGroup.Quads)}
                                onMouseLeave={() => setHoveredMuscle(null)}
                            />
                            {/* Right Quad */}
                            <path
                                d="M 118 200 L 110 195 L 112 290 L 125 295 Z"
                                {...getMuscleStyle(MuscleGroup.Quads)}
                                onClick={() => handleMuscleClick(MuscleGroup.Quads)}
                                onMouseEnter={() => setHoveredMuscle(MuscleGroup.Quads)}
                                onMouseLeave={() => setHoveredMuscle(null)}
                            />

                            {/* === CALVES (Front) === */}
                            {/* Left Calf */}
                            <path
                                d="M 75 295 L 88 290 L 85 360 L 72 365 Z"
                                {...getMuscleStyle(MuscleGroup.Calves)}
                                onClick={() => handleMuscleClick(MuscleGroup.Calves)}
                                onMouseEnter={() => setHoveredMuscle(MuscleGroup.Calves)}
                                onMouseLeave={() => setHoveredMuscle(null)}
                            />
                            {/* Right Calf */}
                            <path
                                d="M 125 295 L 112 290 L 115 360 L 128 365 Z"
                                {...getMuscleStyle(MuscleGroup.Calves)}
                                onClick={() => handleMuscleClick(MuscleGroup.Calves)}
                                onMouseEnter={() => setHoveredMuscle(MuscleGroup.Calves)}
                                onMouseLeave={() => setHoveredMuscle(null)}
                            />

                            {/* === LABELS (Front) === */}
                            <MuscleLabel muscle={MuscleGroup.ChestUpper} x={2} y={75} lineX={75} lineY={78} align="left" />
                            <MuscleLabel muscle={MuscleGroup.ChestMiddle} x={2} y={100} lineX={78} lineY={100} align="left" />
                            <MuscleLabel muscle={MuscleGroup.ChestLower} x={2} y={125} lineX={82} lineY={125} align="left" />
                            <MuscleLabel muscle={MuscleGroup.FrontDelts} x={138} y={75} lineX={125} lineY={78} align="right" />
                            <MuscleLabel muscle={MuscleGroup.SideDelts} x={155} y={85} lineX={148} lineY={82} align="right" />
                            <MuscleLabel muscle={MuscleGroup.Biceps} x={2} y={115} lineX={55} lineY={115} align="left" />
                            <MuscleLabel muscle={MuscleGroup.Forearms} x={2} y={165} lineX={52} lineY={165} align="left" />
                            <MuscleLabel muscle={MuscleGroup.UpperAbs} x={138} y={150} lineX={112} lineY={150} align="right" />
                            <MuscleLabel muscle={MuscleGroup.LowerAbs} x={138} y={180} lineX={110} lineY={180} align="right" />
                            <MuscleLabel muscle={MuscleGroup.Obliques} x={2} y={170} lineX={80} lineY={170} align="left" />
                            <MuscleLabel muscle={MuscleGroup.Quads} x={138} y={245} lineX={112} lineY={245} align="right" />
                            <MuscleLabel muscle={MuscleGroup.Calves} x={138} y={330} lineX={115} lineY={330} align="right" />
                        </svg>
                    </div>
                </div>

                {/* BACK VIEW */}
                <div className="relative flex flex-col items-center">
                    <div className="text-xs font-semibold text-purple-400 mb-2 uppercase tracking-wider">Mặt sau</div>
                    <div className="relative p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                        <svg
                            viewBox="0 0 200 400"
                            className="w-[160px] md:w-[180px] h-auto"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            {/* Body silhouette glow */}
                            <ellipse cx="100" cy="180" rx="70" ry="150" fill="url(#bodyGlow)" />

                            {/* Head */}
                            <ellipse cx="100" cy="28" rx="20" ry="24" fill="none" stroke="#ffffff30" strokeWidth="1.5" />

                            {/* Neck */}
                            <rect x="90" y="50" width="20" height="15" fill="none" stroke="#ffffff20" strokeWidth="1" />

                            {/* === TRAPS === */}
                            <path
                                d="M 80 60 Q 100 55 120 60 L 125 80 Q 100 75 75 80 Z"
                                {...getMuscleStyle(MuscleGroup.Traps)}
                                onClick={() => handleMuscleClick(MuscleGroup.Traps)}
                                onMouseEnter={() => setHoveredMuscle(MuscleGroup.Traps)}
                                onMouseLeave={() => setHoveredMuscle(null)}
                            />

                            {/* === REAR DELTS === */}
                            {/* Left Rear Delt */}
                            <path
                                d="M 55 68 L 70 65 L 75 88 L 58 90 Z"
                                {...getMuscleStyle(MuscleGroup.RearDelts)}
                                onClick={() => handleMuscleClick(MuscleGroup.RearDelts)}
                                onMouseEnter={() => setHoveredMuscle(MuscleGroup.RearDelts)}
                                onMouseLeave={() => setHoveredMuscle(null)}
                            />
                            {/* Right Rear Delt */}
                            <path
                                d="M 145 68 L 130 65 L 125 88 L 142 90 Z"
                                {...getMuscleStyle(MuscleGroup.RearDelts)}
                                onClick={() => handleMuscleClick(MuscleGroup.RearDelts)}
                                onMouseEnter={() => setHoveredMuscle(MuscleGroup.RearDelts)}
                                onMouseLeave={() => setHoveredMuscle(null)}
                            />

                            {/* === UPPER BACK === */}
                            <path
                                d="M 75 80 Q 100 75 125 80 L 122 110 Q 100 105 78 110 Z"
                                {...getMuscleStyle(MuscleGroup.UpperBack)}
                                onClick={() => handleMuscleClick(MuscleGroup.UpperBack)}
                                onMouseEnter={() => setHoveredMuscle(MuscleGroup.UpperBack)}
                                onMouseLeave={() => setHoveredMuscle(null)}
                            />

                            {/* === LATS === */}
                            {/* Left Lat */}
                            <path
                                d="M 70 100 L 78 110 L 82 155 L 72 160 Z"
                                {...getMuscleStyle(MuscleGroup.Lats)}
                                onClick={() => handleMuscleClick(MuscleGroup.Lats)}
                                onMouseEnter={() => setHoveredMuscle(MuscleGroup.Lats)}
                                onMouseLeave={() => setHoveredMuscle(null)}
                            />
                            {/* Right Lat */}
                            <path
                                d="M 130 100 L 122 110 L 118 155 L 128 160 Z"
                                {...getMuscleStyle(MuscleGroup.Lats)}
                                onClick={() => handleMuscleClick(MuscleGroup.Lats)}
                                onMouseEnter={() => setHoveredMuscle(MuscleGroup.Lats)}
                                onMouseLeave={() => setHoveredMuscle(null)}
                            />

                            {/* === LOWER BACK === */}
                            <path
                                d="M 82 155 Q 100 150 118 155 L 115 195 Q 100 190 85 195 Z"
                                {...getMuscleStyle(MuscleGroup.LowerBack)}
                                onClick={() => handleMuscleClick(MuscleGroup.LowerBack)}
                                onMouseEnter={() => setHoveredMuscle(MuscleGroup.LowerBack)}
                                onMouseLeave={() => setHoveredMuscle(null)}
                            />

                            {/* === TRICEPS === */}
                            {/* Left Triceps Long */}
                            <path
                                d="M 52 90 L 58 90 L 60 130 L 50 135 Z"
                                {...getMuscleStyle(MuscleGroup.TricepsLong)}
                                onClick={() => handleMuscleClick(MuscleGroup.TricepsLong)}
                                onMouseEnter={() => setHoveredMuscle(MuscleGroup.TricepsLong)}
                                onMouseLeave={() => setHoveredMuscle(null)}
                            />
                            {/* Right Triceps Long */}
                            <path
                                d="M 148 90 L 142 90 L 140 130 L 150 135 Z"
                                {...getMuscleStyle(MuscleGroup.TricepsLong)}
                                onClick={() => handleMuscleClick(MuscleGroup.TricepsLong)}
                                onMouseEnter={() => setHoveredMuscle(MuscleGroup.TricepsLong)}
                                onMouseLeave={() => setHoveredMuscle(null)}
                            />

                            {/* Left Triceps Lateral */}
                            <path
                                d="M 50 135 L 60 130 L 58 145 L 48 150 Z"
                                {...getMuscleStyle(MuscleGroup.TricepsLateral)}
                                onClick={() => handleMuscleClick(MuscleGroup.TricepsLateral)}
                                onMouseEnter={() => setHoveredMuscle(MuscleGroup.TricepsLateral)}
                                onMouseLeave={() => setHoveredMuscle(null)}
                            />
                            {/* Right Triceps Lateral */}
                            <path
                                d="M 150 135 L 140 130 L 142 145 L 152 150 Z"
                                {...getMuscleStyle(MuscleGroup.TricepsLateral)}
                                onClick={() => handleMuscleClick(MuscleGroup.TricepsLateral)}
                                onMouseEnter={() => setHoveredMuscle(MuscleGroup.TricepsLateral)}
                                onMouseLeave={() => setHoveredMuscle(null)}
                            />

                            {/* === GLUTES === */}
                            {/* Left Glute */}
                            <path
                                d="M 80 195 L 100 190 L 98 225 L 78 230 Z"
                                {...getMuscleStyle(MuscleGroup.Glutes)}
                                onClick={() => handleMuscleClick(MuscleGroup.Glutes)}
                                onMouseEnter={() => setHoveredMuscle(MuscleGroup.Glutes)}
                                onMouseLeave={() => setHoveredMuscle(null)}
                            />
                            {/* Right Glute */}
                            <path
                                d="M 120 195 L 100 190 L 102 225 L 122 230 Z"
                                {...getMuscleStyle(MuscleGroup.Glutes)}
                                onClick={() => handleMuscleClick(MuscleGroup.Glutes)}
                                onMouseEnter={() => setHoveredMuscle(MuscleGroup.Glutes)}
                                onMouseLeave={() => setHoveredMuscle(null)}
                            />

                            {/* === HAMSTRINGS === */}
                            {/* Left Hamstring */}
                            <path
                                d="M 78 230 L 98 225 L 92 295 L 75 300 Z"
                                {...getMuscleStyle(MuscleGroup.Hamstrings)}
                                onClick={() => handleMuscleClick(MuscleGroup.Hamstrings)}
                                onMouseEnter={() => setHoveredMuscle(MuscleGroup.Hamstrings)}
                                onMouseLeave={() => setHoveredMuscle(null)}
                            />
                            {/* Right Hamstring */}
                            <path
                                d="M 122 230 L 102 225 L 108 295 L 125 300 Z"
                                {...getMuscleStyle(MuscleGroup.Hamstrings)}
                                onClick={() => handleMuscleClick(MuscleGroup.Hamstrings)}
                                onMouseEnter={() => setHoveredMuscle(MuscleGroup.Hamstrings)}
                                onMouseLeave={() => setHoveredMuscle(null)}
                            />

                            {/* === CALVES (Back) === */}
                            {/* Left Calf */}
                            <path
                                d="M 75 300 L 92 295 L 88 365 L 72 370 Z"
                                {...getMuscleStyle(MuscleGroup.Calves)}
                                onClick={() => handleMuscleClick(MuscleGroup.Calves)}
                                onMouseEnter={() => setHoveredMuscle(MuscleGroup.Calves)}
                                onMouseLeave={() => setHoveredMuscle(null)}
                            />
                            {/* Right Calf */}
                            <path
                                d="M 125 300 L 108 295 L 112 365 L 128 370 Z"
                                {...getMuscleStyle(MuscleGroup.Calves)}
                                onClick={() => handleMuscleClick(MuscleGroup.Calves)}
                                onMouseEnter={() => setHoveredMuscle(MuscleGroup.Calves)}
                                onMouseLeave={() => setHoveredMuscle(null)}
                            />

                            {/* === LABELS (Back) === */}
                            <MuscleLabel muscle={MuscleGroup.Traps} x={138} y={68} lineX={120} lineY={68} align="right" />
                            <MuscleLabel muscle={MuscleGroup.RearDelts} x={2} y={78} lineX={55} lineY={78} align="left" />
                            <MuscleLabel muscle={MuscleGroup.UpperBack} x={138} y={95} lineX={122} lineY={95} align="right" />
                            <MuscleLabel muscle={MuscleGroup.Lats} x={2} y={130} lineX={70} lineY={130} align="left" />
                            <MuscleLabel muscle={MuscleGroup.LowerBack} x={138} y={175} lineX={115} lineY={175} align="right" />
                            <MuscleLabel muscle={MuscleGroup.TricepsLong} x={155} y={110} lineX={148} lineY={110} align="right" />
                            <MuscleLabel muscle={MuscleGroup.TricepsLateral} x={155} y={142} lineX={150} lineY={142} align="right" />
                            <MuscleLabel muscle={MuscleGroup.Glutes} x={2} y={212} lineX={78} lineY={212} align="left" />
                            <MuscleLabel muscle={MuscleGroup.Hamstrings} x={138} y={260} lineX={108} lineY={260} align="right" />
                            <MuscleLabel muscle={MuscleGroup.Calves} x={2} y={335} lineX={75} lineY={335} align="left" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 justify-center text-xs px-4">
                {[
                    { label: 'Ngực', color: '#3B82F6' },
                    { label: 'Vai', color: '#EF4444' },
                    { label: 'Lưng', color: '#FACC15' },
                    { label: 'Tay trước', color: '#EC4899' },
                    { label: 'Tay sau', color: '#10B981' },
                    { label: 'Chân', color: '#A855F7' },
                    { label: 'Bụng', color: '#F97316' },
                ].map(({ label, color }) => (
                    <div key={label} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5">
                        <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}80` }}
                        />
                        <span className="text-gray-300 font-medium">{label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

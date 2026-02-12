import React from 'react';

interface ActivityRingsProps {
    /** 0-1 progress for outer ring (exercises) */
    move: number;
    /** 0-1 progress for middle ring (calories) */
    exercise: number;
    /** 0-1 progress for inner ring (protein) */
    stand: number;
    /** Size in px */
    size?: number;
    /** Whether this is today */
    isToday?: boolean;
}

export const ActivityRings: React.FC<ActivityRingsProps> = ({
    move,
    exercise,
    stand,
    size = 44,
    isToday = false,
}) => {
    const center = size / 2;
    const strokeWidth = size * 0.11;
    const gap = strokeWidth * 0.45;

    // Radii for 3 rings (outer → inner)
    const r1 = center - strokeWidth / 2 - 1;
    const r2 = r1 - strokeWidth - gap;
    const r3 = r2 - strokeWidth - gap;

    const clamp = (v: number) => Math.min(Math.max(v, 0), 1);

    const ringData = [
        { r: r1, progress: clamp(move), color: '#fa114f', bgColor: '#3a0a1a' },      // Red
        { r: r2, progress: clamp(exercise), color: '#92e82a', bgColor: '#1a2a0a' },   // Green  
        { r: r3, progress: clamp(stand), color: '#00d4aa', bgColor: '#0a1a1a' },      // Teal/Cyan
    ];

    return (
        <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className={`transition-transform duration-200 ${isToday ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.25)]' : ''}`}
        >
            {ringData.map(({ r, progress, color, bgColor }, i) => {
                const circumference = 2 * Math.PI * r;
                const progressDash = circumference * progress;
                const gapDash = circumference - progressDash;

                return (
                    <g key={i}>
                        {/* Background track */}
                        <circle
                            cx={center}
                            cy={center}
                            r={r}
                            fill="none"
                            stroke={bgColor}
                            strokeWidth={strokeWidth}
                            strokeLinecap="round"
                        />
                        {/* Progress arc */}
                        {progress > 0 && (
                            <circle
                                cx={center}
                                cy={center}
                                r={r}
                                fill="none"
                                stroke={color}
                                strokeWidth={strokeWidth}
                                strokeLinecap="round"
                                strokeDasharray={`${progressDash} ${gapDash}`}
                                strokeDashoffset={circumference * 0.25}
                                style={{
                                    filter: `drop-shadow(0 0 ${strokeWidth * 0.6}px ${color}60)`,
                                    transition: 'stroke-dasharray 0.5s ease',
                                }}
                            />
                        )}
                        {/* Small dot at the end of progress arc for glow effect */}
                        {progress > 0.05 && progress < 0.98 && (
                            <circle
                                cx={center + r * Math.cos(2 * Math.PI * (progress - 0.25))}
                                cy={center + r * Math.sin(2 * Math.PI * (progress - 0.25))}
                                r={strokeWidth / 2}
                                fill={color}
                                style={{
                                    filter: `drop-shadow(0 0 3px ${color})`,
                                }}
                            />
                        )}
                    </g>
                );
            })}
        </svg>
    );
};

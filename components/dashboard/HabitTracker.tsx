import React, { useMemo, useState } from 'react';
import { WorkoutHistoryItem } from '../../types';
import { Activity, Flame } from 'lucide-react';

interface HabitTrackerProps {
    history: WorkoutHistoryItem[];
}

// User requested "only 30 days", so 5 weeks x 7 days = 35 days fits perfectly in the grid.
const WEEKS_TO_SHOW = 5;

export const HabitTracker: React.FC<HabitTrackerProps> = ({ history }) => {
    const [selectedDay, setSelectedDay] = useState<{ date: string, count: number } | null>(null);

    // Process history into a map for fast lookup
    const dailyData = useMemo(() => {
        const map = new Map<string, number>();
        history.forEach(h => {
            if (h.timestamp) {
                const dStr = new Date(h.timestamp).toISOString().split('T')[0];
                const current = map.get(dStr) || 0;
                const count = h.completedExercises ? h.completedExercises.length : 1;
                map.set(dStr, current + count);
            }
        });
        return map;
    }, [history]);

    // Generate grid data: Array of Weeks, where each week has 7 Days
    const weeks = useMemo(() => {
        const today = new Date();

        // Calculate Current Week's Monday to anchor the grid correctly.
        // We want the LAST column to be the Current Week.
        // JS getDay(): 0=Sun, 1=Mon...6=Sat.
        // To find Monday: subtract (day - 1). If Sun(0), subtract -6? No, subtract 6.
        // Formula: daysToSubtract = (today.getDay() + 6) % 7
        // Ex: Mon(1) -> (1+6)%7 = 0. Tue(2) -> 1. Sun(0) -> 6. 
        const daysSinceMonday = (today.getDay() + 6) % 7;
        const currentMonday = new Date(today);
        currentMonday.setDate(today.getDate() - daysSinceMonday);

        // Start Date is determined by going back (WEEKS_TO_SHOW - 1) weeks from this week's Monday.
        const startMonday = new Date(currentMonday);
        startMonday.setDate(currentMonday.getDate() - ((WEEKS_TO_SHOW - 1) * 7));

        // Now generate weeks from startMonday
        const grid = [];
        let current = new Date(startMonday);

        // Generate ISO string for today to handle "Future" check robustly
        // Using local time offset trick to ensure YYYY-MM-DD matches user's wall clock
        const getLocalISODate = (d: Date) => {
            const offset = d.getTimezoneOffset() * 60000;
            return new Date(d.getTime() - offset).toISOString().split('T')[0];
        };
        const todayStr = getLocalISODate(today);

        for (let i = 0; i < WEEKS_TO_SHOW; i++) {
            const week = [];
            for (let j = 0; j < 7; j++) {
                const dStr = getLocalISODate(current);
                const count = dailyData.get(dStr) || 0;

                // determine intensity
                let intensity = 0;
                if (count > 0) intensity = 1;
                if (count >= 3) intensity = 2;
                if (count >= 5) intensity = 3;
                if (count >= 7) intensity = 4;

                // Check if future
                const isFuture = dStr > todayStr;

                week.push({
                    date: new Date(current),
                    dateStr: dStr,
                    count,
                    intensity,
                    isFuture
                });
                current.setDate(current.getDate() + 1);
            }
            grid.push(week);
        }
        return grid;
    }, [dailyData]);

    const colorMap: any = {
        0: 'bg-white/5',
        1: 'bg-emerald-500/40',
        2: 'bg-emerald-500/60',
        3: 'bg-emerald-500/80',
        4: 'bg-emerald-500',
    };

    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-orange-500" />
                    <h3 className="text-lg font-bold text-white">Chuỗi hoạt động</h3>
                </div>
                <div className="text-xs text-gray-400">
                    {selectedDay ? (
                        <span className="text-emerald-300 font-bold animate-pulse">
                            {new Date(selectedDay.date).toLocaleDateString('vi-VN')}: {selectedDay.count} bài
                        </span>
                    ) : 'Chạm vào ô để xem chi tiết'}
                </div>
            </div>

            {/* Scrollable Container for Mobile */}
            <div className="flex gap-2">
                {/* Day Labels Column */}
                <div className="flex flex-col gap-[3px] py-[1px] pt-[2px]">
                    <div className="h-3 sm:h-4 text-[9px] text-gray-500 flex items-center justify-center font-bold">T2</div>
                    <div className="h-3 sm:h-4 text-[9px] text-gray-500 flex items-center justify-center font-bold">T3</div>
                    <div className="h-3 sm:h-4 text-[9px] text-gray-500 flex items-center justify-center font-bold">T4</div>
                    <div className="h-3 sm:h-4 text-[9px] text-gray-500 flex items-center justify-center font-bold">T5</div>
                    <div className="h-3 sm:h-4 text-[9px] text-gray-500 flex items-center justify-center font-bold">T6</div>
                    <div className="h-3 sm:h-4 text-[9px] text-gray-500 flex items-center justify-center font-bold">T7</div>
                    <div className="h-3 sm:h-4 text-[9px] text-gray-500 flex items-center justify-center font-bold text-red-400">CN</div>
                </div>

                {/* Grid */}
                <div className="overflow-x-auto pb-2 scrollbar-hide">
                    <div className="flex gap-[3px] min-w-max">
                        {weeks.map((week, wIdx) => (
                            <div key={wIdx} className="flex flex-col gap-[3px]">
                                {week.map((day, dIdx) => (
                                    <div
                                        key={dIdx}
                                        onClick={() => !day.isFuture && setSelectedDay({ date: day.dateStr, count: day.count })}
                                        className={`
                                            w-3 h-3 sm:w-4 sm:h-4 rounded-[1px] cursor-pointer transition-all hover:scale-125 hover:z-10 relative
                                            ${day.isFuture ? 'opacity-0 cursor-default' : colorMap[day.intensity]}
                                            ${selectedDay?.date === day.dateStr ? 'ring-2 ring-white z-20' : ''}
                                        `}
                                        title={day.isFuture ? '' : `${day.dateStr}: ${day.count} bài`}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-2 mt-4 text-[10px] text-gray-500 justify-end">
                <span>Ít</span>
                <div className="w-2 h-2 rounded-[1px] bg-white/5"></div>
                <div className="w-2 h-2 rounded-[1px] bg-emerald-500/40"></div>
                <div className="w-2 h-2 rounded-[1px] bg-emerald-500/60"></div>
                <div className="w-2 h-2 rounded-[1px] bg-emerald-500/80"></div>
                <div className="w-2 h-2 rounded-[1px] bg-emerald-500"></div>
                <span>Nhiều</span>
            </div>
        </div>
    );
};

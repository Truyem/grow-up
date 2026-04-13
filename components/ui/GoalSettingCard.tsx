import React, { useState, useEffect, useMemo } from 'react';
import { UserGoals, WeeklyGoal, WorkoutHistoryItem, UserInput } from '../../types';
import { Target, TrendingDown, TrendingUp, Calendar, Check, ChevronDown, ChevronUp, Award } from 'lucide-react';

interface GoalSettingProps {
    goals: UserGoals | null;
    onSave: (goals: UserGoals) => void;
    history: WorkoutHistoryItem[];
    userData: UserInput;
}

function getWeekKey(date: Date): string {
    const d = new Date(date);
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    d.setHours(0, 0, 0, 0);
    return d.toISOString().split('T')[0];
}

function getCurrentWeekSessions(history: WorkoutHistoryItem[]): number {
    const thisWeek = getWeekKey(new Date());
    return history.filter(h => {
        if (!h.timestamp) return false;
        return getWeekKey(new Date(h.timestamp)) === thisWeek &&
            h.levelSelected !== 'Ốm/Bệnh' &&
            h.levelSelected !== 'Chỉ dinh dưỡng';
    }).length;
}

function getThisMonthHistory(history: WorkoutHistoryItem[]): WorkoutHistoryItem[] {
    const now = new Date();
    return history.filter(h => {
        if (!h.timestamp) return false;
        const d = new Date(h.timestamp);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
}

export const GoalSettingCard: React.FC<GoalSettingProps> = ({ goals, onSave, history, userData }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [sessions, setSessions] = useState(goals?.weekly?.sessionsPerWeek ?? 4);
    const [targetWeight, setTargetWeight] = useState(goals?.weekly?.targetWeightKg?.toString() ?? '');
    const [targetDate, setTargetDate] = useState(goals?.weekly?.targetDate ?? '');
    const [notes, setNotes] = useState(goals?.weekly?.notes ?? '');

    // Update local state when goals change externally
    useEffect(() => {
        if (goals) {
            setSessions(goals.weekly.sessionsPerWeek);
            setTargetWeight(goals.weekly.targetWeightKg?.toString() ?? '');
            setTargetDate(goals.weekly.targetDate ?? '');
            setNotes(goals.weekly.notes ?? '');
        }
    }, [goals]);

    // Progress stats
    const currentWeekSessions = useMemo(() => getCurrentWeekSessions(history), [history]);
    const sessionProgress = goals ? Math.min(100, Math.round((currentWeekSessions / goals.weekly.sessionsPerWeek) * 100)) : 0;

    const monthHistory = useMemo(() => getThisMonthHistory(history), [history]);
    const monthSessions = monthHistory.length;

    // Weight progress
    const targetWeightVal = goals?.weekly?.targetWeightKg;
    let weightDiffStr = "—";
    let weightDiffLabel = "Mục tiêu cân";
    let weightDiffColor = "text-gray-500";

    if (targetWeightVal) {
        const diff = Math.round((userData.weight - targetWeightVal) * 10) / 10;
        if (diff > 0) {
            // Need to lose
            weightDiffStr = `${diff}`;
            weightDiffLabel = "Cần giảm thêm";
            weightDiffColor = "text-amber-400";
        } else if (diff < 0) {
            // Need to gain
            weightDiffStr = `${Math.abs(diff)}`;
            weightDiffLabel = "Cần tăng thêm";
            weightDiffColor = "text-emerald-400";
        } else {
            weightDiffStr = "0";
            weightDiffLabel = "Đã đạt mục tiêu";
            weightDiffColor = "text-blue-400";
        }
    }

    // Days left to target date
    const daysLeft = goals?.weekly?.targetDate
        ? Math.max(0, Math.ceil((new Date(goals.weekly.targetDate).getTime() - Date.now()) / 86400000))
        : null;

    const handleSave = () => {
        const weekly: WeeklyGoal = {
            sessionsPerWeek: sessions,
            targetWeightKg: targetWeight ? parseFloat(targetWeight) : undefined,
            targetDate: targetDate || undefined,
            notes: notes || undefined,
        };
        onSave({
            weekly,
            createdAt: goals?.createdAt ?? new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
        setIsExpanded(false);
    };

    const isOnTrack = currentWeekSessions >= (goals?.weekly?.sessionsPerWeek ?? 4);

    return (
        <div className="rounded-2xl border border-purple-500/30 bg-purple-500/5 backdrop-blur-md overflow-hidden">
            {/* Header - always visible */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
                        <Target className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                        <h3 className="font-bold text-white">Mục Tiêu</h3>
                        {goals ? (
                            <p className="text-xs text-purple-300">
                                {currentWeekSessions}/{goals.weekly.sessionsPerWeek} buổi tuần này
                                {isOnTrack ? ' ✓' : ''}
                            </p>
                        ) : (
                            <p className="text-xs text-gray-500">Chưa đặt mục tiêu</p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {goals && (
                        <div
                            className="h-2 w-20 rounded-full bg-white/10 overflow-hidden"
                            title={`${sessionProgress}%`}
                        >
                            <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                    width: `${sessionProgress}%`,
                                    backgroundColor: isOnTrack ? '#22c55e' : '#a855f7',
                                }}
                            />
                        </div>
                    )}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
            </button>

            {/* Stats bar - only if goals set */}
            {goals && !isExpanded && (
                <div className="grid grid-cols-3 gap-0 border-t border-white/5">
                    <div className="p-3 text-center border-r border-white/5">
                        <p className="text-lg font-bold text-white">{currentWeekSessions}<span className="text-gray-400 text-sm">/{goals.weekly.sessionsPerWeek}</span></p>
                        <p className="text-[10px] text-gray-500">Buổi/tuần</p>
                    </div>
                    <div className="p-3 text-center border-r border-white/5">
                        <p className="text-lg font-bold text-white">{monthSessions}</p>
                        <p className="text-[10px] text-gray-500">Buổi tháng này</p>
                    </div>
                    <div className="p-3 text-center">
                        {targetWeightVal !== undefined && targetWeightVal !== null ? (
                            <>
                                <p className={`text-lg font-bold ${weightDiffColor}`}>
                                    {weightDiffStr}
                                    <span className="text-gray-400 text-sm">kg</span>
                                </p>
                                <p className="text-[10px] text-gray-500">
                                    {weightDiffLabel}
                                </p>
                            </>
                        ) : daysLeft !== null ? (
                            <>
                                <p className="text-lg font-bold text-purple-300">{daysLeft}</p>
                                <p className="text-[10px] text-gray-500">Ngày còn lại</p>
                            </>
                        ) : (
                            <>
                                <p className="text-lg font-bold text-gray-500">—</p>
                                <p className="text-[10px] text-gray-500">Mục tiêu cân</p>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Expanded form */}
            {isExpanded && (
                <div className="p-4 pt-0 space-y-4 border-t border-white/10">
                    {/* Sessions per week */}
                    <div>
                        <label className="block text-sm text-gray-300 mb-2 flex items-center gap-2">
                            <Award className="w-4 h-4 text-purple-400" />
                            Số buổi tập mỗi tuần
                        </label>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setSessions(Math.max(1, sessions - 1))}
                                className="w-10 h-10 rounded-xl bg-white/10 text-white font-bold hover:bg-white/20 transition-colors flex items-center justify-center"
                            >−</button>
                            <div className="flex-1 text-center">
                                <span className="text-3xl font-black text-white">{sessions}</span>
                                <span className="text-gray-400 ml-1 text-sm">buổi/tuần</span>
                            </div>
                            <button
                                onClick={() => setSessions(Math.min(7, sessions + 1))}
                                className="w-10 h-10 rounded-xl bg-white/10 text-white font-bold hover:bg-white/20 transition-colors flex items-center justify-center"
                            >+</button>
                        </div>
                        {/* Visual indicator */}
                        <div className="flex gap-1 mt-2 justify-center">
                            {Array.from({ length: 7 }, (_, i) => (
                                <div
                                    key={i}
                                    className={`h-2 flex-1 rounded-full transition-colors ${i < sessions ? 'bg-purple-500' : 'bg-white/10'}`}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Target weight */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1.5 flex items-center gap-1">
                                {userData.nutritionGoal === 'cutting'
                                    ? <TrendingDown className="w-3 h-3 text-amber-400" />
                                    : <TrendingUp className="w-3 h-3 text-emerald-400" />
                                }
                                Cân nặng mục tiêu (kg)
                            </label>
                            <input
                                type="number"
                                step="0.5"
                                value={targetWeight}
                                onChange={(e) => setTargetWeight(e.target.value)}
                                placeholder={`VD: ${userData.nutritionGoal === 'cutting' ? userData.weight - 5 : userData.weight + 5}`}
                                className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1.5 flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-blue-400" />
                                Ngày kết thúc mục tiêu
                            </label>
                            <input
                                type="date"
                                value={targetDate}
                                onChange={(e) => setTargetDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                            />
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-xs text-gray-400 mb-1.5">Ghi chú mục tiêu</label>
                        <input
                            type="text"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="VD: Chuẩn bị cho mùa hè 2025..."
                            className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        />
                    </div>

                    {/* Save button */}
                    <button
                        onClick={handleSave}
                        className="w-full py-3 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-500 transition-colors flex items-center justify-center gap-2"
                    >
                        <Check className="w-4 h-4" />
                        Lưu Mục Tiêu
                    </button>
                </div>
            )}
        </div>
    );
};

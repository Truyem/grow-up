import React, { useState, useEffect } from 'react';
import { Droplets, Pill, Check, Clock, AlertCircle } from 'lucide-react';
import { useAppContext } from '../../context';
import { loadSupplementLogFromSupabase, syncSupplementLogToSupabase } from '../../services/supabasePlanSync';
import { canPerformOnlineAction } from '../../services/onlineGuard';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

interface SupplementLog {
    date: string; // YYYY-MM-DD
    water_ml: number;
    whey: boolean;
    creatine: boolean;
    vitamin: boolean;
    omega3: boolean;
    lastUpdated: number;
}

type SupplementKey = 'whey' | 'creatine' | 'vitamin' | 'omega3';

const WheyIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M7 4h10l-1 14H8L7 4Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M9 4V3.5A1.5 1.5 0 0 1 10.5 2h3A1.5 1.5 0 0 1 15 3.5V4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M8.6 8.5h6.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M10.2 11.5h3.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
);

const CreatineIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M13.8 2.5 6.2 13h4.7L10.2 21.5 17.8 11h-4.7l.7-8.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
);

const VitaminIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="4" y="8" width="16" height="8" rx="4" stroke="currentColor" strokeWidth="1.6" />
        <path d="M12 8v8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M8 12h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
);

const OmegaIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M6.5 12c1.8-2.7 4.5-4.2 7.9-4.2 2.1 0 3.8.7 5.1 2.1-1.3 1.4-3 2.1-5.1 2.1-3.4 0-6.1-1.5-7.9-4.2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M6.5 12c1.8 2.7 4.5 4.2 7.9 4.2 2.1 0 3.8-.7 5.1-2.1-1.3-1.4-3-2.1-5.1-2.1-3.4 0-6.1 1.5-7.9 4.2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <circle cx="9" cy="10.5" r="0.9" fill="currentColor" />
    </svg>
);

const WATER_GOAL = 2500; // ml
const WATER_INCREMENT = 300; // ml per button press

function getTodayKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function createTodayLog(): SupplementLog {
  const todayKey = getTodayKey();
  return {
      date: todayKey,
      water_ml: 0,
        whey: false,
        creatine: false,
        vitamin: false,
        omega3: false,
      lastUpdated: Date.now(),
  };
}

export const SupplementTracker: React.FC = () => {
    const { userId, showToast } = useAppContext();
    const [log, setLog] = useState<SupplementLog>(createTodayLog);
    const [isExpanded, setIsExpanded] = useState(false);
    const online = useOnlineStatus();

    useEffect(() => {
        if (!userId || !online) return;

        let isCancelled = false;
        (async () => {
            const remoteLog = await loadSupplementLogFromSupabase(userId);
            if (isCancelled) return;
            if (remoteLog && remoteLog.date === getTodayKey()) {
                setLog(remoteLog);
                return;
            }

            const fresh = createTodayLog();
            setLog(fresh);
            await syncSupplementLogToSupabase(userId, fresh);
        })();

        return () => {
            isCancelled = true;
        };
    }, [userId, online]);

    // Auto-reset at midnight
    useEffect(() => {
        const interval = setInterval(() => {
            const todayKey = getTodayKey();
            if (log.date !== todayKey) {
                const fresh = { date: todayKey, water_ml: 0, whey: false, creatine: false, vitamin: false, omega3: false, lastUpdated: Date.now() };
                setLog(fresh);
                if (userId && online) {
                    syncSupplementLogToSupabase(userId, fresh);
                }
            }
        }, 60000);
        return () => clearInterval(interval);
    }, [log.date, userId, online]);

    const update = async (partial: Partial<SupplementLog>) => {
        if (!userId) {
            showToast('Bạn cần đăng nhập để lưu supplement.', 'error');
            return;
        }
        if (!canPerformOnlineAction('supplement-update', showToast)) return;

        const updated = { ...log, ...partial, lastUpdated: Date.now() };

        const saved = await syncSupplementLogToSupabase(userId, updated);
        if (!saved) {
            showToast('Không thể lưu nhật ký supplement.', 'error');
            return;
        }

        setLog(updated);
    };

    const addWater = (ml: number) => {
        update({ water_ml: Math.min(WATER_GOAL + 500, log.water_ml + ml) });
    };

    const toggleSupplement = (key: SupplementKey) => {
        update({ [key]: !log[key] });
    };

    const waterPercent = Math.min(100, Math.round((log.water_ml / WATER_GOAL) * 100));
    const waterColor = waterPercent >= 100 ? '#22c55e' : waterPercent >= 60 ? '#3b82f6' : '#f97316';

    const supplements = [
        { key: 'whey' as const, label: 'Whey Protein', detail: '1 scoop sau tập', icon: WheyIcon },
        { key: 'creatine' as const, label: 'Creatine', detail: '5g + 400ml nước', icon: CreatineIcon },
        { key: 'vitamin' as const, label: 'Vitamin/Multivitamin', detail: 'Sau bữa ăn', icon: VitaminIcon },
        { key: 'omega3' as const, label: 'Omega 3', detail: '2 viên sau ăn trưa & tối', icon: OmegaIcon },
    ];

    const completedSupps = supplements.filter(s => log[s.key]).length;

    return (
        <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 backdrop-blur-md overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
                        <Droplets className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                        <h3 className="font-bold text-white">Nước & Supplement</h3>
                        <p className="text-xs text-cyan-300">
                            {log.water_ml}ml/{WATER_GOAL}ml nước • {completedSupps}/{supplements.length} supplement
                        </p>
                    </div>
                </div>
                {/* Water mini-bar */}
                <div className="flex items-center gap-2">
                    <div className="h-2 w-16 rounded-full bg-white/10 overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${waterPercent}%`, backgroundColor: waterColor }}
                        />
                    </div>
                    <span className="text-xs text-gray-400">{waterPercent}%</span>
                </div>
            </button>

            {/* Summary bar (collapsed) */}
            {!isExpanded && (
                <div className="grid grid-cols-4 gap-0 border-t border-white/5">
                    {supplements.map(s => (
                        <button
                            key={s.key}
                            onClick={(e) => { e.stopPropagation(); toggleSupplement(s.key); }}
                            className={`p-2 text-center transition-colors ${log[s.key] ? 'bg-white/10' : 'hover:bg-white/5'}`}
                        >
                            <span className="flex justify-center">
                                {log[s.key]
                                    ? <Check className="w-4 h-4 text-emerald-300" />
                                    : <s.icon className="w-4 h-4 text-cyan-200" />}
                            </span>
                            <p className="text-[9px] text-gray-500 mt-0.5 truncate">{s.label.split(' ')[0]}</p>
                        </button>
                    ))}
                </div>
            )}

            {/* Expanded */}
            {isExpanded && (
                <div className="p-4 pt-0 border-t border-white/10 space-y-4">
                    {/* Water tracker */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Droplets className="w-4 h-4 text-cyan-400" />
                                <span className="text-sm font-bold text-white">Nước</span>
                                {waterPercent >= 100 && <span className="text-xs text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">Đủ rồi!</span>}
                            </div>
                            <span className="text-sm font-bold" style={{ color: waterColor }}>
                                {log.water_ml}ml / {WATER_GOAL}ml
                            </span>
                        </div>

                        {/* Progress bar */}
                        <div className="h-3 w-full bg-black/30 rounded-full overflow-hidden mb-3">
                            <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${waterPercent}%`, backgroundColor: waterColor }}
                            />
                        </div>

                        {/* Water buttons */}
                        <div className="grid grid-cols-4 gap-2">
                            {[150, 200, 300, 500].map(ml => (
                                <button
                                    key={ml}
                                    onClick={() => addWater(ml)}
                                    className="py-2 rounded-xl bg-cyan-500/15 text-cyan-300 border border-cyan-500/20 hover:bg-cyan-500/25 transition-all text-xs font-bold active:scale-95"
                                >
                                    +{ml}ml
                                </button>
                            ))}
                        </div>

                        {log.water_ml > 0 && (
                            <button
                                onClick={() => update({ water_ml: Math.max(0, log.water_ml - WATER_INCREMENT) })}
                                className="mt-2 text-xs text-gray-500 hover:text-gray-300 transition-colors w-full text-center"
                            >
                                Hoàn tác (-{WATER_INCREMENT}ml)
                            </button>
                        )}
                    </div>

                    {/* Supplement checklist */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Pill className="w-4 h-4 text-purple-400" />
                            <span className="text-sm font-bold text-white">Nhật Ký Supplement</span>
                            <span className="ml-auto text-xs text-gray-500">{completedSupps}/{supplements.length}</span>
                        </div>

                        <div className="space-y-2">
                            {supplements.map(s => (
                                <button
                                    key={s.key}
                                    onClick={() => toggleSupplement(s.key)}
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all active:scale-[0.98] text-left ${log[s.key]
                                        ? 'border-emerald-500/40 bg-emerald-500/10'
                                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                                        }`}
                                >
                                    <div
                                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-base transition-all ${log[s.key] ? 'bg-emerald-500 scale-110' : 'bg-white/10'}`}
                                        style={!log[s.key] ? {} : {}}
                                    >
                                        {log[s.key]
                                            ? <Check className="w-4 h-4 text-white" />
                                            : <s.icon className="w-4 h-4 text-cyan-200" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-bold transition-colors ${log[s.key] ? 'text-emerald-300 line-through opacity-75' : 'text-white'}`}>
                                            {s.label}
                                        </p>
                                        <p className="text-[10px] text-gray-500">{s.detail}</p>
                                    </div>
                                    {!log[s.key] && (
                                        <AlertCircle className="w-4 h-4 text-gray-600 flex-shrink-0" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Daily reminder info */}
                    <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                        <Clock className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-200/70">
                            Push notification sẽ nhắc uống nước mỗi 2-3 tiếng và uống supplement theo lịch. Bật push trong Cài đặt tài khoản.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

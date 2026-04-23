import React from 'react';
import { Wifi, WifiOff, Zap, AlertTriangle } from 'lucide-react';
import { ApiStatus, setCurrentApiKey } from '../../services/aiService';

interface ApiStatusBadgeProps {
    status: ApiStatus;
    onKeyChange?: () => void;
}

export const ApiStatusBadge: React.FC<ApiStatusBadgeProps> = ({ status, onKeyChange }) => {
    if (status.totalKeys === 0) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300 text-xs">
                <WifiOff className="w-3.5 h-3.5" />
                <span>Không có API key</span>
            </div>
        );
    }

    const allRateLimited = status.rateLimitedKeysCount === status.totalKeys;
    const someRateLimited = status.rateLimitedKeysCount > 0;

    const handleKeyClick = (index: number) => {
        if (setCurrentApiKey(index)) {
            onKeyChange?.();
        }
    };

    return (
        <div className="w-full max-w-md mx-auto">
            {/* Mobile-optimized layout: Vertical stack */}
            <div className="flex flex-col gap-2 px-3 py-2.5 bg-black/30 border border-white/10 rounded-xl">

                {/* Header Row: Current API + Status */}
                <div className="flex items-center justify-between gap-2">
                    {/* Current API Indicator */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <div className={`p-1 rounded-md ${allRateLimited ? 'bg-red-500/20' : 'bg-emerald-500/20'}`}>
                            {allRateLimited ? (
                                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                            ) : (
                                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                            )}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[9px] text-gray-500 uppercase tracking-wider leading-tight">Đang dùng</span>
                            <span className={`text-xs font-bold leading-tight ${allRateLimited ? 'text-red-300' : 'text-emerald-300'}`}>
                                Key #{status.currentKeyIndex + 1}
                            </span>
                        </div>
                    </div>

                    {/* Rate Limited Badge (if any) */}
                    {someRateLimited && (
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/20 rounded-md flex-shrink-0">
                            <Zap className="w-3 h-3 text-yellow-400" />
                            <span className="text-[10px] text-yellow-300 font-medium">
                                {status.rateLimitedKeysCount}/{status.totalKeys}
                            </span>
                        </div>
                    )}
                </div>

                {/* Keys Grid: Compact single row with horizontal scroll */}
                <div className="relative">
                    {/* Scrollable container */}
                    <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent pb-1">
                        <div className="flex gap-1 min-w-min">
                            {Array.from({ length: status.totalKeys }, (_, i) => {
                                const isActive = i === status.currentKeyIndex;
                                const isRateLimited = status.rateLimitedKeyIndexes.includes(i);

                                return (
                                    <button
                                        key={i}
                                        onClick={() => handleKeyClick(i)}
                                        disabled={isActive}
                                        className={`
                                            flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center 
                                            text-[10px] font-bold transition-all cursor-pointer
                                            ${isActive && !isRateLimited
                                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-105 cursor-default ring-2 ring-emerald-400/50'
                                                : isRateLimited
                                                    ? 'bg-red-500/30 text-red-300 border border-red-500/40 hover:bg-red-500/40 active:scale-95'
                                                    : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:border-cyan-500/40 hover:text-cyan-300 active:scale-95'
                                            }
                                        `}
                                        title={`Key #${i + 1}${isActive ? ' (đang dùng)' : ' - Chạm để chuyển'}${isRateLimited ? ' (rate limited)' : ''}`}
                                    >
                                        {isRateLimited ? (
                                            <AlertTriangle className="w-3 h-3" />
                                        ) : (
                                            <span className="tabular-nums">{i + 1}</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Scroll hint for many keys */}
                    {status.totalKeys > 6 && (
                        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black/30 to-transparent pointer-events-none rounded-r-lg" />
                    )}
                </div>

                {/* Helper text */}
                <div className="text-[9px] text-gray-500 text-center leading-tight">
                    Chạm vào số để chuyển API key
                </div>
            </div>
        </div>
    );
};

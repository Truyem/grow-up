import React from 'react';
import { Wifi, WifiOff, Zap, AlertTriangle } from 'lucide-react';
import { ApiStatus } from '../../services/geminiService';

interface ApiStatusBadgeProps {
    status: ApiStatus;
}

export const ApiStatusBadge: React.FC<ApiStatusBadgeProps> = ({ status }) => {
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

    return (
        <div className="flex flex-col gap-2 px-4 py-3 bg-black/30 border border-white/10 rounded-xl max-w-2xl">
            {/* Header Row */}
            <div className="flex items-center justify-between gap-4">
                {/* Current API Status */}
                <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${allRateLimited ? 'bg-red-500/20' : 'bg-emerald-500/20'}`}>
                        {allRateLimited ? (
                            <AlertTriangle className="w-4 h-4 text-red-400" />
                        ) : (
                            <Wifi className="w-4 h-4 text-emerald-400" />
                        )}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider">API đang dùng</span>
                        <span className={`text-sm font-bold ${allRateLimited ? 'text-red-300' : 'text-emerald-300'}`}>
                            Key #{status.currentKeyIndex + 1}
                        </span>
                    </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider">Tổng keys</span>
                        <span className="text-sm font-bold text-cyan-300">{status.totalKeys}</span>
                    </div>

                    {someRateLimited && (
                        <>
                            <div className="w-px h-8 bg-white/10" />
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                                <Zap className="w-3.5 h-3.5 text-yellow-400" />
                                <span className="text-xs font-bold text-yellow-300">
                                    {status.rateLimitedKeysCount} limited
                                </span>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Keys Grid - Scrollable if needed */}
            <div className="max-h-24 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                <div className="grid grid-cols-10 gap-1.5">
                    {Array.from({ length: status.totalKeys }, (_, i) => {
                        const isActive = i === status.currentKeyIndex;
                        const isRateLimited = status.rateLimitedKeyIndexes.includes(i);

                        return (
                            <div
                                key={i}
                                className={`
                  relative h-7 rounded-md flex items-center justify-center text-[10px] font-bold transition-all cursor-default
                  ${isActive && !isRateLimited
                                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-400/50'
                                        : isRateLimited
                                            ? 'bg-red-500/30 text-red-300 border border-red-500/50'
                                            : 'bg-white/5 text-gray-500 border border-white/10 hover:bg-white/10'
                                    }
                `}
                                title={`Key #${i + 1}${isActive ? ' (đang dùng)' : ''}${isRateLimited ? ' (rate limited)' : ''}`}
                            >
                                {isRateLimited ? (
                                    <AlertTriangle className="w-3 h-3" />
                                ) : (
                                    <span>{i + 1}</span>
                                )}
                                {isActive && !isRateLimited && (
                                    <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

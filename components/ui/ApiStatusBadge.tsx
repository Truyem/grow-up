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
        <div className="flex items-center gap-3 px-3 py-2 bg-black/30 border border-white/10 rounded-xl">
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

            {/* Divider */}
            <div className="w-px h-8 bg-white/10" />

            {/* Keys Status */}
            <div className="flex items-center gap-2">
                <div className="flex gap-1">
                    {Array.from({ length: status.totalKeys }, (_, i) => {
                        const isActive = i === status.currentKeyIndex;
                        const isRateLimited = status.rateLimitedKeyIndexes.includes(i);

                        return (
                            <div
                                key={i}
                                className={`
                  w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all
                  ${isActive && !isRateLimited
                                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-110'
                                        : isRateLimited
                                            ? 'bg-red-500/30 text-red-300 border border-red-500/30'
                                            : 'bg-white/5 text-gray-500 border border-white/10'
                                    }
                `}
                                title={`Key #${i + 1}${isActive ? ' (đang dùng)' : ''}${isRateLimited ? ' (rate limited)' : ''}`}
                            >
                                {isRateLimited ? (
                                    <AlertTriangle className="w-3 h-3" />
                                ) : (
                                    i + 1
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Rate Limited Count */}
            {someRateLimited && (
                <>
                    <div className="w-px h-8 bg-white/10" />
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                        <Zap className="w-3.5 h-3.5 text-yellow-400" />
                        <span className="text-xs text-yellow-300">
                            {status.rateLimitedKeysCount}/{status.totalKeys} limited
                        </span>
                    </div>
                </>
            )}
        </div>
    );
};

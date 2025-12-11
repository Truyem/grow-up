import React from 'react';
import { Wifi, WifiOff, Zap, AlertTriangle } from 'lucide-react';
import { ApiStatus, setCurrentApiKey } from '../../services/geminiService';

interface ApiStatusBadgeProps {
    status: ApiStatus;
    onKeyChange?: () => void;
}

export const ApiStatusBadge: React.FC<ApiStatusBadgeProps> = ({ status, onKeyChange }) => {
    if (status.totalKeys === 0) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300 text-xs">
                <WifiOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Không có API key</span>
                <span className="sm:hidden">No API</span>
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
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 px-3 py-2 bg-black/30 border border-white/10 rounded-xl w-full sm:w-auto">
            {/* Current API Status */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${allRateLimited ? 'bg-red-500/20' : 'bg-emerald-500/20'}`}>
                        {allRateLimited ? (
                            <AlertTriangle className="w-4 h-4 text-red-400" />
                        ) : (
                            <Wifi className="w-4 h-4 text-emerald-400" />
                        )}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                            <span className="hidden sm:inline">API đang dùng</span>
                            <span className="sm:hidden">API</span>
                        </span>
                        <span className={`text-sm font-bold ${allRateLimited ? 'text-red-300' : 'text-emerald-300'}`}>
                            Key #{status.currentKeyIndex + 1}
                        </span>
                    </div>
                </div>

                {/* Rate Limited Count - Mobile: Show inline */}
                {someRateLimited && (
                    <div className="flex sm:hidden items-center gap-1.5 px-2 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                        <Zap className="w-3.5 h-3.5 text-yellow-400" />
                        <span className="text-xs text-yellow-300 font-bold">
                            {status.rateLimitedKeysCount}/{status.totalKeys}
                        </span>
                    </div>
                )}
            </div>

            {/* Divider - Desktop only */}
            <div className="hidden sm:block w-px h-8 bg-white/10" />

            {/* Keys Status - Clickable */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
                <div className="flex gap-1.5 sm:gap-1">
                    {Array.from({ length: status.totalKeys }, (_, i) => {
                        const isActive = i === status.currentKeyIndex;
                        const isRateLimited = status.rateLimitedKeyIndexes.includes(i);

                        return (
                            <button
                                key={i}
                                onClick={() => handleKeyClick(i)}
                                disabled={isActive}
                                className={`
                                    w-9 h-9 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center 
                                    text-xs sm:text-[10px] font-bold transition-all cursor-pointer
                                    ${isActive && !isRateLimited
                                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-110 cursor-default'
                                        : isRateLimited
                                            ? 'bg-red-500/30 text-red-300 border border-red-500/30 hover:bg-red-500/40 active:scale-95'
                                            : 'bg-white/5 text-gray-500 border border-white/10 hover:bg-white/10 hover:border-cyan-500/30 hover:text-cyan-300 active:scale-95'
                                    }
                                `}
                                title={`Key #${i + 1}${isActive ? ' (đang dùng)' : ' - Click để chuyển'}${isRateLimited ? ' (rate limited)' : ''}`}
                            >
                                {isRateLimited ? (
                                    <AlertTriangle className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                                ) : (
                                    i + 1
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Rate Limited Count - Desktop only */}
            {someRateLimited && (
                <>
                    <div className="hidden sm:block w-px h-8 bg-white/10" />
                    <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
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

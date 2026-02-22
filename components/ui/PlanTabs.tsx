
import React from 'react';
import { Dumbbell, Utensils, History } from 'lucide-react';

export type TabType = 'workout' | 'nutrition' | 'history' | 'settings';

interface PlanTabsProps {
    activeTab: TabType;
    onTabChange: (tab: TabType) => void;
    className?: string;
}

export const PlanTabs: React.FC<PlanTabsProps> = ({ activeTab, onTabChange, className = '' }) => {
    return (
        <div className={`flex p-1 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl mx-2 md:mx-4 ${className}`}>
            <button
                onClick={() => onTabChange('workout')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all duration-300 relative overflow-hidden cursor-pointer ${activeTab === 'workout'
                    ? 'text-white shadow-lg'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                    }`}
            >
                {activeTab === 'workout' && (
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-600 animate-fade-in rounded-xl" />
                )}
                <span className="relative z-10 flex items-center gap-2 text-sm md:text-base">
                    <Dumbbell className={`w-4 h-4 md:w-5 md:h-5 ${activeTab === 'workout' ? 'fill-white' : ''}`} />
                    <span className="hidden min-[380px]:inline">Tập luyện</span>
                </span>
            </button>

            <button
                onClick={() => onTabChange('nutrition')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all duration-300 relative overflow-hidden cursor-pointer ${activeTab === 'nutrition'
                    ? 'text-white shadow-lg'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                    }`}
            >
                {activeTab === 'nutrition' && (
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-600 animate-fade-in rounded-xl" />
                )}
                <span className="relative z-10 flex items-center gap-2 text-sm md:text-base">
                    <Utensils className={`w-4 h-4 md:w-5 md:h-5 ${activeTab === 'nutrition' ? 'fill-white' : ''}`} />
                    <span className="hidden min-[380px]:inline">Dinh dưỡng</span>
                </span>
            </button>

            <button
                onClick={() => onTabChange('schedule')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all duration-300 relative overflow-hidden cursor-pointer ${activeTab === 'schedule'
                    ? 'text-white shadow-lg'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                    }`}
            >
                {activeTab === 'schedule' && (
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-violet-600 animate-fade-in rounded-xl" />
                )}
                <span className="relative z-10 flex items-center gap-2 text-sm md:text-base">
                    <History className={`w-4 h-4 md:w-5 md:h-5 ${activeTab === 'schedule' ? '' : ''}`} />
                    <span className="hidden min-[380px]:inline">Lịch trình</span>
                </span>
            </button>
        </div>
    );
};

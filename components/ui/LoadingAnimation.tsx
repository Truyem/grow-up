import React, { useState, useEffect } from 'react';
import { Brain } from 'lucide-react';

const LOADING_MESSAGES = [
    "Đang phân tích dữ liệu cơ thể...",
    "Đang khởi tạo lịch trình tối ưu...",
    "Đang tính toán khối lượng tập luyện...",
    "Đang cân bằng dinh dưỡng...",
    "Đang chuẩn bị bài tập cá nhân hóa...",
    "Đang tối ưu hóa thời gian nghỉ ngơi...",
    "Đang đồng bộ hóa với mục tiêu của bạn..."
];

export const LoadingAnimation: React.FC = () => {
    const [messageIndex, setMessageIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
        }, 2200);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#050505] transition-all duration-500">
            {/* Minimalist Centered Content */}
            <div className="flex flex-col items-center">

                {/* Logo Section */}
                <div className="relative mb-8 group">
                    <div className="absolute inset-0 bg-cyan-500/20 blur-[40px] rounded-full scale-0 group-hover:scale-150 transition-transform duration-1000" />
                    <Brain className="w-16 h-16 text-cyan-500 relative z-10 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)] animate-pulse-slow" />
                </div>

                {/* Brand Text */}
                <h2 className="text-3xl tracking-[0.3em] font-light text-white mb-2 uppercase">
                    Grow<span className="font-bold text-cyan-500">AI</span>
                </h2>

                {/* Animated Message */}
                <div className="h-6 overflow-hidden mb-8">
                    <p key={messageIndex} className="text-gray-500 text-sm font-light tracking-wide animate-fade-in-up">
                        {LOADING_MESSAGES[messageIndex]}
                    </p>
                </div>

                {/* Ultra-thin Progress Line */}
                <div className="w-32 h-[1px] bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-500 shadow-[0_0_10px_cyan] animate-progress-loading" />
                </div>
            </div>

            <style>{`
                @keyframes progress-loading {
                    0% { transform: translateX(-100%); width: 20%; }
                    50% { width: 60%; }
                    100% { transform: translateX(100%); width: 20%; }
                }
                @keyframes fade-in-up {
                    0% { opacity: 0; transform: translateY(5px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                @keyframes pulse-slow {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.8; transform: scale(0.95); }
                }
                .animate-progress-loading { animation: progress-loading 2s infinite ease-in-out; }
                .animate-fade-in-up { animation: fade-in-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .animate-pulse-slow { animation: pulse-slow 3s infinite ease-in-out; }
            `}</style>
        </div>
    );
};


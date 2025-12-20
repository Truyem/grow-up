import React, { useState, useEffect } from 'react';
import { Sparkles, Brain, Zap, Dumbbell } from 'lucide-react';

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
        }, 2500);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/60 backdrop-blur-xl transition-all duration-500">
            <div className="relative flex flex-col items-center max-w-md w-full px-6 text-center">

                {/* Animated Background Glow */}
                <div className="absolute -z-10 w-64 h-64 bg-cyan-500/20 rounded-full blur-[80px] animate-pulse" />
                <div className="absolute -z-10 w-48 h-48 bg-purple-500/20 rounded-full blur-[60px] animate-pulse delay-700" />

                {/* Central Icon Animation */}
                <div className="relative mb-12">
                    <div className="absolute inset-0 bg-cyan-500/20 rounded-full scale-150 blur-xl animate-pulse" />
                    <div className="relative w-24 h-24 flex items-center justify-center bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-md overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/10 to-transparent animate-shimmer" />

                        <div className="relative">
                            <Brain className="w-12 h-12 text-cyan-400 animate-bounce" />
                            <Sparkles className="absolute -top-2 -right-2 w-5 h-5 text-yellow-400 animate-pulse" />
                        </div>
                    </div>

                    {/* Orbiting Elements */}
                    <div className="absolute inset-0 -m-8 animate-spin-slow">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-8 bg-white/5 rounded-full border border-white/10 flex items-center justify-center backdrop-blur-sm">
                            <Zap className="w-4 h-4 text-yellow-400" />
                        </div>
                    </div>
                    <div className="absolute inset-0 -m-8 animate-spin-slow-reverse">
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-8 bg-white/5 rounded-full border border-white/10 flex items-center justify-center backdrop-blur-sm">
                            <Dumbbell className="w-4 h-4 text-purple-400" />
                        </div>
                    </div>
                </div>

                {/* Text Content */}
                <div className="space-y-4">
                    <h2 className="text-2xl font-bold text-white tracking-tight">
                        Grow <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">AI</span>
                    </h2>

                    <div className="h-8 overflow-hidden">
                        <p className="text-cyan-300/90 font-medium animate-fade-in-up key={messageIndex}">
                            {LOADING_MESSAGES[messageIndex]}
                        </p>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-64 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5 mx-auto mt-6">
                        <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 animate-progress-loading" />
                    </div>
                </div>

                {/* Decorative Particles */}
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                    {[...Array(6)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-1 h-1 bg-cyan-400 rounded-full animate-float"
                            style={{
                                top: `${Math.random() * 100}%`,
                                left: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 5}s`,
                                opacity: 0.3
                            }}
                        />
                    ))}
                </div>
            </div>

            <style>{`
        @keyframes shimmer {
          0% { transform: translateY(100%); }
          100% { transform: translateY(-100%); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spin-slow-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes progress-loading {
          0% { width: 0%; transform: translateX(-100%); }
          50% { width: 70%; transform: translateX(0%); }
          100% { width: 100%; transform: translateX(100%); }
        }
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-20px) translateX(10px); }
        }
        .animate-shimmer { animation: shimmer 3s infinite linear; }
        .animate-spin-slow { animation: spin-slow 8s infinite linear; }
        .animate-spin-slow-reverse { animation: spin-slow-reverse 12s infinite linear; }
        .animate-progress-loading { animation: progress-loading 2s infinite ease-in-out; }
        .animate-fade-in-up { animation: fade-in-up 0.5s ease-out forwards; }
        .animate-float { animation: float 6s infinite ease-in-out; }
      `}</style>
        </div>
    );
};

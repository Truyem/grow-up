import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, Plus, Minus, RotateCcw, Footprints } from 'lucide-react';

interface RestTimerProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDuration?: number;
}

export const RestTimer: React.FC<RestTimerProps> = ({ isOpen, onClose, defaultDuration = 30 }) => {
  // Timer State
  const [timeLeft, setTimeLeft] = useState(defaultDuration);
  const [isActive, setIsActive] = useState(false);
  const [duration, setDuration] = useState(defaultDuration);

  const audioContextRef = useRef<AudioContext | null>(null);

  // --- TIMER LOGIC ---
  useEffect(() => {
    if (isOpen) {
      // If the timer was closed and re-opened with a different default duration (e.g. 60 min walk), update it
      // Only update if not currently active to prevent overwriting running timer
      if (!isActive) {
        setTimeLeft(defaultDuration);
        setDuration(defaultDuration);
        setIsActive(true);
      }
    }
  }, [isOpen, defaultDuration]);

  useEffect(() => {
    let interval: number | undefined;

    if (isActive && timeLeft > 0) {
      interval = window.setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      playBeep();
    }

    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const playBeep = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5);

      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.error("Audio play failed", e);
    }
  };

  const adjustTime = (seconds: number) => {
    const newTime = Math.max(0, timeLeft + seconds);
    setTimeLeft(newTime);
    setDuration(Math.max(duration, newTime));
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  // Calculate progress percentage for circular indicator
  const progressPercent = duration > 0 ? ((duration - timeLeft) / duration) * 100 : 0;
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] animate-slide-down">
      <div className="bg-gradient-to-b from-[#0f172a]/98 to-[#0f172a]/95 backdrop-blur-2xl border-b border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] px-3 py-2 sm:px-4 sm:py-4 pt-safe transition-all duration-300">
        <div className="max-w-6xl mx-auto">

          {/* Main Timer Display */}
          <div className="flex flex-row items-center justify-between gap-2 sm:gap-4">

            {/* Left: Timer Display with Circular Progress Ring */}
            <div className="flex items-center gap-3 sm:gap-6 flex-shrink-0">
              <div className="relative">
                {/* Circular Progress SVG - Smaller on mobile */}
                <svg className="w-14 h-14 sm:w-28 sm:h-28 -rotate-90 transition-all duration-300" viewBox="0 0 100 100">
                  {/* Background circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.05)"
                    strokeWidth="4"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="url(#gradient)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-1000 ease-linear"
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#06b6d4" />
                      <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Timer Text in Center */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className={`font-mono font-bold tracking-wider transition-all duration-300 
                    text-base sm:text-3xl
                    ${timeLeft < 10 && timeLeft > 0
                      ? 'text-red-400 animate-pulse'
                      : 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-400'
                    }`}>
                    {formatTime(timeLeft)}
                  </div>
                </div>
              </div>

              {/* Status Text - Simplified on Mobile */}
              <div className="flex flex-col gap-0.5 sm:gap-1">
                <div className="text-xs sm:text-sm font-bold text-white whitespace-nowrap">
                  {isActive ? 'Wait...' : 'Paused'}
                </div>
                <div className="text-[10px] sm:text-xs text-gray-500 font-medium hidden sm:block">
                  Rest Timer
                </div>
              </div>
            </div>

            {/* Center: Controls - Horizontal and Compact */}
            <div className="flex items-center gap-1.5 sm:gap-3 flex-wrap justify-end sm:justify-center flex-1">
              {/* Time Adjustment Buttons */}
              <div className="flex items-center gap-1 sm:gap-2 bg-white/5 rounded-full p-1 sm:p-1.5 border border-white/10 backdrop-blur-sm">
                <button
                  onClick={() => adjustTime(-10)}
                  className="p-1.5 sm:p-2.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-cyan-300 active:scale-95 transition-all cursor-pointer"
                  title="Giảm 10 giây"
                >
                  <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>

                {/* Play/Pause Button */}
                <button
                  onClick={() => setIsActive(!isActive)}
                  className={`rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95 cursor-pointer
                    w-8 h-8 sm:w-12 sm:h-12
                    ${isActive
                      ? 'bg-yellow-500/20 text-yellow-400 border-2 border-yellow-500/50 hover:bg-yellow-500/30'
                      : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-cyan-500/30 hover:shadow-cyan-500/50'
                    }
                  `}
                  title={isActive ? 'Tạm dừng' : 'Bắt đầu'}
                >
                  {isActive ? <Pause className="w-3.5 h-3.5 sm:w-5 sm:h-5 fill-current" /> : <Play className="w-3.5 h-3.5 sm:w-5 sm:h-5 fill-current ml-0.5" />}
                </button>

                <button
                  onClick={() => adjustTime(10)}
                  className="p-1.5 sm:p-2.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-cyan-300 active:scale-95 transition-all cursor-pointer"
                  title="Thêm 10 giây"
                >
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>

              {/* Reset Button */}
              <button
                onClick={() => { setTimeLeft(defaultDuration); setDuration(defaultDuration); setIsActive(true); }}
                className="p-2 sm:p-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/30 text-gray-400 hover:text-cyan-300 active:scale-95 transition-all cursor-pointer hidden sm:block"
                title="Reset về thời gian ban đầu"
              >
                <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              {/* Walking Preset Button - Icon Only on Mobile */}
              <button
                onClick={() => { setTimeLeft(3600); setDuration(3600); setIsActive(true); }}
                className="flex items-center gap-2 p-2 sm:px-4 sm:py-2.5 rounded-full bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 hover:from-emerald-500/20 hover:to-emerald-600/20 border border-emerald-500/30 hover:border-emerald-500/50 text-emerald-300 font-bold text-sm whitespace-nowrap transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-lg shadow-emerald-500/10"
                title="Đặt timer 60 phút cho đi bộ"
              >
                <Footprints className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">60 phút</span>
              </button>
            </div>

            {/* Right: Close Button - Smaller on mobile */}
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2.5 rounded-full bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 text-gray-500 hover:text-red-400 transition-all active:scale-95 cursor-pointer flex-shrink-0"
              title="Đóng timer"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Safe area spacer + Animation styles */}
      <style>{`
        .pt-safe {
          padding-top: env(safe-area-inset-top, 16px);
        }
        @keyframes slide-down {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-down {
          animation: slide-down 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
};
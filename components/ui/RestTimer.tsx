
import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, RotateCcw, Plus, Minus, Volume2 } from 'lucide-react';

interface RestTimerProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDuration?: number;
}

export const RestTimer: React.FC<RestTimerProps> = ({ isOpen, onClose, defaultDuration = 60 }) => {
  const [timeLeft, setTimeLeft] = useState(defaultDuration);
  const [isActive, setIsActive] = useState(false);
  const [duration, setDuration] = useState(defaultDuration);
  
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeLeft(defaultDuration);
      setDuration(defaultDuration);
      setIsActive(true);
    } else {
      setIsActive(false);
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
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
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
    setDuration(Math.max(duration, newTime)); // Update total duration ref if we go above
  };

  const setPreset = (seconds: number) => {
    setDuration(seconds);
    setTimeLeft(seconds);
    setIsActive(true);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? ((duration - timeLeft) / duration) * 100 : 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm bg-[#1a1f2e] border border-white/10 rounded-3xl shadow-2xl overflow-hidden p-6">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2 text-cyan-400">
            <Volume2 className="w-5 h-5" />
            <span className="font-bold text-sm uppercase tracking-wider">Nghỉ ngơi</span>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Timer Display */}
        <div className="relative w-48 h-48 mx-auto mb-8 flex items-center justify-center">
           {/* SVG Progress Ring */}
           <svg className="absolute inset-0 w-full h-full -rotate-90 transform">
             <circle
               cx="96" cy="96" r="88"
               stroke="currentColor"
               strokeWidth="8"
               fill="transparent"
               className="text-white/5"
             />
             <circle
               cx="96" cy="96" r="88"
               stroke="currentColor"
               strokeWidth="8"
               fill="transparent"
               strokeDasharray={2 * Math.PI * 88}
               strokeDashoffset={2 * Math.PI * 88 * (1 - progress / 100)} // Fill up as time passes
               strokeLinecap="round"
               className={`transition-all duration-1000 ease-linear ${timeLeft < 10 ? 'text-red-500' : 'text-cyan-500'}`}
             />
           </svg>
           
           <div className="text-center z-10">
             <div className="text-5xl font-bold text-white font-mono tracking-wider">
               {formatTime(timeLeft)}
             </div>
             <div className="text-xs text-gray-400 mt-1 uppercase font-medium">
               {isActive ? 'Đang đếm ngược' : 'Tạm dừng'}
             </div>
           </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center items-center gap-6 mb-8">
           <button 
             onClick={() => adjustTime(-10)}
             className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 active:scale-95 transition-all"
           >
             <Minus className="w-4 h-4" />
           </button>

           <button 
             onClick={() => setIsActive(!isActive)}
             className={`w-16 h-16 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all hover:scale-105 active:scale-95
               ${isActive ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' : 'bg-cyan-500 text-black font-bold'}
             `}
           >
             {isActive ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
           </button>

           <button 
             onClick={() => adjustTime(10)}
             className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 active:scale-95 transition-all"
           >
             <Plus className="w-4 h-4" />
           </button>
        </div>

        {/* Presets */}
        <div className="grid grid-cols-4 gap-2">
          {[30, 60, 90, 120].map((sec) => (
            <button
              key={sec}
              onClick={() => setPreset(sec)}
              className={`py-2 rounded-lg text-xs font-bold border transition-all
                ${duration === sec 
                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300' 
                  : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10'}
              `}
            >
              {sec}s
            </button>
          ))}
        </div>

      </div>
    </div>
  );
};

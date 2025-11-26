
import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, Plus, Minus, RotateCcw } from 'lucide-react';

interface RestTimerProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDuration?: number;
}

export const RestTimer: React.FC<RestTimerProps> = ({ isOpen, onClose, defaultDuration = 60 }) => {
  // Timer State
  const [timeLeft, setTimeLeft] = useState(defaultDuration);
  const [isActive, setIsActive] = useState(false);
  const [duration, setDuration] = useState(defaultDuration);
  
  const audioContextRef = useRef<AudioContext | null>(null);

  // --- TIMER LOGIC ---
  useEffect(() => {
    if (isOpen) {
      if (!isActive && timeLeft === 0) {
        setTimeLeft(defaultDuration);
        setDuration(defaultDuration);
        setIsActive(true);
      } else if (!isActive && timeLeft === defaultDuration) {
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
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] animate-fade-in">
      <div className="bg-[#0f172a]/90 backdrop-blur-xl border-b border-white/10 shadow-[0_5px_30px_rgba(0,0,0,0.6)] px-4 py-3 pt-safe">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Top Row: Timer & Status */}
          <div className="flex items-center justify-between w-full sm:w-auto gap-6">
            <div className="flex items-center gap-4">
              <div className={`text-4xl font-mono font-bold tracking-widest ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-cyan-400'}`}>
                {formatTime(timeLeft)}
              </div>
              <div className="text-xs text-gray-400 font-medium uppercase tracking-wider flex flex-col">
                 <span>{isActive ? 'Đang nghỉ' : 'Tạm dừng'}</span>
                 <span className="text-[10px] text-gray-600">Rest Timer</span>
              </div>
            </div>
            
            {/* Close Button (Mobile Only) */}
            <button onClick={onClose} className="sm:hidden p-2 text-gray-500 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Middle Row: Controls */}
          <div className="flex items-center gap-4 w-full sm:w-auto justify-center">
             {/* Timer Controls */}
             <div className="flex items-center gap-2 bg-white/5 rounded-full p-1 border border-white/5">
               <button 
                 onClick={() => adjustTime(-10)}
                 className="p-2 rounded-full hover:bg-white/10 text-gray-300 active:scale-95 transition-all"
               >
                 <Minus className="w-4 h-4" />
               </button>

               <button 
                 onClick={() => setIsActive(!isActive)}
                 className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95
                   ${isActive ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' : 'bg-cyan-500 text-black font-bold'}
                 `}
               >
                 {isActive ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
               </button>

               <button 
                 onClick={() => adjustTime(10)}
                 className="p-2 rounded-full hover:bg-white/10 text-gray-300 active:scale-95 transition-all"
               >
                 <Plus className="w-4 h-4" />
               </button>

               <button 
                 onClick={() => { setTimeLeft(60); setDuration(60); setIsActive(true); }}
                 className="p-2 rounded-full hover:bg-white/10 text-gray-300 active:scale-95 transition-all"
                 title="Reset 60s"
               >
                 <RotateCcw className="w-4 h-4" />
               </button>
             </div>
          </div>

          {/* Right: Close (Desktop) */}
          <button 
            onClick={onClose}
            className="hidden sm:block p-2 -mr-2 text-gray-500 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>
      
      {/* Safe area spacer */}
      <style>{`
        .pt-safe {
          padding-top: env(safe-area-inset-top, 20px);
        }
      `}</style>
    </div>
  );
};

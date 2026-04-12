import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Play, Pause, Plus, Minus, RotateCcw, GripHorizontal } from 'lucide-react';

interface RestTimerProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDuration?: number;
}

export const RestTimer: React.FC<RestTimerProps> = ({ isOpen, onClose, defaultDuration = 30 }) => {
  const [timeLeft, setTimeLeft] = useState(defaultDuration);
  const [isActive, setIsActive] = useState(false);
  const [duration, setDuration] = useState(defaultDuration);

  // Drag state (desktop only) — use translate offset instead of absolute position
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; offsetX: number; offsetY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const audioContextRef = useRef<AudioContext | null>(null);

  // Reset drag offset when timer opens
  useEffect(() => {
    if (isOpen) {
      setDragOffset({ x: 0, y: 0 });
    }
  }, [isOpen]);

  // --- DRAG LOGIC (desktop only, via mouse) ---
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (window.innerWidth < 640) return;
    e.preventDefault();

    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      offsetX: dragOffset.x,
      offsetY: dragOffset.y,
    };
  }, [dragOffset]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;

      setDragOffset({
        x: dragStartRef.current.offsetX + dx,
        y: dragStartRef.current.offsetY + dy,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // --- TIMER LOGIC ---
  useEffect(() => {
    if (isOpen) {
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

  const progressPercent = duration > 0 ? ((duration - timeLeft) / duration) * 100 : 0;
  const isUrgent = timeLeft < 10 && timeLeft > 0;
  const isDone = timeLeft === 0;

  const hasDragOffset = dragOffset.x !== 0 || dragOffset.y !== 0;

  return (
    <div
      ref={containerRef}
      className={`fixed top-3 left-3 right-3 z-[60] animate-slide-down sm:left-auto sm:right-4 sm:max-w-sm pt-safe select-none`}
      style={hasDragOffset ? { transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)` } : undefined}
    >
      <div className="relative overflow-hidden rounded-2xl bg-black/50 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">

        {/* Linear Progress Bar - top of pill */}
        <div className="h-1 w-full bg-white/5">
          <div
            className={`h-full transition-all duration-1000 ease-linear ${isDone
              ? 'bg-emerald-400'
              : isUrgent
                ? 'bg-red-400'
                : 'bg-gradient-to-r from-cyan-400 to-blue-500'
              }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Controls Row */}
        <div className="flex items-center gap-2 px-3 py-2.5 sm:px-4 sm:py-3">

          {/* Drag Handle (desktop only) */}
          <div
            onMouseDown={handleMouseDown}
            className={`hidden sm:flex items-center text-gray-600 hover:text-gray-400 transition-colors mr-1 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            title="Kéo để di chuyển"
          >
            <GripHorizontal className="w-4 h-4" />
          </div>

          {/* Timer Display */}
          <div
            className={`font-mono font-bold tracking-wide text-xl sm:text-2xl min-w-[4.5rem] tabular-nums transition-colors duration-300 ${isDone
              ? 'text-emerald-400'
              : isUrgent
                ? 'text-red-400 animate-pulse'
                : 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-400'
              }`}
          >
            {formatTime(timeLeft)}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Control Buttons Group */}
          <div className="flex items-center gap-1 bg-white/5 rounded-xl p-0.5 border border-white/[.07]">
            <button
              onClick={() => adjustTime(-10)}
              className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-cyan-300 active:scale-90 transition-all cursor-pointer"
              title="Giảm 10 giây"
            >
              <Minus className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsActive(!isActive)}
              className={`p-2 rounded-xl flex items-center justify-center transition-all active:scale-90 cursor-pointer ${isActive
                ? 'bg-white/10 text-amber-400 hover:bg-white/15'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20'
                }`}
              title={isActive ? 'Tạm dừng' : 'Bắt đầu'}
            >
              {isActive
                ? <Pause className="w-4 h-4 fill-current" />
                : <Play className="w-4 h-4 fill-current ml-0.5" />
              }
            </button>

            <button
              onClick={() => adjustTime(10)}
              className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-cyan-300 active:scale-90 transition-all cursor-pointer"
              title="Thêm 10 giây"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Reset */}
          <button
            onClick={() => { setTimeLeft(defaultDuration); setDuration(defaultDuration); setIsActive(true); }}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/[.07] text-gray-400 hover:text-cyan-300 active:scale-90 transition-all cursor-pointer"
            title="Reset"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-red-500/15 border border-white/[.07] hover:border-red-500/20 text-gray-500 hover:text-red-400 active:scale-90 transition-all cursor-pointer"
            title="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Animation Styles */}
      <style>{`
        .pt-safe {
          padding-top: env(safe-area-inset-top, 0px);
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
          animation: slide-down 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};
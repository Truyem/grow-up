import React, { useEffect, useState } from 'react';
import { X, CheckCircle2, Info } from 'lucide-react';

interface ToastProps {
    message: string;
    isOpen: boolean;
    onClose: () => void;
    duration?: number; // Auto close after duration (ms), 0 = no auto close
    type?: 'success' | 'info';
}

export const Toast: React.FC<ToastProps> = ({
    message,
    isOpen,
    onClose,
    duration = 5000,
    type = 'info'
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            // Trigger animation after mount
            requestAnimationFrame(() => {
                setIsAnimating(true);
            });

            // Auto close after duration
            if (duration > 0) {
                const timer = setTimeout(() => {
                    handleClose();
                }, duration);
                return () => clearTimeout(timer);
            }
        }
    }, [isOpen, duration]);

    const handleClose = () => {
        setIsAnimating(false);
        // Wait for exit animation
        setTimeout(() => {
            setIsVisible(false);
            onClose();
        }, 300);
    };

    if (!isVisible) return null;

    const iconColor = type === 'success' ? 'text-green-400' : 'text-cyan-400';
    const borderColor = type === 'success' ? 'border-green-500/30' : 'border-cyan-500/30';
    const bgGlow = type === 'success' ? 'shadow-green-500/10' : 'shadow-cyan-500/10';

    return (
        <div
            className={`
        fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm
        z-[9999] transition-all duration-300 ease-out
        ${isAnimating ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
      `}
        >
            <div
                className={`
          bg-gray-900/95 backdrop-blur-xl rounded-2xl p-4
          border ${borderColor}
          shadow-2xl ${bgGlow}
          flex items-start gap-3
        `}
            >
                {/* Icon */}
                <div className={`flex-shrink-0 ${iconColor}`}>
                    {type === 'success' ? (
                        <CheckCircle2 className="w-5 h-5" />
                    ) : (
                        <Info className="w-5 h-5" />
                    )}
                </div>

                {/* Message */}
                <p className="flex-1 text-sm text-gray-200 leading-relaxed">
                    {message}
                </p>

                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="flex-shrink-0 p-1 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white cursor-pointer"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

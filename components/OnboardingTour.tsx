import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, X, Check } from 'lucide-react';
import { createPortal } from 'react-dom';

export interface TourStep {
    targetId: string;
    title: string;
    content: string;
    placement?: 'top' | 'bottom' | 'left' | 'right';
    onBeforeShow?: () => void; // New callback for tab switching
}

interface OnboardingTourProps {
    steps: TourStep[];
    isOpen: boolean;
    onComplete: () => void;
    onSkip: () => void;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
    steps,
    isOpen,
    onComplete,
    onSkip
}) => {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
    const [displayedText, setDisplayedText] = useState('');
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Use ref to track if we are currently waiting for a transition
    const isTransitioning = useRef(false);

    const currentStep = steps[currentStepIndex];

    // Reset and start typing effect when step changes
    useEffect(() => {
        if (isOpen && currentStep) {
            setDisplayedText('');
            let i = 0;
            const text = currentStep.content;

            const typeChar = () => {
                if (i < text.length) {
                    setDisplayedText(text.slice(0, i + 1));
                    i++;
                    typingTimeoutRef.current = setTimeout(typeChar, 20); // Speed of typing
                }
            };

            // Start typing after a small delay to allow transition
            const startTimeout = setTimeout(typeChar, 300);

            return () => {
                clearTimeout(startTimeout);
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            };
        }
    }, [currentStepIndex, isOpen]);

    useEffect(() => {
        if (isOpen && currentStep) {
            // Execute transition logic if defined
            if (currentStep.onBeforeShow) {
                isTransitioning.current = true;
                currentStep.onBeforeShow();
                // Give generic delay for React render / tab switch
                // For production, MutationObserver or ResizeObserver on document.body might be better,
                // but simple delay is often robust enough for internal state switches.
                setTimeout(() => {
                    isTransitioning.current = false;
                    updateTargetPosition();
                }, 500);
            } else {
                updateTargetPosition();
            }

            // Add resize listener
            window.addEventListener('resize', updateTargetPosition);
            window.addEventListener('scroll', updateTargetPosition);
            return () => {
                window.removeEventListener('resize', updateTargetPosition);
                window.removeEventListener('scroll', updateTargetPosition);
            };
        }
    }, [isOpen, currentStepIndex]); // Depend on Index to re-run

    const updateTargetPosition = () => {
        if (!isOpen || !currentStep) return;

        // Retry finding element incase of slight render delay
        // Aggressive polling: Try every 50ms for 50 times (2.5 seconds total)
        const attemptFind = (attemptsLeft: number) => {
            const element = document.getElementById(currentStep.targetId);
            if (element) {
                // Scroll to element with some padding
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });

                // Wait for scroll to likely finish
                setTimeout(() => {
                    const rect = element.getBoundingClientRect();
                    setTargetRect(rect);
                    calculateTooltipPosition(rect, currentStep.placement);
                }, 300);
            } else {
                if (attemptsLeft > 0) {
                    setTimeout(() => attemptFind(attemptsLeft - 1), 50);
                } else {
                    console.warn(`Tour target #${currentStep.targetId} not found`);
                }
            }
        }

        attemptFind(50);
    };

    const calculateTooltipPosition = (rect: DOMRect, placement: TourStep['placement'] = 'bottom') => {
        // Default to bottom if no placement
        const gap = 12;
        const tooltipWidth = 300; // Estimated max width
        const screenWidth = window.innerWidth;

        let styles: React.CSSProperties = {
            position: 'fixed'
        };

        // Horizontal centering helper
        const centerH = rect.left + rect.width / 2;

        // Vertical centering helper
        const centerV = rect.top + rect.height / 2;

        switch (placement) {
            case 'top':
                styles.bottom = window.innerHeight - rect.top + gap;
                styles.left = Math.max(10, Math.min(screenWidth - tooltipWidth - 10, centerH - tooltipWidth / 2));
                break;
            case 'left':
                styles.right = window.innerWidth - rect.left + gap;
                styles.top = centerV - 100; // rough center
                break;
            case 'right':
                styles.left = rect.right + gap;
                styles.top = centerV - 100;
                break;
            case 'bottom':
            default:
                styles.top = rect.bottom + gap;
                styles.left = Math.max(10, Math.min(screenWidth - tooltipWidth - 10, centerH - tooltipWidth / 2));
                break;
        }

        setTooltipStyle(styles);
    };

    const handleNext = () => {
        if (currentStepIndex < steps.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
        } else {
            onComplete();
        }
    };

    // Reset step index when opened (safety measure)
    useEffect(() => {
        if (isOpen) {
            setCurrentStepIndex(0);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] overflow-hidden">
            {/* Click outside to close (Optional but enhancing UX) */}
            <div className="absolute inset-0" onClick={onSkip} />

            {/* Spotlight Effect - Added pointer-events-none to let clicks pass through to backdrop? 
                Actually we want clicks on the HOLE to pass through? No, usually tour blocks interaction. 
                But user wants to "thoát trang là tắt". 
                If they click the "hole" (the target), they might interact with the app.
                The current implementation has pointer-events-none on the spotlight div.
                So clicks pass through to the underlying element. This allows interaction.
                But clicks on the REST of the screen (the dark overlay) should probably close the tour?
                The previous code didn't have a dark overlay div, just the spotlight div.
                Wait, `fixed inset-0` div is the container. It's transparent?
                If I add `onClick={onSkip}` to it, then clicking ANYWHERE (except the tooltip) will close the tour.
                This might be annoying if they accidentally click.
                But "thoát trang" implies "exit".
                Let's stick to the "reset" part.
                I added the useEffect reset.
            */}
            {targetRect && (
                <div
                    className="absolute transition-all duration-300 ease-out pointer-events-none"
                    style={{
                        top: targetRect.top,
                        left: targetRect.left,
                        width: targetRect.width,
                        height: targetRect.height,
                        borderRadius: '8px',
                        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.75)',
                        outline: '2px solid rgba(6, 182, 212, 0.8)'
                    }}
                />
            )}

            {/* Tooltip Card */}
            {targetRect && (
                <div
                    className="bg-white rounded-xl shadow-2xl p-5 w-[90%] max-w-xs md:max-w-sm absolute animate-in fade-in zoom-in-95 duration-300"
                    style={tooltipStyle}
                >
                    <button
                        onClick={onSkip}
                        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 p-1"
                    >
                        <X size={20} />
                    </button>

                    <div className="mb-4">
                        <h3 className="text-lg font-bold text-gray-800 mb-1">{currentStep.title}</h3>
                        <p className="text-gray-600 text-sm leading-relaxed min-h-[3rem]">
                            {displayedText}
                            <span className="animate-pulse">|</span>
                        </p>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                        <button
                            onClick={onSkip}
                            className="text-gray-400 hover:text-gray-600 text-sm font-medium px-2 py-1"
                        >
                            Bỏ qua
                        </button>

                        <div className="flex gap-1">
                            {steps.map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentStepIndex ? 'w-6 bg-cyan-500' : 'w-1.5 bg-gray-200'
                                        }`}
                                />
                            ))}
                        </div>

                        <button
                            onClick={handleNext}
                            className="flex items-center gap-1.5 bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-cyan-500/30"
                        >
                            {currentStepIndex === steps.length - 1 ? (
                                <>Hoàn tất <Check size={16} /></>
                            ) : (
                                <>Tiếp theo <ChevronRight size={16} /></>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>,
        document.body
    );
};

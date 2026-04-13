'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

const OTPSuccess = () => (
    <div className="flex items-center gap-4 w-full">
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="w-9 h-10 bg-green-500 ring-4 ring-green-800 text-white flex items-center justify-center rounded-lg"
        >
            <Check size={16} strokeWidth={3} />
        </motion.div>
        <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-green-500 font-medium"
        >
            OTP Verified Successfully!
        </motion.p>
    </div>
);

const OTPError = () => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="text-center text-red-400 font-medium mt-2"
    >
        Invalid OTP
    </motion.div>
);

interface OTPInputProps {
    value?: string;
    onChange?: (value: string) => void;
    isError?: boolean;
    onResetError?: () => void;
}

export function OTPInput({ value = '', onChange, isError = false, onResetError }: OTPInputProps) {
    const [state, setState] = useState<'idle' | 'error'>('idle');
    const [otp, setOtp] = useState<string[]>(Array(8).fill(''));
    const inputRefs = useRef<(HTMLInputElement | null)[]>(Array(8).fill(null));
    const animationControls = useAnimationControls();

    // Update state when external error prop changes
    useEffect(() => {
        if (isError) {
            errorAnimation();
        }
    }, [isError]);

    const errorAnimation = async () => {
        setState('error');
        await animationControls.start({ 
            x: [0, 3, -3, 3, -3, 0], 
            transition: { duration: 0.4, ease: 'easeInOut' } 
        });
        setState('idle');
        onResetError?.();
    };

    const handleInput = (index: number, value: string) => {
        // Only allow digits
        const digit = value.replace(/\D/g, '');
        
        if (digit.length === 0) {
            // Backspace or delete
            const newOtp = [...otp];
            newOtp[index] = '';
            setOtp(newOtp);
            updateOtpValue(newOtp);
            return;
        }

        // Handle paste (multiple digits)
        if (digit.length > 1) {
            const digits = digit.split('').slice(0, 8 - index);
            const newOtp = [...otp];
            digits.forEach((d, i) => {
                if (index + i < 8) {
                    newOtp[index + i] = d;
                }
            });
            setOtp(newOtp);
            updateOtpValue(newOtp);
            
            // Focus on the next empty field or last field
            const nextIndex = Math.min(index + digits.length, 7);
            inputRefs.current[nextIndex]?.focus();
            return;
        }

        // Single digit input
        const newOtp = [...otp];
        newOtp[index] = digit;
        setOtp(newOtp);
        updateOtpValue(newOtp);

        // Auto-focus to next field
        if (digit && index < 7) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const updateOtpValue = (otpArray: string[]) => {
        const otpString = otpArray.join('');
        onChange?.(otpString);
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace') {
            e.preventDefault();
            const newOtp = [...otp];
            if (otp[index]) {
                newOtp[index] = '';
            } else if (index > 0) {
                newOtp[index - 1] = '';
                inputRefs.current[index - 1]?.focus();
            }
            setOtp(newOtp);
            updateOtpValue(newOtp);
        } else if (e.key === 'ArrowLeft' && index > 0) {
            inputRefs.current[index - 1]?.focus();
        } else if (e.key === 'ArrowRight' && index < 7) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>, index: number) => {
        e.preventDefault();
        const pastedText = e.clipboardData.getData('text');
        const digits = pastedText.replace(/\D/g, '').split('');
        
        if (digits.length > 0) {
            const newOtp = [...otp];
            digits.slice(0, 8 - index).forEach((digit, i) => {
                newOtp[index + i] = digit;
            });
            setOtp(newOtp);
            updateOtpValue(newOtp);
            
            // Focus on last filled or next empty
            const lastFilledIndex = Math.min(index + digits.length - 1, 7);
            inputRefs.current[lastFilledIndex]?.focus();
        }
    };

    return (
        <div className="flex flex-col items-center justify-center gap-2">
            <div className="relative">
                <motion.div animate={animationControls} className="flex items-center justify-center gap-2">
                    {Array.from({ length: 8 }).map((_, index) => (
                        <motion.div
                            key={index}
                            className={cn(
                                'w-9 h-10 bg-neutral-100 dark:bg-neutral-800 rounded-lg ring-2 ring-transparent focus-within:shadow-inner overflow-hidden',
                                state === 'error' ? 'ring-red-400' : 'focus-within:ring-blue-500'
                            )}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ type: 'spring', stiffness: 700, damping: 20, delay: index * 0.05 }}
                        >
                            <input
                                ref={(el) => {
                                    inputRefs.current[index] = el;
                                }}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={otp[index]}
                                onChange={(e) => handleInput(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                onPaste={(e) => handlePaste(e, index)}
                                placeholder="0"
                                className="border-none outline-none w-9 h-10 text-center bg-transparent placeholder:text-neutral-400 dark:placeholder:text-neutral-600 caret-transparent text-lg font-semibold"
                            />
                        </motion.div>
                    ))}
                </motion.div>
                {state === 'error' && <div className="absolute inset-0 top-full left-0"><OTPError /></div>}
            </div>
        </div>
    );
}

export default OTPInput;

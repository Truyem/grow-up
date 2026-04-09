
import React, { useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { DailyPlan, Meal } from '../types';
import { GlassCard } from './ui/GlassCard';
import { Utensils, RefreshCw, Check, CheckCircle2, Flame, Beef, Wheat, Droplets, X, Camera, ScanLine, Loader2, Zap, ZapOff, Image as ImageIcon, Trash2, Video } from 'lucide-react';
import { analyzeFoodImage, analyzeFoodText } from '../services/geminiService';


interface NutritionDisplayProps {
    plan: DailyPlan;
    onReset: (type: 'workout' | 'nutrition') => void;
    onUpdatePlan: (plan: DailyPlan) => void;

    onCompleteNutrition?: (nutrition: DailyPlan['nutrition']) => void;
}

// --- MICRO COMPONENTS ---

const CircularProgress: React.FC<{
    value: number;
    max: number;
    color: string;
    label: string;
    unit: string;
    icon: React.ReactNode;
}> = ({ value, max, color, label, unit, icon }) => {
    const radius = 30;
    const circumference = 2 * Math.PI * radius;
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className="flex flex-col items-center gap-2 group">
            <div className="relative w-20 h-20 flex items-center justify-center">
                {/* Background Circle */}
                <svg className="w-full h-full transform -rotate-90">
                    <circle
                        cx="40"
                        cy="40"
                        r={radius}
                        stroke="currentColor"
                        strokeWidth="6"
                        fill="transparent"
                        className="text-white/5"
                    />
                    {/* Progress Circle */}
                    <circle
                        cx="40"
                        cy="40"
                        r={radius}
                        stroke={color}
                        strokeWidth="6"
                        fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                    />
                </svg>
                {/* Icon in Center */}
                <div className={`absolute inset-0 flex items-center justify-center text-white/80 group-hover:scale-110 transition-transform`}>
                    {icon}
                </div>
            </div>
            <div className="text-center">
                <p className="text-sm font-bold text-white">{value}/{max}</p>
                <p className="text-[10px] uppercase tracking-wider text-gray-400">{label}</p>
            </div>
        </div>
    );
};

const MealItem: React.FC<{
    meal: Meal;
    isConsumed: boolean;
    onToggle: (e: React.MouseEvent) => void;
    onClick: () => void;
    onDelete?: (e: React.MouseEvent) => void;
    canDelete?: boolean;
}> = ({ meal, isConsumed, onToggle, onClick, onDelete, canDelete }) => (
    <div
        onClick={onClick}
        className={`group relative overflow-hidden border rounded-2xl p-4 transition-all duration-300 cursor-pointer 
        ${isConsumed
                ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20 hover:shadow-lg'}`}
    >
        {/* Background Accent */}
        <div className={`absolute -right-10 -top-10 w-40 h-40 bg-gradient-to-br from-emerald-500/20 to-transparent rounded-full blur-3xl transition-opacity duration-500 ${isConsumed ? 'opacity-100' : 'opacity-0'}`} />

        <div className="relative z-10 flex gap-4 items-center">
            {/* Checkbox / Status Icon */}
            <div
                onClick={onToggle}
                className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center border transition-all duration-300 z-20 hover:scale-105 active:scale-95
                ${isConsumed
                        ? 'bg-emerald-500 text-white border-emerald-400 scale-110'
                        : 'bg-white/5 border-white/10 text-white/20 group-hover:border-white/30'}`}
            >
                {isConsumed ? <Check className="w-6 h-6 stroke-[3]" /> : <Utensils className="w-5 h-5" />}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-1">
                    <h4 className={`font-bold text-lg transition-colors truncate pr-2 ${isConsumed ? 'text-emerald-300' : 'text-white group-hover:text-emerald-200'}`}>
                        {meal.name}
                    </h4>

                    {/* Macro Badges */}
                    <div className="flex flex-wrap gap-2 text-[10px] font-bold mt-1 sm:mt-0 opacity-80 group-hover:opacity-100 transition-opacity">
                        <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/20">{meal.calories} kcal</span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/20">{meal.protein}g Pro</span>
                    </div>
                </div>

                <p className={`text-sm leading-relaxed transition-colors line-clamp-2 ${isConsumed ? 'text-emerald-100/60' : 'text-gray-400'}`}>
                    {meal.description}
                </p>
            </div>

            {/* Delete Button */}
            {canDelete && onDelete && (
                <button
                    onClick={onDelete}
                    className="flex-shrink-0 p-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/30 transition-all z-20 hover:scale-105 active:scale-95"
                    title="Xoá món ăn"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            )}
        </div>
    </div>
);

// --- MODAL COMPONENT ---
const MealDetailModal: React.FC<{
    meal: Meal;
    isConsumed: boolean;
    onClose: () => void;
    onToggle: () => void;
}> = ({ meal, isConsumed, onClose, onToggle }) => {
    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
            <div className="relative w-full max-w-sm bg-[#1a1b1e] border border-white/10 rounded-3xl p-6 shadow-2xl animate-fade-in-up">

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 rounded-md bg-white/5 text-[10px] font-bold uppercase text-emerald-400 tracking-wider border border-white/5">
                            Chi tiết bữa ăn
                        </span>
                    </div>
                    <h3 className="text-2xl font-bold text-white leading-tight mb-2 pr-8">{meal.name}</h3>
                </div>

                {/* Macros Grid */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-red-500/10 rounded-xl p-3 border border-red-500/20">
                        <div className="text-xs text-red-300 font-medium mb-1">Calories</div>
                        <div className="text-xl font-bold text-white">{meal.calories}</div>
                    </div>
                    <div className="bg-blue-500/10 rounded-xl p-3 border border-blue-500/20">
                        <div className="text-xs text-blue-300 font-medium mb-1">Protein</div>
                        <div className="text-xl font-bold text-white">{meal.protein}g</div>
                    </div>
                    <div className="bg-orange-500/10 rounded-xl p-3 border border-orange-500/20">
                        <div className="text-xs text-orange-300 font-medium mb-1">Carbs</div>
                        <div className="text-xl font-bold text-white">{meal.carbs}g</div>
                    </div>
                    <div className="bg-yellow-500/10 rounded-xl p-3 border border-yellow-500/20">
                        <div className="text-xs text-yellow-300 font-medium mb-1">Fat</div>
                        <div className="text-xl font-bold text-white">{meal.fat}g</div>
                    </div>
                </div>

                {/* Description */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10 mb-6 max-h-[200px] overflow-y-auto">
                    <p className="text-gray-300 leading-relaxed text-sm">
                        {meal.description}
                    </p>
                </div>

            </div>
        </div>,
        document.body
    );
};

const LocketCameraModal: React.FC<{
    onCapture: (base64: string, isVideo?: boolean) => void;
    onClose: () => void;
}> = ({ onCapture, onClose }) => {
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [captureMode, setCaptureMode] = useState<'photo' | 'video'>('photo');

    // Video recording states
    const [isRecording, setIsRecording] = useState(false);
    const [recordingProgress, setRecordingProgress] = useState(0);
    const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
    const chunksRef = React.useRef<Blob[]>([]);
    const progressIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

    const RECORDING_DURATION = 30; // 30 seconds

    React.useEffect(() => {
        const startCamera = async () => {
            try {
                // Try with audio first for video recording
                let mediaStream: MediaStream;
                try {
                    mediaStream = await navigator.mediaDevices.getUserMedia({
                        video: { facingMode: 'environment', aspectRatio: 1 },
                        audio: true
                    });
                } catch (audioErr) {
                    // Fallback to video only if audio fails
                    console.warn("Audio not available, falling back to video only:", audioErr);
                    mediaStream = await navigator.mediaDevices.getUserMedia({
                        video: { facingMode: 'environment', aspectRatio: 1 },
                        audio: false
                    });
                }
                setStream(mediaStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
            } catch (err: any) {
                console.error("Camera access error:", err);
                alert(`Không thể truy cập camera.\n\nLỗi: ${err?.name}: ${err?.message}`);
                onClose();
            }
        };
        startCamera();

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
            }
        };
    }, []);

    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [flashOn, setFlashOn] = useState(false);

    const toggleFlash = async () => {
        setFlashOn(!flashOn);
        if (stream) {
            const track = stream.getVideoTracks()[0];
            const capabilities = (track.getCapabilities && track.getCapabilities()) as any;
            if (capabilities && 'torch' in capabilities) {
                try {
                    await track.applyConstraints({
                        advanced: [{ torch: !flashOn } as any]
                    });
                } catch (e) {
                    console.error("Flash toggle failed", e);
                }
            }
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                onCapture(base64);
            };
            reader.readAsDataURL(file);
        }
    };

    const capturePhoto = () => {
        if (!videoRef.current) return;
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0);
            const base64 = canvas.toDataURL('image/jpeg', 0.8);
            onCapture(base64, false);
        }
    };

    const startRecording = () => {
        if (!stream) return;

        chunksRef.current = [];
        const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                chunksRef.current.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: 'video/webm' });
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                onCapture(base64, true);
            };
            reader.readAsDataURL(blob);
        };

        mediaRecorder.start();
        setIsRecording(true);
        setRecordingProgress(0);

        // Progress animation
        const startTime = Date.now();
        progressIntervalRef.current = setInterval(() => {
            const elapsed = (Date.now() - startTime) / 1000;
            const progress = Math.min(elapsed / RECORDING_DURATION, 1);
            setRecordingProgress(progress);

            if (progress >= 1) {
                stopRecording();
            }
        }, 50);
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setRecordingProgress(0);
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
                progressIntervalRef.current = null;
            }
        }
    };

    const handleCaptureClick = () => {
        if (captureMode === 'photo') {
            capturePhoto();
        } else {
            if (isRecording) {
                stopRecording();
            } else {
                startRecording();
            }
        }
    };

    // Calculate progress ring
    const ringRadius = 180;
    const ringCircumference = 2 * Math.PI * ringRadius;
    const ringOffset = ringCircumference * (1 - recordingProgress);

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center pt-10 pb-10 animate-fade-in overflow-hidden touch-none">
            {/* Hidden Input */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*,video/*"
                onChange={handleFileChange}
            />

            {/* Header */}
            <div className="absolute top-4 left-0 w-full px-4 flex justify-between items-center z-50 pointer-events-none">
                <div className="w-12" />
                {/* Recording Timer */}
                {isRecording && (
                    <div className="px-4 py-2 rounded-full bg-red-500/80 text-white font-bold flex items-center gap-2 animate-pulse">
                        <div className="w-3 h-3 bg-white rounded-full" />
                        {Math.ceil(RECORDING_DURATION - recordingProgress * RECORDING_DURATION)}s
                    </div>
                )}
                <div className="w-12" />
            </div>

            {/* Center Content Wrapper */}
            <div className="relative w-full h-full flex flex-col items-center justify-center max-w-lg mx-auto">

                {/* Viewfinder with Progress Border */}
                <div
                    className="relative w-full max-w-[90vw] aspect-square flex-shrink-0 mb-6"
                    style={{ maxHeight: '60vh' }}
                >
                    <div
                        className="w-full h-full rounded-[2rem] overflow-hidden shadow-2xl relative bg-zinc-900"
                        style={{
                            border: captureMode === 'video' && isRecording
                                ? '6px solid transparent'
                                : '6px solid rgba(255,255,255,0.3)',
                            background: captureMode === 'video' && isRecording
                                ? `linear-gradient(#000, #000) padding-box, conic-gradient(from 0deg, #ef4444 ${recordingProgress * 100}%, rgba(255,255,255,0.3) ${recordingProgress * 100}%) border-box`
                                : 'none'
                        }}
                    >
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                        />

                        {/* Corner Accents */}
                        <div className="absolute top-6 left-6 w-10 h-10 border-t-[6px] border-l-[6px] border-white/40 rounded-tl-2xl pointer-events-none" />
                        <div className="absolute top-6 right-6 w-10 h-10 border-t-[6px] border-r-[6px] border-white/40 rounded-tr-2xl pointer-events-none" />
                        <div className="absolute bottom-6 left-6 w-10 h-10 border-b-[6px] border-l-[6px] border-white/40 rounded-bl-2xl pointer-events-none" />
                        <div className="absolute bottom-6 right-6 w-10 h-10 border-b-[6px] border-r-[6px] border-white/40 rounded-br-2xl pointer-events-none" />
                    </div>
                </div>

                {/* Controls Container */}
                <div className="w-full px-6 flex flex-col items-center gap-6 mt-auto pb-8">
                    {/* Mode Selection */}
                    <div className="flex justify-center gap-4 bg-black/40 p-1.5 rounded-full backdrop-blur-md">
                        <button
                            onClick={() => !isRecording && setCaptureMode('photo')}
                            disabled={isRecording}
                            className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${captureMode === 'photo'
                                ? 'bg-white text-black shadow-lg'
                                : 'text-white/70 hover:text-white'
                                }`}
                        >
                            Ảnh
                        </button>
                        <button
                            onClick={() => !isRecording && setCaptureMode('video')}
                            disabled={isRecording}
                            className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${captureMode === 'video'
                                ? 'bg-red-500 text-white shadow-lg'
                                : 'text-white/70 hover:text-white'
                                }`}
                        >
                            Video
                        </button>
                    </div>

                    {/* Action Buttons Row */}
                    <div className="w-full flex justify-between items-center max-w-[350px]">
                        {/* Upload Button */}
                        <button
                            onClick={handleUploadClick}
                            disabled={isRecording}
                            className={`p-4 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all active:scale-95 ${isRecording ? 'invisible' : ''}`}
                        >
                            <ImageIcon className="w-6 h-6" />
                        </button>

                        {/* Capture/Record Button */}
                        <button
                            onClick={handleCaptureClick}
                            className={`w-20 h-20 rounded-full border-[6px] flex items-center justify-center transition-all active:scale-95 hover:scale-105 shadow-xl ${captureMode === 'video'
                                ? isRecording
                                    ? 'border-red-500 bg-red-500/20'
                                    : 'border-white/50 bg-white/10'
                                : 'border-white bg-white/20'
                                }`}
                        >
                            {captureMode === 'video' ? (
                                <div className={`w-full h-full rounded-full flex items-center justify-center transition-all ${isRecording ? 'scale-50' : 'scale-100'}`}>
                                    <div className={`shadow-lg bg-red-500 transition-all ${isRecording ? 'w-10 h-10 rounded-md' : 'w-16 h-16 rounded-full'}`} />
                                </div>
                            ) : (
                                <div className="w-16 h-16 bg-white rounded-full border-4 border-transparent shadow-lg" />
                            )}
                        </button>

                        {/* Flash Button */}
                        <button
                            onClick={toggleFlash}
                            disabled={isRecording}
                            className={`p-4 rounded-full backdrop-blur-md border border-white/10 transition-all active:scale-95 ${flashOn ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20' : 'bg-white/10 text-white hover:bg-white/20'
                                } ${isRecording ? 'invisible' : ''}`}
                        >
                            {flashOn ? <Zap className="w-6 h-6 fill-current" /> : <ZapOff className="w-6 h-6" />}
                        </button>
                    </div>

                    <button
                        onClick={onClose}
                        className="text-white/50 hover:text-white transition-colors text-sm font-medium py-2"
                    >
                        Đóng Camera
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export const NutritionDisplay: React.FC<NutritionDisplayProps> = ({ plan, onReset, onUpdatePlan, onCompleteNutrition }) => {
    // Consumed state is now persisted in meal.consumed via onUpdatePlan

    // State for modal
    const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [showCamera, setShowCamera] = useState(false);


    // State for manual food input
    const [showManualInput, setShowManualInput] = useState(false);
    const [manualFoodText, setManualFoodText] = useState('');
    const [isAnalyzingManual, setIsAnalyzingManual] = useState(false);

    // Cleanup stream in case component unmounts while camera is open (though handled in modal)

    const toggleMeal = (mealName: string) => {
        const updatedPlan = { ...plan };
        updatedPlan.nutrition = {
            ...updatedPlan.nutrition,
            meals: updatedPlan.nutrition.meals.map(m =>
                m.name === mealName ? { ...m, consumed: !m.consumed } : m
            )
        };
        onUpdatePlan(updatedPlan);
    };

    // Delete meal function - only for meals added via camera (with timestamp)
    const deleteMeal = (mealName: string) => {
        const updatedPlan = { ...plan };
        updatedPlan.nutrition.meals = updatedPlan.nutrition.meals.filter(
            meal => meal.name !== mealName
        );
        onUpdatePlan(updatedPlan);
        // consumed state is now handled in the meal object itself via toggleMeal
    };

    // Check if meal can be deleted (added via camera - has timestamp format)
    const canDeleteMeal = (mealName: string): boolean => {
        // Meals added via camera have format "Name (HH:MM)"
        return /\(\d{2}:\d{2}\)$/.test(mealName);
    };

    const handleCameraCapture = async (base64: string, isVideo: boolean = false) => {
        setShowCamera(false);
        setIsScanning(true);
        try {
            const analyzedMeal = await analyzeFoodImage(base64, isVideo);

            // Create new meal with unique name if needed (append time?)
            const now = new Date();
            const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

            const newMeal: Meal = {
                ...analyzedMeal,
                name: `${analyzedMeal.name} (${timeString})` // Ensure uniqueness
            };

            // Update Plan
            const updatedPlan = { ...plan };
            if (!updatedPlan.nutrition.meals) updatedPlan.nutrition.meals = [];

            updatedPlan.nutrition.meals.push(newMeal);
            onUpdatePlan(updatedPlan);

            // Auto-mark as consumed
            toggleMeal(newMeal.name);

            // Show details
            setSelectedMeal(newMeal);

        } catch (error) {
            console.error("Analysis failed", error);
            alert("Không thể phân tích ảnh hoặc Gemini bị lỗi. Vui lòng thử lại.");
        } finally {
            setIsScanning(false);
        }
    };

    // Calculate consumed totals
    const consumed = useMemo(() => {
        return plan.nutrition.meals.reduce((acc, meal) => {
            if (meal.consumed) {
                return {
                    calories: acc.calories + (meal.calories || 0),
                    protein: acc.protein + (meal.protein || 0),
                    carbs: acc.carbs + (meal.carbs || 0),
                    fat: acc.fat + (meal.fat || 0),
                };
            }
            return acc;
        }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
    }, [plan.nutrition.meals]);

    // Handle manual food text analysis
    const handleManualFoodAnalysis = async () => {
        if (!manualFoodText.trim()) return;

        setIsAnalyzingManual(true);
        try {
            const analyzedMeal = await analyzeFoodText(manualFoodText);

            // Create new meal with unique name (append time)
            const now = new Date();
            const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

            const newMeal: Meal = {
                ...analyzedMeal,
                name: `${analyzedMeal.name} (${timeString})`
            };

            // Update Plan
            const updatedPlan = { ...plan };
            updatedPlan.nutrition.meals = [...updatedPlan.nutrition.meals, newMeal];

            // Update totals
            updatedPlan.nutrition.totalCalories += newMeal.calories || 0;
            updatedPlan.nutrition.totalProtein += newMeal.protein || 0;
            updatedPlan.nutrition.totalCarbs += newMeal.carbs || 0;
            updatedPlan.nutrition.totalFat += newMeal.fat || 0;

            onUpdatePlan(updatedPlan);

            // Auto-mark as consumed and show details
            toggleMeal(newMeal.name);
            setSelectedMeal(newMeal);

            // Reset input
            setManualFoodText('');
            setShowManualInput(false);

        } catch (error) {
            console.error("Manual food analysis failed", error);
            alert("Không thể phân tích. Vui lòng thử lại.");
        } finally {
            setIsAnalyzingManual(false);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in relative pt-20 pb-10">
            {selectedMeal && (
                <MealDetailModal
                    meal={selectedMeal}
                    isConsumed={!!selectedMeal.consumed}
                    onClose={() => setSelectedMeal(null)}
                    onToggle={() => toggleMeal(selectedMeal.name)}
                />
            )}

            {showCamera ? (
                <LocketCameraModal
                    onCapture={handleCameraCapture}
                    onClose={() => setShowCamera(false)}
                />
            ) : (
                <>
                    {/* Header Section */}
                    <div className="text-center space-y-4">
                        <>
                            <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                                Dinh Dưỡng Hôm Nay
                            </h2>
                            <p className="text-gray-400 text-sm">
                                Theo dõi lượng Macro đã tiêu thụ của bạn
                            </p>
                        </>
                    </div>

                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Food Action Buttons */}
                        <div className="flex flex-col gap-3">
                            <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto w-full">
                                {/* Camera Button */}
                                <button
                                    id="tour-nutri-camera"
                                    onClick={() => setShowCamera(true)}
                                    disabled={isScanning}
                                    className="group relative flex flex-col items-center gap-2 px-4 py-4 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 rounded-2xl overflow-hidden hover:scale-105 active:scale-95 transition-all"
                                >
                                    <div className="absolute inset-0 bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className={`p-3 rounded-xl bg-emerald-500/20 text-emerald-400 ${isScanning ? 'animate-spin' : ''}`}>
                                        {isScanning ? <Loader2 className="w-6 h-6" /> : <Camera className="w-6 h-6" />}
                                    </div>
                                    <div className="text-center relative z-10">
                                        <div className="font-bold text-emerald-300">Chụp Ảnh</div>
                                        <div className="text-xs text-emerald-400/60">Quét món ăn</div>
                                    </div>
                                </button>

                                {/* Manual Input Button */}
                                <button
                                    id="tour-nutri-manual"
                                    onClick={() => setShowManualInput(!showManualInput)}
                                    className={`group relative flex flex-col items-center gap-2 px-4 py-4 bg-gradient-to-br from-amber-500/20 to-orange-500/20 border ${showManualInput ? 'border-amber-400' : 'border-amber-500/30'} rounded-2xl overflow-hidden hover:scale-105 active:scale-95 transition-all`}
                                >
                                    <div className="absolute inset-0 bg-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400">
                                        <Utensils className="w-6 h-6" />
                                    </div>
                                    <div className="text-center relative z-10">
                                        <div className="font-bold text-amber-300">Nhập Tay</div>
                                        <div className="text-xs text-amber-400/60">Gõ tên món</div>
                                    </div>
                                </button>
                            </div>

                            {/* Manual Food Input Form */}
                            {showManualInput && (
                                <div className="max-w-lg mx-auto w-full animate-fade-in">
                                    <div className="flex gap-2 p-3 bg-white/5 border border-amber-500/30 rounded-2xl backdrop-blur-md">
                                        <input
                                            type="text"
                                            value={manualFoodText}
                                            onChange={(e) => setManualFoodText(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleManualFoodAnalysis()}
                                            placeholder="VD: 1 tô phở bò, 2 quả trứng chiên..."
                                            className="flex-1 bg-transparent text-white placeholder-gray-500 px-3 py-2 outline-none"
                                            autoFocus
                                        />
                                        <button
                                            onClick={handleManualFoodAnalysis}
                                            disabled={isAnalyzingManual || !manualFoodText.trim()}
                                            className="px-4 py-2 bg-amber-500 text-white font-medium rounded-xl hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                                        >
                                            {isAnalyzingManual ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    <span>Đang tính...</span>
                                                </>
                                            ) : (
                                                <span>+ Thêm</span>
                                            )}
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1 text-center">
                                        AI sẽ tự động tính calo & macros cho món ăn của bạn
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Macro Visualization Ring Section */}
                        <div id="tour-nutri-macros" className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

                            <div className="relative z-10 grid grid-cols-2 gap-8 md:gap-12 justify-items-center">
                                <CircularProgress
                                    value={consumed.calories}
                                    max={plan.nutrition.totalCalories}
                                    color="#ef4444" // Red for Calories/Energy
                                    label="Calories"
                                    unit="kcal"
                                    icon={<Flame className="w-5 h-5 text-red-400" />}
                                />
                                <CircularProgress
                                    value={consumed.protein}
                                    max={plan.nutrition.totalProtein}
                                    color="#3b82f6" // Blue for Protein
                                    label="Protein"
                                    unit="g"
                                    icon={<Beef className="w-5 h-5 text-blue-400" />}
                                />
                                <CircularProgress
                                    value={consumed.carbs}
                                    max={plan.nutrition.totalCarbs || 0}
                                    color="#f59e0b" // Orange for Carbs
                                    label="Carbs"
                                    unit="g"
                                    icon={<Wheat className="w-5 h-5 text-orange-400" />}
                                />
                                <CircularProgress
                                    value={consumed.fat}
                                    max={plan.nutrition.totalFat || 0}
                                    color="#eab308" // Yellow for Fat
                                    label="Fat"
                                    unit="g"
                                    icon={<Droplets className="w-5 h-5 text-yellow-400" />}
                                />
                            </div>
                        </div>

                        {/* Plan Details & Meals */}
                        <div id="tour-nutri-meals" className="space-y-4">
                            <div className="flex items-center justify-between px-2">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Utensils className="w-5 h-5 text-emerald-400" />
                                    Thực Đơn
                                </h3>
                                <div className="text-xs text-gray-500 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                                    {plan.nutrition.meals.filter(m => m.consumed).length}/{plan.nutrition.meals.length} Hoàn thành
                                </div>
                            </div>

                            <div className="grid gap-3">
                                {plan.nutrition.meals.map((meal, index) => (
                                    <MealItem
                                        key={index}
                                        meal={meal}
                                        isConsumed={!!meal.consumed}
                                        onToggle={(e) => {
                                            e.stopPropagation();
                                            toggleMeal(meal.name);
                                        }}
                                        onClick={() => setSelectedMeal(meal)}
                                        canDelete={canDeleteMeal(meal.name)}
                                        onDelete={(e) => {
                                            e.stopPropagation();
                                            deleteMeal(meal.name);
                                        }}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Suggested Food Items Section Removed */}

                        {/* Footer Actions */}
                        <div className="text-center pt-8 border-t border-white/5 space-y-4">
                            <p className="text-xs text-gray-500 mb-4 italic">
                                *Mẹo: Chạm vào món ăn để xem chi tiết
                            </p>

                            {/* Complete Nutrition Button */}
                            {onCompleteNutrition && (
                                <button
                                    onClick={() => onCompleteNutrition(plan.nutrition)}
                                    className="group relative w-full max-w-xs mx-auto px-8 py-4 rounded-2xl overflow-hidden transition-all hover:scale-105 active:scale-95 bg-gradient-to-r from-emerald-600 to-cyan-600 shadow-lg shadow-emerald-500/25"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-cyan-400 opacity-0 group-hover:opacity-30 transition-opacity" />
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_70%)]" />
                                    <div className="relative flex items-center justify-center gap-3 text-white">
                                        <CheckCircle2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                        <span className="font-bold text-base">Hoàn Thành Thực Đơn</span>
                                    </div>
                                </button>
                            )}

                            <button
                                id="tour-nutri-reset"
                                onClick={() => onReset('nutrition')}
                                className="group relative px-8 py-3 rounded-2xl bg-white/5 overflow-hidden transition-all hover:scale-105 active:scale-95"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="relative flex items-center justify-center gap-2 text-gray-400 group-hover:text-emerald-300 transition-colors">
                                    <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                                    <span className="font-medium">Tạo Kế Hoạch Mới</span>
                                </div>
                            </button>
                        </div>
                    </div>
                </>
            )
            }
        </div >
    );
};

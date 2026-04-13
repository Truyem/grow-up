

import React, { useState, useEffect } from 'react';
import { DailyPlan, Exercise, ExerciseLog, ExerciseSetLog, Meal, WorkoutLevel, MuscleGroup } from '../types';
import { GlassCard } from './ui/GlassCard';
import { RestTimer } from './ui/RestTimer';
import { HumanBodyMuscleMap } from './ui/HumanBodyMuscleMap';
import { AddExerciseModal } from './AddExerciseModal';
import { suggestNextExercises, suggestAlternativeExercise } from '../services/geminiService';
import { useAppContext } from '../context';


import { Flame, Zap, Clock, CheckSquare, Circle, Dumbbell, ExternalLink, Timer, PenLine, CheckCircle2, RefreshCw, Layers, Sun, Moon, Footprints, Sparkles, Loader2, Weight, Plus, Minus } from 'lucide-react';
import { calculateWorkoutCalories, formatDuration } from '../services/metCalories';


interface PlanDisplayProps {
  plan: DailyPlan;
  onReset: (type: 'workout' | 'nutrition') => void;
  onComplete: (levelSelected: string, summary: string, completedExercises: string[], userNotes: string, nutrition: DailyPlan['nutrition'], exerciseLogs?: ExerciseLog[]) => Promise<void>;
  onUpdatePlan: (updatedPlan: DailyPlan) => void;
  onUpdatePlanImmediate?: (updatedPlan: DailyPlan) => void;
}

const formatCurrencyInput = (value: string) => {
  // Basic formatter for input display
  return value.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

const ColorBadge: React.FC<{ color?: string }> = ({ color }) => {
  if (!color) return null;
  const colors: Record<string, string> = {
    Red: 'bg-red-500 shadow-red-500/50',
    Blue: 'bg-blue-500 shadow-blue-500/50',
    Yellow: 'bg-yellow-400 shadow-yellow-400/50',
    Green: 'bg-emerald-500 shadow-emerald-500/50',
    Pink: 'bg-pink-500 shadow-pink-500/50',
    Purple: 'bg-purple-500 shadow-purple-500/50',
    Orange: 'bg-orange-500 shadow-orange-500/50',
  };
  const translations: Record<string, string> = {
    Red: 'Vai',
    Blue: 'Ngực',
    Yellow: 'Lưng',
    Green: 'Tay sau',
    Pink: 'Tay trước',
    Purple: 'Chân',
    Orange: 'Abs/Cardio'
  };

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase tracking-wider shadow-lg ${colors[color] || 'bg-gray-500'}`}>
      {translations[color] || color}
    </span>
  );
};

interface ExerciseItemProps {
  exercise: Exercise;
  isChecked: boolean;
  onToggle: () => void;
  onPreview: () => void;
  onStartTimer: () => void;
  exerciseLog?: ExerciseLog;
  onUpdateLog: (log: ExerciseLog) => void;
  onSwap?: () => void;
  isSwapping?: boolean;
  previousVolume?: number;
}

const ExerciseItem: React.FC<ExerciseItemProps> = ({ exercise, isChecked, onToggle, onPreview, onStartTimer, exerciseLog, onUpdateLog, onSwap, isSwapping, previousVolume }) => {
  const isWalking = exercise.name.toLowerCase().includes('đi bộ') || exercise.name.toLowerCase().includes('walking');
  const isBodyweight = !exercise.equipment || 
                       exercise.equipment.toLowerCase() === 'none' || 
                       exercise.equipment.toLowerCase().includes('bodyweight') ||
                       exercise.name.toLowerCase().includes('bodyweight') ||
                       exercise.name.toLowerCase().includes('push-up') ||
                       exercise.name.toLowerCase().includes('pull-up') ||
                       exercise.name.toLowerCase().includes('plank') ||
                       exercise.name.toLowerCase().includes('burpee');
  const hasEquipment = !!exercise.equipment;

  // Initialize sets from exerciseLog or default based on exercise.sets
  const currentSets: ExerciseSetLog[] = exerciseLog?.sets ||
    Array.from({ length: exercise.sets }, () => ({ weight: 0, reps: 0 }));

  const handleSetChange = (setIndex: number, field: 'weight' | 'reps', value: number) => {
    const updatedSets = [...currentSets];
    updatedSets[setIndex] = { ...updatedSets[setIndex], [field]: Math.max(0, value) };
    const totalVolume = updatedSets.reduce((sum, s) => sum + (s.weight * s.reps), 0);
    onUpdateLog({
      exerciseName: exercise.name,
      sets: updatedSets,
      totalVolume,
    });
  };

  const handleAddSet = () => {
    const updatedSets = [...currentSets, { weight: currentSets[currentSets.length - 1]?.weight || 0, reps: 0 }];
    const totalVolume = updatedSets.reduce((sum, s) => sum + (s.weight * s.reps), 0);
    onUpdateLog({
      exerciseName: exercise.name,
      sets: updatedSets,
      totalVolume,
    });
  };

  const handleRemoveSet = () => {
    if (currentSets.length <= 1) return;
    const updatedSets = currentSets.slice(0, -1);
    const totalVolume = updatedSets.reduce((sum, s) => sum + (s.weight * s.reps), 0);
    onUpdateLog({
      exerciseName: exercise.name,
      sets: updatedSets,
      totalVolume,
    });
  };

  const totalVolume = currentSets.reduce((sum, s) => sum + (s.weight * s.reps), 0);

  return (
    <div
      className={`
        group relative pl-4 py-3 border-l-2 transition-all duration-300 mb-2 rounded-r-lg
        ${isChecked ? 'border-emerald-500 bg-emerald-500/5' : 'border-white/10 hover:bg-white/5'}
      `}
    >
      <div className="flex items-start gap-4">
        <div
          onClick={onToggle}
          className={`mt-1 cursor-pointer transition-colors ${isChecked ? 'text-emerald-400' : 'text-gray-600 group-hover:text-cyan-400'}`}
        >
          {isChecked ? <CheckSquare className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
        </div>

        <div className="flex-1">
          <div className="flex justify-between items-start mb-1">
            <button
              onClick={onPreview}
              className={`text-left font-bold text-lg transition-all flex items-center gap-2 hover:underline decoration-cyan-500/50 decoration-2 underline-offset-4
                ${isChecked ? 'text-emerald-400 line-through decoration-emerald-500/50 opacity-70' : 'text-white group-hover:text-cyan-300'}
              `}
              title="Xem hướng dẫn trên YouTube"
            >
              {exercise.name}
              <ExternalLink className={`w-3.5 h-3.5 ${isChecked ? 'hidden' : 'opacity-0 group-hover:opacity-100 text-cyan-400 transition-opacity'}`} />
            </button>

            <div className="flex gap-2 items-center">
              <ColorBadge color={exercise.colorCode} />
              {exercise.isBFR && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-pink-500 text-white shadow-lg shadow-pink-500/40">
                  BFR
                </span>
              )}
              {onSwap && !isChecked && (
                <button
                  onClick={(e) => { e.stopPropagation(); onSwap(); }}
                  disabled={isSwapping}
                  title="Gợi ý bài tập thay thế (máy đang có người)"
                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 text-orange-400 text-[10px] font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-3 h-3 ${isSwapping ? 'animate-spin' : ''}`} />
                  {isSwapping ? 'Đang tìm...' : 'Đổi bài'}
                </button>
              )}
            </div>
          </div>



          <div className="flex items-center justify-between">
            <div
              onClick={onToggle}
              className="cursor-pointer"
            >
              <div className={`flex items-center gap-4 text-sm mb-2 ${isChecked ? 'opacity-50' : 'text-gray-300'}`}>
                <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-yellow-400" /> {exercise.sets} Sets</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-emerald-400" /> {exercise.reps}</span>
              </div>

              {exercise.equipment && (
                <div className={`text-xs mb-1 flex items-center gap-1 ${isChecked ? 'opacity-50' : 'text-gray-400'}`}>
                  <Dumbbell className="w-3 h-3" /> {exercise.equipment}
                </div>
              )}
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onStartTimer();
              }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border transition-all active:scale-95 
                ${isWalking
                  ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-cyan-300 hover:border-cyan-500/30'}`}
            >
              {isWalking ? <Footprints className="w-3.5 h-3.5" /> : <Timer className="w-3.5 h-3.5" />}
              <span className="text-xs font-bold">{isWalking ? 'Đi bộ (60p)' : 'Nghỉ'}</span>
            </button>
          </div>

          {(exercise.primaryMuscleGroups?.length > 0 || exercise.secondaryMuscleGroups?.length > 0) && (
            <div className="flex flex-wrap gap-2 mb-2 mt-1 px-1">
              {exercise.primaryMuscleGroups?.map((m, i) => (
                <span key={`p-${i}`} className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {m}
                </span>
              ))}
              {exercise.secondaryMuscleGroups?.map((m, i) => (
                <span key={`s-${i}`} className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 opacity-80">
                  {m}
                </span>
              ))}
            </div>
          )}

          {exercise.notes && (
            <p
              onClick={onToggle}
              className={`text-xs italic bg-red-900/20 p-2 rounded-lg border border-red-500/20 mt-2 cursor-pointer font-bold ${isChecked ? 'text-emerald-200/50' : 'text-red-300/80'}`}
            >
              🔥 "{exercise.notes}"
            </p>
          )}

          {/* Weight Tracking Inline Form */}
          {isChecked && !isBodyweight && (
            <div className="mt-3 p-3 bg-blue-500/5 rounded-xl border border-blue-500/15 animate-fade-in">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Weight className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">Tracking Tạ</span>
                </div>
                {totalVolume > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      Vol: {totalVolume.toLocaleString()} kg
                    </span>
                    {previousVolume !== undefined && previousVolume > 0 && (() => {
                      const delta = totalVolume - previousVolume;
                      if (delta > 0) return (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-0.5">
                          ▲ +{delta.toLocaleString()} kg
                        </span>
                      );
                      if (delta < 0) return (
                        <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-full border border-red-500/20 flex items-center gap-0.5">
                          ▼ {delta.toLocaleString()} kg
                        </span>
                      );
                      return (
                        <span className="text-[10px] font-bold text-gray-400 bg-white/5 px-1.5 py-0.5 rounded-full border border-white/10">
                          = Giữ nguyên
                        </span>
                      );
                    })()}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                {/* Header */}
                <div className="grid grid-cols-[32px_1fr_1fr] gap-2 text-[10px] text-gray-500 font-bold uppercase px-1">
                  <span>Set</span>
                  <span>Kg</span>
                  <span>Reps</span>
                </div>

                {currentSets.map((set, idx) => (
                  <div key={idx} className="grid grid-cols-[32px_1fr_1fr] gap-2 items-center">
                    <span className="text-[11px] font-bold text-gray-400 text-center">{idx + 1}</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={set.weight || ''}
                      onChange={(e) => handleSetChange(idx, 'weight', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full bg-black/30 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white text-center focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/30"
                    />
                    <input
                      type="number"
                      inputMode="numeric"
                      value={set.reps || ''}
                      onChange={(e) => handleSetChange(idx, 'reps', parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full bg-black/30 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white text-center focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/30"
                    />
                  </div>
                ))}
              </div>

              {/* Add/Remove Set Buttons */}
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleAddSet}
                  className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 text-[10px] font-bold transition-all active:scale-95"
                >
                  <Plus className="w-3 h-3" /> Thêm Set
                </button>
                {currentSets.length > 1 && (
                  <button
                    onClick={handleRemoveSet}
                    className="flex items-center justify-center gap-1 px-3 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-[10px] font-bold transition-all active:scale-95"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};





export const PlanDisplay: React.FC<PlanDisplayProps> = ({ plan, onReset, onComplete, onUpdatePlan, onUpdatePlanImmediate }) => {
  const { userData, workoutHistory, showToast } = useAppContext();
  const [isCompleted, setIsCompleted] = useState(false);
  const [userNote, setUserNote] = useState('');
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const [timerDuration, setTimerDuration] = useState(120); // Default rest
  const [checkedState, setCheckedState] = useState<Record<string, boolean>>({});
  const [exerciseLogs, setExerciseLogs] = useState<Record<string, ExerciseLog>>({});




  // Add Exercise State
  const [generatingSection, setGeneratingSection] = useState<'morning' | 'evening' | null>(null);
  // Swap Exercise State
  const [swappingKey, setSwappingKey] = useState<string | null>(null);


  const currentWorkout: WorkoutLevel | undefined = plan.workout?.detail;

  if (!currentWorkout) {
    return (
      <div className="p-8 text-center text-red-400 bg-red-900/10 rounded-xl border border-red-500/20">
        <p>Lỗi dữ liệu: Không tìm thấy chi tiết bài tập.</p>
        <button onClick={() => onReset('workout')} className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-300">
          Reset Dữ Liệu
        </button>
      </div>
    );
  }

  // Combine all exercises to calculate progress
  const warmupExercises = currentWorkout.warmup || [];
  const morningExercises = currentWorkout.morning || [];
  const eveningExercises = currentWorkout.evening || [];
  const cooldownExercises = currentWorkout.cooldown || [];
  const allExercises = [...warmupExercises, ...morningExercises, ...eveningExercises, ...cooldownExercises];
  const totalExercises = allExercises.length;

  // Calculate checked based on composite keys "mor-X" and "eve-X"
  const checkedCount = Object.values(checkedState).filter(Boolean).length;
  const progressPercent = totalExercises > 0 ? Math.round((checkedCount / totalExercises) * 100) : 0;

  // Restore progress from Supabase-backed plan payload (only when plan changes externally)
  const [isRestoring, setIsRestoring] = useState(false);
  useEffect(() => {
    if (plan.workoutProgress?.checkedState && !isRestoring) {
      setCheckedState(plan.workoutProgress.checkedState);
      setUserNote(plan.workoutProgress.userNote || '');
      setExerciseLogs(plan.workoutProgress.exerciseLogs || {});
      console.log('[PlanDisplay] Restored progress from Supabase');
    } else if (!isRestoring) {
      setCheckedState({});
      setUserNote('');
      setExerciseLogs({});
    }
  }, [plan?.workoutProgress]);

  // Save progress to Supabase whenever it changes
  useEffect(() => {
    if (isCompleted) return;
    setIsRestoring(true);
    const updatedPlan = { ...plan, workoutProgress: { checkedState, userNote, exerciseLogs } };
    if (onUpdatePlanImmediate) {
      onUpdatePlanImmediate(updatedPlan);
    } else {
      onUpdatePlan(updatedPlan);
    }
    setTimeout(() => setIsRestoring(false), 100);
  }, [checkedState, userNote, exerciseLogs, isCompleted]);

  const handleToggle = (key: string) => {
    setCheckedState(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleUpdateExerciseLog = (key: string, log: ExerciseLog) => {
    setExerciseLogs(prev => ({ ...prev, [key]: log }));
  };

  // --- Volume Tracking Computations ---
  const morningVolume = morningExercises.reduce((sum, _, idx) => {
    const log = exerciseLogs[`mor-${idx}`];
    return sum + (log?.totalVolume || 0);
  }, 0);
  const eveningVolume = eveningExercises.reduce((sum, _, idx) => {
    const log = exerciseLogs[`eve-${idx}`];
    return sum + (log?.totalVolume || 0);
  }, 0);
  const sessionTotalVolume = morningVolume + eveningVolume;

  // Find previous session's total volume (most recent history entry with any exerciseLogs)
  const previousSessionVolume = (() => {
    const sortedHistory = [...workoutHistory].sort((a, b) => b.timestamp - a.timestamp);
    const prev = sortedHistory.find(h => h.exerciseLogs && h.exerciseLogs.length > 0);
    if (!prev || !prev.exerciseLogs) return 0;
    return prev.exerciseLogs.reduce((sum, log) => sum + log.totalVolume, 0);
  })();

  // Build a map: exerciseName -> previousVolume (from most recent history entry containing that exercise)
  const previousVolumeMap = (() => {
    const map: Record<string, number> = {};
    const sortedHistory = [...workoutHistory].sort((a, b) => b.timestamp - a.timestamp);
    sortedHistory.forEach(h => {
      if (!h.exerciseLogs) return;
      h.exerciseLogs.forEach(log => {
        if (!(log.exerciseName in map)) {
          map[log.exerciseName] = log.totalVolume;
        }
      });
    });
    return map;
  })();

  // --- Swap Exercise Handler ---
  const handleSwapExercise = async (key: string, section: 'morning' | 'evening', index: number) => {
    const exercise = section === 'morning' ? currentWorkout.morning[index] : currentWorkout.evening[index];
    if (!exercise) return;
    setSwappingKey(key);
    try {
      const alternative = await suggestAlternativeExercise(exercise, plan, userData, workoutHistory);
      if (alternative) {
        const updatedPlan = {
          ...plan,
          workout: {
            ...plan.workout,
            detail: {
              ...plan.workout.detail,
              morning: section === 'morning'
                ? plan.workout.detail.morning.map((ex, i) => i === index ? alternative : ex)
                : plan.workout.detail.morning,
              evening: section === 'evening'
                ? plan.workout.detail.evening.map((ex, i) => i === index ? alternative : ex)
                : plan.workout.detail.evening,
            }
          }
        };
        // Reset log for the swapped exercise key
        setExerciseLogs(prev => {
          const updated = { ...prev };
          delete updated[key];
          return updated;
        });
        // Also uncheck the exercise
        setCheckedState(prev => {
          const updated = { ...prev };
          delete updated[key];
          return updated;
        });
        onUpdatePlan(updatedPlan);
      }
    } catch (error) {
      console.error("Swap Exercise Error:", error);
    } finally {
      setSwappingKey(null);
    }
  };

  const handleOpenYouTube = (exerciseName: string) => {
    const query = encodeURIComponent(`${exerciseName}`);

    // Device Detection
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isMobile = /android|ipad|iphone|ipod/i.test(userAgent);

    if (isMobile) {
      // Mobile: Open m.youtube.com
      window.open(`https://m.youtube.com/results?search_query=${query}`, '_blank');
    } else {
      // Desktop: Open www.youtube.com in new tab
      window.open(`https://www.youtube.com/results?search_query=${query}`, '_blank');
    }
  };

  const handleStartTimer = (exerciseName: string) => {
    // Determine duration based on exercise type
    const lowerName = exerciseName.toLowerCase();
    if (lowerName.includes('đi bộ') || lowerName.includes('walking')) {
      setTimerDuration(3600); // 60 minutes for walking
    } else {
      setTimerDuration(120); // Standard 2 mins rest for weights
    }
    setIsTimerOpen(true);
  };

  const handleComplete = () => {
    setIsCompleted(true);

    const completedWarmup = warmupExercises
      .filter((_, idx) => checkedState[`warm-${idx}`])
      .map(ex => ex.name);

    const completedMorning = morningExercises
      .filter((_, idx) => checkedState[`mor-${idx}`])
      .map(ex => ex.name);

    const completedEvening = eveningExercises
      .filter((_, idx) => checkedState[`eve-${idx}`])
      .map(ex => ex.name);

    const completedCooldown = cooldownExercises
      .filter((_, idx) => checkedState[`cool-${idx}`])
      .map(ex => ex.name);

    const completedExercisesList = [...completedWarmup, ...completedMorning, ...completedEvening, ...completedCooldown];

    const finalNutrition = {
      ...plan.nutrition,
      // cost handled in NutritionDisplay if editable there, but here we just pass current
    };


    // Collect exercise logs for completed exercises only
    const completedLogs: ExerciseLog[] = (Object.entries(exerciseLogs) as [string, ExerciseLog][])
      .filter(([key]) => checkedState[key])
      .map(([, log]) => log)
      .filter(log => log.sets.some(s => s.weight > 0 || s.reps > 0)); // only include logs with data

    onComplete(
      currentWorkout.levelName,
      plan.workout.summary,
      completedExercisesList,
      userNote,
      finalNutrition,
      completedLogs.length > 0 ? completedLogs : undefined
    ).catch(() => {
      setIsCompleted(false);
      showToast('Không thể hoàn thành buổi tập khi đang offline.', 'error');
    });
  };

  const handleAutoAddExercise = async (section: 'morning' | 'evening') => {
    setGeneratingSection(section);
    try {
      const suggested = await suggestNextExercises(plan, userData, section, workoutHistory);
      if (suggested && suggested.length > 0) {
        const newExercise = suggested[0];
        const updatedPlan = { ...plan };
        if (section === 'morning') {
          updatedPlan.workout.detail.morning = [...updatedPlan.workout.detail.morning, newExercise];
        } else {
          updatedPlan.workout.detail.evening = [...updatedPlan.workout.detail.evening, newExercise];
        }
        onUpdatePlan(updatedPlan);
      }
    } catch (error) {
      console.error("AI Suggestion failed", error);
    } finally {
      setGeneratingSection(null);
    }
  };



  const renderSection = (
    title: string,
    icon: React.ReactNode,
    exercises: Exercise[],
    prefix: string,
    sectionKey?: 'morning' | 'evening',
    showAiAdd: boolean = false
  ) => (
    <div className="mb-6 last:mb-0">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10 text-cyan-200">
        {icon}
        <h4 className="font-bold uppercase tracking-wider text-sm">{title}</h4>
        <span className="text-xs text-gray-500 ml-auto">({exercises.length} bài)</span>
      </div>

      <div className="space-y-1">
        {exercises.length > 0 ? (
          exercises.map((ex, originalIndex) => {
            // Find original index in the unfiltered array to maintain state consistency


            // Fallback for newly added exercises that might not be in the original list if we are filtering?
            // Actually filtered is derived from exercises.
            // If we filter, we might hide the new exercise if it doesn't match filter.
            // But usually we just added it so we might want to see it. 
            // For now, assume it appears if it matches filter or if filter is All.

            const key = `${prefix}-${originalIndex}`;
            return (
              <ExerciseItem
                key={key}
                exercise={ex}
                isChecked={!!checkedState[key]}
                onToggle={() => handleToggle(key)}
                onPreview={() => handleOpenYouTube(ex.name)}
                onStartTimer={() => handleStartTimer(ex.name)}
                exerciseLog={exerciseLogs[key]}
                onUpdateLog={(log) => handleUpdateExerciseLog(key, log)}
                 onSwap={!isCompleted && sectionKey ? () => handleSwapExercise(key, sectionKey, originalIndex) : undefined}
                 isSwapping={swappingKey === key}
                 previousVolume={previousVolumeMap[ex.name]}
               />
            );
          })
        ) : (
          <p className="text-sm text-gray-500 italic py-2">Chưa có bài tập nào.</p>
        )}
      </div>

      {/* Add Exercise Button */}
      {!isCompleted && showAiAdd && sectionKey && (
        <button
          onClick={() => handleAutoAddExercise(sectionKey)}
          disabled={generatingSection !== null}
          className="w-full mt-2 py-3 border border-dashed border-white/20 rounded-xl flex items-center justify-center gap-2 text-cyan-400 hover:text-cyan-300 hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generatingSection === sectionKey ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs font-bold uppercase tracking-wider">Đang tìm bài tập phù hợp...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold uppercase tracking-wider">AI Đề Xuất Bài Tập Mới</span>
            </>
          )}
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in relative">
      <RestTimer
        isOpen={isTimerOpen}
        onClose={() => setIsTimerOpen(false)}
        defaultDuration={timerDuration}
      />



      {/* Top Header Removed - Using App Global Header */}


      {/* TIME OPTIMIZATION CARD REMOVED */}


      <div className="max-w-4xl mx-auto space-y-6">
        <GlassCard
          title={`Bài Tập: ${currentWorkout.levelName}`}
          icon={<Flame className="w-6 h-6" />}
          className="transition-all duration-300"
        >
          <p className="text-sm text-gray-400 mb-4 italic border-l-2 border-cyan-500 pl-3">
            {currentWorkout.description}
          </p>

          {/* Muscle Group Allocation Visualization */}
          <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
            <h4 className="text-sm font-bold text-cyan-300 mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Phân bổ nhóm cơ hôm nay
            </h4>
            <HumanBodyMuscleMap
              selectedMuscles={(() => {
                // Extract all muscle groups from exercises
                const muscleSet = new Set<MuscleGroup>();
                const allExercises = [...currentWorkout.morning, ...currentWorkout.evening];

                allExercises.forEach(ex => {
                  // Map muscle group strings to MuscleGroup enum values
                  const mapMuscleString = (muscleStr: string): MuscleGroup | null => {
                    // Chest
                    if (muscleStr.includes('Chest')) return MuscleGroup.Chest;
                    // Shoulders
                    if (muscleStr.includes('Front Delts')) return MuscleGroup.FrontDelts;
                    if (muscleStr.includes('Side Delts')) return MuscleGroup.SideDelts;
                    if (muscleStr.includes('Rear Delts')) return MuscleGroup.RearDelts;
                    // Back
                    if (muscleStr.includes('Lats')) return MuscleGroup.Lats;
                    if (muscleStr.includes('Upper Back')) return MuscleGroup.UpperBack;
                    if (muscleStr.includes('Lower Back')) return MuscleGroup.LowerBack;
                    if (muscleStr.includes('Traps')) return MuscleGroup.Traps;
                    // Arms
                    if (muscleStr === 'Biceps') return MuscleGroup.Biceps;
                    if (muscleStr.includes('Triceps - Long Head')) return MuscleGroup.TricepsLong;
                    if (muscleStr.includes('Triceps - Lateral Head')) return MuscleGroup.TricepsLateral;
                    if (muscleStr.includes('Forearms')) return MuscleGroup.Forearms;
                    // Legs
                    if (muscleStr.includes('Quads')) return MuscleGroup.Quads;
                    if (muscleStr.includes('Hamstrings')) return MuscleGroup.Hamstrings;
                    if (muscleStr.includes('Glutes')) return MuscleGroup.Glutes;
                    if (muscleStr.includes('Calves')) return MuscleGroup.Calves;
                    // Core
                    if (muscleStr.includes('Abs - Upper')) return MuscleGroup.UpperAbs;
                    if (muscleStr.includes('Abs - Lower')) return MuscleGroup.LowerAbs;
                    if (muscleStr.includes('Obliques')) return MuscleGroup.Obliques;
                    return null;
                  };

                  ex.primaryMuscleGroups?.forEach(muscle => {
                    const mapped = mapMuscleString(muscle);
                    if (mapped) muscleSet.add(mapped);
                  });
                  ex.secondaryMuscleGroups?.forEach(muscle => {
                    const mapped = mapMuscleString(muscle);
                    if (mapped) muscleSet.add(mapped);
                  });
                });

                return Array.from(muscleSet);
              })()}
              muscleExercises={(() => {
                const map: Record<string, string[]> = {};
                const allExercises = [...currentWorkout.morning, ...currentWorkout.evening];
                
                const mapMuscleString = (muscleStr: string): MuscleGroup | null => {
                  if (muscleStr.includes('Chest')) return MuscleGroup.Chest;
                  if (muscleStr.includes('Front Delts')) return MuscleGroup.FrontDelts;
                  if (muscleStr.includes('Side Delts')) return MuscleGroup.SideDelts;
                  if (muscleStr.includes('Rear Delts')) return MuscleGroup.RearDelts;
                  if (muscleStr.includes('Lats')) return MuscleGroup.Lats;
                  if (muscleStr.includes('Upper Back')) return MuscleGroup.UpperBack;
                  if (muscleStr.includes('Lower Back')) return MuscleGroup.LowerBack;
                  if (muscleStr.includes('Traps')) return MuscleGroup.Traps;
                  if (muscleStr === 'Biceps') return MuscleGroup.Biceps;
                  if (muscleStr.includes('Triceps - Long Head')) return MuscleGroup.TricepsLong;
                  if (muscleStr.includes('Triceps - Lateral Head')) return MuscleGroup.TricepsLateral;
                  if (muscleStr.includes('Forearms')) return MuscleGroup.Forearms;
                  if (muscleStr.includes('Quads')) return MuscleGroup.Quads;
                  if (muscleStr.includes('Hamstrings')) return MuscleGroup.Hamstrings;
                  if (muscleStr.includes('Glutes')) return MuscleGroup.Glutes;
                  if (muscleStr.includes('Calves')) return MuscleGroup.Calves;
                  if (muscleStr.includes('Abs - Upper')) return MuscleGroup.UpperAbs;
                  if (muscleStr.includes('Abs - Lower')) return MuscleGroup.LowerAbs;
                  if (muscleStr.includes('Obliques')) return MuscleGroup.Obliques;
                  return null;
                };

                allExercises.forEach(ex => {
                  const muscles = [...(ex.primaryMuscleGroups || []), ...(ex.secondaryMuscleGroups || [])];
                  muscles.forEach(m => {
                    const mapped = mapMuscleString(m);
                    if (mapped) {
                      if (!map[mapped]) map[mapped] = [];
                      map[mapped].push(ex.name);
                    }
                  });
                });
                return map;
              })()}
              onMuscleToggle={() => { }} // Read-only, no toggle
              showLabels={true}
              interactive={false} // Not interactive in plan view
            />
            <p className="text-xs text-gray-500 text-center mt-3 italic">
              Các nhóm cơ được tập trong buổi hôm nay
            </p>
          </div>




          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-400">Tiến độ hoàn thành</span>
              <span className={`font-bold ${progressPercent === 100 ? 'text-emerald-400' : 'text-cyan-400'}`}>{progressPercent}%</span>
            </div>
            <div className="h-2 w-full bg-black/30 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${progressPercent === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-cyan-500 to-blue-500'}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Volume Tracking Summary Card */}
          {sessionTotalVolume > 0 && (
            <div className="mb-4 p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/20 animate-fade-in">
              <div className="flex items-center gap-2 mb-2">
                <Weight className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Tổng Volume Buổi Tập</span>
                {previousSessionVolume > 0 && (() => {
                  const delta = sessionTotalVolume - previousSessionVolume;
                  if (delta > 0) return (
                    <span className="ml-auto text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      ▲ +{delta.toLocaleString()} vs buổi trước
                    </span>
                  );
                  if (delta < 0) return (
                    <span className="ml-auto text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                      ▼ {delta.toLocaleString()} vs buổi trước
                    </span>
                  );
                  return null;
                })()}
              </div>
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <div className="text-xl font-black text-white">{sessionTotalVolume.toLocaleString()}</div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider">kg tổng cộng</div>
                </div>
                {currentWorkout.evening && currentWorkout.evening.length > 0 && (morningVolume > 0 || eveningVolume > 0) && (
                  <>
                    <div className="w-px h-8 bg-white/10 mx-2" />
                    <div className="text-center flex-1">
                      <div className="text-sm font-bold text-cyan-300">{morningVolume.toLocaleString()}</div>
                      <div className="text-[10px] text-gray-500">☀️ Sáng</div>
                    </div>
                    <div className="w-px h-8 bg-white/10 mx-2" />
                    <div className="text-center flex-1">
                      <div className="text-sm font-bold text-purple-300">{eveningVolume.toLocaleString()}</div>
                      <div className="text-[10px] text-gray-500">🌙 Chiều</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {warmupExercises.length > 0 && (
            renderSection("Khởi động", <Footprints className="w-4 h-4 text-emerald-300" />, warmupExercises, 'warm')
          )}

          {eveningExercises.length > 0 ? (
            <>
              {/* Render Morning Session */}
              {renderSection("Buổi sáng (Morning)", <Sun className="w-4 h-4 text-yellow-400" />, morningExercises, 'mor', 'morning', true)}

              {/* Render Evening Session */}
              {renderSection("Buổi tối (Evening)", <Moon className="w-4 h-4 text-blue-300" />, eveningExercises, 'eve', 'evening', true)}
            </>
          ) : (
            <>
              {/* Single Session Render (No Morning/Evening Header needed, or generic header) */}
              {renderSection("Bài tập trong ngày", <Dumbbell className="w-4 h-4 text-emerald-400" />, morningExercises, 'mor', 'morning', true)}
            </>
          )}

          {cooldownExercises.length > 0 && (
            renderSection("Hồi phục", <Moon className="w-4 h-4 text-cyan-300" />, cooldownExercises, 'cool')
          )}

          <div className="mt-6 pt-4 border-t border-white/10 flex flex-col gap-4">
            <div className="flex gap-2 items-center text-xs text-gray-500">
              <ExternalLink className="w-4 h-4" />
              <span>Bấm vào tên bài tập để tìm hướng dẫn trên YouTube.</span>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm text-gray-300 mb-2">
                <PenLine className="w-4 h-4" /> Ghi chú buổi tập
              </label>
              <textarea
                value={userNote}
                onChange={(e) => setUserNote(e.target.value)}
                disabled={isCompleted}
                placeholder="Who's gonna carry the boats? Ghi chú lại cảm giác..."
                className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 resize-none h-20"
              />
            </div>

            <button
              onClick={handleComplete}
              disabled={isCompleted}
              className={`
                 w-full py-4 rounded-xl font-bold text-lg transition-all shadow-lg flex items-center justify-center gap-2 relative overflow-hidden group
                 ${isCompleted
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 cursor-default'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-cyan-500/30 hover:scale-[1.02] active:scale-[0.98]'}
               `}
            >
              {/* Animation Effect on Button Hover (If not completed) */}
              {!isCompleted && (
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12" />
              )}

              {isCompleted ? (
                <>
                  <CheckCircle2 className="w-6 h-6" /> Đã Hoàn Thành
                </>
              ) : (
                <>Hoàn Thành Buổi Tập</>
              )}
            </button>
          </div>
        </GlassCard>


      </div>


      <div className="text-center pt-8 border-t border-white/5">
        <button
          onClick={() => onReset('workout')}
          className="group relative px-8 py-3 rounded-2xl bg-white/5 overflow-hidden transition-all hover:scale-105 active:scale-95"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex items-center justify-center gap-2 text-gray-400 group-hover:text-emerald-300 transition-colors">
            <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
            <span className="font-medium">Tạo Kế Hoạch Mới</span>
          </div>
        </button>
      </div>
    </div >
  );
};

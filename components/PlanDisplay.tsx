

import React, { useState, useEffect } from 'react';
import { DailyPlan, Exercise, Meal, WorkoutLevel, MuscleGroup } from '../types';
import { GlassCard } from './ui/GlassCard';
import { RestTimer } from './ui/RestTimer';
import { HumanBodyMuscleMap } from './ui/HumanBodyMuscleMap';


import { Flame, Utensils, Zap, Clock, CheckSquare, Circle, Dumbbell, ExternalLink, Timer, PenLine, CheckCircle2, UtensilsCrossed, ArrowLeft, RefreshCw, Filter, Layers, Sun, Moon, MoonStar, AlarmClock, Footprints, Droplets } from 'lucide-react';

interface PlanDisplayProps {
  plan: DailyPlan;
  onReset: () => void;
  onComplete: (levelSelected: string, summary: string, completedExercises: string[], userNotes: string, nutrition: DailyPlan['nutrition']) => void;
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
}

const ExerciseItem: React.FC<ExerciseItemProps> = ({ exercise, isChecked, onToggle, onPreview, onStartTimer }) => {
  const isWalking = exercise.name.toLowerCase().includes('đi bộ') || exercise.name.toLowerCase().includes('walking');

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

            <div className="flex gap-2">
              <ColorBadge color={exercise.colorCode} />
              {exercise.isBFR && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-pink-500 text-white shadow-lg shadow-pink-500/40">
                  BFR
                </span>
              )}
            </div>
          </div>

          {/* Muscle Groups Display */}
          {(exercise.primaryMuscleGroups || exercise.secondaryMuscleGroups) && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {exercise.primaryMuscleGroups && exercise.primaryMuscleGroups.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-[10px] text-cyan-400 font-bold">🎯</span>
                  {exercise.primaryMuscleGroups.map((muscle, idx) => (
                    <span
                      key={idx}
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                    >
                      {muscle}
                    </span>
                  ))}
                </div>
              )}
              {exercise.secondaryMuscleGroups && exercise.secondaryMuscleGroups.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-[10px] text-gray-400 font-bold">💪</span>
                  {exercise.secondaryMuscleGroups.map((muscle, idx) => (
                    <span
                      key={idx}
                      className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-500/10 text-gray-400 border border-gray-500/20"
                    >
                      {muscle}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

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

          {exercise.notes && (
            <p
              onClick={onToggle}
              className={`text-xs italic bg-red-900/20 p-2 rounded-lg border border-red-500/20 mt-2 cursor-pointer font-bold ${isChecked ? 'text-emerald-200/50' : 'text-red-300/80'}`}
            >
              🔥 "{exercise.notes}"
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const MealItem: React.FC<{ meal: Meal }> = ({ meal }) => (
  <div className="group relative overflow-hidden bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-2xl p-4 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10 cursor-pointer">
    <div className="absolute -bottom-4 -right-4 p-4 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
      <UtensilsCrossed className="w-24 h-24 text-white" />
    </div>

    <div className="relative z-10 flex gap-4">
      <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-xl flex items-center justify-center border border-white/10 group-hover:border-emerald-500/30 transition-colors">
        <UtensilsCrossed className="w-6 h-6 text-emerald-300" />
      </div>

      <div className="flex-1">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2">
          <h4 className="font-bold text-lg text-white group-hover:text-emerald-300 transition-colors">{meal.name}</h4>

          <div className="flex flex-wrap gap-2 text-xs font-bold mt-1 sm:mt-0">
            <span className="px-2 py-1 bg-black/30 rounded text-cyan-300 border border-white/5">{meal.calories} Kcal</span>
            <span className="px-2 py-1 bg-black/30 rounded text-emerald-300 border border-white/5">{meal.protein}g Pro</span>
            {/* Price removed as per user request */}
          </div>
        </div>

        <p className="text-sm text-gray-400 leading-relaxed border-t border-white/5 pt-2">
          {meal.description}
        </p>
      </div>
    </div>
  </div>
);

type FilterType = 'All' | 'Board' | 'Dumbbell' | 'Band' | 'Bodyweight' | 'Red' | 'Blue' | 'Yellow' | 'Green' | 'Pink' | 'Purple' | 'Orange';

export const PlanDisplay: React.FC<PlanDisplayProps> = ({ plan, onReset, onComplete }) => {
  const [isCompleted, setIsCompleted] = useState(false);
  const [userNote, setUserNote] = useState('');
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const [timerDuration, setTimerDuration] = useState(120); // Default rest
  const [checkedState, setCheckedState] = useState<Record<string, boolean>>({});
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  const [manualCostConfig, setManualCostConfig] = useState<string>(''); // User enters string "50.000"


  const currentWorkout: WorkoutLevel = plan.workout.detail;

  // Combine all exercises to calculate progress
  const allExercises = [...currentWorkout.morning, ...currentWorkout.evening];
  const totalExercises = allExercises.length;

  // Calculate checked based on composite keys "mor-X" and "eve-X"
  const checkedCount = Object.values(checkedState).filter(Boolean).length;
  const progressPercent = totalExercises > 0 ? Math.round((checkedCount / totalExercises) * 100) : 0;

  // Restore progress from local storage on mount
  useEffect(() => {
    const savedProgressStr = localStorage.getItem('workout_progress');
    if (savedProgressStr) {
      try {
        const savedProgress = JSON.parse(savedProgressStr);
        // Only restore if the saved progress matches the current plan's date
        if (savedProgress.planDate === plan.date) {
          setCheckedState(savedProgress.checkedState || {});
          setUserNote(savedProgress.userNote || '');
        }
      } catch (e) {
        console.error("Failed to restore progress", e);
      }
    }
  }, [plan.date]);

  // Save progress to local storage whenever it changes
  useEffect(() => {
    if (!isCompleted) { // Don't save if already marked completed
      const progressData = {
        planDate: plan.date,
        checkedState,
        userNote,
        lastUpdated: Date.now()
      };
      localStorage.setItem('workout_progress', JSON.stringify(progressData));
    }
  }, [checkedState, userNote, plan.date, isCompleted]);

  const handleToggle = (key: string) => {
    setCheckedState(prev => ({ ...prev, [key]: !prev[key] }));
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

    const completedMorning = currentWorkout.morning
      .filter((_, idx) => checkedState[`mor-${idx}`])
      .map(ex => ex.name);

    const completedEvening = currentWorkout.evening
      .filter((_, idx) => checkedState[`eve-${idx}`])
      .map(ex => ex.name);

    const completedExercisesList = [...completedMorning, ...completedEvening];

    // Clear the progress cache since we are finishing it
    localStorage.removeItem('workout_progress');

    const finalNutrition = {
      ...plan.nutrition,
      totalCost: parseInt(manualCostConfig.replace(/\./g, '') || '0')
    };

    onComplete(
      currentWorkout.levelName,
      plan.workout.summary,
      completedExercisesList,
      userNote,
      finalNutrition
    );
  };

  // Filter Logic Helper
  const filterExercise = (ex: Exercise) => {
    if (activeFilter === 'All') return true;
    if (['Red', 'Blue', 'Yellow', 'Green', 'Pink', 'Purple', 'Orange'].includes(activeFilter)) return ex.colorCode === activeFilter;
    if (activeFilter === 'Board') return !!ex.colorCode || ex.equipment?.toLowerCase().includes('board');
    if (activeFilter === 'Dumbbell') return ex.equipment?.toLowerCase().includes('tạ') || ex.equipment?.toLowerCase().includes('dumbbell');
    if (activeFilter === 'Band') return ex.equipment?.toLowerCase().includes('dây') || ex.equipment?.toLowerCase().includes('band') || ex.isBFR;
    if (activeFilter === 'Bodyweight') {
      const eq = ex.equipment?.toLowerCase();
      return !eq || eq.includes('không') || eq.includes('bodyweight') || eq === 'none';
    }
    return true;
  };

  const filteredMorning = currentWorkout.morning.filter(filterExercise);
  const filteredEvening = currentWorkout.evening.filter(filterExercise);

  const filterOptions: { id: FilterType; label: string; color: string }[] = [
    { id: 'All', label: 'Tất cả', color: 'bg-white/10 text-white' },
    { id: 'Board', label: 'Board (Chống đẩy)', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
    { id: 'Dumbbell', label: 'Tạ đơn', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
    { id: 'Band', label: 'Dây/BFR', color: 'bg-pink-500/20 text-pink-300 border-pink-500/30' },
    { id: 'Bodyweight', label: 'Bodyweight', color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
    { id: 'Red', label: 'Vai', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
    { id: 'Blue', label: 'Ngực', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    { id: 'Yellow', label: 'Lưng', color: 'bg-yellow-400/20 text-yellow-300 border-yellow-400/30' },
    { id: 'Green', label: 'Tay sau', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    { id: 'Pink', label: 'Tay trước', color: 'bg-pink-500/20 text-pink-300 border-pink-500/30' },
    { id: 'Purple', label: 'Chân', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
    { id: 'Orange', label: 'Bụng/Tim mạch', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  ];

  const renderSection = (title: string, icon: React.ReactNode, exercises: Exercise[], prefix: string, filtered: Exercise[]) => (
    <div className="mb-6 last:mb-0">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10 text-cyan-200">
        {icon}
        <h4 className="font-bold uppercase tracking-wider text-sm">{title}</h4>
        <span className="text-xs text-gray-500 ml-auto">({filtered.length} bài)</span>
      </div>

      <div className="space-y-1">
        {filtered.length > 0 ? (
          filtered.map((ex) => {
            // Find original index in the unfiltered array to maintain state consistency
            const originalIndex = exercises.indexOf(ex);
            const key = `${prefix}-${originalIndex}`;
            return (
              <ExerciseItem
                key={key}
                exercise={ex}
                isChecked={!!checkedState[key]}
                onToggle={() => handleToggle(key)}
                onPreview={() => handleOpenYouTube(ex.name)}
                onStartTimer={() => handleStartTimer(ex.name)}
              />
            );
          })
        ) : (
          <p className="text-sm text-gray-500 italic py-2">Không có bài tập nào phù hợp với bộ lọc.</p>
        )}
      </div>
    </div>
  );

  return (
    // Added pt-28 (top padding) to accommodate the sticky top RestTimer
    <div className="space-y-6 animate-fade-in relative pt-28">
      <RestTimer
        isOpen={isTimerOpen}
        onClose={() => setIsTimerOpen(false)}
        defaultDuration={timerDuration}
      />

      {/* Top Header with Back Button */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={onReset}
          className="p-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-white/70 hover:text-white cursor-pointer"
          title="Quay lại màn hình tạo lịch"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="inline-block px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-cyan-400">
          {plan.date}
        </div>
        <div className="w-12"></div> {/* Spacer for balance */}
      </div>

      <div className="text-center space-y-2 mb-6">
        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-300">
          Kế Hoạch Tập Luyện
        </h2>
        <p className="text-gray-400 text-sm max-w-md mx-auto">
          {plan.workout.summary}
        </p>
      </div>

      {/* TIME OPTIMIZATION CARD */}
      {plan.schedule && (
        <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-lg mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/20 rounded-full text-blue-300">
              <AlarmClock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-blue-200 uppercase tracking-wider">Thời gian tối ưu (Tránh 12-14h)</h4>
              <div className="flex gap-4 mt-1">
                <div className="flex items-center gap-1.5 bg-black/30 px-3 py-1 rounded-lg border border-white/5">
                  <Sun className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="text-white text-sm font-mono">{plan.schedule.suggestedWorkoutTime}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-black/30 px-3 py-1 rounded-lg border border-white/5">
                  <MoonStar className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-white text-sm font-mono">{plan.schedule.suggestedSleepTime}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="text-xs text-gray-400 italic text-center sm:text-right max-w-xs">
            "{plan.schedule.reasoning}"
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                    if (muscleStr.includes('Chest - Upper')) return MuscleGroup.ChestUpper;
                    if (muscleStr.includes('Chest - Middle')) return MuscleGroup.ChestMiddle;
                    if (muscleStr.includes('Chest - Lower')) return MuscleGroup.ChestLower;
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
              onMuscleToggle={() => { }} // Read-only, no toggle
              showLabels={true}
              interactive={false} // Not interactive in plan view
            />
            <p className="text-xs text-gray-500 text-center mt-3 italic">
              Các nhóm cơ được tập trong buổi hôm nay
            </p>
          </div>


          {/* Filter Bar */}
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10">
            <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
            {filterOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setActiveFilter(opt.id)}
                className={`
                    flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors duration-200 cursor-pointer
                    ${activeFilter === opt.id
                    ? `${opt.color} border-current shadow-[0_0_10px_rgba(255,255,255,0.1)]`
                    : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10 hover:text-gray-300'}
                  `}
              >
                {opt.label}
              </button>
            ))}
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

          {/* Render Morning Session */}
          {renderSection("Buổi Sáng (Morning)", <Sun className="w-4 h-4 text-yellow-400" />, currentWorkout.morning, 'mor', filteredMorning)}

          {/* Render Evening Session */}
          {renderSection("Buổi Tối (Evening)", <Moon className="w-4 h-4 text-blue-300" />, currentWorkout.evening, 'eve', filteredEvening)}

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

        <GlassCard title="Thực Đơn Tăng Cân (Bulking)" icon={<Utensils className="w-6 h-6" />}>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-6">
            <div className="bg-black/20 rounded-xl p-3 text-center border border-white/5">
              <p className="text-gray-400 text-[10px] uppercase tracking-widest mb-1">Calories</p>
              <p className="text-xl font-bold text-cyan-300">{plan.nutrition.totalCalories}</p>
            </div>
            <div className="bg-black/20 rounded-xl p-3 text-center border border-white/5">
              <p className="text-gray-400 text-[10px] uppercase tracking-widest mb-1">Protein</p>
              <p className="text-xl font-bold text-emerald-300">{plan.nutrition.totalProtein}g</p>
            </div>
            {/* New Macro Cards */}
            <div className="bg-orange-500/10 rounded-xl p-3 text-center border border-orange-500/20">
              <p className="text-orange-200/70 text-[10px] uppercase tracking-widest mb-1">Carbs</p>
              <p className="text-xl font-bold text-orange-300">{plan.nutrition.totalCarbs || 0}g</p>
            </div>
            <div className="bg-yellow-500/10 rounded-xl p-3 text-center border border-yellow-500/20">
              <p className="text-yellow-200/70 text-[10px] uppercase tracking-widest mb-1">Fat</p>
              <p className="text-xl font-bold text-yellow-300">{plan.nutrition.totalFat || 0}g</p>
            </div>
            {/* Price Card */}
            <div className="bg-yellow-500/10 rounded-xl p-3 text-center border border-yellow-500/20 relative group">
              <p className="text-yellow-200/70 text-[10px] uppercase tracking-widest mb-1">Tổng tiền (Tự ghi)</p>
              <div className="flex items-center justify-center gap-1">
                <input
                  type="text"
                  value={manualCostConfig}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\./g, '').replace(/\D/g, '');
                    setManualCostConfig(formatCurrencyInput(val));
                  }}
                  placeholder="Nhập giá..."
                  className="w-full bg-transparent text-center font-bold text-yellow-300 focus:outline-none placeholder-yellow-500/30"
                />
                <span className="text-xs text-yellow-500">đ</span>
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-400 italic mb-4 text-center">
            *Thực đơn ưu tiên sử dụng nguyên liệu có sẵn trong tủ lạnh của bạn.
          </div>

          <div className="space-y-4">
            {plan.nutrition.meals.map((meal, index) => (
              <MealItem key={index} meal={meal} />
            ))}
          </div>
        </GlassCard>
      </div>

      <div className="text-center pt-8 pb-4">
        <button
          onClick={onReset}
          className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Tạo Kế Hoạch Mới
        </button>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { DailyPlan, Exercise, Meal, WorkoutLevel } from '../types';
import { GlassCard } from './ui/GlassCard';
import { RestTimer } from './ui/RestTimer';
import { Flame, Utensils, Zap, Clock, CheckSquare, Circle, Dumbbell, ExternalLink, Timer, PenLine, CheckCircle2, UtensilsCrossed, ArrowLeft, RefreshCw, Filter, Layers } from 'lucide-react';

interface PlanDisplayProps {
  plan: DailyPlan;
  onReset: () => void;
  onComplete: (levelSelected: string, summary: string, completedExercises: string[], userNotes: string, nutrition: DailyPlan['nutrition']) => void;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

const ColorBadge: React.FC<{ color?: string }> = ({ color }) => {
  if (!color) return null;
  const colors: Record<string, string> = {
    Red: 'bg-red-500 shadow-red-500/50',
    Blue: 'bg-blue-500 shadow-blue-500/50',
    Yellow: 'bg-yellow-400 shadow-yellow-400/50',
    Green: 'bg-green-500 shadow-green-500/50',
  };
  const translations: Record<string, string> = {
    Red: 'Vai',
    Blue: 'Ngực',
    Yellow: 'Lưng',
    Green: 'Tay sau'
  };

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-black uppercase tracking-wider shadow-lg ${colors[color] || 'bg-gray-500'}`}>
      {color} ({translations[color]})
    </span>
  );
};

interface ExerciseItemProps {
  exercise: Exercise;
  index: number;
  isChecked: boolean;
  onToggle: () => void;
  onPreview: () => void;
  onStartTimer: () => void;
}

const ExerciseItem: React.FC<ExerciseItemProps> = ({ exercise, index, isChecked, onToggle, onPreview, onStartTimer }) => (
  <div 
    className={`
      group relative pl-4 py-3 border-l-2 transition-all duration-300
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
        
        <div className="flex items-center justify-between">
          <div 
            onClick={onToggle}
            className="cursor-pointer"
          >
            <div className={`flex items-center gap-4 text-sm mb-2 ${isChecked ? 'opacity-50' : 'text-gray-300'}`}>
              <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-yellow-400" /> {exercise.sets} Sets</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-emerald-400" /> {exercise.reps} Reps</span>
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
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-cyan-300 font-bold transition-all active:scale-95 hover:border-cyan-500/30"
          >
            <Timer className="w-3.5 h-3.5" />
            Nghỉ
          </button>
        </div>
          
        {exercise.notes && (
          <p 
            onClick={onToggle}
            className={`text-xs italic bg-black/20 p-2 rounded-lg border border-white/5 mt-2 cursor-pointer ${isChecked ? 'text-emerald-200/50' : 'text-gray-400'}`}
          >
            💡 {exercise.notes}
          </p>
        )}
      </div>
    </div>
  </div>
);

const MealItem: React.FC<{ meal: Meal }> = ({ meal }) => (
  <div className="group relative overflow-hidden bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-4 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-1">
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
             <span className="px-2 py-1 bg-yellow-500/20 rounded text-yellow-300 border border-yellow-500/30">~{formatCurrency(meal.estimatedPrice)}</span>
          </div>
        </div>
        
        <p className="text-sm text-gray-400 leading-relaxed border-t border-white/5 pt-2">
          {meal.description}
        </p>
      </div>
    </div>
  </div>
);

type FilterType = 'All' | 'Red' | 'Blue' | 'Yellow' | 'Green' | 'Dumbbell' | 'Band';

export const PlanDisplay: React.FC<PlanDisplayProps> = ({ plan, onReset, onComplete }) => {
  const [isCompleted, setIsCompleted] = useState(false);
  const [userNote, setUserNote] = useState('');
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const [checkedState, setCheckedState] = useState<Record<string, boolean>>({});
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');

  const currentWorkout: WorkoutLevel = plan.workout.detail;
  const totalExercises = currentWorkout.exercises.length;
  
  const checkedCount = currentWorkout.exercises.filter((_, idx) => checkedState[`ex-${idx}`]).length;
  const progressPercent = Math.round((checkedCount / totalExercises) * 100);

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

  const handleToggle = (index: number) => {
    const key = `ex-${index}`;
    setCheckedState(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleOpenYouTube = (exerciseName: string) => {
    const query = encodeURIComponent(`${exerciseName} exercise tutorial form`);
    
    // Device Detection
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isMobile = /android|ipad|iphone|ipod/i.test(userAgent);

    if (isMobile) {
      // Mobile: Open m.youtube.com in new tab
      window.open(`https://m.youtube.com/results?search_query=${query}`, '_blank');
    } else {
      // Desktop: Open www.youtube.com in new tab
      window.open(`https://www.youtube.com/results?search_query=${query}`, '_blank');
    }
  };

  const handleComplete = () => {
    setIsCompleted(true);
    const completedExercisesList = currentWorkout.exercises
      .filter((_, idx) => checkedState[`ex-${idx}`])
      .map(ex => ex.name);

    // Clear the progress cache since we are finishing it
    localStorage.removeItem('workout_progress');

    onComplete(
      currentWorkout.levelName, 
      plan.workout.summary, 
      completedExercisesList, 
      userNote,
      plan.nutrition
    );
  };

  // Filter Logic
  const filteredExercises = currentWorkout.exercises.filter(ex => {
    if (activeFilter === 'All') return true;
    
    // Color/Muscle Filtering
    if (['Red', 'Blue', 'Yellow', 'Green'].includes(activeFilter)) {
      return ex.colorCode === activeFilter;
    }
    
    // Equipment Filtering
    if (activeFilter === 'Dumbbell') {
      return ex.equipment?.toLowerCase().includes('tạ') || ex.equipment?.toLowerCase().includes('dumbbell');
    }
    
    if (activeFilter === 'Band') {
      return ex.equipment?.toLowerCase().includes('dây') || ex.equipment?.toLowerCase().includes('band') || ex.isBFR;
    }

    return true;
  });

  const filterOptions: { id: FilterType; label: string; color: string }[] = [
    { id: 'All', label: 'Tất cả', color: 'bg-white/10 text-white' },
    { id: 'Red', label: 'Vai (Red)', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
    { id: 'Blue', label: 'Ngực (Blue)', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    { id: 'Yellow', label: 'Lưng (Yellow)', color: 'bg-yellow-400/20 text-yellow-300 border-yellow-400/30' },
    { id: 'Green', label: 'Tay sau (Green)', color: 'bg-green-500/20 text-green-300 border-green-500/30' },
    { id: 'Dumbbell', label: 'Tạ đơn', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
    { id: 'Band', label: 'Dây/BFR', color: 'bg-pink-500/20 text-pink-300 border-pink-500/30' },
  ];

  return (
    <div className="space-y-6 animate-fade-in relative">
      <RestTimer 
        isOpen={isTimerOpen} 
        onClose={() => setIsTimerOpen(false)} 
        defaultDuration={60}
      />
      
      {/* Top Header with Back Button */}
      <div className="flex items-center justify-between mb-2">
        <button 
          onClick={onReset}
          className="p-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-white/70 hover:text-white"
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard 
          title={`Bài Tập: ${currentWorkout.levelName}`} 
          icon={<Flame className="w-6 h-6" />}
          className="transition-all duration-300"
        >
           <p className="text-sm text-gray-400 mb-4 italic border-l-2 border-cyan-500 pl-3">
             {currentWorkout.description}
           </p>

           {/* Filter Bar */}
           <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10">
              <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
              {filterOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setActiveFilter(opt.id)}
                  className={`
                    flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all
                    ${activeFilter === opt.id 
                      ? `${opt.color} border-current shadow-[0_0_10px_rgba(255,255,255,0.1)]` 
                      : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10'}
                  `}
                >
                  {opt.label}
                </button>
              ))}
           </div>

           <div className="mb-4">
              <div className="flex justify-between text-xs mb-1">
                 <span className="text-gray-400">Tiến độ (Tổng thể)</span>
                 <span className={`font-bold ${progressPercent === 100 ? 'text-emerald-400' : 'text-cyan-400'}`}>{progressPercent}%</span>
              </div>
              <div className="h-2 w-full bg-black/30 rounded-full overflow-hidden">
                 <div 
                   className={`h-full transition-all duration-500 ${progressPercent === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-cyan-500 to-blue-500'}`} 
                   style={{ width: `${progressPercent}%` }}
                 />
              </div>
           </div>

           <div className="space-y-2 mt-2">
             {filteredExercises.length > 0 ? (
               filteredExercises.map((ex) => {
                 // Find original index to maintain consistent state keys
                 const originalIndex = currentWorkout.exercises.indexOf(ex);
                 return (
                   <ExerciseItem 
                     key={`ex-${originalIndex}`} 
                     exercise={ex} 
                     index={originalIndex} 
                     isChecked={!!checkedState[`ex-${originalIndex}`]}
                     onToggle={() => handleToggle(originalIndex)}
                     onPreview={() => handleOpenYouTube(ex.name)}
                     onStartTimer={() => setIsTimerOpen(true)}
                   />
                 );
               })
             ) : (
               <div className="text-center py-8 text-gray-500 flex flex-col items-center gap-2">
                  <Layers className="w-8 h-8 opacity-50" />
                  <p className="text-sm">Không có bài tập nào thuộc nhóm này.</p>
               </div>
             )}
           </div>

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
                  placeholder="Ví dụ: Đẩy ngực hơi mỏi vai trái, tăng tạ 10kg ok..."
                  className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 resize-none h-20"
                />
             </div>
             
             <button 
               onClick={handleComplete}
               disabled={isCompleted}
               className={`
                 w-full py-4 rounded-xl font-bold text-lg transition-all shadow-lg flex items-center justify-center gap-2
                 ${isCompleted 
                   ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 cursor-default' 
                   : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-cyan-500/30 hover:scale-[1.02] active:scale-[0.98]'}
               `}
             >
               {isCompleted ? (
                 <>
                   <CheckCircle2 className="w-6 h-6" /> Đã Hoàn Thành
                 </>
               ) : (
                 "Hoàn Thành Buổi Tập"
               )}
             </button>
           </div>
        </GlassCard>

        <GlassCard title="Thực Đơn Sinh Viên (<80k)" icon={<Utensils className="w-6 h-6" />}>
          <div className="grid grid-cols-3 gap-2 mb-6">
            <div className="bg-black/20 rounded-xl p-3 text-center border border-white/5">
              <p className="text-gray-400 text-[10px] uppercase tracking-widest mb-1">Calories</p>
              <p className="text-xl font-bold text-cyan-300">{plan.nutrition.totalCalories}</p>
            </div>
            <div className="bg-black/20 rounded-xl p-3 text-center border border-white/5">
              <p className="text-gray-400 text-[10px] uppercase tracking-widest mb-1">Protein</p>
              <p className="text-xl font-bold text-emerald-300">{plan.nutrition.totalProtein}g</p>
            </div>
            <div className="bg-yellow-500/10 rounded-xl p-3 text-center border border-yellow-500/20">
              <p className="text-yellow-200/70 text-[10px] uppercase tracking-widest mb-1">Tổng tiền</p>
              <p className="text-sm font-bold text-yellow-300">{formatCurrency(plan.nutrition.totalCost)}</p>
            </div>
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
          className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all flex items-center justify-center gap-2 mx-auto"
        >
          <RefreshCw className="w-4 h-4" />
          Tạo Kế Hoạch Mới
        </button>
      </div>
    </div>
  );
};

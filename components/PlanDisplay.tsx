import React, { useState, useEffect } from 'react';
import { DailyPlan, Exercise, Meal, WorkoutLevel } from '../types';
import { GlassCard } from './ui/GlassCard';
import { Flame, Utensils, Zap, Clock, AlertCircle, CheckCircle2, Dumbbell, Battery, BatteryCharging, BatteryFull, Circle, CheckSquare, PenLine } from 'lucide-react';

interface PlanDisplayProps {
  plan: DailyPlan;
  onReset: () => void;
  onComplete: (levelSelected: string, summary: string, completedExercises: string[], userNotes: string) => void;
}

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
}

const ExerciseItem: React.FC<ExerciseItemProps> = ({ exercise, index, isChecked, onToggle }) => (
  <div 
    onClick={onToggle}
    className={`
      group relative pl-4 py-3 border-l-2 cursor-pointer transition-all duration-300
      ${isChecked ? 'border-emerald-500 bg-emerald-500/5' : 'border-white/10 hover:bg-white/5'}
    `}
  >
    <div className="flex items-start gap-4">
      {/* Checkbox UI */}
      <div className={`mt-1 transition-colors ${isChecked ? 'text-emerald-400' : 'text-gray-600 group-hover:text-cyan-400'}`}>
         {isChecked ? <CheckSquare className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
      </div>

      <div className="flex-1">
        <div className="flex justify-between items-start mb-1">
          <h4 className={`font-bold text-lg transition-all ${isChecked ? 'text-emerald-400 line-through decoration-2 opacity-70' : 'text-white group-hover:text-cyan-300'}`}>
            {exercise.name}
          </h4>
          <div className="flex gap-2">
            <ColorBadge color={exercise.colorCode} />
            {exercise.isBFR && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-pink-500 text-white shadow-lg shadow-pink-500/40">
                BFR
              </span>
            )}
          </div>
        </div>
        
        <div className={`flex items-center gap-4 text-sm mb-2 ${isChecked ? 'opacity-50' : 'text-gray-300'}`}>
          <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-yellow-400" /> {exercise.sets} Sets</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-emerald-400" /> {exercise.reps} Reps</span>
        </div>
        
        {exercise.equipment && (
          <div className={`text-xs mb-1 flex items-center gap-1 ${isChecked ? 'opacity-50' : 'text-gray-400'}`}>
            <Dumbbell className="w-3 h-3" /> {exercise.equipment}
          </div>
        )}
        
        {exercise.notes && (
          <p className={`text-xs italic bg-black/20 p-2 rounded-lg border border-white/5 ${isChecked ? 'text-emerald-200/50' : 'text-gray-400'}`}>
            💡 {exercise.notes}
          </p>
        )}
      </div>
    </div>
  </div>
);

const MealItem: React.FC<{ meal: Meal }> = ({ meal }) => (
  <div className="bg-white/5 rounded-xl p-4 border border-white/5 hover:bg-white/10 transition-colors">
    <div className="flex justify-between items-center mb-2">
      <h4 className="font-bold text-emerald-300">{meal.name}</h4>
      <div className="text-xs font-mono text-gray-400">
        {meal.calories} kcal | {meal.protein}g Pro
      </div>
    </div>
    <p className="text-sm text-gray-300 leading-relaxed">
      {meal.description}
    </p>
  </div>
);

export const PlanDisplay: React.FC<PlanDisplayProps> = ({ plan, onReset, onComplete }) => {
  const [selectedLevel, setSelectedLevel] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [isCompleted, setIsCompleted] = useState(false);
  const [userNote, setUserNote] = useState('');
  
  // Store checked state as: "easy-0": true, "medium-2": false
  const [checkedState, setCheckedState] = useState<Record<string, boolean>>({});

  const currentWorkout: WorkoutLevel = plan.workout.levels[selectedLevel];
  const totalExercises = currentWorkout.exercises.length;
  
  // Calculate progress for current level
  const checkedCount = currentWorkout.exercises.filter((_, idx) => checkedState[`${selectedLevel}-${idx}`]).length;
  const progressPercent = Math.round((checkedCount / totalExercises) * 100);

  const handleToggle = (index: number) => {
    const key = `${selectedLevel}-${index}`;
    setCheckedState(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleComplete = () => {
    setIsCompleted(true);
    
    // Filter exercises that are checked for the current level
    const completedExercisesList = currentWorkout.exercises
      .filter((_, idx) => checkedState[`${selectedLevel}-${idx}`])
      .map(ex => ex.name);

    onComplete(currentWorkout.levelName, plan.workout.summary, completedExercisesList, userNote);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Summary */}
      <div className="text-center space-y-2 mb-4">
         <div className="inline-block px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-cyan-400 mb-2">
            {plan.date}
         </div>
        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-300">
          Kế Hoạch Tập Luyện
        </h2>
        <p className="text-gray-400 text-sm max-w-md mx-auto">
          {plan.workout.summary}
        </p>
      </div>

      {/* Difficulty Selector Tabs */}
      <div className="flex p-1 bg-black/30 rounded-2xl border border-white/5 backdrop-blur-md">
        <button 
          onClick={() => setSelectedLevel('easy')}
          className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${selectedLevel === 'easy' ? 'bg-emerald-500/20 text-emerald-400 shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <Battery className="w-4 h-4" /> Nhẹ nhàng
        </button>
        <button 
          onClick={() => setSelectedLevel('medium')}
          className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${selectedLevel === 'medium' ? 'bg-blue-500/20 text-blue-400 shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <BatteryCharging className="w-4 h-4" /> Vừa sức
        </button>
        <button 
          onClick={() => setSelectedLevel('hard')}
          className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${selectedLevel === 'hard' ? 'bg-red-500/20 text-red-400 shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <BatteryFull className="w-4 h-4" /> Thử thách
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workout Column */}
        <GlassCard 
          title={`Bài Tập: ${currentWorkout.levelName}`} 
          icon={<Flame className="w-6 h-6" />}
          className="transition-all duration-300"
        >
           <p className="text-sm text-gray-400 mb-4 italic border-l-2 border-cyan-500 pl-3">
             {currentWorkout.description}
           </p>

           {/* Progress Bar */}
           <div className="mb-4">
              <div className="flex justify-between text-xs mb-1">
                 <span className="text-gray-400">Tiến độ</span>
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
             {currentWorkout.exercises.map((ex, idx) => (
               <ExerciseItem 
                 key={`${selectedLevel}-${idx}`} 
                 exercise={ex} 
                 index={idx} 
                 isChecked={!!checkedState[`${selectedLevel}-${idx}`]}
                 onToggle={() => handleToggle(idx)}
               />
             ))}
           </div>

           <div className="mt-6 pt-4 border-t border-white/10 flex flex-col gap-4">
             <div className="flex gap-2 items-center text-xs text-gray-500">
                <AlertCircle className="w-4 h-4" />
                <span>Nghỉ giữa hiệp 60-90s. Uống đủ nước.</span>
             </div>

             {/* Notes Section */}
             <div>
                <label className="flex items-center gap-2 text-sm text-gray-300 mb-2">
                  <PenLine className="w-4 h-4" /> Ghi chú buổi tập (Cảm nhận, tạ, đau mỏi...)
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
                 w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all
                 ${isCompleted 
                    ? 'bg-green-500/20 text-green-400 cursor-default' 
                    : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg'}
               `}
             >
               {isCompleted ? (
                 <> <CheckCircle2 className="w-5 h-5" /> Đã lưu lịch sử tập! </>
               ) : (
                 <> <CheckCircle2 className="w-5 h-5" /> Hoàn thành bài tập này </>
               )}
             </button>
           </div>
        </GlassCard>

        {/* Nutrition Column */}
        <GlassCard title="Dinh Dưỡng (Nutrition)" icon={<Utensils className="w-6 h-6" />}>
          <div className="flex justify-between items-center mb-6 bg-black/20 p-4 rounded-xl">
             <div className="text-center">
               <div className="text-2xl font-bold text-white">{plan.nutrition.totalCalories}</div>
               <div className="text-xs text-gray-400 uppercase">Kcal</div>
             </div>
             <div className="h-8 w-px bg-white/10"></div>
             <div className="text-center">
               <div className="text-2xl font-bold text-emerald-400">{plan.nutrition.totalProtein}g</div>
               <div className="text-xs text-gray-400 uppercase">Protein</div>
             </div>
          </div>
          
          <div className="space-y-3">
            {plan.nutrition.meals.map((meal, idx) => (
              <MealItem key={idx} meal={meal} />
            ))}
          </div>

          <div className="mt-6 text-xs text-gray-400 bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20">
            🍔 <strong>Tip:</strong> {plan.nutrition.advice}
          </div>
        </GlassCard>
      </div>

      <div className="flex justify-center mt-8">
        <button 
          onClick={onReset}
          className="px-8 py-3 rounded-full border border-white/20 hover:bg-white/10 text-gray-300 transition-all text-sm font-medium"
        >
          Thiết lập lại (Trang chủ)
        </button>
      </div>
    </div>
  );
};
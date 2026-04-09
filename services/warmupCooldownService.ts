import { DailyPlan, Exercise, Intensity, UserInput } from '../types';

const makeWarmup = (userData: UserInput): Exercise[] => {
  const isGym = userData.trainingMode === 'gym';
  const isHard = userData.selectedIntensity === Intensity.Hard;

  const base: Exercise[] = [
    {
      name: 'Brisk Walk / Light Cardio',
      sets: 1,
      reps: isHard ? '8 mins' : '6 mins',
      notes: 'Tăng nhiệt cơ thể trước buổi tập.',
      equipment: 'None',
      colorCode: 'Orange',
    },
    {
      name: 'Dynamic Mobility Flow',
      sets: 1,
      reps: '5 mins',
      notes: 'Xoay khớp vai, hông, cổ chân.',
      equipment: 'None',
      colorCode: 'Green',
    },
  ];

  if (isGym) {
    base.push({
      name: 'Ramp-Up Set (Main Lift)',
      sets: 2,
      reps: '8-10',
      notes: '2 set khởi động với tạ nhẹ cho bài chính.',
      equipment: 'Barbell/Dumbbell',
      colorCode: 'Blue',
    });
  }

  return base;
};

const makeCooldown = (): Exercise[] => {
  return [
    {
      name: 'Slow Walk + Breathing',
      sets: 1,
      reps: '3-5 mins',
      notes: 'Hạ nhịp tim từ từ, thở sâu bằng mũi.',
      equipment: 'None',
      colorCode: 'Green',
    },
    {
      name: 'Static Stretching',
      sets: 1,
      reps: '6 mins',
      notes: 'Tập trung nhóm cơ vừa tập chính.',
      equipment: 'None',
      colorCode: 'Purple',
    },
  ];
};

export const enrichWorkoutWithWarmupCooldown = (plan: DailyPlan, userData: UserInput): DailyPlan => {
  if (!plan?.workout?.detail) return plan;

  const detail = plan.workout.detail;

  return {
    ...plan,
    workout: {
      ...plan.workout,
      detail: {
        ...detail,
        warmup: detail.warmup && detail.warmup.length > 0 ? detail.warmup : makeWarmup(userData),
        morning: detail.morning || [],
        evening: detail.evening || [],
        cooldown: detail.cooldown && detail.cooldown.length > 0 ? detail.cooldown : makeCooldown(),
      },
    },
  };
};

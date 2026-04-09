import { DailyPlan, Exercise, Intensity, UserInput } from '../types';

const makeWarmup = (userData: UserInput): Exercise[] => {
  const isGym = userData.trainingMode === 'gym';
  const isHard = userData.selectedIntensity === Intensity.Hard;

  const base: Exercise[] = [
    {
      name: 'Brisk Walk / Light Cardio',
      sets: 1,
      reps: isHard ? '8 mins' : '6 mins',
      notes: 'Tang nhiet co the truoc buoi tap.',
      equipment: 'None',
      colorCode: 'Orange',
    },
    {
      name: 'Dynamic Mobility Flow',
      sets: 1,
      reps: '5 mins',
      notes: 'Xoay khop vai, hong, co chan.',
      equipment: 'None',
      colorCode: 'Green',
    },
  ];

  if (isGym) {
    base.push({
      name: 'Ramp-Up Set (Main Lift)',
      sets: 2,
      reps: '8-10',
      notes: '2 set khoi dong voi ta nhe cho bai chinh.',
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
      notes: 'Ha nhip tim tu tu, tho sau bang mui.',
      equipment: 'None',
      colorCode: 'Green',
    },
    {
      name: 'Static Stretching',
      sets: 1,
      reps: '6 mins',
      notes: 'Tap trung nhom co vua tap chinh.',
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

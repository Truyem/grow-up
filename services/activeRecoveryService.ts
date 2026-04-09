import type { Exercise, WorkoutHistoryItem } from '../types';

const RECOVERY_LIBRARY: Exercise[] = [
  {
    name: 'Brisk Walk',
    sets: 1,
    reps: '20-30 phút',
    notes: 'Đi bộ nhẹ, giữ nhịp tim thấp.',
    equipment: 'None',
    colorCode: 'Green',
    primaryMuscleGroups: ['Cardio'],
    secondaryMuscleGroups: ['Chân'],
  },
  {
    name: 'Mobility Flow',
    sets: 1,
    reps: '10-15 phút',
    notes: 'Mở khớp vai, hông, cổ chân.',
    equipment: 'None',
    colorCode: 'Blue',
    primaryMuscleGroups: ['Full Body'],
    secondaryMuscleGroups: ['Core'],
  },
  {
    name: 'Breathing + Stretch',
    sets: 1,
    reps: '8-10 phút',
    notes: 'Thở chậm và giãn cơ toàn thân.',
    equipment: 'None',
    colorCode: 'Purple',
    primaryMuscleGroups: ['Core'],
    secondaryMuscleGroups: ['Full Body'],
  },
];

export const shouldSuggestActiveRecovery = (history: WorkoutHistoryItem[]): boolean => {
  if (!history.length) return false;
  const last = [...history].sort((a, b) => b.timestamp - a.timestamp)[0];
  const heavyWords = ['hard', 'nặng', 'full body', 'upper', 'lower'];
  const level = (last.levelSelected || '').toLowerCase();
  return heavyWords.some((w) => level.includes(w)) || (last.completedExercises?.length || 0) >= 6;
};

export const getActiveRecoverySuggestion = (history: WorkoutHistoryItem[]) => {
  if (!shouldSuggestActiveRecovery(history)) {
    return {
      enabled: false,
      title: 'Hôm nay có thể tập bình thường',
      reason: 'Không phát hiện dấu hiệu quá tải gần đây.',
      exercises: [] as Exercise[],
    };
  }

  return {
    enabled: true,
    title: 'Gợi ý Active Recovery',
    reason: '7 ngày gần nhất có buổi nặng, nên dành 1 ngày hồi phục chủ động.',
    exercises: RECOVERY_LIBRARY,
  };
};

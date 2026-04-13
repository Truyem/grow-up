import type { AchievementBadge, WorkoutHistoryItem } from '../types';
import { MAX_LEVEL, RANK_CONFIG } from '../constants/rankConfig';

const getCurrentStreak = (history: WorkoutHistoryItem[]): number => {
  if (history.length === 0) return 0;
  const sorted = [...history].sort((a, b) => b.timestamp - a.timestamp);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const last = new Date(sorted[0].timestamp);
  last.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
  if (diff > 1) return 0;

  let streak = 1;
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = new Date(sorted[i].timestamp);
    const b = new Date(sorted[i + 1].timestamp);
    a.setHours(0, 0, 0, 0);
    b.setHours(0, 0, 0, 0);
    const d = (a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24);
    if (d === 1) streak++;
    else if (d > 1) break;
  }

  return streak;
};

export const calculateAchievements = (history: WorkoutHistoryItem[]): AchievementBadge[] => {
  const totalWorkouts = history.filter((h) => h.levelSelected !== 'Ốm/Bệnh').length;
  const streak = getCurrentStreak(history);
  const exercisesDone = history.reduce((sum, item) => sum + (item.completedExercises?.length || 0), 0);
  
  const maxLevel = history.reduce((max, item) => Math.max(max, item.levelAfter || item.levelBefore || 0), 0);
  const currentRank = Math.min(Math.floor((maxLevel - 1) / 10) + 1, 20);

  return [
    {
      id: 'first_session',
      title: 'Khởi động hành trình',
      description: 'Hoàn thành buổi tập đầu tiên',
      unlocked: totalWorkouts >= 1,
      progressText: `${Math.min(totalWorkouts, 1)}/1`,
    },
    {
      id: 'streak_7',
      title: 'Streak 7 ngày',
      description: 'Duy trì chuỗi tập 7 ngày liên tiếp',
      unlocked: streak >= 7,
      progressText: `${Math.min(streak, 7)}/7`,
    },
    {
      id: 'workout_25',
      title: '25 buổi tập',
      description: 'Đạt mốc 25 buổi tập',
      unlocked: totalWorkouts >= 25,
      progressText: `${Math.min(totalWorkouts, 25)}/25`,
    },
    {
      id: 'exercise_100',
      title: '100 bài đã hoàn thành',
      description: 'Tích lũy 100 bài tập đã hoàn thành',
      unlocked: exercisesDone >= 100,
      progressText: `${Math.min(exercisesDone, 100)}/100`,
    },
    ...RANK_CONFIG.map((rank, index) => ({
      id: `rank_${index + 1}`,
      title: rank.rankName,
      description: `Hoàn thành Rank ${rank.rankName} (Level ${rank.endLevel})`,
      unlocked: currentRank >= rank.rankNumber,
      progressText: `${rank.endLevel}/${MAX_LEVEL}`,
    })),
  ];
};
import React from 'react';
import type { WorkoutHistoryItem } from '../../types';
import { calculateAchievements } from '../../services/achievementService';
import { Award, Lock } from 'lucide-react';

interface AchievementBadgesCardProps {
  history: WorkoutHistoryItem[];
}

export const AchievementBadgesCard: React.FC<AchievementBadgesCardProps> = ({ history }) => {
  const badges = calculateAchievements(history);

  return (
    <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Award className="w-4 h-4 text-yellow-300" />
        <h3 className="text-sm font-bold text-yellow-300">Badges & Achievements</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {badges.map((badge) => (
          <div
            key={badge.id}
            className={`rounded-xl border px-3 py-2 text-xs ${badge.unlocked
              ? 'border-yellow-400/40 bg-yellow-400/10 text-yellow-100'
              : 'border-white/10 bg-black/20 text-gray-400'}`}
          >
            <div className="flex items-center justify-between">
              <div className="font-semibold">{badge.title}</div>
              {badge.unlocked ? <Award className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            </div>
            <div className="mt-1">{badge.description}</div>
            <div className="mt-1.5 text-[11px]">Tiến độ: {badge.progressText}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

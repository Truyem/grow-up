import React, { useState } from 'react';
import type { AchievementBadge } from '../../types';
import { Award, Lock, ChevronDown, ChevronUp } from 'lucide-react';

interface AchievementBadgesCardProps {
  badges: AchievementBadge[];
}

export const AchievementBadgesCard: React.FC<AchievementBadgesCardProps> = ({ badges }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const unlockedCount = badges.filter(b => b.unlocked).length;
  const totalCount = badges.length;

  return (
    <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-yellow-300" />
          <h3 className="text-sm font-bold text-yellow-300">Thành tựu & Huy hiệu</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-yellow-200/70">
            {unlockedCount}/{totalCount}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-yellow-300" />
          ) : (
            <ChevronDown className="w-4 h-4 text-yellow-300" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
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
              <div className="mt-1.5 text-[11px]">{badge.progressText}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
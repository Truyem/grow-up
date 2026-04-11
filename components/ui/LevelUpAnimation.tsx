import React, { useEffect, useState } from 'react';
import { getRankFromLevel, getRankImage } from '../../constants/rankConfig';
import '../../styles/LevelUpAnimation.css';

interface LevelUpAnimationProps {
  isVisible: boolean;
  oldLevel: number;
  newLevel: number;
  onComplete: () => void;
}

const RANK_COLORS: Record<number, { primary: string; secondary: string }> = {
  1: { primary: '#cd7f32', secondary: '#8b4513' },
  2: { primary: '#a8a8a8', secondary: '#6e6e6e' },
  3: { primary: '#ffd700', secondary: '#b8860b' },
  4: { primary: '#4fc3f7', secondary: '#0277bd' },
  5: { primary: '#66bb6a', secondary: '#2e7d32' },
  6: { primary: '#80deea', secondary: '#26c6da' },
  7: { primary: '#ce93d8', secondary: '#6a1b9a' },
};

export const LevelUpAnimation: React.FC<LevelUpAnimationProps> = ({
  isVisible,
  oldLevel,
  newLevel,
  onComplete,
}) => {
  const [fadePhase, setFadePhase] = useState<'old' | 'crossfade' | 'new'>('old');

  const oldRank = getRankFromLevel(oldLevel);
  const newRank = getRankFromLevel(newLevel);
  const oldImage = getRankImage(oldLevel);
  const newImage = getRankImage(newLevel);
  const colors = RANK_COLORS[newRank.rankNumber] || RANK_COLORS[1];

  useEffect(() => {
    if (isVisible && oldLevel !== newLevel) {
      setFadePhase('old');
      
      setTimeout(() => setFadePhase('crossfade'), 1500);
      setTimeout(() => setFadePhase('new'), 4000);

      return () => {};
    }
  }, [isVisible, oldLevel, newLevel]);

  if (!isVisible) return null;

  return (
    <div className="levelup-overlay" onClick={onComplete}>
      <div className="levelup-container-overlay" onClick={(e) => e.stopPropagation()}>
        <div className="rank-stack">
          <img 
            src={newImage} 
            alt={newRank.rankName} 
            className="rank-img rank-new"
          />
          <img 
            src={oldImage} 
            alt={oldRank.rankName} 
            className={`rank-img rank-old ${fadePhase === 'crossfade' || fadePhase === 'new' ? 'fading-out' : ''}`}
          />
        </div>

        <div className={`levelup-text ${fadePhase !== 'old' ? 'show' : ''}`}>
          <span className="levelup-level" style={{ color: colors.primary }}>
            Level {newLevel}
          </span>
          <span className="levelup-rank" style={{ color: colors.primary }}>
            {newRank.rankName}
          </span>
        </div>
      </div>
    </div>
  );
};

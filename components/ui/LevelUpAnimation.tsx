import React, { useEffect, useState } from 'react';
import { getRankFromLevel, getRankImage } from '../../constants/rankConfig';
import '../styles/LevelUpAnimation.css';

interface LevelUpAnimationProps {
  isVisible: boolean;
  oldLevel: number;
  newLevel: number;
  onComplete: () => void;
}

const RANK_COLORS: Record<number, { primary: string; gradient: string }> = {
  1: { primary: '#cd7f32', gradient: 'linear-gradient(135deg, #cd7f32, #8b4513)' },
  2: { primary: '#a8a8a8', gradient: 'linear-gradient(135deg, #a8a8a8, #6e6e6e)' },
  3: { primary: '#ffd700', gradient: 'linear-gradient(135deg, #ffd700, #b8860b)' },
  4: { primary: '#4fc3f7', gradient: 'linear-gradient(135deg, #4fc3f7, #0277bd)' },
  5: { primary: '#66bb6a', gradient: 'linear-gradient(135deg, #66bb6a, #2e7d32)' },
  6: { primary: '#80deea', gradient: 'linear-gradient(135deg, #80deea, #26c6da)' },
  7: { primary: '#ce93d8', gradient: 'linear-gradient(135deg, #ce93d8, #6a1b9a)' },
};

export const LevelUpAnimation: React.FC<LevelUpAnimationProps> = ({
  isVisible,
  oldLevel,
  newLevel,
  onComplete,
}) => {
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    if (!isVisible) return;
    setShowNew(false);
    setTimeout(() => setShowNew(true), 1500);
  }, [isVisible]);

  if (!isVisible) return null;

  const oldRank = getRankFromLevel(oldLevel);
  const newRank = getRankFromLevel(newLevel);
  const colors = RANK_COLORS[newRank.rankNumber] || RANK_COLORS[1];

  return (
    <div className="levelup-overlay" onClick={onComplete}>
      <div className="levelup-content" onClick={(e) => e.stopPropagation()}>
        <div className="rank-image-wrapper">
          <img
            src={getRankImage(oldLevel)}
            alt=""
            className={`rank-img rank-old ${showNew ? 'fade-out' : ''}`}
          />
          <img
            src={getRankImage(newLevel)}
            alt=""
            className={`rank-img rank-new ${showNew ? 'fade-in' : ''}`}
          />
        </div>

        <div className="level-number">
          {oldLevel} → {newLevel}
        </div>

        <div className="rank-name-display" style={{ color: colors.primary }}>
          {newRank.rankName}
        </div>
      </div>
    </div>
  );
};

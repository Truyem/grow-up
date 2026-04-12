import React, { useState } from 'react';
import { UserLevel } from '../../types';
import { getRankFromLevel, getRankImage, getNextRankImage } from '../../constants/rankConfig';
import { Zap } from 'lucide-react';
import '../../styles/XPStatusBar.css';

interface XPStatusBarProps {
  userLevel: UserLevel | null;
  onClick?: () => void;
}

export const XPStatusBar: React.FC<XPStatusBarProps> = ({ userLevel, onClick }) => {
  const [imgLoaded, setImgLoaded] = useState(false);

  if (!userLevel) return null;

  const rank = getRankFromLevel(userLevel.currentLevel);
  const currentRankImage = getRankImage(userLevel.currentLevel);
  const nextRankImage = getNextRankImage(userLevel.currentLevel);
  const progressPercent = Math.min(
    100,
    (userLevel.currentLevelXP / userLevel.nextLevelXP) * 100
  );

  return (
    <div className="xp-status-bar" onClick={onClick}>
      {/* Level Badge */}
      <div className="status-level-badge">
        <img 
          src="/ranks/LV.webp" 
          alt="LV" 
          className={`badge-image ${imgLoaded ? 'loaded' : ''}`}
          onLoad={() => setImgLoaded(true)}
        />
      </div>

      {/* Current Rank Image */}
      <div className="status-current-rank">
        <img 
          src={currentRankImage} 
          alt={rank.rankName} 
          className={`badge-image ${imgLoaded ? 'loaded' : ''}`}
          onLoad={() => setImgLoaded(true)}
        />
      </div>

      {/* XP Info */}
      <div className="status-xp-info">
        <div className="xp-progress-bar">
          <div
            className="xp-progress-fill"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
        <div className="xp-details">
          <span className="xp-current">{userLevel.currentLevelXP}</span>
          <span className="xp-separator">/</span>
          <span className="xp-max">{userLevel.nextLevelXP}</span>
          <img src="/ranks/XP.webp" alt="XP" className="xp-icon" />
        </div>
      </div>

      {/* Rank Name */}
      <div className="status-rank-info">
        <img 
          src={nextRankImage} 
          alt="Next Rank" 
          className={`badge-image ${imgLoaded ? 'loaded' : ''}`}
          onLoad={() => setImgLoaded(true)}
        />
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { UserLevel } from '../../types';
import { getRankFromLevel, getRankImage } from '../../constants/rankConfig';
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
  const rankImage = getRankImage(userLevel.currentLevel);
  const progressPercent = Math.min(
    100,
    (userLevel.currentLevelXP / userLevel.nextLevelXP) * 100
  );

  return (
    <div className="xp-status-bar" onClick={onClick}>
      {/* Level Badge */}
      <div className="status-level-badge">
        <img 
          src={rankImage} 
          alt={`Lv ${userLevel.currentLevel}`} 
          className={`badge-image ${imgLoaded ? 'loaded' : ''}`}
          onLoad={() => setImgLoaded(true)}
        />
        <span className="badge-level">Lv {userLevel.currentLevel}</span>
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
          <Zap size={12} className="xp-icon" />
        </div>
      </div>

      {/* Rank Name */}
      <div className="status-rank-info">
        <span className="rank-badge">{rank.rankName}</span>
      </div>
    </div>
  );
};

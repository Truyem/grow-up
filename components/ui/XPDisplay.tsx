import React from 'react';
import { UserLevel } from '../types';
import { getRankFromLevel, getRankImage } from '../constants/rankConfig';
import { Zap } from 'lucide-react';
import '../styles/XPDisplay.css';

interface XPDisplayProps {
  userLevel: UserLevel | null;
  xpProgress: number; // 0-100
  xpToNextLevel: number;
}

export const XPDisplay: React.FC<XPDisplayProps> = ({ userLevel, xpProgress, xpToNextLevel }) => {
  if (!userLevel) return null;

  const rank = getRankFromLevel(userLevel.currentLevel);
  const rankImage = getRankImage(userLevel.currentLevel);

  return (
    <div className="xp-display-container">
      {/* Rank Card */}
      <div className="rank-card">
        <div className="rank-image-wrapper">
          <img src={rankImage} alt={`Level ${userLevel.currentLevel}`} className="rank-image" />
          <div className="level-badge">Lv {userLevel.currentLevel}</div>
        </div>

        <div className="rank-info">
          <h3 className="rank-name">{rank.rankName}</h3>
          <p className="rank-description">{rank.description}</p>
          <p className="rank-progress">Rank {rank.rankNumber}</p>
        </div>
      </div>

      {/* XP Bar */}
      <div className="xp-section">
        <div className="xp-header">
          <div className="xp-label">
            <Zap className="xp-icon" size={16} />
            <span>Experience Points</span>
          </div>
          <span className="xp-value">{userLevel.totalXP} XP</span>
        </div>

        <div className="xp-bar-container">
          <div className="xp-bar-background">
            <div
              className="xp-bar-fill"
              style={{ width: `${xpProgress}%` }}
            >
              <span className="xp-bar-percentage">{Math.round(xpProgress)}%</span>
            </div>
          </div>
        </div>

        <div className="xp-info">
          <span className="current-xp">{userLevel.currentLevelXP} XP</span>
          <span className="xp-to-next">{xpToNextLevel} XP còn lại</span>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-item">
          <span className="stat-label">Lifetime XP</span>
          <span className="stat-value">{userLevel.lifetimeXP}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Level</span>
          <span className="stat-value">{userLevel.currentLevel}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Rank</span>
          <span className="stat-value">{rank.rankNumber}</span>
        </div>
      </div>
    </div>
  );
};

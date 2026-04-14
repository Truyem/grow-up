import React, { useState } from 'react';
import { UserLevel } from '../types';
import { getRankFromLevel, RANK_CONFIG, getRankImage, LEVEL_UP_REWARDS } from '../constants/rankConfig';
import { Award, TrendingUp, Target, Zap, Lock } from 'lucide-react';
import '../styles/GamificationDashboard.css';

interface GamificationDashboardProps {
  userLevel: UserLevel | null;
  onClose?: () => void;
}

export const GamificationDashboard: React.FC<GamificationDashboardProps> = ({ userLevel, onClose }) => {
  const [selectedRank, setSelectedRank] = useState<number | null>(null);

  if (!userLevel) {
    return (
      <div className="gamification-dashboard">
        <div className="dashboard-container">
          <div className="empty-state">
            <p>Vui lòng tải lại dữ liệu người dùng</p>
          </div>
        </div>
      </div>
    );
  }

  const rank = getRankFromLevel(userLevel.currentLevel);
  const rankImage = getRankImage(userLevel.currentLevel);
  const progressToRankEnd = ((userLevel.currentLevel - rank.startLevel + 1) / (rank.endLevel - rank.startLevel + 1)) * 100;

  return (
    <div className="gamification-dashboard">
      <div className="dashboard-container">
        {/* Header */}
        <div className="dashboard-header">
          <h2>Bảng Xếp Hạng & Kinh Nghiệm</h2>
          {onClose && (
            <button className="close-button" onClick={onClose}>
              ✕
            </button>
          )}
        </div>

        {/* Main Stats */}
        <div className="main-stats">
          {/* Current Level Card */}
          <div className="current-level-card">
            <div className="level-display">
              <img src={rankImage} alt="Current Level" className="current-level-image" />
              <div className="level-badge-large">
                <span className="badge-level-num">{userLevel.currentLevel}</span>
              </div>
            </div>

            <div className="level-details">
              <h3>{rank.rankName}</h3>
              <p className="rank-desc">{rank.description}</p>
              <div className="progress-to-end">
                <span className="progress-label">Rank {rank.rankNumber} Progress</span>
                <div className="progress-container">
                  <div
                    className="progress-bar"
                    style={{ width: `${progressToRankEnd}%` }}
                  ></div>
                </div>
                <span className="progress-text">
                  {userLevel.currentLevel - rank.startLevel + 1} / {rank.endLevel - rank.startLevel + 1}
                </span>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">
                <Zap size={24} />
              </div>
              <div className="stat-content">
                <span className="stat-label">Tổng XP</span>
                <span className="stat-value">{userLevel.totalXP.toLocaleString()}</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <TrendingUp size={24} />
              </div>
              <div className="stat-content">
                <span className="stat-label">XP Suốt Đời</span>
                <span className="stat-value">{userLevel.lifetimeXP.toLocaleString()}</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <Target size={24} />
              </div>
              <div className="stat-content">
                <span className="stat-label">XP Cần Thiết</span>
                <span className="stat-value">{(userLevel.nextLevelXP - userLevel.currentLevelXP).toLocaleString()}</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <Award size={24} />
              </div>
              <div className="stat-content">
                <span className="stat-label">Rank Hiện Tại</span>
                <span className="stat-value">{rank.rankNumber}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Rank Overview */}
        <div className="rank-overview">
          <h3>Tất Cả Các Rank</h3>
          <div className="rank-grid">
            {RANK_CONFIG.map((r) => {
              const isCurrentRank = r.rankNumber === rank.rankNumber;
              const isUnlocked = userLevel.currentLevel >= r.startLevel;

              return (
                <div
                  key={r.rankNumber}
                  className={`rank-item ${isCurrentRank ? 'current' : ''} ${isUnlocked ? 'unlocked' : 'locked'}`}
                  onClick={() => setSelectedRank(r.rankNumber)}
                >
                  <div className="rank-item-header">
                    <span className="rank-number">Rank {r.rankNumber}</span>
                    {isCurrentRank && <span className="current-badge">HIỆN TẠI</span>}
                    {!isUnlocked && <span className="locked-badge"><Lock className="w-3 h-3" /></span>}
                  </div>
                  <p className="rank-item-name">{r.rankName}</p>
                  <p className="rank-item-levels">Lv {r.startLevel} - {r.endLevel}</p>
                  <p className="rank-item-desc">{r.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Rewards */}
        <div className="recent-rewards">
          <h3>Phần Thưởng Khi Lên Cấp</h3>
          <div className="rewards-list">
            {Object.entries(LEVEL_UP_REWARDS).map(([level, rewards]) => {
              const levelNum = parseInt(level);
              const isUnlocked = userLevel.currentLevel >= levelNum;

              return (
                <div key={level} className={`reward-item ${isUnlocked ? 'unlocked' : 'locked'}`}>
                  <span className={`level-marker ${isUnlocked ? 'active' : ''}`}>
                    Lv {level}
                  </span>
                  <div className="rewards-content">
                    {rewards.map((reward, idx) => (
                      <span key={idx} className="reward-text">
                        {reward}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        { /* Test XP panel removed: use console cheat for XP testing in dev */ }
      </div>
    </div>
  );
};

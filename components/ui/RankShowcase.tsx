import React, { useState } from 'react';
import { UserLevel } from '../../types';
import { getRankFromLevel, RANK_CONFIG } from '../../constants/rankConfig';
import { RankCard } from './RankCard';
import '../styles/RankShowcase.css';

interface RankShowcaseProps {
  userLevel: UserLevel | null;
}

export const RankShowcase: React.FC<RankShowcaseProps> = ({ userLevel }) => {
  const [selectedRankNum, setSelectedRankNum] = useState<number | null>(null);

  if (!userLevel) return null;

  const currentRank = getRankFromLevel(userLevel.currentLevel);
  const selectedRank = selectedRankNum 
    ? RANK_CONFIG.find(r => r.rankNumber === selectedRankNum) 
    : currentRank;

  return (
    <div className="rank-showcase-container">
      {/* Header */}
      <div className="showcase-header">
        <h2>Hệ Thống Rank & Level</h2>
        <p className="subtitle">Mỗi Rank gồm 10 Levels - Nâng cao để mở khóa các rank mới</p>
      </div>

      {/* Rank tabs */}
      <div className="rank-tabs">
        {RANK_CONFIG.map((rank) => {
          const isCurrentRank = rank.rankNumber === currentRank.rankNumber;
          const isUnlocked = userLevel.currentLevel >= rank.startLevel;
          const isSelected = selectedRank?.rankNumber === rank.rankNumber;

          return (
            <button
              key={rank.rankNumber}
              className={`rank-tab ${isCurrentRank ? 'current' : ''} ${isUnlocked ? 'unlocked' : 'locked'} ${isSelected ? 'selected' : ''}`}
              onClick={() => setSelectedRankNum(rank.rankNumber)}
            >
              <span className="rank-number">Rank {rank.rankNumber}</span>
              <span className="rank-name">{rank.rankName}</span>
              {isCurrentRank && <span className="badge">HIỆN TẠI</span>}
              {!isUnlocked && <span className="locked-badge">🔒</span>}
            </button>
          );
        })}
      </div>

      {/* Main rank display */}
      {selectedRank && (
        <div className="rank-display-section">
          <RankCard userLevel={userLevel} />
        </div>
      )}

      {/* Rank info grid */}
      <div className="rank-info-grid">
        <div className="info-card">
          <h4>📊 Thống Kê Rank</h4>
          <div className="info-content">
            <p><strong>Rank Hiện Tại:</strong> {currentRank.rankName}</p>
            <p><strong>Level Hiện Tại:</strong> {userLevel.currentLevel}</p>
            <p><strong>Total XP:</strong> {userLevel.totalXP.toLocaleString()}</p>
            <p><strong>Lifetime XP:</strong> {userLevel.lifetimeXP.toLocaleString()}</p>
          </div>
        </div>

        <div className="info-card">
          <h4>🎯 Tiến Độ Rank Hiện Tại</h4>
          <div className="info-content">
            <p>
              <strong>Từ Level:</strong> {currentRank.startLevel} đến {currentRank.endLevel}
            </p>
            <p>
              <strong>Tiến độ:</strong> {userLevel.currentLevel - currentRank.startLevel + 1}/11
            </p>
            <div className="mini-progress">
              <div
                className="mini-progress-bar"
                style={{
                  width: `${((userLevel.currentLevel - currentRank.startLevel + 1) / 11) * 100}%`
                }}
              ></div>
            </div>
          </div>
        </div>

        <div className="info-card">
          <h4>🏆 Rank Tiếp Theo</h4>
          <div className="info-content">
            {currentRank.rankNumber < 7 ? (
              <>
                <p>
                  <strong>Tên:</strong> {RANK_CONFIG[currentRank.rankNumber].rankName}
                </p>
                <p>
                  <strong>Từ Level:</strong> {RANK_CONFIG[currentRank.rankNumber].startLevel}
                </p>
                <p>
                  <strong>Cần:</strong> {RANK_CONFIG[currentRank.rankNumber].startLevel - userLevel.currentLevel} Levels
                </p>
              </>
            ) : (
              <p className="max-rank">👑 Bạn đã đạt cấp độ tối đa!</p>
            )}
          </div>
        </div>
      </div>

      {/* All ranks overview */}
      <div className="all-ranks-section">
        <h3>Toàn Bộ Hệ Thống Rank</h3>
        <div className="ranks-overview">
          {RANK_CONFIG.map((rank) => {
            const isCurrentRank = rank.rankNumber === currentRank.rankNumber;
            const isUnlocked = userLevel.currentLevel >= rank.startLevel;

            return (
              <div
                key={rank.rankNumber}
                className={`rank-overview-card ${isCurrentRank ? 'current' : ''} ${isUnlocked ? 'unlocked' : 'locked'}`}
              >
                <div className="rank-overview-number">{rank.rankNumber}</div>
                <h4>{rank.rankName}</h4>
                <p className="rank-levels">Lv {rank.startLevel}-{rank.endLevel}</p>
                <p className="rank-desc">{rank.description}</p>
                {isCurrentRank && <div className="current-indicator">Rank Hiện Tại</div>}
                {!isUnlocked && <div className="locked-indicator">🔒 Khóa</div>}
                {isUnlocked && !isCurrentRank && <div className="unlocked-indicator">✓ Mở Khóa</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

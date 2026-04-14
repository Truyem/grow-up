import React, { useState } from 'react';
import { UserLevel } from '../../types';
import { getRankFromLevel, getTierImage, RANK_CONFIG } from '../../constants/rankConfig';
import { RankCard } from './RankCard';
import { Lock } from 'lucide-react';
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
      {/* Main rank display */}
      {selectedRank && (
        <div className="rank-display-section">
          <RankCard userLevel={userLevel} />
        </div>
      )}

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
              <img 
                src={getTierImage(rank.startLevel)} 
                alt={`Hạng ${rank.rankNumber}`} 
                className="rank-tier-image"
              />
              {isCurrentRank && <span className="badge">HIỆN TẠI</span>}
              {!isUnlocked && <span className="locked-badge"><Lock className="w-3 h-3" /></span>}
            </button>
          );
        })}
      </div>

      
    </div>
  );
};

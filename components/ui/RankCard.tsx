import React from 'react';
import { UserLevel } from '../../types';
import { getRankFromLevel, getRankImage, COLOR_PALETTE } from '../../constants/rankConfig';
import { Zap, Crown, Flame, Gem, Star } from 'lucide-react';
import '../styles/RankCard.css';

interface RankCardProps {
  userLevel: UserLevel | null;
  onClick?: () => void;
}

// Dynamic rank colors: derived from COLOR_PALETTE (20 colors)
import { hexToRgb } from './utils-color';

function getTextColorForHex(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  // Luminance approximation
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum > 0.6 ? '#000' : '#fff';
}

interface RankColorScheme {
  primary: string;
  secondary: string;
  accent: string;
  gradient: string;
  textColor: string;
}

export const RankCard: React.FC<RankCardProps> = ({ userLevel, onClick }) => {
  if (!userLevel) return null;

  const rank = getRankFromLevel(userLevel.currentLevel);
  const rankImage = getRankImage(userLevel.currentLevel);
  const blockIndex = Math.floor((userLevel.currentLevel) / 10);
  const colorHex = COLOR_PALETTE[blockIndex % COLOR_PALETTE.length].hex;
  const textColor = getTextColorForHex(colorHex);
  const colors: RankColorScheme = {
    primary: colorHex,
    secondary: colorHex,
    accent: colorHex,
    gradient: `linear-gradient(135deg, ${colorHex} 0%, ${colorHex} 100%)`,
    textColor,
  };
  
  // Tính level trong rank (0-9)
  const levelInRank = userLevel.currentLevel - rank.startLevel;
  const progressInRank = ((levelInRank + 1) / (rank.endLevel - rank.startLevel + 1)) * 100;
  
  // Progress bar
  const currentProgress = (userLevel.currentLevelXP / userLevel.nextLevelXP) * 100;

  // Rank icon
  const getRankIcon = () => {
    switch (rank.rankNumber) {
      case 1: return <Flame size={24} />;
      case 2: return <Zap size={24} />;
      case 3: return <Star size={24} />;
      case 4: return <Gem size={24} />;
      case 5: return <Gem size={24} />;
      case 6: return <Crown size={24} />;
      case 7: return <Crown size={24} />;
      default: return <Star size={24} />;
    }
  };

  return (
    <div className="rank-card-container" onClick={onClick}>
      {/* Background decoration */}
      <div className="rank-card-bg" style={{ background: colors.gradient }}></div>
      
      {/* Rank card */}
      <div className="rank-card" style={{
        borderColor: colors.primary,
        boxShadow: `0 8px 32px ${colors.primary}40`
      }}>
        {/* Top decoration */}
        <div className="rank-card-top">
          <div className="rank-number" style={{ 
            background: colors.gradient,
            color: rank.rankNumber === 6 ? '#000' : '#fff'
          }}>
            {rank.rankNumber}
          </div>
          <div className="rank-icon" style={{ color: colors.primary }}>
            {getRankIcon()}
          </div>
        </div>

        {/* Rank image section */}
        <div className="rank-image-section" style={{ borderColor: colors.primary }}>
          <img src={rankImage} alt={`Level ${userLevel.currentLevel + 1}`} className="rank-image" />
          <div className="level-badge" style={{
            background: colors.gradient,
            color: rank.rankNumber === 6 ? '#000' : '#fff'
          }}>
            <span>Lv {userLevel.currentLevel + 1}</span>
          </div>
        </div>

        {/* Rank info section */}
        <div className="rank-info-section">
          <h3 className="rank-name" style={{ color: colors.primary }}>
            {rank.rankName}
          </h3>
          <p className="rank-description">{rank.description}</p>

          {/* Progress in rank */}
          <div className="progress-section">
            <div className="progress-label">
              <span>Tiến độ Rank</span>
              <span className="progress-text">{levelInRank + 1}/11</span>
            </div>
            <div className="progress-bar" style={{ background: `${colors.primary}20` }}>
              <div
                className="progress-fill"
                style={{
                  width: `${progressInRank}%`,
                  background: colors.gradient
                }}
              ></div>
            </div>
          </div>

        {/* Level progress */}
          <div className="level-progress-section">
            <div className="level-progress-label">
              <span>Level Progress</span>
              <span className="xp-text">{userLevel.currentLevelXP} / {userLevel.nextLevelXP}</span>
            </div>
            <div className="level-progress-bar" style={{ background: `${colors.primary}20` }}>
              <div
                className="level-progress-fill"
                style={{
                  width: `${currentProgress}%`,
                  background: colors.gradient
                }}
              ></div>
            </div>
          </div>

          {/* Stats */}
          <div className="rank-stats">
            <div className="stat" style={{ borderLeftColor: colors.primary }}>
              <span className="stat-label">Total XP</span>
              <span className="stat-value" style={{ color: colors.primary }}>
                {userLevel.totalXP}
              </span>
            </div>
            <div className="stat" style={{ borderLeftColor: colors.primary }}>
              <span className="stat-label">Lifetime</span>
              <span className="stat-value" style={{ color: colors.primary }}>
                {userLevel.lifetimeXP}
              </span>
            </div>
          </div>

          {/* Levels in rank indicator */}
          <div className="levels-indicator">
            {Array.from({ length: 11 }).map((_, i) => (
              <div
                key={i}
                className={`level-dot ${i <= levelInRank ? 'active' : 'inactive'}`}
                style={{
                  background: i <= levelInRank ? colors.gradient : '#eee'
                }}
                title={`Lv ${rank.startLevel + i + 1}`}
              ></div>
            ))}
          </div>
        </div>

        {/* Bottom decoration */}
        <div className="rank-card-bottom" style={{ borderTopColor: colors.primary }}>
          <span className="rank-status">
            {levelInRank === 10 ? '🎉 Sắp hoàn thành rank' : '📈 Tiếp tục tăng XP'}
          </span>
        </div>
      </div>
    </div>
  );
};

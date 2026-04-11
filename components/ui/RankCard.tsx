import React from 'react';
import { UserLevel } from '../../types';
import { getRankFromLevel, getRankImage, RANK_CONFIG } from '../../constants/rankConfig';
import { Zap, Crown, Flame, Gem, Star } from 'lucide-react';
import '../styles/RankCard.css';

interface RankCardProps {
  userLevel: UserLevel | null;
  onClick?: () => void;
}

// Rank color schemes - mỗi rank có màu riêng
const RANK_COLORS = {
  1: { // Đồng - Bronze
    primary: '#B87333',
    secondary: '#D2B48C',
    accent: '#8B6914',
    gradient: 'linear-gradient(135deg, #B87333 0%, #D2B48C 100%)',
  },
  2: { // Sắt - Iron
    primary: '#696969',
    secondary: '#A9A9A9',
    accent: '#2F4F4F',
    gradient: 'linear-gradient(135deg, #696969 0%, #A9A9A9 100%)',
  },
  3: { // Vàng - Gold
    primary: '#FFD700',
    secondary: '#FFA500',
    accent: '#FF8C00',
    gradient: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
  },
  4: { // Lưu Ly - Lapis Lazuli
    primary: '#0047AB',
    secondary: '#4169E1',
    accent: '#1E90FF',
    gradient: 'linear-gradient(135deg, #0047AB 0%, #4169E1 100%)',
  },
  5: { // Lục Bảo - Emerald
    primary: '#50C878',
    secondary: '#00FA9A',
    accent: '#3CB371',
    gradient: 'linear-gradient(135deg, #50C878 0%, #00FA9A 100%)',
  },
  6: { // Kim Cương - Diamond
    primary: '#80deea',
    secondary: '#26c6da',
    accent: '#4dd0e1',
    gradient: 'linear-gradient(135deg, #80deea 0%, #26c6da 100%)',
  },
  7: { // Thạch Anh Tím - Amethyst
    primary: '#9966CC',
    secondary: '#DA70D6',
    accent: '#BA55D3',
    gradient: 'linear-gradient(135deg, #9966CC 0%, #DA70D6 100%)',
  },
};

interface RankColorScheme {
  primary: string;
  secondary: string;
  accent: string;
  gradient: string;
}

export const RankCard: React.FC<RankCardProps> = ({ userLevel, onClick }) => {
  if (!userLevel) return null;

  const rank = getRankFromLevel(userLevel.currentLevel);
  const rankImage = getRankImage(userLevel.currentLevel);
  const colors: RankColorScheme = RANK_COLORS[rank.rankNumber as keyof typeof RANK_COLORS];
  
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
          <img src={rankImage} alt={`Level ${userLevel.currentLevel}`} className="rank-image" />
          <div className="level-badge" style={{
            background: colors.gradient,
            color: rank.rankNumber === 6 ? '#000' : '#fff'
          }}>
            <span>Lv {userLevel.currentLevel}</span>
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
                title={`Lv ${rank.startLevel + i}`}
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

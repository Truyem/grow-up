import React, { useEffect, useState } from 'react';
import { Star, Zap, Award } from 'lucide-react';
import { getTierColorForLevel } from '../../constants/rankConfig';
import '../styles/LevelUpPopup.css';

interface LevelUpPopupProps {
  newLevel: number;
  xpGained: number;
  rewards: string[];
  onClose: () => void;
  isVisible: boolean;
}

export const LevelUpPopup: React.FC<LevelUpPopupProps> = ({
  newLevel,
  xpGained,
  rewards,
  onClose,
  isVisible,
}) => {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShowContent(true);
      const timer = setTimeout(() => {
        onClose();
      }, 4000);
      return () => clearTimeout(timer);
    } else {
      setShowContent(false);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const tierColor = getTierColorForLevel(newLevel);
  return (
    <div className={`level-up-container ${showContent ? 'active' : ''}`}>
      {/* Background fireworks */}
      <div className="fireworks">
        <div className="firework"></div>
        <div className="firework"></div>
        <div className="firework"></div>
        <div className="firework"></div>
        <div className="firework"></div>
      </div>

      {/* Popup Content */}
      <div className="level-up-popup">
        {/* Header */}
        <div className="popup-header">
          <div className="stars">
            <Star className="star star-1" fill="currentColor" />
            <Star className="star star-2" fill="currentColor" />
            <Star className="star star-3" fill="currentColor" />
          </div>
          <h2 className="level-up-title">LEVEL UP!</h2>
          <div className="stars">
            <Star className="star star-4" fill="currentColor" />
            <Star className="star star-5" fill="currentColor" />
            <Star className="star star-6" fill="currentColor" />
          </div>
        </div>

        {/* Level Info */}
        <div className="level-info">
          <div className="level-circle" style={{ borderColor: tierColor.hex }}>
            <span className="level-number" style={{ color: tierColor.text }}>{newLevel}</span>
          </div>
          <p className="level-message" style={{ color: tierColor.text }}>Chúc mừng! Bạn đã đạt Level {newLevel}</p>
        </div>

        {/* XP Gained */}
        <div className="xp-gained" style={{ color: tierColor.text }}>
          <Zap className="xp-icon" size={24} />
          <span className="xp-text">+{xpGained} XP</span>
        </div>

        {/* Rewards */}
        {rewards && rewards.length > 0 && (
          <div className="rewards-section">
            <h4 className="rewards-title">
              <Award size={18} /> Phần Thưởng
            </h4>
            <div className="rewards-list">
              {rewards.map((reward, index) => (
                <div key={index} className="reward-item">
                  <span className="reward-icon">🎁</span>
                  <span className="reward-text">{reward}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Button */}
        <button className="popup-button" onClick={onClose}>
          Tuyệt vời!
        </button>
      </div>

      {/* Confetti */}
      <div className="confetti">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="confetti-piece"></div>
        ))}
      </div>
    </div>
  );
};

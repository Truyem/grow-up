import React, { useState } from 'react';
import { LevelUpPopup } from './LevelUpPopup';
import { getXPForNextLevel, LEVEL_UP_REWARDS } from '../../constants/rankConfig';

export const TestXPPanel: React.FC = () => {
  // Simulation state (0-based level internally to align with existing logic)
  const [currentLevel, setCurrentLevel] = useState<number>(0);
  const [currentLevelXP, setCurrentLevelXP] = useState<number>(0);
  const [inputXP, setInputXP] = useState<number>(100);
  const [popup, setPopup] = useState<{ newLevel: number; xpGained: number; rewards: string[] } | null>(null);

  const addXP = () => {
    const amount = Math.max(0, Number(inputXP) || 0);
    let delta = amount;
    let xpInCurr = currentLevelXP;
    let level = currentLevel;
    let gained = 0;

    // Compute level ups
    while (delta > 0) {
      const toNext = getXPForNextLevel(level) - xpInCurr;
      if (delta >= toNext) {
        delta -= toNext;
        gained += toNext;
        level += 1;
        xpInCurr = 0;
      } else {
        xpInCurr += delta;
        delta = 0;
      }
    }

    if (gained > 0) {
      const rewards = LEVEL_UP_REWARDS[level] || [];
      setPopup({ newLevel: level, xpGained: gained, rewards });
    }

    setCurrentLevel(level);
    setCurrentLevelXP(xpInCurr);
  };

  const closePopup = () => setPopup(null);

  return (
    <div className="test-xp-panel" style={{ border: '1px solid #ddd', padding: 12, borderRadius: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <strong>Test XP</strong>
        <span>Current Lv: {currentLevel + 1}</span>
        <span>Current XP: {currentLevelXP} / {getXPForNextLevel(currentLevel)}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="number"
          min={0}
          value={inputXP}
          onChange={(e) => setInputXP(Number(e.target.value))}
          style={{ width: 120 }}
        />
        <button onClick={addXP}>Add XP</button>
        <span>Tip: XP for next level decreases as you level up</span>
      </div>

      {popup && (
        <LevelUpPopup
          isVisible={true}
          newLevel={popup.newLevel}
          xpGained={popup.xpGained}
          rewards={popup.rewards}
          onClose={closePopup}
        />
      )}
    </div>
  );
};

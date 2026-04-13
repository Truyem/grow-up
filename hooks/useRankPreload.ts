import { useEffect } from 'react';
import { MAX_LEVEL } from '../constants/rankConfig';

export function useRankPreload(preloadLevel: number = MAX_LEVEL) {
  useEffect(() => {
    const levelsToPreload = Math.min(preloadLevel, MAX_LEVEL);
    
    for (let level = 1; level <= levelsToPreload; level++) {
      const img = new Image();
      img.src = `/ranks/lv${level}.webp`;
    }
  }, [preloadLevel]);
}
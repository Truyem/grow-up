import { SleepQuality, SleepRecoveryEntry } from '../types';

export interface SleepRecoveryDraft {
  sleepHours: number;
}

export const MIN_SLEEP_HOURS = 3;
export const MAX_SLEEP_HOURS = 12;
export const DEFAULT_SLEEP_HOURS = 8;

export const clampSleepHours = (sleepHours: number): number => {
  if (!Number.isFinite(sleepHours)) return DEFAULT_SLEEP_HOURS;
  return Math.min(MAX_SLEEP_HOURS, Math.max(MIN_SLEEP_HOURS, sleepHours));
};

export const inferSleepQuality = (sleepHours: number): SleepQuality => {
  const normalizedHours = clampSleepHours(sleepHours);
  if (normalizedHours < 6) return 'bad';
  if (normalizedHours < 7.5) return 'average';
  return 'good';
};

export const getSleepQualityLabel = (quality: SleepQuality): string => {
  if (quality === 'bad') return 'Kém';
  if (quality === 'average') return 'Trung bình';
  return 'Tốt';
};

const getDateLabel = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const createSleepRecoveryEntry = (draft: SleepRecoveryDraft): SleepRecoveryEntry => {
  const timestamp = Date.now();
  const normalizedHours = clampSleepHours(draft.sleepHours);
  return {
    id: `sr-${timestamp}`,
    timestamp,
    date: getDateLabel(timestamp),
    sleepHours: normalizedHours,
    sleepQuality: inferSleepQuality(normalizedHours),
  };
};

export const getLatestSleepRecovery = (entries: SleepRecoveryEntry[]) => {
  if (!entries.length) return null;
  return [...entries].sort((a, b) => b.timestamp - a.timestamp)[0];
};

import { SleepQuality, SleepRecoveryEntry } from '../types';

export interface SleepRecoveryDraft {
  sleepHours: number;
}

export const inferSleepQuality = (sleepHours: number): SleepQuality => {
  if (sleepHours < 6) return 'bad';
  if (sleepHours < 7.5) return 'average';
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
  return {
    id: `sr-${timestamp}`,
    timestamp,
    date: getDateLabel(timestamp),
    sleepHours: draft.sleepHours,
    sleepQuality: inferSleepQuality(draft.sleepHours),
  };
};

export const getLatestSleepRecovery = (entries: SleepRecoveryEntry[]) => {
  if (!entries.length) return null;
  return [...entries].sort((a, b) => b.timestamp - a.timestamp)[0];
};

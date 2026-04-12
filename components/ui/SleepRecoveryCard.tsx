import React, { useMemo, useState, useEffect } from 'react';
import { Moon } from 'lucide-react';
import { SleepRecoveryEntry } from '../../types';
import {
  createSleepRecoveryEntry,
  getLatestSleepRecovery,
  getSleepQualityLabel,
} from '../../services/sleepRecoveryService';

interface SleepRecoveryCardProps {
  entries: SleepRecoveryEntry[];
  onAddEntry: (entry: SleepRecoveryEntry) => void;
  suggestedSleepTime?: string;
  onSleepChange?: (sleepStart: string, sleepEnd: string) => void;
}

export const SleepRecoveryCard: React.FC<SleepRecoveryCardProps> = ({ entries, onAddEntry, suggestedSleepTime, onSleepChange }) => {
  const [sleepStart, setSleepStart] = useState('23:00');
  const [sleepEnd, setSleepEnd] = useState('07:00');

  const latest = useMemo(() => getLatestSleepRecovery(entries), [entries]);

  useEffect(() => {
    if (onSleepChange) {
      onSleepChange(sleepStart, sleepEnd);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sleepStart, sleepEnd]);

  const previewHours = useMemo(() => {
    const entry = createSleepRecoveryEntry({ sleepStart, sleepEnd });
    return entry.sleepHours;
  }, [sleepStart, sleepEnd]);

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-md p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-wide">Giấc ngủ</h3>
          <p className="text-xs text-gray-500">Theo dõi thời gian đi ngủ và thức dậy</p>
        </div>
        <div className="text-right text-[11px] text-gray-400">
          <div>Mục tiêu đi ngủ: {suggestedSleepTime || '23:00'}</div>
          <div>Gần nhất: {latest ? `${latest.sleepStart} - ${latest.sleepEnd}` : '--'}</div>
        </div>
      </div>

      {latest && (
        <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-3 text-xs text-indigo-100">
          <div className="font-semibold">Ghi nhận mới nhất</div>
          <div className="text-indigo-200/80 mt-1">{latest.sleepStart} - {latest.sleepEnd} | {latest.sleepHours}h | {getSleepQualityLabel(latest.sleepQuality)}</div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        <label className="text-xs text-gray-400">
          Ngủ từ
          <div className="relative mt-1">
            <Moon className="w-4 h-4 absolute left-3 top-2.5 text-gray-500" />
            <input
              type="time"
              value={sleepStart}
              onChange={(e) => setSleepStart(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-xl py-2 pl-10 pr-3 text-sm text-white"
            />
          </div>
        </label>
        <label className="text-xs text-gray-400">
          Thức dậy lúc
          <div className="relative mt-1">
            <Moon className="w-4 h-4 absolute left-3 top-2.5 text-gray-500" />
            <input
              type="time"
              value={sleepEnd}
              onChange={(e) => setSleepEnd(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-xl py-2 pl-10 pr-3 text-sm text-white"
            />
          </div>
        </label>
        <div className="text-xs text-indigo-200 bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-2.5">
          Thời lượng ước tính: <span className="font-semibold">{previewHours}h</span>
        </div>
      </div>
    </div>
  );
};

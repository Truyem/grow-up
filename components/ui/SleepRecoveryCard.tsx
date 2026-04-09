import React, { useMemo, useState, useEffect } from 'react';
import { Moon } from 'lucide-react';
import { SleepRecoveryEntry } from '../../types';
import {
  createSleepRecoveryEntry,
  DEFAULT_SLEEP_HOURS,
  MAX_SLEEP_HOURS,
  MIN_SLEEP_HOURS,
  getLatestSleepRecovery,
  inferSleepQuality,
  getSleepQualityLabel,
} from '../../services/sleepRecoveryService';

interface SleepRecoveryCardProps {
  entries: SleepRecoveryEntry[];
  onAddEntry: (entry: SleepRecoveryEntry) => void;
  suggestedSleepTime?: string;
  onSleepChange?: (hours: number) => void;
}

export const SleepRecoveryCard: React.FC<SleepRecoveryCardProps> = ({ entries, onAddEntry, suggestedSleepTime, onSleepChange }) => {
  const [sleepHours, setSleepHours] = useState(String(DEFAULT_SLEEP_HOURS));

  const latest = useMemo(() => getLatestSleepRecovery(entries), [entries]);
  const inferredQuality = useMemo(() => {
    const parsed = Number(sleepHours.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return inferSleepQuality(parsed);
  }, [sleepHours]);

  useEffect(() => {
    const parsed = Number(sleepHours.replace(',', '.'));
    if (Number.isFinite(parsed) && parsed > 0 && onSleepChange) {
      onSleepChange(parsed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sleepHours]);

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-md p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-wide">Giấc ngủ</h3>
          <p className="text-xs text-gray-500">Theo dõi số giờ ngủ và tự suy ra chất lượng</p>
        </div>
        <div className="text-right text-[11px] text-gray-400">
          <div>Mục tiêu đi ngủ: {suggestedSleepTime || '23:00'}</div>
          <div>Gần nhất: {latest ? `${latest.sleepHours}h` : '--'}</div>
        </div>
      </div>

      {latest && (
        <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-3 text-xs text-indigo-100">
          <div className="font-semibold">Ghi nhận mới nhất</div>
          <div className="text-indigo-200/80 mt-1">Số giờ ngủ: {latest.sleepHours}h | Chất lượng giấc ngủ: {getSleepQualityLabel(latest.sleepQuality)}</div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        <label className="text-xs text-gray-400">
          Số giờ ngủ
          <div className="relative mt-1">
            <Moon className="w-4 h-4 absolute left-3 top-2.5 text-gray-500" />
            <input
              type="number"
              inputMode="decimal"
              min={MIN_SLEEP_HOURS}
              max={MAX_SLEEP_HOURS}
              step="0.1"
              value={sleepHours}
              onChange={(e) => setSleepHours(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-xl py-2 pl-10 pr-3 text-sm text-white"
            />
          </div>
          <div className="mt-1 text-[11px] text-gray-500">
            Tự động lưu mặc định {DEFAULT_SLEEP_HOURS}h nếu bỏ trống. Giới hạn từ {MIN_SLEEP_HOURS}h đến {MAX_SLEEP_HOURS}h.
          </div>
        </label>
      </div>

      {inferredQuality && (
        <div className="text-xs text-indigo-200 bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-2.5">
          Chất lượng giấc ngủ: <span className="font-semibold">{getSleepQualityLabel(inferredQuality)}</span>
        </div>
      )}
    </div>
  );
};

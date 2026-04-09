import React, { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Moon, BedDouble } from 'lucide-react';
import { SleepRecoveryEntry } from '../../types';
import { createSleepRecoveryEntry, getLatestSleepRecovery, inferSleepQuality, getSleepQualityLabel } from '../../services/sleepRecoveryService';

interface SleepRecoveryCardProps {
  entries: SleepRecoveryEntry[];
  onAddEntry: (entry: SleepRecoveryEntry) => void;
  suggestedSleepTime?: string;
}

export const SleepRecoveryCard: React.FC<SleepRecoveryCardProps> = ({ entries, onAddEntry, suggestedSleepTime }) => {
  const [sleepHours, setSleepHours] = useState('7.5');

  const latest = useMemo(() => getLatestSleepRecovery(entries), [entries]);
  const sorted = useMemo(() => [...entries].sort((a, b) => a.timestamp - b.timestamp), [entries]);
  const chartData = sorted.map((i) => ({ date: i.date, sleepHours: i.sleepHours }));
  const inferredQuality = useMemo(() => {
    const parsed = Number(sleepHours.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return inferSleepQuality(parsed);
  }, [sleepHours]);

  const handleSave = () => {
    const parsed = Number(sleepHours.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    const entry = createSleepRecoveryEntry({
      sleepHours: parsed,
    });
    onAddEntry(entry);
  };

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
              type="text"
              inputMode="decimal"
              value={sleepHours}
              onChange={(e) => setSleepHours(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-xl py-2 pl-10 pr-3 text-sm text-white"
            />
          </div>
        </label>
      </div>

      {inferredQuality && (
        <div className="text-xs text-indigo-200 bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-2.5">
          Chất lượng giấc ngủ: <span className="font-semibold">{getSleepQualityLabel(inferredQuality)}</span>
        </div>
      )}

      <button
        onClick={handleSave}
        className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
      >
        <BedDouble className="w-4 h-4" />
        Lưu giấc ngủ
      </button>

      {chartData.length > 0 && (
        <div className="h-48 rounded-xl border border-white/10 bg-black/20 p-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} domain={[0, 12]} />
              <Tooltip />
              <Line type="monotone" dataKey="sleepHours" stroke="#818cf8" strokeWidth={2} dot={false} name="Sleep Hours" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

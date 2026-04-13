import React from 'react';
import type { PersonalRecord } from '../../types';
import { Trophy, TrendingUp, Weight, Layers, Hash } from 'lucide-react';

interface PersonalRecordCardProps {
  records: PersonalRecord[];
}

const formatNumber = (n: number) => {
  if (!Number.isFinite(n)) return '0';
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(n);
};

const formatDate = (ts: number) => {
  if (!ts) return '-';
  return new Date(ts).toLocaleDateString('vi-VN');
};

export const PersonalRecordCard: React.FC<PersonalRecordCardProps> = ({ records }) => {
  const topRecords = records.slice(0, 5);

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 backdrop-blur-md p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300">
          <Trophy className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-white font-bold">Personal Records</h3>
          <p className="text-xs text-amber-200/70">Top PRs từ lịch sử tập luyện</p>
        </div>
      </div>

      {topRecords.length === 0 ? (
        <p className="text-sm text-gray-400">Chưa có PR nào. Hãy log set/rep/weight để bắt đầu theo dõi.</p>
      ) : (
        <div className="space-y-3">
          {topRecords.map((record) => (
            <div key={`${record.exerciseName}-${record.achievedAt}`} className="rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-bold text-white">{record.exerciseName}</p>
                <p className="text-[11px] text-gray-400">{formatDate(record.achievedAt)}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1 text-emerald-300">
                  <TrendingUp className="w-3 h-3" /> 1RM: {formatNumber(record.maxEstimated1RM)} kg
                </div>
                <div className="flex items-center gap-1 text-cyan-300">
                  <Layers className="w-3 h-3" /> Volume: {formatNumber(record.maxVolume)}
                </div>
                <div className="flex items-center gap-1 text-blue-300">
                  <Weight className="w-3 h-3" /> Max: {formatNumber(record.maxWeight)} kg
                </div>
                <div className="flex items-center gap-1 text-fuchsia-300">
                  <Hash className="w-3 h-3" /> Reps: {formatNumber(record.bestSetReps)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

import React from 'react';
import type { WorkoutHistoryItem } from '../../types';
import { getActiveRecoverySuggestion } from '../../services/activeRecoveryService';
import { Sparkles } from 'lucide-react';

interface ActiveRecoveryCardProps {
  history: WorkoutHistoryItem[];
}

export const ActiveRecoveryCard: React.FC<ActiveRecoveryCardProps> = ({ history }) => {
  const suggestion = getActiveRecoverySuggestion(history);

  if (!suggestion.enabled) {
    return (
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
        <h3 className="text-sm font-bold text-emerald-300">Active Recovery</h3>
        <p className="text-xs text-gray-400 mt-1">{suggestion.reason}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-emerald-300" />
        <h3 className="text-sm font-bold text-emerald-300">{suggestion.title}</h3>
      </div>
      <p className="text-xs text-gray-300">{suggestion.reason}</p>
      <div className="space-y-2">
        {suggestion.exercises.map((ex) => (
          <div key={ex.name} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-gray-200">
            <div className="font-semibold text-white">{ex.name}</div>
            <div>{ex.reps}</div>
            {ex.notes && <div className="text-gray-400 mt-0.5">{ex.notes}</div>}
          </div>
        ))}
      </div>
    </div>
  );
};

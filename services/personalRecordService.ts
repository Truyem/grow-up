import type { ExerciseLog, PersonalRecord, WorkoutHistoryItem } from '../types';

const estimate1RM = (weight: number, reps: number): number => {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
};

const normalizeExerciseName = (name: string): string => {
  return (name || '').trim().toLowerCase();
};

const buildRecordFromLog = (log: ExerciseLog, achievedAt: number): PersonalRecord | null => {
  if (!log || !log.exerciseName) return null;
  const validSets = (log.sets || []).filter((s) => s.weight > 0 && s.reps > 0);
  if (validSets.length === 0) return null;

  let maxEstimated1RM = 0;
  let maxWeight = 0;
  let bestSetReps = 0;

  validSets.forEach((set) => {
    if (set.weight > maxWeight) maxWeight = set.weight;
    if (set.reps > bestSetReps) bestSetReps = set.reps;
    const rm = estimate1RM(set.weight, set.reps);
    if (rm > maxEstimated1RM) maxEstimated1RM = rm;
  });

  return {
    exerciseName: log.exerciseName,
    maxEstimated1RM,
    maxVolume: log.totalVolume || 0,
    maxWeight,
    bestSetReps,
    achievedAt,
  };
};

const mergeRecords = (current: PersonalRecord, candidate: PersonalRecord): PersonalRecord => {
  const isImproved =
    candidate.maxEstimated1RM > current.maxEstimated1RM ||
    candidate.maxVolume > current.maxVolume ||
    candidate.maxWeight > current.maxWeight ||
    candidate.bestSetReps > current.bestSetReps;

  if (!isImproved) return current;

  return {
    exerciseName: current.exerciseName,
    maxEstimated1RM: Math.max(current.maxEstimated1RM, candidate.maxEstimated1RM),
    maxVolume: Math.max(current.maxVolume, candidate.maxVolume),
    maxWeight: Math.max(current.maxWeight, candidate.maxWeight),
    bestSetReps: Math.max(current.bestSetReps, candidate.bestSetReps),
    achievedAt: candidate.achievedAt,
  };
};

export const calculatePersonalRecords = (history: WorkoutHistoryItem[]): PersonalRecord[] => {
  const recordMap = new Map<string, PersonalRecord>();

  (history || []).forEach((entry) => {
    const logs = entry.exerciseLogs || [];
    logs.forEach((log) => {
      const candidate = buildRecordFromLog(log, entry.timestamp);
      if (!candidate) return;

      const key = normalizeExerciseName(candidate.exerciseName);
      const existing = recordMap.get(key);

      if (!existing) {
        recordMap.set(key, candidate);
      } else {
        recordMap.set(key, mergeRecords(existing, candidate));
      }
    });
  });

  return Array.from(recordMap.values()).sort((a, b) => b.achievedAt - a.achievedAt);
};

export interface PersonalRecordDelta {
  exerciseName: string;
  previous: PersonalRecord | null;
  current: PersonalRecord;
  improvedFields: Array<'maxEstimated1RM' | 'maxVolume' | 'maxWeight' | 'bestSetReps'>;
}

export const detectPersonalRecordDeltas = (
  previousRecords: PersonalRecord[],
  nextRecords: PersonalRecord[]
): PersonalRecordDelta[] => {
  const prevMap = new Map<string, PersonalRecord>();
  previousRecords.forEach((r) => prevMap.set(normalizeExerciseName(r.exerciseName), r));

  const deltas: PersonalRecordDelta[] = [];

  nextRecords.forEach((current) => {
    const prev = prevMap.get(normalizeExerciseName(current.exerciseName)) || null;
    const improvedFields: PersonalRecordDelta['improvedFields'] = [];

    if (!prev || current.maxEstimated1RM > prev.maxEstimated1RM) improvedFields.push('maxEstimated1RM');
    if (!prev || current.maxVolume > prev.maxVolume) improvedFields.push('maxVolume');
    if (!prev || current.maxWeight > prev.maxWeight) improvedFields.push('maxWeight');
    if (!prev || current.bestSetReps > prev.bestSetReps) improvedFields.push('bestSetReps');

    if (improvedFields.length > 0) {
      deltas.push({
        exerciseName: current.exerciseName,
        previous: prev,
        current,
        improvedFields,
      });
    }
  });

  return deltas;
};

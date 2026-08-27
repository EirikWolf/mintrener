import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateDoubleProgression,
  saveExerciseSetsLog,
  getLatestExerciseLog,
} from '../strengthProgressionService';
import { StrengthSetLog } from '../../schemas/strengthSchema';

describe('strengthProgressionService (Dobbel Progresjon)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('foreslår +2.5 kg for overkropp når alle 3 sett når 12 reps', () => {
    const sets: StrengthSetLog[] = [
      { setIndex: 1, targetReps: 12, targetWeightKg: 20, loggedReps: 12, isCompleted: true },
      { setIndex: 2, targetReps: 12, targetWeightKg: 20, loggedReps: 12, isCompleted: true },
      { setIndex: 3, targetReps: 12, targetWeightKg: 20, loggedReps: 12, isCompleted: true },
    ];

    const result = calculateDoubleProgression(sets, [8, 12], true, 20.0);
    expect(result.shouldIncreaseWeight).toBe(true);
    expect(result.nextWeightKg).toBe(22.5);
    expect(result.nextTargetReps).toBe(8);
  });

  it('foreslår +5.0 kg for underkropp når alle 3 sett når 12 reps', () => {
    const sets: StrengthSetLog[] = [
      { setIndex: 1, targetReps: 12, targetWeightKg: 60, loggedReps: 12, isCompleted: true },
      { setIndex: 2, targetReps: 12, targetWeightKg: 60, loggedReps: 12, isCompleted: true },
      { setIndex: 3, targetReps: 12, targetWeightKg: 60, loggedReps: 12, isCompleted: true },
    ];

    const result = calculateDoubleProgression(sets, [8, 12], false, 60.0);
    expect(result.shouldIncreaseWeight).toBe(true);
    expect(result.nextWeightKg).toBe(65.0);
    expect(result.nextTargetReps).toBe(8);
  });

  it('beholder vekten hvis ikke alle sett når toppmålet', () => {
    const sets: StrengthSetLog[] = [
      { setIndex: 1, targetReps: 12, targetWeightKg: 20, loggedReps: 12, isCompleted: true },
      { setIndex: 2, targetReps: 12, targetWeightKg: 20, loggedReps: 11, isCompleted: true },
      { setIndex: 3, targetReps: 12, targetWeightKg: 20, loggedReps: 9, isCompleted: true },
    ];

    const result = calculateDoubleProgression(sets, [8, 12], true, 20.0);
    expect(result.shouldIncreaseWeight).toBe(false);
    expect(result.nextWeightKg).toBe(20.0);
  });

  it('lagrer og henter styrkelogg', () => {
    const sets: StrengthSetLog[] = [
      { setIndex: 1, targetReps: 10, targetWeightKg: 0, loggedReps: 10, isCompleted: true },
    ];
    saveExerciseSetsLog('push-ups', sets, 0);

    const log = getLatestExerciseLog('push-ups');
    expect(log).toBeDefined();
    expect(log?.sets[0].reps).toBe(10);
  });
});

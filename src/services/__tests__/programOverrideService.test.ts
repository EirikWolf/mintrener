import { describe, it, expect, beforeEach } from 'vitest';
import {
  getProgramOverrides,
  setExerciseOverride,
  removeExerciseOverride,
  applyProgramOverrides,
} from '../programOverrideService';
import { WorkoutTemplate } from '../../types/workout';

describe('programOverrideService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('lagrer og henter øvelsesbytter', () => {
    setExerciseOverride('prog-1', 'push-ups', 'kneboy');
    const overrides = getProgramOverrides('prog-1');
    expect(overrides['push-ups']).toBe('kneboy');
  });

  it('anvender øvelsesbytte på en WorkoutTemplate', () => {
    setExerciseOverride('prog-1', 'push-ups', 'kneboy');

    const originalWorkout: WorkoutTemplate = {
      id: 'prog-1',
      name: 'Testøkt',
      description: 'Testøkt for overstyring',
      type: 'custom',
      rounds: 1,
      prepareDurationSeconds: 5,
      roundRestDurationSeconds: 0,
      items: [
        {
          id: 'i1',
          exercise: { id: 'push-ups', name: 'Armhevinger', category: 'bodyweight' },
          workDurationSeconds: 30,
          restDurationSeconds: 10,
        },
      ],
    };

    const updated = applyProgramOverrides('prog-1', originalWorkout);
    expect(updated.items[0].exercise.id).toBe('kneboy');
    expect(updated.items[0].exercise.name).toBe('Knebøy');
  });

  it('kan fjerne et øvelsesbytte', () => {
    setExerciseOverride('prog-1', 'push-ups', 'kneboy');
    removeExerciseOverride('prog-1', 'push-ups');
    const overrides = getProgramOverrides('prog-1');
    expect(overrides['push-ups']).toBeUndefined();
  });
});

import { describe, it, expect } from 'vitest';
import {
  findAlternativeExercise,
  adaptWorkoutForPain,
  PAIN_POINTS,
} from '../injuryAlternativeService';
import { WorkoutTemplate } from '../../types/workout';

describe('injuryAlternativeService', () => {
  it('identifies exercise conflict and returns joint-friendly alternative for knees', () => {
    const alt = findAlternativeExercise('knebøy', ['kne']);
    expect(alt).not.toBeNull();
    expect(alt?.alternativeId).toBe('glute-bridge-bekkenhev');
  });

  it('identifies shoulder conflict for pushups and dips', () => {
    const altPush = findAlternativeExercise('push-ups', ['skulder']);
    expect(altPush?.alternativeId).toBe('desk-pushups-stol');

    const altDips = findAlternativeExercise('dips-stol', ['skulder']);
    expect(altDips?.alternativeId).toBe('brystapner-i-dorapning');
  });

  it('adapts whole workout replacing conflicting exercises cleanly', () => {
    const originalWorkout: WorkoutTemplate = {
      id: 'test-tabata',
      name: 'Fullkropp Tabata',
      description: 'Høy puls og styrke',
      type: 'tabata',
      rounds: 1,
      prepareDurationSeconds: 5,
      roundRestDurationSeconds: 10,
      items: [
        {
          id: 'i1',
          exercise: { id: 'knebøy', name: 'Knebøy', category: 'bodyweight' },
          workDurationSeconds: 20,
          restDurationSeconds: 10,
        },
        {
          id: 'i2',
          exercise: { id: 'push-ups', name: 'Push-ups', category: 'bodyweight' },
          workDurationSeconds: 20,
          restDurationSeconds: 10,
        },
      ],
    };

    const { adaptedWorkout, modifiedCount, replacements } = adaptWorkoutForPain(
      originalWorkout,
      ['kne']
    );

    expect(modifiedCount).toBe(1);
    expect(replacements[0].original).toBe('Knebøy');
    expect(adaptedWorkout.items[0].exercise.name).toBe('Seteløft / Glute Bridge');
    expect(adaptedWorkout.items[1].exercise.name).toBe('Push-ups'); // Unaffected
    expect(adaptedWorkout.name).toContain('(Skånsom)');
  });

  it('provides all 5 core pain point categories', () => {
    expect(PAIN_POINTS.length).toBe(5);
  });
});

import { describe, it, expect } from 'vitest';
import { checkAdaptiveProgression } from '../adaptiveProgressionService';
import { WorkoutTemplate } from '../../types/workout';
import { CompletedWorkoutLog } from '../../types/models';

const sampleWorkout: WorkoutTemplate = {
  id: 'tabata-1',
  name: 'Klassisk Tabata',
  description: 'Test tabata',
  type: 'tabata',
  prepareDurationSeconds: 10,
  rounds: 1,
  roundRestDurationSeconds: 0,
  items: [
    {
      id: 'i1',
      exercise: { id: 'kneboy', name: 'Knebøy', category: 'bodyweight' },
      workDurationSeconds: 20,
      restDurationSeconds: 10,
    },
  ],
};

describe('Adaptive Progression Service', () => {
  it('foreslår nivåoppgradering ved 2 "for_lett" på rad', () => {
    const history: CompletedWorkoutLog[] = [
      {
        id: 'l1',
        userId: 'u1',
        workoutId: 'tabata-1',
        workoutName: 'Klassisk Tabata',
        workoutType: 'tabata',
        completedAt: new Date(Date.now() - 1000).toISOString(),
        durationSeconds: 240,
        roundsCompleted: 1,
        totalRounds: 1,
        difficultyRating: 'for_lett',
      },
      {
        id: 'l2',
        userId: 'u1',
        workoutId: 'tabata-1',
        workoutName: 'Klassisk Tabata',
        workoutType: 'tabata',
        completedAt: new Date(Date.now() - 200000).toISOString(),
        durationSeconds: 240,
        roundsCompleted: 1,
        totalRounds: 1,
        difficultyRating: 'for_lett',
      },
    ];

    const suggestion = checkAdaptiveProgression(sampleWorkout, history);
    expect(suggestion).not.toBeNull();
    expect(suggestion?.type).toBe('increase');
    expect(suggestion?.adaptedWorkout.items[0].workDurationSeconds).toBe(25);
    expect(suggestion?.adaptedWorkout.items[0].restDurationSeconds).toBe(8);
  });

  it('foreslår justering nedover ved 2 "for_tungt" på rad', () => {
    const history: CompletedWorkoutLog[] = [
      {
        id: 'l1',
        userId: 'u1',
        workoutId: 'tabata-1',
        workoutName: 'Klassisk Tabata',
        workoutType: 'tabata',
        completedAt: new Date(Date.now() - 1000).toISOString(),
        durationSeconds: 240,
        roundsCompleted: 1,
        totalRounds: 1,
        difficultyRating: 'for_tungt',
      },
      {
        id: 'l2',
        userId: 'u1',
        workoutId: 'tabata-1',
        workoutName: 'Klassisk Tabata',
        workoutType: 'tabata',
        completedAt: new Date(Date.now() - 200000).toISOString(),
        durationSeconds: 240,
        roundsCompleted: 1,
        totalRounds: 1,
        difficultyRating: 'for_tungt',
      },
    ];

    const suggestion = checkAdaptiveProgression(sampleWorkout, history);
    expect(suggestion).not.toBeNull();
    expect(suggestion?.type).toBe('decrease');
    expect(suggestion?.adaptedWorkout.items[0].workDurationSeconds).toBe(15);
    expect(suggestion?.adaptedWorkout.items[0].restDurationSeconds).toBe(15);
  });

  it('gir null hvis mindre enn 2 logger eller blandet vurdering', () => {
    const history: CompletedWorkoutLog[] = [
      {
        id: 'l1',
        userId: 'u1',
        workoutId: 'tabata-1',
        workoutName: 'Klassisk Tabata',
        workoutType: 'tabata',
        completedAt: new Date().toISOString(),
        durationSeconds: 240,
        roundsCompleted: 1,
        totalRounds: 1,
        difficultyRating: 'passe',
      },
    ];

    expect(checkAdaptiveProgression(sampleWorkout, history)).toBeNull();
  });
});

import { describe, it, expect } from 'vitest';
import {
  assessFatigueAndDeload,
  convertToDeloadWorkout,
} from '../fatigueDeloadService';
import { CompletedWorkoutLog } from '../../types/models';
import { WorkoutTemplate } from '../../types/workout';

describe('fatigueDeloadService', () => {
  it('detects consecutive incomplete/heavy workouts and triggers deload recommendation', () => {
    const heavySessions: CompletedWorkoutLog[] = [
      {
        id: 's1',
        userId: 'u1',
        workoutId: 'w1',
        workoutName: 'Hard Tabata',
        workoutType: 'tabata',
        completedAt: new Date().toISOString(),
        durationSeconds: 120,
        roundsCompleted: 1,
        totalRounds: 4, // Incomplete
      },
      {
        id: 's2',
        userId: 'u1',
        workoutId: 'w1',
        workoutName: 'Hard Tabata',
        workoutType: 'tabata',
        completedAt: new Date().toISOString(),
        durationSeconds: 100,
        roundsCompleted: 1,
        totalRounds: 4, // Incomplete
      },
    ];

    const assessment = assessFatigueAndDeload(heavySessions);
    expect(assessment.needsDeload).toBe(true);
    expect(assessment.consecutiveHardWorkouts).toBe(2);
  });

  it('converts workout into gentle deload session with reduced work and increased rest', () => {
    const workout: WorkoutTemplate = {
      id: 'tabata',
      name: 'Intens Tabata',
      description: 'Maks innsats',
      type: 'tabata',
      rounds: 4,
      prepareDurationSeconds: 5,
      roundRestDurationSeconds: 60,
      items: [
        {
          id: 'i1',
          exercise: { id: 'knebøy', name: 'Knebøy', category: 'bodyweight' },
          workDurationSeconds: 40,
          restDurationSeconds: 10,
        },
      ],
    };

    const deload = convertToDeloadWorkout(workout);
    expect(deload.name).toContain('(Deload Restitusjon)');
    expect(deload.rounds).toBeLessThanOrEqual(2);
    expect(deload.items[0].workDurationSeconds).toBeLessThan(40);
    expect(deload.items[0].restDurationSeconds).toBeGreaterThanOrEqual(20);
  });
});

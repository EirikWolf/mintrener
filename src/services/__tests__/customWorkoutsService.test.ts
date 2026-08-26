import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateWorkoutDuration,
  applyUniformDurations,
  saveCustomWorkout,
  getLocalCustomWorkouts,
  deleteCustomWorkout,
} from '../customWorkoutsService';
import { WorkoutTemplate, IntervalItem } from '../../types/workout';

describe('Custom Workouts Service', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const mockWorkout: WorkoutTemplate = {
    id: 'my-custom-workout',
    name: 'Min Testøkt',
    description: 'En rask testøkt',
    type: 'custom',
    prepareDurationSeconds: 10,
    rounds: 2,
    roundRestDurationSeconds: 30,
    items: [
      {
        id: 'item-1',
        exercise: { id: 'kneboy', name: 'Knebøy' },
        workDurationSeconds: 30,
        restDurationSeconds: 15,
      },
      {
        id: 'item-2',
        exercise: { id: 'push-ups', name: 'Push-ups' },
        workDurationSeconds: 30,
        restDurationSeconds: 15,
      },
    ],
  };

  it('beregner nøyaktig totalvarighet for fler-rundes økt uten pause etter aller siste øvelse', () => {
    // 10s prepare
    // Runde 1: (30s+15s) + (30s+15s) + 30s roundRest = 120s
    // Runde 2: (30s+15s) + 30s (siste arbeid, ingen pause etterpå) = 75s
    // Sum = 10 + 120 + 75 = 205 sekunder
    const total = calculateWorkoutDuration(mockWorkout);
    expect(total).toBe(205);
  });

  it('anvender felles arbeid- og pausetid på alle øvelser med applyUniformDurations', () => {
    const items: IntervalItem[] = [
      { id: '1', exercise: { id: 'e1', name: 'A' }, workDurationSeconds: 10, restDurationSeconds: 5 },
      { id: '2', exercise: { id: 'e2', name: 'B' }, workDurationSeconds: 40, restDurationSeconds: 20 },
    ];

    const updated = applyUniformDurations(items, 25, 10);
    expect(updated[0].workDurationSeconds).toBe(25);
    expect(updated[0].restDurationSeconds).toBe(10);
    expect(updated[1].workDurationSeconds).toBe(25);
    expect(updated[1].restDurationSeconds).toBe(10);
  });

  it('lagrer, henter og sletter egne økter i lokal lagring', async () => {
    expect(getLocalCustomWorkouts()).toEqual([]);

    await saveCustomWorkout(mockWorkout);
    const saved = getLocalCustomWorkouts();
    expect(saved.length).toBe(1);
    expect(saved[0].name).toBe('Min Testøkt');

    await deleteCustomWorkout(mockWorkout.id);
    expect(getLocalCustomWorkouts()).toEqual([]);
  });
});

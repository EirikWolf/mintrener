import { describe, it, expect } from 'vitest';
import { generateCustomAiWorkout } from '../aiWorkoutGeneratorService';

describe('aiWorkoutGeneratorService', () => {
  it('genererer en tilpasset 5-minutters kontorøkt for nakke og skuldre', () => {
    const workout = generateCustomAiWorkout({
      durationMinutes: 5,
      focus: 'kontor_nakke',
      energyLevel: 'middels',
    });

    expect(workout.name).toContain('Nakke, Skuldre');
    expect(workout.items.length).toBeGreaterThan(0);
    expect(workout.rounds).toBeGreaterThanOrEqual(1);
  });

  it('unngår hopp og knær-belastende øvelser ved skader', () => {
    const workout = generateCustomAiWorkout({
      durationMinutes: 10,
      focus: 'helkropp',
      avoidInjuries: ['knær', 'hopp'],
    });

    workout.items.forEach((item) => {
      expect(item.exercise.id).not.toContain('burpee');
      expect(item.exercise.id).not.toContain('hopp');
    });
  });

  it('tilpasser hvileintervaller ved lavt energinivå', () => {
    const workout = generateCustomAiWorkout({
      durationMinutes: 6,
      focus: 'rolig_strekk',
      energyLevel: 'lav',
    });

    expect(workout.items[0].restDurationSeconds).toBe(25);
  });
});

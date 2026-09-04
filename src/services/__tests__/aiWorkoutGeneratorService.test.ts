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

  it('gir aldri skadelige øvelser selv ved mange skader (ingen stille fallback til hele biblioteket)', () => {
    const workout = generateCustomAiWorkout({
      durationMinutes: 15,
      focus: 'helkropp',
      avoidInjuries: ['knær', 'korsrygg', 'skuldre', 'hopp', 'håndledd'],
    });

    workout.items.forEach((item) => {
      expect(item.exercise.id).not.toContain('burpee');
      expect(item.exercise.id).not.toContain('hopp');
      expect(item.exercise.id).not.toContain('deadlift');
      expect(item.exercise.id).not.toContain('push-up');
      expect(item.exercise.id).not.toContain('planke');
      expect(item.exercise.id).not.toContain('kneboy');
    });
    expect(workout.items.length).toBeGreaterThanOrEqual(1);
  });

  it('tilpasser hvileintervaller ved lavt energinivå', () => {
    const workout = generateCustomAiWorkout({
      durationMinutes: 6,
      focus: 'rolig_strekk',
      energyLevel: 'lav',
    });

    expect(workout.items[0].restDurationSeconds).toBe(25);
  });

  it('genererer full 60-minutters treningsøkt med flere runder', () => {
    const workout = generateCustomAiWorkout({
      durationMinutes: 60,
      focus: 'styrke',
      energyLevel: 'høy',
    });

    expect(workout.name).toContain('60 min');
    expect(workout.rounds).toBeGreaterThanOrEqual(10);
    expect(workout.items.length).toBeGreaterThanOrEqual(4);
  });

  it('støtter eksplisitt pacingRatio (Tabata 20s/10s, Rolig 30s/30s, EMOM 50s/10s, Standard 40s/20s)', () => {
    const tabata = generateCustomAiWorkout({
      durationMinutes: 4,
      focus: 'helkropp',
      pacingRatio: 'tabata_2_1',
    });
    expect(tabata.items[0].workDurationSeconds).toBe(20);
    expect(tabata.items[0].restDurationSeconds).toBe(10);

    const rolig = generateCustomAiWorkout({
      durationMinutes: 6,
      focus: 'helkropp',
      pacingRatio: 'rolig_1_1',
    });
    expect(rolig.items[0].workDurationSeconds).toBe(30);
    expect(rolig.items[0].restDurationSeconds).toBe(30);

    const emom = generateCustomAiWorkout({
      durationMinutes: 10,
      focus: 'helkropp',
      pacingRatio: 'emom_5_1',
    });
    expect(emom.items[0].workDurationSeconds).toBe(50);
    expect(emom.items[0].restDurationSeconds).toBe(10);

    const standard = generateCustomAiWorkout({
      durationMinutes: 8,
      focus: 'helkropp',
      pacingRatio: 'standard_2_1',
    });
    expect(standard.items[0].workDurationSeconds).toBe(40);
    expect(standard.items[0].restDurationSeconds).toBe(20);
  });
});

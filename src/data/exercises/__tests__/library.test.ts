import { describe, it, expect } from 'vitest';
import { EXERCISE_LIBRARY, filterExercises, ALL_RAW_EXERCISES } from '../index';

describe('Exercise Library & Filtering', () => {
  it('alle øvelser i biblioteket er 100% gyldige mot JSON Schema', () => {
    expect(EXERCISE_LIBRARY.length).toBeGreaterThanOrEqual(20);
    expect(EXERCISE_LIBRARY.length).toBe(ALL_RAW_EXERCISES.length);
  });

  it('filtrerer korrekt på kategori (kroppsvekt, kettlebell, mobilitet)', () => {
    const bodyweight = filterExercises(EXERCISE_LIBRARY, { kategori: 'kroppsvekt' });
    expect(bodyweight.length).toBeGreaterThan(0);
    bodyweight.forEach((ex) => expect(ex.kategori).toBe('kroppsvekt'));

    const kettlebell = filterExercises(EXERCISE_LIBRARY, { kategori: 'kettlebell' });
    expect(kettlebell.length).toBeGreaterThan(0);
    kettlebell.forEach((ex) => expect(ex.kategori).toBe('kettlebell'));
  });

  it('søker på tekst i navn og muskelgrupper', () => {
    const pushups = filterExercises(EXERCISE_LIBRARY, { query: 'push' });
    expect(pushups.some((e) => e.id === 'push-ups')).toBe(true);

    const glutes = filterExercises(EXERCISE_LIBRARY, { query: 'sete' });
    expect(glutes.length).toBeGreaterThan(0);
  });

  it('filtrerer på utstyr (kettlebell, manualer, ingen)', () => {
    const noEquipment = filterExercises(EXERCISE_LIBRARY, { utstyr: 'ingen' });
    expect(noEquipment.length).toBeGreaterThan(0);
    noEquipment.forEach((ex) => expect(ex.utstyr).toContain('ingen'));
  });
});

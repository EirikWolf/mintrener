import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getLocalCustomExercises,
  saveLocalCustomExercise,
  deleteLocalCustomExercise,
  saveCustomExercise,
} from '../customExercisesService';

describe('CustomExercisesService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('lagrer og henter egendefinerte øvelser lokalt med fri varighet', async () => {
    const custom = await saveCustomExercise(null, {
      navn: { nb: 'Romaskin Intervall', en: 'Rowing Machine' },
      kategori: 'kondisjon',
      type: 'tid',
      muskler: { primær: ['rygg', 'lår'], sekundær: ['biceps'] },
      utstyr: ['annet'],
      nivå: 'middels',
      sensorProfil: 'ingen',
      bildeVinkel: 'side',
      instruks: { nb: ['Rask roing i høyt tempo'] },
      vanligeFeil: { nb: ['Krum rygg'] },
      defaultDurationSeconds: 900, // 15 minutter
    });

    expect(custom.id).toContain('custom-');
    expect(custom.defaultDurationSeconds).toBe(900);
    expect(custom.isCustom).toBe(true);

    const list = getLocalCustomExercises();
    expect(list.length).toBe(1);
    expect(list[0].navn.nb).toBe('Romaskin Intervall');
    expect(list[0].defaultDurationSeconds).toBe(900);
  });

  it('sletter en egendefinert øvelse lokalt', () => {
    saveLocalCustomExercise({
      id: 'custom-123',
      navn: { nb: 'Test' },
      kategori: 'kroppsvekt',
      type: 'tid',
      muskler: { primær: ['kjerne'], sekundær: [] },
      utstyr: ['ingen'],
      nivå: 'nybegynner',
      sensorProfil: 'ingen',
      bildeVinkel: 'side',
      instruks: { nb: [] },
      vanligeFeil: { nb: [] },
      bildeStatus: 'mangler',
      defaultDurationSeconds: 50,
    });

    expect(getLocalCustomExercises().length).toBe(1);
    deleteLocalCustomExercise('custom-123');
    expect(getLocalCustomExercises().length).toBe(0);
  });
});

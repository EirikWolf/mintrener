import { describe, it, expect, beforeEach } from 'vitest';
import {
  WORKOUT_HISTORY_KEY,
  LEGACY_WORKOUT_HISTORY_KEYS,
  migrateWorkoutHistoryKeys,
} from '../workoutHistoryStorage';
import { CompletedWorkoutLog } from '../../types/models';

function makeLog(id: string, completedAt: string): CompletedWorkoutLog {
  return {
    id,
    userId: 'anonymous',
    workoutId: 'w1',
    workoutName: 'Testøkt',
    workoutType: 'tabata',
    durationSeconds: 300,
    roundsCompleted: 4,
    totalRounds: 4,
    completedAt,
  };
}

function readHistory(): CompletedWorkoutLog[] {
  return JSON.parse(localStorage.getItem(WORKOUT_HISTORY_KEY) || '[]');
}

describe('workoutHistoryStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('eksporterer den kanoniske nøkkelen som resten av appen skriver til', () => {
    expect(WORKOUT_HISTORY_KEY).toBe('mintrener_local_workout_history');
  });

  it('lister begge de historiske feilnøklene som legacy', () => {
    expect(LEGACY_WORKOUT_HISTORY_KEYS).toContain('mintrener_local_history');
    expect(LEGACY_WORKOUT_HISTORY_KEYS).toContain('mintrener_workout_history');
  });

  describe('migrateWorkoutHistoryKeys', () => {
    it('flytter data fra gammel nøkkel til kanonisk nøkkel og sletter den gamle', () => {
      const old = [makeLog('a', '2026-08-01T10:00:00.000Z')];
      localStorage.setItem('mintrener_local_history', JSON.stringify(old));

      migrateWorkoutHistoryKeys();

      expect(readHistory()).toEqual(old);
      expect(localStorage.getItem('mintrener_local_history')).toBeNull();
    });

    it('flytter data fra badge-varianten av nøkkelen også', () => {
      const old = [makeLog('b', '2026-08-02T10:00:00.000Z')];
      localStorage.setItem('mintrener_workout_history', JSON.stringify(old));

      migrateWorkoutHistoryKeys();

      expect(readHistory()).toEqual(old);
      expect(localStorage.getItem('mintrener_workout_history')).toBeNull();
    });

    it('slår sammen med eksisterende data uten duplikater, nyeste først', () => {
      const existing = makeLog('a', '2026-08-03T10:00:00.000Z');
      const fromOld = makeLog('c', '2026-08-05T10:00:00.000Z');
      // Duplikat-id i gammel nøkkel skal ikke overskrive den kanoniske
      const duplicate = { ...makeLog('a', '2026-08-01T10:00:00.000Z'), workoutName: 'Gammel' };
      localStorage.setItem(WORKOUT_HISTORY_KEY, JSON.stringify([existing]));
      localStorage.setItem('mintrener_local_history', JSON.stringify([fromOld, duplicate]));

      migrateWorkoutHistoryKeys();

      expect(readHistory()).toEqual([fromOld, existing]);
    });

    it('sletter gammel nøkkel med korrupt JSON uten å røre kanonisk nøkkel', () => {
      const existing = [makeLog('a', '2026-08-03T10:00:00.000Z')];
      localStorage.setItem(WORKOUT_HISTORY_KEY, JSON.stringify(existing));
      localStorage.setItem('mintrener_local_history', '{ikke json');

      migrateWorkoutHistoryKeys();

      expect(readHistory()).toEqual(existing);
      expect(localStorage.getItem('mintrener_local_history')).toBeNull();
    });

    it('gjør ingenting når ingen gamle nøkler finnes', () => {
      const existing = JSON.stringify([makeLog('a', '2026-08-03T10:00:00.000Z')]);
      localStorage.setItem(WORKOUT_HISTORY_KEY, existing);

      migrateWorkoutHistoryKeys();

      // Uendret innhold – ingen unødvendig reserialisering
      expect(localStorage.getItem(WORKOUT_HISTORY_KEY)).toBe(existing);
    });
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mockes FØR import av tjenesten: unngår ekte Firebase-init og lar oss
// tvinge frem Firestore-feil for å teste feil-toast-koblingen.
vi.mock('../firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  getDocs: vi.fn(),
  deleteDoc: vi.fn(),
  serverTimestamp: vi.fn(),
}));

import { setDoc } from 'firebase/firestore';
import {
  saveCompletedWorkout,
  getUserWorkoutHistory,
} from '../firestoreService';
import { getErrorToast, dismissErrorToast } from '../errorToastService';

const HISTORY_KEY = 'mintrener_local_workout_history';

const validLog = {
  id: 'log-old',
  userId: 'anonymous',
  workoutId: 'w1',
  workoutName: 'Gammel økt',
  workoutType: 'tabata',
  durationSeconds: 120,
  roundsCompleted: 2,
  totalRounds: 2,
  completedAt: '2026-08-28T10:00:00.000Z',
};

const newLogData = {
  workoutId: 'w2',
  workoutName: 'Ny økt',
  workoutType: 'custom',
  durationSeconds: 300,
  roundsCompleted: 3,
  totalRounds: 3,
};

describe('firestoreService — lokal historikk med skjemavalidering', () => {
  beforeEach(() => {
    localStorage.clear();
    dismissErrorToast();
    vi.mocked(setDoc).mockReset();
    vi.mocked(setDoc).mockResolvedValue(undefined);
  });

  it('lagrer ny økt lokalt selv om eksisterende historikk er korrupt (fallback til tom liste)', async () => {
    localStorage.setItem(HISTORY_KEY, '{{{korrupt');

    const id = await saveCompletedWorkout(null, newLogData);
    expect(id).toBeTruthy();

    const stored = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    expect(stored).toHaveLength(1);
    expect(stored[0].workoutName).toBe('Ny økt');
  });

  it('getUserWorkoutHistory filtrerer bort ugyldige innslag men beholder gyldige', async () => {
    localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify([validLog, { id: 'ødelagt' }, 42])
    );

    const history = await getUserWorkoutHistory(null);
    expect(history).toHaveLength(1);
    expect(history[0].workoutName).toBe('Gammel økt');
  });

  it('getUserWorkoutHistory faller tilbake til tom liste ved korrupt lagring', async () => {
    localStorage.setItem(HISTORY_KEY, 'ikke json');
    expect(await getUserWorkoutHistory(null)).toEqual([]);
  });

  it('viser feil-toast når Firestore-synk av øktlagring feiler (innlogget bruker)', async () => {
    vi.mocked(setDoc).mockRejectedValue(new Error('offline'));

    const id = await saveCompletedWorkout('user-123', newLogData);

    // Lokal lagring skal fortsatt ha lykkes
    expect(id).toBeTruthy();
    const stored = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    expect(stored).toHaveLength(1);

    // ...men brukeren skal få beskjed om at skyen ikke fikk økten
    expect(getErrorToast()?.message).toMatch(/sky/i);
  });

  it('viser ikke feil-toast når lagringen lykkes', async () => {
    await saveCompletedWorkout('user-123', newLogData);
    expect(getErrorToast()).toBeNull();
  });

  it('dobbel feil (lokal + synk): toasten forteller hele sannheten, ikke bare synk-delen', async () => {
    const setItemSpy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
    vi.mocked(setDoc).mockRejectedValue(new Error('offline'));

    try {
      await saveCompletedWorkout('user-123', newLogData);
    } finally {
      setItemSpy.mockRestore();
    }

    // «lagret på enheten, men …» ville vært løgn — begge lagringene feilet
    expect(getErrorToast()?.message).toMatch(/verken/i);
    expect(getErrorToast()?.message).not.toMatch(/ble lagret/i);
  });

  it('kun lokal feil (anonym bruker): toasten melder lokal-feilen', async () => {
    const setItemSpy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

    try {
      await saveCompletedWorkout(null, newLogData);
    } finally {
      setItemSpy.mockRestore();
    }

    expect(getErrorToast()?.message).toMatch(/lokalt/i);
    expect(getErrorToast()?.message).not.toMatch(/sky/i);
  });
});

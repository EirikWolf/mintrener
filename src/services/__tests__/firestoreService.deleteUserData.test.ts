import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mocker Firestore slik at deleteUserData kan testes uten nettverk; alle
// samlinger rapporteres tomme så bare localStorage-oppryddingen er interessant.
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  collection: vi.fn(() => ({})),
  query: vi.fn(),
  orderBy: vi.fn(),
  getDocs: vi.fn(async () => ({ docs: [] })),
  deleteDoc: vi.fn(async () => undefined),
  serverTimestamp: vi.fn(),
}));

vi.mock('../firebase', () => ({
  db: {},
}));

import { deleteUserData } from '../firestoreService';
import { WORKOUT_HISTORY_KEY, LEGACY_WORKOUT_HISTORY_KEYS } from '../workoutHistoryStorage';

describe('deleteUserData – lokal opprydding (GDPR)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('fjerner den kanoniske historikknøkkelen som appen faktisk skriver til', async () => {
    localStorage.setItem(WORKOUT_HISTORY_KEY, '[{"id":"a"}]');

    await deleteUserData('user-1');

    expect(localStorage.getItem(WORKOUT_HISTORY_KEY)).toBeNull();
  });

  it('fjerner også legacy-historikknøklene', async () => {
    for (const key of LEGACY_WORKOUT_HISTORY_KEYS) {
      localStorage.setItem(key, '[]');
    }

    await deleteUserData('user-1');

    for (const key of LEGACY_WORKOUT_HISTORY_KEYS) {
      expect(localStorage.getItem(key)).toBeNull();
    }
  });
});

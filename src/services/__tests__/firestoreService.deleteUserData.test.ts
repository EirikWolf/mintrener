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

  it('fjerner alle egne øvelser, favoritter, profil, PR-er og innstillinger (komplett GDPR Art. 17)', async () => {
    localStorage.setItem('mintrener_local_custom_exercises', '[{"id":"e1"}]');
    localStorage.setItem('mintrener_favorite_program_ids', '["p1"]');
    localStorage.setItem('mintrener_user_profile', '{"birthYear":1985}');
    localStorage.setItem('mintrener_coach_persona', 'hardcore');
    localStorage.setItem('mintrener_weekly_goal', '3');
    localStorage.setItem('mintrener_personal_records', '{"kneboy":50}');
    localStorage.setItem('mintrener_badges', '["streak-3"]');
    localStorage.setItem('mintrener_custom_workouts', '[]');

    await deleteUserData('user-1');

    expect(localStorage.getItem('mintrener_local_custom_exercises')).toBeNull();
    expect(localStorage.getItem('mintrener_favorite_program_ids')).toBeNull();
    expect(localStorage.getItem('mintrener_user_profile')).toBeNull();
    expect(localStorage.getItem('mintrener_coach_persona')).toBeNull();
    expect(localStorage.getItem('mintrener_weekly_goal')).toBeNull();
    expect(localStorage.getItem('mintrener_personal_records')).toBeNull();
    expect(localStorage.getItem('mintrener_badges')).toBeNull();
    expect(localStorage.getItem('mintrener_custom_workouts')).toBeNull();
  });
});

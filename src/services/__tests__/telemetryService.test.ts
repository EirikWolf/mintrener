import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mocker firebase/firestore og ./firebase etter mønsteret fra
// clockSyncService.test.ts, slik at skriveformen (payload/merge) kan
// verifiseres uten nettverk eller ekte Firestore-instans.
const mockDoc = vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id }));
const mockSetDoc = vi.fn();
const mockGetDoc = vi.fn();
const mockIncrement = vi.fn((n: number) => ({ __increment: n }));
const mockServerTimestamp = vi.fn(() => 'SERVER_TIMESTAMP_SENTINEL');

vi.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => mockDoc(...(args as [unknown, string, string])),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  increment: (n: number) => mockIncrement(n),
  serverTimestamp: () => mockServerTimestamp(),
  // Brukes kun i typeposisjon i telemetryService, men eksporteres for sikkerhets skyld
  FieldValue: class {},
}));

vi.mock('../firebase', () => ({
  db: {},
}));

import {
  getTelemetryConsent,
  setTelemetryConsent,
  recordWorkoutTelemetry,
  recordEngagementEvent,
} from '../telemetryService';
import { WorkoutTemplate } from '../../types/workout';

const sampleWorkout: WorkoutTemplate = {
  id: 'test-w1',
  name: 'Test Workout',
  description: 'Test',
  type: 'tabata',
  prepareDurationSeconds: 5,
  rounds: 1,
  roundRestDurationSeconds: 0,
  items: [
    {
      id: 'i1',
      exercise: { id: 'kneboy', name: 'Knebøy', category: 'bodyweight' },
      workDurationSeconds: 20,
      restDurationSeconds: 10,
    },
  ],
};

describe('Telemetry Service (Privacy-Friendly)', () => {
  beforeEach(() => {
    localStorage.clear();
    mockDoc.mockClear();
    mockSetDoc.mockClear();
    mockGetDoc.mockClear();
    mockIncrement.mockClear();
    mockServerTimestamp.mockClear();
  });

  it('standard samtykke er true', () => {
    expect(getTelemetryConsent()).toBe(true);
  });

  it('kan slå av samtykke (opt-out)', () => {
    setTelemetryConsent(false);
    expect(getTelemetryConsent()).toBe(false);
  });

  it('respekterer opt-out uten feil', async () => {
    setTelemetryConsent(false);
    await expect(recordWorkoutTelemetry(sampleWorkout, 120, 'passe')).resolves.not.toThrow();
    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  describe('recordEngagementEvent (C1/C2)', () => {
    it('skriver flatt increment-felt + lastUpdated til global_stats/engagement', async () => {
      await recordEngagementEvent('onboarding_personaChosen_boyband');

      expect(mockDoc).toHaveBeenCalledWith(expect.anything(), 'global_stats', 'engagement');
      expect(mockSetDoc).toHaveBeenCalledTimes(1);
      expect(mockSetDoc).toHaveBeenCalledWith(
        { collection: 'global_stats', id: 'engagement' },
        {
          onboarding_personaChosen_boyband: { __increment: 1 },
          lastUpdated: 'SERVER_TIMESTAMP_SENTINEL',
        },
        { merge: true }
      );
    });

    it('gjør ingenting uten samtykke', async () => {
      setTelemetryConsent(false);
      await recordEngagementEvent('streak_broken');
      expect(mockSetDoc).not.toHaveBeenCalled();
    });
  });
});

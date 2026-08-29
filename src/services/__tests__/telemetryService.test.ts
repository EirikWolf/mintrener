import { describe, it, expect, beforeEach, vi } from 'vitest';

// Hindrer at den ekte firebase.ts initialiseres under collect (getAuth kaster
// auth/invalid-api-key i testmiljø); testene treffer aldri Firestore-veiene.
vi.mock('../firebase', () => ({ db: {}, auth: {} }));

import {
  getTelemetryConsent,
  setTelemetryConsent,
  recordWorkoutTelemetry,
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
  });
});

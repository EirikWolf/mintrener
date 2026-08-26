import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveInterruptedSession,
  getInterruptedSession,
  clearInterruptedSession,
} from '../sessionRecoveryService';
import { WorkoutTemplate } from '../../types/workout';

const mockWorkout: WorkoutTemplate = {
  id: 'test-1',
  name: 'Testøkt',
  description: 'Test',
  type: 'tabata',
  prepareDurationSeconds: 10,
  rounds: 2,
  roundRestDurationSeconds: 10,
  items: [],
};

describe('Session Recovery Service', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('lagrer og henter en avbrutt økt', () => {
    saveInterruptedSession({
      workout: mockWorkout,
      phase: 'work',
      currentRound: 1,
      currentItemIndex: 2,
      totalElapsedSeconds: 65,
    });

    const session = getInterruptedSession();
    expect(session).not.toBeNull();
    expect(session?.workout.id).toBe('test-1');
    expect(session?.currentRound).toBe(1);
    expect(session?.totalElapsedSeconds).toBe(65);
  });

  it('sletter avbrutt økt', () => {
    saveInterruptedSession({
      workout: mockWorkout,
      phase: 'work',
      currentRound: 1,
      currentItemIndex: 2,
      totalElapsedSeconds: 65,
    });

    clearInterruptedSession();
    expect(getInterruptedSession()).toBeNull();
  });
});

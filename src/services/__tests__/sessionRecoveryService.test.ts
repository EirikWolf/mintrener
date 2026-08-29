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

  it('faller trygt tilbake til null ved korrupt JSON i localStorage (og rydder opp)', () => {
    localStorage.setItem('mintrener_interrupted_session', '{{{ikke json');
    expect(getInterruptedSession()).toBeNull();
    expect(localStorage.getItem('mintrener_interrupted_session')).toBeNull();
  });

  it('forkaster lagret økt med feil form (skjemavalidering) uten kræsj', () => {
    localStorage.setItem(
      'mintrener_interrupted_session',
      JSON.stringify({
        workout: { id: 'x' }, // mangler alle andre påkrevde felt
        phase: 'yoga', // ugyldig fase
        currentRound: 'to',
        currentItemIndex: 0,
        totalElapsedSeconds: 10,
        savedAt: Date.now(),
      })
    );
    expect(getInterruptedSession()).toBeNull();
    // Korrupt innslag skal fjernes slik at det ikke prøves på nytt hver oppstart
    expect(localStorage.getItem('mintrener_interrupted_session')).toBeNull();
  });
});

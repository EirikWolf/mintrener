// Karakteriseringstester for persistenceSubscriber (B3 α4): kobler motorens
// injiserte onPersist-callback til saveInterruptedSession (portering av
// hookens saveInterruptedSession-kall i tick/pause), og rydder lagringen ved
// workout:completed/workout:reset (portering av clearInterruptedSession-
// kallene i setupPhase('complete') og resetWorkout).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createPersistenceSubscriber } from '../persistenceSubscriber';
import { EngineEvent } from '../../types/engineEvents';
import * as sessionRecoveryService from '../sessionRecoveryService';
import { TABATA_WORKOUT } from '../../data/mockWorkouts';

function createFakeEngine() {
  let handler: ((e: EngineEvent) => void) | null = null;
  let onPersist: ((session: unknown) => void) | null = null;
  return {
    engine: {
      subscribeEvents: (h: (e: EngineEvent) => void) => {
        handler = h;
        return () => {
          handler = null;
        };
      },
      setOnPersist: (cb: (session: unknown) => void) => {
        onPersist = cb;
      },
    },
    emit: (e: EngineEvent) => handler?.(e),
    triggerPersist: (session: unknown) => onPersist?.(session),
  };
}

describe('persistenceSubscriber (karakterisering, B3 α4)', () => {
  beforeEach(() => {
    vi.spyOn(sessionRecoveryService, 'saveInterruptedSession').mockImplementation(() => {});
    vi.spyOn(sessionRecoveryService, 'clearInterruptedSession').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('kobler onPersist til saveInterruptedSession', () => {
    const { engine, triggerPersist } = createFakeEngine();
    createPersistenceSubscriber(engine as any);

    const payload = {
      workout: TABATA_WORKOUT,
      phase: 'work' as const,
      currentRound: 1,
      currentItemIndex: 2,
      totalElapsedSeconds: 42,
    };
    triggerPersist(payload);

    expect(sessionRecoveryService.saveInterruptedSession).toHaveBeenCalledWith(payload);
  });

  it('workout:completed → clearInterruptedSession', () => {
    const { engine, emit } = createFakeEngine();
    createPersistenceSubscriber(engine as any);

    emit({ type: 'workout:completed', tone: 'rolig' });

    expect(sessionRecoveryService.clearInterruptedSession).toHaveBeenCalledTimes(1);
  });

  it('workout:reset → clearInterruptedSession', () => {
    const { engine, emit } = createFakeEngine();
    createPersistenceSubscriber(engine as any);

    emit({ type: 'workout:reset' });

    expect(sessionRecoveryService.clearInterruptedSession).toHaveBeenCalledTimes(1);
  });

  it('andre hendelser rører ikke lagringen', () => {
    const { engine, emit } = createFakeEngine();
    createPersistenceSubscriber(engine as any);

    emit({ type: 'workout:paused' });
    emit({ type: 'countdown', secondsLeft: 1 });

    expect(sessionRecoveryService.clearInterruptedSession).not.toHaveBeenCalled();
    expect(sessionRecoveryService.saveInterruptedSession).not.toHaveBeenCalled();
  });

  it('unsubscribe stopper videre reaksjon', () => {
    const { engine, emit } = createFakeEngine();
    const unsub = createPersistenceSubscriber(engine as any);
    unsub();

    emit({ type: 'workout:reset' });

    expect(sessionRecoveryService.clearInterruptedSession).not.toHaveBeenCalled();
  });
});

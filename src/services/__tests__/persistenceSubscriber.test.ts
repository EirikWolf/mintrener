// Karakteriseringstester for persistenceSubscriber (B3 α4): kobler motorens
// injiserte onPersist-callback til saveInterruptedSession (portering av
// hookens saveInterruptedSession-kall i tick/pause), og rydder lagringen ved
// workout:completed/workout:reset (portering av clearInterruptedSession-
// kallene i setupPhase('complete') og resetWorkout).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createPersistenceSubscriber, PersistenceSubscriberEngine, PersistPayload } from '../persistenceSubscriber';
import { EngineEvent } from '../../types/engineEvents';
import * as sessionRecoveryService from '../sessionRecoveryService';
import { TABATA_WORKOUT } from '../../data/mockWorkouts';

function createFakeEngine() {
  let handler: ((e: EngineEvent) => void) | null = null;
  let onPersist: ((session: PersistPayload) => void) | null = null;
  const engine: PersistenceSubscriberEngine = {
    subscribeEvents: (h: (e: EngineEvent) => void) => {
      handler = h;
      return () => {
        handler = null;
      };
    },
    setOnPersist: (cb: (session: PersistPayload) => void) => {
      onPersist = cb;
    },
  };
  return {
    engine,
    emit: (e: EngineEvent) => handler?.(e),
    triggerPersist: (session: PersistPayload) => onPersist?.(session),
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
    createPersistenceSubscriber(engine);

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
    createPersistenceSubscriber(engine);

    emit({ type: 'workout:completed', tone: 'rolig' });

    expect(sessionRecoveryService.clearInterruptedSession).toHaveBeenCalledTimes(1);
  });

  it('workout:reset → clearInterruptedSession', () => {
    const { engine, emit } = createFakeEngine();
    createPersistenceSubscriber(engine);

    emit({ type: 'workout:reset' });

    expect(sessionRecoveryService.clearInterruptedSession).toHaveBeenCalledTimes(1);
  });

  it('andre hendelser rører ikke lagringen', () => {
    const { engine, emit } = createFakeEngine();
    createPersistenceSubscriber(engine);

    emit({ type: 'workout:paused' });
    emit({ type: 'countdown', secondsLeft: 1 });

    expect(sessionRecoveryService.clearInterruptedSession).not.toHaveBeenCalled();
    expect(sessionRecoveryService.saveInterruptedSession).not.toHaveBeenCalled();
  });

  it('unsubscribe stopper videre reaksjon', () => {
    const { engine, emit } = createFakeEngine();
    const unsub = createPersistenceSubscriber(engine);
    unsub();

    emit({ type: 'workout:reset' });

    expect(sessionRecoveryService.clearInterruptedSession).not.toHaveBeenCalled();
  });

  it('dispose kobler også ut onPersist (engine.setOnPersist(no-op)) — ingen lagring etter unsubscribe', () => {
    const { engine, triggerPersist } = createFakeEngine();
    const unsub = createPersistenceSubscriber(engine);
    unsub();

    triggerPersist({
      workout: TABATA_WORKOUT,
      phase: 'work',
      currentRound: 1,
      currentItemIndex: 0,
      totalElapsedSeconds: 10,
    });

    expect(sessionRecoveryService.saveInterruptedSession).not.toHaveBeenCalled();
  });
});

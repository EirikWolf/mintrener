import { EngineEvent } from '../types/engineEvents';
import { InterruptedSession, saveInterruptedSession, clearInterruptedSession } from './sessionRecoveryService';

type PersistPayload = Omit<InterruptedSession, 'savedAt'>;

interface PersistenceSubscriberEngine {
  subscribeEvents(handler: (e: EngineEvent) => void): () => void;
  setOnPersist(cb: (session: PersistPayload) => void): void;
}

/**
 * Kobler motorens injiserte onPersist-callback (gating-logikken bor i
 * motoren, se timerEngine.ts sin tick/pause) til saveInterruptedSession —
 * portering av hookens saveInterruptedSession-kall. clearInterruptedSession
 * porteres fra setupPhase('complete') og resetWorkout, som hendelsene
 * workout:completed/workout:reset nå bærer.
 */
export function createPersistenceSubscriber(engine: PersistenceSubscriberEngine): () => void {
  engine.setOnPersist((session) => {
    saveInterruptedSession(session);
  });

  return engine.subscribeEvents((event) => {
    if (event.type === 'workout:completed' || event.type === 'workout:reset') {
      clearInterruptedSession();
    }
  });
}

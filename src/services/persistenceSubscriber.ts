import { EngineEvent } from '../types/engineEvents';
import { InterruptedSession, saveInterruptedSession, clearInterruptedSession } from './sessionRecoveryService';

export type PersistPayload = Omit<InterruptedSession, 'savedAt'>;

export interface PersistenceSubscriberEngine {
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

  const unsubEvents = engine.subscribeEvents((event) => {
    if (event.type === 'workout:completed' || event.type === 'workout:reset') {
      clearInterruptedSession();
    }
  });

  return () => {
    unsubEvents();
    // Motoren selv lever videre etter denne abonnentens opprydning (f.eks.
    // React StrictMode-dobbeltmontering) — koble ut callbacken slik at et
    // gammelt, avmontert abonnement ikke fortsetter å skrive til localStorage.
    engine.setOnPersist(() => {});
  };
}

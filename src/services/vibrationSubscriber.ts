import { TimerState } from '../types/workout';
import { EngineEvent } from '../types/engineEvents';
import { vibrationService } from './vibrationService';

interface VibrationSubscriberEngine {
  subscribeEvents(handler: (e: EngineEvent) => void): () => void;
  getSnapshot(): TimerState;
}

/**
 * Dagens vibrationService-kall fra useIntervalTimer.ts, ordrett flyttet til
 * en egen abonnent (B3 spec § 4: vibrasjon er en «egen småabonnent», atskilt
 * fra legacyAudioAdapter). Samme gating på vibrateEnabled, samme hendelser
 * som utløste vibrasjon i hooken: per-fase workStart/restStart/workoutComplete
 * i setupPhase, pluss workStart/restStart fra playResyncCue/
 * playPersonaResyncCue (BEGGE grenene vibrerte i hooken, persona-uavhengig —
 * derfor ingen persona-sjekk her, i motsetning til legacyAudioAdapter).
 * Resync-vibrasjonen står ikke i plan-dokumentets α4 Step-3-punktliste (den
 * nevner kun countdown/phase:started/completed) — den listen er en
 * oppsummering, ikke fasiten; hook-koden er fasiten, og den vibrerer på
 * resync (godkjent av koordinator etter α4-rapport).
 */
export function createVibrationSubscriber(engine: VibrationSubscriberEngine): () => void {
  return engine.subscribeEvents((event) => {
    const enabled = engine.getSnapshot().vibrateEnabled;

    switch (event.type) {
      case 'countdown':
        vibrationService.countdown(enabled);
        break;
      case 'phase:started':
        if (!event.silent) {
          if (event.phase === 'work') {
            vibrationService.workStart(enabled);
          } else if (event.phase === 'rest' || event.phase === 'round_rest') {
            vibrationService.restStart(enabled);
          } else if (event.phase === 'complete') {
            vibrationService.workoutComplete(enabled);
          }
        }
        break;
      case 'resync':
        if (event.landingPhase === 'work') {
          vibrationService.workStart(enabled);
        } else {
          // rest eller round_rest
          vibrationService.restStart(enabled);
        }
        break;
      default:
        break;
    }
  });
}

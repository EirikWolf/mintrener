import { TimerState } from '../types/workout';
import { EngineEvent } from '../types/engineEvents';
import { audioService } from './audioService';
import { speechService } from './speechService';
import { audioClipService } from './audioClipService';
import { motionTrackerService, MotionMetrics } from './motionTrackerService';
import {
  playPersonaCue,
  playIntroThenExercise,
  getActiveCoachPersona,
  stopCurrentPersonaAudio,
} from './coachPersonaService';

/**
 * Motorflaten adapteren trenger — strukturelt typet (jf. task-oppdraget) slik
 * at testene kan injisere en minimal stubb uten en ekte TimerEngine.
 */
export interface LegacyAudioAdapterEngine {
  subscribeEvents(handler: (e: EngineEvent) => void): () => void;
  getSnapshot(): TimerState;
  setMotionReps(v: number): void;
}

/**
 * Dagens lydlogikk fra useIntervalTimer.ts (setupPhase/tick/playResyncCue),
 * ordrett flyttet til en hendelsesdrevet abonnent (B3 spec § 6, plan Task α4).
 * Samme if-betingelser, samme tjenestekall, samme rekkefølge — motoren emitter
 * persona-agnostisk (α3-planrettelse), så persona-/speech-filtreringen som
 * hooken gjorde FØR avspilling gjøres her i stedet.
 *
 * Vibrasjon flytter til vibrationSubscriber (egen fil) — kun motionTracker
 * blir værende her, jf. plan-mappingtabellens avgjørelse («adapteren er
 * 'legacy side effects', ikke bare lyd»).
 */
export function createLegacyAudioAdapter(engine: LegacyAudioAdapterEngine): () => void {
  return engine.subscribeEvents((event) => {
    switch (event.type) {
      case 'phase:started':
        handlePhaseStarted(engine, event);
        break;
      case 'phase:endingSoon':
        handleEndingSoon(engine);
        break;
      case 'phase:halfway':
        handleHalfway(engine);
        break;
      case 'countdown':
        handleCountdown(engine);
        break;
      case 'resync':
        handleResync(engine, event);
        break;
      case 'workout:paused':
      case 'workout:reset':
        // stopCurrentPersonaAudio() i hookens pauseWorkout/resetWorkout.
        stopCurrentPersonaAudio();
        break;
      default:
        break;
    }
  });
}

function handlePhaseStarted(
  engine: LegacyAudioAdapterEngine,
  event: Extract<EngineEvent, { type: 'phase:started' }>
): void {
  const snap = engine.getSnapshot();
  const { phase, exercise, nextExercise, durationS, tone, silent } = event;
  const persona = getActiveCoachPersona();

  if (phase === 'prepare') {
    if (!silent && snap.speechEnabled) {
      if (persona !== 'standard') {
        const firstEx = exercise;
        if (durationS >= 6 && firstEx) {
          // Intro + øvelsesnavn som ÉN sample-nøyaktig bufferkjede — introens
          // faktiske varighet styrer skjøten, ingen gjetting.
          void playIntroThenExercise(firstEx.id).then((played) => {
            if (played) return;
            // Degradert sti: bufferne er ikke dekodet ennå — spill intro via
            // Audio-element og gjett introens varighet med setTimeout, som
            // før AudioBuffer-migreringen.
            playPersonaCue('intro');
            setTimeout(() => {
              const s = engine.getSnapshot();
              if (s.phase === 'prepare' && s.status === 'running') {
                audioClipService.playClipOrFallback('exercise-' + firstEx.id, firstEx.name);
              }
            }, 2300);
          });
        } else {
          playPersonaCue('intro');
        }
      } else {
        speechService.announcePrepare(exercise?.name, tone);
      }
    }
    return;
  }

  if (phase === 'work') {
    if (!silent) {
      if (persona === 'standard') {
        audioService.playWorkStart(snap.soundEnabled);
        if (snap.speechEnabled) {
          speechService.announceWork(exercise?.name, tone);
        }
      }
    }
    // Bevegelsessporing er persona-uavhengig og portert utenfor if(!silent) —
    // se identisk plassering i useIntervalTimer.ts sin work-gren.
    motionTrackerService.start((m: MotionMetrics) => {
      engine.setMotionReps(m.count);
    }, 'hopp');
    return;
  }

  if (phase === 'rest' || phase === 'round_rest') {
    if (!silent) {
      audioService.playRestStart(snap.soundEnabled);
      if (snap.speechEnabled) {
        if (persona === 'standard') {
          speechService.announceRest(nextExercise?.name, tone);
        } else if (nextExercise) {
          audioClipService.playClipOrFallback('exercise-' + nextExercise.id, 'Neste: ' + nextExercise.name);
        }
      }
    }
    motionTrackerService.stop();
    return;
  }

  if (phase === 'complete') {
    if (!silent) {
      if (persona !== 'standard') {
        playPersonaCue('finish');
      } else {
        audioService.playWorkoutComplete(snap.soundEnabled);
        if (snap.speechEnabled) {
          speechService.announceComplete(tone);
        }
      }
    }
    motionTrackerService.stop();
  }
}

function handleEndingSoon(engine: LegacyAudioAdapterEngine): void {
  // Persona-3-2-1-vinduet: motoren emitterer allerede kun ved riktig fase/
  // gating (α3) — her gjenstår kun persona-/speech-filtreringen fra hooken.
  const snap = engine.getSnapshot();
  if (getActiveCoachPersona() !== 'standard' && snap.speechEnabled) {
    playPersonaCue('start_321');
  }
}

function handleHalfway(engine: LegacyAudioAdapterEngine): void {
  const snap = engine.getSnapshot();
  if (getActiveCoachPersona() !== 'standard' && snap.speechEnabled) {
    playPersonaCue('halfway');
  }
}

function handleCountdown(engine: LegacyAudioAdapterEngine): void {
  // Kun i standard-modus, for å unngå kollisjon med persona-stemmen.
  if (getActiveCoachPersona() === 'standard') {
    const snap = engine.getSnapshot();
    audioService.playCountdownBeep(snap.soundEnabled);
  }
}

function handleResync(
  engine: LegacyAudioAdapterEngine,
  event: Extract<EngineEvent, { type: 'resync' }>
): void {
  const snap = engine.getSnapshot();
  const { landingPhase, exercise, nextExercise, tone } = event;

  if (getActiveCoachPersona() !== 'standard') {
    // playPersonaResyncCue: NB — avvik fra setupPhase (ingen playRestStart/
    // playWorkStart-tone her) er BEVISST i hooken, ikke noe å «fikse».
    if (landingPhase === 'work') {
      if (snap.speechEnabled && exercise) {
        audioClipService.playClipOrFallback('exercise-' + exercise.id, exercise.name);
      }
    } else {
      // rest eller round_rest
      if (snap.speechEnabled && nextExercise) {
        audioClipService.playClipOrFallback('exercise-' + nextExercise.id, 'Neste: ' + nextExercise.name);
      }
    }
    return;
  }

  // playResyncCue (standard-gren)
  if (landingPhase === 'work') {
    audioService.playWorkStart(snap.soundEnabled);
    if (snap.speechEnabled) {
      speechService.announceWork(exercise?.name, tone);
    }
  } else {
    // rest eller round_rest
    audioService.playRestStart(snap.soundEnabled);
    if (snap.speechEnabled) {
      speechService.announceRest(nextExercise?.name, tone);
    }
  }
}

import { TimerState, IntervalPhase } from '../types/workout';
import { EngineEvent } from '../types/engineEvents';
import { audioService } from './audioService';
import { speechService } from './speechService';
import { audioClipService } from './audioClipService';
import { audioBufferEngine } from './audioBufferEngine';
import { motionTrackerService, MotionMetrics } from './motionTrackerService';
import {
  COACH_PERSONAS,
  getActiveCoachPersona,
  playPersonaCue,
  playIntroThenExercise,
  stopCurrentPersonaAudio,
} from './coachPersonaService';

/**
 * Motorflaten Directoren trenger — strukturelt typet (samme mønster som
 * LegacyAudioAdapter) slik at testene kan injisere en minimal stubb.
 * getNow: motorens klokke (samme tidsbase som endsAt i hendelsene) — brukes
 * til tidsbro-målingen ved workout:started og til skip-deteksjon.
 */
export interface AudioDirectorEngine {
  subscribeEvents(handler: (e: EngineEvent) => void): () => void;
  getSnapshot(): TimerState;
  setMotionReps(v: number): void;
  getNow(): number;
}

export type AnnouncementPlan = 'persona' | 'studio' | 'bridge-tts' | 'tts' | 'beep-only';

/**
 * Prioritetskjeden fra spec § 4 — ETT sted: persona-klipp → studioklipp →
 * bro + TTS (kun egendefinerte øvelser, broen er personaens frase) → ren TTS.
 * Med tale avslått gjenstår kun fase-pip. Ren funksjon uten sideeffekter slik
 * at policyen kan tabelltestes isolert; Directoren (og β3s bro-implementasjon)
 * konsumerer den.
 */
export function resolveAnnouncementPlan(input: {
  personaActive: boolean;
  personaClipCached: boolean;
  studioClipCached: boolean;
  isCustomExercise: boolean;
  speechEnabled: boolean;
}): AnnouncementPlan {
  if (!input.speechEnabled) return 'beep-only';
  if (input.personaActive && input.personaClipCached) return 'persona';
  if (input.studioClipCached) return 'studio';
  if (input.personaActive && input.isCustomExercise) return 'bridge-tts';
  return 'tts';
}

// last5-cuen skal ROPE fem sekunder før arbeidsfasens slutt: startAt = endsAt - 5000.
// NB: dette er en BEVISST β-adferdsutvidelse (plan Task β2 / spec § 5): cue-fila
// fantes og ble preloadet, men hooken/adapteren trigget den aldri.
const LAST5_LEAD_MS = 5000;
// Kun arbeidsfaser >= 15 s får last5 — samme varighetsvakt som halfway-cuen,
// slik at korte intervaller ikke druknes i tale.
const LAST5_MIN_WORK_S = 15;

// Grensefaser der nedtellingen kulminerer i en fasegrense med arbeids-tilrop.
const BOUNDARY_PHASES: ReadonlyArray<IntervalPhase> = ['prepare', 'rest', 'round_rest'];

type PhaseStartedEvent = Extract<EngineEvent, { type: 'phase:started' }>;
type ResyncEvent = Extract<EngineEvent, { type: 'resync' }>;

/** Hva som er skedulert for inneværende fase — nok til å reskedulere ved fristflytt. */
type PendingLookahead =
  | { kind: 'boundary'; start321Key: string; goKey: string }
  | { kind: 'last5'; key: string };

/**
 * Nøkkel for en persona-cue etter dagens cuesPath-konvensjon. '/'-prefiksede
 * nøkler behandles som direkte URL-er av audioBufferEngine (se preloadOne) —
 * samme oppslag som getPersonaCueUrl, men uten PersonaCueName-begrensningen
 * (go-1/2/3 er nye i β). β3 innfører getPersonaClipKey (manifest-basert) som
 * erstatter denne hjelperen.
 */
function personaCueKey(cue: string): string | null {
  const persona = COACH_PERSONAS.find((p) => p.id === getActiveCoachPersona());
  return persona?.cuesPath ? `${persona.cuesPath}/${cue}.mp3` : null;
}

/**
 * AudioDirector (B3 β2, spec § 4): eneste lydabonnent når den kobles i β4.
 * Standard-stien (persona 'standard') speiler LegacyAudioAdapter ordrett —
 * reaktive pip/TTS, ingen lookahead. Persona-stien beholder adapterens reaktive
 * kall (intro-kjede, rest-annonsering, halfway, finish) og LEGGER TIL
 * fristankret lookahead: start_321 skedulert til å SLUTTE på fasegrensen og
 * go-tilropet til å STARTE der (sample-nøyaktig, via audioBufferEngine sin
 * tidsbro). phase:endingSoon ignoreres bevisst — lookahead overtar det reaktive
 * start_321-vinduet (jf. kommentaren i engineEvents.ts).
 *
 * motionTracker-ansvaret følger med fra adapteren (β4 sletter den wholesale);
 * Directoren er i β2 IKKE koblet inn i hooken ennå.
 */
export function createAudioDirector(engine: AudioDirectorEngine): () => void {
  // Per-fase-tilstand i lukning:
  // pending: hva som er skedulert (overlever pause slik at resume kan reskedulere).
  // currentDeadline: forrige phase:started sin frist — skip-deteksjon.
  // beepFallback: satt når skedulering feilet (for trangt vindu/ucachet) — da
  // arver countdown-pipene grensen i persona-modus («aldri avkuttet tale»).
  // phaseEpoch: vakt mot at et SENT false-svar fra en forrige fases skedulering
  // setter fallback-flagget for feil fase.
  let pending: PendingLookahead | null = null;
  let currentDeadline: number | null = null;
  let beepFallback = false;
  let phaseEpoch = 0;

  function issuePending(endsAt: number): void {
    if (!pending) return;
    const epoch = phaseEpoch;
    // scheduleSequence resolver false STRAKS ved ucachet nøkkel/manglende bro/
    // for trangt vindu — men true først når kjeden har SPILT ferdig (og true
    // ved bevisst stopp). Derfor fire-and-forget med .then, aldri await: å
    // vente på suksess ville blokkert til fasegrensen.
    const flagIfTooTight = (ok: boolean): void => {
      if (!ok && epoch === phaseEpoch) beepFallback = true;
    };
    if (pending.kind === 'boundary') {
      void audioBufferEngine.scheduleSequence([pending.start321Key], { endAt: endsAt }).then(flagIfTooTight);
      void audioBufferEngine.scheduleSequence([pending.goKey], { startAt: endsAt }).then(flagIfTooTight);
    } else {
      // last5-svikt gir INGEN pip-fallback: cuen er motivasjon midt i fasen,
      // ikke et grensesignal — stille degradering er dagens (utriggede) adferd.
      void audioBufferEngine.scheduleSequence([pending.key], { startAt: endsAt - LAST5_LEAD_MS });
    }
  }

  /** Fristankret lookahead — KUN persona-stien (spec § 4); standard forblir reaktiv. */
  function planLookahead(e: PhaseStartedEvent): void {
    const snap = engine.getSnapshot();
    if (e.silent || e.endsAt === null || !snap.speechEnabled) return;
    if (getActiveCoachPersona() === 'standard') return;

    if (BOUNDARY_PHASES.includes(e.phase)) {
      const start321Key = personaCueKey('start_321');
      // go-rotasjon: deterministisk på itemIndex % 3 — samme item gir samme
      // tilrop (reproduserbart i test/felt), variasjon på tvers av items uten
      // tilstand som kan drifte mellom økter.
      const goKey = personaCueKey(`go-${(e.itemIndex % 3) + 1}`);
      if (!start321Key || !goKey) return;
      pending = { kind: 'boundary', start321Key, goKey };
      issuePending(e.endsAt);
    } else if (e.phase === 'work' && e.durationS >= LAST5_MIN_WORK_S) {
      const key = personaCueKey('last5');
      if (!key) return;
      pending = { kind: 'last5', key };
      issuePending(e.endsAt);
    }
  }

  function handlePhaseStarted(e: PhaseStartedEvent): void {
    // Skip/previous: ny fase FØR forrige frist → lyd planlagt for den gamle
    // grensen skal aldri høres — fade-kanseller (plan Task β2). En NORMAL
    // overgang skjer ved/etter fristen (ticken oppdager remaining <= 0), og da
    // spiller go-tilropet akkurat nå og skal IKKE kuttes.
    if (currentDeadline !== null && engine.getNow() < currentDeadline) {
      audioBufferEngine.stop();
    }
    phaseEpoch++;
    pending = null;
    beepFallback = false;
    currentDeadline = e.endsAt;

    mirrorLegacyPhaseStarted(engine, e);
    planLookahead(e);
  }

  function handleDeadlineChanged(endsAt: number): void {
    currentDeadline = endsAt;
    if (!pending) return;
    // Kanseller planlagte kjeder og reskeduler mot ny frist. Motoren emitter
    // KUN fremtidige frister (past-deadline-reankringer undertrykkes — catch-up
    // sin landing overtar), så ankeret er alltid gyldig; holder vinduet likevel
    // ikke, svarer scheduleSequence false → pip-fallback, aldri avkuttet tale.
    audioBufferEngine.stop();
    issuePending(endsAt);
  }

  function handleCountdown(): void {
    const snap = engine.getSnapshot();
    if (getActiveCoachPersona() === 'standard') {
      // Adapter-speiling: standard-stiens reaktive pip, uendret.
      audioService.playCountdownBeep(snap.soundEnabled);
    } else if (beepFallback) {
      // β-degradering (plan Task β2): når lookahead ikke fikk plass, markerer
      // pipene grensen i stedet for taushet — «aldri avkuttet tale, kun pip».
      audioService.playCountdownBeep(snap.soundEnabled);
    }
  }

  return engine.subscribeEvents((event) => {
    switch (event.type) {
      case 'workout:started':
        // Tidsbroen måles én gang per økt — motorklokke ↔ AudioContext-klokke
        // har samme rate, kun forskjellig epoke (audioBufferEngine.setTimeBridge).
        audioBufferEngine.setTimeBridge(engine.getNow());
        break;
      case 'phase:started':
        handlePhaseStarted(event);
        break;
      case 'phase:deadlineChanged':
        handleDeadlineChanged(event.endsAt);
        break;
      case 'phase:halfway':
        mirrorLegacyHalfway(engine);
        break;
      case 'phase:endingSoon':
        // Bevisst ignorert i β: det reaktive start_321-vinduet er erstattet av
        // fristankret lookahead (engineEvents.ts: «beta ignorerer — lookahead overtar»).
        break;
      case 'countdown':
        handleCountdown();
        break;
      case 'resync':
        mirrorLegacyResync(engine, event);
        break;
      case 'workout:paused':
        // Fade-kanseller alt (stopCurrentPersonaAudio → audioBufferEngine.stop),
        // men BEHOLD pending: spec § 3 gjør pause/fortsett trygt for planlagt
        // lyd — workout:resumed bærer ny frist og vi reskedulerer der.
        stopCurrentPersonaAudio();
        break;
      case 'workout:resumed':
        handleDeadlineChanged(event.endsAt);
        break;
      case 'workout:reset':
        stopCurrentPersonaAudio();
        pending = null;
        currentDeadline = null;
        beepFallback = false;
        break;
      default:
        break;
    }
  });
}

// ---------------------------------------------------------------------------
// Standard-/reaktiv sti: LegacyAudioAdapter sine forgreninger flyttet inn
// ORDRETT (plan Task β2: «standard-stien speiler LegacyAudioAdapter — flytt den
// koden inn, behold betingelsene»). Splittet per fase for linjegrensens skyld;
// betingelser, kall og rekkefølge er uendret fra adapteren.
// ---------------------------------------------------------------------------

function mirrorLegacyPhaseStarted(engine: AudioDirectorEngine, event: PhaseStartedEvent): void {
  const { phase } = event;
  if (phase === 'prepare') {
    mirrorPrepare(engine, event);
  } else if (phase === 'work') {
    mirrorWork(engine, event);
  } else if (phase === 'rest' || phase === 'round_rest') {
    mirrorRest(engine, event);
  } else if (phase === 'complete') {
    mirrorComplete(engine, event);
  }
}

function mirrorPrepare(engine: AudioDirectorEngine, event: PhaseStartedEvent): void {
  const snap = engine.getSnapshot();
  const { exercise, durationS, tone, silent } = event;
  if (silent || !snap.speechEnabled) return;

  if (getActiveCoachPersona() !== 'standard') {
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

function mirrorWork(engine: AudioDirectorEngine, event: PhaseStartedEvent): void {
  const snap = engine.getSnapshot();
  const { exercise, tone, silent } = event;
  if (!silent) {
    if (getActiveCoachPersona() === 'standard') {
      audioService.playWorkStart(snap.soundEnabled);
      if (snap.speechEnabled) {
        speechService.announceWork(exercise?.name, tone);
      }
    }
  }
  // Bevegelsessporing er persona-uavhengig og portert utenfor if(!silent) —
  // se identisk plassering i legacyAudioAdapter/useIntervalTimer sin work-gren.
  motionTrackerService.start((m: MotionMetrics) => {
    engine.setMotionReps(m.count);
  }, 'hopp');
}

function mirrorRest(engine: AudioDirectorEngine, event: PhaseStartedEvent): void {
  const snap = engine.getSnapshot();
  const { nextExercise, tone, silent } = event;
  if (!silent) {
    audioService.playRestStart(snap.soundEnabled);
    if (snap.speechEnabled) {
      if (getActiveCoachPersona() === 'standard') {
        speechService.announceRest(nextExercise?.name, tone);
      } else if (nextExercise) {
        audioClipService.playClipOrFallback('exercise-' + nextExercise.id, 'Neste: ' + nextExercise.name);
      }
    }
  }
  motionTrackerService.stop();
}

function mirrorComplete(engine: AudioDirectorEngine, event: PhaseStartedEvent): void {
  const snap = engine.getSnapshot();
  const { tone, silent } = event;
  if (!silent) {
    if (getActiveCoachPersona() !== 'standard') {
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

function mirrorLegacyHalfway(engine: AudioDirectorEngine): void {
  const snap = engine.getSnapshot();
  if (getActiveCoachPersona() !== 'standard' && snap.speechEnabled) {
    playPersonaCue('halfway');
  }
}

function mirrorLegacyResync(engine: AudioDirectorEngine, event: ResyncEvent): void {
  const snap = engine.getSnapshot();
  const { landingPhase, exercise, nextExercise, tone } = event;

  if (getActiveCoachPersona() !== 'standard') {
    // playPersonaResyncCue-semantikken fra adapteren: BEVISST uten playRestStart/
    // playWorkStart-tone (avvik fra setupPhase, arvet fra hooken). β3 gjør denne
    // grenen bro-bevisst ([bro-resync, exercise-<id>]).
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

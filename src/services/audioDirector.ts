import { TimerState, IntervalPhase, Exercise } from '../types/workout';
import { EngineEvent } from '../types/engineEvents';
import { audioService } from './audioService';
import { speechService } from './speechService';
import { audioClipService } from './audioClipService';
import { audioBufferEngine } from './audioBufferEngine';
import { motionTrackerService, MotionMetrics } from './motionTrackerService';
import {
  getActiveCoachPersona,
  getPersonaClipKey,
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

/**
 * Kontekst delt fra createAudioDirector-lukningen til speil-/annonserings-
 * funksjonene: motorflaten + leser for gjeldende phaseEpoch. TTS-etter-kjede-
 * veiene fanger epoken ved oppsett og sammenligner ved promise-oppløsning
 * (samme mønster som issuePending/flagIfTooTight) — playSequence løser nemlig
 * true BÅDE ved naturlig kjedeslutt og ved bevisst stopp, så et skip som
 * fade-stopper bro-kjeden ville ellers latt TTS lese GAMMELT øvelsesnavn over
 * den nye fasens lyd (status-gaten hjelper ikke: skip endrer ikke status, og
 * ved prepare→prepare-skip hjelper heller ikke fase-gaten).
 */
interface DirectorCtx {
  engine: AudioDirectorEngine;
  getPhaseEpoch(): number;
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
 * Egendefinert øvelse: 'custom-'-prefiks fra byggeren, eller isCustom-flagget
 * fra biblioteket (CustomExerciseItem — Exercise-typen bærer ikke flagget,
 * derfor strukturell lesing).
 */
function isCustomExercise(ex: Exercise): boolean {
  return ex.id.startsWith('custom-') || (ex as Exercise & { isCustom?: boolean }).isCustom === true;
}

/**
 * Bro + TTS (spec § 4, prioritet 3 — kun egendefinerte øvelser): personaens
 * bro-frase spilles som bufferkjede, og TTS leser KUN navnet ETTER at kjeden
 * har spilt ferdig (playSequence-promiset løses ved kjedeslutt) — de to
 * stemmene overlapper aldri (produkteiers valg B). Uten cachet bro: kallerens
 * fallback (dagens playClipOrFallback-kjede, som selv ender i TTS).
 */
function playBridgeThenTts(
  ctx: DirectorCtx,
  bridgeCue: 'bro-neste' | 'bro-naa' | 'bro-resync',
  name: string,
  fallback: () => void
): void {
  const key = getPersonaClipKey(bridgeCue);
  if (!key || !audioBufferEngine.has(key)) {
    fallback();
    return;
  }
  // Epoch-guard (fix-løkke etter spec-review): fanges FØR kjeden startes —
  // et skip/fasebytte bumper phaseEpoch, og da skal navnet aldri leses selv
  // om promiset løses true (bevisst-stopp-kontrakten). Se DirectorCtx-doc.
  const epoch = ctx.getPhaseEpoch();
  void audioBufferEngine.playSequence([key]).then(() => {
    // Pause/reset i mellomtiden: ikke les navnet oppå en stoppet økt
    if (epoch === ctx.getPhaseEpoch() && ctx.engine.getSnapshot().status === 'running') {
      speechService.speak(name);
    }
  });
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

  // Delt med speil-funksjonene: gir TTS-etter-kjede-veiene tilgang til
  // fase-epoken (guard mot skip-lekkasje — se DirectorCtx).
  const ctx: DirectorCtx = { engine, getPhaseEpoch: () => phaseEpoch };

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
      const start321Key = getPersonaClipKey('start_321');
      // go-rotasjon: deterministisk på itemIndex % 3 — samme item gir samme
      // tilrop (reproduserbart i test/felt), variasjon på tvers av items uten
      // tilstand som kan drifte mellom økter.
      const goKey = getPersonaClipKey(`go-${(e.itemIndex % 3) + 1}`);
      if (!start321Key || !goKey) return;
      pending = { kind: 'boundary', start321Key, goKey };
      issuePending(e.endsAt);
    } else if (e.phase === 'work' && e.durationS >= LAST5_MIN_WORK_S) {
      const key = getPersonaClipKey('last5');
      if (!key) return;
      pending = { kind: 'last5', key };
      issuePending(e.endsAt);
    }
  }

  function handlePhaseStarted(e: PhaseStartedEvent): void {
    // Planrettelse 4 (fix 1): re-mål tidsbroen per fase. ctx.currentTime kan
    // fryse ved mid-økt-suspensjon mens motorklokken løper videre — motorens
    // drift-reanker fanger IKKE det (begge DENS klokker løper), og en engangs-
    // bro ville gjort alle senere ankre permanent like sene som suspensjonen
    // varte. Re-måling her er gratis i forgrunn og alltid fersk når ankrene
    // under regnes ut.
    audioBufferEngine.setTimeBridge(engine.getNow());
    // Skip/previous: ny fase FØR forrige frist → lyd SKEDULERT for den gamle
    // grensen (start_321/go/last5, ikke startet ennå) skal aldri høres —
    // kanseller den stille (Planrettelse 2: cancelScheduled(), IKKE full
    // stop() — en evt. reaktiv cue som allerede spiller akkurat nå (f.eks.
    // halfway) skal ikke kuttes av selve skip-hendelsen). En NORMAL overgang
    // skjer ved/etter fristen (ticken oppdager remaining <= 0), og da spiller
    // go-tilropet akkurat nå og skal IKKE kanselleres.
    if (currentDeadline !== null && engine.getNow() < currentDeadline) {
      audioBufferEngine.cancelScheduled();
    }
    phaseEpoch++;
    pending = null;
    beepFallback = false;
    currentDeadline = e.endsAt;

    mirrorLegacyPhaseStarted(ctx, e);
    planLookahead(e);
  }

  function handleDeadlineChanged(endsAt: number): void {
    // Planrettelse 4 (fix 1): re-mål broen også her — særlig viktig via
    // workout:resumed, der ctx typisk var suspendert gjennom hele pausen.
    audioBufferEngine.setTimeBridge(engine.getNow());
    currentDeadline = endsAt;
    if (!pending) return;
    // Planrettelse 4 (fix 2): en tidligere mislykket skedulering skal ikke la
    // pip-fallbacken leve videre oppå en VELLYKKET reskedulering — nullstill
    // FØR issuePending; et nytt false-svar setter flagget igjen om vinduet ryker.
    beepFallback = false;
    // Kanseller planlagte (ikke-hørbare) kjeder og reskeduler mot ny frist.
    // Planrettelse 2: cancelScheduled(), IKKE full stop() — en pause/dvale-
    // reanker skjer mens f.eks. rest-annonseringen fortsatt kan spille hørbart,
    // og den skal ikke kuttes bare fordi grensen flyttet seg. Motoren emitter
    // KUN fremtidige frister (past-deadline-reankringer undertrykkes — catch-up
    // sin landing overtar), så ankeret er alltid gyldig; holder vinduet likevel
    // ikke, svarer scheduleSequence false → pip-fallback, aldri avkuttet tale.
    audioBufferEngine.cancelScheduled();
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
        // Første bro-måling — motorklokke ↔ AudioContext-klokke har samme rate,
        // kun forskjellig epoke (audioBufferEngine.setTimeBridge). Re-måles
        // deretter per fase/fristflytt (Planrettelse 4 fix 1, se handlePhaseStarted).
        audioBufferEngine.setTimeBridge(engine.getNow());
        break;
      case 'phase:started':
        handlePhaseStarted(event);
        break;
      case 'phase:deadlineChanged':
        handleDeadlineChanged(event.endsAt);
        break;
      case 'phase:halfway':
        mirrorLegacyHalfway(ctx);
        break;
      case 'phase:endingSoon':
        // Bevisst ignorert i β: det reaktive start_321-vinduet er erstattet av
        // fristankret lookahead (engineEvents.ts: «beta ignorerer — lookahead overtar»).
        break;
      case 'countdown':
        handleCountdown();
        break;
      case 'resync':
        mirrorLegacyResync(ctx, event);
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

function mirrorLegacyPhaseStarted(ctx: DirectorCtx, event: PhaseStartedEvent): void {
  const { phase } = event;
  if (phase === 'prepare') {
    mirrorPrepare(ctx, event);
  } else if (phase === 'work') {
    mirrorWork(ctx, event);
  } else if (phase === 'rest' || phase === 'round_rest') {
    mirrorRest(ctx, event);
  } else if (phase === 'complete') {
    mirrorComplete(ctx, event);
  }
}

function mirrorPrepare(ctx: DirectorCtx, event: PhaseStartedEvent): void {
  const snap = ctx.engine.getSnapshot();
  const { exercise, durationS, tone, silent } = event;
  if (silent || !snap.speechEnabled) return;

  if (getActiveCoachPersona() !== 'standard') {
    const firstEx = exercise;
    if (durationS >= 6 && firstEx) {
      if (isCustomExercise(firstEx)) {
        // Bro + TTS (valg B): egendefinerte øvelser har verken studio- eller
        // persona-klipp, så intro-kjeden kan aldri lykkes — gå rett på
        // [intro, bro-naa]-kjeden («Nå: …») + TTS-navnet etter kjedeslutt.
        announceCustomPrepare(ctx, firstEx.name);
      } else {
        playPrepareIntroChain(ctx, firstEx);
      }
    } else {
      playPersonaCue('intro');
    }
  } else {
    speechService.announcePrepare(exercise?.name, tone);
  }
}

/**
 * Intro + øvelsesnavn som ÉN sample-nøyaktig bufferkjede — introens faktiske
 * varighet styrer skjøten, ingen gjetting.
 *
 * Rekkefølge-notat (Planrettelse 4-tillegget): mirror* kjøres FØR planLookahead
 * i handlePhaseStarted, så suksess-stien her stoppet historisk tale FØR
 * prepare-ankrene (start_321/go) fantes — den overlevde altså kun i kraft av
 * den rekkefølgen. Den degraderte .then-grenen kjører derimot ETTER at
 * planLookahead har skedulert ankrene. Begge stiene er nå ufarlige fordi
 * playIntroThenExercise/playPersonaCue bruker audible-only-stopp
 * (Planrettelse 3, stopAudiblePersonaAudio) som aldri rører skedulerte kjeder —
 * men rekkefølgen skal ikke «ryddes» uten denne historikken.
 */
function playPrepareIntroChain(ctx: DirectorCtx, firstEx: Exercise): void {
  // Epoch-guard også her (fjerde skip-lekkasje-vei, review-oppfølging): ved
  // prepare→prepare-skip innen gjettevinduet ser fase-/status-gaten fortsatt
  // 'prepare'/'running' og ville annonsert GAMMEL øvelse over ny intro.
  const epoch = ctx.getPhaseEpoch();
  void playIntroThenExercise(firstEx.id).then((played) => {
    if (played) return;
    // Degradert sti: bufferne er ikke dekodet ennå — spill intro via
    // Audio-element og gjett introens varighet med setTimeout, som
    // før AudioBuffer-migreringen.
    playPersonaCue('intro');
    setTimeout(() => {
      const s = ctx.engine.getSnapshot();
      if (epoch === ctx.getPhaseEpoch() && s.phase === 'prepare' && s.status === 'running') {
        audioClipService.playClipOrFallback('exercise-' + firstEx.id, firstEx.name);
      }
    }, 2300);
  });
}

/**
 * Prepare for egendefinert øvelse (bro + TTS): intro og bro-naa som ÉN
 * bufferkjede når cachet; TTS leser KUN navnet etter kjedeslutt — aldri
 * overlapp. Uten cachede klipp: samme degraderte intro-sti som ellers
 * (HTMLAudio-intro + varighetsgjetting), med rent TTS-navn til slutt.
 */
function announceCustomPrepare(ctx: DirectorCtx, name: string): void {
  const keys = ['intro', 'bro-naa']
    .map((cue) => getPersonaClipKey(cue))
    .filter((k): k is string => k !== null && audioBufferEngine.has(k));
  // Epoch-guard i TILLEGG til fase-/status-gaten: ved prepare→prepare-skip er
  // den nye fasen også 'prepare', så bare epoken avslører at kjeden ble
  // stoppet av et fasebytte (se DirectorCtx-doc). Gjelder begge stiene under.
  const epoch = ctx.getPhaseEpoch();
  const speakIfStillPreparing = (): void => {
    const s = ctx.engine.getSnapshot();
    if (epoch === ctx.getPhaseEpoch() && s.phase === 'prepare' && s.status === 'running') {
      speechService.speak(name);
    }
  };
  if (keys.length === 0) {
    playPersonaCue('intro');
    setTimeout(speakIfStillPreparing, 2300);
    return;
  }
  void audioBufferEngine.playSequence(keys).then(speakIfStillPreparing);
}

function mirrorWork(ctx: DirectorCtx, event: PhaseStartedEvent): void {
  const snap = ctx.engine.getSnapshot();
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
    ctx.engine.setMotionReps(m.count);
  }, 'hopp');
}

function mirrorRest(ctx: DirectorCtx, event: PhaseStartedEvent): void {
  const snap = ctx.engine.getSnapshot();
  const { nextExercise, tone, silent } = event;
  if (!silent) {
    audioService.playRestStart(snap.soundEnabled);
    if (snap.speechEnabled) {
      if (getActiveCoachPersona() === 'standard') {
        speechService.announceRest(nextExercise?.name, tone);
      } else if (nextExercise) {
        announceNextExercise(ctx, nextExercise);
      }
    }
  }
  motionTrackerService.stop();
}

/**
 * Persona-stiens annonsering av NESTE øvelse (rest/round_rest) — rutet gjennom
 * resolveAnnouncementPlan (spec § 4-kjeden håndheves ETT sted, β3-minor som
 * lukker den aspirasjonelle docstringen):
 *  - persona: personaens eget øvelsesklipp, kjedet etter bro-neste når broen er
 *    cachet (β5 leverer klippene — sømmen er klar i dag, stien er sovende)
 *  - bridge-tts: egendefinert → bro-neste-kjede + TTS-navn (aldri overlapp)
 *  - studio/tts: dagens playClipOrFallback-kjede uendret (buffer → HTMLAudio → TTS)
 */
function announceNextExercise(ctx: DirectorCtx, next: Exercise): void {
  const personaKey = getPersonaClipKey('exercise-' + next.id);
  const fallback = (): void => {
    audioClipService.playClipOrFallback('exercise-' + next.id, 'Neste: ' + next.name);
  };
  const plan = resolveAnnouncementPlan({
    personaActive: true, // kalleren står i persona-grenen
    personaClipCached: personaKey !== null && audioBufferEngine.has(personaKey),
    studioClipCached: audioBufferEngine.has('exercise-' + next.id),
    isCustomExercise: isCustomExercise(next),
    speechEnabled: true, // speech-gaten ligger hos kalleren (mirrorRest)
  });
  if (plan === 'persona' && personaKey) {
    const broKey = getPersonaClipKey('bro-neste');
    const keys = broKey && audioBufferEngine.has(broKey) ? [broKey, personaKey] : [personaKey];
    // playSequence rejecter aldri (kontraktsfestet og NaN-vaktet i motoren) —
    // ingen redundant .catch (review-notat: én konsekvent linje, stol på kontrakten)
    void audioBufferEngine.playSequence(keys);
  } else if (plan === 'bridge-tts') {
    playBridgeThenTts(ctx, 'bro-neste', next.name, fallback);
  } else {
    fallback();
  }
}

function mirrorComplete(ctx: DirectorCtx, event: PhaseStartedEvent): void {
  const snap = ctx.engine.getSnapshot();
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

function mirrorLegacyHalfway(ctx: DirectorCtx): void {
  const snap = ctx.engine.getSnapshot();
  if (getActiveCoachPersona() !== 'standard' && snap.speechEnabled) {
    playPersonaCue('halfway');
  }
}

function mirrorLegacyResync(ctx: DirectorCtx, event: ResyncEvent): void {
  const snap = ctx.engine.getSnapshot();
  const { landingPhase, exercise, nextExercise, tone } = event;

  if (getActiveCoachPersona() !== 'standard') {
    // playPersonaResyncCue-semantikken fra adapteren: BEVISST uten playRestStart/
    // playWorkStart-tone (avvik fra setupPhase, arvet fra hooken). β3: bro-
    // bevisst — bro-resync («Du er nå på:») + øvelsesnavn (spec § 4).
    if (!snap.speechEnabled) return;
    const target = landingPhase === 'work' ? exercise : nextExercise;
    if (!target) return;
    // Fallback-tekstene speiler dagens reaktive sti (navn / «Neste: navn»)
    const fallbackText = landingPhase === 'work' ? target.name : 'Neste: ' + target.name;
    announcePersonaResync(ctx, target, fallbackText);
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

/**
 * Persona-resync (β3, spec § 4): bro-resync («Du er nå på:») + øvelsesnavn.
 * Navndelen rutes gjennom resolveAnnouncementPlan: persona-/studioklipp kjedes
 * sample-nøyaktig ETTER broen; ellers (egendefinert eller ucachet) leser TTS
 * navnet etter kjedeslutt — aldri overlapp. Uten cachet bro: dagens reaktive
 * playClipOrFallback-sti uendret (fallbackText bærer «Neste:»-konteksten).
 */
function announcePersonaResync(
  ctx: DirectorCtx,
  target: Exercise,
  fallbackText: string
): void {
  const broKey = getPersonaClipKey('bro-resync');
  const studioKey = 'exercise-' + target.id;
  if (!broKey || !audioBufferEngine.has(broKey)) {
    audioClipService.playClipOrFallback(studioKey, fallbackText);
    return;
  }
  const personaKey = getPersonaClipKey(studioKey); // exercise-<id> under personaens sti
  const plan = resolveAnnouncementPlan({
    personaActive: true,
    personaClipCached: personaKey !== null && audioBufferEngine.has(personaKey),
    studioClipCached: audioBufferEngine.has(studioKey),
    isCustomExercise: isCustomExercise(target),
    speechEnabled: true, // gatet av kalleren (mirrorLegacyResync)
  });
  if (plan === 'persona' && personaKey) {
    void audioBufferEngine.playSequence([broKey, personaKey]);
  } else if (plan === 'studio') {
    void audioBufferEngine.playSequence([broKey, studioKey]);
  } else {
    // bridge-tts/tts: broen spiller, TTS leser kun navnet etterpå (valg B).
    // Delegert til playBridgeThenTts (guard-dedup, review-punkt 4) — epoch-
    // guarden fanges der, og siden resync emitteres ETTER landingsfasens
    // phase:started (jf. catchUpExpiredPhases) er epoken landingens: et senere
    // fasebytte/skip bumper den og undertrykker det gamle navnet. Fallbacken
    // fyrer aldri her (broKey er alt verifisert cachet), men bevarer semantikken.
    playBridgeThenTts(ctx, 'bro-resync', target.name, () =>
      audioClipService.playClipOrFallback(studioKey, fallbackText)
    );
  }
}

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

/**
 * Annonserings-hodrom for endAt-forankrede grensekjeder (felttest-funn, Android/
 * Klassisk Tabata der ALLE grensefaser er 10 s): short-varianten (8,5 s) ble
 * endAt-forankret og STARTET ~1,5 s inn i fasen — den skedulerte kjeden
 * preempter da (becomeAudibleWithPreemption, fade) den reaktive annonserings-
 * kjeden som startet ved fasestart (rest-cue → bro-neste → øvelsesnavn, eller
 * intro → førsteøvelse i prepare), og øvelsesnavnet ble ALDRI lest opp i hele
 * økta. En kandidat med KJENT varighet skeduleres derfor kun når kjedestarten
 * (endsAt − varighet) ligger minst så mange sekunder etter «nå» (motorklokken):
 * 6 s gir rom til rest-cue + bro + øvelsesnavn før nedtellingen tar over.
 */
export const ANNOUNCE_HEADROOM_S = 6;

// Grensefaser der nedtellingen kulminerer i en fasegrense med arbeids-tilrop.
const BOUNDARY_PHASES: ReadonlyArray<IntervalPhase> = ['prepare', 'rest', 'round_rest'];

type PhaseStartedEvent = Extract<EngineEvent, { type: 'phase:started' }>;
type ResyncEvent = Extract<EngineEvent, { type: 'resync' }>;

/** Hva som er skedulert for inneværende fase — nok til å reskedulere ved fristflytt. */
type PendingLookahead =
  | { kind: 'boundary'; start321Key: string; start321ShortKey: string | null; goKey: string }
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
/**
 * Spiller en bufferkjede og kjører oppfølgeren FØRST etter kjedeslutt —
 * epoch- og status-gatet (fix-løkke etter spec-review): epoken fanges FØR
 * kjeden startes; et skip/fasebytte bumper phaseEpoch, og da skal oppfølgeren
 * aldri kjøre selv om promiset løses true (bevisst-stopp-kontrakten). Se
 * DirectorCtx-doc. Delt av bro+TTS-veiene og persona-rest-kjedene.
 */
function playChainThen(ctx: DirectorCtx, keys: string[], followUp: () => void): void {
  const epoch = ctx.getPhaseEpoch();
  void audioBufferEngine.playSequence(keys).then(() => {
    // Pause/reset i mellomtiden: ikke fortsett oppå en stoppet økt
    if (epoch === ctx.getPhaseEpoch() && ctx.engine.getSnapshot().status === 'running') {
      followUp();
    }
  });
}

/**
 * prefixKeys (BØR-1, sluttreview): cachede klipp (persona-rest-cuen) som skal
 * spilles FORAN broen i samme sample-nøyaktige kjede — aldri overlappende tale.
 */
function playBridgeThenTts(
  ctx: DirectorCtx,
  bridgeCue: 'bro-neste' | 'bro-naa' | 'bro-resync',
  name: string,
  fallback: () => void,
  prefixKeys: string[] = []
): void {
  const key = getPersonaClipKey(bridgeCue);
  if (!key || !audioBufferEngine.has(key)) {
    // Uten cachet bro skal et evt. prefiks (rest-cuen) fortsatt spilles først,
    // med fallback-annonseringen etter kjedeslutt.
    if (prefixKeys.length > 0) {
      playChainThen(ctx, prefixKeys, fallback);
    } else {
      fallback();
    }
    return;
  }
  playChainThen(ctx, [...prefixKeys, key], () => speechService.speak(name));
}

/** Offentlig flate mot hook-bindingen (β4 + Oppgave B): frakobling + kaldstart-replan. */
export interface AudioDirectorHandle {
  /** Kobler Directoren fra motorens hendelsesstrøm (hookens cleanup). */
  unsubscribe: () => void;
  /**
   * Re-planlegger aktiv fases lookahead (kaldstart, live timing-funn B):
   * kalles av hooken når preloadPersonaAudio-promiset løses ETTER at en fase
   * alt har startet — planLookahead så da ucachede buffere og degraderte til
   * pip. Guardet på status/aktiv fase; no-op ellers.
   */
  replanCurrentPhase: () => void;
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
 * motionTracker-ansvaret fulgte med fra adapteren (slettet i β4); Directoren
 * kobles av hook-bindingen i useIntervalTimer (β4) og er eneste lydabonnent.
 */
export function createAudioDirector(engine: AudioDirectorEngine): AudioDirectorHandle {
  // Per-fase-tilstand i lukning:
  // pending: hva som er skedulert (overlever pause slik at resume kan reskedulere).
  // currentDeadline: forrige phase:started sin frist — skip-deteksjon.
  // beepFallback: satt når skedulering feilet (for trangt vindu/ucachet) — da
  // arver countdown-pipene grensen i persona-modus («aldri avkuttet tale»).
  // phaseEpoch: vakt mot at et SENT false-svar fra en forrige fases skedulering
  // setter fallback-flagget for feil fase.
  // currentPhaseEvent: siste phase:started — grunnlaget for replanCurrentPhase
  // (Oppgave B); nullstilles ved reset så en sen preload aldri replanlegger
  // en forlatt økt.
  // issueGen (BØR-1, review-oppfølging): utstedelses-generasjon — bumpes ved
  // HVER ny utstedelsesrunde (fasestart, fristflytt, replan) og fanges av
  // stige-fallbackens .then-vakt. Epoch+frist-sjekken alene har et hull:
  // replan i SAMME fase mot SAMME frist endrer ingen av dem, så et SENT
  // false-svar fra det opprinnelige full-forsøket (suspendert ctx) ville
  // skedulert en short-kjede nummer to oppå replanens egen stige. phaseEpoch
  // bumpes BEVISST ikke av replan — den gater TTS-oppfølgerne (playChainThen
  // m.fl.), som skal overleve et replan i samme fase.
  // lookaheadDegraded (BØR-2): fase-skopet «minst én utstedelse svarte false»
  // — replan re-utsteder KUN da. Alt lyktes → kjeden kan alt være hørbar, og
  // kanseller+reutsted ville kunnet gi pip over spillende stemme eller
  // omstart av nedtellingen; varmstart-replan er derfor ren no-op.
  let pending: PendingLookahead | null = null;
  let currentDeadline: number | null = null;
  let beepFallback = false;
  let phaseEpoch = 0;
  let issueGen = 0;
  let lookaheadDegraded = false;
  let currentPhaseEvent: PhaseStartedEvent | null = null;

  // Delt med speil-funksjonene: gir TTS-etter-kjede-veiene tilgang til
  // fase-epoken (guard mot skip-lekkasje — se DirectorCtx).
  const ctx: DirectorCtx = { engine, getPhaseEpoch: () => phaseEpoch };

  function issuePending(endsAt: number): void {
    if (!pending) return;
    const epoch = phaseEpoch;
    const gen = issueGen;
    // scheduleSequence resolver false STRAKS ved ucachet nøkkel/manglende bro/
    // for trangt vindu — men true først når kjeden har SPILT ferdig (og true
    // ved bevisst stopp). Derfor fire-and-forget med .then, aldri await: å
    // vente på suksess ville blokkert til fasegrensen.
    // gen-sjekken (BØR-1): et false-svar fra en ELDRE utstedelsesrunde (før et
    // replan i samme fase) skal verken sette flagg eller utløse stigen —
    // den nye rundens egne svar styrer.
    const flagIfTooTight = (ok: boolean): void => {
      if (!ok && epoch === phaseEpoch && gen === issueGen) {
        beepFallback = true;
        lookaheadDegraded = true;
      }
    };
    if (pending.kind === 'boundary') {
      // start_321-stigen (live timing-funn A): fullvarianten (~20 s) får aldri
      // plass i Tabatas 10 s-grensefaser — prøv den kortere short-varianten
      // før pip-fallbacken. Trygt mot dobbel avspilling: false fra
      // scheduleSequence er kontraktsfestet uten sideeffekter (ucachet nøkkel/
      // manglende bro/for trangt vindu — ingenting ble skedulert), og et stopp/
      // kansellering i resume-await-vinduet svarer true, aldri false. Stale-
      // vakten (epoch + frist) hindrer at et SENT false-svar (resume-await)
      // skedulerer short mot en forlatt fase eller flyttet frist —
      // handleDeadlineChanged har da alt kansellert og reskedulert selv.
      //
      // Annonseringsprioritet (ANNOUNCE_HEADROOM_S, felttest-funn): en kandidat
      // med KJENT varighet skeduleres kun når kjedestarten (endsAt − varighet)
      // gir annonseringskjeden minst hodrommet fra «nå» (motorklokken, samme
      // tidsbase som endsAt). fitsHeadroom: null = ukjent varighet (ucachet,
      // kaldstart) → dagens stige uendret; degraderingsflagget + replan-
      // CurrentPhase re-evaluerer med fasit når preload er ferdig.
      const shortKey = pending.start321ShortKey;
      const nowMs = engine.getNow();
      const fitsHeadroom = (key: string): boolean | null => {
        const durationS = audioBufferEngine.getDuration(key);
        if (durationS === null) return null;
        return endsAt - durationS * 1000 >= nowMs + ANNOUNCE_HEADROOM_S * 1000;
      };
      if (fitsHeadroom(pending.start321Key) === false) {
        // Full er cachet men ville preemptet annonseringen — forsøk aldri full;
        // vurder short direkte mot samme hodrom.
        if (shortKey && fitsHeadroom(shortKey) !== false) {
          void audioBufferEngine.scheduleSequence([shortKey], { endAt: endsAt }).then(flagIfTooTight);
        }
        // Ellers (short passer heller ikke, eller mangler): INGEN endAt-kjede
        // og INGEN pip-/degraderingsflagg — dette er en bevisst prioritering av
        // annonseringen, ikke en degradering. Go-tilropet på grensen skeduleres
        // uansett (under) og markerer fasebyttet.
      } else {
        void audioBufferEngine.scheduleSequence([pending.start321Key], { endAt: endsAt }).then((ok) => {
          if (ok) return;
          if (epoch !== phaseEpoch || endsAt !== currentDeadline || gen !== issueGen) return;
          if (shortKey) {
            void audioBufferEngine.scheduleSequence([shortKey], { endAt: endsAt }).then(flagIfTooTight);
          } else {
            flagIfTooTight(false);
          }
        });
      }
      void audioBufferEngine.scheduleSequence([pending.goKey], { startAt: endsAt }).then(flagIfTooTight);
    } else {
      // last5-svikt gir INGEN pip-fallback: cuen er motivasjon midt i fasen,
      // ikke et grensesignal — stille degradering er dagens (utriggede) adferd.
      // Men degraderingsflagget settes (BØR-2), slik at et kaldstart-replan
      // får re-utstede cuen når bufferne omsider er dekodet.
      void audioBufferEngine.scheduleSequence([pending.key], { startAt: endsAt - LAST5_LEAD_MS }).then((ok) => {
        if (!ok && epoch === phaseEpoch && gen === issueGen) lookaheadDegraded = true;
      });
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
      // short-varianten er valgfri (kan mangle ved bygg) — stigen degraderer
      // da til dagens full-eller-pip-adferd.
      pending = {
        kind: 'boundary',
        start321Key,
        start321ShortKey: getPersonaClipKey('start_321_short'),
        goKey,
      };
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
    issueGen++;
    pending = null;
    beepFallback = false;
    lookaheadDegraded = false;
    currentDeadline = e.endsAt;
    currentPhaseEvent = e;

    mirrorLegacyPhaseStarted(ctx, e);
    planLookahead(e);
  }

  /**
   * Kaldstart-replan (Oppgave B, live timing-funn B): preloadPersonaAudio
   * fullførte ETTER at fasen startet — planLookahead så ucachede buffere,
   * scheduleSequence svarte false og fasen degraderte til pip. Re-kjør KUN
   * lookahead-planleggingen for aktiv fase (aldri de reaktive annonseringene —
   * intro/rest-cuen skal ikke spilles på nytt), mot GJELDENDE frist
   * (currentDeadline kan ha flyttet seg siden fasestart via deadlineChanged/
   * resume). Samme hygiene som handleDeadlineChanged: fersk tidsbro, nullstilt
   * pip-flagg, og cancelScheduled FØR ny utstedelse — en allerede vellykket
   * lookahead re-utstedes da identisk (nett-effekt uendret), aldri dobbelt.
   * Epoch-vakten er implisitt: issuePending fanger gjeldende phaseEpoch, og
   * kalles replan etter et fasebytte er currentPhaseEvent alt den NYE fasens
   * hendelse — gamle ankre re-utstedes aldri.
   *
   * BØR-2 (review-oppfølging): betinget på lookaheadDegraded — kun når minst
   * én utstedelse faktisk svarte false er det noe å reparere. Lyktes alt ved
   * fasestart (delvis varm cache) kan kjeden alt være hørbar, og kanseller+
   * reutsted ville kunnet kutte spillende stemme eller omstarte nedtellingen:
   * varmstart-replan er ren no-op. (En utstedelse som fortsatt HENGER i
   * resume-await har ikke svart false → også no-op; svarer den false senere,
   * kjører stigen dens med matchende generasjon som normalt.)
   * BØR-1: issueGen bumpes så SENE false-svar fra runden FØR replanet aldri
   * utløser en ekstra short-kjede oppå replanens egen stige.
   */
  function replanCurrentPhase(): void {
    if (currentPhaseEvent === null || currentDeadline === null) return;
    if (engine.getSnapshot().status !== 'running') return;
    if (!lookaheadDegraded) return;
    issueGen++;
    audioBufferEngine.setTimeBridge(engine.getNow());
    beepFallback = false;
    lookaheadDegraded = false;
    pending = null;
    audioBufferEngine.cancelScheduled();
    planLookahead({ ...currentPhaseEvent, endsAt: currentDeadline });
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
    // Ny utstedelsesrunde (BØR-1): sene svar fra den gamle er ugyldige.
    issueGen++;
    beepFallback = false;
    lookaheadDegraded = false;
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

  const unsubscribe = engine.subscribeEvents((event) => {
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
        lookaheadDegraded = false;
        currentPhaseEvent = null;
        break;
      default:
        break;
    }
  });

  return { unsubscribe, replanCurrentPhase };
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
  // Bevegelsessporing er persona-uavhengig og står bevisst UTENFOR if(!silent):
  // også en stille arbeidsfase (f.eks. gjenopptatt økt) skal telle reps.
  motionTrackerService.start((m: MotionMetrics) => {
    ctx.engine.setMotionReps(m.count);
  }, 'hopp');
}

function mirrorRest(ctx: DirectorCtx, event: PhaseStartedEvent): void {
  const snap = ctx.engine.getSnapshot();
  const { nextExercise, tone, silent } = event;
  if (!silent) {
    if (getActiveCoachPersona() === 'standard') {
      // Standard-veien: uendret (tone + TTS-annonsering som i dag)
      audioService.playRestStart(snap.soundEnabled);
      if (snap.speechEnabled) {
        speechService.announceRest(nextExercise?.name, tone);
      }
    } else {
      mirrorPersonaRest(ctx, snap, nextExercise);
    }
  }
  motionTrackerService.stop();
}

/**
 * Persona-rest (BØR-1, sluttreview): personaens 'rest'-cue erstatter
 * playRestStart-tonen — bevisst aktivering av produsert-men-utriggret innhold,
 * samme presedens som last5 (spec § 4/§ 5: cuen er innspilt, manifestert og
 * preloadet for alle personaer, men var aldri koblet). Cuen spilles FØRST og
 * neste-øvelse-annonseringen DERETTER: i ÉN sample-nøyaktig kjede når begge er
 * cachet, ellers etter kjedeslutt via playChainThen — aldri overlappende tale.
 * Ucachet cue, eller tale av (cuen er stemme og respekterer tale-bryteren):
 * dagens tone + annonsering, uendret.
 */
function mirrorPersonaRest(
  ctx: DirectorCtx,
  snap: TimerState,
  nextExercise: Exercise | null
): void {
  const restKey = getPersonaClipKey('rest');
  const restCued = snap.speechEnabled && restKey !== null && audioBufferEngine.has(restKey);
  const prefixKeys = restCued && restKey ? [restKey] : [];
  if (!restCued) {
    audioService.playRestStart(snap.soundEnabled);
  }
  if (snap.speechEnabled && nextExercise) {
    announceNextExercise(ctx, nextExercise, prefixKeys);
  } else if (prefixKeys.length > 0) {
    void audioBufferEngine.playSequence(prefixKeys);
  }
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
function announceNextExercise(ctx: DirectorCtx, next: Exercise, prefixKeys: string[] = []): void {
  const personaKey = getPersonaClipKey('exercise-' + next.id);
  const studioKey = 'exercise-' + next.id;
  const fallback = (): void => {
    audioClipService.playClipOrFallback(studioKey, 'Neste: ' + next.name);
  };
  const plan = resolveAnnouncementPlan({
    personaActive: true, // kalleren står i persona-grenen
    personaClipCached: personaKey !== null && audioBufferEngine.has(personaKey),
    studioClipCached: audioBufferEngine.has(studioKey),
    isCustomExercise: isCustomExercise(next),
    speechEnabled: true, // speech-gaten ligger hos kalleren (mirrorRest)
  });
  if (plan === 'persona' && personaKey) {
    const broKey = getPersonaClipKey('bro-neste');
    const nameKeys = broKey && audioBufferEngine.has(broKey) ? [broKey, personaKey] : [personaKey];
    // playSequence rejecter aldri (kontraktsfestet og NaN-vaktet i motoren) —
    // ingen redundant .catch (review-notat: én konsekvent linje, stol på kontrakten)
    void audioBufferEngine.playSequence([...prefixKeys, ...nameKeys]);
  } else if (plan === 'studio' && prefixKeys.length > 0) {
    // Rest-cue + studioklipp: begge cachet (studio-planen garanterer klippet) —
    // én kjede, aldri overlapp (BØR-1).
    void audioBufferEngine.playSequence([...prefixKeys, studioKey]);
  } else if (plan === 'bridge-tts') {
    playBridgeThenTts(ctx, 'bro-neste', next.name, fallback, prefixKeys);
  } else if (prefixKeys.length > 0) {
    // tts-plan med rest-cue foran: cuen først, fallback-kjeden (som selv ender
    // i TTS) etter kjedeslutt — epoch-/status-gatet som de andre TTS-veiene.
    playChainThen(ctx, prefixKeys, fallback);
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

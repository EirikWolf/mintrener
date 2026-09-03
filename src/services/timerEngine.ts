import { WorkoutTemplate, TimerState, IntervalPhase } from '../types/workout';
import { EngineEvent, PersistPayload } from '../types/engineEvents';
import { InterruptedSession } from './sessionRecoveryService';
import { loadPersistedSettings, savePersistedSettings } from './settingsStorageService';

// Terskel (sekunder) for å skille normal tick-drift (fanen synlig) fra en reell
// oppvåkning etter dvale/lomme – under denne kjøres vanlig enkelt-avansement.
const CATCH_UP_THRESHOLD_S = 1.5;
// Sikkerhetsgrense på antall stille faser catchUpExpiredPhases kan spole gjennom i
// én tick. Ved (ekstremt usannsynlig) treff på grensen droppes resten av overshoot
// bevisst – tilstanden forblir konsistent, men timeren går da bak veggklokken til
// neste tick fanger opp resten.
const MAX_CATCH_UP_PHASES = 500;

// Terskel (ms) for å skille normalt veggklokke/motorklokke-avvik (NTP-korrigering,
// GC-pause, liten klokkedrift) fra en reell dvale-periode der performance.now har
// frosset mens Date.now fortsatte – kjent oppførsel på iOS/macOS Safari og enkelte
// Android-nettlesere (audit § 2.1). Under denne terskelen er avviket "støy" og
// motorklokke-basert catch-up (CATCH_UP_THRESHOLD_S) håndterer det som normalt.
const SLEEP_REANCHOR_THRESHOLD_MS = 2000;

/**
 * Intern tilstand = dagens `stateRef.current`-form fra useIntervalTimer (én
 * representasjon; `precise*`-speilene og React-state-speilet utgår i motoren —
 * den regner alltid presist og materialiserer snapshot ved behov).
 */
interface EngineState {
  status: TimerState['status'];
  phase: IntervalPhase;
  currentRound: number;
  currentItemIndex: number;
  phaseDuration: number;
  phaseRemaining: number;
  totalElapsed: number;
  isLocked: boolean;
  soundEnabled: boolean;
  vibrateEnabled: boolean;
  wakeLockEnabled: boolean;
  speechEnabled: boolean;
  motionReps: number;
  activeWorkout: WorkoutTemplate;
  // Tidsanker og cue-gating — samme felter som hookens stateRef (α3-ticken leser dem).
  phaseStartTime: number;
  workoutStartTime: number;
  lastCountdownBeep: number;
  lastSessionSaveSecond: number;
  firedCues: Set<string>;
  /**
   * Antall repetisjoner den pågående fasen venter på, eller null for en vanlig
   * tidsbasert fase. Er den satt, utløper ikke fasen av seg selv — brukeren
   * avslutter den med skipNext().
   */
  awaitingReps: number | null;
  lastTickWallMs: number;
  lastTickPerfMs: number;
}

/**
 * Rammeverksfri fasemaskin for intervalløkter (B3, spec § 3). Ren klasse —
 * null React, null lyd-imports. Tidskilde injiseres slik at karakteriserings-
 * testene kan drive klokken deterministisk uten fake timers.
 */
export class TimerEngine {
  private readonly now: () => number;
  private state: EngineState;
  // Speiler hookens `workout`-prop som siste fallback i setupPhase (setWorkout
  // oppdaterer den i α-senere task); activeWorkout er normalt alltid gyldig.
  private propWorkout: WorkoutTemplate;
  private readonly eventHandlers = new Set<(e: EngineEvent) => void>();
  private readonly snapshotListeners = new Set<() => void>();
  // Identitets-cache for snapshot-kanalen (A3-gatingen flyttet til snapshot-
  // identitet, spec § 3): samme objekt returneres til nøkkelen — de rendrings-
  // verdige feltene — endres. Workout-referansen sammenlignes separat siden den
  // ikke lar seg stringifisere meningsfullt i nøkkelen.
  private snapshotCache: { key: string; workout: WorkoutTemplate; value: TimerState } | null = null;
  // Injisert persistens-callback (persistenceSubscriber kobler i α4). Default
  // no-op slik at motoren aldri rører localStorage selv.
  private onPersist: (session: PersistPayload) => void = () => {};
  // Nøkkel/workout-referanse ved forrige lytter-varsel — BEVISST atskilt fra
  // snapshotCache (α5-funn): hendelses-abonnenter (adapterne) kaller
  // getSnapshot() midt i emit-kjedene (phase:started m.fl.), og det refresher
  // cachen med den NYE nøkkelen FØR notifySnapshotIfChanged rekker å
  // sammenligne. En cache-basert endringssjekk svelget dermed varselet og lot
  // React stå igjen på et foreldet snapshot. Varselgatingen trenger derfor
  // egen hukommelse om hva lytterne sist fikk beskjed om.
  private lastNotifiedKey: string;
  private lastNotifiedWorkout: WorkoutTemplate;

  constructor(workout: WorkoutTemplate, now: () => number = () => performance.now()) {
    this.now = now;
    this.propWorkout = workout;
    const initialSettings = loadPersistedSettings();
    this.state = {
      status: 'idle',
      phase: 'prepare',
      currentRound: 1,
      currentItemIndex: 0,
      phaseDuration: workout.prepareDurationSeconds,
      phaseRemaining: workout.prepareDurationSeconds,
      totalElapsed: 0,
      isLocked: false,
      soundEnabled: initialSettings.soundEnabled,
      vibrateEnabled: initialSettings.vibrateEnabled,
      wakeLockEnabled: initialSettings.wakeLockEnabled,
      speechEnabled: initialSettings.speechEnabled,
      motionReps: 0,
      activeWorkout: workout,
      phaseStartTime: 0,
      workoutStartTime: 0,
      lastCountdownBeep: -1,
      lastSessionSaveSecond: -1,
      firedCues: new Set<string>(),
      awaitingReps: null,
      lastTickWallMs: 0,
      lastTickPerfMs: 0,
    };
    this.lastNotifiedKey = this.computeSnapshotKey();
    this.lastNotifiedWorkout = workout;
    // α5 sender getSnapshot/subscribe UBUNDET til useSyncExternalStore — bind her
    // slik at metodereferansene er trygge uten .bind på kallstedet.
    this.getSnapshot = this.getSnapshot.bind(this);
    this.subscribe = this.subscribe.bind(this);
  }

  private emit(event: EngineEvent): void {
    // Kopi av settet slik at en handler som melder seg av under emisjon ikke
    // forstyrrer iterasjonen.
    for (const handler of [...this.eventHandlers]) {
      handler(event);
    }
  }

  // Fasevarighet med samme defaults som hookens setupPhase-grener (portert uendret;
  // skilt ut kun for å holde setupPhase under linjegrensen).
  private static phaseDurationFor(newPhase: IntervalPhase, w: WorkoutTemplate, itemIdx: number): number {
    const items = w?.items || [];
    if (newPhase === 'prepare') return w?.prepareDurationSeconds || 5;
    if (newPhase === 'work') return items[itemIdx]?.workDurationSeconds || 20;
    if (newPhase === 'rest') return items[itemIdx]?.restDurationSeconds || 10;
    if (newPhase === 'round_rest') return w?.roundRestDurationSeconds || 30;
    return 0; // complete
  }

  /**
   * Sett opp en ny fase — portert fra useIntervalTimer.setupPhase. Lyd/tale/
   * vibrasjonsblokkene per fase er erstattet av ÉN phase:started-emisjon med alle
   * felter (adapterne i α4 gjenskaper dagens forgreninger fra payloaden).
   * motionTrackerService.start/stop (work/rest/round_rest/complete) flytter til
   * LegacyAudioAdapter i α4; wakeLockService.releaseLock() ved complete eies av
   * hook-bindingen (α5).
   */
  private setupPhase(
    newPhase: IntervalPhase,
    round: number,
    itemIdx: number,
    silent: boolean = false,
    targetWorkout?: WorkoutTemplate
  ): void {
    const isValidTarget = Boolean(targetWorkout && typeof targetWorkout === 'object' && Array.isArray(targetWorkout.items));
    const w = isValidTarget ? (targetWorkout as WorkoutTemplate) : (this.state.activeWorkout?.items ? this.state.activeWorkout : this.propWorkout);
    const items = w?.items || [];
    const tone = w?.voiceTone || 'rolig';
    const duration = TimerEngine.phaseDurationFor(newPhase, w, itemIdx);

    this.state.firedCues = new Set<string>();

    // Repetisjonsbasert arbeidsfase: varigheten er et anslag for totaltiden,
    // ikke en frist. Fasen står til brukeren sier ifra.
    const awaitingReps =
      newPhase === 'work' ? (items[itemIdx]?.targetReps ?? null) : null;
    this.state.awaitingReps = awaitingReps;

    const phaseStart = this.now();
    this.state.phase = newPhase;
    this.state.currentRound = round;
    this.state.currentItemIndex = itemIdx;
    this.state.phaseDuration = duration;
    this.state.phaseRemaining = duration;
    this.state.phaseStartTime = phaseStart;
    this.state.lastCountdownBeep = -1;
    this.state.lastSessionSaveSecond = -1;

    if (newPhase === 'complete') {
      this.state.status = 'completed';
      // clearInterruptedSession(): persistenceSubscriber (α4) lytter på
      // workout:completed. Perf-rapporteringen (stopWorkoutMonitoring +
      // recordPerfTelemetry) eies av hook-bindingen (α5).
    }

    // Emisjonen skjer ETTER tilstandsoppdateringen slik at abonnenter som leser
    // snapshot ved hendelsen ser den nye fasen.
    this.emit({
      type: 'phase:started',
      phase: newPhase,
      round,
      itemIndex: itemIdx,
      exercise: items[itemIdx]?.exercise ?? null,
      // round_rest starter neste runde forfra: hookens round_rest-gren annonserte
      // items[0]?.exercise som «neste», ikke items[idx+1] (useIntervalTimer.ts,
      // round_rest-blokken). rest wrapper IKKE — siste-item-rest annonserte
      // undefined i hooken, så null her er bit-identisk.
      nextExercise: (newPhase === 'round_rest' ? items[0]?.exercise : items[itemIdx + 1]?.exercise) ?? null,
      durationS: duration,
      tone,
      silent,
      // Ingen frist når fasen venter på brukeren: endsAt styrer
      // nedtellingspipene, og de skal ikke telle mot et tidspunkt uten mening.
      endsAt:
        newPhase === 'complete' || awaitingReps !== null
          ? null
          : phaseStart + duration * 1000,
    });
    if (newPhase === 'complete') {
      this.emit({ type: 'workout:completed', tone });
    }
  }

  // Gå til neste logiske fase — portert ordrett fra useIntervalTimer. `silent`
  // propageres til setupPhase slik at catch-up (α3) kan spole gjennom flere faser
  // uten hendelses-støy per fase.
  private advanceToNextPhase(silent: boolean = false): void {
    const { phase: currentPhase, currentRound: r, currentItemIndex: idx, activeWorkout: w } = this.state;

    if (currentPhase === 'prepare') {
      this.setupPhase('work', 1, 0, silent);
    } else if (currentPhase === 'work') {
      const isLastItem = idx + 1 >= w.items.length;
      const isLastRound = r >= w.rounds;

      // Hvis dette var siste øvelse i siste runde, fullfør økten umiddelbart.
      // Fullføring er ALDRI stille – selv under catch-up skal sluttsignalet høres
      // (silent-parameteren ignoreres bevisst her, se catchUpExpiredPhases i α3).
      if (isLastItem && isLastRound) {
        this.setupPhase('complete', r, idx, false);
      } else {
        const item = w.items[idx];
        if (item && item.restDurationSeconds > 0) {
          this.setupPhase('rest', r, idx, silent);
        } else {
          // Hopp direkte til neste øvelse hvis 0 sekunders pause
          if (idx + 1 < w.items.length) {
            this.setupPhase('work', r, idx + 1, silent);
          } else if (r < w.rounds) {
            if (w.roundRestDurationSeconds > 0) {
              this.setupPhase('round_rest', r, 0, silent);
            } else {
              this.setupPhase('work', r + 1, 0, silent);
            }
          }
        }
      }
    } else if (currentPhase === 'rest') {
      if (idx + 1 < w.items.length) {
        this.setupPhase('work', r, idx + 1, silent);
      } else if (r < w.rounds) {
        if (w.roundRestDurationSeconds > 0) {
          this.setupPhase('round_rest', r, 0, silent);
        } else {
          this.setupPhase('work', r + 1, 0, silent);
        }
      } else {
        // Fullføring er aldri stille – se kommentar i 'work'-grenen over.
        this.setupPhase('complete', r, idx, false);
      }
    } else if (currentPhase === 'round_rest') {
      this.setupPhase('work', r + 1, 0, silent);
    }
  }

  // Beregn total estimert tid for hele økten (uten unødvendig pause etter aller
  // siste øvelse) — portert uendret fra useIntervalTimer sin
  // calculateTotalWorkoutSeconds.
  private calculateTotalWorkoutSeconds(): number {
    const w = this.state.activeWorkout;
    const items = w?.items || [];
    const rounds = w?.rounds || 1;
    const prepareDuration = w?.prepareDurationSeconds || 5;
    if (items.length === 0) return prepareDuration;
    let sum = prepareDuration;
    for (let r = 0; r < rounds; r++) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        sum += item.workDurationSeconds;
        const isLastInWorkout = r === rounds - 1 && i === items.length - 1;
        if (!isLastInWorkout) {
          sum += item.restDurationSeconds;
        }
      }
      if (r < rounds - 1) {
        sum += w?.roundRestDurationSeconds || 0;
      }
    }
    return sum;
  }

  // Rendringsverdige felter (A3-gatingen): hele sekunder i stedet for presise
  // flyttall — phaseProgress/desimaler endres hver tick, men snapshotet skal kun
  // bytte identitet når det VISTE tallet endres. Math.ceil(phaseRemaining) og
  // Math.floor(totalElapsed) er nøyaktig hookens gating-porter (setPhaseRemaining/
  // setTotalElapsed-betingelsene i tick).
  private computeSnapshotKey(): string {
    const s = this.state;
    return [
      s.status, s.phase, s.currentRound, s.currentItemIndex, s.phaseDuration,
      Math.ceil(s.phaseRemaining), Math.floor(s.totalElapsed),
      s.isLocked, s.soundEnabled, s.vibrateEnabled, s.wakeLockEnabled,
      s.speechEnabled && s.soundEnabled, s.motionReps, s.awaitingReps,
    ].join('|');
  }

  /**
   * Immutabelt snapshot med identitets-cache: nytt objekt KUN når noe rendrings-
   * verdig endres (hel-sekund, fase, status, indekser, toggles). Dette erstatter
   * A3-render-gatingen fra hooken — motoren regner alltid presist internt,
   * snapshot-identiteten er gating-mekanismen (spec § 3). Trygg som
   * useSyncExternalStore-kilde (bundet i konstruktøren).
   */
  getSnapshot(): TimerState {
    const key = this.computeSnapshotKey();
    const cache = this.snapshotCache;
    if (cache && cache.key === key && cache.workout === this.state.activeWorkout) {
      return cache.value;
    }
    const value = this.materializeSnapshot();
    this.snapshotCache = { key, workout: this.state.activeWorkout, value };
    return value;
  }

  private materializeSnapshot(): TimerState {
    const s = this.state;
    const workoutItems = s.activeWorkout?.items || [];
    const currentItem = workoutItems[s.currentItemIndex] || workoutItems[0];
    const nextItem =
      s.currentItemIndex + 1 < workoutItems.length
        ? workoutItems[s.currentItemIndex + 1]
        : s.currentRound < (s.activeWorkout?.rounds || 1)
        ? workoutItems[0]
        : null;

    const currentExercise = currentItem ? currentItem.exercise : null;
    const nextExercise = nextItem ? nextItem.exercise : null;

    // En ventende fase har ingen fremdrift å vise — sirkelen skal stå stille,
    // ikke krype mot et anslag brukeren ikke er bundet av.
    const phaseProgress =
      s.awaitingReps !== null
        ? 0
        : s.phaseDuration > 0
        ? (s.phaseDuration - s.phaseRemaining) / s.phaseDuration
        : 1;
    const totalWorkoutDuration = this.calculateTotalWorkoutSeconds();
    const totalRemainingSeconds = Math.max(0, totalWorkoutDuration - s.totalElapsed);

    return {
      status: s.status,
      phase: s.phase,
      currentRound: s.currentRound,
      totalRounds: s.activeWorkout?.rounds || 1,
      currentItemIndex: s.currentItemIndex,
      totalItems: workoutItems.length,
      currentExercise,
      nextExercise,
      phaseRemainingSeconds: Math.ceil(s.phaseRemaining),
      phaseTotalSeconds: s.phaseDuration,
      phaseProgress,
      totalRemainingSeconds: Math.ceil(totalRemainingSeconds),
      totalElapsedSeconds: Math.floor(s.totalElapsed),
      isLocked: s.isLocked,
      soundEnabled: s.soundEnabled,
      vibrateEnabled: s.vibrateEnabled,
      wakeLockEnabled: s.wakeLockEnabled,
      // Tale er BETINGET av lyd. Med to uavhengige brytere kunne stemmen
      // fortsette etter at brukeren hadde slått av lyden — «av» må bety av.
      // Brukerens valg ligger urørt i s.speechEnabled, så nivået kommer
      // tilbake når lyden slås på igjen.
      speechEnabled: s.speechEnabled && s.soundEnabled,
      motionReps: s.motionReps,
      // undefined, ikke null, i den utadvendte typen: fraværet av et mål er
      // «ingen repetisjoner å vente på», ikke «null repetisjoner».
      awaitingReps: s.awaitingReps ?? undefined,
    };
  }

  /** Snapshot-kanalen (React): varsles kun når snapshot-identiteten vil endres. */
  subscribe(listener: () => void): () => void {
    this.snapshotListeners.add(listener);
    return () => {
      this.snapshotListeners.delete(listener);
    };
  }

  // Varsle snapshot-lyttere kun når identiteten faktisk vil endres. Sammenligner
  // mot lastNotified* (hva lytterne sist fikk beskjed om) — ALDRI mot
  // snapshotCache, som refreshes av abonnenters getSnapshot()-kall midt i
  // emit-kjedene og dermed ville skjult endringen (se felt-kommentaren).
  private notifySnapshotIfChanged(): void {
    const key = this.computeSnapshotKey();
    if (key === this.lastNotifiedKey && this.state.activeWorkout === this.lastNotifiedWorkout) {
      return;
    }
    this.lastNotifiedKey = key;
    this.lastNotifiedWorkout = this.state.activeWorkout;
    for (const listener of [...this.snapshotListeners]) {
      listener();
    }
  }

  /**
   * Motorens «nå» (ms, samme klokke som endsAt i hendelsene) — AudioDirector
   * måler tidsbroen mot lydklokken med denne ved workout:started (flagget
   * minimal tilføyelse i β2: hendelsene bærer ikke selve klokkeavlesningen).
   */
  getNow(): number {
    return this.now();
  }

  subscribeEvents(handler: (e: EngineEvent) => void): () => void {
    this.eventHandlers.add(handler);
    return () => {
      this.eventHandlers.delete(handler);
    };
  }

  /** Kobler avbrutt-økt-lagringen (persistenceSubscriber i α4). */
  setOnPersist(cb: (session: PersistPayload) => void): void {
    this.onPersist = cb;
  }

  // A6 (portert fra hook-ticken): mål veggklokke/motorklokke-drift FØR ankrene
  // overskrives med denne tickens verdier – IKKE etterpå. Ved oppvåkning fra dvale
  // er workerens ventende tick og visibilitychange-hendelsen begge makrotasks med
  // uspesifisert rekkefølge; et etter-ankring-mønster ville latt en «vanlig» tick
  // som vinner racet skjule hele dvale-perioden for reanker-sjekken. Kun positiv
  // drift over terskelen betyr at motorklokken (performance.now) har «sovet» mens
  // Date.now fortsatte – negativ/liten drift (f.eks. veggklokke justert bakover av
  // NTP) skal IKKE flytte tidsstemplene, ellers hopper timeren feilaktig fremover.
  private reanchorOnWallClockDrift(nowPerf: number, wallNow: number): void {
    const s = this.state;
    const drift = (wallNow - s.lastTickWallMs) - (nowPerf - s.lastTickPerfMs);
    if (drift > SLEEP_REANCHOR_THRESHOLD_MS) {
      s.phaseStartTime -= drift;
      s.workoutStartTime -= drift;
      // Planrettelse (α3-review): reankringen flyttet fasegrensen — varsle
      // planlagt lyd om korrigert frist. KUN når fasen fortsatt lever: er den
      // alt utløpt, overtar catch-up umiddelbart med phase:started +
      // deadlineChanged for landingsfasen, og en frist i fortiden ville bare
      // vært støy for abonnentene.
      const endsAt = s.phaseStartTime + s.phaseDuration * 1000;
      if (endsAt > nowPerf) {
        this.emit({ type: 'phase:deadlineChanged', endsAt });
      }
    }
    s.lastTickWallMs = wallNow;
    s.lastTickPerfMs = nowPerf;
  }

  // Cue-gating portert fra hook-ticken. AVVIK-BY-DESIGN (α3→α4): hooken sjekket
  // persona (og speechEnabled for halfway) FØR cuen ble spilt — motoren er
  // persona-agnostisk og emitter alltid-når-gatet; adapteren (α4) filtrerer på
  // persona/speech. Observabel adferd bevares siden kun adapteren spiller lyd.
  private emitTickCues(phaseElapsed: number, remaining: number): void {
    const s = this.state;
    const wholeSecondsLeft = Math.ceil(remaining);
    const phaseElapsedSec = Math.floor(phaseElapsed);
    const halfwaySec = Math.floor(s.phaseDuration / 2);

    // Bit-identisk port av hookens persona-start_321-vindu (planrettelse fra
    // α3-review): remaining > 0 (a1dc749-vakten mot spurious cue rett før stille
    // catch-up) && <= 3.5, kun prepare/rest/round_rest, firedCues-gated én gang
    // per fase, INGEN varighetsvakt (divergensen fra countdown-pipet: en 3s-fase
    // får endingSoon, aldri countdown). Persona-/speech-filtreringen eies av
    // adapteren (α4).
    if (
      (s.phase === 'prepare' || s.phase === 'rest' || s.phase === 'round_rest') &&
      remaining > 0 &&
      remaining <= 3.5 &&
      !s.firedCues.has('start_321')
    ) {
      s.firedCues.add('start_321');
      this.emit({ type: 'phase:endingSoon' });
    }

    // Halvveis-cue — samme gating som hooken: firedCues, kun work, kun faser >= 15s.
    if (
      s.phase === 'work' &&
      s.phaseDuration >= 15 &&
      phaseElapsedSec === halfwaySec &&
      !s.firedCues.has('halfway')
    ) {
      s.firedCues.add('halfway');
      this.emit({ type: 'phase:halfway' });
    }

    // 3-2-1-nedtelling per helsekund. wholeSecondsLeft >= 1 ER remaining > 0-vakten
    // fra a1dc749 (ceil(remaining) >= 1 ⇔ remaining > 0): ingen emisjon på en
    // allerede utløpt fase rett før catchUpExpiredPhases spoler stille forbi den.
    if (
      wholeSecondsLeft <= 3 &&
      wholeSecondsLeft >= 1 &&
      wholeSecondsLeft !== s.lastCountdownBeep &&
      s.phaseDuration >= 4
    ) {
      s.lastCountdownBeep = wholeSecondsLeft;
      this.emit({ type: 'countdown', secondsLeft: wholeSecondsLeft as 1 | 2 | 3 });
    }
  }

  tick(): void {
    const s = this.state;
    // Hook-ticken kjørte kun mens status === 'running' (ticker-effekten var gatet
    // på status og visibility-handleren sjekket den) — motoren tar samme gate
    // internt slik at bindingen (α5) kan kalle tick() ubetinget fra visibilitychange.
    if (s.status !== 'running') return;

    const now = this.now();
    this.reanchorOnWallClockDrift(now, Date.now());

    const phaseElapsed = (now - s.phaseStartTime) / 1000;
    s.totalElapsed = Math.max(0, (now - s.workoutStartTime) / 1000);

    if (s.awaitingReps !== null) {
      // Fasen venter på brukeren. Klokka går videre for øktens totaltid, men
      // fasen hverken utløper, teller ned eller avgir cues. Uten denne grenen
      // ville catchUpExpiredPhases() spolt forbi øvelsen etter anslaget.
      s.phaseRemaining = s.phaseDuration;
      this.notifySnapshotIfChanged();
      return;
    }

    const remaining = Math.max(0, s.phaseDuration - phaseElapsed);
    s.phaseRemaining = remaining;

    this.emitTickCues(phaseElapsed, remaining);

    const wholeSecondsLeft = Math.ceil(remaining);
    if (remaining <= 0) {
      // Utløpt fase: stille fast-forward ved store tidshopp (dvale/lomme),
      // normalt enkelt-avansement med full hendelse ellers.
      this.catchUpExpiredPhases();
    } else if (
      // Portert ordrett fra hooken; status-sjekken er alltid sann her (tick
      // returnerer tidlig ellers) — behold for ordrett paritet, ikke fjern.
      s.status === 'running' &&
      wholeSecondsLeft % 2 === 0 &&
      wholeSecondsLeft !== s.lastSessionSaveSecond
    ) {
      // Lagre maks én gang per partallssekund – ikke ved hver 100ms-tick
      // (synkron localStorage-I/O hos persistenceSubscriber).
      s.lastSessionSaveSecond = wholeSecondsLeft;
      this.onPersist({
        workout: s.activeWorkout,
        phase: s.phase,
        currentRound: s.currentRound,
        currentItemIndex: s.currentItemIndex,
        totalElapsedSeconds: Math.floor(s.totalElapsed),
      });
    }

    this.notifySnapshotIfChanged();
  }

  // Håndter en eller flere utløpte faser i én tick — portert ordrett fra hooken.
  // Ved normal drift (overshoot ~0) beholdes dagens oppførsel: ett avansement med
  // full hendelse. Ved oppvåkning etter dvale spoles alle utløpte faser stille
  // gjennom, landingsfasen får korrekt gjenværende tid pluss én resync-hendelse –
  // i stedet for en kaskade av hendelser, én per utløpt fase.
  private catchUpExpiredPhases(): void {
    const s = this.state;
    const phaseElapsed = (this.now() - s.phaseStartTime) / 1000;
    const overshoot = Math.max(0, phaseElapsed - s.phaseDuration);

    if (overshoot < CATCH_UP_THRESHOLD_S) {
      this.advanceToNextPhase();
      return;
    }

    let restOvershoot = overshoot;
    let skippedSilently = 0;
    let iterations = 0;

    // Fullføring kaller alltid setupPhase(..., false) (se advanceToNextPhase), så
    // status blir 'completed' idet loopen når 'complete' – while-betingelsen under
    // avslutter da loopen naturlig, uten noe eget complete-tilfelle her.
    while (s.status === 'running' && iterations < MAX_CATCH_UP_PHASES) {
      iterations++;
      this.advanceToNextPhase(true);
      skippedSilently++;

      const newDuration = s.phaseDuration;
      if (restOvershoot >= newDuration) {
        // Denne fasens hele varighet er også spist opp av overshoot – fortsett til neste.
        restOvershoot -= newDuration;
        continue;
      }

      // Landet korrekt inni denne fasen: bakdater phaseStartTime slik at gjenværende
      // tid blir riktig fremover (uten dette ville fasen fremstå som nylig startet).
      s.phaseStartTime = this.now() - restOvershoot * 1000;
      // Planrettelse (α3-review): landingens nettopp-emitterte phase:started.endsAt
      // er foreldet med restOvershoot (setupPhase satte den fra nå + full varighet)
      // — deadlineChanged rett etterpå bærer korrekt frist for planlagt lyd.
      this.emit({
        type: 'phase:deadlineChanged',
        endsAt: s.phaseStartTime + s.phaseDuration * 1000,
      });
      break;
    }

    if (skippedSilently >= 1 && s.status === 'running') {
      this.emitResync(skippedSilently);
    }
  }

  // playResyncCue sin TRIGGER-logikk portert: selve lyden ble resync-hendelsen
  // (adapteren i α4 gjenskaper persona-/standard-forgreningene fra payloaden).
  private emitResync(skippedPhases: number): void {
    const s = this.state;
    const items = s.activeWorkout?.items || [];
    const idx = s.currentItemIndex;
    const landingPhase = s.phase;
    // Samme wrap-regel som phase:started: round_rest annonserer items[0] (neste
    // runde starter forfra), rest annonserer items[idx+1] — jf. hookens
    // playResyncCue/playPersonaResyncCue-forgreninger.
    const nextExercise =
      (landingPhase === 'round_rest' ? items[0]?.exercise : items[idx + 1]?.exercise) ?? null;
    this.emit({
      type: 'resync',
      skippedPhases,
      landingPhase,
      exercise: items[idx]?.exercise ?? null,
      nextExercise,
      tone: s.activeWorkout?.voiceTone || 'rolig',
    });
  }

  start(workout?: WorkoutTemplate): void {
    // Samme defensive validering som hookens startWorkout (den tok imot `unknown`
    // fra UI-lag; sjekken beholdes for bit-identisk fallback-adferd).
    const isValidTarget = Boolean(
      workout &&
      typeof workout === 'object' &&
      'items' in workout &&
      Array.isArray((workout as WorkoutTemplate).items)
    );
    const targetWorkout = isValidTarget ? (workout as WorkoutTemplate) : this.state.activeWorkout;
    this.state.activeWorkout = targetWorkout;

    // Async-sideeffektene fra hookens startWorkout (perf-måling, preloads,
    // unlockAudio, speech-init, wake lock) eies av hook-bindingen (α5) — motoren
    // er synkron og rammeverksfri.
    const nowPerf = this.now();
    this.state.phaseStartTime = nowPerf;
    this.state.workoutStartTime = nowPerf;
    this.state.totalElapsed = 0;
    this.state.lastTickWallMs = Date.now();
    this.state.lastTickPerfMs = nowPerf;
    this.state.status = 'running';

    this.emit({ type: 'workout:started', workout: targetWorkout });
    this.setupPhase('prepare', 1, 0, false, targetWorkout);
    this.notifySnapshotIfChanged();
  }

  pause(): void {
    this.state.status = 'paused';
    // stopCurrentPersonaAudio() → workout:paused (adapteren stopper lyden i α4);
    // wakeLockService.releaseLock() eies av hook-bindingen (α5).
    this.emit({ type: 'workout:paused' });
    // Hookens saveInterruptedSession-kall på pause-stien → injisert onPersist.
    this.onPersist({
      workout: this.state.activeWorkout,
      phase: this.state.phase,
      currentRound: this.state.currentRound,
      currentItemIndex: this.state.currentItemIndex,
      totalElapsedSeconds: Math.floor(this.state.totalElapsed),
    });
    this.notifySnapshotIfChanged();
  }

  resume(): void {
    // unlockAudio/speech-init/wake lock fra hookens resumeWorkout eies av
    // hook-bindingen (α5). Juster phaseStartTime slik at resterende tid bevares
    // nøyaktig — motoren har én, alltid presis representasjon (ingen precise*-speil).
    const nowPerf = this.now();
    const currentRemaining = this.state.phaseRemaining;
    this.state.phaseStartTime = nowPerf - (this.state.phaseDuration - currentRemaining) * 1000;
    // TILSIKTET ADFERDSENDRING (spec § 3, den ENESTE i B3-α): bakdater også
    // workoutStartTime fra presis forløpt tid (symmetrisk med phaseStartTime-
    // linjen over) — hooken lot den stå urørt, så tick etter restore+resume
    // regnet totalElapsed som tid-siden-sidelast i stedet for faktisk økt-tid.
    this.state.workoutStartTime = nowPerf - this.state.totalElapsed * 1000;
    this.state.lastTickWallMs = Date.now();
    this.state.lastTickPerfMs = nowPerf;
    this.state.status = 'running';
    this.emit({ type: 'workout:resumed', endsAt: nowPerf + currentRemaining * 1000 });
    this.notifySnapshotIfChanged();
  }

  reset(): void {
    // perfMonitorService.stopWorkoutMonitoring (avbrutt økt = forkastet rapport)
    // eies av hook-bindingen (α5).
    this.state.status = 'idle';
    // stopCurrentPersonaAudio() + clearInterruptedSession() → workout:reset
    // (LegacyAudioAdapter og persistenceSubscriber lytter i α4);
    // wakeLockService.releaseLock() eies av hook-bindingen (α5).
    this.emit({ type: 'workout:reset' });
    // M1 (α5-review): prop-workouten kan ha byttet midt i økten (setWorkout
    // ignorerer bytte utenfor idle) — nå som vi ER idle, ta det ventende
    // byttet, slik at neste start() uten argument ikke kjører en foreldet økt.
    this.state.activeWorkout = this.propWorkout;
    this.setupPhase('prepare', 1, 0, true); // silent reset!
    this.state.totalElapsed = 0;
    this.state.phaseRemaining = this.state.activeWorkout?.prepareDurationSeconds || 5;
    this.state.phaseDuration = this.state.activeWorkout?.prepareDurationSeconds || 5;
    this.notifySnapshotIfChanged();
  }

  skipNext(): void {
    if (this.state.status === 'completed') return;
    this.advanceToNextPhase();
    this.notifySnapshotIfChanged();
  }

  previous(): void {
    if (this.state.status === 'completed' || this.state.status === 'idle') return;
    const { phase: currentPhase, currentRound: r, currentItemIndex: idx, activeWorkout: w } = this.state;

    if (currentPhase === 'work') {
      if (idx > 0) {
        this.setupPhase('work', r, idx - 1);
      } else if (r > 1) {
        this.setupPhase('work', r - 1, w.items.length - 1);
      } else {
        this.setupPhase('prepare', 1, 0);
      }
    } else if (currentPhase === 'rest') {
      this.setupPhase('work', r, idx);
    } else if (currentPhase === 'round_rest') {
      this.setupPhase('work', r, w.items.length - 1);
    }
    this.notifySnapshotIfChanged();
  }

  restore(session: InterruptedSession): void {
    // Planrettelse (α4-rapport → koordinator): restore-stien emitterte
    // tidligere INGEN hendelse med workout-data — kun det stille phase:started
    // under, som ikke bærer navn/workout-referanse. Abonnenter som trenger
    // workout-navnet (MediaSession m.fl.) fikk da ingenting å cache når en økt
    // ble gjenopprettet uten en forutgående start() i samme abonnent-levetid.
    // Emitteres FØR setupPhase/notifySnapshotIfChanged (begge synkrone, samme
    // tick) slik at abonnenter rekker å cache navnet før snapshot-varselet
    // nederst trigger deres lesing.
    this.emit({ type: 'workout:restored', workout: session.workout });

    // Portert fra hookens restoreSession: stille setupPhase (fasen starter
    // forfra) + status paused. activeWorkout røres bevisst ikke — hooken lot
    // workout-propen eie den også ved restore.
    this.setupPhase(session.phase, session.currentRound, session.currentItemIndex, true);
    this.state.totalElapsed = session.totalElapsedSeconds;
    // TILSIKTET ADFERDSENDRING (spec § 3, den ENESTE i B3-α): bakdater
    // workoutStartTime fra gjenopprettet forløpt tid, slik at
    // saveInterruptedSession ikke rapporterer tid-siden-sidelast — se også
    // den symmetriske linjen i resume().
    this.state.workoutStartTime = this.now() - session.totalElapsedSeconds * 1000;
    this.state.status = 'paused';
    this.notifySnapshotIfChanged();
  }

  /**
   * Prop-sync fra hook-bindingen — kun i idle. BEVISST AVVIK fra hooken (plan-
   * låst; beskrivelse korrigert i α5-review M2): hooken re-tildelte
   * stateRef.current.workout fra activeWorkout-state hvert render, så også
   * FASEMASKINEN byttet workout midt i en kjørende økt — med indeks/runde-
   * tilstand fra den gamle økten anvendt på den nye øktens items. Motoren
   * holder i stedet alt urørt utenfor idle (coherent-by-design); propWorkout-
   * speilet oppdateres uansett og tas i bruk ved neste reset()/idle-sync.
   */
  setWorkout(w: WorkoutTemplate): void {
    if (this.propWorkout === w) return;
    this.propWorkout = w;
    if (this.state.status !== 'idle') return;
    this.state.activeWorkout = w;
    this.state.phase = 'prepare';
    this.state.currentRound = 1;
    this.state.currentItemIndex = 0;
    this.state.phaseDuration = w.prepareDurationSeconds;
    this.state.phaseRemaining = w.prepareDurationSeconds;
    this.state.totalElapsed = 0;
    this.notifySnapshotIfChanged();
  }

  setSoundEnabled(v: boolean): void {
    this.state.soundEnabled = v;
    savePersistedSettings({ soundEnabled: v });
    this.notifySnapshotIfChanged();
  }

  setVibrateEnabled(v: boolean): void {
    this.state.vibrateEnabled = v;
    savePersistedSettings({ vibrateEnabled: v });
    this.notifySnapshotIfChanged();
  }

  setWakeLockEnabled(v: boolean): void {
    // wakeLockService.request/releaseLock eies av hook-bindingen (α5) — motoren
    // er rammeverksfri og holder kun flagget.
    this.state.wakeLockEnabled = v;
    savePersistedSettings({ wakeLockEnabled: v });
    this.notifySnapshotIfChanged();
  }

  setSpeechEnabled(v: boolean): void {
    // speechService.setEnabled eies av hook-bindingen (α5).
    this.state.speechEnabled = v;
    savePersistedSettings({ speechEnabled: v });
    this.notifySnapshotIfChanged();
  }

  setLocked(v: boolean): void {
    this.state.isLocked = v;
    this.notifySnapshotIfChanged();
  }

  /**
   * Bevegelsesteller fra motionTrackerService — adapteren (α4) eier selve
   * sporingen og mater verdien inn her (hookens setMotionReps-callback).
   * motionReps er allerede del av snapshot-nøkkelen, så samme verdi gir
   * uendret identitet.
   */
  setMotionReps(v: number): void {
    this.state.motionReps = v;
    this.notifySnapshotIfChanged();
  }
}

import { WorkoutTemplate, TimerState, IntervalPhase } from '../types/workout';
import { EngineEvent } from '../types/engineEvents';
import { InterruptedSession } from './sessionRecoveryService';

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
  lastTickWallMs: number;
  lastTickPerfMs: number;
}

/** Øktdata for avbrutt-økt-lagring — samme form som saveInterruptedSession tar imot. */
type PersistPayload = Omit<InterruptedSession, 'savedAt'>;

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
  // Injisert persistens-callback (persistenceSubscriber kobler i α4). Default
  // no-op slik at motoren aldri rører localStorage selv.
  private onPersist: (session: PersistPayload) => void = () => {};

  constructor(workout: WorkoutTemplate, now: () => number = () => performance.now()) {
    this.now = now;
    this.propWorkout = workout;
    this.state = {
      status: 'idle',
      phase: 'prepare',
      currentRound: 1,
      currentItemIndex: 0,
      phaseDuration: workout.prepareDurationSeconds,
      phaseRemaining: workout.prepareDurationSeconds,
      totalElapsed: 0,
      isLocked: false,
      soundEnabled: true,
      vibrateEnabled: true,
      wakeLockEnabled: true,
      speechEnabled: true,
      motionReps: 0,
      activeWorkout: workout,
      phaseStartTime: 0,
      workoutStartTime: 0,
      lastCountdownBeep: -1,
      lastSessionSaveSecond: -1,
      firedCues: new Set<string>(),
      lastTickWallMs: 0,
      lastTickPerfMs: 0,
    };
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
      endsAt: newPhase === 'complete' ? null : phaseStart + duration * 1000,
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

  /**
   * Immutabelt snapshot, materialisert per kall. NB: identitets-cachen (ny
   * identitet KUN ved rendringsverdig endring) kommer først i α3 — ikke koble
   * useSyncExternalStore mot denne før da (hvert kall gir nå nytt objekt, som
   * ville gitt evig re-render).
   */
  getSnapshot(): TimerState {
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

    const phaseProgress = s.phaseDuration > 0 ? (s.phaseDuration - s.phaseRemaining) / s.phaseDuration : 1;
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
      speechEnabled: s.speechEnabled,
      motionReps: s.motionReps,
    };
  }

  subscribe(_listener: () => void): () => void {
    throw new Error('ikke implementert');
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

  tick(): void {
    // α3: drift-reanker, catch-up, cue-/persist-gating og snapshot-gating porteres hit.
    throw new Error('ikke implementert');
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
  }

  resume(): void {
    // unlockAudio/speech-init/wake lock fra hookens resumeWorkout eies av
    // hook-bindingen (α5). Juster phaseStartTime slik at resterende tid bevares
    // nøyaktig — motoren har én, alltid presis representasjon (ingen precise*-speil).
    const nowPerf = this.now();
    const currentRemaining = this.state.phaseRemaining;
    this.state.phaseStartTime = nowPerf - (this.state.phaseDuration - currentRemaining) * 1000;
    this.state.lastTickWallMs = Date.now();
    this.state.lastTickPerfMs = nowPerf;
    this.state.status = 'running';
    this.emit({ type: 'workout:resumed', endsAt: nowPerf + currentRemaining * 1000 });
  }

  reset(): void {
    // perfMonitorService.stopWorkoutMonitoring (avbrutt økt = forkastet rapport)
    // eies av hook-bindingen (α5).
    this.state.status = 'idle';
    // stopCurrentPersonaAudio() + clearInterruptedSession() → workout:reset
    // (LegacyAudioAdapter og persistenceSubscriber lytter i α4);
    // wakeLockService.releaseLock() eies av hook-bindingen (α5).
    this.emit({ type: 'workout:reset' });
    this.setupPhase('prepare', 1, 0, true); // silent reset!
    this.state.totalElapsed = 0;
    this.state.phaseRemaining = this.state.activeWorkout?.prepareDurationSeconds || 5;
    this.state.phaseDuration = this.state.activeWorkout?.prepareDurationSeconds || 5;
  }

  skipNext(): void {
    if (this.state.status === 'completed') return;
    this.advanceToNextPhase();
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
  }

  restore(_session: InterruptedSession): void {
    throw new Error('ikke implementert');
  }

  setWorkout(_w: WorkoutTemplate): void {
    throw new Error('ikke implementert');
  }

  setSoundEnabled(_v: boolean): void {
    throw new Error('ikke implementert');
  }

  setVibrateEnabled(_v: boolean): void {
    throw new Error('ikke implementert');
  }

  setWakeLockEnabled(_v: boolean): void {
    throw new Error('ikke implementert');
  }

  setSpeechEnabled(_v: boolean): void {
    throw new Error('ikke implementert');
  }

  setLocked(_v: boolean): void {
    throw new Error('ikke implementert');
  }
}

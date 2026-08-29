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
}

/**
 * Rammeverksfri fasemaskin for intervalløkter (B3, spec § 3). Ren klasse —
 * null React, null lyd-imports. Tidskilde injiseres slik at karakteriserings-
 * testene kan drive klokken deterministisk uten fake timers.
 */
export class TimerEngine {
  private readonly now: () => number;
  private state: EngineState;

  constructor(workout: WorkoutTemplate, now: () => number = () => performance.now()) {
    this.now = now;
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
    };
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

  /** Immutabelt; ny identitet KUN ved rendringsverdig endring (materialiseres her). */
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

  subscribeEvents(_handler: (e: EngineEvent) => void): () => void {
    throw new Error('ikke implementert');
  }

  tick(): void {
    // `now` er injisert her og tas i bruk av fasemaskinen (α2: drift-sjekk,
    // catch-up, reanker) — referert allerede slik at feltet ikke er dødt i α1.
    void this.now();
    throw new Error('ikke implementert');
  }

  start(_workout?: WorkoutTemplate): void {
    throw new Error('ikke implementert');
  }

  pause(): void {
    throw new Error('ikke implementert');
  }

  resume(): void {
    throw new Error('ikke implementert');
  }

  reset(): void {
    throw new Error('ikke implementert');
  }

  skipNext(): void {
    throw new Error('ikke implementert');
  }

  previous(): void {
    throw new Error('ikke implementert');
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

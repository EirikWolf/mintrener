// Karakteriseringstester for vibrationSubscriber (B3 α4): dagens
// vibrationService-kall fra useIntervalTimer.ts (setupPhase per fase +
// playResyncCue/playPersonaResyncCue) portert ordrett til en egen
// hendelsesdrevet abonnent, atskilt fra lyd (jf. spec § 4: «Vibrasjon [...]
// blir [...] egne småabonnenter»).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createVibrationSubscriber, VibrationSubscriberEngine } from '../vibrationSubscriber';
import { EngineEvent } from '../../types/engineEvents';
import { TimerState } from '../../types/workout';
import { vibrationService } from '../vibrationService';
import * as coachPersonaService from '../coachPersonaService';

function createFakeEngine(overrides: Partial<TimerState> = {}) {
  let handler: ((e: EngineEvent) => void) | null = null;
  const snapshot: TimerState = {
    status: 'running',
    phase: 'work',
    currentRound: 1,
    totalRounds: 1,
    currentItemIndex: 0,
    totalItems: 1,
    currentExercise: null,
    nextExercise: null,
    phaseRemainingSeconds: 10,
    phaseTotalSeconds: 10,
    phaseProgress: 0,
    totalRemainingSeconds: 10,
    totalElapsedSeconds: 0,
    isLocked: false,
    soundEnabled: true,
    vibrateEnabled: true,
    wakeLockEnabled: true,
    speechEnabled: true,
    motionReps: 0,
    ...overrides,
  };
  const engine: VibrationSubscriberEngine = {
    subscribeEvents: (h: (e: EngineEvent) => void) => {
      handler = h;
      return () => {
        handler = null;
      };
    },
    getSnapshot: () => snapshot,
  };
  return {
    engine,
    emit: (e: EngineEvent) => handler?.(e),
  };
}

const EX_A = { id: 'squat', name: 'Knebøy' };

describe('vibrationSubscriber (karakterisering, B3 α4)', () => {
  beforeEach(() => {
    vi.spyOn(vibrationService, 'countdown').mockImplementation(() => {});
    vi.spyOn(vibrationService, 'workStart').mockImplementation(() => {});
    vi.spyOn(vibrationService, 'restStart').mockImplementation(() => {});
    vi.spyOn(vibrationService, 'workoutComplete').mockImplementation(() => {});
    // Fasit: countdown-vibrasjon satt inne i persona === 'standard'-blokken i
    // hooken (review-fiks) — eksplisitt standard med mindre en test overstyrer.
    vi.spyOn(coachPersonaService, 'getActiveCoachPersona').mockReturnValue('standard');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('countdown, standard persona → vibrationService.countdown(vibrateEnabled)', () => {
    const { engine, emit } = createFakeEngine({ vibrateEnabled: true });
    createVibrationSubscriber(engine);

    emit({ type: 'countdown', secondsLeft: 3 });

    expect(vibrationService.countdown).toHaveBeenCalledWith(true);
  });

  it('countdown, persona-modus → INGEN vibrasjon (samme if-blokk som pipet i hooken, review-fiks)', () => {
    vi.spyOn(coachPersonaService, 'getActiveCoachPersona').mockReturnValue('hardcore');
    const { engine, emit } = createFakeEngine({ vibrateEnabled: true });
    createVibrationSubscriber(engine);

    emit({ type: 'countdown', secondsLeft: 3 });

    expect(vibrationService.countdown).not.toHaveBeenCalled();
  });

  it('phase:started(work, ikke stille) → vibrationService.workStart(vibrateEnabled)', () => {
    const { engine, emit } = createFakeEngine({ vibrateEnabled: false });
    createVibrationSubscriber(engine);

    emit({
      type: 'phase:started', phase: 'work', round: 1, itemIndex: 0,
      exercise: EX_A, nextExercise: null, durationS: 20, tone: 'rolig',
      silent: false, endsAt: 20_000,
    });

    expect(vibrationService.workStart).toHaveBeenCalledWith(false);
  });

  it('phase:started(work, stille) → ingen vibrasjon', () => {
    const { engine, emit } = createFakeEngine();
    createVibrationSubscriber(engine);

    emit({
      type: 'phase:started', phase: 'work', round: 1, itemIndex: 0,
      exercise: EX_A, nextExercise: null, durationS: 20, tone: 'rolig',
      silent: true, endsAt: 20_000,
    });

    expect(vibrationService.workStart).not.toHaveBeenCalled();
  });

  it('phase:started(rest) → vibrationService.restStart(vibrateEnabled)', () => {
    const { engine, emit } = createFakeEngine({ vibrateEnabled: true });
    createVibrationSubscriber(engine);

    emit({
      type: 'phase:started', phase: 'rest', round: 1, itemIndex: 0,
      exercise: EX_A, nextExercise: null, durationS: 10, tone: 'rolig',
      silent: false, endsAt: 10_000,
    });

    expect(vibrationService.restStart).toHaveBeenCalledWith(true);
  });

  it('phase:started(round_rest) → vibrationService.restStart(vibrateEnabled)', () => {
    const { engine, emit } = createFakeEngine({ vibrateEnabled: true });
    createVibrationSubscriber(engine);

    emit({
      type: 'phase:started', phase: 'round_rest', round: 1, itemIndex: 0,
      exercise: EX_A, nextExercise: null, durationS: 30, tone: 'rolig',
      silent: false, endsAt: 30_000,
    });

    expect(vibrationService.restStart).toHaveBeenCalledWith(true);
  });

  it('phase:started(prepare) → ingen vibrasjon (hooken vibrerte aldri ved prepare)', () => {
    const { engine, emit } = createFakeEngine();
    createVibrationSubscriber(engine);

    emit({
      type: 'phase:started', phase: 'prepare', round: 1, itemIndex: 0,
      exercise: EX_A, nextExercise: null, durationS: 10, tone: 'rolig',
      silent: false, endsAt: 10_000,
    });

    expect(vibrationService.workStart).not.toHaveBeenCalled();
    expect(vibrationService.restStart).not.toHaveBeenCalled();
  });

  it('phase:started(complete, ikke stille) → vibrationService.workoutComplete(vibrateEnabled)', () => {
    const { engine, emit } = createFakeEngine({ vibrateEnabled: true });
    createVibrationSubscriber(engine);

    emit({
      type: 'phase:started', phase: 'complete', round: 1, itemIndex: 0,
      exercise: null, nextExercise: null, durationS: 0, tone: 'rolig',
      silent: false, endsAt: null,
    });

    expect(vibrationService.workoutComplete).toHaveBeenCalledWith(true);
  });

  it('resync, landing work → vibrationService.workStart (portert fra playResyncCue/playPersonaResyncCue)', () => {
    const { engine, emit } = createFakeEngine({ vibrateEnabled: true });
    createVibrationSubscriber(engine);

    emit({
      type: 'resync', skippedPhases: 2, landingPhase: 'work',
      exercise: EX_A, nextExercise: null, tone: 'rolig',
    });

    expect(vibrationService.workStart).toHaveBeenCalledWith(true);
    expect(vibrationService.restStart).not.toHaveBeenCalled();
  });

  it('resync, landing rest/round_rest → vibrationService.restStart', () => {
    const { engine, emit } = createFakeEngine({ vibrateEnabled: true });
    createVibrationSubscriber(engine);

    emit({
      type: 'resync', skippedPhases: 2, landingPhase: 'round_rest',
      exercise: EX_A, nextExercise: null, tone: 'rolig',
    });

    expect(vibrationService.restStart).toHaveBeenCalledWith(true);
    expect(vibrationService.workStart).not.toHaveBeenCalled();
  });

  it('unsubscribe stopper videre reaksjon', () => {
    const { engine, emit } = createFakeEngine();
    const unsub = createVibrationSubscriber(engine);
    unsub();

    emit({ type: 'countdown', secondsLeft: 1 });

    expect(vibrationService.countdown).not.toHaveBeenCalled();
  });
});

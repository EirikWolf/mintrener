// Karakteriseringstester for LegacyAudioAdapter (B3 α4, spec § 6): dagens
// lydforgreninger fra useIntervalTimer.ts sin setupPhase/tick/playResyncCue
// portert ORDRETT til en hendelsesdrevet abonnent. Fasiten er hook-linjene,
// ikke en nyfortolkning — se mappingtabellen i plan-dokumentets Task α2/α4.
//
// Motoren er persona-agnostisk (planrettelse fra α3-review): phase:endingSoon
// og phase:halfway emitteres uansett persona/speechEnabled — adapteren gjør
// selve persona-/speech-filtreringen som hooken gjorde FØR avspilling.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLegacyAudioAdapter, LegacyAudioAdapterEngine } from '../legacyAudioAdapter';
import { EngineEvent } from '../../types/engineEvents';
import { TimerState } from '../../types/workout';
import { audioService } from '../audioService';
import { speechService } from '../speechService';
import { audioClipService } from '../audioClipService';
import * as coachPersonaService from '../coachPersonaService';
import { motionTrackerService } from '../motionTrackerService';

// Minimal strukturell motor-stubb (kontrakten legacyAudioAdapter.test.ts skal
// bruke, jf. task-oppdraget): subscribeEvents fanger handleren, getSnapshot
// returnerer en muterbar TimerState-liknende brøkdel adapteren faktisk leser
// (soundEnabled/speechEnabled/vibrateEnabled + phase/status for prepare-
// degraderingsstien).
function createFakeEngine(overrides: Partial<TimerState> = {}) {
  let handler: ((e: EngineEvent) => void) | null = null;
  const snapshot: TimerState = {
    status: 'running',
    phase: 'prepare',
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
  const setMotionReps = vi.fn((v: number) => {
    snapshot.motionReps = v;
  });
  const engine: LegacyAudioAdapterEngine = {
    subscribeEvents: (h: (e: EngineEvent) => void) => {
      handler = h;
      return () => {
        handler = null;
      };
    },
    getSnapshot: () => snapshot,
    setMotionReps,
  };
  return {
    engine,
    snapshot,
    setMotionReps,
    emit: (e: EngineEvent) => handler?.(e),
  };
}

const EX_A = { id: 'squat', name: 'Knebøy' };
const EX_B = { id: 'lunge', name: 'Utfall' };

describe('legacyAudioAdapter (karakterisering, B3 α4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(coachPersonaService, 'getActiveCoachPersona').mockReturnValue('standard');
    vi.spyOn(audioService, 'playWorkStart').mockImplementation(() => {});
    vi.spyOn(audioService, 'playRestStart').mockImplementation(() => {});
    vi.spyOn(audioService, 'playWorkoutComplete').mockImplementation(() => {});
    vi.spyOn(audioService, 'playCountdownBeep').mockImplementation(() => {});
    vi.spyOn(speechService, 'announceWork').mockImplementation(() => {});
    vi.spyOn(speechService, 'announceRest').mockImplementation(() => {});
    vi.spyOn(speechService, 'announcePrepare').mockImplementation(() => {});
    vi.spyOn(speechService, 'announceComplete').mockImplementation(() => {});
    vi.spyOn(audioClipService, 'playClipOrFallback').mockResolvedValue(undefined);
    vi.spyOn(coachPersonaService, 'playPersonaCue').mockResolvedValue(true);
    vi.spyOn(coachPersonaService, 'playIntroThenExercise').mockResolvedValue(true);
    vi.spyOn(coachPersonaService, 'stopCurrentPersonaAudio').mockImplementation(() => {});
    vi.spyOn(motionTrackerService, 'start').mockImplementation(() => {});
    vi.spyOn(motionTrackerService, 'stop').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('phase:started(work) — standard persona', () => {
    it('spiller playWorkStart + announceWork(navn, tone), starter motionTracker', () => {
      const { engine, emit } = createFakeEngine();
      createLegacyAudioAdapter(engine);

      emit({
        type: 'phase:started',
        phase: 'work',
        round: 1,
        itemIndex: 0,
        exercise: EX_A,
        nextExercise: EX_B,
        durationS: 20,
        tone: 'rolig',
        silent: false,
        endsAt: 20_000,
      });

      expect(audioService.playWorkStart).toHaveBeenCalledTimes(1);
      expect(audioService.playWorkStart).toHaveBeenCalledWith(true);
      expect(speechService.announceWork).toHaveBeenCalledTimes(1);
      expect(speechService.announceWork).toHaveBeenCalledWith('Knebøy', 'rolig');
      expect(motionTrackerService.start).toHaveBeenCalledTimes(1);
      expect(motionTrackerService.start).toHaveBeenCalledWith(expect.any(Function), 'hopp');
    });

    it('persona-modus: INGEN playWorkStart/announceWork (kun standard annonserer work)', () => {
      vi.spyOn(coachPersonaService, 'getActiveCoachPersona').mockReturnValue('hardcore');
      const { engine, emit } = createFakeEngine();
      createLegacyAudioAdapter(engine);

      emit({
        type: 'phase:started',
        phase: 'work',
        round: 1,
        itemIndex: 0,
        exercise: EX_A,
        nextExercise: EX_B,
        durationS: 20,
        tone: 'rolig',
        silent: false,
        endsAt: 20_000,
      });

      expect(audioService.playWorkStart).not.toHaveBeenCalled();
      expect(speechService.announceWork).not.toHaveBeenCalled();
      // motionTracker er persona-uavhengig — sporingen er en ren bevegelses-
      // funksjon, ikke en lydfunksjon (hooken kalte den unntatt av persona-if).
      expect(motionTrackerService.start).toHaveBeenCalledTimes(1);
    });

    it('silent work: ingen lyd, men motionTracker.start kalles likevel (portert utenfor if(!silent) i hooken)', () => {
      const { engine, emit } = createFakeEngine();
      createLegacyAudioAdapter(engine);

      emit({
        type: 'phase:started',
        phase: 'work',
        round: 1,
        itemIndex: 0,
        exercise: EX_A,
        nextExercise: EX_B,
        durationS: 20,
        tone: 'rolig',
        silent: true,
        endsAt: 20_000,
      });

      expect(audioService.playWorkStart).not.toHaveBeenCalled();
      expect(speechService.announceWork).not.toHaveBeenCalled();
      expect(motionTrackerService.start).toHaveBeenCalledTimes(1);
    });

    it('motionTracker-callback mater reps videre til engine.setMotionReps', () => {
      const { engine, emit, setMotionReps } = createFakeEngine();
      createLegacyAudioAdapter(engine);

      emit({
        type: 'phase:started',
        phase: 'work',
        round: 1,
        itemIndex: 0,
        exercise: EX_A,
        nextExercise: EX_B,
        durationS: 20,
        tone: 'rolig',
        silent: false,
        endsAt: 20_000,
      });

      // Motion-sporingens callback er lukningen adapteren ga
      // motionTrackerService.start — kall den slik den ekte tjenesten ville
      // gjort ved en detektert repetisjon, og verifiser videreformidlingen.
      const onMetrics = vi.mocked(motionTrackerService.start).mock.calls[0][0];
      onMetrics({ count: 7, cadenceRpm: 0, lastPeakTime: 0, intensity: 0 });

      expect(setMotionReps).toHaveBeenCalledWith(7);
    });
  });

  describe('phase:started(prepare) — persona intro-kjede', () => {
    it('durationS >= 6, buffere cachet: playIntroThenExercise(firstEx.id), INGEN playPersonaCue/setTimeout-sti', async () => {
      vi.spyOn(coachPersonaService, 'getActiveCoachPersona').mockReturnValue('hardcore');
      const introSpy = vi.spyOn(coachPersonaService, 'playIntroThenExercise').mockResolvedValue(true);
      const cueSpy = vi.spyOn(coachPersonaService, 'playPersonaCue').mockResolvedValue(true);
      const { engine, emit } = createFakeEngine();
      createLegacyAudioAdapter(engine);

      emit({
        type: 'phase:started',
        phase: 'prepare',
        round: 1,
        itemIndex: 0,
        exercise: EX_A,
        nextExercise: null,
        durationS: 10,
        tone: 'rolig',
        silent: false,
        endsAt: 10_000,
      });
      await Promise.resolve();
      await Promise.resolve();

      expect(introSpy).toHaveBeenCalledWith('squat');
      expect(cueSpy).not.toHaveBeenCalledWith('intro');
    });

    it('degradert sti: playIntroThenExercise resolver false → playPersonaCue(intro) + setTimeout(2300) spiller øvelsesnavn', async () => {
      vi.useFakeTimers();
      try {
        vi.spyOn(coachPersonaService, 'getActiveCoachPersona').mockReturnValue('hardcore');
        vi.spyOn(coachPersonaService, 'playIntroThenExercise').mockResolvedValue(false);
        const cueSpy = vi.spyOn(coachPersonaService, 'playPersonaCue').mockResolvedValue(true);
        const clipSpy = vi.spyOn(audioClipService, 'playClipOrFallback').mockResolvedValue(undefined);
        const { engine, emit, snapshot } = createFakeEngine({ phase: 'prepare', status: 'running' });
        createLegacyAudioAdapter(engine);

        emit({
          type: 'phase:started',
          phase: 'prepare',
          round: 1,
          itemIndex: 0,
          exercise: EX_A,
          nextExercise: null,
          durationS: 10,
          tone: 'rolig',
          silent: false,
          endsAt: 10_000,
        });

        // La then()-kjeden på det avviste (false) løftet flyte gjennom
        await vi.advanceTimersByTimeAsync(0);
        expect(cueSpy).toHaveBeenCalledWith('intro');
        expect(clipSpy).not.toHaveBeenCalled();

        snapshot.phase = 'prepare';
        snapshot.status = 'running';
        await vi.advanceTimersByTimeAsync(2300);

        expect(clipSpy).toHaveBeenCalledWith('exercise-squat', 'Knebøy');
      } finally {
        vi.useRealTimers();
      }
    });

    it('degradert sti, guard: fasen har rukket å endre seg før setTimeout(2300) fyrer → ingen klippavspilling', async () => {
      vi.useFakeTimers();
      try {
        vi.spyOn(coachPersonaService, 'getActiveCoachPersona').mockReturnValue('hardcore');
        vi.spyOn(coachPersonaService, 'playIntroThenExercise').mockResolvedValue(false);
        vi.spyOn(coachPersonaService, 'playPersonaCue').mockResolvedValue(true);
        const clipSpy = vi.spyOn(audioClipService, 'playClipOrFallback').mockResolvedValue(undefined);
        const { engine, emit, snapshot } = createFakeEngine({ phase: 'prepare', status: 'running' });
        createLegacyAudioAdapter(engine);

        emit({
          type: 'phase:started',
          phase: 'prepare',
          round: 1,
          itemIndex: 0,
          exercise: EX_A,
          nextExercise: null,
          durationS: 10,
          tone: 'rolig',
          silent: false,
          endsAt: 10_000,
        });
        await vi.advanceTimersByTimeAsync(0);

        // Brukeren rakk å hoppe videre (skipNext/advance) før setTimeout-en
        // fyrer — samme vakt som hooken hadde (stateRef.current.phase/status).
        snapshot.phase = 'work';
        snapshot.status = 'running';
        await vi.advanceTimersByTimeAsync(2300);

        expect(clipSpy).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });

    it('standard persona: announcePrepare(navn, tone), ingen persona-cue-kall', () => {
      const { engine, emit } = createFakeEngine();
      createLegacyAudioAdapter(engine);

      emit({
        type: 'phase:started',
        phase: 'prepare',
        round: 1,
        itemIndex: 0,
        exercise: EX_A,
        nextExercise: null,
        durationS: 10,
        tone: 'lek',
        silent: false,
        endsAt: 10_000,
      });

      expect(speechService.announcePrepare).toHaveBeenCalledWith('Knebøy', 'lek');
      expect(coachPersonaService.playPersonaCue).not.toHaveBeenCalled();
      expect(coachPersonaService.playIntroThenExercise).not.toHaveBeenCalled();
    });
  });

  describe('phase:started(rest/round_rest) — exercise-klipp-kjede med persona', () => {
    it('standard: playRestStart + announceRest(nextExercise, tone)', () => {
      const { engine, emit } = createFakeEngine();
      createLegacyAudioAdapter(engine);

      emit({
        type: 'phase:started',
        phase: 'rest',
        round: 1,
        itemIndex: 0,
        exercise: EX_A,
        nextExercise: EX_B,
        durationS: 10,
        tone: 'rolig',
        silent: false,
        endsAt: 10_000,
      });

      expect(audioService.playRestStart).toHaveBeenCalledTimes(1);
      expect(audioService.playRestStart).toHaveBeenCalledWith(true);
      expect(speechService.announceRest).toHaveBeenCalledWith('Utfall', 'rolig');
      expect(motionTrackerService.stop).toHaveBeenCalledTimes(1);
    });

    it('persona: audioClipService.playClipOrFallback("exercise-<id>", "Neste: <navn>") i stedet for announceRest', () => {
      vi.spyOn(coachPersonaService, 'getActiveCoachPersona').mockReturnValue('boyband');
      const { engine, emit } = createFakeEngine();
      createLegacyAudioAdapter(engine);

      emit({
        type: 'phase:started',
        phase: 'round_rest',
        round: 1,
        itemIndex: 0,
        exercise: EX_A,
        nextExercise: EX_B,
        durationS: 30,
        tone: 'rolig',
        silent: false,
        endsAt: 30_000,
      });

      expect(audioClipService.playClipOrFallback).toHaveBeenCalledWith('exercise-lunge', 'Neste: Utfall');
      expect(speechService.announceRest).not.toHaveBeenCalled();
      expect(motionTrackerService.stop).toHaveBeenCalledTimes(1);
    });

    it('persona uten nextExercise (siste item): ingen kall (nextEx-vakten fra hooken)', () => {
      vi.spyOn(coachPersonaService, 'getActiveCoachPersona').mockReturnValue('boyband');
      const { engine, emit } = createFakeEngine();
      createLegacyAudioAdapter(engine);

      emit({
        type: 'phase:started',
        phase: 'rest',
        round: 1,
        itemIndex: 0,
        exercise: EX_A,
        nextExercise: null,
        durationS: 10,
        tone: 'rolig',
        silent: false,
        endsAt: 10_000,
      });

      expect(audioClipService.playClipOrFallback).not.toHaveBeenCalled();
      expect(motionTrackerService.stop).toHaveBeenCalledTimes(1);
    });
  });

  describe('phase:started(complete)', () => {
    it('standard: playWorkoutComplete + announceComplete(tone)', () => {
      const { engine, emit } = createFakeEngine();
      createLegacyAudioAdapter(engine);

      emit({
        type: 'phase:started',
        phase: 'complete',
        round: 1,
        itemIndex: 0,
        exercise: null,
        nextExercise: null,
        durationS: 0,
        tone: 'gira',
        silent: false,
        endsAt: null,
      });

      expect(audioService.playWorkoutComplete).toHaveBeenCalledWith(true);
      expect(speechService.announceComplete).toHaveBeenCalledWith('gira');
      expect(motionTrackerService.stop).toHaveBeenCalledTimes(1);
    });

    it('persona: playPersonaCue("finish") i stedet for standard-fullføringslyd', () => {
      vi.spyOn(coachPersonaService, 'getActiveCoachPersona').mockReturnValue('hardcore');
      const { engine, emit } = createFakeEngine();
      createLegacyAudioAdapter(engine);

      emit({
        type: 'phase:started',
        phase: 'complete',
        round: 1,
        itemIndex: 0,
        exercise: null,
        nextExercise: null,
        durationS: 0,
        tone: 'rolig',
        silent: false,
        endsAt: null,
      });

      expect(coachPersonaService.playPersonaCue).toHaveBeenCalledWith('finish');
      expect(audioService.playWorkoutComplete).not.toHaveBeenCalled();
    });
  });

  describe('phase:endingSoon', () => {
    it('persona + speechEnabled → playPersonaCue("start_321")', () => {
      vi.spyOn(coachPersonaService, 'getActiveCoachPersona').mockReturnValue('hardcore');
      const { engine, emit } = createFakeEngine({ speechEnabled: true });
      createLegacyAudioAdapter(engine);

      emit({ type: 'phase:endingSoon' });

      expect(coachPersonaService.playPersonaCue).toHaveBeenCalledWith('start_321');
    });

    it('standard persona → ingen kall', () => {
      const { engine, emit } = createFakeEngine();
      createLegacyAudioAdapter(engine);

      emit({ type: 'phase:endingSoon' });

      expect(coachPersonaService.playPersonaCue).not.toHaveBeenCalled();
    });

    it('persona men speechEnabled=false → ingen kall', () => {
      vi.spyOn(coachPersonaService, 'getActiveCoachPersona').mockReturnValue('hardcore');
      const { engine, emit } = createFakeEngine({ speechEnabled: false });
      createLegacyAudioAdapter(engine);

      emit({ type: 'phase:endingSoon' });

      expect(coachPersonaService.playPersonaCue).not.toHaveBeenCalled();
    });
  });

  describe('phase:halfway', () => {
    it('persona + speechEnabled → playPersonaCue("halfway")', () => {
      vi.spyOn(coachPersonaService, 'getActiveCoachPersona').mockReturnValue('hardcore');
      const { engine, emit } = createFakeEngine({ speechEnabled: true });
      createLegacyAudioAdapter(engine);

      emit({ type: 'phase:halfway' });

      expect(coachPersonaService.playPersonaCue).toHaveBeenCalledWith('halfway');
    });

    it('standard persona → ingen kall', () => {
      const { engine, emit } = createFakeEngine();
      createLegacyAudioAdapter(engine);

      emit({ type: 'phase:halfway' });

      expect(coachPersonaService.playPersonaCue).not.toHaveBeenCalled();
    });
  });

  describe('countdown', () => {
    it('standard → playCountdownBeep(soundEnabled)', () => {
      const { engine, emit } = createFakeEngine({ soundEnabled: true });
      createLegacyAudioAdapter(engine);

      emit({ type: 'countdown', secondsLeft: 3 });

      expect(audioService.playCountdownBeep).toHaveBeenCalledWith(true);
    });

    it('persona → INGEN playCountdownBeep (kollisjon med stemmen unngås)', () => {
      vi.spyOn(coachPersonaService, 'getActiveCoachPersona').mockReturnValue('hardcore');
      const { engine, emit } = createFakeEngine();
      createLegacyAudioAdapter(engine);

      emit({ type: 'countdown', secondsLeft: 2 });

      expect(audioService.playCountdownBeep).not.toHaveBeenCalled();
    });
  });

  describe('resync', () => {
    it('standard, landing work: playWorkStart + announceWork', () => {
      const { engine, emit } = createFakeEngine();
      createLegacyAudioAdapter(engine);

      emit({
        type: 'resync',
        skippedPhases: 2,
        landingPhase: 'work',
        exercise: EX_A,
        nextExercise: EX_B,
        tone: 'rolig',
      });

      expect(audioService.playWorkStart).toHaveBeenCalledWith(true);
      expect(speechService.announceWork).toHaveBeenCalledWith('Knebøy', 'rolig');
    });

    it('standard, landing rest: playRestStart + announceRest(nextExercise)', () => {
      const { engine, emit } = createFakeEngine();
      createLegacyAudioAdapter(engine);

      emit({
        type: 'resync',
        skippedPhases: 1,
        landingPhase: 'round_rest',
        exercise: EX_A,
        nextExercise: EX_B,
        tone: 'rolig',
      });

      expect(audioService.playRestStart).toHaveBeenCalledWith(true);
      expect(speechService.announceRest).toHaveBeenCalledWith('Utfall', 'rolig');
    });

    it('persona, landing work: audioClipService med øvelsesnavn (ingen tone-argument)', () => {
      vi.spyOn(coachPersonaService, 'getActiveCoachPersona').mockReturnValue('hardcore');
      const { engine, emit } = createFakeEngine();
      createLegacyAudioAdapter(engine);

      emit({
        type: 'resync',
        skippedPhases: 3,
        landingPhase: 'work',
        exercise: EX_A,
        nextExercise: EX_B,
        tone: 'rolig',
      });

      expect(audioClipService.playClipOrFallback).toHaveBeenCalledWith('exercise-squat', 'Knebøy');
      expect(audioService.playWorkStart).not.toHaveBeenCalled();
    });

    it('persona, landing rest: audioClipService med "Neste: <navn>"', () => {
      vi.spyOn(coachPersonaService, 'getActiveCoachPersona').mockReturnValue('hardcore');
      const { engine, emit } = createFakeEngine();
      createLegacyAudioAdapter(engine);

      emit({
        type: 'resync',
        skippedPhases: 3,
        landingPhase: 'rest',
        exercise: EX_A,
        nextExercise: EX_B,
        tone: 'rolig',
      });

      expect(audioClipService.playClipOrFallback).toHaveBeenCalledWith('exercise-lunge', 'Neste: Utfall');
      expect(audioService.playRestStart).not.toHaveBeenCalled();
    });
  });

  describe('workout:paused / workout:reset', () => {
    it('workout:paused → stopCurrentPersonaAudio', () => {
      const { engine, emit } = createFakeEngine();
      createLegacyAudioAdapter(engine);

      emit({ type: 'workout:paused' });

      expect(coachPersonaService.stopCurrentPersonaAudio).toHaveBeenCalledTimes(1);
    });

    it('workout:reset → stopCurrentPersonaAudio', () => {
      const { engine, emit } = createFakeEngine();
      createLegacyAudioAdapter(engine);

      emit({ type: 'workout:reset' });

      expect(coachPersonaService.stopCurrentPersonaAudio).toHaveBeenCalledTimes(1);
    });
  });

  describe('unsubscribe', () => {
    it('returnert opprydningsfunksjon stopper videre reaksjon på hendelser', () => {
      const { engine, emit } = createFakeEngine();
      const unsub = createLegacyAudioAdapter(engine);
      unsub();

      emit({ type: 'workout:paused' });

      expect(coachPersonaService.stopCurrentPersonaAudio).not.toHaveBeenCalled();
    });
  });
});

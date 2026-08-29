// Karakteriseringstester for mediaSessionSubscriber (B3 α4): porter av
// MediaSession-effekten i TimerDisplay.tsx (updateMediaSession ved
// running/paused, clearMediaSession ellers). Motorens snapshot mangler
// workout-navn (TimerState har ingen workout-referanse) — navnet hentes i
// stedet fra workout:started-hendelsen og caches, jf. rapportert mappinggap.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMediaSessionSubscriber, MediaSessionSubscriberEngine } from '../mediaSessionSubscriber';
import { EngineEvent } from '../../types/engineEvents';
import { TimerState } from '../../types/workout';
import * as mediaSessionService from '../mediaSessionService';
import { TABATA_WORKOUT } from '../../data/mockWorkouts';

function createFakeEngine(overrides: Partial<TimerState> = {}) {
  let eventHandler: ((e: EngineEvent) => void) | null = null;
  let snapshotListener: (() => void) | null = null;
  const snapshot: TimerState = {
    status: 'idle',
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
  const pause = vi.fn();
  const resume = vi.fn();
  const skipNext = vi.fn();
  const previous = vi.fn();
  const engine: MediaSessionSubscriberEngine = {
    subscribeEvents: (h: (e: EngineEvent) => void) => {
      eventHandler = h;
      return () => {
        eventHandler = null;
      };
    },
    subscribe: (l: () => void) => {
      snapshotListener = l;
      return () => {
        snapshotListener = null;
      };
    },
    getSnapshot: () => snapshot,
    pause,
    resume,
    skipNext,
    previous,
  };
  return {
    engine,
    snapshot,
    pause,
    resume,
    skipNext,
    previous,
    emitEvent: (e: EngineEvent) => eventHandler?.(e),
    notify: () => snapshotListener?.(),
  };
}

describe('mediaSessionSubscriber (karakterisering, B3 α4)', () => {
  beforeEach(() => {
    vi.spyOn(mediaSessionService, 'updateMediaSession').mockImplementation(() => {});
    vi.spyOn(mediaSessionService, 'clearMediaSession').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('idle ved oppstart → clearMediaSession, ingen updateMediaSession', () => {
    const { engine } = createFakeEngine({ status: 'idle' });
    createMediaSessionSubscriber(engine);

    expect(mediaSessionService.clearMediaSession).toHaveBeenCalledTimes(1);
    expect(mediaSessionService.updateMediaSession).not.toHaveBeenCalled();
  });

  it('running → updateMediaSession med tittel/artist/album fra snapshot + workout:started-navn', () => {
    const { engine, emitEvent, notify, snapshot } = createFakeEngine({ status: 'idle' });
    createMediaSessionSubscriber(engine);

    emitEvent({ type: 'workout:started', workout: TABATA_WORKOUT });
    snapshot.status = 'running';
    snapshot.phase = 'work';
    snapshot.currentExercise = { id: 'squat', name: 'Knebøy' };
    snapshot.currentRound = 1;
    snapshot.totalRounds = 1;
    notify();

    expect(mediaSessionService.updateMediaSession).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Knebøy',
        artist: 'Min Trener • Jobb',
        album: `${TABATA_WORKOUT.name} • Runde 1/1`,
        artworkUrl: '/images/exercises/squat-0.png',
      })
    );
  });

  it('fasenavn: work→Jobb, rest→Pause, alt annet→Klargjøring', () => {
    const { engine, emitEvent, notify, snapshot } = createFakeEngine({ status: 'idle' });
    createMediaSessionSubscriber(engine);
    emitEvent({ type: 'workout:started', workout: TABATA_WORKOUT });

    snapshot.status = 'running';
    snapshot.phase = 'rest';
    notify();
    expect(mediaSessionService.updateMediaSession).toHaveBeenLastCalledWith(
      expect.objectContaining({ artist: 'Min Trener • Pause' })
    );

    snapshot.phase = 'round_rest';
    notify();
    expect(mediaSessionService.updateMediaSession).toHaveBeenLastCalledWith(
      expect.objectContaining({ artist: 'Min Trener • Klargjøring' })
    );
  });

  it('paused → fortsatt updateMediaSession (ikke clear)', () => {
    const { engine, emitEvent, notify, snapshot } = createFakeEngine({ status: 'idle' });
    createMediaSessionSubscriber(engine);
    emitEvent({ type: 'workout:started', workout: TABATA_WORKOUT });
    snapshot.status = 'paused';
    notify();

    expect(mediaSessionService.updateMediaSession).toHaveBeenCalled();
  });

  it('restore-uten-forutgående-start: workout:restored alene gir korrekt albumnavn ved paused, og forblir korrekt etter resume', () => {
    // Dekker mappinggapet fra α4-rapporten: en økt gjenopprettet rett etter
    // sideload (ingen workout:started har noensinne blitt emittert i denne
    // abonnentens levetid) skal likevel vise riktig workout-navn.
    const { engine, emitEvent, notify, snapshot } = createFakeEngine({ status: 'idle' });
    createMediaSessionSubscriber(engine);
    vi.mocked(mediaSessionService.updateMediaSession).mockClear();

    emitEvent({ type: 'workout:restored', workout: TABATA_WORKOUT });
    snapshot.status = 'paused';
    snapshot.phase = 'work';
    snapshot.currentRound = 1;
    snapshot.totalRounds = 1;
    notify();

    expect(mediaSessionService.updateMediaSession).toHaveBeenCalledWith(
      expect.objectContaining({ album: `${TABATA_WORKOUT.name} • Runde 1/1` })
    );

    // resume(): status går til running — albumnavnet skal fortsatt stå riktig
    // uten at noen workout:started noensinne fyrte.
    snapshot.status = 'running';
    notify();

    expect(mediaSessionService.updateMediaSession).toHaveBeenLastCalledWith(
      expect.objectContaining({ album: `${TABATA_WORKOUT.name} • Runde 1/1` })
    );
  });

  it('completed → clearMediaSession', () => {
    const { engine, snapshot, notify } = createFakeEngine({ status: 'running' });
    createMediaSessionSubscriber(engine);
    vi.mocked(mediaSessionService.clearMediaSession).mockClear();

    snapshot.status = 'completed';
    notify();

    expect(mediaSessionService.clearMediaSession).toHaveBeenCalledTimes(1);
  });

  it('ingen currentExercise → tittel faller tilbake til workout-navn', () => {
    const { engine, emitEvent, notify, snapshot } = createFakeEngine({ status: 'idle' });
    createMediaSessionSubscriber(engine);
    emitEvent({ type: 'workout:started', workout: TABATA_WORKOUT });
    snapshot.status = 'running';
    snapshot.currentExercise = null;
    notify();

    expect(mediaSessionService.updateMediaSession).toHaveBeenCalledWith(
      expect.objectContaining({ title: TABATA_WORKOUT.name, artworkUrl: undefined })
    );
  });

  it('handlingscallbacks er koblet til engine-metodene', () => {
    const { engine, emitEvent, notify, snapshot, pause, resume, skipNext, previous } = createFakeEngine({ status: 'idle' });
    createMediaSessionSubscriber(engine);
    emitEvent({ type: 'workout:started', workout: TABATA_WORKOUT });
    snapshot.status = 'running';
    notify();

    const call = vi.mocked(mediaSessionService.updateMediaSession).mock.calls[0][0];
    call.onPlay?.();
    call.onPause?.();
    call.onNext?.();
    call.onPrevious?.();

    expect(resume).toHaveBeenCalledTimes(1);
    expect(pause).toHaveBeenCalledTimes(1);
    expect(skipNext).toHaveBeenCalledTimes(1);
    expect(previous).toHaveBeenCalledTimes(1);
  });

  it('V1: injiserte onPlay/onPause-callbacks brukes i stedet for engine.resume/pause', () => {
    // PR-α-sluttreview V1: fra låseskjermen må play/pause gå via HOOKENS
    // resumeWorkout/pauseWorkout (audio-unlock, speech-init, wake lock) — rene
    // engine-kall mister de sideeffektene. onNext/onPrevious forblir engine-kall
    // (var ekvivalente også i den gamle kjeden).
    const { engine, emitEvent, notify, snapshot, pause, resume, skipNext, previous } = createFakeEngine({ status: 'idle' });
    const onPlay = vi.fn();
    const onPause = vi.fn();
    createMediaSessionSubscriber(engine, { onPlay, onPause });
    emitEvent({ type: 'workout:started', workout: TABATA_WORKOUT });
    snapshot.status = 'running';
    notify();

    const call = vi.mocked(mediaSessionService.updateMediaSession).mock.calls[0][0];
    call.onPlay?.();
    call.onPause?.();
    call.onNext?.();
    call.onPrevious?.();

    expect(onPlay).toHaveBeenCalledTimes(1);
    expect(onPause).toHaveBeenCalledTimes(1);
    expect(resume).not.toHaveBeenCalled();
    expect(pause).not.toHaveBeenCalled();
    expect(skipNext).toHaveBeenCalledTimes(1);
    expect(previous).toHaveBeenCalledTimes(1);
  });

  it('unsubscribe stopper videre reaksjon', () => {
    const { engine, notify } = createFakeEngine({ status: 'idle' });
    const unsub = createMediaSessionSubscriber(engine);
    vi.mocked(mediaSessionService.clearMediaSession).mockClear();
    unsub();

    notify();

    expect(mediaSessionService.clearMediaSession).not.toHaveBeenCalled();
  });
});

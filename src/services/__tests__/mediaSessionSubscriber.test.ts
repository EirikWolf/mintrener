// Karakteriseringstester for mediaSessionSubscriber (B3 α4): porter av
// MediaSession-effekten i TimerDisplay.tsx (updateMediaSession ved
// running/paused, clearMediaSession ellers). Motorens snapshot mangler
// workout-navn (TimerState har ingen workout-referanse) — navnet hentes i
// stedet fra workout:started-hendelsen og caches, jf. rapportert mappinggap.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMediaSessionSubscriber } from '../mediaSessionSubscriber';
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
  return {
    engine: {
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
      pause: vi.fn(),
      resume: vi.fn(),
      skipNext: vi.fn(),
      previous: vi.fn(),
    },
    snapshot,
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
    createMediaSessionSubscriber(engine as any);

    expect(mediaSessionService.clearMediaSession).toHaveBeenCalledTimes(1);
    expect(mediaSessionService.updateMediaSession).not.toHaveBeenCalled();
  });

  it('running → updateMediaSession med tittel/artist/album fra snapshot + workout:started-navn', () => {
    const { engine, emitEvent, notify, snapshot } = createFakeEngine({ status: 'idle' });
    createMediaSessionSubscriber(engine as any);

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
    createMediaSessionSubscriber(engine as any);
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
    createMediaSessionSubscriber(engine as any);
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
    createMediaSessionSubscriber(engine as any);
    (mediaSessionService.updateMediaSession as any).mockClear();

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
    createMediaSessionSubscriber(engine as any);
    (mediaSessionService.clearMediaSession as any).mockClear();

    snapshot.status = 'completed';
    notify();

    expect(mediaSessionService.clearMediaSession).toHaveBeenCalledTimes(1);
  });

  it('ingen currentExercise → tittel faller tilbake til workout-navn', () => {
    const { engine, emitEvent, notify, snapshot } = createFakeEngine({ status: 'idle' });
    createMediaSessionSubscriber(engine as any);
    emitEvent({ type: 'workout:started', workout: TABATA_WORKOUT });
    snapshot.status = 'running';
    snapshot.currentExercise = null;
    notify();

    expect(mediaSessionService.updateMediaSession).toHaveBeenCalledWith(
      expect.objectContaining({ title: TABATA_WORKOUT.name, artworkUrl: undefined })
    );
  });

  it('handlingscallbacks er koblet til engine-metodene', () => {
    const { engine, emitEvent, notify, snapshot } = createFakeEngine({ status: 'idle' });
    createMediaSessionSubscriber(engine as any);
    emitEvent({ type: 'workout:started', workout: TABATA_WORKOUT });
    snapshot.status = 'running';
    notify();

    const call = (mediaSessionService.updateMediaSession as any).mock.calls[0][0];
    call.onPlay();
    call.onPause();
    call.onNext();
    call.onPrevious();

    expect(engine.resume).toHaveBeenCalledTimes(1);
    expect(engine.pause).toHaveBeenCalledTimes(1);
    expect(engine.skipNext).toHaveBeenCalledTimes(1);
    expect(engine.previous).toHaveBeenCalledTimes(1);
  });

  it('unsubscribe stopper videre reaksjon', () => {
    const { engine, notify } = createFakeEngine({ status: 'idle' });
    const unsub = createMediaSessionSubscriber(engine as any);
    (mediaSessionService.clearMediaSession as any).mockClear();
    unsub();

    notify();

    expect(mediaSessionService.clearMediaSession).not.toHaveBeenCalled();
  });
});

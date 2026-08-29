// PORTINGSREGEL fra useIntervalTimer.test.ts (fasiten for bit-identisk adferd):
//  renderHook(() => useIntervalTimer({workout}))  →  let t = 0; const engine = new TimerEngine(workout, () => t);
//  act(() => result.current.startWorkout())       →  engine.start();
//  vi.advanceTimersByTime(100) + perf-spy         →  t += 100; engine.tick();   (ingen fake timers!)
//  result.current.state                            →  engine.getSnapshot()
//  lyd-spionene                                    →  hendelses-opptak: const events: EngineEvent[] = [];
//                                                     engine.subscribeEvents(e => events.push(e));
import { describe, it, expect } from 'vitest';
import { TimerEngine } from '../timerEngine';
import { EngineEvent } from '../../types/engineEvents';
import { InterruptedSession } from '../sessionRecoveryService';
import { TABATA_WORKOUT } from '../../data/mockWorkouts';

// Felles rigg for kontroll-testene: injisert klokke + hendelses-opptak,
// nøyaktig som portingsregelen over foreskriver.
function createRigg(workout = TABATA_WORKOUT) {
  const clock = { t: 0 };
  const engine = new TimerEngine(workout, () => clock.t);
  const events: EngineEvent[] = [];
  engine.subscribeEvents((e) => events.push(e));
  return { clock, engine, events };
}

describe('TimerEngine – init (karakterisering)', () => {
  it('initialiserer Tabata med riktige verdier', () => {
    const engine = new TimerEngine(TABATA_WORKOUT, () => 0);
    const s = engine.getSnapshot();
    expect(s.status).toBe('idle');
    expect(s.phase).toBe('prepare');
    expect(s.phaseRemainingSeconds).toBe(10);
    expect(s.totalRemainingSeconds).toBe(240);
    expect(s.totalRounds).toBe(1);
    expect(s.totalItems).toBe(8);
  });
});

describe('TimerEngine – kontroll og faser (karakterisering)', () => {
  // Portert fra «starter økten, låser opp lyd og aktiverer Wake Lock»:
  // unlockAudio/requestLock er hook-sideeffekter (flyttes i α5) — motorens
  // kontrakt er status + workout:started + én ikke-stille phase:started(prepare).
  it('starter økten: status running, workout:started og phase:started(prepare)', () => {
    const { engine, events } = createRigg();
    engine.start();

    expect(engine.getSnapshot().status).toBe('running');
    expect(events.filter((e) => e.type === 'workout:started')).toHaveLength(1);
    const started = events.filter((e) => e.type === 'phase:started');
    expect(started).toHaveLength(1);
    expect(started[0]).toMatchObject({
      phase: 'prepare',
      round: 1,
      itemIndex: 0,
      silent: false,
      durationS: 10,
      tone: 'rolig',
      endsAt: 10_000, // t=0 + 10s prepare, absolutt motortid
    });
  });

  // Portert fra «pauser økten og slipper Wake Lock»: releaseLock eies av hooken
  // (α5); stopCurrentPersonaAudio-kallet er oversatt til workout:paused-hendelsen
  // og saveInterruptedSession til den injiserte onPersist-callbacken.
  it('pauser økten: status paused, workout:paused og onPersist med øktdata', () => {
    const { engine, events } = createRigg();
    const persisted: Omit<InterruptedSession, 'savedAt'>[] = [];
    engine.setOnPersist((s) => persisted.push(s));
    engine.start();
    engine.pause();

    expect(engine.getSnapshot().status).toBe('paused');
    expect(events.filter((e) => e.type === 'workout:paused')).toHaveLength(1);
    expect(persisted).toHaveLength(1);
    expect(persisted[0]).toMatchObject({
      phase: 'prepare',
      currentRound: 1,
      currentItemIndex: 0,
      totalElapsedSeconds: 0,
    });
  });

  // Ingen resume-test fantes i hook-fila; karakteriseringen speiler resumeWorkout
  // direkte: gjenværende tid bevares (phaseStartTime bakdateres), status → running,
  // og workout:resumed bærer den nye absolutte fasegrensen (endsAt).
  it('gjenopptar økten: status running og workout:resumed med endsAt = nå + gjenværende', () => {
    const { clock, engine, events } = createRigg();
    engine.start();
    engine.pause();
    clock.t = 3000;
    engine.resume();

    expect(engine.getSnapshot().status).toBe('running');
    const resumed = events.filter((e) => e.type === 'workout:resumed');
    expect(resumed).toHaveLength(1);
    // Ingen tick har kjørt, så hele prepare-varigheten (10s) gjenstår ved pause.
    expect(resumed[0]).toMatchObject({ endsAt: 13_000 });
  });

  it('hopper gjennom faser ved skipNext (prepare -> work 1 -> rest 1 -> work 2)', () => {
    const { engine, events } = createRigg();
    engine.start();

    // 1. Fra prepare til work (Knebøy)
    engine.skipNext();
    let s = engine.getSnapshot();
    expect(s.phase).toBe('work');
    expect(s.currentItemIndex).toBe(0);
    expect(s.currentExercise?.name).toBe('Knebøy');
    expect(s.phaseTotalSeconds).toBe(20);
    // «playWorkStart kalt én gang» → nøyaktig én ikke-stille work-fasestart
    expect(
      events.filter((e) => e.type === 'phase:started' && e.phase === 'work' && !e.silent)
    ).toHaveLength(1);

    // 2. Fra work til rest
    engine.skipNext();
    s = engine.getSnapshot();
    expect(s.phase).toBe('rest');
    expect(s.phaseTotalSeconds).toBe(10);

    // 3. Fra rest til work (Push-ups)
    engine.skipNext();
    s = engine.getSnapshot();
    expect(s.phase).toBe('work');
    expect(s.currentItemIndex).toBe(1);
    expect(s.currentExercise?.name).toBe('Push-ups');
    expect(s.phaseTotalSeconds).toBe(20);
  });

  it('fullfører økten umiddelbart etter siste arbeidsintervall er over', () => {
    const { engine, events } = createRigg();
    engine.start();

    // Hopp over prepare (1)
    engine.skipNext();

    // 7 første øvelser (arbeid + hvile)
    for (let i = 0; i < 7; i++) {
      engine.skipNext(); // arbeid
      engine.skipNext(); // hvile
    }

    // 8. øvelse (siste arbeid)
    engine.skipNext();

    const s = engine.getSnapshot();
    expect(s.status).toBe('completed');
    expect(s.phase).toBe('complete');
    // «playWorkoutComplete kalt én gang» → nøyaktig én workout:completed
    expect(events.filter((e) => e.type === 'workout:completed')).toHaveLength(1);
  });

  it('nullstiller økten lydløst uten å trigge tale', () => {
    const { engine, events } = createRigg();
    engine.reset();

    expect(engine.getSnapshot().status).toBe('idle');
    // «announcePrepare ikke kalt» → ingen ikke-stille fasestart (kun silent prepare)
    expect(events.filter((e) => e.type === 'phase:started' && !e.silent)).toHaveLength(0);
    expect(events.filter((e) => e.type === 'workout:reset')).toHaveLength(1);
  });

  // Hookens round_rest-gren annonserte items[0]?.exercise («neste runde starter
  // forfra»), ikke items[idx+1] — hendelsen må bære samme øvelse. NB: samme
  // wrap-regel gjelder for α3s resync-payload (landing i round_rest).
  it('phase:started(round_rest) bærer første øvelse som nextExercise (neste runde starter forfra)', () => {
    const multiRoundWorkout = {
      id: 'multi-test',
      name: 'Flerrunde-test',
      description: 'To runder med runde-pause',
      type: 'custom' as const,
      prepareDurationSeconds: 10,
      rounds: 2,
      roundRestDurationSeconds: 30,
      voiceTone: 'rolig' as const,
      items: [
        { id: 'mr1', exercise: { id: 'kneboy', name: 'Knebøy' }, workDurationSeconds: 20, restDurationSeconds: 10 },
      ],
    };

    const { engine, events } = createRigg(multiRoundWorkout);
    engine.start();
    engine.skipNext(); // prepare -> work (runde 1)
    engine.skipNext(); // work -> rest
    engine.skipNext(); // rest -> round_rest (siste item, flere runder igjen)

    expect(engine.getSnapshot().phase).toBe('round_rest');
    const roundRest = events.find((e) => e.type === 'phase:started' && e.phase === 'round_rest');
    expect(roundRest).toBeDefined();
    expect(roundRest?.type === 'phase:started' ? roundRest.nextExercise?.name : null).toBe('Knebøy');
  });

  it('starter direkte med ny økt og annonserer riktig første øvelse og tone', () => {
    const barnWorkout = {
      id: 'barn-test',
      name: 'Dyre-safari',
      description: 'Lek',
      type: 'custom' as const,
      prepareDurationSeconds: 5,
      rounds: 1,
      roundRestDurationSeconds: 0,
      voiceTone: 'lek' as const,
      items: [
        { id: 'b1', exercise: { id: 'frosk', name: 'Froskehopp' }, workDurationSeconds: 25, restDurationSeconds: 10 },
      ],
    };

    const { engine, events } = createRigg();
    engine.start(barnWorkout);

    const s = engine.getSnapshot();
    expect(s.status).toBe('running');
    expect(s.phaseTotalSeconds).toBe(5);
    expect(s.currentExercise?.name).toBe('Froskehopp');
    // «announcePrepare('Froskehopp', 'lek')» → phase:started(prepare) bærer navn + tone
    const prep = events.find((e) => e.type === 'phase:started');
    expect(prep).toMatchObject({ phase: 'prepare', tone: 'lek', silent: false });
    expect(prep?.type === 'phase:started' ? prep.exercise?.name : null).toBe('Froskehopp');
  });
});

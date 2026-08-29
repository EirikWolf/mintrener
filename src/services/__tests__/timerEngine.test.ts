// PORTINGSREGEL fra useIntervalTimer.test.ts (fasiten for bit-identisk adferd):
//  renderHook(() => useIntervalTimer({workout}))  →  let t = 0; const engine = new TimerEngine(workout, () => t);
//  act(() => result.current.startWorkout())       →  engine.start();
//  vi.advanceTimersByTime(100) + perf-spy         →  t += 100; engine.tick();   (ingen fake timers!)
//  result.current.state                            →  engine.getSnapshot()
//  lyd-spionene                                    →  hendelses-opptak: const events: EngineEvent[] = [];
//                                                     engine.subscribeEvents(e => events.push(e));
import { describe, it, expect, vi, afterEach } from 'vitest';
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

// ---------------------------------------------------------------------------
// α3: catch-up-, gating- og reanker-karakterisering
// ---------------------------------------------------------------------------

// Veggklokke-spion i lockstep med den injiserte motorklokken: drift = 0 ved
// normal drift, slik at motorens Date.now-baserte reanker-sjekk aldri trigges
// utilsiktet av EKTE veggklokkehopp i testmiljøet. (Reanker-gruppen under styrer
// veggklokken uavhengig i stedet, for å teste selve driften.)
function spyWallClockLockstep(clock: { t: number }) {
  const WALL_BASE = 1_700_000_000_000;
  return vi.spyOn(Date, 'now').mockImplementation(() => WALL_BASE + clock.t);
}

// Flerrunde-økt for round_rest-landing (TABATA har bare 1 runde).
const MULTI_ROUND_WORKOUT = {
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

describe('TimerEngine – catch-up ved dvale/lomme (karakterisering)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Portert fra «normal drift ved fasegrense (overshoot ~0) er uendret»:
  // «ett playWorkStart-kall» → nøyaktig én ikke-stille phase:started(work).
  it('normal drift ved fasegrense (overshoot ~0): ett ikke-stille work-start, ingen resync', () => {
    const { clock, engine, events } = createRigg();
    spyWallClockLockstep(clock);
    engine.start();

    // Prepare varer 10s. Hopp presist til fasegrensen slik at overshoot = 0s,
    // godt under 1,5s-terskelen for «dvale» – enkelt-avansement med full lyd.
    clock.t = 10_000;
    engine.tick();

    const s = engine.getSnapshot();
    expect(s.phase).toBe('work');
    expect(s.currentItemIndex).toBe(0);
    expect(
      events.filter((e) => e.type === 'phase:started' && e.phase === 'work' && !e.silent)
    ).toHaveLength(1);
    expect(events.filter((e) => e.type === 'resync')).toHaveLength(0);
    // Normal drift: verken reanker eller landing-bakdatering skjer — ingen
    // deadlineChanged (planrettelsen fra α3-review gjelder kun de to stedene).
    expect(events.filter((e) => e.type === 'phase:deadlineChanged')).toHaveLength(0);
  });

  // Portert fra «dvale midt i økten: spoler stille gjennom flere faser og lander
  // riktig med nøyaktig én resync-cue». Lyd-assertions → hendelses-assertions:
  // «kun resync-cuen spilte» → alle mellomliggende phase:started er silent, og
  // nøyaktig én resync-hendelse bærer landingsfeltene adapteren trenger.
  it('dvale +95s: spoler stille gjennom fasene og lander riktig med nøyaktig én resync', () => {
    const { clock, engine, events } = createRigg();
    spyWallClockLockstep(clock);
    engine.start();

    // Tidslinje for TABATA_WORKOUT (10s prepare + 8 øvelser à 20s arbeid/10s
    // pause, 1 runde): 95s fra øktstart = 85s inn i syklusene = 2 fulle sykluser
    // (øvelse 0 og 1) + 25s inn i syklus 3 = 5s inn i PAUSEN etter øvelse index 2.
    clock.t = 95_000;
    engine.tick();

    const s = engine.getSnapshot();
    expect(s.status).toBe('running');
    expect(s.phase).toBe('rest');
    expect(s.currentItemIndex).toBe(2);

    // Nøyaktig én resync – med landing-felter. Wrap-regelen (round_rest → items[0])
    // gjelder ikke her; rest annonserer items[idx+1] («Utfall forover», index 3).
    const resyncs = events.filter((e) => e.type === 'resync');
    expect(resyncs).toHaveLength(1);
    expect(resyncs[0]).toMatchObject({ skippedPhases: 6, landingPhase: 'rest', tone: 'rolig' });
    expect(resyncs[0].type === 'resync' ? resyncs[0].exercise?.name : null).toBe('Mountain Climbers');
    expect(resyncs[0].type === 'resync' ? resyncs[0].nextExercise?.name : null).toBe('Utfall forover');

    // Ingen kaskade: alle faseoverganger under catch-up er stille (kun den
    // opprinnelige prepare-starten er ikke-stille).
    expect(
      events.filter((e) => e.type === 'phase:started' && e.phase !== 'prepare' && !e.silent)
    ).toHaveLength(0);

    // a1dc749-porten: ved oppvåkning er den utløpte fasen fortsatt aktiv med
    // remaining=0 idet cue-blokkene evalueres – remaining > 0-vaktene skal hindre
    // enhver spurious countdown- OG endingSoon-emisjon rett før stille catch-up.
    expect(events.filter((e) => e.type === 'countdown')).toHaveLength(0);
    expect(events.filter((e) => e.type === 'phase:endingSoon')).toHaveLength(0);

    // Planrettelse (α3-review): landingens nettopp-emitterte phase:started.endsAt
    // er foreldet med restOvershoot – nøyaktig én deadlineChanged ETTER landingen
    // bærer korrekt frist (t=95s + ~5s igjen = 100_000).
    const deadlines = events.filter((e) => e.type === 'phase:deadlineChanged');
    expect(deadlines).toHaveLength(1);
    expect(deadlines[0]).toMatchObject({ endsAt: 100_000 });
    const lastStartedIdx = events.map((e) => e.type).lastIndexOf('phase:started');
    expect(events.indexOf(deadlines[0])).toBeGreaterThan(lastStartedIdx);

    // Én tick til uten videre tidshopp: den bakdaterte phaseStartTime skal gi
    // ~5s igjen av 10s-pausen (leses via phaseProgress, som i hook-testen).
    clock.t = 95_100;
    engine.tick();
    const s2 = engine.getSnapshot();
    const remaining = s2.phaseTotalSeconds * (1 - s2.phaseProgress);
    expect(remaining).toBeGreaterThan(4.8);
    expect(remaining).toBeLessThan(5.2);
    expect(events.filter((e) => e.type === 'resync')).toHaveLength(1);
    expect(events.filter((e) => e.type === 'phase:deadlineChanged')).toHaveLength(1);
  });

  // Portert fra «dvale forbi slutten av økten»: «nøyaktig ett playWorkoutComplete»
  // → nøyaktig én workout:completed, ingen resync, ingen lyd per hoppet fase.
  it('dvale forbi slutten: fullfører direkte med nøyaktig én workout:completed, ingen resync', () => {
    const { clock, engine, events } = createRigg();
    spyWallClockLockstep(clock);
    engine.start();

    // Hele økten varer 240s – hopp langt forbi slutten (250s fra øktstart).
    clock.t = 250_000;
    engine.tick();

    const s = engine.getSnapshot();
    expect(s.status).toBe('completed');
    expect(s.phase).toBe('complete');
    expect(events.filter((e) => e.type === 'workout:completed')).toHaveLength(1);
    expect(events.filter((e) => e.type === 'resync')).toHaveLength(0);
    // Ingen mellomliggende work/rest-faser skal ha emittert ikke-stille start
    // (fullføringen selv er ALDRI stille – det er phase:started(complete)).
    expect(
      events.filter(
        (e) => e.type === 'phase:started' && (e.phase === 'work' || e.phase === 'rest') && !e.silent
      )
    ).toHaveLength(0);
    // Ingen landing-bakdatering skjer når loopen ender i complete – ingen
    // deadlineChanged (complete har ingen frist).
    expect(events.filter((e) => e.type === 'phase:deadlineChanged')).toHaveLength(0);
  });

  // Portert fra «resync som lander i round_rest»: round_rest-grenen annonserer
  // FØRSTE øvelse (neste runde starter forfra) – samme wrap-regel som
  // phase:started(round_rest), jf. kommentaren i α2-testen over.
  it('resync som lander i round_rest bærer første øvelse som nextExercise (wrap-regelen)', () => {
    const { clock, engine, events } = createRigg(MULTI_ROUND_WORKOUT);
    spyWallClockLockstep(clock);
    engine.start();

    // Tidslinje: prepare 0-10, work 10-30, rest 30-40, round_rest 40-70.
    // t=50s → 10s inn i round_rest, 20s igjen.
    clock.t = 50_000;
    engine.tick();

    const s = engine.getSnapshot();
    expect(s.status).toBe('running');
    expect(s.phase).toBe('round_rest');

    const resyncs = events.filter((e) => e.type === 'resync');
    expect(resyncs).toHaveLength(1);
    expect(resyncs[0]).toMatchObject({ skippedPhases: 3, landingPhase: 'round_rest' });
    expect(resyncs[0].type === 'resync' ? resyncs[0].nextExercise?.name : null).toBe('Knebøy');
  });
});

describe('TimerEngine – cue- og persist-gating (karakterisering)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Portert fra hookens standard-pip-blokk: countdown emitteres per helsekund
  // 3/2/1 med lastCountdownBeep-dedup. NB (avvik-by-design): hooken sjekket
  // persona === 'standard' før pipet – motoren emitter alltid, adapteren (α4)
  // filtrerer på persona. Observabel adferd bevares siden kun adapteren spiller lyd.
  it('countdown emitteres per helsekund 3/2/1 med dedup på gjentatte ticks', () => {
    const { clock, engine, events } = createRigg();
    spyWallClockLockstep(clock);
    engine.start();

    // Prepare 10s: flere ticks per sekund for å bevise dedup via lastCountdownBeep.
    for (const t of [6_900, 7_000, 7_100, 8_000, 8_500, 9_000, 9_900]) {
      clock.t = t;
      engine.tick();
    }

    const countdowns = events.filter((e) => e.type === 'countdown');
    expect(countdowns.map((e) => (e.type === 'countdown' ? e.secondsLeft : -1))).toEqual([3, 2, 1]);
  });

  it('countdown emitteres IKKE når fasen er kortere enn 4 sekunder', () => {
    const shortPrepWorkout = {
      ...MULTI_ROUND_WORKOUT,
      id: 'short-prep',
      prepareDurationSeconds: 3,
    };
    const { clock, engine, events } = createRigg(shortPrepWorkout);
    spyWallClockLockstep(clock);
    engine.start();

    clock.t = 1_000; // remaining 2
    engine.tick();
    clock.t = 2_000; // remaining 1
    engine.tick();

    expect(events.filter((e) => e.type === 'countdown')).toHaveLength(0);
  });

  // Portert fra hookens halfway-blokk. AVVIK-BY-DESIGN (α3→α4): hooken sjekket
  // persona !== 'standard' og speechEnabled FØR cuen ble spilt; motoren emitter
  // alltid-når-gatet (firedCues, phaseDuration >= 15, phaseElapsedSec === halfwaySec)
  // og adapteren filtrerer. Observabel adferd bevares siden kun adapteren spiller lyd.
  it('phase:halfway emitteres nøyaktig én gang midt i lange arbeidsfaser', () => {
    const { clock, engine, events } = createRigg();
    spyWallClockLockstep(clock);
    engine.start();
    engine.skipNext(); // prepare -> work (20s, halfway ved 10s)

    clock.t = 5_000; // floor(5) != 10 – for tidlig
    engine.tick();
    expect(events.filter((e) => e.type === 'phase:halfway')).toHaveLength(0);

    for (const t of [10_000, 10_100, 10_900]) {
      clock.t = t;
      engine.tick();
    }
    // firedCues-dedup: kun én emisjon selv med flere ticks i halvveis-sekundet.
    expect(events.filter((e) => e.type === 'phase:halfway')).toHaveLength(1);
  });

  it('phase:halfway emitteres IKKE for arbeidsfaser under 15 sekunder', () => {
    const shortWorkWorkout = {
      ...MULTI_ROUND_WORKOUT,
      id: 'short-work',
      items: [
        { id: 'sw1', exercise: { id: 'kneboy', name: 'Knebøy' }, workDurationSeconds: 10, restDurationSeconds: 10 },
      ],
    };
    const { clock, engine, events } = createRigg(shortWorkWorkout);
    spyWallClockLockstep(clock);
    engine.start();
    engine.skipNext(); // -> work (10s, halfway-sekundet ville vært 5)

    clock.t = 5_000;
    engine.tick();
    clock.t = 5_100;
    engine.tick();

    expect(events.filter((e) => e.type === 'phase:halfway')).toHaveLength(0);
  });

  // Portert fra hookens 2s-lagringsgating: maks én onPersist per partallssekund
  // (wholeSecondsLeft % 2 + lastSessionSaveSecond), aldri per 100ms-tick.
  it('persist-gating: onPersist maks én gang per partallssekund', () => {
    const { clock, engine } = createRigg();
    spyWallClockLockstep(clock);
    const persisted: Omit<InterruptedSession, 'savedAt'>[] = [];
    engine.setOnPersist((s) => persisted.push(s));
    engine.start();

    // 50 ticks à 100ms gjennom prepare (10s): wholeSecondsLeft er 10 (partall),
    // 9, 8 (partall), 7, 6 (partall), 5 – tre lagringer totalt.
    for (let t = 100; t <= 5_000; t += 100) {
      clock.t = t;
      engine.tick();
    }

    expect(persisted).toHaveLength(3);
    expect(persisted.map((p) => p.totalElapsedSeconds)).toEqual([0, 2, 4]);
    expect(persisted.every((p) => p.phase === 'prepare')).toBe(true);
  });

  // Portert bit-identisk fra hookens persona-start_321-blokk (useIntervalTimer.ts
  // 533-543): remaining > 0 && remaining <= 3.5, kun prepare/rest/round_rest,
  // firedCues-gated én gang per fase, INGEN varighetsvakt. Persona-/speech-sjekken
  // flytter til adapteren (α4) som for halfway/countdown.
  it('phase:endingSoon emitteres én gang i 3,5s-vinduet med firedCues-dedup', () => {
    const { clock, engine, events } = createRigg();
    spyWallClockLockstep(clock);
    engine.start();

    clock.t = 6_400; // remaining 3.6 > 3.5 – utenfor vinduet
    engine.tick();
    expect(events.filter((e) => e.type === 'phase:endingSoon')).toHaveLength(0);

    for (const t of [6_600, 6_700, 7_500, 9_000]) {
      clock.t = t;
      engine.tick();
    }
    expect(events.filter((e) => e.type === 'phase:endingSoon')).toHaveLength(1);
  });

  // Divergensen reviewen fanget: countdown har phaseDuration >= 4-vakt, hookens
  // start_321-vindu hadde INGEN varighetsvakt – en 3s-fase skal gi endingSoon
  // men aldri countdown.
  it('phase:endingSoon fyres også for faser under 4s der countdown aldri gjør det', () => {
    const shortPrepWorkout = {
      ...MULTI_ROUND_WORKOUT,
      id: 'short-prep-ending-soon',
      prepareDurationSeconds: 3,
    };
    const { clock, engine, events } = createRigg(shortPrepWorkout);
    spyWallClockLockstep(clock);
    engine.start();

    clock.t = 1_000; // remaining 2: i vinduet (<= 3.5, > 0)
    engine.tick();
    clock.t = 2_000; // remaining 1
    engine.tick();

    expect(events.filter((e) => e.type === 'phase:endingSoon')).toHaveLength(1);
    expect(events.filter((e) => e.type === 'countdown')).toHaveLength(0);
  });

  it('phase:endingSoon emitteres IKKE i work-fasen (kun prepare/rest/round_rest)', () => {
    const { clock, engine, events } = createRigg();
    spyWallClockLockstep(clock);
    engine.start();
    engine.skipNext(); // -> work (20s)

    clock.t = 17_000; // remaining 3 – i vinduet, men feil fase
    engine.tick();

    expect(events.filter((e) => e.type === 'phase:endingSoon')).toHaveLength(0);
    // Standard-pipet lever derimot i alle faser (som i hooken).
    expect(events.filter((e) => e.type === 'countdown')).toHaveLength(1);
  });
});

describe('TimerEngine – snapshot-gating og subscribe (A3-port)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Portert fra «gater React-render til ~1x/sekund»: render-proben → snapshot-
  // identitet. 10 ticks à 100ms krysser nøyaktig én hel-sekund-grense, så
  // getSnapshot() skal returnere maks 2 ulike identiteter (Object.is-semantikk;
  // Set bruker SameValueZero som er identisk for objektreferanser).
  it('10 ticks à 100ms gir maks 2 ulike snapshot-identiteter og ett lytter-varsel', () => {
    const { clock, engine } = createRigg();
    spyWallClockLockstep(clock);
    engine.start();

    const snapshots = new Set<unknown>();
    snapshots.add(engine.getSnapshot());
    let notifications = 0;
    engine.subscribe(() => notifications++);

    for (let i = 1; i <= 10; i++) {
      clock.t = i * 100;
      engine.tick();
      snapshots.add(engine.getSnapshot());
    }

    expect(snapshots.size).toBeLessThanOrEqual(2);
    // Kun tick nr. 10 (t=1000: ceil(remaining) 10→9, floor(elapsed) 0→1) krysser
    // en rendringsverdig grense – lytteren skal varsles nøyaktig da.
    expect(notifications).toBe(1);
  });

  // Portert fra «fasetransisjon skjer fortsatt presist på riktig tick til tross
  // for gatede renders»: gating er identitets-gating, aldri presisjonstap.
  it('fasetransisjon skjer fortsatt presist på riktig tick tross snapshot-gating', () => {
    const { clock, engine } = createRigg();
    spyWallClockLockstep(clock);
    engine.start();

    for (let i = 1; i <= 100; i++) {
      clock.t = i * 100;
      engine.tick();
    }

    const s = engine.getSnapshot();
    expect(s.phase).toBe('work');
    expect(s.currentItemIndex).toBe(0);
  });
});

describe('TimerEngine – veggklokke-reanker ved dvale (A6-port)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Portert fra «performance.now fryser under dvale»: motorklokken (injisert)
  // fryser mens Date.now (spiontstyrt) hopper 95s – drift-sjekken i tick skal
  // reankre phaseStartTime/workoutStartTime og lande som +95s-testen over.
  it('frossen motorklokke + Date.now-hopp: reankrer og lander riktig med én resync', () => {
    const wall = { t: 1_000_000 };
    const { clock, engine, events } = createRigg();
    vi.spyOn(Date, 'now').mockImplementation(() => wall.t);
    engine.start();

    // Veggklokken går 95s frem, motorklokken (perf) står BOM stille.
    wall.t += 95_000;
    clock.t = 0;
    engine.tick();

    const s = engine.getSnapshot();
    expect(s.status).toBe('running');
    expect(s.phase).toBe('rest');
    expect(s.currentItemIndex).toBe(2);
    expect(events.filter((e) => e.type === 'resync')).toHaveLength(1);
    // Reankringen skal også flytte workoutStartTime: total forløpt tid = 95s.
    expect(s.totalElapsedSeconds).toBe(95);
    // Nøyaktig ÉN deadlineChanged: reanker-stedet emitter IKKE når fasen alt er
    // utløpt (fristen ligger i fortiden og catch-up overtar umiddelbart) — kun
    // landing-bakdateringen varsler, med korrekt frist (5s igjen fra motortid 0).
    const deadlines = events.filter((e) => e.type === 'phase:deadlineChanged');
    expect(deadlines).toHaveLength(1);
    expect(deadlines[0]).toMatchObject({ endsAt: 5_000 });
  });

  // Planrettelsens sted (b) isolert: drift over terskelen der fasen fortsatt
  // lever etter reankringen — én deadlineChanged med korrigert frist, ingen resync.
  it('reanker uten utløpt fase: én deadlineChanged med korrigert frist', () => {
    const wall = { t: 1_000_000 };
    const { clock, engine, events } = createRigg();
    vi.spyOn(Date, 'now').mockImplementation(() => wall.t);
    engine.start();

    // 1s motortid, 4s veggklokke → 3s drift > 2000ms-terskelen; prepare (10s)
    // har 6s igjen etter reankringen.
    clock.t = 1_000;
    wall.t += 4_000;
    engine.tick();

    const s = engine.getSnapshot();
    expect(s.phase).toBe('prepare');
    expect(s.phaseRemainingSeconds).toBe(6);
    const deadlines = events.filter((e) => e.type === 'phase:deadlineChanged');
    expect(deadlines).toHaveLength(1);
    // phaseStartTime reankret til -3000 → frist = -3000 + 10_000 = 7_000.
    expect(deadlines[0]).toMatchObject({ endsAt: 7_000 });
    expect(events.filter((e) => e.type === 'resync')).toHaveLength(0);
  });

  // Portert fra «drift under terskelen (500ms) re-ankrer IKKE».
  it('drift under terskelen (500ms) reankrer IKKE og påvirker ikke gjenværende tid', () => {
    const wall = { t: 1_000_000 };
    const { clock, engine } = createRigg();
    vi.spyOn(Date, 'now').mockImplementation(() => wall.t);
    engine.start();

    // Begge klokker går ~2s frem, med 500ms avvik – godt under 2000ms-terskelen.
    clock.t += 2_000;
    wall.t += 2_500;
    engine.tick();

    const s = engine.getSnapshot();
    expect(s.phase).toBe('prepare');
    expect(s.phaseRemainingSeconds).toBe(8);
  });

  // Portert fra «negativ drift (veggklokken justert bakover) re-ankrer IKKE».
  it('negativ drift (veggklokke justert bakover) reankrer IKKE', () => {
    const wall = { t: 1_000_000 };
    const { clock, engine } = createRigg();
    vi.spyOn(Date, 'now').mockImplementation(() => wall.t);
    engine.start();

    clock.t += 3_000;
    wall.t -= 5_000;
    engine.tick();

    const s = engine.getSnapshot();
    expect(s.phase).toBe('prepare');
    expect(s.phaseRemainingSeconds).toBe(7);
  });
});

describe('TimerEngine – restore/resume (restoreSession-tidsfiksen)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const session = (): InterruptedSession => ({
    workout: TABATA_WORKOUT,
    phase: 'work',
    currentRound: 1,
    currentItemIndex: 2,
    totalElapsedSeconds: 120,
    savedAt: 0,
  });

  // Portert fra hookens restoreSession-semantikk: stille setupPhase + paused.
  it('restore: stille setupPhase, status paused, forløpt tid gjenopprettet', () => {
    const { clock, engine, events } = createRigg();
    clock.t = 500_000;
    engine.restore(session());

    const s = engine.getSnapshot();
    expect(s.status).toBe('paused');
    expect(s.phase).toBe('work');
    expect(s.currentItemIndex).toBe(2);
    expect(s.phaseRemainingSeconds).toBe(20); // fasen starter forfra ved restore
    expect(s.totalElapsedSeconds).toBe(120);

    const started = events.filter((e) => e.type === 'phase:started');
    expect(started).toHaveLength(1);
    expect(started[0]).toMatchObject({ phase: 'work', silent: true });
  });

  // DEN ENE TILSIKTEDE ADFERDSENDRINGEN (spec § 3): restore + resume bakdaterer
  // workoutStartTime fra gjenopprettet forløpt tid. Hooken lot workoutStartTime
  // stå (0 = sidelast), så første tick etter resume rapporterte tid-siden-
  // sidelast (~0) i stedet for ~120s.
  it('tidsfiksen: restore(120s) + resume + tick gir totalElapsedSeconds ≈ 120, ikke ≈ 0', () => {
    const { clock, engine } = createRigg();
    spyWallClockLockstep(clock);
    const persisted: Omit<InterruptedSession, 'savedAt'>[] = [];
    engine.setOnPersist((s) => persisted.push(s));

    clock.t = 500_000;
    engine.restore(session());
    clock.t = 505_000; // 5s pause i paused-tilstand skal IKKE telle som forløpt
    engine.resume();
    clock.t = 505_100;
    engine.tick();

    expect(engine.getSnapshot().totalElapsedSeconds).toBe(120);

    // Persist-stien (motivasjonen for fiksen) rapporterer også riktig forløpt tid.
    engine.pause();
    expect(persisted.at(-1)?.totalElapsedSeconds).toBe(120);
  });
});

describe('TimerEngine – toggles og setWorkout', () => {
  it('toggle-settere muterer tilstand og gir ny snapshot-identitet', () => {
    const { engine } = createRigg();
    const before = engine.getSnapshot();

    engine.setSoundEnabled(false);
    engine.setVibrateEnabled(false);
    engine.setWakeLockEnabled(false);
    engine.setSpeechEnabled(false);
    engine.setLocked(true);

    const after = engine.getSnapshot();
    expect(Object.is(before, after)).toBe(false);
    expect(after).toMatchObject({
      soundEnabled: false,
      vibrateEnabled: false,
      wakeLockEnabled: false,
      speechEnabled: false,
      isLocked: true,
    });
  });

  it('setWorkout i idle synkroniserer ny økt (dagens prop-sync-semantikk)', () => {
    const { engine } = createRigg();
    engine.setWorkout(MULTI_ROUND_WORKOUT);

    const s = engine.getSnapshot();
    expect(s.status).toBe('idle');
    expect(s.phase).toBe('prepare');
    expect(s.phaseRemainingSeconds).toBe(10);
    expect(s.totalRounds).toBe(2);
    expect(s.totalItems).toBe(1);
    expect(s.currentExercise?.name).toBe('Knebøy');
  });

  it('setMotionReps muterer og gir ny snapshot-identitet – samme verdi gir samme identitet', () => {
    const { engine } = createRigg();
    const before = engine.getSnapshot();

    engine.setMotionReps(5);
    const after = engine.getSnapshot();
    expect(Object.is(before, after)).toBe(false);
    expect(after.motionReps).toBe(5);

    // Samme verdi endrer ingen rendringsverdige felter → identiteten består.
    engine.setMotionReps(5);
    expect(Object.is(engine.getSnapshot(), after)).toBe(true);
  });

  it('setWorkout utenfor idle rører ikke kjørende økt (plan-låst semantikk)', () => {
    const { engine } = createRigg();
    engine.start();
    engine.skipNext(); // -> work
    const before = engine.getSnapshot();

    engine.setWorkout(MULTI_ROUND_WORKOUT);

    const after = engine.getSnapshot();
    expect(Object.is(before, after)).toBe(true);
    expect(after.phase).toBe('work');
    expect(after.totalItems).toBe(8);
  });
});

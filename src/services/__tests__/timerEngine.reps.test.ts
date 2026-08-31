import { describe, it, expect } from 'vitest';
import { TimerEngine } from '../timerEngine';
import { EngineEvent } from '../../types/engineEvents';
import { WorkoutTemplate } from '../../types/workout';

/**
 * Repetisjonsbaserte øvelser.
 *
 * «25 push-ups» er en reell økt, men appen kunne bare telle sekunder. Brukeren
 * måtte gjette hvor lang tid 25 repetisjoner tar og sette en tid — og så enten
 * ligge og vente eller bli avbrutt midtveis.
 *
 * Bevegelsestelleren finnes, men den leser akselerometeret og forutsetter at
 * telefonen følger kroppen. Ved push-ups ligger den i gulvet og registrerer
 * ingenting. Kamera er riktig sensor for det, men det er en helt annen jobb.
 *
 * Det billige og ærlige mellomsteget: la fasen vente på brukeren. Ingen
 * nedtelling, ingen gjetning — «ferdig» er et trykk.
 *
 * `workDurationSeconds` beholdes som ANSLAG, slik at totaltiden for økten
 * fortsatt er et tall man kan planlegge etter.
 */

function repsØkt(): WorkoutTemplate {
  return {
    id: 'w-reps',
    name: 'Push-ups',
    description: 'Repetisjonsbasert',
    type: 'custom',
    prepareDurationSeconds: 5,
    rounds: 1,
    roundRestDurationSeconds: 30,
    items: [
      {
        id: 'i1',
        exercise: { id: 'push-ups', name: 'Armhevinger' },
        workDurationSeconds: 60, // anslag, ikke en frist
        restDurationSeconds: 20,
        targetReps: 25,
      },
      {
        id: 'i2',
        exercise: { id: 'planke', name: 'Planke' },
        workDurationSeconds: 30,
        restDurationSeconds: 10,
      },
    ],
  };
}

function createRigg(workout: WorkoutTemplate) {
  const clock = { t: 0 };
  const engine = new TimerEngine(workout, () => clock.t);
  const events: EngineEvent[] = [];
  engine.subscribeEvents((e) => events.push(e));
  return { clock, engine, events };
}

/** Kjør motoren fram i tid slik hookens ticker gjør. */
function spol(rigg: ReturnType<typeof createRigg>, sekunder: number) {
  for (let i = 0; i < sekunder * 10; i++) {
    rigg.clock.t += 100;
    rigg.engine.tick();
  }
}

describe('TimerEngine – repetisjonsbaserte øvelser', () => {
  it('venter på brukeren i stedet for å telle ned', () => {
    const rigg = createRigg(repsØkt());
    rigg.engine.start();
    spol(rigg, 5); // gjennom klargjøringen

    expect(rigg.engine.getSnapshot().phase).toBe('work');

    // Godt forbi anslaget på 60 s — fasen skal fortsatt stå
    spol(rigg, 90);
    const s = rigg.engine.getSnapshot();
    expect(s.phase).toBe('work');
    expect(s.currentItemIndex).toBe(0);
  });

  it('forteller visningen hvor mange repetisjoner som gjenstår å gjøre', () => {
    const rigg = createRigg(repsØkt());
    rigg.engine.start();
    spol(rigg, 5);

    expect(rigg.engine.getSnapshot().awaitingReps).toBe(25);
  });

  it('gir ingen frist til lydplanleggeren', () => {
    const rigg = createRigg(repsØkt());
    rigg.engine.start();
    spol(rigg, 5);

    const work = rigg.events.filter((e) => e.type === 'phase:started' && e.phase === 'work');
    expect(work).toHaveLength(1);
    // endsAt styrer nedtellingspipene. En fase uten frist skal ikke ha noen —
    // ellers piper appen ned mot et tidspunkt som ikke betyr noe.
    expect(work[0]).toMatchObject({ endsAt: null });
  });

  it('går videre når brukeren sier ifra', () => {
    const rigg = createRigg(repsØkt());
    rigg.engine.start();
    spol(rigg, 5);

    rigg.engine.skipNext();

    const s = rigg.engine.getSnapshot();
    expect(s.phase).toBe('rest');
    expect(s.awaitingReps).toBeUndefined();
  });

  it('lar tidsbaserte øvelser i samme økt være uendret', () => {
    const rigg = createRigg(repsØkt());
    rigg.engine.start();
    spol(rigg, 5);
    rigg.engine.skipNext(); // ferdig med push-ups → pause
    spol(rigg, 20); // gjennom pausen

    const s = rigg.engine.getSnapshot();
    expect(s.phase).toBe('work');
    expect(s.currentItemIndex).toBe(1);
    expect(s.awaitingReps).toBeUndefined();

    // Planken teller ned som før og avslutter økten av seg selv
    spol(rigg, 31);
    expect(rigg.engine.getSnapshot().phase).toBe('complete');
  });

  it('lar totaltiden regnes ut fra anslaget, så økten kan planlegges', () => {
    const rigg = createRigg(repsØkt());
    // 5 klargjøring + 60 anslag + 20 pause + 30 planke = 115
    expect(rigg.engine.getSnapshot().totalRemainingSeconds).toBe(115);
  });
});

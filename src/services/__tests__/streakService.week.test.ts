import { describe, it, expect } from 'vitest';
import { computeWeekStreak, WEEK_STREAK_MILESTONES } from '../streakService';
import type { CompletedWorkoutLog } from '../../types/models';

function log(y: number, m: number, d: number): CompletedWorkoutLog {
  return { id: `l-${y}-${m}-${d}-${Math.random()}`, workoutName: 'x',
    completedAt: new Date(y, m - 1, d, 12).toISOString(),
    durationSeconds: 60, roundsCompleted: 1, totalRounds: 1, workoutType: 'hiit' } as CompletedWorkoutLog;
}
/** n økter i uka som starter mandag (y,m,d) */
function week(y: number, m: number, d: number, n: number): CompletedWorkoutLog[] {
  return Array.from({ length: n }, (_, i) => log(y, m, d + (i % 7)));
}
const goal3 = () => 3;
// «nå» = onsdag 2026-03-18; forrige uke starter man 2026-03-09, inneværende man 2026-03-16
const NOW = new Date(2026, 2, 18);

describe('computeWeekStreak', () => {
  it('tom historikk → 0, tom bank, ingen milepæler', () => {
    const r = computeWeekStreak([], goal3, NOW);
    expect(r).toMatchObject({ currentWeeks: 0, bestWeeks: 0, insuranceInBank: 0,
      currentWeekCompleted: false, reachedMilestones: [] });
  });
  it('to fullførte uker t.o.m. forrige uke → 2, milepæl 2 nådd', () => {
    const h = [...week(2026, 3, 2, 3), ...week(2026, 3, 9, 3)];
    const r = computeWeekStreak(h, goal3, NOW);
    expect(r.currentWeeks).toBe(2);
    expect(r.reachedMilestones).toEqual([2]);
  });
  it('inneværende uke ØKER når målet er nådd, men kan aldri BRYTE', () => {
    const base = [...week(2026, 3, 2, 3), ...week(2026, 3, 9, 3)];
    // inneværende uke uten økter: fortsatt 2 (ikke brudd før mandag)
    expect(computeWeekStreak(base, goal3, NOW).currentWeeks).toBe(2);
    // inneværende uke med mål nådd: 3
    const r = computeWeekStreak([...base, ...week(2026, 3, 16, 3)], goal3, NOW);
    expect(r.currentWeeks).toBe(3);
    expect(r.currentWeekCompleted).toBe(true);
  });
  it('slinguke: opptjenes etter 4 fullførte uker (maks 1), forbrukes automatisk på én røket uke — serien STÅR, teller ikke +1', () => {
    // uke 1-4 fullført (opptjener 1), uke 5 røket (forsikres — serien bevares uendret),
    // uke 6 fullført → streak 5 (produkteiers valg 2026-08-29: forsikret uke teller ikke)
    const h = [
      ...week(2026, 1, 5, 3), ...week(2026, 1, 12, 3), ...week(2026, 1, 19, 3), ...week(2026, 1, 26, 3),
      /* uke 2026-02-02: 0 økter */ ...week(2026, 2, 9, 3),
    ];
    const r = computeWeekStreak(h, goal3, new Date(2026, 1, 18)); // ons i uka etter 2026-02-09
    expect(r.currentWeeks).toBe(5);
    expect(r.bestWeeks).toBe(5);
    expect(r.insuranceInBank).toBe(0);
    expect(r.insuranceUsedWeekKeys).toEqual(['2026-02-02']);
  });
  it('to røkne uker på rad med tom bank etter første → brudd; beste serie huskes', () => {
    const h = [
      ...week(2026, 1, 5, 3), ...week(2026, 1, 12, 3), ...week(2026, 1, 19, 3), ...week(2026, 1, 26, 3),
      /* 02-02: røket (forsikret), 02-09: røket (bank tom → brudd) */
      ...week(2026, 2, 16, 3),
    ];
    const r = computeWeekStreak(h, goal3, new Date(2026, 1, 25));
    expect(r.currentWeeks).toBe(1);   // kun 2026-02-16-uka
    expect(r.bestWeeks).toBe(4);      // 4 faktiske treningsuker; forsikret uke teller ikke
  });
  it('maks 1 i banken: 8 fullførte uker opptjener ALDRI bank nummer to', () => {
    // 8 fullførte uker (bank opptjent ved uke 4, uke 5-8 kan ikke fylle på over maks 1),
    // så to røkne uker: første forsikres (serien står på 8), andre bryter — beviser maks 1.
    const h = [
      ...week(2026, 1, 5, 3), ...week(2026, 1, 12, 3), ...week(2026, 1, 19, 3), ...week(2026, 1, 26, 3),
      ...week(2026, 2, 2, 3), ...week(2026, 2, 9, 3), ...week(2026, 2, 16, 3), ...week(2026, 2, 23, 3),
      /* 03-02: røket (forsikres), 03-09: røket (bank tom → brudd) */
    ];
    const r = computeWeekStreak(h, goal3, new Date(2026, 2, 18)); // ons i uka 2026-03-16
    expect(r.currentWeeks).toBe(0);
    expect(r.bestWeeks).toBe(8);
    expect(r.insuranceInBank).toBe(0);
    // Nøkler fra ALLE historiske serier — også serier som senere røk
    expect(r.insuranceUsedWeekKeys).toEqual(['2026-03-02']);
  });
  it('uker FØR første økt noensinne teller ikke som brudd', () => {
    const h = week(2026, 3, 9, 3); // første og eneste uke = forrige uke
    expect(computeWeekStreak(h, goal3, NOW).currentWeeks).toBe(1);
  });
  it('målendring per uke respekteres via goalForWeek-callback', () => {
    const goals: Record<string, number> = { '2026-03-02': 5, '2026-03-09': 2 };
    const h = [...week(2026, 3, 2, 3), ...week(2026, 3, 9, 3)]; // 3 økter begge uker
    const r = computeWeekStreak(h, (k) => goals[k] ?? 3, NOW);
    // uke 03-02 krevde 5 → røket (ingen bank å bruke); uke 03-09 krevde 2 → fullført
    expect(r.currentWeeks).toBe(1);
  });
  it('nyttårsuke håndteres (mandag 2025-12-29 dekker t.o.m. 2026-01-04)', () => {
    const h = [log(2025, 12, 30), log(2026, 1, 2), log(2026, 1, 4)]; // 3 økter i SAMME uke
    const r = computeWeekStreak(h, goal3, new Date(2026, 0, 7)); // ons uka etter
    expect(r.currentWeeks).toBe(1);
  });
  it('milepælslisten er [2,4,8,12,26,52]', () => {
    expect([...WEEK_STREAK_MILESTONES]).toEqual([2, 4, 8, 12, 26, 52]);
  });
});

describe('brudd-sporing (lastBrokenWeeks/breakWeekKey — B1)', () => {
  it('tom historikk og aldri brutt → 0 / null', () => {
    const empty = computeWeekStreak([], goal3, NOW);
    expect(empty.lastBrokenWeeks).toBe(0);
    expect(empty.breakWeekKey).toBeNull();

    const unbroken = computeWeekStreak([...week(2026, 3, 2, 3), ...week(2026, 3, 9, 3)], goal3, NOW);
    expect(unbroken.lastBrokenWeeks).toBe(0);
    expect(unbroken.breakWeekKey).toBeNull();
  });

  it('forsikret uke er IKKE et brudd', () => {
    const h = [
      ...week(2026, 1, 5, 3), ...week(2026, 1, 12, 3), ...week(2026, 1, 19, 3), ...week(2026, 1, 26, 3),
      /* uke 2026-02-02: 0 økter — forsikres */ ...week(2026, 2, 9, 3),
    ];
    const r = computeWeekStreak(h, goal3, new Date(2026, 1, 18));
    expect(r.lastBrokenWeeks).toBe(0);
    expect(r.breakWeekKey).toBeNull();
  });

  it('brudd fanger serielengden som røk og ukenøkkelen der bruddet skjedde', () => {
    const h = [
      ...week(2026, 1, 5, 3), ...week(2026, 1, 12, 3), ...week(2026, 1, 19, 3), ...week(2026, 1, 26, 3),
      /* 02-02: røket (forsikret), 02-09: røket (bank tom → brudd) */
      ...week(2026, 2, 16, 3),
    ];
    const r = computeWeekStreak(h, goal3, new Date(2026, 1, 25));
    expect(r.lastBrokenWeeks).toBe(4);
    expect(r.breakWeekKey).toBe('2026-02-09');
  });

  it('nytt brudd overskriver forrige', () => {
    // 01-05, 01-12 fullført; 01-19 røket (brudd: 2); 01-26 fullført; 02-02 røket (brudd: 1)
    const h = [
      ...week(2026, 1, 5, 3), ...week(2026, 1, 12, 3),
      ...week(2026, 1, 26, 3),
    ];
    const r = computeWeekStreak(h, goal3, new Date(2026, 1, 11)); // ons i uka 2026-02-09
    expect(r.lastBrokenWeeks).toBe(1);
    expect(r.breakWeekKey).toBe('2026-02-02');
  });

  it('røket uke uten aktiv serie oppdaterer ikke brudd-sporet', () => {
    // 01-05, 01-12 fullført; 01-19 røket (brudd: 2); 01-26 røket (serien alt 0 — intet nytt brudd)
    const h = [...week(2026, 1, 5, 3), ...week(2026, 1, 12, 3)];
    const r = computeWeekStreak(h, goal3, new Date(2026, 1, 4)); // ons i uka 2026-02-02
    expect(r.lastBrokenWeeks).toBe(2);
    expect(r.breakWeekKey).toBe('2026-01-19');
  });
});

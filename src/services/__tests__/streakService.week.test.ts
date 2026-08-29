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
  it('slinguke: opptjenes etter 4 fullførte uker (maks 1), forbrukes automatisk på én røket uke', () => {
    // uke 1-4 fullført (opptjener 1), uke 5 røket (forbrukes), uke 6 fullført → streak 6
    const h = [
      ...week(2026, 1, 5, 3), ...week(2026, 1, 12, 3), ...week(2026, 1, 19, 3), ...week(2026, 1, 26, 3),
      /* uke 2026-02-02: 0 økter */ ...week(2026, 2, 9, 3),
    ];
    const r = computeWeekStreak(h, goal3, new Date(2026, 1, 18)); // ons i uka etter 2026-02-09
    expect(r.currentWeeks).toBe(6);
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
    expect(r.bestWeeks).toBe(5);      // 4 + forsikret uke
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

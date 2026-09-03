import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getAllUserBadges, MILESTONE_BADGE_DEFINITIONS } from '../badgeService';
import type { CompletedWorkoutLog } from '../../types/models';

// log()/week()-hjelperne er gjenbrukt fra streakService.week.test.ts (planens Task 3)
// slik at seedet historikk dømmes identisk av computeWeekStreak i begge testfiler.
function log(y: number, m: number, d: number): CompletedWorkoutLog {
  return { id: `l-${y}-${m}-${d}-${Math.random()}`, workoutName: 'x',
    completedAt: new Date(y, m - 1, d, 12).toISOString(),
    durationSeconds: 60, roundsCompleted: 1, totalRounds: 1, workoutType: 'hiit' } as CompletedWorkoutLog;
}
/** n økter i uka som starter mandag (y,m,d) */
function week(y: number, m: number, d: number, n: number): CompletedWorkoutLog[] {
  return Array.from({ length: n }, (_, i) => log(y, m, d + (i % 7)));
}

// «nå» = onsdag 2026-03-18; forrige uke starter man 2026-03-09, inneværende man 2026-03-16.
// Badge-check'ene tar kun history og bruker ekte klokke — derfor fryses tiden her.
const NOW = new Date(2026, 2, 18);

/** n sammenhengende fullførte uker (3 økter/uke, mål 3) som slutter i FORRIGE uke (man 2026-03-09). */
function completedWeeksEndingLastWeek(n: number): CompletedWorkoutLog[] {
  const out: CompletedWorkoutLog[] = [];
  for (let i = 0; i < n; i++) {
    // Date-konstruktøren normaliserer negative dagtall — mandag i uke i regnet bakover fra 2026-03-09
    const monday = new Date(2026, 2, 9 - (n - 1 - i) * 7);
    out.push(...week(monday.getFullYear(), monday.getMonth() + 1, monday.getDate(), 3));
  }
  return out;
}

const WEEK_MILESTONES = [2, 4, 8, 12, 26, 52] as const;
const TITLES: Record<number, string> = {
  2: 'To uker sterk',
  4: 'Månedsrytme',
  8: 'Åtte uker på rad',
  12: 'Kvartalsvane',
  26: 'Halvår i boks',
  52: 'Ett helt år',
};

function findWeekBadge(history: CompletedWorkoutLog[], n: number) {
  const badge = getAllUserBadges(history).find((b) => b.id === `badge-week-streak-${n}`);
  expect(badge, `badge-week-streak-${n} mangler`).toBeDefined();
  return badge!;
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => {
  vi.useRealTimers();
});

describe('uke-streak-milepælbadges (badgeService)', () => {
  it('alle seks definisjoner finnes med riktig tittel, kategori streak og maxProgress', () => {
    for (const n of WEEK_MILESTONES) {
      const def = MILESTONE_BADGE_DEFINITIONS.find((d) => d.id === `badge-week-streak-${n}`);
      expect(def, `definisjon badge-week-streak-${n} mangler`).toBeDefined();
      expect(def!.title).toBe(TITLES[n]);
      expect(def!.category).toBe('streak');
      expect(def!.maxProgress).toBe(n);
    }
  });

  it('tom historikk → alle seks låst med progress 0', () => {
    for (const n of WEEK_MILESTONES) {
      const badge = findWeekBadge([], n);
      expect(badge.isUnlocked).toBe(false);
      expect(badge.progress).toBe(0);
    }
  });

  it.each(WEEK_MILESTONES.map((n) => [n]))(
    '%i fullførte uker på rad låser opp badge-week-streak-%i med full progress',
    (n) => {
      const h = completedWeeksEndingLastWeek(n);
      const badge = findWeekBadge(h, n);
      expect(badge.isUnlocked).toBe(true);
      expect(badge.progress).toBe(n);
      expect(badge.progressLabel).toBe(`${n}/${n}`);
    }
  );

  it('progress mot NESTE milepæl viser faktiske uker, cappet ved N (12 uker → w26 og w52 låst på 12)', () => {
    const h = completedWeeksEndingLastWeek(12);
    for (const n of [2, 4, 8, 12]) {
      expect(findWeekBadge(h, n).isUnlocked).toBe(true);
    }
    const w26 = findWeekBadge(h, 26);
    expect(w26.isUnlocked).toBe(false);
    expect(w26.progress).toBe(12);
    const w52 = findWeekBadge(h, 52);
    expect(w52.isUnlocked).toBe(false);
    expect(w52.progress).toBe(12);
  });

  it('bestWeeks-låsing: badges forblir opplåst etter brudd i serien', () => {
    // Uke 2026-01-05..01-26 fullført (4 → bank opptjent), 02-02 røket (forsikret),
    // 02-09 røket (bank tom → BRUDD), 02-16 fullført. currentWeeks=1, bestWeeks=4.
    const h = [
      ...week(2026, 1, 5, 3), ...week(2026, 1, 12, 3), ...week(2026, 1, 19, 3), ...week(2026, 1, 26, 3),
      ...week(2026, 2, 16, 3),
    ];
    vi.setSystemTime(new Date(2026, 1, 25)); // ons, inneværende uke man 2026-02-23

    const w2 = findWeekBadge(h, 2);
    const w4 = findWeekBadge(h, 4);
    expect(w2.isUnlocked).toBe(true);  // re-låses IKKE selv om nåværende serie er 1
    expect(w4.isUnlocked).toBe(true);
    expect(w4.progress).toBe(4);       // progress følger bestWeeks, ikke currentWeeks
    expect(findWeekBadge(h, 8).progress).toBe(4);
  });

  it('forsikret uke bevarer serien uten å telle +1 (produkteiers valg 2026-08-29)', () => {
    // 4 fullførte uker (bank opptjent), 02-02 røket (forsikret — teller IKKE),
    // 02-09 fullført → 5 faktiske treningsuker over 6 kalenderuker.
    const h = [
      ...week(2026, 1, 5, 3), ...week(2026, 1, 12, 3), ...week(2026, 1, 19, 3), ...week(2026, 1, 26, 3),
      ...week(2026, 2, 9, 3),
    ];
    vi.setSystemTime(new Date(2026, 1, 18)); // ons i uka etter 2026-02-09

    expect(findWeekBadge(h, 4).isUnlocked).toBe(true);
    const w8 = findWeekBadge(h, 8);
    expect(w8.isUnlocked).toBe(false);
    expect(w8.progress).toBe(5); // ikke 6 — den forsikrede uka gir ingen +1
  });

  it('deler ÉN streakberegning mellom de seks badge-checkene (B3): målloggen leses maks én gang', () => {
    const h = completedWeeksEndingLastWeek(4);
    const spy = vi.spyOn(Storage.prototype, 'getItem');
    getAllUserBadges(h);
    const goalLogReads = spy.mock.calls.filter(([k]) => k === 'mintrener_weekly_goal_log_v1').length;
    expect(goalLogReads).toBeLessThanOrEqual(1);
    spy.mockRestore();
  });

  it('rører ikke de eksisterende dag-streak-badgene', () => {
    const badges = getAllUserBadges([]);
    expect(badges.find((b) => b.id === 'badge-streak-7')?.maxProgress).toBe(7);
    expect(badges.find((b) => b.id === 'badge-streak-30')?.maxProgress).toBe(30);
  });
});

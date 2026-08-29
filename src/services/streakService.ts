import { weekKey, addWeeksToKey } from './weekUtils';
import type { CompletedWorkoutLog } from '../types/models';

/**
 * Beregner nåværende streak (antall dager på rad med minst én fullført økt),
 * regnet bakover fra i dag/i går.
 *
 * Ren, testbar funksjon som tar imot en liste med ISO-datoer (YYYY-MM-DD)
 * i stedet for hele historikkobjekter. Brukes både av WorkoutSummary.tsx
 * (rett etter fullført økt) og WorkoutHistoryView.tsx (statistikkoversikt)
 * - én kilde til sannhet for streak-formelen (Oppgave A4-oppfølging).
 */
export function computeStreakDays(dates: string[]): number {
  const uniqueDates = Array.from(new Set(dates)).sort().reverse();
  if (uniqueDates.length === 0) return 0;

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  if (!uniqueDates.includes(today) && !uniqueDates.includes(yesterday)) {
    return 0;
  }

  let streak = 1;
  let checkDate = new Date(uniqueDates[0]);
  for (let i = 1; i < uniqueDates.length; i++) {
    const prev = new Date(uniqueDates[i]);
    const diffDays = Math.round((checkDate.getTime() - prev.getTime()) / 86400000);
    if (diffDays === 1) {
      streak++;
      checkDate = prev;
    } else {
      break;
    }
  }
  return streak;
}

export const WEEK_STREAK_MILESTONES = [2, 4, 8, 12, 26, 52] as const;

export interface WeekStreakResult {
  /** Sammenhengende fullførte uker t.o.m. forrige uke, +1 hvis inneværende alt er nådd. */
  currentWeeks: number;
  bestWeeks: number;
  insuranceInBank: 0 | 1;
  insuranceUsedWeekKeys: string[];
  currentWeekCompleted: boolean;
  /** Milepæler (fra WEEK_STREAK_MILESTONES) som currentWeeks har nådd. */
  reachedMilestones: number[];
}

/**
 * Ren simulering fra første uke med historikk til og med inneværende uke.
 * Regler (spec § 2.1 + planpresisering 2):
 *  - Fullført uke = antall økter i uka >= goalForWeek(ukenøkkel).
 *  - 1 slinguke opptjenes per 4. PÅFØLGENDE fullførte uke, maks 1 i banken.
 *  - Røket uke forbruker bank automatisk (streaken fortsetter); tom bank → nullstill.
 *  - Inneværende uke kan øke (hvis alt fullført) men aldri bryte.
 */
export function computeWeekStreak(
  history: CompletedWorkoutLog[],
  goalForWeek: (wk: string) => number,
  now: Date = new Date()
): WeekStreakResult {
  const perWeek = new Map<string, number>();
  for (const log of history) {
    const wk = weekKey(new Date(log.completedAt));
    perWeek.set(wk, (perWeek.get(wk) ?? 0) + 1);
  }
  const currentWk = weekKey(now);
  if (perWeek.size === 0) {
    return { currentWeeks: 0, bestWeeks: 0, insuranceInBank: 0,
      insuranceUsedWeekKeys: [], currentWeekCompleted: false, reachedMilestones: [] };
  }
  const firstWk = [...perWeek.keys()].sort()[0];

  let streak = 0, best = 0, bank: 0 | 1 = 0, consecutiveSinceEarn = 0;
  const used: string[] = [];
  for (let wk = firstWk; wk < currentWk; wk = addWeeksToKey(wk, 1)) {
    const completed = (perWeek.get(wk) ?? 0) >= goalForWeek(wk);
    if (completed) {
      streak += 1;
      consecutiveSinceEarn += 1;
      if (consecutiveSinceEarn >= 4) { bank = 1; consecutiveSinceEarn = 0; }
    } else if (bank === 1) {
      bank = 0; used.push(wk); streak += 1; consecutiveSinceEarn = 0;
    } else {
      streak = 0; consecutiveSinceEarn = 0;
    }
    best = Math.max(best, streak);
  }
  const currentWeekCompleted = (perWeek.get(currentWk) ?? 0) >= goalForWeek(currentWk);
  const currentWeeks = streak + (currentWeekCompleted ? 1 : 0);
  best = Math.max(best, currentWeeks);
  return {
    currentWeeks, bestWeeks: best, insuranceInBank: bank,
    insuranceUsedWeekKeys: used, currentWeekCompleted,
    reachedMilestones: WEEK_STREAK_MILESTONES.filter((m) => currentWeeks >= m),
  };
}

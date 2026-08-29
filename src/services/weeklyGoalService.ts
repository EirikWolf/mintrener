import { CompletedWorkoutLog } from '../types/models';
import { getWeekStart, weekKey, addWeeksToKey } from './weekUtils';

const WEEKLY_GOAL_STORAGE_KEY = 'mintrener_weekly_goal';
const GOAL_LOG_KEY = 'mintrener_weekly_goal_log_v1';
const DEFAULT_WEEKLY_GOAL = 3;

type GoalLogEntry = { weekKey: string; goal: number };

function readGoalLog(): GoalLogEntry[] {
  try {
    const raw = localStorage.getItem(GOAL_LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((e): e is GoalLogEntry =>
      typeof e?.weekKey === 'string' && typeof e?.goal === 'number');
  } catch { return []; }
}

/**
 * Lager et oppslag «ukestart → gjeldende mål» som leser og sorterer målloggen
 * ÉN gang og returnerer en ren closure. Bruk denne (ikke getGoalForWeek som
 * naken callback) når mange uker skal slås opp i samme beregning — f.eks.
 * computeWeekStreak fra en UI-effekt — så localStorage ikke leses per uke.
 *
 * Semantikk (identisk med getGoalForWeek): uker ELDRE enn loggens første linje
 * dømmes etter første linjes mål (det historiske ankeret er beste estimat for
 * hele fortiden) — aldri etter gjeldende mål, ellers ville en målheving
 * re-dømt historikken og kollapset streaken retroaktivt. Gjeldende mål brukes
 * kun ved tom logg.
 */
export function makeGoalForWeek(): (targetWeekKey: string) => number {
  const log = readGoalLog()
    // 'YYYY-MM-DD' sorterer leksikalsk = kronologisk
    .sort((a, b) => (a.weekKey < b.weekKey ? -1 : a.weekKey > b.weekKey ? 1 : 0));
  const currentGoal = getWeeklyGoal();
  return (targetWeekKey: string): number => {
    if (log.length === 0) return currentGoal;
    const applicable = log.filter((e) => e.weekKey <= targetWeekKey);
    return applicable.length > 0 ? applicable[applicable.length - 1].goal : log[0].goal;
  };
}

/** Målet som gjaldt ved gitt ukestart (engangsoppslag; se makeGoalForWeek). */
export function getGoalForWeek(targetWeekKey: string): number {
  return makeGoalForWeek()(targetWeekKey);
}

export interface WeeklyGoalProgress {
  goal: number;
  completedThisWeek: number;
  percentage: number;
  isGoalMet: boolean;
}

/**
 * Henter brukerens innstilte ukesmål (standard: 3 økter/uke)
 */
export function getWeeklyGoal(): number {
  try {
    const raw = localStorage.getItem(WEEKLY_GOAL_STORAGE_KEY);
    if (!raw) return DEFAULT_WEEKLY_GOAL;
    const num = parseInt(raw, 10);
    return isNaN(num) || num < 1 || num > 14 ? DEFAULT_WEEKLY_GOAL : num;
  } catch {
    return DEFAULT_WEEKLY_GOAL;
  }
}

/**
 * Lagrer nytt ukesmål
 */
export function setWeeklyGoal(goal: number): void {
  try {
    const clamped = Math.max(1, Math.min(14, Math.round(goal)));
    const previousGoal = getWeeklyGoal();
    localStorage.setItem(WEEKLY_GOAL_STORAGE_KEY, clamped.toString());

    // Mållogg (spec § 2.1): endringen gjelder fra NESTE uke — inneværende uke
    // dømmes etter målet ved ukestart. Første logglinje ankrer derfor det gamle
    // målet på inneværende ukenøkkel, ellers ville getGoalForWeek falt tilbake
    // til det nye gjeldende målet for uker før loggens start.
    const currentWk = weekKey(new Date());
    const nextWk = addWeeksToKey(currentWk, 1);
    const log = readGoalLog();
    if (log.length === 0) {
      log.push({ weekKey: currentWk, goal: previousGoal });
    }
    const updated = log.filter((e) => e.weekKey !== nextWk);
    updated.push({ weekKey: nextWk, goal: clamped });
    localStorage.setItem(GOAL_LOG_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Kunne ikke lagre ukesmål:', err);
  }
}

/**
 * Beregner fremdrift mot ukesmålet basert på inneværende uke (mandag-søndag)
 */
export function calculateWeeklyProgress(history: CompletedWorkoutLog[], goal?: number, now: Date = new Date()): WeeklyGoalProgress {
  const targetGoal = goal ?? getWeeklyGoal();

  // Starttidspunkt for inneværende mandag kl 00:00:00 lokal tid (felles ukedefinisjon)
  const mondayStartTime = getWeekStart(now).getTime();

  // Tell unike dager eller totalt antall økter gjennomført siden mandag
  const thisWeekLogs = history.filter((log) => {
    const logTime = new Date(log.completedAt).getTime();
    return logTime >= mondayStartTime;
  });

  const completedCount = thisWeekLogs.length;
  const percentage = Math.min(100, Math.round((completedCount / targetGoal) * 100));

  return {
    goal: targetGoal,
    completedThisWeek: completedCount,
    percentage,
    isGoalMet: completedCount >= targetGoal,
  };
}

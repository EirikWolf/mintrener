import { CompletedWorkoutLog } from '../types/models';
import { getWeekStart } from './weekUtils';

const WEEKLY_GOAL_STORAGE_KEY = 'mintrener_weekly_goal';
const DEFAULT_WEEKLY_GOAL = 3;

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
    localStorage.setItem(WEEKLY_GOAL_STORAGE_KEY, clamped.toString());
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

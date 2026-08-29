import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getWeeklyGoal,
  setWeeklyGoal,
  calculateWeeklyProgress,
  getGoalForWeek,
} from '../weeklyGoalService';
import { weekKey, addWeeksToKey } from '../weekUtils';
import { CompletedWorkoutLog } from '../../types/models';

describe('Weekly Goal Service', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('gir standard ukesmål på 3 økter', () => {
    expect(getWeeklyGoal()).toBe(3);
  });

  it('kan endre og hente ukesmål', () => {
    setWeeklyGoal(5);
    expect(getWeeklyGoal()).toBe(5);
  });

  it('beregner fremdrift mot ukesmålet', () => {
    const history: CompletedWorkoutLog[] = [
      {
        id: '1',
        userId: 'u1',
        workoutId: 'w1',
        workoutName: 'Økt 1',
        workoutType: 'tabata',
        completedAt: new Date().toISOString(),
        durationSeconds: 300,
        roundsCompleted: 1,
        totalRounds: 1,
      },
      {
        id: '2',
        userId: 'u1',
        workoutId: 'w2',
        workoutName: 'Økt 2',
        workoutType: 'tabata',
        completedAt: new Date().toISOString(),
        durationSeconds: 300,
        roundsCompleted: 1,
        totalRounds: 1,
      },
    ];

    const progress = calculateWeeklyProgress(history, 4);
    expect(progress.goal).toBe(4);
    expect(progress.completedThisWeek).toBe(2);
    expect(progress.percentage).toBe(50);
    expect(progress.isGoalMet).toBe(false);
  });
});

describe('getGoalForWeek', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  it('uten logg: alle uker dømmes etter gjeldende mål', () => {
    expect(getGoalForWeek('2026-01-05')).toBe(getWeeklyGoal());
  });
  it('endring gjelder fra NESTE uke (spec § 2.1)', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 0, 7)); // onsdag, uke 2026-01-05
    setWeeklyGoal(5);
    expect(getGoalForWeek(weekKey(new Date(2026, 0, 7)))).toBe(3);         // inneværende: gammelt mål
    expect(getGoalForWeek(addWeeksToKey(weekKey(new Date(2026, 0, 7)), 1))).toBe(5); // neste: nytt
  });
  it('endring i uke N påvirker ikke uke N-1 (historisk anker, ikke nytt mål)', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 0, 7)); // onsdag, uke 2026-01-05
    setWeeklyGoal(5);
    // Uker ELDRE enn loggens første linje skal dømmes etter første linjes mål
    // (det gamle), aldri etter gjeldende mål — ellers ville en målheving
    // re-dømt hele historikken og kollapset streaken retroaktivt.
    expect(getGoalForWeek('2025-12-29')).toBe(3);
    expect(getGoalForWeek('2024-06-03')).toBe(3);
  });
  it('flere endringer: siste logglinje med weekKey <= spurt uke vinner', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 7)); setWeeklyGoal(5);
    vi.setSystemTime(new Date(2026, 0, 20)); setWeeklyGoal(2);
    expect(getGoalForWeek('2026-01-12')).toBe(5);
    expect(getGoalForWeek('2026-02-02')).toBe(2);
  });
  it('korrupt logg → fallback til gjeldende mål, ingen kræsj', () => {
    localStorage.setItem('mintrener_weekly_goal_log_v1', '{{{');
    expect(getGoalForWeek('2026-01-05')).toBe(getWeeklyGoal());
  });
});

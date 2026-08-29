import { describe, it, expect } from 'vitest';
import { getWeekStart, weekKey, addWeeksToKey } from '../weekUtils';
import { calculateWeeklyProgress } from '../weeklyGoalService';
import type { CompletedWorkoutLog } from '../../types/models';

function log(completedAt: string): CompletedWorkoutLog {
  return { id: `log-${completedAt}`, workoutName: 'x', completedAt, durationSeconds: 60, roundsCompleted: 1, totalRounds: 1, workoutType: 'hiit' } as CompletedWorkoutLog;
}

describe('calculateWeeklyProgress (karakterisering før refaktor)', () => {
  it('teller kun økter fra og med mandag 00:00 lokal tid', () => {
    // Torsdag 2026-01-08. Mandag samme uke = 2026-01-05.
    const now = new Date(2026, 0, 8, 12, 0, 0);
    const history = [
      log(new Date(2026, 0, 5, 0, 0, 1).toISOString()),  // mandag 00:00:01 — teller
      log(new Date(2026, 0, 4, 23, 59, 0).toISOString()), // søndag før — teller IKKE
    ];
    const res = calculateWeeklyProgress(history, 3, now);
    expect(res.completedThisWeek).toBe(1);
  });
});

describe('weekUtils', () => {
  it('getWeekStart gir mandag 00:00 lokal for alle ukedager', () => {
    // søndag 2026-01-04 → mandag 2025-12-29 (uke over nyttår!)
    expect(weekKey(new Date(2026, 0, 4, 15, 0))).toBe('2025-12-29');
    // mandag 2026-01-05 → seg selv
    expect(weekKey(new Date(2026, 0, 5, 0, 0))).toBe('2026-01-05');
    expect(getWeekStart(new Date(2026, 0, 8)).getDay()).toBe(1);
    expect(getWeekStart(new Date(2026, 0, 8)).getHours()).toBe(0);
  });
  it('addWeeksToKey går ±n uker', () => {
    expect(addWeeksToKey('2026-01-05', 1)).toBe('2026-01-12');
    expect(addWeeksToKey('2026-01-05', -1)).toBe('2025-12-29');
  });
});

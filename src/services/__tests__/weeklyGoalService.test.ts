import { describe, it, expect, beforeEach } from 'vitest';
import {
  getWeeklyGoal,
  setWeeklyGoal,
  calculateWeeklyProgress,
} from '../weeklyGoalService';
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

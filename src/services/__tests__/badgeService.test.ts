import { describe, it, expect, beforeEach } from 'vitest';
import {
  getAllUserBadges,
  calculateMaxStreak,
  MILESTONE_BADGE_DEFINITIONS,
} from '../badgeService';
import { CompletedWorkoutLog } from '../../types/models';

describe('badgeService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('calculates max streak correctly across consecutive days', () => {
    const history: CompletedWorkoutLog[] = [
      {
        id: 's1',
        userId: 'u1',
        workoutId: 'w1',
        workoutName: 'Tabata',
        workoutType: 'tabata',
        completedAt: '2026-08-01T10:00:00Z',
        durationSeconds: 240,
        roundsCompleted: 1,
        totalRounds: 1,
      },
      {
        id: 's2',
        userId: 'u1',
        workoutId: 'w1',
        workoutName: 'Tabata',
        workoutType: 'tabata',
        completedAt: '2026-08-02T10:00:00Z',
        durationSeconds: 240,
        roundsCompleted: 1,
        totalRounds: 1,
      },
      {
        id: 's3',
        userId: 'u1',
        workoutId: 'w1',
        workoutName: 'Tabata',
        workoutType: 'tabata',
        completedAt: '2026-08-03T10:00:00Z',
        durationSeconds: 240,
        roundsCompleted: 1,
        totalRounds: 1,
      },
      {
        id: 's4',
        userId: 'u1',
        workoutId: 'w1',
        workoutName: 'Tabata',
        workoutType: 'tabata',
        completedAt: '2026-08-05T10:00:00Z',
        durationSeconds: 240,
        roundsCompleted: 1,
        totalRounds: 1,
      },
    ];

    expect(calculateMaxStreak(history)).toBe(3);
  });

  it('unlocks first workout badge when at least 1 workout exists', () => {
    const history: CompletedWorkoutLog[] = [
      {
        id: 's1',
        userId: 'u1',
        workoutId: 'w1',
        workoutName: 'Morgenøkt',
        workoutType: 'tabata',
        completedAt: new Date(2026, 7, 10, 6, 30).toISOString(), // Early bird (< 07:00 local time)
        durationSeconds: 300,
        roundsCompleted: 1,
        totalRounds: 1,
      },
    ];

    const badges = getAllUserBadges(history);
    const firstStep = badges.find((b) => b.id === 'badge-first-workout');
    const earlyBird = badges.find((b) => b.id === 'badge-early-bird');

    expect(firstStep?.isUnlocked).toBe(true);
    expect(earlyBird?.isUnlocked).toBe(true);
  });

  it('includes all 12 challenge badges plus milestone definitions', () => {
    const badges = getAllUserBadges([]);
    expect(badges.length).toBe(12 + MILESTONE_BADGE_DEFINITIONS.length);
  });
});

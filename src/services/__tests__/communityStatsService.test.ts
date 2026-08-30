import { describe, it, expect, vi } from 'vitest';
import { formatThreshold3Count, getCommunityWorkoutCount, THRESHOLD_MIN_DISPLAY } from '../communityStatsService';

vi.mock('../firebase', () => ({
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn().mockResolvedValue({
    exists: () => true,
    data: () => ({ count: 12 }),
  }),
  setDoc: vi.fn().mockResolvedValue(undefined),
  increment: vi.fn((n) => n),
}));

describe('communityStatsService (Terskel 3 Personvern)', () => {
  it('returnerer null for tellere under terskelen (0, 1, 2)', () => {
    expect(formatThreshold3Count(0)).toBeNull();
    expect(formatThreshold3Count(1)).toBeNull();
    expect(formatThreshold3Count(2)).toBeNull();
  });

  it('returnerer formatert tekst for tellere >= terskelen (3, 4, 15 osv.)', () => {
    expect(formatThreshold3Count(THRESHOLD_MIN_DISPLAY)).toBe('3 har trent denne');
    expect(formatThreshold3Count(15)).toBe('15 har trent denne');
  });

  it('henter tall fra Firestore', async () => {
    const count = await getCommunityWorkoutCount('tabata-klassisk');
    expect(count).toBe(12);
  });
});

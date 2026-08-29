import { describe, it, expect, beforeEach } from 'vitest';
import { getUncelebratedMilestones, markMilestoneCelebrated } from '../streakCelebrationService';

beforeEach(() => localStorage.clear());
describe('streakCelebrationService', () => {
  it('nye milepæler er ufeirede; markering er varig; korrupt lagring → alt regnes ufeiret', () => {
    expect(getUncelebratedMilestones([2, 4])).toEqual([2, 4]);
    markMilestoneCelebrated(2);
    expect(getUncelebratedMilestones([2, 4])).toEqual([4]);
    localStorage.setItem('mintrener_streak_celebrated_v1', 'not-json');
    expect(getUncelebratedMilestones([2])).toEqual([2]);
  });
});

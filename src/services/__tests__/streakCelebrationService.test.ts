import { describe, it, expect, beforeEach } from 'vitest';
import {
  getUncelebratedMilestones,
  markMilestoneCelebrated,
  getLastReportedInsuranceWeek,
  markInsuranceReported,
  getLastReportedBreakWeek,
  markBreakReported,
} from '../streakCelebrationService';

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

describe('telemetri-dedupe-markører (slinguke-forbruk og brudd)', () => {
  it('insurance-markør: null i utgangspunktet, varig etter markering', () => {
    expect(getLastReportedInsuranceWeek()).toBeNull();
    markInsuranceReported('2026-02-02');
    expect(getLastReportedInsuranceWeek()).toBe('2026-02-02');
    markInsuranceReported('2026-05-04');
    expect(getLastReportedInsuranceWeek()).toBe('2026-05-04');
  });

  it('brudd-markør er uavhengig av insurance-markøren', () => {
    markBreakReported('2026-03-09');
    expect(getLastReportedBreakWeek()).toBe('2026-03-09');
    expect(getLastReportedInsuranceWeek()).toBeNull();
    markInsuranceReported('2026-02-02');
    expect(getLastReportedBreakWeek()).toBe('2026-03-09');
  });

  it('korrupt lagring → null for begge, ingen kræsj', () => {
    localStorage.setItem('mintrener_streak_reported_v1', '{{{');
    expect(getLastReportedInsuranceWeek()).toBeNull();
    expect(getLastReportedBreakWeek()).toBeNull();
    // og markering reparerer lagringen
    markBreakReported('2026-03-09');
    expect(getLastReportedBreakWeek()).toBe('2026-03-09');
  });
});

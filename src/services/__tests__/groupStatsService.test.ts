import { describe, it, expect, beforeEach } from 'vitest';
import {
  logGroupWorkout,
  getGroupLogs,
  getGroupStatsSummary,
} from '../groupStatsService';

describe('groupStatsService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('logger gruppeøkt og beregner ukesoppsummering', () => {
    logGroupWorkout('kontor', 'Kontorpause 3 min', 180, 5);
    logGroupWorkout('barn', 'Stuemoro 5 min', 300, 3);

    const logs = getGroupLogs();
    expect(logs.length).toBe(2);

    const summary = getGroupStatsSummary();
    expect(summary.totalWorkouts).toBe(2);
    expect(summary.totalSeconds).toBe(480);
    expect(summary.totalParticipantSessions).toBe(8);
    expect(summary.thisWeekSeconds).toBe(480);
  });
});

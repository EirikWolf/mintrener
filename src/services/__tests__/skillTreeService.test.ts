import { describe, it, expect, beforeEach } from 'vitest';
import {
  getUserSkillProgress,
  recordSkillLevelTest,
  resetSkillProgress,
} from '../skillTreeService';

describe('skillTreeService (Ferdighetstrær & Mestringsstige)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('gir standard nivå 1 som låst opp', () => {
    const prog = getUserSkillProgress('pushups');
    expect(prog.unlockedLevel).toBe(1);
    expect(prog.currentLevel).toBe(1);
    expect(prog.completedLevels).toEqual([]);
  });

  it('låser opp nivå 2 når brukeren mestrer kravet for nivå 1 (20 reps vegg-pushups)', () => {
    const result = recordSkillLevelTest('pushups', 1, 20);
    expect(result.mastered).toBe(true);
    expect(result.nextLevelUnlocked).toBe(true);
    expect(result.progress.unlockedLevel).toBe(2);
    expect(result.progress.completedLevels).toContain(1);
  });

  it('låser ikke opp hvis kravet ikke er nådd', () => {
    const result = recordSkillLevelTest('pushups', 1, 15); // Målet er 20
    expect(result.mastered).toBe(false);
    expect(result.nextLevelUnlocked).toBe(false);
    expect(result.progress.unlockedLevel).toBe(1);
  });

  it('nullstiller ferdighetsfremgang', () => {
    recordSkillLevelTest('pushups', 1, 20);
    resetSkillProgress('pushups');
    const prog = getUserSkillProgress('pushups');
    expect(prog.unlockedLevel).toBe(1);
    expect(prog.completedLevels).toEqual([]);
  });
});

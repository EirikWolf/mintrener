import { describe, it, expect, beforeEach } from 'vitest';
import {
  getActiveChallengeId,
  setActiveChallengeId,
  getChallengeProgress,
  completeChallengeDay,
  startChallengeAtDay,
  resetChallengeProgress,
} from '../challengeService';

describe('challengeService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('setter og henter aktiv utfordring', () => {
    expect(getActiveChallengeId()).toBeNull();
    setActiveChallengeId('planke-30-dager');
    expect(getActiveChallengeId()).toBe('planke-30-dager');
  });

  it('fullfører dager og oppdaterer currentDay uten straff for hull', () => {
    completeChallengeDay('planke-30-dager', 1);
    const prog1 = getChallengeProgress('planke-30-dager');
    expect(prog1.completedDays).toEqual([1]);
    expect(prog1.currentDay).toBe(2);

    // Fullfør dag 3 (hopper over dag 2)
    completeChallengeDay('planke-30-dager', 3);
    const prog2 = getChallengeProgress('planke-30-dager');
    expect(prog2.completedDays).toEqual([1, 3]);
  });

  it('merker utfordringen som fullført når alle dager er nådd', () => {
    for (let d = 1; d <= 30; d++) {
      completeChallengeDay('planke-30-dager', d);
    }
    const prog = getChallengeProgress('planke-30-dager');
    expect(prog.isCompleted).toBe(true);
    expect(prog.completedAt).toBeDefined();
  });

  it('lar erfarne utøvere starte på et høyere nivå / inngangsgulv', () => {
    // Start på dag 15
    const prog = startChallengeAtDay('planke-30-dager', 15);
    expect(prog.currentDay).toBe(15);
    expect(prog.completedDays.length).toBe(14); // Dag 1 til 14 er autoutfylt
    expect(prog.completedDays).toContain(1);
    expect(prog.completedDays).toContain(14);
    expect(prog.completedDays).not.toContain(15);
  });

  it('nullstiller utfordring', () => {
    completeChallengeDay('planke-30-dager', 1);
    resetChallengeProgress('planke-30-dager');
    const prog = getChallengeProgress('planke-30-dager');
    expect(prog.completedDays).toEqual([]);
  });
});

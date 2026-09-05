import { describe, it, expect, beforeEach } from 'vitest';
import {
  getActiveChallengeId,
  setActiveChallengeId,
  getChallengeProgress,
  completeChallengeDay,
  startChallengeAtDay,
  resetChallengeProgress,
  challengeProgressFraction,
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

  it('lar erfarne utøvere starte på et høyere nivå / inngangsgulv uten å forfalske historikk', () => {
    // Start på dag 10 i en 30-dagers utfordring
    const prog = startChallengeAtDay('planke-30-dager', 10);
    expect(prog.startDay).toBe(10);
    expect(prog.currentDay).toBe(10);
    expect(prog.completedDays).toEqual([]); // Skal IKKE autoutfylle tidligere dager

    const fraction = challengeProgressFraction(prog, 30);
    expect(fraction.completedCount).toBe(0);
    expect(fraction.totalCount).toBe(21); // 30 - 10 + 1 = 21 dager
    expect(fraction.percent).toBe(0);

    // Fullfør dag 10
    completeChallengeDay('planke-30-dager', 10);
    const updated = getChallengeProgress('planke-30-dager');
    const updatedFraction = challengeProgressFraction(updated, 30);
    expect(updatedFraction.completedCount).toBe(1);
    expect(updatedFraction.totalCount).toBe(21);
    expect(updatedFraction.percent).toBe(5); // 1 / 21 * 100 = 4.76 -> 5%
  });

  it('nullstiller utfordring', () => {
    completeChallengeDay('planke-30-dager', 1);
    resetChallengeProgress('planke-30-dager');
    const prog = getChallengeProgress('planke-30-dager');
    expect(prog.completedDays).toEqual([]);
  });
});

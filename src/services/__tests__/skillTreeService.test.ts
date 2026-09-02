import { describe, it, expect, beforeEach } from 'vitest';
import {
  getUserSkillProgress,
  recordSkillLevelTest,
  resetSkillProgress,
  registrerFullførtFerdighetsøkt,
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

describe('Fullført mestringsøkt registrerer progresjon', () => {
  /**
   * FEILEN: `SkillTreeModal` bygger en økt med id `skill-<tre>-lvl-<n>` og
   * sender den til timeren. Den id-en ble ALDRI lest av noen. Å gjøre økta
   * treet ga deg registrerte altså ingenting — eneste vei til progresjon var å
   * komme tilbake og skrive et tall i en boks.
   *
   * Det ser ut som manglende lagring (lagringen virket hele tiden), men er en
   * manglende kobling. Rapportert av Eirik 2026-09-02: «Ferdighetstrær ser
   * forresten ikke ut til å bli lagret.»
   */
  beforeEach(() => {
    localStorage.clear();
  });

  it('låser opp neste nivå når mestringsøkta fullføres', () => {
    // Plankestigen nivå 1 er kneplanke 45 s. Fullfører du økta, har du holdt
    // 45 s — kravet ER oppfylt, og da skal treet si det.
    const res = registrerFullførtFerdighetsøkt('skill-plank-lvl-1');
    expect(res?.mastered).toBe(true);
    expect(getUserSkillProgress('plank').unlockedLevel).toBe(2);
  });

  it('lar en økt som ikke kommer fra et ferdighetstre være i fred', () => {
    expect(registrerFullførtFerdighetsøkt('custom-1234567890')).toBeNull();
    expect(registrerFullførtFerdighetsøkt('plank-day-7')).toBeNull();
    expect(registrerFullførtFerdighetsøkt('')).toBeNull();
  });

  it('avviser en id som peker på et tre eller nivå som ikke finnes', () => {
    // Uten dette ville en omdøpt øvelse gitt stille ingenting i stedet for et
    // signal om at noe er galt.
    expect(registrerFullførtFerdighetsøkt('skill-finnesikke-lvl-1')).toBeNull();
    expect(registrerFullførtFerdighetsøkt('skill-plank-lvl-99')).toBeNull();
  });

  it('teller ikke samme nivå to ganger', () => {
    registrerFullførtFerdighetsøkt('skill-plank-lvl-1');
    registrerFullførtFerdighetsøkt('skill-plank-lvl-1');
    expect(getUserSkillProgress('plank').completedLevels).toEqual([1]);
  });

  it('lar deg gjenta et nivå du alt har mestret uten å hoppe videre', () => {
    // Fullfører du nivå 1 igjen etter å ha låst opp nivå 2, skal du ikke
    // plutselig stå på nivå 3.
    registrerFullførtFerdighetsøkt('skill-plank-lvl-1');
    registrerFullførtFerdighetsøkt('skill-plank-lvl-2');
    const før = getUserSkillProgress('plank').unlockedLevel;
    registrerFullførtFerdighetsøkt('skill-plank-lvl-1');
    expect(getUserSkillProgress('plank').unlockedLevel).toBe(før);
  });
});

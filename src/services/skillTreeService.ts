import { SkillCategory, UserSkillProgress } from '../schemas/skillTreeSchema';
import { SKILL_TREES } from '../data/skillTrees';

const SKILL_PROGRESS_STORAGE_KEY = 'mintrener_skill_tree_progress_v1';

export function getAllSkillProgress(): Record<SkillCategory, UserSkillProgress> {
  try {
    const raw = localStorage.getItem(SKILL_PROGRESS_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Feil ved lesing av skill progress:', e);
  }

  // Initial standard fremgang (Nivå 1 låst opp på alle)
  const initial: Record<SkillCategory, UserSkillProgress> = {
    pushups: { skillId: 'pushups', currentLevel: 1, unlockedLevel: 1, completedLevels: [] },
    squat: { skillId: 'squat', currentLevel: 1, unlockedLevel: 1, completedLevels: [] },
    plank: { skillId: 'plank', currentLevel: 1, unlockedLevel: 1, completedLevels: [] },
    pullups: { skillId: 'pullups', currentLevel: 1, unlockedLevel: 1, completedLevels: [] },
  };

  return initial;
}

export function getUserSkillProgress(skillId: SkillCategory): UserSkillProgress {
  const all = getAllSkillProgress();
  return (
    all[skillId] || {
      skillId,
      currentLevel: 1,
      unlockedLevel: 1,
      completedLevels: [],
    }
  );
}

export function saveUserSkillProgress(progress: UserSkillProgress): void {
  try {
    const all = getAllSkillProgress();
    all[progress.skillId] = progress;
    localStorage.setItem(SKILL_PROGRESS_STORAGE_KEY, JSON.stringify(all));
    window.dispatchEvent(
      new CustomEvent('skill-progress-changed', { detail: { skillId: progress.skillId } })
    );
  } catch (e) {
    console.error('Feil ved lagring av skill progress:', e);
  }
}

/**
 * Registrerer resultat fra en nivåtest
 */
export function recordSkillLevelTest(
  skillId: SkillCategory,
  levelNum: number,
  achievedScore: number
): { mastered: boolean; nextLevelUnlocked: boolean; progress: UserSkillProgress } {
  const tree = SKILL_TREES.find((t) => t.id === skillId);
  const levelData = tree?.levels.find((l) => l.level === levelNum);
  const prog = getUserSkillProgress(skillId);

  if (!levelData) {
    return { mastered: false, nextLevelUnlocked: false, progress: prog };
  }

  const target = levelData.masteryRequirement.target;
  const mastered = achievedScore >= target;
  let nextLevelUnlocked = false;

  if (mastered) {
    if (!prog.completedLevels.includes(levelNum)) {
      prog.completedLevels.push(levelNum);
      prog.completedLevels.sort((a, b) => a - b);
    }

    if (levelNum >= prog.unlockedLevel && levelNum < tree!.levels.length) {
      prog.unlockedLevel = levelNum + 1;
      prog.currentLevel = levelNum + 1;
      nextLevelUnlocked = true;
    }
  }

  prog.lastTestedAt = new Date().toISOString();
  saveUserSkillProgress(prog);

  return { mastered, nextLevelUnlocked, progress: prog };
}

export function resetSkillProgress(skillId: SkillCategory): void {
  const prog: UserSkillProgress = {
    skillId,
    currentLevel: 1,
    unlockedLevel: 1,
    completedLevels: [],
  };
  saveUserSkillProgress(prog);
}

/**
 * Id-en `SkillTreeModal` gir mestringsøkta. Formatet er kontrakten mellom
 * treet og timeren, og den var tidligere ikke lest av noen.
 */
const FERDIGHETSØKT = /^skill-([a-z]+)-lvl-(\d+)$/;

/**
 * Registrerer at en mestringsøkt fra et ferdighetstre er fullført.
 *
 * DETTE MANGLET. `SkillTreeModal` bygde en økt med id `skill-<tre>-lvl-<n>` og
 * sendte den til timeren, men ingen leste id-en tilbake. Å gjøre økta treet ga
 * deg registrerte altså ingenting — eneste vei til progresjon var å komme
 * tilbake og skrive et tall i en boks. Det ser ut som manglende lagring, men
 * lagringen virket hele tiden; det var koblingen som manglet.
 *
 * At økta er FULLFØRT er beviset: økta bygges med nivåets mestringskrav som
 * mål, så kommer du til enden har du gjort det som kreves. Avbryter du,
 * havner timeren aldri i `completed`.
 *
 * Returnerer `null` for økter som ikke kommer fra et tre, og for id-er som
 * peker på et tre eller nivå som ikke finnes — en omdøpt øvelse skal gi et
 * signal, ikke stille ingenting.
 */
export function registrerFullførtFerdighetsøkt(
  workoutId: string
): ReturnType<typeof recordSkillLevelTest> | null {
  const treff = FERDIGHETSØKT.exec(workoutId ?? '');
  if (!treff) return null;

  const skillId = treff[1] as SkillCategory;
  const nivå = Number(treff[2]);

  const tre = SKILL_TREES.find((t) => t.id === skillId);
  const nivåData = tre?.levels.find((l) => l.level === nivå);
  if (!tre || !nivåData) return null;

  return recordSkillLevelTest(skillId, nivå, nivåData.masteryRequirement.target);
}

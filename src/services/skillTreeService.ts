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

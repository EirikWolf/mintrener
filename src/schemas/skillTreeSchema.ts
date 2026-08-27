import { z } from 'zod';

export const SkillCategorySchema = z.enum([
  'pushups',
  'squat',
  'plank',
  'pullups',
]);

export type SkillCategory = z.infer<typeof SkillCategorySchema>;

export interface SkillLevel {
  level: number;
  title: string;
  exerciseId: string;
  description: string;
  masteryRequirement: {
    type: 'reps' | 'seconds';
    target: number;
  };
  tips: string[];
  prerequisites?: string;
}

export interface SkillTree {
  id: SkillCategory;
  title: string;
  icon: string;
  description: string;
  levels: SkillLevel[];
}

export interface UserSkillProgress {
  skillId: SkillCategory;
  currentLevel: number; // 1-indexed
  unlockedLevel: number;
  completedLevels: number[];
  lastTestedAt?: string;
}

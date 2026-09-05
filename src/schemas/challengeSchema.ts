import { z } from 'zod';
import { WorkoutTemplate } from '../types/workout';

export const ChallengeCategorySchema = z.enum([
  'kroppsvekt',
  'kontor',
  'styrke',
  'mobilitet',
  'kondisjon',
  'barn',
]);

export type ChallengeCategory = z.infer<typeof ChallengeCategorySchema>;

export interface ChallengeDay {
  day: number;
  isRestDay: boolean;
  title: string;
  workout?: WorkoutTemplate;
  goalNote?: string;
}

export interface ChallengePhase {
  name: string;
  dayRange: [number, number]; // [startDay, endDay]
  description: string;
}

export interface ChallengeItem {
  id: string;
  title: string;
  category: ChallengeCategory;
  durationDays: 28 | 30;
  description: string;
  phases: ChallengePhase[];
  restDays: number[];
  dailyWorkouts: ChallengeDay[];
  badgeReward: {
    id: string;
    name: string;
    icon: string;
  };
}

export const ChallengeUserProgressSchema = z.object({
  challengeId: z.string(),
  startedAt: z.string(),
  completedDays: z.array(z.number()), // e.g. [1, 2, 3]
  currentDay: z.number(),
  startDay: z.number().default(1),
  isCompleted: z.boolean(),
  completedAt: z.string().optional(),
});

export interface ChallengeUserProgress {
  challengeId: string;
  startedAt: string;
  completedDays: number[]; // e.g. [1, 2, 3]
  currentDay: number;
  startDay: number;
  isCompleted: boolean;
  completedAt?: string;
}

import { z } from 'zod';

export const StrengthSetLogSchema = z.object({
  setIndex: z.number().min(1),
  targetReps: z.number().min(1),
  targetWeightKg: z.number().min(0).default(0),
  loggedReps: z.number().min(0).optional(),
  loggedWeightKg: z.number().min(0).optional(),
  rpe: z.number().min(1).max(10).optional(),
  isCompleted: z.boolean().default(false),
});

export type StrengthSetLog = z.infer<typeof StrengthSetLogSchema>;

export const StrengthExerciseSessionSchema = z.object({
  exerciseId: z.string(),
  exerciseName: z.string(),
  isUpperBody: z.boolean().default(true),
  targetRepRange: z.tuple([z.number(), z.number()]).default([8, 12]),
  restDurationSeconds: z.number().default(90),
  sets: z.array(StrengthSetLogSchema),
  basis: z
    .array(
      z.object({
        ref: z.string(),
        note: z.string(),
      })
    )
    .optional(),
});

export type StrengthExerciseSession = z.infer<typeof StrengthExerciseSessionSchema>;

export const StrengthWorkoutPlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  week: z.number(),
  dayIndex: z.number(),
  exercises: z.array(StrengthExerciseSessionSchema),
});

export type StrengthWorkoutPlan = z.infer<typeof StrengthWorkoutPlanSchema>;

export const StrengthProgramTemplateSchema = z.object({
  id: z.string(),
  title: z.string(),
  durationWeeks: z.number().default(12),
  daysPerWeek: z.enum(['2', '3', '4']).or(z.number()),
  description: z.string(),
  phases: z.array(
    z.object({
      phaseName: z.string(),
      weekRange: z.tuple([z.number(), z.number()]),
      repRange: z.tuple([z.number(), z.number()]),
      description: z.string(),
    })
  ),
  basis: z
    .array(
      z.object({
        ref: z.string(),
        note: z.string(),
      })
    )
    .optional(),
});

export type StrengthProgramTemplate = z.infer<typeof StrengthProgramTemplateSchema>;

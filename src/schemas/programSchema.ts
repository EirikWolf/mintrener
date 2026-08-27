import { z } from 'zod';

export const ProgramCategorySchema = z.enum([
  'kontor',
  'barn',
  'intervall',
  'styrke',
  'mobilitet',
]);

export const ProgramSchema = z.object({
  id: z.string().min(2),
  name: z.string().min(2),
  category: ProgramCategorySchema,
  durationMinutes: z.number().min(1).max(60),
  intensity: z.enum(['lav', 'middels', 'høy']),
  description: z.string(),
  context: z.array(z.string()).default([]),
  voiceTone: z.enum(['rolig', 'lek', 'gira', 'tørr']).default('rolig'),
  leadFriendly: z.boolean().default(false),
  equipment: z.array(z.string()).default(['ingen']),
  targetProfileId: z.enum(['kontor', 'barn', 'kor', 'senior', 'idrettslag', 'møte']).optional(),
  workout: z.any(), // WorkoutTemplate
});

export type TrainingProgram = z.infer<typeof ProgramSchema>;

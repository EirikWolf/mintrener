import { z } from 'zod';

export const ExerciseCategorySchema = z.enum([
  'kroppsvekt',
  'kettlebell',
  'frivekt',
  'mobilitet',
  'kondisjon',
  'annet',
]);

export const ExerciseEquipmentSchema = z.enum([
  'ingen',
  'kettlebell',
  'manualer',
  'stang',
  'strikk',
  'stol/benk',
  'matte',
  'annet',
]);

export const ExerciseLevelSchema = z.enum([
  'nybegynner',
  'middels',
  'avansert',
]);

export const ExerciseTypeSchema = z.enum([
  'reps',
  'tid',
]);

export const SensorProfileSchema = z.enum([
  'swing',
  'hopp',
  'knebøy',
  'kadens',
  'ingen',
]);

export const ImageAngleSchema = z.enum([
  'side',
  'front',
  'skrå',
]);

export const ImageStatusSchema = z.enum([
  'mangler',
  'generert',
  'godkjent',
  'regenerer',
]);

export const ExerciseSchema = z.object({
  id: z.string().min(2).regex(/^[a-z0-9-]+$/, 'ID må være en gyldig slug (kun små bokstaver, tall og bindestrek)'),
  navn: z.object({
    nb: z.string().min(2, 'Norsk navn er påkrevd'),
    en: z.string().min(2).optional(),
  }),
  type: ExerciseTypeSchema,
  kategori: ExerciseCategorySchema,
  muskler: z.object({
    primær: z.array(z.string()).min(1, 'Minst én primærmuskelgruppe må angis'),
    sekundær: z.array(z.string()).default([]),
  }),
  utstyr: z.array(ExerciseEquipmentSchema).min(1, 'Minst én utstyrstype må angis (eller "ingen")'),
  nivå: ExerciseLevelSchema,
  instruks: z.object({
    nb: z.array(z.string()).min(2, 'Minst 2 instruksjonspunkter på norsk'),
    en: z.array(z.string()).optional(),
  }),
  vanligeFeil: z.object({
    nb: z.array(z.string()).default([]),
    en: z.array(z.string()).optional(),
  }).default({ nb: [] }),
  sensorProfil: SensorProfileSchema.default('ingen'),
  bildePrompt: z.record(z.string(), z.string()).optional(),
  bildeVinkel: ImageAngleSchema.default('side'),
  bildeStatus: ImageStatusSchema.default('mangler'),
  bildeUrl: z.string().optional(),
  videoUrl: z.string().optional(),
  alternatives: z.object({
    seated: z.string().optional(),
    easier: z.string().optional(),
    harder: z.string().optional(),
    quiet: z.string().optional(),
    noFloor: z.string().optional(),
  }).optional(),
  basis: z.array(
    z.object({
      ref: z.string(),
      note: z.string(),
    })
  ).optional(),
  reviewStatus: z.enum(['draft', 'reviewed', 'public']).optional(),
});

export type ExerciseItem = z.infer<typeof ExerciseSchema>;
export type ExerciseInput = z.input<typeof ExerciseSchema>;

export const ExerciseContributionSchema = z.object({
  id: z.string(),
  exerciseId: z.string(),
  phase: z.union([z.literal(0), z.literal(1)]),
  imageDataUrl: z.string(),
  notes: z.string().optional(),
  submittedByUid: z.string().optional(),
  submittedByName: z.string().default('Anonym bidragsyter'),
  status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
  submittedAt: z.string(),
});

export type ExerciseContribution = z.infer<typeof ExerciseContributionSchema>;

/**
 * Validerer én enkelt øvelse mot JSON Schema
 */
export function validateExercise(data: unknown): { success: true; data: ExerciseItem } | { success: false; errors: z.ZodError } {
  const result = ExerciseSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validerer en liste med øvelser
 */
export function validateExerciseList(dataList: unknown[]): { valid: ExerciseItem[]; invalid: { item: unknown; errors: z.ZodError }[] } {
  const valid: ExerciseItem[] = [];
  const invalid: { item: unknown; errors: z.ZodError }[] = [];

  for (const item of dataList) {
    const res = validateExercise(item);
    if (res.success) {
      valid.push(res.data);
    } else {
      invalid.push({ item, errors: res.errors });
    }
  }

  return { valid, invalid };
}

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
});

export type ExerciseItem = z.infer<typeof ExerciseSchema>;

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

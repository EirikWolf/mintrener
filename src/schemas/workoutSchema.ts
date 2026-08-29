import { z } from 'zod';
import type { WorkoutTemplate } from '../types/workout';
import type { CompletedWorkoutLog } from '../types/models';

/**
 * Zod-skjemaer for økt-data ved systemgrensene (revisjon § 2.4):
 * URL-import av delte økter og lasting fra localStorage. Grensene validerer;
 * innenfor grensene stoler vi på TypeScript-typene.
 *
 * Tallgrensene er bevisst romslige for legitim bruk, men strenge nok til å
 * avvise fiendtlige payloads (f.eks. milliarder av runder som ville frosset
 * timer-motoren).
 */

const durationSecondsSchema = z.number().int().min(0).max(36_000); // maks 10 timer per fase

export const WorkoutExerciseSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  nameEn: z.string().max(200).optional(),
  category: z.enum(['bodyweight', 'kettlebell', 'dumbbell', 'cardio', 'mobility']).optional(),
  description: z.string().max(2000).optional(),
});

export const IntervalItemSchema = z.object({
  id: z.string().min(1).max(100),
  exercise: WorkoutExerciseSchema,
  workDurationSeconds: durationSecondsSchema,
  restDurationSeconds: durationSecondsSchema,
});

export const WorkoutTemplateSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  description: z.string().max(2000),
  type: z.enum(['tabata', 'emom', 'amrap', 'custom']),
  prepareDurationSeconds: durationSecondsSchema,
  rounds: z.number().int().min(1).max(500),
  roundRestDurationSeconds: durationSecondsSchema,
  items: z.array(IntervalItemSchema).max(100),
  voiceTone: z.enum(['rolig', 'lek', 'gira', 'tørr']).optional(),
});

export const IntervalPhaseSchema = z.enum([
  'prepare',
  'work',
  'rest',
  'round_rest',
  'complete',
]);

/** Avbrutt økt slik sessionRecoveryService lagrer den (mater timer-state direkte). */
export const InterruptedSessionSchema = z.object({
  workout: WorkoutTemplateSchema,
  phase: IntervalPhaseSchema,
  currentRound: z.number().int().min(0),
  currentItemIndex: z.number().int().min(0),
  totalElapsedSeconds: z.number().min(0),
  savedAt: z.number(),
});

/** Fullført økt i lokal historikk. durationSeconds kan være brøkdel (timerens klokke). */
export const CompletedWorkoutLogSchema = z.object({
  id: z.string().min(1),
  userId: z.string(),
  workoutId: z.string(),
  workoutName: z.string(),
  workoutType: z.string(),
  durationSeconds: z.number().min(0),
  roundsCompleted: z.number().min(0),
  totalRounds: z.number().min(0),
  completedAt: z.string(),
  difficultyRating: z.enum(['for_lett', 'passe', 'for_tungt']).optional(),
});

// Kompileringstids-vakt: skjemaenes utdata må være tildelbare til domenetypene,
// slik at skjema og type ikke driver fra hverandre uten at tsc protesterer.
// (Funksjonsdeklarasjoner unngår «declared but never used» for rene typealias.)
export function assertWorkoutSchemaMatchesType(
  parsed: z.infer<typeof WorkoutTemplateSchema>
): WorkoutTemplate {
  return parsed;
}
export function assertLogSchemaMatchesType(
  parsed: z.infer<typeof CompletedWorkoutLogSchema>
): CompletedWorkoutLog {
  return parsed;
}

/**
 * Validerer en ukjent verdi som liste og beholder kun elementene som består
 * skjemaet. Returnerer null hvis verdien ikke er en liste i det hele tatt.
 */
export function filterValidListItems<Schema extends z.ZodType>(
  schema: Schema,
  data: unknown
): { valid: z.output<Schema>[]; dropped: number } | null {
  if (!Array.isArray(data)) return null;
  const valid: z.output<Schema>[] = [];
  let dropped = 0;
  for (const item of data) {
    const result = schema.safeParse(item);
    if (result.success) {
      valid.push(result.data);
    } else {
      dropped++;
    }
  }
  return { valid, dropped };
}

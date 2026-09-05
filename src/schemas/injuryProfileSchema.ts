import { z } from 'zod';

/**
 * Zod-skjema for brukerens skade- og smerteprofil.
 *
 * GDPR: personalDataCategory: 'health' (særlige kategorier av personopplysninger, art. 9).
 * Skal alltid tas med i full dataeksport (art. 20) og tømmes ved sletting (art. 17).
 */
export const PainPointIdSchema = z.enum(['korsrygg', 'skulder', 'kne', 'handledd', 'nakke']);
export type PainPointId = z.infer<typeof PainPointIdSchema>;

export const InjuryProfileSchema = z.object({
  painPoints: z.array(PainPointIdSchema).default([]),
  updatedAt: z.string().optional(),
});

export type InjuryProfile = z.infer<typeof InjuryProfileSchema>;

import { z } from 'zod';

export const ContextProfileIdSchema = z.enum([
  'kontor',
  'barn',
  'kor',
  'senior',
  'idrettslag',
  'møte',
]);

export type ContextProfileId = z.infer<typeof ContextProfileIdSchema>;

export const VoiceToneSchema = z.enum(['rolig', 'lek', 'gira', 'tørr']);
export type VoiceTone = z.infer<typeof VoiceToneSchema>;

export const SoundProfileSchema = z.enum(['normal', 'discreet', 'loud']);
export type SoundProfile = z.infer<typeof SoundProfileSchema>;

export const AppModeSchema = z.enum(['alone', 'together', 'lead']);
export type AppMode = z.infer<typeof AppModeSchema>;

export const ContextProfileSchema = z.object({
  id: ContextProfileIdSchema,
  name: z.object({
    nb: z.string(),
    en: z.string().optional(),
  }),
  description: z.object({
    nb: z.string(),
    en: z.string().optional(),
  }).optional(),
  contextFilter: z.array(z.string()),
  defaultTone: VoiceToneSchema.default('rolig'),
  speechRate: z.number().min(0.5).max(2.0).default(1.0),
  defaultSoundProfile: SoundProfileSchema.default('normal'),
  textScale: z.number().min(0.8).max(2.5).default(1.0),
  reduceMotion: z.boolean().default(false),
  hide: z.array(z.string()).default([]),
  promote: z.array(z.string()).default([]),
  preferredMode: AppModeSchema.default('alone'),
  quickRow: z.array(z.string()).default([]),
  status: z.enum(['active', 'planned']).default('planned'),
  resolve: z.array(z.string()).default([]), // e.g. ['noFloor', 'quiet'] or ['seated']
  require: z.array(z.string()).default([]),
  forbid: z.array(z.string()).default([]),
});

export type ContextProfile = z.infer<typeof ContextProfileSchema>;

export const UserProfilesStateSchema = z.object({
  profiles: z.array(ContextProfileIdSchema).min(1).default(['kontor']),
  primaryProfile: ContextProfileIdSchema.default('kontor'),
  hasCompletedOnboarding: z.boolean().default(false),
  lastActiveProfile: ContextProfileIdSchema.optional(),
});

export type UserProfilesState = z.infer<typeof UserProfilesStateSchema>;

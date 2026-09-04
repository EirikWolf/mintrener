import { z } from 'zod';

export const OrganizationTeamSchema = z.object({
  id: z.string(),
  name: z.string(),
  location: z.string().optional(),
});

export type OrganizationTeam = z.infer<typeof OrganizationTeamSchema>;

export const OrganizationContactPersonSchema = z.object({
  name: z.string(),
  email: z.string().optional(),
  phone: z.string().optional(),
  role: z.string().optional(), // f.eks. "HMS-ansvarlig", "Daglig leder"
});
export type OrganizationContactPerson = z.infer<typeof OrganizationContactPersonSchema>;

export const OrganizationBillingSchema = z.object({
  invoiceEmail: z.string().optional(),
  address: z.string().optional(),
  accountNumber: z.string().optional(),
  kidOrReference: z.string().optional(),
});
export type OrganizationBilling = z.infer<typeof OrganizationBillingSchema>;

export const OrganizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  department: z.string().optional(),
  orgNumber: z.string().optional(), // 9 siffer
  logoUrl: z.string().optional(),
  joinCode: z.string(),
  activeChallengeId: z.string().optional(),
  teams: z.array(OrganizationTeamSchema).default([]),
  isActive: z.boolean().optional().default(true),
  validUntil: z.string().optional(), // ISO date string f.eks. "2026-12-31"
  createdAt: z.string().optional(),
  agreementType: z.enum(['pilot', 'standard', 'senior_kommune', 'idrettslag', 'tilpasset']).optional(),
  maxSeats: z.number().optional(), // f.eks. inntil 50 ansatte
  contactPerson: OrganizationContactPersonSchema.optional(),
  billing: OrganizationBillingSchema.optional(),
  notes: z.string().optional(), // Interne notater for admin
  settings: z.object({
    dailyBreakTime: z.string().optional(), // f.eks. "11:30"
    allowLeaderboards: z.boolean().default(true), // Konkurranse og samarbeid på tvers av lag/avdelinger
  }),
});

export type Organization = z.infer<typeof OrganizationSchema>;

export const CompetitionPrivacyModeSchema = z.enum(['navn', 'anonym', 'skjult']);
export type CompetitionPrivacyMode = z.infer<typeof CompetitionPrivacyModeSchema>;

export const MemberCompetitionProfileSchema = z.object({
  userId: z.string(),
  orgId: z.string(),
  teamId: z.string(),
  privacyMode: CompetitionPrivacyModeSchema.default('anonym'),
  alias: z.string().default('Kontorhelten'),
  avatarIcon: z.string().default('⚡'),
  points: z.number().default(0),
  minutes: z.number().default(0),
  sessions: z.number().default(0),
  updatedAt: z.string(),
});

export type MemberCompetitionProfile = z.infer<typeof MemberCompetitionProfileSchema>;

export const TeamScoreSchema = z.object({
  teamId: z.string(),
  teamName: z.string(),
  location: z.string().optional(),
  totalPoints: z.number(),
  totalMinutes: z.number(),
  totalSessions: z.number(),
  activeMembersCount: z.number(),
});

export type TeamScore = z.infer<typeof TeamScoreSchema>;

export const IndividualScoreSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  teamName: z.string(),
  avatarIcon: z.string(),
  isAnonymous: z.boolean(),
  points: z.number(),
  minutes: z.number(),
  sessions: z.number(),
});

export type IndividualScore = z.infer<typeof IndividualScoreSchema>;

export const OrganizationStatsSchema = z.object({
  orgId: z.string(),
  activeMembersCount: z.number(),
  totalMinutesThisWeek: z.number(),
  totalSessionsThisWeek: z.number(),
  commonChallengeProgressPercent: z.number().optional(),
});

export type OrganizationStats = z.infer<typeof OrganizationStatsSchema>;

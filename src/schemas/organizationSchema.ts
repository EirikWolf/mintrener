import { z } from 'zod';

export const OrganizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  department: z.string().optional(),
  logoUrl: z.string().optional(),
  joinCode: z.string(),
  activeChallengeId: z.string().optional(),
  settings: z.object({
    dailyBreakTime: z.string().optional(), // f.eks. "11:30"
    allowLeaderboards: z.boolean().default(false), // Alltid falsk for personvern
  }),
});

export type Organization = z.infer<typeof OrganizationSchema>;

export const OrganizationStatsSchema = z.object({
  orgId: z.string(),
  activeMembersCount: z.number(),
  totalMinutesThisWeek: z.number(),
  totalSessionsThisWeek: z.number(),
  commonChallengeProgressPercent: z.number().optional(),
});

export type OrganizationStats = z.infer<typeof OrganizationStatsSchema>;

import { Organization, OrganizationStats } from '../schemas/organizationSchema';
import { STORAGE_KEYS } from '../constants/storageKeys';

// Forhåndsdefinerte bedrifter og organisasjonskoder for pilotering
export const PRESET_ORGANIZATIONS: Organization[] = [
  {
    id: 'org-lillesterk',
    name: 'LilleSterk Eldresenter & Kommune',
    department: 'Senioraktivitet',
    joinCode: 'LILLESTERK',
    activeChallengeId: 'balanse-og-styrke-senior-28',
    settings: {
      dailyBreakTime: '11:00',
      allowLeaderboards: false,
    },
  },
  {
    id: 'org-koret-var',
    name: 'Koret Vår & Vokalensemble',
    department: 'Sang & Pust',
    joinCode: 'KOR2026',
    activeChallengeId: 'diafragma-pust-og-holdning-14',
    settings: {
      dailyBreakTime: '18:30',
      allowLeaderboards: false,
    },
  },
  {
    id: 'org-hms-pilot',
    name: 'Bedrift AS (HMS-Pilot)',
    department: 'IT & Administrasjon',
    joinCode: 'HMS2026',
    activeChallengeId: 'kontorvanen-28-dager',
    settings: {
      dailyBreakTime: '14:00',
      allowLeaderboards: false,
    },
  },
];

/**
 * Henter brukerens tilknyttede organisasjon fra lokal lagring.
 */
export function getUserOrganization(): Organization | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ORGANIZATION);
    if (!raw) return null;
    return JSON.parse(raw) as Organization;
  } catch {
    return null;
  }
}

/**
 * Kobler brukeren til en organisasjon via 6-8 tegns kode.
 */
export function joinOrganizationByCode(code: string): { success: boolean; organization?: Organization; message: string } {
  const normalized = code.trim().toUpperCase();
  const found = PRESET_ORGANIZATIONS.find((o) => o.joinCode.toUpperCase() === normalized);

  if (found) {
    localStorage.setItem(STORAGE_KEYS.ORGANIZATION, JSON.stringify(found));
    window.dispatchEvent(new Event('organization-changed'));
    return {
      success: true,
      organization: found,
      message: `Velkommen til ${found.name}!`,
    };
  }

  // Hvis det er en egendefinert kode
  if (normalized.length >= 4) {
    const customOrg: Organization = {
      id: `org-${normalized.toLowerCase()}`,
      name: `Avdeling ${normalized}`,
      joinCode: normalized,
      settings: {
        allowLeaderboards: false,
      },
    };
    localStorage.setItem(STORAGE_KEYS.ORGANIZATION, JSON.stringify(customOrg));
    window.dispatchEvent(new Event('organization-changed'));
    return {
      success: true,
      organization: customOrg,
      message: `Koblet til ${customOrg.name}.`,
    };
  }

  return {
    success: false,
    message: 'Ugyldig organisasjonskode. Tast inn koden du fikk oppgitt av din leder eller instruktør.',
  };
}

/**
 * Kobler brukeren fra organisasjonen.
 */
export function leaveOrganization(): void {
  localStorage.removeItem(STORAGE_KEYS.ORGANIZATION);
  window.dispatchEvent(new Event('organization-changed'));
}

/**
 * Henter anonymiserte aggregater for organisasjonen (uten enkeltperson-overvåkning).
 */
export function getOrganizationStats(orgId: string): OrganizationStats {
  // Simulerer aggregert statistikk over terskel 3
  return {
    orgId,
    activeMembersCount: 8,
    totalMinutesThisWeek: 142,
    totalSessionsThisWeek: 26,
    commonChallengeProgressPercent: 68,
  };
}

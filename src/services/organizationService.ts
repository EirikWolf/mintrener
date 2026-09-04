import {
  Organization,
  MemberCompetitionProfile,
  MemberCompetitionProfileSchema,
  TeamScore,
  IndividualScore,
} from '../schemas/organizationSchema';
import { doc, setDoc, deleteDoc, getDocs, collection } from 'firebase/firestore';
import { db } from './firebase';
import { STORAGE_KEYS } from '../constants/storageKeys';

/**
 * Hjelpefunksjon for å vaske bort undefined verdier før lagring i Firestore
 */
function sanitizeForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  return JSON.parse(JSON.stringify(obj));
}

// Forhåndsdefinerte bedrifter og organisasjonskoder for pilotering
export const PRESET_ORGANIZATIONS: Organization[] = [
  {
    id: 'org-hms-pilot',
    name: 'Bedrift AS (HMS-Pilot)',
    department: 'Hovedkontor & Regioner',
    joinCode: 'HMS2026',
    activeChallengeId: 'kontorvanen-28-dager',
    teams: [
      { id: 'team-oslo-it', name: 'Oslo – IT & Utvikling', location: 'Oslo' },
      { id: 'team-oslo-salg', name: 'Oslo – Salg & Marked', location: 'Oslo' },
      { id: 'team-bergen', name: 'Bergen – Kundesenter', location: 'Bergen' },
      { id: 'team-trondheim', name: 'Trondheim – Drift & Lager', location: 'Trondheim' },
    ],
    isActive: true,
    settings: {
      dailyBreakTime: '14:00',
      allowLeaderboards: true,
    },
  },
  {
    id: 'org-lillesterk',
    name: 'LilleSterk Eldresenter & Kommune',
    department: 'Senioraktivitet',
    joinCode: 'LILLESTERK',
    activeChallengeId: 'morgenmobilitet-28-dager',
    teams: [
      { id: 'team-senior-avd1', name: 'Avdeling Fiolen', location: 'Bygg A' },
      { id: 'team-senior-avd2', name: 'Avdeling Solgløtt', location: 'Bygg B' },
    ],
    isActive: true,
    settings: {
      dailyBreakTime: '11:00',
      allowLeaderboards: true,
    },
  },
  {
    id: 'org-koret-var',
    name: 'Koret Vår & Vokalensemble',
    department: 'Sang & Pust',
    joinCode: 'KOR2026',
    activeChallengeId: undefined,
    teams: [
      { id: 'team-sopran', name: 'Sopran & Alt', location: 'Stemmegruppe 1' },
      { id: 'team-tenor', name: 'Tenor & Bass', location: 'Stemmegruppe 2' },
    ],
    isActive: true,
    settings: {
      dailyBreakTime: '18:30',
      allowLeaderboards: true,
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
/**
 * Genererer en sikker, ikke-gjettbar bedriftsavtalekode.
 * F.eks. "EQN-7X9K" eller "BEDRIFT-3M8P"
 */
export function generateSecureJoinCode(prefix: string = 'MT'): string {
  const cleanPrefix = prefix.replace(/[^a-zA-Z0-9]/g, '').slice(0, 5).toUpperCase() || 'MT';
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Uten forvekslingsbare 0, 1, I, O
  let randomPart = '';
  for (let i = 0; i < 5; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${cleanPrefix}-${randomPart}`;
}

/**
 * Henter alle administrative organisasjoner lagret lokalt.
 */
export function getAdminCreatedOrganizations(): Organization[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ADMIN_ORGANIZATIONS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Henter samlet liste over alle tilgjengelige organisasjoner (presets + admin-opprettede).
 */
export function getAllAvailableOrganizations(): Organization[] {
  const adminOrgs = getAdminCreatedOrganizations();
  const adminOrgIds = new Set(adminOrgs.map((o) => o.id));
  const remainingPresets = PRESET_ORGANIZATIONS.filter((p) => !adminOrgIds.has(p.id));
  return [...adminOrgs, ...remainingPresets];
}

/**
 * Oppretter en ny bedriftsavtale fra adminpanelet.
 */
export function createAdminOrganization(params: {
  name: string;
  department?: string;
  orgNumber?: string;
  joinCode?: string;
  teams: { name: string; location?: string }[];
  validUntil?: string; // F.eks. "2026-10-01"
  dailyBreakTime?: string;
  agreementType?: 'pilot' | 'standard' | 'senior_kommune' | 'idrettslag' | 'tilpasset';
  maxSeats?: number;
  contactPerson?: {
    name: string;
    email?: string;
    phone?: string;
    role?: string;
  };
  billing?: {
    invoiceEmail?: string;
    address?: string;
    accountNumber?: string;
    kidOrReference?: string;
  };
  notes?: string;
}): Organization {
  const customCode = (params.joinCode && params.joinCode.trim().length >= 4)
    ? params.joinCode.trim().toUpperCase()
    : generateSecureJoinCode(params.name.slice(0, 3));

  const teamsWithIds = params.teams.length > 0
    ? params.teams.map((t, idx) => ({
        id: `team-${Date.now()}-${idx}`,
        name: t.name,
        location: t.location,
      }))
    : [{ id: `team-default-1`, name: 'Hovedkontor / Fellesteam', location: 'Lokasjon 1' }];

  const newOrg: Organization = {
    id: `org-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: params.name.trim(),
    department: params.department?.trim() || undefined,
    orgNumber: params.orgNumber?.trim() || undefined,
    joinCode: customCode,
    isActive: true,
    validUntil: params.validUntil || undefined,
    createdAt: new Date().toISOString(),
    agreementType: params.agreementType || 'standard',
    maxSeats: params.maxSeats || undefined,
    contactPerson: params.contactPerson?.name ? params.contactPerson : undefined,
    billing: (params.billing?.invoiceEmail || params.billing?.address || params.billing?.accountNumber) ? params.billing : undefined,
    notes: params.notes?.trim() || undefined,
    teams: teamsWithIds,
    settings: {
      dailyBreakTime: params.dailyBreakTime || '14:00',
      allowLeaderboards: true,
    },
  };

  const current = getAdminCreatedOrganizations();
  const updated = [newOrg, ...current.filter((o) => o.joinCode !== customCode)];
  localStorage.setItem(STORAGE_KEYS.ADMIN_ORGANIZATIONS, JSON.stringify(updated));
  window.dispatchEvent(new Event('admin-organizations-changed'));

  // Synkroniser mot Firestore i bakgrunnen hvis tilkoblet
  if (typeof window !== 'undefined' && db) {
    setDoc(doc(db, 'organizations', newOrg.id), sanitizeForFirestore(newOrg)).catch((err) => {
      console.warn('Kunne ikke synkronisere organisasjon til Firestore:', err);
    });
  }

  return newOrg;
}

/**
 * Oppdaterer en eksisterende administrativ organisasjonsavtale.
 */
export function updateAdminOrganization(
  orgId: string,
  updates: Partial<Omit<Organization, 'id' | 'createdAt'>>
): Organization | null {
  const current = getAdminCreatedOrganizations();
  const index = current.findIndex((o) => o.id === orgId);
  
  if (index >= 0) {
    const existing = current[index];
    const updatedOrg: Organization = {
      ...existing,
      ...updates,
      settings: {
        ...existing.settings,
        ...(updates.settings || {}),
      },
    };
    current[index] = updatedOrg;
    localStorage.setItem(STORAGE_KEYS.ADMIN_ORGANIZATIONS, JSON.stringify(current));
    window.dispatchEvent(new Event('admin-organizations-changed'));

    // Synkroniser mot Firestore
    if (typeof window !== 'undefined' && db) {
      setDoc(doc(db, 'organizations', orgId), sanitizeForFirestore(updatedOrg), { merge: true }).catch((err) => {
        console.warn('Kunne ikke oppdatere organisasjon i Firestore:', err);
      });
    }

    // Hvis dette er organisasjonen den aktive brukeren er tilknyttet, oppdater også aktiv cache
    const active = getUserOrganization();
    if (active && active.id === orgId) {
      localStorage.setItem(STORAGE_KEYS.ORGANIZATION, JSON.stringify(updatedOrg));
      window.dispatchEvent(new Event('organization-changed'));
    }

    return updatedOrg;
  }

  // Hvis det er en forhåndsdefinert organisasjon som oppdateres, opprettes en overstyring i admin-listen
  const preset = PRESET_ORGANIZATIONS.find((p) => p.id === orgId);
  if (preset) {
    const overriddenOrg: Organization = {
      ...preset,
      ...updates,
      settings: {
        ...preset.settings,
        ...(updates.settings || {}),
      },
    };
    const updatedList = [overriddenOrg, ...current.filter((o) => o.id !== orgId)];
    localStorage.setItem(STORAGE_KEYS.ADMIN_ORGANIZATIONS, JSON.stringify(updatedList));
    window.dispatchEvent(new Event('admin-organizations-changed'));

    if (typeof window !== 'undefined' && db) {
      setDoc(doc(db, 'organizations', orgId), sanitizeForFirestore(overriddenOrg), { merge: true }).catch((err) => {
        console.warn('Kunne ikke lagre overstyrt organisasjon i Firestore:', err);
      });
    }

    return overriddenOrg;
  }

  return null;
}

/**
 * Aktiverer eller deaktiverer en organisasjonsavtale.
 */
export function toggleAdminOrganizationStatus(orgId: string, isActive: boolean): void {
  updateAdminOrganization(orgId, { isActive });
}

/**
 * Sletter en administrativ organisasjonsavtale.
 * Hvis det er en forhåndsdefinert organisasjon, markeres den som slettet/deaktivert i overstyringen.
 */
export function deleteAdminOrganization(orgId: string): void {
  const current = getAdminCreatedOrganizations();
  const isPreset = PRESET_ORGANIZATIONS.some((p) => p.id === orgId);

  if (isPreset) {
    // For forhåndsdefinerte legger vi inn en overstyring med isActive: false og deaktivert flagg
    const preset = PRESET_ORGANIZATIONS.find((p) => p.id === orgId)!;
    const updated = [
      { ...preset, isActive: false, notes: '[Arkivert / Slettet av admin]' },
      ...current.filter((o) => o.id !== orgId),
    ];
    localStorage.setItem(STORAGE_KEYS.ADMIN_ORGANIZATIONS, JSON.stringify(updated));

    if (typeof window !== 'undefined' && db) {
      setDoc(doc(db, 'organizations', orgId), { isActive: false, notes: '[Arkivert / Slettet av admin]' }, { merge: true }).catch(() => {});
    }
  } else {
    const updated = current.filter((o) => o.id !== orgId);
    localStorage.setItem(STORAGE_KEYS.ADMIN_ORGANIZATIONS, JSON.stringify(updated));

    if (typeof window !== 'undefined' && db) {
      deleteDoc(doc(db, 'organizations', orgId)).catch(() => {});
    }
  }

  window.dispatchEvent(new Event('admin-organizations-changed'));
}

/**
 * Henter og synkroniserer organisasjoner fra Firestore ved nettforbindelse
 */
export async function syncOrganizationsFromFirestore(): Promise<Organization[]> {
  if (typeof window === 'undefined' || !db) return getAllAvailableOrganizations();

  try {
    const snap = await getDocs(collection(db, 'organizations'));
    if (snap.empty) return getAllAvailableOrganizations();

    const remoteOrgs: Organization[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data() as Organization;
      if (data && data.id && data.name && data.joinCode) {
        remoteOrgs.push(data);
      }
    });

    if (remoteOrgs.length > 0) {
      const local = getAdminCreatedOrganizations();
      const mergedMap = new Map<string, Organization>();
      local.forEach((o) => mergedMap.set(o.id, o));
      remoteOrgs.forEach((o) => mergedMap.set(o.id, o));

      const mergedList = Array.from(mergedMap.values());
      localStorage.setItem(STORAGE_KEYS.ADMIN_ORGANIZATIONS, JSON.stringify(mergedList));
      window.dispatchEvent(new Event('admin-organizations-changed'));
    }

    return getAllAvailableOrganizations();
  } catch (err) {
    console.warn('Kunne ikke laste organisasjoner fra Firestore (bruker lokal cache):', err);
    return getAllAvailableOrganizations();
  }
}

/**
 * Kobler brukeren til en organisasjon via kode.
 * Verifiserer også utløpsdato og om avtalen er aktiv.
 */
export function joinOrganizationByCode(code: string): { success: boolean; organization?: Organization; message: string } {
  const normalized = code.trim().toUpperCase();
  const all = getAllAvailableOrganizations();
  const found = all.find((o) => o.joinCode.toUpperCase() === normalized);

  if (found) {
    // Sjekk om avtalen er deaktivert
    if (found.isActive === false) {
      return {
        success: false,
        message: `Avtalen for ${found.name} er for øyeblikket deaktivert. Kontakt administrator.`,
      };
    }

    // Sjekk om avtalen har utløpt
    if (found.validUntil) {
      const expiry = new Date(found.validUntil);
      if (expiry.getTime() < Date.now()) {
        return {
          success: false,
          message: `Avtalen for ${found.name} utløp ${found.validUntil}. Kontakt din bedriftskontakt for fornyelse.`,
        };
      }
    }

    localStorage.setItem(STORAGE_KEYS.ORGANIZATION, JSON.stringify(found));
    window.dispatchEvent(new Event('organization-changed'));
    return {
      success: true,
      organization: found,
      message: `Velkommen til ${found.name}!`,
    };
  }

  return {
    success: false,
    message: 'Ugyldig organisasjonskode. Sjekk at du har skrevet koden riktig eller kontakt din leder.',
  };
}

/**
 * Kobler brukeren fra organisasjonen.
 */
export function leaveOrganization(): void {
  localStorage.removeItem(STORAGE_KEYS.ORGANIZATION);
  window.dispatchEvent(new Event('organization-changed'));
}



// Gjenkjennelige og motiverende standard-aliaser for anonym deltakelse
export const ANONYMOUS_ALIASES = [
  'Kontorhelten',
  'Morgenfuglen',
  'Kjernesterk',
  'Plankemesteren',
  'Pustepausen',
  'Fokusløperen',
  'Trappetrollet',
  'Kaffepausesjefen',
  'Energibomben',
  'Ryggredderen',
];

export const AVATAR_ICONS = ['⚡', '🔥', '🦁', '🦉', '🚀', '☕', '🌟', '🧘', '🎯', '🍀'];

/**
 * Henter brukerens konkurranseprofil i organisasjonen.
 */
export function getMemberCompetitionProfile(userId?: string): MemberCompetitionProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ORGANIZATION_MEMBER_PROFILE);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const validated = MemberCompetitionProfileSchema.safeParse(parsed);
    if (!validated.success) return null;
    if (userId && validated.data.userId !== userId) return null;
    return validated.data;
  } catch {
    return null;
  }
}

/**
 * Lagrer eller oppdaterer medlemmets konkurranseprofil og personvernvalg.
 */
export function saveMemberCompetitionProfile(profile: MemberCompetitionProfile): void {
  localStorage.setItem(STORAGE_KEYS.ORGANIZATION_MEMBER_PROFILE, JSON.stringify(profile));
  window.dispatchEvent(new Event('organization-profile-changed'));
}

/**
 * Beregner konkurransepoeng for en fullført økt.
 * Premierer innsats, regelmessighet og mikropauser/holdningspauser.
 */
export function calculateWorkoutPoints(durationSeconds: number, workoutType?: string): number {
  const minutes = Math.max(1, Math.round(durationSeconds / 60));
  // 10 poeng per 5 minutter (minst 10 poeng ved fullført økt)
  let basePoints = Math.max(10, Math.round(minutes * 2));

  // Spesialbonus for mikropauser og kontorvanen som motvirker stillesitting
  if (workoutType === 'custom' || durationSeconds <= 300) {
    basePoints += 15; // Ekstra motivasjon for å ta korte pauser i arbeidsdagen
  }

  return basePoints;
}

/**
 * Registrerer poeng fra en fullført økt til medlemmets profil og lag.
 */
export function recordWorkoutForCompetition(params: {
  userId?: string;
  durationSeconds: number;
  workoutType?: string;
}): void {
  const org = getUserOrganization();
  if (!org) return;

  let profile = getMemberCompetitionProfile(params.userId);
  if (!profile) {
    // Hvis brukeren ikke har konfigurert lag ennå, bruk første lag eller standard
    const defaultTeamId = org.teams && org.teams.length > 0 ? org.teams[0].id : 'team-generell';
    profile = {
      userId: params.userId || 'local-user',
      orgId: org.id,
      teamId: defaultTeamId,
      privacyMode: 'anonym',
      alias: 'Kontorhelten',
      avatarIcon: '⚡',
      points: 0,
      minutes: 0,
      sessions: 0,
      updatedAt: new Date().toISOString(),
    };
  }

  const earnedPoints = calculateWorkoutPoints(params.durationSeconds, params.workoutType);
  const addedMinutes = Math.max(1, Math.round(params.durationSeconds / 60));

  const updatedProfile: MemberCompetitionProfile = {
    ...profile,
    points: profile.points + earnedPoints,
    minutes: profile.minutes + addedMinutes,
    sessions: profile.sessions + 1,
    updatedAt: new Date().toISOString(),
  };

  saveMemberCompetitionProfile(updatedProfile);
}

/**
 * Henter resultatlisten for lag/lokasjoner i organisasjonen.
 */
export function getTeamLeaderboard(orgId: string): TeamScore[] {
  const org = getUserOrganization();
  if (!org || org.id !== orgId) return [];

  const teams = org.teams && org.teams.length > 0
    ? org.teams
    : [{ id: 'team-generell', name: 'Fellesteam', location: 'Hovedkontor' }];

  const currentProfile = getMemberCompetitionProfile();

  return teams.map((team, index) => {
    // Basis-demoaktivitet for pilotering så lagene har litt liv
    const basePoints = (teams.length - index) * 85;
    const baseMinutes = (teams.length - index) * 45;
    const baseSessions = (teams.length - index) * 5;
    const baseMembers = Math.max(2, (teams.length - index) * 3);

    // Legg til reelle poeng fra brukeren hvis de tilhører dette laget
    const userMatches = currentProfile && currentProfile.teamId === team.id;
    const userPoints = userMatches ? currentProfile.points : 0;
    const userMinutes = userMatches ? currentProfile.minutes : 0;
    const userSessions = userMatches ? currentProfile.sessions : 0;

    return {
      teamId: team.id,
      teamName: team.name,
      location: team.location,
      totalPoints: basePoints + userPoints,
      totalMinutes: baseMinutes + userMinutes,
      totalSessions: baseSessions + userSessions,
      activeMembersCount: baseMembers + (userMatches ? 1 : 0),
    };
  }).sort((a, b) => b.totalPoints - a.totalPoints);
}

/**
 * Henter individuell hederstavle for de som ønsker synlig eller anonym deltakelse.
 * Brukere med privacyMode === 'skjult' ekskluderes fullstendig.
 */
export function getIndividualLeaderboard(orgId: string, currentUserName?: string | null): IndividualScore[] {
  const org = getUserOrganization();
  if (!org || org.id !== orgId) return [];

  const currentProfile = getMemberCompetitionProfile();
  const currentTeam = org.teams?.find((t) => t.id === currentProfile?.teamId);
  const teamName = currentTeam?.name || 'Avdeling';

  const mockPeers: IndividualScore[] = [
    {
      id: 'peer-1',
      displayName: 'Kari Nordmann',
      teamName: org.teams?.[0]?.name || 'Oslo',
      avatarIcon: '🔥',
      isAnonymous: false,
      points: 210,
      minutes: 105,
      sessions: 8,
    },
    {
      id: 'peer-2',
      displayName: 'Plankemesteren #14',
      teamName: org.teams?.[1]?.name || 'Bergen',
      avatarIcon: '🦁',
      isAnonymous: true,
      points: 175,
      minutes: 85,
      sessions: 6,
    },
    {
      id: 'peer-3',
      displayName: 'Morgenfuglen #07',
      teamName: org.teams?.[0]?.name || 'Oslo',
      avatarIcon: '☕',
      isAnonymous: true,
      points: 140,
      minutes: 70,
      sessions: 5,
    },
  ];

  if (!currentProfile) {
    return mockPeers.sort((a, b) => b.points - a.points);
  }

  // Hvis brukeren har valgt 'skjult', skal de IKKE vises på den individuelle tavlen
  if (currentProfile.privacyMode === 'skjult') {
    return mockPeers.sort((a, b) => b.points - a.points);
  }

  const isAnon = currentProfile.privacyMode === 'anonym';
  const myDisplayName = isAnon
    ? `${currentProfile.alias || 'Kontorhelten'}`
    : currentUserName || 'Meg';

  const myScore: IndividualScore = {
    id: currentProfile.userId,
    displayName: myDisplayName,
    teamName,
    avatarIcon: currentProfile.avatarIcon || '⚡',
    isAnonymous: isAnon,
    points: currentProfile.points,
    minutes: currentProfile.minutes,
    sessions: currentProfile.sessions,
  };

  return [myScore, ...mockPeers].sort((a, b) => b.points - a.points);
}

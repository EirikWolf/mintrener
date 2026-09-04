import { describe, it, expect, beforeEach } from 'vitest';
import {
  getUserOrganization,
  joinOrganizationByCode,
  leaveOrganization,
  calculateWorkoutPoints,
  recordWorkoutForCompetition,
  getMemberCompetitionProfile,
  saveMemberCompetitionProfile,
  getTeamLeaderboard,
  getIndividualLeaderboard,
  createAdminOrganization,
  updateAdminOrganization,
  deleteAdminOrganization,
  getAllAvailableOrganizations,
} from '../organizationService';

describe('organizationService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returnerer null når brukeren ikke har tilknyttet organisasjon', () => {
    expect(getUserOrganization()).toBeNull();
  });

  it('kobler til en forhåndsdefinert organisasjon med gyldig kode', () => {
    const res = joinOrganizationByCode('LILLESTERK');
    expect(res.success).toBe(true);
    expect(res.organization?.id).toBe('org-lillesterk');
    expect(getUserOrganization()?.name).toBe('LilleSterk Eldresenter & Kommune');
  });

  it('kobler fra organisasjon ved leaveOrganization', () => {
    joinOrganizationByCode('HMS2026');
    expect(getUserOrganization()).not.toBeNull();
    leaveOrganization();
    expect(getUserOrganization()).toBeNull();
  });

  it('avviser for kort kode', () => {
    const res = joinOrganizationByCode('ABC');
    expect(res.success).toBe(false);
  });

  it('avviser ukjent kode og oppretter ikke falsk organisasjon', () => {
    const res = joinOrganizationByCode('UKJENT_BEDRIFT_2026');
    expect(res.success).toBe(false);
    expect(res.message).toContain('Ugyldig organisasjonskode');
    expect(getUserOrganization()).toBeNull();
  });

  describe('Konkurranse og poengberegning', () => {
    it('beregner poeng basert på varighet med pausebonus for mikropauser', () => {
      // 5 minutters mikropause (300 sek): 10 base + 15 bonus = 25 poeng
      const p1 = calculateWorkoutPoints(300, 'custom');
      expect(p1).toBe(25);

      // Lengre økt på 20 minutter (1200 sek): 40 base = 40 poeng
      const p2 = calculateWorkoutPoints(1200, 'tabata');
      expect(p2).toBe(40);
    });

    it('registrerer poeng og oppdaterer medlemmets profil', () => {
      joinOrganizationByCode('HMS2026');

      recordWorkoutForCompetition({
        userId: 'test-user-1',
        durationSeconds: 300,
        workoutType: 'custom',
      });

      const profile = getMemberCompetitionProfile('test-user-1');
      expect(profile).not.toBeNull();
      expect(profile?.points).toBe(25);
      expect(profile?.minutes).toBe(5);
      expect(profile?.sessions).toBe(1);
    });
  });

  describe('Personvernvalg i konkurranse', () => {
    it('inkluderer brukeren i individuell hederstavle når privacyMode er "anonym" eller "navn"', () => {
      joinOrganizationByCode('HMS2026');
      saveMemberCompetitionProfile({
        userId: 'user-anon',
        orgId: 'org-hms-pilot',
        teamId: 'team-oslo-it',
        privacyMode: 'anonym',
        alias: 'Plankekongen',
        avatarIcon: '🦁',
        points: 500,
        minutes: 100,
        sessions: 10,
        updatedAt: new Date().toISOString(),
      });

      const board = getIndividualLeaderboard('org-hms-pilot', 'Ola Nordmann');
      const found = board.find((b) => b.id === 'user-anon');
      expect(found).toBeDefined();
      expect(found?.displayName).toBe('Plankekongen');
      expect(found?.isAnonymous).toBe(true);
    });

    it('viser fullt navn når privacyMode er "navn"', () => {
      joinOrganizationByCode('HMS2026');
      saveMemberCompetitionProfile({
        userId: 'user-navn',
        orgId: 'org-hms-pilot',
        teamId: 'team-oslo-it',
        privacyMode: 'navn',
        alias: 'Plankekongen',
        avatarIcon: '🦁',
        points: 500,
        minutes: 100,
        sessions: 10,
        updatedAt: new Date().toISOString(),
      });

      const board = getIndividualLeaderboard('org-hms-pilot', 'Ola Nordmann');
      const found = board.find((b) => b.id === 'user-navn');
      expect(found).toBeDefined();
      expect(found?.displayName).toBe('Ola Nordmann');
      expect(found?.isAnonymous).toBe(false);
    });

    it('ekskluderer brukeren fra individuell hederstavle når privacyMode er "skjult"', () => {
      joinOrganizationByCode('HMS2026');
      saveMemberCompetitionProfile({
        userId: 'user-skjult',
        orgId: 'org-hms-pilot',
        teamId: 'team-oslo-it',
        privacyMode: 'skjult',
        alias: 'Skjult bruker',
        avatarIcon: '⚡',
        points: 500,
        minutes: 100,
        sessions: 10,
        updatedAt: new Date().toISOString(),
      });

      const board = getIndividualLeaderboard('org-hms-pilot', 'Ola Nordmann');
      const found = board.find((b) => b.id === 'user-skjult');
      expect(found).toBeUndefined();

      // Men lagtavlen skal inkludere poengene til team-oslo-it
      const teamBoard = getTeamLeaderboard('org-hms-pilot');
      const myTeam = teamBoard.find((t) => t.teamId === 'team-oslo-it');
      expect(myTeam).toBeDefined();
      expect(myTeam!.totalPoints).toBeGreaterThan(500);
    });
  });

  describe('Admin-funksjoner: opprettelse, redigering og sletting', () => {
    it('oppretter ny organisasjon med orgnummer, kontaktperson og faktura', () => {
      const created = createAdminOrganization({
        name: 'Equinor ASA',
        orgNumber: '923456789',
        department: 'Fornebu IT',
        teams: [{ name: 'Team Alpha', location: 'Bygg C' }],
        validUntil: '2026-12-31',
        agreementType: 'standard',
        maxSeats: 100,
        contactPerson: {
          name: 'Kari Nordmann',
          email: 'kari@equinor.com',
          phone: '90000000',
        },
        billing: {
          invoiceEmail: 'faktura@equinor.com',
          address: 'Fornebuveien 1, 1360 Fornebu',
          accountNumber: '1234.56.78901',
        },
        notes: 'Avtale signert september 2026',
      });

      expect(created.id).toBeDefined();
      expect(created.name).toBe('Equinor ASA');
      expect(created.orgNumber).toBe('923456789');
      expect(created.contactPerson?.name).toBe('Kari Nordmann');
      expect(created.billing?.invoiceEmail).toBe('faktura@equinor.com');

      const all = getAllAvailableOrganizations();
      const found = all.find((o: any) => o.id === created.id);
      expect(found).toBeDefined();
      expect(found?.orgNumber).toBe('923456789');
    });

    it('oppdaterer eksisterende organisasjons utløpsdato og status', () => {
      const org = createAdminOrganization({
        name: 'Pilotbedrift Test',
        validUntil: '2026-05-01',
        teams: [{ name: 'Testteam' }],
      });

      // Oppdater til forlenget dato og deaktivert
      const updated = updateAdminOrganization(org.id, {
        validUntil: '2026-10-01',
        isActive: false,
      });

      expect(updated?.validUntil).toBe('2026-10-01');
      expect(updated?.isActive).toBe(false);

      const all = getAllAvailableOrganizations();
      const found = all.find((o: any) => o.id === org.id);
      expect(found?.validUntil).toBe('2026-10-01');
      expect(found?.isActive).toBe(false);
    });

    it('sletter eller arkiverer organisasjon', () => {
      const org = createAdminOrganization({
        name: 'Kortvarig Bedrift',
        teams: [{ name: 'Team 1' }],
      });

      expect(getAllAvailableOrganizations().some((o: any) => o.id === org.id)).toBe(true);

      deleteAdminOrganization(org.id);

      expect(getAllAvailableOrganizations().some((o: any) => o.id === org.id)).toBe(false);
    });
  });
});


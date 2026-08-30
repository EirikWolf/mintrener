import { describe, it, expect, beforeEach } from 'vitest';
import {
  getUserOrganization,
  joinOrganizationByCode,
  leaveOrganization,
  getOrganizationStats,
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

  it('henter aggregert statistikk over terskel 3 uten enkeltperson-logger', () => {
    const stats = getOrganizationStats('org-lillesterk');
    expect(stats.activeMembersCount).toBeGreaterThanOrEqual(3);
    expect(stats.totalMinutesThisWeek).toBeGreaterThan(0);
  });
});

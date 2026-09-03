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

  // Testen bekreftet tidligere at getOrganizationStats returnerte tall over
  // personvernterskelen — men tallene var hardkodet og like for alle
  // organisasjoner. Den verifiserte altså fiksjonen, ikke funksjonen.
  it('returnerer null til ekte aggregering finnes, framfor oppdiktede tall', () => {
    expect(getOrganizationStats('org-lillesterk')).toBeNull();
    expect(getOrganizationStats('org-koret-var')).toBeNull();
  });
});

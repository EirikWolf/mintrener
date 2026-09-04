import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isAdmin, unlockAdminAccess, revokeAdminAccess } from '../adminService';
import { STORAGE_KEYS } from '../../constants/storageKeys';

describe('adminService (Fase 2 sikkerhet)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.unstubAllEnvs();
  });

  it('gjenkjenner autoriserte admin-eposter uavhengig av store/små bokstaver', () => {
    expect(isAdmin('eirik.wolfenstein@gmail.com')).toBe(true);
    expect(isAdmin('EIRIK@WOLFENSTEIN.NO')).toBe(true);
    expect(isAdmin('admin@mintrener.no')).toBe(true);
    expect(isAdmin('vanlig.bruker@gmail.com')).toBe(false);
    expect(isAdmin(null)).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
  });

  it('i dev-modus tillates lokal overstyring dersom flagget er satt', () => {
    vi.stubEnv('DEV', true);
    localStorage.setItem(STORAGE_KEYS.IS_ADMIN_ROLE, 'true');
    expect(isAdmin('annen@epost.no')).toBe(true);
  });

  it('i prod-modus avvises lokal overstyring for uautoriserte e-poster', () => {
    vi.stubEnv('DEV', false);
    localStorage.setItem(STORAGE_KEYS.IS_ADMIN_ROLE, 'true');
    expect(isAdmin('annen@epost.no')).toBe(false);
  });

  it('unlockAdminAccess avvises i produksjon', () => {
    vi.stubEnv('DEV', false);
    const res = unlockAdminAccess('test-kode');
    expect(res.success).toBe(false);
    expect(res.message).toContain('krever innlogging med autorisert Google-konto');
  });

  it('unlockAdminAccess fungerer i development med gyldig kode', () => {
    vi.stubEnv('DEV', true);
    const res = unlockAdminAccess('dev123');
    expect(res.success).toBe(true);
    expect(localStorage.getItem(STORAGE_KEYS.IS_ADMIN_ROLE)).toBe('true');
  });

  it('revokeAdminAccess fjerner lokal overstyring', () => {
    vi.stubEnv('DEV', true);
    unlockAdminAccess('dev123');
    expect(isAdmin('hvemsomhelst')).toBe(true);

    revokeAdminAccess();
    expect(isAdmin('hvemsomhelst')).toBe(false);
  });
});

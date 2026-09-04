import { STORAGE_KEYS } from '../constants/storageKeys';

// Forhåndsdefinerte e-poster med adminrettighet
export const ADMIN_EMAILS = [
  'eirik.wolfenstein@gmail.com',
  'eirik@wolfenstein.no',
  'admin@mintrener.no',
];

/**
 * Sjekker om gjeldende bruker er registrert administrator.
 * 1. Primærkilde: Autentisert e-post matcher listen over godkjente administratorer.
 * 2. Sekundærkilde: Kun aktiv i development-miljøer (import.meta.env.DEV) for testing.
 */
export function isAdmin(userEmail?: string | null): boolean {
  if (typeof window === 'undefined') return false;

  // 1. Sjekk om e-posten matcher definerte adminer
  if (userEmail && ADMIN_EMAILS.some((email) => email.toLowerCase() === userEmail.toLowerCase())) {
    return true;
  }

  // 2. I produksjon tillates IKKE lokal overstyring uten autentisert admin-konto (Revisjon C)
  if (import.meta.env.DEV && localStorage.getItem(STORAGE_KEYS.IS_ADMIN_ROLE) === 'true') {
    return true;
  }

  return false;
}

/**
 * Utvikler-/test-aktivering for lokale miljøer.
 * Avviser passord-forsøk i produksjon for å hindre brute-force eller lekkede nøkler.
 */
export function unlockAdminAccess(passcode?: string): { success: boolean; message: string } {
  if (!import.meta.env.DEV) {
    return {
      success: false,
      message: 'Administrator-adgang krever innlogging med autorisert Google-konto (@wolfenstein.no eller @mintrener.no).',
    };
  }

  // I lokalt dev-miljø kan utvikleren aktivere rollen
  if (passcode && passcode.trim().length >= 4) {
    localStorage.setItem(STORAGE_KEYS.IS_ADMIN_ROLE, 'true');
    window.dispatchEvent(new Event('admin-role-changed'));
    return { success: true, message: 'Lokal utvikler-adgang aktivert.' };
  }

  return { success: false, message: 'Oppgi en kode på minst 4 tegn for lokal dev-adgang.' };
}

/**
 * Deaktiverer lokal admin-overstyring.
 */
export function revokeAdminAccess(): void {
  localStorage.removeItem(STORAGE_KEYS.IS_ADMIN_ROLE);
  window.dispatchEvent(new Event('admin-role-changed'));
}


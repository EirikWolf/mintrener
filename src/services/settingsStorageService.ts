import { STORAGE_KEYS } from '../constants/storageKeys';

export interface PersistedUserSettings {
  soundEnabled: boolean;
  vibrateEnabled: boolean;
  wakeLockEnabled: boolean;
  speechEnabled: boolean;
}

export const DEFAULT_PERSISTED_SETTINGS: PersistedUserSettings = {
  soundEnabled: true,
  vibrateEnabled: true,
  wakeLockEnabled: true,
  speechEnabled: true,
};

/**
 * Laster lagrede brukerinnstillinger fra localStorage.
 */
export function loadPersistedSettings(): PersistedUserSettings {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { ...DEFAULT_PERSISTED_SETTINGS };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER_SETTINGS);
    if (!raw) return { ...DEFAULT_PERSISTED_SETTINGS };

    const parsed = JSON.parse(raw);
    return {
      soundEnabled: typeof parsed.soundEnabled === 'boolean' ? parsed.soundEnabled : DEFAULT_PERSISTED_SETTINGS.soundEnabled,
      vibrateEnabled: typeof parsed.vibrateEnabled === 'boolean' ? parsed.vibrateEnabled : DEFAULT_PERSISTED_SETTINGS.vibrateEnabled,
      wakeLockEnabled: typeof parsed.wakeLockEnabled === 'boolean' ? parsed.wakeLockEnabled : DEFAULT_PERSISTED_SETTINGS.wakeLockEnabled,
      speechEnabled: typeof parsed.speechEnabled === 'boolean' ? parsed.speechEnabled : DEFAULT_PERSISTED_SETTINGS.speechEnabled,
    };
  } catch (e) {
    console.warn('Feil ved lasting av brukerinnstillinger, bruker standard:', e);
    return { ...DEFAULT_PERSISTED_SETTINGS };
  }
}

/**
 * Lagrer oppdaterte brukerinnstillinger til localStorage.
 */
export function savePersistedSettings(settings: Partial<PersistedUserSettings>): PersistedUserSettings {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { ...DEFAULT_PERSISTED_SETTINGS, ...settings };
  }

  try {
    const current = loadPersistedSettings();
    const updated: PersistedUserSettings = {
      ...current,
      ...settings,
    };
    localStorage.setItem(STORAGE_KEYS.USER_SETTINGS, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.warn('Feil ved lagring av brukerinnstillinger:', e);
    return { ...DEFAULT_PERSISTED_SETTINGS, ...settings };
  }
}

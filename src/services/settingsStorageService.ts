import { STORAGE_KEYS } from '../constants/storageKeys';

export interface PersistedUserSettings {
  soundEnabled: boolean;
  vibrateEnabled: boolean;
  wakeLockEnabled: boolean;
  speechEnabled: boolean;
  countdownDurationSeconds: 3 | 5;
  countdownAudioStyle: 'beep' | 'buzzer';
}

export const DEFAULT_PERSISTED_SETTINGS: PersistedUserSettings = {
  soundEnabled: true,
  vibrateEnabled: true,
  wakeLockEnabled: true,
  speechEnabled: true,
  countdownDurationSeconds: 3,
  countdownAudioStyle: 'beep',
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
      countdownDurationSeconds: parsed.countdownDurationSeconds === 5 ? 5 : 3,
      countdownAudioStyle: parsed.countdownAudioStyle === 'buzzer' ? 'buzzer' : 'beep',
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

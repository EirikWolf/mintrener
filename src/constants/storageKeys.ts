/**
 * Kanonisk register over alle localStorage-nøkler i Min Trener.
 *
 * Forhindrer PII/GDPR-lekkasjer der sletting eller eksport bommer på grunn av feilstavede strengliteraler.
 */
export const STORAGE_KEYS = {
  // Treningshistorikk
  WORKOUT_HISTORY: 'mintrener_history_v1',
  LEGACY_WORKOUT_HISTORY: ['mintrener_history', 'mintrener_workout_history'],

  // Egendefinerte økter, øvelser og styrkelogg
  CUSTOM_WORKOUTS: 'mintrener_local_custom_workouts',
  LEGACY_CUSTOM_WORKOUTS: 'mintrener_custom_workouts',
  CUSTOM_EXERCISES: 'mintrener_local_custom_exercises',
  LEGACY_CUSTOM_EXERCISES: 'mintrener_custom_exercises',
  STRENGTH_LOGS: 'mintrener_local_strength_logs',
  LEGACY_STRENGTH_LOGS: 'mintrener_strength_logs',

  // Brukerprofil, mål og innstillinger
  USER_PROFILE: 'mintrener_user_profile',
  USER_SETTINGS: 'mintrener_user_settings',
  FAVORITE_PROGRAM_IDS: 'mintrener_favorite_program_ids',
  LEGACY_FAVORITES: 'mintrener_favorites',
  COACH_PERSONA: 'mintrener_coach_persona',
  COACH_VOLUME: 'mintrener_coach_volume',
  ONBOARDING: 'mintrener_onboarding_v1',
  WEEKLY_GOAL: 'mintrener_weekly_goal',
  STREAK_CELEBRATED: 'mintrener_streak_celebrated_v1',
  ACCOUNT_PROMPT: 'mintrener_account_prompt_v1',
  BADGES: 'mintrener_badges',
  PERSONAL_RECORDS: 'mintrener_personal_records',

  // Tilstand og gjenoppretting
  INTERRUPTED_SESSION: 'mintrener_interrupted_session',
  CURATOR_OVERRIDES: 'mintrener_curator_overrides',
  MOTION_TRACKER_SETTINGS: 'mintrener_motion_tracker_settings',
  ADAPTIVE_PROGRESSION: 'mintrener_adaptive_progression',
  FATIGUE_STATE: 'mintrener_fatigue_state',
  VOICE_COMMAND_SETTINGS: 'mintrener_voice_command_settings',
  SKILL_TREE_PROGRESS: 'mintrener_skill_tree_progress',
  CHALLENGES_PROGRESS: 'mintrener_challenges_progress',
  ORGANIZATION: 'mintrener_organization',
} as const;

/**
 * Tømmer absolutt alle lokale Min Trener-nøkler (GDPR Art. 17 - Retten til sletting).
 * Fjerner både faste kanoniske nøkler og eventuelle dynamiske nøkler med prefiks 'mintrener_'.
 */
export function clearAllLocalUserData(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    // 1. Samle alle nøkler som starter med mintrener_
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('mintrener_') || key.startsWith('mintrener:'))) {
        keysToRemove.push(key);
      }
    }

    // 2. Fjern alle identifiserte nøkler
    keysToRemove.forEach((k) => localStorage.removeItem(k));

    // 3. Sikkerhetsnett: eksplisitt fjerning av kjente nøkler
    Object.values(STORAGE_KEYS).forEach((val) => {
      if (typeof val === 'string') {
        localStorage.removeItem(val);
      } else if (Array.isArray(val)) {
        val.forEach((k) => localStorage.removeItem(k));
      }
    });
  } catch (err) {
    console.warn('Kunne ikke tømme localStorage under sletting av brukerdata:', err);
  }
}

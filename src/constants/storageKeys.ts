/**
 * Kanonisk register over alle localStorage-nøkler i Min Trener.
 *
 * Registeret har to jobber, og bare den ene tåler feil:
 *
 *  - **Sletting** (GDPR art. 17) tåler at registeret er ufullstendig, fordi
 *    `clearAllLocalUserData` også prefiks-skanner alt som begynner med
 *    `mintrener_`. Registeret er sikkerhetsnettet, ikke mekanismen.
 *  - **Dataeksport** (GDPR art. 15/20) leser nøkler ved navn. Står en nøkkel
 *    feil her, blir feltet tomt i brukerens kopi uten at noe feiler.
 *
 * Registeret ble skrevet fra hukommelsen ved opprettelsen, og drev fra
 * virkeligheten: 15 nøkler i bruk manglet, og 18 sto oppført uten å finnes.
 * Verst var WORKOUT_HISTORY, som pekte på `mintrener_history_v1` mens
 * historikken faktisk lå i `mintrener_local_workout_history` — eksporten
 * leverte tom historikk til anonyme brukere.
 *
 * `storageKeys.test.ts` sammenligner nå registeret mot faktisk bruk i
 * kildekoden og feiler ved drift. Legger du til en nøkkel, hører den hjemme her.
 */
export const STORAGE_KEYS = {
  // ── Treningshistorikk ──────────────────────────────────────────────────
  /** Kanonisk historikk. Speiler WORKOUT_HISTORY_KEY i workoutHistoryStorage. */
  WORKOUT_HISTORY: 'mintrener_local_workout_history',
  /** Leses ved migrering, skrives aldri. */
  LEGACY_WORKOUT_HISTORY: ['mintrener_local_history', 'mintrener_workout_history'],

  // ── Egendefinert innhold ───────────────────────────────────────────────
  CUSTOM_WORKOUTS: 'mintrener_custom_workouts',
  LEGACY_CUSTOM_WORKOUTS: 'mintrener_local_custom_workouts',
  CUSTOM_EXERCISES: 'mintrener_local_custom_exercises',
  LEGACY_CUSTOM_EXERCISES: 'mintrener_custom_exercises',
  STRENGTH_LOGS: 'mintrener_local_strength_logs',
  LEGACY_STRENGTH_LOGS: 'mintrener_strength_logs',
  /** Sett/reps/kg per øvelse for progresjonsberegning. */
  STRENGTH_EXERCISE_LOGS: 'mintrener_strength_exercise_logs_v1',
  PERSONAL_RECORDS: 'mintrener_personal_records',

  // ── Profil, mål og preferanser ─────────────────────────────────────────
  /** Fødselsår — grunnlag for makspuls. Personopplysning. */
  USER_BIRTH_YEAR: 'mintrener_user_birth_year',
  USER_PROFILE: 'mintrener_user_profile',
  USER_PROFILES: 'mintrener_user_profiles_v1',
  USER_SETTINGS: 'mintrener_user_settings',
  /** Skadeprofil og smertepunkter. Helseopplysning (GDPR art. 9). */
  INJURY_PROFILE: 'mintrener_injury_profile_v1',
  /**
   * Om brukeren har valgt lydnivå SELV. Profilen foreslår bare et nivå, og
   * forslaget skal ikke overkjøre et bevisst valg neste gang profilen endres.
   */
  SOUND_LEVEL_CHOSEN: 'mintrener_sound_level_chosen',
  FAVORITE_PROGRAM_IDS: 'mintrener_favorite_program_ids',
  COACH_PERSONA: 'mintrener_coach_persona',
  ONBOARDING: 'mintrener_onboarding_v1',
  PREFERRED_LANGUAGE: 'mintrener_preferred_language_v1',
  TELEMETRY_ENABLED: 'mintrener_telemetry_enabled',

  // ── Mål, streak og feiring ─────────────────────────────────────────────
  WEEKLY_GOAL: 'mintrener_weekly_goal',
  /** Målhistorikk: et hevet ukesmål skal ikke kollapse tidligere uker. */
  WEEKLY_GOAL_LOG: 'mintrener_weekly_goal_log_v1',
  STREAK_CELEBRATED: 'mintrener_streak_celebrated_v1',
  STREAK_REPORTED: 'mintrener_streak_reported_v1',
  ACCOUNT_PROMPT: 'mintrener_account_prompt_v1',
  BADGES: 'mintrener_badges',

  // ── Programmer, ferdigheter og utfordringer ────────────────────────────
  PROGRAM_OVERRIDES: 'mintrener_program_overrides_v1',
  SKILL_TREE_PROGRESS: 'mintrener_skill_tree_progress_v1',
  ACTIVE_CHALLENGE_ID: 'mintrener_active_challenge_id_v1',
  /** Prefiks — én nøkkel per utfordring. Fanges av prefiks-skannet ved sletting. */
  CHALLENGE_PROGRESS_PREFIX: 'mintrener_challenge_progress_',

  // ── Tilstand og verktøy ────────────────────────────────────────────────
  INTERRUPTED_SESSION: 'mintrener_interrupted_session',
  ORGANIZATION: 'mintrener_organization',
  ORGANIZATION_MEMBER_PROFILE: 'mintrener_org_member_profile_v1',
  /** Egendefinerte organisasjonsavtaler opprettet av administrator */
  ADMIN_ORGANIZATIONS: 'mintrener_admin_organizations_v1',
  /** Brukerinnsendte øvelsesbilder (crowdsourcing) */
  EXERCISE_CONTRIBUTIONS: 'mintrener_exercise_contributions_v1',
  /** Admin-godkjente standardbilder per øvelsesfase */
  APPROVED_EXERCISE_IMAGES: 'mintrener_approved_exercise_images_v1',
  /** Tilbakemeldinger og feilrapporter fra testere */
  TESTER_FEEDBACK: 'mintrener_tester_feedback_v1',
  /** Progresjon på strukturert test-sjekkliste */
  TESTER_CHECKLIST_PROGRESS: 'mintrener_tester_checklist_progress_v1',
  /** Tester-status / adgangsflagg */
  IS_TESTER_ROLE: 'mintrener_is_tester_role_v1',
  /** Admin-status overstyring (for passord/kode-tilgang) */
  IS_ADMIN_ROLE: 'mintrener_is_admin_role_v1',
  /** Internt QA-verktøy, ikke brukerdata. Med i registeret for slettingens skyld. */
  CURATOR_FEEDBACK: 'mintrener_image_curator_feedback',
  /** Valgt kandidatbilde per øvelsesfase. Samme klasse som CURATOR_FEEDBACK. */
  CURATOR_VALG: 'mintrener_image_curator_valg',
} as const;

/**
 * Tømmer absolutt alle lokale Min Trener-nøkler (GDPR art. 17).
 * Fjerner både registerets nøkler og eventuelle dynamiske nøkler med
 * prefiks 'mintrener_'.
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
  } catch {
    // localStorage utilgjengelig (privat modus / blokkert) — ingenting å tømme.
  }
}

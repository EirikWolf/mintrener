import { WORKOUT_HISTORY_KEY } from './workoutHistoryStorage';

/**
 * Fullført-flagg for førstegangs-onboardingen (C2, spec § 3).
 * Verdi: { completedAt: ISO-streng } — selve tilstedeværelsen er signalet.
 */
const ONBOARDING_KEY = 'mintrener_onboarding_v1';

/** Persona-nøkkelen leses RÅTT (ikke via getActiveCoachPersona): default-en
 *  'standard' kan ikke skille «valgte standard» fra «har aldri valgt». */
const COACH_PERSONA_KEY = 'mintrener_coach_persona';

/**
 * Trigger (spec § 3): kun helt ferske brukere — aldri fullført flyten,
 * aldri valgt trenerstemme og ingen lokal treningshistorikk. Utilgjengelig
 * localStorage (privat modus o.l.) → aldri vis; appen skal ikke gate på feil.
 */
export function shouldShowOnboarding(): boolean {
  try {
    return (
      localStorage.getItem(ONBOARDING_KEY) === null &&
      localStorage.getItem(COACH_PERSONA_KEY) === null &&
      localStorage.getItem(WORKOUT_HISTORY_KEY) === null
    );
  } catch {
    return false;
  }
}

/** Varig fullført-markering — settes både ved gjennomført flyt og «Hopp over». */
export function markOnboardingDone(): void {
  try {
    localStorage.setItem(
      ONBOARDING_KEY,
      JSON.stringify({ completedAt: new Date().toISOString() })
    );
  } catch {
    // Best effort — uten lagring vises flyten på nytt neste besøk, ufarlig.
  }
}

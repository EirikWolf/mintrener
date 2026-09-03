import { CompletedWorkoutLog } from '../types/models';

/**
 * Kanonisk localStorage-nøkkel for lokal treningshistorikk. Historisk fantes
 * tre varianter i kodebasen; alt skal gå via denne konstanten.
 */
export const WORKOUT_HISTORY_KEY = 'mintrener_local_workout_history';

/**
 * Feilstavede/utdaterte nøkler som tidligere versjoner har brukt.
 * 'mintrener_local_history' ble slettet (men aldri skrevet) av deleteUserData,
 * 'mintrener_workout_history' ble lest (men aldri skrevet) av badgeService.
 */
export const LEGACY_WORKOUT_HISTORY_KEYS = [
  'mintrener_local_history',
  'mintrener_workout_history',
] as const;

/**
 * Engangsmigrering ved oppstart: flytter historikk fra legacy-nøklene inn i
 * den kanoniske nøkkelen (les gammel → skriv ny → slett gammel). Oppføringer
 * under den kanoniske nøkkelen vinner ved id-kollisjon; korrupt legacy-data
 * slettes uten å røre kanonisk data.
 */
export function migrateWorkoutHistoryKeys(): void {
  try {
    const migrated: CompletedWorkoutLog[] = [];

    for (const legacyKey of LEGACY_WORKOUT_HISTORY_KEYS) {
      const raw = localStorage.getItem(legacyKey);
      if (raw === null) continue;
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          migrated.push(...parsed);
        }
      } catch {
        // Korrupt legacy-data har ingen verdi – slettes under uansett.
      }
      localStorage.removeItem(legacyKey);
    }

    if (migrated.length === 0) return;

    const rawCurrent = localStorage.getItem(WORKOUT_HISTORY_KEY);
    let current: CompletedWorkoutLog[] = [];
    try {
      current = rawCurrent ? JSON.parse(rawCurrent) : [];
    } catch {}

    const map = new Map<string, CompletedWorkoutLog>();
    migrated.forEach((l) => l?.id && map.set(l.id, l));
    current.forEach((l) => l?.id && map.set(l.id, l));

    const merged = Array.from(map.values()).sort(
      (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    );
    localStorage.setItem(WORKOUT_HISTORY_KEY, JSON.stringify(merged));
  } catch {
    // localStorage utilgjengelig (privat modus o.l.) – appen virker uten.
  }
}

/**
 * Henter alle fullførte økter fra kanonisk lokal lagring.
 */
export function getCompletedWorkoutLogs(): CompletedWorkoutLog[] {
  try {
    const raw = localStorage.getItem(WORKOUT_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

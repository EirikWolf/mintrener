import { CompletedWorkoutLog } from '../types/models';

/**
 * Minimal informasjon om økten som nettopp ble fullført, brukt til å bygge
 * en midlertidig historikkoppføring mens lagring pågår (se
 * {@link buildEffectiveHistory}).
 */
export interface CurrentSessionInfo {
  workoutName: string;
  durationSeconds: number;
}

/**
 * Avgjør om den nettopp fullførte økten allerede finnes i historikken, ved
 * eksakt id-match mot `workoutLogId`.
 *
 * Erstatter en tidligere heuristikk som sammenlignet (workoutName,
 * durationSeconds, completedAt < 15s) mot nyeste historikkoppføring: to
 * identiske korte økter rett etter hverandre ville da gjøre at den andre
 * økten feilaktig ble regnet som "allerede inkludert", og undertalte
 * ukesmål/streak med én.
 *
 * `workoutLogId` settes asynkront av App.tsx først når
 * `saveCompletedWorkout` er ferdig. Så lenge den ikke er satt vet vi ikke om
 * lagringen er fullført, og økten regnes derfor som IKKE inkludert.
 */
export function isCurrentSessionInHistory(
  history: readonly CompletedWorkoutLog[],
  workoutLogId: string | undefined
): boolean {
  if (!workoutLogId) return false;
  return history.some((log) => log.id === workoutLogId);
}

/**
 * Bygger historikk-listen slik den bør se ut for kontekstberegninger
 * (ukesmål, streak) rett etter en fullført økt.
 *
 * Så lenge den gjeldende økten ikke er bekreftet inkludert (se
 * {@link isCurrentSessionInHistory}), stables en midlertidig ("syntetisk")
 * oppføring for den øverst, slik at "nådd ukesmål"/streak blir riktig med
 * en gang selv om lagringen til lokal historikk ennå ikke er fullført. Når
 * id-en er bekreftet i historikken, returneres historikken uendret - det
 * unngår dobbelttelling når effekten kjører på nytt etter at lagringen er
 * ferdig.
 */
export function buildEffectiveHistory(
  history: readonly CompletedWorkoutLog[],
  currentSession: CurrentSessionInfo,
  workoutLogId: string | undefined
): CompletedWorkoutLog[] {
  if (isCurrentSessionInHistory(history, workoutLogId)) {
    return [...history];
  }

  const syntheticEntry: CompletedWorkoutLog = {
    id: workoutLogId ?? 'pending-session',
    userId: 'pending',
    workoutId: 'pending',
    workoutName: currentSession.workoutName,
    workoutType: 'custom',
    durationSeconds: currentSession.durationSeconds,
    roundsCompleted: 0,
    totalRounds: 0,
    completedAt: new Date().toISOString(),
  };

  return [syntheticEntry, ...history];
}

/**
 * Beregner nåværende streak (antall dager på rad med minst én fullført økt),
 * regnet bakover fra i dag/i går.
 *
 * Bygger på samme algoritme som brukes inline i WorkoutHistoryView.tsx sin
 * `stats`-useMemo, men er trukket ut som en ren, testbar funksjon som tar
 * imot en liste med ISO-datoer (YYYY-MM-DD) i stedet for hele
 * historikkobjekter. WorkoutHistoryView.tsx er bevisst IKKE migrert til å
 * bruke denne i denne omgangen (Oppgave A4), for å holde endringen fokusert
 * på Astrid-feedbacken i WorkoutSummary. Duplikeringen bør ryddes opp i som
 * egen oppfølging.
 */
export function computeStreakDays(dates: string[]): number {
  const uniqueDates = Array.from(new Set(dates)).sort().reverse();
  if (uniqueDates.length === 0) return 0;

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  if (!uniqueDates.includes(today) && !uniqueDates.includes(yesterday)) {
    return 0;
  }

  let streak = 1;
  let checkDate = new Date(uniqueDates[0]);
  for (let i = 1; i < uniqueDates.length; i++) {
    const prev = new Date(uniqueDates[i]);
    const diffDays = Math.round((checkDate.getTime() - prev.getTime()) / 86400000);
    if (diffDays === 1) {
      streak++;
      checkDate = prev;
    } else {
      break;
    }
  }
  return streak;
}

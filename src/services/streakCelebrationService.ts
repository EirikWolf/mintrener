/**
 * Persistens for feirede uke-streak-milepæler (spec § 2.1: kun feirede
 * milepæler persisteres — selve streaken er avledet). Hindrer gjentatt
 * konfetti for samme milepæl.
 */
const KEY = 'mintrener_streak_celebrated_v1';

function readCelebrated(): number[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((n): n is number => typeof n === 'number') : [];
  } catch { return []; }
}

export function getUncelebratedMilestones(reached: number[]): number[] {
  const done = new Set(readCelebrated());
  return reached.filter((m) => !done.has(m));
}

export function markMilestoneCelebrated(milestone: number): void {
  try { localStorage.setItem(KEY, JSON.stringify([...new Set([...readCelebrated(), milestone])])); } catch { /* best effort */ }
}

/**
 * Dedupe-markører for streak-telemetriprodusentene (spec § 5): slinguke-forbruk
 * og brudd avledes retroaktivt av computeWeekStreak ved hver visning, så uten
 * en persistert «sist rapportert»-ukenøkkel ville samme hendelse telles på
 * hver re-render/StrictMode-dobbeltkjøring. Søster-nøkkel til feiringslisten
 * (egen nøkkel: feiringslisten er et talls-array og skal forbli bakoverkompatibel).
 */
const REPORTED_KEY = 'mintrener_streak_reported_v1';

type ReportedMarkers = { insuranceWeek: string | null; breakWeek: string | null };

function readReported(): ReportedMarkers {
  try {
    const parsed = JSON.parse(localStorage.getItem(REPORTED_KEY) ?? '{}');
    return {
      insuranceWeek: typeof parsed?.insuranceWeek === 'string' ? parsed.insuranceWeek : null,
      breakWeek: typeof parsed?.breakWeek === 'string' ? parsed.breakWeek : null,
    };
  } catch { return { insuranceWeek: null, breakWeek: null }; }
}

function writeReported(markers: ReportedMarkers): void {
  try { localStorage.setItem(REPORTED_KEY, JSON.stringify(markers)); } catch { /* best effort */ }
}

export function getLastReportedInsuranceWeek(): string | null {
  return readReported().insuranceWeek;
}

export function markInsuranceReported(weekKey: string): void {
  writeReported({ ...readReported(), insuranceWeek: weekKey });
}

export function getLastReportedBreakWeek(): string | null {
  return readReported().breakWeek;
}

export function markBreakReported(weekKey: string): void {
  writeReported({ ...readReported(), breakWeek: weekKey });
}

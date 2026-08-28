import { db } from './firebase';
import { doc, setDoc, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

/**
 * NTP-forenklet klokkesynkronisering mot Firestore-serveren.
 *
 * Hver klient estimerer offset θ mellom egen veggklokke og serverklokken slik at
 * grupperom kan starte samtidig uavhengig av avvik mellom enhetenes klokker
 * (som ellers rutinemessig ligger på 0,5–2 s på mobil).
 */

// Én tilfeldig klient-id per klient, gjenbrukt mellom kall slik at hver klient
// alltid skriver til sitt eget clock_sync-dokument (unngår kollisjon mellom deltakere).
let clientId: string | null = null;

function getClientId(): string {
  if (!clientId) {
    clientId = Math.random().toString(36).slice(2);
  }
  return clientId;
}

// Cachet offset (ms). `null` betyr «ikke målt ennå» — skiller seg fra en målt offset på 0.
let cachedOffsetMs: number | null = null;

/**
 * Ren offset-beregning: θ = serverMs − midtpunktet mellom lokal sendt- og mottatt-tid.
 * Feilgrensen er ± halve rundturstiden (t1 − t0).
 */
export function computeClockOffset(t0Ms: number, t1Ms: number, serverMs: number): number {
  return serverMs - (t0Ms + t1Ms) / 2;
}

/**
 * Median av en liste med tall. Håndterer usortert input og både odde og
 * like antall elementer (snitt av de to midterste ved like antall).
 * Returnerer 0 for en tom liste — det finnes ingen meningsfull median av
 * null målinger, og 0 er samme «ingen kjent skjevhet»-verdi som en umålt offset.
 */
export function median(values: number[]): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Estimerer klokkeoffset mot Firestore-serveren ved å ta `samples` sekvensielle
 * målinger (skriv med serverTimestamp, les tilbake, mål rundtur) og returnere medianen.
 *
 * Resultatet caches i en modulvariabel — påfølgende kall er billige og returnerer
 * cachen direkte, med mindre `force` er satt. Appen skal aldri knekke på dette:
 * ved feil (offline, manglende db, o.l.) logges en advarsel og cachen (eller 0
 * hvis ingenting er målt ennå) returneres i stedet for å kaste.
 */
export async function estimateServerClockOffset(
  samples = 3,
  force = false
): Promise<number> {
  if (cachedOffsetMs !== null && !force) {
    return cachedOffsetMs;
  }

  try {
    const ref = doc(db, 'clock_sync', getClientId());
    const offsets: number[] = [];

    for (let i = 0; i < samples; i++) {
      const t0 = Date.now();
      await setDoc(ref, { ts: serverTimestamp() });
      const snap = await getDoc(ref);
      const t1 = Date.now();

      const ts = snap.data()?.ts as Timestamp | undefined;
      if (!ts) {
        throw new Error('clock_sync: dokumentet manglet et serverstempel etter skriving');
      }

      offsets.push(computeClockOffset(t0, t1, ts.toMillis()));
    }

    cachedOffsetMs = median(offsets);
    return cachedOffsetMs;
  } catch (err) {
    console.warn('estimateServerClockOffset: klarte ikke å måle klokkeoffset mot serveren', err);
    return cachedOffsetMs ?? 0;
  }
}

/**
 * Nåværende tidspunkt justert med kjent serveroffset (0 hvis ikke målt ennå).
 * Bruk denne i stedet for `Date.now()` når flere klienter må enes om «nå».
 */
export function getServerNow(): number {
  return Date.now() + (cachedOffsetMs ?? 0);
}

/**
 * Kun for tester: nullstiller modulnivå-cachen (offset og klient-id) mellom testcaser.
 */
export function __resetClockSyncCacheForTest(): void {
  cachedOffsetMs = null;
  clientId = null;
}

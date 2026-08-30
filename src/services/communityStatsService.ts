import { doc, getDoc, increment, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export const THRESHOLD_MIN_DISPLAY = 3;

/**
 * Formaterer en anonym fullføringsteller etter personvernkravet (Terskel 3).
 * Returnerer null hvis færre enn 3 personer har fullført, for å forhindre enkeltbruker-identifikasjon.
 */
export function formatThreshold3Count(count: number): string | null {
  if (!count || count < THRESHOLD_MIN_DISPLAY) {
    return null;
  }
  return `${count} har trent denne`;
}

/**
 * Henter anonymt fullføringstall for et program eller en utfordring fra Firestore.
 */
export async function getCommunityWorkoutCount(targetId: string): Promise<number> {
  try {
    const statsDocRef = doc(db, 'global_stats', `counter_${targetId}`);
    const snap = await getDoc(statsDocRef);
    if (snap.exists()) {
      return snap.data()?.count || 0;
    }
    return 0;
  } catch {
    return 0;
  }
}

/**
 * Inkrementerer fullføringstall for et program anonymt (håndterer offline/fallback trygt).
 */
export async function recordCommunityCompletion(targetId: string): Promise<void> {
  try {
    const statsDocRef = doc(db, 'global_stats', `counter_${targetId}`);
    await setDoc(
      statsDocRef,
      {
        count: increment(1),
        lastUpdated: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch {
    // Stille feilhåndtering ved offline
  }
}

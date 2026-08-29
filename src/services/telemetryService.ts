import { db } from './firebase';
import { doc, setDoc, getDoc, increment, serverTimestamp, FieldValue } from 'firebase/firestore';
import { WorkoutTemplate } from '../types/workout';

const TELEMETRY_STORAGE_KEY = 'mintrener_telemetry_enabled';

export interface ExercisePopularityStat {
  exerciseId: string;
  name: string;
  completedCount: number;
  totalSeconds: number;
}

export interface GlobalTelemetryStats {
  totalWorkouts: number;
  totalSecondsTrained: number;
  workoutTypeBreakdown: Record<string, number>;
  topExercises: ExercisePopularityStat[];
  ratingBreakdown: {
    for_lett: number;
    passe: number;
    for_tungt: number;
  };
  lastUpdated?: string;
}

/**
 * Sjekker om brukeren har aktivert anonym bruksstatistikk (standard: true)
 */
export function getTelemetryConsent(): boolean {
  try {
    const val = localStorage.getItem(TELEMETRY_STORAGE_KEY);
    return val !== 'false';
  } catch {
    return true;
  }
}

/**
 * Setter brukersamtykke for anonym bruksstatistikk
 */
export function setTelemetryConsent(enabled: boolean): void {
  try {
    localStorage.setItem(TELEMETRY_STORAGE_KEY, enabled ? 'true' : 'false');
  } catch (err) {
    console.warn('Kunne ikke lagre telemetrisamtykke:', err);
  }
}

/**
 * Teller anonymt at en delt øktlenke ble åpnet av en mottaker.
 * Grunnlaget for å måle viral K-faktor – ingen personopplysninger.
 */
export async function recordShareLinkOpen(): Promise<void> {
  if (!getTelemetryConsent() || !db) {
    return;
  }
  try {
    const overviewRef = doc(db, 'global_stats', 'overview');
    await setDoc(
      overviewRef,
      { shareLinkOpens: increment(1), lastUpdated: serverTimestamp() },
      { merge: true }
    );
  } catch (err) {
    console.warn('Kunne ikke registrere lenkeåpning:', err);
  }
}

/**
 * Sender anonyme aggregattellere til Firestore uten noen personopplysninger
 */
export async function recordWorkoutTelemetry(
  workout: WorkoutTemplate,
  durationSeconds: number,
  rating?: string
): Promise<void> {
  if (!getTelemetryConsent()) {
    return; // Respekter brukerens ønske om ingen telemetri
  }

  if (!db) {
    return;
  }

  try {
    // 1. Aggreger overordnet øktstatistikk
    const overviewRef = doc(db, 'global_stats', 'overview');
    const safeType = workout.type || 'custom';
    
    // NB: setDoc med merge splitter IKKE punktum-nøkler i stier (kun updateDoc
    // gjør det) — `types.${safeType}` ville blitt én bokstavelig toppnivå-nøkkel.
    // Nøstet map-form kreves både av sikkerhetsreglene (allowlist på `types`)
    // og av fetchGlobalStats som leser `overviewData.types`.
    await setDoc(
      overviewRef,
      {
        totalWorkouts: increment(1),
        totalSecondsTrained: increment(Math.max(durationSeconds, 0)),
        types: { [safeType]: increment(1) },
        lastUpdated: serverTimestamp(),
      },
      { merge: true }
    );

    // 2. Aggreger øvelsesstatistikk for hver øvelse i økten
    if (workout.items && workout.items.length > 0) {
      const exercisesRef = doc(db, 'global_stats', 'exercises');
      // Samme punktum-fallgruve som over: nøstet map per øvelses-id, slik at
      // hvert skriv berører én toppnivå-nøkkel per øvelse (+ lastUpdated) —
      // formen sikkerhetsreglene og fetchGlobalStats forventer.
      const exUpdates: Record<
        string,
        FieldValue | { count: FieldValue; seconds: FieldValue; name: string }
      > = {
        lastUpdated: serverTimestamp(),
      };

      for (const item of workout.items) {
        if (!item.exercise || !item.exercise.id) continue;
        const exId = item.exercise.id.replace(/\//g, '_');
        const exName = item.exercise.name || exId;
        const itemDuration = (item.workDurationSeconds || 30) * (workout.rounds || 1);

        exUpdates[exId] = {
          count: increment(1),
          seconds: increment(itemDuration),
          name: exName,
        };
      }

      await setDoc(exercisesRef, exUpdates, { merge: true });
    }

    // 3. Aggreger vanskelighetsgradsvurdering hvis oppgitt
    if (rating && ['for_lett', 'passe', 'for_tungt'].includes(rating)) {
      const ratingsRef = doc(db, 'global_stats', 'ratings');
      await setDoc(
        ratingsRef,
        {
          [rating]: increment(1),
          lastUpdated: serverTimestamp(),
        },
        { merge: true }
      );
    }
  } catch (err) {
    // Telemetri skal aldri feile eller forstyrre kjerneopplevelsen
    console.warn('Anonym telemetrilogging ble hoppet over:', err);
  }
}

/**
 * Henter fellesskapets aggregerte statistikk for visning i UI
 */
export async function fetchGlobalStats(): Promise<GlobalTelemetryStats | null> {
  if (!db) return null;

  try {
    const [overviewSnap, exercisesSnap, ratingsSnap] = await Promise.all([
      getDoc(doc(db, 'global_stats', 'overview')),
      getDoc(doc(db, 'global_stats', 'exercises')),
      getDoc(doc(db, 'global_stats', 'ratings')),
    ]);

    const overviewData = overviewSnap.exists() ? overviewSnap.data() : {};
    const exercisesData = exercisesSnap.exists() ? exercisesSnap.data() : {};
    const ratingsData = ratingsSnap.exists() ? ratingsSnap.data() : {};

    // Sorter topp øvelser
    const topExercises: ExercisePopularityStat[] = [];
    for (const [key, val] of Object.entries(exercisesData)) {
      if (key === 'lastUpdated' || typeof val !== 'object' || val === null) continue;
      const exObj = val as { count?: number; seconds?: number; name?: string };
      topExercises.push({
        exerciseId: key,
        name: exObj.name || key,
        completedCount: exObj.count || 0,
        totalSeconds: exObj.seconds || 0,
      });
    }

    topExercises.sort((a, b) => b.completedCount - a.completedCount);

    return {
      totalWorkouts: overviewData.totalWorkouts || 0,
      totalSecondsTrained: overviewData.totalSecondsTrained || 0,
      workoutTypeBreakdown: overviewData.types || {},
      topExercises: topExercises.slice(0, 5),
      ratingBreakdown: {
        for_lett: ratingsData.for_lett || 0,
        passe: ratingsData.passe || 0,
        for_tungt: ratingsData.for_tungt || 0,
      },
    };
  } catch (err) {
    console.warn('Kunne ikke hente global statistikk:', err);
    return null;
  }
}

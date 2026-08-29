import { db } from './firebase';
import { doc, setDoc, getDoc, increment, serverTimestamp, FieldValue } from 'firebase/firestore';
import { WorkoutTemplate } from '../types/workout';
import type { PerfSessionReport } from './perfMonitorService';

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

// Bøttegrenser (ms) for lydavviks-histogrammet i global_stats/perf. p95 kan ikke
// aggregeres på tvers av økter med rene increment()-operasjoner (Firestore har
// ingen server-side persentil-funksjon), så hver klient klassifiserer i stedet
// SIN øktrapports p95 i én av tre bøtter – forholdstallet (f.eks. andel økter
// under 20 ms-målet) er beregnbart fra bøttetellerne i etterkant.
function deviationBucketField(
  deviationMs: number | null
): 'deviationUnder20Ms' | 'deviation20to50Ms' | 'deviationOver50Ms' | null {
  if (deviationMs === null) return null;
  if (deviationMs < 20) return 'deviationUnder20Ms';
  if (deviationMs < 50) return 'deviation20to50Ms';
  return 'deviationOver50Ms';
}

// Øvre grense (minutter) for activeMinutes-inkrementet per økt – speiler
// deltagrensen i firestore.rules. 600 min = 10 timer, en romslig tak for én
// enkelt treningsøkt (jf. overview sin 14400s/4t-grense for totalSecondsTrained).
const MAX_ACTIVE_MINUTES_PER_SESSION = 600;

/**
 * Sender én økts ytelsesrapport (A5: long tasks/treningsminutt + faseoverganger-
 * lydavvik) til global_stats/perf, anonymt og samtykke-gatet som resten av
 * telemetrien. Skriveformen (increment-only, kjent felt-allowlist) speiler den
 * herdede firestore.rules — se `match /global_stats/perf` der.
 *
 * `longTaskSessions` og `activeMinutes` telles KUN når
 * `report.longTaskMonitoringSupported` er true. Uten dette skjevfordeler
 * enheter uten long-task-støtte (iOS Safari, trolig en stor andel av
 * enhetsparken) metrikken usynlig optimistisk: de ville ha bidratt en
 * strukturell 0 til telleren (longTasks) mens de fortsatt telte med i en
 * nevner (sessions) beregnet på ALLE økter. Ved å telle nevneren
 * (`longTaskSessions`/`activeMinutes`) kun for økter som faktisk KUNNE
 * observere long tasks, dekker teller og nevner samme populasjon –
 * `longTasksPerMinute`-scorekortmetrikken må divideres med
 * `longTaskSessions`/`activeMinutes`, ikke med `sessions`.
 */
export async function recordPerfTelemetry(report: PerfSessionReport): Promise<void> {
  if (!getTelemetryConsent() || !db) {
    return;
  }

  try {
    const perfRef = doc(db, 'global_stats', 'perf');
    const bucketField = deviationBucketField(report.audioDeviationP95Ms);

    const payload: Record<string, FieldValue> = {
      sessions: increment(1),
      // Long tasks telles alltid som heltall (increment krever et numerisk delta,
      // og brøkdels-hendelser gir ingen mening for en tellevariabel)
      longTasks: increment(Math.max(0, Math.round(report.longTaskCount))),
      lastUpdated: serverTimestamp(),
    };
    if (report.longTaskMonitoringSupported) {
      payload.longTaskSessions = increment(1);
      payload.activeMinutes = increment(
        Math.min(MAX_ACTIVE_MINUTES_PER_SESSION, Math.max(0, Math.round(report.durationMinutes)))
      );
    }
    if (report.audioSampleCount > 0) {
      payload.audioDeviationSamples = increment(report.audioSampleCount);
    }
    if (bucketField) {
      payload[bucketField] = increment(1);
    }

    await setDoc(perfRef, payload, { merge: true });
  } catch (err) {
    // Ytelsestelemetri skal aldri feile eller forstyrre kjerneopplevelsen
    console.warn('Ytelsestelemetri ble hoppet over:', err);
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

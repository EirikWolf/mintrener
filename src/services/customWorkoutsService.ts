import { WorkoutTemplate, IntervalItem } from '../types/workout';
import { WorkoutTemplateSchema, filterValidListItems } from '../schemas/workoutSchema';
import { showErrorToast } from './errorToastService';
import { db } from './firebase';
import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';

const LOCAL_STORAGE_KEY = 'mintrener_custom_workouts';

/**
 * Beregner total varighet for en økt i sekunder (uten unødvendig pause etter aller siste øvelse)
 */
export function calculateWorkoutDuration(workout: WorkoutTemplate): number {
  if (workout.items.length === 0) return workout.prepareDurationSeconds;
  let total = workout.prepareDurationSeconds;
  for (let r = 0; r < workout.rounds; r++) {
    for (let i = 0; i < workout.items.length; i++) {
      const item = workout.items[i];
      total += item.workDurationSeconds;
      const isLastInWorkout = r === workout.rounds - 1 && i === workout.items.length - 1;
      if (!isLastInWorkout) {
        total += item.restDurationSeconds;
      }
    }
    if (r < workout.rounds - 1) {
      total += workout.roundRestDurationSeconds;
    }
  }
  return total;
}

/**
 * Anvender samme arbeids- og pausetid på alle øvelser i en liste
 */
export function applyUniformDurations(
  items: IntervalItem[],
  workSeconds: number,
  restSeconds: number
): IntervalItem[] {
  return items.map((item) => ({
    ...item,
    workDurationSeconds: workSeconds,
    restDurationSeconds: restSeconds,
  }));
}

/**
 * Henter lokale egendefinerte økter fra localStorage
 */
export function getLocalCustomWorkouts(): WorkoutTemplate[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];

    // Skjemavalidering (revisjon § 2.4): behold gyldige økter, forkast resten
    // — korrupt lagring skal aldri kræsje appen eller lekke inn i timeren.
    const listed = filterValidListItems(WorkoutTemplateSchema, JSON.parse(raw));
    if (listed === null) {
      console.warn('Lokale økter i localStorage hadde feil form — bruker tom liste.');
      return [];
    }
    if (listed.dropped > 0) {
      console.warn(`Forkastet ${listed.dropped} ugyldig(e) lokale økt(er) under skjemavalidering.`);
    }
    return listed.valid;
  } catch (err) {
    console.warn('Kunne ikke hente lokale økter:', err);
    return [];
  }
}

/**
 * Lagrer egendefinert økt lokalt og til Firestore hvis innlogget
 */
export async function saveCustomWorkout(
  workout: WorkoutTemplate,
  userId?: string | null
): Promise<void> {
  // 1. Lagre lokalt i localStorage
  try {
    const localList = getLocalCustomWorkouts();
    const existingIdx = localList.findIndex((w) => w.id === workout.id);
    if (existingIdx >= 0) {
      localList[existingIdx] = workout;
    } else {
      localList.unshift(workout);
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localList));
  } catch (err) {
    // Feil-toast (revisjon § 2.4): brukeren skal få vite at malen IKKE ble lagret
    console.warn('Kunne ikke lagre mal lokalt:', err);
    showErrorToast('Kunne ikke lagre malen på enheten. Prøv igjen.');
    throw err;
  }

  // 2. Synk til Firestore hvis bruker er innlogget
  if (userId) {
    try {
      const docRef = doc(db, 'users', userId, 'workouts', workout.id);
      await setDoc(docRef, {
        ...workout,
        userId,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Kunne ikke synke økt til Firestore:', err);
      showErrorToast('Malen ble lagret på enheten, men kunne ikke synkes til skyen.');
    }
  }
}

/**
 * Henter alle egendefinerte økter (både fra Firestore og lokal cache)
 */
export async function fetchCustomWorkouts(userId?: string | null): Promise<WorkoutTemplate[]> {
  const local = getLocalCustomWorkouts();

  if (!userId) {
    return local;
  }

  try {
    const ref = collection(db, 'users', userId, 'workouts');
    const snap = await getDocs(ref);
    const remote = snap.docs.map((d) => d.data() as WorkoutTemplate);

    // Slå sammen unike økter
    const map = new Map<string, WorkoutTemplate>();
    local.forEach((w) => map.set(w.id, w));
    remote.forEach((w) => map.set(w.id, w));

    const merged = Array.from(map.values());
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
    return merged;
  } catch (err) {
    console.warn('Kunne ikke hente økter fra Firestore, bruker lokal cache:', err);
    return local;
  }
}

/**
 * Sletter en egendefinert økt
 */
export async function deleteCustomWorkout(
  workoutId: string,
  userId?: string | null
): Promise<void> {
  // 1. Slett lokalt
  const localList = getLocalCustomWorkouts().filter((w) => w.id !== workoutId);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localList));

  // 2. Slett fra Firestore hvis innlogget
  if (userId) {
    try {
      const docRef = doc(db, 'users', userId, 'workouts', workoutId);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn('Kunne ikke slette økt fra Firestore:', err);
    }
  }
}

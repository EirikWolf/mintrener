import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { ExerciseItem } from '../schemas/exerciseSchema';

export interface CustomExerciseItem extends ExerciseItem {
  isCustom?: boolean;
  defaultDurationSeconds?: number;
  userId?: string;
  createdAt?: string;
}

const LOCAL_CUSTOM_EXERCISES_KEY = 'mintrener_local_custom_exercises';

export function getLocalCustomExercises(): CustomExerciseItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_CUSTOM_EXERCISES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function saveLocalCustomExercise(item: CustomExerciseItem): void {
  try {
    const list = getLocalCustomExercises();
    const existingIndex = list.findIndex((e) => e.id === item.id);
    if (existingIndex >= 0) {
      list[existingIndex] = item;
    } else {
      list.unshift(item);
    }
    localStorage.setItem(LOCAL_CUSTOM_EXERCISES_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('Kunne ikke lagre lokal egendefinert øvelse:', err);
  }
}

export function deleteLocalCustomExercise(id: string): void {
  try {
    const list = getLocalCustomExercises().filter((e) => e.id !== id);
    localStorage.setItem(LOCAL_CUSTOM_EXERCISES_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('Kunne ikke slette lokal egendefinert øvelse:', err);
  }
}

/**
 * Henter alle egendefinerte øvelser (fra Firestore for innlogget bruker, og lokalt)
 */
export async function fetchCustomExercises(userId?: string | null): Promise<CustomExerciseItem[]> {
  const localList = getLocalCustomExercises();

  if (!userId) {
    return localList;
  }

  try {
    const colRef = collection(db, 'users', userId, 'custom_exercises');
    const snapshot = await getDocs(colRef);
    const firestoreList: CustomExerciseItem[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as CustomExerciseItem;
      firestoreList.push({ ...data, id: docSnap.id });
    });

    // Flett sammen lokale og Firestore-øvelser
    const combinedMap = new Map<string, CustomExerciseItem>();
    localList.forEach((e) => combinedMap.set(e.id, e));
    firestoreList.forEach((e) => combinedMap.set(e.id, e));

    const combined = Array.from(combinedMap.values());
    localStorage.setItem(LOCAL_CUSTOM_EXERCISES_KEY, JSON.stringify(combined));
    return combined;
  } catch (err) {
    console.warn('Kunne ikke hente øvelser fra Firestore:', err);
    return localList;
  }
}

/**
 * Oppretter eller oppdaterer en egendefinert øvelse
 */
export async function saveCustomExercise(
  userId: string | undefined | null,
  exerciseData: Omit<CustomExerciseItem, 'isCustom' | 'bildeStatus'> & { id?: string }
): Promise<CustomExerciseItem> {
  const id = exerciseData.id || `custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const item: CustomExerciseItem = {
    ...exerciseData,
    id,
    isCustom: true,
    bildeStatus: 'mangler',
    userId: userId || 'anonymous',
    createdAt: new Date().toISOString(),
  };

  // 1. Lagre lokalt
  saveLocalCustomExercise(item);

  // 2. Lagre i Firestore hvis innlogget
  if (userId) {
    try {
      const docRef = doc(db, 'users', userId, 'custom_exercises', id);
      await setDoc(docRef, {
        ...item,
        timestamp: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Kunne ikke lagre øvelse til Firestore:', err);
    }
  }

  return item;
}

/**
 * Sletter en egendefinert øvelse
 */
export async function deleteCustomExercise(userId: string | undefined | null, exerciseId: string): Promise<void> {
  deleteLocalCustomExercise(exerciseId);

  if (userId) {
    try {
      const docRef = doc(db, 'users', userId, 'custom_exercises', exerciseId);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn('Kunne ikke slette øvelse fra Firestore:', err);
    }
  }
}

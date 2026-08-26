import { db } from './firebase';
import { collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';

export interface StrengthSet {
  setNumber: number;
  reps: number;
  weightKg: number;
  completed: boolean;
}

export interface StrengthWorkoutLog {
  id: string;
  userId: string;
  exerciseId: string;
  exerciseName: string;
  sets: StrengthSet[];
  estimatedOneRepMaxKg?: number;
  restDurationSeconds: number;
  completedAt: string; // ISO string
}

const LOCAL_STRENGTH_KEY = 'mintrener_local_strength_logs';

/**
 * Beregner estimert 1RM (One Rep Max) ved bruk av Epleys formel: 1RM = Vekt * (1 + Reps / 30)
 */
export function calculateOneRepMax(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0;
  if (reps === 1) return weightKg;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

/**
 * Lagrer en styrkeøkt-logg
 */
export async function saveStrengthLog(
  userId: string | undefined | null,
  logData: Omit<StrengthWorkoutLog, 'id' | 'userId' | 'completedAt'>
): Promise<string> {
  const newLog: StrengthWorkoutLog = {
    ...logData,
    id: `strength-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    userId: userId || 'anonymous',
    completedAt: new Date().toISOString(),
  };

  // 1. Lagre lokalt
  try {
    const raw = localStorage.getItem(LOCAL_STRENGTH_KEY);
    const list: StrengthWorkoutLog[] = raw ? JSON.parse(raw) : [];
    list.unshift(newLog);
    localStorage.setItem(LOCAL_STRENGTH_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('Kunne ikke lagre lokal styrkelogg:', err);
  }

  // 2. Lagre i Firestore
  if (userId) {
    try {
      const colRef = collection(db, 'users', userId, 'strength_logs');
      const docRef = await addDoc(colRef, {
        ...newLog,
        timestamp: serverTimestamp(),
      });
      return docRef.id;
    } catch (err) {
      console.warn('Kunne ikke synke styrkelogg til Firestore:', err);
    }
  }

  return newLog.id;
}

/**
 * Henter forrige loggførte styrkesett for en gitt øvelse
 */
export async function getLastStrengthLogForExercise(
  userId: string | undefined | null,
  exerciseId: string
): Promise<StrengthWorkoutLog | null> {
  // Prøv lokalt først
  try {
    const raw = localStorage.getItem(LOCAL_STRENGTH_KEY);
    if (raw) {
      const list: StrengthWorkoutLog[] = JSON.parse(raw);
      const match = list.find((it) => it.exerciseId === exerciseId);
      if (match) return match;
    }
  } catch (err) {
    console.warn('Feil ved lesing av lokal styrkelogg:', err);
  }

  // Hvis innlogget og ikke funnet lokalt, hent fra Firestore
  if (userId) {
    try {
      const colRef = collection(db, 'users', userId, 'strength_logs');
      const q = query(colRef, orderBy('completedAt', 'desc'), limit(10));
      const snap = await getDocs(q);
      const logs = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as StrengthWorkoutLog));
      return logs.find((l) => l.exerciseId === exerciseId) || null;
    } catch (err) {
      console.warn('Kunne ikke hente forrige styrkelogg fra Firestore:', err);
    }
  }

  return null;
}

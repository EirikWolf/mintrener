import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const LOCAL_PR_KEY = 'mintrener_personal_records';

export interface ExercisePR {
  exerciseId: string;
  exerciseName: string;
  bestSeconds: number;
  achievedAt: string;
}

export async function getPersonalRecord(userId: string | null | undefined, exerciseId: string): Promise<ExercisePR | null> {
  // 1. Sjekk lokalt
  try {
    const raw = localStorage.getItem(LOCAL_PR_KEY);
    if (raw) {
      const prs: Record<string, ExercisePR> = JSON.parse(raw);
      if (prs[exerciseId]) return prs[exerciseId];
    }
  } catch (err) {
    console.warn('Feil ved lesing av lokal PR:', err);
  }

  // 2. Sjekk Firestore hvis innlogget
  if (userId) {
    try {
      const snap = await getDoc(doc(db, 'users', userId, 'personal_records', exerciseId));
      if (snap.exists()) {
        return snap.data() as ExercisePR;
      }
    } catch (err) {
      console.warn('Feil ved henting av PR fra Firestore:', err);
    }
  }

  return null;
}

export async function savePersonalRecord(
  userId: string | null | undefined,
  exerciseId: string,
  exerciseName: string,
  seconds: number
): Promise<{ isNewPr: boolean; previousBest: number }> {
  const currentPr = await getPersonalRecord(userId, exerciseId);
  const previousBest = currentPr ? currentPr.bestSeconds : 0;

  if (seconds > previousBest) {
    const newPr: ExercisePR = {
      exerciseId,
      exerciseName,
      bestSeconds: seconds,
      achievedAt: new Date().toISOString(),
    };

    // 1. Lagre lokalt
    try {
      const raw = localStorage.getItem(LOCAL_PR_KEY);
      const prs: Record<string, ExercisePR> = raw ? JSON.parse(raw) : {};
      prs[exerciseId] = newPr;
      localStorage.setItem(LOCAL_PR_KEY, JSON.stringify(prs));
    } catch (err) {
      console.warn('Feil ved lagring av lokal PR:', err);
    }

    // 2. Lagre i Firestore
    if (userId) {
      try {
        await setDoc(doc(db, 'users', userId, 'personal_records', exerciseId), newPr);
      } catch (err) {
        console.warn('Feil ved synking av PR til Firestore:', err);
      }
    }

    return { isNewPr: true, previousBest };
  }

  return { isNewPr: false, previousBest };
}

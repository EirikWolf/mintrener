import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  query,
  orderBy,
  getDocs,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db } from './firebase';
import { UserProfile, CompletedWorkoutLog, UserSettings } from '../types/models';

const DEFAULT_SETTINGS: UserSettings = {
  soundEnabled: true,
  vibrateEnabled: true,
  wakeLockEnabled: true,
  defaultPrepareSeconds: 10,
};

/**
 * Synkroniserer Google User med Firestore /users/{uid}
 */
export async function syncUserProfile(user: User): Promise<UserProfile> {
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    const data = snap.data() as UserProfile;
    // Oppdater sist innlogget
    await setDoc(userRef, { lastLoginAt: new Date().toISOString() }, { merge: true });
    return { ...data, lastLoginAt: new Date().toISOString() };
  }

  // Ny bruker
  const newProfile: UserProfile = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    settings: DEFAULT_SETTINGS,
  };

  await setDoc(userRef, newProfile);
  return newProfile;
}

const LOCAL_HISTORY_KEY = 'mintrener_local_workout_history';

/**
 * Lagrer logg over en fullført treningsøkt (både lokalt og i Firestore)
 */
export async function saveCompletedWorkout(
  userId: string | undefined | null,
  logData: Omit<CompletedWorkoutLog, 'id' | 'userId' | 'completedAt'>
): Promise<string> {
  const newLog: CompletedWorkoutLog = {
    ...logData,
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    userId: userId || 'anonymous',
    completedAt: new Date().toISOString(),
  };

  // 1. Lagre lokalt
  try {
    const raw = localStorage.getItem(LOCAL_HISTORY_KEY);
    const list: CompletedWorkoutLog[] = raw ? JSON.parse(raw) : [];
    list.unshift(newLog);
    localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('Kunne ikke lagre lokal historikk:', err);
  }

  // 2. Lagre i Firestore hvis innlogget
  if (userId) {
    try {
      const logsRef = collection(db, 'users', userId, 'history');
      const docRef = await addDoc(logsRef, {
        ...newLog,
        timestamp: serverTimestamp(),
      });
      return docRef.id;
    } catch (err) {
      console.warn('Kunne ikke synke historikk til Firestore:', err);
    }
  }

  return newLog.id;
}

/**
 * Henter treningshistorikk for en bruker (fra Firestore og lokal cache)
 */
export async function getUserWorkoutHistory(userId?: string | null): Promise<CompletedWorkoutLog[]> {
  let localList: CompletedWorkoutLog[] = [];
  try {
    const raw = localStorage.getItem(LOCAL_HISTORY_KEY);
    if (raw) {
      localList = JSON.parse(raw);
    }
  } catch {}

  if (!userId) {
    return localList;
  }

  try {
    const logsRef = collection(db, 'users', userId, 'history');
    const q = query(logsRef, orderBy('completedAt', 'desc'));
    const snap = await getDocs(q);
    const remote = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as CompletedWorkoutLog[];

    // Slå sammen unike logger
    const map = new Map<string, CompletedWorkoutLog>();
    localList.forEach((l) => map.set(l.id, l));
    remote.forEach((l) => map.set(l.id, l));

    const merged = Array.from(map.values()).sort(
      (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    );
    localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(merged));
    return merged;
  } catch (err) {
    console.warn('Kunne ikke hente historikk fra Firestore, bruker lokal:', err);
    return localList;
  }
}

/**
 * Sletter alle data for en bruker (GDPR / Personvernkrav fra kapittel 5)
 */
export async function deleteUserData(userId: string): Promise<void> {
  // 1. Slett historikk
  const historyRef = collection(db, 'users', userId, 'history');
  const historySnap = await getDocs(historyRef);
  for (const d of historySnap.docs) {
    await deleteDoc(d.ref);
  }

  // 2. Slett egne maler
  const workoutsRef = collection(db, 'users', userId, 'workouts');
  const workoutsSnap = await getDocs(workoutsRef);
  for (const d of workoutsSnap.docs) {
    await deleteDoc(d.ref);
  }

  // 3. Slett brukerprofil
  const userRef = doc(db, 'users', userId);
  await deleteDoc(userRef);
}

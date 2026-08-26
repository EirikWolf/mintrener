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

/**
 * Lagrer logg over en fullført treningsøkt
 */
export async function saveCompletedWorkout(
  userId: string,
  logData: Omit<CompletedWorkoutLog, 'id' | 'userId' | 'completedAt'>
): Promise<string> {
  const logsRef = collection(db, 'users', userId, 'history');
  const docRef = await addDoc(logsRef, {
    ...logData,
    userId,
    completedAt: new Date().toISOString(),
    timestamp: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Henter treningshistorikk for en bruker
 */
export async function getUserWorkoutHistory(userId: string): Promise<CompletedWorkoutLog[]> {
  try {
    const logsRef = collection(db, 'users', userId, 'history');
    const q = query(logsRef, orderBy('completedAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as CompletedWorkoutLog[];
  } catch (err) {
    console.warn('Kunne ikke hente historikk:', err);
    return [];
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

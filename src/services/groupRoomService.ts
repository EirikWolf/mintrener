import { auth, db } from './firebase';
import { signInAnonymously } from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { WorkoutTemplate } from '../types/workout';

export interface GroupRoomState {
  roomId: string;
  hostUid: string;
  hostName: string;
  workout: WorkoutTemplate;
  status: 'waiting' | 'running' | 'paused' | 'completed';
  startTimestamp?: number | null;
  serverSyncTime?: number | null;
  participantCount: number;
  createdAt: string;
}

const ROOM_CODE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Genererer en 6-tegns alfanumerisk romkode (f.eks. "K7M9P2")
 */
export function generateRoomCode(): string {
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += ROOM_CODE_CHARS.charAt(Math.floor(Math.random() * ROOM_CODE_CHARS.length));
  }
  return result;
}

/**
 * Oppretter et nytt grupperom i Firestore med kollisjonssjekk og auth-garanti
 */
export async function createGroupRoom(
  hostUid: string,
  hostName: string,
  workout: WorkoutTemplate
): Promise<string> {
  // Sørg for at verten har en gyldig Firebase Auth UID
  let currentUid = hostUid;
  if (!auth.currentUser) {
    const anon = await signInAnonymously(auth);
    currentUid = anon.user.uid;
  } else {
    currentUid = auth.currentUser.uid;
  }

  // Generer romkode med kollisjonssjekk
  let roomId = generateRoomCode();
  let attempts = 0;
  while (attempts < 5) {
    const existing = await getDoc(doc(db, 'rooms', roomId));
    if (!existing.exists()) break;
    roomId = generateRoomCode();
    attempts++;
  }

  const roomRef = doc(db, 'rooms', roomId);

  const roomState: GroupRoomState = {
    roomId,
    hostUid: currentUid,
    hostName: hostName || 'Instruktør',
    workout,
    status: 'waiting',
    participantCount: 1,
    createdAt: new Date().toISOString(),
  };

  await setDoc(roomRef, {
    ...roomState,
    timestamp: serverTimestamp(),
  });

  return roomId;
}

/**
 * Bli med i et eksisterende grupperom
 */
export async function joinGroupRoom(roomId: string): Promise<GroupRoomState | null> {
  const cleanCode = roomId.trim().toUpperCase();
  const roomRef = doc(db, 'rooms', cleanCode);
  const snap = await getDoc(roomRef);

  if (!snap.exists()) {
    return null;
  }

  // Øk deltakerantallet
  await updateDoc(roomRef, {
    participantCount: increment(1),
  }).catch(() => {});

  return snap.data() as GroupRoomState;
}

/**
 * Lytter til sanntidsendringer i rommet (start, pause, fremdrift)
 */
export function subscribeToGroupRoom(
  roomId: string,
  onUpdate: (state: GroupRoomState | null) => void
): () => void {
  const roomRef = doc(db, 'rooms', roomId);
  return onSnapshot(roomRef, (snap) => {
    if (snap.exists()) {
      onUpdate(snap.data() as GroupRoomState);
    } else {
      onUpdate(null);
    }
  });
}

/**
 * Vert starter timeren for alle i rommet
 */
export async function startGroupWorkout(roomId: string): Promise<void> {
  const roomRef = doc(db, 'rooms', roomId);
  await updateDoc(roomRef, {
    status: 'running',
    startTimestamp: Date.now(),
  });
}

/**
 * Vert pauser timeren for alle i rommet
 */
export async function pauseGroupWorkout(roomId: string): Promise<void> {
  const roomRef = doc(db, 'rooms', roomId);
  await updateDoc(roomRef, {
    status: 'paused',
  });
}

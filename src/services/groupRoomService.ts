import { db } from './firebase';
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

/**
 * Genererer en tilfeldig 4-sifret romkode (f.eks. "8492")
 */
export function generateRoomCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Oppretter et nytt grupperom i Firestore
 */
export async function createGroupRoom(
  hostUid: string,
  hostName: string,
  workout: WorkoutTemplate
): Promise<string> {
  const roomId = generateRoomCode();
  const roomRef = doc(db, 'rooms', roomId);

  const roomState: GroupRoomState = {
    roomId,
    hostUid,
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

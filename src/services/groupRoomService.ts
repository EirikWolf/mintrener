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
import { estimateServerClockOffset, getServerNow } from './clockSyncService';

// Hvor lenge (ms) fram i tid verten legger den klokkesynkroniserte starten,
// slik at alle klienter rekker å motta oppdateringen og telle ned til samme øyeblikk.
const START_LEAD_TIME_MS = 3000;

export interface GroupRoomState {
  roomId: string;
  hostUid: string;
  hostName: string;
  workout: WorkoutTemplate;
  status: 'waiting' | 'running' | 'paused' | 'completed';
  startTimestamp?: number | null;
  /** Serverklokke-tidspunkt (ms) for felles start. Se clockSyncService for klokkesynkroniseringen. */
  startAtServerMs?: number | null;
  serverSyncTime?: number | null;
  participantCount: number;
  createdAt: string;
}

const ROOM_CODE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Genererer en 6-tegns alfanumerisk romkode (f.eks. "K7M9P2")
 *
 * Bruker crypto.getRandomValues i stedet for Math.random() (revisjon §5.1):
 * romkoden er eneste adgangskontroll til rommet, så den må være
 * uforutsigbar. Alfabetet har 32 tegn og 256 % 32 == 0, så en enkel
 * modulo over tilfeldige bytes er uniform uten forkastningssampling.
 */
export function generateRoomCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let result = '';
  for (const byte of bytes) {
    result += ROOM_CODE_CHARS.charAt(byte % ROOM_CODE_CHARS.length);
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
  // Sikkerhetsreglene krever nå auth for å øke participantCount, så gi
  // deltakeren samme anonyme innloggingsgaranti som createGroupRoom gir
  // verten. Feiler innloggingen (f.eks. offline) leser vi likevel rommet —
  // deltakeren kan følge økten selv om telleren ikke ble oppdatert.
  if (!auth.currentUser) {
    await signInAnonymously(auth).catch(() => {});
  }

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
 * Vert starter timeren for alle i rommet.
 *
 * Skriver `startAtServerMs` — et klokkesynkronisert starttidspunkt (serverklokke + ledetid) —
 * i tillegg til det gamle `startTimestamp` (vertens lokale klokke, beholdt for
 * bakoverkompatibilitet med eldre klienter). `estimateServerClockOffset()` er cachet
 * etter første måling, så dette kallet er billig i praksis.
 */
export async function startGroupWorkout(roomId: string): Promise<void> {
  await estimateServerClockOffset();

  const roomRef = doc(db, 'rooms', roomId);
  await updateDoc(roomRef, {
    status: 'running',
    startTimestamp: Date.now(),
    startAtServerMs: getServerNow() + START_LEAD_TIME_MS,
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

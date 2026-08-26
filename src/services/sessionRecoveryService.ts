import { WorkoutTemplate, IntervalPhase } from '../types/workout';

export interface InterruptedSession {
  workout: WorkoutTemplate;
  phase: IntervalPhase;
  currentRound: number;
  currentItemIndex: number;
  totalElapsedSeconds: number;
  savedAt: number; // timestamp
}

const STORAGE_KEY = 'mintrener_interrupted_session';
const MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2 timer

export function saveInterruptedSession(session: Omit<InterruptedSession, 'savedAt'>): void {
  try {
    const data: InterruptedSession = {
      ...session,
      savedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('Kunne ikke lagre avbrutt økt:', err);
  }
}

export function getInterruptedSession(): InterruptedSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session: InterruptedSession = JSON.parse(raw);
    const age = Date.now() - session.savedAt;
    if (age > MAX_AGE_MS) {
      clearInterruptedSession();
      return null;
    }
    return session;
  } catch (err) {
    console.warn('Kunne ikke lese avbrutt økt:', err);
    return null;
  }
}

export function clearInterruptedSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('Kunne ikke slette avbrutt økt:', err);
  }
}

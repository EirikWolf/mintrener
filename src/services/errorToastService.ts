/**
 * Global feil-toast (revisjon § 2.4): rammeverksfri butikk slik at både
 * tjenester (uten React-kontekst) og komponenter kan melde feil til brukeren.
 * Én toast av gangen — siste melding vinner. UI-et abonnerer via
 * useSyncExternalStore i <ErrorToast />.
 */

export type ToastType = 'error' | 'success' | 'info';

export interface ErrorToastState {
  /** Ny identitet per visning slik at UI kan restarte auto-dismiss-timeren */
  id: number;
  message: string;
  type?: ToastType;
}

type Listener = () => void;

let current: ErrorToastState | null = null;
let nextId = 1;
const listeners = new Set<Listener>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

export function showToast(message: string, type: ToastType = 'error'): void {
  current = { id: nextId++, message, type };
  notify();
}

export function showErrorToast(message: string): void {
  showToast(message, 'error');
}

export function showSuccessToast(message: string): void {
  showToast(message, 'success');
}

export function dismissErrorToast(): void {
  if (current === null) return;
  current = null;
  notify();
}

export function getErrorToast(): ErrorToastState | null {
  return current;
}

export function subscribeErrorToast(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

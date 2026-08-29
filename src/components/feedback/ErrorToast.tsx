import { useEffect, useSyncExternalStore } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import {
  subscribeErrorToast,
  getErrorToast,
  dismissErrorToast,
} from '../../services/errorToastService';

const AUTO_DISMISS_MS = 6000;

/**
 * Global feil-toast (revisjon § 2.4). Live-regionen er alltid montert slik at
 * skjermlesere annonserer meldinger som settes inn — også de som oppstår før
 * første render (f.eks. avvist delingslenke ved oppstart, som plukkes opp av
 * useSyncExternalStore ved mount).
 */
export function ErrorToast() {
  const toast = useSyncExternalStore(subscribeErrorToast, getErrorToast);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(dismissErrorToast, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <div
      aria-live="assertive"
      className="fixed inset-x-0 top-3 z-[100] flex justify-center px-4 pointer-events-none"
    >
      {toast && (
        <div
          role="alert"
          className="pointer-events-auto flex w-full max-w-md items-start gap-2.5 rounded-xl border border-red-500/50 bg-red-950/95 px-3.5 py-2.5 text-red-100 shadow-xl backdrop-blur-sm"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" aria-hidden="true" />
          <p className="flex-1 text-sm font-medium leading-snug">{toast.message}</p>
          <button
            type="button"
            onClick={dismissErrorToast}
            aria-label="Lukk feilmelding"
            className="shrink-0 rounded-md p-0.5 text-red-300 transition-colors hover:bg-red-900/70 hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}

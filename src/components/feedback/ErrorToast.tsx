import { useEffect, useSyncExternalStore } from 'react';
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import {
  subscribeErrorToast,
  getErrorToast,
  dismissErrorToast,
} from '../../services/errorToastService';

const AUTO_DISMISS_MS = 6000;

/**
 * Global toast (revisjon C): støtter feil, suksess og info.
 * Live-regionen er alltid montert slik at skjermlesere annonserer meldinger.
 */
export function ErrorToast() {
  const toast = useSyncExternalStore(subscribeErrorToast, getErrorToast);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(dismissErrorToast, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  const type = toast?.type || 'error';

  return (
    <div
      aria-live="assertive"
      className="fixed inset-x-0 top-3 z-[100] flex justify-center px-4 pointer-events-none"
    >
      {toast && (
        <div
          role="alert"
          className={`pointer-events-auto flex w-full max-w-md items-start gap-2.5 rounded-xl border px-3.5 py-2.5 shadow-xl backdrop-blur-sm ${
            type === 'success'
              ? 'border-emerald-500/50 bg-emerald-950/95 text-emerald-100'
              : type === 'info'
              ? 'border-blue-500/50 bg-blue-950/95 text-blue-100'
              : 'border-red-500/50 bg-red-950/95 text-red-100'
          }`}
        >
          {type === 'success' ? (
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
          ) : type === 'info' ? (
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" aria-hidden="true" />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" aria-hidden="true" />
          )}
          <p className="flex-1 text-sm font-medium leading-snug">{toast.message}</p>
          <button
            type="button"
            onClick={dismissErrorToast}
            aria-label={type === 'error' ? 'Lukk feilmelding' : 'Lukk melding'}
            className={`shrink-0 rounded-md p-0.5 transition-colors ${
              type === 'success'
                ? 'text-emerald-300 hover:bg-emerald-900/70 hover:text-white'
                : type === 'info'
                ? 'text-blue-300 hover:bg-blue-900/70 hover:text-white'
                : 'text-red-300 hover:bg-red-900/70 hover:text-white'
            }`}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}

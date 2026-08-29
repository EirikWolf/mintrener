import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * B6.3 (revisjon § 4.4): dimme-modus for batterisparing under økt.
 *
 * OLED-panelets forbruk skalerer nær lineært med luminans; et rent CSS
 * brightness(0.6)-filter etter 10 s uten interaksjon gir estimert 20-30 %
 * lengre øktkapasitet uten funksjonstap. Hooken eier KUN timer-tilstanden —
 * selve filteret settes av konsumenten, slik at ingen informasjon skjules
 * (UU-rammen: kun dempet lysstyrke, aldri skjuling).
 *
 * Vekkes av: pointer/touch (pointerdown dekker begge), tastatur, og
 * konsumentens wake() — TimerDisplay kaller den ved faseovergang og i fasens
 * siste 5 sekunder (§ 4.4: "full lysstyrke ved fasebytte og siste 5 sekunder"),
 * så skjermen alltid er lys når en ny øvelse starter.
 */
export const IDLE_DIM_TIMEOUT_MS = 10_000;

export function useIdleDim(
  active: boolean,
  timeoutMs: number = IDLE_DIM_TIMEOUT_MS
): { isDimmed: boolean; wake: () => void } {
  const [isDimmed, setIsDimmed] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  const clearPending = () => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const wake = useCallback(() => {
    setIsDimmed(false);
    if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    timeoutRef.current = activeRef.current
      ? setTimeout(() => setIsDimmed(true), timeoutMs)
      : null;
  }, [timeoutMs]);

  useEffect(() => {
    if (!active) {
      setIsDimmed(false);
      clearPending();
      return;
    }

    wake();
    const handleInteraction = () => wake();
    window.addEventListener('pointerdown', handleInteraction, { passive: true });
    window.addEventListener('keydown', handleInteraction);

    return () => {
      window.removeEventListener('pointerdown', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      clearPending();
    };
  }, [active, wake]);

  return { isDimmed, wake };
}

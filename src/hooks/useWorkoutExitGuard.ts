import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Vakt mot at tilbakeknappen dreper en pågående økt.
 *
 * Appen er tilstandsbasert, ikke URL-rutet: når økten starter skifter skjermen
 * fullstendig form, men adressen står stille. For brukeren ser det ut som en ny
 * side, og tilbake-gesten på Android er den naturlige veien ut — den forlot hele
 * nettsiden og tok økten med seg.
 *
 * Vakten legger én oppføring i historikken mens økten varer. Tilbake-trykket
 * konsumerer den i stedet for å forlate appen, og brukeren får spørsmålet.
 *
 * Økten pauses bevisst IKKE mens spørsmålet står: et feiltrykk skal ikke koste
 * deg rytmen midt i en planke, og feiltrykket er hele grunnen til at vakten
 * finnes.
 */

interface ExitGuardOptions {
  /** Sant når en økt kjører eller står i pause — altså når noe kan gå tapt. */
  isActive: boolean;
  /** Kalles når brukeren har bekreftet at økten skal avsluttes. */
  onConfirmExit: () => void;
}

interface ExitGuard {
  isConfirming: boolean;
  confirmExit: () => void;
  cancelExit: () => void;
}

const GUARD_STATE = { mintrenerWorkoutGuard: true } as const;

export function useWorkoutExitGuard({ isActive, onConfirmExit }: ExitGuardOptions): ExitGuard {
  const [isConfirming, setIsConfirming] = useState(false);

  // Om vår egen oppføring fortsatt ligger på stakken. Uten dette ville
  // opprydningen kunne navigere brukeren ut av appen i stedet for å fjerne
  // vakten — historikken er delt, og vi eier bare det vi selv la inn.
  const guardOnStack = useRef(false);

  useEffect(() => {
    if (!isActive) return;

    window.history.pushState(GUARD_STATE, '');
    guardOnStack.current = true;

    const handlePopState = () => {
      // Trykket spiste vakten. Legg inn en ny med det samme, ellers forlater
      // neste tilbake-trykk appen mens spørsmålet fortsatt står på skjermen.
      window.history.pushState(GUARD_STATE, '');
      guardOnStack.current = true;
      setIsConfirming(true);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      // Økten er over. Ligger vakten igjen, står den mellom brukeren og
      // utgangen — ett ekstra tilbake-trykk per fullførte økt.
      if (guardOnStack.current) {
        guardOnStack.current = false;
        window.history.back();
      }
      setIsConfirming(false);
    };
  }, [isActive]);

  const cancelExit = useCallback(() => setIsConfirming(false), []);

  const confirmExit = useCallback(() => {
    setIsConfirming(false);
    // Selve opprydningen av historikken skjer i effektens cleanup når isActive
    // slår om — ett sted å rydde, uansett hvordan økten tok slutt.
    onConfirmExit();
  }, [onConfirmExit]);

  return { isConfirming, confirmExit, cancelExit };
}

import { useCallback, useEffect, useRef } from 'react';

/**
 * Lar tilbakeknappen gå til forsiden i stedet for ut av appen.
 *
 * `useWorkoutExitGuard` dekker bare tiden en økt kjører eller står i pause. Står
 * du på Program, Øvelser eller Historikk, finnes ingen historikk-oppføring, og
 * tilbake forlater hele nettsiden. Det var halve problemet som sto igjen da
 * tilbakeknappen ble meldt fikset.
 *
 * Forskjellen fra vakten under en økt er bevisst: her spør vi ikke. Å gå fra
 * Historikk til forsiden er nettopp det brukeren ber om, og en dialog ville
 * vært i veien. Under en økt er det derimot noe å miste.
 */

interface TabBackOptions {
  /** Sant når brukeren er på en annen fane enn forsiden. */
  isAway: boolean;
  /** Kalles når tilbake skal føre til forsiden. */
  onBack: () => void;
  /**
   * Sett når en økt eier tilbakeknappen. To lyttere som begge legger inn
   * oppføringer ville kjempet om samme trykk.
   */
  suspendert?: boolean;
}

const TAB_STATE = { mintrenerTab: true } as const;

export function useTabBackNavigation({ isAway, onBack, suspendert = false }: TabBackOptions): void {
  // Om vår egen oppføring ligger på stakken. Historikken er delt, og vi eier
  // bare det vi selv la inn.
  const entryOnStack = useRef(false);
  // history.back() utløser popstate. Uten dette ville opprydningen sendt
  // brukeren «hjem» en gang til.
  const ignorerNestePop = useRef(false);

  const stableOnBack = useCallback(onBack, [onBack]);

  useEffect(() => {
    if (suspendert || !isAway) return;

    window.history.pushState(TAB_STATE, '');
    entryOnStack.current = true;

    const handlePopState = () => {
      if (ignorerNestePop.current) {
        ignorerNestePop.current = false;
        return;
      }
      // Trykket spiste oppføringen. Vi legger IKKE inn en ny: brukeren er
      // framme, og en ny vakt ville spist neste tilbake-trykk uten hensikt.
      entryOnStack.current = false;
      stableOnBack();
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      // Gikk brukeren hjem selv (bunnmenyen), ligger vakten igjen.
      if (entryOnStack.current) {
        entryOnStack.current = false;
        ignorerNestePop.current = true;
        window.history.back();
      }
    };
  }, [isAway, suspendert, stableOnBack]);
}

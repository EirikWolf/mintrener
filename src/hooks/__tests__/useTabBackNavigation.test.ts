import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTabBackNavigation } from '../useTabBackNavigation';

/**
 * Tilbakeknappen utenfor aktiv økt.
 *
 * `useWorkoutExitGuard` beskytter bare mens en økt kjører eller står i pause.
 * Står du på Program, Øvelser eller Historikk, finnes ingen historikk-oppføring,
 * og tilbake forlater hele nettsiden. Det var det halve problemet jeg overså da
 * jeg meldte tilbakeknappen som fikset.
 *
 * Her er forventningen en annen enn under en økt: ingen dialog. Å gå fra
 * Historikk til forsiden er nettopp det brukeren ber om med tilbake — det er
 * ikke noe å bekrefte, og en dialog ville vært i veien.
 */

describe('useTabBackNavigation', () => {
  let pushSpy: ReturnType<typeof vi.spyOn>;
  let backSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    pushSpy = vi.spyOn(window.history, 'pushState').mockImplementation(() => {});
    backSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  function popp() {
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
  }

  it('rører ikke historikken på forsiden', () => {
    renderHook(() => useTabBackNavigation({ isAway: false, onBack: vi.fn() }));
    expect(pushSpy).not.toHaveBeenCalled();
  });

  it('legger inn én oppføring når brukeren forlater forsiden', () => {
    const { rerender } = renderHook(
      ({ isAway }) => useTabBackNavigation({ isAway, onBack: vi.fn() }),
      { initialProps: { isAway: false } }
    );

    rerender({ isAway: true });
    expect(pushSpy).toHaveBeenCalledTimes(1);
  });

  it('går til forsiden i stedet for ut av appen', () => {
    const onBack = vi.fn();
    renderHook(() => useTabBackNavigation({ isAway: true, onBack }));

    popp();
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('legger ikke inn en ny oppføring etter at brukeren er hjemme', () => {
    // Under en økt bevæpner vakten seg på nytt, fordi det er mer å beskytte.
    // Her er brukeren framme: en ny oppføring ville spist neste tilbake-trykk.
    renderHook(() => useTabBackNavigation({ isAway: true, onBack: vi.fn() }));

    popp();
    expect(pushSpy).toHaveBeenCalledTimes(1);
  });

  it('rydder oppføringen når brukeren går hjem selv', () => {
    // Trykker man «I dag» i bunnmenyen, ligger vakten igjen. Uten opprydding
    // ville neste tilbake-trykk blitt spist av en oppføring uten hensikt.
    const { rerender } = renderHook(
      ({ isAway }) => useTabBackNavigation({ isAway, onBack: vi.fn() }),
      { initialProps: { isAway: true } }
    );

    rerender({ isAway: false });
    expect(backSpy).toHaveBeenCalledTimes(1);
  });

  it('kaller ikke onBack for sin egen opprydding', () => {
    // history.back() utløser popstate. Uten en vakt mot det ville
    // opprydningen sendt brukeren «hjem» en gang til — eller verre, loopet.
    const onBack = vi.fn();
    const { rerender } = renderHook(
      ({ isAway }) => useTabBackNavigation({ isAway, onBack }),
      { initialProps: { isAway: true } }
    );

    rerender({ isAway: false });
    popp(); // popstate som følge av vår egen back()
    expect(onBack).not.toHaveBeenCalled();
  });

  it('holder seg unna når en økt kjører', () => {
    // Da eier useWorkoutExitGuard tilbakeknappen, og to lyttere som begge
    // legger inn oppføringer ville kjempet om samme trykk.
    renderHook(() =>
      useTabBackNavigation({ isAway: true, onBack: vi.fn(), suspendert: true })
    );
    expect(pushSpy).not.toHaveBeenCalled();
  });
});

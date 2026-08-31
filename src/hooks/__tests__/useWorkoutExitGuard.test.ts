import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWorkoutExitGuard } from '../useWorkoutExitGuard';

/**
 * Tilbakeknappen under aktiv økt.
 *
 * Appen bytter visuell form når økten starter — bunnmenyen forsvinner,
 * bakgrunnsfargen endres, toppbaren erstattes — men URL-en står stille. For
 * brukeren ser det ut som en ny side, og tilbake-gesten på Android er den
 * naturlige veien ut. Den forlot hele nettsiden og drepte økten.
 *
 * Vakten legger en oppføring i historikken når økten starter. Tilbake-trykket
 * konsumerer den i stedet for å forlate appen, og brukeren får spørsmålet.
 *
 * Økten pauses IKKE mens spørsmålet står. Et feiltrykk skal ikke koste deg
 * rytmen i en planke — det er nettopp feiltrykket vakten finnes for.
 */

describe('useWorkoutExitGuard', () => {
  let pushSpy: ReturnType<typeof vi.spyOn>;
  let backSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    pushSpy = vi.spyOn(window.history, 'pushState').mockImplementation(() => {});
    backSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function popp() {
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
  }

  it('rører ikke historikken når ingen økt er i gang', () => {
    renderHook(() => useWorkoutExitGuard({ isActive: false, onConfirmExit: vi.fn() }));

    expect(pushSpy).not.toHaveBeenCalled();
  });

  it('legger inn én vakt-oppføring når økten starter', () => {
    const { rerender } = renderHook(
      ({ isActive }) => useWorkoutExitGuard({ isActive, onConfirmExit: vi.fn() }),
      { initialProps: { isActive: false } }
    );

    rerender({ isActive: true });
    expect(pushSpy).toHaveBeenCalledTimes(1);
  });

  it('fanger tilbake-trykket og spør i stedet for å forlate appen', () => {
    const { result } = renderHook(() =>
      useWorkoutExitGuard({ isActive: true, onConfirmExit: vi.fn() })
    );

    expect(result.current.isConfirming).toBe(false);
    popp();
    expect(result.current.isConfirming).toBe(true);
  });

  it('bevæpner seg på nytt, så andre tilbake-trykk også fanges', () => {
    const { result } = renderHook(() =>
      useWorkoutExitGuard({ isActive: true, onConfirmExit: vi.fn() })
    );

    popp();
    // Tilbake-trykket spiste vakten; uten en ny ville neste trykk forlatt appen
    expect(pushSpy).toHaveBeenCalledTimes(2);

    act(() => result.current.cancelExit());
    popp();
    expect(result.current.isConfirming).toBe(true);
    expect(pushSpy).toHaveBeenCalledTimes(3);
  });

  it('lar brukeren bli værende', () => {
    const onConfirmExit = vi.fn();
    const { result } = renderHook(() => useWorkoutExitGuard({ isActive: true, onConfirmExit }));

    popp();
    act(() => result.current.cancelExit());

    expect(result.current.isConfirming).toBe(false);
    expect(onConfirmExit).not.toHaveBeenCalled();
  });

  it('avslutter økten når brukeren bekrefter', () => {
    const onConfirmExit = vi.fn();
    const { result } = renderHook(() => useWorkoutExitGuard({ isActive: true, onConfirmExit }));

    popp();
    act(() => result.current.confirmExit());

    expect(onConfirmExit).toHaveBeenCalledTimes(1);
    expect(result.current.isConfirming).toBe(false);
  });

  it('rydder vakt-oppføringen når økten er ferdig', () => {
    const { rerender } = renderHook(
      ({ isActive }) => useWorkoutExitGuard({ isActive, onConfirmExit: vi.fn() }),
      { initialProps: { isActive: true } }
    );

    rerender({ isActive: false });
    // Uten dette ville hver fullførte økt lagt igjen et ekstra tilbake-trykk
    // mellom brukeren og utgangen.
    expect(backSpy).toHaveBeenCalledTimes(1);
  });

  it('lukker spørsmålet hvis økten avsluttes på annen måte mens det står', () => {
    const { result, rerender } = renderHook(
      ({ isActive }) => useWorkoutExitGuard({ isActive, onConfirmExit: vi.fn() }),
      { initialProps: { isActive: true } }
    );

    popp();
    expect(result.current.isConfirming).toBe(true);

    rerender({ isActive: false });
    expect(result.current.isConfirming).toBe(false);
  });
});

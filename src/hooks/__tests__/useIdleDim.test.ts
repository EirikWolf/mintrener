import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIdleDim, IDLE_DIM_TIMEOUT_MS } from '../useIdleDim';

/**
 * B6.3 (revisjon § 4.4): dimme-modus etter 10 s uten interaksjon under running.
 * Ren timer-logikk testet med fake timers; interaksjon (pointer/keyboard)
 * og eksplisitt wake() nullstiller.
 */
describe('useIdleDim (B6.3)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('dimmer etter 10 s når aktiv, ikke før', () => {
    const { result } = renderHook(() => useIdleDim(true));
    expect(result.current.isDimmed).toBe(false);

    act(() => vi.advanceTimersByTime(IDLE_DIM_TIMEOUT_MS - 1));
    expect(result.current.isDimmed).toBe(false);

    act(() => vi.advanceTimersByTime(1));
    expect(result.current.isDimmed).toBe(true);
  });

  it('dimmer aldri når inaktiv', () => {
    const { result } = renderHook(() => useIdleDim(false));
    act(() => vi.advanceTimersByTime(IDLE_DIM_TIMEOUT_MS * 3));
    expect(result.current.isDimmed).toBe(false);
  });

  it('pointerdown nullstiller nedtellingen og opphever dimming umiddelbart', () => {
    const { result } = renderHook(() => useIdleDim(true));

    // Interaksjon midt i nedtellingen utsetter dimmingen
    act(() => vi.advanceTimersByTime(9000));
    act(() => {
      window.dispatchEvent(new Event('pointerdown'));
    });
    act(() => vi.advanceTimersByTime(9000));
    expect(result.current.isDimmed).toBe(false);
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.isDimmed).toBe(true);

    // Interaksjon mens dimmet opphever umiddelbart
    act(() => {
      window.dispatchEvent(new Event('pointerdown'));
    });
    expect(result.current.isDimmed).toBe(false);
  });

  it('keydown vekker på samme måte som berøring', () => {
    const { result } = renderHook(() => useIdleDim(true));
    act(() => vi.advanceTimersByTime(IDLE_DIM_TIMEOUT_MS));
    expect(result.current.isDimmed).toBe(true);
    act(() => {
      window.dispatchEvent(new Event('keydown'));
    });
    expect(result.current.isDimmed).toBe(false);
  });

  it('wake() opphever dimming og starter nedtellingen på nytt', () => {
    const { result } = renderHook(() => useIdleDim(true));
    act(() => vi.advanceTimersByTime(IDLE_DIM_TIMEOUT_MS));
    expect(result.current.isDimmed).toBe(true);

    act(() => result.current.wake());
    expect(result.current.isDimmed).toBe(false);

    act(() => vi.advanceTimersByTime(IDLE_DIM_TIMEOUT_MS));
    expect(result.current.isDimmed).toBe(true);
  });

  it('deaktivering (running -> paused) opphever dimming og stopper timeren', () => {
    const { result, rerender } = renderHook(({ active }) => useIdleDim(active), {
      initialProps: { active: true },
    });
    act(() => vi.advanceTimersByTime(IDLE_DIM_TIMEOUT_MS));
    expect(result.current.isDimmed).toBe(true);

    rerender({ active: false });
    expect(result.current.isDimmed).toBe(false);
    act(() => vi.advanceTimersByTime(IDLE_DIM_TIMEOUT_MS * 2));
    expect(result.current.isDimmed).toBe(false);
  });

  it('respekterer egendefinert timeout', () => {
    const { result } = renderHook(() => useIdleDim(true, 2000));
    act(() => vi.advanceTimersByTime(1999));
    expect(result.current.isDimmed).toBe(false);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.isDimmed).toBe(true);
  });
});

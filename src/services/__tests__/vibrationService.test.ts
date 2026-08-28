import { describe, it, expect, afterEach, vi } from 'vitest';
import { vibrationService, HAPTIC_PATTERNS } from '../vibrationService';

describe('Vibration Service', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    // @ts-expect-error - rydder opp test-mock, ikke del av navigator-typen i denne konteksten
    delete navigator.vibrate;
  });

  it('countdown() vibrerer med countdown-mønsteret fra HAPTIC_PATTERNS', () => {
    const vibrateMock = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { value: vibrateMock, configurable: true });

    vibrationService.countdown();

    expect(vibrateMock).toHaveBeenCalledWith(HAPTIC_PATTERNS.countdown);
  });

  it('workStart() vibrerer med workStart-mønsteret fra HAPTIC_PATTERNS', () => {
    const vibrateMock = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { value: vibrateMock, configurable: true });

    vibrationService.workStart();

    expect(vibrateMock).toHaveBeenCalledWith(HAPTIC_PATTERNS.workStart);
  });

  it('restStart() vibrerer med restStart-mønsteret fra HAPTIC_PATTERNS', () => {
    const vibrateMock = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { value: vibrateMock, configurable: true });

    vibrationService.restStart();

    expect(vibrateMock).toHaveBeenCalledWith(HAPTIC_PATTERNS.restStart);
  });

  it('workoutComplete() vibrerer med workoutComplete-mønsteret fra HAPTIC_PATTERNS', () => {
    const vibrateMock = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { value: vibrateMock, configurable: true });

    vibrationService.workoutComplete();

    expect(vibrateMock).toHaveBeenCalledWith(HAPTIC_PATTERNS.workoutComplete);
  });

  it('kaller ikke navigator.vibrate når enabled er false', () => {
    const vibrateMock = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { value: vibrateMock, configurable: true });

    vibrationService.countdown(false);
    vibrationService.workStart(false);
    vibrationService.restStart(false);
    vibrationService.workoutComplete(false);

    expect(vibrateMock).not.toHaveBeenCalled();
  });

  it('feiler stille og kaller ingenting når navigator.vibrate ikke finnes', () => {
    // @ts-expect-error - simulerer iOS Safari der API-et mangler helt
    delete navigator.vibrate;

    expect(() => {
      vibrationService.countdown();
      vibrationService.workStart();
      vibrationService.restStart();
      vibrationService.workoutComplete();
    }).not.toThrow();
  });

  it('alle fire mønstre i tabellen er innbyrdes ulike', () => {
    const patterns = [
      HAPTIC_PATTERNS.countdown,
      HAPTIC_PATTERNS.workStart,
      HAPTIC_PATTERNS.restStart,
      HAPTIC_PATTERNS.workoutComplete,
    ];
    const asStrings = patterns.map((p) => JSON.stringify(p));
    const uniqueStrings = new Set(asStrings);

    expect(uniqueStrings.size).toBe(patterns.length);
  });
});

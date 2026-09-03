import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Web Audio API
class MockAudioContext {
  state = 'suspended';
  currentTime = 0;
  destination = {};

  resume = vi.fn().mockImplementation(() => {
    this.state = 'running';
    return Promise.resolve();
  });

  createOscillator = vi.fn().mockReturnValue({
    type: 'sine',
    frequency: { setValueAtTime: vi.fn() },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  });

  createGain = vi.fn().mockReturnValue({
    gain: {
      value: 1,
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
  });
}

// Nettleser-mockene gjelder kun jsdom-testene; node-miljø-tester (f.eks.
// byggskript-suitene med @vitest-environment node) har verken window/navigator
// og trenger heller ingen av disse.
if (typeof window !== 'undefined') {
  (window as unknown as { AudioContext: typeof MockAudioContext }).AudioContext = MockAudioContext;
  (window as unknown as { webkitAudioContext: typeof MockAudioContext }).webkitAudioContext = MockAudioContext;

  // Mock Wake Lock API
  const mockWakeLockSentinel = {
    released: false,
    release: vi.fn().mockResolvedValue(undefined),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };

  Object.defineProperty(navigator, 'wakeLock', {
    value: {
      request: vi.fn().mockResolvedValue(mockWakeLockSentinel),
    },
    configurable: true,
    writable: true,
  });

  // Mock Vibration API
  Object.defineProperty(navigator, 'vibrate', {
    value: vi.fn().mockReturnValue(true),
    configurable: true,
    writable: true,
  });
}

// Mock requestAnimationFrame / cancelAnimationFrame
global.requestAnimationFrame = (callback: FrameRequestCallback) => {
  return setTimeout(() => callback(performance.now()), 16) as unknown as number;
};
global.cancelAnimationFrame = (id: number) => {
  clearTimeout(id);
};

/**
 * jsdom implementerer ikke `window.matchMedia`.
 *
 * Komponenter som spør om `(display-mode: standalone)` eller
 * `prefers-reduced-motion` kaster derfor i test, og feilen ser ut som en feil i
 * komponenten. Stubben svarer «nei» på alt, som er riktig utgangspunkt: i en
 * testkjøring er appen hverken installert eller satt til redusert bevegelse.
 */
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

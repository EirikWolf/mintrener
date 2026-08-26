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

// Mock requestAnimationFrame / cancelAnimationFrame
global.requestAnimationFrame = (callback: FrameRequestCallback) => {
  return setTimeout(() => callback(performance.now()), 16) as unknown as number;
};
global.cancelAnimationFrame = (id: number) => {
  clearTimeout(id);
};

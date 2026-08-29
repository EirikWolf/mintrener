import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TimerDisplay } from '../TimerDisplay';
import { TimerState, WorkoutTemplate } from '../../../types/workout';

// Samme tjenestegrense-mocker som TimerDisplay.test.tsx (B4): Firebase-appen og
// Web Bluetooth skal aldri initialiseres i komponenttester.
vi.mock('../../../services/firebase', () => ({
  app: {},
  auth: {},
  db: {},
  googleProvider: {},
}));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    profile: null,
    loading: false,
    signInWithGoogle: vi.fn(),
    logout: vi.fn(),
    deleteAccount: vi.fn(),
  }),
}));

vi.mock('../../../services/bluetoothHeartRateService', () => ({
  bluetoothHeartRateService: {
    isSupported: vi.fn(() => false),
    isConnected: vi.fn(() => false),
    connect: vi.fn(),
    disconnect: vi.fn(),
    reattach: vi.fn(),
  },
}));

const knebay = { id: 'e1', name: 'Knebøy' };
const planke = { id: 'e2', name: 'Planke' };

const workout: WorkoutTemplate = {
  id: 'w-test',
  name: 'Testøkt',
  description: 'Testfixture',
  type: 'custom',
  prepareDurationSeconds: 5,
  rounds: 2,
  roundRestDurationSeconds: 15,
  items: [
    { id: 'i1', exercise: knebay, workDurationSeconds: 20, restDurationSeconds: 10 },
    { id: 'i2', exercise: planke, workDurationSeconds: 20, restDurationSeconds: 10 },
  ],
};

function makeState(overrides: Partial<TimerState> = {}): TimerState {
  return {
    status: 'idle',
    phase: 'prepare',
    currentRound: 1,
    totalRounds: 2,
    currentItemIndex: 0,
    totalItems: 2,
    currentExercise: knebay,
    nextExercise: planke,
    phaseRemainingSeconds: 20,
    phaseTotalSeconds: 20,
    phaseProgress: 0,
    totalRemainingSeconds: 115,
    totalElapsedSeconds: 0,
    isLocked: false,
    soundEnabled: true,
    vibrateEnabled: true,
    wakeLockEnabled: true,
    speechEnabled: true,
    ...overrides,
  };
}

function makeHandlers() {
  return {
    onSelectWorkout: vi.fn(),
    onStartWorkoutDirectly: vi.fn(),
    onStart: vi.fn(),
    onPause: vi.fn(),
    onResume: vi.fn(),
    onReset: vi.fn(),
    onSkipNext: vi.fn(),
    onPrevious: vi.fn(),
    onToggleLock: vi.fn(),
    onToggleSound: vi.fn(),
    onToggleVibrate: vi.fn(),
    onToggleWakeLock: vi.fn(),
  };
}

function renderDisplay(state: TimerState, handlers = makeHandlers()) {
  const utils = render(
    <TimerDisplay
      workout={workout}
      state={state}
      presets={[workout]}
      {...handlers}
    />
  );
  return { ...utils, handlers };
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('mintrener_favorite_program_ids', JSON.stringify([workout.id]));
});

describe('TimerDisplay – persona-aksent i fokusmodus (B6.1)', () => {
  it('rundelinjen leser aksentfargen fra --persona-accent i fokusmodus', () => {
    renderDisplay(makeState({ status: 'running', phase: 'work' }));

    const roundLine = screen.getByText(/RUNDE 1 AV 2/).closest('div');
    expect(roundLine).not.toBeNull();
    expect(roundLine!.style.color).toContain('var(--persona-accent');
  });

  it('fasebadgen får aksentfarget kant i fokusmodus', () => {
    renderDisplay(makeState({ status: 'running', phase: 'work' }));

    const badge = screen.getByText('Arbeid');
    expect(badge.style.borderColor).toContain('var(--persona-accent');
  });

  it('idle-visningen bruker IKKE persona-aksenten (kun fokusmodus)', () => {
    renderDisplay(makeState({ status: 'idle' }));

    const roundLine = screen.getByText(/RUNDE 1 AV 2/).closest('div');
    expect(roundLine!.style.color).toBe('');
    const badge = screen.getByText('Klargjøring');
    expect(badge.style.borderColor).toBe('');
  });
});

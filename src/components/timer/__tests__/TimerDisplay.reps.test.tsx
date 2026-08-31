import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TimerDisplay } from '../TimerDisplay';
import { TimerState, WorkoutTemplate } from '../../../types/workout';

/**
 * Visningen av en repetisjonsbasert øvelse.
 *
 * En nedtelling som ikke teller ned er verre enn ingen nedtelling: brukeren
 * venter på et tall som aldri beveger seg. Når fasen venter på deg, skal
 * skjermen vise hva du skal gjøre — «25 repetisjoner» — og hovedknappen skal
 * være veien videre.
 */

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

const pushups = { id: 'push-ups', name: 'Armhevinger' };

const workout: WorkoutTemplate = {
  id: 'w-reps',
  name: 'Push-ups',
  description: 'Repetisjonsbasert',
  type: 'custom',
  prepareDurationSeconds: 5,
  rounds: 1,
  roundRestDurationSeconds: 30,
  items: [
    {
      id: 'i1',
      exercise: pushups,
      workDurationSeconds: 60,
      restDurationSeconds: 20,
      targetReps: 25,
    },
  ],
};

function makeState(overrides: Partial<TimerState> = {}): TimerState {
  return {
    status: 'running',
    phase: 'work',
    currentRound: 1,
    totalRounds: 1,
    currentItemIndex: 0,
    totalItems: 1,
    currentExercise: pushups,
    nextExercise: null,
    phaseRemainingSeconds: 60,
    phaseTotalSeconds: 60,
    phaseProgress: 0,
    totalRemainingSeconds: 60,
    totalElapsedSeconds: 5,
    isLocked: false,
    soundEnabled: true,
    vibrateEnabled: true,
    wakeLockEnabled: true,
    speechEnabled: true,
    ...overrides,
  };
}

function renderDisplay(state: TimerState) {
  const handlers = {
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
  render(<TimerDisplay workout={workout} state={state} presets={[workout]} {...handlers} />);
  return handlers;
}

beforeEach(() => {
  localStorage.clear();
});

describe('TimerDisplay — repetisjonsbasert øvelse', () => {
  it('viser antall repetisjoner i stedet for en nedtelling som står stille', () => {
    renderDisplay(makeState({ awaitingReps: 25 }));

    const maal = screen.getByTestId('reps-maal');
    expect(maal).toHaveTextContent('25');
    expect(screen.getByText(/repetisjoner/i)).toBeInTheDocument();
  });

  it('gjør hovedknappen til veien videre', () => {
    const handlers = renderDisplay(makeState({ awaitingReps: 25 }));

    fireEvent.click(screen.getByRole('button', { name: /FERDIG/ }));
    expect(handlers.onSkipNext).toHaveBeenCalledTimes(1);
    // PAUSE ville vært meningsløst: det er ingen klokke å pause
    expect(screen.queryByRole('button', { name: 'PAUSE' })).not.toBeInTheDocument();
  });

  it('lar tidsbaserte faser være uendret', () => {
    renderDisplay(makeState());

    expect(screen.queryByTestId('reps-maal')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'PAUSE' })).toBeInTheDocument();
  });
});

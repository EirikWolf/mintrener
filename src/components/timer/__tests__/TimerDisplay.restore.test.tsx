import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { TimerDisplay } from '../TimerDisplay';
import { TimerState, WorkoutTemplate } from '../../../types/workout';
import {
  getInterruptedSession,
  clearInterruptedSession,
  InterruptedSession,
} from '../../../services/sessionRecoveryService';

// Samme tjenestegrense-mocker som TimerDisplay.test.tsx — se kommentarene der.
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

// Gjenopprettingsflyten testes på tjenestegrensen: banneret skal speile det
// sessionRecoveryService rapporterer, og forkasting skal gå via clearInterruptedSession.
vi.mock('../../../services/sessionRecoveryService', () => ({
  getInterruptedSession: vi.fn(() => null),
  clearInterruptedSession: vi.fn(),
  saveInterruptedSession: vi.fn(),
}));

const mockedGetInterrupted = vi.mocked(getInterruptedSession);
const mockedClearInterrupted = vi.mocked(clearInterruptedSession);

const savedWorkout: WorkoutTemplate = {
  id: 'w-avbrutt',
  name: 'Avbrutt Kveldsøkt',
  description: '',
  type: 'custom',
  prepareDurationSeconds: 5,
  rounds: 3,
  roundRestDurationSeconds: 15,
  items: [
    {
      id: 'i1',
      exercise: { id: 'e1', name: 'Burpees' },
      workDurationSeconds: 30,
      restDurationSeconds: 15,
    },
  ],
};

const interruptedSession: InterruptedSession = {
  workout: savedWorkout,
  phase: 'work',
  currentRound: 2,
  currentItemIndex: 0,
  totalElapsedSeconds: 8 * 60 + 12,
  savedAt: Date.now(),
};

const idleWorkout: WorkoutTemplate = { ...savedWorkout, id: 'w-idle', name: 'Dagens Økt' };

function makeState(overrides: Partial<TimerState> = {}): TimerState {
  return {
    status: 'idle',
    phase: 'prepare',
    currentRound: 1,
    totalRounds: 1,
    currentItemIndex: 0,
    totalItems: 1,
    currentExercise: idleWorkout.items[0].exercise,
    nextExercise: null,
    phaseRemainingSeconds: 5,
    phaseTotalSeconds: 5,
    phaseProgress: 0,
    totalRemainingSeconds: 35,
    totalElapsedSeconds: 0,
    isLocked: false,
    soundEnabled: true,
    vibrateEnabled: true,
    wakeLockEnabled: true,
    speechEnabled: true,
    ...overrides,
  };
}

function renderDisplay(state: TimerState = makeState()) {
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
  const utils = render(
    <TimerDisplay workout={idleWorkout} state={state} presets={[idleWorkout]} {...handlers} />
  );
  return { ...utils, handlers };
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mockedGetInterrupted.mockReturnValue(null);
});

describe('Gjenopprettingsbanner (avbrutt økt)', () => {
  it('vises ikke når ingen avbrutt økt er lagret', () => {
    renderDisplay();
    expect(screen.queryByTestId('restore-session-banner')).not.toBeInTheDocument();
  });

  it('vises med øktnavn, runde og gjennomført tid når en avbrutt økt finnes', () => {
    mockedGetInterrupted.mockReturnValue(interruptedSession);
    renderDisplay();

    const banner = screen.getByTestId('restore-session-banner');
    expect(within(banner).getByText('Fortsett: Avbrutt Kveldsøkt')).toBeInTheDocument();
    expect(within(banner).getByText(/Runde 2/)).toBeInTheDocument();
    expect(within(banner).getByText(/8m gjennomført/)).toBeInTheDocument();
  });

  it('gjenopptar den lagrede økten ved trykk på «Fortsett» og fjerner banneret', () => {
    mockedGetInterrupted.mockReturnValue(interruptedSession);
    const { handlers } = renderDisplay();

    const banner = screen.getByTestId('restore-session-banner');
    fireEvent.click(within(banner).getByRole('button', { name: 'Fortsett' }));

    expect(handlers.onStartWorkoutDirectly).toHaveBeenCalledTimes(1);
    expect(handlers.onStartWorkoutDirectly).toHaveBeenCalledWith(savedWorkout);
    expect(screen.queryByTestId('restore-session-banner')).not.toBeInTheDocument();
  });

  it('forkaster lagret økt ved trykk på «Forkast» uten å starte noe', () => {
    mockedGetInterrupted.mockReturnValue(interruptedSession);
    const { handlers } = renderDisplay();

    const banner = screen.getByTestId('restore-session-banner');
    fireEvent.click(within(banner).getByRole('button', { name: 'Forkast' }));

    // Forkasting skal slette den lagrede økten på tjenestegrensen …
    expect(mockedClearInterrupted).toHaveBeenCalledTimes(1);
    // … fjerne banneret …
    expect(screen.queryByTestId('restore-session-banner')).not.toBeInTheDocument();
    // … og IKKE starte noen økt
    expect(handlers.onStartWorkoutDirectly).not.toHaveBeenCalled();
    expect(handlers.onStart).not.toHaveBeenCalled();
  });

  it('vises ikke under en aktiv økt selv om en avbrutt økt er lagret', () => {
    mockedGetInterrupted.mockReturnValue(interruptedSession);
    renderDisplay(makeState({ status: 'running', phase: 'work' }));
    expect(screen.queryByTestId('restore-session-banner')).not.toBeInTheDocument();
  });
});

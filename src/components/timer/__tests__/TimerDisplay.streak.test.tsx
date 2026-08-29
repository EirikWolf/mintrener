import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TimerDisplay } from '../TimerDisplay';
import { TimerState, WorkoutTemplate } from '../../../types/workout';
import { WORKOUT_HISTORY_KEY } from '../../../services/workoutHistoryStorage';
import { getWeekStart } from '../../../services/weekUtils';
import type { CompletedWorkoutLog } from '../../../types/models';

// Samme tjenestegrense-mocks som B4-fila (TimerDisplay.test.tsx): Firebase-appen
// skal aldri initialiseres i komponenttester, og Web Bluetooth finnes ikke i jsdom.
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
    phaseRemainingSeconds: 5,
    phaseTotalSeconds: 5,
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

function renderDisplay(state: TimerState = makeState(), handlers = makeHandlers()) {
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

/**
 * Skriver CompletedWorkoutLog[] til WORKOUT_HISTORY_KEY med 3 økter i hver av
 * de `weeks` foregående ukene (relativt til ekte «nå»). Standardmålet er 3, så
 * hver seedet uke er fullført → computeWeekStreak gir currentWeeks === weeks.
 */
function seedHistoryWithCompletedWeeks(weeks: number): void {
  const monday = getWeekStart(new Date());
  const logs: CompletedWorkoutLog[] = [];
  for (let w = 1; w <= weeks; w++) {
    for (let i = 0; i < 3; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() - 7 * w + i);
      d.setHours(12, 0, 0, 0);
      logs.push({
        id: `seed-${w}-${i}`,
        userId: 'u1',
        workoutId: 'w1',
        workoutName: 'Seedøkt',
        workoutType: 'hiit',
        durationSeconds: 60,
        roundsCompleted: 1,
        totalRounds: 1,
        completedAt: d.toISOString(),
      });
    }
  }
  localStorage.setItem(WORKOUT_HISTORY_KEY, JSON.stringify(logs));
}

beforeEach(() => {
  localStorage.clear();
  // Deterministisk hurtigstart-grid (samme grep som B4-fila)
  localStorage.setItem('mintrener_favorite_program_ids', JSON.stringify([workout.id]));
});

describe('TimerDisplay – streak i ukesmål-pillen (idle-gren)', () => {
  it('viser flamme + uketall når streaken er ≥ 1', () => {
    seedHistoryWithCompletedWeeks(2);
    renderDisplay();
    expect(screen.getByText(/2 uker/)).toBeInTheDocument();
    // UU: flammen har tekstalternativ — farge/emoji bærer aldri info alene
    expect(screen.getByLabelText('2 ukers streak')).toBeInTheDocument();
  });

  it('viser INGEN flamme ved 0 streak (ingen «0 uker»-skam)', () => {
    renderDisplay();
    expect(screen.queryByText(/uker/)).not.toBeInTheDocument();
    // Pillen ellers uendret: ukesmål-fremdriften vises fortsatt
    expect(screen.getByText(/Ukesmål:/)).toBeInTheDocument();
  });

  it('trykk på pillen åpner streak-detaljarket', () => {
    seedHistoryWithCompletedWeeks(2);
    renderDisplay();
    fireEvent.click(screen.getByRole('button', { name: /streak og ukesmål/i }));
    expect(screen.getByRole('dialog', { name: /din streak/i })).toBeInTheDocument();
  });

  it('detaljarket kan lukkes igjen med lukkeknappen', () => {
    renderDisplay();
    fireEvent.click(screen.getByRole('button', { name: /streak og ukesmål/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Lukk' }));
    expect(screen.queryByRole('dialog', { name: /din streak/i })).not.toBeInTheDocument();
  });
});

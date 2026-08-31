import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { TimerDisplay } from '../TimerDisplay';
import { TimerState, WorkoutTemplate } from '../../../types/workout';

/**
 * Startskjermens informasjonsarkitektur.
 *
 * Revisjon A ga diagnosen «akkumulering fremfor arkitektur»: hver ny funksjon
 * fikk sin egen knapp på forsiden, og ingen eide helheten. Resultatet var 22
 * klikkbare mål i hvilemodus, to knapper til samme storskjermvisning, og to
 * naboknapper som begge het «AI» med samme ikon.
 *
 * Testene her binder oppryddingen. De handler om ANTALL og RANGERING, ikke om
 * utseende — nettopp fordi feilklassen er at antallet vokser én knapp om gangen
 * uten at noen ser summen.
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

function renderIdle(overrides: Partial<TimerState> = {}) {
  return render(
    <TimerDisplay
      workout={workout}
      state={makeState(overrides)}
      presets={[workout]}
      onSelectWorkout={vi.fn()}
      onStartWorkoutDirectly={vi.fn()}
      onStart={vi.fn()}
      onPause={vi.fn()}
      onResume={vi.fn()}
      onReset={vi.fn()}
      onSkipNext={vi.fn()}
      onPrevious={vi.fn()}
      onToggleLock={vi.fn()}
      onToggleSound={vi.fn()}
      onToggleVibrate={vi.fn()}
      onToggleWakeLock={vi.fn()}
    />
  );
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('mintrener_favorite_program_ids', JSON.stringify([workout.id]));
});

describe('Startskjermen — én inngang per funksjon', () => {
  it('har nøyaktig én knapp til storskjermvisning', () => {
    renderIdle();

    // Revisjon A, spørsmål B: knappen fantes både i toppbaren og som knapp 10
    // i verktøymatrisen, med hver sin ordlyd i aria-label. Skjermleseren leste
    // dem som to ulike funksjoner.
    const tvKnapper = screen.getAllByRole('button', { name: /TV-visning/i });
    expect(tvKnapper).toHaveLength(1);
  });

  it('gir de to AI-inngangene hvert sitt navn', () => {
    renderIdle();
    fireEvent.click(screen.getByRole('button', { name: /Flere verktøy/i }));

    // Begge het «AI» med samme Sparkles-ikon og lå ved siden av hverandre.
    // Navnene må skille dem; ikonene gjør resten.
    const coach = screen.getByRole('button', { name: /Astrid/i });
    const generator = screen.getByRole('button', { name: /Lag økt/i });
    expect(coach).not.toBe(generator);
  });
});

describe('Startskjermen — verktøyene er rangert, ikke stablet', () => {
  it('viser fire verktøy i kollapset tilstand', () => {
    renderIdle();

    const rad = screen.getByTestId('verktoy-rad');
    expect(within(rad).getAllByRole('button')).toHaveLength(4);
  });

  it('avdekker resten når brukeren ber om det, og kan skjule dem igjen', () => {
    renderIdle();

    const bryter = screen.getByRole('button', { name: /Flere verktøy/i });
    expect(bryter).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(bryter);
    expect(bryter).toHaveAttribute('aria-expanded', 'true');
    expect(within(screen.getByTestId('verktoy-rad')).getAllByRole('button').length).toBeGreaterThan(
      4
    );

    fireEvent.click(bryter);
    expect(within(screen.getByTestId('verktoy-rad')).getAllByRole('button')).toHaveLength(4);
  });

  it('holder verktøyene helt utenfor skjermen under aktiv økt', () => {
    renderIdle({ status: 'running', phase: 'work' });

    expect(screen.queryByTestId('verktoy-rad')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Flere verktøy/i })).not.toBeInTheDocument();
  });
});

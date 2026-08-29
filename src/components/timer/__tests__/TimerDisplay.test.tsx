import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { TimerDisplay } from '../TimerDisplay';
import { TimerState, WorkoutTemplate } from '../../../types/workout';

// Firebase-appen skal aldri initialiseres i komponenttester — flere av
// TimerDisplays barnemoduler (GroupRoomModal, telemetri, firestore) importerer
// den transitivt. Tjenestegrensen mockes; komponenttestene tester UI-grenene.
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

// Web Bluetooth finnes ikke i jsdom — HeartRateWidget monteres i toppraden og
// ville ellers kalt navigator.bluetooth ved mount.
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

const otherPreset: WorkoutTemplate = {
  ...workout,
  id: 'w-preset-2',
  name: 'Tabata Klassisk',
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

function renderDisplay(state: TimerState, handlers = makeHandlers()) {
  const utils = render(
    <TimerDisplay
      workout={workout}
      state={state}
      presets={[workout, otherPreset]}
      {...handlers}
    />
  );
  return { ...utils, handlers };
}

beforeEach(() => {
  localStorage.clear();
  // Uten eksplisitte favoritter faller griden tilbake på DEFAULT_FAVORITE_IDS
  // (ekte programmer) — pek den mot test-fixturene så griden er deterministisk.
  localStorage.setItem(
    'mintrener_favorite_program_ids',
    JSON.stringify([workout.id, otherPreset.id])
  );
});

describe('TimerDisplay – idle-gren', () => {
  it('viser START-knapp, toppkrom og hurtigstart-grid — og ingen fokusmodus-stripe', () => {
    renderDisplay(makeState({ status: 'idle' }));

    expect(screen.getByRole('button', { name: 'START' })).toBeInTheDocument();
    // Toppkrom (logo-rad) er synlig i idle
    expect(screen.getByText('Min Trener')).toBeInTheDocument();
    // Fokusmodus-stripen skal IKKE finnes i idle
    expect(screen.queryByTestId('focus-quick-controls')).not.toBeInTheDocument();
    // Hurtigstart-griden viser preset-øktene
    expect(screen.getByText('Tabata Klassisk')).toBeInTheDocument();
    // Forrige/Neste er deaktivert når ingen økt kjører
    expect(screen.getByRole('button', { name: 'Forrige intervall' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Neste intervall' })).toBeDisabled();
  });

  it('starter økten ved trykk på START og velger økt ved trykk i griden', () => {
    const { handlers } = renderDisplay(makeState({ status: 'idle' }));

    fireEvent.click(screen.getByRole('button', { name: 'START' }));
    expect(handlers.onStart).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Tabata Klassisk'));
    expect(handlers.onSelectWorkout).toHaveBeenCalledWith(otherPreset);
  });
});

describe('TimerDisplay – running-gren (fokusmodus)', () => {
  it('viser PAUSE-knapp og skjuler toppkrommen til fordel for fokus-stripen', () => {
    renderDisplay(makeState({ status: 'running', phase: 'work' }));

    expect(screen.getByRole('button', { name: 'PAUSE' })).toBeInTheDocument();
    // Toppkrom skjult under økt (fokusmodus)
    expect(screen.queryByText('Min Trener')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Storskjerm- og TV-visning' })).not.toBeInTheDocument();

    // Flytende stripe med lyd- og låsekontroll er eneste gjenlevende krom
    const strip = screen.getByTestId('focus-quick-controls');
    expect(within(strip).getByRole('switch', { name: 'Lydvarsler' })).toBeInTheDocument();
    expect(within(strip).getByRole('switch', { name: 'Skjermlås' })).toBeInTheDocument();
  });

  it('forstørrer øvelsesnavn, fase-badge og neste-pille i fokusmodus', () => {
    renderDisplay(makeState({ status: 'running', phase: 'work' }));

    // classList-token-sjekk (ikke substring): «sm:text-3xl» i normalvisningen
    // skal ikke telle som forstørret.
    const heading = screen.getByRole('heading', { name: 'Knebøy' });
    expect(heading.classList.contains('text-3xl')).toBe(true);
    expect(screen.getByText('Arbeid').classList.contains('text-sm')).toBe(true);
    // «Neste:»-pillen er blant de få tekstene som fortsatt skal leses under økt
    expect(screen.getByText('Neste:').classList.contains('text-xs')).toBe(true);
    expect(screen.getByText('Planke')).toBeInTheDocument();
  });

  it('holder idle-visningen uforstørret (fokusmodus gjelder kun aktiv økt)', () => {
    renderDisplay(makeState({ status: 'idle' }));
    const heading = screen.getByRole('heading', { name: 'Gjør deg klar' });
    expect(heading.classList.contains('text-3xl')).toBe(false);
    expect(heading.classList.contains('text-xl')).toBe(true);
  });

  it('viser riktig fase-badge for hver fase', () => {
    const cases: Array<[TimerState['phase'], string]> = [
      ['prepare', 'Klargjøring'],
      ['work', 'Arbeid'],
      ['rest', 'Hvile'],
      ['round_rest', 'Rundehvile'],
    ];
    for (const [phase, badge] of cases) {
      const { unmount } = renderDisplay(makeState({ status: 'running', phase }));
      expect(screen.getByText(badge)).toBeInTheDocument();
      unmount();
    }
  });

  it('viser «Fullført»-badge i complete-fasen', () => {
    renderDisplay(makeState({ status: 'completed', phase: 'complete' }));
    expect(screen.getByText('Fullført')).toBeInTheDocument();
  });

  it('viser «Gjør deg klar» og «Først:»-pille i prepare-fasen', () => {
    renderDisplay(makeState({ status: 'running', phase: 'prepare' }));

    expect(screen.getByRole('heading', { name: 'Gjør deg klar' })).toBeInTheDocument();
    expect(screen.getByText('Først:')).toBeInTheDocument();
    // Første øvelse annonseres i pillen
    expect(screen.getByText('Knebøy')).toBeInTheDocument();
  });

  it('kobler PAUSE, forrige og neste til riktige handlere', () => {
    const { handlers } = renderDisplay(makeState({ status: 'running', phase: 'work' }));

    fireEvent.click(screen.getByRole('button', { name: 'PAUSE' }));
    expect(handlers.onPause).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Forrige intervall' }));
    expect(handlers.onPrevious).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Neste intervall' }));
    expect(handlers.onSkipNext).toHaveBeenCalledTimes(1);
  });
});

describe('TimerDisplay – paused-gren', () => {
  it('viser FORTSETT og «Avbryt og nullstill», koblet til onResume/onReset', () => {
    const { handlers } = renderDisplay(makeState({ status: 'paused', phase: 'work' }));

    const resumeBtn = screen.getByRole('button', { name: 'FORTSETT' });
    fireEvent.click(resumeBtn);
    expect(handlers.onResume).toHaveBeenCalledTimes(1);

    const resetBtn = screen.getByRole('button', { name: /Avbryt og nullstill/ });
    fireEvent.click(resetBtn);
    expect(handlers.onReset).toHaveBeenCalledTimes(1);
  });

  it('beholder fokusmodus-stripen også i pause', () => {
    renderDisplay(makeState({ status: 'paused', phase: 'work' }));
    expect(screen.getByTestId('focus-quick-controls')).toBeInTheDocument();
    expect(screen.queryByText('Min Trener')).not.toBeInTheDocument();
  });
});

describe('TimerDisplay – låst skjerm', () => {
  it('viser låse-overlay og deaktiverer kontrollene når skjermen er låst', () => {
    const { handlers } = renderDisplay(
      makeState({ status: 'running', phase: 'work', isLocked: true })
    );

    expect(screen.getByText('Skjermen er låst')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'PAUSE' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Neste intervall' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /Trykk for å låse opp/ }));
    expect(handlers.onToggleLock).toHaveBeenCalledTimes(1);
  });

  it('skjuler «Avbryt og nullstill» når pausen er låst', () => {
    renderDisplay(makeState({ status: 'paused', phase: 'work', isLocked: true }));
    expect(screen.queryByRole('button', { name: /Avbryt og nullstill/ })).not.toBeInTheDocument();
  });
});

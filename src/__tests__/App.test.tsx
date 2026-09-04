import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { App } from '../App';

/**
 * App-gaten for velkomstflyten (C2 + fix-løkke B2/B3/B5): tunge barn mockes
 * til stubber — det er GATE-logikken som testes, ikke visningene selv.
 */

const { getSharedWorkoutFromUrlMock } = vi.hoisted(() => ({
  getSharedWorkoutFromUrlMock: vi.fn<() => object | null>(() => null),
}));

vi.mock('../services/shareWorkoutService', () => ({
  getSharedWorkoutFromUrl: getSharedWorkoutFromUrlMock,
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    profile: null,
    loading: false,
    signInWithGoogle: vi.fn(),
    logout: vi.fn(),
    deleteAccount: vi.fn(),
  }),
}));

vi.mock('../hooks/useIntervalTimer', () => ({
  useIntervalTimer: () => ({
    state: {
      status: 'idle',
      totalElapsedSeconds: 0,
      soundEnabled: true,
      vibrateEnabled: true,
      wakeLockEnabled: true,
      speechEnabled: true,
    },
    startWorkout: vi.fn(),
    pauseWorkout: vi.fn(),
    resumeWorkout: vi.fn(),
    resetWorkout: vi.fn(),
    skipNext: vi.fn(),
    previous: vi.fn(),
    toggleLock: vi.fn(),
    toggleSound: vi.fn(),
    toggleVibrate: vi.fn(),
    toggleWakeLock: vi.fn(),
    toggleSpeech: vi.fn(),
    setSoundLevel: vi.fn(),
  }),
}));

vi.mock('../services/firestoreService', () => ({
  saveCompletedWorkout: vi.fn(async () => 'log-1'),
}));
vi.mock('../services/customWorkoutsService', () => ({
  fetchCustomWorkouts: vi.fn(async () => []),
}));

vi.mock('../components/timer/TimerDisplay', () => ({
  TimerDisplay: () => <div data-testid="timer-display" />,
}));
vi.mock('../components/timer/WorkoutSummary', () => ({
  WorkoutSummary: () => <div data-testid="workout-summary" />,
}));
vi.mock('../components/library/ExerciseLibraryView', () => ({
  ExerciseLibraryView: () => <div data-testid="exercise-library-view" />,
}));
vi.mock('../components/history/WorkoutHistoryView', () => ({
  WorkoutHistoryView: () => <div data-testid="workout-history-view" />,
}));
vi.mock('../components/programs/ProgramCatalogView', () => ({
  ProgramCatalogView: () => <div data-testid="program-catalog-view" />,
}));
vi.mock('../components/builder/WorkoutBuilderView', () => ({
  WorkoutBuilderView: () => <div data-testid="workout-builder-view" />,
}));
vi.mock('../components/settings/SettingsMoreView', () => ({
  SettingsMoreView: () => <div data-testid="settings-more-view" />,
}));
vi.mock('../components/navigation/BottomNav', () => ({
  BottomNav: ({ onTabChange }: { activeTab?: string; onTabChange: (t: string) => void }) => (
    <nav data-testid="bottom-nav">
      <button onClick={() => onTabChange('programs')}>Programmer</button>
      <button onClick={() => onTabChange('exercises')}>Øvelser</button>
      <button onClick={() => onTabChange('timer')}>Timer</button>
    </nav>
  ),
}));

// OnboardingFlow rendres EKTE (gaten + flyten sammen) — kun sideeffektene mockes
vi.mock('../services/coachPersonaService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../services/coachPersonaService')>();
  return {
    ...actual,
    setActiveCoachPersona: vi.fn(),
    preloadPersonaAudio: vi.fn(),
    playPersonaPreview: vi.fn(async () => null),
    stopCurrentPersonaAudio: vi.fn(),
  };
});
vi.mock('../services/telemetryService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../services/telemetryService')>();
  return { ...actual, recordEngagementEvent: vi.fn() };
});

const WELCOME_HEADING = 'Hvem skal trene deg?';
const PROFILE_MODAL_HEADING = 'Hvor skal du bruke Min Trener?';

async function renderApp() {
  // fetchCustomWorkouts-effekten resolver asynkront — flush innenfor act
  await act(async () => {
    render(<App />);
  });
}

describe('App — velkomstflyt-gate (C2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    getSharedWorkoutFromUrlMock.mockReturnValue(null);
  });

  it('fersk bruker: flyten vises, profilmodalen undertrykkes og innholdet bak er inert', async () => {
    await renderApp();
    expect(screen.getByRole('heading', { name: WELCOME_HEADING })).toBeInTheDocument();
    expect(screen.queryByText(PROFILE_MODAL_HEADING)).not.toBeInTheDocument();
    // B4: app-innholdet bak overlayet er utilgjengelig for fokus/AT
    expect(screen.getByTestId('timer-display').closest('[inert]')).not.toBeNull();
  });

  it('B2: fullført/hoppet-over flyt → profilmodalen vises IKKE i samme sesjon', async () => {
    await renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Hopp over' }));
    expect(screen.queryByRole('heading', { name: WELCOME_HEADING })).not.toBeInTheDocument();
    expect(screen.queryByText(PROFILE_MODAL_HEADING)).not.toBeInTheDocument();
    // Innholdet er tilgjengelig igjen — START er ett trykk unna
    expect(screen.getByTestId('timer-display').closest('[inert]')).toBeNull();
  });

  it('B3: delingslenke (?w=) undertrykker flyten denne økta uten å markere fullført', async () => {
    getSharedWorkoutFromUrlMock.mockReturnValue({
      id: 'shared-1',
      name: 'Delt økt',
      type: 'custom',
      rounds: 1,
      prepareDurationSeconds: 0,
      roundRestDurationSeconds: 0,
      items: [],
    });
    await renderApp();
    expect(screen.queryByRole('heading', { name: WELCOME_HEADING })).not.toBeInTheDocument();
    // Vilkårene består: neste besøk uten ?w= viser flyten
    expect(localStorage.getItem('mintrener_onboarding_v1')).toBeNull();
  });

  it('B5: open-welcome-onboarding-eventen gjenåpner flyten uavhengig av gate-vilkårene', async () => {
    // Eksisterende bruker — gate-vilkårene er IKKE oppfylt
    localStorage.setItem('mintrener_coach_persona', 'standard');
    localStorage.setItem(
      'mintrener_user_profiles_v1',
      JSON.stringify({ profiles: ['kontor'], primaryProfile: 'kontor', hasCompletedOnboarding: true })
    );
    await renderApp();
    expect(screen.queryByRole('heading', { name: WELCOME_HEADING })).not.toBeInTheDocument();
    act(() => {
      window.dispatchEvent(new CustomEvent('open-welcome-onboarding'));
    });
    expect(screen.getByRole('heading', { name: WELCOME_HEADING })).toBeInTheDocument();
  });

  it('Fase 3 (Revisjon C): bevarer besøkte faner i DOM-en ved navigering', async () => {
    // Sett opp eksisterende bruker slik at velkomstflyten ikke overstyrer
    localStorage.setItem('mintrener_coach_persona', 'standard');
    localStorage.setItem(
      'mintrener_user_profiles_v1',
      JSON.stringify({ profiles: ['kontor'], primaryProfile: 'kontor', hasCompletedOnboarding: true })
    );

    await renderApp();

    // Initielt: Timer er synlig, andre faner er ennå ikke montert
    expect(screen.getByTestId('timer-display')).toBeInTheDocument();
    expect(screen.queryByTestId('program-catalog-view')).not.toBeInTheDocument();

    // Naviger til Programmer
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Programmer' }));
    });
    expect(screen.getByTestId('program-catalog-view')).toBeInTheDocument();
    // Foreldreelementet til program-katalogen er synlig (ikke hidden)
    expect(screen.getByTestId('program-catalog-view').parentElement).toHaveClass('block');
    expect(screen.getByTestId('timer-display').parentElement).toHaveClass('hidden');

    // Naviger tilbake til Timer
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Timer' }));
    });
    expect(screen.getByTestId('timer-display').parentElement).toHaveClass('block');
    // Program-katalogen forblir montert i DOM-en (bevarer scroll og tilstand), men skjult med CSS
    expect(screen.getByTestId('program-catalog-view')).toBeInTheDocument();
    expect(screen.getByTestId('program-catalog-view').parentElement).toHaveClass('hidden');
  });
});


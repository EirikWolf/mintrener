import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { OnboardingFlow } from '../OnboardingFlow';
import {
  setActiveCoachPersona,
  preloadPersonaAudio,
  playPersonaPreview,
} from '../../../services/coachPersonaService';
import { setWeeklyGoal } from '../../../services/weeklyGoalService';
import { recordEngagementEvent } from '../../../services/telemetryService';

// Samme mønster som CoachPersonaModal.test.tsx: datalisten (COACH_PERSONAS)
// beholdes ekte; kun sideeffekt-funksjonene mockes.
vi.mock('../../../services/coachPersonaService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../services/coachPersonaService')>();
  return {
    ...actual,
    setActiveCoachPersona: vi.fn(),
    preloadPersonaAudio: vi.fn(),
    playPersonaPreview: vi.fn(async () => null),
    stopCurrentPersonaAudio: vi.fn(),
  };
});

vi.mock('../../../services/weeklyGoalService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../services/weeklyGoalService')>();
  return { ...actual, setWeeklyGoal: vi.fn() };
});

vi.mock('../../../services/telemetryService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../services/telemetryService')>();
  return { ...actual, recordEngagementEvent: vi.fn() };
});

/** Steg 1 → steg 2 med Jossa valgt (gjenbrukt av steg 2/3-testene). */
function completeStep1() {
  fireEvent.click(screen.getByRole('button', { name: 'Velg Jossa' }));
  fireEvent.click(screen.getByRole('button', { name: 'Videre' }));
}

function completeStep2() {
  fireEvent.click(screen.getByRole('button', { name: 'Videre' }));
}

describe('OnboardingFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('fyrer onboarding_started nøyaktig én gang ved mount (StrictMode-sikkert)', () => {
    render(
      <React.StrictMode>
        <OnboardingFlow onComplete={() => {}} />
      </React.StrictMode>
    );
    const startedCalls = vi
      .mocked(recordEngagementEvent)
      .mock.calls.filter(([c]) => c === 'onboarding_started');
    expect(startedCalls).toHaveLength(1);
  });

  it('steg 1 viser alle fire personaer + nedtonet Astrid (Standard) sist', () => {
    render(<OnboardingFlow onComplete={() => {}} />);
    expect(
      screen.getByRole('heading', { name: 'Hvem skal trene deg?' })
    ).toBeInTheDocument();
    for (const name of ['Jossa', 'Ola', 'Axel', 'Robin', 'Astrid (Standard)']) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
    // Standard er nedtonet og har ingen stemmeprøve
    expect(
      screen.queryByRole('button', { name: 'Forhåndshør Astrid (Standard)' })
    ).not.toBeInTheDocument();
    // Videre er låst til et valg er tatt
    expect(screen.getByRole('button', { name: 'Videre' })).toBeDisabled();
  });

  it('▶-trykk på Jossa spiller stemmeprøven via playPersonaPreview', async () => {
    render(<OnboardingFlow onComplete={() => {}} />);
    // async: playPersonaPreview-mocken resolver etter klikket — act venter den ut
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Forhåndshør Jossa' }));
    });
    expect(playPersonaPreview).toHaveBeenCalledWith('haugesund');
    // Forhåndshøring er ikke et valg
    expect(setActiveCoachPersona).not.toHaveBeenCalled();
  });

  it('valg av Jossa + Videre setter aktiv persona, preloader og teller telemetri', () => {
    render(<OnboardingFlow onComplete={() => {}} />);
    completeStep1();
    expect(setActiveCoachPersona).toHaveBeenCalledWith('haugesund');
    expect(preloadPersonaAudio).toHaveBeenCalledWith('haugesund');
    expect(recordEngagementEvent).toHaveBeenCalledWith(
      'onboarding_personaChosen_haugesund'
    );
    expect(
      screen.getByRole('heading', { name: 'Hvor ofte vil du trene?' })
    ).toBeInTheDocument();
  });

  it('steg 2: 3 er forhåndsvalgt, underteksten vises, Videre lagrer målet', () => {
    render(<OnboardingFlow onComplete={() => {}} />);
    completeStep1();
    expect(
      screen.getByText('Dette blir ukesmålet ditt — og grunnlaget for streaken din.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '3 økter' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    completeStep2();
    expect(setWeeklyGoal).toHaveBeenCalledWith(3);
    expect(recordEngagementEvent).toHaveBeenCalledWith('onboarding_goalSet');
  });

  it('steg 2: 2 og 4+ kan velges', () => {
    render(<OnboardingFlow onComplete={() => {}} />);
    completeStep1();
    fireEvent.click(screen.getByRole('button', { name: '2 økter' }));
    fireEvent.click(screen.getByRole('button', { name: '4+ økter' }));
    completeStep2();
    expect(setWeeklyGoal).toHaveBeenCalledWith(4);
  });

  it('steg 2: «Tilpass» viser talljustering som overstyrer hurtigvalget', () => {
    render(<OnboardingFlow onComplete={() => {}} />);
    completeStep1();
    fireEvent.click(screen.getByRole('button', { name: 'Tilpass' }));
    fireEvent.click(screen.getByRole('button', { name: 'Øk ukesmålet' }));
    fireEvent.click(screen.getByRole('button', { name: 'Øk ukesmålet' }));
    completeStep2();
    expect(setWeeklyGoal).toHaveBeenCalledWith(5);
  });

  it('steg 3: «Til første økta» markerer fullført, teller telemetri og lukker', () => {
    const onComplete = vi.fn();
    render(<OnboardingFlow onComplete={onComplete} />);
    completeStep1();
    completeStep2();
    expect(screen.getByText('Klar for første økt?')).toBeInTheDocument();
    // Anbefalt utstyrsfri førsteøkt vises
    expect(screen.getByText('Klassisk Tabata')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Til første økta' }));
    expect(localStorage.getItem('mintrener_onboarding_v1')).not.toBeNull();
    expect(recordEngagementEvent).toHaveBeenCalledWith('onboarding_firstWorkoutStarted');
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('«Hopp over» markerer fullført uten å sette persona, og teller skipped', () => {
    const onComplete = vi.fn();
    render(<OnboardingFlow onComplete={onComplete} />);
    fireEvent.click(screen.getByRole('button', { name: 'Hopp over' }));
    expect(localStorage.getItem('mintrener_onboarding_v1')).not.toBeNull();
    expect(setActiveCoachPersona).not.toHaveBeenCalled();
    expect(recordEngagementEvent).toHaveBeenCalledWith('onboarding_skipped');
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('«Hopp over» finnes også på steg 2 og 3', () => {
    const onComplete = vi.fn();
    render(<OnboardingFlow onComplete={onComplete} />);
    completeStep1();
    expect(screen.getByRole('button', { name: 'Hopp over' })).toBeInTheDocument();
    completeStep2();
    fireEvent.click(screen.getByRole('button', { name: 'Hopp over' }));
    expect(recordEngagementEvent).toHaveBeenCalledWith('onboarding_skipped');
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});

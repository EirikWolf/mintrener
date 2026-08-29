import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CoachPersonaModal } from '../CoachPersonaModal';
import {
  setActiveCoachPersona,
  preloadPersonaAudio,
} from '../../../services/coachPersonaService';

// β6: persona-VALGET er kall-stedet for offline-preloaden (spec § 5) — hele
// personaens lydsett skal varmes idet brukeren velger, ikke først ved øktstart.
// Datalisten (COACH_PERSONAS) beholdes ekte; kun sideeffekt-funksjonene mockes.
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

describe('CoachPersonaModal – preload ved persona-valg (β6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('valg av persona setter aktiv persona OG fyrer fire-and-forget preload', () => {
    render(<CoachPersonaModal onClose={() => {}} />);

    fireEvent.click(screen.getByText('Jostein'));

    expect(setActiveCoachPersona).toHaveBeenCalledWith('haugesund');
    expect(preloadPersonaAudio).toHaveBeenCalledWith('haugesund');
  });

  it('preloader også ved valg av standard (no-op i tjenesten, men kallet er uniformt)', () => {
    render(<CoachPersonaModal onClose={() => {}} />);

    fireEvent.click(screen.getByText('Astrid (Standard)'));

    expect(setActiveCoachPersona).toHaveBeenCalledWith('standard');
    expect(preloadPersonaAudio).toHaveBeenCalledWith('standard');
  });
});

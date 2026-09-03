import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { ProgramCatalogView } from '../ProgramCatalogView';
import { WorkoutTemplate } from '../../../types/workout';

/**
 * Egne program i programkatalogen.
 *
 * `ProgramCatalogView` leste kun `TRAINING_PROGRAMS` og `STARTER_CHALLENGES`.
 * En økt brukeren selv hadde bygget dukket aldri opp under «Program» — den
 * levde bare nederst i byggeren, som «Mine lagrede maler».
 *
 * Konsekvensen var at det man lager selv ble annenrangs: for å finne igjen sin
 * egen økt måtte man inn i verktøyet som lagde den, ikke i lista over
 * programmer. Det er også grunnen til at byggeren trengte en egen fane i
 * bunnmenyen — den var eneste vei tilbake til eget innhold.
 */

const egetProgram: WorkoutTemplate = {
  id: 'custom-1756600000000',
  name: 'Planke 100s',
  description: 'Egendefinert',
  type: 'custom',
  prepareDurationSeconds: 15,
  rounds: 1,
  roundRestDurationSeconds: 30,
  items: [
    {
      id: 'i1',
      exercise: { id: 'planke', name: 'Planke' },
      workDurationSeconds: 100,
      restDurationSeconds: 0,
    },
  ],
};

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

function makeHandlers() {
  return {
    onStartProgram: vi.fn(),
    onCustomizeProgram: vi.fn(),
    onEditOwnProgram: vi.fn(),
    onCreateProgram: vi.fn(),
    onNavigateToTimer: vi.fn(),
  };
}

function renderKatalog(handlers = makeHandlers()) {
  const utils = render(<ProgramCatalogView {...handlers} />);
  return { ...utils, handlers };
}

/** Seksjonen med brukerens egne program. */
function egneSeksjon() {
  return screen.getByTestId('egne-program');
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('mintrener_custom_workouts', JSON.stringify([egetProgram]));
});

describe('Programkatalogen — egne program', () => {
  it('viser egne program sammen med de andre programmene', async () => {
    renderKatalog();

    const seksjon = await screen.findByTestId('egne-program');
    expect(within(seksjon).getByText('Planke 100s')).toBeInTheDocument();
  });

  it('lar en egen økt startes derfra', async () => {
    const { handlers } = renderKatalog();
    await screen.findByTestId('egne-program');

    fireEvent.click(within(egneSeksjon()).getByRole('button', { name: /Start Planke 100s/ }));
    expect(handlers.onStartProgram).toHaveBeenCalledWith(
      expect.objectContaining({ id: egetProgram.id })
    );
  });

  it('sender redigering av eget program videre med økten intakt', async () => {
    const { handlers } = renderKatalog();
    await screen.findByTestId('egne-program');

    fireEvent.click(within(egneSeksjon()).getByRole('button', { name: /Rediger Planke 100s/ }));
    // Eget program skal REDIGERES, ikke kopieres — onCustomizeProgram lager
    // «(Min variant)» og hører til katalogprogrammene.
    expect(handlers.onEditOwnProgram).toHaveBeenCalledWith(
      expect.objectContaining({ id: egetProgram.id })
    );
    expect(handlers.onCustomizeProgram).not.toHaveBeenCalled();
  });

  it('lar egne program favorittmerkes herfra', async () => {
    renderKatalog();
    await screen.findByTestId('egne-program');

    const stjerne = within(egneSeksjon()).getByRole('button', {
      name: /Legg Planke 100s til favoritter/,
    });
    fireEvent.click(stjerne);

    expect(JSON.parse(localStorage.getItem('mintrener_favorite_program_ids') || '[]')).toContain(
      egetProgram.id
    );
  });

  it('har inngangen til å lage et nytt program', async () => {
    const { handlers } = renderKatalog();
    await screen.findByTestId('egne-program');

    fireEvent.click(screen.getByRole('button', { name: /Lag nytt program/ }));
    expect(handlers.onCreateProgram).toHaveBeenCalledTimes(1);
  });

  it('viser inngangen også når brukeren ikke har egne program ennå', async () => {
    localStorage.setItem('mintrener_custom_workouts', JSON.stringify([]));
    const { handlers } = renderKatalog();

    // Uten dette ville byggeren vært uten inngang etter at «Bygg» forsvant
    // fra bunnmenyen.
    const knapp = await screen.findByRole('button', { name: /Lag nytt program/ });
    fireEvent.click(knapp);
    expect(handlers.onCreateProgram).toHaveBeenCalledTimes(1);
  });
});

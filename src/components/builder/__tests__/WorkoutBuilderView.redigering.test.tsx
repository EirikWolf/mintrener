import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WorkoutBuilderView } from '../WorkoutBuilderView';
import { WorkoutTemplate } from '../../../types/workout';
import { saveCustomWorkout } from '../../../services/customWorkoutsService';

/**
 * Redigering av egne maler.
 *
 * Byggeren kunne laste en lagret mal inn i skjemaet, så det SÅ ut som
 * redigering. Men lagring mintet alltid en ny id (`custom-${Date.now()}`), og
 * `saveCustomWorkout` gjør upsert på id. Resultatet var en kopi hver gang, og
 * brukeren satt med «Planke 90s (Min variant)» to ganger i lista.
 *
 * Feilen var usynlig fordi begge kopiene ser riktige ut hver for seg. Det er
 * først i lista de avslører seg — og da har du allerede mistet oversikten over
 * hvilken av dem du sist endret.
 */

const LAGRET_ID = 'custom-1756600000000';

const lagretMal: WorkoutTemplate = {
  id: LAGRET_ID,
  name: 'Planke 90s (Min variant)',
  description: 'Egendefinert',
  type: 'custom',
  prepareDurationSeconds: 15,
  rounds: 1,
  roundRestDurationSeconds: 30,
  items: [
    {
      id: 'i1',
      exercise: { id: 'planke', name: 'Planke' },
      workDurationSeconds: 90,
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

vi.mock('../../../services/customWorkoutsService', async () => {
  const faktisk = await vi.importActual<
    typeof import('../../../services/customWorkoutsService')
  >('../../../services/customWorkoutsService');
  return {
    ...faktisk,
    fetchCustomWorkouts: vi.fn(async () => [lagretMal]),
    saveCustomWorkout: vi.fn(async () => undefined),
    deleteCustomWorkout: vi.fn(async () => undefined),
  };
});

const lagret = vi.mocked(saveCustomWorkout);

function renderBuilder() {
  return render(
    <WorkoutBuilderView onStartCustomWorkout={vi.fn()} onNavigateToTimer={vi.fn()} />
  );
}

/** Åpner den lagrede malen i skjemaet, slik brukeren gjør det. */
async function aapneLagretMal() {
  const rad = await screen.findByRole('button', { name: /Rediger Planke 90s/ });
  fireEvent.click(rad);
}

beforeEach(() => {
  localStorage.clear();
  lagret.mockClear();
});

describe('Programbyggeren — redigering av egen mal', () => {
  it('lar malen åpnes med tastatur, ikke bare med mus', async () => {
    renderBuilder();

    // Raden var en <div onClick> — usynlig for tastatur og skjermleser
    // (WCAG 2.1.1). Sletting og favoritt ligger som egne knapper ved siden av.
    const rad = await screen.findByRole('button', { name: /Rediger Planke 90s/ });
    expect(rad.tagName).toBe('BUTTON');
  });

  it('beholder id-en når en innlastet mal lagres på nytt', async () => {
    renderBuilder();
    await aapneLagretMal();

    fireEvent.change(screen.getByDisplayValue('Planke 90s (Min variant)'), {
      target: { value: 'Planke 100s (Min variant)' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Lagre endringer/ }));

    await waitFor(() => expect(lagret).toHaveBeenCalledTimes(1));
    const [lagretØkt] = lagret.mock.calls[0];
    expect(lagretØkt.id).toBe(LAGRET_ID);
    expect(lagretØkt.name).toBe('Planke 100s (Min variant)');
  });

  it('sier tydelig hvilken mal som redigeres', async () => {
    renderBuilder();
    await aapneLagretMal();

    // Navnet står i et <strong> inne i avsnittet, så teksten er delt i to noder
    expect(
      screen.getByText((_, el) => el?.textContent === 'Redigerer «Planke 90s (Min variant)»')
    ).toBeInTheDocument();
  });

  it('gir en egen vei til å lage en kopi, med ny id', async () => {
    renderBuilder();
    await aapneLagretMal();

    fireEvent.click(screen.getByRole('button', { name: /Lagre som ny mal/ }));

    await waitFor(() => expect(lagret).toHaveBeenCalledTimes(1));
    expect(lagret.mock.calls[0][0].id).not.toBe(LAGRET_ID);
  });

  it('forlater redigeringen når brukeren starter på nytt', async () => {
    renderBuilder();
    await aapneLagretMal();

    fireEvent.click(screen.getByRole('button', { name: /Start på en tom økt/ }));

    // Redigeringen er forlatt: banneret borte, knappen tilbake til «ny mal»,
    // og kopi-knappen skal ikke lenger finnes.
    expect(screen.queryByText(/Redigerer «/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Lagre som ny mal/ })).not.toBeInTheDocument();

    // En tom økt kan ikke lagres — det er ingenting å lagre ennå
    expect(screen.getByRole('button', { name: /Lagre som egen mal/ })).toBeDisabled();
    expect(lagret).not.toHaveBeenCalled();
  });

  it('lagrer en ny økt som ny mal når ingenting er lastet inn', async () => {
    renderBuilder();

    fireEvent.click(await screen.findByRole('button', { name: /Lagre som egen mal/ }));

    await waitFor(() => expect(lagret).toHaveBeenCalledTimes(1));
    expect(lagret.mock.calls[0][0].id).toMatch(/^custom-/);
    expect(lagret.mock.calls[0][0].id).not.toBe(LAGRET_ID);
  });
});

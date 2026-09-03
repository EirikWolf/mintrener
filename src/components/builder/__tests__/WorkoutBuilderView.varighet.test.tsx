import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { WorkoutBuilderView } from '../WorkoutBuilderView';

/**
 * Fri varighet per øvelse i programbyggeren.
 *
 * Byggeren tilbød tre faste arbeidstider (20/30/45 s) og tre pausetider
 * (0/10/15 s). En planke på 1 min 40 s — en reell økt på et norsk kontor —
 * var derfor umulig å bygge som program.
 *
 * Omgåelsen brukeren fant var å lage «Planke 100s» som EGEN ØVELSE, siden
 * øvelsesdialogen alltid har hatt fritt minutt/sekund-valg. Det forsøpler
 * biblioteket med én øvelse per varighet.
 *
 * Datamodellen støttet dette hele tiden: `workDurationSeconds` er et tall, og
 * `handleUpdateDuration` tok imot hvilket som helst. Bare UI-et begrenset det.
 * Varigheten hører til programmet; øvelsen bærer bare et forslag.
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

vi.mock('../../../services/customWorkoutsService', async () => {
  const faktisk = await vi.importActual<
    typeof import('../../../services/customWorkoutsService')
  >('../../../services/customWorkoutsService');
  return {
    ...faktisk,
    fetchCustomWorkouts: vi.fn(async () => []),
    saveCustomWorkout: vi.fn(async () => undefined),
    deleteCustomWorkout: vi.fn(async () => undefined),
  };
});

function renderBuilder() {
  return render(
    <WorkoutBuilderView onStartCustomWorkout={vi.fn()} onNavigateToTimer={vi.fn()} />
  );
}

/** Raden med tidsknapper for øvelse nr. `nr` (1-indeksert, som i UI-et). */
function varighetsrad(nr: number, felt: 'Arbeid' | 'Pause') {
  return screen.getByTestId(`varighet-${felt === 'Arbeid' ? 'work' : 'rest'}-${nr - 1}`);
}

beforeEach(() => {
  localStorage.clear();
});

describe('Programbyggeren — fri varighet per øvelse', () => {
  it('starter med hurtigvalgene og en inngang til egen tid', () => {
    renderBuilder();

    const rad = varighetsrad(1, 'Arbeid');
    expect(within(rad).getByRole('button', { name: /^Arbeidstid 20s$/ })).toBeInTheDocument();
    expect(within(rad).getByRole('button', { name: /Egen arbeidstid/ })).toBeInTheDocument();
  });

  it('lar brukeren sette 1 minutt og 40 sekunder som arbeidstid', () => {
    renderBuilder();

    // Utgangspunkt: 10 s klargjøring + 30 + 15 + 30 = 85 s
    expect(screen.getByText('1 min 25 sek')).toBeInTheDocument();

    fireEvent.click(within(varighetsrad(1, 'Arbeid')).getByRole('button', { name: /Egen arbeidstid/ }));

    fireEvent.change(screen.getByLabelText('Minutter'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Sekunder'), { target: { value: '40' } });
    fireEvent.click(screen.getByRole('button', { name: 'Bruk tiden' }));

    // 10 + 100 + 15 + 30 = 155 s
    expect(screen.getByText('2 min 35 sek')).toBeInTheDocument();
  });

  it('viser den egne tiden som valgt verdi, ikke som et tomt hurtigvalg', () => {
    renderBuilder();

    fireEvent.click(within(varighetsrad(1, 'Arbeid')).getByRole('button', { name: /Egen arbeidstid/ }));
    fireEvent.change(screen.getByLabelText('Minutter'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Sekunder'), { target: { value: '40' } });
    fireEvent.click(screen.getByRole('button', { name: 'Bruk tiden' }));

    // Brukeren skal kunne lese av 1:40 uten å åpne noe
    const knapp = within(varighetsrad(1, 'Arbeid')).getByRole('button', {
      name: /Egen arbeidstid/,
    });
    expect(knapp).toHaveTextContent('1:40');
    expect(knapp).toHaveAttribute('aria-pressed', 'true');
  });

  it('gjelder pausetiden på samme måte', () => {
    renderBuilder();

    fireEvent.click(within(varighetsrad(1, 'Pause')).getByRole('button', { name: /Egen pausetid/ }));
    fireEvent.change(screen.getByLabelText('Minutter'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Sekunder'), { target: { value: '30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Bruk tiden' }));

    // 10 + 30 + 90 + 30 = 160 s
    expect(screen.getByText('2 min 40 sek')).toBeInTheDocument();
  });

  it('lar brukeren angre uten å endre tiden', () => {
    renderBuilder();

    fireEvent.click(within(varighetsrad(1, 'Arbeid')).getByRole('button', { name: /Egen arbeidstid/ }));
    fireEvent.change(screen.getByLabelText('Minutter'), { target: { value: '9' } });
    fireEvent.click(screen.getByRole('button', { name: 'Avbryt tidsvalg' }));

    expect(screen.getByText('1 min 25 sek')).toBeInTheDocument();
  });

  it('avviser en arbeidstid på null — en øvelse må vare', () => {
    renderBuilder();

    fireEvent.click(within(varighetsrad(1, 'Arbeid')).getByRole('button', { name: /Egen arbeidstid/ }));
    fireEvent.change(screen.getByLabelText('Minutter'), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText('Sekunder'), { target: { value: '0' } });

    expect(screen.getByRole('button', { name: 'Bruk tiden' })).toBeDisabled();
  });

  it('tillater null i pause — pausen kan droppes helt', () => {
    renderBuilder();

    fireEvent.click(within(varighetsrad(1, 'Pause')).getByRole('button', { name: /Egen pausetid/ }));
    fireEvent.change(screen.getByLabelText('Minutter'), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText('Sekunder'), { target: { value: '0' } });

    expect(screen.getByRole('button', { name: 'Bruk tiden' })).toBeEnabled();
  });
});

describe('Programbyggeren — repetisjoner i stedet for tid', () => {
  it('måler øvelsen i tid som utgangspunkt', () => {
    renderBuilder();

    const rad = screen.getByTestId('maaling-0');
    expect(within(rad).getByRole('button', { name: /Mål Knebøy i tid/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('lar øvelsen måles i repetisjoner', () => {
    renderBuilder();

    fireEvent.click(
      within(screen.getByTestId('maaling-0')).getByRole('button', {
        name: /Mål Knebøy i repetisjoner/,
      })
    );

    const antall = screen.getByLabelText('Antall repetisjoner for Knebøy');
    expect(antall).toHaveValue(10);
  });

  it('lar antallet settes til 25', () => {
    renderBuilder();

    fireEvent.click(
      within(screen.getByTestId('maaling-0')).getByRole('button', {
        name: /Mål Knebøy i repetisjoner/,
      })
    );
    fireEvent.change(screen.getByLabelText('Antall repetisjoner for Knebøy'), {
      target: { value: '25' },
    });

    expect(screen.getByLabelText('Antall repetisjoner for Knebøy')).toHaveValue(25);
  });

  it('sier tydelig at tiden er et anslag når øvelsen måles i repetisjoner', () => {
    renderBuilder();

    fireEvent.click(
      within(screen.getByTestId('maaling-0')).getByRole('button', {
        name: /Mål Knebøy i repetisjoner/,
      })
    );

    // Totaltiden regnes fortsatt ut, men den er ikke en frist
    expect(screen.getByText(/Anslått tid/)).toBeInTheDocument();
  });

  it('går tilbake til tid og fjerner repetisjonsmålet', () => {
    renderBuilder();

    const rad = () => screen.getByTestId('maaling-0');
    fireEvent.click(
      within(rad()).getByRole('button', { name: /Mål Knebøy i repetisjoner/ })
    );
    fireEvent.click(within(rad()).getByRole('button', { name: /Mål Knebøy i tid/ }));

    expect(screen.queryByLabelText('Antall repetisjoner for Knebøy')).not.toBeInTheDocument();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { ChallengeDetailModal } from '../ChallengeDetailModal';
import { STARTER_CHALLENGES } from '../../../data/challenges';
import { calculateWorkoutDuration } from '../../../services/customWorkoutsService';

/**
 * Forhåndsvisning av en dag i en utfordring.
 *
 * Funn fra Eirik 2026-09-01: «Det bør være informasjon om hvilke øvelser som
 * inngår i de forskjellige dagene på en challenge, slik at de som ikke har
 * erfaring kan forberede seg ved å se på hvordan øvelsene skal utføres i
 * forkant. […] Utfordringene bør også inneholde hvor lang tid de tar, slik at
 * man kan sette av noen lunde riktig tid i kalenderen.»
 *
 * Begge deler manglet, og den første manglet på en måte som ikke var til å
 * komme rundt: et trykk på en dag STARTET økta med det samme. Det fantes ingen
 * vei fra dagsrutenettet til å se hva dagen inneholder — den som ville
 * forberede seg, måtte starte økta og avbryte den.
 *
 * Testene måler de to spørsmålene en nybegynner faktisk har foran seg:
 * «hva skal jeg gjøre?» og «hvor lang tid tar det?»
 */

vi.mock('../../../services/firebase', () => ({ app: {}, auth: {}, db: {} }));

const kontorvanen = STARTER_CHALLENGES.find((c) => c.id === 'kontorvanen-28-dager')!;
const førsteTreningsdag = kontorvanen.dailyWorkouts.find((d) => !d.isRestDay)!;
const førsteHviledag = kontorvanen.dailyWorkouts.find((d) => d.isRestDay)!;

function vis(onStartWorkout = vi.fn()) {
  render(
    <ChallengeDetailModal
      challenge={kontorvanen}
      onClose={vi.fn()}
      onStartWorkout={onStartWorkout}
    />
  );
  return { onStartWorkout };
}

/**
 * Åpner forhåndsvisningen for en dag ved å trykke i dagsrutenettet.
 *
 * Scopet til rutenettet med vilje: «Start Dag 1»-hurtigknappen nederst har
 * samme tall i navnet, og et usikret søk traff begge.
 */
function åpneDag(dag: number) {
  const rutenett = screen.getByTestId('dagsrutenett');
  fireEvent.click(within(rutenett).getByRole('button', { name: new RegExp(`^Dag ${dag}\\b`) }));
}

/**
 * Minutter avrundet OPP.
 *
 * Varigheten skal settes av i en kalender. En kontorøkt på 2 min 25 s som
 * meldes som «2 min» gjør deg forsinket til neste møte; det er ikke en
 * avrundingsdetalj, det er hele grunnen til at tallet vises.
 */
const minutter = (sekunder: number) => Math.ceil(sekunder / 60);

beforeEach(() => {
  localStorage.clear();
});

describe('Dagsvisning — hva inneholder dagen', () => {
  it('starter ikke økta på første trykk, men viser hva den inneholder', () => {
    // Kjernen i funnet. Å starte umiddelbart gjør forberedelse umulig.
    const { onStartWorkout } = vis();
    åpneDag(førsteTreningsdag.day);

    expect(onStartWorkout).not.toHaveBeenCalled();
    expect(screen.getByTestId('dagsvisning')).toBeInTheDocument();
  });

  it('lister hver øvelse i dagen, med katalogens navn', () => {
    vis();
    åpneDag(førsteTreningsdag.day);

    const panel = screen.getByTestId('dagsvisning');
    for (const item of førsteTreningsdag.workout!.items) {
      expect(within(panel).getByText(item.exercise.name)).toBeInTheDocument();
    }
  });

  it('viser arbeidstiden per øvelse, ikke bare navnet', () => {
    // «40 s» er forskjellen på å kunne forberede seg og å bare vite rekkefølgen.
    vis();
    åpneDag(førsteTreningsdag.day);

    const panel = screen.getByTestId('dagsvisning');
    const første = førsteTreningsdag.workout!.items[0];
    expect(
      within(panel).getAllByText(new RegExp(`${første.workDurationSeconds}\\s*s`)).length
    ).toBeGreaterThan(0);
  });

  it('starter økta først når brukeren ber om det', () => {
    const { onStartWorkout } = vis();
    åpneDag(førsteTreningsdag.day);

    fireEvent.click(
      within(screen.getByTestId('dagsvisning')).getByRole('button', { name: /^Start dag/i })
    );
    expect(onStartWorkout).toHaveBeenCalledTimes(1);
    expect(onStartWorkout.mock.calls[0][1]).toBe(førsteTreningsdag.day);
  });

  it('lar brukeren lukke visningen uten å ha startet noe', () => {
    const { onStartWorkout } = vis();
    åpneDag(førsteTreningsdag.day);

    fireEvent.click(
      within(screen.getByTestId('dagsvisning')).getByRole('button', { name: /Lukk dagsvisning/i })
    );
    expect(screen.queryByTestId('dagsvisning')).not.toBeInTheDocument();
    expect(onStartWorkout).not.toHaveBeenCalled();
  });

  it('sier fra at hviledager er hviledager i stedet for å vise en tom liste', () => {
    vis();
    åpneDag(førsteHviledag.day);

    const panel = screen.getByTestId('dagsvisning');
    // getAllByText: både forklaringen og «Marker hviledagen som fullført»
    // inneholder ordet, og det er som det skal være.
    expect(within(panel).getAllByText(/hviledag/i).length).toBeGreaterThan(0);
    expect(within(panel).queryByRole('button', { name: /^Start dag/i })).not.toBeInTheDocument();
  });
});

describe('Dagsvisning — hvor lang tid tar det', () => {
  it('viser dagens varighet, så den kan settes av i kalenderen', () => {
    vis();
    åpneDag(førsteTreningsdag.day);

    const min = minutter(calculateWorkoutDuration(førsteTreningsdag.workout!));
    // getAllByText: Kontorvanens egen goalNote sier «3 minutter ved pulten», og
    // treffer samme mønster. At de to er enige er nettopp poenget — den beregnede
    // varigheten motsier ikke teksten utfordringen selv lover.
    expect(
      within(screen.getByTestId('dagsvisning')).getAllByText(new RegExp(`${min}\\s*min`)).length
    ).toBeGreaterThan(0);
  });

  it('oppgir varigheten allerede i toppen, før man åpner en enkelt dag', () => {
    // Spørsmålet «hvor lang tid tar denne utfordringen per dag» skal kunne
    // besvares uten å lete seg gjennom dagsrutenettet.
    vis();
    const min = minutter(calculateWorkoutDuration(førsteTreningsdag.workout!));
    expect(screen.getByTestId('utfordring-varighet')).toHaveTextContent(new RegExp(`${min}\\s*min`));
  });
});

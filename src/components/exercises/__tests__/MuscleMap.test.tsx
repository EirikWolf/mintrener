import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MuscleMap, MUSKELREGIONER } from '../MuscleMap';
import { MUSKELGRUPPER, muskelgrupperFor, tolkMuskel } from '../../../data/muskler';
import { EXERCISE_LIBRARY } from '../../../data/exercises/index';

/**
 * Muskelkartet.
 *
 * Idé fra Eirik 2026-09-01: «illustrasjoner som viser hvilke muskler øvelsen
 * aktiverer». Det er også argumentet som avgjorde Beslutning 49 — et fotografi
 * kan ikke vise hvilke muskler som jobber, så illustrasjon dominerer strengt.
 *
 * Kartet er ÉN figur som serverer alle 75 øvelsene, ikke 75 filer. Det drives
 * av `muskler`-feltet gjennom det kontrollerte ordforrådet (Beslutning 50).
 */

const gruppeneI = (container: HTMLElement, nivå: string) =>
  [...container.querySelectorAll(`[data-niva="${nivå}"]`)].map((el) =>
    el.getAttribute('data-gruppe')
  );

describe('Muskelkartet dekker kroppen', () => {
  it('har en region for hver eneste gruppe i ordforrådet', () => {
    // Uten dette kan en gruppe finnes i ordforrådet uten å kunne vises, og en
    // øvelse ville lyst opp ingenting uten at noe sa fra.
    const dekket = new Set(MUSKELREGIONER.map((r) => r.gruppe));
    const mangler = MUSKELGRUPPER.filter((g) => !dekket.has(g));
    expect(mangler, `Grupper uten region i kartet: ${mangler.join(', ')}`).toEqual([]);
  });

  it('viser både forside og bakside', () => {
    // Sete, bakside lår og latissimus finnes ikke forfra. Ett kart ville skjult
    // halve kroppen — og setet er den hyppigste primærmuskelen i katalogen.
    const sider = new Set(MUSKELREGIONER.map((r) => r.side));
    expect(sider).toEqual(new Set(['front', 'bak']));
  });
});

describe('Muskelkartet leser øvelsen', () => {
  it('markerer primærmusklene', () => {
    const { container } = render(
      <MuscleMap muskler={{ primær: ['sete'], sekundær: [] }} />
    );
    expect(gruppeneI(container, 'primær')).toContain('sete');
  });

  it('skiller sekundære fra primære', () => {
    const { container } = render(
      <MuscleMap muskler={{ primær: ['sete'], sekundær: ['legger'] }} />
    );
    expect(gruppeneI(container, 'primær')).toContain('sete');
    expect(gruppeneI(container, 'sekundær')).toContain('legger');
    expect(gruppeneI(container, 'sekundær')).not.toContain('sete');
  });

  it('lar en gruppe som allerede er primær, slippe å lyse som sekundær også', () => {
    const { container } = render(
      <MuscleMap muskler={{ primær: ['kjerne'], sekundær: ['magemuskler'] }} />
    );
    // «magemuskler» og «kjerne» er samme gruppe. To nivåer på samme region ville
    // vært en motsigelse, ikke tilleggsinformasjon.
    expect(gruppeneI(container, 'sekundær')).not.toContain('kjerne');
  });

  it('følger synonymene fra ordforrådet', () => {
    const { container } = render(
      <MuscleMap muskler={{ primær: ['hamstring', 'brede ryggmuskel'], sekundær: [] }} />
    );
    const primære = gruppeneI(container, 'primær');
    expect(primære).toContain('bakside lår');
    expect(primære).toContain('latissimus');
  });

  it('lyser ikke opp noe for kvaliteter som ikke er muskler', () => {
    // «kondisjon» og «balanse» er egenskaper ved øvelsen, ikke anatomi.
    const { container } = render(
      <MuscleMap muskler={{ primær: ['kondisjon', 'balanse'], sekundær: [] }} />
    );
    expect(gruppeneI(container, 'primær')).toEqual([]);
  });
});

describe('Muskelkartet er lesbart uten å se det', () => {
  it('sier med ord hvilke muskler som jobber', () => {
    // WCAG: en fargelagt figur er ikke informasjon for en skjermleser.
    render(<MuscleMap muskler={{ primær: ['sete'], sekundær: ['legger'] }} />);
    const fig = screen.getByRole('img');
    expect(fig).toHaveAccessibleName(/sete/i);
    expect(fig).toHaveAccessibleName(/legger/i);
  });

  it('sier fra når øvelsen ikke har muskler å vise', () => {
    render(<MuscleMap muskler={{ primær: ['restitusjon'], sekundær: [] }} />);
    expect(screen.getByRole('img')).toHaveAccessibleName(/ingen/i);
  });
});

describe('Hele katalogen kan tegnes', () => {
  it('gir hver øvelse med anatomiske muskler minst én region å lyse opp', () => {
    // Måler en DATAEGENSKAP, og gjør det uten DOM. Første utgave rendret alle 75
    // komponentene i én test og brukte 2,4 sekunder; det presset en annen,
    // grensetreffende test over vitests 5-sekundersgrense i full kjøring.
    // Egenskapen er den samme, og `muskelgrupperFor` er ren.
    const uten: string[] = [];
    for (const ex of EXERCISE_LIBRARY) {
      const { primær, sekundær } = muskelgrupperFor(ex.muskler);
      if (primær.length + sekundær.length > 0) continue;

      // Øvelser som BARE fører kvaliteter — pust, restitusjon, balanse — har
      // ingen anatomi å vise, og det er riktig. Alt annet er en feil.
      const harMuskel = [...ex.muskler.primær, ...(ex.muskler.sekundær ?? [])].some(
        (n) => tolkMuskel(n)?.type === 'muskel'
      );
      if (harMuskel) uten.push(ex.id);
    }
    expect(uten, `Øvelser med muskelnavn som ikke gir noen region: ${uten.join(', ')}`).toEqual(
      []
    );
  });

  it('tegner faktisk en figur for en vilkårlig øvelse fra katalogen', () => {
    // Den dyre delen — at komponenten rendrer — trengs bare én gang.
    const kneboy = EXERCISE_LIBRARY.find((e) => e.id === 'kneboy')!;
    const { container } = render(<MuscleMap muskler={kneboy.muskler} />);
    expect(container.querySelectorAll('[data-niva="primær"]').length).toBeGreaterThan(0);
  });
});

import { describe, it, expect } from 'vitest';
import { EXERCISE_LIBRARY } from '../exercises/index';
import { tolkMuskel, MUSKELGRUPPER, KVALITETER } from '../muskler';

/**
 * Muskelordforrådet i øvelseskatalogen.
 *
 * BAKGRUNN: `muskler.primær` og `muskler.sekundær` er fritekst, og teksten har
 * drevet fra hverandre — 55 unike navn for 75 øvelser. `sete` og
 * `setemuskulatur`, `bakside lår` og `hamstring`, `latissimus` og
 * `brede ryggmuskel` er samme muskel skrevet på to måter. Rundt en femtedel av
 * navnene er dessuten ikke muskler i det hele tatt: `kondisjon`, `balanse`,
 * `restitusjon`, `grep`, `lepper`.
 *
 * MuscleIcon normaliserte med delstrengsjekker i en fast rekkefølge, og
 * rekkefølgen var feil. Fire feil sto i produksjon:
 *
 *   bakside lår (4 øvelser) → `lår`-sjekken traff først      → quadriceps-ikon
 *   korsrygg    (2 øvelser) → `rygg`-sjekken traff først     → øvre rygg-ikon
 *   brystrygg   (2 øvelser) → `bryst`-sjekken traff først    → bryst-ikon
 *   latissimus  (5 øvelser) → ingen gren traff               → magemuskel-ikon
 *
 * Grenene for `korsrygg` og `bakside lår` var død kode; de kunne aldri nås.
 *
 * Testene her binder to ting: at hvert eneste navn i katalogen er kjent, og at
 * de fire feilene ikke kan komme tilbake. Uttømmenheten er det viktigste — den
 * gjør at neste person som skriver «rumpemuskler» får rød test i stedet for et
 * stilltiende feil ikon.
 */

const alleNavn = [
  ...new Set(
    EXERCISE_LIBRARY.flatMap((ex) => [...ex.muskler.primær, ...(ex.muskler.sekundær ?? [])])
  ),
];

describe('Muskelordforrådet', () => {
  it('kjenner hvert eneste navn som står i katalogen', () => {
    // Uten denne får et ukjent navn et vilkårlig ikon i stedet for en feil.
    const ukjente = alleNavn.filter((navn) => tolkMuskel(navn) === null);
    expect(ukjente, `Ukjente muskelnavn: ${ukjente.join(', ')}`).toEqual([]);
  });

  it('peker bare på grupper og kvaliteter som finnes i ordforrådet', () => {
    for (const navn of alleNavn) {
      const tolkning = tolkMuskel(navn)!;
      if (tolkning.type === 'muskel') {
        expect(tolkning.grupper.length, `${navn} gir ingen gruppe`).toBeGreaterThan(0);
        for (const g of tolkning.grupper) {
          expect(MUSKELGRUPPER, `${navn} → ukjent gruppe ${g}`).toContain(g);
        }
      } else {
        expect(KVALITETER, `${navn} → ukjent kvalitet`).toContain(tolkning.kvalitet);
      }
    }
  });

  it('skiller muskler fra kvaliteter', () => {
    // Et muskelkart kan ikke fargelegge «restitusjon». Kvaliteter er egenskaper
    // ved øvelsen, ikke anatomi, og hører ikke hjemme i en muskelillustrasjon.
    for (const navn of ['kondisjon', 'balanse', 'restitusjon', 'helkropp', 'grep']) {
      expect(tolkMuskel(navn)?.type, navn).toBe('kvalitet');
    }
    for (const navn of ['sete', 'bryst', 'latissimus', 'legger']) {
      expect(tolkMuskel(navn)?.type, navn).toBe('muskel');
    }
  });
});

describe('De fire feilene som sto i produksjon', () => {
  const gruppeFor = (navn: string) => {
    const t = tolkMuskel(navn);
    return t?.type === 'muskel' ? t.grupper : [];
  };

  it('lar bakside lår være bakside lår, ikke forside', () => {
    expect(gruppeFor('bakside lår')).toEqual(['bakside lår']);
    expect(gruppeFor('hamstring')).toEqual(['bakside lår']);
  });

  it('lar korsrygg være korsrygg, ikke øvre rygg', () => {
    expect(gruppeFor('korsrygg')).toEqual(['korsrygg']);
  });

  it('lar brystrygg være øvre rygg, ikke bryst', () => {
    // Brystryggen er den delen av ryggsøylen som ligger bak brystkassen. At
    // ordet inneholder «bryst» gjør den ikke til en brystmuskel.
    expect(gruppeFor('brystrygg')).toEqual(['øvre rygg']);
  });

  it('gir latissimus sin egen gruppe i stedet for å falle tilbake på magen', () => {
    expect(gruppeFor('latissimus')).toEqual(['latissimus']);
    expect(gruppeFor('brede ryggmuskel')).toEqual(['latissimus']);
  });
});

describe('Synonymer samles', () => {
  const samme = (a: string, b: string) =>
    expect(tolkMuskel(a)).toEqual(tolkMuskel(b));

  it('behandler skrivemåter av samme muskel likt', () => {
    samme('sete', 'setemuskulatur');
    samme('hofteleddsbøyere', 'hoftebøyere');
    samme('magemuskler', 'dype magemuskler');
    samme('lyske', 'adduktorer');
    samme('trapezius', 'øvre rygg');
  });

  it('lar ryggsøylen dekke både øvre og nedre rygg', () => {
    // Katte-ku mobiliserer hele ryggen. Ett kart-område ville løyet om halve
    // øvelsen, så oppslaget gir flere grupper.
    const t = tolkMuskel('ryggsøyle');
    expect(t?.type).toBe('muskel');
    expect(t?.type === 'muskel' && t.grupper).toEqual(
      expect.arrayContaining(['øvre rygg', 'korsrygg'])
    );
  });
});

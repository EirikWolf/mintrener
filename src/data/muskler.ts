/**
 * Kontrollert ordforråd for muskler og treningskvaliteter.
 *
 * HVORFOR DETTE FINNES: `muskler.primær` og `muskler.sekundær` i øvelseskatalogen
 * er fritekst, og teksten har drevet fra hverandre — 55 unike navn for 75
 * øvelser. `sete` og `setemuskulatur`, `bakside lår` og `hamstring`,
 * `latissimus` og `brede ryggmuskel` er samme muskel skrevet på to måter.
 *
 * Normaliseringen lå tidligere i MuscleIcon som delstrengsjekker i fast
 * rekkefølge, og rekkefølgen var feil. Fire feil sto i produksjon: `bakside lår`
 * traff `lår`-sjekken og ga quadriceps-ikon, `korsrygg` traff `rygg` og ga øvre
 * rygg, `brystrygg` traff `bryst` og ga brystmuskel, og `latissimus` traff
 * ingenting og falt tilbake på magemuskler. Grenene for `korsrygg` og
 * `bakside lår` var død kode.
 *
 * Oppslaget er derfor EKSPLISITT, ikke mønsterbasert. Et navn som ikke står i
 * tabellen gir `null`, og en test feiler — i stedet for at det stilltiende får
 * et vilkårlig ikon.
 *
 * FRITEKSTEN BEHOLDES i katalogen. Den er brukervendt («brede ryggmuskel» leses
 * bedre enn «latissimus» for mange), og en kanonisk nøkkel ved siden av dekker
 * ikoner, filtrering og et framtidig muskelkart uten å endre 75 øvelser.
 */

/**
 * Anatomiske grupper — det et muskelkart kan fargelegge.
 *
 * Grovheten er bevisst: dette er regioner på en kroppsfigur, ikke en
 * anatomiliste. Å skille rectus femoris fra vastus lateralis gir ingen verdi i
 * en treningsapp, og lager bare flere navn å drive fra hverandre.
 */
export const MUSKELGRUPPER = [
  'bryst',
  'skuldre',
  'øvre rygg',
  'latissimus',
  'korsrygg',
  'biceps',
  'triceps',
  'underarmer',
  'kjerne',
  'skrå magemuskler',
  'hoftebøyere',
  'sete',
  'forside lår',
  'bakside lår',
  'adduktorer',
  'legger',
  'nakke',
  'pustemuskulatur',
] as const;

export type MuskelGruppe = (typeof MUSKELGRUPPER)[number];

/**
 * Egenskaper ved øvelsen som IKKE er anatomi.
 *
 * Katalogen fører `kondisjon`, `balanse` og `restitusjon` i samme felt som
 * muskler. De hører hjemme et annet sted — et muskelkart kan ikke fargelegge
 * «restitusjon» — men de er reell informasjon om øvelsen, så de kastes ikke.
 * De skilles ut, og kan senere flyttes til et eget felt i schemaet.
 */
export const KVALITETER = [
  'kondisjon',
  'balanse',
  'stabilitet',
  'mobilitet',
  'grepsstyrke',
  'restitusjon',
  'helkropp',
  'stemme',
] as const;

export type Kvalitet = (typeof KVALITETER)[number];

/**
 * Hvert navn som faktisk står i katalogen, med gruppene det peker på.
 *
 * Flere grupper er lov og noen ganger riktig: katte-ku oppgir `ryggsøyle`, og
 * øvelsen mobiliserer hele ryggen. Ett kart-område ville løyet om halve øvelsen.
 */
const MUSKEL_OPPSLAG: Record<string, MuskelGruppe[]> = {
  // Overkropp, front
  bryst: ['bryst'],
  'øvre bryst': ['bryst'],
  skuldre: ['skuldre'],
  'fremre skuldre': ['skuldre'],
  biceps: ['biceps'],
  triceps: ['triceps'],
  underarmer: ['underarmer'],
  // Hånd og håndledd har ingen egen kartregion; underarmen er den som jobber.
  håndledd: ['underarmer'],
  fingre: ['underarmer'],
  håndmuskler: ['underarmer'],

  // Rygg
  'øvre rygg': ['øvre rygg'],
  trapezius: ['øvre rygg'],
  // Brystryggen er ryggsøylen bak brystkassen. At ordet inneholder «bryst»
  // gjør den ikke til en brystmuskel — det var feilen i den gamle koden.
  brystrygg: ['øvre rygg'],
  holdningsmuskler: ['øvre rygg'],
  latissimus: ['latissimus'],
  'brede ryggmuskel': ['latissimus'],
  korsrygg: ['korsrygg'],
  ryggsøyle: ['øvre rygg', 'korsrygg'],

  // Kjerne
  kjerne: ['kjerne'],
  magemuskler: ['kjerne'],
  'dype magemuskler': ['kjerne'],
  'tverrgående magemuskel': ['kjerne'],
  'skrå magemuskler': ['skrå magemuskler'],
  sidemuskler: ['skrå magemuskler'],

  // Pust — kormodulens øvelser
  diafragma: ['pustemuskulatur'],
  pustemuskulatur: ['pustemuskulatur'],
  interkostalmuskler: ['pustemuskulatur'],
  støttemuskulatur: ['pustemuskulatur'],

  // Hofte og sete
  sete: ['sete'],
  setemuskulatur: ['sete'],
  hoftebøyere: ['hoftebøyere'],
  hofteleddsbøyere: ['hoftebøyere'],
  hofteledd: ['hoftebøyere'],
  hofter: ['sete', 'hoftebøyere'],
  // Skøytehopp arbeider utover i hofta; setemuskulaturen er den som bærer det.
  'side lår': ['sete'],

  // Bein
  'forside lår': ['forside lår'],
  lår: ['forside lår'],
  'bakside lår': ['bakside lår'],
  hamstring: ['bakside lår'],
  adduktorer: ['adduktorer'],
  lyske: ['adduktorer'],
  legger: ['legger'],

  nakke: ['nakke'],
};

/** Navn i katalogen som beskriver en kvalitet, ikke en muskel. */
const KVALITET_OPPSLAG: Record<string, Kvalitet> = {
  kondisjon: 'kondisjon',
  balanse: 'balanse',
  ankelstabilitet: 'stabilitet',
  knestabilitet: 'stabilitet',
  mobilitet: 'mobilitet',
  grep: 'grepsstyrke',
  grepsstyrke: 'grepsstyrke',
  restitusjon: 'restitusjon',
  'parasympatisk nervesystem': 'restitusjon',
  helkropp: 'helkropp',
  lepper: 'stemme',
  stemmestøtte: 'stemme',
};

export type Muskeltolkning =
  | { type: 'muskel'; grupper: MuskelGruppe[] }
  | { type: 'kvalitet'; kvalitet: Kvalitet };

/**
 * Slår opp ett navn fra katalogen.
 *
 * Returnerer `null` for ukjente navn — med vilje. Et stilltiende fallback var
 * nettopp det som lot `latissimus` vise et magemuskel-ikon i fem øvelser.
 */
export function tolkMuskel(navn: string): Muskeltolkning | null {
  const nøkkel = navn.toLowerCase().trim();

  const grupper = MUSKEL_OPPSLAG[nøkkel];
  if (grupper) return { type: 'muskel', grupper };

  const kvalitet = KVALITET_OPPSLAG[nøkkel];
  if (kvalitet) return { type: 'kvalitet', kvalitet };

  return null;
}

/** Første anatomiske gruppe for et navn, for visninger som viser ett ikon. */
export function muskelgruppeFor(navn: string): MuskelGruppe | null {
  const tolkning = tolkMuskel(navn);
  return tolkning?.type === 'muskel' ? tolkning.grupper[0] : null;
}

/**
 * Alle anatomiske grupper en øvelse treffer, primær før sekundær, uten
 * gjentakelser. Grunnlaget for et muskelkart.
 */
export function muskelgrupperFor(muskler: {
  primær: string[];
  sekundær?: string[];
}): { primær: MuskelGruppe[]; sekundær: MuskelGruppe[] } {
  const somGrupper = (navn: string[]) =>
    navn.flatMap((n) => {
      const t = tolkMuskel(n);
      return t?.type === 'muskel' ? t.grupper : [];
    });

  const primær = [...new Set(somGrupper(muskler.primær))];
  // En gruppe som allerede er primær, skal ikke også lyse som sekundær.
  const sekundær = [...new Set(somGrupper(muskler.sekundær ?? []))].filter(
    (g) => !primær.includes(g)
  );

  return { primær, sekundær };
}

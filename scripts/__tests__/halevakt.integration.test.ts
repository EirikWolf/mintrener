/**
 * Integrasjonstest for halevakten med EKTE ffmpeg mot bevisfilene.
 *
 * De øvrige halevakt-testene mater inn måltall for hånd og pinner derfor bare
 * terskel-logikken. Denne kjører den faktiske måle-kommandoen
 * (`buildVolumeDetectArgs` → ffmpeg → `parseMeanVolumeDb`) mot råklippene i
 * audio/lyttekandidater/raa/, der produkteier har fasit på hva som er avkuttet.
 * Det er den eneste testen som kan fange at kalibreringen råtner — f.eks. hvis
 * noen flytter målingen tilbake til etterbehandlet output, endrer vinduet eller
 * bytter ffmpeg-argumenter slik at tallene blir noe helt annet.
 *
 * BEVISMATERIALET ER FULLSTENDIG (reviewer BØR 1): tabellen under lister ALLE
 * 17 filene i mappa, ikke bare de ni produkteier har lyttet på. Åtte av dem er
 * ULYTTET og står som `uavklart` — de kan ikke brukes som «friske» i en
 * utledning før noen faktisk har hørt dem. En egen test pinner at tabellen og
 * mappa er identiske, slik at ingen bevisfil kan legges til og stilltiende
 * holdes utenfor kalibreringen.
 *
 * ffmpeg er en ekstern avhengighet. Mangler den, skippes måleblokken
 * EKSPLISITT — vitest rapporterer den som skipped, den skal aldri stilltiende
 * passere. CI installerer ffmpeg (.github/workflows/ci.yml) nettopp for at den
 * skal kjøre der. Fordi CI-runneren kjører en ANNEN ffmpeg-versjon enn fasiten
 * ble satt med, har fila to slags assertions med bevisst ulik strenghet —
 * klassifiseringen er streng, de eksakte dB-tallene har en toleranse. Se
 * MAALING_TOLERANSE_DB for hvorfor.
 */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildVolumeDetectArgs,
  isTailSuspect,
  parseMeanVolumeDb,
  tailFalloffDb,
  TAIL_FALLOFF_THRESHOLD_DB,
} from '../voicebankTasks';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAA_DIR = path.resolve(__dirname, '..', '..', 'audio', 'lyttekandidater', 'raa');

function hasFfmpeg(): boolean {
  const res = spawnSync('ffmpeg', ['-version'], { encoding: 'utf-8' });
  return !res.error && res.status === 0;
}

const FFMPEG_AVAILABLE = hasFfmpeg();

/** Kjører produksjonens egen måle-kommando mot en fil på disk. */
function measure(fileName: string): { overallMeanDb: number; tailMeanDb: number } {
  const filePath = path.join(RAA_DIR, fileName);
  const read = (window: 'whole' | 'tail'): number => {
    const res = spawnSync('ffmpeg', buildVolumeDetectArgs(filePath, window), {
      encoding: 'utf-8',
    });
    expect(res.error).toBeUndefined();
    expect(res.status).toBe(0);
    const db = parseMeanVolumeDb(res.stderr ?? '');
    expect(db).not.toBeNull();
    return db as number;
  };
  return { overallMeanDb: read('whole'), tailMeanDb: read('tail') };
}

/**
 * `avkuttet`/`frisk` = produkteier har LYTTET og felt dom.
 * `uavklart` = ingen har hørt klippet ennå; det er derfor hverken bevis for
 * eller mot kalibreringen, og skal aldri telles som «friskt» i en utledning.
 */
type Status = 'avkuttet' | 'frisk' | 'uavklart';

interface Maaling {
  /**
   * Fall i halen (hale minus samlet mean_volume), målt 2026-08-30 med
   * ffmpeg 8.1.1. Tallet er KALIBRERINGSDOKUMENTASJON, ikke en eksakt
   * kontrakt — se MAALING_TOLERANSE_DB.
   */
  readonly fall: number;
  readonly status: Status;
}

/** Hele bevismaterialet — alle 17 råklippene i audio/lyttekandidater/raa/. */
const MAALINGER: readonly Maaling[] = [
  // Produkteiers fasit fra A/B-lyttingen av burpees-uttalen (Beslutning 39).
  { fil: 'befal_2_burpees_engelsk.mp3', fall: -24.4, status: 'avkuttet' },
  { fil: 'befal_1_borpis_produksjon.mp3', fall: -69.3, status: 'frisk' },
  { fil: 'befal_3_borpies.mp3', fall: -72.2, status: 'frisk' },
  { fil: 'befal_4_borpiis.mp3', fall: -62.7, status: 'frisk' },
  { fil: 'hardcore_1_borpis_produksjon.mp3', fall: -49.9, status: 'frisk' },
  { fil: 'hardcore_2_burpees_engelsk.mp3', fall: -68.3, status: 'frisk' },
  { fil: 'komiker_1_borpis_produksjon.mp3', fall: -71.7, status: 'frisk' },
  { fil: 'komiker_2_burpees_engelsk.mp3', fall: -71.5, status: 'frisk' },
  { fil: 'komiker_3_borpies.mp3', fall: -70.9, status: 'frisk' },
  // Ulyttede. De tre første er KALIBRERINGSBÆRENDE: to ligger over terskelen
  // og én er dårligere enn dagens «dårligste verifisert friske» (−49,9).
  { fil: 'komiker_last5.mp3', fall: -18.7, status: 'uavklart' },
  { fil: 'komiker_start_321_short.mp3', fall: -32.1, status: 'uavklart' },
  { fil: 'befal_start_321_short.mp3', fall: -49.4, status: 'uavklart' },
  { fil: 'befal_last5.mp3', fall: -57.2, status: 'uavklart' },
  { fil: 'befal_intro.mp3', fall: -70.1, status: 'uavklart' },
  { fil: 'befal_exercise-burpees.mp3', fall: -71.4, status: 'uavklart' },
  { fil: 'komiker_exercise-burpees.mp3', fall: -71.4, status: 'uavklart' },
  { fil: 'komiker_intro.mp3', fall: -72.3, status: 'uavklart' },
];

const AVKUTTET = 'befal_2_burpees_engelsk.mp3'; // «burpii» — s-lyden er borte
const FRISKE = MAALINGER.filter((m) => m.status === 'frisk').map((m) => m.fil);
const UAVKLARTE = MAALINGER.filter((m) => m.status === 'uavklart').map((m) => m.fil);

// Denne trenger ikke ffmpeg: den vokter at bevismaterialet er komplett.
describe('halevakt — bevismaterialet er fullstendig', () => {
  it('tabellen dekker nøyaktig filene som ligger i audio/lyttekandidater/raa/', () => {
    const paaDisk = fs
      .readdirSync(RAA_DIR)
      .filter((f) => f.endsWith('.mp3'))
      .sort();
    // Reviewers BØR 1: kalibreringen ble utledet av et gap mens tre målinger
    // fra samme committede mappe var holdt utenfor. Legges det en fil til her,
    // skal denne testen tvinge den inn i tabellen — med en status noen må ta
    // stilling til.
    expect(paaDisk).toEqual([...MAALINGER].map((m) => m.fil).sort());
    expect(MAALINGER).toHaveLength(17);
  });

  it('ingen ulyttet fil er smuglet inn blant de verifisert friske', () => {
    expect(FRISKE).toHaveLength(8);
    expect(UAVKLARTE).toHaveLength(8);
    expect(FRISKE).not.toContain('komiker_last5.mp3');
  });
});

/**
 * Toleranse for de EKSAKTE måltallene i MAALINGER — bevisst løsere enn
 * klassifiseringstestene under.
 *
 * De to slagene assertions i denne fila har ulik strenghet med vilje:
 *
 * 1. KLASSIFISERINGEN (`isTailSuspect`: det avkuttede flagges, de åtte friske
 *    flagges ikke, inversjons-regresjonsvakten) er det vakten FAKTISK gjør, og
 *    den hviler på marginer på 11,6–13,9 dB ned til terskelen. Den skal være
 *    streng — den tåler enhver rimelig versjonsdrift, og et brudd der er et
 *    ekte brudd.
 *
 * 2. DE EKSAKTE dB-TALLENE er kalibreringsdokumentasjon: de skal fange at
 *    måleoppsettet har drevet reelt (noen flytter målingen til etterbehandlet
 *    output, endrer vinduet eller bytter ffmpeg-argumenter — da endrer tallene
 *    seg med titalls dB), IKKE at ffmpeg-versjoner søker litt ulikt.
 *
 * Driftskilden er identifisert: det er `-sseof` sin søkepresisjon. Én mp3-ramme
 * er ~26 ms — over halve 50 ms-vinduet — så seeker en annen ffmpeg-versjon til
 * en annen rammegrense, forskyves vinduet og måltallet endrer seg langt mer enn
 * en toleranse på 0,05 dB. Fasiten er satt med ffmpeg 8.1.1 på Windows; CI
 * kjører ubuntu-latest med typisk ffmpeg 6.x, to hovedversjoner eldre.
 * DEKODINGEN er derimot verifisert deterministisk: `-c:a mp3` og `-c:a mp3float`
 * gir identiske tall på det avkuttede klippet (hele −17,7 / hale −42,1), så
 * dekodervalg er ikke risikoen.
 *
 * ±1,0 dB er valgt framfor `toBeCloseTo`-presisjon: `toBeCloseTo(fall, 1)` er
 * ±0,05 (for stramt) og `toBeCloseTo(fall, 0)` er ±0,5 (tett på rammestøyen),
 * og et navngitt tall sier tydeligere hva som faktisk tolereres enn en
 * presisjonsparameter gjør.
 */
const MAALING_TOLERANSE_DB = 1.0;

/**
 * Krever at måltallet ligger innenfor MAALING_TOLERANSE_DB av fasiten.
 *
 * To-sidig framfor `Math.abs(malt - fasit) <= TOLERANSE`: assertionen er den
 * samme, men feilmeldingen viser da det faktisk målte tallet og grensen det
 * brøt, ikke bare «expected false to be true».
 */
function forventInnenforToleranse(malt: number, fasit: number): void {
  expect(malt).toBeGreaterThanOrEqual(fasit - MAALING_TOLERANSE_DB);
  expect(malt).toBeLessThanOrEqual(fasit + MAALING_TOLERANSE_DB);
}

describe.skipIf(!FFMPEG_AVAILABLE)('halevakt — integrasjon med ekte ffmpeg', () => {
  it.each(MAALINGER)('måler $fil til $fall dB (±1,0)', ({ fil, fall }) => {
    // Hele tabellen er etterprøvbar fra repoet — det var nettopp mangelen på
    // det som ga NO-GO i forrige runde.
    forventInnenforToleranse(tailFalloffDb(measure(fil)), fall);
  });

  it('flagger det avkuttede «burpii»-take-et', () => {
    const m = measure(AVKUTTET);
    // Fasitmålingen 2026-08-30 (ffmpeg 8.1.1): samlet −17,7 dB, hale −42,1 dB
    // → fall −24,4 dB. Måltallet er dokumentasjon (±1,0); det testen VOKTER er
    // flagget på linja under, som har 11,6 dB margin til terskelen.
    forventInnenforToleranse(tailFalloffDb(m), -24.4);
    expect(isTailSuspect(m)).toBe(true);
  });

  it.each(FRISKE)('flagger ikke det friske take-et %s', (fileName) => {
    const m = measure(fileName);
    expect(isTailSuspect(m)).toBe(false);
  });

  it('marginene til terskelen er de kalibreringen hviler på', () => {
    const avkuttet = tailFalloffDb(measure(AVKUTTET));
    const friske = FRISKE.map((f) => tailFalloffDb(measure(f)));
    const darligsteFriske = Math.max(...friske);
    // Terskelen skal ligge i gapet mellom fasitens to klasser, ikke på kanten.
    expect(avkuttet).toBeGreaterThan(TAIL_FALLOFF_THRESHOLD_DB);
    expect(darligsteFriske).toBeLessThan(TAIL_FALLOFF_THRESHOLD_DB);
    // Gapet var 25,5 dB da terskelen ble satt; krymper det under 15 dB er
    // kalibreringen ikke lenger forsvarlig og må gjøres om.
    expect(avkuttet - darligsteFriske).toBeGreaterThan(15);
  });

  it('kalibreringen HVILER på at komiker_last5 ikke er frisk', () => {
    // Reviewers BØR 1: komiker_last5 faller MINDRE (−18,7) enn det bekreftet
    // avkuttede burpii-take-et (−24,4), og energiprofilen tyder på at også det
    // klippet er avkuttet. Produkteier er bedt om å lytte; svaret foreligger
    // ikke. Viser det seg at klippet er FRISKT, overlapper klassene — et friskt
    // take faller da mindre enn et avkuttet — og da finnes det ingen absolutt
    // terskel som skiller dem. Vakten må i så fall revurderes, ikke justeres.
    const komikerLast5 = tailFalloffDb(measure('komiker_last5.mp3'));
    const avkuttet = tailFalloffDb(measure(AVKUTTET));
    expect(komikerLast5).toBeGreaterThan(avkuttet);
    expect(isTailSuspect(measure('komiker_last5.mp3'))).toBe(true);
  });

  it('to av de uavklarte ville blitt flagget — de er kandidater, ikke bevis', () => {
    // De ligger over terskelen og telles derfor blant dagens 19 flaggede take.
    expect(isTailSuspect(measure('komiker_start_321_short.mp3'))).toBe(true);
    // Den tredje ligger under terskelen, men er dårligere enn dagens dårligste
    // verifisert friske (−49,9) og ville dermed krympet gapet til 25,0 dB.
    const befalShort = tailFalloffDb(measure('befal_start_321_short.mp3'));
    // Dette er vakt-assertionen: 13,4 dB margin ned til terskelen.
    expect(befalShort).toBeLessThan(TAIL_FALLOFF_THRESHOLD_DB);
    // Rangeringen mot −49,9 pinnes IKKE som en ordning. Avstanden er 0,5 dB —
    // mindre enn måletoleransen over — så en `toBeGreaterThan(-49.9)` ville
    // vært et myntkast ved rammegrense-drift, ikke en påstand vi kan innestå
    // for. Fasitverdien pinnes derfor som dokumentert måling (±1,0), og
    // konsekvensen for gapet står i DECISIONS.md Beslutning 39.
    forventInnenforToleranse(befalShort, -49.4);
  });

  it('den etterbehandlede fila ville gitt MOTSATT svar — derfor måles råfila', () => {
    // Regresjonsvakt mot å flytte målingen tilbake til output: prosessert
    // faller det avkuttede klippet −74,0 dB (bunkens «sunneste») mens friske
    // befal_3 faller −17,0 dB. Her pinnes at RÅ-målingen rangerer motsatt.
    const avkuttet = tailFalloffDb(measure(AVKUTTET));
    const friskt = tailFalloffDb(measure('befal_3_borpies.mp3'));
    expect(avkuttet).toBeGreaterThan(friskt);
    expect(friskt).toBeLessThan(-60);
  });
});

// Skulle ffmpeg mangle, si det høyt i stedet for å la blokken forsvinne stille.
describe.skipIf(FFMPEG_AVAILABLE)('halevakt — integrasjon (ffmpeg mangler)', () => {
  it('ffmpeg er ikke på PATH — integrasjonstesten mot bevisfilene ble hoppet over', () => {
    expect(FFMPEG_AVAILABLE).toBe(false);
  });
});

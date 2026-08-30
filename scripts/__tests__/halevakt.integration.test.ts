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
 * ffmpeg er en ekstern avhengighet. Mangler den (typisk i CI), skippes hele
 * blokken EKSPLISITT — vitest rapporterer den som skipped, den skal aldri
 * stilltiende passere.
 */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
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

// Fasit fra produkteiers A/B-lytting av burpees-uttalen (Beslutning 39).
const AVKUTTET = 'befal_2_burpees_engelsk.mp3'; // «burpii» — s-lyden er borte
const FRISKE = [
  'befal_1_borpis_produksjon.mp3',
  'befal_3_borpies.mp3',
  'befal_4_borpiis.mp3',
  'hardcore_1_borpis_produksjon.mp3',
  'hardcore_2_burpees_engelsk.mp3',
  'komiker_1_borpis_produksjon.mp3',
  'komiker_2_burpees_engelsk.mp3',
  'komiker_3_borpies.mp3',
];

describe.skipIf(!FFMPEG_AVAILABLE)('halevakt — integrasjon med ekte ffmpeg', () => {
  it('flagger det avkuttede «burpii»-take-et', () => {
    const m = measure(AVKUTTET);
    // Fasitmålingen 2026-08-30: samlet −17,7 dB, hale −42,1 dB → fall −24,4 dB.
    expect(tailFalloffDb(m)).toBeCloseTo(-24.4, 1);
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

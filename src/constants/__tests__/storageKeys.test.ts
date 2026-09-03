import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { STORAGE_KEYS } from '../storageKeys';

/**
 * Holder nøkkelregisteret synkronisert med virkeligheten.
 *
 * Registeret ble opprinnelig skrevet fra hukommelsen og drev fra koden:
 * 15 nøkler i bruk manglet, og 18 sto oppført uten å finnes. Verst var
 * historikk-nøkkelen, som pekte et annet sted enn dataene faktisk lå —
 * så dataeksporten leverte tom historikk uten at noe feilet.
 *
 * Sletting tåler drift (prefiks-skann fanger alt). Eksport gjør ikke:
 * den leser nøkler ved navn, og en feil nøkkel gir stille datatap i
 * brukerens egen kopi. Derfor denne testen.
 */

const SRC = join(process.cwd(), 'src');
const REGISTER = join(SRC, 'constants', 'storageKeys.ts');

function kildefiler(dir: string, ut: string[] = []): string[] {
  for (const navn of readdirSync(dir)) {
    const sti = join(dir, navn);
    if (statSync(sti).isDirectory()) {
      if (navn !== '__tests__') kildefiler(sti, ut);
    } else if (/\.(ts|tsx)$/.test(navn) && !/\.test\.tsx?$/.test(navn)) {
      ut.push(sti);
    }
  }
  return ut;
}

/**
 * Alle nøkler som faktisk er i bruk. To former teller:
 *  - strengliteralen `'mintrener_...'` skrevet direkte i en tjeneste
 *  - `STORAGE_KEYS.NAVN`, der strengen bare står i registeret
 *
 * Den andre formen er lett å overse — den første versjonen av denne testen
 * gjorde nettopp det, og ville flagget seks nøkler i aktiv bruk som fantomer.
 */
function nøklerIBruk(): Set<string> {
  const funnet = new Set<string>();
  const viaKonstant = new Set<string>();

  for (const fil of kildefiler(SRC)) {
    const tekst = readFileSync(fil, 'utf8');
    if (fil !== REGISTER) {
      for (const treff of tekst.matchAll(/'(mintrener_[a-z0-9_]*)'/g)) funnet.add(treff[1]);
    }
    for (const treff of tekst.matchAll(/STORAGE_KEYS\.([A-Z_]+)/g)) viaKonstant.add(treff[1]);
  }

  for (const navn of viaKonstant) {
    const verdi = (STORAGE_KEYS as Record<string, string | readonly string[]>)[navn];
    if (typeof verdi === 'string') funnet.add(verdi);
    else if (Array.isArray(verdi)) verdi.forEach((k) => funnet.add(k));
  }

  return funnet;
}

/** Alle nøkler registeret oppgir, inkludert legacy-listene. */
function nøklerIRegisteret(): Set<string> {
  const funnet = new Set<string>();
  for (const verdi of Object.values(STORAGE_KEYS)) {
    if (typeof verdi === 'string') funnet.add(verdi);
    else if (Array.isArray(verdi)) verdi.forEach((k) => funnet.add(k));
  }
  return funnet;
}

describe('STORAGE_KEYS speiler faktisk bruk', () => {
  it('hver nøkkel i koden står i registeret', () => {
    const register = nøklerIRegisteret();
    const mangler = [...nøklerIBruk()].filter((k) => !register.has(k)).sort();

    expect(
      mangler,
      `Nøkler brukt i koden, men ikke i registeret:\n  ${mangler.join('\n  ')}\n` +
        'Legg dem i STORAGE_KEYS — ellers havner de ikke i dataeksporten.'
    ).toEqual([]);
  });

  it('hver nøkkel i registeret finnes i koden, eller er merket legacy', () => {
    // Legacy-nøkler leses ved migrering og skrives aldri, så de finnes
    // legitimt i registeret uten å stå som streng i en tjeneste.
    const legacy = new Set<string>(
      Object.entries(STORAGE_KEYS)
        .filter(([navn]) => navn.startsWith('LEGACY_'))
        .flatMap(([, v]) => (Array.isArray(v) ? v : [v]))
    );

    const brukt = nøklerIBruk();
    const fantom = [...nøklerIRegisteret()]
      .filter((k) => !brukt.has(k) && !legacy.has(k))
      .sort();

    expect(
      fantom,
      `Nøkler i registeret som ingen kode bruker:\n  ${fantom.join('\n  ')}\n` +
        'Fjern dem, eller merk dem LEGACY_. En nøkkel som ikke finnes gir et tomt felt i eksporten.'
    ).toEqual([]);
  });

  it('historikk-nøkkelen peker der historikken faktisk lagres', () => {
    // Den konkrete feilen som gjorde eksporten tom for anonyme brukere.
    const kilde = readFileSync(join(SRC, 'services', 'workoutHistoryStorage.ts'), 'utf8');
    const faktisk = kilde.match(/WORKOUT_HISTORY_KEY\s*=\s*'([^']+)'/)?.[1];

    expect(faktisk).toBeDefined();
    expect(STORAGE_KEYS.WORKOUT_HISTORY).toBe(faktisk);
  });
});

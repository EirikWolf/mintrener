/**
 * Gjør kandidatbildene synlige for kureringssiden.
 *
 * Kandidatene ligger i pipeline/candidates/, utenfor public/. Det er med vilje:
 * de er ikke appinnhold før et menneske har valgt dem. Men dev-serveren kan
 * bare servere det som ligger under public/, så kuratoren kunne ikke se dem —
 * og da kan man ikke velge mellom seeds i grensesnittet.
 *
 * Dette skriptet kopierer dem til public/images/kandidater/ (utenfor
 * versjonskontroll) og skriver et manifest kuratoren leser. Å KOPIERE og ikke
 * flytte er poenget: kilden i pipeline/ blir stående urørt, så et valg kan
 * gjøres om uten å kjøre GPU-en på nytt.
 *
 * Kjør: npx tsx scripts/publiserKandidater.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AVVISTE } from './avvisteKandidater';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KILDE = path.join(ROOT, 'pipeline', 'candidates', 'dybdebatch');
const UT = path.join(ROOT, 'public', 'images', 'kandidater');
export const MANIFEST = 'manifest.json';

/** `planke-0-s2.png` → nøkkel `planke-0`, seed `s2`. */
export function delOppNavn(filnavn: string): { nøkkel: string; seed: string } | null {
  const m = /^(.*)-(s\d+)\.png$/.exec(filnavn);
  return m ? { nøkkel: m[1], seed: m[2] } : null;
}

function main() {
  if (!fs.existsSync(KILDE)) {
    console.error(`Fant ingen kandidater i ${path.relative(ROOT, KILDE)}.`);
    process.exit(1);
  }
  fs.mkdirSync(UT, { recursive: true });

  const manifest: Record<string, string[]> = {};
  let kopiert = 0;
  let avvist = 0;

  // Rydd ut publiserte kandidater fra forrige kjøring. Uten dette blir en
  // kandidat som senere er avvist liggende igjen i public/ og dukker opp i
  // kuratoren selv om den er strøket.
  for (const gammel of fs.existsSync(UT) ? fs.readdirSync(UT) : []) {
    if (gammel.endsWith('.png')) fs.unlinkSync(path.join(UT, gammel));
  }

  for (const fil of fs.readdirSync(KILDE).sort()) {
    const delt = delOppNavn(fil);
    if (!delt) continue;
    if (AVVISTE[`${delt.nøkkel}-${delt.seed}`]) {
      avvist++;
      continue;
    }
    fs.copyFileSync(path.join(KILDE, fil), path.join(UT, fil));
    (manifest[delt.nøkkel] ??= []).push(delt.seed);
    kopiert++;
  }

  fs.writeFileSync(path.join(UT, MANIFEST), JSON.stringify(manifest, null, 2));
  console.log(
    `${kopiert} kandidater for ${Object.keys(manifest).length} bilder → ${path.relative(ROOT, UT)}` +
      (avvist > 0 ? ` (${avvist} avvist ved gjennomsyn)` : '')
  );
  for (const [k, s] of Object.entries(manifest)) console.log(`  ${k.padEnd(28)} ${s.join(' ')}`);
}

if (process.argv[1]?.includes('publiserKandidater')) main();

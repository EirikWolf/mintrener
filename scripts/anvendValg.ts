/**
 * Legger de valgte kandidatene inn i appen.
 *
 * Kuratoren velger i nettleseren, men en nettside kan ikke skrive filer. Valget
 * kommer derfor ut via «Last ned» på kureringssiden, og dette skriptet gjør det
 * om til faktiske bilder i public/images/exercises/.
 *
 * SIKKERHETSNETT: hvert bilde som overskrives kopieres først til
 * public/images/exercises/.erstattet/. De bildene har vært i appen og noen av
 * dem er godkjent av kuratoren — et feilvalg skal koste et filnavn å angre,
 * ikke en ny GPU-kjøring.
 *
 * Kjør: npx tsx scripts/anvendValg.ts <eksport.json> [--tørr]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KANDIDATER = path.join(ROOT, 'pipeline', 'candidates', 'dybdebatch');
const MÅL = path.join(ROOT, 'public', 'images', 'exercises');
const SIKKERHET = path.join(MÅL, '.erstattet');

type Rad = { øvelse: string; fase: number; valgtKandidat: string | null };

export function radTilFiler(rad: Rad): { fra: string; til: string } | null {
  if (!rad.valgtKandidat) return null;
  const nøkkel = `${rad.øvelse}-${rad.fase}`;
  return {
    fra: path.join(KANDIDATER, `${nøkkel}-${rad.valgtKandidat}.png`),
    til: path.join(MÅL, `${nøkkel}.png`),
  };
}

function main() {
  const fil = process.argv[2];
  const tørr = process.argv.includes('--tørr');
  if (!fil) {
    console.error('Bruk: npx tsx scripts/anvendValg.ts <eksport.json> [--tørr]');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(fil, 'utf-8'));
  const valgte: Rad[] = (data.rader ?? []).filter((r: Rad) => r.valgtKandidat);
  if (valgte.length === 0) {
    console.log('Ingen valgte kandidater i eksporten.');
    return;
  }

  // Alle kildene sjekkes FØR noe skrives. Halvveis anvendt er verre enn ikke
  // anvendt: da vet man ikke lenger hvilke bilder i appen som er nye.
  const mangler = valgte.map(radTilFiler).filter((f) => f && !fs.existsSync(f.fra));
  if (mangler.length > 0) {
    console.error(`Mangler ${mangler.length} kandidatfiler, avbryter:`);
    for (const m of mangler) console.error(`  ${path.relative(ROOT, m!.fra)}`);
    process.exit(1);
  }

  if (!tørr) fs.mkdirSync(SIKKERHET, { recursive: true });
  let n = 0;

  for (const rad of valgte) {
    const f = radTilFiler(rad)!;
    const navn = path.basename(f.til);
    if (tørr) {
      console.log(`  ${navn.padEnd(32)} ← ${rad.valgtKandidat}`);
    } else {
      if (fs.existsSync(f.til)) fs.copyFileSync(f.til, path.join(SIKKERHET, navn));
      fs.copyFileSync(f.fra, f.til);
      console.log(`  ✓ ${navn.padEnd(32)} ← ${rad.valgtKandidat}`);
    }
    n++;
  }

  console.log(
    tørr
      ? `\n${n} bilder ville blitt lagt inn. Kjør uten --tørr for å gjøre det.`
      : `\n${n} bilder lagt inn. Forrige versjon ligger i ${path.relative(ROOT, SIKKERHET)}.`
  );
}

if (process.argv[1]?.includes('anvendValg')) main();

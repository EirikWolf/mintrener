/**
 * Dybdestyrt produksjonskjøring for GULVØVELSENE.
 *
 * HVORFOR BARE GULVØVELSER. Kureringen 2026-09-01 delt på to variabler:
 *
 *                stående    på gulvet
 *   front          62 %        22 %
 *   side           30 %         9 %
 *
 * For stående øvelser holder prompten — vinkelprøven 2026-09-02 ga et rent
 * sideprofilbilde av utfall så snart innrammingsfrasen sluttet å motsi
 * vinkelen. For gulvøvelser gjorde den samme endringen ingen forskjell: fire
 * av fire feilet fortsatt, og to ble verre. Der er posituren den bindende
 * skranken, ikke kameraet.
 *
 * Dybdekartet løser nettopp det COCO-18-skjelettet ikke kan uttrykke: hvilken
 * vei brystet peker (mageliggende mot ryggliggende) og rotasjon om kroppsaksen
 * (sideplanke). Begge ble målt og dokumentert 2026-09-02.
 *
 * OPPSETTET er det som virket i skalatesten, uendret: dybdekart fra
 * referansefoto, BiRefNet-personmaske med hard kant, syntetisk gulv,
 * kontrollstyrke 0,9 og kort vindu (end 0,35). Ingen positur-anker — det ble
 * målt til ikke å hjelpe.
 *
 * TRE SEEDS PER BILDE. Skalatesten ga 13 av 15, altså rundt 1 av 3 som feiler.
 * Med tre forsøk per bilde er sjansen for at ingen blir brukbar liten, og
 * kurering av tre kandidater er raskere enn å oppdage mangelen etterpå og
 * kjøre om igjen. Resultatene går til pipeline/candidates/, ikke til appen:
 * et menneske velger.
 *
 * Kjør: npx tsx scripts/kjorDybdeBatch.ts [--dry-run] [--seeds N]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { EXERCISE_LIBRARY } from '../src/data/exercises';
import { buildComfyPromptJob, seedForExercise } from '../src/services/imagePromptService';
import {
  acquireGpuLeaseWithRetry,
  releaseGpuLease,
  sendHeartbeat,
  submitPrompt,
  waitForCompletion,
  downloadImage,
} from './runFullKitorBatch';
import { getKitorToken } from './kitorEnv';
import { byggWorkflow, uploadRef } from './testDybdeKontroll';
import { REFERANSER, UTEN_KILDE } from './hentReferanser';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REF_DIR = path.join(ROOT, 'pipeline', 'referanser');
const UT_DIR = path.join(ROOT, 'pipeline', 'candidates', 'dybdebatch');

/**
 * Romlig forankring, formulert om ÉN kropp.
 *
 * Feilmodusen er to hoder, ikke et speilvendt hode: den maskerte kroppen ligger
 * som en isolert flekk på et syntetisk gulv, og en vannrett figur med armer ut
 * den ene veien og bein ut den andre er nesten symmetrisk. Modellen leser den
 * da som to kropper som møtes på midten.
 */
const ROMLIG = 'exactly one person with a single head, no duplicate limbs';

const seedsIdx = process.argv.indexOf('--seeds');
const ANTALL_SEEDS = seedsIdx !== -1 && process.argv[seedsIdx + 1] ? Number(process.argv[seedsIdx + 1]) : 3;

type Jobb = { nøkkel: string; øvelse: string; fase: number; ref: string; navn: string; seed: number };

export function byggJobber(antallSeeds = ANTALL_SEEDS): Jobb[] {
  const jobber: Jobb[] = [];
  for (const nøkkel of Object.keys(REFERANSER)) {
    const m = /^(.*)-(\d)$/.exec(nøkkel);
    if (!m) throw new Error(`Ugyldig referansenøkkel: ${nøkkel}`);
    const [, øvelse, fase] = m;
    if (!EXERCISE_LIBRARY.some((e) => e.id === øvelse)) {
      throw new Error(`Ukjent øvelse i REFERANSER: ${øvelse}`);
    }
    for (let s = 0; s < antallSeeds; s++) {
      jobber.push({
        nøkkel,
        øvelse,
        fase: Number(fase),
        ref: `${nøkkel}.jpg`,
        navn: `${nøkkel}-s${s}`,
        // Seeden hører til øvelsen; tillegget skiller kandidatene. Da får fase 0
        // og fase 1 av samme øvelse samme person i samme rom.
        seed: seedForExercise(øvelse) + s,
      });
    }
  }
  return jobber;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const jobber = byggJobber();
  const bilder = Object.keys(REFERANSER).length;

  console.log(`${bilder} bilder × ${ANTALL_SEEDS} seeds = ${jobber.length} genereringer`);
  console.log(`Uten kilde, hoppes over: ${UTEN_KILDE.join(', ')}\n`);

  for (const nøkkel of Object.keys(REFERANSER)) {
    const sti = path.join(REF_DIR, `${nøkkel}.jpg`);
    if (!fs.existsSync(sti)) {
      throw new Error(`Mangler referanse: ${sti}. Kjør scripts/hentReferanser.ts først.`);
    }
  }
  console.log(`✓ alle ${bilder} referanser finnes i ${path.relative(ROOT, REF_DIR)}`);

  if (dryRun) {
    for (const j of jobber.filter((x) => x.navn.endsWith('-s0'))) {
      const ex = EXERCISE_LIBRARY.find((e) => e.id === j.øvelse)!;
      const p = buildComfyPromptJob(ex, j.fase).positivePrompt;
      if (!p || p.length < 50) throw new Error(`Tom prompt for ${j.nøkkel}`);
      console.log(`  ${j.nøkkel.padEnd(28)} seed ${j.seed}  ${p.slice(0, 60)}…`);
    }
    console.log(`\n✓ tørrkjøring: ${jobber.length} jobber gyldige`);
    return;
  }

  const token = getKitorToken(ROOT);
  fs.mkdirSync(UT_DIR, { recursive: true });

  // Opplasting bruker ingen GPU. Den skjer derfor FØR leasen tas, så vi ikke
  // holder kortet opptatt mens filer flyttes.
  const refNavn = new Map<string, string>();
  for (const nøkkel of Object.keys(REFERANSER)) {
    refNavn.set(`${nøkkel}.jpg`, await uploadRef(token, path.join(REF_DIR, `${nøkkel}.jpg`), `${nøkkel}.jpg`));
  }
  console.log(`${refNavn.size} referanser lastet opp.\n`);

  // ETA er ~40 s per bilde. Over 25 minutter krever hjerteslag hvert 5. minutt,
  // ellers regnes leasen som foreldet og andre prosjekter slipper til midt i.
  const timer = Math.max(1, Math.ceil((jobber.length * 45) / 3600));
  const leaseToken = await acquireGpuLeaseWithRetry(token, timer, 200);
  const start = Date.now();
  let ok = 0;

  try {
    for (const [i, j] of jobber.entries()) {
      const ex = EXERCISE_LIBRARY.find((e) => e.id === j.øvelse)!;
      const prompt = `${buildComfyPromptJob(ex, j.fase).positivePrompt}, ${ROMLIG}`;
      try {
        const wf = byggWorkflow(prompt, j.seed, j.navn, refNavn.get(j.ref)!, 'depth', {
          personMaske: true,
          syntetiskGulv: true,
          mykKant: 0,
          maskeVekst: 2,
          controlStrength: 0.9,
          controlEnd: 0.35,
          posAnker: '',
          posStyrke: 0.3,
        });
        const promptId = await submitPrompt(token, wf);
        const bilde = await waitForCompletion(token, promptId, 300);
        if (!bilde?.filename) throw new Error('ingen filreferanse');
        await downloadImage(token, bilde, path.join(UT_DIR, `${j.navn}.png`));
        ok++;
        console.log(`[${i + 1}/${jobber.length}] ✓ ${j.navn}`);
      } catch (err) {
        console.warn(`[${i + 1}/${jobber.length}] ✗ ${j.navn}: ${(err as Error).message}`);
      }
      if (i % 5 === 4) await sendHeartbeat(token, leaseToken);
    }
  } finally {
    await releaseGpuLease(token, leaseToken);
  }

  console.log(`\nFerdig: ${ok}/${jobber.length} på ${((Date.now() - start) / 60000).toFixed(1)} min`);
  console.log(`→ ${path.relative(ROOT, UT_DIR)}`);
}

if (process.argv[1]?.includes('kjorDybdeBatch')) {
  main().catch((err) => {
    console.error('Batchen feilet:', err);
    process.exit(1);
  });
}

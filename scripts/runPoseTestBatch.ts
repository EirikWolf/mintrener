import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { EXERCISE_LIBRARY } from '../src/data/exercises';
import {
  ASTRID_FLUX_DEMO_STYLE,
  ASTRID_FLUX_OUTFIT_STYLE,
  formatViewAngle,
  buildAstridFluxPoseWorkflow,
  seedForExercise,
} from '../src/services/imagePromptService';
import {
  acquireGpuLeaseWithRetry,
  releaseGpuLease,
  sendHeartbeat,
  submitPrompt,
  waitForCompletion,
  downloadImage,
} from './runFullKitorBatch';
import { getKitorToken } from './kitorEnv';

/**
 * Prøvebatch med positurstyring.
 *
 * Kjører ControlNet-workflowen mot de tegnede skjelettene for et lite utvalg,
 * slik at vi ser om posituren faktisk holder FØR vi bruker GPU-tid på alle 29.
 *
 * Utvalget er valgt for å teste ulike akser, ikke fordi de er de fire første i
 * en liste: to sideprofil-bevegelser (det vanskeligste), ett statisk hold med
 * bare én fase, og én frontvisning. Armhevinger og superman var dessuten de to
 * tydeligste feilene i kurateringen 2026-08-31.
 *
 * Tre seeds per posisjon, jf. vedlegg A § A.10: «det billigste kvalitetstiltaket
 * som finnes». Begge faser av samme øvelse deler seed innenfor hver variant —
 * ellers får start og slutt ulik person og ulikt rom, som er nøyaktig feilen
 * seedForExercise finnes for å hindre.
 *
 * Kjør:  npx tsx scripts/runPoseTestBatch.ts [--dry-run]
 */

const KITOR_HOST = process.env.KITOR_HOST || 'https://kitor.tail49f298.ts.net';
const COMFY_PATH = '/comfy-mintrener';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const POSE_DIR = path.join(ROOT, 'pipeline', 'poses');
const UT_DIR = path.join(ROOT, 'pipeline', 'candidates');

const UTVALG = (process.env.POSE_UTVALG ?? 'push-ups,rygghev-superman,planke,sprellmenn').split(',');
const SEEDS_PER_POSISJON = Number(process.env.POSE_SEEDS ?? 3);

/**
 * Hvor lenge ControlNet holder posituren.
 *
 * Vedlegg A oppgir 0,65. Den verdien ble kalibrert på et kettlebell-sving — en
 * stor, oppreist figur. Målt på armhevinger 2026-08-31 overføres den ikke:
 * modellen fulgte kroppslinja og kameravinkelen, men rettet den bøyde armen opp
 * til en planke i de siste 35 % av stegene. Derfor er den styrbar.
 */
const CONTROL_END = Number(process.env.POSE_CONTROL_END ?? 0.65);
const CONTROL_STRENGTH = Number(process.env.POSE_CONTROL_STRENGTH ?? 0.9);

/**
 * Legger skjelettet i ComfyUIs input-mappe.
 *
 * Filnavnet er stabilt per øvelse og fase, og `overwrite` er satt: et skjelett
 * som rettes skal erstatte det gamle, ikke ligge ved siden av det som
 * `push-ups-0_pose (1).png` og bli valgt feil neste gang.
 */
async function uploadPose(token: string, filePath: string, name: string): Promise<string> {
  const form = new FormData();
  form.append('image', new Blob([fs.readFileSync(filePath)], { type: 'image/png' }), name);
  form.append('overwrite', 'true');
  form.append('subfolder', 'mintrener-poses');

  const res = await fetch(`${KITOR_HOST}${COMFY_PATH}/upload/image`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) {
    throw new Error(`Opplasting av ${name} feilet (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { name: string; subfolder?: string };
  return data.subfolder ? `${data.subfolder}/${data.name}` : data.name;
}

interface Jobb {
  exerciseId: string;
  fase: number;
  variant: number;
  seed: number;
  lerret: { width: number; height: number };
  prompt: string;
  poseRef: string;
  filnavn: string;
}

function lesFaser(exerciseId: string): {
  fase: number;
  png: string;
  navn: string;
  lerret: { width: number; height: number };
}[] {
  const mappe = path.join(POSE_DIR, exerciseId);
  if (!fs.existsSync(mappe)) throw new Error(`Ingen skjeletter for ${exerciseId}`);
  return fs
    .readdirSync(mappe)
    .filter((f) => f.endsWith('_pose.png'))
    .sort()
    .map((f) => {
      const fase = Number(f.split('_')[0]);
      const meta = JSON.parse(
        fs.readFileSync(path.join(mappe, `${fase}_pose.json`), 'utf-8')
      ) as { navn: string; lerret: { width: number; height: number } };
      return { fase, png: path.join(mappe, f), navn: meta.navn, lerret: meta.lerret };
    });
}

function byggPrompt(exerciseId: string, fase: number): string {
  const ex = EXERCISE_LIBRARY.find((e) => e.id === exerciseId);
  if (!ex) throw new Error(`Ukjent øvelse: ${exerciseId}`);
  const handling =
    ex.bildePrompt?.[String(fase)] ?? `${ex.navn.en || ex.navn.nb} step ${fase + 1}`;
  const vinkel = formatViewAngle(ex.bildeVinkel);
  return `ASTRID, a woman, ${handling}, ${vinkel}, ${ASTRID_FLUX_DEMO_STYLE}, ${ASTRID_FLUX_OUTFIT_STYLE}`;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const token = getKitorToken(ROOT);

  const jobber: Jobb[] = [];
  for (const id of UTVALG) {
    for (const { fase, navn, lerret } of lesFaser(id)) {
      for (let v = 0; v < SEEDS_PER_POSISJON; v++) {
        jobber.push({
          exerciseId: id,
          fase,
          variant: v,
          // Begge faser deler seed innenfor samme variant
          seed: seedForExercise(id) + v,
          lerret,
          prompt: byggPrompt(id, fase),
          poseRef: '',
          filnavn: `${id}_f${fase}_v${v}${CONTROL_END !== 0.65 ? `_e${Math.round(CONTROL_END * 100)}` : ''}`,
        });
      }
      console.log(`  ${id} fase ${fase}: ${navn}`);
    }
  }

  console.log(`\n${jobber.length} bilder (${UTVALG.length} øvelser, ${SEEDS_PER_POSISJON} seeds per posisjon)`);

  if (dryRun) {
    const j = jobber[0];
    console.log('\n[tørrkjøring] Første prompt:\n' + j.prompt);
    const wf = buildAstridFluxPoseWorkflow(j.prompt, j.seed, j.filnavn, 'test.png') as Record<
      string,
      { class_type: string }
    >;
    console.log('\nNoder:', Object.values(wf).map((n) => n.class_type).join(' → '));
    console.log('\n[tørrkjøring] Ingen GPU brukt. Kjør uten --dry-run for ekte batch.');
    return;
  }

  // Skjelettene lastes opp FØR leasen tas: opplasting bruker ingen GPU, og en
  // lease som står og venter på nettverket blokkerer andre prosjekter.
  console.log('\nLaster opp skjeletter …');
  const poseRefs = new Map<string, string>();
  for (const id of UTVALG) {
    for (const { fase, png } of lesFaser(id)) {
      const navn = `${id}-${fase}_pose.png`;
      poseRefs.set(`${id}:${fase}`, await uploadPose(token, png, navn));
    }
  }
  console.log(`  ${poseRefs.size} skjeletter i ComfyUIs input.`);

  const leaseToken = await acquireGpuLeaseWithRetry(token, 1);
  const start = Date.now();
  let ok = 0;
  let feil = 0;

  try {
    for (const [i, j] of jobber.entries()) {
      j.poseRef = poseRefs.get(`${j.exerciseId}:${j.fase}`)!;
      const mappe = path.join(UT_DIR, j.exerciseId);
      fs.mkdirSync(mappe, { recursive: true });
      const mål = path.join(mappe, `${j.filnavn}.png`);

      try {
        const wf = buildAstridFluxPoseWorkflow(j.prompt, j.seed, j.filnavn, j.poseRef, {
          controlStrength: CONTROL_STRENGTH,
          controlEnd: CONTROL_END,
          width: j.lerret.width,
          height: j.lerret.height,
        });
        const promptId = await submitPrompt(token, wf);
        // waitForCompletion returnerer SELVE bildeobjektet ({filename, subfolder,
        // type}), ikke historikken. Første utkast behandlet det som en historikk
        // og fant naturlig nok ingen bilder — og feilmeldingen la skylden på
        // ComfyUI for en feil i denne fila.
        const bilde = await waitForCompletion(token, promptId, 240);
        if (!bilde?.filename) throw new Error('Fikk ingen filreferanse tilbake');
        await downloadImage(token, bilde, mål);
        ok++;
        console.log(`[${i + 1}/${jobber.length}] ✓ ${j.filnavn}`);
      } catch (err) {
        feil++;
        console.warn(`[${i + 1}/${jobber.length}] ✗ ${j.filnavn}: ${(err as Error).message}`);
      }

      // Heartbeat hvert 5. bilde: jobben kan overstige 25 min, og en lease
      // uten livstegn auto-frigjøres midt i batchen.
      if (i % 5 === 4) await sendHeartbeat(token, leaseToken);
    }
  } finally {
    await releaseGpuLease(token, leaseToken);
  }

  const min = ((Date.now() - start) / 60000).toFixed(1);
  console.log(`\nFerdig: ${ok} bilder, ${feil} feil, ${min} min → pipeline/candidates/`);
}

main().catch((err) => {
  console.error('Batch feilet:', err);
  process.exit(1);
});

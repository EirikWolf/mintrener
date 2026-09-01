import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { EXERCISE_LIBRARY } from '../src/data/exercises';
import {
  buildComfyPromptJob,
  seedForExercise,
  LORA_STYRKE,
} from '../src/services/imagePromptService';
import {
  acquireGpuLeaseWithRetry,
  releaseGpuLease,
  submitPrompt,
  waitForCompletion,
  downloadImage,
} from './runFullKitorBatch';
import { getKitorToken } from './kitorEnv';

/**
 * Kan et dybdekart uttrykke det et 2D-skjelett ikke kan?
 *
 * SPØRSMÅLET: superman — liggende på magen — ble tegnet liggende på RYGGEN, to
 * ganger, ved begge kontrollverdier og begge renderere. Vi testet og avkreftet
 * fire hypoteser og konkluderte med at COCO-18 mangler informasjonen: et 2D-punkt
 * (x, y) er identisk enten brystet peker opp eller ned. Det er ikke en
 * innstilling som kan skrus på.
 *
 * ET DYBDE- ELLER NORMALKART HAR DEN INFORMASJONEN. Et normalkart koder
 * overflatens retning som farge, så rygg og mage kan ikke forveksles.
 *
 * KILDEN er et fotografi fra free-exercise-db (Unlicense). Vi bruker det som
 * GEOMETRI og forkaster pikslene: kroppsstillingen er et faktum om øvelsen,
 * fotografiet er fotografens uttrykk. Ingenting av bildet havner i resultatet —
 * bare dybden det beskriver.
 *
 * Kjør:  npx tsx scripts/testDybdeKontroll.ts [--dry-run]
 */

const KITOR_HOST = process.env.KITOR_HOST || 'https://kitor.tail49f298.ts.net';
const COMFY_PATH = '/comfy-mintrener';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const UT_DIR = path.join(ROOT, 'pipeline', 'candidates', 'dybdetest');

/** Referansefotoet, lastet ned på forhånd. */
const REFERANSE = process.env.DYBDE_REF ?? 'superman-1.jpg';
const ØVELSE = process.env.DYBDE_ØVELSE ?? 'rygghev-superman';
const FASE = Number(process.env.DYBDE_FASE ?? 1);

// Liggende lerret — figuren er vannrett.
const BREDDE = 1152;
const HØYDE = 896;

async function uploadRef(token: string, filePath: string, name: string): Promise<string> {
  const form = new FormData();
  form.append('image', new Blob([fs.readFileSync(filePath)]), name);
  form.append('overwrite', 'true');
  form.append('subfolder', 'mintrener-refs');
  const res = await fetch(`${KITOR_HOST}${COMFY_PATH}/upload/image`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Opplasting feilet (${res.status}): ${await res.text()}`);
  const data = (await res.json()) as { name: string; subfolder?: string };
  return data.subfolder ? `${data.subfolder}/${data.name}` : data.name;
}

/**
 * Workflow med dybde- eller normalkart i stedet for skjelett.
 *
 * Forskjellen fra buildAstridFluxPoseWorkflow er to noder: referansebildet
 * skaleres til lerretet, og en preprocessor lager kontrollbildet. ControlNet
 * Union Pro 2.0 er den SAMME modellen — bare `type` byttes fra `openpose`.
 */
function byggWorkflow(
  prompt: string,
  seed: number,
  filnavn: string,
  refBilde: string,
  modus: 'depth' | 'normal',
  { controlStrength = 0.9, controlEnd = 0.65, loraStrength = LORA_STYRKE } = {}
) {
  const preprocessor =
    modus === 'depth'
      ? { class_type: 'DepthAnythingV2Preprocessor', inputs: { image: ['20', 0], resolution: 1024 } }
      : { class_type: 'DSINE-NormalMapPreprocessor', inputs: { image: ['20', 0], resolution: 1024 } };

  return {
    '1': { inputs: { unet_name: 'flux1-dev-fp8.safetensors', weight_dtype: 'fp8_e4m3fn' }, class_type: 'UNETLoader' },
    '2': {
      inputs: { clip_name1: 'clip_l.safetensors', clip_name2: 't5xxl_fp8_e4m3fn.safetensors', type: 'flux' },
      class_type: 'DualCLIPLoader',
    },
    '3': { inputs: { vae_name: 'ae.safetensors' }, class_type: 'VAELoader' },
    '4': {
      inputs: { lora_name: 'synthiq/astrid_k.safetensors', strength_model: loraStrength, model: ['1', 0] },
      class_type: 'LoraLoaderModelOnly',
    },
    '5': { inputs: { text: prompt, clip: ['2', 0] }, class_type: 'CLIPTextEncode' },
    '6': { inputs: { width: BREDDE, height: HØYDE, batch_size: 1 }, class_type: 'EmptyLatentImage' },
    '7': { inputs: { guidance: 3.5, conditioning: ['5', 0] }, class_type: 'FluxGuidance' },

    // --- Referansen inn, geometrien ut ---
    '19': { inputs: { image: refBilde }, class_type: 'LoadImage' },
    // Beskjæres mot midten: kontrollbildet må ha samme sideforhold som latenten,
    // ellers forskyves posituren (vedlegg A § A.6).
    '20': {
      inputs: { image: ['19', 0], upscale_method: 'lanczos', width: BREDDE, height: HØYDE, crop: 'center' },
      class_type: 'ImageScale',
    },
    '21': { inputs: preprocessor.inputs, class_type: preprocessor.class_type },

    '12': { inputs: { control_net_name: 'flux1-dev-controlnet-union-pro-2.0.safetensors' }, class_type: 'ControlNetLoader' },
    '13': { inputs: { control_net: ['12', 0], type: modus }, class_type: 'SetUnionControlNetType' },
    '14': {
      inputs: {
        positive: ['7', 0],
        negative: ['5', 0],
        control_net: ['13', 0],
        image: ['21', 0],
        // Flux-ControlNet krever VAE. Uten den feiler KSampler med
        // «This Controlnet needs a VAE but none was provided» — og
        // kontrollbildet blir laget likevel, så feilen ser ut som en timeout.
        vae: ['3', 0],
        strength: controlStrength,
        start_percent: 0.0,
        end_percent: controlEnd,
      },
      class_type: 'ControlNetApplyAdvanced',
    },

    '8': {
      inputs: {
        seed, steps: 24, cfg: 1.0, sampler_name: 'euler', scheduler: 'simple', denoise: 1.0,
        model: ['4', 0], positive: ['14', 0], negative: ['14', 1], latent_image: ['6', 0],
      },
      class_type: 'KSampler',
    },
    '9': { inputs: { samples: ['8', 0], vae: ['3', 0] }, class_type: 'VAEDecode' },
    '10': { inputs: { filename_prefix: `mintrener/${filnavn}`, images: ['9', 0] }, class_type: 'SaveImage' },
    // Kontrollbildet lagres også — vi må kunne SE hva modellen faktisk ble styrt av.
    '11': { inputs: { filename_prefix: `mintrener/${filnavn}_kontroll`, images: ['21', 0] }, class_type: 'SaveImage' },
  };
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const token = getKitorToken(ROOT);

  const ex = EXERCISE_LIBRARY.find((e) => e.id === ØVELSE);
  if (!ex) throw new Error(`Ukjent øvelse: ${ØVELSE}`);
  const prompt = buildComfyPromptJob(ex, FASE).positivePrompt;
  const seed = seedForExercise(ØVELSE);

  const refSti = path.join(
    process.env.DYBDE_REF_DIR ??
      'C:/Users/EIRIKW~1/AppData/Local/Temp/claude/C--dev-Trening/a06a4570-b34b-4ef5-8020-bb7c038fb38e/scratchpad',
    REFERANSE
  );
  if (!fs.existsSync(refSti)) throw new Error(`Fant ikke referansen: ${refSti}`);

  const moduser: ('depth' | 'normal')[] = ['depth', 'normal'];
  console.log(`Øvelse: ${ØVELSE} fase ${FASE}  ·  seed ${seed}  ·  LoRA ${LORA_STYRKE}`);
  console.log(`Referanse: ${REFERANSE} (free-exercise-db, Unlicense)`);
  console.log(`Moduser: ${moduser.join(', ')}\n`);

  if (dryRun) {
    console.log('Prompt:\n' + prompt);
    const wf = byggWorkflow(prompt, seed, 'test', 'ref.jpg', 'depth') as Record<string, { class_type: string }>;
    console.log('\nNoder: ' + Object.values(wf).map((n) => n.class_type).join(' → '));
    console.log('\n[tørrkjøring] Ingen GPU brukt.');
    return;
  }

  const refNavn = await uploadRef(token, refSti, `superman-ref.jpg`);
  console.log(`Referanse lastet opp: ${refNavn}`);

  fs.mkdirSync(UT_DIR, { recursive: true });
  const leaseToken = await acquireGpuLeaseWithRetry(token, 1, 200);
  const start = Date.now();

  try {
    for (const modus of moduser) {
      const filnavn = `${ØVELSE}_f${FASE}_${modus}`;
      try {
        const wf = byggWorkflow(prompt, seed, filnavn, refNavn, modus);
        const promptId = await submitPrompt(token, wf);
        const bilde = await waitForCompletion(token, promptId, 300);
        if (!bilde?.filename) throw new Error('ingen filreferanse');
        await downloadImage(token, bilde, path.join(UT_DIR, `${filnavn}.png`));
        console.log(`✓ ${modus}`);
      } catch (err) {
        console.warn(`✗ ${modus}: ${(err as Error).message}`);
      }
    }
  } finally {
    await releaseGpuLease(token, leaseToken);
  }

  console.log(`\nFerdig på ${((Date.now() - start) / 60000).toFixed(1)} min → ${UT_DIR}`);
}

main().catch((err) => {
  console.error('Testen feilet:', err);
  process.exit(1);
});

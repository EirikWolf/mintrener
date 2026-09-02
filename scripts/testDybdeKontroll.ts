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
  {
    controlStrength = 0.9,
    controlEnd = 0.65,
    loraStrength = LORA_STYRKE,
    /**
     * Klipp bort alt fjernere enn dette i dybdekartet, 0–1.
     *
     * VIRKER IKKE. Beholdt fordi målingen er verdt å ha dokumentert.
     *
     * Tanken var: dybdekartet bærer HELE scenen, ikke bare kroppen — første
     * kjøring ga stativer og en vektstang i bakgrunnen enda prompten ba om «no
     * gym equipment». Terskle dem bort, så bygger modellen vårt eget rom.
     *
     * Målt 2026-09-02 ved 0,35 og 0,55: rommet BLE rent, men kroppen ble
     * ødelagt — to hoder ved 0,35, en umulig stående positur ved 0,55. Årsaken
     * er at en terskel skjærer scenen i et AVSTANDSPLAN og ikke isolerer en
     * person: hodet ligger nærmere kamera enn føttene, så planet går tvers
     * gjennom kroppen og etterlater frittstående flekker som ControlNet leser
     * som separate kropper.
     *
     * Riktig verktøy er en personsegmentering. `RemoveBackground` finnes på
     * kitor, men modell-listen er tom — ingen modell er installert.
     *
     * Null = ingen maskering, og det er det som gjelder inntil videre.
     */
    maskeTerskel = 0,
    /**
     * Maskér dybdekartet til PERSONEN med BiRefNet.
     *
     * Levert av kitor-eier 2026-09-02 etter bestilling. Dette er det terskelen
     * ikke kunne: en segmentering finner kroppen uansett hvor i dybdeplanet
     * delene av den ligger, i stedet for å skjære scenen i et avstandsplan.
     */
    personMaske = false,
    /**
     * Myk maskekant i piksler.
     *
     * Var 6, og ga en synlig GLORIE rundt figuren ved kontrollstyrke 0,9: en
     * myket kant lager mellomliggende dybdeverdier mellom kroppen og den svarte
     * bakgrunnen, og ControlNet gjengir dem som en ekte flate. Hard kant (0)
     * har ikke det problemet.
     */
    mykKant = 0,
    /**
     * Legg personens dybde på et SYNTETISK GULV i stedet for svart.
     *
     * Svart bakgrunn betyr «uendelig langt unna» overalt — også der hun ligger.
     * Målt 2026-09-02: med hard personmaske og svart bakgrunn hadde modellen
     * ingen bakke å plassere henne mot, og hun endte svevende i lufta. For en
     * liggende øvelse er underlaget en del av informasjonen.
     *
     * Gulvet bygges av stablede bånd, lysere mot bunnen — Depth Anything koder
     * nært som lyst, og et gulv sett fra lav kameravinkel er nærmest nederst i
     * bildet. Ingen gradient-node finnes, men fire bånd holder: ControlNet
     * trenger et plausibelt underlag, ikke en presis dybdemodell av rommet.
     */
    syntetiskGulv = false,
  } = {}
) {
  const maskerer = personMaske || maskeTerskel > 0;
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

    // Maskering av dybdekartet. Nodene finnes uansett i grafen, men brukes bare
    // når maskeTerskel > 0 — se hvilken node '14' henter bildet fra.
    '22': { inputs: { image: ['21', 0], channel: 'red' }, class_type: 'ImageToMask' },
    '23': { inputs: { mask: ['22', 0], value: maskeTerskel }, class_type: 'ThresholdMask' },
    // Litt vekst og mykning: en hard terskelkant gir en silhuett med trappetrinn,
    // og ControlNet gjengir trappetrinnene.
    '24': { inputs: { mask: ['23', 0], expand: 6, tapered_corners: true }, class_type: 'GrowMask' },
    '25': {
      inputs: { mask: ['24', 0], left: 8, top: 8, right: 8, bottom: 8 },
      class_type: 'FeatherMask',
    },
    // Svart = uendelig langt unna. Alt utenfor masken blir dermed noe modellen
    // står fritt til å finne på, styrt av prompten.
    // BiRefNet: personmaske rett fra referansefotoet, ikke fra dybdekartet.
    '28': {
      inputs: { bg_removal_name: 'birefnet.safetensors' },
      class_type: 'LoadBackgroundRemovalModel',
    },
    '29': {
      inputs: { bg_removal_model: ['28', 0], image: ['20', 0] },
      class_type: 'RemoveBackground',
    },
    '30': { inputs: { mask: ['29', 0], expand: 2, tapered_corners: true }, class_type: 'GrowMask' },
    '31': {
      inputs: { mask: ['30', 0], left: mykKant, top: mykKant, right: mykKant, bottom: mykKant },
      class_type: 'FeatherMask',
    },

    // Bakgrunnen. Svart = uendelig langt unna; mørkegrå = en fjern vegg.
    '26': {
      inputs: {
        width: BREDDE,
        height: HØYDE,
        batch_size: 1,
        color: syntetiskGulv ? 0x1e1e1e : 0,
      },
      class_type: 'EmptyImage',
    },

    // Gulvbånd, lysere (nærmere) mot bunnen. Hvert bånd rekker fra sin egen
    // y-verdi og ned, og legges oppå det forrige.
    '32': { inputs: { width: BREDDE, height: HØYDE - 500, batch_size: 1, color: 0x3c3c3c }, class_type: 'EmptyImage' },
    '33': { inputs: { width: BREDDE, height: HØYDE - 620, batch_size: 1, color: 0x5a5a5a }, class_type: 'EmptyImage' },
    '34': { inputs: { width: BREDDE, height: HØYDE - 730, batch_size: 1, color: 0x787878 }, class_type: 'EmptyImage' },
    '35': { inputs: { width: BREDDE, height: HØYDE - 820, batch_size: 1, color: 0x969696 }, class_type: 'EmptyImage' },
    '36': { inputs: { destination: ['26', 0], source: ['32', 0], x: 0, y: 500, resize_source: false }, class_type: 'ImageCompositeMasked' },
    '37': { inputs: { destination: ['36', 0], source: ['33', 0], x: 0, y: 620, resize_source: false }, class_type: 'ImageCompositeMasked' },
    '38': { inputs: { destination: ['37', 0], source: ['34', 0], x: 0, y: 730, resize_source: false }, class_type: 'ImageCompositeMasked' },
    '39': { inputs: { destination: ['38', 0], source: ['35', 0], x: 0, y: 820, resize_source: false }, class_type: 'ImageCompositeMasked' },
    '27': {
      inputs: {
        destination: syntetiskGulv ? ['39', 0] : ['26', 0],
        source: ['21', 0],
        x: 0,
        y: 0,
        resize_source: false,
        mask: personMaske ? ['31', 0] : ['25', 0],
      },
      class_type: 'ImageCompositeMasked',
    },

    '12': { inputs: { control_net_name: 'flux1-dev-controlnet-union-pro-2.0.safetensors' }, class_type: 'ControlNetLoader' },
    '13': { inputs: { control_net: ['12', 0], type: modus }, class_type: 'SetUnionControlNetType' },
    '14': {
      inputs: {
        positive: ['7', 0],
        negative: ['5', 0],
        control_net: ['13', 0],
        image: maskerer ? ['27', 0] : ['21', 0],
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
    '11': {
      inputs: {
        filename_prefix: `mintrener/${filnavn}_kontroll`,
        // Det MASKERTE bildet når vi maskerer. Lagret vi råkartet, ville vi sett
        // på noe annet enn det modellen ble styrt av.
        images: maskerer ? ['27', 0] : ['21', 0],
      },
      class_type: 'SaveImage',
    },
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

  /**
   * Variantene, og hva hver av dem skal svare på.
   *
   * Normalkart er ute: målingen 2026-09-02 ga liggende på RYGGEN med samme seed
   * der dybde ga riktig positur. Å kjøre den om igjen ville brukt GPU-tid på et
   * spørsmål som allerede er besvart.
   */
  const varianter = [
    /**
     * TIDLIG SLIPP. Klessilhuetten fra kildefotoet følger med fordi ControlNet
     * fortsatt er aktiv når modellen maler plaggdetaljene. Vi har ikke funnet
     * noen solo-superman med tettsittende tøy i free-exercise-db — bildene er
     * fra én gym-fotografering med løse klær, og flere mageøvelser har hjelper
     * i bildet. Så i stedet for å bytte kilde: hold styrken oppe så posituren
     * låses, men slipp tidligere så detaljfasen er prompten sin.
     */
    { navn: 'tidlig35', personMaske: true, syntetiskGulv: true, mykKant: 0, maskeTerskel: 0, controlStrength: 0.9, controlEnd: 0.35 },
    { navn: 'tidlig25', personMaske: true, syntetiskGulv: true, mykKant: 0, maskeTerskel: 0, controlStrength: 0.95, controlEnd: 0.25 },
  ];console.log(`Øvelse: ${ØVELSE} fase ${FASE}  ·  seed ${seed}  ·  LoRA ${LORA_STYRKE}`);
  console.log(`Referanse: ${REFERANSE} (free-exercise-db, Unlicense)`);
  console.log(`Varianter: ${varianter.map((v) => v.navn).join(', ')}\n`);

  if (dryRun) {
    console.log('Prompt:\n' + prompt);
    const wf = byggWorkflow(prompt, seed, 'test', 'ref.jpg', 'depth', {
      maskeTerskel: 0.35,
    }) as Record<string, { class_type: string }>;
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
    for (const v of varianter) {
      const filnavn = `${ØVELSE}_f${FASE}_${v.navn}`;
      try {
        const wf = byggWorkflow(prompt, seed, filnavn, refNavn, 'depth', {
          personMaske: v.personMaske,
          syntetiskGulv: v.syntetiskGulv,
          mykKant: v.mykKant,
          maskeTerskel: v.maskeTerskel,
          controlStrength: v.controlStrength,
          controlEnd: v.controlEnd,
        });
        const promptId = await submitPrompt(token, wf);
        const bilde = await waitForCompletion(token, promptId, 300);
        if (!bilde?.filename) throw new Error('ingen filreferanse');
        await downloadImage(token, bilde, path.join(UT_DIR, `${filnavn}.png`));
        console.log(`✓ ${v.navn}`);
      } catch (err) {
        console.warn(`✗ ${v.navn}: ${(err as Error).message}`);
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

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
  sendHeartbeat,
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

export async function uploadRef(token: string, filePath: string, name: string): Promise<string> {
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
export function byggWorkflow(
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
    /**
     * Svakt OpenPose-skjelett i parallell med dybden.
     *
     * Revisors tiltak A, og det som treffer symmetrihypotesen direkte. Et
     * 2D-skjelett kan ikke uttrykke orientering — det var hele grunnen til at
     * vi forlot det. Men som SVAKT tilleggssignal gjør det den ene tingen
     * dybdekartet ikke gjør: sier hvor hodet er og hvor føttene er. En vannrett
     * figur med armer ut den ene veien og bein ut den andre er nesten
     * symmetrisk, og modellen leste den som to kropper.
     *
     * Skjelettene fra kroppsmodellen er dermed ikke bortkastet likevel.
     */
    posAnker = '',
    posStyrke = 0.3,
    maskeVekst = 2,
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
    // Tiltak B: masken dilateres kraftig. Da følger kildens gulvdybde RUNDT
    // kontaktpunktene med, og med den kontaktskyggen som forteller modellen at
    // hun hviler mot noe. Hard maske på 2 px ga en figur som svevde.
    '30': { inputs: { mask: ['29', 0], expand: maskeVekst, tapered_corners: true }, class_type: 'GrowMask' },
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

    // Positur-ankeret. Samme ControlNetLoader ('12') mates inn i en ANNEN
    // SetUnionControlNetType — hvis ComfyUI deler den lastede modellen, koster
    // dette ingen ekstra VRAM. Toppen lå på 22 864 av 24 576 MiB fra før, så
    // det er verdt å måle om den antakelsen holder.
    '40': { inputs: { image: posAnker }, class_type: 'LoadImage' },
    '41': {
      inputs: { image: ['40', 0], upscale_method: 'lanczos', width: BREDDE, height: HØYDE, crop: 'center' },
      class_type: 'ImageScale',
    },
    '42': { inputs: { control_net: ['12', 0], type: 'openpose' }, class_type: 'SetUnionControlNetType' },
    '43': {
      inputs: {
        positive: ['14', 0],
        negative: ['14', 1],
        control_net: ['42', 0],
        image: ['41', 0],
        vae: ['3', 0],
        strength: posStyrke,
        start_percent: 0.0,
        end_percent: controlEnd,
      },
      class_type: 'ControlNetApplyAdvanced',
    },

    '8': {
      inputs: {
        seed, steps: 24, cfg: 1.0, sampler_name: 'euler', scheduler: 'simple', denoise: 1.0,
        model: ['4', 0],
        positive: posAnker ? ['43', 0] : ['14', 0],
        negative: posAnker ? ['43', 1] : ['14', 1],
        latent_image: ['6', 0],
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

/**
 * Jobbene. Hver linje er én øvelse, én fase, ett referansefoto.
 *
 * Referansene er valgt fra free-exercise-db (Unlicense) og sjekket for at de
 * viser ÉN person: flere av mageøvelsene der har en hjelper i bildet, og to
 * kropper i dybdekartet ville gitt to kropper i resultatet.
 *
 * `staende-ryggvri` står ikke her. Basen har ingen stående vridning uten
 * redskap — nærmeste treff er sittende (Russian Twist) eller med vektskive
 * (Plate Twist). Den øvelsen må vente på en annen kilde.
 */
const JOBBER = [
  /**
   * SKALA-TEST. Spørsmålet Beslutning 49 nå hviler på er om 1-av-3 er en
   * egenskap ved superman eller ved metoden. Fem øvelser med verifiserte
   * referanser, tre seeds hver — 15 bilder gir en ærlig rate på tvers.
   *
   * Oppsettet er det som virket: dybdekart, BiRefNet-personmaske med hard
   * kant, syntetisk gulv, styrke 0,9 og vindu 0,35. Ingen positur-anker —
   * det ble målt til ikke å hjelpe.
   */
  { øvelse: 'kneboy', fase: 1, ref: 'ref-Bodyweight_Squat-1.jpg', navn: 'kneboy-s0', seedTillegg: 0,
    controlEnd: 0.35, posAnker: '', posStyrke: 0.3, maskeVekst: 2, romlig: 'exactly one person with a single head, no duplicate limbs' },
  { øvelse: 'kneboy', fase: 1, ref: 'ref-Bodyweight_Squat-1.jpg', navn: 'kneboy-s1', seedTillegg: 1,
    controlEnd: 0.35, posAnker: '', posStyrke: 0.3, maskeVekst: 2, romlig: 'exactly one person with a single head, no duplicate limbs' },
  { øvelse: 'kneboy', fase: 1, ref: 'ref-Bodyweight_Squat-1.jpg', navn: 'kneboy-s2', seedTillegg: 2,
    controlEnd: 0.35, posAnker: '', posStyrke: 0.3, maskeVekst: 2, romlig: 'exactly one person with a single head, no duplicate limbs' },
  { øvelse: 'planke', fase: 0, ref: 'ref-Plank-1.jpg', navn: 'planke-s0', seedTillegg: 0,
    controlEnd: 0.35, posAnker: '', posStyrke: 0.3, maskeVekst: 2, romlig: 'exactly one person with a single head, no duplicate limbs' },
  { øvelse: 'planke', fase: 0, ref: 'ref-Plank-1.jpg', navn: 'planke-s1', seedTillegg: 1,
    controlEnd: 0.35, posAnker: '', posStyrke: 0.3, maskeVekst: 2, romlig: 'exactly one person with a single head, no duplicate limbs' },
  { øvelse: 'planke', fase: 0, ref: 'ref-Plank-1.jpg', navn: 'planke-s2', seedTillegg: 2,
    controlEnd: 0.35, posAnker: '', posStyrke: 0.3, maskeVekst: 2, romlig: 'exactly one person with a single head, no duplicate limbs' },
  { øvelse: 'mountain-climbers', fase: 1, ref: 'ref-Mountain_Climbers-1.jpg', navn: 'mountain-climbers-s0', seedTillegg: 0,
    controlEnd: 0.35, posAnker: '', posStyrke: 0.3, maskeVekst: 2, romlig: 'exactly one person with a single head, no duplicate limbs' },
  { øvelse: 'mountain-climbers', fase: 1, ref: 'ref-Mountain_Climbers-1.jpg', navn: 'mountain-climbers-s1', seedTillegg: 1,
    controlEnd: 0.35, posAnker: '', posStyrke: 0.3, maskeVekst: 2, romlig: 'exactly one person with a single head, no duplicate limbs' },
  { øvelse: 'mountain-climbers', fase: 1, ref: 'ref-Mountain_Climbers-1.jpg', navn: 'mountain-climbers-s2', seedTillegg: 2,
    controlEnd: 0.35, posAnker: '', posStyrke: 0.3, maskeVekst: 2, romlig: 'exactly one person with a single head, no duplicate limbs' },
  { øvelse: 'sideplanke', fase: 0, ref: 'ref-Side_Bridge-1.jpg', navn: 'sideplanke-s0', seedTillegg: 0,
    controlEnd: 0.35, posAnker: '', posStyrke: 0.3, maskeVekst: 2, romlig: 'exactly one person with a single head, no duplicate limbs' },
  { øvelse: 'sideplanke', fase: 0, ref: 'ref-Side_Bridge-1.jpg', navn: 'sideplanke-s1', seedTillegg: 1,
    controlEnd: 0.35, posAnker: '', posStyrke: 0.3, maskeVekst: 2, romlig: 'exactly one person with a single head, no duplicate limbs' },
  { øvelse: 'sideplanke', fase: 0, ref: 'ref-Side_Bridge-1.jpg', navn: 'sideplanke-s2', seedTillegg: 2,
    controlEnd: 0.35, posAnker: '', posStyrke: 0.3, maskeVekst: 2, romlig: 'exactly one person with a single head, no duplicate limbs' },
  { øvelse: 'katte-ku', fase: 1, ref: 'ref-Cat_Stretch-1.jpg', navn: 'katte-ku-s0', seedTillegg: 0,
    controlEnd: 0.35, posAnker: '', posStyrke: 0.3, maskeVekst: 2, romlig: 'exactly one person with a single head, no duplicate limbs' },
  { øvelse: 'katte-ku', fase: 1, ref: 'ref-Cat_Stretch-1.jpg', navn: 'katte-ku-s1', seedTillegg: 1,
    controlEnd: 0.35, posAnker: '', posStyrke: 0.3, maskeVekst: 2, romlig: 'exactly one person with a single head, no duplicate limbs' },
  { øvelse: 'katte-ku', fase: 1, ref: 'ref-Cat_Stretch-1.jpg', navn: 'katte-ku-s2', seedTillegg: 2,
    controlEnd: 0.35, posAnker: '', posStyrke: 0.3, maskeVekst: 2, romlig: 'exactly one person with a single head, no duplicate limbs' },
];

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const token = getKitorToken(ROOT);
  const refDir =
    process.env.DYBDE_REF_DIR ??
    'C:/Users/EIRIKW~1/AppData/Local/Temp/claude/C--dev-Trening/a06a4570-b34b-4ef5-8020-bb7c038fb38e/scratchpad';

  console.log(`${JOBBER.length} bilder · LoRA ${LORA_STYRKE} · personmaske + syntetisk gulv
`);

  if (dryRun) {
    for (const j of JOBBER) {
      const ex = EXERCISE_LIBRARY.find((e) => e.id === j.øvelse);
      console.log(`${j.navn.padEnd(14)} ${j.øvelse} f${j.fase}  ←  ${j.ref}  ${ex ? '' : '⚠ UKJENT ØVELSE'}`);
    }
    console.log('\n[tørrkjøring] Ingen GPU brukt.');
    return;
  }

  // Alle referansene lastes opp FØR leasen tas — opplasting bruker ingen GPU,
  // og en lease som venter på nettverket blokkerer andre prosjekter.
  const refNavn = new Map<string, string>();
  for (const fil of [...new Set(JOBBER.map((j) => j.ref))]) {
    const sti = path.join(refDir, fil);
    if (!fs.existsSync(sti)) throw new Error(`Fant ikke referansen: ${sti}`);
    refNavn.set(fil, await uploadRef(token, sti, fil));
  }
  // Skjelettene lastes opp på samme måte som referansene.
  const posNavn = new Map<string, string>();
  for (const fil of [...new Set(JOBBER.map((j) => j.posAnker).filter(Boolean))]) {
    posNavn.set(fil, await uploadRef(token, path.join(ROOT, 'pipeline', 'poses', 'rygghev-superman', '1_pose.png'), fil));
  }
  console.log(`${refNavn.size} referanser og ${posNavn.size} skjeletter lastet opp.`);

  fs.mkdirSync(UT_DIR, { recursive: true });
  const leaseToken = await acquireGpuLeaseWithRetry(token, 1, 200);
  const start = Date.now();
  let ok = 0;

  try {
    for (const [i, j] of JOBBER.entries()) {
      const ex = EXERCISE_LIBRARY.find((e) => e.id === j.øvelse);
      if (!ex) {
        console.warn(`✗ ${j.navn}: ukjent øvelse ${j.øvelse}`);
        continue;
      }
      /**
       * Tiltak C: romlig forankring i prompten.
       *
       * Formulert om ÉN kropp, ikke om venstre/høyre. Feilmodusen vår er to
       * hoder, ikke et speilvendt hode — så det som må sies er at det finnes
       * ett hode, at armene strekker seg FORBI det, og at beina går motsatt vei.
       */
      const prompt =
        buildComfyPromptJob(ex, j.fase).positivePrompt + (j.romlig ? `, ${j.romlig}` : '');
      const seed = seedForExercise(j.øvelse) + j.seedTillegg;

      try {
        const wf = byggWorkflow(prompt, seed, j.navn, refNavn.get(j.ref)!, 'depth', {
          personMaske: true,
          syntetiskGulv: true,
          mykKant: 0,
          maskeVekst: j.maskeVekst,
          controlStrength: 0.9,
          controlEnd: j.controlEnd,
          posAnker: j.posAnker ? posNavn.get(j.posAnker)! : '',
          posStyrke: j.posStyrke,
        });
        const promptId = await submitPrompt(token, wf);
        const bilde = await waitForCompletion(token, promptId, 300);
        if (!bilde?.filename) throw new Error('ingen filreferanse');
        await downloadImage(token, bilde, path.join(UT_DIR, `${j.navn}.png`));
        ok++;
        console.log(`[${i + 1}/${JOBBER.length}] ✓ ${j.navn}`);
      } catch (err) {
        console.warn(`[${i + 1}/${JOBBER.length}] ✗ ${j.navn}: ${(err as Error).message}`);
      }

      if (i % 5 === 4) await sendHeartbeat(token, leaseToken);
    }
  } finally {
    await releaseGpuLease(token, leaseToken);
  }

  console.log(`\nFerdig: ${ok}/${JOBBER.length} på ${((Date.now() - start) / 60000).toFixed(1)} min → ${UT_DIR}`);
}

// Kjør bare når fila kalles direkte. Uten denne vakta ville produksjons-
// skriptet, som importerer byggWorkflow herfra, satt i gang HELE testkjøringen
// bare ved å laste modulen — og tatt en GPU-lease på veien.
if (process.argv[1]?.includes('testDybdeKontroll')) {
  main().catch((err) => {
    console.error('Testen feilet:', err);
    process.exit(1);
  });
}

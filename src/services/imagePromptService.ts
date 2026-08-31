import { ExerciseItem } from '../schemas/exerciseSchema';

/**
 * Kanonisk stilmal for Min Trener (Flux.1 Dev + Astrid LoRA)
 * Kombinerer anatomisk presisjon, atletisk form, bevegelse og svetteglans med et varmt, motiverende smil og treningsglede!
 */
export const ASTRID_FLUX_BASE_STYLE =
  'fitness photography, full body shot completely visible within frame, light sweat sheen on sun-tanned skin, golden tan, engaged core, tense flexed muscles, warm confident encouraging smile, radiant workout energy, joy of training';

/**
 * Stil for FASE-BILDER i øvelsesbiblioteket.
 *
 * Uten smil og «treningsglede», med vilje. Basestilen over ber om «warm
 * confident encouraging smile, radiant workout energy» samtidig som
 * øvelsesprompten ber om streng sideprofil og bunnposisjon i en armheving.
 * De to kan ikke være sanne samtidig, og modellen valgte ansiktet — derfor
 * viste 17 av 28 bildepar ikke øvelsen (bildekuratering 2026-08-31).
 *
 * Et smil hører hjemme på et forsidebilde. En instruksjon skal vise arbeidet.
 */
export const ASTRID_FLUX_DEMO_STYLE =
  'fitness instruction photography, full body shot completely visible within frame including hands and feet, neutral focused expression, controlled effort, engaged core, precise exercise form, even natural lighting, sharp focus';

/**
 * Lerretet for både latent og skjelett.
 *
 * Vedlegg A § A.6: «skjelettets lerret må ha samme sideforhold som latenten —
 * 896×1152. Et kvadratisk skjelett gir forskjøvet positur.» Derfor ÉN kilde.
 */
export const POSE_CANVAS = { width: 896, height: 1152 } as const;

/**
 * Seed for en øvelse — delt av begge faser.
 *
 * Batchen brukte `200 + total * 888` med en løpende teller, så fase 0 og fase 1
 * av samme øvelse fikk hver sin seed og ble generert uavhengig. Det er den
 * mekaniske grunnen til at start og slutt viste ulik person i ulikt rom.
 *
 * Determinismen er like viktig som delingen: uten den kan vi ikke regenerere
 * én enkelt øvelse uten å flytte på alle de andre. FNV-1a over id-en.
 */
export function seedForExercise(exerciseId: string): number {
  let hash = 2166136261;
  for (let i = 0; i < exerciseId.length; i++) {
    hash ^= exerciseId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  // >>> 0 gir et positivt 32-bits tall; +1 holder oss unna 0 som seed
  return (hash >>> 0) + 1;
}

export const ASTRID_FLUX_OUTFIT_STYLE =
  'in a bright modern gym, wearing a charcoal modern seamless cropped racerback sports bra and matching high-waist ribbed leggings, black training shoes, natural athletic lighting, sharp focus';

/**
 * Kanonisk stilmal for Wan2.1 I2V (Image-to-Video) animering på Kitor
 */
export const ASTRID_WAN_VIDEO_BASE_STYLE =
  'seamless fluid biomechanical loop of athletic woman exercising with perfect exercise form, smooth dynamic motion, stable camera perspective, high frame rate, photorealistic fitness demonstration';

export interface ComfyPromptJob {
  exerciseId: string;
  exerciseName: string;
  phaseIndex: number;
  viewAngle: 'front' | 'side' | 'skrå';
  positivePrompt: string;
  negativePrompt: string;
  outputFilename: string;
}

/**
 * Formaterer kameravinkel for diffusion-prompter
 */
export function formatViewAngle(viewAngle?: 'front' | 'side' | 'skrå'): string {
  if (viewAngle === 'skrå') {
    return 'three-quarter front-diagonal view';
  }
  if (viewAngle === 'front') {
    return 'front view';
  }
  return 'side profile view';
}

/**
 * Bygger en fullstendig ComfyUI prompt-jobb for en gitt øvelse og fase.
 * Viktig: Handling og positur settes FØRST i prompten slik at diffusjonsmodellen
 * prioriterer den nøyaktige kroppsstillingen (f.eks. sittende på stol).
 */
export function buildComfyPromptJob(
  exercise: ExerciseItem,
  phaseIndex: number
): ComfyPromptJob {
  const phaseKey = phaseIndex.toString();
  const specificAction =
    exercise.bildePrompt && exercise.bildePrompt[phaseKey]
      ? exercise.bildePrompt[phaseKey]
      : `${exercise.navn.en || exercise.navn.nb} execution step ${phaseIndex + 1}`;

  const viewAngle = exercise.bildeVinkel || 'side';
  const angleStr = formatViewAngle(viewAngle);
  // Handling og vinkel FØRST: batch-scriptet satte stilen først og begravde
  // posituren midt i prompten — det forsterket akkurat den feilen § 2 i
  // kurateringsrapporten beskriver.
  const positivePrompt = `ASTRID, a woman, ${specificAction}, ${angleStr}, ${ASTRID_FLUX_DEMO_STYLE}, ${ASTRID_FLUX_OUTFIT_STYLE}`;

  return {
    exerciseId: exercise.id,
    exerciseName: exercise.navn.nb,
    phaseIndex,
    viewAngle,
    positivePrompt,
    negativePrompt: '',
    outputFilename: `${exercise.id}-${phaseIndex}.png`,
  };
}

/**
 * Eksporterer prompt-jobber for alle øvelser i biblioteket
 */
export function exportAllExercisePromptJobs(
  exercises: ExerciseItem[]
): ComfyPromptJob[] {
  const jobs: ComfyPromptJob[] = [];

  for (const exercise of exercises) {
    if (exercise.bildePrompt) {
      const keys = Object.keys(exercise.bildePrompt);
      for (let i = 0; i < keys.length; i++) {
        jobs.push(buildComfyPromptJob(exercise, i));
      }
    } else {
      jobs.push(buildComfyPromptJob(exercise, 0));
      jobs.push(buildComfyPromptJob(exercise, 1));
    }
  }

  return jobs;
}

/**
 * Bygger en standard Flux.1 Dev + Astrid LoRA workflow for ComfyUI API
 */
export function buildAstridFluxWorkflow(
  promptText: string,
  seed: number,
  filenamePrefix: string,
  options: { width?: number; height?: number; steps?: number; guidance?: number } = {}
) {
  const width = options.width ?? 896;
  const height = options.height ?? 1152;
  const steps = options.steps ?? 24;
  const guidance = options.guidance ?? 3.5;

  return {
    "1": {
      "inputs": {
        "unet_name": "flux1-dev-fp8.safetensors",
        "weight_dtype": "fp8_e4m3fn"
      },
      "class_type": "UNETLoader"
    },
    "2": {
      "inputs": {
        "clip_name1": "clip_l.safetensors",
        "clip_name2": "t5xxl_fp8_e4m3fn.safetensors",
        "type": "flux"
      },
      "class_type": "DualCLIPLoader"
    },
    "3": {
      "inputs": {
        "vae_name": "ae.safetensors"
      },
      "class_type": "VAELoader"
    },
    "4": {
      "inputs": {
        "lora_name": "synthiq/astrid_k.safetensors",
        "strength_model": 1.0,
        "model": ["1", 0]
      },
      "class_type": "LoraLoaderModelOnly"
    },
    "5": {
      "inputs": {
        "text": promptText,
        "clip": ["2", 0]
      },
      "class_type": "CLIPTextEncode"
    },
    "6": {
      "inputs": {
        "width": width,
        "height": height,
        "batch_size": 1
      },
      "class_type": "EmptyLatentImage"
    },
    "7": {
      "inputs": {
        "guidance": guidance,
        "conditioning": ["5", 0]
      },
      "class_type": "FluxGuidance"
    },
    "8": {
      "inputs": {
        "seed": seed,
        "steps": steps,
        "cfg": 1.0,
        "sampler_name": "euler",
        "scheduler": "simple",
        "denoise": 1.0,
        "model": ["4", 0],
        "positive": ["7", 0],
        "negative": ["5", 0],
        "latent_image": ["6", 0]
      },
      "class_type": "KSampler"
    },
    "9": {
      "inputs": {
        "samples": ["8", 0],
        "vae": ["3", 0]
      },
      "class_type": "VAEDecode"
    },
    "10": {
      "inputs": {
        "filename_prefix": `mintrener/library/${filenamePrefix}`,
        "images": ["9", 0]
      },
      "class_type": "SaveImage"
    }
  };
}

/**
 * Flux + Astrid-LoRA + ControlNet OpenPose — workflowen vedlegg A § A.6
 * spesifiserte og som aldri ble bygget.
 *
 * Forskjellen fra `buildAstridFluxWorkflow` er at posituren kommer fra et
 * SKJELETT, ikke fra prompten. Vedlegget slo fast hvorfor etter to mislykkede
 * batcher: «uten skjelett er posisjonen upålitelig». Vision-gjennomgangen
 * 2026-08-31 målte prisen — 17 av 28 par viste ikke øvelsen.
 *
 * Verdiene (styrke 0,9, vindu 0,0–0,65) er vedleggets, verifisert på kitor.
 * Vinduet stopper på 0,65 slik at de siste stegene former detaljer fritt;
 * kjøres ControlNet helt ut, blir bildet stivt og skjelettaktig.
 *
 * `poseImageName` er skjelettet slik ComfyUI ser det i sin input-mappe.
 */
export function buildAstridFluxPoseWorkflow(
  promptText: string,
  seed: number,
  filenamePrefix: string,
  poseImageName: string,
  options: {
    steps?: number;
    guidance?: number;
    controlStrength?: number;
    controlEnd?: number;
  } = {}
) {
  const steps = options.steps ?? 24;
  const guidance = options.guidance ?? 3.5;
  const controlStrength = options.controlStrength ?? 0.9;
  // Vedleggets 0,65 er kalibrert på en stor oppreist figur og holder ikke for
  // liggende positurer — se runPoseTestBatch. Derfor et argument, ikke en
  // konstant.
  const controlEnd = options.controlEnd ?? 0.65;

  return {
    "1": {
      "inputs": { "unet_name": "flux1-dev-fp8.safetensors", "weight_dtype": "fp8_e4m3fn" },
      "class_type": "UNETLoader"
    },
    "2": {
      "inputs": {
        "clip_name1": "clip_l.safetensors",
        "clip_name2": "t5xxl_fp8_e4m3fn.safetensors",
        "type": "flux"
      },
      "class_type": "DualCLIPLoader"
    },
    "3": {
      "inputs": { "vae_name": "ae.safetensors" },
      "class_type": "VAELoader"
    },
    "4": {
      "inputs": {
        "lora_name": "synthiq/astrid_k.safetensors",
        "strength_model": 1.0,
        "model": ["1", 0]
      },
      "class_type": "LoraLoaderModelOnly"
    },
    "5": {
      "inputs": { "text": promptText, "clip": ["2", 0] },
      "class_type": "CLIPTextEncode"
    },
    "6": {
      "inputs": {
        "width": POSE_CANVAS.width,
        "height": POSE_CANVAS.height,
        "batch_size": 1
      },
      "class_type": "EmptyLatentImage"
    },
    "7": {
      "inputs": { "guidance": guidance, "conditioning": ["5", 0] },
      "class_type": "FluxGuidance"
    },
    // --- Positurstyring ---
    "11": {
      "inputs": { "image": poseImageName },
      "class_type": "LoadImage"
    },
    "12": {
      "inputs": { "control_net_name": "flux1-dev-controlnet-union-pro-2.0.safetensors" },
      "class_type": "ControlNetLoader"
    },
    "13": {
      "inputs": { "type": "openpose", "control_net": ["12", 0] },
      "class_type": "SetUnionControlNetType"
    },
    "14": {
      "inputs": {
        "strength": controlStrength,
        "start_percent": 0.0,
        "end_percent": controlEnd,
        "positive": ["7", 0],
        // Ved cfg 1,0 er negativ betingelse inaktiv (vedlegg A § A.4), men
        // noden krever inngangen. Samme betingelse inn som positiv.
        "negative": ["5", 0],
        "control_net": ["13", 0],
        "image": ["11", 0],
        "vae": ["3", 0]
      },
      "class_type": "ControlNetApplyAdvanced"
    },
    "8": {
      "inputs": {
        "seed": seed,
        "steps": steps,
        "cfg": 1.0,
        "sampler_name": "euler",
        "scheduler": "simple",
        "denoise": 1.0,
        "model": ["4", 0],
        "positive": ["14", 0],
        "negative": ["14", 1],
        "latent_image": ["6", 0]
      },
      "class_type": "KSampler"
    },
    "9": {
      "inputs": { "samples": ["8", 0], "vae": ["3", 0] },
      "class_type": "VAEDecode"
    },
    "10": {
      "inputs": {
        "filename_prefix": `mintrener/library/${filenamePrefix}`,
        "images": ["9", 0]
      },
      "class_type": "SaveImage"
    }
  };
}

/**
 * Bygger en Wan2.1 I2V (Image-to-Video) videoanimasjons-workflow for ComfyUI API
 */
export function buildAstridWanVideoWorkflow(
  inputImageFilename: string,
  motionPromptText: string,
  seed: number,
  filenamePrefix: string,
  options: { numFrames?: number; fps?: number } = {}
) {
  const numFrames = options.numFrames ?? 33;
  const fps = options.fps ?? 16;

  return {
    "1": {
      "inputs": {
        "image": inputImageFilename,
        "upload": "image"
      },
      "class_type": "LoadImage"
    },
    "2": {
      "inputs": {
        "unet_name": "wan2.1_i2v_480p_14B_fp8.safetensors"
      },
      "class_type": "UNETLoader"
    },
    "3": {
      "inputs": {
        "clip_name": "umt5_xxl_fp8_e4m3fn.safetensors",
        "type": "wan"
      },
      "class_type": "CLIPLoader"
    },
    "4": {
      "inputs": {
        "vae_name": "wan2.1_vae.safetensors"
      },
      "class_type": "VAELoader"
    },
    "5": {
      "inputs": {
        "text": `${ASTRID_WAN_VIDEO_BASE_STYLE}, ${motionPromptText}`,
        "clip": ["3", 0]
      },
      "class_type": "CLIPTextEncode"
    },
    "6": {
      "inputs": {
        "pixels": ["1", 0],
        "vae": ["4", 0]
      },
      "class_type": "VAEEncode"
    },
    "7": {
      "inputs": {
        "seed": seed,
        "steps": 20,
        "cfg": 6.0,
        "sampler_name": "euler",
        "scheduler": "simple",
        "denoise": 1.0,
        "model": ["2", 0],
        "positive": ["5", 0],
        "latent_image": ["6", 0],
        "length": numFrames
      },
      "class_type": "KSampler"
    },
    "8": {
      "inputs": {
        "samples": ["7", 0],
        "vae": ["4", 0]
      },
      "class_type": "VAEDecode"
    },
    "9": {
      "inputs": {
        "filename_prefix": `mintrener/videos/${filenamePrefix}`,
        "fps": fps,
        "images": ["8", 0]
      },
      "class_type": "VHS_VideoCombine"
    }
  };
}

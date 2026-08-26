import fs from 'fs';
import path from 'path';
import { EXERCISE_LIBRARY } from '../src/data/exercises/index.js';

/**
 * Min Trener — Full Kitor Batch Runner (24 øvelser × 2 faser = 48 bilder)
 * Modell: Flux.1 Dev fp8 + Astrid LoRA (synthiq/astrid_k.safetensors)
 * Anatomisk presisjon, dynamisk bevegelse, svetteglans og motiverende smil
 */

const KITOR_HOST = process.env.KITOR_HOST || 'https://kitor.tail49f298.ts.net';
const COMFY_PATH = '/comfy-mintrener';
const ARBITER_PATH = '/arbiter';

function getToken(): string {
  if (process.env.KITOR_TOKEN) {
    return process.env.KITOR_TOKEN.trim();
  }
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const match = fs.readFileSync(envPath, 'utf-8').match(/^KITOR_TOKEN=(.+)$/m);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  throw new Error('KITOR_TOKEN mangler i .env');
}

async function acquireGpuLeaseWithRetry(token: string, durationH: number = 2, maxRetries: number = 5): Promise<string> {
  console.log('📡 Forespør GPU-lease fra Arbiter v1...');
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(`${KITOR_HOST}${ARBITER_PATH}/acquire`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          kind: 'image',
          requester: 'mintrener',
          label: 'full-library-dynamic-astrid',
          duration_h: durationH,
        }),
      });

      if (res.ok) {
        const data = await res.json() as { token: string };
        console.log('✅ GPU-lease innvilget for batch.');
        return data.token;
      }
      const txt = await res.text();
      console.warn(`Forsøk ${attempt}/${maxRetries} feilet (${res.status}): ${txt}`);
    } catch (err: any) {
      console.warn(`Nettverksforsøk ${attempt}/${maxRetries} feilet:`, err.message || err);
    }
    await new Promise((r) => setTimeout(r, 10000));
  }
  throw new Error('Klarte ikke å reservere GPU etter gjentatte forsøk.');
}

async function sendHeartbeat(token: string, leaseToken: string): Promise<void> {
  try {
    await fetch(`${KITOR_HOST}${ARBITER_PATH}/heartbeat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token: leaseToken }),
    });
  } catch (err) {
    console.warn('Heartbeat advarsel:', err);
  }
}

async function releaseGpuLease(token: string, leaseToken: string): Promise<void> {
  console.log('📡 Frigir GPU-lease til Arbiter...');
  try {
    const res = await fetch(`${KITOR_HOST}${ARBITER_PATH}/release`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token: leaseToken }),
    });
    if (res.ok) {
      console.log('✅ GPU-lease frigitt. vLLM restarter automatisk.');
    }
  } catch (err) {
    console.warn('Feil ved release av lease:', err);
  }
}

export function buildAstridFluxWorkflow(promptText: string, seed: number, filenamePrefix: string) {
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
        "width": 896,
        "height": 1152,
        "batch_size": 1
      },
      "class_type": "EmptyLatentImage"
    },
    "7": {
      "inputs": {
        "guidance": 3.5,
        "conditioning": ["5", 0]
      },
      "class_type": "FluxGuidance"
    },
    "8": {
      "inputs": {
        "seed": seed,
        "steps": 24,
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

async function submitPrompt(token: string, promptWorkflow: any): Promise<string> {
  const res = await fetch(`${KITOR_HOST}${COMFY_PATH}/prompt`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt: promptWorkflow }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`ComfyUI prompt feilet (${res.status}): ${errText}`);
  }

  const data = await res.json() as { prompt_id: string };
  return data.prompt_id;
}

async function waitForCompletion(token: string, promptId: string, maxWaitSec: number = 180): Promise<any> {
  const startTime = Date.now();
  while ((Date.now() - startTime) / 1000 < maxWaitSec) {
    try {
      const res = await fetch(`${KITOR_HOST}${COMFY_PATH}/history/${promptId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const historyData = await res.json() as Record<string, any>;
        if (historyData[promptId]?.outputs?.["10"]?.images?.[0]) {
          return historyData[promptId].outputs["10"].images[0];
        }
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 4000));
  }
  throw new Error('Generering tok for lang tid');
}

async function downloadImage(token: string, imgInfo: any, targetPath: string) {
  const url = `${KITOR_HOST}${COMFY_PATH}/view?filename=${encodeURIComponent(imgInfo.filename)}&subfolder=${encodeURIComponent(imgInfo.subfolder)}&type=${encodeURIComponent(imgInfo.type)}`;
  const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
  if (res.ok) {
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(targetPath, buf);
  }
}

async function runFullBatch() {
  console.log('===========================================================');
  console.log(`🚀 Starter Full Kitor Batch for alle ${EXERCISE_LIBRARY.length} øvelser (med smil & bevegelse)`);
  console.log('===========================================================');

  const token = getToken();
  let leaseToken: string | null = null;
  let heartbeatTimer: NodeJS.Timeout | null = null;

  try {
    leaseToken = await acquireGpuLeaseWithRetry(token, 2);

    heartbeatTimer = setInterval(() => {
      if (leaseToken) sendHeartbeat(token, leaseToken);
    }, 3 * 60 * 1000);

    const baseStyle =
      'ASTRID, a woman, full body shot from head to feet completely visible within frame, wide angle view, no cropping, dynamic athletic fitness photography of an athletic woman actively exercising with physical exertion, light sweat sheen on sun-tanned skin, golden tan, engaged core, tense flexed muscles, warm confident encouraging smile, radiant positive workout energy, joy of training';
    const outfitStyle =
      'in a bright modern gym, wearing a charcoal modern seamless cropped racerback sports bra and matching high-waist ribbed leggings, black training shoes, natural athletic lighting, sharp focus';

    const outputDir = path.resolve(process.cwd(), 'public', 'images', 'exercises');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    let total = 0;
    for (const exercise of EXERCISE_LIBRARY) {
      for (const phaseIdx of [0, 1]) {
        total++;
        const phaseKey = phaseIdx.toString();
        const specificAction =
          exercise.bildePrompt && exercise.bildePrompt[phaseKey]
            ? exercise.bildePrompt[phaseKey]
            : `${exercise.navn.en || exercise.navn.nb} step ${phaseIdx + 1}`;

        const viewAngle = exercise.bildeVinkel || 'side';
        const promptText = `${baseStyle}, ${specificAction}, ${outfitStyle}, ${viewAngle} view`;
        const seed = 200 + total * 888;
        const filenamePrefix = `${exercise.id}_step${phaseIdx}`;

        console.log(`\n▶️ [${total}/${EXERCISE_LIBRARY.length * 2}] ${exercise.navn.nb} (Fase ${phaseIdx + 1})...`);
        const workflow = buildAstridFluxWorkflow(promptText, seed, filenamePrefix);
        const promptId = await submitPrompt(token, workflow);
        console.log(`   ComfyUI ID: ${promptId}`);

        const imgInfo = await waitForCompletion(token, promptId, 120);
        const targetPath = path.join(outputDir, `${exercise.id}-${phaseIdx}.png`);
        await downloadImage(token, imgInfo, targetPath);
        console.log(`   ✨ Lagret bilde til: public/images/exercises/${exercise.id}-${phaseIdx}.png`);
      }
    }

    console.log('\n🎉 Full bibliotek-batch med smil og bevegelse fullført!');
  } catch (err: any) {
    console.error('Feil i batch:', err.message || err);
  } finally {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    if (leaseToken) {
      await releaseGpuLease(token, leaseToken);
    }
  }
}

runFullBatch();

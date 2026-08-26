import fs from 'fs';
import path from 'path';
import { EXERCISE_LIBRARY } from '../src/data/exercises/index.js';

/**
 * Min Trener — Full Kitor Batch Runner (24 øvelser × 2 faser = 48 bilder)
 * Modell: Flux.1 Dev fp8 + Astrid LoRA (synthiq/astrid_k.safetensors)
 * Styrket helkroppsmal (head to feet visible, wide angle view, no cropping)
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
    const content = fs.readFileSync(envPath, 'utf-8');
    const match = content.match(/^KITOR_TOKEN=(.+)$/m);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  throw new Error('KITOR_TOKEN mangler i .env');
}

async function acquireGpuLease(token: string, durationH: number = 2): Promise<string> {
  console.log('📡 Forespør 2-timers GPU-lease fra Arbiter v1...');
  const res = await fetch(`${KITOR_HOST}${ARBITER_PATH}/acquire`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      kind: 'image',
      requester: 'mintrener',
      label: 'full-library-astrid-flux',
      duration_h: durationH,
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Klarte ikke å reservere GPU fra Arbiter (${res.status}): ${txt}`);
  }

  const data = await res.json() as { token: string };
  console.log('✅ GPU-lease innvilget for full batch.');
  return data.token;
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

async function waitForCompletion(token: string, promptId: string, maxWaitSec: number = 180): Promise<boolean> {
  const startTime = Date.now();
  while ((Date.now() - startTime) / 1000 < maxWaitSec) {
    try {
      const res = await fetch(`${KITOR_HOST}${COMFY_PATH}/history/${promptId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const historyData = await res.json() as Record<string, any>;
        if (historyData[promptId] && historyData[promptId].outputs) {
          return true;
        }
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 4000));
  }
  return false;
}

async function runFullBatch() {
  console.log('===========================================================');
  console.log(`🚀 Starter Full Kitor Batch for alle ${EXERCISE_LIBRARY.length} øvelser`);
  console.log('===========================================================');

  const token = getToken();
  let leaseToken: string | null = null;
  let heartbeatTimer: NodeJS.Timeout | null = null;

  try {
    leaseToken = await acquireGpuLease(token, 2);

    heartbeatTimer = setInterval(() => {
      if (leaseToken) sendHeartbeat(token, leaseToken);
    }, 3 * 60 * 1000);

    const baseStyle =
      'ASTRID, a woman, full body shot from head to feet completely visible within frame, wide angle view, no cropping, photorealistic photo of a fit, toned and visibly muscular athletic woman with sun-tanned skin, golden tan, defined shoulders and abs';
    const outfitStyle =
      'in a bright modern gym, wearing a charcoal modern seamless cropped racerback sports bra and matching high-waist ribbed leggings, black training shoes, natural lighting, sharp focus, full body, side view';

    let total = 0;
    for (const exercise of EXERCISE_LIBRARY) {
      for (const phaseIdx of [0, 1]) {
        total++;
        const phaseKey = phaseIdx.toString();
        const specificAction =
          exercise.bildePrompt && exercise.bildePrompt[phaseKey]
            ? exercise.bildePrompt[phaseKey]
            : `${exercise.navn.en || exercise.navn.nb} step ${phaseIdx + 1}`;

        const promptText = `${baseStyle}, ${specificAction}, ${outfitStyle}`;
        const seed = 100 + total * 777;
        const filenamePrefix = `${exercise.id}_step${phaseIdx}`;

        console.log(`\n▶️ [${total}/${EXERCISE_LIBRARY.length * 2}] ${exercise.navn.nb} (Fase ${phaseIdx + 1})...`);
        const workflow = buildAstridFluxWorkflow(promptText, seed, filenamePrefix);
        const promptId = await submitPrompt(token, workflow);
        console.log(`   Innsendt til ComfyUI ID: ${promptId}`);

        await waitForCompletion(token, promptId, 120);
        console.log(`   ✨ Fullført: ${filenamePrefix}`);
      }
    }

    console.log('\n🎉 Full bibliotek-batch fullført!');
  } catch (err: any) {
    console.error('Feil i batch:', err);
  } finally {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    if (leaseToken) {
      await releaseGpuLease(token, leaseToken);
    }
  }
}

runFullBatch();

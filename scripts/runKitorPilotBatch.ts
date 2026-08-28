import fs from 'fs';
import path from 'path';

/**
 * Min Trener — Kitor ComfyUI & Arbiter v1 Pilot Batch Runner
 *
 * Referanse: docs/kitor-bildepipeline-funn-2026-08-26.md
 * Modell: Flux.1 Dev fp8 + Astrid LoRA (synthiq/astrid_k.safetensors)
 */

import { getKitorToken } from './kitorEnv';

const KITOR_HOST = process.env.KITOR_HOST || 'https://kitor.tail49f298.ts.net';
const COMFY_PATH = '/comfy-mintrener';
const ARBITER_PATH = '/arbiter';

function getToken(): string {
  return getKitorToken();
}

async function acquireGpuLease(token: string, durationH: number = 1): Promise<string> {
  console.log('📡 1/4 Forespør GPU-lease fra Arbiter v1...');
  const res = await fetch(`${KITOR_HOST}${ARBITER_PATH}/acquire`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      kind: 'image',
      requester: 'mintrener',
      label: 'pilot-batch-astrid-flux',
      duration_h: durationH,
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Klarte ikke å reservere GPU fra Arbiter (${res.status}): ${txt}`);
  }

  const data = await res.json() as { token: string };
  console.log('✅ GPU-lease innvilget.');
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
        "filename_prefix": `mintrener/pilot/${filenamePrefix}`,
        "images": ["9", 0]
      },
      "class_type": "SaveImage"
    }
  };
}

interface PilotItem {
  exerciseId: string;
  step: number;
  poseDesc: string;
}

const PILOT_ITEMS: PilotItem[] = [
  // 1. Knebøy
  {
    exerciseId: 'kneboy',
    step: 0,
    poseDesc: 'standing upright, feet shoulder-width apart, holding athletic posture with hands clasped together in front of chest, looking forward',
  },
  {
    exerciseId: 'kneboy',
    step: 1,
    poseDesc: 'in a deep squat position, thighs parallel to the ground, straight back, knees tracked over toes, hands clasped together in front of chest',
  },
  // 2. Kettlebell-swing
  {
    exerciseId: 'kettlebell-swing',
    step: 0,
    poseDesc: 'in a deep athletic hip-hinge position, bending at hips with flat back, both hands in a firm two-handed grip on a black kettlebell hanging between knees',
  },
  {
    exerciseId: 'kettlebell-swing',
    step: 1,
    poseDesc: 'standing tall in full explosive hip extension, glutes contracted, black kettlebell floating at chest height with straight extended arms',
  },
  // 3. Push-ups
  {
    exerciseId: 'push-ups',
    step: 0,
    poseDesc: 'in a high plank top push-up position on gym floor, straight arms under shoulders, core tight and body in a straight line, hands flat on floor',
  },
  {
    exerciseId: 'push-ups',
    step: 1,
    poseDesc: 'lowered down in bottom push-up position, chest hovering just above gym floor, elbows bent at 90 degrees close to body, palms flat on floor',
  },
];

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

async function run() {
  console.log('====================================================');
  console.log('🚀 Starter Min Trener Kitor Testbatch (Flux + Astrid)');
  console.log('====================================================');

  const token = getToken();
  let leaseToken: string | null = null;
  let heartbeatTimer: NodeJS.Timeout | null = null;

  try {
    // 1. Reserver GPU via Arbiter
    leaseToken = await acquireGpuLease(token, 1);

    // 2. Start heartbeat-loop
    heartbeatTimer = setInterval(() => {
      if (leaseToken) sendHeartbeat(token, leaseToken);
    }, 3 * 60 * 1000);

    // 3. Generer og send hver prompt
    console.log(`\n📦 Klargjør ${PILOT_ITEMS.length} test-prompter med revidert stilmal...`);

    const baseStyle =
      'ASTRID, a woman, photorealistic photo of a fit, toned and visibly muscular athletic woman with sun-tanned skin, golden tan, defined shoulders and abs';
    const outfitStyle =
      'in a bright modern gym, wearing a charcoal modern seamless cropped racerback sports bra and matching high-waist ribbed leggings, black training shoes, natural studio lighting, sharp focus, full body, side view';

    for (let i = 0; i < PILOT_ITEMS.length; i++) {
      const item = PILOT_ITEMS[i];
      const promptText = `${baseStyle}, ${item.poseDesc}, ${outfitStyle}`;
      const seed = 42 + i * 1337;
      const filenamePrefix = `${item.exerciseId}_step${item.step}`;

      console.log(`\n▶️ [${i + 1}/${PILOT_ITEMS.length}] Sender prompt for: ${item.exerciseId} (fase ${item.step})...`);
      console.log(`   Seed: ${seed}`);

      const workflow = buildAstridFluxWorkflow(promptText, seed, filenamePrefix);
      const promptId = await submitPrompt(token, workflow);
      console.log(`   Innsendt til ComfyUI med ID: ${promptId}`);

      console.log(`   Venter på generering (~30s på RTX 3090)...`);
      const success = await waitForCompletion(token, promptId, 120);

      if (success) {
        console.log(`   ✨ Ferdig generert: mintrener/pilot/${filenamePrefix}`);
      } else {
        console.log(`   ⚠️ Tidsavbrudd eller lagt i kø.`);
      }
    }

    console.log('\n====================================================');
    console.log('🎉 Testbatch fullført på Kitor!');
    console.log('Bilder lagret på kitor under: /mnt/truenas/ai/output/comfyui/mintrener/pilot/');
    console.log('====================================================');

  } catch (err: any) {
    console.error('\n❌ Testbatch feilet:', err.message || err);
  } finally {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    if (leaseToken) {
      await releaseGpuLease(token, leaseToken);
    }
  }
}

run();

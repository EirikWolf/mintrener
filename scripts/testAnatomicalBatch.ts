import fs from 'fs';
import path from 'path';
import { MOBILITY_EXERCISES } from '../src/data/exercises/mobility.js';
import { BODYWEIGHT_EXERCISES } from '../src/data/exercises/bodyweight.js';

import { getKitorToken } from './kitorEnv';

const KITOR_HOST = process.env.KITOR_HOST || 'https://kitor.tail49f298.ts.net';
const COMFY_PATH = '/comfy-mintrener';
const ARBITER_PATH = '/arbiter';

function getToken(): string {
  return getKitorToken();
}

async function acquireGpuLease(token: string): Promise<string> {
  console.log('📡 Reserverer GPU på Kitor...');
  const res = await fetch(`${KITOR_HOST}${ARBITER_PATH}/acquire`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: 'image', requester: 'mintrener', label: 'anatomical-test', duration_h: 1 }),
  });
  const data = await res.json() as { token: string };
  return data.token;
}

async function releaseGpuLease(token: string, leaseToken: string): Promise<void> {
  try {
    await fetch(`${KITOR_HOST}${ARBITER_PATH}/release`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: leaseToken }),
    });
    console.log('✅ GPU-lease frigitt.');
  } catch {}
}

function buildWorkflow(promptText: string, seed: number, prefix: string) {
  return {
    "1": { "inputs": { "unet_name": "flux1-dev-fp8.safetensors", "weight_dtype": "fp8_e4m3fn" }, "class_type": "UNETLoader" },
    "2": { "inputs": { "clip_name1": "clip_l.safetensors", "clip_name2": "t5xxl_fp8_e4m3fn.safetensors", "type": "flux" }, "class_type": "DualCLIPLoader" },
    "3": { "inputs": { "vae_name": "ae.safetensors" }, "class_type": "VAELoader" },
    "4": { "inputs": { "lora_name": "synthiq/astrid_k.safetensors", "strength_model": 1.0, "model": ["1", 0] }, "class_type": "LoraLoaderModelOnly" },
    "5": { "inputs": { "text": promptText, "clip": ["2", 0] }, "class_type": "CLIPTextEncode" },
    "6": { "inputs": { "width": 896, "height": 1152, "batch_size": 1 }, "class_type": "EmptyLatentImage" },
    "7": { "inputs": { "guidance": 3.5, "conditioning": ["5", 0] }, "class_type": "FluxGuidance" },
    "8": { "inputs": { "seed": seed, "steps": 24, "cfg": 1.0, "sampler_name": "euler", "scheduler": "simple", "denoise": 1.0, "model": ["4", 0], "positive": ["7", 0], "negative": ["5", 0], "latent_image": ["6", 0] }, "class_type": "KSampler" },
    "9": { "inputs": { "samples": ["8", 0], "vae": ["3", 0] }, "class_type": "VAEDecode" },
    "10": { "inputs": { "filename_prefix": `mintrener/anatomical_test/${prefix}`, "images": ["9", 0] }, "class_type": "SaveImage" }
  };
}

async function submitPrompt(token: string, workflow: any): Promise<string> {
  const res = await fetch(`${KITOR_HOST}${COMFY_PATH}/prompt`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow }),
  });
  const data = await res.json() as { prompt_id: string };
  return data.prompt_id;
}

async function waitForCompletion(token: string, promptId: string): Promise<any> {
  const start = Date.now();
  while ((Date.now() - start) < 180000) {
    const res = await fetch(`${KITOR_HOST}${COMFY_PATH}/history/${promptId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const hist = await res.json() as any;
      if (hist[promptId]?.outputs?.["10"]?.images?.[0]) {
        return hist[promptId].outputs["10"].images[0];
      }
    }
    await new Promise((r) => setTimeout(r, 4000));
  }
  throw new Error('Timeout');
}

async function downloadImage(token: string, imgInfo: any, targetPath: string) {
  const url = `${KITOR_HOST}${COMFY_PATH}/view?filename=${encodeURIComponent(imgInfo.filename)}&subfolder=${encodeURIComponent(imgInfo.subfolder)}&type=${encodeURIComponent(imgInfo.type)}`;
  const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
  if (res.ok) {
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(targetPath, buf);
    console.log(`📥 Lagret: ${targetPath}`);
  }
}

async function run() {
  const token = getToken();
  let lease: string | null = null;

  try {
    lease = await acquireGpuLease(token);

    const basePrompt =
      'ASTRID, a woman, full body shot from head to feet completely visible within frame, wide angle view, no cropping, dynamic action fitness photography of an athletic woman actively exercising with physical exertion, light sweat sheen on sun-tanned skin, golden tan, engaged core, tense flexed muscles, focused determined expression';
    const outfit =
      'in a bright modern gym, wearing a charcoal modern seamless cropped racerback sports bra and matching high-waist ribbed leggings, black training shoes, natural athletic lighting, sharp focus';

    const testExercises = [
      ...MOBILITY_EXERCISES.filter(e => e.id === 'verdens-beste-toyeovelse'),
      ...BODYWEIGHT_EXERCISES.filter(e => e.id === 'kneboy' || e.id === 'push-ups'),
    ];

    for (const exercise of testExercises) {
      for (const phaseIdx of [0, 1]) {
        const specificAction = exercise.bildePrompt?.[phaseIdx.toString()] || '';
        const viewAngle = exercise.bildeVinkel || 'side';
        const fullPrompt = `${basePrompt}, ${specificAction}, ${outfit}, ${viewAngle} view`;
        const seed = 500 + phaseIdx * 333;
        const prefix = `${exercise.id}_p${phaseIdx}`;

        console.log(`\n🚀 Genererer ${exercise.navn.nb} (Fase ${phaseIdx + 1})...`);
        const workflow = buildWorkflow(fullPrompt, seed, prefix);
        const pid = await submitPrompt(token, workflow);
        console.log(`   ComfyUI ID: ${pid}. Venter på RTX 3090...`);
        const imgInfo = await waitForCompletion(token, pid);

        const targetPath = path.resolve(process.cwd(), 'public', 'images', 'exercises', `${exercise.id}-${phaseIdx}.png`);
        await downloadImage(token, imgInfo, targetPath);
      }
    }

    console.log('\n🎉 Testbilder fullført og lastet ned!');
  } finally {
    if (lease) await releaseGpuLease(token, lease);
  }
}

run().catch(console.error);

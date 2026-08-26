import fs from 'fs';
import path from 'path';

/**
 * Min Trener — Kitor ComfyUI & Arbiter v1 Pilot Batch Runner
 *
 * Referanse: docs/kitor-bildepipeline-funn-2026-08-26.md
 * Modell: Flux.1 Dev fp8 + ControlNet Union Pro 2.0 (OpenPose) + Astrid LoRA
 */

const KITOR_HOST = process.env.KITOR_HOST || 'https://kitor.tail49f298.ts.net';
const COMFY_PATH = '/comfy-mintrener';
const ARBITER_PATH = '/arbiter';

// Hent token trygt fra miljøvariabel (uten logging)
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
  throw new Error('KITOR_TOKEN mangler. Legg KITOR_TOKEN=<token_fra_vaultwarden> i .env filen.');
}

async function acquireGpuLease(token: string, durationH: number = 1): Promise<string> {
  console.log('Forespør GPU-lease fra Arbiter v1...');
  const res = await fetch(`${KITOR_HOST}${ARBITER_PATH}/acquire`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      kind: 'image',
      requester: 'mintrener',
      label: 'pilot-batch-flux-openpose',
      duration_h: durationH,
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Klarte ikke å reservere GPU fra Arbiter (${res.status}): ${txt}`);
  }

  const data = await res.json() as { token: string };
  console.log('GPU-lease innvilget.');
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
  console.log('Frigir GPU-lease til Arbiter...');
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
      console.log('GPU-lease frigitt. vLLM restarter automatisk.');
    }
  } catch (err) {
    console.warn('Feil ved release av lease:', err);
  }
}

export function buildComfyUiWorkflow(promptText: string, seed: number, filenamePrefix: string) {
  // ComfyUI Flux.1 Dev + ControlNet Union Pro 2.0 API Workflow
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
        "control_net_name": "flux1-dev-controlnet-union-pro-2.0.safetensors"
      },
      "class_type": "ControlNetLoader"
    },
    "6": {
      "inputs": {
        "type": "openpose",
        "control_net": ["5", 0]
      },
      "class_type": "SetUnionControlNetType"
    },
    "7": {
      "inputs": {
        "text": `ASTRID fitness instructor, ${promptText}, high quality athletic photography, clean gym background, sharp focus, natural studio lighting`,
        "clip": ["2", 0]
      },
      "class_type": "CLIPTextEncode"
    },
    "8": {
      "inputs": {
        "width": 896,
        "height": 1152,
        "batch_size": 1
      },
      "class_type": "EmptyLatentImage"
    },
    "9": {
      "inputs": {
        "guidance": 3.5,
        "conditioning": ["7", 0]
      },
      "class_type": "FluxGuidance"
    },
    "10": {
      "inputs": {
        "strength": 0.9,
        "start_percent": 0.0,
        "end_percent": 0.65,
        "positive": ["9", 0],
        "negative": ["7", 0],
        "control_net": ["6", 0],
        "image": ["12", 0] // Bilde fra preprocessor eller skjelett
      },
      "class_type": "ControlNetApplyAdvanced"
    },
    "11": {
      "inputs": {
        "seed": seed,
        "steps": 24,
        "cfg": 1.0,
        "sampler_name": "euler",
        "scheduler": "simple",
        "denoise": 1.0,
        "model": ["4", 0],
        "positive": ["10", 0],
        "negative": ["10", 1],
        "latent_image": ["8", 0]
      },
      "class_type": "KSampler"
    },
    "12": {
      "inputs": {
        "image": "openpose_skeleton.png",
        "upload": "image"
      },
      "class_type": "LoadImage"
    },
    "13": {
      "inputs": {
        "samples": ["11", 0],
        "vae": ["3", 0]
      },
      "class_type": "VAEDecode"
    },
    "14": {
      "inputs": {
        "filename_prefix": `mintrener/${filenamePrefix}`,
        "images": ["13", 0]
      },
      "class_type": "SaveImage"
    }
  };
}

async function runPilot() {
  console.log('=== Min Trener Kitor Pilot Batch ===');
  let token: string;
  try {
    token = getToken();
  } catch (err: any) {
    console.log('Status: .env mangler token. Opprett .env med KITOR_TOKEN=<fra_vaultwarden>');
    return;
  }

  let leaseToken: string | null = null;
  let heartbeatTimer: NodeJS.Timeout | null = null;

  try {
    leaseToken = await acquireGpuLease(token, 1);

    // Heartbeat hvert 4. minutt
    heartbeatTimer = setInterval(() => {
      if (leaseToken) sendHeartbeat(token, leaseToken);
    }, 4 * 60 * 1000);

    console.log('Klar til å sende pilot-batch (3 øvelser: knebøy, kettlebell-swing, push-ups)...');
    console.log(`Endepunkt: ${KITOR_HOST}${COMFY_PATH}/prompt`);

    // Sjekk helse på ComfyUI ruten
    const checkRes = await fetch(`${KITOR_HOST}${COMFY_PATH}/system_stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`ComfyUI rute respons-status: ${checkRes.status}`);

  } catch (err) {
    console.error('Pilot batch feilet:', err);
  } finally {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    if (leaseToken) {
      await releaseGpuLease(token, leaseToken);
    }
  }
}

if (process.argv[1] && process.argv[1].includes('runKitorPilotBatch')) {
  runPilot();
}

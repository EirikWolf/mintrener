import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { EXERCISE_LIBRARY } from '../src/data/exercises/index.js';
import { buildComfyPromptJob } from '../src/services/imagePromptService.js';

const KITOR_HOST = 'https://kitor.tail49f298.ts.net';
const COMFY_URL = `${KITOR_HOST}/comfy-mintrener`;

function getToken(): string {
  const envPath = path.resolve(process.cwd(), '.env');
  const match = fs.readFileSync(envPath, 'utf-8').match(/^KITOR_TOKEN=(.+)$/m);
  if (!match || !match[1]) throw new Error('KITOR_TOKEN mangler');
  return match[1].trim();
}

function curlGetJson(url: string, token: string): any {
  const cmd = `curl.exe -s -k -m 15 -H "Authorization: Bearer ${token}" "${url}"`;
  const out = execSync(cmd, { encoding: 'utf-8' });
  return JSON.parse(out);
}

function curlPostJson(url: string, token: string, payload: any): any {
  const tmpFile = path.resolve(process.cwd(), 'temp_curl_prompt.json');
  fs.writeFileSync(tmpFile, JSON.stringify(payload), 'utf-8');
  try {
    const cmd = `curl.exe -s -k -m 15 -X POST -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" -d "@${tmpFile.replace(/\\/g, '/')}" "${url}"`;
    const out = execSync(cmd, { encoding: 'utf-8' });
    return JSON.parse(out);
  } finally {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  }
}

function curlDownloadFile(url: string, token: string, destPath: string): void {
  const cmd = `curl.exe -s -k -m 60 -H "Authorization: Bearer ${token}" "${url}" -o "${destPath.replace(/\\/g, '/')}"`;
  execSync(cmd);
}

function buildFluxWorkflow(promptText: string, filenamePrefix: string, seed: number) {
  return {
    "6": {
      "inputs": {
        "text": promptText,
        "clip": ["38", 1]
      },
      "class_type": "CLIPTextEncode"
    },
    "8": {
      "inputs": {
        "samples": ["31", 0],
        "vae": ["10", 0]
      },
      "class_type": "VAEDecode"
    },
    "9": {
      "inputs": {
        "filename_prefix": filenamePrefix,
        "images": ["8", 0]
      },
      "class_type": "SaveImage"
    },
    "10": {
      "inputs": {
        "vae_name": "ae.safetensors"
      },
      "class_type": "VAELoader"
    },
    "11": {
      "inputs": {
        "unet_name": "flux1-dev-fp8.safetensors",
        "weight_dtype": "fp8_e4m3fn"
      },
      "class_type": "UNETLoader"
    },
    "27": {
      "inputs": {
        "width": 896,
        "height": 1152,
        "batch_size": 1
      },
      "class_type": "EmptySD3LatentImage"
    },
    "30": {
      "inputs": {
        "clip_name1": "t5xxl_fp8_e4m3fn.safetensors",
        "clip_name2": "clip_l.safetensors",
        "type": "flux"
      },
      "class_type": "DualCLIPLoader"
    },
    "31": {
      "inputs": {
        "seed": seed,
        "steps": 24,
        "cfg": 1.0,
        "sampler_name": "euler",
        "scheduler": "simple",
        "denoise": 1.0,
        "model": ["38", 0],
        "positive": ["6", 0],
        "negative": ["33", 0],
        "latent_image": ["27", 0]
      },
      "class_type": "KSampler"
    },
    "33": {
      "inputs": {
        "text": "blurry, low quality, deformed limbs, extra arms, bad anatomy, cropped head, missing feet, cut off frame, ugly",
        "clip": ["38", 1]
      },
      "class_type": "CLIPTextEncode"
    },
    "38": {
      "inputs": {
        "lora_name": "synthiq/astrid_k.safetensors",
        "strength_model": 0.85,
        "strength_clip": 0.85,
        "model": ["11", 0],
        "clip": ["30", 0]
      },
      "class_type": "LoraLoader"
    }
  };
}

async function runBatch() {
  const token = getToken();
  console.log('🚀 Starter Kitor Bildegenerering for alle øvelser med curl...');

  const outputDir = path.resolve(process.cwd(), 'public/images/exercises');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const total = EXERCISE_LIBRARY.length * 2;
  let completed = 0;

  for (let i = 0; i < EXERCISE_LIBRARY.length; i++) {
    const exercise = EXERCISE_LIBRARY[i];

    for (const phase of [0, 1] as const) {
      const filename = `${exercise.id}-${phase}.png`;
      const targetPath = path.join(outputDir, filename);

      const promptText = buildComfyPromptJob(exercise, phase).positivePrompt;
      const prefix = `mintrener_${exercise.id}_f${phase}`;
      const seed = Math.floor(Math.random() * 1000000000);

      console.log(`\n[${completed + 1}/${total}] Genererer: ${exercise.navn.nb} (Fase ${phase + 1}) -> ${filename}`);
      console.log(`Prompt: ${promptText.slice(0, 120)}...`);

      const workflow = buildFluxWorkflow(promptText, prefix, seed);
      const res = curlPostJson(`${COMFY_URL}/prompt`, token, { prompt: workflow });

      const promptId = res.prompt_id;
      if (!promptId) {
        console.error('Ingen prompt_id mottatt!', res);
        continue;
      }

      console.log(`Venter på ComfyUI prompt ${promptId}...`);
      let done = false;
      let outputImageInfo: any = null;

      for (let w = 0; w < 40; w++) {
        await new Promise((r) => setTimeout(r, 4000));
        try {
          const history = curlGetJson(`${COMFY_URL}/history/${promptId}`, token);
          if (history && history[promptId] && history[promptId].outputs) {
            const outputs = history[promptId].outputs;
            const node9 = outputs['9'];
            if (node9 && node9.images && node9.images.length > 0) {
              outputImageInfo = node9.images[0];
              done = true;
              break;
            }
          }
        } catch (e) {
          // Poll videre
        }
      }

      if (done && outputImageInfo) {
        const viewUrl = `${COMFY_URL}/view?filename=${outputImageInfo.filename}&subfolder=${outputImageInfo.subfolder || ''}&type=${outputImageInfo.type || 'output'}`;
        curlDownloadFile(viewUrl, token, targetPath);
        console.log(`✅ Lagret ${filename} (${(fs.statSync(targetPath).size / 1024).toFixed(0)} KB)`);
        completed++;
      } else {
        console.warn(`⚠️ Timeout for ${filename}`);
      }
    }
  }

  console.log(`\n🎉 Fullført! ${completed}/${total} bilder generert og lastet ned.`);
}

runBatch().catch(console.error);

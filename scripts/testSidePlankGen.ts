import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { getKitorToken } from './kitorEnv';

const KITOR_HOST = 'https://kitor.tail49f298.ts.net';
const COMFY_URL = `${KITOR_HOST}/comfy-mintrener`;

const token = getKitorToken();

function curlPostJson(url: string, payload: any): any {
  const tmpFile = path.resolve(process.cwd(), 'temp_test_prompt.json');
  fs.writeFileSync(tmpFile, JSON.stringify(payload), 'utf-8');
  try {
    const cmd = `curl.exe -s -k -m 15 -X POST -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" -d "@${tmpFile.replace(/\\/g, '/')}" "${url}"`;
    return JSON.parse(execSync(cmd, { encoding: 'utf-8' }));
  } finally {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  }
}

function curlGetJson(url: string): any {
  const cmd = `curl.exe -s -k -m 15 -H "Authorization: Bearer ${token}" "${url}"`;
  return JSON.parse(execSync(cmd, { encoding: 'utf-8' }));
}

function buildFluxWorkflow(promptText: string, negativeText: string, prefix: string, seed: number) {
  return {
    '6': { 'inputs': { 'text': promptText, 'clip': ['38', 1] }, 'class_type': 'CLIPTextEncode' },
    '8': { 'inputs': { 'samples': ['31', 0], 'vae': ['10', 0] }, 'class_type': 'VAEDecode' },
    '9': { 'inputs': { 'filename_prefix': prefix, 'images': ['8', 0] }, 'class_type': 'SaveImage' },
    '10': { 'inputs': { 'vae_name': 'ae.safetensors' }, 'class_type': 'VAELoader' },
    '11': { 'inputs': { 'unet_name': 'flux1-dev-fp8.safetensors', 'weight_dtype': 'fp8_e4m3fn' }, 'class_type': 'UNETLoader' },
    '27': { 'inputs': { 'width': 896, 'height': 1152, 'batch_size': 1 }, 'class_type': 'EmptySD3LatentImage' },
    '30': { 'inputs': { 'clip_name1': 't5xxl_fp8_e4m3fn.safetensors', 'clip_name2': 'clip_l.safetensors', 'type': 'flux' }, 'class_type': 'DualCLIPLoader' },
    '31': { 'inputs': { 'seed': seed, 'steps': 24, 'cfg': 1.0, 'sampler_name': 'euler', 'scheduler': 'simple', 'denoise': 1.0, 'model': ['38', 0], 'positive': ['6', 0], 'negative': ['33', 0], 'latent_image': ['27', 0] }, 'class_type': 'KSampler' },
    '33': { 'inputs': { 'text': negativeText, 'clip': ['38', 1] }, 'class_type': 'CLIPTextEncode' },
    '38': { 'inputs': { 'lora_name': 'synthiq/astrid_k.safetensors', 'strength_model': 0.85, 'strength_clip': 0.85, 'model': ['11', 0], 'clip': ['30', 0] }, 'class_type': 'LoraLoader' }
  };
}

async function testSidePlank() {
  const promptText = 'full body side-view photograph of an athletic woman executing a side-bridge core exercise, she is lying on her side supported solely by her right forearm resting flat on the mat with elbow under shoulder, her hips and torso are lifted up into a straight lateral line above the mat, her left hand is raised towards the sky, both legs are straight with feet stacked sideways on the mat, charcoal sports bra and leggings, bright fitness studio';
  const negativeText = 'lying on back, supine, bridge, reverse plank, leg straight up, hands on knees, two hands on floor, front view';
  const seed = 6619284;
  const wf = buildFluxWorkflow(promptText, negativeText, 'test_sideplank_f1_strict', seed);
  
  console.log('Sender prompt for fase 2 til Kitor...');
  const res = curlPostJson(`${COMFY_URL}/prompt`, { prompt: wf });
  const promptId = res.prompt_id;
  console.log('Prompt id:', promptId);
  
  for (let w = 0; w < 40; w++) {
    await new Promise(r => setTimeout(r, 3000));
    try {
      const hist = curlGetJson(`${COMFY_URL}/history/${promptId}`);
      if (hist && hist[promptId]?.outputs?.['9']?.images?.[0]) {
        const img = hist[promptId].outputs['9'].images[0];
        console.log('Ferdig generert bilde:', img);
        const viewUrl = `${COMFY_URL}/view?filename=${img.filename}&subfolder=${img.subfolder || ''}&type=${img.type || 'output'}`;
        const dest = path.resolve(process.cwd(), 'public/images/exercises/sideplanke-1.png');
        execSync(`curl.exe -s -k -H "Authorization: Bearer ${token}" "${viewUrl}" -o "${dest}"`);
        console.log('Lagret til sideplanke-1.png!');
        break;
      }
    } catch (e) {}
  }
}

testSidePlank();

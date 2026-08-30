import fs from 'fs';
import path from 'path';
import { EXERCISE_LIBRARY } from '../src/data/exercises';
import {
  ASTRID_FLUX_BASE_STYLE,
  ASTRID_FLUX_OUTFIT_STYLE,
  formatViewAngle,
  buildAstridFluxWorkflow,
  buildAstridWanVideoWorkflow,
} from '../src/services/imagePromptService';
import { getKitorToken } from './kitorEnv';

/**
 * Min Trener — Full Kitor Batch Runner (74 øvelser × 2 faser = 148 bilder)
 * Modell: Flux.1 Dev fp8 + Astrid LoRA (synthiq/astrid_k.safetensors)
 * Video: Wan2.1 14B fp8 (I2V)
 * Anatomisk presisjon, dynamisk bevegelse, svetteglans og motiverende smil
 *
 * Flagg:
 *   --dry-run        Validerer alle prompter og workflows uten å kalle Kitor API
 *   --limit <n>      Kjør kun de første n øvelsene
 *   --exercise <id>  Kjør kun for spesifikk øvelses-id
 *   --force          Regenerer selv om bildet finnes fra før
 *   --video          Generer Wan2.1 I2V video-workflows
 */

const KITOR_HOST = process.env.KITOR_HOST || 'https://kitor.tail49f298.ts.net';
const COMFY_PATH = '/comfy-mintrener';
const ARBITER_PATH = '/arbiter';

function getToken(): string {
  return getKitorToken();
}

export async function acquireGpuLeaseWithRetry(token: string, durationH: number = 2, maxRetries: number = 5): Promise<string> {
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

export async function sendHeartbeat(token: string, leaseToken: string): Promise<void> {
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

export async function releaseGpuLease(token: string, leaseToken: string): Promise<void> {
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

export async function submitPrompt(token: string, promptWorkflow: any): Promise<string> {
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

export async function waitForCompletion(token: string, promptId: string, maxWaitSec: number = 180): Promise<any> {
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

export async function downloadImage(token: string, imgInfo: any, targetPath: string) {
  const url = `${KITOR_HOST}${COMFY_PATH}/view?filename=${encodeURIComponent(imgInfo.filename)}&subfolder=${encodeURIComponent(imgInfo.subfolder)}&type=${encodeURIComponent(imgInfo.type)}`;
  const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
  if (res.ok) {
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(targetPath, buf);
  }
}

export async function runFullBatch(argv: string[] = process.argv.slice(2)) {
  const isDryRun = argv.includes('--dry-run');
  const isForce = argv.includes('--force');
  const isVideoMode = argv.includes('--video');

  const limitIdx = argv.indexOf('--limit');
  const limit = limitIdx !== -1 && argv[limitIdx + 1] ? parseInt(argv[limitIdx + 1], 10) : undefined;

  const exerciseIdx = argv.indexOf('--exercise');
  const targetExerciseId = exerciseIdx !== -1 && argv[exerciseIdx + 1] ? argv[exerciseIdx + 1] : undefined;

  let exercises = EXERCISE_LIBRARY;
  if (targetExerciseId) {
    exercises = exercises.filter((e) => e.id === targetExerciseId);
    if (exercises.length === 0) {
      console.error(`❌ Fant ingen øvelse med id "${targetExerciseId}"`);
      return;
    }
  }

  if (limit && limit > 0) {
    exercises = exercises.slice(0, limit);
  }

  console.log('===========================================================');
  console.log(`🚀 Min Trener Kitor Batch Runner`);
  console.log(`   Modus: ${isDryRun ? 'DRY RUN (Ingen nettverkskall)' : 'LIVE KITOR BATCH'}`);
  console.log(`   Øvelser: ${exercises.length} av totalt ${EXERCISE_LIBRARY.length}`);
  console.log(`   Type: ${isVideoMode ? 'Wan2.1 I2V Video' : 'Flux.1 Dev Bilde (Fase 1 & 2)'}`);
  console.log('===========================================================');

  if (isDryRun) {
    let validatedCount = 0;
    for (const exercise of exercises) {
      for (const phaseIdx of [0, 1]) {
        const phaseKey = phaseIdx.toString();
        const specificAction =
          exercise.bildePrompt && exercise.bildePrompt[phaseKey]
            ? exercise.bildePrompt[phaseKey]
            : `${exercise.navn.en || exercise.navn.nb} step ${phaseIdx + 1}`;

        const viewAngleStr = formatViewAngle(exercise.bildeVinkel);
        const promptText = `${ASTRID_FLUX_BASE_STYLE}, ${specificAction}, ${ASTRID_FLUX_OUTFIT_STYLE}, ${viewAngleStr}`;
        const filenamePrefix = `${exercise.id}_step${phaseIdx}`;
        const workflow = buildAstridFluxWorkflow(promptText, 42, filenamePrefix);

        if (!workflow["5"]?.inputs?.text || !workflow["10"]?.inputs?.filename_prefix) {
          throw new Error(`Ugyldig workflow for ${exercise.id} fase ${phaseIdx}`);
        }
        validatedCount++;
      }
    }
    console.log(`✅ [DRY RUN SUKSESS] Alle ${validatedCount} prompt- og workflow-strukturer er 100% gyldige!`);
    return;
  }

  const token = getToken();
  let leaseToken: string | null = null;
  let heartbeatTimer: NodeJS.Timeout | null = null;

  try {
    leaseToken = await acquireGpuLeaseWithRetry(token, 2);

    heartbeatTimer = setInterval(() => {
      if (leaseToken) sendHeartbeat(token, leaseToken);
    }, 3 * 60 * 1000);

    const outputDir = path.resolve(process.cwd(), 'public', 'images', 'exercises');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    let total = 0;
    const totalJobs = exercises.length * 2;

    for (const exercise of exercises) {
      for (const phaseIdx of [0, 1]) {
        total++;
        const targetPath = path.join(outputDir, `${exercise.id}-${phaseIdx}.png`);
        if (!isForce && fs.existsSync(targetPath) && fs.statSync(targetPath).size > 50000) {
          console.log(`⏩ [${total}/${totalJobs}] ${exercise.navn.nb} (${exercise.id}-${phaseIdx}.png) finnes allerede, hopper over.`);
          continue;
        }

        const phaseKey = phaseIdx.toString();
        const specificAction =
          exercise.bildePrompt && exercise.bildePrompt[phaseKey]
            ? exercise.bildePrompt[phaseKey]
            : `${exercise.navn.en || exercise.navn.nb} step ${phaseIdx + 1}`;

        const viewAngleStr = formatViewAngle(exercise.bildeVinkel);
        const promptText = `${ASTRID_FLUX_BASE_STYLE}, ${specificAction}, ${ASTRID_FLUX_OUTFIT_STYLE}, ${viewAngleStr}`;
        const seed = 200 + total * 888;
        const filenamePrefix = `${exercise.id}_step${phaseIdx}`;

        console.log(`\n▶️ [${total}/${totalJobs}] ${exercise.navn.nb} (Fase ${phaseIdx + 1}, ${viewAngleStr})...`);
        const workflow = buildAstridFluxWorkflow(promptText, seed, filenamePrefix);
        const promptId = await submitPrompt(token, workflow);
        console.log(`   ComfyUI ID: ${promptId}`);

        const imgInfo = await waitForCompletion(token, promptId, 120);
        await downloadImage(token, imgInfo, targetPath);
        console.log(`   ✨ Lagret bilde til: public/images/exercises/${exercise.id}-${phaseIdx}.png`);
      }
    }

    console.log('\n🎉 Full bibliotek-batch med smil og bevegelse fullført!');
  } catch (err: any) {
    console.error('Feil i batch:', err.message || err);
    throw err;
  } finally {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    if (leaseToken) {
      await releaseGpuLease(token, leaseToken);
    }
  }
}

// Kjør bare automatisk hvis filen kalles direkte fra CLI
if (process.argv[1] && (process.argv[1].endsWith('runFullKitorBatch.ts') || process.argv[1].endsWith('runFullKitorBatch.js'))) {
  runFullBatch().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}


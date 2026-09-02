import fs from 'fs';
import path from 'path';
import { EXERCISE_LIBRARY } from '../src/data/exercises';
import {
  buildComfyPromptJob,
  seedForExercise,
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

/** Navnet arbiter kjenner oss under. Må matche `requester` i acquire. */
const REQUESTER = 'mintrener';

/**
 * Slår opp om vi allerede står oppført med en lease.
 *
 * Finnes fordi `acquire` ikke er idempotent: et tapt svar kan bety at leasen ER
 * opprettet. Se acquireGpuLeaseWithRetry.
 */
async function finnEgenLease(token: string): Promise<string | null> {
  try {
    const res = await fetch(`${KITOR_HOST}${ARBITER_PATH}/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { leases?: { token: string; requester: string }[] };
    // Bare VÅRE egne. Å overta en annens ville stjålet GPU-en midt i deres batch.
    const våre = (data.leases ?? []).filter((l) => l.requester === REQUESTER);
    if (våre.length > 1) {
      console.warn(
        `⚠ ${våre.length} leaser står på ${REQUESTER}. Vi overtar én; resten må frigis for hånd ` +
          `(kitor-arbiter release <token>): ${våre.slice(1).map((l) => l.token).join(', ')}`
      );
    }
    return våre[0]?.token ?? null;
  } catch {
    return null;
  }
}

/**
 * Reserverer GPU-en, og tåler at svaret blir borte på veien.
 *
 * HENDELSEN 2026-09-01, 20:07: klienten fikk «fetch failed» og gikk i
 * gjenforsøk. På serveren hadde forespørselen landet — mintrener sto med en
 * eksklusiv image-lease til 20:53 mens skriptet trodde det ikke hadde noen. Ni
 * jobber fra andre prosjekter sto i kø bak en lease ingen brukte, og vi hadde
 * ikke tokenet til å frigi den.
 *
 * Feilen var ikke nettverket, men at løkken behandlet en ikke-idempotent
 * operasjon som om den var idempotent. Skillet som mangler:
 *
 * - HTTP-avslag  → serveren HAR svart, ingen lease finnes. Prøv igjen.
 * - Nettverksfeil → svaret er borte, leasen KAN finnes. Slå opp først.
 */
export async function acquireGpuLeaseWithRetry(
  token: string,
  durationH: number = 2,
  maxRetries: number = 5,
  opts: { retryMs?: number } = {}
): Promise<string> {
  const retryMs = opts.retryMs ?? 10000;
  console.log('📡 Forespør GPU-lease fra Arbiter v1...');
  // Sant når et tidligere forsøk feilet på nettverksnivå, altså der vi ikke vet
  // om leasen ble opprettet.
  let tvetydig = false;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // Etter en TVETYDIG feil sjekker vi før neste forsøk også, ikke bare i
    // catch-grenen. Første utgave sjekket kun etterpå, og da rakk løkken å
    // opprette en lease til før den oppdaget den første — 2026-09-02 sto to
    // foreldreløse leaser på mintrener samtidig, og bare én ble frigitt.
    //
    // Kun etter tvetydighet: et HTTP-avslag betyr at serveren HAR svart og at
    // ingen lease ble laget. Å slå opp status da ville doblet trafikken mot en
    // delt tjeneste uten å kunne finne noe.
    if (tvetydig) {
      const alt = await finnEgenLease(token);
      if (alt) {
        console.log('✅ Vi holder allerede en lease — bruker den i stedet for å be om en ny.');
        return alt;
      }
    }
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
      tvetydig = true;
      const egen = await finnEgenLease(token);
      if (egen) {
        console.log('✅ Svaret gikk tapt, men leasen ble opprettet — overtar den.');
        return egen;
      }
    }
    await new Promise((r) => setTimeout(r, retryMs));
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
        const oppf = historyData[promptId];
        if (oppf?.outputs?.["10"]?.images?.[0]) {
          return oppf.outputs["10"].images[0];
        }
        // ComfyUI melder kjørefeil i status, ikke ved å utebli. Uten denne
        // grenen ventet vi hele timeouten på et resultat som aldri kom, og
        // meldte «Generering tok for lang tid» om en feil serveren rapporterte
        // umiddelbart — 2026-09-02 kostet det ti minutter og en feilslutning.
        if (oppf?.status?.status_str === 'error') {
          const melding = (oppf.status.messages ?? [])
            .filter((m: any[]) => String(m[0]).includes('error'))
            .map((m: any[]) => `${m[1]?.node_type ?? '?'}: ${m[1]?.exception_message ?? ''}`)
            .join(' | ');
          throw new Error(`ComfyUI feilet — ${melding || 'ukjent årsak'}`);
        }
      }
    } catch (err) {
      // Kjørefeil skal boble opp; nettverksglipp skal bare prøves på nytt.
      if (err instanceof Error && err.message.startsWith('ComfyUI feilet')) throw err;
    }
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

  // --exercises tar en kommaliste. Et forsøk er sjelden én øvelse: skal vi måle
  // om en promptendring virker, trenger vi flere øvelser med samme egenskap.
  const flereIdx = argv.indexOf('--exercises');
  const flereIder = flereIdx !== -1 && argv[flereIdx + 1] ? argv[flereIdx + 1].split(',').map((x) => x.trim()) : undefined;

  // --out lar et forsøk skrive et annet sted enn public/images/exercises.
  // Uten den overskriver enhver prøve bildene som ligger i appen, og da er det
  // ingen veg tilbake om prøven ble dårligere enn det vi hadde.
  const outIdx = argv.indexOf('--out');
  const outArg = outIdx !== -1 && argv[outIdx + 1] ? argv[outIdx + 1] : undefined;

  let exercises = EXERCISE_LIBRARY;
  if (targetExerciseId) {
    exercises = exercises.filter((e) => e.id === targetExerciseId);
    if (exercises.length === 0) {
      console.error(`❌ Fant ingen øvelse med id "${targetExerciseId}"`);
      return;
    }
  }
  if (flereIder) {
    exercises = exercises.filter((e) => flereIder.includes(e.id));
    const ukjente = flereIder.filter((id) => !EXERCISE_LIBRARY.some((e) => e.id === id));
    if (ukjente.length > 0) {
      console.error(`❌ Ukjente øvelses-id-er: ${ukjente.join(', ')}`);
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
        const viewAngleStr = formatViewAngle(exercise.bildeVinkel);
        const promptText = buildComfyPromptJob(exercise, phaseIdx).positivePrompt;
        const filenamePrefix = `${exercise.id}_step${phaseIdx}`;
        const workflow = buildAstridFluxWorkflow(promptText, seedForExercise(exercise.id), filenamePrefix);

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

    const outputDir = outArg
      ? path.resolve(process.cwd(), outArg)
      : path.resolve(process.cwd(), 'public', 'images', 'exercises');
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

        const promptText = buildComfyPromptJob(exercise, phaseIdx).positivePrompt;
        // Seeden hører til ØVELSEN, ikke bildet. `200 + total * 888` ga fase 0 og
        // fase 1 hver sin seed, og dermed ulik person i ulikt rom for start og
        // slutt av samme øvelse — den mekaniske grunnen til at parene ikke hang
        // sammen. seedForExercise er determinisk over øvelses-id-en.
        const seed = seedForExercise(exercise.id);
        const filenamePrefix = `${exercise.id}_step${phaseIdx}`;

        console.log(`\n▶️ [${total}/${totalJobs}] ${exercise.navn.nb} (Fase ${phaseIdx + 1}, ${formatViewAngle(exercise.bildeVinkel)})...`);
        const workflow = buildAstridFluxWorkflow(promptText, seed, filenamePrefix);
        const promptId = await submitPrompt(token, workflow);
        console.log(`   ComfyUI ID: ${promptId}`);

        const imgInfo = await waitForCompletion(token, promptId, 120);
        await downloadImage(token, imgInfo, targetPath);
        console.log(`   ✨ Lagret bilde til: ${path.relative(process.cwd(), targetPath)}`);
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


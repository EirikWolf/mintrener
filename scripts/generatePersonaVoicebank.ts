/**
 * Min Trener — batch-runner for persona-lydbanken (taksonomi v2, spec § 5).
 *
 * Genererer 144 TTS-klipp (4 personas × (11 cues + 25 øvelser)) via Chatterbox
 * voice-clone på Kitor, og etterbehandler de 4 innspilte Tre-To-En-sporene.
 * Alle klipp (TTS + innspilt) går gjennom samme ffmpeg-kjede: silenceremove,
 * ~10 ms fade ut og loudnorm til felles nivå. Ingen manifest-generering her —
 * det er en egen byggtidsoppgave (β5).
 *
 * Bruk:
 *   npx tsx scripts/generatePersonaVoicebank.ts [--dry-run] [--persona <id>]
 *     [--only <cueId|exerciseId>] [--force] [--skip-recorded]
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

import { getKitorToken } from './kitorEnv';
import {
  buildClonePayload,
  buildFfmpegArgs,
  buildTaskList,
  parseManifest,
  type RecordedTask,
  type TaskFilters,
  type TtsTask,
  type VoicebankTask,
} from './voicebankTasks';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST_PATH = path.join(ROOT_DIR, 'scripts', 'voicebank-manuskript.json');
const KITOR_TTS_URL =
  process.env.KITOR_TTS_URL || 'https://kitor.tail49f298.ts.net/chatterbox/tts';

const TTS_TIMEOUT_MS = 240_000;
const TTS_RETRIES = 2; // i tillegg til første forsøk
const RETRY_PAUSE_MS = 3_000;
const SUSPICIOUS_BYTES = 1024; // < 1 KB er sannsynligvis en feilside, ikke lyd

interface CliOptions extends TaskFilters {
  readonly dryRun: boolean;
  readonly force: boolean;
}

function parseCliArgs(argv: readonly string[]): CliOptions {
  const valueOf = (flag: string): string | undefined => {
    const idx = argv.indexOf(flag);
    return idx >= 0 ? argv[idx + 1] : undefined;
  };
  return {
    dryRun: argv.includes('--dry-run'),
    force: argv.includes('--force'),
    skipRecorded: argv.includes('--skip-recorded'),
    persona: valueOf('--persona'),
    only: valueOf('--only'),
  };
}

function toAbsolute(relPath: string): string {
  return path.join(ROOT_DIR, ...relPath.split('/'));
}

function shorten(text: string, max = 48): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

function assertFfmpeg(): void {
  const res = spawnSync('ffmpeg', ['-version'], { encoding: 'utf-8' });
  if (res.error || res.status !== 0) {
    console.error('❌ ffmpeg ble ikke funnet på PATH. Etterbehandling (silenceremove/');
    console.error('   afade/loudnorm) er obligatorisk — installer ffmpeg og prøv igjen.');
    process.exit(1);
  }
}

/** Kjør ffmpeg-kjeden på input og erstatt output atomisk via .tmp.mp3 + rename. */
function postProcess(inputPath: string, outputPath: string): void {
  const tmpPath = `${outputPath}.tmp.mp3`;
  const res = spawnSync('ffmpeg', buildFfmpegArgs(inputPath, tmpPath), {
    encoding: 'utf-8',
  });
  if (res.status !== 0) {
    fs.rmSync(tmpPath, { force: true });
    throw new Error(`ffmpeg feilet (exit ${res.status ?? '?'}): ${res.stderr?.trim()}`);
  }
  fs.renameSync(tmpPath, outputPath);
}

async function fetchTtsOnce(task: TtsTask, token: string): Promise<Buffer> {
  const res = await fetch(KITOR_TTS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(buildClonePayload(task.text, task.seedFile)),
    signal: AbortSignal.timeout(TTS_TIMEOUT_MS),
  });
  if (!res.ok) {
    const errText = (await res.text()).slice(0, 300);
    throw new Error(`HTTP ${res.status} fra Kitor: ${errText}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length < SUSPICIOUS_BYTES) {
    // Mistenkelig liten respons — sannsynligvis en feilside; behandles som feil
    // slik at retrien får en ny sjanse i stedet for å lagre søppel.
    throw new Error(`mistenkelig liten respons (${buffer.length} bytes < 1 KB)`);
  }
  return buffer;
}

async function fetchTtsWithRetries(task: TtsTask, token: string): Promise<Buffer> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= TTS_RETRIES; attempt++) {
    if (attempt > 0) {
      console.warn(`   ↻ Forsøk ${attempt + 1}/${TTS_RETRIES + 1} om ${RETRY_PAUSE_MS / 1000} s...`);
      await sleep(RETRY_PAUSE_MS);
    }
    try {
      return await fetchTtsOnce(task, token);
    } catch (err) {
      lastError = err;
      console.warn(`   ⚠️ ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

type TaskOutcome = 'generated' | 'skipped' | 'failed';

async function runTtsTask(task: TtsTask, token: string, force: boolean): Promise<TaskOutcome> {
  const outputPath = toAbsolute(task.outputRelPath);
  if (!force && fs.existsSync(outputPath)) {
    console.log(`⏩ Hopper over eksisterende: ${task.personaId}/${task.id}`);
    return 'skipped';
  }
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const rawPath = `${outputPath}.raw.mp3`;
  try {
    console.log(`🎙️ [${task.personaId}/${task.id}] "${shorten(task.text)}"`);
    const buffer = await fetchTtsWithRetries(task, token);
    fs.writeFileSync(rawPath, buffer);
    postProcess(rawPath, outputPath);
    const kb = Math.round(fs.statSync(outputPath).size / 1024);
    console.log(`   ✅ ${task.outputRelPath} (${kb} KB)`);
    return 'generated';
  } catch (err) {
    console.error(`   ❌ Feilet: ${err instanceof Error ? err.message : String(err)}`);
    return 'failed';
  } finally {
    fs.rmSync(rawPath, { force: true });
  }
}

function runRecordedTask(task: RecordedTask, force: boolean): TaskOutcome {
  const outputPath = toAbsolute(task.outputRelPath);
  const sourcePath = toAbsolute(task.sourceRelPath);
  if (!force && fs.existsSync(outputPath)) {
    console.log(`⏩ Hopper over eksisterende: ${task.personaId}/start_321`);
    return 'skipped';
  }
  if (!fs.existsSync(sourcePath)) {
    console.error(`   ❌ Fant ikke innspilt kilde: ${sourcePath}`);
    return 'failed';
  }
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  try {
    console.log(`🎛️ [${task.personaId}/start_321] etterbehandler innspilt spor`);
    postProcess(sourcePath, outputPath);
    console.log(`   ✅ ${task.outputRelPath}`);
    return 'generated';
  } catch (err) {
    console.error(`   ❌ Feilet: ${err instanceof Error ? err.message : String(err)}`);
    return 'failed';
  }
}

function printDryRun(tasks: readonly VoicebankTask[]): void {
  console.log('\n--- Plan (dry run — ingen nettverk, ingen ffmpeg) ---');
  for (const t of tasks) {
    const text = t.kind === 'tts' ? shorten(t.text) : `[innspilt: ${t.sourceRelPath}]`;
    console.log(`  ${t.personaId}/${t.id} → "${text}" → ${t.outputRelPath}`);
  }
  const perPersona = tasks.reduce<Record<string, number>>((acc, t) => {
    acc[t.personaId] = (acc[t.personaId] ?? 0) + 1;
    return acc;
  }, {});
  console.log('\nTelling per persona:');
  for (const [id, n] of Object.entries(perPersona)) {
    console.log(`  ${id}: ${n}`);
  }
  const tts = tasks.filter((t) => t.kind === 'tts').length;
  console.log(`\nTotalt: ${tasks.length} oppgaver (${tts} TTS + ${tasks.length - tts} innspilt)`);
}

async function runAll(tasks: readonly VoicebankTask[], opts: CliOptions): Promise<void> {
  assertFfmpeg();
  let token = '';
  try {
    token = getKitorToken(ROOT_DIR);
  } catch (err) {
    console.error(`❌ ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  const counts: Record<TaskOutcome, number> = { generated: 0, skipped: 0, failed: 0 };
  // Sekvensielt med vilje — én GPU på Kitor.
  for (const task of tasks) {
    const outcome =
      task.kind === 'tts'
        ? await runTtsTask(task, token, opts.force)
        : runRecordedTask(task, opts.force);
    counts[outcome]++;
  }

  console.log('\n🏁 Sluttrapport:');
  console.log(`   Generert: ${counts.generated}, hoppet over: ${counts.skipped}, feilet: ${counts.failed}`);
  if (counts.failed > 0) {
    process.exitCode = 1;
  }
}

async function main(): Promise<void> {
  const opts = parseCliArgs(process.argv.slice(2));
  const manifest = parseManifest(JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8')));

  console.log('====================================================');
  console.log('🎙️ Min Trener — persona-lydbank (taksonomi v2)');
  console.log('====================================================');
  console.log(`Kitor-endepunkt: ${KITOR_TTS_URL}`);
  console.log(`Dry run: ${opts.dryRun ? 'JA' : 'NEI'}`);

  const tasks = buildTaskList(manifest, opts);
  if (tasks.length === 0) {
    console.error('❌ Ingen oppgaver matchet filtrene (--persona/--only). Sjekk stavemåten.');
    process.exit(1);
  }

  if (opts.dryRun) {
    printDryRun(tasks);
    return;
  }
  await runAll(tasks, opts);
}

main().catch((err) => {
  console.error('❌ Uventet feil:', err);
  process.exit(1);
});

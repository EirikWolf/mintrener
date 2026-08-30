/**
 * Min Trener — batch-runner for persona-lydbanken (taksonomi v2, spec § 5).
 *
 * Genererer 148 TTS-klipp (4 personas × (12 cues, inkl. start_321_short, +
 * 25 øvelser)) via Chatterbox voice-clone på Kitor, og etterbehandler de 4
 * innspilte Tre-To-En-sporene (full start_321) = 152 oppgaver.
 * TTS-nedlastinger caches rått i audio/raw-cache/ (gitignorert) slik at
 * etterbehandlings-iterasjon er gratis etter én GPU-runde: `--reprocess`
 * regenererer output fra cachen uten nettverk/token. TTS-klipp får v2-kjeden
 * (denoise/trim med pre-roll/mykgjøring/loudnorm); innspilte spor får kun den
 * skånsomme trim+fade+loudnorm-kjeden. Ingen manifest-generering her —
 * det er en egen byggtidsoppgave (β5).
 *
 * HALEVAKT (advarsel): for hvert TTS-klipp måles RÅFILA i audio/raw-cache/
 * med volumedetect — siste 50 ms mot råfilas samlede mean_volume. Et take som
 * fortsatt har tale-energi i halen tyder på at Chatterbox kuttet ordet.
 * Terskel: TAIL_FALLOFF_THRESHOLD_DB. Målingen skjer på råfila og IKKE på
 * etterbehandlet output, fordi TRIM_END/FADE er nettopp det som bestemmer
 * haleenergien der og inverterer signalet.
 * Sjekken kjøres også når klippet hoppes over — cachefila er råfila — så
 * vakten virker på inkrementelle kjøringer. Innspilte spor måles ikke: de har
 * ingen råfil fra Chatterbox.
 * Mistanke gir en ADVARSEL med et `--refetch`-forslag og telles i
 * sluttrapporten — kjøringen fortsetter og exit-koden er urørt, for et take
 * kan legitimt være brått.
 * DEKNING: sluttrapporten oppgir alltid både antall MÅLTE og antall
 * IKKE-MÅLTE TTS-klipp. Vakten kan bare uttale seg om take den har målt, og
 * den måler ingenting når råfila mangler — audio/raw-cache/ er gitignorert
 * mens public/audio/personas/ er committet, så på en frisk klone hoppes hvert
 * klipp over uten måleunderlag. «Ingen flagg» betyr derfor «ingen funn» BARE
 * når rapporten samtidig sier at dekningen var full.
 *
 * Bruk:
 *   npx tsx scripts/generatePersonaVoicebank.ts [--dry-run] [--persona <id>]
 *     [--only <cueId|exerciseId>] [--force] [--skip-recorded] [--reprocess] [--refetch]
 *
 * Flaggvalg: --force re-prosesserer output (cache gjenbrukes), --reprocess er
 * kun ffmpeg fra cache (uten nettverk/token), --refetch henter ny TTS (ny
 * stokastisk take) selv om cachen er fersk.
 *
 * VIKTIG — --force kreves for å ERSTATTE eksisterende klipp (BØR Ø1):
 * decideTtsAction (scripts/voicebankTasks.ts) returnerer 'skip-existing' så
 * lenge output-fila finnes og --force IKKE er satt. En vanlig kjøring rører
 * derfor ALDRI et klipp som allerede ligger i public/audio/personas/ — det var
 * nettopp slik det gamle 8,5 s hale-klippet start_321_short.mp3 overlevde
 * omleggingen til en egen TTS-cue per persona. Riktig prosedyre når et klipp
 * skal byttes ut er å navngi det OG tvinge overskriving:
 *   npx tsx scripts/generatePersonaVoicebank.ts --only start_321_short --force
 * (samme presedens som de 20 utdaterte klippene fra feat/lydmotor, som måtte
 * slettes eksplisitt før regenerering — jf. Beslutning 35 i docs/DECISIONS.md).
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { getKitorToken } from './kitorEnv';
import {
  MAX_CONSECUTIVE_FAILURES,
  NonRetryableError,
  buildClonePayload,
  buildRecordedFfmpegArgs,
  buildTaskList,
  buildTtsFfmpegArgs,
  buildVolumeDetectArgs,
  cacheIsFresh,
  decideTtsAction,
  formatTailSummary,
  formatTailWarning,
  isTailSuspect,
  persistRawCache,
  isRetryableHttpStatus,
  parseCliArgs,
  parseManifest,
  parseMeanVolumeDb,
  tailFalloffDb,
  tailSourceRelPath,
  updateConsecutiveFailures,
  type CliOptions,
  type RecordedTask,
  type TailCoverage,
  type TailFlag,
  type TailUnmeasured,
  type TaskOutcome,
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

/** Kjør en ffmpeg-kjede på input og erstatt output atomisk via .tmp.mp3 + rename. */
function postProcess(
  inputPath: string,
  outputPath: string,
  argsBuilder: (input: string, output: string) => string[],
): void {
  const tmpPath = `${outputPath}.tmp.mp3`;
  const res = spawnSync('ffmpeg', argsBuilder(inputPath, tmpPath), {
    encoding: 'utf-8',
  });
  if (res.status !== 0) {
    fs.rmSync(tmpPath, { force: true });
    const detail = res.error ? res.error.message : res.stderr?.trim();
    throw new Error(`ffmpeg feilet (exit ${res.status ?? '?'}): ${detail}`);
  }
  fs.renameSync(tmpPath, outputPath);
}

/** Én volumedetect-måling av et ferdig klipp. null = målingen mislyktes. */
function measureMeanVolumeDb(filePath: string, window: 'whole' | 'tail'): number | null {
  const res = spawnSync('ffmpeg', buildVolumeDetectArgs(filePath, window), {
    encoding: 'utf-8',
  });
  // volumedetect skriver måltallene til stderr; -f null gir ingen utdatafil.
  if (res.error || res.status !== 0) return null;
  return parseMeanVolumeDb(res.stderr ?? '');
}

/**
 * Målesømmen halevakten bruker. I produksjon er dette fs + ffmpeg; i test
 * injiseres en teller som registrerer HVILKEN fil som ble målt — samme mønster
 * som `persistRawCache` sin injiserte `io`. Sømmen finnes fordi bytter man
 * råfila mot output-fila her, er hele Beslutning 39 ugyldig, og det må en test
 * kunne se.
 */
export interface TailProbe {
  readonly exists: (absPath: string) => boolean;
  readonly measure: (absPath: string, window: 'whole' | 'tail') => number | null;
}

/**
 * Utfallet av halevaktens pass over ett klipp. Skillet mellom «målt og frisk»
 * og «ikke målt» er hele poenget: bare det første er en uttalelse om take-et.
 */
export type TailCheckResult =
  /** Innspilt spor — utenfor vaktens mandat, ikke et dekningshull. */
  | { readonly kind: 'not-applicable' }
  /** Råfila finnes ikke (aldri hentet, eller frisk klone). */
  | { readonly kind: 'missing-raw'; readonly rawRelPath: string }
  /** Råfila er fra en eldre manuskripttekst — den kan ikke tilskrives noe klipp. */
  | { readonly kind: 'stale-cache'; readonly rawRelPath: string }
  /** Fila finnes, men ffmpeg ga ingen brukbare måltall. */
  | { readonly kind: 'measure-failed'; readonly rawRelPath: string }
  /** Målt: `flag` er satt bare når take-et er mistenkt avkuttet. */
  | { readonly kind: 'ok'; readonly flag: TailFlag | null };

/**
 * Halevaktens per-klipp-pass: måler RÅFILA fra Chatterbox (ikke den
 * etterbehandlede output-fila — se kommentaren over TAIL_FALLOFF_THRESHOLD_DB)
 * og flagger take som fortsatt har tale-energi i halen. Terskel og tekst er
 * rene funksjoner i voicebankTasks; her er bare I/O-en, gjennom `probe`.
 *
 * Kjøres også når klippet HOPPES OVER: cachefila ER råfila, så en inkrementell
 * kjøring der alt ligger ferdig fra før får den samme sjekken som en full
 * kjøring. Uten det ville vakten vært inert nettopp i den vanligste kjøringen.
 *
 * Ren funksjon av `probe` — ingen utskrift, ingen exit-kode. Et umålt klipp
 * returneres som umålt og telles i dekningen; det er ALDRI det samme som et
 * friskt klipp.
 */
export function checkTailWith(task: VoicebankTask, probe: TailProbe): TailCheckResult {
  const rawRelPath = tailSourceRelPath(task);
  // Innspilte spor har ingen råfil fra Chatterbox og måles ikke.
  if (rawRelPath === null) return { kind: 'not-applicable' };
  const rawPath = toAbsolute(rawRelPath);
  if (!probe.exists(rawPath)) return { kind: 'missing-raw', rawRelPath };
  const overallMeanDb = probe.measure(rawPath, 'whole');
  const tailMeanDb = probe.measure(rawPath, 'tail');
  if (overallMeanDb === null || tailMeanDb === null) {
    return { kind: 'measure-failed', rawRelPath };
  }
  const measurement = { overallMeanDb, tailMeanDb };
  if (!isTailSuspect(measurement)) return { kind: 'ok', flag: null };
  return {
    kind: 'ok',
    flag: {
      personaId: task.personaId,
      id: task.id,
      rawRelPath,
      outputRelPath: task.outputRelPath,
      falloffDb: tailFalloffDb(measurement),
    },
  };
}

/** Produksjonsmåleren: ekte filsystem + ekte ffmpeg. */
const REAL_TAIL_PROBE: TailProbe = {
  exists: (absPath) => fs.existsSync(absPath),
  measure: measureMeanVolumeDb,
};

/**
 * checkTailWith mot ekte fs/ffmpeg, med utskriften på plass. En advarsel
 * avbryter ALDRI kjøringen: et take kan legitimt være brått, og en mislykket
 * måling skal ikke stoppe en batch som ellers går fint.
 */
function checkTail(task: VoicebankTask): TailCheckResult {
  const result = checkTailWith(task, REAL_TAIL_PROBE);
  if (result.kind === 'measure-failed') {
    console.warn(`   ⚠️ Halevakt: klarte ikke måle ${result.rawRelPath} — klippet er UMÅLT.`);
  }
  // Manglende råfil logges ikke per klipp: på en frisk klone er det 148 linjer
  // uten informasjon. Sluttrapportens dekningstall sier det én gang, presist.
  if (result.kind === 'ok' && result.flag) {
    for (const line of formatTailWarning(result.flag)) {
      console.warn(line);
    }
  }
  return result;
}

/** Rydder etterlatte tempfiler fra en tidligere hardt drept kjøring. */
function cleanupStaleTempFiles(): void {
  const base = path.join(ROOT_DIR, 'public', 'audio', 'personas');
  if (!fs.existsSync(base)) return;
  const stale = fs
    .readdirSync(base, { recursive: true, encoding: 'utf-8' })
    .filter((rel) => rel.endsWith('.raw.mp3') || rel.endsWith('.tmp.mp3'));
  for (const rel of stale) {
    fs.rmSync(path.join(base, rel), { force: true });
    console.log(`🧹 Ryddet etterlatt tempfil: ${rel}`);
  }
}

async function fetchTtsOnce(task: TtsTask, token: string): Promise<Buffer> {
  const res = await fetch(KITOR_TTS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(buildClonePayload(task.text, task.seedFile, task.lang)),
    signal: AbortSignal.timeout(TTS_TIMEOUT_MS),
  });
  if (!res.ok) {
    const errText = (await res.text()).slice(0, 300);
    const message = `HTTP ${res.status} fra Kitor: ${errText}`;
    // Deterministiske klientfeil (401/400/422 ...) blir aldri bedre av retry.
    if (!isRetryableHttpStatus(res.status)) {
      throw new NonRetryableError(message);
    }
    throw new Error(message);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length < SUSPICIOUS_BYTES) {
    // Mistenkelig liten respons — sannsynligvis en feilside; behandles som
    // retryable feil slik at neste forsøk får en sjanse i stedet for å lagre søppel.
    throw new Error(`mistenkelig liten respons (${buffer.length} bytes < 1 KB)`);
  }
  return buffer;
}

/**
 * Opptil 2 retries, men KUN for feil der neste forsøk kan gå bedre
 * (nettverk/timeout/5xx/429/for liten respons). Eksportert for test.
 */
export async function fetchTtsWithRetries(
  task: TtsTask,
  token: string,
  pauseMs: number = RETRY_PAUSE_MS,
): Promise<Buffer> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= TTS_RETRIES; attempt++) {
    if (attempt > 0) {
      console.warn(`   ↻ Forsøk ${attempt + 1}/${TTS_RETRIES + 1} om ${pauseMs / 1000} s...`);
      await sleep(pauseMs);
    }
    try {
      return await fetchTtsOnce(task, token);
    } catch (err) {
      console.warn(`   ⚠️ ${err instanceof Error ? err.message : String(err)}`);
      if (err instanceof NonRetryableError) throw err;
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/** Leser sidecaren (<cachefil>.json) hvis den finnes; null ellers. */
function readSidecar(sidecarPath: string): string | null {
  return fs.existsSync(sidecarPath) ? fs.readFileSync(sidecarPath, 'utf-8') : null;
}

/** Utfallet av én oppgave, pluss halevaktens utfall for klippet. */
interface TaskResult {
  readonly outcome: TaskOutcome;
  /** Halevaktens utfall: målt (med/uten flagg), eller hvorfor den ikke målte. */
  readonly tail: TailCheckResult;
}

/** Oppgaver uten et halevakt-pass (innspilte spor, og oppgaver som feilet). */
const plain = (outcome: TaskOutcome): TaskResult => ({
  outcome,
  tail: { kind: 'not-applicable' },
});

async function runTtsTask(task: TtsTask, token: string, opts: CliOptions): Promise<TaskResult> {
  const outputPath = toAbsolute(task.outputRelPath);
  const cachePath = toAbsolute(task.cacheRelPath);
  const sidecarPath = `${cachePath}.json`;
  // «Finnes» = fila ligger der OG sidecaren matcher dagens tekst/språk;
  // redigert manuskript invaliderer cachen automatisk.
  const rawExists = fs.existsSync(cachePath);
  const cacheExists = rawExists && cacheIsFresh(readSidecar(sidecarPath), task);
  if (rawExists && !cacheExists) {
    console.log(`♻️ [${task.personaId}/${task.id}] cache utdatert (tekst/språk endret)`);
  }
  const action = decideTtsAction({
    cacheExists,
    outputExists: fs.existsSync(outputPath),
    force: opts.force,
    reprocess: opts.reprocess,
    refetch: opts.refetch,
  });

  if (action === 'skip-existing') {
    console.log(`⏩ Hopper over eksisterende: ${task.personaId}/${task.id}`);
    // BØR 3: er cachen utdatert, MÅLER vi ikke. Råfila er da fra forrige
    // manuskripttekst og svarer verken til dagens tekst eller til output-fila
    // som allerede ligger der — et måltall herfra kan ikke tilskrives noen av
    // filene advarselen ville navngitt. Å erklære et dekningshull er mindre
    // villedende enn å rapportere en måling om en fil som ikke finnes lenger;
    // hullet er dessuten synlig i sluttrapporten, så ingenting skjules.
    if (rawExists && !cacheExists) {
      console.warn(
        `   ⚠️ Halevakt: står over ${task.personaId}/${task.id} — rå-cachen er utdatert,` +
          ' så råfila hører verken til dagens tekst eller til klippet i public/.',
      );
      return {
        outcome: 'skipped',
        tail: { kind: 'stale-cache', rawRelPath: task.cacheRelPath },
      };
    }
    // Ellers: halevakten måler råfila, og den ligger der uansett om vi
    // behandlet klippet på nytt — et hopp gir ingen grunn til å la sjekken
    // utebli.
    return { outcome: 'skipped', tail: checkTail(task) };
  }
  if (action === 'missing-cache') {
    console.error(
      `   ❌ [${task.personaId}/${task.id}] --reprocess uten gyldig cache-fil (${task.cacheRelPath}) — kjør TTS-runden først.`,
    );
    return plain('failed');
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  try {
    if (action === 'fetch-then-process') {
      console.log(`🎙️ [${task.personaId}/${task.id}] "${shorten(task.text)}" (${task.lang})`);
      const buffer = await fetchTtsWithRetries(task, token);
      // Rå-cachen er permanent: neste etterbehandlings-iterasjon koster null
      // GPU-tid. Sidecaren gjør at manuskript-endringer re-henter automatisk;
      // persistRawCache skriver i kræsjtrygg rekkefølge (sidecar slettes først).
      fs.mkdirSync(path.dirname(cachePath), { recursive: true });
      persistRawCache(cachePath, sidecarPath, buffer, { text: task.text, lang: task.lang }, fs);
    } else {
      console.log(`📦 [${task.personaId}/${task.id}] etterbehandler fra rå-cache`);
    }
    postProcess(cachePath, outputPath, buildTtsFfmpegArgs);
    const kb = Math.round(fs.statSync(outputPath).size / 1024);
    console.log(`   ✅ ${task.outputRelPath} (${kb} KB)`);
    return { outcome: 'generated', tail: checkTail(task) };
  } catch (err) {
    console.error(`   ❌ Feilet: ${err instanceof Error ? err.message : String(err)}`);
    return plain('failed');
  }
}

function runRecordedTask(task: RecordedTask, opts: CliOptions): TaskResult {
  const outputPath = toAbsolute(task.outputRelPath);
  const sourcePath = toAbsolute(task.sourceRelPath);
  // --reprocess regenererer også innspilte spor (kilden ligger alltid lokalt).
  if (!opts.force && !opts.reprocess && fs.existsSync(outputPath)) {
    console.log(`⏩ Hopper over eksisterende: ${task.personaId}/${task.id}`);
    return plain('skipped');
  }
  if (!fs.existsSync(sourcePath)) {
    console.error(`   ❌ Fant ikke innspilt kilde: ${sourcePath}`);
    return plain('failed');
  }
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  try {
    console.log(`🎛️ [${task.personaId}/${task.id}] etterbehandler innspilt spor (skånsom kjede)`);
    postProcess(sourcePath, outputPath, buildRecordedFfmpegArgs);
    console.log(`   ✅ ${task.outputRelPath}`);
    return plain('generated');
  } catch (err) {
    console.error(`   ❌ Feilet: ${err instanceof Error ? err.message : String(err)}`);
    return plain('failed');
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
  if (!opts.reprocess) {
    // --reprocess er ren lokal etterbehandling — trenger verken token eller nett.
    try {
      token = getKitorToken(ROOT_DIR);
    } catch (err) {
      console.error(`❌ ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  }

  cleanupStaleTempFiles();

  const counts: Record<TaskOutcome, number> = { generated: 0, skipped: 0, failed: 0 };
  const failedIds: string[] = [];
  const tailFlags: TailFlag[] = [];
  let tailMeasured = 0;
  const tailUnmeasured: TailUnmeasured[] = [];
  let consecutiveFailures = 0;
  // Sekvensielt med vilje — én GPU på Kitor.
  for (const task of tasks) {
    const { outcome, tail } =
      task.kind === 'tts'
        ? await runTtsTask(task, token, opts)
        : runRecordedTask(task, opts);
    counts[outcome]++;
    // Dekningsregnskapet gjelder TTS-klipp: innspilte spor er utenfor vaktens
    // mandat og hører hverken i teller eller nevner. For et TTS-klipp er ALT
    // som ikke er en fullført måling et dekningshull — også en feilet oppgave.
    if (task.kind === 'tts') {
      if (tail.kind === 'ok') {
        tailMeasured++;
        if (tail.flag) tailFlags.push(tail.flag);
      } else {
        tailUnmeasured.push({
          id: `${task.personaId}/${task.id}`,
          reason: tail.kind === 'not-applicable' ? 'task-failed' : tail.kind,
        });
      }
    }
    if (outcome === 'failed') failedIds.push(`${task.personaId}/${task.id}`);
    consecutiveFailures = updateConsecutiveFailures(consecutiveFailures, outcome);
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      console.error(
        `\n❌ ${consecutiveFailures} påfølgende oppgaver feilet — avbryter kjøringen.`,
      );
      console.error('   Dette tyder på en global årsak (ugyldig token, Kitor nede?).');
      break;
    }
  }

  console.log('\n🏁 Sluttrapport:');
  console.log(`   Generert: ${counts.generated}, hoppet over: ${counts.skipped}, feilet: ${counts.failed}`);
  // Halevakten påvirker ikke exit-koden: flaggede klipp skal lyttes på, ikke
  // behandles som byggfeil. Dekningen rapporteres alltid ved siden av flaggene,
  // slik at «ingen flagg» aldri kan leses som «ingen funn» i en kjøring der
  // vakten ikke fikk målt alt.
  const coverage: TailCoverage = { measured: tailMeasured, unmeasured: tailUnmeasured };
  for (const line of formatTailSummary(tailFlags, coverage)) {
    console.log(line);
  }
  if (failedIds.length > 0) {
    console.log('   Feilede oppgaver (kjør på nytt med --persona/--only):');
    for (const id of failedIds) {
      console.log(`     ${id}`);
    }
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
  console.log(`Reprocess (kun lokal etterbehandling fra rå-cache): ${opts.reprocess ? 'JA' : 'NEI'}`);

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

// Kjør kun når fila startes direkte (npx tsx scripts/generatePersonaVoicebank.ts),
// ikke når testene importerer fetchTtsWithRetries.
const isDirectRun =
  typeof process.argv[1] === 'string' &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectRun) {
  main().catch((err: unknown) => {
    console.error('❌', err instanceof Error ? err.message : err);
    process.exit(1);
  });
}

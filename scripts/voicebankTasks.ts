/**
 * Rene, testbare byggeklosser for persona-lydbank-batchen (taksonomi v2).
 *
 * Modulen har null I/O: den bygger oppgavelister, payloads og ffmpeg-argumenter
 * ut fra scripts/voicebank-manuskript.json. Selve kjøringen (fetch, ffmpeg,
 * filsystem) bor i scripts/generatePersonaVoicebank.ts.
 *
 * Alle stier her er repo-relative med '/' som skilletegn (stabilt på tvers av
 * OS og lett å teste); runneren oversetter til absolutte OS-stier.
 */

export interface CueDef {
  readonly text: string;
  readonly file: string;
}

export interface PersonaDef {
  readonly displayName: string;
  readonly region: string | null;
  readonly seedFile: string;
  readonly cues: Readonly<Record<string, CueDef>>;
  readonly recordedCues: Readonly<Record<string, string>>;
}

export interface ExerciseDef {
  readonly id: string;
  readonly displayText: string;
  readonly ttsText: string;
  /** Valgfri språkoverstyring for TTS (f.eks. 'en'); default manifestets 'no'. */
  readonly ttsLang?: string;
  readonly file: string;
}

export interface VoicebankManifest {
  readonly language: string;
  readonly personas: Readonly<Record<string, PersonaDef>>;
  readonly exercises: readonly ExerciseDef[];
}

export interface TtsTask {
  readonly kind: 'tts';
  readonly personaId: string;
  /** Cue-nøkkel (f.eks. 'intro') eller øvelses-id (f.eks. 'burpees'). */
  readonly id: string;
  readonly text: string;
  readonly seedFile: string;
  readonly outputRelPath: string;
  /** Permanent rå-cache av TTS-nedlastingen — gjør etterbehandling gratis å iterere. */
  readonly cacheRelPath: string;
  /** TTS-språk for akkurat denne oppgaven ('no' med mindre ttsLang overstyrer). */
  readonly lang: string;
}

export interface RecordedTask {
  readonly kind: 'recorded';
  readonly personaId: string;
  readonly id: 'start_321';
  readonly sourceRelPath: string;
  readonly outputRelPath: string;
}

export type VoicebankTask = TtsTask | RecordedTask;

export interface TaskFilters {
  readonly persona?: string;
  readonly only?: string;
  readonly skipRecorded?: boolean;
}

/** Innspilte Tre-To-En-spor i repoet, per persona-id (repo-relative stier). */
export const RECORDED_SOURCES: Readonly<Record<string, string>> = {
  haugesund: 'audio/Tre-To-En- Haugesund (Lead Vocal).mp3',
  romsdal: 'audio/Tre-To-En- Romsdalen (Lead Vocal).mp3',
  hardcore: 'audio/Tre-To-En- Hardcore (Lead Vocal).mp3',
  boyband: 'audio/Tre-To-En- Boyband (Lead Vocal).mp3',
};

/**
 * Minimal strukturell validering av manuskript-JSON. Ikke Zod — dette er et
 * byggeskript, og vi vil feile tidlig med en forståelig melding uten å dra
 * app-avhengigheter inn i scripts/.
 */
export function parseManifest(raw: unknown): VoicebankManifest {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Manuskriptet er ikke et JSON-objekt');
  }
  const obj = raw as Record<string, unknown>;
  if (
    typeof obj.personas !== 'object' ||
    obj.personas === null ||
    Array.isArray(obj.personas)
  ) {
    throw new Error('Manuskriptet mangler "personas" (må være et objekt)');
  }
  if (!Array.isArray(obj.exercises)) {
    throw new Error('Manuskriptet mangler "exercises" (må være en liste)');
  }
  return raw as VoicebankManifest;
}

export interface CliOptions extends TaskFilters {
  readonly dryRun: boolean;
  readonly force: boolean;
  /** Regenerér output fra rå-cachen med ffmpeg-kjeden — uten nettverk/token. */
  readonly reprocess: boolean;
}

/**
 * Parser kommandolinjeflagg. Verdi-flaggene (--persona/--only) valideres slik
 * at en glemt verdi ikke stille sluker neste flagg som filterverdi.
 */
export function parseCliArgs(argv: readonly string[]): CliOptions {
  const valueOf = (flag: string): string | undefined => {
    const idx = argv.indexOf(flag);
    if (idx < 0) return undefined;
    const value = argv[idx + 1];
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`Flagget ${flag} krever en verdi (f.eks. "${flag} haugesund")`);
    }
    return value;
  };
  return {
    dryRun: argv.includes('--dry-run'),
    force: argv.includes('--force'),
    skipRecorded: argv.includes('--skip-recorded'),
    reprocess: argv.includes('--reprocess'),
    persona: valueOf('--persona'),
    only: valueOf('--only'),
  };
}

export type TtsAction =
  | 'skip-existing'
  | 'process-from-cache'
  | 'fetch-then-process'
  | 'missing-cache';

/**
 * Bestemmer hva som skal skje med en TTS-oppgave (cache-kontrakten):
 * - --reprocess leser alltid fra cache og rører aldri nettet; manglende
 *   cache-fil er da en feil.
 * - Ellers: eksisterende output uten --force → hopp over hele oppgaven.
 * - Skal output produseres, gjenbrukes cache-fila om den finnes (GPU-tid
 *   brukes bare én gang per tekst); bare uten cache går vi på nettet.
 */
export function decideTtsAction(state: {
  readonly cacheExists: boolean;
  readonly outputExists: boolean;
  readonly force: boolean;
  readonly reprocess: boolean;
}): TtsAction {
  if (state.reprocess) {
    return state.cacheExists ? 'process-from-cache' : 'missing-cache';
  }
  if (state.outputExists && !state.force) return 'skip-existing';
  return state.cacheExists ? 'process-from-cache' : 'fetch-then-process';
}

/**
 * Retry lønner seg bare når neste forsøk kan gå bedre: 5xx (serverkrasj/
 * kaldstart) og 429 (rate limit). Øvrige 4xx (401/400/422 ...) er
 * deterministiske klientfeil — de blir aldri bedre av å vente 3 sekunder.
 */
export function isRetryableHttpStatus(status: number): boolean {
  return status >= 500 || status === 429;
}

/** Feil som aldri skal retries (deterministisk 4xx fra serveren). */
export class NonRetryableError extends Error {
  readonly retryable = false as const;
}

export type TaskOutcome = 'generated' | 'skipped' | 'failed';

/** Abort-terskel: så mange PÅFØLGENDE feil tyder på global årsak (token/nede). */
export const MAX_CONSECUTIVE_FAILURES = 3;

/**
 * Teller påfølgende feil: suksess nullstiller, skip er nøytral (ingen ny
 * informasjon om serveren), feil øker.
 */
export function updateConsecutiveFailures(count: number, outcome: TaskOutcome): number {
  if (outcome === 'generated') return 0;
  if (outcome === 'failed') return count + 1;
  return count;
}

function outputPath(personaId: string, file: string): string {
  return `public/audio/personas/${personaId}/${file}`;
}

/** Rå-cache: uprosesserte TTS-nedlastinger (gitignorert, men permanent lokalt). */
export const RAW_CACHE_DIR = 'audio/raw-cache';

function cachePath(personaId: string, file: string): string {
  return `${RAW_CACHE_DIR}/${personaId}/${file}`;
}

function cueTasks(personaId: string, persona: PersonaDef, lang: string): TtsTask[] {
  return Object.entries(persona.cues).map(([cueId, cue]) => ({
    kind: 'tts',
    personaId,
    id: cueId,
    text: cue.text,
    seedFile: persona.seedFile,
    outputRelPath: outputPath(personaId, cue.file),
    cacheRelPath: cachePath(personaId, cue.file),
    lang,
  }));
}

function recordedTasks(personaId: string, persona: PersonaDef): RecordedTask[] {
  // recordedCues i JSON-en er en menneske-notis; kilden er RECORDED_SOURCES.
  if (!('start_321' in persona.recordedCues)) return [];
  const source = RECORDED_SOURCES[personaId];
  if (!source) {
    throw new Error(`Mangler innspilt kildefil for persona "${personaId}"`);
  }
  return [
    {
      kind: 'recorded',
      personaId,
      id: 'start_321',
      sourceRelPath: source,
      outputRelPath: outputPath(personaId, 'start_321.mp3'),
    },
  ];
}

function exerciseTasks(
  personaId: string,
  persona: PersonaDef,
  exercises: readonly ExerciseDef[],
  defaultLang: string,
): TtsTask[] {
  // Bevisst ttsText (fonetisk stavemåte), aldri displayText.
  return exercises.map((ex) => ({
    kind: 'tts',
    personaId,
    id: ex.id,
    text: ex.ttsText,
    seedFile: persona.seedFile,
    outputRelPath: outputPath(personaId, ex.file),
    cacheRelPath: cachePath(personaId, ex.file),
    lang: ex.ttsLang ?? defaultLang,
  }));
}

/**
 * Full oppgaveliste i stabil rekkefølge: personas i JSON-rekkefølge; per
 * persona først cues (JSON-rekkefølge), så innspilt start_321, så øvelsene.
 */
export function buildTaskList(
  manifest: VoicebankManifest,
  filters: TaskFilters,
): VoicebankTask[] {
  const defaultLang = manifest.language || 'no';
  const all = Object.entries(manifest.personas).flatMap(
    ([personaId, persona]): VoicebankTask[] => [
      ...cueTasks(personaId, persona, defaultLang),
      ...(filters.skipRecorded ? [] : recordedTasks(personaId, persona)),
      ...exerciseTasks(personaId, persona, manifest.exercises, defaultLang),
    ],
  );
  return all
    .filter((t) => !filters.persona || t.personaId === filters.persona)
    .filter((t) => !filters.only || t.id === filters.only);
}

export interface ClonePayload {
  readonly text: string;
  readonly voice_mode: 'clone';
  readonly reference_audio_filename: string;
  readonly language: string;
  readonly output_format: 'mp3';
}

/**
 * Clone-payload for Chatterbox på Kitor. Feltet heter reference_audio_filename
 * (IKKE audio_prompt_path) og skal være bart filnavn — serveren resolver selv
 * i reference_audio/. Verifisert mot serveren i kitor-voice-audition-clone.sh.
 * `lang` følger oppgavens ttsLang (default 'no'); seed-stemmen bærer uansett
 * klangen, språket styrer uttaleregler.
 */
export function buildClonePayload(
  text: string,
  seedFile: string,
  lang: string = 'no',
): ClonePayload {
  return {
    text,
    voice_mode: 'clone',
    reference_audio_filename: seedFile,
    language: lang,
    output_format: 'mp3',
  };
}

/** Sidecar-format for rå-cachen: hva klippet faktisk ble generert fra. */
export interface CacheSidecar {
  readonly text: string;
  readonly lang: string;
}

/**
 * Er cache-fila fortsatt gyldig for oppgaven? Sidecaren (<cachefil>.json)
 * bærer tekst+språk klippet ble generert med; avvik (redigert manuskript,
 * endret ttsLang) eller manglende/korrupt sidecar → re-hent fra TTS.
 */
export function cacheIsFresh(
  sidecarRaw: string | null,
  task: Pick<TtsTask, 'text' | 'lang'>,
): boolean {
  if (sidecarRaw === null) return false;
  try {
    const parsed = JSON.parse(sidecarRaw) as Partial<CacheSidecar>;
    return parsed.text === task.text && parsed.lang === task.lang;
  } catch {
    return false;
  }
}

/**
 * Etterbehandlingsparametre (v2 etter QA-runde 1, 2026-08-29). Samlet her slik
 * at neste lytterunde er én-linjes justeringer. Hver konstant refererer
 * QA-funnet den adresserer:
 *  - QA-1: ord amputeres i start/slutt («ulekroppshold») — myke ansatser (/h/)
 *    kuttes av silenceremove.
 *  - QA-2: bakgrunnsstøy på enkelte klipp.
 *  - QA-3: lyden er «skarp» og «tørr».
 */
export const TTS_POST = {
  /** QA-2/3: fjerner rumling under taleområdet før denoise. */
  HIGHPASS: 'highpass=f=75',
  /** QA-2: FFT-denoise. Kjøres FØR trim så terskelen ser et rent støygulv. */
  DENOISE: 'afftdn=nr=12:nf=-42',
  /** QA-1: start-trim med 100 ms bevart pre-roll — fiksen for amputerte ansatser. */
  TRIM_START: 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.1',
  /** QA-1: slutt-trim (via areverse) med ~60 ms rom før faden. */
  TRIM_END: 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.06',
  /** ~10 ms fade mot klikk; ligger som fade-inn mens lyden er reversert. */
  FADE: 'afade=t=in:st=0:d=0.01',
  /** QA-3: demper skarpe s-lyder. */
  DEESSER: 'deesser',
  /** QA-3: «skarp» — senker diskanten litt. */
  TREBLE: 'treble=g=-2.5:f=7500',
  /** QA-3: «tørr» — litt varme i bunn. */
  BASS: 'bass=g=1:f=180',
  /** Felles nivå på tvers av personas (én-pass er godt nok). */
  LOUDNORM: 'loudnorm=I=-16:TP=-1.5:LRA=11',
} as const;

function ffmpegArgs(inputPath: string, filter: string, outputPath: string): string[] {
  // -ar 44100 fordi loudnorm ellers leverer 192 kHz internt samplerate.
  return [
    '-hide_banner',
    '-nostdin',
    '-loglevel', 'error',
    '-y',
    '-i', inputPath,
    '-af', filter,
    '-ar', '44100',
    outputPath,
  ];
}

/**
 * Etterbehandlingskjede v2 for TTS-klipp: highpass → denoise → trim foran →
 * (areverse) trim bak + fade → mykgjøring (deesser/treble/bass) → loudnorm.
 * Slutt-trim/fade bruker areverse-trikset så vi slipper å kjenne klipplengden.
 */
export function buildTtsFfmpegArgs(inputPath: string, outputPath: string): string[] {
  const filter = [
    TTS_POST.HIGHPASS,
    TTS_POST.DENOISE,
    TTS_POST.TRIM_START,
    'areverse',
    TTS_POST.TRIM_END,
    TTS_POST.FADE,
    'areverse',
    TTS_POST.DEESSER,
    TTS_POST.TREBLE,
    TTS_POST.BASS,
    TTS_POST.LOUDNORM,
  ].join(',');
  return ffmpegArgs(inputPath, filter, outputPath);
}

/**
 * Skånsom kjede for de INNSPILTE Tre-To-En-sporene: kun trim + fade +
 * loudnorm. Bevisst ingen denoise/EQ — dette er ferdig produserte vokalspor
 * som ikke skal farges av TTS-reparasjonene.
 */
export function buildRecordedFfmpegArgs(inputPath: string, outputPath: string): string[] {
  const filter = [
    'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05',
    'areverse',
    'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05',
    TTS_POST.FADE,
    'areverse',
    TTS_POST.LOUDNORM,
  ].join(',');
  return ffmpegArgs(inputPath, filter, outputPath);
}

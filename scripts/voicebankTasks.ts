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
    persona: valueOf('--persona'),
    only: valueOf('--only'),
  };
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

function cueTasks(personaId: string, persona: PersonaDef): TtsTask[] {
  return Object.entries(persona.cues).map(([cueId, cue]) => ({
    kind: 'tts',
    personaId,
    id: cueId,
    text: cue.text,
    seedFile: persona.seedFile,
    outputRelPath: outputPath(personaId, cue.file),
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
): TtsTask[] {
  // Bevisst ttsText (fonetisk stavemåte), aldri displayText.
  return exercises.map((ex) => ({
    kind: 'tts',
    personaId,
    id: ex.id,
    text: ex.ttsText,
    seedFile: persona.seedFile,
    outputRelPath: outputPath(personaId, ex.file),
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
  const all = Object.entries(manifest.personas).flatMap(
    ([personaId, persona]): VoicebankTask[] => [
      ...cueTasks(personaId, persona),
      ...(filters.skipRecorded ? [] : recordedTasks(personaId, persona)),
      ...exerciseTasks(personaId, persona, manifest.exercises),
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
  readonly language: 'no';
  readonly output_format: 'mp3';
}

/**
 * Clone-payload for Chatterbox på Kitor. Feltet heter reference_audio_filename
 * (IKKE audio_prompt_path) og skal være bart filnavn — serveren resolver selv
 * i reference_audio/. Verifisert mot serveren i kitor-voice-audition-clone.sh.
 */
export function buildClonePayload(text: string, seedFile: string): ClonePayload {
  return {
    text,
    voice_mode: 'clone',
    reference_audio_filename: seedFile,
    language: 'no',
    output_format: 'mp3',
  };
}

/**
 * Etterbehandlingskjede per klipp (jf. spec § 5):
 *  1. silenceremove foran, og — via areverse-trikset — bak.
 *  2. ~10 ms fade lagt som fade-inn mens lyden er reversert = fade-UT i
 *     resultatet, uten å måtte kjenne klipplengden.
 *  3. loudnorm én-pass til felles nivå på tvers av personas.
 * -ar 44100 fordi loudnorm ellers leverer 192 kHz internt samplerate.
 */
export function buildFfmpegArgs(inputPath: string, outputPath: string): string[] {
  const filter = [
    'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05',
    'areverse',
    'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05',
    'afade=t=in:st=0:d=0.01',
    'areverse',
    'loudnorm=I=-16:TP=-1.5:LRA=11',
  ].join(',');
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

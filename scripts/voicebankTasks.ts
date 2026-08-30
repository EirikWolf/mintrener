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
  /** Tving ny TTS-henting (ny stokastisk take) selv om cachen er fersk. */
  readonly refetch: boolean;
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
  const reprocess = argv.includes('--reprocess');
  const refetch = argv.includes('--refetch');
  if (reprocess && refetch) {
    throw new Error(
      'Flaggene --refetch og --reprocess kan ikke kombineres: --reprocess er kun lokal ffmpeg fra cache, --refetch henter ny TTS.',
    );
  }
  return {
    dryRun: argv.includes('--dry-run'),
    force: argv.includes('--force'),
    skipRecorded: argv.includes('--skip-recorded'),
    reprocess,
    refetch,
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
 * - --refetch henter alltid ny TTS (ny stokastisk take) og re-prosesserer,
 *   uansett cache/output. (Kombinasjon med --reprocess avvises i parseCliArgs.)
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
  readonly refetch?: boolean;
}): TtsAction {
  if (state.refetch) return 'fetch-then-process';
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
  // Kun fullvarianten kommer fra innspillingen. start_321_short var tidligere
  // en hale-trim av samme kilde, men halen (skryt + punchline) var meningsløs
  // isolert ved øktstart (felttest-funn) — short er nå en ordinær TTS-cue i
  // cues-mappen med egen kort 3-2-1-tekst per persona.
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

/** Minimal I/O-flate for persistRawCache — fs oppfyller den direkte. */
export interface RawCacheIo {
  rmSync(path: string, opts: { force: boolean }): void;
  writeFileSync(path: string, data: Uint8Array | string): void;
}

/**
 * Skriver rå-cache + sidecar i kræsjtrygg rekkefølge: sidecaren slettes FØR
 * mp3-skrivingen og skrives på nytt ETTERPÅ. Et kræsj midt i mp3-skrivingen
 * etterlater dermed aldri en trunkert cache-fil med matchende sidecar —
 * neste kjøring ser manglende sidecar og re-henter.
 */
export function persistRawCache(
  cachePath: string,
  sidecarPath: string,
  audio: Uint8Array,
  sidecar: CacheSidecar,
  io: RawCacheIo,
): void {
  io.rmSync(sidecarPath, { force: true });
  io.writeFileSync(cachePath, audio);
  io.writeFileSync(sidecarPath, JSON.stringify(sidecar));
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
  /** QA-3: demper skarpe s-lyder. NB: uten i= er deesser en no-op (default 0). */
  DEESSER: 'deesser=i=0.15',
  /** QA-3: «skarp» — senker diskanten litt. */
  TREBLE: 'treble=g=-2.5:f=7500',
  /** QA-3: «tørr» — litt varme i bunn. */
  BASS: 'bass=g=1:f=180',
  /** Felles nivå på tvers av personas (én-pass er godt nok). */
  LOUDNORM: 'loudnorm=I=-16:TP=-1.5:LRA=11',
} as const;

// ---------------------------------------------------------------------------
// Halevakt (QA-4, rekalibrert 2026-08-30): vakt mot avkuttede TTS-take.
//
// Chatterbox er stokastisk og kutter av og til halen av et take — produkteier
// fanget «burpees» som ble til «burpii». Samme klasse som QA-1, bare i motsatt
// ende av klippet (amputerte ANSATSER, løst med pre-roll i TRIM_START). Vi vil
// ikke være avhengige av at et menneske hører slikt.
//
// MÅLEUNDERLAGET ER RÅFILA fra Chatterbox (audio/raw-cache/), ikke det ferdig
// etterbehandlede klippet. Grunnen er at etterbehandlingen — TRIM_END
// (silenceremove på −45 dB) etterfulgt av FADE — er NØYAKTIG det som
// bestemmer hvor mye energi som ligger igjen i de siste 50 ms. En måling der
// beskriver ffmpeg-trimmingen, ikke om Chatterbox kuttet ordet, og signalet
// blir invertert: målt på samme klipp faller det avkuttede «burpii»-take-et
// −24,4 dB rått, men −74,0 dB etter prosessering (bunkens «sunneste»), mens et
// friskt søsken faller −72,2 rått og −17,0 prosessert.
//
// Målemetoden: sammenlign mean_volume for de siste 50 ms av RÅFILA mot råfilas
// samlede mean_volume. Et normalt take dør ut i digital stillhet — differansen
// (hale minus samlet) er kraftig negativ. Et avkuttet take har fortsatt
// tale-energi i siste vindu, og differansen krymper.
// ---------------------------------------------------------------------------

/** Halevinduet som måles, i sekunder (siste 50 ms av klippet). */
export const TAIL_WINDOW_SECONDS = 0.05;

/**
 * Terskel for differansen hale minus samlet mean_volume MÅLT PÅ RÅFILA:
 * STRENGT over denne er take-et mistenkt avkuttet. Nøyaktig −36 dB er altså
 * ikke mistenkt.
 *
 * Fordelingen (sveip av audio/raw-cache/, 144 rå TTS-take, 4 personaer,
 * 2026-08-30): min −71,8 · p10 −70,1 · p25 −69,1 · median −67,2 · p75 −64,2 ·
 * p90 −26,6 · maks −1,1. 116 av 144 take ender i digital stillhet (halen måler
 * −91,0 dB, 16-bits-gulvet) — derav den tette hovedklyngen rundt −67 dB.
 *
 * Regnestykket bak −36: terskelen må ligge der BEGGE datasettene skiller.
 *  1. Fasiten i audio/lyttekandidater/raa/ (produkteiers lyttetest): det
 *     avkuttede befal_2_burpees_engelsk faller −24,4 dB, og det dårligste
 *     VERIFISERT friske take-et faller −49,9 dB. Terskelen må ligge i det
 *     25,5 dB brede gapet mellom dem.
 *  2. Innenfor det gapet har produksjonsbanken sitt eget bredeste tomrom
 *     mellom −39,9 og −33,1 dB — 6,8 dB uten et eneste take. Midtpunktet
 *     avrundet er −36.
 * Marginene blir 11,6 dB ned til det avkuttede take-et og 13,9 dB opp til det
 * dårligste friske. Terskelen flagger 19 av 144 take (13,2 %) i dagens bank;
 * de er kandidater for en lytt, ikke bekreftede feil, og vakten er derfor en
 * ren ADVARSEL som aldri avbryter kjøringen eller rører exit-koden.
 */
export const TAIL_FALLOFF_THRESHOLD_DB = -36;

/**
 * Fila halevakten skal måle, eller null når oppgaven ikke har en råfil å måle.
 *
 * TTS-oppgaver måles på rå-cachen: det er den uberørte nedlastingen fra
 * Chatterbox, og cachefila ER råfila også når klippet hoppes over uten ny
 * nedlasting — derfor virker vakten på inkrementelle kjøringer.
 *
 * Innspilte spor måles IKKE. De er faste, menneskeverifiserte vokalstems i
 * repoet, ikke stokastiske TTS-take, så vakten har ingenting å vokte; de
 * ligger dessuten utenfor fordelingen terskelen er kalibrert mot (målt fall
 * −24,8 til −44,1 dB), og haugesund-stemmet lar seg ikke måle i det hele tatt:
 * `-sseof` gir 0 samples og volumedetect skriver ingen mean_volume-linje.
 */
export function tailSourceRelPath(task: VoicebankTask): string | null {
  return task.kind === 'tts' ? task.cacheRelPath : null;
}

export interface TailMeasurement {
  /** mean_volume for hele klippet, i dB. */
  readonly overallMeanDb: number;
  /** mean_volume for de siste TAIL_WINDOW_SECONDS, i dB. */
  readonly tailMeanDb: number;
}

/** Hvor mye halen har falt i forhold til klippet som helhet (negativt = dør ut). */
export function tailFalloffDb(m: TailMeasurement): number {
  return m.tailMeanDb - m.overallMeanDb;
}

/**
 * Er take-et mistenkt avkuttet?
 *
 * Silingen av ikke-endelige måltall er en REN DEFENSIV VAKT, ikke en reell
 * kodesti: `parseMeanVolumeDb` kan produsere ±Infinity fordi ffmpeg-formatet
 * tillater `-inf`, men ekte ffmpeg (verifisert på 8.1) rapporterer digital
 * stillhet som −91,0 dB — 16-bits-gulvet — og aldri `-inf`. Konsekvensen er at
 * et HELT stille klipp får fall 0,0 dB og BLIR flagget. Det er riktig oppførsel:
 * en rå TTS-nedlasting uten lyd er en feil vi vil høre om.
 */
export function isTailSuspect(m: TailMeasurement): boolean {
  const falloff = tailFalloffDb(m);
  if (!Number.isFinite(falloff)) return false;
  return falloff > TAIL_FALLOFF_THRESHOLD_DB;
}

/** Plukker `mean_volume: -22.5 dB` ut av volumedetect sin stderr-utskrift. */
export function parseMeanVolumeDb(ffmpegStderr: string): number | null {
  const match = /mean_volume:\s*(-?(?:inf|\d+(?:\.\d+)?))\s*dB/i.exec(ffmpegStderr);
  if (!match?.[1]) return null;
  const raw = match[1];
  if (raw.endsWith('inf')) return raw.startsWith('-') ? -Infinity : Infinity;
  return Number.parseFloat(raw);
}

/**
 * ffmpeg-argumenter for én volumedetect-måling. 'tail' seeker med -sseof
 * (input-seek relativt til slutten) — det er nettopp den varianten
 * terskelen over er kalibrert mot.
 */
export function buildVolumeDetectArgs(
  inputPath: string,
  window: 'whole' | 'tail',
): string[] {
  return [
    '-hide_banner',
    '-nostdin',
    '-nostats',
    ...(window === 'tail' ? ['-sseof', `-${TAIL_WINDOW_SECONDS}`] : []),
    '-i', inputPath,
    '-af', 'volumedetect',
    '-f', 'null',
    '-',
  ];
}

/** Én ferdig hale-måling fra runneren. */
export interface TailMeasurementRecord {
  readonly personaId: string;
  readonly id: string;
  /** Råfila måltallet faktisk gjelder — ikke den etterbehandlede output-fila. */
  readonly rawRelPath: string;
  readonly outputRelPath: string;
  readonly falloffDb: number;
}

/** Ett flagget take fra halevakten. */
export type TailFlag = TailMeasurementRecord;


/** `--refetch`-oppskriften som gir et nytt stokastisk take av ett klipp. */
export function refetchCommand(personaId: string, id: string): string {
  return `--refetch --only ${id} --persona ${personaId}`;
}

/**
 * Advarselslinjene for ett flagget take. Advarselen navngir RÅFILA som ble
 * målt (det er den måltallet gjelder) OG det ferdige klippet man skal lytte
 * på, slik at ingen prøver å etterprøve tallet på feil fil.
 *
 * Bare TTS-oppgaver kan flagges — innspilte spor måles ikke (se
 * tailSourceRelPath) — så refetch-oppskriften er alltid relevant.
 */
export function formatTailWarning(flag: TailFlag): readonly string[] {
  return [
    `   ⚠️ HALEVAKT: ${flag.outputRelPath} kan være avkuttet.`,
    `      Målt på råfila ${flag.rawRelPath} — fall i halen (siste` +
      ` ${TAIL_WINDOW_SECONDS * 1000} ms mot råfilas snitt): ${flag.falloffDb.toFixed(1)} dB,` +
      ` terskel ${TAIL_FALLOFF_THRESHOLD_DB} dB. Take-et dør ikke ut i stillhet.`,
    `      Lytt på klippet; er halen borte, kjør \`${refetchCommand(flag.personaId, flag.id)}\` for et nytt take.`,
  ];
}

/** Én linje per flagget take i sluttrapporten. */
function flagLine(flag: TailFlag): string {
  return `       ${flag.personaId}/${flag.id} — fall i halen: ${flag.falloffDb.toFixed(1)} dB`;
}

/**
 * Halevaktens del av sluttrapporten.
 *
 * Ingen dekningsstatistikk her, i motsetning til før: vakten dømmer hvert take
 * for seg mot en absolutt terskel, så «ingen flagg» betyr faktisk «ingen funn»
 * også i en delvis kjøring (--persona/--only). Det var den søsken-relative
 * vakten som trengte et forbehold, og den er fjernet.
 */
export function formatTailSummary(flags: readonly TailFlag[]): readonly string[] {
  if (flags.length === 0) {
    return ['   Halevakt: ingen take flagget som mulig avkuttet.'];
  }
  return [
    `   Halevakt: ${flags.length} take flagget som mulig avkuttet` +
      ` (advarsel, ikke feil — terskel ${TAIL_FALLOFF_THRESHOLD_DB} dB):`,
    ...flags.map(flagLine),
  ];
}

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
 * Skånsom kjede for de INNSPILTE Tre-To-En-sporene: kun trim + fade + loudnorm.
 * Bevisst ingen denoise/EQ — dette er ferdig produserte vokalspor som ikke skal
 * farges av TTS-reparasjonene.
 */
const RECORDED_CHAIN: readonly string[] = [
  'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05',
  'areverse',
  'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05',
  TTS_POST.FADE,
  'areverse',
  TTS_POST.LOUDNORM,
];

export function buildRecordedFfmpegArgs(inputPath: string, outputPath: string): string[] {
  return ffmpegArgs(inputPath, RECORDED_CHAIN.join(','), outputPath);
}

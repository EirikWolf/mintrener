/**
 * Tester for de rene delene av persona-lydbank-batchen (taksonomi v2).
 * Bruker selve scripts/voicebank-manuskript.json som fixture — den er sannheten.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildTaskList,
  buildClonePayload,
  buildTtsFfmpegArgs,
  buildRecordedFfmpegArgs,
  cacheIsFresh,
  decideTtsAction,
  persistRawCache,
  RECORDED_SOURCES,
  parseManifest,
  parseCliArgs,
  isRetryableHttpStatus,
  updateConsecutiveFailures,
  MAX_CONSECUTIVE_FAILURES,
  NonRetryableError,
  TAIL_FALLOFF_THRESHOLD_DB,
  TAIL_WINDOW_SECONDS,
  buildVolumeDetectArgs,
  formatTailSummary,
  formatTailWarning,
  isTailSuspect,
  parseMeanVolumeDb,
  tailFalloffDb,
  tailSourceRelPath,
  type TailCoverage,
  type TailFlag,
  type VoicebankManifest,
  type VoicebankTask,
  type TtsTask,
} from '../voicebankTasks';
import {
  fetchTtsWithRetries,
  checkTailWith,
  type TailProbe,
} from '../generatePersonaVoicebank';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.resolve(__dirname, '..', 'voicebank-manuskript.json');
const manifest = parseManifest(JSON.parse(fs.readFileSync(manifestPath, 'utf-8')));

const PERSONA_IDS = ['haugesund', 'romsdal', 'hardcore', 'boyband'];

describe('buildTaskList', () => {
  // Oppgave B (felttest-oppfølging): start_321_short er nå en egen TTS-cue i
  // cues-mappen (kort «Klar? Tre, to, ein, kjør!»-tekst per persona), ikke
  // lenger en hale-trim av den innspilte peptalken — halen («ikkje no knussel
  // på slutten») var meningsløs isolert ved øktstart. Totalen er fortsatt 152:
  // short flytter bare kategori (recorded → tts).
  it('bygger full liste: 148 TTS-oppgaver + 4 innspilte (start_321 per persona) = 152', () => {
    const tasks = buildTaskList(manifest, {});
    expect(tasks).toHaveLength(152);
    expect(tasks.filter((t) => t.kind === 'tts')).toHaveLength(148);
    expect(tasks.filter((t) => t.kind === 'recorded')).toHaveLength(4);
  });

  it('gir 38 oppgaver per persona (12 cues + 25 øvelser + 1 innspilt)', () => {
    for (const id of PERSONA_IDS) {
      const forPersona = buildTaskList(manifest, {}).filter((t) => t.personaId === id);
      expect(forPersona).toHaveLength(38);
    }
  });

  it('bruker ttsText (fonetisk), aldri displayText, for øvelser', () => {
    const tasks = buildTaskList(manifest, {});
    const burpees = tasks.find(
      (t) => t.personaId === 'haugesund' && t.id === 'burpees',
    );
    expect(burpees?.kind).toBe('tts');
    // burpees er engelsk-uttalt (se «språkoverstyring»-blokken); poenget her er
    // at ttsText brukes framfor displayText — goblet-squat bærer beviset.
    expect(burpees && burpees.kind === 'tts' ? burpees.text : null).toBe('Burpees');
    const goblet = tasks.find(
      (t) => t.personaId === 'romsdal' && t.id === 'goblet-squat',
    );
    expect(goblet && goblet.kind === 'tts' ? goblet.text : null).toBe('Gåblet skvått');
  });

  it('bygger riktige outputstier under public/audio/personas/<persona>/', () => {
    const tasks = buildTaskList(manifest, {});
    const intro = tasks.find((t) => t.personaId === 'haugesund' && t.id === 'intro');
    expect(intro?.outputRelPath).toBe('public/audio/personas/haugesund/intro.mp3');
    const burpees = tasks.find((t) => t.personaId === 'boyband' && t.id === 'burpees');
    expect(burpees?.outputRelPath).toBe(
      'public/audio/personas/boyband/exercise-burpees.mp3',
    );
    const recorded = tasks.find(
      (t) => t.personaId === 'hardcore' && t.kind === 'recorded',
    );
    expect(recorded?.outputRelPath).toBe(
      'public/audio/personas/hardcore/start_321.mp3',
    );
  });

  it('TTS-oppgaver bærer personaens seedFile', () => {
    const tasks = buildTaskList(manifest, {});
    const t = tasks.find((x) => x.personaId === 'romsdal' && x.id === 'halfway');
    expect(t && t.kind === 'tts' ? t.seedFile : null).toBe('mintrener-seed-romsdal.wav');
  });

  it('har stabil rekkefølge: persona-rekkefølgen i JSON, cues før exercises', () => {
    const tasks = buildTaskList(manifest, {});
    const personaOrder = [...new Set(tasks.map((t) => t.personaId))];
    expect(personaOrder).toEqual(PERSONA_IDS);

    const haugesund = tasks.filter((t) => t.personaId === 'haugesund');
    const firstExerciseIdx = haugesund.findIndex((t) =>
      t.outputRelPath.includes('/exercise-'),
    );
    const lastCueIdx = haugesund.findIndex((t) => t.id === 'bro-resync');
    expect(haugesund[0]?.id).toBe('intro');
    expect(lastCueIdx).toBeLessThan(firstExerciseIdx);
    // Øvelsene beholder JSON-rekkefølgen
    const exerciseIds = haugesund
      .filter((t) => t.outputRelPath.includes('/exercise-'))
      .map((t) => t.id);
    expect(exerciseIds[0]).toBe('kneboy');
    expect(exerciseIds[exerciseIds.length - 1]).toBe('skulder-dislocates');
  });

  it('--persona filtrerer til én persona (37 TTS + 1 innspilt)', () => {
    const tasks = buildTaskList(manifest, { persona: 'haugesund' });
    expect(tasks).toHaveLength(38);
    expect(tasks.every((t) => t.personaId === 'haugesund')).toBe(true);
  });

  it('--only matcher cue-nøkkel på tvers av personas', () => {
    const tasks = buildTaskList(manifest, { only: 'halfway' });
    expect(tasks).toHaveLength(4);
    expect(tasks.every((t) => t.id === 'halfway')).toBe(true);
  });

  it('--only matcher øvelses-id', () => {
    const tasks = buildTaskList(manifest, { only: 'kettlebell-swing' });
    expect(tasks).toHaveLength(4);
    expect(
      tasks.every((t) => t.outputRelPath.endsWith('exercise-kettlebell-swing.mp3')),
    ).toBe(true);
  });

  it('--only start_321 gir kun de fire innspilte (short er TTS og matcher ikke)', () => {
    const tasks = buildTaskList(manifest, { only: 'start_321' });
    expect(tasks).toHaveLength(4);
    expect(tasks.every((t) => t.kind === 'recorded')).toBe(true);
    expect(tasks.every((t) => t.outputRelPath.endsWith('/start_321.mp3'))).toBe(true);
  });

  it('--only start_321_short gir 4 TTS-oppgaver med personaens korte 3-2-1-tekst', () => {
    // Oppgave B: short produseres i samme TTS-prosesseringskjede (v2) som de
    // andre cuene — ikke lenger klippet fra den innspilte kilden.
    const tasks = buildTaskList(manifest, { only: 'start_321_short' });
    expect(tasks).toHaveLength(4);
    expect(tasks.every((t) => t.kind === 'tts')).toBe(true);
    expect(tasks.every((t) => t.outputRelPath.endsWith('/start_321_short.mp3'))).toBe(true);
    const textByPersona = Object.fromEntries(
      tasks.map((t) => [t.personaId, t.kind === 'tts' ? t.text : null]),
    );
    expect(textByPersona).toEqual({
      haugesund: 'Gjer deg klar! Tre, to, ein, kjør!',
      romsdal: 'Klar? Tre, to, ein, kjør!',
      hardcore: 'Klar til kamp! Tre! To! En! KJØR!',
      boyband: 'Er du klar? Tre, to, en, kjør baby!',
    });
  });

  it('--skip-recorded utelater innspilte spor (148 igjen)', () => {
    const tasks = buildTaskList(manifest, { skipRecorded: true });
    expect(tasks).toHaveLength(148);
    expect(tasks.every((t) => t.kind === 'tts')).toBe(true);
  });

  it('kombinerer --persona og --only', () => {
    const tasks = buildTaskList(manifest, { persona: 'boyband', only: 'intro' });
    expect(tasks).toHaveLength(1);
    const t: VoicebankTask | undefined = tasks[0];
    expect(t?.personaId).toBe('boyband');
    expect(t?.id).toBe('intro');
  });
});

describe('RECORDED_SOURCES', () => {
  it('mapper alle fire innspilte filer til riktig persona-id', () => {
    expect(RECORDED_SOURCES).toEqual({
      haugesund: 'audio/Tre-To-En- Haugesund (Lead Vocal).mp3',
      romsdal: 'audio/Tre-To-En- Romsdalen (Lead Vocal).mp3',
      hardcore: 'audio/Tre-To-En- Hardcore (Lead Vocal).mp3',
      boyband: 'audio/Tre-To-En- Boyband (Lead Vocal).mp3',
    });
  });

  it('innspilte oppgaver peker på riktig kildefil', () => {
    const recorded = buildTaskList(manifest, { only: 'start_321' });
    const romsdal = recorded.find((t) => t.personaId === 'romsdal');
    expect(romsdal && romsdal.kind === 'recorded' ? romsdal.sourceRelPath : null).toBe(
      'audio/Tre-To-En- Romsdalen (Lead Vocal).mp3',
    );
  });
});

describe('buildClonePayload', () => {
  it('bygger clone-payload med reference_audio_filename = seedFile (default norsk)', () => {
    const payload = buildClonePayload('Gje gass!', 'mintrener-seed-haugesund.wav');
    expect(payload).toEqual({
      text: 'Gje gass!',
      voice_mode: 'clone',
      reference_audio_filename: 'mintrener-seed-haugesund.wav',
      language: 'no',
      output_format: 'mp3',
    });
  });

  it('respekterer eksplisitt språkoverstyring (ttsLang)', () => {
    const payload = buildClonePayload('Mountain Climbers', 'seed.wav', 'en');
    expect(payload.language).toBe('en');
    expect(payload.text).toBe('Mountain Climbers');
  });
});

describe('språkoverstyring (ttsLang)', () => {
  // Engelsk-uttalte øvelser. burpees kom til 2026-08-30 etter produkteiers
  // A/B-lytting: den fonetiske omskrivingen «Børpis» tapte mot engelsk uttale,
  // samme utfall som mountain-climbers fikk i QA-runde 1.
  const ENGLISH_EXERCISE_IDS = ['mountain-climbers', 'burpees'];

  it('nøyaktig 2 øvelser har ttsLang-overstyring i manuskriptet', () => {
    const overridden = manifest.exercises.filter((ex) => ex.ttsLang !== undefined);
    expect(overridden.map((ex) => ex.id).sort()).toEqual([...ENGLISH_EXERCISE_IDS].sort());
    expect(overridden.every((ex) => ex.ttsLang === 'en')).toBe(true);
  });

  it('mountain-climbers bærer engelsk tekst og lang=en i alle personas', () => {
    const tasks = buildTaskList(manifest, { only: 'mountain-climbers' });
    expect(tasks).toHaveLength(4);
    for (const t of tasks) {
      expect(t.kind === 'tts' ? t.text : null).toBe('Mountain Climbers');
      expect(t.kind === 'tts' ? t.lang : null).toBe('en');
    }
  });

  it('burpees bærer engelsk tekst og lang=en i alle personas', () => {
    const tasks = buildTaskList(manifest, { only: 'burpees' });
    expect(tasks).toHaveLength(4);
    for (const t of tasks) {
      expect(t.kind === 'tts' ? t.text : null).toBe('Burpees');
      expect(t.kind === 'tts' ? t.lang : null).toBe('en');
    }
  });

  it('displayText og filnavn for burpees er uendret (visningsnavn/filsti er stabile)', () => {
    const burpees = manifest.exercises.find((ex) => ex.id === 'burpees');
    expect(burpees?.displayText).toBe('Burpees');
    expect(burpees?.file).toBe('exercise-burpees.mp3');
  });

  it('alle andre TTS-oppgaver (cues og øvelser) er norske', () => {
    const others = buildTaskList(manifest, {}).filter(
      (t): t is TtsTask => t.kind === 'tts' && !ENGLISH_EXERCISE_IDS.includes(t.id),
    );
    expect(others).toHaveLength(140);
    expect(others.every((t) => t.lang === 'no')).toBe(true);
  });
});

describe('cacheIsFresh (sidecar-invalidering av rå-cachen)', () => {
  const task = { text: 'Mountain Climbers', lang: 'en' };

  it('gyldig sidecar med samme tekst og språk er fersk', () => {
    const sidecar = JSON.stringify({ text: 'Mountain Climbers', lang: 'en' });
    expect(cacheIsFresh(sidecar, task)).toBe(true);
  });

  it('avvikende tekst eller språk invaliderer cachen', () => {
    expect(cacheIsFresh(JSON.stringify({ text: 'Mauntn klaimers', lang: 'no' }), task)).toBe(false);
    expect(cacheIsFresh(JSON.stringify({ text: 'Mountain Climbers', lang: 'no' }), task)).toBe(false);
  });

  it('manglende eller korrupt sidecar invaliderer (legacy-cache re-hentes)', () => {
    expect(cacheIsFresh(null, task)).toBe(false);
    expect(cacheIsFresh('ikke json{', task)).toBe(false);
  });
});

describe('buildTtsFfmpegArgs (etterbehandling v2 for TTS-klipp)', () => {
  const args = buildTtsFfmpegArgs('in.mp3', 'out.mp3');
  const filter = args[args.indexOf('-af') + 1] ?? '';

  it('inkluderer input og output', () => {
    expect(args).toContain('in.mp3');
    expect(args[args.length - 1]).toBe('out.mp3');
  });

  it('QA-2: denoiser (afftdn) med highpass, FØR trimmingen', () => {
    expect(filter).toContain('highpass=f=75');
    expect(filter).toContain('afftdn=nr=12:nf=-42');
    expect(filter.indexOf('afftdn')).toBeLessThan(filter.indexOf('silenceremove'));
  });

  it('QA-1: start-trim bevarer 100 ms pre-roll, slutt-trim 60 ms', () => {
    expect(filter).toContain(
      'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.1',
    );
    expect(filter).toContain(
      'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.06',
    );
    expect(filter).toContain('afade=t=in:st=0:d=0.01');
  });

  it('QA-3: mykgjøring (deesser/treble/bass) etter trim, loudnorm sist', () => {
    // deesser uten i= er en no-op i ffmpeg 8.x (default-intensitet 0)
    expect(filter).toContain('deesser=i=0.15');
    expect(filter).toContain('treble=g=-2.5:f=7500');
    expect(filter).toContain('bass=g=1:f=180');
    expect(filter.indexOf('deesser')).toBeGreaterThan(filter.lastIndexOf('areverse'));
    expect(filter.indexOf('loudnorm=I=-16:TP=-1.5:LRA=11')).toBeGreaterThan(
      filter.indexOf('bass='),
    );
    expect(filter.endsWith('loudnorm=I=-16:TP=-1.5:LRA=11')).toBe(true);
  });

  it('overskriver uten prompt og leser aldri stdin', () => {
    expect(args).toContain('-y');
    expect(args).toContain('-nostdin');
  });
});

describe('buildRecordedFfmpegArgs (skånsom kjede for innspilte spor)', () => {
  const args = buildRecordedFfmpegArgs('in.mp3', 'out.mp3');
  const filter = args[args.indexOf('-af') + 1] ?? '';

  it('beholder trim + fade + loudnorm', () => {
    expect(filter).toContain('silenceremove');
    expect(filter).toContain('afade');
    expect(filter).toContain('loudnorm=I=-16:TP=-1.5:LRA=11');
    expect(args[args.length - 1]).toBe('out.mp3');
  });

  it('har INGEN denoise/EQ — produserte vokalspor skal ikke farges', () => {
    expect(filter).not.toContain('afftdn');
    expect(filter).not.toContain('deesser');
    expect(filter).not.toContain('treble');
    expect(filter).not.toContain('bass');
    expect(filter).not.toContain('highpass');
  });
});

describe('rå-cache', () => {
  it('TTS-oppgaver får cacheRelPath under audio/raw-cache/<persona>/', () => {
    const tasks = buildTaskList(manifest, {});
    const intro = tasks.find((t) => t.personaId === 'haugesund' && t.id === 'intro');
    expect(intro && intro.kind === 'tts' ? intro.cacheRelPath : null).toBe(
      'audio/raw-cache/haugesund/intro.mp3',
    );
    const burpees = tasks.find((t) => t.personaId === 'boyband' && t.id === 'burpees');
    expect(burpees && burpees.kind === 'tts' ? burpees.cacheRelPath : null).toBe(
      'audio/raw-cache/boyband/exercise-burpees.mp3',
    );
  });
});

describe('decideTtsAction (cache-oppførsel)', () => {
  it('cache-treff hopper over TTS-kallet', () => {
    expect(
      decideTtsAction({ cacheExists: true, outputExists: false, force: false, reprocess: false }),
    ).toBe('process-from-cache');
  });

  it('cache-treff + --force regenererer output fra cache, uten nytt TTS-kall', () => {
    expect(
      decideTtsAction({ cacheExists: true, outputExists: true, force: true, reprocess: false }),
    ).toBe('process-from-cache');
  });

  it('eksisterende output uten --force hopper over hele oppgaven', () => {
    expect(
      decideTtsAction({ cacheExists: true, outputExists: true, force: false, reprocess: false }),
    ).toBe('skip-existing');
    expect(
      decideTtsAction({ cacheExists: false, outputExists: true, force: false, reprocess: false }),
    ).toBe('skip-existing');
  });

  it('uten cache og uten output hentes TTS fra nettet', () => {
    expect(
      decideTtsAction({ cacheExists: false, outputExists: false, force: false, reprocess: false }),
    ).toBe('fetch-then-process');
  });

  it('--reprocess bruker alltid cache (aldri nettverk), også når output finnes', () => {
    expect(
      decideTtsAction({ cacheExists: true, outputExists: true, force: false, reprocess: true }),
    ).toBe('process-from-cache');
  });

  it('--reprocess uten cache-fil er en feil', () => {
    expect(
      decideTtsAction({ cacheExists: false, outputExists: true, force: false, reprocess: true }),
    ).toBe('missing-cache');
  });

  it('--refetch tvinger ny TTS-henting selv med fersk cache og eksisterende output', () => {
    expect(
      decideTtsAction({
        cacheExists: true,
        outputExists: true,
        force: false,
        reprocess: false,
        refetch: true,
      }),
    ).toBe('fetch-then-process');
    expect(
      decideTtsAction({
        cacheExists: false,
        outputExists: false,
        force: false,
        reprocess: false,
        refetch: true,
      }),
    ).toBe('fetch-then-process');
  });
});

describe('persistRawCache (sidecar-atomisitet)', () => {
  it('sletter sidecaren FØR mp3-skrivingen, og skriver den sist', () => {
    const ops: string[] = [];
    const io = {
      rmSync: (p: string) => ops.push(`rm:${p}`),
      writeFileSync: (p: string) => ops.push(`write:${p}`),
    };
    persistRawCache(
      'cache/intro.mp3',
      'cache/intro.mp3.json',
      Buffer.from('lyd'),
      { text: 'Trø te!', lang: 'no' },
      io,
    );
    expect(ops).toEqual([
      'rm:cache/intro.mp3.json',
      'write:cache/intro.mp3',
      'write:cache/intro.mp3.json',
    ]);
  });
});

describe('parseManifest', () => {
  it('avviser input uten personas/exercises', () => {
    expect(() => parseManifest({})).toThrow();
    expect(() => parseManifest(null)).toThrow();
  });

  it('avviser personas som array og exercises som objekt', () => {
    expect(() => parseManifest({ personas: [], exercises: [] })).toThrow();
    expect(() => parseManifest({ personas: {}, exercises: {} })).toThrow();
  });

  it('godtar det ekte manuskriptet', () => {
    expect(Object.keys(manifest.personas)).toEqual(PERSONA_IDS);
    expect(manifest.exercises).toHaveLength(25);
  });
});

describe('buildTaskList — kanttilfeller', () => {
  it('tomt manifest gir tom liste', () => {
    const empty: VoicebankManifest = { language: 'no', personas: {}, exercises: [] };
    expect(buildTaskList(empty, {})).toEqual([]);
  });

  it('kaster hvis en persona har start_321 men mangler i RECORDED_SOURCES', () => {
    const rogue: VoicebankManifest = {
      language: 'no',
      personas: {
        ukjent: {
          displayName: 'Ukjent',
          region: null,
          seedFile: 'seed.wav',
          cues: {},
          recordedCues: { start_321: 'bruk innspilling' },
        },
      },
      exercises: [],
    };
    expect(() => buildTaskList(rogue, {})).toThrow(/ukjent/);
  });
});

describe('parseCliArgs', () => {
  it('parser gyldige flagg', () => {
    const opts = parseCliArgs([
      '--dry-run', '--persona', 'haugesund', '--only', 'intro', '--force', '--skip-recorded',
    ]);
    expect(opts).toEqual({
      dryRun: true,
      force: true,
      skipRecorded: true,
      reprocess: false,
      refetch: false,
      persona: 'haugesund',
      only: 'intro',
    });
  });

  it('parser --reprocess', () => {
    expect(parseCliArgs(['--reprocess']).reprocess).toBe(true);
    expect(parseCliArgs(['--reprocess', '--persona', 'romsdal'])).toMatchObject({
      reprocess: true,
      persona: 'romsdal',
    });
  });

  it('parser --refetch', () => {
    expect(parseCliArgs(['--refetch']).refetch).toBe(true);
    expect(parseCliArgs([]).refetch).toBe(false);
  });

  it('avviser kombinasjonen --refetch + --reprocess', () => {
    expect(() => parseCliArgs(['--refetch', '--reprocess'])).toThrow(/kombiner/);
  });

  it('kaster hvis --persona mangler verdi', () => {
    expect(() => parseCliArgs(['--persona'])).toThrow(/--persona/);
  });

  it('kaster hvis verdien etter --persona er et annet flagg', () => {
    expect(() => parseCliArgs(['--persona', '--dry-run'])).toThrow(/--persona/);
  });

  it('kaster hvis --only mangler verdi eller får et flagg som verdi', () => {
    expect(() => parseCliArgs(['--only'])).toThrow(/--only/);
    expect(() => parseCliArgs(['--only', '--force'])).toThrow(/--only/);
  });
});

describe('isRetryableHttpStatus', () => {
  it('retry på 5xx og 429', () => {
    for (const status of [429, 500, 502, 503, 504]) {
      expect(isRetryableHttpStatus(status)).toBe(true);
    }
  });

  it('fail-fast på øvrige 4xx', () => {
    for (const status of [400, 401, 403, 404, 422]) {
      expect(isRetryableHttpStatus(status)).toBe(false);
    }
  });
});

describe('updateConsecutiveFailures', () => {
  it('øker ved feil, nullstiller ved suksess, uendret ved skip', () => {
    expect(updateConsecutiveFailures(0, 'failed')).toBe(1);
    expect(updateConsecutiveFailures(2, 'failed')).toBe(3);
    expect(updateConsecutiveFailures(2, 'generated')).toBe(0);
    expect(updateConsecutiveFailures(2, 'skipped')).toBe(2);
  });

  it('abort-terskelen er 3 påfølgende feil', () => {
    expect(MAX_CONSECUTIVE_FAILURES).toBe(3);
  });
});

describe('fetchTtsWithRetries — retry-klassifisering (mock fetch)', () => {
  const task: TtsTask = {
    kind: 'tts',
    personaId: 'haugesund',
    id: 'intro',
    text: 'Trø te!',
    seedFile: 'mintrener-seed-haugesund.wav',
    outputRelPath: 'public/audio/personas/haugesund/intro.mp3',
    cacheRelPath: 'audio/raw-cache/haugesund/intro.mp3',
    lang: 'no',
  };

  const fakeResponse = (status: number, body: ArrayBuffer | string) => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (typeof body === 'string' ? body : ''),
    arrayBuffer: async () =>
      typeof body === 'string' ? new TextEncoder().encode(body).buffer : body,
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('feiler umiddelbart (uten retry) på 401', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const mock = vi.fn().mockResolvedValue(fakeResponse(401, 'Unauthorized'));
    vi.stubGlobal('fetch', mock);
    await expect(fetchTtsWithRetries(task, 'tok', 0)).rejects.toBeInstanceOf(
      NonRetryableError,
    );
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it('prøver 3 ganger på 500 før den gir opp', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const mock = vi.fn().mockResolvedValue(fakeResponse(500, 'boom'));
    vi.stubGlobal('fetch', mock);
    await expect(fetchTtsWithRetries(task, 'tok', 0)).rejects.toThrow(/500/);
    expect(mock).toHaveBeenCalledTimes(3);
  });

  it('behandler < 1 KB-respons som retryable feil', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const mock = vi.fn().mockResolvedValue(fakeResponse(200, new ArrayBuffer(10)));
    vi.stubGlobal('fetch', mock);
    await expect(fetchTtsWithRetries(task, 'tok', 0)).rejects.toThrow(/liten respons/);
    expect(mock).toHaveBeenCalledTimes(3);
  });

  it('retryer nettverksfeil og lykkes på andre forsøk', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const mock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValue(fakeResponse(200, new ArrayBuffer(4096)));
    vi.stubGlobal('fetch', mock);
    const buffer = await fetchTtsWithRetries(task, 'tok', 0);
    expect(buffer.length).toBe(4096);
    expect(mock).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// Halevakt (QA-4): automatisk deteksjon av avkuttede klipp.
// ---------------------------------------------------------------------------

describe('halevakt — måleunderlaget er RÅFILA, ikke etterbehandlet output', () => {
  const ttsTask = buildTaskList(manifest, { persona: 'hardcore', only: 'burpees' })
    .find((t): t is TtsTask => t.kind === 'tts');

  it('TTS-oppgaver måles på rå-cachen slik klippet kom fra Chatterbox', () => {
    expect(ttsTask).toBeDefined();
    expect(tailSourceRelPath(ttsTask as TtsTask)).toBe((ttsTask as TtsTask).cacheRelPath);
    // Den etterbehandlede fila er nettopp det vi IKKE skal måle: TRIM_END/FADE
    // bestemmer haleenergien der og inverterer signalet.
    expect(tailSourceRelPath(ttsTask as TtsTask)).not.toBe((ttsTask as TtsTask).outputRelPath);
    expect(tailSourceRelPath(ttsTask as TtsTask)).toContain('audio/raw-cache/');
  });

  it('innspilte spor måles ikke i det hele tatt (ingen råfil fra Chatterbox)', () => {
    const recorded = buildTaskList(manifest, { persona: 'hardcore', only: 'start_321' })
      .find((t) => t.kind === 'recorded');
    expect(recorded).toBeDefined();
    expect(tailSourceRelPath(recorded as VoicebankTask)).toBeNull();
  });
});

describe('halevakt — tailFalloffDb / isTailSuspect (kalibrert på rå måledata)', () => {
  it('falloff er hale minus samlet (negativ når take-et dør ut)', () => {
    expect(tailFalloffDb({ overallMeanDb: -21.7, tailMeanDb: -91.0 })).toBeCloseTo(-69.3, 5);
    expect(tailFalloffDb({ overallMeanDb: -17.7, tailMeanDb: -42.1 })).toBeCloseTo(-24.4, 5);
  });

  it('friske råklipp (fasit fra audio/lyttekandidater/raa/) flagges ikke', () => {
    // befal_1_borpis_produksjon, befal_3_borpies, hardcore_1_borpis_produksjon.
    expect(isTailSuspect({ overallMeanDb: -21.7, tailMeanDb: -91.0 })).toBe(false); // −69,3
    expect(isTailSuspect({ overallMeanDb: -18.8, tailMeanDb: -91.0 })).toBe(false); // −72,2
    expect(isTailSuspect({ overallMeanDb: -21.0, tailMeanDb: -70.9 })).toBe(false); // −49,9
  });

  it('det avkuttede «burpii»-take-et flagges på rå måling', () => {
    // befal_2_burpees_engelsk: −17,7 samlet, −42,1 i halen → fall −24,4 dB.
    expect(isTailSuspect({ overallMeanDb: -17.7, tailMeanDb: -42.1 })).toBe(true);
  });

  it('grensetilfellet nøyaktig −36 dB er IKKE mistenkt (strengt over flagger)', () => {
    expect(TAIL_FALLOFF_THRESHOLD_DB).toBe(-36);
    expect(isTailSuspect({ overallMeanDb: -20, tailMeanDb: -56 })).toBe(false);
    // Et hår over terskelen vipper den andre veien.
    expect(isTailSuspect({ overallMeanDb: -20, tailMeanDb: -55.9 })).toBe(true);
  });

  it('terskelen ligger i gapet mellom fasitens avkuttede og dårligste friske', () => {
    // Verifisert avkuttet: −24,4. Dårligste verifisert friske: −49,9.
    expect(TAIL_FALLOFF_THRESHOLD_DB).toBeGreaterThan(-49.9);
    expect(TAIL_FALLOFF_THRESHOLD_DB).toBeLessThan(-24.4);
  });

  it('et helt stille klipp BLIR flagget — ekte ffmpeg gir −91 dB, ikke -inf', () => {
    // Digital stillhet rapporteres på 16-bits-gulvet, så fallet blir 0,0 dB.
    expect(isTailSuspect({ overallMeanDb: -91.0, tailMeanDb: -91.0 })).toBe(true);
  });

  it('ikke-endelige måltall er en defensiv vakt og gir ingen advarsel', () => {
    expect(isTailSuspect({ overallMeanDb: -20, tailMeanDb: -Infinity })).toBe(false);
    expect(isTailSuspect({ overallMeanDb: NaN, tailMeanDb: -20 })).toBe(false);
  });
});

describe('halevakt — parseMeanVolumeDb', () => {
  it('plukker mean_volume ut av volumedetect-utskriften', () => {
    const stderr = [
      '[Parsed_volumedetect_0 @ 000001c7] n_samples: 132300',
      '[Parsed_volumedetect_0 @ 000001c7] mean_volume: -22.5 dB',
      '[Parsed_volumedetect_0 @ 000001c7] max_volume: -1.2 dB',
    ].join('\n');
    expect(parseMeanVolumeDb(stderr)).toBe(-22.5);
  });

  it('tolker -inf (digital stillhet) som -Infinity', () => {
    expect(parseMeanVolumeDb('mean_volume: -inf dB')).toBe(-Infinity);
  });

  it('gir null når utskriften ikke inneholder mean_volume', () => {
    expect(parseMeanVolumeDb('')).toBeNull();
    expect(parseMeanVolumeDb('ffmpeg: No such file or directory')).toBeNull();
  });
});

describe('halevakt — buildVolumeDetectArgs', () => {
  it('måler hele klippet uten seek', () => {
    const args = buildVolumeDetectArgs('klipp.mp3', 'whole');
    expect(args).toContain('volumedetect');
    expect(args).not.toContain('-sseof');
    expect(args[args.length - 1]).toBe('-');
    expect(args).toContain('null');
  });

  it('måler halen med -sseof på TAIL_WINDOW_SECONDS', () => {
    const args = buildVolumeDetectArgs('klipp.mp3', 'tail');
    const idx = args.indexOf('-sseof');
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(args[idx + 1]).toBe(`-${TAIL_WINDOW_SECONDS}`);
    // -sseof må stå FØR -i for å virke som input-seek.
    expect(idx).toBeLessThan(args.indexOf('-i'));
  });

  it('leser aldri stdin (batchen er ikke-interaktiv)', () => {
    expect(buildVolumeDetectArgs('k.mp3', 'whole')).toContain('-nostdin');
  });
});

describe('halevakt — rapportering (én vakt)', () => {
  const flag = {
    personaId: 'hardcore',
    id: 'burpees',
    rawRelPath: 'audio/raw-cache/hardcore/exercise-burpees.mp3',
    outputRelPath: 'public/audio/personas/hardcore/exercise-burpees.mp3',
    falloffDb: -24.4,
  };

  it('advarselen navngir RÅFILA, måltallet og foreslår et nytt take', () => {
    const lines = formatTailWarning(flag).join('\n');
    expect(lines).toContain('audio/raw-cache/hardcore/exercise-burpees.mp3');
    expect(lines).toContain('-24.4');
    expect(lines).toContain(`${TAIL_FALLOFF_THRESHOLD_DB}`);
    expect(lines).toContain('--refetch --only burpees --persona hardcore');
  });

  it('advarselen sier at det er råfila som er målt, ikke det ferdige klippet', () => {
    const lines = formatTailWarning(flag).join('\n');
    expect(lines).toMatch(/rå/i);
    // Det ferdige klippet nevnes som det man skal LYTTE på.
    expect(lines).toContain('public/audio/personas/hardcore/exercise-burpees.mp3');
  });

  /** Full dekning: alt vakten fikk se, fikk den også målt. */
  const fullDekning = (measured: number): TailCoverage => ({ measured, unmeasured: [] });

  it('sluttrapporten teller og lister alle flaggede take', () => {
    const text = formatTailSummary(
      [flag, { ...flag, personaId: 'boyband', falloffDb: -9.4 }],
      fullDekning(148),
    ).join('\n');
    expect(text).toContain('2');
    expect(text).toContain('hardcore/burpees');
    expect(text).toContain('boyband/burpees');
    expect(text).toContain('-9.4');
  });

  it('sluttrapporten sier eksplisitt fra når ingenting ble flagget', () => {
    const text = formatTailSummary([], fullDekning(148)).join('\n');
    expect(text).toMatch(/ingen/i);
    expect(text).not.toContain('--refetch');
  });

  it('rapporten nevner ingen søsken-vakt — den finnes ikke lenger', () => {
    const text = formatTailSummary([flag], fullDekning(148)).join('\n');
    expect(text).not.toMatch(/søsken/i);
  });
});

// ---------------------------------------------------------------------------
// Dekningsrapporten (reviewer B1). Vakten var TAUS når råfila manglet: den
// returnerte null, og sluttrapporten skrev «ingen take flagget» — altså en
// friskmelding for klipp som aldri ble målt. Det skjer i dagens bank
// (start_321_short har ingen råfil) og for ALLE andre enn eieren
// (audio/raw-cache/ er gitignorert, public/audio/personas/ er committet).
// Rapporten skal derfor alltid oppgi BEGGE tallene: målt og ikke-målt.
// ---------------------------------------------------------------------------
describe('halevakt — dekningsrapport (full / delvis / null)', () => {
  const flag: TailFlag = {
    personaId: 'hardcore',
    id: 'burpees',
    rawRelPath: 'audio/raw-cache/hardcore/exercise-burpees.mp3',
    outputRelPath: 'public/audio/personas/hardcore/exercise-burpees.mp3',
    falloffDb: -24.4,
  };

  const manglerRaafil = (ids: readonly string[]): TailCoverage['unmeasured'] =>
    ids.map((id) => ({ id, reason: 'missing-raw' as const }));

  describe('FULL dekning', () => {
    it('sier at alle klippene ble målt, og advarer ikke om dekning', () => {
      const text = formatTailSummary([], { measured: 148, unmeasured: [] }).join('\n');
      expect(text).toMatch(/alle 148/i);
      expect(text).toMatch(/målt/i);
      expect(text).not.toMatch(/DELVIS DEKNING/);
      expect(text).not.toMatch(/INGEN DEKNING/);
    });

    it('flaggene telles mot antall MÅLTE take, ikke mot totalen', () => {
      const text = formatTailSummary([flag], { measured: 148, unmeasured: [] }).join('\n');
      expect(text).toContain('1 av 148');
    });
  });

  describe('DELVIS dekning', () => {
    const delvis: TailCoverage = {
      measured: 144,
      unmeasured: manglerRaafil([
        'haugesund/start_321_short',
        'romsdal/start_321_short',
        'hardcore/start_321_short',
        'boyband/start_321_short',
      ]),
    };

    it('oppgir hvor mange som IKKE ble målt, av hvor mange', () => {
      const text = formatTailSummary([], delvis).join('\n');
      expect(text).toMatch(/DELVIS DEKNING/);
      expect(text).toContain('4 av 148');
    });

    it('sier eksplisitt at fravær av flagg ikke er en friskmelding', () => {
      const text = formatTailSummary([], delvis).join('\n');
      expect(text).toMatch(/ikke.*friskmelding/i);
    });

    it('navngir klippene og grunnen til at de ikke lot seg måle', () => {
      const text = formatTailSummary([], delvis).join('\n');
      expect(text).toContain('hardcore/start_321_short');
      expect(text).toContain('audio/raw-cache/');
    });

    it('dekningsforbeholdet står også når noe FAKTISK ble flagget', () => {
      const text = formatTailSummary([flag], delvis).join('\n');
      expect(text).toContain('hardcore/burpees');
      expect(text).toMatch(/DELVIS DEKNING/);
      expect(text).toMatch(/ikke.*friskmelding/i);
    });

    it('skiller mellom grunnene — utdatert cache er ikke det samme som manglende råfil', () => {
      const text = formatTailSummary([], {
        measured: 146,
        unmeasured: [
          { id: 'hardcore/burpees', reason: 'stale-cache' },
          { id: 'boyband/intro', reason: 'measure-failed' },
        ],
      }).join('\n');
      expect(text).toMatch(/utdatert/i);
      expect(text).toContain('hardcore/burpees');
      expect(text).toMatch(/mislyktes/i);
      expect(text).toContain('boyband/intro');
    });

    it('korter ned lange lister i stedet for å fylle rapporten med id-er', () => {
      const mange = Array.from({ length: 20 }, (_, i) => `hardcore/klipp-${i}`);
      const text = formatTailSummary([], {
        measured: 128,
        unmeasured: manglerRaafil(mange),
      }).join('\n');
      expect(text).toContain('20 av 148');
      expect(text).toContain('hardcore/klipp-0');
      expect(text).toMatch(/og 14 til/);
      expect(text).not.toContain('hardcore/klipp-19');
    });
  });

  describe('NULL dekning (frisk klone)', () => {
    // audio/raw-cache/ er gitignorert og public/audio/personas/ er committet:
    // på en frisk klone går hver TTS-oppgave skip-existing → ingen råfil.
    const ingen: TailCoverage = {
      measured: 0,
      unmeasured: manglerRaafil(
        Array.from({ length: 148 }, (_, i) => `hardcore/klipp-${i}`),
      ),
    };

    it('sier at vakten ikke kunne vurdere ET ENESTE take', () => {
      const text = formatTailSummary([], ingen).join('\n');
      expect(text).toMatch(/INGEN DEKNING/);
      expect(text).toContain('0 av 148');
      expect(text).toMatch(/ikke vurdert/i);
    });

    it('friskmelder ALDRI — «ingen take flagget» skal ikke forekomme', () => {
      const text = formatTailSummary([], ingen).join('\n');
      expect(text).not.toMatch(/ingen take flagget/i);
    });
  });

  it('en kjøring uten TTS-klipp i det hele tatt sier at det ikke var noe å vurdere', () => {
    // f.eks. `--only start_321`: bare innspilte spor, som vakten ikke måler.
    const text = formatTailSummary([], { measured: 0, unmeasured: [] }).join('\n');
    expect(text).toMatch(/ingen TTS-klipp/i);
    expect(text).not.toMatch(/INGEN DEKNING/);
  });
});

// ---------------------------------------------------------------------------
// checkTail-sømmen (reviewer BØR 4). Uten denne testen kunne noen bytte
// toAbsolute(rawRelPath) mot toAbsolute(task.outputRelPath) i runneren og
// beholde hele suiten grønn — måleunderlaget er nettopp det Beslutning 39
// hviler på. Måleren injiseres, samme mønster som persistRawCache sin `io`.
// ---------------------------------------------------------------------------
describe('halevakt — checkTailWith (injisert måler)', () => {
  const ttsTask = buildTaskList(manifest, { persona: 'hardcore', only: 'burpees' }).find(
    (t): t is TtsTask => t.kind === 'tts',
  ) as TtsTask;
  const recordedTask = buildTaskList(manifest, {
    persona: 'hardcore',
    only: 'start_321',
  }).find((t) => t.kind === 'recorded') as VoicebankTask;

  /** Sporer hvilke filer måleren faktisk ble bedt om å se på. */
  function probe(
    opts: { exists?: boolean; whole?: number | null; tail?: number | null } = {},
  ): TailProbe & { readonly seen: string[] } {
    const seen: string[] = [];
    return {
      seen,
      exists: (p: string) => {
        seen.push(p);
        return opts.exists ?? true;
      },
      measure: (p: string, window: 'whole' | 'tail') => {
        seen.push(p);
        return window === 'whole' ? (opts.whole ?? -20) : (opts.tail ?? -91);
      },
    };
  }

  it('måler RÅFILA i audio/raw-cache/ — aldri den etterbehandlede output-fila', () => {
    const p = probe();
    checkTailWith(ttsTask, p);
    expect(p.seen.length).toBeGreaterThan(0);
    for (const seenPath of p.seen) {
      const normalisert = seenPath.split('\\').join('/');
      expect(normalisert).toContain('audio/raw-cache/');
      expect(normalisert).not.toContain('public/audio/personas/');
    }
  });

  it('friskt måltall gir et målt utfall uten flagg', () => {
    const res = checkTailWith(ttsTask, probe({ whole: -20, tail: -91 }));
    expect(res.kind).toBe('ok');
    expect(res.kind === 'ok' && res.flag).toBeNull();
  });

  it('mistenkt måltall gir et flagg som peker på råfila og på klippet man skal lytte på', () => {
    const res = checkTailWith(ttsTask, probe({ whole: -17.7, tail: -42.1 }));
    expect(res.kind).toBe('ok');
    if (res.kind !== 'ok' || res.flag === null) throw new Error('forventet flagg');
    expect(res.flag.falloffDb).toBeCloseTo(-24.4, 5);
    expect(res.flag.rawRelPath).toBe(ttsTask.cacheRelPath);
    expect(res.flag.outputRelPath).toBe(ttsTask.outputRelPath);
  });

  it('manglende råfil er IKKE et friskt klipp — det er et umålt klipp', () => {
    const p = probe({ exists: false });
    const res = checkTailWith(ttsTask, p);
    expect(res.kind).toBe('missing-raw');
    // Ingen måling forsøkt når fila ikke finnes.
    expect(p.seen).toHaveLength(1);
  });

  it('mislykket ffmpeg-måling er også et umålt klipp', () => {
    expect(checkTailWith(ttsTask, probe({ whole: null })).kind).toBe('measure-failed');
    expect(checkTailWith(ttsTask, probe({ tail: null })).kind).toBe('measure-failed');
  });

  it('innspilte spor er utenfor vaktens mandat og røres ikke av måleren', () => {
    const p = probe();
    expect(checkTailWith(recordedTask, p).kind).toBe('not-applicable');
    expect(p.seen).toHaveLength(0);
  });
});

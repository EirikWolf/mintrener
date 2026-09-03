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
  type VoicebankManifest,
  type VoicebankTask,
  type TtsTask,
} from '../voicebankTasks';
import { fetchTtsWithRetries } from '../generatePersonaVoicebank';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.resolve(__dirname, '..', 'voicebank-manuskript.json');
const manifest = parseManifest(JSON.parse(fs.readFileSync(manifestPath, 'utf-8')));

// Utledet fra manuskriptet, ikke hardkodet: da trenger ikke tallene under
// rettes hver gang en stemme legges til eller fjernes.
const PERSONA_IDS = Object.keys(manifest.personas);
const OPPGAVER_PER_PERSONA = 38; // 12 cues + 25 øvelser + 1 innspilt

describe('buildTaskList', () => {
  // Oppgave B (felttest-oppfølging): start_321_short er nå en egen TTS-cue i
  // cues-mappen (kort «Klar? Tre, to, ein, kjør!»-tekst per persona), ikke
  // lenger en hale-trim av den innspilte peptalken — halen («ikkje no knussel
  // på slutten») var meningsløs isolert ved øktstart. Totalen er fortsatt 152:
  // short flytter bare kategori (recorded → tts).
  it('bygger full liste: 37 TTS + 1 innspilt per persona', () => {
    const tasks = buildTaskList(manifest, {});
    const n = PERSONA_IDS.length;
    expect(tasks).toHaveLength(n * OPPGAVER_PER_PERSONA);
    expect(tasks.filter((t) => t.kind === 'tts')).toHaveLength(n * (OPPGAVER_PER_PERSONA - 1));
    expect(tasks.filter((t) => t.kind === 'recorded')).toHaveLength(n);
  });

  it('gir 38 oppgaver per persona (12 cues + 25 øvelser + 1 innspilt)', () => {
    expect(PERSONA_IDS.length).toBeGreaterThan(0);
    for (const id of PERSONA_IDS) {
      const forPersona = buildTaskList(manifest, {}).filter((t) => t.personaId === id);
      expect(forPersona).toHaveLength(OPPGAVER_PER_PERSONA);
    }
  });

  it('bruker ttsText (fonetisk), aldri displayText, for øvelser', () => {
    const tasks = buildTaskList(manifest, {});
    const burpees = tasks.find(
      (t) => t.personaId === PERSONA_IDS[0] && t.id === 'burpees',
    );
    expect(burpees?.kind).toBe('tts');
    expect(burpees && burpees.kind === 'tts' ? burpees.text : null).toBe('Børpis');
    const goblet = tasks.find(
      (t) => t.personaId === PERSONA_IDS[1] && t.id === 'goblet-squat',
    );
    expect(goblet && goblet.kind === 'tts' ? goblet.text : null).toBe('Gåblet skvått');
  });

  it('bygger riktige outputstier under public/audio/personas/<persona>/', () => {
    const tasks = buildTaskList(manifest, {});
    const intro = tasks.find((t) => t.personaId === PERSONA_IDS[0] && t.id === 'intro');
    expect(intro?.outputRelPath).toBe(`public/audio/personas/${PERSONA_IDS[0]}/intro.mp3`);
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
    const t = tasks.find((x) => x.personaId === PERSONA_IDS[1] && x.id === 'halfway');
    expect(t && t.kind === 'tts' ? t.seedFile : null).toBe(
      manifest.personas[PERSONA_IDS[1]].seedFile,
    );
  });

  it('har stabil rekkefølge: persona-rekkefølgen i JSON, cues før exercises', () => {
    const tasks = buildTaskList(manifest, {});
    const personaOrder = [...new Set(tasks.map((t) => t.personaId))];
    expect(personaOrder).toEqual(PERSONA_IDS);

    const forstePersona = tasks.filter((t) => t.personaId === PERSONA_IDS[0]);
    const firstExerciseIdx = forstePersona.findIndex((t) =>
      t.outputRelPath.includes('/exercise-'),
    );
    const lastCueIdx = forstePersona.findIndex((t) => t.id === 'bro-resync');
    expect(forstePersona[0]?.id).toBe('intro');
    expect(lastCueIdx).toBeLessThan(firstExerciseIdx);
    // Øvelsene beholder JSON-rekkefølgen
    const exerciseIds = forstePersona
      .filter((t) => t.outputRelPath.includes('/exercise-'))
      .map((t) => t.id);
    expect(exerciseIds[0]).toBe('kneboy');
    expect(exerciseIds[exerciseIds.length - 1]).toBe('skulder-dislocates');
  });

  it('--persona filtrerer til én persona (37 TTS + 1 innspilt)', () => {
    const tasks = buildTaskList(manifest, { persona: PERSONA_IDS[0] });
    expect(tasks).toHaveLength(OPPGAVER_PER_PERSONA);
    expect(tasks.every((t) => t.personaId === PERSONA_IDS[0])).toBe(true);
  });

  it('--only matcher cue-nøkkel på tvers av personas', () => {
    const tasks = buildTaskList(manifest, { only: 'halfway' });
    expect(tasks).toHaveLength(PERSONA_IDS.length);
    expect(tasks.every((t) => t.id === 'halfway')).toBe(true);
  });

  it('--only matcher øvelses-id', () => {
    const tasks = buildTaskList(manifest, { only: 'kettlebell-swing' });
    expect(tasks).toHaveLength(PERSONA_IDS.length);
    expect(
      tasks.every((t) => t.outputRelPath.endsWith('exercise-kettlebell-swing.mp3')),
    ).toBe(true);
  });

  it('--only start_321 gir kun de innspilte (short er TTS og matcher ikke)', () => {
    const tasks = buildTaskList(manifest, { only: 'start_321' });
    expect(tasks).toHaveLength(PERSONA_IDS.length);
    expect(tasks.every((t) => t.kind === 'recorded')).toBe(true);
    expect(tasks.every((t) => t.outputRelPath.endsWith('/start_321.mp3'))).toBe(true);
  });

  it('--only start_321_short gir én TTS-oppgave per persona med personaens korte 3-2-1-tekst', () => {
    // Oppgave B: short produseres i samme TTS-prosesseringskjede (v2) som de
    // andre cuene — ikke lenger klippet fra den innspilte kilden.
    const tasks = buildTaskList(manifest, { only: 'start_321_short' });
    expect(tasks).toHaveLength(PERSONA_IDS.length);
    expect(tasks.every((t) => t.kind === 'tts')).toBe(true);
    expect(tasks.every((t) => t.outputRelPath.endsWith('/start_321_short.mp3'))).toBe(true);
    const textByPersona = Object.fromEntries(
      tasks.map((t) => [t.personaId, t.kind === 'tts' ? t.text : null]),
    );
    // Teksten hentes fra manuskriptet, som er fasiten — en kopi her ville
    // bare vært et sted til å glemme å oppdatere.
    expect(textByPersona).toEqual(
      Object.fromEntries(
        PERSONA_IDS.map((id) => [id, manifest.personas[id].cues.start_321_short.text]),
      ),
    );
  });

  it('--skip-recorded utelater innspilte spor', () => {
    const tasks = buildTaskList(manifest, { skipRecorded: true });
    expect(tasks).toHaveLength(PERSONA_IDS.length * (OPPGAVER_PER_PERSONA - 1));
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
  it('har én innspilt kildefil per persona i manuskriptet', () => {
    // Ingen kilde uten persona, og ingen persona uten kilde — det er
    // relasjonen som betyr noe, ikke filnavnene.
    expect(Object.keys(RECORDED_SOURCES).sort()).toEqual([...PERSONA_IDS].sort());
  });

  it('innspilte oppgaver peker på riktig kildefil', () => {
    const recorded = buildTaskList(manifest, { only: 'start_321' });
    const t = recorded.find((x) => x.personaId === PERSONA_IDS[1]);
    expect(t && t.kind === 'recorded' ? t.sourceRelPath : null).toBe(
      RECORDED_SOURCES[PERSONA_IDS[1]],
    );
  });
});

describe('buildClonePayload', () => {
  it('bygger clone-payload med reference_audio_filename = seedFile (default norsk)', () => {
    const payload = buildClonePayload('Gje gass!', 'mintrener-seed-hardcore.wav');
    expect(payload).toEqual({
      text: 'Gje gass!',
      voice_mode: 'clone',
      reference_audio_filename: 'mintrener-seed-hardcore.wav',
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
  it('mountain-climbers bærer engelsk tekst og lang=en i alle personas', () => {
    const tasks = buildTaskList(manifest, { only: 'mountain-climbers' });
    expect(tasks).toHaveLength(PERSONA_IDS.length);
    for (const t of tasks) {
      expect(t.kind === 'tts' ? t.text : null).toBe('Mountain Climbers');
      expect(t.kind === 'tts' ? t.lang : null).toBe('en');
    }
  });

  it('alle andre TTS-oppgaver (cues og øvelser) er norske', () => {
    const others = buildTaskList(manifest, {}).filter(
      (t): t is TtsTask => t.kind === 'tts' && t.id !== 'mountain-climbers',
    );
    expect(others).toHaveLength(PERSONA_IDS.length * (OPPGAVER_PER_PERSONA - 2));
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
    const intro = tasks.find((t) => t.personaId === PERSONA_IDS[0] && t.id === 'intro');
    expect(intro && intro.kind === 'tts' ? intro.cacheRelPath : null).toBe(
      `audio/raw-cache/${PERSONA_IDS[0]}/intro.mp3`,
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
      '--dry-run', '--persona', PERSONA_IDS[0], '--only', 'intro', '--force', '--skip-recorded',
    ]);
    expect(opts).toEqual({
      dryRun: true,
      force: true,
      skipRecorded: true,
      reprocess: false,
      refetch: false,
      persona: PERSONA_IDS[0],
      only: 'intro',
    });
  });

  it('parser --reprocess', () => {
    expect(parseCliArgs(['--reprocess']).reprocess).toBe(true);
    expect(parseCliArgs(['--reprocess', '--persona', PERSONA_IDS[1]])).toMatchObject({
      reprocess: true,
      persona: PERSONA_IDS[1],
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
    personaId: PERSONA_IDS[0],
    id: 'intro',
    text: 'Trø te!',
    seedFile: 'mintrener-seed-hardcore.wav',
    outputRelPath: `public/audio/personas/${PERSONA_IDS[0]}/intro.mp3`,
    cacheRelPath: `audio/raw-cache/${PERSONA_IDS[0]}/intro.mp3`,
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

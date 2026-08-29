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
  buildFfmpegArgs,
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

const PERSONA_IDS = ['haugesund', 'romsdal', 'hardcore', 'boyband'];

describe('buildTaskList', () => {
  it('bygger full liste: 144 TTS-oppgaver + 4 innspilte = 148', () => {
    const tasks = buildTaskList(manifest, {});
    expect(tasks).toHaveLength(148);
    expect(tasks.filter((t) => t.kind === 'tts')).toHaveLength(144);
    expect(tasks.filter((t) => t.kind === 'recorded')).toHaveLength(4);
  });

  it('gir 37 oppgaver per persona (11 cues + 25 øvelser + 1 innspilt)', () => {
    for (const id of PERSONA_IDS) {
      const forPersona = buildTaskList(manifest, {}).filter((t) => t.personaId === id);
      expect(forPersona).toHaveLength(37);
    }
  });

  it('bruker ttsText (fonetisk), aldri displayText, for øvelser', () => {
    const tasks = buildTaskList(manifest, {});
    const burpees = tasks.find(
      (t) => t.personaId === 'haugesund' && t.id === 'burpees',
    );
    expect(burpees?.kind).toBe('tts');
    expect(burpees && burpees.kind === 'tts' ? burpees.text : null).toBe('Børpis');
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

  it('--persona filtrerer til én persona (36 TTS + 1 innspilt)', () => {
    const tasks = buildTaskList(manifest, { persona: 'haugesund' });
    expect(tasks).toHaveLength(37);
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

  it('--only start_321 gir kun de fire innspilte', () => {
    const tasks = buildTaskList(manifest, { only: 'start_321' });
    expect(tasks).toHaveLength(4);
    expect(tasks.every((t) => t.kind === 'recorded')).toBe(true);
  });

  it('--skip-recorded utelater innspilte spor (144 igjen)', () => {
    const tasks = buildTaskList(manifest, { skipRecorded: true });
    expect(tasks).toHaveLength(144);
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
  it('bygger clone-payload med reference_audio_filename = seedFile', () => {
    const payload = buildClonePayload('Gje gass!', 'mintrener-seed-haugesund.wav');
    expect(payload).toEqual({
      text: 'Gje gass!',
      voice_mode: 'clone',
      reference_audio_filename: 'mintrener-seed-haugesund.wav',
      language: 'no',
      output_format: 'mp3',
    });
  });
});

describe('buildFfmpegArgs', () => {
  it('inkluderer input, output, silenceremove, afade og loudnorm', () => {
    const args = buildFfmpegArgs('in.mp3', 'out.mp3');
    expect(args).toContain('in.mp3');
    expect(args[args.length - 1]).toBe('out.mp3');
    const filter = args[args.indexOf('-af') + 1] ?? '';
    expect(filter).toContain('silenceremove');
    expect(filter).toContain('afade');
    expect(filter).toContain('loudnorm=I=-16:TP=-1.5:LRA=11');
  });

  it('overskriver uten prompt og leser aldri stdin', () => {
    const args = buildFfmpegArgs('a.mp3', 'b.mp3');
    expect(args).toContain('-y');
    expect(args).toContain('-nostdin');
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
      persona: 'haugesund',
      only: 'intro',
    });
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

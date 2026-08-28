import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { AudioBufferEngine, computeSequenceSchedule } from '../audioBufferEngine';
import { audioService } from '../audioService';
import { audioDuckingService } from '../audioDuckingService';

// jsdom har ikke Web Audio – all kontakt med AudioContext mockes ved grensen
// via en smal strukturell mock som audioService.getContext() spionere returnerer.

interface MockSource {
  buffer: unknown;
  onended: (() => void) | null;
  connect: Mock;
  start: Mock;
  stop: Mock;
}

interface MockGain {
  gain: {
    value: number;
    setValueAtTime: Mock;
    setValueCurveAtTime: Mock;
    linearRampToValueAtTime: Mock;
    cancelScheduledValues: Mock;
  };
  connect: Mock;
  disconnect: Mock;
}

function createMockContext(durationsByUrl: Record<string, number>, currentTime = 10) {
  const sources: MockSource[] = [];
  const gains: MockGain[] = [];

  const ctx = {
    currentTime,
    state: 'running',
    destination: {},
    resume: vi.fn().mockResolvedValue(undefined),
    decodeAudioData: vi.fn(async (bytes: unknown) => {
      const tagged = bytes as { __url?: string };
      const duration = tagged.__url !== undefined ? durationsByUrl[tagged.__url] : undefined;
      if (duration === undefined) {
        throw new Error('Ukjent testbuffer');
      }
      return { duration };
    }),
    createBufferSource: vi.fn((): MockSource => {
      const source: MockSource = {
        buffer: null,
        onended: null,
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };
      sources.push(source);
      return source;
    }),
    createGain: vi.fn((): MockGain => {
      const gain: MockGain = {
        gain: {
          value: 1,
          setValueAtTime: vi.fn(),
          setValueCurveAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
          cancelScheduledValues: vi.fn(),
        },
        connect: vi.fn(),
        disconnect: vi.fn(),
      };
      gains.push(gain);
      return gain;
    }),
  };

  return { ctx, sources, gains };
}

function stubFetchOk(): Mock {
  const fetchMock = vi.fn(async (url: string) => ({
    ok: true,
    status: 200,
    arrayBuffer: async () => ({ __url: url }),
  }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('computeSequenceSchedule (ren funksjon)', () => {
  it('gir tom plan for tom input', () => {
    expect(computeSequenceSchedule([], 0.01, 5)).toEqual([]);
  });

  it('ett klipp: starter på startAt uten fades', () => {
    const plan = computeSequenceSchedule([2], 0.01, 5);
    expect(plan).toHaveLength(1);
    expect(plan[0].start).toBeCloseTo(5, 6);
    expect(plan[0].fadeIn).toBe(false);
    expect(plan[0].fadeOut).toBe(false);
  });

  it('to klipp: skjøt ved d0 - crossfade, fadeOut på første og fadeIn på andre', () => {
    const plan = computeSequenceSchedule([2, 3], 0.01, 10);
    expect(plan).toHaveLength(2);
    expect(plan[0].start).toBeCloseTo(10, 6);
    expect(plan[0].fadeIn).toBe(false);
    expect(plan[0].fadeOut).toBe(true);
    expect(plan[1].start).toBeCloseTo(11.99, 6);
    expect(plan[1].fadeIn).toBe(true);
    expect(plan[1].fadeOut).toBe(false);
  });

  it('tre klipp: midterste har både fadeIn og fadeOut', () => {
    const plan = computeSequenceSchedule([1, 2, 3], 0.05, 0);
    expect(plan).toHaveLength(3);
    expect(plan[0].start).toBeCloseTo(0, 6);
    expect(plan[1].start).toBeCloseTo(0.95, 6);
    expect(plan[2].start).toBeCloseTo(2.9, 6);
    expect(plan[0]).toMatchObject({ fadeIn: false, fadeOut: true });
    expect(plan[1]).toMatchObject({ fadeIn: true, fadeOut: true });
    expect(plan[2]).toMatchObject({ fadeIn: true, fadeOut: false });
  });

  it('null crossfade: klippene ligger kant i kant', () => {
    const plan = computeSequenceSchedule([2, 3], 0, 1);
    expect(plan[0].start).toBeCloseTo(1, 6);
    expect(plan[1].start).toBeCloseTo(3, 6);
  });
});

describe('AudioBufferEngine.preload', () => {
  let engine: AudioBufferEngine;

  beforeEach(() => {
    engine = new AudioBufferEngine();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('henter, dekoder og cacher manifestnøkler', async () => {
    const { ctx } = createMockContext({
      '/audio/exercises/burpees.mp3': 1.5,
      '/audio/exercises/planke.mp3': 2.0,
    });
    vi.spyOn(audioService, 'getContext').mockReturnValue(ctx as unknown as AudioContext);
    const fetchMock = stubFetchOk();

    await engine.preload(['exercise-burpees', 'exercise-planke']);

    expect(fetchMock).toHaveBeenCalledWith('/audio/exercises/burpees.mp3');
    expect(fetchMock).toHaveBeenCalledWith('/audio/exercises/planke.mp3');
    expect(engine.has('exercise-burpees')).toBe(true);
    expect(engine.has('exercise-planke')).toBe(true);
  });

  it('cacher direkte URL-nøkler (persona-cuer utenfor manifestet)', async () => {
    const url = '/audio/personas/hardcore/intro.mp3';
    const { ctx } = createMockContext({ [url]: 2.3 });
    vi.spyOn(audioService, 'getContext').mockReturnValue(ctx as unknown as AudioContext);
    const fetchMock = stubFetchOk();

    await engine.preload([url]);

    expect(fetchMock).toHaveBeenCalledWith(url);
    expect(engine.has(url)).toBe(true);
  });

  it('logger warn og hopper over ved fetch-feil – kaster aldri', async () => {
    const { ctx } = createMockContext({});
    vi.spyOn(audioService, 'getContext').mockReturnValue(ctx as unknown as AudioContext);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('offline');
    }));

    await expect(engine.preload(['exercise-burpees'])).resolves.toBeUndefined();

    expect(engine.has('exercise-burpees')).toBe(false);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('logger warn og hopper over nøkkel uten manifest-oppslag uten å fetche', async () => {
    const { ctx } = createMockContext({});
    vi.spyOn(audioService, 'getContext').mockReturnValue(ctx as unknown as AudioContext);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchMock = stubFetchOk();

    await engine.preload(['finnes-ikke']);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(engine.has('finnes-ikke')).toBe(false);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('dedupliserer samtidige preload-kall for samme nøkkel (én fetch)', async () => {
    const { ctx } = createMockContext({ '/audio/exercises/burpees.mp3': 1.5 });
    vi.spyOn(audioService, 'getContext').mockReturnValue(ctx as unknown as AudioContext);
    const fetchMock = stubFetchOk();

    const first = engine.preload(['exercise-burpees']);
    const second = engine.preload(['exercise-burpees']);
    await Promise.all([first, second]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(engine.has('exercise-burpees')).toBe(true);
  });

  it('re-fetcher ikke en nøkkel som allerede er cachet', async () => {
    const { ctx } = createMockContext({ '/audio/exercises/burpees.mp3': 1.5 });
    vi.spyOn(audioService, 'getContext').mockReturnValue(ctx as unknown as AudioContext);
    const fetchMock = stubFetchOk();

    await engine.preload(['exercise-burpees']);
    await engine.preload(['exercise-burpees']);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('AudioBufferEngine.playSequence / stop', () => {
  let engine: AudioBufferEngine;
  let duckStartSpy: Mock;
  let duckStopSpy: Mock;

  beforeEach(() => {
    engine = new AudioBufferEngine();
    duckStartSpy = vi.spyOn(audioDuckingService, 'startDucking').mockImplementation(() => {}) as unknown as Mock;
    duckStopSpy = vi.spyOn(audioDuckingService, 'stopDucking').mockImplementation(() => {}) as unknown as Mock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function preloadTwoClips(currentTime = 10) {
    const mock = createMockContext(
      {
        '/audio/exercises/burpees.mp3': 2.0,
        '/audio/exercises/planke.mp3': 3.0,
      },
      currentTime
    );
    vi.spyOn(audioService, 'getContext').mockReturnValue(mock.ctx as unknown as AudioContext);
    stubFetchOk();
    await engine.preload(['exercise-burpees', 'exercise-planke']);
    return mock;
  }

  it('returnerer false uten å skedulere noe når en nøkkel ikke er cachet', async () => {
    const { ctx } = await preloadTwoClips();

    const played = await engine.playSequence(['exercise-burpees', 'ukjent-nokkel']);

    expect(played).toBe(false);
    expect(ctx.createBufferSource).not.toHaveBeenCalled();
    expect(duckStartSpy).not.toHaveBeenCalled();
  });

  it('returnerer false for tom sekvens', async () => {
    await preloadTwoClips();
    await expect(engine.playSequence([])).resolves.toBe(false);
  });

  it('returnerer false uten å skedulere når konteksten ikke kan gjenopptas (WebKit interrupted)', async () => {
    // Skedulering på en frossen klokke ville gitt en kjede som aldri fullfører
    // og en annonsering som stille forsvinner uten å nå fallback-stiene
    const mock = await preloadTwoClips();
    mock.ctx.state = 'interrupted';
    mock.ctx.resume = vi.fn().mockRejectedValue(new Error('krever brukergest'));

    await expect(engine.playSequence(['exercise-burpees'])).resolves.toBe(false);

    expect(mock.ctx.createBufferSource).not.toHaveBeenCalled();
    expect(duckStartSpy).not.toHaveBeenCalled();
  });

  it('returnerer false når resume lykkes men konteksten fortsatt ikke kjører', async () => {
    const mock = await preloadTwoClips();
    mock.ctx.state = 'suspended';
    mock.ctx.resume = vi.fn().mockResolvedValue(undefined); // state forblir 'suspended'

    await expect(engine.playSequence(['exercise-burpees'])).resolves.toBe(false);
    expect(mock.ctx.createBufferSource).not.toHaveBeenCalled();
    expect(duckStartSpy).not.toHaveBeenCalled();
  });

  it('eksternt stop() i resume-vinduet vinner: ingenting skeduleres etterpå', async () => {
    // stop/skedulering er ikke atomisk over await ctx.resume() – et stop() som
    // treffer i det vinduet (f.eks. bruker pauser økten) skal hindre at kjeden
    // skeduleres i det hele tatt
    const mock = await preloadTwoClips();
    let releaseResume: () => void = () => {};
    mock.ctx.state = 'suspended';
    mock.ctx.resume = vi.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          releaseResume = () => {
            mock.ctx.state = 'running';
            resolve();
          };
        })
    );

    const pending = engine.playSequence(['exercise-burpees']);
    engine.stop(); // brukeren stopper mens konteksten gjenopptas
    releaseResume();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mock.ctx.createBufferSource).not.toHaveBeenCalled();
    expect(duckStartSpy).not.toHaveBeenCalled();
    // true = «bevisst stoppet» (samme kontrakt som stop() ellers) – kalleren
    // skal ikke spille fallback oppå et brukerinitiert stopp
    await expect(pending).resolves.toBe(true);
  });

  it('kobler fra gain-nodene deterministisk når kjeden er ferdigspilt', async () => {
    const { sources, gains } = await preloadTwoClips();

    const pending = engine.playSequence(['exercise-burpees', 'exercise-planke']);
    sources[1].onended?.();
    await expect(pending).resolves.toBe(true);

    gains.forEach((gain) => expect(gain.disconnect).toHaveBeenCalledTimes(1));
  });

  it('skedulerer kildene på beregnede tidspunkter med safety-lead', async () => {
    const { sources } = await preloadTwoClips(10);

    const pending = engine.playSequence(['exercise-burpees', 'exercise-planke']);

    expect(sources).toHaveLength(2);
    // Lead 0.03s: første klipp på 10.03, andre på 10.03 + 2.0 - 0.01 (crossfade)
    expect(sources[0].start).toHaveBeenCalledTimes(1);
    expect(sources[0].start.mock.calls[0][0]).toBeCloseTo(10.03, 6);
    expect(sources[1].start.mock.calls[0][0]).toBeCloseTo(12.02, 6);

    // Fullfør avspillingen slik at promiset løses
    sources[1].onended?.();
    await expect(pending).resolves.toBe(true);
  });

  it('legger equal-power fade kun i skjøten (ikke start av første / slutt av siste)', async () => {
    const { sources, gains } = await preloadTwoClips(10);

    const pending = engine.playSequence(['exercise-burpees', 'exercise-planke']);

    // Første klipp: ingen fade inn (flat gain fra start), fade ut i skjøten
    expect(gains[0].gain.setValueAtTime).toHaveBeenCalledWith(1, expect.closeTo(10.03, 6));
    expect(gains[0].gain.setValueCurveAtTime).toHaveBeenCalledTimes(1);
    const fadeOutCall = gains[0].gain.setValueCurveAtTime.mock.calls[0];
    expect(fadeOutCall[1]).toBeCloseTo(10.03 + 2.0 - 0.01, 6);
    expect(fadeOutCall[2]).toBeCloseTo(0.01, 6);

    // Andre klipp: fade inn i skjøten, ingen fade ut på slutten
    expect(gains[1].gain.setValueCurveAtTime).toHaveBeenCalledTimes(1);
    const fadeInCall = gains[1].gain.setValueCurveAtTime.mock.calls[0];
    expect(fadeInCall[1]).toBeCloseTo(12.02, 6);
    expect(fadeInCall[2]).toBeCloseTo(0.01, 6);

    sources[1].onended?.();
    await pending;
  });

  it('starter ducking ved kjedestart og stopper når siste kilde er ferdig', async () => {
    const { sources } = await preloadTwoClips();

    const pending = engine.playSequence(['exercise-burpees', 'exercise-planke']);
    expect(duckStartSpy).toHaveBeenCalledTimes(1);
    expect(duckStopSpy).not.toHaveBeenCalled();

    sources[1].onended?.();
    await expect(pending).resolves.toBe(true);
    expect(duckStopSpy).toHaveBeenCalledTimes(1);
  });

  it('stop() fader ut, stopper alle kilder og løser ventende promise', async () => {
    const { sources, gains } = await preloadTwoClips(10);

    const pending = engine.playSequence(['exercise-burpees', 'exercise-planke']);
    engine.stop(0.03);

    sources.forEach((source) => {
      expect(source.stop).toHaveBeenCalledTimes(1);
      // Ingen harde kutt: stop skjer etter fade-perioden
      expect(source.stop.mock.calls[0][0]).toBeCloseTo(10.03, 6);
    });
    gains.forEach((gain) => {
      expect(gain.gain.cancelScheduledValues).toHaveBeenCalled();
      expect(gain.gain.linearRampToValueAtTime).toHaveBeenCalled();
    });
    expect(duckStopSpy).toHaveBeenCalledTimes(1);
    await expect(pending).resolves.toBe(true);

    // Nedriggingen av grafen skjer først når ended-hendelsen fyrer etter faden
    sources[0].onended?.();
    expect(gains[0].disconnect).toHaveBeenCalledTimes(1);
  });

  it('ny sekvens stopper implisitt den pågående kjeden', async () => {
    const { sources } = await preloadTwoClips();

    const first = engine.playSequence(['exercise-burpees']);
    expect(sources).toHaveLength(1);

    const second = engine.playSequence(['exercise-planke']);
    expect(sources).toHaveLength(2);
    expect(sources[0].stop).toHaveBeenCalledTimes(1);
    await expect(first).resolves.toBe(true);

    sources[1].onended?.();
    await expect(second).resolves.toBe(true);
  });

  it('stop() uten aktiv kjede er ufarlig', () => {
    expect(() => engine.stop()).not.toThrow();
  });
});

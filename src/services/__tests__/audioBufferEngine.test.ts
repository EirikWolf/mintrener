import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { AudioBufferEngine, computeSequenceSchedule } from '../audioBufferEngine';
import { audioService } from '../audioService';
import { audioDuckingService } from '../audioDuckingService';
import { perfMonitorService } from '../perfMonitorService';

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

// Som stubFetchOk, men holder alle fetch-kall tilbake til release() – lar
// testene fryse en preload i "in flight"-tilstanden (eviksjon under dekoding).
function stubFetchDeferred(): { fetchMock: Mock; release: () => void } {
  let releaseGate!: () => void;
  const gate = new Promise<void>((resolve) => {
    releaseGate = resolve;
  });
  const fetchMock = vi.fn(async (url: string) => {
    await gate;
    return {
      ok: true,
      status: 200,
      arrayBuffer: async () => ({ __url: url }),
    };
  });
  vi.stubGlobal('fetch', fetchMock);
  return { fetchMock, release: releaseGate };
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

describe('AudioBufferEngine.getDuration (annonseringsprioritet, felttest-funn)', () => {
  // Directoren trenger fasit-varighet for å avgjøre om en endAt-forankret
  // grensekjede lar annonseringen få hodrom (ANNOUNCE_HEADROOM_S) — aldri
  // gjetning: ucachet nøkkel svarer null, og Directoren beholder da dagens
  // kaldstart-stige.
  let engine: AudioBufferEngine;

  beforeEach(() => {
    engine = new AudioBufferEngine();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  const fullKey = '/audio/personas/hardcore/start_321.mp3';

  it('returnerer buffer.duration for en cachet nøkkel', async () => {
    const { ctx } = createMockContext({ [fullKey]: 20.4 });
    vi.spyOn(audioService, 'getContext').mockReturnValue(ctx as unknown as AudioContext);
    stubFetchOk();

    await engine.preload([fullKey]);

    expect(engine.getDuration(fullKey)).toBe(20.4);
  });

  it('returnerer null for ucachet/ukjent nøkkel (aldri gjetning)', async () => {
    const { ctx } = createMockContext({ [fullKey]: 20.4 });
    vi.spyOn(audioService, 'getContext').mockReturnValue(ctx as unknown as AudioContext);
    stubFetchOk();

    expect(engine.getDuration(fullKey)).toBeNull();
    await engine.preload([fullKey]);
    expect(engine.getDuration('finnes-ikke')).toBeNull();
  });
});

describe('AudioBufferEngine.evict (BØR-2, β6)', () => {
  let engine: AudioBufferEngine;

  beforeEach(() => {
    engine = new AudioBufferEngine();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  const hcIntro = '/audio/personas/hardcore/intro.mp3';
  const bbIntro = '/audio/personas/boyband/intro.mp3';

  it('fjerner dekodede buffere for angitte nøkler og lar alle andre stå', async () => {
    const { ctx } = createMockContext({
      [hcIntro]: 2.0,
      [bbIntro]: 2.0,
      '/audio/exercises/burpees.mp3': 1.5,
    });
    vi.spyOn(audioService, 'getContext').mockReturnValue(ctx as unknown as AudioContext);
    stubFetchOk();
    await engine.preload([hcIntro, bbIntro, 'exercise-burpees']);

    engine.evict([hcIntro]);

    expect(engine.has(hcIntro)).toBe(false);
    // Andre personas buffere og delte studioklipp er urørt
    expect(engine.has(bbIntro)).toBe(true);
    expect(engine.has('exercise-burpees')).toBe(true);
  });

  it('re-preload etter eviksjon dekoder klippet på nytt (ny fetch)', async () => {
    const { ctx } = createMockContext({ [hcIntro]: 2.0 });
    vi.spyOn(audioService, 'getContext').mockReturnValue(ctx as unknown as AudioContext);
    const fetchMock = stubFetchOk();

    await engine.preload([hcIntro]);
    engine.evict([hcIntro]);
    await engine.preload([hcIntro]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(engine.has(hcIntro)).toBe(true);
  });

  it('nøkkel eviktet MENS dekodingen pågår lagres ikke når jobben fullfører', async () => {
    const { ctx } = createMockContext({ [hcIntro]: 2.0 });
    vi.spyOn(audioService, 'getContext').mockReturnValue(ctx as unknown as AudioContext);
    const { release } = stubFetchDeferred();

    const job = engine.preload([hcIntro]);
    engine.evict([hcIntro]); // persona-bytte før dekodingen rakk å fullføre
    release();
    await job;

    // Uten in-flight-håndtering ville den sene dekodingen re-akkumulert bufferen
    expect(engine.has(hcIntro)).toBe(false);
  });

  it('ny preload ETTER evict-under-dekoding gjenoppliver nøkkelen', async () => {
    const { ctx } = createMockContext({ [hcIntro]: 2.0 });
    vi.spyOn(audioService, 'getContext').mockReturnValue(ctx as unknown as AudioContext);
    const { fetchMock, release } = stubFetchDeferred();

    const first = engine.preload([hcIntro]);
    engine.evict([hcIntro]);
    // Brukeren byttet TILBAKE før dekodingen fullførte: fersk preload-intensjon
    // skal vinne over den ventende eviksjonen (og dedupe mot samme jobb).
    const second = engine.preload([hcIntro]);
    release();
    await Promise.all([first, second]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(engine.has(hcIntro)).toBe(true);
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

  it('A5: registrerer en lydavviks-stikkprøve hos perfMonitorService ved skedulering', async () => {
    const deviationSpy = vi.spyOn(perfMonitorService, 'recordAudioDeviation').mockImplementation(() => {});
    const { sources } = await preloadTwoClips(10);

    const pending = engine.playSequence(['exercise-burpees', 'exercise-planke']);

    // Mock-konteksten sin currentTime avanserer ikke under selve skeduleringen,
    // så avviket (proxy for hovedtråd-jank mellom skedulering og start()) skal
    // måles til ~0 her – se JSDoc i audioBufferEngine.playSequence.
    expect(deviationSpy).toHaveBeenCalledTimes(1);
    expect(deviationSpy.mock.calls[0][0]).toBeCloseTo(0, 6);

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

describe('AudioBufferEngine – tidsbro (setTimeBridge / toAudioTime)', () => {
  let engine: AudioBufferEngine;

  beforeEach(() => {
    engine = new AudioBufferEngine();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('setTimeBridge måler offset slik at toAudioTime = engineMs/1000 + offset', () => {
    const { ctx } = createMockContext({}, 100);
    vi.spyOn(audioService, 'getContext').mockReturnValue(ctx as unknown as AudioContext);

    engine.setTimeBridge(5000); // offset = ctx.currentTime(100) - 5000/1000 = 95

    expect(engine.toAudioTime(5000)).toBeCloseTo(100, 6);
    expect(engine.toAudioTime(6000)).toBeCloseTo(101, 6);
    expect(engine.toAudioTime(0)).toBeCloseTo(95, 6);
  });

  it('toAudioTime kaster hvis broen aldri er satt', () => {
    expect(() => engine.toAudioTime(1000)).toThrow();
  });

  it('Planrettelse 4 (fix 1): re-måling etter frossen ctx-klokke gir korrekte ankre igjen', () => {
    // Scenario: mid-økt-suspensjon fryser ctx.currentTime mens motorklokken
    // løper videre — den gamle broen ville gjort alle ankre permanent sene.
    const { ctx } = createMockContext({}, 10);
    vi.spyOn(audioService, 'getContext').mockReturnValue(ctx as unknown as AudioContext);

    engine.setTimeBridge(1000); // offset = 10 - 1 = 9
    expect(engine.toAudioTime(6000)).toBeCloseTo(15, 6); // gammel bro: 6 + 9

    // Motorklokken har løpt til 5000 ms; ctx.currentTime står fortsatt på 10.
    // Re-måling (Directoren gjør dette per fase) gir offset = 10 - 5 = 5.
    engine.setTimeBridge(5000);

    expect(engine.toAudioTime(5000)).toBeCloseTo(10, 6); // "nå" er nå
    expect(engine.toAudioTime(6000)).toBeCloseTo(11, 6); // 1 s frem — ikke 15
  });
});

describe('AudioBufferEngine.scheduleSequence (absolutt anker + tidsbro)', () => {
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
    vi.useRealTimers();
  });

  // ctx.currentTime = 10, motor-bro satt ved engineNowMs = 1000 (1s)
  // => offset = 10 - 1 = 9, altså toAudioTime(engineMs) = engineMs/1000 + 9.
  async function setupBridgedEngine(currentTime = 10, engineNowMs = 1000) {
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
    engine.setTimeBridge(engineNowMs);
    return mock;
  }

  it('endAt-anker: første kilde starter på toAudioTime(endAt) - kjedevarighet', async () => {
    const { sources } = await setupBridgedEngine();

    // chainDuration = 2.0 + 3.0 - 0.01*(2-1) = 4.99
    // toAudioTime(20000) = 20000/1000 + 9 = 29 => startAt = 29 - 4.99 = 24.01
    const pending = engine.scheduleSequence(['exercise-burpees', 'exercise-planke'], { endAt: 20000 });

    expect(sources).toHaveLength(2);
    expect(sources[0].start.mock.calls[0][0]).toBeCloseTo(24.01, 6);
    expect(sources[1].start.mock.calls[0][0]).toBeCloseTo(24.01 + 2.0 - 0.01, 6);

    sources[1].onended?.();
    await expect(pending).resolves.toBe(true);
  });

  it('startAt-anker: kilden starter på toAudioTime(startAt)', async () => {
    const { sources } = await setupBridgedEngine();

    // toAudioTime(15000) = 15 + 9 = 24
    const pending = engine.scheduleSequence(['exercise-burpees'], { startAt: 15000 });

    expect(sources).toHaveLength(1);
    expect(sources[0].start.mock.calls[0][0]).toBeCloseTo(24, 6);

    sources[0].onended?.();
    await expect(pending).resolves.toBe(true);
  });

  it('for trangt vindu: false uten å skedulere noe eller starte ducking', async () => {
    const { ctx } = await setupBridgedEngine();

    // toAudioTime(1020) = 1.02 + 9 = 10.02 < ctx.currentTime(10) + SCHEDULE_LEAD_S(0.03) = 10.03
    const played = await engine.scheduleSequence(['exercise-burpees'], { startAt: 1020 });

    expect(played).toBe(false);
    expect(ctx.createBufferSource).not.toHaveBeenCalled();
    expect(duckStartSpy).not.toHaveBeenCalled();
  });

  it('anker i fortiden: false uten sideeffekter', async () => {
    const { ctx } = await setupBridgedEngine();

    // toAudioTime(0) = 0 + 9 = 9, som ligger før ctx.currentTime (10)
    const played = await engine.scheduleSequence(['exercise-burpees'], { startAt: 0 });

    expect(played).toBe(false);
    expect(ctx.createBufferSource).not.toHaveBeenCalled();
    expect(duckStartSpy).not.toHaveBeenCalled();
  });

  it('ukjent nøkkel: false uten sideeffekter (samme kontrakt som playSequence)', async () => {
    const { ctx } = await setupBridgedEngine();

    const played = await engine.scheduleSequence(['exercise-burpees', 'ukjent'], { startAt: 15000 });

    expect(played).toBe(false);
    expect(ctx.createBufferSource).not.toHaveBeenCalled();
  });

  it('uten tidsbro: false uten sideeffekter (nekter å gjette anker)', async () => {
    const mock = createMockContext(
      { '/audio/exercises/burpees.mp3': 2.0 },
      10
    );
    vi.spyOn(audioService, 'getContext').mockReturnValue(mock.ctx as unknown as AudioContext);
    stubFetchOk();
    await engine.preload(['exercise-burpees']);
    // Ingen setTimeBridge()-kall her

    const played = await engine.scheduleSequence(['exercise-burpees'], { startAt: 15000 });

    expect(played).toBe(false);
    expect(mock.ctx.createBufferSource).not.toHaveBeenCalled();
  });

  it('stop() kansellerer en skedulert-men-ikke-startet kjede (epoch)', async () => {
    const { sources } = await setupBridgedEngine();

    const pending = engine.scheduleSequence(['exercise-burpees'], { startAt: 15000 });
    expect(sources).toHaveLength(1);

    engine.stop();

    expect(sources[0].stop).toHaveBeenCalledTimes(1);
    // Planrettelse 2: ducking er nå refcount-balansert per kjede. Denne kjeden
    // ble ALDRI hørbar (kansellert før startAt), så den rakk aldri å demme opp
    // duck-telleren – å kalle stopDucking her ville vært et FEILAKTIG unduck
    // dersom en annen kjede samtidig var hørbar. Se "duck-balanse"-testene under.
    expect(duckStopSpy).not.toHaveBeenCalled();
    await expect(pending).resolves.toBe(true);
  });

  it('en ny skedulert sekvens kansellerer IKKE en tidligere skedulert-men-ikke-startet kjede (Planrettelse 2: additiv)', async () => {
    // Gammel β1-kontrakt («ny sekvens kansellerer skedulert») er erstattet:
    // Directoren skedulerer FLERE samtidige kjeder (start_321/go/last5) i samme
    // fase, og scheduleSequence skal aldri stoppe noe – se flerkjedemodellen.
    const { sources } = await setupBridgedEngine();

    const first = engine.scheduleSequence(['exercise-burpees'], { startAt: 15000 });
    expect(sources).toHaveLength(1);

    const second = engine.scheduleSequence(['exercise-planke'], { startAt: 16000 });
    expect(sources).toHaveLength(2);
    expect(sources[0].stop).not.toHaveBeenCalled();

    sources[0].onended?.();
    await expect(first).resolves.toBe(true);
    sources[1].onended?.();
    await expect(second).resolves.toBe(true);
  });

  it('tre samtidige skedulerte kjeder skedulerer alle tre kilder (ingen kansellert)', async () => {
    const { sources } = await setupBridgedEngine();

    const a = engine.scheduleSequence(['exercise-burpees'], { startAt: 15000 });
    const b = engine.scheduleSequence(['exercise-planke'], { startAt: 16000 });
    const c = engine.scheduleSequence(['exercise-burpees'], { startAt: 17000 });

    expect(sources).toHaveLength(3);
    sources.forEach((s) => expect(s.stop).not.toHaveBeenCalled());

    sources.forEach((s) => s.onended?.());
    await expect(Promise.all([a, b, c])).resolves.toEqual([true, true, true]);
  });

  it('playSequence under en ventende skedulert kjede: den skedulerte overlever, kun den hørbare stoppes', async () => {
    const { sources } = await setupBridgedEngine();

    // Skedulert grensekjede (fremtid, ikke hørbar ennå)
    const scheduled = engine.scheduleSequence(['exercise-planke'], { startAt: 15000 });
    expect(sources).toHaveLength(1);

    // Reaktiv avspilling (f.eks. halfway-cue) – blir hørbar med det samme
    const played = engine.playSequence(['exercise-burpees']);
    expect(sources).toHaveLength(2);

    // Den skedulerte (ikke-hørbare) kjeden er urørt
    expect(sources[0].stop).not.toHaveBeenCalled();

    sources[0].onended?.();
    await expect(scheduled).resolves.toBe(true);
    sources[1].onended?.();
    await expect(played).resolves.toBe(true);
  });

  it('cancelScheduled() lar en hørbar kjede fortsette å spille', async () => {
    const { sources } = await setupBridgedEngine();

    const played = engine.playSequence(['exercise-burpees']);
    expect(sources).toHaveLength(1);

    const scheduled = engine.scheduleSequence(['exercise-planke'], { startAt: 15000 });
    expect(sources).toHaveLength(2);

    engine.cancelScheduled();

    // Skedulert (ikke-hørbar) kjede kansellert...
    expect(sources[1].stop).toHaveBeenCalledTimes(1);
    // ...men den hørbare fra playSequence er UPÅVIRKET
    expect(sources[0].stop).not.toHaveBeenCalled();

    await expect(scheduled).resolves.toBe(true);
    sources[0].onended?.();
    await expect(played).resolves.toBe(true);
  });

  it('stopAudible(): offentlig audible-only-stopp – hørbar kjede fades, skedulert kjede står (Planrettelse 3)', async () => {
    const { sources } = await setupBridgedEngine();

    const audible = engine.playSequence(['exercise-burpees']);
    const scheduled = engine.scheduleSequence(['exercise-planke'], { startAt: 15000 });
    expect(sources).toHaveLength(2);

    engine.stopAudible();

    expect(sources[0].stop).toHaveBeenCalledTimes(1);
    expect(sources[1].stop).not.toHaveBeenCalled();
    await expect(audible).resolves.toBe(true);

    sources[1].onended?.();
    await expect(scheduled).resolves.toBe(true);
  });

  it('duck-balanse: ingen prematurt unduck mens en annen kjede fortsatt er hørbar', async () => {
    vi.useFakeTimers();
    const { sources } = await setupBridgedEngine(10);

    // Kjede 1: hørbar med det samme (playSequence)
    const first = engine.playSequence(['exercise-burpees']);
    expect(duckStartSpy).toHaveBeenCalledTimes(1);

    // Kjede 2: skedulert til å bli hørbar 2s frem (startAt-anker gir toAudioTime
    // 2s etter ctx.currentTime=10, altså duck-timeren fyrer om 2000 ms)
    const second = engine.scheduleSequence(['exercise-planke'], { startAt: 3000 }); // toAudioTime(3000)=3+9=12
    await vi.advanceTimersByTimeAsync(2000);

    // Kjede 2 er nå også hørbar – ducking var allerede aktivt (refcount 1→2),
    // så startDucking skal IKKE kalles på nytt (bare på 0→1-overgangen).
    expect(duckStartSpy).toHaveBeenCalledTimes(1);

    // Kjede 1 avsluttes – kjede 2 er fortsatt hørbar, så INGEN unduck ennå.
    sources[0].onended?.();
    await expect(first).resolves.toBe(true);
    expect(duckStopSpy).not.toHaveBeenCalled();

    // Kjede 2 avsluttes – nå er ingen kjeder hørbare, unduck skal skje.
    sources[1].onended?.();
    await expect(second).resolves.toBe(true);
    expect(duckStopSpy).toHaveBeenCalledTimes(1);
  });

  // ---------------------------------------------------------------------------
  // Planrettelse 4 (fix 3): epoch-splitt. Kun stop() (og audible-stopp for
  // playSequence-familien) skal invalidere en sekvens som venter i resume-await;
  // en reaktiv cue (stopAudibleChains) skal ALDRI drepe en ventende
  // scheduleSequence — mens cancelScheduled() SKAL (skedulerte kjeder er nettopp
  // dens målgruppe, også de som ennå bare finnes som en pending await).
  // ---------------------------------------------------------------------------

  /** Fanger alle resume-promiser og gir én utløser som slipper dem samlet. */
  function deferResume(mock: { ctx: { state: string; resume: Mock } }): () => void {
    const resolvers: Array<() => void> = [];
    mock.ctx.state = 'suspended';
    mock.ctx.resume = vi.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolvers.push(resolve);
        })
    );
    return () => {
      mock.ctx.state = 'running';
      resolvers.splice(0).forEach((r) => r());
    };
  }

  it('epoch-splitt: reaktiv playSequence under scheduleSequence-resume-await dreper IKKE den skedulerte', async () => {
    // Krysskontamineringen fra samle-reviewen: playSequence sin stopAudibleChains
    // bumpet den GLOBALE epochen, så en scheduleSequence som ventet på resume ble
    // invalidert (true-svar → pip-fallback undertrykt → stillhet på grensen).
    const mock = await setupBridgedEngine();
    const release = deferResume(mock);

    const scheduled = engine.scheduleSequence(['exercise-planke'], { startAt: 15000 });
    const played = engine.playSequence(['exercise-burpees']); // reaktiv cue midt i vinduet

    release();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // BEGGE kjedene er skedulert: den skedulerte på sitt anker, den reaktive på nå+lead
    expect(mock.sources).toHaveLength(2);
    expect(mock.sources[0].start.mock.calls[0][0]).toBeCloseTo(24, 6); // toAudioTime(15000)
    expect(mock.sources[1].start.mock.calls[0][0]).toBeCloseTo(10.03, 6);

    mock.sources[0].onended?.();
    await expect(scheduled).resolves.toBe(true);
    mock.sources[1].onended?.();
    await expect(played).resolves.toBe(true);
  });

  it('epoch-splitt: cancelScheduled() i resume-await-vinduet kansellerer den ventende skedulerte kjeden', async () => {
    // cancelScheduled retter seg mot skedulerte kjeder — også en som bare finnes
    // som pending await ennå. true = «bevisst kansellert» (samme kontrakt som
    // silentCancelChain), så kalleren ikke spiller fallback oppå en kansellering.
    const mock = await setupBridgedEngine();
    const release = deferResume(mock);

    const pending = engine.scheduleSequence(['exercise-burpees'], { startAt: 15000 });
    engine.cancelScheduled();

    release();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mock.ctx.createBufferSource).not.toHaveBeenCalled();
    await expect(pending).resolves.toBe(true);
  });

  it('epoch-splitt: cancelScheduled() i resume-await-vinduet rører IKKE en ventende playSequence', async () => {
    const mock = await setupBridgedEngine();
    const release = deferResume(mock);

    const pending = engine.playSequence(['exercise-burpees']);
    engine.cancelScheduled();

    release();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mock.sources).toHaveLength(1);
    mock.sources[0].onended?.();
    await expect(pending).resolves.toBe(true);
  });

  it('epoch-splitt: fullt stop() i resume-await-vinduet vinner fortsatt over scheduleSequence', async () => {
    const mock = await setupBridgedEngine();
    const release = deferResume(mock);

    const pending = engine.scheduleSequence(['exercise-burpees'], { startAt: 15000 });
    engine.stop();

    release();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mock.ctx.createBufferSource).not.toHaveBeenCalled();
    await expect(pending).resolves.toBe(true);
  });

  it('anker uten finite tall (NaN/Infinity): false uten sideeffekter — rejecter aldri (review-punkt 3)', async () => {
    // Uten vakten ville NaN sluppet gjennom vindussjekken (NaN-sammenligninger
    // er false) og nådd source.start(NaN) → throw → reject i strid med kontrakten.
    const { ctx } = await setupBridgedEngine();

    const p1 = engine.scheduleSequence(['exercise-burpees'], { startAt: Number.NaN });
    const p2 = engine.scheduleSequence(['exercise-burpees'], { endAt: Number.POSITIVE_INFINITY });

    expect(ctx.createBufferSource).not.toHaveBeenCalled();
    await expect(p1).resolves.toBe(false);
    await expect(p2).resolves.toBe(false);
    expect(duckStartSpy).not.toHaveBeenCalled();
  });

  it('epoch-splitt: playSequence i resume-await invalideres når en skedulert kjede blir hørbar (nyeste stemme vinner)', async () => {
    // Pinner sideeffekten av becomeAudibleWithPreemption sitt audibleEpoch-bump:
    // en reaktiv sekvens som venter på ctx.resume() skal se seg forbigått av en
    // lookahead-kjede som når sitt startAt i vinduet — resolve true (bevisst
    // stoppet-kontrakten, fallback undertrykkes), ingenting ekstra skeduleres.
    vi.useFakeTimers();
    const mock = await setupBridgedEngine(10);

    // Skedulert kjede som blir hørbar om 2 s (toAudioTime(3000) = 12)
    const scheduled = engine.scheduleSequence(['exercise-planke'], { startAt: 3000 });
    expect(mock.sources).toHaveLength(1);

    // Reaktiv sekvens henger i resume-await
    let release: () => void = () => {};
    mock.ctx.state = 'suspended';
    mock.ctx.resume = vi.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          release = () => {
            mock.ctx.state = 'running';
            resolve();
          };
        })
    );
    const pending = engine.playSequence(['exercise-burpees']);

    await vi.advanceTimersByTimeAsync(2000); // lookahead-kjeden blir hørbar
    release();
    await vi.advanceTimersByTimeAsync(0);

    expect(mock.sources).toHaveLength(1); // den reaktive skedulerte aldri
    await expect(pending).resolves.toBe(true);

    mock.sources[0].onended?.();
    await expect(scheduled).resolves.toBe(true);
  });

  it('Planrettelse 4 (fix 4): skedulert kjede som når startAt preempter hørbar reaktiv kjede, søsken urørt', async () => {
    vi.useFakeTimers();
    const { sources } = await setupBridgedEngine(10);

    // Reaktiv kjede spiller (hørbar med det samme)
    const reactive = engine.playSequence(['exercise-burpees']);
    expect(duckStartSpy).toHaveBeenCalledTimes(1);

    // To skedulerte søsken: én når startAt om 2 s, én om 4 s
    const sched1 = engine.scheduleSequence(['exercise-planke'], { startAt: 3000 }); // toAudioTime=12
    const sched2 = engine.scheduleSequence(['exercise-burpees'], { startAt: 5000 }); // toAudioTime=14

    await vi.advanceTimersByTimeAsync(2000); // sched1 blir hørbar

    // Den reaktive kjeden er fade-stoppet («én stemme om gangen» også når
    // stemmen som starter er en lookahead-kjede)...
    expect(sources[0].stop).toHaveBeenCalledTimes(1);
    await expect(reactive).resolves.toBe(true);
    // ...men søsken-skedulerte kjeder lever videre (epoch-splitten: preempsjonen
    // bumper aldri scheduled-epochen)
    expect(sources[1].stop).not.toHaveBeenCalled();
    expect(sources[2].stop).not.toHaveBeenCalled();

    // Ingen duck-flap i byttet: refcounten var aldri 0 (markAudible før preempt)
    expect(duckStartSpy).toHaveBeenCalledTimes(1);
    expect(duckStopSpy).not.toHaveBeenCalled();

    sources[1].onended?.();
    await expect(sched1).resolves.toBe(true);
    // sched2 kansellert som opprydding — ikke en del av assertions over
    engine.stop();
    await expect(sched2).resolves.toBe(true);
  });

  it('stop() rydder duck-timere for ALLE skedulerte kjeder (ingen sen duck-start etter global stopp)', async () => {
    vi.useFakeTimers();
    const { sources } = await setupBridgedEngine(10);

    engine.scheduleSequence(['exercise-burpees'], { startAt: 3000 }); // toAudioTime=12
    engine.scheduleSequence(['exercise-planke'], { startAt: 4000 }); // toAudioTime=13
    expect(sources).toHaveLength(2);

    engine.stop();

    // Begge duck-timerne skal være ryddet av stop() – å spole forbi tidspunktene
    // de skulle fyrt på skal IKKE trigge ducking i ettertid.
    await vi.advanceTimersByTimeAsync(5000);
    expect(duckStartSpy).not.toHaveBeenCalled();
  });
});

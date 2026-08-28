import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTicker } from '../tickerService';

describe('tickerService – fallback (setInterval, uten Worker)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('kaller onTick med forventet kadens etter start()', () => {
    const onTick = vi.fn();
    const ticker = createTicker(onTick, 100);

    ticker.start();
    vi.advanceTimersByTime(350);

    expect(onTick).toHaveBeenCalledTimes(3);
  });

  it('stopper videre ticks etter stop()', () => {
    const onTick = vi.fn();
    const ticker = createTicker(onTick, 100);

    ticker.start();
    vi.advanceTimersByTime(100);
    ticker.stop();
    vi.advanceTimersByTime(500);

    expect(onTick).toHaveBeenCalledTimes(1);
  });

  it('dobbel start() dobler ikke tick-raten', () => {
    const onTick = vi.fn();
    const ticker = createTicker(onTick, 100);

    ticker.start();
    ticker.start();
    vi.advanceTimersByTime(300);

    expect(onTick).toHaveBeenCalledTimes(3);
  });

  it('stop() uten forutgående start() kaster ikke', () => {
    const onTick = vi.fn();
    const ticker = createTicker(onTick, 100);

    expect(() => ticker.stop()).not.toThrow();
  });
});

describe('tickerService – Worker-metronom', () => {
  class FakeWorker {
    static instances: FakeWorker[] = [];
    onmessage: ((event: { data: string }) => void) | null = null;
    onerror: ((event: unknown) => void) | null = null;
    postMessage = vi.fn();
    terminate = vi.fn();

    constructor(public url: URL, public options?: { type?: string }) {
      FakeWorker.instances.push(this);
    }
  }

  beforeEach(() => {
    FakeWorker.instances = [];
    vi.stubGlobal('Worker', FakeWorker);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('oppretter worker og sender start-melding med riktig intervall ved start()', () => {
    const onTick = vi.fn();
    const ticker = createTicker(onTick, 100);

    ticker.start();

    expect(FakeWorker.instances).toHaveLength(1);
    expect(FakeWorker.instances[0].postMessage).toHaveBeenCalledWith({
      cmd: 'start',
      intervalMs: 100,
    });
  });

  it('trigger onTick når worker sender en melding tilbake', () => {
    const onTick = vi.fn();
    const ticker = createTicker(onTick, 100);

    ticker.start();
    const worker = FakeWorker.instances[0];
    worker.onmessage?.({ data: 'tick' });
    worker.onmessage?.({ data: 'tick' });

    expect(onTick).toHaveBeenCalledTimes(2);
  });

  it('sender stopp-melding og terminerer worker ved stop()', () => {
    const onTick = vi.fn();
    const ticker = createTicker(onTick, 100);

    ticker.start();
    const worker = FakeWorker.instances[0];
    ticker.stop();

    expect(worker.postMessage).toHaveBeenCalledWith({ cmd: 'stop' });
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  it('worker konstrueres først ved start(), ikke ved createTicker()', () => {
    createTicker(vi.fn(), 100);

    expect(FakeWorker.instances).toHaveLength(0);
  });

  it('dobbel start() oppretter ikke en ny worker', () => {
    const ticker = createTicker(vi.fn(), 100);

    ticker.start();
    ticker.start();

    expect(FakeWorker.instances).toHaveLength(1);
  });

  it('konstruerer worker med en URL som peker mot timerTick.worker (regresjonsvern for sti)', () => {
    const ticker = createTicker(vi.fn(), 100);

    ticker.start();

    expect(FakeWorker.instances).toHaveLength(1);
    expect(FakeWorker.instances[0].url.toString()).toContain('timerTick.worker');
  });

  it('faller tilbake til setInterval hvis worker-oppretting feiler asynkront (onerror)', () => {
    vi.useFakeTimers();

    const onTick = vi.fn();
    const ticker = createTicker(onTick, 100);

    ticker.start();
    const worker = FakeWorker.instances[0];

    // Simuler asynkron feil (f.eks. stale PWA-utrulling der worker-chunken 404-er)
    worker.onerror?.(new Event('error'));

    expect(worker.terminate).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(250);
    expect(onTick).toHaveBeenCalledTimes(2);

    ticker.stop();
    vi.useRealTimers();
  });

  it('onerror etter stop() starter ikke en fallback-ticker', () => {
    vi.useFakeTimers();

    const onTick = vi.fn();
    const ticker = createTicker(onTick, 100);

    ticker.start();
    const worker = FakeWorker.instances[0];
    // Fang referansen til feilhåndtereren før stop() nuller den ut, for å simulere
    // en 'error'-hendelse som var i ferd med å avfyres idet stop() kjørte
    const errorHandler = worker.onerror;
    ticker.stop();
    onTick.mockClear();

    errorHandler?.(new Event('error'));
    vi.advanceTimersByTime(500);

    expect(onTick).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('faller tilbake til setInterval hvis worker-oppretting feiler', () => {
    class ThrowingWorker {
      constructor() {
        throw new Error('Worker ikke tilgjengelig i dette miljøet');
      }
    }
    vi.stubGlobal('Worker', ThrowingWorker);
    vi.useFakeTimers();

    const onTick = vi.fn();
    const ticker = createTicker(onTick, 100);

    expect(() => ticker.start()).not.toThrow();
    vi.advanceTimersByTime(250);
    expect(onTick).toHaveBeenCalledTimes(2);

    ticker.stop();
    vi.useRealTimers();
  });
});

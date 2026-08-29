import { describe, it, expect, afterEach, vi } from 'vitest';
import { PerfMonitorService, percentile } from '../perfMonitorService';

// jsdom selv definerer ikke PerformanceObserver. I vitest sitt jsdom-miljø er Node
// sin egen globale PerformanceObserver (perf_hooks) likevel synlig, men dens
// supportedEntryTypes mangler 'longtask' – begge tilfellene er reelle degraderings-
// scenarioer (jsdom uten global, og et miljø med global men uten støtte for typen),
// og tjenesten skal aldri kaste i noen av dem, kun rapportere
// longTaskMonitoringSupported=false og longTaskCount=0.

describe('percentile (ren funksjon)', () => {
  it('tomt array gir 0 (kalleren mapper til null via audioSampleCount, se PerfSessionReport)', () => {
    expect(percentile([], 95)).toBe(0);
  });

  it('ett enkelt element gis uansett p', () => {
    expect(percentile([42], 0)).toBe(42);
    expect(percentile([42], 50)).toBe(42);
    expect(percentile([42], 100)).toBe(42);
  });

  it('nearest-rank: p50 på [10,20,30,40] gir 20', () => {
    expect(percentile([10, 20, 30, 40], 50)).toBe(20);
  });

  it('nearest-rank: p95 på [10,20,30,40] gir 40 (høyeste rangert innenfor grensen)', () => {
    expect(percentile([10, 20, 30, 40], 95)).toBe(40);
  });

  it('sorterer input selv om den kommer uordnet', () => {
    expect(percentile([40, 10, 30, 20], 50)).toBe(20);
  });

  it('p95 på 1..100 gir 95 (nearest-rank-definisjonen)', () => {
    const values = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(percentile(values, 95)).toBe(95);
  });
});

describe('PerfMonitorService – øktlivssyklus', () => {
  let service: PerfMonitorService;

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('stopWorkoutMonitoring uten forutgående start returnerer null', () => {
    service = new PerfMonitorService();
    expect(service.stopWorkoutMonitoring()).toBeNull();
  });

  it('start + stopp uten noen samples gir en gyldig rapport med nullverdier', () => {
    service = new PerfMonitorService();
    service.startWorkoutMonitoring();
    const report = service.stopWorkoutMonitoring();

    expect(report).not.toBeNull();
    expect(report?.longTaskCount).toBe(0);
    expect(report?.longTasksPerMinute).toBe(0);
    expect(report?.audioDeviationP95Ms).toBeNull();
    expect(report?.audioSampleCount).toBe(0);
    expect(report?.durationMinutes).toBeGreaterThanOrEqual(0);
  });

  it('avbrutt økt (reset) kan stoppes umiddelbart uten å kaste – gir en rapport kalleren kan velge å ikke rapportere', () => {
    service = new PerfMonitorService();
    service.startWorkoutMonitoring();
    expect(() => service.stopWorkoutMonitoring()).not.toThrow();
  });

  it('stopWorkoutMonitoring returnerer null ved andre kall (økten er allerede avsluttet)', () => {
    service = new PerfMonitorService();
    service.startWorkoutMonitoring();
    service.stopWorkoutMonitoring();
    expect(service.stopWorkoutMonitoring()).toBeNull();
  });

  it('degraderer stille når longtask ikke er en støttet entry-type (jsdom/Node-standard): ingen throw, supported=false', () => {
    // jsdom selv har ingen PerformanceObserver; Node sin egen globale
    // PerformanceObserver (perf_hooks, synlig i vitest sitt jsdom-miljø) har
    // 'longtask' fraværende fra supportedEntryTypes – begge tilfeller skal
    // gi samme trygge degradering.
    expect(PerformanceObserver.supportedEntryTypes ?? []).not.toContain('longtask');
    service = new PerfMonitorService();

    expect(() => service.startWorkoutMonitoring()).not.toThrow();
    const report = service.stopWorkoutMonitoring();

    expect(report?.longTaskMonitoringSupported).toBe(false);
    expect(report?.longTaskCount).toBe(0);
  });
});

describe('PerfMonitorService – long tasks (mocket PerformanceObserver)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  class FakePerformanceObserver {
    static supportedEntryTypes = ['longtask'];
    static instances: FakePerformanceObserver[] = [];
    public disconnectSpy = vi.fn();
    constructor(public callback: (list: { getEntries: () => { duration: number }[] }) => void) {
      FakePerformanceObserver.instances.push(this);
    }
    observe() {
      // ingen-op: testen trigger callback manuelt
    }
    disconnect() {
      this.disconnectSpy();
    }
  }

  it('teller long-task-entries og summerer dem i rapporten', () => {
    FakePerformanceObserver.instances = [];
    vi.stubGlobal('PerformanceObserver', FakePerformanceObserver);

    const service = new PerfMonitorService();
    service.startWorkoutMonitoring();

    const observer = FakePerformanceObserver.instances[0];
    expect(observer).toBeDefined();
    observer.callback({ getEntries: () => [{ duration: 60 }, { duration: 75 }] });
    observer.callback({ getEntries: () => [{ duration: 90 }] });

    const report = service.stopWorkoutMonitoring();
    expect(report?.longTaskCount).toBe(3);
    expect(report?.longTaskMonitoringSupported).toBe(true);
    expect(observer.disconnectSpy).toHaveBeenCalled();
  });

  it('kobler fra observeren når økten stoppes, slik at ingen entries telles etterpå', () => {
    FakePerformanceObserver.instances = [];
    vi.stubGlobal('PerformanceObserver', FakePerformanceObserver);

    const service = new PerfMonitorService();
    service.startWorkoutMonitoring();
    const observer = FakePerformanceObserver.instances[0];
    service.stopWorkoutMonitoring();
    expect(observer.disconnectSpy).toHaveBeenCalledTimes(1);

    // Kall etter disconnect skal ikke kunne skje i praksis, men verifiser at
    // en påfølgende økt starter tellingen på nytt fra 0 uansett
    service.startWorkoutMonitoring();
    const report = service.stopWorkoutMonitoring();
    expect(report?.longTaskCount).toBe(0);
  });
});

describe('PerfMonitorService – lydavviks-stikkprøver', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('recordAudioDeviation uten aktiv økt er et trygt no-op', () => {
    const service = new PerfMonitorService();
    expect(() => service.recordAudioDeviation(12)).not.toThrow();
    service.startWorkoutMonitoring();
    const report = service.stopWorkoutMonitoring();
    expect(report?.audioSampleCount).toBe(0);
  });

  it('samler stikkprøver under en aktiv økt og beregner p95', () => {
    const service = new PerfMonitorService();
    service.startWorkoutMonitoring();
    [5, 10, 15, 20].forEach((ms) => service.recordAudioDeviation(ms));
    const report = service.stopWorkoutMonitoring();

    expect(report?.audioSampleCount).toBe(4);
    expect(report?.audioDeviationP95Ms).toBe(20);
  });

  it('begrenser stikkprøvene til 200 for å avgrense minnebruk', () => {
    const service = new PerfMonitorService();
    service.startWorkoutMonitoring();
    for (let i = 1; i <= 250; i++) {
      service.recordAudioDeviation(i);
    }
    const report = service.stopWorkoutMonitoring();

    expect(report?.audioSampleCount).toBe(200);
    // De 200 første stikkprøvene er 1..200 (senere prøver ignoreres bevisst,
    // se JSDoc i recordAudioDeviation) – p95 (nearest-rank) av det er 190.
    expect(report?.audioDeviationP95Ms).toBe(190);
  });
});

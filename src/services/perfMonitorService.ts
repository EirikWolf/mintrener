/**
 * Ytelsesovervåking for treningsøkter (audit § 9.4/§ 7.3, Oppgave A5).
 *
 * Brakketterer én treningsøkt (startWorkoutMonitoring → stopWorkoutMonitoring)
 * og måler de to tallene Q1-scorekortet trenger:
 *
 *  1. Long tasks per treningsminutt (mål: < 1/min) – bevis for at render-
 *     gating (A3) + AudioBuffer-motoren (§4.1/6.1) fjernet hovedtråd-jank på
 *     ekte enheter. Baseres på `PerformanceObserver({ type: 'longtask' })`.
 *  2. Fasetoverganger-lydavvik (mål: p95 < 20 ms) – skedulert vs. faktisk
 *     cue-avspilling i AudioBuffer-motoren. Selve målingen skjer i
 *     audioBufferEngine.playSequence (se JSDoc der for proxyens semantikk);
 *     denne tjenesten samler kun inn stikkprøvene via `recordAudioDeviation`.
 *
 * Degraderer ALLTID stille (kaster aldri) når `PerformanceObserver`/'longtask'
 * mangler i miljøet (jsdom, Safari uten flagget) – tjenesten er en ren
 * målemekanisme og skal, som telemetryService, aldri kunne velte
 * kjerneopplevelsen.
 */

// Grense på antall lydavviks-stikkprøver holdt i minnet per økt. De første
// MAX_AUDIO_SAMPLES stikkprøvene i økten beholdes bevisst (ikke et glidende
// vindu) – enkelt, forutsigbart minneforbruk, og p95 over de første ~200
// faseovergangene er en representativ nok proxy for hele økten.
const MAX_AUDIO_SAMPLES = 200;

export interface PerfSessionReport {
  /** Øktens varighet i minutter, fra startWorkoutMonitoring til stopWorkoutMonitoring. */
  durationMinutes: number;
  /** Antall registrerte 'longtask'-entries i økten (0 hvis miljøet mangler støtte). */
  longTaskCount: number;
  /** longTaskCount normalisert per treningsminutt. 0 hvis økten varte ~0 minutter. */
  longTasksPerMinute: number;
  /** p95 av registrerte lydavvik i ms, eller null hvis ingen stikkprøver ble tatt. */
  audioDeviationP95Ms: number | null;
  /** Antall lydavviks-stikkprøver denne rapporten bygger på (maks MAX_AUDIO_SAMPLES). */
  audioSampleCount: number;
  /** Om PerformanceObserver('longtask') var tilgjengelig i dette miljøet ved øktstart. */
  longTaskMonitoringSupported: boolean;
}

/**
 * Ren persentil-hjelper (nearest-rank-metoden): sorterer stigende og velger
 * det `ceil(p/100 * n)`-te elementet (1-indeksert), klemt til gyldig indeks.
 *
 * Tomt array gir 0 – IKKE null. `null` som "ingen data"-signal håndteres ett
 * nivå opp, i `stopWorkoutMonitoring`, som eksplisitt mapper
 * `audioDeviationP95Ms` til `null` når `audioSampleCount === 0`. Denne rene
 * funksjonen trenger derfor ikke bære det unionstypen selv.
 */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length);
  const index = Math.min(Math.max(rank - 1, 0), sorted.length - 1);
  return sorted[index];
}

function detectLongTaskSupport(): boolean {
  try {
    return (
      typeof PerformanceObserver !== 'undefined' &&
      Array.isArray(PerformanceObserver.supportedEntryTypes) &&
      PerformanceObserver.supportedEntryTypes.includes('longtask')
    );
  } catch {
    return false;
  }
}

export class PerfMonitorService {
  private active = false;
  private startedAtMs = 0;
  private longTaskCount = 0;
  private audioSamples: number[] = [];
  private observer: PerformanceObserver | null = null;
  private readonly supported: boolean;

  constructor() {
    this.supported = detectLongTaskSupport();
  }

  /**
   * Starter måling for én treningsøkt. Nullstiller tellere/stikkprøver fra
   * en eventuell forrige økt. Trygt å kalle selv om long-task-støtte mangler.
   */
  public startWorkoutMonitoring(): void {
    this.active = true;
    this.startedAtMs = performance.now();
    this.longTaskCount = 0;
    this.audioSamples = [];
    this.disconnectObserver();

    if (!this.supported) return;
    try {
      this.observer = new PerformanceObserver((list) => {
        this.longTaskCount += list.getEntries().length;
      });
      this.observer.observe({ type: 'longtask', buffered: false });
    } catch {
      // Miljøet hevdet støtte (supportedEntryTypes), men observe() feilet
      // likevel – degrader stille til no-op for long-task-metrikken.
      this.observer = null;
    }
  }

  /**
   * Avslutter måling og returnerer øktrapporten, eller `null` hvis
   * `startWorkoutMonitoring` aldri ble kalt (eller allerede er stoppet).
   *
   * Kalleren avgjør selv om rapporten skal sendes videre til telemetri –
   * en avbrutt økt (resetWorkout) kaller denne og forkaster returverdien
   * bevisst, uten å rapportere.
   */
  public stopWorkoutMonitoring(): PerfSessionReport | null {
    if (!this.active) return null;
    this.active = false;
    this.disconnectObserver();

    const durationMinutes = (performance.now() - this.startedAtMs) / 60000;
    const audioSampleCount = this.audioSamples.length;

    return {
      durationMinutes,
      longTaskCount: this.longTaskCount,
      longTasksPerMinute: durationMinutes > 0 ? this.longTaskCount / durationMinutes : 0,
      audioDeviationP95Ms: audioSampleCount > 0 ? percentile(this.audioSamples, 95) : null,
      audioSampleCount,
      longTaskMonitoringSupported: this.supported,
    };
  }

  /**
   * Registrerer én lydavviks-stikkprøve i ms (se JSDoc i
   * audioBufferEngine.playSequence for proxyens semantikk). No-op utenfor en
   * aktiv økt eller når MAX_AUDIO_SAMPLES-grensen er nådd, slik at
   * lydmotoren aldri trenger å vite om overvåking pågår, eller kaste ved
   * overflow.
   */
  public recordAudioDeviation(deviationMs: number): void {
    if (!this.active) return;
    if (this.audioSamples.length >= MAX_AUDIO_SAMPLES) return;
    this.audioSamples.push(deviationMs);
  }

  private disconnectObserver(): void {
    if (!this.observer) return;
    try {
      this.observer.disconnect();
    } catch {
      // Allerede frakoblet – ufarlig
    }
    this.observer = null;
  }
}

export const perfMonitorService = new PerfMonitorService();

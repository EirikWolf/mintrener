// AudioBuffer-motor for stemmeklipp (rotårsaks-fiks for hakkete tale, revisjon § 4.1/6.1).
// HTMLAudioElement gir 20-200 ms ikke-deterministisk startlatens og kan ikke skedulere
// frem i tid; her dekodes klippene til AudioBuffere én gang og spilles via
// AudioBufferSourceNode med sample-nøyaktige skjøter på appens felles AudioContext.
// AudioWorklet/Wasm er bevisst utelatt – ren buffer-skedulering er tilstrekkelig.

import { audioService } from './audioService';
import { audioDuckingService } from './audioDuckingService';
import rawManifest from '../data/audioManifest.json';

const AUDIO_MANIFEST: Record<string, string> = rawManifest as Record<string, string>;

// 10 ms crossfade skjuler skjøten uten å bli hørbar som overlapp
const DEFAULT_CROSSFADE_S = 0.01;
// Liten ledetid slik at alle kildene rekker å bli skedulert FØR første start-tidspunkt
const SCHEDULE_LEAD_S = 0.03;
// Kort fade ved stopp i stedet for harde kutt midt i et ord
const DEFAULT_STOP_FADE_S = 0.03;
const FADE_CURVE_STEPS = 32;

export interface SequenceScheduleEntry {
  start: number;
  fadeIn: boolean;
  fadeOut: boolean;
}

/**
 * Ren skeduleringsmatte for en klippkjede: klipp i+1 starter ved
 * `start_i + varighet_i - crossfade` slik at skjøtene overlapper akkurat
 * fade-vinduet. Fade kun i skjøtene – aldri ved kjedens start eller slutt.
 */
export function computeSequenceSchedule(
  durations: number[],
  crossfadeS: number,
  startAt: number
): SequenceScheduleEntry[] {
  const schedule: SequenceScheduleEntry[] = [];
  let cursor = startAt;
  for (let i = 0; i < durations.length; i++) {
    schedule.push({
      start: cursor,
      fadeIn: i > 0,
      fadeOut: i < durations.length - 1,
    });
    cursor += durations[i] - crossfadeS;
  }
  return schedule;
}

/**
 * Equal-power-kurve (sin/cos) – konstant opplevd lydtrykk gjennom crossfaden,
 * i motsetning til lineære ramper som gir et hørbart "dupp" midt i skjøten.
 */
function equalPowerCurve(rising: boolean): Float32Array {
  const curve = new Float32Array(FADE_CURVE_STEPS);
  for (let i = 0; i < FADE_CURVE_STEPS; i++) {
    const theta = (i / (FADE_CURVE_STEPS - 1)) * (Math.PI / 2);
    curve[i] = rising ? Math.sin(theta) : Math.cos(theta);
  }
  return curve;
}

interface ChainNode {
  source: AudioBufferSourceNode;
  gain: GainNode;
}

interface ActiveChain {
  nodes: ChainNode[];
  resolve: (played: boolean) => void;
}

export class AudioBufferEngine {
  private buffers = new Map<string, AudioBuffer>();
  // Pågående fetch/dekoding per nøkkel – hindrer dobbel nedlasting ved samtidige preload-kall
  private inFlight = new Map<string, Promise<void>>();
  private activeChain: ActiveChain | null = null;
  // Teller opp for hvert stop() slik at en sekvens som venter på ctx.resume()
  // kan oppdage at et stopp (eksternt, eller fra en nyere sekvens) traff i
  // await-vinduet – stop/skedulering er ellers ikke atomisk over den awaiten
  private stopEpoch = 0;

  public has(key: string): boolean {
    return this.buffers.has(key);
  }

  /**
   * Forhåndsdekoder klipp til AudioBuffere. Feil logges og hoppes over – preload
   * er en optimalisering og skal aldri velte kalleren (avspilling har egne fallbacks).
   */
  public preload(keys: string[]): Promise<void> {
    return Promise.all(keys.map((key) => this.preloadOne(key))).then(() => undefined);
  }

  private preloadOne(key: string): Promise<void> {
    if (this.buffers.has(key)) return Promise.resolve();
    const pending = this.inFlight.get(key);
    if (pending) return pending;

    // Nøkler utenfor manifestet tolkes som direkte URL-er (persona-cuer ligger
    // under /audio/personas/ og har ingen manifestoppføring)
    const url = AUDIO_MANIFEST[key] ?? (key.startsWith('/') ? key : undefined);
    if (!url) {
      console.warn(`AudioBufferEngine: ukjent lydnøkkel "${key}" – hopper over preload`);
      return Promise.resolve();
    }

    const job = this.fetchAndDecode(key, url).finally(() => {
      this.inFlight.delete(key);
    });
    this.inFlight.set(key, job);
    return job;
  }

  private async fetchAndDecode(key: string, url: string): Promise<void> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const bytes = await response.arrayBuffer();
      const buffer = await audioService.getContext().decodeAudioData(bytes);
      this.buffers.set(key, buffer);
    } catch (err) {
      console.warn(`AudioBufferEngine: kunne ikke dekode "${key}" (${url}):`, err);
    }
  }

  /**
   * Spiller 1..n cachede klipp som ÉN sample-nøyaktig kjede med equal-power
   * crossfade i skjøtene. Returnerer false (uten å spille noe) hvis noen nøkkel
   * mangler i cachen ELLER konteksten ikke lar seg kjøre, slik at kalleren kan
   * bruke sin eksisterende fallback-sti. Promiset løses når siste kilde er
   * ferdig (eller kjeden stoppes) – det rejecter aldri.
   */
  public async playSequence(keys: string[], opts?: { crossfadeS?: number }): Promise<boolean> {
    const buffers: AudioBuffer[] = [];
    for (const key of keys) {
      const buffer = this.buffers.get(key);
      if (!buffer) return false;
      buffers.push(buffer);
    }
    if (buffers.length === 0) return false;

    this.stop();

    const ctx = audioService.getContext();
    if (ctx.state !== 'running') {
      const epochBeforeResume = this.stopEpoch;
      try {
        await ctx.resume();
      } catch {
        // Avgjøres av state-sjekken under
      }
      // Skedulering på en kontekst som ikke kjører (suspended, eller WebKits
      // 'interrupted' etter f.eks. telefonsamtale) ville skjedd på en frossen
      // klokke: onended fyrer aldri, promiset henger og annonseringen forsvinner
      // stille uten å nå fallback. Da er false + kallerens fallback riktig.
      // (Assertion til full union: TS narrower ellers bort 'running' over awaiten
      // og tror sammenligningen er umulig – resume() kan faktisk ha endret state.)
      if ((ctx.state as AudioContextState) !== 'running') return false;
      // Et stop() traff mens vi ventet på resume (brukeren pauset, eller en
      // nyere sekvens tok over): den nyeste intensjonen vinner, så vi skedulerer
      // ingenting. true = «bevisst stoppet» – samme kontrakt som stop() på en
      // spilt kjede, slik at kallere ikke spiller fallback oppå et stopp.
      if (this.stopEpoch !== epochBeforeResume) return true;
    }

    const crossfadeS = opts?.crossfadeS ?? DEFAULT_CROSSFADE_S;
    const schedule = computeSequenceSchedule(
      buffers.map((b) => b.duration),
      crossfadeS,
      ctx.currentTime + SCHEDULE_LEAD_S
    );
    const nodes = buffers.map((buffer, i) => this.scheduleClip(ctx, buffer, schedule[i], crossfadeS));

    audioDuckingService.startDucking();
    return new Promise<boolean>((resolve) => {
      const chain: ActiveChain = { nodes, resolve };
      this.activeChain = chain;
      nodes[nodes.length - 1].source.onended = () => {
        this.disconnectNodes(nodes);
        this.finishChain(chain, true);
      };
    });
  }

  // Deterministisk nedrigging av grafen (i stedet for GC-styrt opprydding)
  private disconnectNodes(nodes: ChainNode[]): void {
    nodes.forEach(({ gain }) => {
      try {
        gain.disconnect();
      } catch {
        // Allerede frakoblet
      }
    });
  }

  private scheduleClip(
    ctx: AudioContext,
    buffer: AudioBuffer,
    entry: SequenceScheduleEntry,
    crossfadeS: number
  ): ChainNode {
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    source.connect(gain);
    gain.connect(ctx.destination);

    if (entry.fadeIn && crossfadeS > 0) {
      gain.gain.setValueCurveAtTime(equalPowerCurve(true), entry.start, crossfadeS);
    } else {
      gain.gain.setValueAtTime(1, entry.start);
    }
    // Fade-ut kun når klippet er langt nok til at kurvene ikke overlapper
    if (entry.fadeOut && crossfadeS > 0 && buffer.duration > crossfadeS * 2) {
      gain.gain.setValueCurveAtTime(
        equalPowerCurve(false),
        entry.start + buffer.duration - crossfadeS,
        crossfadeS
      );
    }

    source.start(entry.start);
    return { source, gain };
  }

  private finishChain(chain: ActiveChain, played: boolean): void {
    if (this.activeChain === chain) {
      this.activeChain = null;
      audioDuckingService.stopDucking();
    }
    chain.resolve(played);
  }

  /**
   * Fader ut og stopper pågående kjede (inkludert ennå-ikke-startede, skedulerte
   * kilder). Løser kjedens promise med true – klippet HAR spilt, så kallere skal
   * ikke trigge fallback-stiene sine oppå en bevisst avbrutt avspilling.
   */
  public stop(fadeOutS = DEFAULT_STOP_FADE_S): void {
    // Teller alltid – også uten aktiv kjede – slik at en sekvens midt i
    // resume-vinduet ser stoppet (se stopEpoch-kommentaren over)
    this.stopEpoch++;
    const chain = this.activeChain;
    if (!chain) return;

    const now = audioService.getContext().currentTime;
    chain.nodes.forEach(({ source, gain }) => {
      try {
        // Riv ned grafen først når fade-perioden er over (ended-hendelsen etter
        // source.stop) – umiddelbar disconnect ville kuttet faden hardt
        source.onended = () => {
          try {
            gain.disconnect();
          } catch {
            // Allerede frakoblet
          }
        };
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0.0001, now + fadeOutS);
        source.stop(now + fadeOutS);
      } catch {
        // Kilden kan allerede være stoppet – ufarlig
      }
    });
    this.finishChain(chain, true);
  }
}

export const audioBufferEngine = new AudioBufferEngine();

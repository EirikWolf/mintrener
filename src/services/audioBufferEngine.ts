// AudioBuffer-motor for stemmeklipp (rotårsaks-fiks for hakkete tale, revisjon § 4.1/6.1).
// HTMLAudioElement gir 20-200 ms ikke-deterministisk startlatens og kan ikke skedulere
// frem i tid; her dekodes klippene til AudioBuffere én gang og spilles via
// AudioBufferSourceNode med sample-nøyaktige skjøter på appens felles AudioContext.
// AudioWorklet/Wasm er bevisst utelatt – ren buffer-skedulering er tilstrekkelig.

import { audioService } from './audioService';
import { audioDuckingService } from './audioDuckingService';
import { perfMonitorService } from './perfMonitorService';
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
  // true når kjeden faktisk er hørbar (spilling startet, ikke avsluttet).
  // scheduleSequence-kjeder starter false og blir hørbare via duckTimer;
  // playSequence-kjeder settes hørbare synkront (lead-tiden er neglisjerbar).
  // Styrer BÅDE hvem stopAudibleChains()/cancelScheduled() rører (Planrettelse
  // 2: flerkjedemodellen – "ny sekvens kansellerer planlagt" holdt ikke når
  // Directoren skedulerer flere samtidige kjeder i samme fase) OG duck-refcounten.
  audible: boolean;
  // Kun satt for kjeder som ikke er hørbare ennå: fyrer markAudible() ved
  // beregnet avspillingsstart. AudioContext-klokken har ingen "kjør callback
  // ved tid X"-primitiv, så vegg-klokke-setTimeout er broen (og gjør duck-
  // overgangen testbar med vi.useFakeTimers()).
  duckTimer?: ReturnType<typeof setTimeout>;
}

export class AudioBufferEngine {
  private buffers = new Map<string, AudioBuffer>();
  // Pågående fetch/dekoding per nøkkel – hindrer dobbel nedlasting ved samtidige preload-kall
  private inFlight = new Map<string, Promise<void>>();
  // Flerkjedemodell (Planrettelse 2): flere kjeder kan være skedulert/spillende
  // samtidig (Directoren ankrer start_321/go/last5 uavhengig i samme fase, pluss
  // reaktive avspillinger). Erstatter den gamle singulære activeChain.
  private chains: ActiveChain[] = [];
  // Antall HØRBARE kjeder akkurat nå – styrer ducking par-balansert på tvers
  // av kjeder: duck ved første hørbare (0→1), unduck når ingen er hørbare
  // lenger (→0). Uten refcount ville f.eks. cancelScheduled() av en ALDRI
  // hørbar kjede kunnet trigge et feilaktig unduck mens en annen kjede spiller.
  private audibleCount = 0;
  // Teller opp for hvert stop() slik at en sekvens som venter på ctx.resume()
  // kan oppdage at et stopp (eksternt, eller fra en nyere sekvens) traff i
  // await-vinduet – stop/skedulering er ellers ikke atomisk over den awaiten
  private stopEpoch = 0;
  // Offset (sekunder) mellom motorens klokke (TimerEngine.now(), ms) og
  // AudioContext.currentTime, målt én gang ved setTimeBridge(). Null = ikke
  // brodd ennå – da nekter scheduleSequence heller enn å gjette et anker.
  private bridgeOffsetS: number | null = null;

  public has(key: string): boolean {
    return this.buffers.has(key);
  }

  /**
   * Måler og lagrer offset mellom motorklokken (engine.now(), ms) og
   * AudioContext-klokken (sekunder), slik at absolutte motor-tidsstempler
   * (fasegrenser fra TimerEngine) kan oversettes til lyd-skedulering med
   * samme klokke som source.start() bruker. Kalles av Director ved
   * workout:started – én måling per økt er nok siden begge klokker går
   * med samme rate (kun forskjellig epoke).
   */
  public setTimeBridge(engineNowMs: number): void {
    const ctx = audioService.getContext();
    this.bridgeOffsetS = ctx.currentTime - engineNowMs / 1000;
  }

  /**
   * Oversetter et absolutt motor-tidsstempel (ms) til AudioContext-tid (sekunder).
   * Kaster hvis broen ikke er satt – kallere (scheduleSequence) skal sjekke
   * broen eksplisitt FØR de kaller denne, ikke stole på en fallback-gjetning.
   */
  public toAudioTime(engineMs: number): number {
    if (this.bridgeOffsetS === null) {
      throw new Error('AudioBufferEngine: toAudioTime kalt før setTimeBridge');
    }
    return engineMs / 1000 + this.bridgeOffsetS;
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

    // Planrettelse 2: kun HØRBARE kjeder stoppes («én stemme om gangen»
    // håndheves ved faktisk avspilling) – skedulerte fremtidskjeder fra
    // scheduleSequence (Directorens lookahead-ankre) er URØRT.
    this.stopAudibleChains();

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

    // A5 (audit § 9.4/§ 7.3): "faseovergangs-lydavvik". Proxy-semantikk (dette
    // er IKKE driver-/høyttalerlatens, som JS ikke kan observere): schedule[0].start
    // var beregnet som ctx.currentTime + SCHEDULE_LEAD_S FØR skeduleringsløkken over
    // kjørte. Hvis hovedtråden var jankete mellom det tidspunktet og nå, har
    // ctx.currentTime rukket å løpe forbi den planlagte lead-tiden – og source.start(t)
    // med et t som allerede har passert, spilles øyeblikkelig i stedet for presist på
    // t. Avviket målt her er derfor nøyaktig den skeduleringsside-forsinkelsen appen
    // selv kontrollerer (render-gating/hovedtråd-arbeid), målt synkront rett etter
    // siste source.start()-kall for FØRSTE klipp i kjeden. Guardet: motoren skal
    // aldri avhenge hardt av overvåkingstjenesten.
    try {
      const deviationMs = Math.max(0, ctx.currentTime - schedule[0].start) * 1000;
      perfMonitorService.recordAudioDeviation(deviationMs);
    } catch {
      // Overvåking er en ren måling og skal aldri kunne velte avspilling
    }

    return new Promise<boolean>((resolve) => {
      const chain: ActiveChain = { nodes, resolve, audible: false };
      this.chains.push(chain);
      // Hørbar med det samme: lead-tiden er ~30 ms, så "nå" og "avspilling
      // starter" er samme øyeblikk for øret – ingen duckTimer nødvendig her
      // (i motsetning til scheduleSequence, se der).
      this.markAudible(chain);
      nodes[nodes.length - 1].source.onended = () => {
        this.disconnectNodes(nodes);
        this.finishChain(chain, true);
      };
    });
  }

  /**
   * Som playSequence, men ankret i ABSOLUTT motor-tid i stedet for "nå + lead":
   * `{ endAt }` regner ut startAt = toAudioTime(endAt) - kjedevarighet (summen av
   * klippvarigheter minus crossfade-overlappene, jf. computeSequenceSchedule),
   * `{ startAt }` går rett gjennom toAudioTime. Samme kontrakt som playSequence
   * ellers: false uten sideeffekter ved ucachet nøkkel/manglende tidsbro/for
   * trangt vindu (aldri gjetning – se toAudioTime), aldri reject, epoch- og
   * context-state-gatet, kansellerbar via stop()/ny sekvens.
   */
  public async scheduleSequence(
    keys: string[],
    anchor: { endAt?: number; startAt?: number },
    opts?: { crossfadeS?: number }
  ): Promise<boolean> {
    const buffers: AudioBuffer[] = [];
    for (const key of keys) {
      const buffer = this.buffers.get(key);
      if (!buffer) return false;
      buffers.push(buffer);
    }
    if (buffers.length === 0) return false;

    // Uten bro kan et motor-anker ikke oversettes til lydklokketid – å gjette
    // (f.eks. anta offset 0) ville gitt et vilkårlig avvik. Nekt heller.
    if (this.bridgeOffsetS === null) return false;

    const crossfadeS = opts?.crossfadeS ?? DEFAULT_CROSSFADE_S;
    const durations = buffers.map((b) => b.duration);
    // Kjedens totale varighet fra første klipps start til siste klipps slutt:
    // (n-1) skjøter overlapper hver med crossfadeS, siste klipp bidrar fullt.
    const chainDurationS = durations.reduce((sum, d) => sum + d, 0) - crossfadeS * (durations.length - 1);

    const ctx = audioService.getContext();
    const startAt =
      anchor.startAt !== undefined
        ? this.toAudioTime(anchor.startAt)
        : this.toAudioTime(anchor.endAt as number) - chainDurationS;

    // Samme sikkerhetsmargin som playSequence sin faste lead-tid: uten den
    // rekker ikke skeduleringen (og evt. ducking-planlegging) å skje før
    // avspilling skal starte. Fanger også anker i fortiden (startAt < nå).
    if (startAt < ctx.currentTime + SCHEDULE_LEAD_S) return false;

    // Planrettelse 2: additiv – scheduleSequence stopper ALDRI noe selv (verken
    // hørbart eller skedulert). Directoren ankrer flere uavhengige kjeder i
    // samme fase (start_321/go/last5); det er Directorens ansvar (cancelScheduled
    // ved deadlineChanged/skip, stop() ved pause/reset) å avgjøre hva som kanselleres.

    if (ctx.state !== 'running') {
      const epochBeforeResume = this.stopEpoch;
      try {
        await ctx.resume();
      } catch {
        // Avgjøres av state-sjekken under
      }
      // (Assertion til full union: se identisk kommentar i playSequence.)
      if ((ctx.state as AudioContextState) !== 'running') return false;
      if (this.stopEpoch !== epochBeforeResume) return true;
    }

    const schedule = computeSequenceSchedule(durations, crossfadeS, startAt);
    const nodes = buffers.map((buffer, i) => this.scheduleClip(ctx, buffer, schedule[i], crossfadeS));

    try {
      const deviationMs = Math.max(0, ctx.currentTime - schedule[0].start) * 1000;
      perfMonitorService.recordAudioDeviation(deviationMs);
    } catch {
      // Overvåking er en ren måling og skal aldri kunne velte avspilling
    }

    // Kjeden er IKKE hørbar før den faktisk starter – markAudible() (kalt av
    // duckTimer under) er det som flytter den inn i duck-refcounten og ut av
    // stopAudibleChains()/cancelScheduled() sitt "kun skedulert"-utvalg.
    // Ducking her er derfor skedulert (setTimeout) til faktisk avspillingsstart,
    // IKKE øyeblikkelig som i playSequence: der er lead-tiden ~30 ms så "nå" og
    // "avspilling starter" er samme øyeblikk for øret, men et scheduleSequence-
    // anker kan ligge sekunder frem – øyeblikkelig ducking ville dempet
    // bakgrunnslyd lenge før klippet faktisk høres.
    const duckDelayMs = Math.max(0, (startAt - ctx.currentTime) * 1000);

    return new Promise<boolean>((resolve) => {
      const chain: ActiveChain = { nodes, resolve, audible: false };
      chain.duckTimer = setTimeout(() => this.markAudible(chain), duckDelayMs);
      this.chains.push(chain);
      nodes[nodes.length - 1].source.onended = () => {
        this.disconnectNodes(nodes);
        this.finishChain(chain, true);
      };
    });
  }

  /**
   * Kansellerer KUN skedulerte, ikke-hørbare kjeder (scheduleSequence-kjeder
   * som ennå ikke har nådd sitt startAt) – stille, uten fade, siden ingenting
   * faktisk spiller ennå. Hørbare kjeder (playSequence, eller en
   * scheduleSequence-kjede som allerede har startet) er URØRT.
   *
   * Directoren bruker denne ved phase:deadlineChanged/skip (Planrettelse 2):
   * en fasegrense flyttet seg (dvale-reanker/catch-up) eller brukeren hoppet
   * videre FØR forrige frist – lyd skedulert mot den gamle grensen skal
   * forsvinne stille, uten å kutte noe som faktisk spiller nå.
   */
  public cancelScheduled(): void {
    this.stopEpoch++;
    const scheduled = this.chains.filter((c) => !c.audible);
    if (scheduled.length === 0) return;
    const now = audioService.getContext().currentTime;
    scheduled.forEach((chain) => this.silentCancelChain(chain, now));
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

  /**
   * Flytter en kjede inn i "hørbar"-tilstanden (idempotent). Rydder en evt.
   * ventende duckTimer, og duck-refcounten går opp – ducking starter kun på
   * 0→1-overgangen slik at flere overlappende hørbare kjeder ikke dobbelt-duckes.
   */
  private markAudible(chain: ActiveChain): void {
    if (chain.audible) return;
    chain.audible = true;
    if (chain.duckTimer !== undefined) {
      clearTimeout(chain.duckTimer);
      chain.duckTimer = undefined;
    }
    this.audibleCount++;
    if (this.audibleCount === 1) {
      audioDuckingService.startDucking();
    }
  }

  /**
   * Motstykket til markAudible – refcounten går ned, og unduck skjer KUN når
   * ingen kjeder lenger er hørbare (par-balansert, se audibleCount-kommentaren).
   * No-op for en kjede som aldri ble hørbar (kansellert før den startet).
   */
  private unmarkAudible(chain: ActiveChain): void {
    if (!chain.audible) return;
    chain.audible = false;
    this.audibleCount = Math.max(0, this.audibleCount - 1);
    if (this.audibleCount === 0) {
      audioDuckingService.stopDucking();
    }
  }

  private finishChain(chain: ActiveChain, played: boolean): void {
    // Rydd en evt. skedulert duck-start (scheduleSequence) – uten dette ville
    // en kjede kansellert FØR duckDelayMs likevel dempet bakgrunnslyd senere,
    // lenge etter at avspillingen selv ble avbrutt.
    if (chain.duckTimer !== undefined) {
      clearTimeout(chain.duckTimer);
      chain.duckTimer = undefined;
    }
    const idx = this.chains.indexOf(chain);
    if (idx !== -1) {
      this.chains.splice(idx, 1);
    }
    this.unmarkAudible(chain);
    chain.resolve(played);
  }

  /** Fader ut og stopper én HØRBAR kjede – delt av stop() og stopAudibleChains(). */
  private fadeStopChain(chain: ActiveChain, now: number, fadeOutS: number): void {
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

  /**
   * Kansellerer én IKKE-hørbar (skedulert, ennå ikke startet) kjede – stille,
   * uten fade, siden ingenting spiller ennå. Delt av stop() og cancelScheduled().
   */
  private silentCancelChain(chain: ActiveChain, now: number): void {
    chain.nodes.forEach(({ source, gain }) => {
      try {
        source.onended = () => {
          try {
            gain.disconnect();
          } catch {
            // Allerede frakoblet
          }
        };
        source.stop(now);
      } catch {
        // Kilden kan allerede være stoppet – ufarlig
      }
    });
    this.finishChain(chain, true);
  }

  /**
   * Stopper KUN hørbare kjeder (spilling er startet, ikke avsluttet) – "én
   * stemme om gangen" håndheves ved faktisk avspilling. Skedulerte fremtidskjeder
   * (scheduleSequence, ikke startet ennå) er URØRT (Planrettelse 2). Brukt av
   * playSequence før en ny reaktiv kjede skedulerer.
   */
  private stopAudibleChains(fadeOutS = DEFAULT_STOP_FADE_S): void {
    // Teller alltid – også uten hørbare kjeder – slik at en sekvens midt i
    // resume-vinduet ser stoppet (se stopEpoch-kommentaren over)
    this.stopEpoch++;
    const audible = this.chains.filter((c) => c.audible);
    if (audible.length === 0) return;
    const now = audioService.getContext().currentTime;
    audible.forEach((chain) => this.fadeStopChain(chain, now, fadeOutS));
  }

  /**
   * Stopper ALT – hørbare kjeder fades ut, skedulerte (ikke startet ennå)
   * kanselleres stille (Planrettelse 2). Løser hver kjedes promise med true –
   * klippet HAR (eller SKULLE) spilt, så kallere skal ikke trigge fallback-
   * stiene sine oppå et bevisst stopp. Brukes av Directoren ved pause/reset.
   */
  public stop(fadeOutS = DEFAULT_STOP_FADE_S): void {
    // Teller alltid – også uten aktive kjeder – slik at en sekvens midt i
    // resume-vinduet ser stoppet (se stopEpoch-kommentaren over)
    this.stopEpoch++;
    if (this.chains.length === 0) return;

    const now = audioService.getContext().currentTime;
    // Kopi: finishChain (kalt for hver kjede under) muterer this.chains
    const chains = [...this.chains];
    chains.forEach((chain) => {
      if (chain.audible) {
        this.fadeStopChain(chain, now, fadeOutS);
      } else {
        this.silentCancelChain(chain, now);
      }
    });
  }
}

export const audioBufferEngine = new AudioBufferEngine();

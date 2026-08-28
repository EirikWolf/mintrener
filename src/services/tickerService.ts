// Ticker Service
// Leverer periodiske "tick"-signaler til intervalltimeren. Ticken hentes fra en Web
// Worker (ren metronom, se src/workers/timerTick.worker.ts) i stedet for
// window.setInterval på hovedtråden, fordi nettlesere throttler hovedtrådens timere
// kraftig i skjulte faner (ned til 1/s eller 1/min), mens worker-timere kun throttles
// mildt. I miljøer uten Worker (f.eks. testmiljø/jsdom, gamle nettlesere) faller
// tjenesten tilbake til vanlig setInterval.

export interface Ticker {
  start(): void;
  stop(): void;
}

const DEFAULT_INTERVAL_MS = 100;

function createFallbackTicker(onTick: () => void, intervalMs: number): Ticker {
  let intervalId: ReturnType<typeof setInterval> | undefined;

  return {
    start() {
      if (intervalId !== undefined) return; // idempotent
      intervalId = setInterval(onTick, intervalMs);
    },
    stop() {
      if (intervalId === undefined) return;
      clearInterval(intervalId);
      intervalId = undefined;
    },
  };
}

function createWorkerTicker(onTick: () => void, intervalMs: number): Ticker {
  let worker: Worker | undefined;
  let fallback: Ticker | undefined;
  let isRunning = false;

  // new Worker() kaster nesten aldri synkront i ekte nettlesere – feil ved
  // script-henting/parsing (f.eks. en utdatert PWA-utrulling der den hashede
  // worker-chunken 404-er) dukker i stedet opp asynkront som en 'error'-hendelse.
  // Uten denne fangeren ville ticker levert null ticks og timeren fryse stille
  // (bortsett fra den enkeltstående visibilitychange-ticken ved oppvåkning).
  function switchToFallback() {
    if (!isRunning || fallback) return; // allerede stoppet, eller allerede byttet
    if (worker) {
      worker.onmessage = null;
      worker.onerror = null;
      worker.terminate();
      worker = undefined;
    }
    fallback = createFallbackTicker(onTick, intervalMs);
    fallback.start();
  }

  return {
    start() {
      if (worker || fallback) return; // idempotent
      isRunning = true;

      try {
        // Vite-mønsteret for bundlede workers: URL-konstruktøren gjør at Vite kan
        // finne og bundle worker-filen selv om denne koden kun kjøres lazily.
        worker = new Worker(new URL('../workers/timerTick.worker.ts', import.meta.url), {
          type: 'module',
        });
        worker.onmessage = () => onTick();
        worker.onerror = () => {
          console.warn('Timer-worker feilet asynkront, faller tilbake til setInterval');
          switchToFallback();
        };
        worker.postMessage({ cmd: 'start', intervalMs });
      } catch (err) {
        console.warn('Kunne ikke opprette timer-worker, faller tilbake til setInterval:', err);
        worker = undefined;
        fallback = createFallbackTicker(onTick, intervalMs);
        fallback.start();
      }
    },
    stop() {
      isRunning = false;
      if (worker) {
        worker.onmessage = null;
        worker.onerror = null;
        worker.postMessage({ cmd: 'stop' });
        worker.terminate();
        worker = undefined;
      }
      if (fallback) {
        fallback.stop();
        fallback = undefined;
      }
    },
  };
}

/**
 * Oppretter en ticker som kaller `onTick` med jevne mellomrom (default 100 ms).
 * Bruker en Web Worker som metronom når tilgjengelig; faller tilbake til
 * setInterval på hovedtråden ellers. Worker opprettes lazily i start(), ikke ved
 * kall til createTicker.
 */
export function createTicker(onTick: () => void, intervalMs: number = DEFAULT_INTERVAL_MS): Ticker {
  if (typeof Worker !== 'undefined') {
    return createWorkerTicker(onTick, intervalMs);
  }
  return createFallbackTicker(onTick, intervalMs);
}

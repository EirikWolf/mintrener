// Timer Tick Worker
// Ren metronom for intervalltimeren: poster en 'tick'-melding med jevne mellomrom.
// Ingen forretningslogikk her – all timerlogikk (fasebytte, lyd, tale, lagring osv.)
// blir værende på hovedtråden i useIntervalTimer. Grunnen til at ticken kommer fra en
// worker og ikke window.setInterval på hovedtråden: nettlesere throttler hovedtrådens
// timere kraftig i skjulte faner (ned til 1/s eller 1/min), mens worker-timere kun
// throttles mildt, slik at ticken fortsetter å levere selv i bakgrunn.
export {};

type TickerCommand = { cmd: 'start'; intervalMs: number } | { cmd: 'stop' };

interface TickerWorkerContext {
  postMessage(message: string): void;
  onmessage: ((event: MessageEvent<TickerCommand>) => void) | null;
}

const ctx = self as unknown as TickerWorkerContext;

let intervalId: ReturnType<typeof setInterval> | undefined;

ctx.onmessage = (event) => {
  const command = event.data;

  if (command.cmd === 'start') {
    if (intervalId !== undefined) {
      clearInterval(intervalId);
    }
    intervalId = setInterval(() => {
      ctx.postMessage('tick');
    }, command.intervalMs);
  } else if (command.cmd === 'stop') {
    if (intervalId !== undefined) {
      clearInterval(intervalId);
      intervalId = undefined;
    }
  }
};

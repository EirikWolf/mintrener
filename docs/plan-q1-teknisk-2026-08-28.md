# Plan: Q1 teknisk spor — batch 1 (subagent-drevet, TDD)

**Kilde:** `docs/systemrevisjon-moonshot-2026-08-28.md` § 8.2, teknisk spor punkt 1 og 4, pluss haptikk fra § 3.2.
**Metode:** Subagent-drevet utvikling. Én implementer per oppgave, TDD der logikken er testbar, to-trinns review (spec-samsvar → kodekvalitet) etter hver oppgave.
**Branch:** `feat/q1-teknisk-spor`
**Utsatt:** AudioBuffer-migrering og AudioDirector (lyd-tråden er eksplisitt utsatt av Eirik 28.08); Fokusmodus (trenger visuell feedback-løkke med Eirik — egen batch).

**Oppfølging til lyd-batchen (funnet i review av Oppgave 2):** Resync-cuen i `catchUpExpiredPhases` bruker alltid standard-stien (`audioService`/`speechService`) — brukere med aktiv trenerpersona får standard pip + talesyntese ved oppvåkning. Persona-bevisst cue-utvalg hører hjemme i AudioDirector (som sentraliserer nettopp denne prioriteringen); også `round_rest`-grenen i `playResyncCue` mangler testdekning (krever flerrunde-workout i test).

**Oppfølging fra review av Oppgave 3 (klokkesync) — ikke-blokkerende:**
- Målebracket: ta `t1` rett etter `await setDoc` (ack-en bracketer stemplingen; `getDoc` henter verdien utenfor bracketen) — halverer feilgrensen; dokumentér to-rundtur-forbeholdet i JSDoc.
- `getServerNow`-testen asserterer bare «noe ble lagt til» — mock Date.now under estimering og assert eksakt verdi.
- Utestede feilstier i clockSyncService: manglende `ts`-kast, og «feil etter tidligere suksess returnerer gammel cache, ikke 0».
- Offset-cachen utløper aldri — vurder `force: true` (fire-and-forget) i `startGroupWorkout`; vurder `crypto.randomUUID()` som klient-id.
- Infra: aktiver Firestore TTL-policy på `ts`-feltet i `clock_sync` (konsoll/gcloud) så dokumentene ryddes automatisk.

**Felles krav for alle oppgaver:**
- TypeScript strict mode, ingen `any` uten god grunn, funksjonell stil
- Vitest for tester; `npm test` og `npx tsc -p tsconfig.app.json --noEmit` skal være grønne før commit
- Følg eksisterende mønstre i kodebasen (norske JSDoc-kommentarer, tjenesteklasser/rene funksjoner i `src/services/`)
- Commit på branchen med conventional commit-melding, avsluttet med `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`
- Ikke rør filer utenfor oppgavens scope

---

## Oppgave 1: Worker-basert tick-kilde for timermotoren

**Mål:** Timerens 100 ms-tick skal komme fra en Web Worker i stedet for `window.setInterval` på hovedtråden, slik at ticken overlever bakgrunns-throttling i skjulte faner (hovedtrådens timere throttles til ≥ 1 s / 1 min; workers throttles langt mildere).

**Bakgrunn:** `src/hooks/useIntervalTimer.ts` kjører i dag `window.setInterval(tick, 100)` i en `useEffect` som er aktiv når `status === 'running'`. Tick-funksjonen beregner gjenværende tid fra `performance.now()`-tidsstempler (regnskapet er altså robust), men selve *leveransen* av ticks dør i bakgrunn — og dermed uteblir lydsignaler og faseoverganger. Det finnes allerede en `visibilitychange`-lytter som kjører én tick ved oppvåkning; den skal beholdes.

**Nye filer:**
1. `src/workers/timerTick.worker.ts` — module worker. Lytter på meldinger: `{ cmd: 'start', intervalMs: number }` starter `setInterval` som poster `'tick'` hvert intervall; `{ cmd: 'stop' }` stopper intervallet. Ingen forretningslogikk i workeren — den er kun et metronom. All timerlogikk blir værende på hovedtråden.
2. `src/services/tickerService.ts` — eksporterer `createTicker(onTick: () => void, intervalMs?: number): Ticker` der `Ticker = { start(): void; stop(): void }` (default 100 ms):
   - Hvis `typeof Worker !== 'undefined'`: bruk `new Worker(new URL('../workers/timerTick.worker.ts', import.meta.url), { type: 'module' })` (Vite-mønsteret). `start()` sender start-melding og kobler `onmessage` → `onTick`; `stop()` sender stopp og kaller `worker.terminate()`.
   - Ellers (test-miljø/jsdom, gamle nettlesere): fallback til `setInterval`/`clearInterval`.
   - `start()` skal være idempotent (to kall gir ikke dobbel tick-rate); `stop()` etter `stop()` skal ikke kaste.
   - Worker-konstruksjon skal skje lazily i `start()` (ikke ved `createTicker`-kall), og feil ved worker-oppretting skal falle tilbake til `setInterval` (try/catch).

**Endring i `src/hooks/useIntervalTimer.ts`:** I `useEffect`-en som i dag gjør `const intervalId = window.setInterval(tick, 100)`: erstatt med `const ticker = createTicker(tick); ticker.start();` og i cleanup `ticker.stop()`. `visibilitychange`-lytteren beholdes uendret.

**TDD-krav (skriv testen først, se den feile, implementer, se den passere):**
- Ny testfil `src/services/__tests__/tickerService.test.ts`:
  - Fallback-stien (jsdom har ingen `Worker` med mindre den mockes): med `vi.useFakeTimers()`, verifiser at `onTick` kalles ved forventet kadens etter `start()`, at `stop()` stopper den, at dobbel `start()` ikke dobler raten, og at `stop()` uten `start()` ikke kaster.
  - Worker-stien: mock `globalThis.Worker` med en fake som fanger meldinger; verifiser at `start()` sender `{ cmd: 'start', intervalMs: 100 }`, at innkommende melding trigger `onTick`, og at `stop()` sender stopp og kaller `terminate()`.
- Eksisterende tester i `src/hooks/__tests__/useIntervalTimer.test.ts` skal fortsatt passere uendret.

**Akseptanse:** `npm test` grønn, `tsc` ren, hooken bruker `createTicker`, workeren inneholder kun metronom-logikk.

---

## Oppgave 2: Catch-up-politikk med stille fast-forward

**Mål:** Når timeren våkner etter en periode uten ticks (dvale/lomme) og flere faser har utløpt, skal motoren spole stille gjennom alle utløpte faser og lande riktig — i stedet for dagens oppførsel der hver fase avanseres én per tick med full lyd/vibrasjon (en «kaskade» av signaler).

**Bakgrunn:** I `src/hooks/useIntervalTimer.ts` sin `tick()`: når `remaining <= 0` kalles `advanceToNextPhase()` én gang. `advanceToNextPhase` kaller `setupPhase(...)` som (uten `silent`-flagget) spiller lyd, tale og vibrasjon, og setter `phaseStartTime = performance.now()` — overskytende tid går dermed også tapt (fasene forskyves). `setupPhase` har allerede en `silent: boolean`-parameter (brukes av reset og restore).

**Krav:**
1. `advanceToNextPhase` får en valgfri parameter `silent: boolean = false` som propageres til alle `setupPhase`-kall i den.
2. Ny intern hjelpefunksjon i hooken, f.eks. `catchUpExpiredPhases()`, som brukes i `tick()` når `remaining <= 0`:
   - Beregn overskytende tid: `overshoot = phaseElapsed - phaseDuration` (sekunder, ≥ 0).
   - Hvis `overshoot` er under en liten terskel (f.eks. < 1,5 s — normal drift ved synlig fane): behold dagens oppførsel — ett `advanceToNextPhase()` med full lyd. Dette er det vanlige tilfellet og skal ikke endre adferd.
   - Ellers (oppvåkning etter dvale): loop — `advanceToNextPhase(true)` (stille), og etter hvert avansement: trekk den nye fasens varighet fra gjenværende overshoot og bakdater `stateRef.current.phaseStartTime` med resterende overshoot (`phaseStartTime = performance.now() - restOvershoot * 1000`), slik at fasen man lander i har korrekt gjenværende tid. Fortsett mens den nye fasens varighet også er oppbrukt og status fortsatt er `running` (fasen `complete` avslutter loopen naturlig). Sikkerhetsgrense på maks 500 iterasjoner.
   - Etter loopen, hvis ≥ 1 fase ble hoppet over stille og status fortsatt er `running`: spill ÉN resynkroniserings-cue — `audioService.playWorkStart(soundEnabled)` hvis landingsfasen er `work`, ellers `audioService.playRestStart(soundEnabled)`, pluss `speechService.announceWork(currentExercise.name, tone)` / `announceRest(nextExercise?.name, tone)` tilsvarende, kun hvis `speechEnabled`. Vibrer én gang med tilhørende mønster. (Gjenbruk eksisterende tjenestekall — ikke bygg nye lydstier.)
   - Hvis loopen lander på `complete`: fullføringssignalene spilles som normalt av `setupPhase('complete', ...)` — kall det siste avansementet *uten* silent i det tilfellet, eller la `complete`-signalene spilles eksplisitt; velg det som gir ren kode, men fullføringen skal høres nøyaktig én gang.
3. Ingen endring i offentlig API.

**TDD-krav:**
- Utvid `src/hooks/__tests__/useIntervalTimer.test.ts`. Teknikk: `vi.useFakeTimers()` for å drive tick-intervallet (fallback-stien fra Oppgave 1 brukes automatisk i jsdom) og `vi.spyOn(performance, 'now')` med kontrollert, økende verdi for å simulere tidshopp. Spy på `audioService.playWorkStart`/`playRestStart`/`playWorkoutComplete` og `speechService`-metodene.
- Testtilfeller (skriv dem først):
  1. **Normal drift uendret:** fase utløper med ~0 overshoot → nøyaktig ett lydkall for ny fase (som i dag).
  2. **Dvale midt i økten:** start Tabata (10s prepare, 8×(20s arbeid + 10s pause)), simuler tidshopp på 95 s inn i økten, kjør én tick → `currentItemIndex`/`phase` er korrekt for t=95s, gjenværende fase-tid er korrekt (±0,2 s), og lyd-spyene ble kalt maks én gang under catch-up (resync-cuen).
  3. **Dvale forbi slutten:** tidshopp forbi total varighet → status `completed`, `playWorkoutComplete` kalt nøyaktig én gang.
- Eksisterende tester skal fortsatt passere.

**Akseptanse:** testene over grønne, `tsc` ren, ingen kaskade av lydkall ved simulert oppvåkning.

---

## Oppgave 3: Klokkesynkronisert grupperomstart

**Mål:** Deltakerne i et grupperom skal starte timeren samtidig innenfor ~100 ms, uavhengig av avvik i enhetenes veggklokker. I dag skriver verten `startTimestamp: Date.now()` (vertens klokke), og skjevheten mellom deltakere blir lik klokkedifferansen (rutinemessig 0,5–2 s).

**Metode (NTP-forenklet mot Firestore):** Hver klient estimerer offset θ mot serverklokken: mål `t0 = Date.now()` lokalt, skriv et dokument med `serverTimestamp()`, les det tilbake med server-stempelet `Ts` (millisekunder), mål `t1 = Date.now()`. Estimat: `θ = Ts − (t0 + t1)/2`, feilgrense ± halv rundtur. Median av 3 målinger. Verten publiserer `startAtServerMs = serverNow + 3000`; hver klient starter når egen `Date.now() + θ` når dette tidspunktet.

**Ny fil `src/services/clockSyncService.ts`:**
1. `computeClockOffset(t0Ms: number, t1Ms: number, serverMs: number): number` — ren funksjon: `serverMs - (t0Ms + t1Ms) / 2`.
2. `median(values: number[]): number` — ren funksjon (håndter partall/oddetall antall; kast eller returner 0 ved tom liste — velg og dokumentér).
3. `estimateServerClockOffset(samples = 3): Promise<number>` — kjører `samples` målinger sekvensielt mot Firestore: skriv `setDoc(doc(db, 'clock_sync', <tilfeldig id per klient, gjenbrukt>), { ts: serverTimestamp() })`, les tilbake med `getDoc`, hent `ts.toMillis()`. Returner median av offsetene. Cache resultatet i modulvariabel; nye kall returnerer cachen (med `force`-parameter for å måle på nytt). Ved feil (offline, ingen db): returner 0 og logg `console.warn` — appen skal aldri knekke på dette.
4. `getServerNow(): number` — `Date.now() + cachedOffset` (0 hvis ikke målt).

**Endringer i `src/services/groupRoomService.ts`:**
- `startGroupWorkout`: skriv i tillegg `startAtServerMs: getServerNow() + 3000` (behold `startTimestamp` for bakoverkompatibilitet). Kall `estimateServerClockOffset()` først (den er cachet).
- Legg `startAtServerMs?: number | null` til `GroupRoomState`.

**Endring i konsumenten:** Finn hvor `startTimestamp`/rom-status `running` konsumeres (grep i `src/components/group/GroupRoomModal.tsx`). Der nedtelling/start beregnes: hvis `startAtServerMs` finnes, beregn forsinkelse som `startAtServerMs - getServerNow()` (kall `estimateServerClockOffset()` når klienten blir med i rommet, så cachen er varm); ellers fall tilbake til dagens logikk. Ikke redesign modalen — kun byt tidskilden.

**TDD-krav:**
- Ny testfil `src/services/__tests__/clockSyncService.test.ts`:
  1. `computeClockOffset`: kjente verdier, inkl. negativ offset (klient foran server) og symmetri.
  2. `median`: oddetall, partall, én verdi, usortert input.
  3. `estimateServerClockOffset`: mock Firestore-modulene (følg mønsteret i eksisterende tjenestetester som mocker `firebase/firestore`) — verifiser median-av-3-oppførsel og at feil gir 0 med warn, samt at cache brukes ved andre kall.
- Firestore-integrasjonen for øvrig verifiseres ikke i test (nettverk); den skal være tynn.

**Akseptanse:** tester grønne, `tsc` ren, `startGroupWorkout` skriver `startAtServerMs`, konsument bruker den med fallback.

---

## Oppgave 4: BLE auto-reconnect med backoff + RR-intervaller

**Mål:** (a) Pulsbelte som mister kontakt midt i økten skal kobles til igjen automatisk med eksponentiell backoff i stedet for dagens stille datadød. (b) RR-intervaller (grunnlaget for HRV) skal parses fra måledataene og bevares i `HeartRateData` — de kastes i dag.

**Fil:** `src/services/bluetoothHeartRateService.ts`. Les hele filen først — spesielt `handleDisconnected` og `handleHeartRateMeasurement` (parsing av GATT-karakteristikk 0x2A37).

**Krav parsing (a-ren-funksjon):**
1. Trekk ut parsingen til en eksportert ren funksjon `parseHeartRateMeasurement(view: DataView): { heartRate: number; rrIntervals: number[] }`:
   - Flaggbyte på offset 0: bit 0 = 1 betyr 16-bit HR (uint16 LE på offset 1), ellers uint8 på offset 1.
   - Bit 4 = 1 betyr RR-intervaller til stede: sekvens av uint16 LE fra første offset etter HR-feltet (og etter energifelt på 2 byte hvis bit 3 = 1) til slutten av bufferet. Enhet 1/1024 s → konverter til millisekunder (`Math.round(raw / 1024 * 1000)`).
   - Tom liste når bit 4 = 0.
2. `HeartRateData` får valgfritt felt `rrIntervals?: number[]`; `handleHeartRateMeasurement` bruker den rene funksjonen og sender feltet videre.

**Krav reconnect:**
3. Eksportert ren funksjon `getReconnectDelayMs(attempt: number): number | null` — 1000, 2000, 4000, 8000, 16000 for attempt 0–4, `null` fra attempt 5 (gi opp).
4. Ved `gattserverdisconnected` (når frakoblingen IKKE er initiert av `disconnect()`-kallet — bruk et internt flagg): forsøk `this.device.gatt.connect()` + re-abonnering på notifikasjoner, styrt av `getReconnectDelayMs`. Ved suksess: fortsett datastrømmen som før. Når alle forsøk er brukt opp: kall `onDisconnectCallback` (som i dag).
5. Ny valgfri callback i `connect(onData, onDisconnect?, onReconnecting?)`: `onReconnecting?: (attempt: number) => void` kalles før hvert forsøk, slik at UI kan vise diskret status. Bakoverkompatibelt (eksisterende kallere uendret).
6. Manuell `disconnect()` skal sette flagget slik at ingen reconnect startes, og skal avbryte en pågående backoff-venting (rydd timeout-referanser).

**TDD-krav:**
- Utvid `src/services/__tests__/bluetoothHeartRateService.test.ts` (les eksisterende tester og følg mønsteret):
  1. `parseHeartRateMeasurement`: fixtures med `DataView` — (i) 8-bit HR uten RR, (ii) 16-bit HR uten RR, (iii) 8-bit HR med to RR-intervaller (verifiser ms-konvertering), (iv) energifelt til stede (bit 3) med RR — riktig offset.
  2. `getReconnectDelayMs`: hele skjemaet inkl. `null` ved uttømming.
- Selve GATT-reconnect-flyten er hardware-avhengig og verifiseres ikke i test; hold den tynn rundt de testede rene funksjonene.

**Akseptanse:** tester grønne, `tsc` ren, offentlig API bakoverkompatibelt, RR i `HeartRateData`.

---

## Oppgave 5: Semantisk haptikk-tabell

**Mål:** Vibrasjonsmønstrene skal være semantisk adskilte (kort tikk vs. dobbel puls vs. fanfare) og samlet i én navngitt tabell, slik at haptikken kan bære mening alene ved lydløs trening (kontor-profilen).

**Fil:** `src/services/vibrationService.ts` (liten fil — les den).

**Krav:**
1. Eksporter `const HAPTIC_PATTERNS` med nøklene `countdown`, `workStart`, `restStart`, `workoutComplete` som eneste kilde til mønstrene:
   - `countdown: [30]` — kort tikk (i dag 80 ms, for likt restStart)
   - `workStart: [80]` — ett fast, tydelig støt
   - `restStart: [40, 60, 40]` — dobbel myk puls (klart adskilt fra workStart)
   - `workoutComplete: [100, 80, 100, 80, 400]` — uendret fanfare
2. De fire offentlige metodene bruker tabellen. Ingen andre adferdsendringer; `isSupported`/stille feiling beholdes.

**TDD-krav:**
- Ny testfil `src/services/__tests__/vibrationService.test.ts`:
  1. Hver metode kaller `navigator.vibrate` med sitt tabellmønster (mock `navigator.vibrate` med `vi.stubGlobal`/`Object.defineProperty`).
  2. `enabled = false` → ingen kall.
  3. Uten `vibrate` i navigator → ingen kall og ingen exception.
  4. Alle fire mønstre i tabellen er innbyrdes ulike (sammenlign som JSON).

**Akseptanse:** tester grønne, `tsc` ren, mønstrene definert nøyaktig ett sted.

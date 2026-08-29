# B3: TimerEngine + AudioDirector — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the timer phase machine into a framework-free `TimerEngine` with snapshot + event channels (PR α, bit-identical behavior), then replace scattered audio logic with an `AudioDirector` doing deadline-anchored lookahead scheduling (PR β).

**Architecture:** Engine emits typed events and gated immutable snapshots; React binds via `useSyncExternalStore`; side effects (audio/vibration/MediaSession/persistence) become subscribers. In α a `LegacyAudioAdapter` carries today's audio logic verbatim; β swaps it for the Director with `scheduleSequence({endAt})` lookahead against phase deadlines.

**Tech Stack:** TypeScript strict, React 18 (`useSyncExternalStore`), Vitest, Web Audio (existing `audioBufferEngine`), vite-plugin-pwa/workbox.

**Spec:** `docs/spec-b3-timerengine-audiodirector-2026-08-29.md` — the behavioral contract. On any conflict, the spec wins.

**Felles krav (alle tasks):** TS strict, ingen `any` (structural casts via `unknown` ok), norske hvorfor-kommentarer, funksjoner ≤ ~40 linjer. Etter hver task: `npx tsc -p tsconfig.app.json --noEmit` ren og angitte testkommandoer grønne. Konvensjonelle commits som avsluttes med `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`. De 6 kjente env-load-feilene i worktrees uten `.env.local` ignoreres (kun de).

---

## File Structure (locked)

**PR α (`feat/b3-timerengine`):**
- Create `src/types/engineEvents.ts` — `EngineEvent`-unionen (eneste definisjon)
- Create `src/services/timerEngine.ts` — fasemaskinen, flyttet fra hooken
- Create `src/services/__tests__/timerEngine.test.ts` — karakteriseringstester på motornivå
- Create `src/services/legacyAudioAdapter.ts` — dagens lydlogikk, ordrett, hendelsesdrevet
- Create `src/services/__tests__/legacyAudioAdapter.test.ts`
- Create `src/services/vibrationSubscriber.ts`, `src/services/persistenceSubscriber.ts`, `src/services/mediaSessionSubscriber.ts`
- Rewrite `src/hooks/useIntervalTimer.ts` — tynt bind (~120 linjer)
- Modify `src/components/timer/TimerDisplay.tsx` — KUN slett MediaSession-effekten (flyttes til subscriber; visuelt uendret)
- Untouched but must stay green: `src/hooks/__tests__/useIntervalTimer.test.ts` (23 tester = bit-identisk-fasiten)

**PR β (`feat/b3-audiodirector`):**
- Modify `src/services/audioBufferEngine.ts` — `scheduleSequence(keys, anchor)` + tidsbro
- Create `src/services/audioDirector.ts` + `src/services/__tests__/audioDirector.test.ts`
- Delete `src/services/legacyAudioAdapter.ts` (+ test)
- Create `scripts/generate-audio-manifest.mjs` + `src/data/personaAudioManifest.json` (generert)
- Modify `src/services/coachPersonaService.ts` — les generert manifest; preload ved persona-valg
- Modify `vite.config.ts` — runtimeCaching for `/audio/**`; `package.json` — `prebuild`-hook

---

# PR α — TimerEngine-uttrekk (bit-identisk)

### Task α1: Hendelsestypene og motor-skjelettet

**Files:** Create `src/types/engineEvents.ts`, `src/services/timerEngine.ts`, `src/services/__tests__/timerEngine.test.ts`

- [ ] **Step 1: Skriv `engineEvents.ts` komplett** (dette er unionen — utvidet fra spec-skissen med feltene adapterne trenger; additivt iht. spec § 3):

```ts
import { IntervalPhase, WorkoutTemplate } from '../types/workout';
import { Exercise } from '../types/workout';
import { VoiceTone } from '../schemas/profileSchema';

/** Domenehendelser fra TimerEngine. Trigger aldri render — kun abonnenter (lyd/vibrasjon/persistens/MediaSession). */
export type EngineEvent =
  | { type: 'workout:started'; workout: WorkoutTemplate }
  | { type: 'phase:started'; phase: IntervalPhase; round: number; itemIndex: number;
      exercise: Exercise | null; nextExercise: Exercise | null;
      durationS: number; tone: VoiceTone; silent: boolean;
      /** Absolutt motortid (ms, samme klokke som engine.now) for fasegrensen; null for 'complete'. */
      endsAt: number | null }
  | { type: 'phase:deadlineChanged'; endsAt: number }
  | { type: 'phase:halfway' }
  | { type: 'phase:endingSoon' }  // én gang per fase ved remaining <= 3.5s i prepare/rest/round_rest
                                  // (hookens persona-start_321-vindu; adapter filtrerer persona, beta ignorerer — lookahead overtar)
  | { type: 'countdown'; secondsLeft: 1 | 2 | 3 }
  | { type: 'resync'; skippedPhases: number; landingPhase: IntervalPhase;
      exercise: Exercise | null; nextExercise: Exercise | null; tone: VoiceTone }
  | { type: 'workout:paused' }
  | { type: 'workout:resumed'; endsAt: number }
  | { type: 'workout:reset' }
  | { type: 'workout:completed'; tone: VoiceTone };
```

Merk: ingen `last5`-hendelse i α — hooken trigger den ikke i dag (cue-fila preloades men spilles aldri; bit-identisk betyr at vi heller ikke gjør det i α).

- [ ] **Step 2: Skriv motor-skjelettet** med full offentlig signatur, alle metoder `throw new Error('ikke implementert')`:

```ts
import { WorkoutTemplate, TimerState, IntervalPhase } from '../types/workout';
import { EngineEvent } from '../types/engineEvents';
import { InterruptedSession } from './sessionRecoveryService';

export class TimerEngine {
  constructor(workout: WorkoutTemplate, now: () => number = () => performance.now()) { /* ... */ }
  getSnapshot(): TimerState { /* immutabelt; ny identitet KUN ved rendringsverdig endring */ }
  subscribe(listener: () => void): () => void { /* snapshot-kanalen (React) */ }
  subscribeEvents(handler: (e: EngineEvent) => void): () => void { /* hendelseskanalen */ }
  tick(): void { /* drives av ekstern ticker; inkl. drift-reanker og catch-up */ }
  start(workout?: WorkoutTemplate): void { }
  pause(): void { }  resume(): void { }  reset(): void { }
  skipNext(): void { }  previous(): void { }
  restore(session: InterruptedSession): void { }
  setWorkout(w: WorkoutTemplate): void { /* kun i idle — dagens prop-sync-semantikk */ }
  setSoundEnabled(v: boolean): void { }  setVibrateEnabled(v: boolean): void { }
  setWakeLockEnabled(v: boolean): void { }  setSpeechEnabled(v: boolean): void { }
  setLocked(v: boolean): void { }
}
```

Intern tilstand = dagens `stateRef.current`-form (én representasjon; `precise*`-speilene og React-state-speilet utgår — motoren regner alltid presist og materialiserer snapshot ved behov).

- [ ] **Step 3: Skriv de tre første karakteriseringstestene** i `timerEngine.test.ts` — portert fra `useIntervalTimer.test.ts` sine init-tester. Portingsregel (gjelder hele fila, kommenter den øverst):

```ts
// PORTINGSREGEL fra useIntervalTimer.test.ts (fasiten for bit-identisk adferd):
//  renderHook(() => useIntervalTimer({workout}))  →  let t = 0; const engine = new TimerEngine(workout, () => t);
//  act(() => result.current.startWorkout())       →  engine.start();
//  vi.advanceTimersByTime(100) + perf-spy         →  t += 100; engine.tick();   (ingen fake timers!)
//  result.current.state                            →  engine.getSnapshot()
//  lyd-spionene                                    →  hendelses-opptak: const events: EngineEvent[] = [];
//                                                     engine.subscribeEvents(e => events.push(e));
import { describe, it, expect } from 'vitest';
import { TimerEngine } from '../timerEngine';
import { TABATA_WORKOUT } from '../../data/mockWorkouts';

describe('TimerEngine – init (karakterisering)', () => {
  it('initialiserer Tabata med riktige verdier', () => {
    const engine = new TimerEngine(TABATA_WORKOUT, () => 0);
    const s = engine.getSnapshot();
    expect(s.status).toBe('idle');
    expect(s.phase).toBe('prepare');
    expect(s.phaseRemainingSeconds).toBe(10);
    expect(s.totalRemainingSeconds).toBe(240);
    expect(s.totalItems).toBe(8);
  });
});
```

- [ ] **Step 4:** `npx vitest run src/services/__tests__/timerEngine.test.ts` → Expected: FAIL («ikke implementert»)
- [ ] **Step 5: Implementer konstruktør + snapshot-materialisering** (port init-logikken fra hookens useState-initialisatorer og `calculateTotalWorkoutSeconds`, `useIntervalTimer.ts` — flytt funksjonen inn i klassen uendret).
- [ ] **Step 6:** Kjør testen → PASS. `npx tsc -p tsconfig.app.json --noEmit` → ren.
- [ ] **Step 7: Commit** `feat(engine): TimerEngine-skjelett med hendelsestyper og init-karakterisering`

### Task α2: Fasemaskinen inn i motoren (hendelser ut, lyd ut)

**Files:** Modify `src/services/timerEngine.ts`, `src/services/__tests__/timerEngine.test.ts`

- [ ] **Step 1: Port kontroll- og fasetestene** (rød først): fra `useIntervalTimer.test.ts` porteres testene for start/pause/resume/reset/skipNext/fullføring/stille-reset etter portingsregelen. Lyd-assertions oversettes til hendelses-assertions, f.eks.: «playWorkStart kalt én gang» → `events.filter(e => e.type === 'phase:started' && e.phase === 'work' && !e.silent)` har lengde 1. Kjør → FAIL.
- [ ] **Step 2: Port fasemaskinen ordrett** fra hooken: `setupPhase`, `advanceToNextPhase`, `catchUpExpiredPhases` (+ konstantene `CATCH_UP_THRESHOLD_S`, `MAX_CATCH_UP_PHASES`, `SLEEP_REANCHOR_THRESHOLD_MS`) — MEN: hvert kallsted til `audioService`/`speechService`/`audioClipService`/`coachPersonaService`/`vibrationService`/`saveInterruptedSession`/`wakeLockService` erstattes av `this.emit({...})` iht. denne mappingen (adapternes kontrakt — hold den nøyaktig):

| Dagens kall i hooken | Erstattes av |
|:--|:--|
| Hele lyd/tale-blokken i `setupPhase` per fase | `phase:started` med alle felter (tone = `w.voiceTone \|\| 'rolig'`, `endsAt = now() + duration*1000`, `nextExercise` = dagens `items[idx+1]`-oppslag) |
| `playPersonaCue('halfway')`-blokken i tick | `phase:halfway` (gated på `firedCues` som i dag) |
| `playPersonaCue('start_321')`-blokken i tick (remaining <= 3.5 og > 0, prepare/rest/round_rest, firedCues-gated, INGEN varighetsvakt) | `phase:endingSoon` med eksakt samme gating (persona-sjekken flytter til adapter) |
| 3-2-1-pip-blokken i tick | `countdown` per helsekund 3/2/1 (samme gating som i dag: `lastCountdownBeep`, `phaseDuration >= 4`) |
| `playResyncCue()` | `resync` med landing-feltene |
| `saveInterruptedSession(...)` i tick + pause | `persistenceSubscriber` håndterer — motor emitter INGEN egen hendelse; subscriber leser snapshot ved `workout:paused` og på egen 2s-gating fra tick-hendelse… **Nei — enklest og bit-identisk:** behold gating-logikken i motoren, men kall en injisert `onPersist(sessionData)`-callback (default no-op) som persistenceSubscriber kobler. |
| `wakeLockService.*` | fjernes fra motor; hook-bindingen eier wake lock (α5) |
| `stopCurrentPersonaAudio()` i pause/reset | `workout:paused` / `workout:reset` |
| `motionTrackerService.start/stop` | beholdes som motor-kall? **Nei** — emitteres ikke; flytt til `phase:started`-lytting i vibrationSubscriber? **Avgjørelse: motionTracker-kallene følger med til legacyAudioAdapter** (de er faseknyttede sideeffekter; navnet til tross — adapteren er «legacy side effects»). |

- [ ] **Step 3:** Kjør α2-testene → PASS. **Step 4: Commit** `feat(engine): fasemaskin portert med hendelsesemisjon`

### Task α3: Catch-up-, gating- og reanker-karakterisering

**Files:** Modify `src/services/__tests__/timerEngine.test.ts`, `src/services/timerEngine.ts`

- [ ] **Step 1 (rød):** Port de gjenværende testgruppene: dvale +95 s (én `resync`-hendelse, korrekt landing), dvale forbi slutt (én `workout:completed`), normal drift (ingen resync), render-gating (10 ticks à 100 ms → `getSnapshot()` returnerer maks 2 ulike identiteter; sammenlign med `Object.is`), frossen `performance.now` + Date.now-drift (reanker — `Date.now` mockes fortsatt med spy her siden motoren leser den for drift), sub-terskel/negativ drift no-op, persona-3-2-1-guarden (ingen `countdown`-emisjon når fasen alt er utløpt — men merk: countdown er standard-pip-hendelsen; persona-guarden fra a1dc749 blir adapter-ansvar, motoren emitter `countdown` kun ved `remaining > 0` — bevar eksakt betingelse fra hook-linjene).
- [ ] **Step 2:** Implementer til grønt: tick-metoden portert (drift-sjekk øverst, anker-refresh, gating via snapshot-materialisering — snapshot-cache invalideres kun når `Math.ceil(remaining)`, `Math.floor(elapsed)`, fase, status eller toggles endres).
- [ ] **Step 3: `restoreSession`-fiksen (eneste tilsiktede adferdsendring):** i `restore()` og `resume()`: `workoutStartTime = now() - session.totalElapsedSeconds * 1000` (symmetrisk med phaseStartTime-linjen). Skriv testen FØRST: restore med 120 s forløpt → tick → `getSnapshot().totalElapsedSeconds` ≈ 120, ikke ≈ 0.
- [ ] **Step 4: Commit** `feat(engine): catch-up/gating/reanker portert + restoreSession-tidsfiks`

### Task α4: Adapterne (lyd ordrett + vibrasjon + persistens + MediaSession)

**Files:** Create `src/services/legacyAudioAdapter.ts`, `src/services/vibrationSubscriber.ts`, `src/services/persistenceSubscriber.ts`, `src/services/mediaSessionSubscriber.ts`, `src/services/__tests__/legacyAudioAdapter.test.ts`; Modify `src/components/timer/TimerDisplay.tsx` (kun slette MediaSession-effekten)

- [ ] **Step 1 (rød):** `legacyAudioAdapter.test.ts`: injiser hendelser, asserter at NØYAKTIG dagens tjenestekall skjer — f.eks. `phase:started(work, silent=false, persona=standard)` → `audioService.playWorkStart` + `speechService.announceWork(exercise.name, tone)`; persona-prepare med `durationS >= 6` → `playIntroThenExercise`; resync med persona → `playPersonaResyncCue`-semantikken. Kilde for fasiten: dagens forgreninger i hooken (`setupPhase`-lydblokkene, `playResyncCue`, prepare-intro-kjeden) — kopier betingelsene ordrett.
- [ ] **Step 2:** Implementer `createLegacyAudioAdapter(engine): () => void` (returnerer unsubscribe). Flytt lydkoden ORDRETT — samme if-setninger, samme kall, inkl. motionTracker start/stop på work/rest. → PASS.
- [ ] **Step 3:** `vibrationSubscriber` (countdown→`vibrationService.countdown`, phase:started work/rest→workStart/restStart, completed→workoutComplete — samme enabled-gating fra snapshot), `persistenceSubscriber` (kobler `onPersist` + `clearInterruptedSession` ved completed/reset), `mediaSessionSubscriber` (porter effekten fra `TimerDisplay.tsx` — `updateMediaSession` fra snapshot ved phase/status-endring, `clearMediaSession` ellers; onNext/onPrevious kobles til engine-metodene, mens onPlay/onPause injiseres som callbacks fra hook-bindingen (α5) med engine-fallback — **planrettelse fra PR-α-sluttreview (V1):** originalteksten sa «koble handlingscallbacks til engine-metodene» for alle fire, men play/pause må gå via hookens resumeWorkout/pauseWorkout for å beholde audio-unlock/speech-init/wake-lock-sideeffektene fra låseskjermen). Slett effekten fra TimerDisplay (kun den — behold `formatTime`-bruken der den ellers brukes).
- [ ] **Step 4:** `npx vitest run src/services/__tests__/` → alle grønne. **Commit** `feat(engine): legacy-adaptere for lyd/vibrasjon/persistens/MediaSession`

### Task α5: Hook-bindingen

**Files:** Rewrite `src/hooks/useIntervalTimer.ts`

- [ ] **Step 1:** Skriv om hooken til bind (~120 linjer) — offentlig API UENDRET (samme retur-objekt):

```ts
export function useIntervalTimer({ workout }: UseIntervalTimerProps) {
  const engineRef = useRef<TimerEngine | null>(null);
  if (!engineRef.current) engineRef.current = new TimerEngine(workout);
  const engine = engineRef.current;

  useEffect(() => { engine.setWorkout(workout); }, [workout]);       // idle-sync som i dag
  const state = useSyncExternalStore(engine.subscribe, engine.getSnapshot);

  useEffect(() => {                                                   // abonnenter + ticker
    const subs = [createLegacyAudioAdapter(engine), createVibrationSubscriber(engine),
                  createPersistenceSubscriber(engine), createMediaSessionSubscriber(engine)];
    return () => subs.forEach(u => u());
  }, [engine]);

  useEffect(() => {                                                   // ticker + visibility, som i dag
    if (state.status !== 'running') return;
    const ticker = createTicker(() => engine.tick()); ticker.start();
    const onVis = () => { if (document.visibilityState === 'visible') engine.tick(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { ticker.stop(); document.removeEventListener('visibilitychange', onVis); };
  }, [state.status, engine]);

  const startWorkout = useCallback(async (w?: WorkoutTemplate) => {   // async-sideeffekter bor i hooken
    preloadPersonaAudio();
    audioClipService.preloadClips((/* som i dag */));
    await audioService.unlockAudio(); speechService.init();
    if (engine.getSnapshot().wakeLockEnabled) await wakeLockService.requestLock();
    perfMonitorService.startWorkoutMonitoring();
    engine.start(w);
  }, [engine]);
  // pause/resume/reset/restore: samme mønster — wake lock + perf-rapportering ved completed
  // beholdes som i dag (effekt som lytter på state.status === 'completed').
  ...
}
```

- [ ] **Step 2:** **Fasit-porten:** `npx vitest run src/hooks/__tests__/useIntervalTimer.test.ts` — de 23 eksisterende testene skal passere UENDRET (dette er bit-identisk-beviset; forventet friksjon: fake-timer-testene driver nå ticker-fallbacken som kaller `engine.tick` — motorens `now` må da være `performance.now` som spies i disse testene; det er default, så det holder).
- [ ] **Step 3:** Full `npx vitest run` + `npx tsc` + `npx vite build` → grønt. **Commit** `refactor(timer): hook som tynt useSyncExternalStore-bind over TimerEngine`

### Task α6: PR α

- [ ] Full verifisering; PR `feat/b3-timerengine` → main med to-trinns review (etablert regime). PR-tekst refererer spec § 3 + § 6 og lister adferdskontrakten + den ene tilsiktede endringen.

---

# PR β — AudioDirector (lookahead + policy)

### Task β1: `scheduleSequence` + tidsbroen

**Files:** Modify `src/services/audioBufferEngine.ts`, `src/services/__tests__/audioBufferEngine.test.ts`

- [ ] **Step 1 (rød):** Tester: (a) `setTimeBridge(engineNowMs)` måler offset slik at `toAudioTime(engineMs) = engineMs/1000 + (ctx.currentTime − engineNowMs/1000)`; (b) `scheduleSequence(['a'], { endAt: T })` → source.start kalles med `toAudioTime(T) − buffer.duration`; (c) `{ startAt: T }` → start på `toAudioTime(T)`; (d) anker i fortiden/for trangt vindu (`toAudioTime(endAt) − duration < ctx.currentTime + SCHEDULE_LEAD_S`) → resolver `false` uten å spille; (e) `stop()`/ny sekvens kansellerer planlagt (epoch — gjenbruk eksisterende mekanisme, ny test for skedulert-men-ikke-startet kilde).
- [ ] **Step 2:** Implementer: `scheduleSequence(keys: string[], anchor: { endAt?: number; startAt?: number }, opts?): Promise<boolean>` — gjenbruker `computeSequenceSchedule` med `startAt`-parameteren den allerede har; `endAt` regnes om til startAt via sum av varigheter minus crossfader. Samme kontrakt som `playSequence` ellers (false ved ucachet nøkkel, aldri reject, ducking ved faktisk avspillingsstart — bruk en skedulert gain-rampe eller `setTimeout` til duck-start ved `startAt`; velg det som er testbart og kommenter). → PASS. **Commit** `feat(audio): scheduleSequence med absolutt anker og tidsbro`

**Planrettelse (fra alpha3-review):** Motoren emitter `phase:deadlineChanged` fra og med alpha3-fiksen på to steder: (a) etter catch-up-bakdateringen av landingsfasen (den emitterte `phase:started.endsAt` er da foreldet med restOvershoot — deadlineChanged rett etterpaa baerer korrekt frist), og (b) etter drift-reanker i tick. beta2 konsumerer; ingen beta-task skal legge til emisjonen selv.

**Planrettelse 2 (fra β2-funn — flerkjedemodell, implementeres som Task β2.5 FØR β4):**
β1 arvet playSequence sin én-kjede-semantikk («ny sekvens kansellerer planlagt»), men Director skedulerer FLERE samtidige kjeder (start_321 endAt=T + go startAt=T + last5 startAt=T−5000, pluss reaktive avspillinger i samme fase). Ny modell i `audioBufferEngine`:
- Intern kjede-liste (`ActiveChain[]`) i stedet for singular `activeChain`.
- `playSequence` (reaktiv): stopper kun HØRBARE kjeder (startet, ikke endt) — «én stemme om gangen» håndheves ved avspilling; skedulerte fremtidskjeder bevares.
- `scheduleSequence`: additiv — stopper ALDRI noe. Director eier ikke-overlappende ankre.
- `stop(fadeOutS?)`: stopper alt (hørbart fades; skedulert kanselleres stille).
- Ny `cancelScheduled()`: kansellerer kun ikke-startede kjeder.
- Ducking: refcount/first-audible→duck, none-audible→unduck (par-balansert på tvers av kjeder).
- Director-mapping oppdateres: `deadlineChanged`/skip → `cancelScheduled()` + reskeduler; pause/reset → `stop()`.
Eksisterende β1-tester som pinner «ny sekvens kansellerer skedulert» oppdateres til ny kontrakt (begrunnet i test-kommentar); epoch-mekanismen gjelder per kjede.

### Task β2: AudioDirector-kjernen

**Files:** Create `src/services/audioDirector.ts`, `src/services/__tests__/audioDirector.test.ts`

- [ ] **Step 1 (rød):** Tester med injiserte hendelser + mocket lydgrense (spy på audioBufferEngine/speechService/audioService/coachPersonaService):
  - `phase:started(prepare, persona, endsAt=T)` → `scheduleSequence([start_321], {endAt: T})` OG `scheduleSequence([go-N], {startAt: T})`
  - `phase:deadlineChanged(T2)` → kansellering + reskedulering hvis vinduet holder; ellers ingen tale, kun pip-fallback
  - `phase:started(rest, persona)` → rest-cue + neste-øvelsesnavn-kjede (som i dag) + lookahead for neste grense
  - standard (ingen persona): `countdown` → `playCountdownBeep` (reaktivt, som i dag); ingen lookahead
  - `last5`: NY trigger — skeduleres ved `endAt = T` med `startAt = T − 5000` når arbeidsfasen ≥ 15 s (cue-fila finnes, var utriggret; dette er en bevisst β-adferdsutvidelse, dokumentér i kommentar)
  - `workout:paused`/`reset`/skip (`phase:started` med ny fase før forrige frist) → alt planlagt kanselleres med fade
  - prioritetsresolver (ren funksjon, egen test-tabell):

```ts
/** Rekkefølge (spec § 4): persona-klipp → studioklipp → bro+TTS (kun egendefinert) → pip. */
export function resolveAnnouncementPlan(input: {
  personaActive: boolean; personaClipCached: boolean; studioClipCached: boolean;
  isCustomExercise: boolean; speechEnabled: boolean;
}): 'persona' | 'studio' | 'bridge-tts' | 'tts' | 'beep-only'
```

- [ ] **Step 2:** Implementer `createAudioDirector(engine): () => void`. Lookahead kun for persona-stien; standard-stien speiler LegacyAudioAdapter (flytt den koden inn, behold betingelsene). Ducking og «én stemme»-invarianten eies her. → PASS. **Commit** `feat(audio): AudioDirector med fristbasert lookahead og prioritetsresolver`

**Planrettelse 4 (fra samle-review β1–β2.5) — fire korrekthetfikser som SKAL inn i β3, før β4-koblingen:**
1. **Bro-drift:** ctx.currentTime fryser ved mid-økt-suspensjon mens motorklokken løper — drift-reankeren fanger det IKKE (begge dens klokker løper), så alle ankre blir permanent D sekunder sene. Fiks: re-mål broen per fase — `setTimeBridge(engine.getNow())` øverst i `handlePhaseStarted` OG i `handleDeadlineChanged` (gratis i forgrunn, alltid fersk).
2. **beepFallback-nullstilling:** flagget nullstilles ikke ved vellykket reskedulering (deadlineChanged) → pip oppå korrekt skedulert stemme. Fiks: `beepFallback = false` før `issuePending` i `handleDeadlineChanged`.
3. **Epoch-krysskontaminering:** global `stopEpoch` bumpes av `stopAudibleChains`/`cancelScheduled`, så en ventende `scheduleSequence` (i resume-await) invalideres av en reaktiv cue den aldri skulle røre — og `true`-svaret undertrykker pip-fallback. Fiks: skill tellerne (full-stop-epoch vs. audible-stop) eller per-kjede-epoch; kun `stop()` skal invalidere ventende scheduleSequence. Test krysskontamineringen eksplisitt.
4. **To-stemmer-overlapp ved skedulert-blir-hørbar:** en scheduleSequence-kjede som når startAt preempter ingenting — kort prepare gir intro-kjede + start_321 samtidig. Fiks: `markAudible` for skedulert kjede stopper andre hørbare kjeder (varsomt ift. punkt 3s epoch-skille).
Tillegg: den degraderte intro-stien (`playPersonaCue('intro')` i mirrorPrepare-fallbacken) er nok et kallsted for Planrettelse 3-feilklassen; suksess-stien overlever i dag kun via en skjør rekkefølgeavhengighet (stopp før planLookahead) — kommenter den. Minor-følge: koble/juster `resolveAnnouncementPlan`-docstringen, test `phaseEpoch`-vakten i issuePending, throttling-forbehold i duck-timer-kommentaren.

**Planrettelse 3 (fra β2.5-funn):** `coachPersonaService.stopCurrentPersonaAudio()` kalles før hver reaktive persona-cue og gjør full `audioBufferEngine.stop()` — som under flerkjedemodellen kansellerer Directors skedulerte lookahead (f.eks. last5) hver gang halfway spilles. β3 splitter semantikken: reaktive cues skal kun stoppe HØRBAR tale (HTMLAudio-elementet + hørbare kjeder — playSequence gjør sistnevnte selv nå), mens full stop() forbeholdes pause/reset-stiene. Test: halfway-cue mens last5 er skedulert → last5 overlever.

### Task β3: Bro + TTS for egendefinerte, persona-resync

**Files:** Modify `src/services/audioDirector.ts`, `src/services/coachPersonaService.ts`, tests

- [ ] **Step 1 (rød):** Tester: egendefinert øvelse (id starter med `custom-` eller `isCustom`) + persona → `playSequence([bro-neste])` og DERETTER (await) `speechService.speak(navn)`; resync + persona → `[bro-resync, exercise-<id>]`-kjede når cachet, ellers bro + TTS-navn; resync uten persona → dagens standard-resync (uendret).
- [ ] **Step 2:** Implementer; `coachPersonaService` får `getPersonaClipKey(cue | exerciseId)` som slår opp i generert manifest (β5 leverer datakilden; her mot eksisterende `cuesPath`-konvensjon + fallback). → PASS. **Commit** `feat(audio): bro+TTS for egendefinerte øvelser og persona-bevisst resync`

### Task β4: Bytt adapter → Director

**Files:** Modify `src/hooks/useIntervalTimer.ts`; Delete `src/services/legacyAudioAdapter.ts` + test

- [ ] **Step 1:** Hook-bindingen bytter `createLegacyAudioAdapter` → `createAudioDirector`. Slett adapteren + testen (motionTracker-kallene flytter til Director uendret).
- [ ] **Step 2:** `npx vitest run src/hooks/__tests__/useIntervalTimer.test.ts`: standard-sti-testene skal være grønne UENDRET. Persona-testene som asserterer den gamle reaktive intro-kjeden justeres til lookahead-forventningene — HVER justering begrunnes i test-kommentar med referanse til spec § 4 (dette er de eneste tillatte test-endringene).
- [ ] **Step 3:** Full suite + tsc + build. **Commit** `refactor(audio): AudioDirector erstatter LegacyAudioAdapter`

### Task β5: Manifest-generatoren

**Files:** Create `scripts/generate-audio-manifest.mjs`; Modify `package.json` (`"prebuild": "node scripts/generate-audio-manifest.mjs"`); generated `src/data/personaAudioManifest.json`

- [ ] **Step 1 (rød):** Test i `src/services/__tests__/` (node-env, fixture-mapper via `mkdtemp`): generatoren funker mot en fixturmappe — komplett persona → ingen advarsler; manglende `go-2` → advarsel med persona+cue; output-JSON har `{ persona: { cueKey: url } }`-formen.
- [ ] **Step 2:** Implementer (ekte kode, kjørbar med `node`):

```js
// scripts/generate-audio-manifest.mjs — genererer persona-lydmanifest ved bygg.
// Manglende klipp = byggtidsadvarsel (exit 0), aldri stille TTS-fallback i prod (spec § 5).
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const AUDIO_DIR = join(ROOT, 'public', 'audio', 'personas');
const OUT = join(ROOT, 'src', 'data', 'personaAudioManifest.json');
const REQUIRED = ['intro','start_321','go-1','go-2','go-3','halfway','last5','rest','finish',
                  'bro-neste','bro-naa','bro-resync'];

const exerciseIds = [...readFileSync(join(ROOT,'src','data','exercises.ts'),'utf8')
  .matchAll(/id:\s*'([a-z0-9-]+)'/g)].map(m => m[1]);

const manifest = {};
for (const persona of existsSync(AUDIO_DIR) ? readdirSync(AUDIO_DIR, { withFileTypes: true })
       .filter(d => d.isDirectory()).map(d => d.name) : []) {
  const files = new Set(readdirSync(join(AUDIO_DIR, persona)).filter(f => f.endsWith('.mp3')));
  manifest[persona] = Object.fromEntries([...files].map(f =>
    [f.replace(/\.mp3$/, ''), `/audio/personas/${persona}/${f}`]));
  for (const cue of REQUIRED) if (!files.has(`${cue}.mp3`))
    console.warn(`[audio-manifest] ${persona}: mangler ${cue}.mp3`);
  const missingEx = exerciseIds.filter(id => !files.has(`exercise-${id}.mp3`));
  if (missingEx.length) console.warn(
    `[audio-manifest] ${persona}: mangler ${missingEx.length} øvelsesnavn (${missingEx.slice(0,3).join(', ')}…)`);
}
writeFileSync(OUT, JSON.stringify(manifest, null, 2) + '\n');
console.log(`[audio-manifest] skrev ${OUT} (${Object.keys(manifest).length} personas)`);
```

- [ ] **Step 3:** `coachPersonaService`/Director leser `personaAudioManifest.json` (import) med fallback til dagens `cuesPath`-konvensjon når manifestet mangler personaen. → tester PASS. **Commit** `feat(audio): byggtids-generert persona-manifest med mangel-advarsler`

### Task β6: Offline-caching + preload ved persona-valg

**Files:** Modify `vite.config.ts`, `src/components/settings/CoachPersonaModal.tsx` (eller der persona velges — verifiser med grep `setActiveCoachPersona`)

- [ ] **Step 1:** Legg til i eksisterende `runtimeCaching`-array i `vite.config.ts`:

```ts
{ urlPattern: /\/audio\/.*\.mp3$/, handler: 'CacheFirst',
  options: { cacheName: 'persona-audio',
             expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 365 } } },
```

- [ ] **Step 2:** Ved persona-valg: fire-and-forget preload av personaens fulle manifest-sett (`audioBufferEngine.preload(alle nøkler for personaen)`) — én linje + hvorfor-kommentar (offline-garantien fra spec § 5).
- [ ] **Step 3:** `npx vite build` → verifiser i output at SW genereres uten feil. **Commit** `feat(pwa): runtime-caching av persona-lyd + preload ved persona-valg`

### Task β7: PR β

- [ ] Full verifisering (inkl. `npm run test:rules` i CI); PR `feat/b3-audiodirector` → main (etter at PR α er merget). PR-tekst: spec-referanse, de justerte persona-testene listes med begrunnelse, og en instruks om å sammenligne A5s lydavviks-buckets før/etter i prod som feltakseptanse (målekort: p95 < 20 ms).

---

## Self-review (utført ved skriving)

- **Spec-dekning:** § 3 → α1–α5; § 4 → β2–β4; § 5 → β5–β6 (+ Kitor-batchen som eksplisitt eksternt spor); § 6 → teststrukturen i alle tasks; § 2 restoreSession-fiksen → α3. `last5`-trigging er dokumentert som bevisst β-utvidelse (var utriggret innhold).
- **Typer på tvers:** `EngineEvent` defineres én gang (α1) og brukes i α2/α4/β2-koden; `scheduleSequence`-signaturen i β1 matcher bruken i β2/β3; `resolveAnnouncementPlan`-navnet er konsistent.
- **Ingen plassholdere:** porteringsinstruksjoner peker på eksakte kilder (fil + symbolnavn) der innholdet allerede finnes i repoet; all NY kontrakt har full kode.

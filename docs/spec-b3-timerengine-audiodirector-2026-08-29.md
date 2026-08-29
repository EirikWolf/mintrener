# Spec: B3 — TimerEngine-uttrekk og AudioDirector

**Dato:** 29. august 2026
**Status:** Design godkjent seksjonsvis av Eirik 29.08 (fire seksjoner). Dette dokumentet er den samlede kontrakten for implementasjonsplanen.
**Kilde:** Systemrevisjonen v2.0 § 2.1–2.2, arbeidsordren Bolk B3, samt designdialog 29.08.

---

## 1. Bakgrunn og drivere

Tre likestilte drivere (bekreftet av produkteier):

- **A. Moonshot-forberedelse:** Blindmodus (§ 8.2) krever en motor som avgir hendelser uten UI; Puls-svermen (§ 8.1) krever at flere visninger kan abonnere på samme motor.
- **B. Robusthet og testbarhet:** Fasemaskinen bor i en ~700-linjers React-hook der hver tilstandsbit finnes i tre representasjoner (React-state, `stateRef`-speil, `precise*`-speil). Divergens-bugs har allerede oppstått (`restoreSession`), og motorlogikken kan bare testes via `renderHook` + fake timers.
- **C. Lydpresisjon og -policy:** Trenertilropene utløses i dag *reaktivt* (ticken oppdager «3,5 s igjen» og starter avspilling) med 100 ms granularitet — «EN!» lander ikke på fasegrensen. Lydprioritering (persona/klipp/TTS/pip) er spredt over fire tjenester uten én eier. Produkteiers eksplisitte forventning: nedtellingen skal kulminere *nøyaktig* på fasegrensen, og hver persona skal kunne bære en hel økt uten syntetisk stemme.

**Innholdskontekst:** Fire «Tre-To-En»-innspillinger (Boyband, Hardcore, Haugesund, Romsdalen) + stemme-seeds ligger i `audio/` og skal gjennom Chatterbox på Kitor. Batchens bestillingsliste defineres av dette dokumentets § 5.

## 2. Mål og ikke-mål

**Mål:**
1. Rammeverksfri `TimerEngine` med snapshot- og hendelseskanal; hooken blir et tynt `useSyncExternalStore`-bind. Bit-identisk adferd (én unntak: `restoreSession`/`workoutStartTime`-buggen fikses).
2. `AudioDirector` som eneste lydabonnent: prioritering, kansellering, ducking og **fristbasert lookahead-skedulering** (nedtelling ankret i fasegrense-slutt, arbeidstilrop på grensen, sample-nøyaktig).
3. Definitiv cue-taksonomi per persona (= Kitor-batchens bestillingsliste) + byggtids-generert manifest.
4. Offline-strategi for persona-lyd (workbox runtime-caching + preload ved persona-valg).

**Ikke-mål (eksplisitt utenfor):**
- Ingen tilstandsmaskin-bibliotek (XState o.l.) — minimal-avhengighets-regelen.
- Ingen Worklet/Wasm (arbeidsordrens «ikke gjør»-liste; beat-matching er moonshot § 8.3).
- Ingen endring i `TimerDisplay`/UI (hookens offentlige API er uendret).
- Selve innholdsproduksjonen (Chatterbox-kjøringen) — eget spor hos produkteier, parallelt.

## 3. TimerEngine — API og hendelsesmodell (seksjon 1, godkjent)

**Plassering:** `src/services/timerEngine.ts`. Ren klasse, null React, null lyd-imports. Tidskilde injiseres (`now: () => number`, default `performance.now`). Ticker-en (worker-metronomet) forblir utenfor; hooken kobler `createTicker(engine.tick)`.

**To kanaler:**

1. **Snapshot-kanalen** (React): `subscribe(listener)` + `getSnapshot(): TimerState`. Immutabelt objekt; **ny identitet kun når noe rendringsverdig endres** (hel-sekund, fase, status, toggles). Dette erstatter A3-gatingen og hele `precise*`-floraen — motoren regner internt alltid presist, snapshot-identitet er gating-mekanismen.

2. **Hendelseskanalen** (Directors): `subscribeEvents(handler)` med typet union. Hendelser trigger aldri render.

```ts
type EngineEvent =
  | { type: 'phase:started'; phase: IntervalPhase; round: number; itemIndex: number;
      exercise: ExerciseItem | null; silent: boolean;
      endsAt: number | null }                     // absolutt motortid for fasegrensen
  | { type: 'phase:deadlineChanged'; endsAt: number } // pause/resume/dvale-reanker
  | { type: 'countdown'; secondsLeft: 1 | 2 | 3 }     // standard-stiens reaktive pip
  | { type: 'resync'; skippedPhases: number; landingPhase: IntervalPhase }
  | { type: 'workout:completed' };
```

`endsAt` er lookahead-valutaen. `phase:deadlineChanged` er korrekthetskravet som gjør pause/fortsett og dvale-reanker trygt for planlagt lyd.

**Adferdskontrakt:** Samme catch-up (inkl. `CATCH_UP_THRESHOLD_S`/`MAX_CATCH_UP_PHASES`), samme silent-flagg-semantikk, samme drift-reanker (`SLEEP_REANCHOR_THRESHOLD_MS`), samme epoch-forståelse. Offentlige metoder speiler dagens hook-API: `start/pause/resume/reset/skipNext/previous/restore/tick` + toggles. Toggles er motor-tilstand i snapshotet.

**Tilsiktet adferdsendring (én):** `restore` + `resume` bakdaterer nå også `workoutStartTime` fra gjenopprettet forløpt tid, slik at `saveInterruptedSession` ikke rapporterer tid-siden-sidelast.

## 4. AudioDirector — policy, lookahead, kansellering (seksjon 2, godkjent)

**Plassering:** `src/services/audioDirector.ts` — eneste modul som abonnerer på motorhendelser *og* kaller lydtjenester. Vibrasjon, MediaSession og øktlagring blir tre egne småabonnenter (hver ~30 linjer, egne filer).

**Prioriteringskjede (ett sted):**
1. Persona-klipp (buffret)
2. Studioklipp (buffret, standard-stemme)
3. **Bro + TTS** — kun egendefinerte øvelser: personaens bro-frase («Neste øvelse:») kjedes sample-nøyaktig, TTS leser kun navnet (produkteiers valg B)
4. Pip (fase-signal når tale er av)

**Lookahead:** Ved `phase:started` (prepare/rest/round_rest) med `endsAt`: skeduler `start_321` med anker i slutt (`start = endsAt − buffer.duration`) og `go`-tilropet med `start = endsAt`. Krever API-utvidelse i `audioBufferEngine`: `scheduleSequence(keys, { endAt?: number; startAt?: number })` mot samme AudioContext-klokke; motortid↔lydtid broes med ett offset målt ved øktstart. Standard-stien (uten persona) beholder dagens reaktive pip via `countdown`-hendelser — null adferdsendring der.

**Kansellering:** `phase:deadlineChanged` → kanseller planlagte kilder (gjenbruk epoch-mekanismen) og reskeduler mot ny frist *hvis* klippet fortsatt rekker helt; ellers kortere variant eller kun pip — aldri avkuttet tale. Pause/skip → kanseller med fade. Resync: `bro-resync` («Du er nå på:») + øvelsesnavn, persona-bevisst (lukker restpunktet fra Oppgave 2).

**Strukturell gevinst:** Director er eneste talestarter → kryssti-overlapp-feilklassen dør; ducking eies her.

## 5. Cue-taksonomi og innholdskontrakt (seksjon 3, godkjent)

Produkteiers valg: **full persona-dekning (A)** — hver persona leser alt, inkl. øvelsesnavn; **bro + TTS (B)** for egendefinerte øvelser.

| Cue | Antall per persona | Merknad |
|:--|:--|:--|
| `intro` | 1 | Finnes |
| `start_321` | 1 | Tre-To-En-innspillingene; ankres i fasegrense-slutt |
| `go` | 3 varianter | Ny — arbeidstilrop på grensen; deterministisk rullering |
| `halfway` | 1 | Finnes |
| `last5` | 1 | Finnes |
| `rest` | 1 | Ny — pausetilrop |
| `finish` | 1 | Finnes |
| `bro-neste`, `bro-naa`, `bro-resync` | 3 | Nye — broer for egendefinerte øvelser og resync |
| `exercise-<id>` | 25 (vokser) | Alle øvelsesnavn per persona |

**≈ 37 klipp/persona → ≈ 148 i batch** for dagens fire. Kostnadsforpliktelser (akseptert av produkteier): +1 frase × antall personas per ny øvelse; fullt sett per ny persona (stemmebutikken); QA-gjennomlytting per persona.

**Filskjema:** `/audio/personas/<persona>/<cue>.mp3` og `/audio/personas/<persona>/exercise-<id>.mp3`.
**Manifest:** genereres av skript i `scripts/` ved bygg (skanner mappene); manglende klipp = byggtidsadvarsel, ikke stille TTS-fallback.
**Lydkrav til Kitor-pipelinen:** silenceremove/afade (som i dag) + loudness-normalisering til felles nivå på tvers av personas.
**Offline:** workbox runtime-caching av `/audio/**` (cache-first; filene er immutable) + full preload av personaens sett ved persona-valg.

## 6. Teststrategi og leveransesekvens (seksjon 4, godkjent)

**Karakterisering før konstruksjon:** De 23 hook-testene porteres til motornivå *først* og kjøres rødt mot tom klasse. Injisert klokke → `engine.tick(t)` direkte; ingen `renderHook`/fake timers/performance-spies i motortestene. Hook-testene beholdes som bindings-vern.

**LegacyAudioAdapter:** I etappe 1 flyttes dagens lydkode *ordrett* til en midlertidig abonnent — motoren blir stum umiddelbart, adferden forblir bit-identisk og reviewbar. Etappe 2 erstatter adapteren med Director. Lyd bor aldri to steder.

**Etappe 2-tester:** Director med injiserte hendelser + mocket lydmotor-grense: lookahead-matematikk, `deadlineChanged`-kansellering, for-kort-vindu-degradering, fallback-kjeden inkl. bro+TTS, persona-resync. `scheduleSequence` testes i lydmotor-suiten.

**Målbar akseptanse:** A5-instrumenteringens lydavviks-buckets gir før/etter-tall; forventet effekt er p95 nær null for lookahead-skedulerte cues (målekortets krav: p95 < 20 ms).

**Leveranser:**
1. **PR α:** karakteriseringstester + `TimerEngine` + hook-binding + `LegacyAudioAdapter` + søsken-abonnentene for vibrasjon/MediaSession/lagring (de hører til uttrekket — hooken skal bli tynn i α, ikke i β) + `restoreSession`-fiksen
2. **PR β:** `AudioDirector` + `scheduleSequence` + manifest-skript + workbox-caching + bro/TTS-policy
3. **Parallelt:** Kitor-batchen (produkteier) — kan starte umiddelbart, taksonomien i § 5 er kontrakten
4. **Etter β:** felttest før deploy (hørbare endringer); A7-felttesten er uansett utestående

Hver PR følger etablert regime: to-trinns review, fix-løkker, CI-port.

## 7. Risiko og mottiltak

| Risiko | Mottiltak |
|:--|:--|
| Review-herdede subtiliteter mistes i omskrivingen (catch-up, reanker, epoch) | Karakteriseringstester porteres FØR motoren skrives; LegacyAudioAdapter holder lyd ordrett |
| Lookahead-skedulert lyd spilles etter pause/skip | `phase:deadlineChanged` + kansellering er del av kontrakten, med egne tester |
| Motortid↔lydtid-offset drifter | Offset måles ved øktstart; `deadlineChanged` reskedulerer uansett ved alle frist-flytt |
| Manifest/innhold i utakt | Byggtids-generert manifest med advarsler; Director faller pent tilbake per prioriteringskjeden |
| Snapshot-gating endrer render-adferd | Bindings-testene fra A3 (render-probe) beholdes og må passere uendret |

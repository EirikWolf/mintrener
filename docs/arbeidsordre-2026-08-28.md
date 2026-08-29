# ARBEIDSORDRE: MIN TRENER — etter systemrevisjon v2.0 (28.08.2026)

Kondensat av `docs/systemrevisjon-moonshot-2026-08-28.md` (dokumentversjon 2.0), skrevet som arbeidsordre for Claude Code/Antigravity. Paragrafreferanser (§) peker inn i revisjonen. Alt under er etterprøvd mot kodebasen 28.08 kveld (main@5ae3a11, feat/q1-teknisk-spor@1d6fc45, fix/a11y-etterslep@6709594, feat/fokusmodus@cba96c4).

## Status — ikke gjør dette på nytt

Levert og verifisert: alle sju quick wins fra v1.0 (save-gating, `performance.now()`, Tanaka-makspuls, stille restore, klipp-preload, delingsattribusjon, a11y Sprint 1). Levert på `feat/q1-teknisk-spor` med tester: worker-tick med fallback, catch-up med stille fast-forward, klokkesynkronisert gruppestart, BLE auto-reconnect + RR-intervaller, semantisk haptikk. Fokusmodus ligger som utkast på `feat/fokusmodus`.

## Bolk A — denne uken (timer per oppgave)

1. **Tett `firestore.rules`:** (a) `global_stats` — erstatt `allow write: if true` med increment-validering via `diff()` på kjente felt, eller `if false` + Cloud Function. (b) `rooms` — krev auth for `participantCount`-diffen og begrens til inkrement-på-én. (c) Bytt `Math.random` → `crypto.getRandomValues` i `generateRoomCode`. [KRITISK/ALVORLIG, § 5.1]
2. **Rules-tester:** `@firebase/rules-unit-testing` mot emulator, ≥ 10 negative adgangstester, inn i CI. [§ 5.3]
3. **`Math.ceil`-gating av nedtellingsrender** i tick-en, slik at `setPhaseRemaining` bailer 9 av 10 ticks. [§ 4.2]
4. **Koble `localAiCoachService` til `WorkoutSummary`** — erstatt de to hardkodede setningene (`WorkoutSummary.tsx:178–181`) med kontekst fra puls/PR/streak/vurdering. [§ 3.4]
5. **Instrumentér:** `PerformanceObserver('longtask')` per øktminutt + faseovergangs-lydavvik + `share_import`-hendelse ved `ref=share`-treff. [§ 9.4, § 6.4]
6. **Dvale-reanker:** ved `visibilitychange` → synlig, sammenlign `Date.now()`-delta mot `performance.now()`-delta; avvik > 2 s → re-anker `phaseStartTime` før catch-up. [§ 2.1]
7. **Felttest (manuell, ikke kode):** fysisk iPhone + Android, skjerm av / lomme, 20 min økt — verifiser faseoverganger, lyd og catch-up. Gate for merge av q1-grenen. [§ 2.1, § 8.2]

## Bolk B — Q1, teknisk spor (avhengighetsrekkefølge)

1. Merge `feat/q1-teknisk-spor` → `main` (bak felttest A7), deretter `fix/a11y-etterslep`; ferdigstill Fokusmodus mot akseptkriteriene i § 7.4 (øvelsesnavn ≥ 28 px, neste-linje ≥ 20 px, maks fire elementer; vurder fokusmodus som standard under økt).
2. **AudioBuffer-migrering** av `audioClipService`/`coachPersonaService`: dekod alle øktens klipp ved start (`decodeAudioData` → `Map<key, AudioBuffer>`), avspilling via `AudioBufferSourceNode.start(t)`, skjøtepunkt beregnet fra `buffer.duration`, 10 ms equal-power crossfade, ducking via `GainNode`. Fjerner `setTimeout(2300)` (`useIntervalTimer.ts:153`) og `pause()`-kutt. Ikke Worklet/Wasm i dette trinnet. [§ 4.1, § 7.1]
3. **`TimerEngine`-uttrekk:** fasemaskin + `stateRef` ut av hooken til rammeverksfri klasse med `subscribe()`; hooken blir `useSyncExternalStore`-bind. Samtidig: **`AudioDirector`** som eneste lydabonnent på domenehendelser (`phase:start`, `countdown`, `workout:complete`) med prioritering persona > klipp > TTS > pip. [§ 2.1–2.2]
4. **Testskjold:** Testing Library på TimerDisplay-statusgrener, gjenopprettingsbanner og grupperom-flyt; én Playwright-røykflyt (start → fullfør → historikk) mot emulator i CI. [§ 5.3]
5. Zod-validering ved grensene (URL-import, localStorage-lasting) + global feil-toast på øktlagring/mal-lagring/konto-sletting. [§ 2.4]
6. Persona-aksentfarger (CSS-variabler i `coachPersonaService`), gestflate i Fokusmodus (dobbelttrykk = pause, sveip = neste/forrige), dimme-modus (`brightness(0.6)` etter 10 s inaktivitet). [§ 3.2–3.3, § 4.4]

## Bolk C — Q1, forretningsspor

1. Streak til førstesiden med tapsinnramming + streak-forsikring (1 hviledag/uke) + dag-14-milepæl i utfordringene. [§ 6.2]
2. Onboarding: «Hvem skal trene deg?» med lydprøver som første steg. [§ 6.1]
3. Stemmebutikk MVP: Vipps-integrasjon, 2 gratis + 4 betalte personas (49–79 kr engangs / 39 kr mnd). [§ 6.3]
4. P2P-utfordringsinvitasjon med delt fremdrift. [§ 7.5]
5. Én B2B-pilot (kontor-profil + TV-modus-demo); art. 9-/DPIA-beredskap klargjøres parallelt. [§ 6.3, § 5.2]

## Sperrer (ikke start før forutsetningen er grønn)

- **Puls-svermen** (§ 8.1): krever B1–B4 **+** rules-herding (A1/A2) **+** DPIA for sonedeling (§ 5.2). RR/HRV-data forlater ikke enheten før DPIA foreligger.
- **Blindmodus** (§ 8.2): krever bestått iOS-felttest (A7) + AudioBuffer (B2).
- **Beat-matching** (§ 8.3): krever B2; trinn 1–2 (BPM-kvantiserte fasegrenser) kan skipes alene.
- **Stemmefabrikken** (§ 8.4): krever validert betalingsvilje fra C3; juridisk (stemmerett/AI-kloning/MVA) fra dag én i kreatør-pilot.

## Målekort (Q1-exit)

Lange tasks < 1/øktmin (målt) · lydavvik p95 < 20 ms · gruppeskjevhet < 100 ms i felt · 100 % faseoverganger med skjerm av på Android + dokumentert iOS-atferd · ≥ 10 grønne rules-tester i CI · D7-baseline etablert · K-faktor målt (> 0,05) · første 100 betalende · 0 WCAG-avvik i kategori A1.

## Ikke gjør

Annonser; betalingsmur på historikk/eksport; freemium-kvoter på økter; `SharedArrayBuffer`/Atomics for ticken; Worklet/Wasm før AudioBuffer-grafen; CRDT-rammeverk (Yjs/Automerge) for datamodellen; ny funksjonsbredde før Bolk A+B er levert.

# Min Trener – Arkitekturbeslutninger (DECISIONS.md)

Dette dokumentet fører en kronologisk oversikt over tekniske og arkitektoniske veivalg tatt under utviklingen av Min Trener, i tråd med instruksjonene i `00-README.md`.

---

## [2026-08-27] Beslutning 1: Kontekstprofiler og deterministisk sammensetting (B.0.4)
* **Kontekst:** Spesifikasjon v1.2 og Vedlegg B.0 spesifiserer at brukeren har et sett med kontekstprofiler (`profiles: ['kontor', 'barn']`), med tre faste modus (Alene, Sammen, Led en gruppe).
* **Valg:**
  1. `src/schemas/profileSchema.ts` og `src/data/profiles/index.ts` opprettet med Zod-validering.
  2. Kun `kontor` og `barn` er merket med `status: 'active'`. De øvrige (`kor`, `senior`, `idrettslag`, `møte`) er definert med `status: 'planned'`.
  3. `src/services/profileCompositionService.ts` implementerer alle deterministiske sammensettingsregler:
     - Union for `contextFilter` og `promote`.
     - Snitt for `hide`-lister.
     - Maks for `textScale` og `reduceMotion` (mest tilgjengelig vinner).
     - Dynamiske hurtigrader per valgt profil (`primaryProfile` øverst).
  4. 1-spørsmåls onboarding-modal (`ProfileOnboardingModal`) vises automatisk ved første oppstart og kan når som helst åpnes og justeres under "Mer → Kontekstprofiler".

---

## [2026-08-27] Beslutning 2: Øvelsesskjema med alternativer og kunnskapsgrunnlag (C.8, C.19)
* **Kontekst:** Vedlegg C.8 krever støtte for øvelsesalternativer (`alternatives: { seated, easier, harder, quiet, noFloor }`) og profilregler (`resolve`, `require`, `forbid`), samt `basis` og `reviewStatus` (C.19).
* **Valg:**
  1. `ExerciseSchema` i `src/schemas/exerciseSchema.ts` utvidet med valgfrie `alternatives`, `basis` (referanseliste) og `reviewStatus` (`draft`, `reviewed`, `public`).
  2. `resolveExerciseForProfile` implementert for å bytte øvelser automatisk basert på profilens `resolve`-preferanser (f.eks. kontor foretrekker `noFloor` og `quiet`).

---

## [2026-08-27] Beslutning 3: Bilde-caching og PWA-oppdatering
* **Kontekst:** Tidligere brukte Service Workeren `CacheFirst` for øvelsesbilder, som forhindret at nye bilder lastet inn direkte ved redeploy.
* **Valg:**
  1. Endret `vite.config.ts` Workbox-strategi til `NetworkFirst` med cache-navn `exercise-images-cache-v2`.
  2. Lagt til versjonsparameter `?v=...` i `ExerciseIllustration.tsx` for øyeblikkelig cache-busting ved nye utrullinger.

---

## [2026-08-27] Beslutning 4: Stemmebank & Kollisjonsfrie regler (B.3)
* **Kontekst:** Vedlegg B.3 krever en dedikert stemmebank for tonene `rolig`, `lek`, `gira` og `tørr` med strenge regler mot overlapp (motivasjon faller aldri i nedtellingen, 30s-påminnelse droppes ved halvveis-kollisjon).
* **Valg:**
  1. `src/data/voiceLines.ts` definerer alle linjer per tone og fase.
  2. `src/services/voiceCoachService.ts` implementerer `VoiceCoachEngine` med presis 5–1 nedtelling per sekund, undertittel-støtte for åpne kontorlandskap, og automatisk varsel når personlig rekord passeres i hold-modus.

---

## [2026-08-27] Beslutning 5: Microtimer & Programoverstyring (B.2, C.8)
* **Kontekst:** Vedlegg B.2 spesifiserer Microtimer med enorm nedtelling (>30% skjermhøyde), 30s/60s/90s/2m/3m/5m hurtigknapper, "Hold til du gir opp"-modus og oppsummering. Vedlegg C.8 krever at brukerbytte av øvelser persisteres for alle fremtidige økter i det programmet.
* **Valg:**
  1. `src/components/micro/MicroTimerDisplay.tsx` bygget med responsiv layout, hold-modus, PR-tracking og enkel "for lett / passe / for tungt"-feedback.
  2. `src/services/programOverrideService.ts` lagrer brukerens øvelsesbytter per program og fletter dem sømløst inn i programkatalogen og øktstarteren.
  3. `src/data/programs.ts` utvidet til over 20 strukturerte starterprogrammer.

---

## [2026-08-27] Beslutning 6: Utfordringer & Ikke-straffende fremgang (C.15, C.15b)
* **Kontekst:** Vedlegg C.15 og C.15b krever at utfordringer (Challenges) er et førsteklasses konsept med 28/30-dagers rutenett, 12 ferdige utfordringer med faste hviledager og faser, og null oppsamling av straff/gjeldsdager hvis en dag hoppes over.
* **Valg:**
  1. `src/schemas/challengeSchema.ts` og `src/data/challenges.ts` oppretter 12 komplette utfordringer (Planke 30 dager, Pushups til 50, Knebøy 30 dager, Kontorvanen 28 dager, Morgenmobilitet, Hollow Body, Tabata Torment, Kettlebell Swing, Balanse, Kveldsro, Familie, Holdningsløftet).
  2. `src/services/challengeService.ts` sporer aktiv utfordring og fullførte dager.
  3. `src/components/challenges/ChallengeDetailModal.tsx` og `ChallengeCatalogModal.tsx` tilbyr et 28/30-dagers rutenett med fargestatus og hviledagsikoner.
  4. Hjem-skjermen (`TimerDisplay.tsx`) viser et aktivt «Dagens utfordring: Dag X»-kort med direkte 1-klikks start og fremdriftslinje.

---

## [2026-08-27] Beslutning 7: Styrkeprogrammer, «Sterkere 12 uker» & Dobbel Progresjon (C.17, C.19)
* **Kontekst:** Vedlegg C.17 og C.19 spesifiserer vitenskapelig dokumentert styrketrening med in-workout logging (vekt/reps per sett), forhåndsutfylling, automatisk hvileteller og dobbel progresjonsmotor (+2.5 kg overkropp, +5.0 kg underkropp ved nådd toppmål for reps i alle sett).
* **Valg:**
  1. `src/schemas/strengthSchema.ts` og `src/data/strengthPrograms.ts` definerer 12-ukers periodisering (Hypertrofi, Styrke, Topping, Deload) med forskningsreferanser (`basis`).
  2. `src/services/strengthProgressionService.ts` lagrer sett-historikk og beregner dobbel progresjon.
  3. `src/components/strength/StrengthWorkoutModal.tsx` gir en sanntids logg-opplevelse med vekt-/rep-steppere, automatisk 90s pause-nedtelling med lydvarsling, og oppsummeringsskjerm med progresjonsforslag.

---

## [2026-08-27] Beslutning 8: Instruktørmodus & TV-Storskjermvisning (B.0, B.4, C.18)
* **Kontekst:** Vedlegg B.0, B.4 og C.18 krever en dedikert instruktøropplevelse for lærere, trenere og ledere av pausetrening, med forhåndsvarsling av neste øvelse og en TV-/prosjektor-optimalisert visning for AirPlay/Chromecast.
* **Valg:**
  1. `src/components/instructor/TvBigScreenDisplay.tsx` opprettet med ekstra store tall, synlig øvelsesbilde, tydelig «Neste øvelse»-instruktørteleprompter og fullskjermstøtte.
  2. Koblet til via en dedikert TV-knapp i kontrollpanelet på Hjem og under aktive økter.

---

## [2026-08-27] Beslutning 9: Justering av Kontorprofil – Tillat gulvøvelser
* **Kontekst:** Brukeren ønsket å fjerne restriksjonen "Ingen gulv" fra Kontor-profilen, slik at øvelser som planke og push-ups kan utføres i et kontormiljø.
* **Valg:**
  1. Oppdatert `src/data/profiles/index.ts` for profilen `kontor`:
     - Beskrivelse endret til: *"Microtrening i hverdagsklær ved pulten. Ingen hopp, diskré lyd og god holdning."*
     - Fjernet `noFloor` fra `resolve`-listen.

---

## [2026-08-27] Beslutning 10: Ferdighetstrær & Mestringsstige for Kroppsvekt (C.7, C.16)
* **Kontekst:** Vedlegg C.7 og C.16 spesifiserer en 7-trinns mestringsstige for de fire store kroppsvektøvelsene: Push-ups, Knebøy, Planke og Pull-ups.
* **Valg:**
  1. `src/schemas/skillTreeSchema.ts` og `src/data/skillTrees.ts` definerer 28 progressive ferdighetsnivåer fra nybegynner (vegg-pushup, stol-knebøy) til elite (ettarms push-up, fri pistol squat, dragon flag, muscle-up).
  2. `src/services/skillTreeService.ts` sporer ulåste og fullførte nivåer samt nivåtester.
  3. `src/components/skills/SkillTreeModal.tsx` tilbyr et horisontalt stige-diagram, nivådetaljer, testregistrering og 1-klikks start av økt.

---

## [2026-08-27] Beslutning 11: Aktivering av alle 6 Kontekstprofiler (B.0)
* **Kontekst:** Vedlegg B.0 definerer 6 kontekstprofiler (`kontor`, `barn`, `kor`, `senior`, `idrettslag`, `møte`).
* **Valg:**
  1. Alle profiler er nå satt til `status: 'active'` i `src/data/profiles/index.ts`.
  2. `ProfileOnboardingModal.tsx` og innstillingsmenyen støtter nå full konfigurering av samtlige 6 profiler med tilpasset talehastighet (0.8x for senior, 0.9x for kor), tekststørrelse (1.6x for senior) og moduser.

---

## [2026-08-27] Beslutning 12: PWA Media Session API & Låseskjerm-kontroller
* **Kontekst:** Brukere som trener med telefonen i lommen eller på stativ trenger å se gjenværende tid og styre timeren (Pause / Fortsett / Neste) direkte fra telefonens låseskjerm.
* **Valg:**
  1. `src/services/mediaSessionService.ts` integrerer nettleserens `navigator.mediaSession` med tittel (øvelsesnavn + tid), artist (fase) og album (økt + runde).
  2. Koblet til `TimerDisplay.tsx` med kontinuerlig synkronisering og støtte for eksterne hodetelefonknapper.

---

## [2026-08-27] Beslutning 13: Sosiale Delingskort & Gruppestatistikk (C.18)
* **Kontekst:** Vedlegg C.18 krever visuelle delingskort for sosiale medier (Teams, Slack, Instagram) og sporing av felles treningsminutter for grupper/familier/kontor.
* **Valg:**
  1. `src/services/shareCardService.ts` rendrer 1080x1080 canvas-grafikk med dyp mørk gradient, badgemerke og store typografiske tall.
  2. `src/components/social/ShareCardModal.tsx` forhåndsviser kortet og tilbyr direkte deling via Web Share API eller PNG-nedlasting.
  3. `src/services/groupStatsService.ts` akkumulerer treningsøkter og beregner felles ukestatistikk.

---

## [2026-08-27] Beslutning 14: Utvidede Lydeffekter via Web Audio API (B.3)
* **Kontekst:** Vedlegg B.3 krever zero-latency lydeffekter tilpasset ulike profiler og øktfaser.
* **Valg:**
  1. `src/services/audioService.ts` utvidet med metallisk boksing-klokke / gong (`playBoxingBell`), sportsfløyte for idrettslag (`playWhistle`) og myk syngeskål for kveldsro (`playSoftChime`).

---

## [2026-08-27] Beslutning 15: Pulssone-styring & Tanaka-formel
* **Kontekst:** Vedlegg C.18 krever presis pulssoneberegning og støtte for dynamisk restitusjonsstyring.
* **Valg:**
  1. `src/services/heartRateZoneService.ts` implementerer Tanakas formel (208 - 0.7 * alder) og deler inn i 5 pulssoner (Sone 1 til Sone 5) med fargekoder og restitusjonssjekk.

---

## [2026-08-27] Beslutning 16: Kanonisering av Spesifikasjonsdokumenter
* **Kontekst:** Mappen `docs/Ny versjon/` inneholdt oppdaterte versjoner av spesifikasjonen og vedleggene.
* **Valg:**
  1. Alle filer fra `docs/Ny versjon/` er flyttet direkte til rotmappen `docs/`, og `Ny versjon`-undermappen er slettet slik at dokumentasjonsstrukturen er ren og autoritativ.

---

## [2026-08-27] Beslutning 17: Kalendersynkronisering (.ics & Google Kalender)
* **Kontekst:** Brukere ønsker å forhåndsplanlegge 28/30-dagers utfordringer med faste tidspunkter i jobb- og privatkalender.
* **Valg:**
  1. `src/services/calendarExportService.ts` genererer gyldige iCalendar `.ics`-filer for hele utfordringen og direktekoblinger til Google Kalender.
  2. `src/components/calendar/CalendarExportModal.tsx` lar brukeren velge tidspunkt på dagen (f.eks. 11:30) og laste ned kalenderfilen.

---

## [2026-08-27] Beslutning 18: Live Pulsgraf under Trening
* **Kontekst:** Under aktive økter med tilkoblet pulsmåler trenger brukeren sanntids innsikt i hjertefrekvens og sonetilhørighet.
* **Valg:**
  1. `src/components/sensors/HeartRateLiveGraph.tsx` tegner en jevn SVG sanntidskurve med sonespesifikk fargegradient direkte under timeren.

---

## [2026-08-27] Beslutning 19: Full Internasjonalisering (i18n)
* **Kontekst:** Støtte for flere språk (Norsk Bokmål, Norsk Nynorsk og Engelsk) for bred tilgjengelighet.
* **Valg:**
  1. `src/services/i18nService.ts` tilbyr ordbøker og reaktiv hendelsesstyring.
  2. Hurtigvelger integrert i innstillingene under *Mer → Språk*.

---

## [2026-08-27] Beslutning 20: Håndfri Stemmestyring (Web Speech Recognition)
* **Kontekst:** Under øvelser som planke, armhevinger eller kettlebell kan ikke brukeren berøre skjermen.
* **Valg:**
  1. `src/services/voiceCommandService.ts` gjenkjenner norske og engelske kommandoer («Pause», «Fortsett», «Neste», «Forrige», «Start på nytt»).
  2. Integrert med kontinuerlig lytteopplevelse og pulserende mikrofonindikator i topplinjen.

---

## [2026-08-27] Beslutning 21: Smart Musikk-Ducking
* **Kontekst:** Bakgrunnsmusikk må ikke overdøve stemmetrenerens instruksjoner eller intervall-pip.
* **Valg:**
  1. `src/services/audioDuckingService.ts` demper automatisk tilkoblede lyd- og mediastrømmer til 25 % volum under tale og gjenoppretter jevnt til 100 % etterpå.
  2. Koblet til `SpeechService`-livssyklusen.

---

## [2026-08-27] Beslutning 22: AI Øktgenerator etter Dagsform & Utstyr
* **Kontekst:** Brukere trenger raskt skreddersydde økter basert på tilgjengelig tid (3–30 min), dagsform/energi og unngåelse av spesifikke skader (vonde knær, korsrygg, skuldre).
* **Valg:**
  1. `src/services/aiWorkoutGeneratorService.ts` velger ut en fysiologisk balansert økt fra øvelsesbiblioteket med tilpassede intervaller og runder.
  2. `src/components/ai/AiWorkoutGeneratorModal.tsx` tilbyr 1-klikks generering og umiddelbar oppstart.

---

## [2026-08-27] Beslutning 23: AI-generert Video-loop Pipeline på Kitor (Wan2.1 I2V)
* **Kontekst:** Brukeren vurderte at statiske fasebilder ikke er tilstrekkelig for å fange dynamikken, tempoet og leddbanene i øvelser (som kettlebell swing, burpees, utfall og mobilitet).
* **Valg:**
  1. Opprettet `docs/backlog.md` med grundig arkitektur for Image-to-Video (I2V) med `Wan2.1` / `CogVideoX` på Kitor (RTX 3090 / 24 GB VRAM).
  2. Startbilde fra Astrid-LoRA animeres til 2–4 sekunders sømløse loops (300–500 KB per øvelse i MP4/WebM) og avspilles som maskinvareakselerert `<video autoPlay loop muted playsInline>` under øktene.
  3. Dokumentert i `docs/vedlegg-a-bildepipeline.md` (kapittel A.15).

---

## [2026-08-27] Beslutning 24: Atomisk Programoppstart, Lydløs Nullstilling & Tone-tilpasset Tale
* **Kontekst:** Ved oppstart av et nytt program fra katalogen (f.eks. *Dyre-safari i stua* med Barn-profil) oppstod det en tilstandskollisjon der den forrige økten (Tabata med Knebøy) ble annonsert under klargjøringen før det nye programmet (Froskehopp) startet.
* **Valg:**
  1. `src/hooks/useIntervalTimer.ts`:
     - `resetWorkout()` er nå 100 % lydløs (`silent = true`), slik at nullstilling aldri trigger tale.
     - `startWorkout(explicitWorkout)` tar inn det nye øktobjektet direkte og setter tilstanden atomisk, uten forsinkelse fra React-re-renderinger.
     - Synkronisering av `activeWorkout` i `useEffect` beskyttet mot feilaktig overskriving under aktive faser.
  2. `src/services/speechService.ts`:
     - `announcePrepare`, `announceWork`, `announceRest` og `announceComplete` støtter nå stemmetoner (`rolig`, `lek`, `gira`, `tørr`).
     - Barn-profilen og programmer med `voiceTone: 'lek'` bruker barnevennlige, lekne tilrop (*«Gjør deg klar til Froskehopp! Nå starter moroa!»* og *«Og kjør på med Froskehopp!»*).
  3. `src/types/workout.ts`:
     - Utvidet `WorkoutTemplate` med valgfri `voiceTone`.

---

## [2026-08-27] Beslutning 25: Fonetisk Uttale-Ordbok & Kitor Chatterbox-TTS Pipeline
* **Kontekst:** Nettleserens innebygde talesyntese (Web Speech API) slet med uttalen av engelske øvelsesnavn (f.eks. «Mountain climbers», «Jumping jacks») og sammensatte norske ord («Bjørnegang», «Kenguru-sprett»).
* **Valg:**
  1. `src/services/speechService.ts`:
     - Implementert `PRONUNCIATION_MAP` og `normalizeTextForSpeech()` som automatisk oversetter engelske låneord til naturlige norske begreper (*«Mountain climbers»* $\rightarrow$ *«Fjellklatrer»*, *«Jumping jacks»* $\rightarrow$ *«Sprellmenn»*, *«Push-ups»* $\rightarrow$ *«Armhevinger»*) og justerer fonetisk trykk for sammensatte ord (*«Bjørne gang»*).
  2. `scripts/generateVoiceAudioBatch.ts`:
     - Opprettet produksjonsskript for å generere ekte forhåndsinnspilte MP3-lydklipp via Chatterbox-TTS på Kitor (RTX 3090) over Tailscale API (`https://kitor.tail49f298.ts.net/chatterbox/tts`), med støtte for voice-cloning og batch-prosessering.
  3. `src/services/audioClipService.ts`:
     - Ny tjeneste som sømløst spiller av ekte MP3-filer fra `src/data/audioManifest.json` når tilgjengelig, og automatisk faller tilbake til forbedret Web Speech API hvis et klipp ikke finnes.

---

## [2026-08-28] Beslutning 26: Subagent-drevet TDD med to-trinns review som utviklingsregime
* **Kontekst:** Systemrevisjonen v2.0 ga en stor arbeidsordre (Bolk A/B/C). Behov for fart uten kvalitetstap.
* **Valg:** Én fersk implementer-subagent per oppgave med full spesifikasjon i prompten; obligatorisk to-trinns review (spec-samsvar → kodekvalitet) med fix-løkker før merge; parallellisering kun i isolerte git-worktrees med disjunkte filflater; CI (inkl. Firestore-emulator) som empirisk port.
* **Konsekvens:** PR #2–#12 levert under regimet. Reviewene fanget ni reelle feil bare i B3 PR α — inkludert fire spesifikasjonsfeil i planverket, ikke bare implementasjonsavvik.

## [2026-08-28] Beslutning 27: Firestore-herding og nestet telemetri-skriveform
* **Kontekst:** Revisjonen v2.0 fant `global_stats` verdensskrivbar [KRITISK] og `rooms` uautentisert muterbar. Rules-arbeidet avdekket i tillegg en eksisterende prod-feil: `setDoc` med merge splitter IKKE punktum-nøkler — fellesskapsstatistikken hadde alltid lagret flate `types.hiit`-nøkler som lesekoden aldri fant.
* **Valg:** Increment-validering via `diff()` med felt-allowlists og bundne deltaer; auth + inkrement-på-én for rom-join; `crypto.getRandomValues` for romkoder; telemetrien skrives om til nestede kart (retter både rules-kompatibilitet og UI-feilen); 21+ regeltester mot emulator i egen CI-jobb. Deploy-rekkefølge dokumentert: app-bygg før innstrammende regler; additive regler før app.
* **Konsekvens:** PR #7/#10/#11; regler deployet 29.08. Restrisiko (enkeltverdier i kart) dokumentert i regelfilen.

## [2026-08-28] Beslutning 28: Bakgrunnsrobust timerkjerne og klokkesynkronisert gruppestart
* **Kontekst:** Hovedtrådens `setInterval` throttles/suspenderes i bakgrunn; oppvåkning ga lydkaskade; gruppestart brukte vertens veggklokke (sekund-skjevhet).
* **Valg:** Worker-metronom med `setInterval`-fallback og `onerror`-degradering; catch-up med stille fast-forward + én resync-cue; NTP-forenklet klokkeoffset mot Firestore `serverTimestamp` (median av 3) med `startAtServerMs` og felles lytterdrevet start for vert og deltakere; BLE auto-reconnect med backoff + RR-intervaller bevart; semantisk haptikk-tabell.
* **Konsekvens:** PR #2. Kjente oppfølgingspunkter logget i `docs/plan-q1-teknisk-2026-08-28.md`.

## [2026-08-28] Beslutning 29: AudioBuffer-motor for stemmeklipp
* **Kontekst:** HTML5 Audio ga 20–200 ms udeterministisk startlatens; sekvensering var gjettet med `setTimeout(2300)`; avbrudd kuttet midt i ord.
* **Valg:** `audioBufferEngine`: dekod øktens klipp ved start, `AudioBufferSourceNode.start(t)` sample-nøyaktig, skjøter beregnet fra `buffer.duration` med equal-power crossfade, `stop()` med fade, kontekst-tilstandsport (dekker WebKit `interrupted`), `stopEpoch`-teller der eksternt stopp alltid vinner. Fallback-kjede til HTMLAudio/TTS bevart. Worklet/Wasm eksplisitt IKKE (reservert beat-matching-moonshot).
* **Konsekvens:** PR #5. Persona-bevisst resync og `setTimeout`-fjerning fullført samme PR.

## [2026-08-28] Beslutning 30: Fokusmodus under aktiv økt
* **Kontekst:** Revisjonen § 3.1: tunnelsyn i pulssone 4/5 gjør 10 px-tekster uleselige; skjermen viste fortsatt idle-kromen under økt.
* **Valg:** Destillert visning ved running/paused: toppkrom skjult, flytende stripe med kun lyd + lås (44 px), forstørret rundelinje/fasebadge/øvelsesnavn/neste-linje. Idle byte-for-byte uendret. `HeartRateWidget` fikk `reattach()` + tilstandsinit fra tjenesten (unmount/remount-regresjonen reviewen fant).
* **Konsekvens:** PR #4, visuelt godkjent live av produkteier før merge.

## [2026-08-29] Beslutning 31: Render-gating, dvale-reanker og ytelsesinstrumentering
* **Kontekst:** 10 React-oppdateringer/s under økt; `performance.now` fryser under OS-dvale på flere plattformer; målekortet manglet måleinstrumenter.
* **Valg:** `Math.ceil/floor`-gating av state-oppdateringer (motorlogikk beholder presise verdier); drift-måling (`Date.now`-delta minus `performance.now`-delta) øverst i hver tick med bakdatering ved > 2 s — plassert i tick, ikke visibility-handler, pga. makrotask-rekkefølge-race; `perfMonitorService` med longtask-observer (feature-detektert) og lydavvik som bucketede tellere (under20/20–50/over50 ms) siden p95 ikke kan aggregeres som increments; `longTaskSessions`/`activeMinutes` teller kun støttede enheter så iOS ikke biaser metrikken.
* **Konsekvens:** PR #8/#10. Astrid fikk samtidig kontekstbevisst oppsummering (PR #9/#11 — ren regelmotor med prioritet PR > ukesmål > vurdering > streak).

## [2026-08-29] Beslutning 32: TimerEngine-uttrekk med bit-identisk fasit (B3 PR α)
* **Kontekst:** Fasemaskinen bodde i en 795-linjers hook med tre tilstandsrepresentasjoner; moonshots og testskjold krever motor uten UI. Spec/plan: `docs/spec-b3-timerengine-audiodirector-2026-08-29.md` + plan-dokumentet.
* **Valg:** Rammeverksfri `TimerEngine` med to kanaler: identitets-cachede snapshots (React via `useSyncExternalStore` — gating via snapshot-identitet) og typede domenehendelser med frister (`endsAt`, `deadlineChanged` med kun-fremtid-garanti, `endingSoon` som bevarer hookens persona-vindu). Sideeffekter som abonnenter; `LegacyAudioAdapter` bærer lydlogikken ordrett til Director overtar. Fasit: de 23 eksisterende hook-testene urørt og grønne. Én tilsiktet endring: `restoreSession` bakdaterer `workoutStartTime`.
* **Konsekvens:** PR #12 merget 29.08. Notify-gating-racet (abonnent-`getSnapshot` midt i emit svelget React-varsel) fikset med separat varsel-nøkkel. Felttest anbefalt før neste prod-deploy.

## [2026-08-29] Beslutning 33: AudioDirector med fristbasert lookahead og flerkjedemodell (B3 PR β, pågår)
* **Kontekst:** Produkteiers presisjonskrav: nedtellingen skal kulminere nøyaktig på fasegrensen. Reaktiv utløsning (tick oppdager vinduet) kan ikke levere det.
* **Valg:** Director skedulerer mot frister: `start_321` ankret i fasegrense-slutt (`endAt`), `go`-tilrop på grensen, `last5` ved T−5 s (bevisst aktivering av tidligere utriggret innhold); `scheduleSequence({endAt|startAt})` med tidsbro motortid↔lydtid; aldri avkuttet tale (for trangt vindu → kun pip); prioritetsresolver persona → studioklipp → bro+TTS → pip. Planrettelse 2 underveis: lydmotoren utvides fra én-kjede til flerkjedemodell (additive skedulerte kjeder, stemme-eksklusivitet håndhevet ved avspilling, `cancelScheduled()`, par-balansert ducking) — funnet av implementer på tvers av β1/β2-sømmen.
* **Konsekvens:** β1–β2 levert, β2.5 pågår; merges samlet som PR β etter sluttreview.

## [2026-08-29] Beslutning 34: Persona-lydbank — full dekning, bro+TTS og Kitor-produksjonslinje
* **Kontekst:** Fire Tre-To-En-innspillinger + stemme-seeds klare; mål om hele økter uten syntetisk stemme per persona.
* **Valg:** (A) Full persona-dekning inkl. alle øvelsesnavn (≈ 37 klipp/persona, ≈ 148 totalt) — aksepterte kostnader: ×N per ny øvelse, fullt sett per ny persona, QA-lytt; (B) egendefinerte øvelser løses med persona-bro («Neste øvelse:») + TTS kun for navnet; manifest genereres ved bygg (mangler = byggtidsadvarsel); workbox runtime-caching av `/audio/**` + preload ved persona-valg for offline. Kitor-infra verifisert klar 29.08: `@token_mintrener` i `/chatterbox/*` (kitor-eier), token synket, seeds lastet opp som `mintrener-seed-*.wav`. Manuskript (144 genererte fraser + fonetisk ordbok + dialekt-i-tekst-policy) levert til produkteiers godkjenning — batchen gates av den.
* **Konsekvens:** Se `docs/manuskript-persona-lydbank-2026-08-29.md` (i egen gren til godkjenning) og ADR 0009 i homelab-vaulten for infrastruktursiden.

## [2026-08-29] Beslutning 35: B3 fullført — Director som eneste lydabonnent, lydbank produsert og aktivert
* **Kontekst:** β3–β7 lukket B3-løpet samme dag: fire korrekthetsfikser fra Planrettelse 4 (bro-remåling per fase, beepFallback-reset, epoch-splitt der kun `stop()`/`cancelScheduled()` invaliderer ventende skeduleringer, skedulert-blir-hørbar-preempsjon uten duck-flapp), audible-only-stopp for reaktive cues (Planrettelse 3), bro+TTS for egendefinerte øvelser og persona-bevisst resync. Reviewene fant og lukket en hel lekkasjeklasse: TTS-etter-kjede kunne lese gammelt øvelsesnavn forbi et skip (status forblir `running`) — fikset med phaseEpoch-guard i alle fire veiene.
* **Valg:** (1) Manuskriptet godkjent med region-regel (Jossa fra Haugalandet, Ola fra Romsdalen — aldri by; tekniske id-er `haugesund`/`romsdal` er stabile nøkler) og hele lydbanken (148 klipp) produsert på kitor med `scripts/generatePersonaVoicebank.ts` (PR #14–#16); driftslærdom: Chatterbox avviser referanselyd > 30 s, og skip-eksisterende-logikken beskytter gamle filer — 20 utdaterte klipp fra feat/lydmotor måtte slettes eksplisitt før regenerering. (2) Director erstattet LegacyAudioAdapter som eneste lydabonnent (β4) — fasiten (23 hook-tester) byte-identisk og grønn UTEN justeringer. (3) Byggtids-manifest (`personaAudioManifest.json`, advarsel ved mangler) er autoritativt for personas det kjenner; manifest-oppslag i hele coachPersonaService (β5). (4) Workbox CacheFirst for `/audio/**` (0 mp3 i precache), preload ved persona-valg og målrettet buffer-eviksjon ved persona-bytte (β6). (5) Persona-`rest`-cuen aktivert i rest-fasen (erstatter tonen når cachet, kjedes foran neste-øvelse-annonseringen — samme «aktivering av utriggret innhold»-presedens som `last5`).
* **Konsekvens:** PR β merget med 480 grønne tester. Gjenstår: produkteiers QA-lytt av lydbanken og felttest med A5s lydavviks-buckets (målekort: p95 < 20 ms) før neste prod-deploy. `phase:endingSoon` emitteres nå uten konsumenter (bevart som hendelsesflate for blindmodus); unmount midt i økt stopper ikke skedulerte kjeder (app-flyten går via reset/pause) — begge logget som oppfølging.

## [2026-08-29] Beslutning 36: Bolk B fullført — testskjold, grensevalidering og fokusmodus-forbedringer
* **Kontekst:** Etter B3 gjensto B4–B6 av arbeidsordren. Samme dag ble også lydbanken QA-lyttet av produkteier med tre funn (amputerte ansatser, bakgrunnsstøy, skarp/tørr lyd) pluss engelsk uttale for Mountain Climbers og mistanke om dialektsmitte i boyband (avkreftet: seed-checksummer verifisert — fargen kommer fra at alle seeds er produkteiers egen stemme).
* **Valg:** (1) Lydbank v2: rå-cache med sidecar-ferskhet (TTS hentes én gang per tekst; etterbehandling itereres gratis med `--reprocess`, `--refetch` for ny take), ny kjede med 100 ms pre-roll, afftdn-denoise, aktiv de-esser (default var no-op — reviewfunn) og mykere EQ; `ttsLang` per øvelse. (2) `start_321_short` (opprinnelig ~8,5 s hale av innspillingene; senere lagt om til en egen TTS-cue per persona — se Beslutning 38) med Director-stige full → kort → pip under aldri-avkuttet-regelen, pluss preload-replan for kaldstart — begge fra funn i live timing-verifikasjon som ellers målte fristankrede cues sample-nøyaktig på fasegrensene. (3) B4: 29 Testing Library-skjold + Playwright-røyk som beviselig skriver gjennom firestore-emulator i egen CI-jobb. (4) B5: Zod ved grensene (URL-import, localStorage) + global feil-toast; review fanget BLOCKER der kategori-enum ville gitt permanent sletting av brukeres builder-maler (norske kategoriverdier via `as any` — rotårsak fjernet). (5) B6: persona-aksentfarger (WCAG AA låst med beregnende test), gestflate (dobbelttrykk/sveip, multi-touch-vernet) og dimme-modus (suspendert i TV-modus — review fanget at filter gjør rot til containing block for fixed-overlay).
* **Konsekvens:** PR #14–#24 merget samme dag. Review-regimet fanget tre blockere før merge (TTS-skip-lekkasje, kategori-datatap, TV-modus-kollaps). Gjenstår før prod-deploy: produkteiers felttest på preview-kanalen (A7 + p95 < 20 ms-avlesning). Bolk C: Vipps og DPIA parkert av produkteier; B2B og C1/C2 til brainstorm/sparring.

## [2026-08-29] Beslutning 37: C1/C2 — uke-streak i støttende tone og førstegangs-onboarding
* **Kontekst:** Bolk C pkt. 1–2 etter sparring med produkteier (spec + plan i egne dokumenter). Produkteiers valg: to-trinns målgruppe (nær krets nå, lanseringsklart design), støttende tone fremfor revisjonens tapsinnramming, uke-streak på ukesmålet fremfor dagsstreak, forsikret uke BEVARER serien uten å telle (+milepæler nås kun av faktiske treningsuker), plassering A (flamme flettet i ukesmål-pillen) og onboarding-rutenett A med lydprøver.
* **Valg:** All streak-tilstand avledes av historikken (`computeWeekStreak` — ren simulering med slinguke-bank, mållogg med «gjelder fra neste uke» for endringer men inneværende uke for førstegangsvalg, historisk mål-anker); kun feirede milepæler/prompt-avvisninger/telemetri-dedupe persisteres. UI: pill + detaljark («Ny start»-reframing ved brudd), milepælsfeiring og slinguke-feiring i fullført-skjermen, utsatt konto-prompt ved to verdimomenter. Onboarding: persona-rutenett med previews + ukesmål + «Til første økta» (START-trykket er lydopplåsings-gesten); gate som viker for delingslenker, utsetter profilmodalen én sesjon og kan gjenåpnes fra innstillinger. Telemetri: flatfelts `global_stats/engagement` (24 tellere; rules-blocket måtte omskrives med kortsluttede per-felt-vakter pga. regelmotorens 1000-uttrykks-tak).
* **Konsekvens:** Levert i tre bølger med kombinert review + fix-løkke per bølge; reviewene fanget bl.a. retroaktiv mål-omskriving, w2-undertelling for lanseringskohorten, førsteuke-ankerfeilen og at e2e avdekket en `?w=`-konsumeringsregresjon. 755 tester + 2 e2e grønne; fasiten byte-identisk. Backlog (spec § 7): push-varsler, streak-deling, frys-kjøp, utstyr/nivå-profilering, badge-motor-endringer.

## [2026-08-29] Beslutning 38: Annonseringsprioritet — hodrom målt fra den faktiske kjeden, ikke en konstant
* **Kontekst:** Felttest på Android (Klassisk Tabata, ALLE grensefaser 10 s) viste at øvelsesnavnet aldri ble lest opp: den endAt-forankrede nedtellingskjeden (`start_321`/`start_321_short`) ble hørbar midt i fasen, og `becomeAudibleWithPreemption` i audioBufferEngine fadet ut den reaktive annonseringskjeden (rest-cue → bro-neste → øvelsesnavn, eller intro → øvelsesnavn i prepare) før navnet rakk å bli sagt. Første fiksforsøk innførte en konstant `ANNOUNCE_HEADROOM_S = 6`; reviewen målte klippene og påviste at premisset var feil — hardcores rest-kjede er 13,94 s (rest 4,32 + bro-neste 3,44 + øvelse opptil 6,18), og full `start_321` er 27,8 s (spenn 19,8–27,8 s over de fire personaene), ikke «~20 s».
* **Valg:** (1) Hodrommet er ikke en konstant, men summen av `audioBufferEngine.getDuration()` for nøyaktig de klippene den reaktive kjeden vil spille i fasen. Nøkkelutledningen har ÉN definisjon per fasetype og brukes både av avspillingen og av hodroms-utregningen: `derivePrepareChain` og `playIntroThenExercise` deler `resolveIntroExerciseKeys`, og resync-kjeden er flyttet ut i `deriveResyncChain` (den var en tredje, uavhengig kopi av § 4-kjeden). (2) **Budsjettet er fasen minus nedtellingens short-cue**, ikke fasen alene: `timeLeft − shortDuration − 150 ms`. Måler vi bare mot fasegrensen, degraderes kjeden akkurat nok til å fylle fasen — og da har 3-2-1 ikke plass, mens gate-grenen bevisst ikke setter `beepFallback`. Resultatet var TAUSHET i 9 av 11 målte persona/lengde-kombinasjoner i en 10 s pause, og en prepare på 10 s startet økta med 2,2 s stillhet før GO. Får ikke engang navnet plass i det strenge budsjettet, faller vi tilbake til fasens egen lengde: navnet er fortsatt viktigst. Degraderingsrekkefølgen er uendret (full → dropp bro → dropp cue → behold full heller enn å kutte navnet). (3) Hodromsgaten gjelder **så lenge kjeden faktisk spiller**, ikke bare på fasestart-veien. `announceEndsAt` (motorklokke-tidspunkt) settes ved fasestart og nullstilles av `workout:paused`/`workout:reset`; `handleDeadlineChanged` og `replanCurrentPhase` sender `Math.max(0, announceEndsAt − getNow())`. Dvale-reankeren (drift > 2000 ms) og catch-up-landingen flytter fristen mens annonseringen fortsatt er HØRBAR — `cancelScheduled()` (ikke `stop()`) er nettopp valgt fordi den kan være det — og et hodrom på null der skedulerte en 27,8 s `start_321` midt i øvelsesnavnet. Hodrommet blir naturlig 0 når kjeden er ferdig, så stigen kjører som før uten at beskyttelsen slås av blindt. Hodrom 0 slår gaten AV (en tom kjede gir 0, ikke null — ellers ble korte grensefaser helt stille). (4) Resync-annonseringen får samme beskyttelse via `protectAnnouncement`, som fester hodrommet og re-utsteder lookaheaden. (5) Når Ø4-degraderingen skreller bort rest-cuen av TIMING-hensyn, fyres `playRestStart`-tonen ikke lenger (produkteiers avgjørelse: fasebyttet er alt markert av go-tilropet, og stillhet er bedre enn et pip oppå navnets første stavelser). Tonen består når cuen faktisk mangler i manifestet/cachen. (6) `start_321_short` er ikke lenger en 8,5 s hale av innspillingene, men en egen TTS-cue per persona — reelt målt etter regenerering: haugesund 2,73 s, romsdal 3,84 s, boyband 3,68 s, hardcore 4,44 s. Den erstatter det gamle klippet kun med `--only start_321_short --force`.
* **Konsekvens:** 775 grønne tester; fasiten (23 hook-tester) byte-identisk. Fasittestene pinner de reelt målte klipplengdene og dekker både medianen (hardcore 2,115 s / boyband 1,597 s) og maksimum (hardcore 6,185 s) — det var nettopp mediantilfellet som mistet nedtellingen uten pip. I en 10 s pause med median-øvelse får nå ALLE fire personaer både øvelsesnavnet og nedtellingen: hardcore navnet alene, boyband/romsdal rest-cue + navn, haugesund hele kjeden. Testmockene for `audioBufferEngine.has()`/`getDuration()` deler ett buffer-lager — de leser samme Map i produksjon, og «cachet uten varighet» er en verden som ikke finnes. `playIntroThenExercise` er BEHOLDT som sømmen mot hooken (fasiten pinner den); det som er fjernet er den parallelle nøkkelutledningen. Gjenstår: ny felttest på Android for å bekrefte at både navnet og nedtellingen nå høres.

## [2026-08-30] Beslutning 39: Burpees på engelsk, og halevakt mot avkuttede TTS-take — målt på RÅFILA
* **Kontekst:** To QA-funn i samme klasse på rad. (a) Produkteier A/B-lyttet burpees og valgte engelsk uttale — den fonetiske omskrivingen «Børpis» tapte, samme utfall som `mountain-climbers` fikk i QA-runde 1. (b) Chatterbox er stokastisk og kutter av og til halen av et take: «burpees» ble til «burpii», den avsluttende s-lyden manglet. Tidligere fanget produkteier den motsatte enden — amputerte ANSATSER («hulekroppshold» → «ulekroppshold»), løst med 100 ms pre-roll i `TRIM_START` (Beslutning 36). Begge funnene kom fra at et menneske hørte dem; det skal vi ikke være avhengige av. **Første forsøk på en halevakt fikk NO-GO i review, og denne beslutningen er skrevet om etter det.** Feilen var ikke terskelen, men måleunderlaget: vakten målte det ferdig etterbehandlede klippet.
* **Valg:** (1) `burpees` får `ttsText: "Burpees"` med `ttsLang: "en"` i `scripts/voicebank-manuskript.json`. `displayText` og filnavn er urørt — visningsnavn og filsti er stabile kontrakter mot manifestet og buffer-nøklene. Sidecar-ferskheten (Beslutning 36) invaliderer rå-cachen automatisk siden både tekst og språk endres, så klippene re-hentes uten `--force`. Antall øvelser med språkoverstyring er nå 2, pinnet i test. (2) **Halevakten måler RÅFILA fra Chatterbox** (`audio/raw-cache/<persona>/<id>.mp3`), ikke `public/audio/personas/…`. Grunnen er at etterbehandlingskjeden — `TRIM_END` (`silenceremove` på −45 dB) etterfulgt av `FADE` — er *nøyaktig* det som bestemmer hvor mye energi som ligger igjen i de siste 50 ms. Et måltall der beskriver ffmpeg-trimmingen, ikke om Chatterbox kuttet ordet, og **signalet blir invertert**. Målt på samme klipp, før og etter etterbehandling (fall = `mean_volume` for siste 50 ms minus klippets samlede `mean_volume`): det avkuttede `befal_2_burpees_engelsk` faller **−24,4 dB rått, men −74,0 dB prosessert** — bunkens «sunneste» — mens et friskt søsken (`befal_3_borpies`) faller **−72,2 rått og −17,0 prosessert**, altså det mest «avkuttede» av alle. Det var denne inversjonen som gjorde at vakten flagget 32 av 152 klipp (21 %) uten sammenheng med faktiske funn. Rå-målingen skiller derimot klart: det avkuttede take-et ligger på −24,4 mot friske −49,9 til −72,2. (3) Målingen er `volumedetect` på hele råfila og på de siste 50 ms (`-sseof -0.05`), og differansen sammenlignes med `TAIL_FALLOFF_THRESHOLD_DB = -36` — **strengt over er mistenkt**, nøyaktig −36 er altså ikke. Terskel, falloff-utregning, ffmpeg-argumenter, parsing og rapporteringstekst er rene funksjoner i `scripts/voicebankTasks.ts` (modulen har fortsatt null I/O); selve målingen bor i runneren. Advarselen navngir **både råfila som ble målt og det ferdige klippet man skal lytte på**, og foreslår `--refetch --only <id> --persona <persona>`. **Kjøringen avbrytes aldri og exit-koden er urørt** — et take kan legitimt være brått. (4) **Sjekken kjøres også når klippet hoppes over.** Cachefila *er* råfila, så en inkrementell kjøring der alt allerede ligger ferdig får den samme sjekken som en full kjøring. Uten dette var vakten inert i nettopp den vanligste kjøringen (reviewers Ø1). (5) **Innspilte spor måles ikke.** `start_321` kommer fra faste, menneskeverifiserte vokalstems i repoet, ikke fra stokastisk TTS — vakten har ingenting å vokte der. De ligger dessuten utenfor fordelingen terskelen er kalibrert mot (målt fall −24,8 til −44,1 dB), og haugesund-stemmet lar seg ikke måle i det hele tatt: `-sseof` gir 0 samples og `volumedetect` skriver ingen `mean_volume`-linje. (6) **Den søsken-relative vakten er FJERNET.** Se «Hvorfor bare én vakt» under.
* **Kalibreringen, med regnestykket:** Fordelingen er målt over hele rå-cachen — 144 rå TTS-take, alle fire personaer, produksjonskjøringen 2026-08-30: **min −71,8 · p10 −70,1 · p25 −69,1 · median −67,2 · p75 −64,2 · p90 −26,6 · maks −1,1 dB.** 116 av 144 take ender i digital stillhet (halen måler −91,0 dB, 16-bits-gulvet), og det er den tette hovedklyngen rundt −67 dB. Terskelen er lagt der **begge** datasett skiller: (i) fasiten i `audio/lyttekandidater/raa/` gir et **25,5 dB bredt gap** mellom det avkuttede take-et (−24,4) og det dårligste *verifisert* friske (−49,9), og terskelen må ligge inni det; (ii) innenfor det gapet har produksjonsbanken sitt eget bredeste tomrom **mellom −39,9 og −33,1 dB — 6,8 dB uten et eneste take**. Midtpunktet avrundet er **−36**, som gir 11,6 dB margin ned til det avkuttede og 13,9 dB opp til det dårligste friske. Terskelen flagger **19 av 144 take (13,2 %)** i dagens bank; de er kandidater for en lytt, ikke bekreftede feil. Til sammenligning ville en terskel som skulle ned mot ~6 % (−20 dB) ikke lenger fanget burpii-take-et i det hele tatt. **Forbehold (reviewers BØR 1): gapet er utledet av de NI klippene produkteier faktisk har lyttet på. Åtte av de 17 bevisfilene er ulyttet, og tre av dem er kalibreringsbærende — se «Bevismaterialet, fullstendig» under. Terskelen er IKKE endret på grunnlag av dem; avhengigheten er dokumentert, ikke løst.**
* **Bevismaterialet, fullstendig (reviewers BØR 1):** Forrige versjon av denne beslutningen presenterte gapet mellom −24,4 og −49,9 som en utledning mens tre målinger fra samme committede mappe var holdt utenfor både `FRISKE`-lista i testen og beslutningsteksten. Det er samme etterprøvbarhetssvikt som ga NO-GO i forrige runde, bare et hakk finere. Her er ALLE 17 råklippene i `audio/lyttekandidater/raa/`, målt 2026-08-30 med produksjonens egen kommando. `scripts/__tests__/halevakt.integration.test.ts` pinner hvert eneste tall OG at tabellen dekker nøyaktig filene som ligger i mappa — en ny bevisfil kan ikke lenger legges til og stilltiende holdes utenfor kalibreringen.

| fil | fall (dB) | status |
|---|---:|---|
| `befal_2_burpees_engelsk.mp3` | −24,4 | **VERIFISERT AVKUTTET** («burpii») |
| `hardcore_1_borpis_produksjon.mp3` | −49,9 | verifisert frisk — dårligste friske, definerer gapet |
| `befal_4_borpiis.mp3` | −62,7 | verifisert frisk |
| `hardcore_2_burpees_engelsk.mp3` | −68,3 | verifisert frisk |
| `befal_1_borpis_produksjon.mp3` | −69,3 | verifisert frisk |
| `komiker_3_borpies.mp3` | −70,9 | verifisert frisk |
| `komiker_2_burpees_engelsk.mp3` | −71,5 | verifisert frisk |
| `komiker_1_borpis_produksjon.mp3` | −71,7 | verifisert frisk |
| `befal_3_borpies.mp3` | −72,2 | verifisert frisk |
| `komiker_last5.mp3` | −18,7 | **UAVKLART — over terskel; faller MINDRE enn det avkuttede** |
| `komiker_start_321_short.mp3` | −32,1 | **UAVKLART — over terskel, ville blitt flagget** |
| `befal_start_321_short.mp3` | −49,4 | **UAVKLART — under terskel, men dårligere enn dårligste verifisert friske** |
| `befal_last5.mp3` | −57,2 | uavklart (ulyttet) |
| `befal_intro.mp3` | −70,1 | uavklart (ulyttet) |
| `befal_exercise-burpees.mp3` | −71,4 | uavklart (ulyttet) |
| `komiker_exercise-burpees.mp3` | −71,4 | uavklart (ulyttet) |
| `komiker_intro.mp3` | −72,3 | uavklart (ulyttet) |

* **Hva de tre uavklarte gjør med kalibreringen:** Produkteier er bedt om å lytte; svaret foreligger ikke, og terskelen står urørt inntil det gjør det. (a) **`komiker_last5` (−18,7) er den kritiske.** Den faller MINDRE enn det bekreftet avkuttede burpii-take-et (−24,4), og en energiprofil-gjennomgang tyder på at også dette klippet er avkuttet — vedvarende energi helt inn i siste sample, flatere enn burpii. **Viser det seg at klippet er FRISKT, kollapser hele premisset for vakten:** da finnes det et friskt take som faller mindre enn et avkuttet, klassene overlapper, og **ingen absolutt terskel kan skille dem.** Vakten må da revurderes — ikke justeres — for et skille må i så fall bygges på noe annet enn ett skalartall (f.eks. energiprofilen over halen, eller en varighetsnormalisert måling). `halevakt.integration.test.ts` har en egen test som sier dette høyt og feiler hvis klippet flyttes inn blant de friske. (b) **`komiker_start_321_short` (−32,1)** ligger over terskelen og er allerede blant de 19 flaggede — den er en kandidat for lytting, ikke et motbevis. (c) **`befal_start_321_short` (−49,4)** ligger under terskelen, men er dårligere enn dagens dårligste verifisert friske; blir den verifisert frisk, krymper gapet fra 25,5 til **25,0 dB** og margin opp til dårligste friske fra 13,9 til **13,4 dB**. Terskelen −36 tåler det. De fem øvrige uavklarte ligger på −57,2 og lavere, godt under terskelen, og kan ikke flytte den — men skulle en av DEM vise seg avkuttet, faller premisset på samme måte som i (a), og det er grunnen til at de står som uavklarte og ikke som friske.
* **Hvorfor bare én vakt:** Den søsken-relative vakten ble lagt inn utelukkende fordi den absolutte ikke fanget funnet den var bygget for. Når målingen flyttes til råfila fanger den absolutte vakten burpii-take-et direkte (−24,4 mot terskel −36), og eksistensgrunnlaget faller bort. Premisset — «hale-fallet er nokså likt på tvers av personaer for samme ytring» — er dessuten motbevist av rå måledata: **søskenspredningen per id er median 28,9 dB, p75 48,7 dB og maks 68,8 dB.** Vakten lar seg ikke kalibrere til et meningsfullt driftspunkt: ingen terskel mellom 10 og 40 dB kommer under 10 % flagg, og ved 20 dB flagger den 22 av 139 take (15,8 %). Av de 22 er 18 allerede fanget av den absolutte vakten; de 4 nye ligger på −39,9 til −44,4 dB, altså midt i det friske båndet, og er «avvikende» bare fordi søsknene deres tilfeldigvis endte i digital stillhet. En vakt som drukner de ekte funnene i falske positive er verre enn ingen vakt, og den er derfor fjernet framfor beholdt som pynt. Reviewers Ø3 — degraderingen der 3 av 4 avkuttede søsken gjør at ingen flagges — er dermed uten gjenstand. **RETTELSE etter reviewrunde 2:** denne beslutningen påsto tidligere at sluttrapporten dermed ikke lenger trengte noe dekningsforbehold — «med en absolutt terskel per take betyr 'ingen flagg' faktisk 'ingen funn', også i en delvis kjøring». Det er feil, av en helt annen grunn enn den søsken-relative vakten hadde. Se «Dekning» under.
* **Digital stillhet (reviewers Ø4):** Den gamle kommentaren påsto at `-inf` fra et helt stille klipp aldri gir advarsel. Det stemmer ikke i praksis: ekte ffmpeg (verifisert på 8.1) rapporterer digital stillhet som **−91,0 dB**, 16-bits-gulvet, og aldri `-inf`. Et helt stille klipp får derfor fall 0,0 dB og **blir** flagget — og det er riktig oppførsel, for en rå TTS-nedlasting uten lyd er en feil vi vil høre om. Silingen av ikke-endelige måltall står igjen som en ren defensiv vakt (parseren *kan* produsere ±Infinity fordi ffmpeg-formatet tillater `-inf`), og kommentaren sier nå det.
* **Bevisfilene:** De 17 råklippene fra Chatterbox ligger nå i **`audio/lyttekandidater/raa/`** og er committet. `befal_2_burpees_engelsk.mp3` ER det avkuttede klippet produkteier hørte som «burpii». Det gjør kalibreringen reproduserbar fra repoet — reviewers B3 var nettopp at måltallet i forrige versjon av denne beslutningen ikke lot seg reprodusere, fordi det var målt på råfila mens vakten målte prosessert output. `scripts/__tests__/halevakt.integration.test.ts` kjører produksjonens egen måle-kommando med **ekte ffmpeg** mot disse filene og asserterer at det avkuttede take-et flagges, at de åtte verifisert friske ikke gjør det, at gapet mellom klassene holder seg over 15 dB, at rå-målingen rangerer motsatt av den prosesserte, og at hvert av de 17 måltallene i tabellen over faktisk stemmer. Mangler ffmpeg skippes måleblokken eksplisitt via `describe.skipIf`, og en motsatt blokk sier høyt fra at den ble hoppet over (reviewers Ø5). **`.github/workflows/ci.yml` installerer nå ffmpeg i `build-and-test` (reviewers BØR 2)** — `ubuntu-latest` har det ikke forhåndsinstallert, så skipIf slo inn i CI og kalibreringsvakten fantes bare på eierens maskin. Steget berører ingen andre jobber: `rules-tests` og `e2e-smoke` kjører ikke lydtestene. Kompletthetstesten (tabellen = mappa) krever ikke ffmpeg og kjører uansett.
* **Dekning — «ingen flagg» er ikke «ingen funn» (reviewers B1):** Vakten returnerte `null` når råfila manglet: ingen teller, ingen advarsel, ingenting i rapporten — og sluttrapporten skrev likevel «Halevakt: ingen take flagget som mulig avkuttet». Det er en **positiv friskmelding av klipp vakten aldri så på**, altså samme utfall som ga NO-GO i forrige runde, gjennom en annen dør. Det er ikke hypotetisk. (a) **Det skjer i dagens bank:** `start_321_short` er TTS-cue for alle fire personaer, men det finnes ingen råfil for den — hver persona har 36 råfiler mot 37 TTS-oppgaver, så vakten hoppet stilltiende over 4 av 148 TTS-klipp. (b) **Det skjer for alle andre enn eieren:** `.gitignore` ignorerer `audio/raw-cache/` mens `public/audio/personas/` er committet, så på en frisk klone finnes alle output-filer og ingen råfiler → hver TTS-oppgave går `skip-existing` → råfil mangler → `null`. Vakten målte **null** klipp og friskmeldte alle 148. **Fiksen:** `checkTailWith` returnerer nå et utfall (`ok` / `missing-raw` / `stale-cache` / `measure-failed`), runneren teller **målte mot umålte TTS-klipp**, og `formatTailSummary` skriver alltid BEGGE tallene. Full dekning sier at alle klippene ble målt; delvis dekning skriver «⚠️ DELVIS DEKNING: N av M TTS-klipp kunne ikke måles» med grunn og id-er, og at fravær av flagg **ikke** er en friskmelding; null dekning skriver «⚠️ Halevakt: INGEN DEKNING — 0 av M TTS-klipp ble målt» og at vakten ikke har vurdert et eneste take. Innspilte spor er utenfor både teller og nevner; en feilet TTS-oppgave teller som umålt, ikke som fraværende. Alle tre scenarioene er festet i test.
* **Foreldet cache måles ikke (reviewers BØR 3):** Er sidecaren utdatert (`rawExists && !cacheExists`) mens output finnes uten `--force`, blir handlingen `skip-existing` fordi output-sjekken kommer først. Råfila hører da til forrige manuskripttekst og svarer verken til dagens tekst eller til output-fila som ligger der — mens advarselen ville navngitt nettopp den output-fila som «klippet man skal lytte på». **Valget er å stå over målingen og telle klippet som umålt**, ikke å måle og legge på et forbehold i advarselen. Begrunnelse: et måltall som ikke kan tilskrives noen fil på disk er verre enn et erklært hull, og med dekningsrapporten over er hullet nå synlig og navngitt i sluttrapporten framfor skjult. Runneren skriver dessuten én linje der og da om at cachen er utdatert.
* **`checkTail` er testbar (reviewers BØR 4):** Målingen ligger bak en injiserbar `TailProbe` (`exists`/`measure`), samme mønster som `persistRawCache` sin injiserte `io`, og `checkTailWith` er eksportert. Testen sporer hvilke filer måleren faktisk ble bedt om å se på og feiler hvis noen av dem ligger under `public/audio/personas/`. Før dette kunne `toAbsolute(rawRelPath)` byttes mot `toAbsolute(task.outputRelPath)` — altså hele premisset for denne beslutningen — med grønn suite.
* **Konsekvens:** Del 1 (burpees på engelsk) er uendret og godkjent: `--refetch --only burpees` gir 4 oppgaver med `ttsLang: "en"` for alle fire personaer. Halevakten er én absolutt vakt på råfila, aktiv også på inkrementelle kjøringer, med terskel −36 dB kalibrert mot 144 rå take og fasit fra 9 lyttede klipp. Den flagger 19 take i dagens bank som kandidater for en lytt; ingen av dem er verifisert avkuttet, og vakten rører hverken kjøringen eller exit-koden. Sluttrapporten oppgir nå alltid dekningen ved siden av flaggene, så «ingen flagg» kan ikke lenger leses som friskmelding, og integrasjonstesten kjører i CI. Gjenstår: (1) produkteier må lytte på `komiker_last5` — er den frisk, må vakten revurderes fra bunnen, jf. «Hva de tre uavklarte gjør med kalibreringen»; (2) de fire `start_321_short`-klippene mangler råfil og er derfor uvurderte i dagens bank — en `--refetch --only start_321_short` ville gitt vakten måleunderlag; (3) å faktisk lytte gjennom de 19 flaggede og eventuelt `--refetch` de som er ødelagte — først da vet vi hvor mye av de 13,2 % som er ekte funn.

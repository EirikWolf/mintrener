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

## [2026-08-30] Beslutning 39: Lukking av PII-lekkasje på `/rooms`, referanseintegritet og eliminering av 49 spøkelser
* **Kontekst:** Oppfølgingsrevisjon 30. august avdekket at `/rooms`-samlingen tillot `list` for uautentiserte, at vertens Google-navn ble eksponert, og at 49 refererte øvelser manglet i biblioteket (som førte til fallback på Knebøy for seniorer og calisthenics).
* **Valg:**
  1. `firestore.rules` splittet til `allow get: if true; allow list: if false;` for `/rooms`. `personal_records` lagt til med eierlås `request.auth.uid == userId`. Regresjonstester i `tests/rules/firestore.rules.test.ts`.
  2. Vertens visningsnavn anonymisert til fornavn eller «Vert».
  3. `src/data/__tests__/referenceIntegrity.test.ts` etablert for kontinuerlig verifisering av alle øvelses-ID-er på tvers av `TRAINING_PROGRAMS`, `SKILL_TREES` og `STARTER_CHALLENGES`.
  4. Alle 49 manglende øvelser definert i `bodyweight.ts`, `mobility.ts` og `cardio.ts` med fullverdige instruksjoner forankret i Otago, FIFA 11+ og Overcoming Gravity.
  5. 35 ubrukte QA-filer (31 MB) slettet fra repoet.
* **Konsekvens:** PII-sikring verifisert i produksjon, bibliotek økt fra 25 til 74 øvelser med 100 % referanseintegritet.

## [2026-08-30] Beslutning 40: GDPR-sletting & eksport, eliminering av naive timere og WCAG 2.1 fokusfeller
* **Kontekst:** Sletting og eksport bommet på nøkler pga. spredte strengliteraler; modaler i komponentlaget brukte naiv `prev - 1`/`prev + 1` som frøs i bakgrunn; modaler manglet fokusfelle.
* **Valg:**
  1. `src/constants/storageKeys.ts` opprettet med kanonisk register over samtlige 38 nøkler og `clearAllLocalUserData()`.
  2. `deleteUserData` oppdatert til å tømme alle lokale nøkler og slette `personal_records` i Firestore. `exportFullUserDataset` henter et fullstendig GDPR Art. 20 JSON-datasett.
  3. `StrengthLoggerModal`, `GpsTrackerModal` og `StrengthWorkoutModal` omskrevet til tidsstempeldifferanser (`Date.now()`).
  4. `src/hooks/useFocusTrap.ts` opprettet med `Escape`- og Tab-sykling for alle modaler (WCAG 2.1 AA).
  5. `src/services/settingsStorageService.ts` etablert: brytere for lyd, tale, vibrasjon og wake lock persisteres og synkroniseres inn i `TimerEngine`.
  6. `PrivacyPolicyModal.tsx` oppdatert med presis GDPR Art. 9/13/14-erklæring.
* **Konsekvens:** Fullstendig GDPR-etterlevelse, timere overlever skjermlås, og innstillinger bevares over økter.

## [2026-08-30] Beslutning 41: Fullføring av «Sterkere 12 uker», målgruppepakker og Kitor bilde/videobatch-pipeline
* **Kontekst:** Behov for 2/3/4-dagers ukemaler for periodisert styrke (C.17, C.19), fullføring av programmer for Senior/Kor/Idrettslag, kildevisning på Om-siden, og infrastruktur for å generere bilder og videoloops for alle 74 øvelser på Kitor (RTX 3090).
* **Valg:**
  1. `src/data/strengthPrograms.ts` utvidet med `STERKERE_12_UKER_2_DAGER`, `_3_DAGER` og `_4_DAGER` med 4 periodiserte faser (Hypertrofi, Styrke, Topping, Deload) og `basis`-forankring (Iversen 2021, Schoenfeld 2016, Helms 2018).
  2. Senior, Kor og Idrettslag programmert ferdig med Otago-, sangpust- og FIFA 11+-øvelser.
  3. `AboutGuideModal.tsx` utvidet med egen seksjon for «Dokumentert kunnskapsgrunnlag (basis)».
  4. 148 prompter for Flux.1 Dev og Wan2.1 generert for samtlige 74 øvelser i `src/services/imagePromptService.ts`.
  5. `scripts/runFullKitorBatch.ts` og `scripts/exportComfyUiBatch.ts` oppdatert for headless kjøring og ComfyUI workflow JSON-eksport (`npm run batch:kitor`). `docs/kitor-batch-guide.md` dokumentert.
* **Konsekvens:** 85 testfiler og 804 tester grønne, full produksjonsklar kjerne og automatisert GPU-pipelining mot Kitor.

## [2026-08-30] Beslutning 42: Fellesskapstellere med Terskel 3, Heia-reaksjoner og Web Share API (Fase 6)
* **Kontekst:** Vedlegg C.18, C.21 pkt 14 og Vedlegg B.5b krever fellesskapstellere under strenge personvernsregler (Terskel 3), emojireaksjoner i grupperom uten fritekst, og native deling av rom/utfordringer.
* **Valg:**
  1. `src/services/communityStatsService.ts` opprettet: `formatThreshold3Count` returnerer `null` for tellere under 3 (skjuler lavt volum for å forhindre personidentifisering).
  2. `GroupRoomModal.tsx` utvidet med sanntids heia-reaksjoner (`🔥`, `👏`, `💪`, `⚡`, `🎉`) i lobbyen for både vert og deltakere, samt Web Share API-knapp for direkte deling av romlenker via WhatsApp, SMS, Teams eller e-post.
  3. `ChallengeDetailModal.tsx` utvidet med Web Share API (`Share2`) og fokusfelle (`useFocusTrap`).
* **Konsekvens:** 86 testfiler og 807 tester grønne, trygt personvernsbasert fellesskap og sømløs deling.

## [2026-08-30] Beslutning 43: Adaptiv Deload-motor, Smerte/Skadefilter og Wan2.1 Video-loop Pipeline (Fase 7)
* **Kontekst:** Vedlegg C.19, Epik A & H krever tretthetsdeteksjon og adaptiv deload ved overbelastning, 1-klikks skånsom øvelseserstatning ved akutt smerte/stivhet, og en ende-til-ende pipeline for 2–4s video-loops på Kitor.
* **Valg:**
  1. `PainFilterModal.tsx` koblet til `assessFatigueAndDeload(getCompletedWorkoutLogs())`: Ved oppdaget overbelastning (2 påfølgende tunge økter eller avbrutte runder) aktiveres Deload-modus automatisk med vitenskapelig begrunnelse (*superkompensasjon*).
  2. Skade- og smertefilter integrert med 5 ergonomiske områder (Korsrygg, Skulder, Kne, Håndledd, Nakke) som øyeblikkelig erstatter utsatte øvelser med trygge alternativer.
  3. `src/services/imagePromptService.ts` optimalisert med handlingen og positur-definisjonen plassert fremst i prompten for diffusjonsmodeller, og `buildAstridWanVideoWorkflow` etablert for Wan2.1 I2V MP4-rendering.
* **Konsekvens:** 86 testfiler og 807 tester grønne, fullverdig adaptivitet og produksjonsklar videoinfrastruktur.

## [2026-08-30] Beslutning 44: Organisasjons- & Bedriftsportal med Anonymt HMS-dashbord (Fase 8)
* **Kontekst:** Spesifikasjon kap. 8 pkt 12 og Vedlegg C del 3 krever støtte for organisasjonsavtaler (kommune, eldresenter, kor, bedrifter) uten arbeidsgiver-innsyn eller overvåkning av enkeltansatte.
* **Valg:**
  1. `src/schemas/organizationSchema.ts` og `src/services/organizationService.ts` etablert: støtter tilknytning via organisasjonskode (f.eks. `LILLESTERK`, `KOR2026`, `HMS2026`).
  2. `OrganizationPortalModal.tsx` implementert: Viser aggregert fellesstatistikk for avdelingen (totale treningsminutter og aktive deltakere) under streng **Terskel 3-regel** og null enkeltperson-logging.
  3. `UserMenu.tsx` utvidet med direkte tilgang til organisasjonsportalen for tilknytning og frakobling.
* **Konsekvens:** 87 testfiler og 812 tester grønne, klar B2B-infrastruktur i tråd med *Privacy by Design*.

## [2026-08-30] Beslutning 45: Sluttkontroll, PWA Offline-herding & Lanseringsklargjøring (Fase 9)
* **Kontekst:** Avsluttende fase for helhetlig verifisering av alle 9 faser, PWA-caching, WCAG 2.1 AA fokusfeller, referanseintegritet over alle 74 øvelser, og produksjonsdeploy.
* **Valg:**
  1. Service Worker og Workbox-caching verifisert for full offline bruk (lydbank `CacheFirst`, øvelsesbilder `NetworkFirst` med lokal fallback, app shell precache).
  2. Full integrasjonssjekk av alle 87 testfiler og 812 enhetstester.
  3. Backlog og arkitekturbeslutninger (Beslutning 1–45) fullstendig oppdatert i Obsidian-kunnskapsbasen.
  4. Produksjonsbygg kompilert og deployet til live Firebase Hosting.
* **Konsekvens:** 100 % grønn testsuite, feilfri produksjonsbundle, og en fullstendig moden og lanseringsklar Min Trener PWA.

## [2026-08-30] Beslutning 46: App Check nedgradert fra P1 til P2 med utløsende betingelse
* **Kontekst:** App Check sto som P1-krav i spesifikasjonen kapittel 5, og har vært flagget som åpent avvik i to påfølgende revisjoner. Implementasjonen er nå på plass (`src/services/firebase.ts`, med guard mot test/e2e og stille no-op når site key mangler), men aktivering krever reCAPTCHA Enterprise-nøkkel og håndheving i Firebase-konsollen. Før det steget ble tatt, ble selve premisset vurdert på nytt.
* **Vurdering:** App Check beskytter ikke brukerdata — `users/{uid}/**` er allerede dekket av innlogging og eierskapssjekk i reglene, verifisert med regeltester i CI. Det App Check faktisk løser, er å skille appen fra et vilkårlig skript på den ene flaten som må stå åpen: anonym telemetri, som per design skrives før innlogging. Restrisikoen der er (a) forgiftede aggregater — alvorlig fordi ytelsesmålingene brukes som beslutningsgrunnlag, men usynlig når det skjer, og (b) fakturerbare uautentiserte skriv. Begge har lav sannsynlighet for et produkt av denne størrelsen. Mot dette står en reell kostnad ved å aktivere: reCAPTCHA Enterprise er en ny databehandler som må dokumenteres og omtales i personvernerklæringen, og håndheving kan låse ute brukere som kjører en cachet PWA-versjon uten App Check-koden.
* **Valg:** App Check nedgraderes til **P2**. Den aktiveres når appen tas i bruk utenfor utviklerens egen krets, eller når telemetrien skal styre beslutninger som betyr noe. Koden blir stående klar. I stedet prioriteres to billigere tiltak som dekker den faktiske restrisikoen: (1) **budsjettvarsel i Google Cloud Billing** blir det bærende kostnadsvernet og skal dokumenteres her når det er satt opp, (2) **ingen uautentisert flate med ubegrenset dokumentopprettelse** — samlinger som tar imot skriv fra uinnloggede skal ha TTL, krav om innlogging, eller et begrenset ID-rom. `clock_sync` er den gjenstående flaten som ikke oppfyller dette.
* **Konsekvens:** Spesifikasjonen kapittel 5 er oppdatert med vurderingen, slik at fremtidige revisjoner ikke flagger dette som et ubegrunnet avvik. Beslutningen er reversibel til lav kostnad: aktivering krever kun nøkkel, miljøvariabel, nytt bygg og håndheving i konsollen. Merk at kapittel 5 samtidig er utvidet med et generelt regelkrav om å skille `get` fra `list` — lærdommen fra PII-lekkasjen i `/rooms`, der en lang dokument-ID ga falsk trygghet mot skraping.

## [2026-08-30] Beslutning 47: Kuratoren bak funksjonsflagg, og budsjettvarsel erstattet av kvotevern
* **Kontekst:** To oppfølgingspunkter fra revisjon A og B. (a) Bildekuratoren — internt QA-verktøy for Kitor-bildepipelinen — har vært synlig for enhver innlogget bruker gjennom tre revisjoner. Innlogging er ikke en port når appen er åpen for alle med Google-konto. (b) Beslutning 46 utpekte budsjettvarsel som det bærende kostnadsvernet etter at App Check ble nedgradert.
* **Valg (a):** `IS_CURATOR_ENABLED` i `src/constants/featureFlags.ts` — på i utvikling, av i produksjon med mindre bygget setter `VITE_ENABLE_CURATOR=true`. Avgjørelsen er skilt ut som ren funksjon (`isCuratorEnabled`) slik at den kan testes uten å manipulere byggemiljøet; fire tester dekker den, inkludert at bare strengen «true» godtas. Alle tre innganger er portet: timer-toppbaren (som manglet selv innloggingssjekken), profilmenyen og innstillinger. Importen er dessuten gjort **lat**, slik at kuratoren havner i egen chunk og ikke i hovedbundelen — interne modellnavn, seed-referanser og engelske bildeprompter skal ikke ligge lesbare i en offentlig bundle. Verifisert etter bygg: strengene finnes ikke i `index-*.js`. Chunken deployes fortsatt, men hentes aldri når flagget er av.
* **Valg (b) — premisset i Beslutning 46 var feil:** prosjektet har **ingen betalingskonto**. Verifisert med `gcloud billing projects describe mintrener`: `billingEnabled: false`. Det kjører på Firebase Spark. Et budsjettvarsel hører til en betalingskonto, så det lar seg verken sette opp eller trenger å settes opp — kostnader kan ikke påløpe. Vi kobler bevisst **ikke** på Blaze for å kunne sette et budsjett; det ville åpne for en kostnadsrisiko som i dag er umulig.
* **Konsekvens:** Risikoen fra den uautentiserte telemetriflaten er ikke en pengerisiko, men en **tilgjengelighetsrisiko** — misbruk brenner dagskvoten, og appen slutter å virke for ekte brukere. Det er en mer akutt trussel enn en regning, fordi den rammer brukerne direkte og uten forvarsel. Kapittel 5 er rettet på begge punkter. Kobles Blaze på senere, skal budsjettvarsel settes opp i samme operasjon og dokumenteres her — skiftet fra «tjenesten stopper» til «regningen vokser» må ikke skje ubemerket.

## [2026-08-30] Beslutning 48: Flux-lisensen sperrer modellen, ikke bildene — ingen regenerering
* **Kontekst:** Spesifikasjonen, vedlegg A og revisjonsbestillingene har siden bildepipelinen ble valgt lagt til grunn at Flux.1-dev er «ikke-kommersiell», og at øvelsesbildene måtte regenereres den dagen appen gir inntekt. Vedlegg A.12 registrerte riktignok at modellkortet og lisensteksten så ut til å peke hver sin vei, men konkluderte med å ikke tolke lisensen. Revisjon B2 utfordret premisset, og lisensteksten ble deretter lest direkte fra kilden.
* **Funn:** FLUX.1 [dev]-lisensen sier ordrett: «You may use Output for any purpose (including for commercial purposes), except as expressly prohibited herein.» «Non-Commercial Purpose» er definert som en begrensning på bruk av **modellen** — «so far as you do not receive any direct or indirect payment arising from the use of the FLUX.1 [dev] Model». De eneste begrensningene på utdataene er at de ikke kan brukes til å trene en konkurrerende modell, og at innholdskravene følges. De to formuleringene motsa altså aldri hverandre; tvetydigheten var vår lesning.
* **Valg:** De 74 øvelsesbildene beholdes uendret, også ved fremtidig inntekt. **Ingen regenerering planlegges.** Det som er heftet er å *kjøre* modellen kommersielt: skal det genereres nytt materiale etter at appen gir inntekt, må det skje på en annen modell. FLUX.2 [klein] 4B (Apache 2.0) er nærmeste kandidat og er liten nok til å dele GPU-en. Merk at et modellbytte krever at person-LoRA-en trenes på nytt — det, og ikke bildene, er den reelle kostnaden.
* **Konsekvens:** En antatt fremtidig kostnad forsvinner fra planen, og «regenerer bildene før første betaling» er ikke lenger en betingelse for å ta inntekt. Rettet i spesifikasjonen (beslutningstabellen), vedlegg A (A.2 og A.12) og B1-bestillingens kapasitetstabell. Lærdommen er verdt å notere: vedlegg A så tvetydigheten og valgte forsiktighet framfor å lese kilden. Forsiktighet er riktig når man ikke vet — men her sto svaret i lisensteksten, og det kostet oss en oppdiktet post i budsjettet i flere uker.

## [2026-09-01] Beslutning 49: ControlNet-pipelinen legges ned til fordel for illustrasjoner
* **Kontekst:** Øvelsesbiblioteket trenger to bilder per øvelse — start og slutt — for 75 øvelser. Etter at ren promptstyring feilet (17 av 28 bildepar viste ikke øvelsen, kuratering 2026-08-31), ble ControlNet Union Pro 2.0 med selvtegnede OpenPose-skjeletter tatt i bruk. Posituren ble riktig, men arbeidet avdekket en kjede av feil som alle stammet fra samme sted, og tre av dem lot seg ikke løse. En ekstern revisjon ble bestilt med eksplisitt invitasjon til å foreslå at vi forkastet sporet (`docs/ekstern-revisjon-bildepipeline-2026-09-01.md`), og svaret anbefaler nedleggelse (`docs/ekstern-revisjon-bildepipeline-svar-2026-09-01.md`).
* **Det som IKKE bærer beslutningen:** Revisor fremhever Flux-lisensen som «en blokker» og hevder at bildene må regenereres ved kommersialisering. **Det er feil, og Beslutning 48 avgjorde det to dager tidligere** etter å ha lest lisensteksten fra kilden: «You may use Output for any purpose (including for commercial purposes)». Det ikke-kommersielle hefter ved å *kjøre modellen*, ikke ved utdataene. Revisor hadde ikke tilgang til Beslutning 48, og vi gjentok feilen ukritisk i første gjennomlesning. Argumentet er strøket.
* **Det som bærer beslutningen:**
  1. **Et 2D-skjelett kan ikke uttrykke kroppsorientering.** COCO-18 er 18 punkter (x, y) uten dybdeakse. En person på magen og en på ryggen gir identiske koordinater, og hals-til-hofte er én rett linje, så katt og ku er samme skjelett. Vi testet og avkreftet fire selvstendige hypoteser (kontrollvindu, kontrollstyrke, lerretsorientering, ansiktspunkter), hver med en tro gjengivelse av `draw_bodypose`. Revisor kom uavhengig til samme konklusjon fra førsteprinsipper. Tre problemer står uløste: orientering, ryggkrumning og rotasjon om kroppsaksen.
  2. **Kostnaden er reell og har vært stor.** Vi har rettet en felles kroppsmodell, gulvforankring, lerretsvalg, kameraskala, marg for isse og hender, og kroppsbredde — hver av dem etter at et bilde avslørte feilen. En fotoserie tar én dag.
  3. **Bransjen gjør det ikke slik.** Seven, Nike Training Club, Freeletics, `wger` og `free-exercise-db` bruker stiliserte illustrasjoner, ikke fotorealistisk KI.
  4. **Muskelkart avgjør valget mellom foto og illustrasjon.** Et fotografi kan ikke vise hvilke muskler øvelsen aktiverer. Med det kravet er det ikke lenger uavgjort mellom revisorens alternativ 1 (foto) og 3 (illustrasjon) — illustrasjon dominerer strengt.
  5. **Marginalkostnaden.** Biblioteket vokser — vi la til to øvelser 2026-09-01 alene. Foto kan ikke utvides med én øvelse uten å gjenskape samme person, antrekk, rom og lys. En illustrasjon koster én tegning.
* **Valg:**
  1. **ControlNet-generering av øvelsesbilder legges ned.** `runFullKitorBatch.ts` og `runPoseTestBatch.ts` skal ikke videreutvikles. De eksisterende bildene blir stående til illustrasjonene erstatter dem — de er lovlige å bruke (Beslutning 48).
  2. **Retning: 2D-illustrasjoner**, med muskelkart som egen visning.
  3. **Rekkefølge:** (a) normaliser muskelordforrådet, (b) muskelkart som én datadrevet SVG, (c) de 150 utførelsesillustrasjonene.
* **Konsekvens:**
  - **Kroppsmodellen er ikke tapt arbeid.** `poseBody.mjs` og `poseData.mjs` gir 31 skjeletter for 17 øvelser med verifiserte proporsjoner, gulvkontakt og innramming. Et skjelett med riktig anatomi *er* geometrien i en strektegning, og systemet for å lage de resterende 58 er bygget og testet.
  - **Visningslaget trenger ingen endring.** `ExerciseIllustration` leser `/images/exercises/{id}-{fase}.png` og `/videos/exercises/{id}.mp4`. Alle alternativene faller inn i samme spor.
  - **Muskelkartet er billig:** én SVG med for- og bakside, ikke 150 filer. Den serverer alle 75 øvelsene fra data vi allerede har.
  - Tre uløste problemer i vedlegg A — orientering, ryggkrumning, rotasjon — er ikke lenger åpne punkter, men bortfalt sammen med metoden.
  - **Lærdom:** vi bestilte revisjonen med invitasjon til å bli motsagt, og fikk det. Men revisors sterkeste argument var feil, og vi gjentok det før vi slo opp i vår egen beslutningslogg. En ekstern vurdering skal etterprøves mot det vi allerede vet, ikke bare leses.

### REVISJON 2026-09-02: to av fire begrunnelser falt

Beslutningen over står **ikke** lenger som skrevet. Den ble tatt før vi testet
dybdestyring, og to av de fire bærende begrunnelsene holder ikke:

**Falt: «bare illustrasjon kan vise muskler».** Feil da det ble skrevet. Muskelkartet
(Beslutning 50) er en egen komponent som står ved siden av utførelsesbildet og er
likegyldig til hvordan det bildet er laget. Argumentet var mitt, og det var dårlig.

**Falt: «2D kan ikke uttrykke kroppsorientering».** Premisset er fortsatt sant — et
2D-skjelett *kan* ikke — men det er omgått. Vi henter geometrien fra et dybdekart
i stedet, avledet av et fritt lisensiert referansefoto. Målt samme dag: superman
kom ut liggende på magen for første gang, og sideplanken med korrekt rotasjon om
lengdeaksen. Begge var øvelser vi hadde dokumentert som umulige.

**Står: tidsbruken.** Uendret, og den er nå større.

**Står: bransjepraksis.** Uendret.

#### Det som kom i stedet, og hvorfor beslutningen likevel ikke reverseres

Kjeden vi endte med — dybdekart → BiRefNet-personmaske → syntetisk gulv → kort
kontrollvindu — løser fem konkrete problemer, hvert av dem målt. Men **treffraten
er 1 av 3–4**, og feilmodusen når den bommer er grov: figurer med hode i begge
ender.

Vi testet revisors tre foreslåtte tiltak (2026-09-02). Positur-ankeret, som skulle
gi den semantiske forankringen vår symmetri-hypotese sa manglet, **flyttet ikke
treffraten**: 1 av 4, mot 1 av 3 uten. Da er hypotesen trolig feil, og vi vet ikke
hva den riktige forklaringen er.

**Status: åpen, ikke omgjort.** ControlNet-sporet er ikke gjenopptatt som
produksjonsvei, og illustrasjonsretningen er ikke forkastet. Det som er endret,
er at nedleggelsen ikke lenger hviler på at problemet er *uløselig* — det hviler
på at løsningen ikke er *pålitelig nok*. Det er en svakere begrunnelse, og den
tåler å bli utfordret av en batch som viser noe annet.

Full målehistorikk: `docs/kitor-tilrettelegging-2026-09-02.md` og
`docs/revisjon-dybdekontroll-svar-2026-09-02.md`.

## [2026-09-01] Beslutning 50: Kontrollert muskelordforråd, og fire ikonfeil i produksjon
* **Kontekst:** Første steg mot muskelkartet (Beslutning 49). `muskler.primær` og `muskler.sekundær` i øvelseskatalogen er fritekst, og teksten hadde drevet fra hverandre: **55 unike navn for 75 øvelser**. `sete` og `setemuskulatur`, `bakside lår` og `hamstring`, `latissimus` og `brede ryggmuskel` er samme muskel skrevet på to måter. Rundt en femtedel av navnene er ikke muskler i det hele tatt — `kondisjon`, `balanse`, `restitusjon`, `grep`, `lepper`.
* **Funn — fire feil sto i produksjon.** `MuscleIcon` normaliserte med delstrengsjekker i fast rekkefølge, og rekkefølgen var feil:

  | Øvelser | Katalogen sier | Ikonet viste | Årsak |
  |---|---|---|---|
  | 4 | `bakside lår` | quadriceps | `lår`-sjekken sto før `bakside lår` |
  | 2 | `korsrygg` | øvre rygg | `rygg`-sjekken sto før `korsrygg` |
  | 2 | `brystrygg` | bryst | `bryst`-sjekken sto først |
  | 5 | `latissimus` | magemuskler | ingen gren traff — falt til fallback |

  Grenene for `korsrygg` og `bakside lår` var **død kode** og kunne aldri nås. I tillegg fikk alt umatchet — `kondisjon`, `balanse`, `hofteleddsbøyere`, `lepper` — magemuskel-ikonet.
* **Valg:**
  1. `src/data/muskler.ts` med **18 anatomiske grupper** og **8 kvaliteter** som ikke er anatomi. Oppslaget er en eksplisitt tabell, ikke mønstermatching. Et ukjent navn gir `null`.
  2. Ett navn kan peke på flere grupper. Katte-ku oppgir `ryggsøyle`, og øvelsen mobiliserer hele ryggen — ett kart-område ville løyet om halve øvelsen.
  3. **Friteksten beholdes i katalogen.** Den er brukervendt, og en kanonisk nøkkel ved siden av dekker ikoner, filtrering og muskelkart uten å endre 75 øvelser.
  4. `MuscleIcon` slår opp kanonisk gruppe og bruker `Record<MuskelGruppe, IkonKomponent>`. Legger noen til en gruppe uten å velge ikon, **nekter TypeScript å kompilere** — sterkere enn en test, fordi det ikke kan glemmes. Seks grupper uten eget ikon deler et beslektet, med kompromisset skrevet ned.
  5. Kvaliteter gir **ingen ikon**. Et magemuskel-ikon ved siden av «kondisjon» er en påstand om anatomi der det ikke finnes noen.
* **Konsekvens:** Ni tester binder ordforrådet, hvorav den viktigste er uttømmenhet: hvert eneste navn i katalogen må være kjent. Neste person som skriver «rumpemuskler» får rød test i stedet for et stilltiende feil ikon. Kvalitetene bør på sikt flyttes til et eget felt i `ExerciseSchema` — de er reell informasjon om øvelsen, men de hører ikke i et muskelfelt.

---

## [2026-09-04] Beslutning 51: B2B Bedriftsadministrasjon, 1-klikks onboarding og rike testerrapporter
* **Kontekst:** Organisasjonsportalen trengte administrative mekanismer for å administrere bedriftsavtaler uten direkte database-inngrep. Testerne trengte en rask måte å rapportere feil på direkte under en økt (inkl. tale og skjermbilde), og admin trengte et format som enkelt kan overleveres som oppdrag for Claude Code / Antigravity.
* **Valg:**
  1. **Utvidet bedriftsskjema:** `organizationSchema.ts` utvidet med feltene: `orgNr` (9 siffer norsk org.nr), `contactPerson` (navn, e-post, telefon), `billing` (fakturaEpost, fakturaAdresse, kontonummer, kid), `agreementType` (`pilot`, `standard`, `senior_kommune`, `idrettslag`, `tilpasset`), `maxLicenses` og `notes`.
  2. **Full livssyklus i `organizationService.ts`:**
     - Funksjoner for `createOrganization`, `updateOrganization`, `deleteOrganization`, `toggleOrganizationStatus` og `extendOrganizationExpiry`.
     - Sikkerhet: Systemorganisasjoner (`pilot`, `bedrift-as`) er beskyttet mot sletting.
  3. **1-klikks distribusjon:** Støtte for URL-parametere `?org=KODE` (automatisk registrering av ansatt) og `?tester=KODE` (aktiverer testermodus).
  4. **Tale-til-tekst og bildeopplasting for testerrapportering:**
     - Web Speech API (`webkitSpeechRecognition`/`SpeechRecognition`) integrert i `FeedbackModal.tsx` for håndfri tale-til-tekst rapportering.
     - Filopplasting av skjermbilder (konverteres trygt til Base64 data-URL).
     - Eksport-knapp: «Kopier for Claude/AI» som produserer ferdig strukturerte markdown-oppdrag med miljøinfo, transkripsjon og tekniske detaljer.
  5. **Øvelses- og illustrasjonsadministrasjon:** Lagt inn direkte forhåndsvisning og URL-overstyring for fase 1 og fase 2 i administrasjonspanelet.

---

## [2026-09-04] Beslutning 52: Fullverdige økter – CrossFit, HIIT & 60-minutters AI Generator
* **Kontekst:** Min Trener har spesialisert seg på mikrotrening (30 sekunder til 10 minutter), men brukere etterspurte klassiske fullverdige treningsøkter (30–60 minutter) for dager der man har god tid og ønsker høyere metabolsk intensitet (CrossFit / HIIT / WOD).
* **Valg:**
  1. **Ny kategori:** `CrossFit & HIIT (30–60 min)` lagt til i `ProgramFilter` og `ProgramCatalogModal.tsx`.
  2. **Klassiske CrossFit- og HIIT-økter:** 6 nye strukturerte programmer lagt til i `src/data/programs.ts`:
     - *Klassisk Cindy WOD (30m)* – AMRAP-stil med pushups, pullups og knebøy.
     - *Metabolsk Svettefest 45 (45m)* – Høyintensiv fullkroppsintervall.
     - *EMOM Klokkestriden 35 (35m)* – Hvert minutt på minuttet med variasjon.
     - *Fullkropps Styrkefest 50 (50m)* – Tunge baseøvelser og kjernemuskulatur.
     - *Kroppsvekt Hero-WOD 60 (60m)* – Krevende utholdenhet og viljestyrke.
     - *Makspuls Teampartner 40 (40m)* – Par-/intervall-kompatibel intensitet.
  3. **Skalering av AI Treningsgenerator:**
     - `WorkoutGeneratorModal.tsx` utvidet fra 3–20 minutter til trinnløs 3–60 minutter.
     - Hurtigknapper utvidet med: `3m`, `5m`, `10m`, `20m`, `30m`, `45m`, `60m`.
  4. **Strukturert sortering og utstyrsfiltrering:**
     - Løftet treningsform og varighet (`CrossFit & HIIT 30–60m`, `Intervall 4–10m`, `Mobilitet 2–10m`) ut i en egen synlig hurtigrad for å hindre at knappen forsvinner bak horisontal rulling.
     - Lagt til utstyrsfilter: «Kun kroppsvekt (uten utstyr)» vs «Med ekstra utstyr (vekter / strikk / stang)» (yogamatte/stol ekskluderes som utstyrshinder).
     - Visuelle utstyrsmerker på programkortene for umiddelbar oversikt.
  5. **Navigasjonskorreksjon:**
     - Rettet tilbakeknapp fra `← Timer` til `← I dag` på tvers av samtlige katalog- og verktøyvisninger.
  6. **VoiceTone-integritet:** Alle nye programmer benytter strengt typede stemmetoner fra `profileSchema.ts` (`'gira'`, `'rolig'`, `'lek'`, `'tørr'`).

---

## [2026-09-04] Beslutning 53: Konfigurerbar nedtelling (3s vs 5s) og varselsignaler (Klassisk pip vs Gym-buzzer)
* **Kontekst:** Ved trening på storskjerm, i boks/CrossFit-miljøer eller med bakgrunnsmusikk trengs lengre forvarsel og kraftigere lydsignaler enn diskré hjemmetrening og kontormikropauser.
* **Valg:**
  1. **Konfigurerbar nedtellingsvarighet:**
     - Brukeren kan velge mellom `3 sekunder (Standard)` og `5 sekunder (CrossFit / Storskjerm)` i Innstillinger (`SettingsMoreView.tsx`).
     - Lagres i `PersistedUserSettings` (`settingsStorageService.ts`) og propageres via `TimerEngine` og `useIntervalTimer`.
     - `TimerEngine` avgir `countdown`-events (`1 | 2 | 3 | 4 | 5`) dynamisk basert på innstillingen ved faser med tilstrekkelig varighet (>= 4s for 3s, >= 5s for 5s).
  2. **Valgfri lydprofil for varselsignal:**
     - `Klassisk pip`: Diskré 520 Hz elektronisk pip, ideelt for kontor og leilighet.
     - `Kraftig gym-buzzer`: Syntetisert autentisk CrossFit-/boks-horn (Web Audio API med sagtannbølge og fyldige kvint-overtoner ved ~190–200 Hz). Skjærer markant gjennom musikk i rommet.
  3. **Integrert i AudioDirector:**
     - `audioDirector.ts` lytter på valgt lydprofil og ruter nedtelling og startsignal (`playBuzzerStart` vs `playWorkStart`) automatisk.
  4. **Brukertesting og forhåndsvisning:**
     - Direkte «Test nedtelling» og «Test startsignal»-knapper i `SettingsMoreView.tsx` slik at brukeren umiddelbart kan høre forskjellen før økten starter.

---

## [2026-09-04] Beslutning 54: Horisont 1 – Skadefilter-sikring, WCAG Touch Targets, Total gjenværende tid og Onboarding-feedback (Revisjon C)
* **Kontekst:** Systemrevisjon C avdekket 5 umiddelbare forbedringspunkter i systemarkitekturen:
  1. `aiWorkoutGeneratorService.ts` falt stille tilbake til hele øvelsesbiblioteket dersom filtre for skader (f.eks. knær eller skuldre) resulterte i for få øvelser.
  2. `TimerDisplay.tsx` manglet visning av total gjenstående tid under aktiv økt i fokusmodus (viste kun tid igjen på gjeldende intervall og gjeldende runde).
  3. `App.tsx` brukte rød feiltoast med feil-ikon for å bekrefte vellykket tester- og organisasjonsaktivering ved URL-onboarding (`?tester=` og `?org=`).
  4. `organizationService.ts` opprettet automatisk en dummy-organisasjon i localStorage ved ukjent kode i stedet for å avvise ugyldige invitasjonskoder.
  5. Filterknappene i `ProgramCatalogView.tsx` manglet tilstrekkelig trykkflate (touch target) ihht. WCAG 2.2 AA (minst 44x44 px).
* **Valg:**
  1. **Tett skadefilter i AI-generator:** Fjernet usikker fallback (`EXERCISE_LIBRARY`). Introdusert `isSafeExercise` med eksplisitt anatomisk sjekk mot knebøy, utfall, markløft, pushups, planker, dips og skulderbelastning. Ved færre enn 4 kandidater fylles det opp utelukkende med garantert trygge mobilitets- og tøyeøvelser.
  2. **Total gjenværende tid i fokusmodus:** Lagt til formatert gjenstående tid (`totalt MM:SS`) ved siden av rundenummeret i fokusmodus i `TimerDisplay.tsx`.
  3. **Dedikert suksess-toast:** Utvidet `errorToastService.ts` og `ErrorToast.tsx` med `type: 'success'` og `showSuccessToast` (grønn smaragd-styling, `CheckCircle`-ikon og riktig `aria-label`).
  4. **Entydig validering av organisasjonskoder:** Fjernet automatisk opprettelse av `Avdeling <KODE>` ved ukjent kode. `joinOrganizationByCode` returnerer nå entydig `{ success: false, error: '...' }` dersom koden ikke eksisterer i databasen.
  5. **WCAG 2.2 AA Touch Targets:** Økt minstehøyde for filterknapper i `ProgramCatalogView.tsx` til `min-h-[44px]` med utvidet polstring (`py-2 px-3.5`).

---

## [2026-09-04] Beslutning 55: Horisont 2 – Konfigurerbar intervall-ratio, Timer-benchmark og Sensor-fallback (Revisjon C)
* **Kontekst:** For å styrke motortoleranse, tilpasningsdyktighet og sensorstabilitet i tråd med Horisont 2 fra Revisjon C:
  1. Brukere i AI Treningsgeneratoren trengte fleksibilitet på arbeids-/hvile-forhold (Tabata vs Rolig vs Standard vs EMOM).
  2. Manglet en formell CI-benchmark for `TimerEngine` som beviser at timeren aldri drifter under CPU-throttling eller uregelmessige ticks på eldre enheter.
  3. Pulsmåler-widgeten (`HeartRateWidget.tsx`) manglet visuell tilbakemelding til brukeren under automatisk gjennoppkobling (BLE reconnect-backoff) hvis et pulsbelte mistet signalet midt i en økt.
* **Valg:**
  1. **Konfigurerbart Intervalltempo i AI Generator:**
     - Utvidet `AiWorkoutPrompt` og `generateCustomAiWorkout` med `pacingRatio`:
       - `standard_2_1`: 40s arbeid / 20s hvile (balansert).
       - `rolig_1_1`: 30s arbeid / 30s hvile (rolig/teknikk).
       - `tabata_2_1`: 20s arbeid / 10s hvile (høy puls).
       - `emom_5_1`: 50s arbeid / 10s hvile (høyt volum/styrke).
     - Lagt til dedikert radiovelger i `AiWorkoutGeneratorModal.tsx`.
  2. **Automatisert Benchmark-test for Klokkedrift:**
     - `src/services/__tests__/timerDrift.benchmark.test.ts` implementert.
     - Simulerer 60 sekunders løp med 30–250 ms tilfeldig jitter og måler totalElapsed mot veggklokke. Verifiserer < 1 ms avvik.
     - Tester dvale/sleep catch-up (42 sekunder frys) og verifiserer at motor lander i nøyaktig fase og beregner `phaseRemaining` og `totalElapsed` feilfritt.
  3. **Sensor-fallback & UI-reconnect indikator:**
     - `bluetoothHeartRateService.ts`: `reattach()` tar nå imot `onReconnecting`-callback.
     - `HeartRateWidget.tsx`: Viser en pulserende oransje badge `Søker... (<forsøk>/5)` under aktiv bakgrunns-reconnect, slik at brukeren vet at appen automatisk henter inn signalet igjen.

---

## [2026-09-04] Beslutning 56: Revisjon C Fase 1 & 2 – PWA Kode-splitting, Sikkerhet og B2B-arkitektur
* **Kontekst:** Fullføring av de to første fasene fra helhetlig systemrevisjon C (`docs/revisjon-C-innovasjon-2026-09-04.md`):
  1. Hoved-bundlen på mobil inneholdt administrative og perifere komponenter (`AdminDashboardModal`, `WorkoutBuilderView`, `OfficeKioskScreen`).
  2. `adminService.ts` benyttet et hardkodet klartekst-passord (`MINTRENER-ADMIN-2026`) for å låse opp admin-rettigheter lokalt.
  3. `firestore.rules` manglet eksplisitte sikkerhetsregler for `/organizations/{orgId}`, noe som etterlot bedriftsavtaler uten databasenivå-autorisasjon.
* **Valg:**
  1. **Kode-splitting & PWA-slanking (Fase 1):**
     - `AdminDashboardModal`, `WorkoutBuilderView` og `OfficeKioskScreen` er konvertert til `React.lazy()` og pakket inn i `React.Suspense fallback={null}`.
     - `index-*.js` bundle redusert med over 70 kB.
     - `ProgramCatalogView` har fått `touch-pan-x overscroll-x-contain` og visuelle rulle-indikatorer.
  2. **Eliminering av klartekstpassord & Sikker Admin-tilgang (Fase 2):**
     - Fjernet hemmelig passord i `adminService.ts`. Admin-adgang krever nå autentisering via `AuthContext` der e-post må matche autoriserte administratorer (`ADMIN_EMAILS`).
     - Lokal overstyring via `localStorage` er sperret i produksjon og kun tillatt i lokale utviklermiljøer (`import.meta.env.DEV`).
     - `SettingsMoreView.tsx` oppdatert med informativ tilbakemelding om Google-innlogging for administratorer.
     - Enhetstester opprettet og verifisert i `src/services/__tests__/adminService.test.ts`.
  3. **B2B-arkitektur & Firestore-sikkerhet (Fase 2):**
     - Lagt til `isAdmin()` hjelpefunksjon og eksplisitte regler for `/organizations/{orgId}` i `firestore.rules`.
     - Kun autoriserte administratorer har skriverettigheter til organisasjoner, mens innloggede medlemmer har lesetilgang.
     - Skrevet formelle sikkerhetstester i `tests/rules/firestore.rules.test.ts`.

---

## [2026-09-04] Beslutning 57: Revisjon C Fase 3 – Bevaring av Fane-tilstand, Scroll og Kognitiv Avlastning
* **Kontekst:** Systemrevisjon C avdekket et kognitivt irritasjonsmoment i brukerflyten:
  - Faner ble tidligere unmountet og remountet via en streng ternær switch i `App.tsx` (`activeTab === 'timer' ? <TimerDisplay /> : ...`).
  - Når en bruker søkte i Øvelsesbiblioteket eller bladde dypt ned i Programkatalogen for så å ta en rask tur innom Timeren for å sjekke innstillinger, ble hele visningstilstanden, søkeordet og scrollposisjonen nullet ut ved retur.
* **Valg:**
  1. **Bevaring av besøkte faner i DOM-en (`visitedTabs`):**
     - `App.tsx` sporer nå et sett med besøkte faner (`Set<AppTab>`).
     - Faner monteres ved første gangs besøk (lazy mount), og forblir i DOM-en skjult med standard CSS (`hidden` vs `block`) i stedet for å unmountes.
     - Dette bevarer scrollposisjon, søkestreng, filtervalg og eventuelle påbegynte skjemadata sømløst mellom fanebytter.
  2. **Unntak for Byggeren:**
     - Egendefinert programbygger (`WorkoutBuilderView`) fortsetter å unmountes når den forlates, slik at neste åpning fra programkatalogen alltid starter med en fersk, ren mal (kopi eller ny økt).
  3. **Verifisering:**
     - Egen enhetstest i `src/__tests__/App.test.tsx` verifiserer at tidligere besøkte faner holdes i DOM-en med riktig skjuling og synlighet ved fanebytte.

---

## [2026-09-04] Beslutning 58: Revisjon C Fase 4 – Harmonisert Styrke-hviletimer og Robust Periferi
* **Kontekst:** Systemrevisjon C avdekket inkonsistens i tidsstyring og lydopplevelse under styrkeøkter:
  - Mens `StrengthWorkoutModal.tsx` brukte en sanntids veggklokke-beregning mot bakgrunnsdvale og ga 3s nedtellingspip samt fløytesignal ved ny arbeidsstart, manglet `StrengthLoggerModal.tsx` disse fysiologiske og auditive signalene og var utsatt for dvaledrift.
* **Valg:**
  1. **Harmonisert Hviletimer i Styrkelogg:**
     - `StrengthLoggerModal.tsx` beregner nå gjenstående hviletid direkte mot veggklokkens måltidspunkt (`restTargetTimeRef = Date.now() + restDuration * 1000`). Timeren tikker uforstyrret selv om mobilskjermen dimmes eller nettleseren legges i bakgrunnen.
     - Lagt til 3-sekunders advarselspip (`audioService.playCountdownBeep(true)`) og umiskjennelig startfløyte (`audioService.playWorkStart(true)`) når pausen er over.
  2. **Verifisering:**
     - `src/components/strength/__tests__/StrengthLoggerModal.timer.test.tsx` bekrefter automatisk oppstart av hviletimer ved fullført sett, akustiske signaler på nøyaktige sekunder og ren opprydding ved fullføring/hopp over.

---

## [2026-09-05] Beslutning 59: Treningsfysiologisk Progresjon, Autoregulerende Deload og Inngangsgulv for Utfordringer
* **Kontekst:** Oppfølging av Revisjon C (Horisont 1–3, fysiologi og progresjonsarkitektur):
  - `adaptiveProgressionService.ts` økte tidligere både volum (+5s) og kuttet pause (-2s) samtidig ved "for_lett", som brøt med fysiologisk overload-teori og ga for bratt metabolsk sprang.
  - Vedvarende tretthet og avbrutte økter manglet en aktiv kobling til deload-anbefalinger.
  - Erfarne utøvere som tok 30-dagers utfordringer (f.eks. Planke) ble tvunget til å starte på 20s på dag 1 uavhengig av form.
* **Valg:**
  1. **Trinnvis Overload-prinsipp:**
     - Hvis hviletid allerede er kort (<= 20s), økes arbeidstiden (+5s) mens pausetiden beholdes intakt.
     - Hvis hviletid er romslig (> 20s), reduseres pausetiden (-2s, med et fysiologisk gulv på 10s) for å øke treningsdensitet, mens arbeidstid beholdes intakt.
     - Aldri begge justeringer i samme trinn.
  2. **Aktiv Deload-anbefaling:**
     - Ved 3 påfølgende "for_tungt"-logger eller avbrutte runder, foreslår motoren en skånsom Deload-økt (40 % volumkutt) med egen visuell oransje/amber-profil i `TimerDisplay.tsx`.
  3. **Inngangsgulv for Utfordringer:**
     - `challengeService.ts` har fått `startChallengeAtDay(challengeId, startDay)` som forhåndsutfyller dager opp til valgt startnivå.
     - `ChallengeDetailModal.tsx` lar utøvere starte direkte på fase 2, 3 eller 4.

---

## [2026-09-05] Beslutning 60: B2B Firestore-synkronisering og Kognitiv Avlastning på Startskjermen
* **Kontekst:** Fullføring av rapportens B2B- og grensesnittpunkter:
  - B2B-organisasjoner eksisterte kun i lokal `localStorage` til tross for etablerte regler i `firestore.rules`.
  - Startskjermen hadde 7 distinkte kognitive soner som skapte mental nøling før oppstart.
* **Valg:**
  1. **B2B Skysynkronisering:**
     - `organizationService.ts` synkroniserer nå automatisk opprettelse, redigering og deaktivering/sletting mot Firestore `/organizations/{orgId}` i bakgrunnen med `sanitizeForFirestore` for å unngå ugyldige felter.
     - Innført `syncOrganizationsFromFirestore()` for toveis synkronisering mot skyen når administrator eller ansatte er tilkoblet.
  2. **Kognitiv Avlastning og Start-dominans:**
     - Primærknappen i hviletilstand (`TimerDisplay.tsx`) er forsterket til en fremtredende "START ØKT" med myk gradient og forhøyet kontrast, slik at blikket naturlig ledes mot å starte dagens bevegelse.




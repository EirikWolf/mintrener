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

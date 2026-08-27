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






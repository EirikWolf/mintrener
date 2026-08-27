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

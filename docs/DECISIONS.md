# Beslutningslogg (Architecture Decision Record)

Dette dokumentet loggfører arkitektoniske og tekniske beslutninger som tas under utviklingen av appen, spesielt valg som supplerer eller presiserer `trening-app-spesifikasjon.md`.

---

## 2026-08-26: Prosjektoppsett og Firebase-tilknytning
- **Valgt Firebase Prosjekt-ID:** `mintrener` (ettersom `trening` var opptatt globalt i GCP).
- **Web App registrert:** `Min Trener` (App ID: `1:75260907978:web:c5f62517b0aea66a60bf33`).
- **Hosting URL:** `https://mintrener.web.app` og `https://mintrener.firebaseapp.com`.

## 2026-08-26: Fase 1 – Frittstående intervalltimer
- **Tidsstyring:** Bruk av `requestAnimationFrame` kombinert med `performance.now()` og tidsstempler for millisekundpresisjon. Forhindrer tidsdrift under CPU-throttling og bakgrunnsfane-struping i mobile nettlesere.
- **Web Audio API med syntetiserte oscillatorer:** Syntetiserer rene frekvenstoner (sinus/firkantbølger) direkte i nettleseren i stedet for å laste ned eksterne mp3-filer. Dette garanterer null forsinkelse, null nettverksavhengighet ved oppstart og full kontroll over tonehøyde/varighet.
- **AudioContext Unlock:** `AudioContext` settes i `suspended` frem til brukerens første klikk på «Start økt» eller «Lås opp lyd», som vekker konteksten i tråd med iOS Safari sine strenge autoplay-begrensninger.
- **Screen Wake Lock API:** Knyttes til aktiv økttilstand og reaktiveres automatisk ved `visibilitychange` (når brukeren vender tilbake fra en annen fane eller låseskjerm).
- **UI-arkitektur:** Mobil-først design med stor sirkulær SVG-progress, høykontrast fargeskifte (arbeid vs. hvile) og egen låsemodus for å unngå feiltrykk.

## 2026-08-26: TDD-rigg, Firebase Auth & Firestore Datamodell (Fase 2)
- **TDD-testmiljø:** Konfigurert `vitest` + `@testing-library/react` med `jsdom` og mocks for Web Audio API (`AudioContext`), Screen Wake Lock (`navigator.wakeLock`) og `navigator.vibrate`.
- **Firebase Auth (Google Sign-In):** Benytter `signInWithPopup` med automatisk fallback til `signInWithRedirect` for mobile nettlesere som blokkerer popups.
- **Firestore Offline Persistens:** Konfigurert med `persistentLocalCache` og `persistentMultipleTabManager` for robust offline-funksjonalitet på tvers av nettleserfaner.
- **Sikkerhetsregler & GDPR:** Implementert `firestore.rules` med eierskapssjekk (`request.auth.uid == userId`) og innebygd funksjon for sletting av brukerkonto og all historikk direkte i `UserMenu.tsx`.

## 2026-08-26: Øvelsesskjema (JSON Schema) og Øvelsesbibliotek (Fase 3)
- **JSON Schema-validering med Zod:** `src/schemas/exerciseSchema.ts` definerer et strengt typeskjema i henhold til spesifikasjonens kapittel 6 og Vedlegg A.11. Validerer navn (nb/en), type (reps/tid), kategori, primær-/sekundærmuskler, utstyr, nivå, instruksjoner (3-5 trinn) og sensorprofiler.
- **Modulær bolk-oppbygging:** Øvelsene er strukturert i bolker (`bodyweight.ts`, `kettlebell.ts`, `dumbbells.ts`, `cardio.ts`, `mobility.ts`) og aggregeres med automatisk validering ved oppstart.
- **Søk & Filtrering:** Implementert `filterExercises` med fulltekstsøk (navn/muskelgrupper), kategorivelgere og utstyrsfiltrering.
- **Navigasjon:** Bunnmeny (`BottomNav.tsx`) som lar brukeren veksle sømløst mellom **Timer** og **Øvelser** i hvilemodus, mens den skjules for maksimalt fokus under en pågående økt.

## 2026-08-26: Bygg økt-skjermen & Egendefinerte Maler (Fase 4)
- **Bygg økt (Workout Builder):** Implementert i `WorkoutBuilderView.tsx` med sanntidsberegning av totalvarighet (`calculateWorkoutDuration`), mulighet for å plukke øvelser fra biblioteket (`ExercisePickerModal.tsx`), endre rekkefølge og tilpasse arbeid/hvile per intervall.
- **Raske Tabata/Intervall-presets:** Hurtigknapper (20s/10s, 30s/15s, 40s/20s, 45s/15s) for å sette like tider på alle øvelser med ett trykk (`applyUniformDurations`).
- **Lagring og synkronisering:** `customWorkoutsService.ts` håndterer lokal lagring i `localStorage` for anonyme/frakoblede brukere og automatisk toveis synkronisering til Firestore `/users/{uid}/workouts` for innloggede brukere.
- **Direkte start:** Egendefinerte økter kan startes umiddelbart i timeren og dukker automatisk opp i mal-velgeren øverst på timerskjermen.

## 2026-08-26: PWA (Offline, Service Worker & Manifest) og Sensorstatus (Fase 5)
- **PWA med Workbox:** Konfigurert `vite-plugin-pwa` med `generateSW`, precaching av statiske ressurser og Web App Manifest (`manifest.webmanifest`). Gjør appen fullt installerbar på hjemskjermen på både Android og iOS.
- **Sensordiagnostikk (Kapittel 2):** Implementert `sensorDiagnosticsService.ts` og `SensorStatusModal.tsx` tilgjengelig via aktivitetsikonet i topplinjen. Viser sanntidsstatus for Web Audio, Screen Wake Lock, Vibrasjon, DeviceMotion (med tillatelsesknapp for iOS Safari), Web Bluetooth (med plattformforklaring) og GPS.

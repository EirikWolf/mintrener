# Min Trener – Komplett Master Backlog & Fremtidsinitiativer

Dette dokumentet samler alle gjenstående oppgaver, produksjonsbestillinger og planlagte epiker basert på **Spesifikasjon v1.2**, **Vedlegg A (Bilder/Video)**, **Vedlegg B (Microtrening)** og **Vedlegg C (Styrke & Organisasjon)**.

---

## 📋 Oversikt over Epiker og Prioriteringer

| Epik | Område | Kilde | Status |
|---|---|---|---|
| **A. Video-loops på Kitor** | AI-genererte 2–4s sømløse loops med Wan2.1 | Vedlegg A.15 / Brukerønske | 🟡 Planlagt (Arkitektur klar) |
| **B. Ekte Norsk Lydproduksjon** | Forhåndsinnspilte stemmeklipp (5-4-3-2-1 og tilrop) | Vedlegg B.3, B.15 | ⚪ Venter på studio/Kitor TTS |
| **C. Komplett Kitor Bildebatch** | Headless bildekjøring & 20 SVG-ikoner | Vedlegg A.9, A.13 | ⚪ Venter på Kitor GPU-kjøring |
| **D. Organisasjonsportal** | Bedriftsdashbord for HMS/HR & avdelingsutfordringer | Vedlegg C del 3 | ⚪ Fase 3 / Bedriftsavtaler |
| **E. Kamera Rep-teller & Form** | MediaPipe pose-estimering for automatisk telling | Vedlegg C.13, C.14 | ⚪ Neste generasjon |
| **F. WebRTC Gruppesynk & Kiosk** | Millisekund-presis synkronisering & Kontor-TV | Vedlegg B.4, B.5 | ⚪ Videreutvikling |
| **G. App Check & Cloud Functions** | App Check håndheving & GDPR slettefunksjon | Spesifikasjon Kap. 5 | ⚪ Før kommersiell skalering |
| **H. Adaptiv Deload & Tretthet** | Automatisk treningsjustering basert på RPE/tretthet | Vedlegg C.19 | ⚪ Videreutvikling |

---

## 🎬 Epik A: AI-generert Video-loop Pipeline på Kitor (Wan2.1 / I2V)
* **Problemstilling:** Statiske fasebilder fanger ikke bevegelsens tempo, hofteknekk, flyt eller eksplosivitet (f.eks. i kettlebell swing, burpees, utfall eller katt-ku mobilitet).
* **Løsning:** Generere fotorealistiske 2–4 sekunders video-loops av instruktøren Astrid direkte på Kitor (RTX 3090 / 24 GB VRAM) med `Wan2.1-I2V` eller `CogVideoX-5B-I2V`.
* **Teknisk leveranse:**
  1. Komprimeres til superlette MP4/WebM filer (**300–500 KB per øvelse**).
  2. Totalt ~32 MB for hele 72-øvelsers biblioteket (precachet i PWA for 100 % offline bruk).
  3. Maskinvareakselerert `<video autoPlay loop muted playsInline>` i `TimerDisplay.tsx`, `MicroTimerDisplay.tsx` og `TvBigScreenDisplay.tsx`.
* **Fremdriftsplan:**
  - [ ] **A.1:** Kjøre 3 pilotøvelser (`knebøy`, `kettlebell-swing`, `push-up`) på Kitor.
  - [ ] **A.2:** Bygge `<ExerciseVideoDisplay>` i frontend med fallback til `0.webp`.
  - [ ] **A.3:** Kjøre full headless batch for alle 72 øvelser via Tailscale API.

---

## 🎙️ Epik B: Ekte Norsk Lydproduksjon & Audio Sprites (Vedlegg B.3, B.15)
* **Problemstilling:** Web Speech API (syntetisk tale) fungerer godt som fallback, men ekte innspilte stemmeklipp gir overlegen motivasjon, naturlig intonasjon og null forsinkelse på 5–4–3–2–1 nedtellingene.
* **Løsning:**
  1. Spille inn eller generere naturlige norske lydfiler for:
     - Nedtellinger: «Fem», «Fire», «Tre», «To», «Én», «Gå!», «Pause!», «Halvveis!».
     - Motivasjonslinjer for de 4 tonene: `rolig` (bærekraft), `lek` (dyrelyder/moro), `gira` (høytrykk), `tørr` (nøytral).
  2. Pakke lydfilene i en lett **Audio Sprite** via Web Audio API for umiddelbar respons uten nettverkslag.

---

## 🖼️ Epik C: Komplett Kitor Bildebatch & SVG Ikonpakke (Vedlegg A.9, A.13)
* **Gjenstående fra Vedlegg A:**
  1. **Full headless batch:** Generere godkjente fotorealistiske WebP-bilder (448×576 og 224×288 miniatyrer) for alle øvelser som i dag mangler dedikert bilde.
  2. **20 SVG-ikoner (A.9):** 12 muskelgruppe-ikoner (bryst, skuldre, rygg, armer, kjerne, sete, lår, legger) og 8 utstyrsikoner (kettlebell, manualer, matte, stol, strikk) tegnet i ren SVG.
  3. **Om-side opphavstekst (A.13.13):** Bekrefte kreditering og opphavstekst for AI-instruktør i om-menyen.

---

## 🏢 Epik D: Organisasjons- & Bedriftsportal (`organizations`, Vedlegg C del 3)
* **Problemstilling:** Bedrifter, kor, idrettslag og kommuner (som LilleSterk) ønsker felles aktivitet for ansatte uten å overvåke enkeltpersoner.
* **Løsning:**
  1. **Bedriftsdashboard for HR/HMS:** Vise aggregert anonymisert statistikk (f.eks. *«Avdeling Salg har trent 142 minutter denne uken»*). Tellere vises aldri under 3 personer (personvern).
  2. **Felles bedriftsutfordringer:** 28-dagers fellespause for hele kontoret.
  3. **Whitelabeling:** Mulighet for bedriftens logo i topplinjen.
* **Merk:** Kjernen av Min Trener forblir 100 % gratis og åpen kildekode for enkeltbrukere.

---

## 📹 Epik E: Kamera Repetisjonsteller & Form-veiledning (Vedlegg C.13, C.14)
* **Problemstilling:** Brukere som trener alene ønsker å vite om de har godkjent dybde i knebøy eller om korsryggen synker i planken.
* **Løsning:**
  1. Integrere **Google MediaPipe Pose** i en Web Worker.
  2. Automatisk telling av repetisjoner (vinkel i kneledd > 90° = godkjent rep).
  3. Holdningsvarsler i sanntid: *«Senk hoften litt»* eller *«God dybde!»*.
  4. **100 % personvern:** All bildeanalyse skjer lokalt på enhetens GPU – ingen video streames eller lagres.

---

## 👥 Epik F: Sanntids WebRTC Grupperom & Kiosk/Digital Signage (Vedlegg B.4, B.5)
* **Gjenstående fra Vedlegg B:**
  1. **WebRTC DataChannel:** For felles økter der leder og deltakere skal ha synkronisert start/pause på millisekundet uten Firestore latency.
  2. **Kiosk / Digital Signage PWA (B.4):** Egen skjermsparer-modus for felles kontorskjermer i landskap som automatisk starter en 2-minutters pauseøkt til faste tider (f.eks. kl. 11:30 og 14:00).
  3. **Teams / Slack Webhook-bot (B.6):** Automatisk posting av dagens lenke i felleskanalen.

---

## 🔒 Epik G: Produksjonssikkerhet & App Check i Firebase (Kapittel 5)
* **Gjenstående fra Spesifikasjon Kap. 5:**
  1. **Firebase App Check:** Aktivere reCAPTCHA Enterprise for web for å beskytte Firestore og Functions mot uautoriserte API-kall.
  2. **Cloud Functions for Tellere (Kap. 5.3):** Skrive globale statistikk-aggregater via sikrede serverless functions.
  3. **Full GDPR Konto-sletting:** Cloud Function som sletter alle brukerdata og subcollections når en bruker sletter profilen sin.

---

## 🤖 Epik H: Adaptiv Deload & Skadeforebyggende Intelligens (Vedlegg C.19)
* **Gjenstående fra Vedlegg C:**
  1. **Tretthetsdeteksjon:** Hvis brukeren logger færre reps i 2 økter på rad i «Sterkere 12 uker», foreslås en automatisk *Deload-uke* (50 % volum, 70 % intensitet).
  2. **Dynamisk øvelseserstatning:** Hvis brukeren rapporterer skuldersmerter under benkpress/pushups, foreslås øyeblikkelig nøytralt grep eller gulvpress.

---

## 📌 Oppsummering
Min Trener har nå en fullt fungerende, produksjonstestet kjerne (Fase 1–10 + Kalender, Live Pulsgraf, i18n, Håndfri Stemme, Musikk-Ducking og AI Øktgenerator).

Punktene over utgjør veikartet for fremtidige iterasjoner og produksjonsløft!

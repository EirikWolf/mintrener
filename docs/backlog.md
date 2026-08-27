# Min Trener – Backlog & Idébank

Dokumentet samler planlagte fremtidige epiker, strategiske initiativer og arkitektur-brainstorming for Min Trener.

---

## 🎬 Epik: AI-generert Video-loop Pipeline på Kitor (Wan2.1 / I2V)

### 1. Bakgrunn og Problemstilling
Statiske bilder (start- og sluttposisjon) fungerer godt for enkle holdøvelser, men strekker ikke til for dynamiske bevegelser som:
* **Kettlebell swing** (tempo, hoftehengsel, eksplosivitet).
* **Burpees, froskehopp og utfall** (overganger og leddbaner).
* **Pust og ryggmobilisering** som Katt-Ku eller Fuglehund (kontinuerlig flyt).

For at Min Trener skal gi en opplevelse på topp internasjonalt nivå (slik som Nike Training Club og Seven, men uten reklame og abonnement), bør alle øvelser visualiseres som **sømløse, fotorealistiske 2–4 sekunders video-loops** med instruktøren vår (Astrid) mens timeren kjører.

---

### 2. Brainstorming: Modellvalg & Pipeline på Kitor (RTX 3090 / 24 GB VRAM)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         KITOR VIDEO PIPELINE                             │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  [1. Startposisjon] ──► [2. Wan2.1 / CogVideoX I2V] ──► [3. Loop-Fix]   │
│  (Fotorealistisk Flux     (Prompt + bevegelsesvektor)     (Interpolering │
│   Astrid LoRA bilde)                                       slutt -> start)│
│                                                                  │       │
│                                                                  ▼       │
│  [5. Web App <video>] ◄── [4. FFmpeg / AV1 / WebM Komprimering] ─┘       │
│  (Muted loop, 400 KB)                                                    │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

#### Alternativ A: Image-to-Video (I2V) med Wan2.1 eller CogVideoX (Anbefalt)
* **Verktøy:** `Wan2.1-I2V` (14B i GGUF/fp8 eller 1.3B) eller `CogVideoX-5B-I2V` i ComfyUI på Kitor.
* **Prosess:**
  1. Ta det godkjente startposisjonsbildet av Astrid (`0.webp`).
  2. Send til Wan2.1 I2V med prompt:  
     *«A woman in athletic wear performs a clean, controlled kettlebell swing. Hip hinge, arms stay straight, kettlebell floats to chest height and smoothly swings down between legs. Continuous smooth loop, neutral studio background.»*
  3. Generer 49–81 frames (2–3 sekunder ved 24/30 fps).

#### Alternativ B: Pose-Guided Video Generation (AnimateDiff / ControlNet OpenPose)
* **Verktøy:** AnimateDiff v3 + OpenPose sequence.
* **Fordel:** Sikrer at bevegelsen følger nøyaktig biomekanisk bane frame for frame.
* **Bruk:** Best for komplekse koordinasjonsøvelser der fri I2V kan hallusinere ekstra lemmer.

#### Alternativ C: Motion Transfer (Video-to-Video)
* **Verktøy:** Eirik / trener filmer seg selv i 2 sekunder med mobilkamera.
* **Prosess:** DWPose trekker ut skjelettet fra videoen, og Kitor overfører bevegelsen direkte til Astrid-modellen.

---

### 3. Teknisk Arkitektur i Web-Appen

1. **Format og koding:**
   * **Format:** MP4 (H.264 med bred støtte) og WebM (AV1/VP9 for minimal størrelse).
   * **Oppløsning:** 540 × 675 (portrett 4:5 / 7:9) – perfekt for mobilskjerm og TV.
   * **Størrelse per øvelse:** Kun **300–600 KB** per loop (optimalisert med `ffmpeg -crf 28 -movflags +faststart`).
   * **Totalt bibliotek:** 72 øvelser × 450 KB ≈ **32 MB totalt** for hele appen (kan enkelt forhåndscaches i service workeren for 100 % offline bruk).

2. **Frontend-komponent (`<ExerciseVideoDisplay>`):**
   * Erstatter `<ExerciseImage>` under aktive intervaller:
     ```tsx
     <video
       src={`/exercises/videos/${exercise.id}.mp4`}
       poster={`/exercises/${exercise.id}-0.webp`}
       autoPlay
       loop
       muted
       playsInline
       preload="auto"
       className="w-full h-full object-cover rounded-3xl"
     />
     ```
   * **Egenskaper:**
     * `muted` & `playsInline`: Nødvendig for automatisk start på iOS og Android uten brukerklikk.
     * Maskinvareakselerert dekoding: Nesten null CPU/batteribruk sammenlignet med GIF eller Canvas.
     * Fallback til eksisterende `0.webp`-bilde hvis video mangler eller hvis brukeren aktiverer lavt dataforbruk.

3. **Smart Forhåndslasting (Preloading):**
   * Mens nåværende øvelse pågår, forhåndslastes videoen for neste øvelse i bakgrunnen for sømløs overgang uten forsinkelse.

---

### 4. Fremdriftsplan (Epik-inndeling)

| Fase | Oppgave | Mål |
|---|---|---|
| **Pilot (Kitor)** | Teste 3 pilotøvelser (`knebøy`, `kettlebell-swing`, `push-up`) i ComfyUI på Kitor med Wan2.1 I2V. | Verifisere anatomisk kvalitet, loop-sømløshet og genereringstid per video. |
| **Frontend Integrasjon** | Bygge `<ExerciseVideoDisplay>` i `TimerDisplay.tsx`, `MicroTimerDisplay.tsx` og `TvBigScreenDisplay.tsx`. | Automatisk visning av video under arbeidsfasen, med bilde som fallback/poster. |
| **Batch-produksjon** | Kjøre Kitor headless batch for alle 72 øvelser via Tailscale/HTTPS API. | Komplett bibliotek av 72 høykvalitets MP4/WebM loops i `public/exercises/videos/`. |
| **Offline Cache** | Oppdatere PWA Service Worker til å cache øvelsesvideoer ved første gangs åpning. | 100 % frakoblet trening på fly, hytte og kjellergym. |

---

## 📌 Andre Backlog-punkter

* **Kamera-basert Rep-teller (MediaPipe / Pose Detection):** Automatisk opptelling av repetisjoner med frontkameraet.
* **Smartklokke-vibrasjon:** Integrasjon med Web Bluetooth / Wear OS companion for vibrasjon på håndleddet ved hvert intervallskifte.
* **Musikk-spillelister & Web Playback:** Integrasjon mot Spotify Web Playback SDK med automatisk ducking.

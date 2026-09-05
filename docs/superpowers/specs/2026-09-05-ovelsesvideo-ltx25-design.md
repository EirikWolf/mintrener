# Øvelsesvideo med LTX-2.5 — design

**Dato:** 2026-09-05 · **Status:** godkjent i brainstorm, venter på Eiriks gjennomlesing
**Bygger på:** Beslutning 23 (video-loop-pipeline, Wan), Beslutning 49 (revidert), bildepipelinen i `homelab-vault/05-Prosjekter/MinTrener-bildepipeline-2026-09-03.md`, og kitor-oppsettet i `homelab-vault/02-Tjenester/AI/ComfyUI.md` § LTX-2.5.

## 1. Mål

Hver øvelse får to videofiler laget fra **ett** LTX-2.5-klipp:

| Fil | Brukes | Krav |
|---|---|---|
| `<id>-loop.mp4` | i timeren under økt, der stillbildet står i dag | liten, stum, lukket loop, offline, starter øyeblikkelig |
| `<id>.mp4` | i øvelsesbiblioteket når man åpner øvelsen | lengre, med lyd, lastes ved behov |

Vi går fram **ti øvelser om gangen**, og hver batch kvalitetssikres av Eirik i kuratoren før neste.

## 2. Avgrensning

- **Fase A (denne spesifikasjonen):** én person per øvelse. Astrid for alle unntatt de ni seniorøvelsene, som får Sigrid. Ella er **ikke** med: barneprogrammene bruker bare delte øvelser, så regelen «personen følger øvelsen» gir henne ingen.
- **Fase B (senere, egen spec):** personen følger programmet — samme øvelse med Astrid, Sigrid og Ella. Krever at demoene flyttes ut av repoet (§ 6).
- **Fase D (senere):** TV-visning for instruktør. Originalen på 1280×704 er laget for det; ingenting i fase A må gjøres om.

## 3. Beslutninger tatt i brainstormen

1. **Én generering, to eksporter** (alternativ 3). Ett 8 s flf2v-klipp med to repetisjoner og lyd; biblioteket får det nedskalert, timeren får samme klipp transkodert til liten, stum loop. Halverer GPU-tid og kvalitetssikring mot to genereringer, og garanterer at timer og bibliotek viser samme bevegelse. Prisen er at timer-loopen er 8 s, ikke 4.
2. **Loopen lukkes med flf2v, ikke med trimming.** `ltx25_flf2v_api.json` på kitor har `LTXVAddGuide` på `frame_idx 0` og `-1`; `kjor_ltx.py --bilde` setter begge til samme fil. To av tre i2v-testklipp kom ikke tilbake til start — trimming er et lotteri.
3. **Ankeret er det kuraterte fase-0-stillbildet.** Samme fil er `poster` i `ExerciseIllustration`, så videoens første rute er identisk med plakaten. En øvelse uten godkjent startbilde kan ikke få video — bildekureringen er porten.
4. **Personen velges fra en eksplisitt tabell**, ikke utledet fra programmer.
5. **Bevegelsen beskrives i et eget felt** (`videoPrompt`), ikke gjenbrukt fra `bildePrompt`. Bildeprompten beskriver en stilling; videoen trenger en bevegelse som starter og slutter i den stillingen.
6. **Ingen ny infrastruktur i fase A.** Filene ligger i `public/videos/exercises/` og går ut med Firebase Hosting som bildene.

## 4. Dataflyt

```
public/images/exercises/<id>-0.png     (kuratert, bildeStatus 'godkjent')
  │  scripts/kjorVideoBatch.ts --bare a,b,c
  ├─ krever: bildeStatus === 'godkjent' for fase 0, og videoPrompt satt — ellers hopp over og si fra
  ├─ laster bildet opp til kitor input/
  ├─ tar én arbiter-lease (video), hjerteslag hvert 5. min
  ├─ per øvelse: kjor_ltx.py ltx25_flf2v_api.json --bilde <id>-0.png --varighet 8
  │     --prompt "<videoPrompt>, static camera, fixed framing" --seed <seedForExercise(id)+n>
  └─ henter original fra /mnt/truenas/ai/output/comfyui/video/ → pipeline/candidates/video/<id>/s<n>.mp4
  │
  │  scripts/eksporterVideo.ts   (lokalt, ffmpeg, ingen GPU)
  ├─ <id>.mp4       960×528, libx264 CRF 26, AAC 96 kbit/s mono, +faststart
  ├─ <id>-loop.mp4  480×264, libx264 CRF 28, uten lydspor, +faststart
  └─ manifest.json  størrelser, varighet, og loop-avvik (pikseldifferanse første/siste rute)
  │
  │  scripts/publiserKandidater.ts (utvidet)  → public/videos/kandidater/  (gitignored)
  │  kuratoren: se, godkjenn/avvis, velg seed  → «Last ned» (videoValg i eksporten)
  │  scripts/anvendValg.ts (utvidet)         → public/videos/exercises/<id>.mp4 + <id>-loop.mp4
  ↓
  ExerciseIllustration variant='loop'  (timer)   /  variant='demo'  (bibliotek)
```

Utdata går aldri rett i appen. Kandidater i `pipeline/candidates/video/` overlever kureringen, så et valg kan gjøres om uten ny GPU-kjøring (samme prinsipp som bildene).

## 5. Komponenter

### 5.1 `scripts/kjorVideoBatch.ts` (ny)

- Flagg som `kjorDybdeBatch.ts`: `--bare`, `--seeds N` (standard 2), `--seed-fra N`, `--dry-run`.
- Porten: leser `EXERCISE_LIBRARY`; en øvelse kjøres bare når `bildeStatus === 'godkjent'` **og** `videoPrompt` finnes. Manglende → listes i sammendraget, ikke stille hopp.
- Lease: `acquireGpuLeaseWithRetry` med `finnEgenLease`-vakt (gjenbruk fra `runFullKitorBatch.ts`), kategori `video`, varighet regnet av antall jobber × 200 s.
- Kjører `kjor_ltx.py` over SSH (`ssh kitor`), ikke via `/comfy-mintrener`-ruten — verktøyet på kitor eier widget-mappingen, som README-en dokumenterer som skjør. Vi lager ikke en kopi av den.
- Henter resultatet med `scp` fra TrueNAS-stien. Filnavn: `<id>-s<n>.mp4`.
- Tørrkjøring validerer porten og skriver ut prompt og seed per øvelse.

### 5.2 `scripts/eksporterVideo.ts` (ny)

- Inn: `pipeline/candidates/video/<id>/s<n>.mp4`. Ut: to filer ved siden av, `s<n>-demo.mp4` og `s<n>-loop.mp4`, pluss oppdatert `manifest.json`.
- Loop-avvik: trekker ut første og siste rute med ffmpeg, regner gjennomsnittlig absolutt pikseldifferanse (Pillow eller ren JS på PNG). Over terskel (settes etter første batch, start 12/255) → `loopAdvarsel: true` i manifestet og synlig merke i kuratoren.
- Varsler når en loop overstiger **400 KB** eller en demo **1,5 MB**.
- Krever `ffmpeg` i PATH; feiler tydelig hvis ikke.

### 5.3 `src/data/videoPersona.ts` (ny)

```ts
export const PERSONA_PER_OVELSE: Record<string, 'astrid_k' | 'sigrid_v_v4'> = {
  'balanse-ettbein': 'sigrid_v_v4', 'balanse-tandem': 'sigrid_v_v4', 'reise-seg-stol': 'sigrid_v_v4',
  'seated-armloft': 'sigrid_v_v4', 'seated-knestrekk': 'sigrid_v_v4', 'seated-marsj': 'sigrid_v_v4',
  'seated-skulder-rull': 'sigrid_v_v4', 'sidesteg-stotte': 'sigrid_v_v4', 'tahev-stotte': 'sigrid_v_v4',
};
export function personaFor(id: string) { return PERSONA_PER_OVELSE[id] ?? 'astrid_k'; }
```

Merk: personen bestemmer **stillbildet**, ikke videoen. Sigrids ni må først få stillbilder generert med `sigrid_v_v4` gjennom bildepipelinen og kurateres. I fase A batch 1 er alle ti Astrid, og tabellen brukes bare av tørrkjøringen for å si fra hvilke øvelser som venter på Sigrid-bilder.

### 5.4 `exerciseSchema`: `videoPrompt`

`videoPrompt: z.string().optional()` ved siden av `bildePrompt`. Engelsk, én setning som beskriver **to repetisjoner som starter og slutter i fase 0-stillingen**, og hva som høres. Eksempel for `kneboy`:

> The woman bends her knees and lowers into a deep squat, hips back and down, then drives up through her heels to stand tall again, and repeats the movement once more, ending upright exactly as she started, steady breathing, quiet room.

Batchen legger selv på halen `, static camera, fixed framing` — den skal ikke gjentas i dataene.

### 5.5 Kuratoren

- Kandidatstripen fra bildene får en videovariant: under fasebildene vises `s<n>-loop.mp4` som `<video autoplay loop muted playsinline>`. Storvisning spiller `s<n>-demo.mp4` med lyd og viser loop-avviket fra manifestet.
- Valg lagres i `localStorage` under ny nøkkel `CURATOR_VIDEO_VALG` (registreres i `storageKeys.ts`, unntas i `exportDataService.dekning.test.ts` som internt QA-verktøy).
- «Last ned» får `videoValg` per rad. `anvendValg.ts` kopierer `s<n>-demo.mp4 → <id>.mp4` og `s<n>-loop.mp4 → <id>-loop.mp4`, med forrige versjon til `.erstattet/`.

### 5.6 `ExerciseIllustration`

- Nytt prop `variant: 'loop' | 'demo'`. `TimerDisplay` sender `loop`, biblioteket `demo`.
- `loop`: `src=/videos/exercises/<id>-loop.mp4`, `autoPlay loop muted playsInline preload="auto"`. Faller til stillbildet ved `onError`, som i dag.
- `demo`: `src=/videos/exercises/<id>.mp4`, `preload="none"`, `poster` = fase-0-bildet, en avspillingsknapp (min. 44 px) starter avspilling med lyd. Respekterer `prefers-reduced-motion`: da autospilles ingen loop; brukeren trykker.
- **Porten innføres her:** bilde og video vises bare når `bildeStatus === 'godkjent'`; ellers plassholderen (muskelkartet). I dag porter ingenting på `bildeStatus` — alle 68 står som `mangler` og appen prøver likevel å laste filene. Denne endringen gjør Eiriks «skjult til de er gode nok» til faktisk oppførsel.

## 6. Levering og mellomlagring

| | Loop | Demo |
|---|---|---|
| Sti | `/videos/exercises/<id>-loop.mp4` | `/videos/exercises/<id>.mp4` |
| Workbox | `runtimeCaching` `CacheFirst`, eget cachenavn `exercise-video-loops-v1`, maks 100 oppføringer | `NetworkFirst`, ingen forhåndslasting |
| Cache-busting | filnavnet er stabilt; ny versjon = nytt innhold → `?v=` som bildene bruker i dag | samme |
| Budsjett | ≤ 400 KB, mål 300 | ≤ 1,5 MB, mål 1 |
| Sum for 68 øvelser | ~20–27 MB | ~68–100 MB |

Repoet er 250 MB med 161 MB bilder. Fase A legger på ~100 MB. **Grense:** når `public/videos/` passerer 150 MB, eller fase B starter, flyttes demoene til Firebase Storage med samme stier bak en CDN-URL. Loopene blir i repoet — de skal være offline.

Loopen forhåndslastes ikke ved installasjon; den caches første gang øvelsen vises. Det er samme valg som persona-lyden (Beslutning 41), og det holder installasjonen liten.

## 7. Feilhåndtering

| Feil | Hva skjer |
|---|---|
| Video mangler for øvelsen | `onError` → stillbilde. Ingen brukket boks. |
| Loopen lukker seg ikke | Synlig i kuratoren og som `loopAdvarsel` i manifestet → avvis, kjør om med `--seed-fra`. |
| Kameraet driver | Samme vei. Prompthalen «static camera, fixed framing» reduserer det; første batch måler hvor ofte det skjer. |
| 8 s sprenger VRAM | Første batch måler toppen. Over 24 GB → `--megapiksler 0.7` for originalen. Demoen blir 960×528 uansett. |
| Lease lekker | `finnEgenLease`-vakten fra bildebatchen. |
| Øvelse uten godkjent anker | Hoppes over med tydelig linje i sammendraget. |
| `ffmpeg` mangler | `eksporterVideo` stopper før noe skrives. |

## 8. Testing

- `videoPersona.test.ts`: hver id i tabellen finnes i `EXERCISE_LIBRARY`; ukjente id-er gir `astrid_k`.
- `eksporterVideo.test.ts`: mot en 1 s fixture — to filer skrives, riktig oppløsning, loopen har ingen lydstrøm, `faststart`-atomet ligger først, manifestet har størrelser og avvik.
- `ExerciseIllustration.video.test.tsx`: `variant='loop'` gir `-loop.mp4` med `muted` og `loop`; `variant='demo'` gir `preload="none"` og en knapp; `bildeStatus !== 'godkjent'` gir plassholder, ikke `<img>`/`<video>`; `prefers-reduced-motion` slår av autospill.
- Kurator-eksporten inneholder `videoValg`; `anvendValg` kopierer riktig par og legger forrige i `.erstattet/`.
- `kjorVideoBatch --dry-run` som del av `scripts/__tests__/`: ti øvelser med godkjent anker og prompt gir ti jobber; én uten prompt gir ni pluss en advarsel.

## 9. Første batch

Ti Astrid-øvelser med godkjent fase-0-bilde per `docs/kurering-2026-09-03.json`, og som deles på tvers av profiler:

`kneboy`, `sprellmenn`, `utfall-forover`, `hoye-kneloft`, `mountain-climbers`, `skoytehopp`, `katte-ku`, `sideplanke-hoyre`, `sideplanke-venstre`, `skulder-dislocates`

To seeds hver → 20 klipp, ~70 min under én lease. Batchen måler samtidig: tid per 8 s-klipp, VRAM-topp, andel med loop-avvik over terskel, andel med kameradrift. Tallene skrives i DECISIONS når batchen er kurert.

**Batch 2:** Sigrids ni — forutsetter først stillbilder med `sigrid_v_v4` gjennom bildepipelinen og godkjenning. **Batch 3+:** resten av Astrid etter hvert som startbilder godkjennes.

## 10. Kostnad og lisens

- ~200 s GPU per klipp (5 s målt til 135 s; 8 s anslått). Eksklusiv `video`-lease: vLLM er nede for alle prosjekter under kjøring. Kjør batcher når vLLM ikke trengs.
- LTX-2.x Community License: fri kommersiell bruk under 10 mill. USD årlig omsetning. Utdata er våre. Flux-stillbildene følger Beslutning 48.

## 11. Åpne punkter (ikke blokkerende)

- Terskel for loop-avvik settes etter første batch, ikke før.
- Om demoens lyd skal beholdes i appen eller bare i TV-visningen, avgjøres når Eirik har hørt ti av dem.
- Kor-øvelsene (sju pusteøvelser) får Astrid. Ingen persona er nevnt for kor; endres i tabellen om ønskelig.

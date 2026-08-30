# Kitor Bilde- og Videobatch-guide (74 øvelser × 2 faser)

Denne guiden beskriver hvordan du genererer, eksporterer og kjører hele bilde- og videobatchen for **alle 74 øvelser** i Min Trener mot GPU-arbeidsstasjonen **Kitor**.

---

## 1. Oversikt og spesifikasjoner

* **Antall øvelser:** 74 øvelser (42 kroppsvekt, 5 kettlebell, 3 manualer, 6 kondisjon, 18 mobilitet/pust)
* **Antall bilder totalt:** 148 bilder (Fase 0: startposisjon/eksentrisk topp, Fase 1: bevegelse/kontraksjon)
* **Bilde-modell:** Flux.1 Dev fp8 + Astrid LoRA (`synthiq/astrid_k.safetensors`, weight: 1.0)
* **Oppløsning:** 896 × 1152 (portrettformat optimalisert for mobil og TV)
* **Video-modell:** Wan2.1 14B fp8 Image-to-Video (I2V) med VHS VideoCombine
* **Kamera-vinkler:** Anatomisk presise vinkler per øvelse (`side`, `front`, `skrå` / three-quarter)
* **Lagringssti i appen:** `public/images/exercises/{exercise-id}-{phaseIndex}.png`

---

## 2. Kjøring av Batch

### A. Verifiser / Dry-Run (anbefalt før kjøring)
Tester alle 148 prompter, vinkeloversettelser og ComfyUI-grafer uten å gjøre nettverkskall mot GPU:
```bash
npm run batch:kitor:dry
# eller
npx tsx scripts/runFullKitorBatch.ts --dry-run
```

### B. Eksportere ComfyUI JSON-filer
Eksporterer batch payloads og fullstendige API-workflows til disk:
```bash
npm run batch:export
# eller
npx tsx scripts/exportComfyUiBatch.ts
```
Genererte filer:
1. `scripts/comfyui_batch_payload.json` – 148 prompt-jobber med ferdige positive prompter, vinkler og filnavn.
2. `scripts/comfyui_flux_workflows.json` – 148 klare Flux.1 Dev ComfyUI API-workflows klare for posting til `/prompt`.
3. `scripts/comfyui_wan_workflows.json` – 148 klare Wan2.1 Video ComfyUI API-workflows for I2V videoanimasjon.

### C. Kjøre Full Live Batch mot Kitor Headless
Kjører GPU-lease via Arbiter v1, sender prompts fortløpende til ComfyUI og lagrer ferdige PNG-bilder direkte i `public/images/exercises/`:
```bash
npm run batch:kitor
# eller
npx tsx scripts/runFullKitorBatch.ts
```

#### Nyttige CLI-flagg:
* `--limit <n>`: Kjør kun de første n øvelsene (f.eks. `--limit 5` for 10 bilder).
* `--exercise <id>`: Kjør kun én bestemt øvelse (f.eks. `--exercise bulgarsk-utfall`).
* `--force`: Tving regenerering selv om bildet allerede eksisterer i `public/images/exercises/`.
* `--video`: Klargjør/viser Wan2.1 videogenerering.

---

## 3. Autentisering og Kitor-miljø

Scriptet henter Kitor-token automatisk via `scripts/kitorEnv.ts` fra:
1. Miljøvariabelen `KITOR_API_TOKEN` / `KITOR_TOKEN`
2. `C:\Users\<user>\.kitor\token`
3. `C:\Users\<user>\.gemini\kitor.token`
4. Standard-konfigurasjon for Min Trener

Kitor endepunkter:
* Host: `https://kitor.tail49f298.ts.net` (Tailscale)
* Arbiter: `/arbiter/acquire`, `/arbiter/heartbeat`, `/arbiter/release`
* ComfyUI: `/comfy-mintrener/prompt`, `/comfy-mintrener/history/{id}`, `/comfy-mintrener/view`

---

## 4. Test og Verifisering

Kjør testsuiten for batch-infrastrukturen:
```bash
npx vitest run scripts/__tests__/kitorBatch.test.ts
```
Sjekker at:
* Alle 74 øvelser har definert fase 0 og 1 prompter samt kameravinkel.
* 148 unike output-filnavn genereres.
* Flux.1 og Wan2.1 API-grafer inneholder alle nødvendige noder.
* Dry-run og fileksport fungerer uten feil.

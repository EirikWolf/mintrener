# Vedlegg A – Bildepipeline for øvelsesbiblioteket (v2)

**Tilhører:** Min Trener – spesifikasjon v0.6, kapittel 3.2
**Kjøres mot:** Kitor (RTX 3090) via Tailscale, med GPU-lease fra Kitors arbiter
**Grunnlag for v2:** `kitor-bildepipeline-funn-2026-08-26.md` fra kitor-eier, som svar på bestillingen i `homelab-vault/02-Tjenester/AI/mintrener-arbiter-comfyui-bestilling.md`
**Formål:** Generere et komplett, konsistent sett illustrasjoner for 80–120 øvelser, automatisert fra øvelsesbibliotekets JSON.

> **Avvik fra v1:** v1 spesifiserte flat vektorstil med SDXL og lokal ComfyUI-tilgang. Etter testbatchene på Kitor er retningen endret til **fotorealistisk Flux med en fast instruktør (astrid_k-LoRA)**, godkjent av Eirik, og all tilgang går via HTTPS-ruter og arbiter-lease. Se A.14 for hva som ble endret og hvorfor.

---

## A.1 Mål og krav

**Hva som skal produseres**
- To bilder per øvelse: startposisjon (`0`) og sluttposisjon (`1`). Appen kan vise dem som statisk par eller veksle mellom dem.
- Ett ikon per muskelgruppe (ca. 12) og ett per utstyrstype (ca. 8). Disse lages som SVG, ikke i diffusjonsmodellen – se A.9.

**Krav til bildene**

| Krav | Verdi | Begrunnelse |
|---|---|---|
| Stil | Fotorealistisk, samme instruktør på alle bilder, nøytral lys studiobakgrunn | Testbatch 2 og 3 viste høy kvalitet og gjenkjennbar instruktør på tvers av bilder. Én fast person gir appen identitet |
| Format | WebP, **portrett 7:9** (896×1152 fra modellen) | Portrett passer stående og sittende figurer, og mobilskjermen |
| Størrelser | 448×576 (visning), 224×288 (miniatyr) | Halvering av modelloppløsning holder på mobil |
| Filstørrelse | Maks 60 KB (448), maks 12 KB (224) | Fotorealistisk komprimerer dårligere enn vektor; hele biblioteket under 15 MB, miniatyrer under 3 MB |
| Bakgrunn | **Bakes inn**, ingen transparens | Bakgrunnsfjerning på fotorealistiske bilder gir kanter og hårartefakter. Bildene vises som kort med avrundede hjørner, ikke fristilt |
| Riktig stilling | Kroppsstilling må tydelig vise øvelsen, hendene må se riktige ut | Feil stilling eller feil hender er verre enn ingen bilde |
| Konsistens | Samme antrekk, samme farger, samme lyssetting | Låses i prompt (A.4) |

**Hva som ikke er mål**
- Transparent bakgrunn eller vektorstil. Vektor er fortsatt mulig (A.2) hvis retningen endres.
- Animasjon utover to bilder.

**Konsekvens for kontekstprofilene (Vedlegg B.0.2):** Instruktøren er en voksen kvinne i treningstøy. Det fungerer for kontor, barn (barna ser en voksen vise øvelsen), kor og idrettslag. For profilen *senior og sittende* trengs egne skjeletter for sittende utførelse – samme instruktør, egne poser. Merk det i katalogen når profilen aktiveres.

---

## A.2 Valg av verktøy og modeller

**Verifisert produksjonsoppsett** (fra testbatchene på Kitor):

| Komponent | Valg | Kommentar |
|---|---|---|
| Grensesnitt | ComfyUI på Kitor, via HTTPS-rute | Aldri direkte mot `localhost:8188` – klienten kjører utenfor Kitor |
| Basemodell | `flux1-dev-fp8.safetensors` (UNETLoader, `fp8_e4m3fn`) | Flux dev fp8 passer i 24 GB sammen med ControlNet |
| Instruktør-LoRA | `synthiq/astrid_k.safetensors`, styrke 1,0, triggerord `ASTRID` | Egen LoRA fra SynthIQ-prosjektet. Gir gjenkjennbar instruktør. Tilfører ingenting i vektorstil – kun relevant fotorealistisk |
| Tekstkodere | `clip_l.safetensors` + `t5xxl_fp8_e4m3fn.safetensors` (DualCLIPLoader, type `flux`) | |
| VAE | `ae.safetensors` | |
| ControlNet | `flux1-dev-controlnet-union-pro-2.0.safetensors` (Shakker-Labs Union Pro 2.0) → `SetUnionControlNetType: openpose` | Installert på Kitor. Positurstyring verifisert med både DWPose fra foto og håndtegnede skjeletter |
| Preprosessor | `DWPreprocessor` (`detect_body: enable`, `detect_hand: enable`, resolution 1024) | `detect_hand` var av i testene – slås på i produksjon for bedre hender |
| Etterbehandling | `sharp` (Node) | Skalering og WebP. Ingen bakgrunnsfjerning |

**Alternativ som holdes åpen:** flat vektorstil med Flux **uten** LoRA fungerte utmerket i testbatch 1. Hvis retningen endres tilbake, er det bare stilprompten og LoRA-noden som byttes; ControlNet-oppsettet er det samme.

**Lisens – les A.12.** Flux.1-dev har ikke-kommersiell lisens. Det er akseptert for en gratis app, men det låser en beslutning: skal appen tjene penger, må bildene regenereres med en modell som tillater det.

---

## A.3 Tilgang til Kitor

Infrastrukturen eies av kitor-eier og er definert i `kitor-infra` (PR #78). Min Trener-prosjektet installerer ingenting på Kitor selv.

| Leveranse | Verdi |
|---|---|
| ComfyUI API | `https://kitor.tail49f298.ts.net/comfy-mintrener/*` – **ikke** `/comfyui/*` |
| Arbiter (GPU-lease) | `https://kitor.tail49f298.ts.net/arbiter/*` |
| Autentisering | `Authorization: Bearer $KITOR_TOKEN_MINTRENER` på begge ruter |
| Token | Vaultwarden: `homelab/mintrener` → `kitor-token`. Legges i `.env` lokalt, **aldri** i repoet |
| Arbiter-prioritet | `mintrener: normal` |
| Aktiv fra | Når PR #78 er merget og deployet (token i `.env` på Kitor, Caddy-restart). Kitor-eier gir beskjed |

**Kjøreregler – obligatoriske**

1. **Aldri kall ComfyUI uten aktiv `image`-lease.** Leasen stopper vLLM og andre GPU-prosesser; uten lease risikerer man OOM og krasj for andre prosjekter på Kitor.
2. **Acquire** blokkerer til GPU er ledig: `POST /arbiter/acquire` med `{"kind":"image","requester":"mintrener","label":"exercise-batch","duration_h":2}`. Svaret inneholder `token`.
3. **Heartbeat hvert 5. minutt** – `POST /arbiter/heartbeat` med `{"token":...}`. Påkrevd for jobber over 25 minutter; uten heartbeat frigis leasen etter 30 minutter og batchen krasjer. En full batch på 60–100 bilder tar 35–60 minutter, så heartbeat-loop er ikke valgfritt.
4. **Release alltid** – `POST /arbiter/release` i `finally`, idempotent og trygt å gjenta.
5. Ved kø: `GET /arbiter/status` viser aktive leases og estimert ventetid.

Klienten kjører fra Eiriks utviklingsmaskin (LarkBox/EliteDesk) eller hvor som helst på Tailscale-nettet.

---

## A.4 Stilguide

**Instruktør**
- Triggerord `ASTRID` først i prompten, LoRA-styrke 1,0
- Antrekk låses eksplisitt med farge, ellers drifter det mellom bilder: f.eks. «fitted charcoal gray sports bra and matching high-waist leggings, white training shoes». Velg ett antrekk for hele biblioteket og hardkod det i stilprefiksen
- Hår samlet (hestehale) – reduserer variasjon og kantproblemer

**Scene**
- Nøytral, lys studiobakgrunn (`light gray seamless studio backdrop`), mykt jevnt lys, ingen rekvisitter utover øvelsens utstyr
- Kamera i hoftehøyde, **profil** (fra siden) som standard. Front kun der profilen skjuler bevegelsen
- Hele kroppen synlig med luft over og under; ikke beskåret ved føttene
- Utstyr skal alltid vises der det brukes, i grep (se A.5 om hender)

**Uttrykk**
- Ingen tekst, piler, bevegelseslinjer eller overlegg. Slikt legges eventuelt på i appen som SVG
- Nøytralt til lett konsentrert ansiktsuttrykk, ikke poserende
- Start- og sluttposisjon skal være tydelig forskjellige, men fra samme kameraposisjon

---

## A.5 Promptmal

Flux med LoRA og ControlNet kjører med **cfg 1,0**. Da er negativ prompt **fullstendig inaktiv**. Alt må sies positivt, og «no shadow» eller «no more than five fingers» gjør ingenting.

**Fast stilprefiks**
```
ASTRID, photorealistic full-body photo of a fitness instructor demonstrating an exercise,
fitted charcoal gray sports bra and matching high-waist leggings, white training shoes,
hair in a ponytail, light gray seamless studio backdrop, soft even studio lighting,
camera at hip height, side view, full body visible with space above head and below feet,
sharp focus, natural skin,
```

**Øvelsesspesifikk del** – ett felt per posisjon i JSON. Beskriv geometri og **hva hendene gjør**:
```json
"bildePrompt": {
  "0": "standing with feet shoulder-width apart, hips hinged back, torso leaning forward with flat back, both hands in a firm grip around the kettlebell handle hanging between the legs",
  "1": "standing tall with hips fully extended, arms straight in front at chest height, both hands in a firm grip around the kettlebell handle"
}
```

**Regler for øvelsesbeskrivelsen** (gjelder når Claude Code eller Antigravity genererer feltet):
1. Beskriv kroppsstillingen, ikke øvelsen. «Squat» er ubrukelig; «hips lowered below knee height, torso upright, arms extended forward, hands together palms down» fungerer.
2. **Alltid en setning om hendene**, formulert som hva de gjør: «firm grip around the handle», «palms flat on the floor, fingers together», «hands resting on hips». Aldri antall fingre.
3. Nevn utstyret og hvor det holdes.
4. Nevn vinkel eksplisitt hvis den avviker fra siden: «front view».
5. Engelsk, maks 50 ord.
6. Start- og sluttposisjon skal beskrive faktisk forskjellig geometri.
7. Ingen negasjoner – de virker ikke.

**Samplerinnstillinger (verifisert)**

| Parameter | Verdi |
|---|---|
| Oppløsning | 896×1152 (portrett) |
| Steps | 24 |
| Sampler / scheduler | euler / simple |
| CFG | **1,0** (negativ prompt inaktiv) |
| FluxGuidance | 3,5 |
| LoRA-styrke | 1,0 |
| ControlNet strength | **0,9** |
| ControlNet start / end | 0,0 / **0,65** |
| Seeds per posisjon | **3** – beste velges i QA (A.10) |
| Seed-basis | Hash av `id`, pluss 0/1/2 |
| Kjøretid | 30–60 s per bilde under `image`-lease |

---

## A.6 Positurkontroll med OpenPose

Positurstyring med ControlNet er det som gjorde at hip-hinge-svingen ble riktig etter å ha feilet i begge prompt-baserte batcher. Uten skjelett er posisjonen upålitelig.

**Skjelett per posisjon – to kilder**

| Kilde | Når | Hvordan |
|---|---|---|
| **Referansefoto** | Når vi har et foto av korrekt utførelse (egne foto, eller free-exercise-db for styrkeøvelser) | `DWPreprocessor` med `detect_body: enable`, `detect_hand: enable`, resolution 1024. Håndpunkter gjør at ControlNet styrer fingrene også |
| **Programmatisk tegnet COCO-18-skjelett** | Når foto mangler, eller for sittende/senior-varianter | Tegnes fra en liste med 18 leddkoordinater, svart bakgrunn, OpenPose-fargekonvensjon for lemmer. Fungerte på første forsøk i testen. Kan genereres av kodeagenten fra en tekstlig posebeskrivelse, men må sjekkes visuelt |

**Ufravikelig:** skjelettets lerret må ha **samme sideforhold som latenten** – 896×1152. Et kvadratisk skjelett gir forskjøvet positur.

**Håndregler i skjelettdesignet** (se A.10 om hvorfor):
- Hender skal være **opptatt eller nøytrale**: grep rundt utstyr, flate mot gulv, på hoftene, langs siden
- Unngå åpne håndflater mot kamera og sprikende fingre – det er der artefaktene kommer
- Der en øvelse naturlig har frie hender (jumping jacks), velg posisjoner der hendene er samlet eller i bevegelsens ytterpunkt med fingrene sammen

**Mappestruktur**
```
pipeline/
  poses/
    kettlebell-swing/
      0.jpg            # referansefoto (valgfritt)
      1.jpg
      0_pose.png       # skjelett 896×1152 – enten fra DWPose eller tegnet
      1_pose.png
    chair-squat/
      0_pose.png       # tegnet, ingen foto
      1_pose.png
      0_pose.json      # leddkoordinater brukt til tegningen
```

Skjelettene sjekkes inn i repoet. De er små og er det som faktisk definerer biblioteket visuelt.

---

## A.7 ComfyUI-arbeidsflyt

**Autoritativ kilde:** de to testskriptene på Kitor, `/tmp/mintrener_openpose_test.py` og `/tmp/mintrener_astrid_photo_testbatch.py`, inneholder den verifiserte grafen inkludert lease-håndtering. **Kopier grafen derfra** inn i `pipeline/workflow_api.json` – ikke skriv den på nytt fra dette dokumentet. Skissen under viser strukturen slik at skriptet i A.8 kan referere noder ved rolle.

```
UNETLoader (flux1-dev-fp8, fp8_e4m3fn)
  └─ LoraLoaderModelOnly (astrid_k, 1.0) ──────────────────────┐
DualCLIPLoader (clip_l + t5xxl_fp8, type flux)                  │
  └─ CLIPTextEncode (positiv prompt) ──┐                        │
       └─ FluxGuidance (3.5) ──────────┤                        │
     ConditioningZeroOut ──────────────┤ (negativ, inaktiv)     │
LoadImage (<<POSE_PNG>>) ──────────────┤                        │
ControlNetLoader (union-pro-2.0)       │                        │
  └─ SetUnionControlNetType (openpose) ┤                        │
       └─ ControlNetApplyAdvanced (0.9, 0.0–0.65) ─┐            │
EmptySD3LatentImage (896×1152) ─────────────────────┤            │
                                                    └─ KSampler (euler, simple, 24, cfg 1.0, <<SEED>>)
                                                         └─ VAEDecode (ae) ─ SaveImage (<<PREFIX>>)
```

Skriptet bytter ut tre ting: positiv prompt, skjelettfil og seed. Alt annet er konstant. Bruk DWPreprocessor i grafen bare i det separate «lag skjelett fra foto»-steget; i produksjonsgrafen lastes ferdige skjelett-PNG-er direkte.

---

## A.8 Pipeline-skript

Ligger i app-repoet som `scripts/exportComfyUiBatch.ts` (TypeScript, Node 20+, `tsx`). Leser øvelsesbiblioteket, henter lease, genererer tre seeds per posisjon, laster ned, skalerer, og frigir leasen uansett utfall. Idempotent: hopper over posisjoner som allerede har tre kandidater, med mindre `--force`.

```bash
# .env (ikke i git)
KITOR_TOKEN_MINTRENER=...
KITOR_BASE=https://kitor.tail49f298.ts.net

# Bruk
npx tsx scripts/exportComfyUiBatch.ts --exercises data/exercises.json --out pipeline/candidates
npx tsx scripts/exportComfyUiBatch.ts --only kettlebell-swing push-up --seeds 3
npx tsx scripts/exportComfyUiBatch.ts --dry-run          # validerer skjeletter og prompter uten lease
```

```typescript
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import sharp from "sharp";

const BASE = process.env.KITOR_BASE!;
const TOKEN = process.env.KITOR_TOKEN_MINTRENER!;
const COMFY = `${BASE}/comfy-mintrener`;
const ARBITER = `${BASE}/arbiter`;
const AUTH = { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" };

const STYLE_PREFIX =
  "ASTRID, photorealistic full-body photo of a fitness instructor demonstrating an exercise, " +
  "fitted charcoal gray sports bra and matching high-waist leggings, white training shoes, " +
  "hair in a ponytail, light gray seamless studio backdrop, soft even studio lighting, " +
  "camera at hip height, side view, full body visible with space above head and below feet, " +
  "sharp focus, natural skin, ";

const WORKFLOW = JSON.parse(readFileSync("pipeline/workflow_api.json", "utf8"));
// Node-id-er i den kopierte grafen – sett én gang etter kopiering fra Kitor-skriptene
const NODE = { positive: "6", poseImage: "12", sampler: "3", save: "9" };

// ---------- Arbiter ----------
async function acquire(): Promise<string> {
  const r = await fetch(`${ARBITER}/acquire`, {
    method: "POST", headers: AUTH,
    body: JSON.stringify({ kind: "image", requester: "mintrener", label: "exercise-batch", duration_h: 2 }),
  });
  if (!r.ok) throw new Error(`acquire: ${r.status}`);
  return (await r.json()).token;
}
async function heartbeat(token: string) {
  await fetch(`${ARBITER}/heartbeat`, { method: "POST", headers: AUTH, body: JSON.stringify({ token }) });
}
async function release(token: string) {
  await fetch(`${ARBITER}/release`, { method: "POST", headers: AUTH, body: JSON.stringify({ token }) });
}

// ---------- ComfyUI ----------
async function uploadImage(file: string): Promise<string> {
  const form = new FormData();
  form.append("image", new Blob([readFileSync(file)]), path.basename(file));
  form.append("overwrite", "true");
  const r = await fetch(`${COMFY}/upload/image`, { method: "POST", headers: { Authorization: AUTH.Authorization }, body: form });
  if (!r.ok) throw new Error(`upload: ${r.status}`);
  return (await r.json()).name;
}

async function generate(prompt: string, poseName: string, seed: number, prefix: string): Promise<Buffer> {
  const wf = structuredClone(WORKFLOW);
  wf[NODE.positive].inputs.text = prompt;
  wf[NODE.poseImage].inputs.image = poseName;
  wf[NODE.sampler].inputs.seed = seed;
  wf[NODE.save].inputs.filename_prefix = prefix;

  const q = await fetch(`${COMFY}/prompt`, { method: "POST", headers: AUTH, body: JSON.stringify({ prompt: wf, client_id: "mintrener" }) });
  if (!q.ok) throw new Error(`prompt: ${q.status} ${await q.text()}`);
  const { prompt_id } = await q.json();

  for (;;) {
    await new Promise((res) => setTimeout(res, 2000));
    const h = await (await fetch(`${COMFY}/history/${prompt_id}`, { headers: AUTH })).json();
    const entry = h[prompt_id];
    if (!entry) continue;
    if (entry.status?.status_str === "error") throw new Error(`ComfyUI-feil for ${prefix}`);
    const img = entry.outputs?.[NODE.save]?.images?.[0];
    if (!img) continue;
    const params = new URLSearchParams({ filename: img.filename, subfolder: img.subfolder ?? "", type: img.type });
    return Buffer.from(await (await fetch(`${COMFY}/view?${params}`, { headers: AUTH })).arrayBuffer());
  }
}

// ---------- Etterbehandling ----------
async function saveCandidate(png: Buffer, outBase: string) {
  await sharp(png).resize(448, 576).webp({ quality: 82 }).toFile(`${outBase}.webp`);
  await sharp(png).resize(224, 288).webp({ quality: 78 }).toFile(`${outBase}_thumb.webp`);
}

function seedFor(id: string, n: number) {
  return (parseInt(createHash("sha256").update(id).digest("hex").slice(0, 8), 16) + n) >>> 0;
}

// ---------- Hovedløp ----------
async function main() {
  const args = process.argv.slice(2);
  const get = (k: string, d?: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
  const only = args.includes("--only") ? args.slice(args.indexOf("--only") + 1).filter((a) => !a.startsWith("--")) : null;
  const seeds = Number(get("--seeds", "3"));
  const force = args.includes("--force");
  const dryRun = args.includes("--dry-run");
  const out = get("--out", "pipeline/candidates")!;

  let exercises: any[] = JSON.parse(readFileSync(get("--exercises", "data/exercises.json")!, "utf8"));
  if (only) exercises = exercises.filter((e) => only.includes(e.id));

  // Valider før vi tar lease – ikke hold GPU-en mens vi oppdager manglende filer
  const jobs: { id: string; pos: "0" | "1"; pose: string; prompt: string }[] = [];
  for (const ex of exercises) for (const pos of ["0", "1"] as const) {
    const pose = `pipeline/poses/${ex.id}/${pos}_pose.png`;
    const prompt = ex.bildePrompt?.[pos];
    if (!existsSync(pose)) { console.error(`MANGLER skjelett ${pose}`); continue; }
    if (!prompt) { console.error(`MANGLER bildePrompt ${ex.id}/${pos}`); continue; }
    const done = [...Array(seeds).keys()].every((n) => existsSync(`${out}/${ex.id}/${pos}_s${n}.webp`));
    if (done && !force) continue;
    jobs.push({ id: ex.id, pos, pose, prompt: STYLE_PREFIX + prompt });
  }
  console.log(`${jobs.length} posisjoner × ${seeds} seeds`);
  if (dryRun || jobs.length === 0) return;

  const lease = await acquire();
  const hb = setInterval(() => heartbeat(lease).catch(() => {}), 5 * 60 * 1000);
  try {
    for (const j of jobs) {
      const poseName = await uploadImage(j.pose);
      mkdirSync(`${out}/${j.id}`, { recursive: true });
      for (let n = 0; n < seeds; n++) {
        const t0 = Date.now();
        const png = await generate(j.prompt, poseName, seedFor(j.id, n), `mintrener/${j.id}_${j.pos}_s${n}`);
        writeFileSync(`${out}/${j.id}/${j.pos}_s${n}.png`, png);
        await saveCandidate(png, `${out}/${j.id}/${j.pos}_s${n}`);
        console.log(`${j.id}/${j.pos} seed ${n}: ${((Date.now() - t0) / 1000).toFixed(0)} s`);
      }
    }
  } finally {
    clearInterval(hb);
    await release(lease);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
```

**Merk**
- Rå PNG beholdes i `candidates/` til QA er gjort; kun godkjent kandidat kopieres til `public/exercises/{id}/{pos}.webp` (A.10).
- ComfyUI-nodenes id-er (`NODE`) settes én gang etter at grafen er kopiert fra Kitor-skriptene.
- Ved `SIGINT` under batch: legg til en `process.on("SIGINT")` som kaller `release` – release er idempotent.

---

## A.9 Ikoner for muskelgrupper og utstyr

Uendret fra v1. SVG generert som kode av kodeagenten, ikke diffusjon:
- ViewBox `0 0 24 24`, strek 1,75 px, `stroke="currentColor"`, ingen fyll
- Samme visuelle vekt som Lucide-ikonene appen bruker
- Muskelgrupper: forenklet kroppssilhuett med aktuell gruppe fylt (`opacity="0.35"`)
- Utstyr: kettlebell, manual, stang, strikk, matte, hopptau, benk, ingen utstyr

Lagres i `src/assets/icons/`.

---

## A.10 Kvalitetssikring

**Seed-utvalg er hovedgrepet.** Tre seeds per posisjon, beste velges. Ved 30–60 s per bilde koster et 3× overshoot på 100 illustrasjoner under to timer GPU-tid – det billigste kvalitetstiltaket som finnes.

**Kontaktkopi:** `scripts/contactSheet.ts` lager én PNG per øvelse med skjelettet og de tre kandidatene per posisjon side om side. Gjennomgangen blir da ett bilde per øvelse.

**Valg registreres** i `pipeline/selection.json`: `{ "kettlebell-swing": { "0": 2, "1": 0 } }`. `scripts/promoteSelected.ts` kopierer valgte kandidater til `public/exercises/` og setter `bildeStatus: "godkjent"` i biblioteket.

**Sjekkliste per posisjon**
- [ ] Kroppsstillingen viser riktig øvelse; en som ikke kjenner øvelsen ville forstått den
- [ ] Start og slutt er tydelig forskjellige, fra samme kameraposisjon
- [ ] Riktig utstyr, holdt riktig
- [ ] **Hender:** riktig antall fingre der de er synlige, naturlig grep. Sjekk spesielt hender på korsrygg, hofter og rundt håndtak
- [ ] Antrekk og farger som i de andre bildene (ingen drift)
- [ ] Hele kroppen synlig, ikke beskåret ved føttene
- [ ] Filstørrelse innenfor grensen

**Hender og fingre – mekanikken**

Negativ prompt er inaktiv ved cfg 1,0, og telleinstruksjoner i positiv prompt følges svakt. Tiltak i prioritert rekkefølge:

1. Design posene så hendene er opptatt eller nøytrale (A.6)
2. Beskriv hva hendene gjør i prompten, ikke antall (A.5)
3. `detect_hand: enable` i DWPose når skjelett lages fra foto
4. Seed-utvalg
5. Inpaint-reparasjon i ComfyUI (maske + samme modell) for enkeltbilder som ellers er perfekte – siste utvei

**Vanlige feil og tiltak**

| Problem | Tiltak |
|---|---|
| Feil stilling | Sjekk skjelettet først. Er skjelettet riktig: øk ControlNet strength til 0,95–1,0. Er skjelettet feil: nytt foto eller juster koordinatene |
| Riktig stilling, men stiv eller unaturlig | Senk end_percent til 0,5 – slipper kontrollen tidligere |
| Antrekk eller farger drifter | Stram fargespesifikasjonen i stilprefiksen, legg antrekk før scenebeskrivelse |
| Fingerartefakter | Se listen over; ny seed er billigere enn ny prompt |
| Beskåret ved føttene | «space above head and below feet» står i prefiksen; hvis det ikke holder, skaler skjelettet ned 10 % på lerretet |
| Bakgrunn ikke jevn | Legg «uniform» foran «light gray seamless studio backdrop» |

Underkjente posisjoner: sett `bildeStatus: "regenerer"` med merknad, juster skjelett eller prompt, kjør `--only <id> --force`.

---

## A.11 Integrasjon i appen

**Lagring:** statiske filer i Firebase Hosting under `/exercises/{id}/0.webp`, `1.webp`, `0_thumb.webp`, `1_thumb.webp`. Ikke Storage.

**Offline:** service worker forhåndslaster alle miniatyrer (< 3 MB ved 120 øvelser). Fullstørrelse lastes ved behov og caches ved første visning.

**Visning:** `<ExerciseImage id pos size />` – portrettkort 7:9 med avrundede hjørner, miniatyr som plassholder mens 448 lastes, fallback til muskelgruppe-ikon hvis `bildeStatus !== "godkjent"`. I *Led en gruppe* (Vedlegg B.0.3) veksler komponenten mellom 0 og 1 i øvelsens tempo.

**Egne øvelser:** brukerens egne bilder går til Firebase Storage som før. Ikke gjennom pipelinen.

**Felt i øvelsesskjemaet**
```json
"bildePrompt": { "0": "...", "1": "..." },
"bildeVinkel": "side | front",
"bildeStatus": "mangler | kandidater | godkjent | regenerer",
"bildeMerknad": "valgfri kommentar fra gjennomgang"
```

---

## A.12 Lisens og opphav

| Komponent | Lisens | Konsekvens |
|---|---|---|
| **Flux.1-dev** | FLUX.1 [dev] Non-Commercial License | Bruk av generert innhold er tillatt for ikke-kommersielle formål. En gratis app uten inntekt ligger innenfor. **Skal Min Trener tjene penger – betalt nivå, sponsing, salg – må øvelsesbildene regenereres** med en modell som tillater det (SDXL, eller Flux under kommersiell lisens). Pipelinen er bygget så det er et modellbytte, ikke en omskriving |
| ControlNet Union Pro 2.0 (Shakker-Labs) | Følger Flux.1-dev-lisensen | Samme forbehold |
| astrid_k-LoRA | Eirik / SynthIQ, eget verk | Ingen begrensning. Instruktøren er en fiktiv person |
| Referansefoto | Egne, eller free-exercise-db (offentlig eiendom) | Skjelettene inneholder ingen gjenkjennbar informasjon |
| sharp | Apache 2.0 | |

Beslutningen om ikke-kommersiell lisens er tatt bevisst, og skal stå i `docs/DECISIONS.md` med dato. Den henger sammen med sideinntekt-vurderingen: den dagen appen skal gi inntekt, er regenerering av 200 bilder en kjent kostnad (én kveld GPU-tid pluss QA), ikke en overraskelse.

«Om»-siden i appen: «Illustrasjoner generert med Flux, instruktør er en fiktiv person skapt for appen.»

---

## A.13 Oppgaveliste for kodeagent

| # | Oppgave | Akseptanse |
|---|---|---|
| 1 | Utvid øvelsesskjemaet med feltene i A.11, oppdater JSON Schema-validering | `npm run validate:exercises` passerer |
| 2 | Generer `bildePrompt` for alle øvelser etter reglene i A.5, inkludert håndsetning | Alle øvelser har to prompter, hver under 50 ord, alle nevner hendene, ingen negasjoner, ingen inneholder øvelsens navn |
| 3 | Kopier verifisert graf fra Kitor-skriptene til `pipeline/workflow_api.json`, sett `NODE`-id-er | Grafen kjører uendret mot `/comfy-mintrener` med ett testbilde |
| 4 | `scripts/exportComfyUiBatch.ts` etter A.8 med arbiter-flyt, heartbeat, release i finally og `--dry-run` | Dry-run lister manglende skjeletter uten å kontakte Kitor; avbrutt batch frigir lease |
| 5 | `scripts/drawPose.ts`: tegn COCO-18-skjelett 896×1152 fra `*_pose.json` | Skjelett for stol-knebøy tegnet og godkjent visuelt |
| 6 | `scripts/extractPose.ts`: DWPose fra referansefoto via ComfyUI, `detect_hand: enable` | Skjelett med håndpunkter for kettlebell-swing |
| 7 | `scripts/contactSheet.ts` og `scripts/promoteSelected.ts` | Kontaktkopi per øvelse; promotering setter `bildeStatus` |
| 8 | **Pilot:** 3 øvelser × 2 posisjoner × 3 seeds, QA inkludert hender | Alle seks posisjoner har én godkjent kandidat |
| 9 | Full batch, deretter QA | Alle P1-øvelser `godkjent` |
| 10 | SVG-ikoner etter A.9 | 20 ikoner, korrekte i 16 og 24 px |
| 11 | `<ExerciseImage />` med portrettkort, plassholder og ikon-fallback | Testside viser alle tre tilstander |
| 12 | Service worker: forhåndslast miniatyrer | Øvelseslisten viser miniatyrer i flymodus |
| 13 | Om-side med opphavstekst, `DECISIONS.md` med lisensbeslutningen | Tekst synlig, beslutning datert |

Oppgave 3, 4 og 8 gjøres først, så snart kitor-eier har gitt klarsignal.

---

## A.14 Endringslogg v1 → v2

| Område | v1 | v2 | Grunn |
|---|---|---|---|
| Stil | Flat vektor, transparent bakgrunn | Fotorealistisk, fast instruktør, studiobakgrunn | Testbatch 2–3 ga høy kvalitet og gjenkjennbar instruktør. Person-LoRA tilfører ingenting i vektorstil. Godkjent av Eirik |
| Modell | SDXL 1.0 | Flux.1-dev fp8 + astrid_k-LoRA | Kvalitet. Lisens er ikke-kommersiell – bevisst valg, se A.12 |
| ControlNet | xinsir OpenPose SDXL | Shakker-Labs Union Pro 2.0, openpose-type | Verifisert på Kitor, inkludert håndtegnede skjeletter |
| Tilgang | ComfyUI lokalt på LAN, port 8188 | HTTPS via Tailscale, bearer-token, arbiter-lease | Kitor deler GPU med andre prosjekter |
| Negativ prompt | Brukt aktivt | Inaktiv (cfg 1,0) | Flux-egenskap. Alt sies positivt |
| Oppløsning | 1024² kvadrat | 896×1152 portrett | Passer figur og mobil bedre |
| Bakgrunnsfjerning | rembg | Ingen | Fotorealistisk fristilling gir artefakter |
| Skript | Python `generate.py` | TypeScript `scripts/exportComfyUiBatch.ts` | Samme språk som appen, skript fantes allerede i repoet |
| QA | Én seed, manuell sjekk | Tre seeds per posisjon, kontaktkopi, promoteringsskript | Billigste kvalitetstiltak |
| Hender | Ikke omtalt | Eget regelsett i A.5, A.6, A.10 | To av 24 testbilder hadde fingerartefakter |

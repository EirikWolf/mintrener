# Vedlegg A – Bildepipeline for øvelsesbiblioteket

**Tilhører:** Treningsapp-spesifikasjon v0.2, kapittel 3.2
**Kjøres på:** Kitor (i9-11900K, RTX 3090 24 GB, 32 GB RAM)
**Formål:** Generere et komplett, konsistent sett illustrasjoner for 80–120 øvelser, automatisert fra øvelsesbibliotekets JSON, med lisens som tåler en åpen app.

---

## A.1 Mål og krav

**Hva som skal produseres**
- To bilder per øvelse: startposisjon (`0`) og sluttposisjon (`1`). Appen kan vise dem som statisk par eller veksle mellom dem for enkel «animasjon».
- Ett ikon per muskelgruppe (ca. 12 stk) og ett per utstyrstype (ca. 8 stk). Disse lages som SVG, ikke i Stable Diffusion – se A.9.

**Krav til bildene**
| Krav | Verdi | Begrunnelse |
|---|---|---|
| Stil | Flat illustrasjon, én figur, ingen ansiktstrekk, ingen bakgrunn | Konsistent på tvers av 200+ bilder, nøytralt kjønn/etnisitet, fungerer på mørkt og lyst tema |
| Format | WebP med gjennomsiktig bakgrunn | Liten fil, transparens gjør at figuren ligger rett på appens bakgrunn |
| Størrelser | 512×512 (visning), 128×128 (liste/miniatyr) | Mobil trenger ikke mer; 512 px holder også på høyoppløste skjermer |
| Filstørrelse | Maks 40 KB (512), maks 6 KB (128) | Hele biblioteket under 8 MB, miniatyrer under 1 MB |
| Riktig stilling | Kroppsstilling må tydelig vise øvelsen | Feil stilling er verre enn ingen bilde |
| Lisens | Kun modeller som tillater bruk av generert innhold i en offentlig app | Appen er åpen fra dag én |

**Hva som ikke er mål**
- Fotorealisme. Flat stil er enklere å få konsistent, og skjuler AI-artefakter som feil antall fingre.
- Animasjon utover to bilder. Kan vurderes senere med video-modeller, men ikke nå.

---

## A.2 Valg av verktøy og modeller

### Anbefaling: ComfyUI + SDXL + ControlNet OpenPose

| Valg | Anbefalt | Alternativ | Begrunnelse |
|---|---|---|---|
| Grensesnitt | **ComfyUI** | Automatic1111 / Forge | ComfyUI har et rent HTTP-API der hele arbeidsflyten sendes som JSON. Det er laget for batch fra skript. A1111 har også API, men ControlNet der styres via utvidelsesparametre som er mer skjøre |
| Basemodell | **SDXL 1.0** (`sd_xl_base_1.0.safetensors`) | Flux.1-schnell | SDXL har det modne ControlNet-økosystemet, og lisensen (CreativeML Open RAIL++-M) tillater bruk av generert innhold. **Unngå Flux.1-dev**: lisensen er ikke-kommersiell, og selv om appen er gratis, er det unødvendig risiko for et åpent produkt |
| Stil-LoRA | Valgfritt: en «flat vector illustration»-LoRA for SDXL fra Civitai | Kun prompt | En stil-LoRA gir mer konsistent strek. Sjekk lisens på hver LoRA før bruk – mange er «ingen kommersiell bruk» |
| Positurkontroll | **ControlNet OpenPose for SDXL** (`xinsir/controlnet-openpose-sdxl-1.0`) | `thibaud/controlnet-openpose-sdxl-1.0` | Uten ControlNet treffer modellen feil kroppsstilling på en betydelig andel øvelser. xinsir-versjonen er den mest presise per i dag |
| Preprosessor | `comfyui_controlnet_aux` (custom node) | – | Lager OpenPose-skjelett fra et foto |
| Bakgrunnsfjerning | **rembg** (Python, modell `isnet-general-use`) | Generere på grønn bakgrunn og maskere | rembg er robust på enkle figurer mot hvit bakgrunn |
| Etterbehandling | Pillow | – | Beskjære, sentrere, skalere, WebP |

**VRAM-budsjett på 3090:** SDXL base (~6,5 GB) + ControlNet (~2,5 GB) + VAE og aktiveringer ved 1024×1024 ligger under 14 GB. Det er god margin, og du kan kjøre batch på 2–4 bilder samtidig.

### Hvis Automatic1111 eller Forge allerede er installert på Kitor

Pipelinen fungerer også der, med to endringer:
- Bruk `POST /sdapi/v1/txt2img` med ControlNet-parametre i `alwayson_scripts.controlnet.args`
- Start med `--api`-flagget

Det anbefales likevel å installere ComfyUI ved siden av. Det tar 15 minutter, deler modellmappe med A1111 via `extra_model_paths.yaml`, og gjør skriptet i A.7 enklere.

---

## A.3 Oppsett på Kitor

Antatt Linux-vert eller Windows med WSL2. Tilpass stier.

```bash
# 1. ComfyUI
git clone https://github.com/comfyanonymous/ComfyUI.git ~/ComfyUI
cd ~/ComfyUI
python3 -m venv venv && source venv/bin/activate
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
pip install -r requirements.txt

# 2. Custom nodes (OpenPose-preprosessor)
cd custom_nodes
git clone https://github.com/Fannovel16/comfyui_controlnet_aux.git
cd comfyui_controlnet_aux && pip install -r requirements.txt

# 3. Modeller – legg i riktige mapper
#   models/checkpoints/sd_xl_base_1.0.safetensors
#   models/controlnet/controlnet-openpose-sdxl-1.0.safetensors   (xinsir, fra Hugging Face)
#   models/loras/<stil-lora>.safetensors                          (valgfritt)

# 4. Start med API åpent på LAN
cd ~/ComfyUI && source venv/bin/activate
python main.py --listen 0.0.0.0 --port 8188
```

**Nettverk:** ComfyUI skal kun være tilgjengelig på hjemmenettet. Ikke eksponer port 8188 gjennom Cloudflare Tunnel – det finnes ingen autentisering.

**Verifisering:** Åpne `http://kitor:8188` i nettleser, last inn arbeidsflyten fra A.6 og generer ett bilde manuelt før skriptet kjøres.

**Python-miljø for pipeline-skriptet** (kan kjøre på Kitor eller på LarkBox/EliteDesk mot Kitor over LAN):
```bash
pip install requests pillow rembg[cpu] onnxruntime
```

---

## A.4 Stilguide

Alle bilder følger denne guiden. Den er også grunnlaget for promptmalen i A.5.

**Figur**
- Enkel, stilisert menneskefigur, nøytral kroppsbygning
- Ingen ansiktstrekk (kun hodeform), ingen hår som krever detaljer
- Ensfarget hud/figur i én aksentfarge, mørkere kontur
- Enkle, tettsittende treningsklær i én dempet farge, uten mønster eller logo

**Farger** (samme som appens tema)
- Figur: `#3B82F6` (blå) med kontur `#1E3A8A`
- Klær: `#1F2937` (mørk grå)
- Utstyr: `#6B7280` (grå) med kontur `#111827`
- Bakgrunn: hvit under generering, fjernes etterpå

**Komposisjon**
- Figuren fyller 70–85 % av bildehøyden
- Profilvinkel (sett fra siden) som standard – det viser leddvinkler best. Frontvinkel brukes kun der profilen skjuler bevegelsen (f.eks. sidehev, jumping jacks)
- Utstyr skal alltid vises der det brukes
- Ingen gulv, skygge, matte eller omgivelser. Unntak: en tynn gulvlinje der kontakt med gulvet er poenget (planke, armhevinger, burpees)

**Uttrykk**
- Ingen bevegelseslinjer, piler eller tekst. Slikt legges eventuelt på i appen som SVG-overlegg
- Startposisjon og sluttposisjon skal være tydelig forskjellige

---

## A.5 Promptmal

Promptene bygges av tre deler: **fast stilprompt** (lik for alle), **øvelsesspesifikk beskrivelse** (fra JSON) og **fast negativ prompt**.

**Fast stilprompt (prefix)**
```
flat vector illustration, minimalist fitness pictogram, single stylized human figure,
faceless, smooth solid fill colors, clean dark outline, blue figure with dark gray
athletic clothing, isolated on pure white background, no shadow, no floor, no text,
centered, full body visible, side view,
```

**Øvelsesspesifikk del** – ett felt per posisjon i JSON, skrevet som en presis anatomisk beskrivelse:
```
"bildePrompt": {
  "0": "standing upright holding a kettlebell with both hands between the legs, knees slightly bent, hips hinged back, flat back",
  "1": "standing tall with hips fully extended, arms straight, kettlebell swung up to chest height in front"
}
```

**Fast negativ prompt**
```
photo, photorealistic, realistic skin, face, eyes, mouth, hair detail, text, watermark,
logo, signature, background, gym, floor, shadow, gradient, 3d render, multiple people,
extra limbs, extra fingers, deformed hands, blurry, low quality, noise, frame, border
```

**Regler for øvelsesbeskrivelsen** (gjelder når Claude Code/Antigravity genererer feltet):
1. Beskriv kroppsstillingen, ikke øvelsen. «Squat» er ubrukelig; «hips lowered below knee height, torso upright, arms extended forward» fungerer.
2. Nevn utstyret og hvor det holdes.
3. Nevn vinkel eksplisitt hvis den avviker fra siden: «front view».
4. Én setning, engelsk, maks 40 ord.
5. Start- og sluttposisjon skal beskrive faktisk forskjellig geometri.

**Samplerinnstillinger**
| Parameter | Verdi |
|---|---|
| Oppløsning | 1024×1024 |
| Steps | 30 |
| CFG | 6,0 |
| Sampler / scheduler | dpmpp_2m / karras |
| ControlNet strength | 0,8 |
| ControlNet start/end | 0,0 / 0,8 (slipper kontrollen mot slutten for renere strek) |
| Seed | Fast per øvelse (hash av `id`) – gir reproduserbarhet og lik figur mellom posisjon 0 og 1 |
| LoRA strength (hvis brukt) | 0,7 |

---

## A.6 Positurkontroll med OpenPose

Dette er den delen som avgjør om bildene blir riktige. To måter å lage skjelettene på:

**Metode 1 – egne foto (anbefalt)**
Ta bilder av deg selv i start- og sluttposisjon for hver øvelse, mot en rolig bakgrunn, fra siden. Mobil på stativ, selvutløser eller video som deles opp. 120 øvelser × 2 = 240 bilder, realistisk på en ettermiddag. Fordeler: riktig posisjon garantert, ingen lisensspørsmål, og du får samtidig kvalitetssikret at øvelsen i biblioteket faktisk gir mening.

**Metode 2 – bilder fra free-exercise-db**
Datasettet er offentlig eiendom og har to bilder per øvelse (start/slutt) som allerede følger samme konvensjon. Dekker styrke og en del kroppsvekt, men mangler mye av intervall/kondisjon.

Praktisk kombinasjon: metode 2 for det som finnes der, metode 1 for resten.

**Skjelettgenerering** skjer i ComfyUI-flyten (node `OpenposePreprocessor` med `detect_hand: enable`, `detect_body: enable`, `detect_face: disable`). Skjelettbildet lagres ved siden av kildefotoet, slik at det kan sjekkes og gjenbrukes.

**Mappestruktur for kildemateriale**
```
pipeline/
  poses/
    kettlebell-swing/
      0.jpg            # kildefoto startposisjon
      1.jpg            # kildefoto sluttposisjon
      0_pose.png       # generert skjelett (lages av skriptet)
      1_pose.png
    push-up/
      ...
```

---

## A.7 ComfyUI-arbeidsflyt (API-format)

Lagres som `pipeline/workflow_api.json`. Skriptet i A.8 bytter ut feltene merket `<<...>>`.

```json
{
  "1": { "class_type": "CheckpointLoaderSimple",
         "inputs": { "ckpt_name": "sd_xl_base_1.0.safetensors" } },

  "2": { "class_type": "CLIPTextEncode",
         "inputs": { "clip": ["1", 1], "text": "<<POSITIVE>>" } },

  "3": { "class_type": "CLIPTextEncode",
         "inputs": { "clip": ["1", 1], "text": "<<NEGATIVE>>" } },

  "4": { "class_type": "EmptyLatentImage",
         "inputs": { "width": 1024, "height": 1024, "batch_size": 1 } },

  "5": { "class_type": "LoadImage",
         "inputs": { "image": "<<POSE_SOURCE_FILENAME>>" } },

  "6": { "class_type": "OpenposePreprocessor",
         "inputs": { "image": ["5", 0], "detect_hand": "enable",
                     "detect_body": "enable", "detect_face": "disable",
                     "resolution": 1024 } },

  "7": { "class_type": "ControlNetLoader",
         "inputs": { "control_net_name": "controlnet-openpose-sdxl-1.0.safetensors" } },

  "8": { "class_type": "ControlNetApplyAdvanced",
         "inputs": { "positive": ["2", 0], "negative": ["3", 0],
                     "control_net": ["7", 0], "image": ["6", 0],
                     "strength": 0.8, "start_percent": 0.0, "end_percent": 0.8 } },

  "9": { "class_type": "KSampler",
         "inputs": { "model": ["1", 0], "positive": ["8", 0], "negative": ["8", 1],
                     "latent_image": ["4", 0], "seed": "<<SEED>>", "steps": 30,
                     "cfg": 6.0, "sampler_name": "dpmpp_2m", "scheduler": "karras",
                     "denoise": 1.0 } },

  "10": { "class_type": "VAEDecode",
          "inputs": { "samples": ["9", 0], "vae": ["1", 2] } },

  "11": { "class_type": "SaveImage",
          "inputs": { "images": ["10", 0], "filename_prefix": "<<OUTPUT_PREFIX>>" } }
}
```

**Med stil-LoRA:** legg inn en `LoraLoader`-node mellom `1` og `2/3/9`, og pek `model` og `clip` gjennom den.

**Skjelettet lagres i tillegg** ved å legge til en ekstra `SaveImage` koblet til node `6` – nyttig for feilsøking.

Merk: nodenavn og feltnavn er hentet fra ComfyUI og `comfyui_controlnet_aux` slik de har vært stabile en stund, men bør verifiseres mot den installerte versjonen. Enkleste måte: bygg flyten én gang i ComfyUI-grensesnittet, aktiver «Enable Dev mode Options» i innstillinger, og bruk «Save (API Format)». Da får du nøyaktig riktig JSON for din installasjon.

---

## A.8 Pipeline-skript

`pipeline/generate.py`. Leser øvelsesbiblioteket, genererer skjelett og bilde per posisjon, etterbehandler og legger resultatet klart for appen. Idempotent: hopper over øvelser som allerede har ferdige filer, med mindre `--force`.

```python
#!/usr/bin/env python3
"""
Genererer øvelsesillustrasjoner via ComfyUI på Kitor.

Bruk:
  python generate.py --exercises ../data/exercises.json --out ../public/exercises
  python generate.py --only kettlebell-swing push-up
  python generate.py --force
"""
import argparse, hashlib, io, json, sys, time
from pathlib import Path

import requests
from PIL import Image
from rembg import remove, new_session

COMFY = "http://kitor:8188"
WORKFLOW = Path(__file__).parent / "workflow_api.json"
POSES = Path(__file__).parent / "poses"

STYLE_PREFIX = (
    "flat vector illustration, minimalist fitness pictogram, single stylized human figure, "
    "faceless, smooth solid fill colors, clean dark outline, blue figure with dark gray "
    "athletic clothing, isolated on pure white background, no shadow, no floor, no text, "
    "centered, full body visible, side view, "
)
NEGATIVE = (
    "photo, photorealistic, realistic skin, face, eyes, mouth, hair detail, text, watermark, "
    "logo, signature, background, gym, floor, shadow, gradient, 3d render, multiple people, "
    "extra limbs, extra fingers, deformed hands, blurry, low quality, noise, frame, border"
)

SIZES = {"": 512, "_thumb": 128}
rembg_session = new_session("isnet-general-use")


def seed_for(exercise_id: str) -> int:
    return int(hashlib.sha256(exercise_id.encode()).hexdigest()[:8], 16)


def upload_image(path: Path) -> str:
    """Laster kildefoto opp til ComfyUI sin input-mappe, returnerer filnavn."""
    with open(path, "rb") as f:
        r = requests.post(f"{COMFY}/upload/image",
                          files={"image": (path.name, f, "image/jpeg")},
                          data={"overwrite": "true"})
    r.raise_for_status()
    return r.json()["name"]


def build_workflow(positive: str, pose_filename: str, seed: int, prefix: str) -> dict:
    wf = json.loads(WORKFLOW.read_text())
    wf["2"]["inputs"]["text"] = positive
    wf["3"]["inputs"]["text"] = NEGATIVE
    wf["5"]["inputs"]["image"] = pose_filename
    wf["9"]["inputs"]["seed"] = seed
    wf["11"]["inputs"]["filename_prefix"] = prefix
    return wf


def run_workflow(wf: dict) -> bytes:
    """Køer arbeidsflyten, venter på resultat, returnerer PNG-bytes for første bilde."""
    r = requests.post(f"{COMFY}/prompt", json={"prompt": wf, "client_id": "trening-pipeline"})
    r.raise_for_status()
    prompt_id = r.json()["prompt_id"]

    while True:
        h = requests.get(f"{COMFY}/history/{prompt_id}").json()
        if prompt_id in h:
            break
        time.sleep(1.0)

    outputs = h[prompt_id]["outputs"]
    for node_id, node in outputs.items():
        for img in node.get("images", []):
            if node_id == "11":
                r = requests.get(f"{COMFY}/view", params={
                    "filename": img["filename"], "subfolder": img.get("subfolder", ""),
                    "type": img["type"]})
                r.raise_for_status()
                return r.content
    raise RuntimeError(f"Ingen bilde fra node 11 for {prompt_id}")


def postprocess(png_bytes: bytes, out_base: Path) -> None:
    """Fjerner bakgrunn, beskjærer, sentrerer på kvadrat, lagrer WebP i alle størrelser."""
    img = Image.open(io.BytesIO(png_bytes)).convert("RGBA")
    img = remove(img, session=rembg_session)

    bbox = img.getbbox()
    if not bbox:
        raise RuntimeError("Tomt bilde etter bakgrunnsfjerning")
    img = img.crop(bbox)

    # Kvadrat med 8 % luft rundt figuren
    side = int(max(img.size) * 1.16)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(img, ((side - img.width) // 2, (side - img.height) // 2), img)

    for suffix, px in SIZES.items():
        out = canvas.resize((px, px), Image.LANCZOS)
        out.save(out_base.with_name(out_base.name + suffix + ".webp"),
                 "WEBP", quality=85, method=6)


def process_exercise(ex: dict, out_dir: Path, force: bool) -> None:
    ex_id = ex["id"]
    target = out_dir / ex_id
    target.mkdir(parents=True, exist_ok=True)
    prompts = ex.get("bildePrompt") or {}

    for pos in ("0", "1"):
        final = target / f"{pos}.webp"
        if final.exists() and not force:
            print(f"  {ex_id}/{pos}: finnes, hopper over")
            continue

        pose_src = POSES / ex_id / f"{pos}.jpg"
        if not pose_src.exists():
            print(f"  {ex_id}/{pos}: MANGLER kildefoto {pose_src}", file=sys.stderr)
            continue
        if pos not in prompts:
            print(f"  {ex_id}/{pos}: MANGLER bildePrompt", file=sys.stderr)
            continue

        pose_name = upload_image(pose_src)
        wf = build_workflow(
            positive=STYLE_PREFIX + prompts[pos],
            pose_filename=pose_name,
            seed=seed_for(ex_id),
            prefix=f"trening/{ex_id}_{pos}",
        )
        t0 = time.time()
        png = run_workflow(wf)
        postprocess(png, target / pos)
        print(f"  {ex_id}/{pos}: ferdig ({time.time() - t0:.1f}s)")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--exercises", required=True, type=Path)
    ap.add_argument("--out", required=True, type=Path)
    ap.add_argument("--only", nargs="*", default=None)
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    exercises = json.loads(args.exercises.read_text(encoding="utf-8"))
    if args.only:
        exercises = [e for e in exercises if e["id"] in args.only]

    print(f"{len(exercises)} øvelser mot {COMFY}")
    for ex in exercises:
        process_exercise(ex, args.out, args.force)


if __name__ == "__main__":
    main()
```

**Kjøretid:** SDXL 1024² med ControlNet, 30 steg, tar 6–10 sekunder på en 3090. 240 bilder tar 30–45 minutter, plus rembg.

**Feilhåndtering som bør legges til i neste iterasjon:** retry ved nettverksfeil mot ComfyUI, logg til fil, `--dry-run` som bare validerer at alle kildefoto og prompter finnes.

---

## A.9 Ikoner for muskelgrupper og utstyr

Disse skal ikke gjennom Stable Diffusion. Det er få (ca. 20), de skal være skarpe i små størrelser, og de skal fargelegges av appen (aktiv/inaktiv). Derfor: **SVG, generert som kode av Claude Code/Antigravity**, etter denne guiden:

- ViewBox `0 0 24 24`, strek 1,75 px, `stroke="currentColor"`, ingen fyll
- Samme visuelle vekt som Lucide-ikonene appen ellers bruker
- Muskelgrupper: forenklet kroppssilhuett der aktuell gruppe er fylt (`fill="currentColor"`, `opacity="0.35"`)
- Utstyr: kettlebell, manual, stang, strikk, matte, hopptau, benk, ingen utstyr

Lagres i `src/assets/icons/`, importeres som React-komponenter.

---

## A.10 Kvalitetssikring

Hver øvelse gjennomgås manuelt før den godkjennes. Skriptet kan lage en kontaktkopi (`contact_sheet.py`, ikke skrevet ennå) med kildefoto, skjelett og ferdig bilde side om side per øvelse – det gjør gjennomgangen til en 20-minutters jobb i stedet for 200 filåpninger.

**Sjekkliste per bilde**
- [ ] Kroppsstillingen viser riktig øvelse, og en som ikke kjenner øvelsen ville forstått den
- [ ] Start og slutt er tydelig forskjellige
- [ ] Riktig utstyr, holdt riktig
- [ ] Ingen ekstra lemmer, feil antall fingre er akseptabelt om hendene er små
- [ ] Ingen rester av bakgrunn etter rembg (sjekk mot mørk bakgrunn)
- [ ] Figuren er sentrert og fyller rammen omtrent likt som de andre
- [ ] Filstørrelse innenfor grensen

**Vanlige feil og tiltak**
| Problem | Tiltak |
|---|---|
| Feil stilling | Sjekk skjelettet først. Er skjelettet riktig: øk ControlNet strength til 0,95. Er skjelettet feil: nytt kildefoto med bedre lys og kontrast |
| Ansiktstrekk dukker opp | Legg «faceless» tidligere i prompten, øk vekten: `(faceless:1.3)` |
| Skygge/gulv | Legg `(no shadow:1.2)` i positiv prompt, eller beskjær |
| Ulik stil mellom bilder | Fast seed hjelper, stil-LoRA hjelper mer |
| rembg spiser deler av figuren | Prøv modell `u2net` i stedet, eller generer med lysegrå bakgrunn (`#F3F4F6`) og maskér på farge |

Underkjente bilder: sett `"bildeStatus": "regenerer"` i JSON med en merknad, juster prompt eller kildefoto, kjør `--only <id> --force`.

---

## A.11 Integrasjon i appen

**Lagring:** Bildene pakkes som statiske filer i Firebase Hosting under `/exercises/{id}/0.webp`, `1.webp`, `0_thumb.webp`, `1_thumb.webp`. Ikke Firebase Storage – statisk hosting er gratis, cachebart av service worker og krever ingen tilgangsregler.

**Offline:** Service worker forhåndslaster alle miniatyrer (< 1 MB). Fullstørrelse lastes ved behov og caches ved første visning. Da fungerer øvelseslisten offline umiddelbart, og bilder man har sett én gang forblir tilgjengelige.

**Visning:** `<ExerciseImage id pos size />`-komponent som velger riktig fil, viser miniatyr som plassholder mens 512 lastes, og faller tilbake til muskelgruppe-ikon hvis bildet mangler (`bildeStatus !== "godkjent"`).

**Egne øvelser:** Brukerens egne bilder går til Firebase Storage som før (kapittel 5). Disse går ikke gjennom pipelinen.

**Felt i øvelsesskjemaet** (utvider kapittel 6 i hovedspekken):
```json
"bildePrompt": { "0": "...", "1": "..." },
"bildeVinkel": "side | front",
"bildeStatus": "mangler | generert | godkjent | regenerer",
"bildeMerknad": "valgfri kommentar fra gjennomgang"
```

---

## A.12 Lisens og opphav

- SDXL 1.0: CreativeML Open RAIL++-M. Bruk av generert innhold er tillatt, også kommersielt. Modellen kan ikke brukes til visse formål listet i lisensen – ingen av dem er relevante her.
- ControlNet-modellene fra xinsir og thibaud: Apache 2.0.
- Eventuell stil-LoRA: sjekk lisens individuelt på Civitai. Feltet «Commercial use» skal tillate «Generated images». Noter LoRA-navn og lisens i `pipeline/LICENSES.md`.
- Kildefoto av deg selv: ditt. Kildefoto fra free-exercise-db: offentlig eiendom. Skjelettene fra OpenPose inneholder uansett ingen gjenkjennbar informasjon.
- rembg: MIT.
- Ferdige bilder: ingen opphavsrettskrav fra modellleverandør. Legg en kort linje i appens «Om»-side: «Illustrasjoner generert med Stable Diffusion XL, posisjoner basert på egne referansefoto.»

---

## A.13 Oppgaveliste for kodeagent

Rekkefølge for Claude Code eller Antigravity. Hver oppgave har et akseptansekriterium.

| # | Oppgave | Akseptanse |
|---|---|---|
| 1 | Utvid øvelsesskjemaet med feltene i A.11, oppdater JSON Schema-validering | `npm run validate:exercises` passerer for tomt bibliotek |
| 2 | Generer `bildePrompt` for alle øvelser etter reglene i A.5 | Alle øvelser har to prompter, hver under 40 ord, ingen inneholder øvelsens navn |
| 3 | Lag `pipeline/` med `generate.py`, `workflow_api.json`, `requirements.txt`, `README.md` | `python generate.py --dry-run` lister manglende kildefoto uten å kontakte ComfyUI |
| 4 | Lag `contact_sheet.py` | Én PNG per 20 øvelser med kildefoto, skjelett og resultat |
| 5 | Lag SVG-ikoner etter A.9 | 20 ikoner, alle rendres korrekt i 16 og 24 px |
| 6 | Lag `<ExerciseImage />` med miniatyr-plassholder og ikon-fallback | Storybook eller testside viser alle tre tilstander |
| 7 | Service worker: forhåndslast `*_thumb.webp`, cache fullstørrelse ved behov | Øvelseslisten viser miniatyrer i flymodus |
| 8 | Om-side med opphavstekst fra A.12 | Tekst synlig |

Oppgave 3 kan gjøres først for å teste pipelinen med 5 øvelser før biblioteket er ferdig.

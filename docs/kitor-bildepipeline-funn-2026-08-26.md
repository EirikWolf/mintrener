# Kitor-bildepipeline for Min Trener — funn og anbefalt oppsett

**Fra:** kitor-eier
**Dato:** 2026-08-26
**Re:** Svar på bestillingen i `homelab-vault/02-Tjenester/AI/mintrener-arbiter-comfyui-bestilling.md` (se seksjon 5 der for full vurdering)

---

## 1. Status på onboardingen

Bestillingen er godkjent med endringer, og infrastrukturen er foreslått i
[kitor-infra#78](https://github.com/EirikWolf/kitor-infra/pull/78):

| Leveranse | Verdi |
|---|---|
| ComfyUI API | `https://kitor.tail49f298.ts.net/comfy-mintrener/*` (merk: IKKE `/comfyui/*`) |
| Arbiter v1 (GPU-lease) | `https://kitor.tail49f298.ts.net/arbiter/*` |
| Auth | `Authorization: Bearer $KITOR_TOKEN_MINTRENER` på begge ruter |
| Token | Vaultwarden: `homelab/mintrener` → `kitor-token` (opprettet 2026-08-26) |
| Arbiter-prioritet | `mintrener: normal` |

Arbiter v2 / chat-routing ble tatt ut av bestillingen (ubegrunnet behov +
selvmotsigende konfig — send egen bestilling hvis LLM-behov oppstår).

**Status: AKTIV (deployet 2026-08-26).** Begge ruter er verifisert:
`/arbiter/status` og `/comfy-mintrener/system_stats` svarer 200 med token,
401 uten. Dere kan hente tokenet fra Vaultwarden og starte pilot-batchen
(seksjon 6) når som helst.

## 2. Hva vi testet (3 batcher, 24 bilder)

Alle kjørt på kitor: Flux dev fp8, 24 steps, guidance 3.5, ~30–60 s/bilde
under `image`-lease.

1. **Vektor-stil + astrid_k-LoRA** (5 øvelser × styrke 0,6/1,0):
   Flat vektor-stil fungerer utmerket med Flux — men person-LoRA-en tilfører
   ingenting i denne stilen (ugjenkjennelig, ingen konsistens-gevinst), og
   posene fra ren tekst-prompt var upresise (knebøy ble stående positur).
2. **Fotorealistisk + astrid_k styrke 1,0** (5 øvelser × 2 seeds):
   Svært høy kvalitet, gjenkjennbart samme instruktør på tvers av bilder,
   antrekks-lås i prompt holdt. Men leddvinkler fra tekst var fortsatt
   upålitelige (kettlebell-swing feilet i begge seeds).
3. **OpenPose-ControlNet** (`Shakker-Labs/FLUX.1-dev-ControlNet-Union-Pro-2.0`,
   nå installert på kitor): **pose-styring virker.** Både DWPose-ekstraksjon
   fra referansefoto og håndtegnede COCO-18-skjeletter ga korrekt positur —
   inkludert hip-hinge-svingen som feilet i begge prompt-baserte batchene.

## 3. Anbefalt produksjonsoppsett

**Grunnvalg:** fotorealistisk Flux + astrid_k er godkjent av Eirik som
retning (avvik fra Vedlegg A sin vektor-spec — oppdater spec-en). Vektor-stil
er fortsatt mulig (dropp da LoRA-en).

**Workflow-parametre (verifisert):**

| Parameter | Verdi |
|---|---|
| Base | `flux1-dev-fp8.safetensors` (UNETLoader, fp8_e4m3fn) |
| LoRA | `synthiq/astrid_k.safetensors`, styrke 1,0, trigger-ord `ASTRID` |
| CLIP | `clip_l.safetensors` + `t5xxl_fp8_e4m3fn.safetensors` (DualCLIPLoader, type flux) |
| VAE | `ae.safetensors` |
| ControlNet | `flux1-dev-controlnet-union-pro-2.0.safetensors` → `SetUnionControlNetType: openpose` → `ControlNetApplyAdvanced` strength **0,9**, end_percent **0,65** |
| Sampler | euler/simple, 24 steps, **cfg 1,0**, FluxGuidance 3,5 |
| Oppløsning | 896×1152 (portrett) |

**Pose per øvelses-steg:** definer hvert steg som en skjelett-fil:
- Har dere referansefoto med korrekt utførelse → `DWPreprocessor`
  (detect_body enable, resolution 1024).
- Ellers → tegn COCO-18-skjelett programmatisk (svart bakgrunn,
  OpenPose-fargekonvensjon). Fungerte på første forsøk i testen.
- Skjelettets lerret MÅ ha samme sideforhold som latenten (896×1152).

**Konsistens:** lås antrekk og utseende eksplisitt i prompten («fitted sports
bra and high-waist leggings» + farge). Uten lås drifter farger/plagg mellom
bilder — vi så noe drift under ControlNet; stram gjerne ytterligere med
fargespesifikasjon.

Eksempel-skript (hele kjeden inkl. lease): `/tmp/mintrener_openpose_test.py`
og `/tmp/mintrener_astrid_photo_testbatch.py` på kitor — kopier inn i
`scripts/` og tilpass. NB: skriptene kjørte lokalt på kitor; deres klient
bruker HTTPS-rutene over i stedet for `localhost:8188`.

## 4. Hender og fingre — les dette før batch-kjøring

To av testbildene hadde finger-artefakter (hender på korsryggen i
knebøy-bildet, grep rundt kula i ett sving-bilde). Viktig å forstå
mekanikken før dere prøver å prompte dere ut av det:

⚠️ **Negativ prompt er INAKTIV i dette oppsettet.** Flux kjører med cfg 1,0,
og da ignoreres negativ-conditioningen fullstendig. «No more than 5 fingers»
i negativlisten gjør ingenting. Og telle-instruksjoner i positiv prompt
(«five fingers per hand») følges svakt av diffusjonsmodeller generelt —
ikke stol på det som eneste tiltak.

**Det som faktisk virker, i prioritert rekkefølge:**

1. **Design posene så hendene er opptatt eller nøytrale.** Grep rundt
   utstyr (kule, stang, matte) gir langt bedre hender enn frie, sprikende
   fingre. Åpne håndflater mot kamera er verstingen — unngå i
   skjelett-designet.
2. **Positiv prompt-formulering om håndstilling** (ikke antall): «hands in
   a firm grip around the kettlebell handle», «hands resting flat»,
   «fingers together». Beskriv hva hånden GJØR.
3. **detect_hand i DWPose:** når dere ekstraherer fra referansefoto, sett
   `detect_hand: enable` — da får skjelettet håndpunkter og ControlNet-en
   styrer også fingrene. (Testene våre kjørte med disable.)
4. **QA-gate med seed-utvalg:** generer 2–3 seeds per øvelses-steg og velg
   beste. Ved ~33 s/bilde koster et 3× overshoot på 100 illustrasjoner
   under to timer GPU-tid — billigste kvalitetstiltak som finnes.
5. **Inpaint-reparasjon** for enkeltbilder som ellers er perfekte
   (ComfyUI mask + samme modell) — siste utvei, sjelden nødvendig når 1–4
   følges.

## 5. Kjøreregler mot kitor (obligatorisk)

Klienten deres kjører utenfor kitor — bruk HTTP-API-et for arbiteren:

```bash
# Acquire (blokkerer til GPU er ledig; exclusive image-lease stopper vLLM)
TOKEN=$(curl -s -X POST -H "Authorization: Bearer $KITOR_TOKEN_MINTRENER" \
  -H 'Content-Type: application/json' \
  -d '{"kind":"image","requester":"mintrener","label":"exercise-batch","duration_h":2}' \
  https://kitor.tail49f298.ts.net/arbiter/acquire | jq -r '.token')

# Heartbeat hvert 5. minutt — PÅKREVD for jobber > 25 min, ellers
# auto-releases leasen etter 30 min og batchen krasjes
curl -s -X POST -H "Authorization: Bearer $KITOR_TOKEN_MINTRENER" \
  -H 'Content-Type: application/json' -d "{\"token\":\"$TOKEN\"}" \
  https://kitor.tail49f298.ts.net/arbiter/heartbeat

# Release — ALLTID, i finally/trap (idempotent, trygt å gjenta)
curl -s -X POST -H "Authorization: Bearer $KITOR_TOKEN_MINTRENER" \
  -H 'Content-Type: application/json' -d "{\"token\":\"$TOKEN\"}" \
  https://kitor.tail49f298.ts.net/arbiter/release
```

- **Aldri** kall ComfyUI uten aktiv `image`-lease (OOM/krasj-risiko for
  andre prosjekter).
- En batch på 60–100 bilder tar ~35–60 min → heartbeat-loop er ikke valgfritt.
- Ved kø: `GET /arbiter/status` viser leases og estimert ventetid.

## 6. Neste steg for Min Trener

1. ~~Vent på klarsignal~~ — deployet og verifisert 2026-08-26.
2. ~~Hent token~~ — ligger i `.env` (`KITOR_TOKEN`), og master-kopien i
   Vaultwarden (`homelab/mintrener` → `kitor-token`).
3. Oppdater `scripts/exportComfyUiBatch.ts`: rute `/comfy-mintrener`,
   workflow-parametrene fra seksjon 3, skjelett per øvelses-steg,
   arbiter-flyt fra seksjon 5. Referanseimplementasjon:
   `scripts/kitor-pilot-batch.py` (kjørt 2026-08-26).
4. ~~Kjør pilot~~ — gjennomført, se seksjon 7. Neste: full batch.

## 7. Pilotresultat (2026-08-26)

3 øvelser × 3 seeds kjørt ende-til-ende gjennom produksjonsløypa fra
lokal maskin: `.env`-token → `POST /arbiter/acquire` → heartbeat (verifisert
i drift) → `/comfy-mintrener/prompt` → release. 9/9 bilder ok, ~34 s/bilde,
lease-ventetid 0,7 s.

**QA per bilde:**

| Øvelse | seed0 | seed1 | seed2 | Beste |
|---|---|---|---|---|
| squat | ✅ bakfra, korrekt dybde | ✅ 3/4-front, hender i never | ✅ front, hender på hofter | **seed2** |
| lunge | ✅ ren sidevisning | ⚠️ antrekks-drift (stroppeløs topp) | ✅ korrekt antrekk + pose | **seed2** |
| kbswing | ✅ tydeligst hinge, flat rygg | ✅ god | ⚠️ antrekks-drift (lysere farge) | **seed0** |

**Funn:**

- **Hender: 0 finger-artefakter i 9 bilder.** Hånd-formuleringene fra
  seksjon 4 (beskriv hva hånden GJØR) + grep-/hvile-poser virket.
- **Pose: 9/9 anatomisk korrekte** — inkl. hip-hinge-svingen som feilet
  konsekvent uten skjelett. OpenPose-styringen holder i produksjon.
- **Antrekks-drift i 2/9** tross fargespesifikasjon — QA-gaten fanget dem.
  3× overshoot per steg er riktig kalibrert; behold det i full batch.
- Utvalgsregel som fungerte: velg per øvelse på (1) antrekk korrekt,
  (2) positur, (3) ansikt/identitet synlig der ønskelig.

Output: `/mnt/truenas/ai/output/comfyui/mintrener/pilot__*.png`.

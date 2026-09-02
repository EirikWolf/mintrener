# Bestilling: personsegmentering (BiRefNet) på kitors ComfyUI

**Prosjekt:** Min Trener
**Dato:** 2026-09-02
**Prioritet:** normal — blokkerer punkt (c) i Beslutning 49, ikke noe som er i drift
**Kontaktperson:** Eirik Wolfenstein

> **Merk om formen:** dette er en **kapasitets-bestilling**, ikke en onboarding.
> Runbooken er tydelig: *«Hvis tjenesten ikke finnes på kitor i dag, er det en
> kapasitets-bestilling — diskuter med kitor-eier før bestillingen»*, og
> *«bestilling er ikke godkjenning — kitor-eier vurderer mot VRAM-budget,
> lisens-status, vedlikeholds-byrde»*. De tre punktene er besvart under.
> Min Trener har allerede token og ComfyUI-rute (`/comfy-mintrener`); det
> bestilles ikke noe nytt der.

---

## Sammendrag

Vi ber om at **én modellfil legges på kitor**: `birefnet.safetensors` (444 MB,
MIT) i en ny mappe `/srv/kitor/models/comfyui/background_removal/`.

Ingen nye custom nodes, ingen ny container, ingen ny rute. ComfyUI-kjernen har
allerede både laster og node (`LoadBackgroundRemovalModel`, `RemoveBackground`)
— de står i `object_info` i dag, men modell-listen er tom fordi mappa ikke
finnes.

---

## Detaljer

### Hva vi trenger

| | |
|---|---|
| **Fil** | `birefnet.safetensors` |
| **Kilde** | [Comfy-Org/BiRefNet](https://huggingface.co/Comfy-Org/BiRefNet) på Hugging Face |
| **Størrelse** | 444 MB |
| **Lisens** | MIT |
| **Målmappe** | `/srv/kitor/models/comfyui/background_removal/` (må opprettes) |
| **Kodeendring** | Ingen — `comfy.background_removal.birefnet` finnes i kjernen |

Samme repo har også `lucida.safetensors` (885 MB) som alternativ. Vi ber om
BiRefNet fordi den er halvparten så stor og dekker behovet; `lucida` kan
vurderes senere hvis maskekvaliteten ikke holder.

### Hvorfor — det er målt, ikke antatt

Bildepipelinen har stått fast på ett problem gjennom flere runder: **et
2D-skjelett (OpenPose COCO-18) kan ikke uttrykke kroppsorientering.** Et punkt
`(x, y)` er identisk enten brystet peker opp eller ned, så «liggende på magen»
og «liggende på ryggen» gir samme skjelett. Vi testet og avkreftet fire
selvstendige hypoteser, og en ekstern revisjon kom uavhengig til samme
konklusjon fra førsteprinsipper.

2026-09-02 målte vi at **et dybdekart løser det**. Samme seed, samme prompt,
samme kildefoto — bare kontrolltypen byttet:

| Kontrolltype | Resultat |
|---|---|
| Dybdekart | Liggende på magen. Riktig, første gang. |
| Normalkart | Liggende på ryggen. Samme feil som før. |

Men dybdekartet bærer **hele scenen**, ikke bare kroppen. Resultatet fikk
stativer og en vektstang i bakgrunnen fra kildefotoets rom, enda prompten ba om
«no gym equipment», og løse joggebukser i stedet for tights, fordi kartet koder
plaggets silhuett.

Vi prøvde å terskle bakgrunnen bort med noder som allerede finnes
(`ImageToMask` → `ThresholdMask`). **Det virker ikke**, og vi vet hvorfor: en
terskel skjærer scenen i et *avstandsplan* og isolerer ikke en person. Modellen
lå med hodet nærmere kamera enn føttene, så planet gikk tvers gjennom kroppen og
etterlot frittstående flekker som ControlNet leste som separate kropper — to
hoder ved terskel 0,35, en umulig stående positur ved 0,55.

En **personmaske** løser det terskelen ikke kan: dybde bare på kroppen, svart
bakgrunn, og da eier prompten rommet mens kontrollen fortsatt holder posituren.

### De tre kriteriene fra runbooken

**VRAM.** BiRefNet er en segmenteringsmodell på 444 MB. Anslått inferens-VRAM
er 1–2 GB — **det er et anslag, ikke en måling**, og bør verifiseres ved
installasjon. Den kjører før Flux i samme graf og kan frigis etterpå. Til
sammenligning bruker Flux Dev fp8 + ControlNet 12–14 GB. All vår bruk skjer
uansett innenfor en `kitor-arbiter`-lease i kategorien `image`, så den
konkurrerer ikke med vLLM.

**Lisens.** MIT. Det er ikke en detalj for oss: Beslutning 48 handlet nettopp om
at vi hadde lest Flux-lisensen feil og bygget en oppdiktet regenererings-kostnad
inn i planen i flere uker. Vi velger derfor bevisst en modell uten
bruksbegrensninger, framfor RMBG-2.0 som er ikke-kommersiell.

**Vedlikeholdsbyrde.** Null nye custom nodes. Laster og node ligger i
ComfyUI-kjernen og oppdateres med den. Fila er statisk; det finnes ingen
tjeneste å restarte eller overvåke. Diskplass er ikke et tema — 230 GB ledig.

### Påvirkning på andre prosjekter

Ingen i hvile: dette er en fil på disk. Under bruk kjører den innenfor vår
eksisterende arbiter-lease, altså i samme vindu vi allerede bruker på
bildegenerering. Ingen deling av vLLM-VRAM, ingen ny port, ingen Caddy-endring.

---

## Tidsforventning

Ingen hastverk. Ingenting i drift blokkeres — dette er et FoU-spor for
øvelsesbildene, og appen fungerer uten det.

**Fallback hvis det ikke skjer:** vi kjører videre med svakere ControlNet
(styrke 0,55, vindu 0,45). Målingen viser at *orienteringen holder* også der, og
at prompten da eier rom og antrekk — men posituren driver, så bildet viser at
hun ligger på magen uten å vise akkurat den øvelsen. For enkelte øvelser kan det
være godt nok; for et instruksjonsbibliotek er det ikke det.

---

## Avhengighet

**Blokkerer:** Beslutning 49 punkt (c) — de 150 utførelsesbildene. Uten en
personmaske må vi velge mellom riktig positur med feil rom, eller riktig rom med
upresis positur.

**Blokkeres av:** ingenting. Filen kan legges inn når som helst.

**Åpent beslutningspunkt det henger sammen med:** Beslutning 49 la ned
KI-sporet på fire begrunnelser. To av dem holder ikke lenger — *«bare
illustrasjon kan vise muskler»* var feil (muskelkartet er en egen komponent), og
*«2D kan ikke uttrykke orientering»* er nå omgått med dybdekart. Om dette
forsøket lykkes, bør Beslutning 49 revurderes. Om det ikke lykkes, står den.

---

## Hva vi IKKE ber om

- Ingen ny token — Min Trener har allerede en som validerer mot `/comfy-mintrener`.
- Ingen ny Caddy-rute.
- Ingen SSH-tilgang utover den lesetilgangen vi har.
- Vi installerer den ikke selv. Å legge filer i `/srv/kitor/` er en konfigendring
  på en delt vert, og den beslutningen er kitor-eiers.

## Referanser

- [Bestille kitor-tilgang](../../homelab-vault/03-Runbooks/Bestille-kitor-tilgang.md) — malen denne følger
- [ComfyUI: Remove Image Background with BiRefNet](https://docs.comfy.org/tutorials/utility/remove-background-birefnet) — offisiell oppsettsdokumentasjon
- `docs/DECISIONS.md` — Beslutning 48 (Flux-lisensen) og 49 (illustrasjonssporet)
- `scripts/testDybdeKontroll.ts` — testen som produserte målingene over

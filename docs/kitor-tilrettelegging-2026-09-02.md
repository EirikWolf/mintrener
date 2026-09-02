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

## Svar fra kitor-eier (2026-09-02)

**Status: LEVERT.** `birefnet.safetensors` (444 MB, MIT — verifisert mot
Comfy-Org/BiRefNet på HF) ligger i
`/srv/kitor/models/comfyui/background_removal/`, og modellen er **verifisert
synlig i `object_info` nå** — dere kan bruke `LoadBackgroundRemovalModel` →
`RemoveBackground` i `/comfy-mintrener`-grafen umiddelbart.

Én teknisk korreksjon til bestillingen: `background_removal` var ikke en
nøkkel i `extra_model_paths.yaml`, så mappa dere foreslo ville ikke blitt
skannet. Løst i to lag: (1) symlink fra default-mappa
`/opt/comfyui/models/background_removal/` → NVMe-stien gir synlighet uten
ComfyUI-restart, (2) [kitor-infra#83](https://github.com/EirikWolf/kitor-infra/pull/83)
legger nøkkelen permanent i `extra_model_paths.yaml` (aktiveres ved neste
naturlige restart; symlinken er harmløs og kan bli liggende).

VRAM-anslaget deres (1–2 GB) verifiseres enklest av dere i første reelle
kjøring under lease — mål gjerne og noter i dette dokumentet.

Ros for formen: kapasitets-merkingen, de tre kriteriene og «vi installerer
ikke selv» er nøyaktig slik runbooken vil ha det.

## Referanser

- [Bestille kitor-tilgang](../../homelab-vault/03-Runbooks/Bestille-kitor-tilgang.md) — malen denne følger
- [ComfyUI: Remove Image Background with BiRefNet](https://docs.comfy.org/tutorials/utility/remove-background-birefnet) — offisiell oppsettsdokumentasjon
- `docs/DECISIONS.md` — Beslutning 48 (Flux-lisensen) og 49 (illustrasjonssporet)
- `scripts/testDybdeKontroll.ts` — testen som produserte målingene over

## Målt VRAM og første resultater (Min Trener, 2026-09-02)

### VRAM — anslaget var for høyt

Samplet `nvidia-smi` hvert 2. sekund gjennom en hel kjøring under lease:

| Tid | VRAM | Hva skjer |
|---|---|---|
| 0–20 s | 22 237 MiB | vLLM kjører |
| 24 s | **338 MiB** | Arbiter stoppet vLLM — GPU tom |
| 28 s | **870 MiB** | Preprosessorene lastet |
| 32–44 s | 6 160 → 22 864 MiB | Flux + ControlNet lastes, topp |
| 112 s | 426 MiB | Lease frigitt |

**BiRefNet + Depth Anything V2 (vitl) bruker til sammen rundt 0,5 GB over
tomgang.** Vi anslo 1–2 GB for BiRefNet alene; det var for høyt. Forbeholdet er
at 2 sekunders sampling ikke skiller de to preprosessorene, så tallet er felles
for begge — men størrelsesordenen er klar, og BiRefNet er billigere enn vi sa.

Et tall til, som gjelder oss og ikke BiRefNet: **toppen under lease var 22 864
MiB av 24 576 — 93 %.** Flux fp8 + ControlNet Union Pro er trangt i seg selv.
Det er verdt å vite hvis noen vurderer å kjøre noe samtidig i `image`-kategorien.

### Resultater — masken løser rommet, men fjerner gulvet

Testen: superman, liggende på magen, som 2D-skjelettet aldri fikk til.

| Variant | Orientering | Rom | Antrekk | Bakkekontakt |
|---|---|---|---|---|
| Dybde 0,9, umaskert | ✅ mage | ❌ stativer, vektstang | ❌ joggebukse | ✅ |
| Dybde 0,55, umaskert | ✅ mage | ✅ | ✅ | ✅ |
| BiRefNet 0,9, myk kant | ✅ mage | ✅ | ~ | ✅ |
| BiRefNet 0,7, myk kant | ✅ mage | ✅ | ✅ | ✅ |
| BiRefNet 0,9, hard kant | ✅ mage | ✅ | ~ | ❌ **svever** |
| BiRefNet 0,8, hard kant | ❌ rygg | ✅ | ✅ | ✅ |

**BiRefNet gjør jobben den ble bestilt for:** kildefotoets rom forsvinner helt.
Ingen stativer, ingen vektstang — vårt eget lyse studio hver gang.

**To nye funn:**

1. **Myk maskekant gir glorie.** Ved kontrollstyrke 0,9 ble den mykede kanten en
   synlig gjennomsiktig kontur rundt figuren. Årsaken er at mykningen lager
   mellomliggende dybdeverdier mellom kroppen og den svarte bakgrunnen, og
   ControlNet gjengir dem som en ekte flate. Hard kant fjerner glorien.

2. **Hard maske fjerner gulvet, og gulvet er bærende.** Maskerer man til KUN
   personen, forsvinner også matta hun ligger på. Modellen fikk ingen bakke å
   plassere henne mot, og hun endte svevende i lufta. For en liggende øvelse er
   underlaget en del av informasjonen.

Neste steg er derfor ikke svart bakgrunn, men et **syntetisk gulv**: personens
dybde komponert på en enkel gradient som leser som et underlag, i stedet for
`EmptyImage(color=0)`. Da beholder vi både rommet vårt og bakkekontakten.

Ingenting av dette er kritikk av leveransen — modellen gjør presis det den
skulle. Notert her fordi runbooken ber om det, og fordi neste prosjekt som
maskerer et dybdekart vil gå i samme felle.

### Syntetisk gulv — løste bakkekontakten

Bygget et gulv av fire stablede bånd i `EmptyImage`, lysere mot bunnen (Depth
Anything koder nært som lyst), og komponerte personens dybde på det i stedet for
på svart. Ingen gradient-node finnes i ComfyUI, men fire bånd holder — ControlNet
trenger et plausibelt underlag, ikke en presis dybdemodell av rommet.

**Virket.** Hun ligger nå på matte på tregulv, i vårt eget lyse rom, på magen med
svai rygg og løftede bein. Ingen glorie, ingen svevning, ingen stativer.

### Det som står igjen, og som ikke er en parameterfeil

Antrekket er fortsatt galt: toppen ser ut til å skli av, og buksa er løs i stedet
for tights. Årsaken er strukturell, ikke en innstilling.

**Dybdekartet koder referansepersonens KLESSILHUETT.** Mannen i kildefotoet har
løs singlet og joggebukse. Den formen ligger i dybdekartet, ControlNet gjengir
den, og Flux maler våre grå farger på feil plaggform. En maske til personen
beholder personen — inkludert klærne.

Det lar seg ikke løse med kontrollstyrke. Det løses ved **valg av
referansefoto**: kilder der modellen bærer tettsittende treningstøy. Det gjør
kildekurering til en del av pipelinen, ikke en engangsjobb.

### Oppsummert om leveransen

BiRefNet gjorde presis det den ble bestilt for, og gjorde det billigere enn vi
anslo. Tre av fire problemer er løst med den; det fjerde viste seg å ligge i
kildematerialet, ikke i verktøyet.

### Klessilhuetten løst — men ikke slik vi trodde

Oppgaven var å finne et kildefoto med tettsittende tøy. **Det finnes ikke i
free-exercise-db** for denne øvelsen: bildene er fra én gym-fotografering med
løse klær, og flere av mageøvelsene har en hjelper med i bildet, som ville gitt
to kropper i dybdekartet. Nærmeste treff med kompresjonstopp
(`Hip_Circles_prone`) er en annen positur.

Løsningen lå i mekanismen i stedet. Klessilhuetten følger med fordi ControlNet
fortsatt er aktiv når modellen maler plaggdetaljene. Hold styrken oppe så
posituren låses tidlig, og **slipp før detaljfasen**:

| `end_percent` | Positur | Antrekk |
|---|---|---|
| 0,65 | ✅ eksakt | ❌ kildens joggebukse |
| **0,35** | ✅ armene fram | ~ nesten riktig |
| 0,25 | ~ armene langs siden | ✅ **tights og topp riktig** |

`0,35` er punktet der begge holder. Ved `0,25` er antrekket perfekt, men armene
har drevet fra superman-strekket til å ligge langs kroppen.

Merk at kontroll**styrken** er høy i begge (0,9 og 0,95). Det er ikke en løsere
tøyle som løser det — det er en KORTERE. Posituren settes i de første stegene;
klær og overflate males i de siste.

### Full kjede, målt

| Problem | Løsning |
|---|---|
| 2D kan ikke uttrykke orientering | Dybdekart |
| Dybdekartet importerte kildens rom | BiRefNet-personmaske |
| Myk maskekant ga glorie | Hard kant |
| Hard maske fjernet gulvet | Syntetisk gulv av stablede bånd |
| Kildens klessilhuett fulgte med | Kortere kontrollvindu (`end 0,25–0,35`) |

Alle fem er løst med det som nå står på kitor. BiRefNet var det siste manglende
leddet.

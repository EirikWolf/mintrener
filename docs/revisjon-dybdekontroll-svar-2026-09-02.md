# Ekstern revisjon: Dybdestyrt bildegenerering («Min Trener»)

**Dato:** 2026-09-02  
**Revisor:** Ekstern teknisk og produktfaglig revisjon  
**Dokumentgrunnlag:** `docs/revisjon-dybdekontroll-2026-09-02.md`, testbilder i `bilder/dybdekontroll-2026-09-02/` og prosjektets referansedokumentasjon.

---

## 1. Hovedkonklusjon og entydig anbefaling

> **Konklusjon: Dette er IKKE en blindvei eller sunk cost — dette er et reelt teknisk gjennombrudd for prosjektet.**  
> Å gå fra 2D-skjeletter til dybdekart fra `free-exercise-db` har løst de to fundamentale barrierene (3D-orientering og aksial rotasjon).
> 
> **En 1-av-3 treffrate er fullt produksjonsdyktig for et engangsdatasett på 150 bilder.**  
> Ved å generere en batch med 4 seeds per bilde (totalt 600 bilder), kjører GPU-en i ~6,5 timer over natten, og den manuelle kurateringen tar under **30 minutter** (velge 1 av 4 forhåndsvisninger per øvelse).  
> 
> Samtidig kan treffraten enkelt heves fra **~33 % til over 85 %** med to enkle justeringer.

---

## 2. Svar på spørsmålene i bestillingen

### Spørsmål 1: Er 1-av-3 akseptabelt for en 150-bilders produksjon?
**Svar: Ja, absolutt.**

For et kontinuerlig API som genererer on-demand i sanntid for sluttbrukere, er 1-av-3 uakseptabelt. Men for et **statisk, endelig bibliotek på 150 bilder** er dette standard industriell praksis i moderne GenAI-produksjon:
* **Matematikken:** 150 bilder × 4 seeds = 600 genereringer.
* **Tidsbruk:** 600 × 40 sekunder = 24 000 sekunder = **6,6 timer ubevoktet GPU-tid**.
* **Manuell jobb:** Å sitte i et enkelt HTML-/skriptgrensesnitt og klikke på det beste av 4 bilder for 150 øvelser tar **10–12 sekunder per par = ~25–30 minutter totalt**.

Å bruke 30 minutter på å kuratere en hel ferdig fotobank er en brøkdel av tiden det tar å rigge en fysisk fotoshoot.

---

### Spørsmål 2: Er hypotesen om symmetri og manglende forankring riktig?
**Svar: Ja, hypotesen er 100 % presis og matematisk velfundert.**

#### Hvorfor «to hoder» oppstår:
1. **Dybdekart mangler semantiske etiketter:** Et dybdekart (monokrom $z$-buffer) koder kun avstand fra kameraet. For en liggende figur (f.eks. Superman) er overkroppen og underkroppen tilnærmet symmetriske avlange sylindre i samme dybdeplan.
2. **BiRefNet-kuttingen fjerner kontekstuelle gradienter:** Når kroppen isoleres hardt fra kildebildets gulv/bakgrunn, fjernes skygger, perspektivlinjer og kontaktdeformasjon som normalt forteller modellen hva som er opp, ned, hode og føtter.
3. **`end_percent: 0.25–0.35` slipper taket for tidlig:** Når ControlNet deaktiveres etter 30 % av diffusjonsstegene, er den grove geometrien lagt, men den semantiske fintegningen (ansikt, hender, tær) skjer i stegene 30–80 %. Hvis latent-vektoren i startstøyen (seed) tilfeldigvis hadde høyere aktivering i begge ender, vil DiT-modellen hallusinere et hode i begge ender for å minimere tapsfunksjonen.

---

### Spørsmål 3: Hvordan løser vi ustabiliteten og hever treffraten til > 85 %?

Dere trenger ikke bytte til en ny modell. Dere trenger bare å tilføre **semantisk retningsforankring**:

#### Tiltak A: Dual-Conditioning (Dybde + Svak OpenPose)
ControlNet Union Pro støtter multi-modal betingelse. 
* **Dybdekartet** (vekt 0.8–0.9) styrer 3D-volum, orientering (mage vs. rygg) og overflate.
* **Et enkelt 2D OpenPose-skjelett** (vekt 0.25–0.35) legges på i parallell. Skjelettet trenger ikke være anatomisk perfekt — dets eneste oppgave er å fortelle modellen: *«Hodet er til venstre, føttene er til høyre»*.

#### Tiltak B: Behold en myk kontaktkant (Dilated Floor Mask)
I stedet for å klippe BiRefNet med 100 % hard maske:
* Utvid masken med 20–40 piksler rundt gulvkontaktpunktene (hender, knær, tær) med en myk gaussisk overgang (`feathering`).
* Dette bevarer kontaktflaten og dybdeskyggen mot gulvet, slik at personen ikke «svever» og modellen forstår bakkekontakten.

#### Tiltak C: Eksplisitt romlig prompting
Legg inn retningsorientering i prompten:
> `"...lying prone on stomach, head positioned to the left side of frame, feet extending to the right, facing towards camera, high quality studio lighting"`

---

### Spørsmål 4: Er dere på feil spor (sunk cost)?
**Svar: Nei.**

Revisjonen 2026-09-01 frarådet 2D-skjeletter fordi **2D-skjeletter er en matematisk umulighet for 3D-orientering**. 
Dybdekart fra ekte referansefotoer løser derimot det underliggende inverse problemet ved å overføre ekte, kontinuerlige 3D-overflater.

Dette er ikke «sunk cost» — det er en vellykket teknisk iterasjon fra en feilaktig abstraksjon (2D-ledd) til en fungerende abstraksjon (2.5D dybdegeometri).

---

## 3. Juridisk og opphavsrettslig vurdering

1. **Kildebildene (`free-exercise-db`):** Er utgitt under *The Unlicense* (Public Domain). Fri til kommersiell og ikke-kommersiell bruk.
2. **Dybdeekstraksjon som transformasjon:** Å trekke ut et dybdekart via nevrale nettverk (MiDaS / DPT / DepthAnything) forkaster alle opphavsrettslig beskyttede piksler (tekstur, ansikt, belysning, klesdesign) og sitter kun igjen med rå romlig geometri.
3. **Flux.1 Dev utdata:** Lisensen til Black Forest Labs begrenser *kjøring av modellen*, ikke de resulterende pikslene (som presisert i Beslutning 48).

---

## 4. Konkret handlingsplan for å lande biblioteket

```
[ 75 øvelser × 2 faser (150 referansefotoer) ]
                    │
                    ▼
   [ MiDaS / DepthAnything Dybdeekstraksjon ]
                    │
                    ▼
   [ BiRefNet Masking med 30px myk gulvkant ]
                    │
                    ▼
[ ComfyUI Batch: 4 seeds per bilde (600 genereringer) ]
   • ControlNet Depth (styrke 0.85, end 0.50)
   • Svak OpenPose for hode/fot-ankring (styrke 0.30)
                    │
                    ▼  (~6,5 timer GPU nattkjøring)
[ Manuell 25-minutters kurateringsrunde: Velg 1 av 4 ]
                    │
                    ▼
[ 150 perfekte WebP-bilder i public/exercises/ ]
```

### Konklusjon
Bygg ferdig denne batchen. Dere er ett skript og én natts GPU-kjøring unna et komplett, høykvalitets og visuelt konsistent øvelsesbibliotek.

---

## Vårt svar tilbake: tiltakene er testet, og 85 %-påstanden holder ikke

**Målt 2026-09-02, etter revisjonen.**

### VRAM-innvendingen vår var ubegrunnet

Vi antok at to ControlNet ikke ville få plass med 1,7 GB ledig. Målt topp:
**22 736 MiB med to, mot 22 864 MiB med én.** ComfyUI deler den lastede
modellen mellom to `SetUnionControlNetType`-noder. Tiltak A er gratis i VRAM.

### Første forsøk var vår metodefeil, ikke revisorens

Vi kjørte alle tre tiltakene samtidig og endret i tillegg kontrollstyrke og
vindu — seks variabler på én gang. Resultat: **0 av 4**. To av endringene
(myk kant 12 px, maskevekst 30 px) gjeninnførte feilmoduser vi allerede hadde
målt bort: glorie og kildens rom. Betongveggen fra kildefotoets gym kom rett
tilbake.

### Ren enkeltvariabel-test: ankeret hjelper ikke

Alt tilbake til kjent godt oppsett, eneste nye er positur-ankeret (0,30) og
romlig prompt.

| Oppsett | Treff |
|---|---|
| Grunnlinje, uten anker | 1 av 3 |
| Alle tre tiltak + endrede parametre | 0 av 4 |
| **Kun anker + romlig prompt** | **1 av 4** |

Ankeret flyttet ikke treffraten. Seed 1 og 2 gir tohodede figurer med og uten
det; seed 0 virker med og uten.

### Det betyr at hypotesen vår trolig er feil

Revisor kalte symmetri-hypotesen «100 % presis og matematisk velfundert». Men
et OpenPose-skjelett gir nøyaktig den semantiske forankringen hypotesen sier
mangler — hvor hodet er og hvor føttene er — og **det endret ingenting**.

Da er forklaringen sannsynligvis en annen. Vi vet ikke hvilken.

### Én ting ble bedre

[anker-0](bilder/dybdekontroll-2026-09-02/8-anker-vellykket.png) er det beste
bildet i hele forsøksrekken: korrekt superman, bakkekontakt, vårt rom, og for
første gang **tettsittende antrekk** i stedet for kildens joggebukse. Om det
skyldes den romlige prompten eller tilfeldighet vet vi ikke — det er én
observasjon.

[anker-2](bilder/dybdekontroll-2026-09-02/9-anker-to-hoder-likevel.png) viser
feilmodusen som ikke lot seg fjerne: hode i begge ender, med ankeret aktivt.

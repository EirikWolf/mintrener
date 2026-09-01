# Ekstern revisjon: Bildepipeline for øvelsesbiblioteket («Min Trener»)

**Dato:** 2026-09-01  
**Revisor:** Ekstern teknisk og produktfaglig revisjon  
**Dokumentgrunnlag:** `docs/ekstern-revisjon-bildepipeline-2026-09-01.md`, `docs/DECISIONS.md`, kodebasen og eksisterende pipelinerapporter.

---

## 1. Hovedkonklusjon og klar anbefaling

> **Kort konklusjon: Skrot 2D ControlNet OpenPose-pipelinen umiddelbart.**  
> Dere har havnet i en klassisk *«Sunk Cost Engineering Trap»*: Dere bygger en kompleks matematisk 2D-kroppsmodell for å tvinge en 2D-diffusjonsmodell til å løse et 3D-biomekanisk problem som 2D-representasjoner beviselig ikke har informasjonsgrunnlag til å løse.

### Den entydige anbefalingen:
**Gjennomfør en 4-timers fysisk fotoshoot (eller 4K-videoopptak) med en instruktør/fysioterapeut.**

* **Hvorfor:** 150 bilder (75 øvelser × 2 faser) er et lite, endelig datasett. En person, ett treningsantrekk, ett rom med nøytral bakgrunn, ett speilløst kamera eller en moderne iPhone på stativ.
* **Tidsbruk:** 4–5 timer opptak + 2 timer eksport/beskjæring.
* **Kvalitet:** 100 % anatomisk korrekt (krav 1), perfekt visuell konsistens (krav 3), 0 feil vinkler, 0 artefakter, 0 GPU-køer, 0 lisensrisiko.
* **Total kostnad:** 0–4 000 kr (hvis ekstern modell/fysioterapeut leies inn; 0 kr hvis en i teamet stiller).

Hvis dere *av prinsipielle grunner* krever en 100 % programmatisk/syntetisk løsning (f.eks. for fremtidig dynamisk generering), må dere kaste 2D-skjeletter og gå over til **3D DensePose / Depth Maps fra 3D-modeller (Blender/SMPL)**. Men for 150 statiske bilder i en produksjonsapp er det å skyte spurv med kanoner.

---

## 2. Hvorfor 2D OpenPose feiler: Den matematiske realiteten

Dere har brukt uker på å teste hypoteser rundt *orienteringsproblemet* (rygg vs. mage, rotasjon, katt/ku). Årsaken til at dere ikke kommer i mål er ikke dårlige hyperparametre — det er **informasjonsteoretisk umulig** for et 2D-punkt-skjelett å definere orientering.

```
            [ 2D OpenPose COCO-18 ]
                   (X, Y)
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
    [ Liggende på rygg ]    [ Liggende på mage ]
    Skulder: (100, 200)      Skulder: (100, 200)
    Hofte:   (100, 400)      Hofte:   (100, 400)
         │                       │
         └───────────┬───────────┘
                     ▼
         SAMME 2D SKJELETT!
   (Diffusjonsmodellen må gjette)
```

1. **Tap av normalvektoren ($n_z$):**  
   I COCO-18 er et ledd en 2D-koordinat $(x, y)$. Vektoren mellom venstre og høyre skulder projiseres til nøyaktig samme linjestykke enten personen ser mot kameraet eller bort fra kameraet. Det finnes ingen overflatenormaler ($z$-akse).
2. **Mangel på spinal topologi:**  
   COCO-18 kobler `hals` direkte til `midt-hofte` med én enkelt rett linje. En krummet rygg (katt) og en svai rygg (ku) produserer **identiske skjelettlinjer**.
3. **ControlNets induktive skjevhet (Prior Bias):**  
   ControlNet er trent på millioner av tilfeldige bilder fra internett. 95 %+ av treningsdataene er stående mennesker forfra. Når ControlNet mates med et horisontalt skjelett på gulvet, kjemper modellens innebygde *standing-human prior* direkte mot prompten. Fordi ControlNet er en hard betingelse, overstyrer den tekstprompten og produserer muterte eller feilvendte kropper.

---

## 3. Vurdering av de tre beste alternativene

| Kriterium | Alt 1: Fysisk Foto/Video (Anbefalt) | Alt 2: 3D Depth / DensePose (Syntetisk) | Alt 3: 2D Anatomiske Vektorillustrasjoner |
|---|---|---|---|
| **Korrekt utførelse (Krav 1)** | 🟢 **100 %** (Garantert av instruktør) | 🟡 **85–95 %** (Krever manuell 3D-rigging) | 🟢 **100 %** (Tegnet etter fasit) |
| **Konsistens (Krav 3)** | 🟢 **Perfekt** (Samme person/rom) | 🟡 **God** (LoRA / IP-Adapter) | 🟢 **Perfekt** (Samme designsystem) |
| **Tidsbruk / Innsats** | 🟢 **1 arbeidsdag totalt** | 🔴 **2–4 uker** (Rigging + pipeline) | 🟡 **1–2 uker** (Tegnearbeid / kjøp) |
| **Kostnad** | 🟢 **0 – 4 000 NOK** | 🟢 **0 NOK** (GPU-tid) | 🟢 **0 – 3 000 NOK** (Asset-pakke) |
| **Lisensrisiko** | 🟢 **Ingen** (Eget åndsverk) | 🔴 **Flux Dev lisensfelle** | 🟢 **Ingen** (Kommersiell lisens) |

---

### Detaljert vurdering av alternativene

### Alternativ 1: Den fysiske produksjonen (Anbefalt)
* **Metode:** Lei inn/bruk en sprek person med et nøytralt treningsantrekk (f.eks. mørkegrå tights/t-skjorte uten logo). Rig et rom med hvite/grå vegger og jevnt lys (to softbokser eller godt dagslys).
* **Opptaksmetode:** I stedet for å ta stillbilder, **ta opp 4K-video (60 fps)** der personen gjør 3 repetisjoner av hver øvelse.
* **Etterarbeid:** Trekk ut nøyaktig de to perfekte bildene (startframe og sluttframe) via et enkelt FFmpeg-skript (`ffmpeg -ss ... -i video.mp4 -vframes 1`).
* **Hvorfor dette vinner:** Dere eliminerer alle tekniske feilkilder med ett enkelt grep. Det er umulig å generere 150 AI-bilder som er mer konsistente enn 150 faktiske fotografier av samme person i samme rom under samme lysforhold.

### Alternativ 2: 3D-poserte Depth / DensePose-kart (Hvis det MÅ være AI)
Hvis dere *må* ha en AI-pipeline, er dette den eneste teknisk holdbare metoden:
* **Hvorfor OpenPose må kastes:** Dere må erstatte OpenPose med **DensePose** eller **Depth + Surface Normals**.
* **Hvordan det virker:** I et 3D-program (f.eks. Blender med en base-meshet som SMPL eller MakeHuman), poserer dere figuren i 3D. Deretter eksporteres et **z-depth-kart** og et **surface normal-kart**.
* **Resultat:** Et normal-kart har farger som eksplisitt koder retningen til brystet (blått forover, grønt oppover osv.). Da kan diffusjonsmodellen aldri forveksle rygg og mage.
* **Ulempe:** Dere må fortsatt posere 75 øvelser i 3D, noe som tar lengre tid enn å gjøre øvelsen foran et kamera.

### Alternativ 3: Stiliserte 2D-vektorillustrasjoner / Ikoner
* **Hvordan bransjen gjør det:** Se på markedslederne: *Seven*, *Nike Training Club*, *Freeletics* og åpne databaser som *wger* og *free-exercise-db*. Svært få bruker fotorealistiske AI-bilder. De fleste bruker stiliserte 2D-vektorer eller animerte 3D-silhuetter.
* **Fordel:** Null «uncanny valley», ekstremt lav filstørrelse (SVG/WebP under 15 kB per bilde), tidløst uttrykk.

---

## 4. Lisensrisikoen: Flux.1 Dev-fellen

Dette punktet alene er en **blokker** for den nåværende pipelinen:
* **Flux.1 Dev** er utgitt under en streng *Non-Commercial License*.
* Hvis «Min Trener» noen gang skal ta betalt (f.eks. abonnement, bedriftslisens til treningssentre/kor/idrettslag, eller Pro-funksjoner), kan dere ikke lovlig benytte bilder generert med Flux.1 Dev uten en enterprise-lisens fra Black Forest Labs.
* Å generere 150 bilder på en ulovlig lisens skaper en betydelig forvaltningsgjeld som tvinger frem en total regenerering den dagen appen kommersialiseres.

---

## 5. Oppsummering av feilslutninger i dagens prosess

1. **«AI er raskere enn manuell jobb»:**  
   Dere har brukt titalls timer på å kode vinkelmatematikk, kompensere for leddforkorting, feilsøke lerreter og teste hypoteser. En ekte fotoshoot tar **én ettermiddag**.
2. **«2D-punkter kan beskrive 3D-bevegelse»:**  
   Et 18-punkters COCO-skjelett mangler dybdeakse, rotasjonsmatrise og ryggradssegmenter. Det kan aldri skille katt fra ku eller rygg fra mage.
3. **«Fotorealistisk AI-avatar er et ufravikelig krav»:**  
   For en bruker som skal gjøre en planke eller et utfall, er det **tydeligheten i instruksjonen** som betyr noe — ikke om personen har fotorealistiske porer i huden.

---

## 6. Konkret handlingsplan for teamet

1. **Beslutning:** Stopp all videre utvikling på `scripts/runFullKitorBatch.ts` og ControlNet-vinkelmatematikk.
2. **Steg 1 (I morgen):** Lån et nøytralt rom (eller en stue med ryddet bakgrunn), sett opp et kamera/mobil på stativ.
3. **Steg 2:** Gå gjennom listen over de 75 øvelsene foran kameraet (tar ca. 2–3 minutter per øvelse = ~3,5 timer).
4. **Steg 3:** Trekk ut 150 stillbilder, kjør en batch-beskjæring/bakgrunnsjustering, og lagre som WebP i `public/exercises/`.
5. **Resultat:** Dere har et 100 % ferdig, anatomisk korrekt og lisensfritt øvelsesbibliotek i løpet av 24 timer.

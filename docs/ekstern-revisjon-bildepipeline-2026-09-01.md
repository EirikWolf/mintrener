# Ekstern revisjon: bildepipeline for øvelsesbiblioteket

**Til revisor.** Du blir bedt om å vurdere en teknisk løsning vi har brukt lang tid
på og fortsatt ikke er fornøyd med. **Vi ber ikke om hjelp til å få vår løsning til
å virke.** Vi ber deg vurdere om det er riktig løsning i det hele tatt, og si fra
hvis den ikke er det. Et svar som konkluderer med «skrot dette, gjør X i stedet»
er et fullverdig svar, og trolig det mest verdifulle du kan gi oss.

---

## 1. Hva vi faktisk trenger

**Min Trener** er en norsk PWA for intervalltrening. Øvelsesbiblioteket har 75
øvelser. Hver øvelse trenger **to bilder**: startposisjon og sluttposisjon, som
til sammen viser hvordan bevegelsen utføres.

Kravene, i prioritert rekkefølge:

1. **Bildet skal vise øvelsen riktig.** En armheving i bunnposisjon skal ha bøyde
   albuer og brystet nær gulvet. Dette er det eneste kravet som er absolutt — et
   bilde som viser feil bevegelse er verre enn ingen bilde, fordi brukeren
   kopierer det.
2. **De to fasene skal være tydelig forskjellige**, fra samme kameraposisjon.
3. **Samme person i alle 150 bildene.** Samme kropp, samme ansikt, samme antrekk,
   samme rom. Biblioteket skal se ut som én fotoserie, ikke 150 løsrevne bilder.
4. Nøytral bakgrunn uten utstyr som ikke hører til øvelsen.
5. Norsk kontekst: appen er på bokmål, brukerne er nordiske.

Antall: 75 øvelser × 2 faser = **150 bilder**, og biblioteket vil vokse.

---

## 2. Hva vi har gjort, og hva vi har målt

Kort historikk, med tall der vi har dem.

### 2.1 Første forsøk: ren prompt

Flux.1 Dev fp8 lokalt, med en LoRA for personen. Ingen positurstyring — positur
beskrevet i tekst.

**Målt resultat:** en manuell gjennomgang av 28 bildepar 2026-08-31 fant at **17 av
28 ikke viste øvelsen**. Feilene var posisjonsfeil, ikke stilfeil: start og slutt
viste det samme, kameravinkelen sprikte, «bunnposisjon» ble tegnet som
startposisjon.

### 2.2 Andre forsøk: ControlNet + OpenPose-skjelett

ControlNet Union Pro 2.0 med OpenPose (COCO-18). Vi tegner skjelettene selv,
programmatisk, og bruker dem som betingelse.

Dette fungerer for **posituren**. Armhevinger, planke og knebøy kommer nå ut med
riktig kroppsstilling. Men vi har brukt betydelig tid på en kjede av feil som
alle stammer fra samme sted — at et 2D-skjelett med 18 punkter er et smalt språk:

| Problem | Årsak vi fant | Status |
|---|---|---|
| Kroppen varierte kraftig mellom bilder | Skjelettene var tegnet for hånd, ett for ett. Målt: underarm varierte **2,20×**, lår **3,20×**, torso **1,45×** | Løst — felles kroppsmodell, positurer oppgitt som vinkler |
| Håndledd lå 122 px under ankelen i planke | Ingen sjekk på at kontaktpunkter deler gulvlinje | Løst |
| Liggende øvelser ble tolket som sittende | Skjelett brukte 4 % av lerretets høyde | Løst — lerret velges av posituren |
| Hodet/hendene ble kuttet | COCO-18 markerer ledd, ikke ytterpunkter. Øverste ledd er øyet, ikke issen | Løst — marg rundt skjelettet |
| Brede hofter, smale skuldre — kun forfra | `halvHofte` satt fra bi-trokantær bredde i stedet for hofteleddsenter. Forhold 1,32 der 1,8 er riktig | Løst |
| **Kroppsorientering kan ikke uttrykkes** | Et 2D-skjelett kan ikke skille «liggende på magen» fra «liggende på ryggen», eller vise at skuldrene har rotert bort fra hoftene | **Ikke løst** |
| **Ryggkrumning kan ikke uttrykkes** | COCO-18 har ingen ledd i ryggen. Katt/ku-forskjellen måtte bæres av bekkenvipp og hodevinkel | Delvis omgått |
| **Stående ryggvri leser ikke som en vridning** | Samme grunn: rotasjon om kroppsaksen er usynlig i 2D | **Ikke løst** |

Vi har testet og **avkreftet** fire selvstendige hypoteser om orienteringsfeilen
(kontrollvindu, kontrollstyrke, lerretsorientering, ansiktspunkter), hver med en
tro gjengivelse av `draw_bodypose`. Konklusjonen er at et 2D OpenPose-skjelett
ikke KAN uttrykke kroppsorientering, og at ControlNet overstyrer en korrekt
prompt ved arbeidsstyrker.

### 2.3 Målinger som kan være nyttige for deg

- **LoRA-styrke 0,75 mot 1,0**, samme seed og samme skjelett: forskjellen er
  liten. Posituren er identisk — ControlNet dominerer. Vi bruker 0,75.
- **Prompten taper mot ControlNet på positur**, men vinner på antrekk og rom når
  fargen navngis eksplisitt per plagg («matching» er en relasjon modellen kan
  oppfylle med hvilken som helst farge).
- **cfg 1.0 i Flux gjør negativ prompt helt virkningsløs.** Vi hadde en periode
  der vi trodde vi styrte noe med den.
- Generering: ca. 55 s per bilde ved 24 steg, 896×1152.

---

## 3. Hva vi vil at du skal vurdere

**Hovedspørsmålet:** Er programmatisk generering med ControlNet riktig verktøy
for 150 instruksjonsbilder der korrekt kroppsstilling er ufravikelig?

Vi ber deg spesielt vurdere alternativer vi kanskje har avvist for lett, eller
aldri vurdert:

**a) Andre kontrollmetoder enn 2D-skjelett.** Depth maps, normal maps, 3D-posering
(SMPL, Blender, MakeHuman, Mixamo) rendret til kontrollbilde, IP-Adapter,
img2img fra en 3D-render. Særlig: løser noen av disse orienteringsproblemet vi
ikke kommer forbi?

**b) Andre modeller.** Vi kjører Flux.1 Dev fp8 lokalt på én RTX 3090 (24 GB).
Qwen-Image, SDXL med bedre ControlNet-økosystem, SD3.5, eller
kommersielle API-er. Er det en modell som følger positurinstruksjoner i tekst
godt nok til at vi kan droppe ControlNet?

**c) Ikke generere i det hele tatt.** Vi har ikke seriøst vurdert:
   - Lisensiert stockfoto eller video (Adobe Stock, Getty, spesialiserte
     treningsbibliotek)
   - Åpne datasett (`free-exercise-db`, `wger`) — vi har brukt dem som
     posisjonsreferanse, men ikke som bildekilde
   - Å fotografere en ekte person én dag, med ett antrekk og ett rom
   - Å hente inn en illustratør — strektegninger eller enkle illustrasjoner er
     vanlig i treningsapper og har et krav mindre å bryte (fotorealisme)
   - Animasjon/video i stedet for to stillbilder

   **Vurder disse på alvor.** 150 bilder er en dagsjobb for en fotograf. Vi har
   brukt vesentlig mer enn en dag på pipelinen.

**d) Hybrid.** Generert for det som fungerer, noe annet for det som ikke gjør det
(liggende øvelser, rotasjoner, ryggkrumning).

**e) Om kravene våre er riktige.** Er «samme person i alle 150» verdt prisen? Ville
strektegning eller silhuett formidlet øvelsen like godt eller bedre? Er
fotorealisme et krav vi har satt uten å begrunne det?

---

## 4. Rammer du må regne med

- **Maskinvare:** én RTX 3090, 24 GB VRAM, delt med andre prosjekter. En jobb må
  reservere GPU-en via en arbiter og kan stå i kø.
- **Lisens:** Flux.1 Dev har ikke-kommersiell lisens. Appen er foreløpig ikke
  kommersiell, men **vurder lisens i svaret ditt** — det er en risiko vi bærer.
- **Budsjett:** ikke null, men lite. Et forslag som koster penger må si omtrent
  hvor mye.
- **Kompetanse:** vi kan kode, og har bygget hele pipelinen selv. Vi er ikke
  fotografer eller illustratører.
- **Personvern/GDPR:** en ekte modell på foto krever samtykke og avtale. Regn det
  inn hvis du foreslår fotografering.

---

## 5. Hva vi vil ha tilbake

1. **En anbefaling, ikke en meny.** Hvis du mener vi bør bytte spor, si det rett
   ut og si hvorfor.
2. **Begrunnelse med tall der det finnes.** Kostnad, tid, hvor godt det løser
   kravet i punkt 1.
3. **De to eller tre beste alternativene**, med hva som taler mot dem.
4. **Konkret om orienteringsproblemet:** finnes det en kjent, dokumentert løsning
   på at 2D-posestyring ikke kan uttrykke kroppsorientering? Vi vil gjerne vite om
   vi har oversett noe åpenbart.
5. **Si fra hvis noe i beskrivelsen vår er feil eller uklart.** Vi har vært nær
   dette lenge og kan ha antatt ting vi ikke har verifisert.

**Vi vil helst bli motsagt.** Om det riktige svaret er at vi har brukt uker på feil
problem, er det den mest verdifulle tilbakemeldingen vi kan få.

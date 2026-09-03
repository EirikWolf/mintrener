# Vision-gjennomgang av øvelsesbildene

**Dato:** 2026-08-31 · **Metode:** alle 28 bildepar satt sammen side ved side og vurdert visuelt, deretter sjekket mot øvelsens `instruks` og `bildePrompt` i katalogen. Supplert med md5-sammenligning og opptelling mot programdata.

---

## 1. Dekning

| Område | Status |
|---|---|
| Alle 28 bildepar sett og vurdert | ✅ 28 av 28 |
| Sammenlignet mot øvelsens instruks og prompt | ✅ |
| Duplikatsjekk (md5 på alle 56 filer) | ✅ |
| Dekning mot programkatalogen | ✅ |
| Rotårsak i genereringspipelinen | ✅ |
| Bildekvalitet på ekte telefon | ❌ ikke vurdert — krever fysisk enhet |

Venstre bilde i hvert par er fase 0 (start), høyre er fase 1 (slutt). Det er slik appen viser dem.

> **Rettet etter første utkast.** Jeg konkluderte først fra koden alene og skrev at free-exercise-db ikke finnes i repoet, og at den tomme negative prompten var en rotårsak. Begge deler var feil: datasettet står fem steder i dokumentasjonen, og vedlegg A spesifiserer allerede hele løsningen på posisjonsproblemet. Negativ prompt er dessuten inaktiv ved cfg 1,0. Seksjon 6, 7 og 9 er skrevet om.

---

## 2. Den ene innsikten

> **Stilprompten og posisjonsprompten ber om to ting som ikke kan være sanne samtidig. Stilen vinner hver gang.**

`ASTRID_FLUX_BASE_STYLE` ([imagePromptService.ts:7](../src/services/imagePromptService.ts)) krever *«warm confident encouraging smile, radiant workout energy, joy of training»*. Øvelsesprompten krever f.eks. *«captured strictly from side profile … hovering 2 inches above the gym floor at the lowest point of a push-up»*.

Et smil mot kameraet og en streng sideprofil utelukker hverandre. Det samme gjør «radiant joy» og bunnpunktet av en armheving. Modellen løser konflikten ved å prioritere ansiktet — og det er nøyaktig det du ser: **fase 1 av armhevinger er en smilende kvinne med strake armer, ikke en senket brystkasse.**

Dette forklarer ikke bare armhevingene. Det forklarer hvorfor nesten alle sluttbildene viser en person som ser i kamera i stedet for øvelsen.

---

## 3. Resultatet, par for par

**4 av 28 er brukbare. 7 er delvis brukbare. 17 viser ikke øvelsen.**

### ✅ Brukbare (4)

| Øvelse | Vurdering |
|---|---|
| **Knebøy** | Riktig start og bunnposisjon, bevegelsen er lesbar. Ulikt rom mellom bildene |
| **Sprellmenn** | Riktig start og stjerneposisjon. Startbildet er beskåret over knærne — føttene er halve øvelsen |
| **Skulderpress (manualer)** | Riktig start ved skulder og strake armer over hodet |
| **Sittende marsj** | Bevegelsen er lesbar. Men modellen er en ung, atletisk kvinne i sports-bh — for en seniorprofil er det feil målgruppe |

### 🟡 Delvis (7)

| Øvelse | Hva som mangler |
|---|---|
| **Burpees** | To gyldige faser, men «start» burde vært stående. Enorm forskjell i bildeutsnitt: venstre er nærbilde av overkropp, høyre er helfigur langt unna |
| **Verdens beste tøyeøvelse** | Utfallsposisjonen er riktig i begge, men rotasjonen som definerer øvelsen mangler |
| **Utfall forover** | Sluttbildet er riktig. Startbildet er beskåret over knærne — for et utfall er beina hele øvelsen |
| **Goblet squat** | Start riktig. I slutt står kettlebellen **på gulvet** og hun bøyer seg etter den — det er et markløft-oppsett, ikke bunnen av en goblet squat |
| **Kettlebell press** | Retningen er lesbar, men grepet er feil i start (bellen henger i hornet) og hun bruker to hender i slutt |
| **Skulder-dislocates** | Slutt er omtrent riktig. I start holdes staven **loddrett med én hånd** — den skal være vannrett med bredt grep |
| **Kettlebell row** | Start plausibel. I slutt står hun rett opp, og kameraet har flyttet seg 180° bak henne |

### 🔴 Viser ikke øvelsen (17)

| Øvelse | Hva bildene faktisk viser |
|---|---|
| **Armhevinger** | Fase 1 viser strake armer og et smil mot kamera, ikke bunnposisjon. Ulik person, ulikt rom, ulik vinkel. Ingen av dem er sideprofil |
| **Mountain climbers** | Samme høye planke i begge. Kneet er aldri trukket opp mot brystet |
| **Rygghev (Superman)** | Venstre er underarmsplanke på knær. Høyre er oppreist på alle fire. **Ingen av dem er superman** |
| **Høye kneløft** | Ingen av bildene har et løftet kne. Høyre sparker beinet bakover |
| **Hulekroppshold** | Venstre er en planke. Høyre er en kvinne som **fikser håret** — ingen øvelse i det hele tatt |
| **Katt-ku** | Samme posisjon i begge, ingen krum «katt». Hun står på tær, ikke knær — det gjør det til en planke |
| **Planke** | Samme høye planke i begge, og øvelsen er underarmsplanke |
| **Sideplanke** | Ikke en sideplanke: hoften ligger i gulvet, armen er bak hodet |
| **Sideplanke høyre** | **Byte-identisk med Sideplanke** |
| **Sideplanke venstre** | **Byte-identisk med Sideplanke** |
| **Dips på stol** | Venstre er en skrå armheving. Ingen av dem er en dip |
| **Skøytehopp** | Høyre er et boks-hopp rett forover. Sidebevegelsen som definerer øvelsen mangler, og frontvinkelen er den dårligste for å vise den |
| **Rumensk markløft** | Venstre er en bicepscurl. Høyre er et dypt markløft **med krum rygg** |
| **Hofteåpner 90-90** | Venstre er en bred sittende posisjon, høyre er på alle fire. Ingen av dem er 90-90 |
| **Manualpress bryst** | Høyre viser en **vektstang i et stativ**, sittende. Feil utstyr og feil øvelse |
| **Kettlebell swing** | Venstre er ettháands-hold lavt, høyre er en rack-posisjon ved skulderen. Ingen svingbevegelse |
| **Kettlebell halo** | Ingen av bildene har bellen rundt hodet. Høyre er en knebøy ned mot gulvet |

**Én av disse er verre enn de andre:** rumensk markløft viser en løft med tydelig krum rygg. Vi lærer bort nøyaktig den feilen øvelsens egen `vanligeFeil`-liste advarer mot. For en nybegynner er det ikke bare ubrukelig — det er skadelig.

---

## 4. Seks filer er samme bilde

md5 over alle 56 filer:

```
6 identiske:  sideplanke-0.png  sideplanke-1.png
              sideplanke-hoyre-0.png  sideplanke-hoyre-1.png
              sideplanke-venstre-0.png  sideplanke-venstre-1.png
```

51 unike bilder av 56 filer. Konsekvensen er dobbel:

- **Fase-velgeren gir ingenting.** Trykker du «Fase 2», får du samme bilde.
- **Høyre og venstre er identiske**, selv om den ene skal være speilvendt. Bildet er aktivt feil for én av sidene.

---

## 5. Halvparten av øvelsene har ingen bilder

| | |
|---|---|
| Øvelser i katalogen | **74** |
| Med bildepar | **28** |
| Referert fra programmer og utfordringer | 71 |
| **I bruk, men uten bilde** | **46** |

Blant dem: pull-ups, kneliggende armhevinger, vegg-armhevinger, alle fem pusteøvelsene, alle balanseøvelsene, og hele det sittende senior-repertoaret.

Det betyr at nybegynner-progresjonene — vegg → pult → kne → gulv — er akkurat det som mangler bilder, mens de avanserte variantene har dem.

**Og et signal som er ødelagt:** `bildeStatus` står som `'mangler'` for **alle 74**, også de 28 som har bilder. Feltet kan ikke brukes til å se hva som gjenstår. Det var trolig ment som styring av nettopp denne jobben.

---

## 6. Rotårsakene, i koden

**Den viktigste først: den dokumenterte pipelinen ble aldri bygget.**

[`vedlegg-a-bildepipeline.md`](vedlegg-a-bildepipeline.md) § A.6 sier det rett ut:

> «Positurstyring med ControlNet er det som gjorde at hip-hinge-svingen ble riktig etter å ha feilet i **begge prompt-baserte batcher**. Uten skjelett er posisjonen upålitelig.»

Vedlegget spesifiserer ControlNet Union Pro 2.0 med OpenPose, `DWPreprocessor`, skjelett i 896×1152, styrke 0,9, og to kilder til skjeletter: referansefoto (der free-exercise-db er nevnt) eller programmatisk tegnede COCO-18-skjeletter.

Workflowen vi faktisk kjører — `buildAstridFluxWorkflow` — inneholder **ingen ControlNet-node og ingen preprosessor**:

```
UNETLoader → DualCLIPLoader → VAELoader → LoraLoaderModelOnly
→ CLIPTextEncode → EmptyLatentImage → FluxGuidance → KSampler → VAEDecode → SaveImage
```

Null treff på `ControlNet`, `DWPreprocessor` og `openpose` i både `imagePromptService.ts` og `runFullKitorBatch.ts`.

Alle 28 parene er altså generert med nøyaktig den prompt-baserte metoden vedlegget hadde konkludert med at ikke virker. Det forklarer hvorfor feilene er *posisjonsfeil* og ikke stilfeil.

**Tre mekaniske årsaker i tillegg:**

**1. Hver fase får sin egen seed.**
[`runFullKitorBatch.ts:239`](../scripts/runFullKitorBatch.ts): `const seed = 200 + total * 888;` — `total` er en løpende teller. Fase 0 og fase 1 av samme øvelse genereres uavhengig, med ulik seed. Det er den mekaniske grunnen til ulik person, ulikt rom og ulik kameravinkel.

**2. Stilen overstyrer posisjonen.** Se § 2. Smilet mot kamera vinner over sideprofilen.

**3. «full body shot completely visible within frame» håndheves ikke.**
Kravet står i stilprompten, men flere startbilder er beskåret over knærne. Ingenting verifiserer resultatet etter generering — og for et utfall eller sprellmenn er beina hele poenget.

**En ting som IKKE er en årsak:** den tomme negative prompten (`negativePrompt: ''`). Workflowen kjører KSampler med `cfg: 1.0`, og vedlegg A § A.4 slår fast at negativ prompt da er fullstendig inaktiv — alt må sies positivt. Feltet er dødt uansett hva vi skriver i det.

## 7. Om free-exercise-db

Du spurte om vi bruker den, og om vi har husket at sluttposisjonen ligger bak et klikk på startbildet.

**Ingen av bildene kommer derfra.** Alle 56 er generert lokalt med Flux.1 Dev + Astrid-LoRA gjennom ComfyUI på kitor. Ingen kode henter fra datasettet.

**Men den står i planen vår.** Fem steder i dokumentasjonen: spesifikasjonen kapittel 3 foreslår den som kryssjekk for øvelseskatalogen, og vedlegg A § A.6 navngir den som kilde til **referansefoto for ControlNet-skjeletter** — altså nøyaktig det som mangler i § 6.

Poenget ditt om klikket er derfor fortsatt viktig, bare på et annet sted i kjeden enn du trodde: når vi henter referansefoto derfra for å lage skjeletter, må vi faktisk hente *begge* posisjonene. Gjør vi ikke det, får vi skjelett for startposisjonen to ganger — og da produserer vi den samme feilen på nytt, med dyrere maskineri.

## 8. Bildevekt

10,5 MB i 56 PNG-filer, snitt 193 KB, 896×1152 piksler. De er `loading="lazy"` ([ExerciseIllustration.tsx:161](../src/components/exercises/ExerciseIllustration.tsx)), så de blokkerer ikke førstelasting.

Men PNG i den oppløsningen er 3–4 ganger større enn nødvendig på en telefon. WebP i 600×772 ville kuttet det til under 3 MB. Det er ikke haster nå, men det bør ligge i samme runde som regenereringen — ellers gjør vi jobben to ganger.

---

## 9. Hva jeg foreslår

**Rekkefølgen er viktigere enn listen.** Å regenerere før pipelinen er rettet gir de samme feilene på nytt.

### Først: bygg pipelinen som allerede er spesifisert (ingen bilder genereres)

1. **Innfør ControlNet + OpenPose** slik vedlegg A § A.6 beskriver. Dette er hovedgrepet — uten skjelett er posisjonen upålitelig, og det er allerede verifisert på kitor. Skjeletter fra referansefoto der vi har dem, ellers programmatisk tegnede COCO-18 i 896×1152.
2. **Del seed per øvelse, ikke per bilde,** så start og slutt viser samme person i samme rom.
3. **Fjern smilet fra stilprompten** for fase-bilder. «Warm confident encouraging smile» hører hjemme på et forsidebilde, ikke i en instruksjon. Dette er den billigste enkeltendringen.
4. **Gjør `bildeStatus` sann.** Den skal si `ok`, `må-regenereres` eller `mangler` per øvelse — og settes av kuratoren, ikke av en standardverdi.

Merk at punkt 1 er en større jobb enn de tre andre til sammen. Men uten den regenererer vi med samme metode som allerede har feilet tre ganger: to batcher før vedlegget ble skrevet, og disse 28 parene etterpå.

### Så: kuratorsiden

Nå vet vi hva den skal gjøre, og det er noe annet enn å bla i bilder:

- **Vis paret side ved side** — feilen er nesten alltid i forholdet mellom bildene, ikke i ett av dem
- **Vis instruksen ved siden av** — «viser dette det instruksen sier?» er spørsmålet
- **Tre knapper: godkjent / regenerer / feil øvelse** — som skriver `bildeStatus`
- **Rediger prompten i samme skjerm** og send jobben til kitor
- **Vis de 46 uten bilder i samme kø** — de skal ikke være en separat liste

### Til slutt: regenerer

Prioritert etter hva nybegynnere møter først: armhevinger og progresjonene (vegg → pult → kne), planke og sideplanke, knebøy-progresjonene, og de sittende senior-øvelsene.

De 17 som ikke viser øvelsen bør regenereres uansett. De 7 delvise kan vente. De 4 brukbare bør stå.

---

## 10. Ett spørsmål tilbake til deg

Alle bildene viser samme person: ung, atletisk, i sports-bh, i et treningsstudio.

For «Kontor & Hjemmekontor» lover vi *«ingen svette eller klesskift»* — og illustrerer det med en person i treningstøy i et gym. For «Senior & Sittende» viser vi en 25-åring i sports-bh.

Det er ikke en bildefeil, det er et valg om hvem appen er for. Og det bør avgjøres før vi regenererer 40+ bilder, ikke etter.

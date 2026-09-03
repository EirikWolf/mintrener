# Revisjon B1 — Produksjon, medier og lisens: funn

**Objekt:** Min Trener, prod i synk med main (`0402544` + docs-commits)
**Dato:** 2026-08-30
**Metode:** kildelesing. Kapasitets- og lisenspåstander etterprøvd mot `homelab-vault/02-Tjenester/AI/` og mot filsystemet på kitor — ikke mot hukommelse, og ikke mot bestillingens egen tabell.

---

## 0. Dekning

**Dekket med verifisert grunnlag:** Del 1 (bevegelse), Del 2 (stemme — produksjonslinje og arkitektur), Del 3 (den tekniske realitetssjekken), kildekritikk.

**Ikke besvart, med vilje:** hvordan de fire stemmene *låter*. Jeg kan ikke spille av lyd. Bestillingen sier at jeg da ikke skal vurdere det, og det gjør jeg ikke.

**Ikke besvart, enhetsavhengig:** hvorvidt lydfokus, autoplay og bakgrunnsatferd fungerer i praksis på iPhone og Android. Se § 4 — jeg har besvart det som *kan* avgjøres fra kilden, og latt resten stå åpent med angivelse av hva slags utstyr som kreves.

---

## 1. Sammendrag

### Den viktigste innsikten

**Dempingstjenesten demper ingenting.** Del 3 bygger på premisset at appen «har en dempingstjeneste som senker volum til 25 %». Tjenesten finnes, men:

```js
document.querySelectorAll('audio[data-background-music], video[data-background-music]')
```

Ingen elementer i appen har `data-background-music`. Det finnes **ingen `<audio>`- eller `<video>`-elementer i JSX i det hele tatt** — stemmen spilles gjennom Web Audio (`audioBufferEngine`), ikke media-elementer.

Tjenesten kjører altså mot en tom NodeList hver eneste gang. Den har refcount, par-balansert duck/unduck på tvers av kjeder, og sender `audio-duck-changed`-hendelser — og påvirker null elementer. Den demper ikke engang appens egen stemme.

Det endrer Del 3 fra «hvordan bygger vi videre på dempingen vi har» til «vi har ingen demping, og bør avgjøre om vi trenger den».

### Faglige motsetninger

**Kvalitet mot kostnad — kostnad tapte hos naboen.** SynthIQ byttet 2026-08-11 fra LTX (70 s per 5-sekundsklipp) til Wan 2.2 14B + Turbo (195–256 s) — tre ganger tregere, valgt med vilje (ADR-0043). Når noen med samme maskin og samme klipplengde faktisk måtte velge, vant kvaliteten. *Hva som avgjør for oss:* om bevegelsen skal være instruktiv (artefakter er dyre) eller bare antydende (de kan aksepteres).

**Åpenhet mot lisens — og den ene modellen som kunne løst alt er ulest, ikke forbudt.** Se § 3.

**Presisjon mot dekning.** Positur-utledning gir juridisk rene bilder og skalerer til 80+ øvelser. Men en generert kropp i en utledet positur kan vise *anatomisk* riktig bevegelse og likevel *treningsfaglig* feil detalj — knevinkel, ryggstilling. En video som viser feil utførelse er verre enn et bilde som viser riktig. *Hva som avgjør:* om noen med fysioterapifaglig kompetanse godkjenner per øvelse. Uten det leddet skalerer produksjonen raskere enn kvalitetssikringen.

---

## 2. Bevegelse

### Verifiserte tall

Fra `ComfyUI-Video.md`, målt 2026-08-03/07, samme ankere og bevegelsesprompt, 81 frames:

| Modell | Tid / 5s-klipp | Lyd | Status |
|---|---:|---|---|
| LTX 13B 0.9.8 distilled fp8 | **70 s** | nei | Rollback-kandidat |
| HunyuanVideo 1.5 480p i2v | 166–175 s | nei | Testet, ubrukt |
| **Wan 2.2 i2v 14B + Turbo** | **195–256 s** | nei | SynthIQ-produksjon fra 11.08 |
| Wan 2.2 i2v 14B uten Turbo | 1437 s | nei | Ikke levedyktig |
| MiniMax H3 | 357–385 s | **ja** | Lisens uavklart, se § 3 |

### Filstørrelsen avgjør, ikke GPU-tiden

Ved 80 øvelser er GPU-kostnaden 1,6 t (LTX) til 5 t (Wan Turbo). Det er håndterbart på en delt maskin.

Men installasjonskostnaden ble presset fra 90 MB til 1,5 MB. Et 5-sekundsklipp i brukbar kvalitet er typisk 0,5–2 MB. **Åtti klipp er 40–160 MB — tjuefem til hundre ganger hele dagens installasjon.**

Video kan derfor ikke pakkes med appen. Den må strømmes. Og da bryter den offline-løftet.

### Alternativene

| Alternativ | GPU | Byte | Lisens | Redigerbarhet | Presisjon |
|---|---:|---:|---|---|---|
| **Kryssing mellom de to bildene** | 0 | 0 | arves fra bildene | Rett bildet → rettet | Middels — viser retning, ikke bane |
| Mellomposisjoner som sekvens | ~3 bilder/øvelse | ~3,6 MB/øvelse | som over | God | God |
| AI-video fra stillbilder | 1,6–5 t | 40–160 MB | modellavhengig | Regenerering | Uforutsigbar |
| Ekte opptak | 0 GPU, mye tid | stort | ren, men krever modell/avtale | Nyopptak | Best |
| Vektor / rigget 3D | 0 GPU, mye tid | **lite** | ren | **Best** — parametrisk | Best kontrollerbar |

### Anbefaling

**Bygg kryssingen først.** Den står i spesifikasjonen, er aldri bygget, koster null GPU og null nye byte, og er trivielt redigerbar. Den svarer på det de fleste øvelseskort trenger: hvilken vei går bevegelsen.

**Video: ja i biblioteket, aldri under økten.** Under en økt konkurrerer alt om samme oppmerksomhet, og løftet er «én hånd, ett blikk». En løkke i bakgrunnen stjeler blikket fra nedtellingen. I biblioteket er strømming greit, fordi biblioteket ikke er offline-kritisk. Det løser filstørrelsen ved å flytte problemet dit det ikke er et problem.

**Vektor/rigg fortjener en seriøs vurdering** som bestillingen nevner men ingen har regnet på. Den er den eneste med *lite* filstørrelse og *best* redigerbarhet samtidig, og en rigget figur kan gjenbrukes på tvers av alle 80 øvelser. Kostnaden er mennesketid foran, ikke GPU-tid.

**Kildestrategi:** positur-utledning (vedlegg A) er den eneste jeg vil anbefale for å komme fra 25 til 80+. Å kjøre andres foto gjennom en generativ modell gir et bearbeidet verk der kildens lisens kan følge med; å utlede kun leddkoordinater gjør det ikke, fordi et skjelett ikke bærer gjenkjennbart innhold fra originalen.

**Hva må være sant:** at kryssing leser som bevegelse for de 25 øvelsene vi har. Test på fem før dere bygger for alle.
**Hva ville fått meg til å ombestemme meg:** hvis H3-lisensen avklares i vår favør, endres regnestykket — lyd i samme pass fjerner et helt produksjonsledd.

---

## 3. Lisens — H3 er ulest, ikke forbudt

Bestillingen er rettet, og rettelsen var riktig. `ComfyUI-Video.md` sier:

> Territorie-klausulen i MiniMax Community License ekskluderer USA, EU, Storbritannia og Korea. **Norge er EØS, ikke EU, og det er ikke avklart hvilken side vi havner på.**
> Fri bruk gjelder ellers ikke-kommersielt, og kommersielt for virksomheter under 20 millioner dollar omsetning, med attribusjonskrav. Attribusjonsformen — dokumentasjon, synlig vannmerke eller metadata — er ikke verifisert mot lisensteksten.

Beslutningen (SynthIQ-eier, 2026-08-04) er internt bruk *inntil dette er avklart*. Det er en pause, ikke en dom.

**Ja — én dag med lisenstekst er verdt det, og jeg sier det tydelig fordi det påvirker hele videovalget.**

Tre spørsmål må besvares, og alle tre er lesearbeid:
1. Omfatter «EU» i klausulen EØS? Dette er det avgjørende, og det er et definisjonsspørsmål i lisensteksten, ikke et juridisk skjønnsspørsmål.
2. Hva er akseptabel attribusjonsform?
3. Gjelder 20-MUSD-terskelen ved brukstidspunkt eller ved publisering?

Er svaret på (1) at EØS faller utenfor eksklusjonen, er H3 den eneste modellen som gir video **og** lyd i ett pass, under en lisens som tillater kommersiell bruk i vår størrelsesorden. Det er en helt annen produksjonslinje enn den vi planlegger nå.

**Flux.1-dev** er ikke-kommersiell og bevisst valgt, dokumentert som kjent kostnad. Men det er en gjeld uten forfallsdato. **Ta beslutningen om regenerering før biblioteket vokser fra 25 til 80** — regningen firedobles med bibliotekstørrelsen.

---

## 4. Lydbilde

### Hva jeg kan avgjøre fra kilden

**Dempingstjenesten demper ingenting i dag** (se § 1). Verifisert: null forekomster av `data-background-music` utenfor tjenesten selv, og null `<audio>`/`<video>`-elementer i JSX.

Det betyr at bestillingens premiss — «den demper `<audio>`- og `<video>`-elementer på appens egen side» — er teknisk korrekt om hva koden *ville* gjort, og praktisk tomt om hva den *gjør*.

**Konsekvens for planlegging:** dere har ikke en dempingsevne å bygge videre på. Dere har et stykke kode som er klart til å brukes den dagen noe faktisk spiller musikk i appen. Det er ikke verdiløst, men det er heller ikke et fundament.

### Hva jeg ikke kan avgjøre — og hva som skal til

Dette krever fysiske enheter, og jeg lar det stå ubesvart:

| Spørsmål | Utstyr som kreves |
|---|---|
| Kan en PWA påvirke lyd fra en annen app? | iPhone (Safari) + Android (Chrome), begge med Spotify installert |
| Er OS-lydfokus tilgjengelig for en PWA? | Samme, med lydfokus-logging |
| Suspenderes lydkonteksten ved skjermlås på iOS? | iPhone, installert på hjemskjerm |
| Spotify Web Playback SDK — hva kreves reelt? | Premium-konto + begge plattformer |

Jeg vil ikke gjengi API-dokumentasjon som om det var måling. Bestillingens egen regel gjelder: en lærebokgjengivelse ser ut som et funn og blir behandlet som ett.

### Anbefalingen som ikke krever noen av delene

Bestillingen foreslår selv alternativet, og jeg mener det er riktig svar: **gjør stemmen tydelig nok til å bære gjennom musikk som spiller.** Kortere replikker, et kort signal før tale, plassering i frekvensbildet.

Det krever ingen integrasjon, ingen native innpakning, ingen tredjepartsavtale, og ingen tillatelser. Det virker mot Spotify, YouTube Music, podkast, radio og brukerens egne filer — fordi det ikke bryr seg om hva som spiller.

**Og det bør gjøres først uansett**, fordi selv en vellykket Spotify-integrasjon bare dekker Spotify-brukere på støttede plattformer.

**Hva må være sant:** at stemmeklippene faktisk er hørbare over musikk på typisk avspillingsnivå. Det kan testes med et par klipp og en telefon — langt billigere enn integrasjonen.

---

## 5. Stemme

### Dagens produksjonslinje

Fra `scripts/voicebank-manuskript.json`: fire personaer (`haugesund`, `romsdal`, `hardcore`, `boyband`), **fem generiske klipp hver**, og **25 øvelsesnavn**.

Det gir 4 × 5 + 4 × 25 = 120 klipp. Bestillingen sier ~38 klipp per stemme og ~150 totalt — tallene henger sammen hvis øvelsesnavnene telles per persona, men manuskriptets struktur viser at **generisk coaching er fem replikker per stemme**. Det er kjernen i treffsikkerhetsproblemet.

### Skaleringsbremsen er reell og asymmetrisk

Fra 25 til 80 øvelser: **220 nye navneklipp** (4 personaer × 55 øvelser). Coachingen vokser ikke i det hele tatt — den er fem replikker uansett.

**Derfor bør navn og coaching produseres på ulike måter.** Navn er kort, forutsigbar, høyfrekvent nyproduksjon. Coaching er få, lange, sjeldent endrede klipp der stemmekarakteren betyr alt. Å behandle dem likt gjør at hver nye øvelse koster en produksjonsrunde i fire stemmer.

### Lisensproblemet, og at løsningen finnes lokalt

Seedene kom fra Suno. Lisensgrunnlaget for kommersiell bruk og videredistribusjon er uavklart, **og kildesporene ligger i et offentlig kodelager**. Det siste er verre enn det første: en uavklart lisens kan avklares, men et publisert spor kan ikke upubliseres.

Hele kjeden finnes lokalt: MiniMax Music 3 (apache-2.0, i drift hos Tonefall), Demucs for stem-separasjon, Chatterbox for kloning. **Anbefaling: produser nye seeds lokalt.** Det løser lisensspørsmålet ved roten framfor å avklare det.

**Hva må være sant:** at lokalt produserte seeds gir stemmer som holder kvalitetsmessig. Det kan jeg ikke vurdere — jeg kan ikke høre. Én person med hodetelefoner og en time avgjør det.

### Kontekstbevisst coaching — minste steg

Systemet vet hvilken *fase* du er i, men ikke hvor i programmet du er. En ekte trener sier ikke det samme i runde én som i siste runde av åtte.

**Minste steg:** eksponér tre variabler til lydlaget — `runde av totalt`, `gjenstående tid i økten`, `forrige økts vurdering`. Bruk dem til å *velge mellom klipp som allerede finnes*, ikke til å generere nye. Fem generiske klipp valgt kontekstuelt oppleves som langt mer enn fem klipp spilt i tilfeldig rekkefølge.

Det krever null nye klipp og null modell.

**Motspørsmålet, som fortjener et ærlig svar:** gjør mer coaching produktet bedre? Ikke nødvendigvis. Hyppige tilrop kan forstyrre konsentrasjonen om teknikk, særlig for nybegynnere som trenger å tenke på utførelsen. Jeg vil heller ha **færre, riktigere** replikker enn flere. Kontekstbevissthet er ikke mer prat — det er at praten treffer.

---

## 6. Kildekritikk

### LTX-motsigelsen — avgjort

Bestillingen ba meg avgjøre om det er to varianter eller én feil. **Det er én feil.**

Bevis: det finnes nøyaktig én LTX-modellfil på kitor.

```
/srv/kitor/models/comfyui/checkpoints/ltxv-13b-0.9.8-distilled-fp8.safetensors
```

Ingen annen LTX-variant er installert. Benchmarken skriver «LTX 13B 0.9.8» og katalogen «LTX-Video 13B 0.9.8 distilled fp8» — **samme fil, ulikt navn**.

**Hvilket tall gjelder:** 70 s, fra `ComfyUI-Video.md`. Tre grunner:
1. Den oppgir målemetode («samme ankere, samme bevegelsesprompt, 81 frames, målt 2026-08-03/07»). Katalogen oppgir ingen.
2. Den er benchmark-dokumentet; katalogen er en oppsummering.
3. ~4 s per 5-sekundsklipp er ikke fysisk plausibelt for en 13B diffusjonsmodell på én RTX 3090. Det ville vært raskere enn sanntid.

**Katalogen bør rettes.** Den er flåtens oppslagsverk — andre prosjekter regner med tallene der, og et 17× avvik i favør av «raskere enn den er» fører til feilplanlegging.

> Jeg tok nesten feil her selv. I forrige revisjon skrev jeg at katalogen løy, uten å ha sjekket om det fantes to varianter. Bestillingens innvending var berettiget; konklusjonen holdt bare fordi filsystemet bekreftet den.

### Andre avvik funnet

**Dempingstjenesten beskrives som en evne appen har.** Den finnes i tre bestillinger og i prosjektets egen forståelse, men den påvirker ingenting. Dokumentasjonen bør si at den er forberedt, ikke i bruk.

**Klipptellingen spriker.** Bestillingen sier «~38 klipp per stemme, ~150 totalt». Manuskriptet har fem generiske per persona og 25 øvelsesnavn. Tallene kan forsones, men de skjuler den viktigste strukturen: coaching og navn skalerer helt ulikt.

**H3-lisensen ble forenklet i tjenestekatalogen** til «kun interne eksperimenter», mens benchmark-dokumentet har hele nyansen med EØS-spørsmålet og 20-MUSD-terskelen. Forenklingen forplantet seg inn i den opprinnelige bestillingen. Samme mønster som LTX: **katalogen taper informasjon, og den er den som blir lest.**

Det er det egentlige kildekritiske funnet: sammendragsdokumentet er blitt en sannhetskilde uten å være det.

---

## 7. Veikart

**Denne uken**
- Rett LTX-tallet i tjenestekatalogen (70 s), og legg inn H3-lisensnyansen der
- Bygg kryssingen mellom de to bildene — null kostnad, står allerede i spesifikasjonen

**Før lansering**
- Avklar H3-lisensens EØS-spørsmål (én dag lesing, påvirker hele videovalget)
- Test at stemmeklippene bærer over musikk (én telefon, ti minutter)
- Beslutt Flux-regenerering *før* biblioteket vokser

**Neste kvartal**
- Kontekstvalg mellom eksisterende klipp (runde, gjenstående, forrige vurdering)
- Lokal seed-produksjon for stemmene
- Vurdér vektor/rigg seriøst mot video for bevegelse

**Fjern eller frys**
- **Frys** all planlegging som forutsetter at dempingstjenesten virker
- **Frys** Spotify/YouTube-integrasjon til stemme-over-musikk er testet — er den god nok, faller behovet bort
- **Fjern** `audioDuckingService` fra beskrivelsen av hva appen kan, til noe faktisk bruker den

---

## 8. Tilbakemelding på bestillingen

**Delingen virket.** B1 er en oppgave med én metode og ett utstyrsbehov. Det gjorde den mulig å svare skikkelig på.

**De to tilføyelsene var direkte nyttige:**
- **Enhetsseksjonen** ga meg dekning til å la Del 3 stå åpen uten å virke unnvikende. Uten den ville jeg antagelig skrevet noe om Web Audio som hadde sett ut som funn.
- **Kildekritikk som eget leveransepunkt** endret hvordan jeg leste. Jeg gikk til filsystemet framfor å velge mellom to dokumenter, og det avgjorde LTX-spørsmålet.

**Innvendingen deres om LTX-varianter var berettiget, og den forbedret svaret.** Jeg hadde påstått at katalogen løy uten å utelukke at det var to modeller. Konklusjonen holdt, men bare fordi filsystemet bekreftet den — ikke fordi resonnementet var komplett. Det er verdt å merke seg som mønster: bestillinger som utfordrer revisorens premiss gir bedre revisjoner.

**Det som fortsatt er vanskelig:**
- **Del 2 kan ikke fullføres uten å høre.** «Holder kvaliteten?» og «når begynner en stemme å gå på nervene?» er lyttespørsmål. Enhetsseksjonen dekker lyd i én setning, men de to spørsmålene står fortsatt i Del 2 som om de kunne besvares. De bør flyttes til en egen lytteoppgave med angitt utstyr, slik enhetsspørsmålene er.
- **Kapasitetstabellen mangler fortsatt kilde per rad.** Hadde hver rad hatt en dokumentreferanse, ville LTX-avviket vært synlig før bestillingen ble sendt. Det er den billigste endringen på hele lista.
- **«~2 min per sekund video» for H3** er en tredje formulering av samme tall som benchmarken oppgir som 357–385 s per 5-sekundsklipp (≈ 71–77 s per sekund). De er ikke forenlige. Jeg brukte benchmarken.

**Ett spørsmål bestillingen ikke svarer på:** hvem godkjenner treningsfaglig? Positur-utledning skalerer produksjonen til 80+ øvelser, men kvalitetssikringen skalerer ikke med den. Uten et svar på hvem som ser på hver øvelse, er skaleringsanbefalingen halv.

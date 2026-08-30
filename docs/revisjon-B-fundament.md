# Revisjon B — Fundamentet

**Objekt:** «Min Trener», norsk PWA for intervalltrening. Live: `https://mintrener.web.app` · Kode: `github.com/EirikWolf/mintrener` (offentlig) · Dokumentasjon i `docs/`.

Denne revisjonen handler om teknologivalg, medieproduksjon, plattform og forvaltning. Grensesnitt og brukeropplevelse dekkes i **Revisjon A** — hold deg unna dem her, bortsett fra der et teknisk valg får direkte konsekvens for hva brukeren opplever.

**Ingen valg er fredet, og ingen løsning er gitt på forhånd.** Vi ber om reelle alternativvurderinger med begrunnede anbefalinger — ikke bekreftelse av det vi allerede gjør. Vær kritisk, men løsningsorientert: hvert funn skal ha et forslag, og hvert stort forslag skal ha et minste første steg.

---

## Systemet kort

React/TypeScript-PWA, Firebase (hosting, innlogging, database), ~40 000 linjer, 780 tester. Mobil først, offline-orientert, åpen for alle med Google-konto. Bygget svært raskt med reell testdisiplin, men også kraftig funksjonstilvekst.

Innhold i dag: 25 øvelser med to stillbilder hver, og fire syntetiske trenerstemmer med norsk dialekt (~150 lydklipp).

**Tilgjengelig maskinvare:** en selvhostet GPU-maskin («kitor», RTX 3090 / 24 GB) med modent økosystem. Dokumentasjon i `homelab-vault/02-Tjenester/AI/`. All eksklusiv bruk krever lease og deles med andre prosjekter.

| Kapasitet | Verktøy | Målt | Lisens |
|---|---|---|---|
| Bilde | Flux Dev fp8 / SDXL i ComfyUI | ~30–60 s per bilde | Flux.1-dev: **ikke-kommersiell** |
| Video (i2v) | Wan 2.2 14B + Turbo | 195–256 s per 5 s-klipp | apache-2.0 |
| Video, raskere | LTX 13B 0.9.8 | **70 s** per 5 s-klipp | — |
| Video **med lyd** | MiniMax H3 | ~2 min per sekund video | ⚠️ **kun interne eksperimenter** |
| Musikk/vokal | MiniMax Music 3 (i bruk av søsterprosjektet Tonefall) | ~8 s per sekund lyd | **apache-2.0** |
| Stem-separasjon | Demucs 4.0.1, CPU | — | — |
| Stemmekloning | Chatterbox-TTS | — | — |

---

## Fagperspektiver

Revisjonen skal dekke disse fagenes perspektiver — men **ikke iscenesett et panel.** Én leser som spiller fem roller produserer teater, ikke innsikt. Bruk fagene som **motsetninger i saken**: der to hensyn faktisk trekker i hver sin retning (kvalitet mot kostnad, åpenhet mot lisens, fleksibilitet mot offline-løftet), skal spenningen stå igjen med begge sider og hva som avgjør.

| Fagperspektiv | Mandat |
|---|---|
| **Medieproduksjon (ML/GPU)** | Produksjonslinjer for bilde, video og stemme: kapasitet, kostnad per enhet, reproduserbarhet, hva som skalerer når biblioteket vokser |
| **Plattformarkitektur** | Hva plattformen faktisk tillater, hva som er løsbart i web, og hva som krever native |
| **Lyddesign** | Stemme og lydbilde som opplevelse: timing, avbrytelser, verdi mot kostnad |
| **Produktledelse** | Verdi per investering, hva som bør fryses, hva som blokkerer lansering |
| **Lisens og juridisk** | Lisens på modeller, kilder og generert innhold — for et produkt som er åpent tilgjengelig og der inntekt ikke er utelukket |

---

## Del 1 — Fra stillbilde til bevegelse

Øvelseskortene viser i dag to stillbilder: start og slutt. Spørsmålet er todelt, og delene må ikke slås sammen.

**Produksjon.** Hva er beste måte å vise en bevegelse på? Utred minst disse, gjerne flere:

- Kryssing mellom de to bildene som allerede finnes — spesifikasjonen foreslo nettopp dette, og det er aldri bygget. Hva koster det, og hvor langt rekker det?
- AI-generert video fra eksisterende stillbilder
- Flere mellomposisjoner som sekvens
- Ekte videoopptak
- Vektoranimasjon eller riggbasert 3D

Vurder hver mot **produksjonskostnad** (GPU-timer nå, og ved 80–120 øvelser), **filstørrelse** (dagens bilder er ~1,2 MB PNG per stk.; installasjonskostnaden ble nylig presset fra 90 MB til 1,5 MB og bør ikke mistes igjen), **lisens**, **redigerbarhet** når en øvelse skal rettes, og **treningsfaglig presisjon** — en video som viser feil utførelse er verre enn et bilde som viser riktig.

**Opplevelse — det viktigste spørsmålet.** *Bør* video vises mens øvelsen utføres? Det er ikke gitt. Under en økt konkurrerer alt om samme oppmerksomhet, og produktløftet er «én hånd, ett blikk». En løkke i bakgrunnen kan instruere — eller stjele blikket fra nedtellingen. Er video mest verdt **før** øvelsen (lære), **under** (korrigere), eller i **biblioteket** (utforske)? Er svaret ulikt for en nybegynner og en som har gjort øvelsen 40 ganger? Hva med den som har telefonen på gulvet og ikke ser skjermen?

**Kilder: finnes materialet allerede?** Utred hvilke åpent lisensierte bilde- og filmkilder som finnes og holder kvalitetsmessig. Spesifikasjonen peker på én: *free-exercise-db* (GitHub, yuhonas), oppgitt som offentlig eiendom med 800+ øvelser. Finn flere, og vurder dem på dekning, kvalitet, stilkonsistens og **lisens verifisert ved kilden** — ikke slik en README oppgir den.

Vær presis på det juridiske, for her er det lett å ta feil på en dyr måte:

- **Å kjøre andres materiale gjennom en generativ modell gjør det ikke automatisk til vårt.** Resultatet kan være et bearbeidet verk, og kildens lisens kan følge med. Vurderingen må gjøres per kilde og per bruksmåte.
- **Sjekk modellens lisens også.** MiniMax H3 — den eneste videomodellen med lyd — er begrenset til interne eksperimenter og kan ikke produsere innhold til en offentlig app, uansett hvor bra resultatet blir.
- **Men det finnes en ren vei, og den står i vedlegg A:** bruk et åpent lisensiert foto kun til å utlede en **positur** (et skjelett av leddkoordinater, uten gjenkjennbart innhold fra originalen), og generer vårt eget bilde derfra. Da arves bevegelsen, ikke bildet. Vurder om dette bør være hovedstrategien for å komme fra 25 til 80+ øvelser — og om det også kan bære bevegelse.

---

## Del 2 — Coach-stemmen

Dagens løsning: fire stemmer, ~38 forhåndsgenererte klipp hver, klonet fra en referanse-seed. Manuskript i `scripts/voicebank-manuskript.json`, produksjonslinje i `scripts/generatePersonaVoicebank.ts`.

**Produksjon.** Seedene ble laget i en ekstern skytjeneste (Suno), og lisensgrunnlaget for kommersiell bruk og videredistribusjon er **uavklart** — kildesporene ligger dessuten i et offentlig kodelager. Samtidig finnes hele kjeden lokalt: musikkmodell med apache-2.0 (allerede i drift i søsterprosjektet **Tonefall**, `C:\dev\Tonefall`), stem-separasjon for å hente ut vokalen, og stemmekloning. Er lokal seed-produksjon praktisk gjennomførbar? Hva koster den, holder kvaliteten, og løser den lisensspørsmålet?

Vurder også arbeidsflyten som *prosess*: manuskript, generering, kvalitetssikring, godkjenning, regenerering. Hvor mye manuell lytting kreves per runde? Hva skjer når én replikk endres? Hvordan oppdages et dårlig take — og kan det oppdages automatisk? Hva koster stemme nummer fem?

**Treffsikkerhet — det mest interessante.** Klippene er generiske: velkomst, tre heiarop, «halvveis», «fem sekunder igjen», pause, avslutning, pluss øvelsesnavn. Coachingen vet hvilken *fase* du er i, men ingenting om **hvor i programmet du er, hvordan det går, eller hva som kommer**. En ekte trener sier ikke det samme i runde én som i siste runde av åtte.

- Hvilke kontekstvariabler er verdt å reagere på? Runde, gjenstående tid, øvelsestype, forrige økts vurdering, streak, om brukeren nettopp hoppet over noe.
- Hvor går grensen mellom **forhåndsgenererte klipp** (raske, offline, forutsigbare — men stive og kombinatorisk begrensede) og **sanntidstale** (fleksibel — men treg, krever nett, risikerer å komme for sent i en 10-sekunders pause)? Systemet har allerede en hybrid i miniatyr: korte broklipp settes sammen med øvelsesnavn. Er mønsteret verdt å utvide, og hvor langt?
- Hvor mange klipp kreves for at det føles variert framfor repetitivt — og når begynner en stemme å gå på nervene?
- **Skaleringsbremsen:** hver stemme har i dag ett klipp per øvelse. Fra 25 til 80 øvelser betyr flere hundre nye klipp per stemme. Bør navn og coaching produseres på ulike måter nettopp derfor?
- **Motspørsmålet, som må stilles:** gjør mer coaching produktet bedre, eller bare mer masete? Hjelper hyppige tilrop utførelsen, eller forstyrrer de konsentrasjonen om teknikk?

---

## Del 3 — Musikk og lydbilde

De fleste trener til musikk. Appen har ingen musikkfunksjon, men den har en dempingstjeneste som senker volum til 25 % når stemmen snakker. **Merk før noe planlegges: den demper `<audio>`- og `<video>`-elementer på appens egen side.** Den kan ikke røre lyd fra en annen app. Verifiser at det stemmer, og hva den i praksis demper i dag.

**Grunnspørsmålet:** hva *er* riktig lydbilde under en økt? Musikk som driver tempo, stillhet så stemmen står klart, eller brukerens egen musikk fra sin egen tjeneste? Skal appen levere lyd i det hele tatt, eller være god på stemme og la musikken være brukerens sak?

**Integrasjon:** bør appen kobles til Spotify eller YouTube Music med automatisk demping når treneren snakker? Vi ber om en **teknisk realitetssjekk før produktdrøftingen**, fordi ønsket er lett å formulere og vanskelig å innfri fra en webapp:

- Hva kan en PWA faktisk gjøre med lyd som spilles av en annen app? Redegjør for hva Web Audio, MediaSession og autoplay-reglene gir — og ikke gir.
- Lydfokus er styrt av operativsystemet på både Android og iOS. Er det tilgjengelig for en PWA i det hele tatt? Hvis ikke: er dette et argument for native innpakning (se del 5)?
- Spotify Web Playback SDK gir avspilling i nettleseren — men hva kreves av brukeren, hvilke plattformer støttes reelt, og hva skjer for dem som ikke oppfyller kravet? Finnes noe tilsvarende for YouTube Music?
- Hva er avhengighetsrisikoen ved å knytte kjerneopplevelsen til en tredjeparts vilkår?

**Alternativet som må vurderes på like fot:** i stedet for å kjempe om kontroll over brukerens musikkapp — gjør stemmen tydelig nok til å bære gjennom musikk som spiller. Kortere replikker, plassering i frekvensbildet, et signal før tale. Ingen integrasjon, ingen innpakning, ingen tredjepart. Er det godt nok? Er svaret ja, bør det gjøres først uansett.

---

## Del 4 — Modell- og teknologivalg

| Område | Dagens valg | Merknad |
|---|---|---|
| Bilde | Flux.1-dev + person-LoRA + ControlNet | **Ikke-kommersiell lisens** — bevisst valgt, dokumentert som kjent kostnad den dagen produktet skal gi inntekt |
| Video | Ikke valgt | Backloggen foreslår Wan-familien; ingenting bygget |
| Musikk | Ikke i bruk i appen | apache-2.0-modell finnes i drift i søsterprosjektet |
| Stemme | Chatterbox med kloning fra ekstern seed | Se del 2 |
| «AI-trener» og «AI-øktgenerator» | **Ingen modell — rent regelbasert.** Null nettverkskall i begge tjenester | Fungerer offline og forutsigbart, men navnet lover noe annet enn det som leveres |

Vurder hvert område mot **hva som faktisk skal produseres**, ikke mot benchmarklister. En modell som vinner en rangering er irrelevant hvis den ikke løser vår oppgave innenfor vår lisens, vårt VRAM-budsjett og vår tålmodighet.

1. **Er valget fortsatt riktig?** Hva har endret seg siden det ble tatt? Verifiser mot kilden — ikke gjett fra hukommelsen hvilke modeller som finnes.
2. **Lisens først.** Produktet er åpent, og inntektsambisjonen er ikke lagt død. Hvilke valg låser den døren? Hva er den reelle regningen for å regenerere bildebiblioteket på en kommersielt fri modell — nå kontra senere?
3. **Passer valget maskinen?** Én delt GPU. En modell som krever eksklusiv tilgang i timevis koster mer enn sin egen kjøretid.
4. **Riktig sted å kjøre?** Skille skarpt mellom det som produseres én gang og pakkes med appen (bilder, lyd), og det som skjer mens brukeren venter (coaching, øktgenerering).

**Om «micro LLM».** Regelbasert er ikke åpenbart feil — regler er raske, gratis, offline og forutsigbare, og en trener som sier noe rart er verre enn en som sier noe enkelt. Men hvor treffer reglene taket? Skal en språkmodell inn, hvor kjører den — **på enheten** (hva koster nedlasting, minne og batteri på en fem år gammel telefon, og hvor god blir norsken?) eller **på hjemmeserveren** (bedre norsk, men krever nett og bryter offline-løftet)? Kan de kombineres, så appen virker uten nett og blir bedre med? Og holder reglene: **bør funksjonene da slutte å kalle seg AI?**

---

## Del 5 — Plattform: PWA, native, eller begge

Spesifikasjonen har en exit-strategi — pakke samme kodebase med Capacitor hvis native sensortilgang blir viktig — men valget er ikke vurdert på nytt etter at appen ble bygget.

**Gjør regnskapet konkret: hva koster PWA-valget i dag?** Målt i denne appen, ikke i teorien. Kandidater: pulsbelte via Web Bluetooth finnes ikke på iOS i det hele tatt (funksjonen er bygget, men halvparten av brukerne ser den aldri); lydkonteksten suspenderes ved skjermlås på iOS; demping av andre apper krever operativsystemets lydfokus (del 3); Apple Health og Health Connect er utilgjengelige; push krever hjemskjerm-installasjon; og funnbarhet — hvordan finner en ny bruker en PWA mot et søk i App Store?

**Vær like grundig på hva som ikke er plattformens skyld.** Timeren frøs tidligere i bakgrunnen, og det ble løst i web med en worker-metronom og reankring mot veggklokke. Det er presedens: noen «PWA-begrensninger» er løsbare med bedre webarkitektur. Skill derfor mellom det som er **umulig**, det som er **vanskelig men gjort**, og det som bare **ikke er forsøkt**. En native-innpakning begrunnet med problemer som kunne vært løst i web er en dyr snarvei.

**Hva PWA gir som native ikke gir**, og hva det koster å miste: oppdatering samme sekund uten review-kø, delbare lenker rett inn i en økt, null installasjonsfriksjon, én kodebase, ingen utviklerkontoer eller plattformavgift.

Gi en anbefaling med **utløsende betingelser** — ikke «kanskje senere», men «vi bytter når X er sant». Er svaret begge: hvilken er hovedkanalen, hva er eksklusivt hvor, og hvordan unngår dere å vedlikeholde grensesnittet to steder? Er svaret PWA alene: hva må sies tydelig til brukerne om hva appen ikke kan, i stedet for at funksjoner bare er usynlige på iPhone?

---

## Del 6 — Forvaltning

Det finnes ikke noe administrasjonsgrensesnitt. Start med hvorfor, for svaret ligger i koden:

- Sikkerhetsreglene definerer en felles øvelseskolleksjon i databasen, merket med at bare backend eller admin kan endre den. **Kolleksjonen leses aldri av appen.** Datamodellen forutsetter et forvaltningslag som aldri ble bygget.
- Alle øvelser og programmer ligger hardkodet i kildefiler. Å rette en skrivefeil i en instruks krever kodeendring, gjennomgang, bygg og utrulling.

Vurder om dette forklarer noe større: biblioteket har stått stille på 25 øvelser gjennom hele utviklingen, mens funksjonsmengden vokste kraftig. **Er innholdsproduksjon blitt en utviklingsoppgave, og taper den derfor hver gang?** Hvis ja, er forvaltning ikke en luksus, men flaskehalsen.

**Så hva trengs?** Ikke start med en funksjonsliste. Start med: *hvilke spørsmål om produktet kan produkteier ikke få svar på i dag, og hvor burde svaret bodd?* Utred minst disse:

- **Driftsinnsikt.** Appen skriver telemetri til seks dokumenter, men henter bare tre tilbake — og de tre vises til *sluttbrukeren*, ikke til en forvalter. **Ytelses- og engasjementsdataene leses aldri av noen.** Merk hva som ligger i ytelsesdokumentet: bøttene for lydavvik, som gjenopptakelsesnotatet gjør til go/no-go-kriteriet for produksjonslansering. Beslutningsgrunnlaget for å lansere skrives til en database ingen leser. Hva må kunne besvares løpende — er appen frisk, fullføres økter, hvor avbryter folk, hvilke programmer brukes aldri?
- **Feil og hendelser.** Brukeren ser en feilmelding; utvikleren ser ingenting. Men vurder løsningen før dere bygger: en Sentry-kompatibel feiltjeneste kjører allerede i samme hjemmelab. **Spørsmålet er neppe om dere skal bygge et feildashbord, men om dere skal koble dere på et som finnes** — og hva som må gjelde for personvern når feilrapporter forlater appen.
- **Tilbakemelding.** Det finnes ingen vei fra en bruker som oppdager noe galt til den som kan rette det. For en åpen app er det et hull — men en kanal ingen svarer i er verre enn ingen kanal. Hvilken form passer omfanget, hvordan knyttes tilbakemelding til kontekst uten å samle personopplysninger, og hvem svarer hvor raskt?
- **Innholdshelse.** Et verktøy burde vise at et program peker på øvelser som ikke finnes, at bilder mangler eller har feil status, at en persona mangler klipp. Nettopp den typen feil har fått stå lenge her uten å bli oppdaget.
- **Media og produksjon.** Godkjenne, avvise og bestille ny generering med sporbar status per element, og se om en GPU-jobb kjører eller feilet. Det finnes et embryo i bildekuratoren — bygg ut, erstatt eller fjern? Merk at den i dag er synlig for enhver innlogget bruker.
- **Personvern og brukerstøtte.** Behandlingsansvarlig må kunne finne, eksportere og slette data for én bruker — og dokumentere at det ble gjort.
- **Kostnad.** Bruk koster penger. Hvem oppdager en uventet regning, og hvor fort?
- **Kontroll.** Slå funksjoner av uten ny utrulling — særlig det som feiler i felt.

**Still motspørsmålet, og mén det.** Mye av dette har allerede et hjem: databasens konsoll, plattformens driftsvisning, feiltjenesten i hjemmelaben, utgaveregisteret. **Et eget dashbord som duplikerer verktøy dere har er ny kode uten ny innsikt.** Skille mellom hva som må være **et eget grensesnitt**, hva som bør **kobles til noe som finnes**, hva som holder som **et terminalverktøy** for én forvalter, og hva som egentlig bare krever at **innholdet flyttes ut av kildekoden**. Det siste kan frigjøre mest, til lavest pris.

---

## Del 7 — Lærer produktet av bruk?

Denne delen krever kodelesing og hører derfor hjemme her, ikke i Revisjon A.

Ikke en ønskeliste. Vi vil vite hvordan produktet blir bedre av å bli brukt, uten at noen skriver ny kode.

**Kartlegg sløyfene som finnes.** Systemet samler allerede inn øktvurderinger («for lett / passe / for tungt»), telemetri, personlige rekorder og historikk. For hver: *hvor går dataene, og hva endrer seg som følge av dem?* En innsamling som ikke påvirker noe er ikke en sløyfe — den er en kostnad. Finn de åpne endene. Merk at telemetrien skrives til seks dokumenter, men bare tre leses tilbake (se del 6).

**Foreslå lukking**, med det minste inngrepet først, og prioritér der dataene allerede finnes.

**Vurder tilbakemeldingen.** Får brukeren vite at systemet har lært noe? En tilpasning som skjer usynlig oppleves ikke som intelligens, men som uforutsigbarhet.

**Moonshots — tre til fem.** Hvert forslag skal bygge på noe som allerede finnes, navngi hva som må på plass først, og si hva som gjør det vanskelig å kopiere. Et moonshot uten fundament er en distraksjon.

---

## Leveranse

1. **Sammendrag** — én til to sider. Viktigste innsikt, og de faglige motsetningene du støtte på, med begge sider og hva som avgjør.
2. **Bevegelse** — alternativene mot hverandre med kostnad, filstørrelse, lisens og redigerbarhet. Klar anbefaling om *om*, *hvor* og *når* bevegelse skal vises. Ta stilling til om det minste steget (kryssing mellom de to bildene som finnes) bør prøves først. Inkludér kildestrategi: hva bygges selv, hva hentes åpent, på hvilket juridisk grunnlag.
3. **Stemme** — lokal seed-produksjon mot dagens eksterne, kritikk av produksjonsprosessen, og anbefalt arkitektur for kontekstbevisst coaching, med minste steg.
4. **Lydbilde** — hva appen skal levere av lyd, med tydelig skille mellom hva som er mulig fra en PWA i dag, hva som krever native, og hva som krever tredjepartsavtale.
5. **Modelltabell** — område · dagens valg · anbefaling (behold / bytt / utred) · begrunnelse · byttekostnad. Lisens eksplisitt vurdert per valg. Ta stilling til om de regelbaserte funksjonene bør kalle seg AI.
6. **Plattformnotat** — regnskapet for PWA-valget, skilt fra det som bare ikke er forsøkt løst i web, med utløsende betingelser for et eventuelt bytte.
7. **Forvaltningsnotat** — hvorfor flaten mangler, hvilke spørsmål som ikke kan besvares i dag, og funnene delt i fire: bygg eget · koble til noe som finnes · hold det i terminalen · flytt innholdet ut av koden. Svar i tre nivåer (før lansering / flere forvaltere / ved vekst), og si hva som *ikke* bør bygges.
8. **Læringssløyfer og moonshots (del 7)** — sløyfekart med de åpne endene, forslag til lukking med minste inngrep først, og moonshots med fundament.
9. **Veikart:** denne uken · før lansering · neste kvartal · **fjern eller frys**.

Alle notater skal oppgi **hva som må være sant for at anbefalingen skal holde**, og **hva som ville fått deg til å ombestemme deg**.

---

Systemet er bygget fort, av få, med høy disiplin på noen områder og betydelig gjeld på andre. Det tåler å bli lest kritisk. Vi vil ha beslutningsstøtte, ikke en liste over feil — og der du foreslår å fjerne noe, si hva som dekker behovet i stedet.

Må du velge mellom grundig og tydelig: velg tydelig.

# Revisjon B2 — Plattform, forvaltning og læring

**Objekt:** «Min Trener», norsk PWA for intervalltrening. Live: `https://mintrener.web.app` · Kode: `github.com/EirikWolf/mintrener` (offentlig) · Dokumentasjon i `docs/`.

**Ingen valg er fredet, og ingen løsning er gitt på forhånd.** Vi ber om reelle alternativvurderinger med begrunnede anbefalinger — ikke bekreftelse av det vi allerede gjør. Vær kritisk, men løsningsorientert: hvert funn skal ha et forslag, og hvert stort forslag skal ha et minste første steg.

Dette er en kode- og beslutningsrevisjon, ikke en opplevelsesrevisjon. Les kilder fritt fra start.

Medieproduksjon, stemme og lisens dekkes i **Revisjon B1**. Grensesnitt og brukeropplevelse i **Revisjon A**.

---

## Fagperspektiver

Revisjonen skal dekke disse fagenes perspektiver — men **ikke iscenesett et panel.** Én leser som spiller flere roller produserer teater, ikke innsikt. Bruk fagene som **motsetninger i saken**: der to hensyn faktisk trekker i hver sin retning (offline mot fleksibilitet, kontroll mot vedlikeholdsbyrde), skal spenningen stå igjen med begge sider og hva som avgjør.

| Fagperspektiv | Mandat |
|---|---|
| **Plattformarkitektur** | Hva plattformen faktisk tillater, hva som er løsbart i web, og hva som krever native |
| **Drift og forvaltning** | Hva som må kunne observeres og styres etter lansering, og hvor svaret bør bo |
| **Produktledelse** | Verdi per investering, hva som bør fryses, hva som blokkerer lansering |
| **Personvern** | Hva som samles inn, hva som deles med tredjepart, og hva behandlingsansvarlig må kunne svare på |


---

## Når et spørsmål krever en fysisk enhet

Denne revisjonen inneholder spørsmål som **ikke kan besvares holdbart fra kildelesing**. Lydfokus, autoplay-regler, Web Bluetooth, push-tillatelser og bakgrunnsatferd ved skjermlås må måles på en ekte iPhone og en ekte Android. API-dokumentasjon forteller hva som er spesifisert, ikke hva som faktisk skjer på en fem år gammel telefon.

Det gjelder særlig del 2 (plattform), der hele regnestykket hviler på hva som faktisk virker.

**Har du ikke enhetene: si det, og la spørsmålet stå ubesvart.** En lærebokgjengivelse i revisjonsform er verre enn et hull, fordi den ser ut som et funn og blir behandlet som ett. Marker tydelig hva som gjenstår og hva slags utstyr som skal til.

---

## Før du svarer på noe: har vi stilt riktig spørsmål?

**Denne bestillingen er skrevet av folk som allerede har bygget en løsning, og den bærer preg av det.** Spørsmålene tar utgangspunkt i hva vi har gjort, og alternativene vi lister er som regel varianter av vår egen tilnærming. Det er en systematisk skjevhet, og vi vil at du skal bryte den.

**Du har eksplisitt mandat til å forkaste premisset.** Mener du vi løser feil problem, at et spørsmål ikke er verdt å stille, eller at hele kategorien vi tenker innenfor er feil — si det, og bruk plassen på det i stedet. Tidligere revisjoner har gjort nettopp dette, og det var de mest verdifulle funnene. En bekreftelse av vår egen tenkning er nesten verdiløs for oss.

Tre grep vi ber om konkret:

**1. Vurder alltid nullalternativet.** For hvert forslag: hva skjer om vi ikke gjør noe av dette? Hvem savner det, og hvor fort? En funksjon som ikke bygges har null vedlikeholdskostnad, null feilrate og null forvirring — det er en reell konkurrent til enhver løsning.

**2. Se utover vår egen liste.** Der vi lister alternativer, er listen et utgangspunkt, ikke en meny. Finnes det en tilnærming vi ikke har tenkt på — også en som løser behovet på en helt annen måte enn vi forestiller oss — er det den vi vil høre om.

**3. Hva gjør de som er best i verden på dette?** Ikke som benchmarking-øvelse, men fordi noen har brukt år på problemer vi har brukt dager på. Hva gjør de, hvorfor tror du de valgte slik, og hva har de forkastet underveis? Vær like interessert i hva de har **valgt bort** som i hva de har bygget — det forteller ofte mer. Vi har en egen konkurrentanalyse i `docs/vedlegg-c-konkurrentanalyse-og-neste-fase.md`; les den, men behandle den som vårt utgangspunkt, ikke som fasit. Finner du at den er utdatert eller for smal, si det.

Et konkret eksempel på skjevheten, fra vår egen prosess: vi begynte med å tenke stillbilder til øvelsene, gikk videre til å vurdere video, og har dermed i praksis låst oss til spørsmålet «hvilket format skal demonstrasjonen ha». Det er kanskje feil spørsmål. Kanskje trenger brukeren ikke se en demonstrasjon i det hele tatt. Kanskje er det viktigste å se seg selv, ikke en modell. Kanskje ligger svaret i lyd, i tekst, i timing — eller i noe vi ikke har språk for ennå.

**Vi vil heller ha et godt begrunnet forslag som river opp planen vår, enn en pen gjennomføring av den.**

---

## Systemet kort

React/TypeScript-PWA, Firebase (hosting, innlogging, database), ~40 000 linjer, 817 tester. Mobil først, offline-orientert, åpen for alle med Google-konto. Bygget svært raskt med reell testdisiplin, men også kraftig funksjonstilvekst.

Innhold i dag: 74 øvelser, fire syntetiske trenerstemmer med norsk dialekt (~150 lydklipp). Installasjonskostnaden er presset fra 90 MB til 1,5 MB — et tall som er verdt å beskytte.

Merk at spesifikasjonens kapittel 5 nylig ble revidert: App Check er nedgradert fra P1 til P2 med begrunnelse og utløsende betingelse (Beslutning 46). Les vurderingen før du eventuelt behandler den som et avvik.

---

## Del 1 — Modell- og teknologivalg

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

## Del 2 — Plattform: PWA, native, eller begge

Spesifikasjonen har en exit-strategi — pakke samme kodebase med Capacitor hvis native sensortilgang blir viktig — men valget er ikke vurdert på nytt etter at appen ble bygget.

**Gjør regnskapet konkret: hva koster PWA-valget i dag?** Målt i denne appen, ikke i teorien. Kandidater: pulsbelte via Web Bluetooth finnes ikke på iOS i det hele tatt (funksjonen er bygget, men halvparten av brukerne ser den aldri); lydkonteksten suspenderes ved skjermlås på iOS; demping av andre apper krever operativsystemets lydfokus (del 3); Apple Health og Health Connect er utilgjengelige; push krever hjemskjerm-installasjon; og funnbarhet — hvordan finner en ny bruker en PWA mot et søk i App Store?

**Vær like grundig på hva som ikke er plattformens skyld.** Timeren frøs tidligere i bakgrunnen, og det ble løst i web med en worker-metronom og reankring mot veggklokke. Det er presedens: noen «PWA-begrensninger» er løsbare med bedre webarkitektur. Skill derfor mellom det som er **umulig**, det som er **vanskelig men gjort**, og det som bare **ikke er forsøkt**. En native-innpakning begrunnet med problemer som kunne vært løst i web er en dyr snarvei.

**Hva PWA gir som native ikke gir**, og hva det koster å miste: oppdatering samme sekund uten review-kø, delbare lenker rett inn i en økt, null installasjonsfriksjon, én kodebase, ingen utviklerkontoer eller plattformavgift.

Gi en anbefaling med **utløsende betingelser** — ikke «kanskje senere», men «vi bytter når X er sant». Er svaret begge: hvilken er hovedkanalen, hva er eksklusivt hvor, og hvordan unngår dere å vedlikeholde grensesnittet to steder? Er svaret PWA alene: hva må sies tydelig til brukerne om hva appen ikke kan, i stedet for at funksjoner bare er usynlige på iPhone?

---

## Del 3 — Forvaltning

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

## Del 4 — Lærer produktet av bruk?

Denne delen krever kodelesing og hører derfor hjemme her, ikke i Revisjon A.

Ikke en ønskeliste. Vi vil vite hvordan produktet blir bedre av å bli brukt, uten at noen skriver ny kode.

**Kartlegg sløyfene som finnes.** Systemet samler allerede inn øktvurderinger («for lett / passe / for tungt»), telemetri, personlige rekorder og historikk. For hver: *hvor går dataene, og hva endrer seg som følge av dem?* En innsamling som ikke påvirker noe er ikke en sløyfe — den er en kostnad. Finn de åpne endene. Merk at telemetrien skrives til seks dokumenter, men bare tre leses tilbake (se del 3).

**Foreslå lukking**, med det minste inngrepet først, og prioritér der dataene allerede finnes.

**Vurder tilbakemeldingen.** Får brukeren vite at systemet har lært noe? En tilpasning som skjer usynlig oppleves ikke som intelligens, men som uforutsigbarhet.

**Moonshots — tre til fem.** Hvert forslag skal bygge på noe som allerede finnes, navngi hva som må på plass først, og si hva som gjør det vanskelig å kopiere. Et moonshot uten fundament er en distraksjon.

---

## Leveranse

1. **Sammendrag** — én til to sider. Viktigste innsikt, og de faglige motsetningene du støtte på, med begge sider og hva som avgjør.
2. **Modelltabell** — område · dagens valg · anbefaling (behold / bytt / utred) · begrunnelse · byttekostnad. Lisens eksplisitt vurdert per valg. Ta stilling til om de regelbaserte funksjonene bør kalle seg AI.
3. **Plattformnotat** — regnskapet for PWA-valget, skilt fra det som bare ikke er forsøkt løst i web, med utløsende betingelser for et eventuelt bytte. Marker tydelig hva som krever fysisk enhet å avgjøre.
4. **Forvaltningsnotat** — hvorfor flaten mangler, hvilke spørsmål som ikke kan besvares i dag, og funnene delt i fire: bygg eget · koble til noe som finnes · hold det i terminalen · flytt innholdet ut av koden. Svar i tre nivåer (før lansering / flere forvaltere / ved vekst), og si hva som *ikke* bør bygges.
5. **Læringssløyfer og moonshots** — sløyfekart med de åpne endene, forslag til lukking med minste inngrep først, og moonshots med fundament.
6. **Veikart:** denne uken · før lansering · neste kvartal · **fjern eller frys**.
7. **Tilbakemelding på bestillingen** — hva som var uklart, hva som ikke lot seg besvare, hva som burde vært formulert annerledes.

Alle notater skal oppgi **hva som må være sant for at anbefalingen skal holde**, og **hva som ville fått deg til å ombestemme deg**.

---

Systemet er bygget fort, av få, med høy disiplin på noen områder og betydelig gjeld på andre. Det tåler å bli lest kritisk. Vi vil ha beslutningsstøtte, ikke en liste over feil — og der du foreslår å fjerne noe, si hva som dekker behovet i stedet.

Må du velge mellom grundig og tydelig: velg tydelig.

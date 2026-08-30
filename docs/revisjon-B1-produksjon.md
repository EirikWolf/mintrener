# Revisjon B1 — Produksjon, medier og lisens

**Objekt:** «Min Trener», norsk PWA for intervalltrening. Live: `https://mintrener.web.app` · Kode: `github.com/EirikWolf/mintrener` (offentlig) · Dokumentasjon i `docs/`.

**Ingen valg er fredet, og ingen løsning er gitt på forhånd.** Vi ber om reelle alternativvurderinger med begrunnede anbefalinger — ikke bekreftelse av det vi allerede gjør. Vær kritisk, men løsningsorientert: hvert funn skal ha et forslag, og hvert stort forslag skal ha et minste første steg.

Dette er en kode- og beslutningsrevisjon, ikke en opplevelsesrevisjon. Les kilder fritt fra start.

**Kildekritikk er en del av oppdraget.** Dokumentasjonen vår motsier seg selv på minst ett punkt (se nedenfor). Finner du flere, rapporter dem — et feil tall i et delt dokument koster mer enn en feil i denne appen, fordi andre prosjekter regner med det.

Plattformvalg (PWA mot native), forvaltning og læringssløyfer dekkes i **Revisjon B2**. Grensesnitt og brukeropplevelse i **Revisjon A**.

> **Les [`revisjon-00-slik-jobber-du.md`](revisjon-00-slik-jobber-du.md) først.** Den forklarer metode, leserekkefølge, kildehierarki og hvordan besvarelsen leveres. Dette dokumentet sier *hva* du skal vurdere; det andre sier *hvordan*.

---

## Fagperspektiver

Revisjonen skal dekke disse fagenes perspektiver — men **ikke iscenesett et panel.** Én leser som spiller flere roller produserer teater, ikke innsikt. Bruk fagene som **motsetninger i saken**: der to hensyn faktisk trekker i hver sin retning, skal spenningen stå igjen med begge sider og hva som avgjør.

| Fagperspektiv | Mandat |
|---|---|
| **Medieproduksjon (ML/GPU)** | Produksjonslinjer for bilde, video og stemme: kapasitet, kostnad per enhet, reproduserbarhet, hva som skalerer når biblioteket vokser |
| **Lyddesign** | Stemme og lydbilde som opplevelse: timing, avbrytelser, verdi mot kostnad |
| **Lisens og juridisk** | Lisens på modeller, kilder og generert innhold — for et produkt som er åpent tilgjengelig og der inntekt ikke er utelukket |
| **Produktledelse** | Verdi per investering, hva som bør fryses, hva som blokkerer lansering |


---

## Når et spørsmål krever en fysisk enhet

Noen spørsmål her kan ikke besvares holdbart fra kildelesing. Lydfokus, autoplay-regler, Web Bluetooth, bakgrunnsatferd ved skjermlås og hvordan noe faktisk oppleves i hånden må **måles på en ekte iPhone og en ekte Android** — emulert viewport og API-dokumentasjon holder ikke.

**Har du ikke enhetene: si det, og la spørsmålet stå ubesvart.** En lærebokgjengivelse i revisjonsform er verre enn et hull, fordi den ser ut som et funn og blir behandlet som ett. Marker tydelig hva som gjenstår og hva slags utstyr som skal til.

Det samme gjelder lyd: kan du ikke spille av, skal du ikke vurdere hvordan stemmene låter.

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

React/TypeScript-PWA, Firebase (hosting, innlogging, database), ~40 000 linjer, 780 tester. Mobil først, offline-orientert, åpen for alle med Google-konto. Bygget svært raskt med reell testdisiplin, men også kraftig funksjonstilvekst.

Innhold i dag: 25 øvelser med to stillbilder hver, og fire syntetiske trenerstemmer med norsk dialekt (~150 lydklipp).

**Tilgjengelig maskinvare:** en selvhostet GPU-maskin («kitor», RTX 3090 / 24 GB) med modent økosystem. Dokumentasjon i `homelab-vault/02-Tjenester/AI/`. All eksklusiv bruk krever lease og deles med andre prosjekter.

| Kapasitet | Verktøy | Målt | Lisens |
|---|---|---|---|
| Bilde | Flux Dev fp8 / SDXL i ComfyUI | ~30–60 s per bilde | Flux.1-dev: modellen er ikke-kommersiell, men **utdataene er frie** (lest 2026-08-30) |
| Video (i2v) | Wan 2.2 14B + Turbo | 195–256 s per 5 s-klipp | apache-2.0 |
| Video, raskere | LTX 13B 0.9.8 | **70 s** per 5 s-klipp | — |
| Video **med lyd** | MiniMax H3 | ~2 min per sekund video | ⚠️ **kun interne eksperimenter** |
| Musikk/vokal | MiniMax Music 3 (i bruk av søsterprosjektet Tonefall) | ~8 s per sekund lyd | **apache-2.0** |
| Stem-separasjon | Demucs 4.0.1, CPU | — | — |
| Stemmekloning | Chatterbox-TTS | — | — |

---


> ⚠️ **Kjent motsigelse i vårt eget grunnlag.** Tabellen over oppgir LTX til 70 s per 5-sekundsklipp, hentet fra benchmarken i `ComfyUI-Video.md`. Tjenestekatalogen (`Kitor-tjenester-katalog.md`) oppgir ~4 s for det som kan være samme modell — den skriver «distilled fp8», benchmarken gjør ikke. Avgjør hvilket tall som gjelder for hvilken variant, oppgi hvilken kilde du bygger på, og si fra om katalogen bør rettes.

---

## Del 1 — Fra stillbilde til bevegelse

Øvelseskortene viser i dag to stillbilder: start og slutt. Spørsmålet er todelt, og delene må ikke slås sammen.

**Men først, det åpne spørsmålet:** trenger brukeren i det hele tatt å se en demonstrasjon på skjermen? Vi har antatt ja, og hoppet rett til formatvalget. En som har gjort knebøy 200 ganger trenger neppe et bilde. En som trener med telefonen på gulvet ser ikke skjermen uansett. Og noen ville hatt mer nytte av å se *seg selv* enn en modell. Ta stilling til det før du velger format.

**Produksjon.** Gitt at demonstrasjon skal vises: hva er beste måte? Listen under er vårt utgangspunkt, ikke en meny — vi er mest interessert i noe vi ikke har tenkt på:

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

De fleste trener til musikk. Appen har ingen musikkfunksjon.

**Den har heller ingen demping, selv om det ser slik ut.** `audioDuckingService` kalles fra 15 steder og har refcount, par-balansert duck/unduck og auto-release — men den leter etter et attributt (`data-background-music`) som ikke finnes noe sted, hendelsen den sender har ingen lyttere, og målt på kjørende produksjon treffer selektoren null elementer. Den når ikke engang appens egen stemme, som går gjennom Web Audio. Verifisert i revisjon B1; detaljene står i filens toppkommentar.

Spørsmålet er derfor ikke hvordan vi bygger videre på dempingen vi har, men **om demping skal bygges i det hele tatt** — og om det er mulig fra en PWA.

**Grunnspørsmålet:** hva *er* riktig lydbilde under en økt? Musikk som driver tempo, stillhet så stemmen står klart, eller brukerens egen musikk fra sin egen tjeneste? Skal appen levere lyd i det hele tatt, eller være god på stemme og la musikken være brukerens sak?

**Integrasjon:** bør appen kobles til Spotify eller YouTube Music med automatisk demping når treneren snakker? Vi ber om en **teknisk realitetssjekk før produktdrøftingen**, fordi ønsket er lett å formulere og vanskelig å innfri fra en webapp:

- Hva kan en PWA faktisk gjøre med lyd som spilles av en annen app? Redegjør for hva Web Audio, MediaSession og autoplay-reglene gir — og ikke gir.
- Lydfokus er styrt av operativsystemet på både Android og iOS. Er det tilgjengelig for en PWA i det hele tatt? Hvis ikke: er dette et argument for native innpakning (se Revisjon B2, del 2)?
- Spotify Web Playback SDK gir avspilling i nettleseren — men hva kreves av brukeren, hvilke plattformer støttes reelt, og hva skjer for dem som ikke oppfyller kravet? Finnes noe tilsvarende for YouTube Music?
- Hva er avhengighetsrisikoen ved å knytte kjerneopplevelsen til en tredjeparts vilkår?

**Alternativet som må vurderes på like fot:** i stedet for å kjempe om kontroll over brukerens musikkapp — gjør stemmen tydelig nok til å bære gjennom musikk som spiller. Kortere replikker, plassering i frekvensbildet, et signal før tale. Ingen integrasjon, ingen innpakning, ingen tredjepart. Er det godt nok? Er svaret ja, bør det gjøres først uansett.

---

## Leveranse

1. **Sammendrag** — én til to sider. Viktigste innsikt, og de faglige motsetningene du støtte på, med begge sider og hva som avgjør.
2. **Bevegelse** — alternativene mot hverandre med kostnad, filstørrelse, lisens og redigerbarhet. Klar anbefaling om *om*, *hvor* og *når* bevegelse skal vises. Ta stilling til om det minste steget (kryssing mellom de to bildene som finnes) bør prøves først. Inkludér kildestrategi: hva bygges selv, hva hentes åpent, på hvilket juridisk grunnlag.
3. **Stemme** — lokal seed-produksjon mot dagens eksterne, kritikk av produksjonsprosessen, og anbefalt arkitektur for kontekstbevisst coaching, med minste steg.
4. **Lydbilde** — hva appen skal levere av lyd, med tydelig skille mellom hva som er mulig fra en PWA i dag, hva som krever native, og hva som krever tredjepartsavtale.
5. **Kildekritikk** — motsigelser og uklarheter du fant i vår egen dokumentasjon, med hva som bør rettes.
6. **Veikart:** denne uken · før lansering · neste kvartal · **fjern eller frys**.
7. **Tilbakemelding på bestillingen** — hva som var uklart, hva som ikke lot seg besvare, hva som burde vært formulert annerledes.

Alle notater skal oppgi **hva som må være sant for at anbefalingen skal holde**, og **hva som ville fått deg til å ombestemme deg**.

---

Systemet er bygget fort, av få, med høy disiplin på noen områder og betydelig gjeld på andre. Det tåler å bli lest kritisk. Vi vil ha beslutningsstøtte, ikke en liste over feil — og der du foreslår å fjerne noe, si hva som dekker behovet i stedet.

Må du velge mellom grundig og tydelig: velg tydelig.

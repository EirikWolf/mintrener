# Bestilling: Uavhengig UI- og innovasjonsrevisjon av «Min Trener»

## Om dette oppdraget

Du er hyret inn som **ekstern revisor**. Det er gjort intern revisjon av dette systemet før, men du er hentet inn nettopp fordi interne øyne slutter å se det de går forbi hver dag.

**Ett metodekrav går foran alle andre: dann ditt eget inntrykk først.**

Bruk appen som en ny bruker i minst 30 minutter — gjennomfør en hel treningsøkt fra start til slutt, lag en egen øvelse, bygg et program, prøv å finne igjen noe du lagret — *før* du åpner én eneste kildefil, og før du leser noen tidligere revisjon. Skriv ned det du lurer på underveis, inkludert det som føles for dumt til å spørre om. Den notatlisten er ditt mest verdifulle funn, og den kan ikke rekonstrueres etter at du har lest koden: i det øyeblikket du forstår *hvorfor* noe er som det er, slutter du å se *at* det er rart.

Tidligere revisjoner ligger i `docs/`. Du skal lese dem — men **sist**, som kryssjekk. Rapporter eksplisitt hva du fant som de ikke fant, og hva de fant som du er uenig i.

---

## Systemet

**Min Trener** er en norsk progressiv webapp (PWA) for intervall- og kroppsvektstrening. Mobil først, installerbar, offline-orientert.

| | |
|---|---|
| **Live** | `https://mintrener.web.app` |
| **Kode** | `https://github.com/EirikWolf/mintrener` (offentlig) |
| **Stack** | React 19, Vite, TypeScript, Tailwind 4, Firebase (Hosting/Auth/Firestore) |
| **Omfang** | ~40 000 linjer, 222 filer, 61 tjenester, 49 komponenter, 780 tester |
| **Målgrupper** | Enkeltbrukere, kontorpauser, barnefamilier, **seniorer (også sittende)**, kor/musikere, idrettslag |
| **Primærenhet** | Samsung S21 / Chrome. iPhone/Safari skal fungere for alt kjernefunksjonelt |
| **Språk** | Norsk bokmål i grensesnittet |

Referansedokumenter i `docs/`: `trening-app-spesifikasjon.md` (kravene systemet skal måles mot), vedlegg A–C, `DECISIONS.md` (39 beslutninger med begrunnelse), `backlog.md`.

**Særtrekk verdt å kjenne til:** appen har fire syntetiske trenerstemmer med norske dialekter (~150 lydklipp, omtrent 19 % av kodebasen). Den er bygget svært raskt — hoveddelen på under en uke — med reell testdisiplin, men også med betydelig funksjonstilvekst i samme periode.

---

## Revisjonspanelet

Du skal levere som et **tverrfaglig panel**, ikke som én generalist. Hver stemme skal være gjenkjennelig i rapporten, og der de er uenige skal uenigheten stå — ikke glattes ut. Et panel som er enig om alt har ikke vært et panel.

| Fagperson | Mandat i denne revisjonen |
|---|---|
| **Interaksjonsdesigner / IA-arkitekt** | Navigasjonsmodell, mentale modeller, flyt mellom skjermbilder, hvor ting «bor» og om brukeren kan gjette det |
| **Visuell designer** | Visuelt hierarki, typografi, farge som informasjonsbærer, hva øyet trekkes mot først og om det er riktig element |
| **Spesialist i universell utforming** | WCAG 2.2 AA (norsk lov via likestillings- og diskrimineringsloven), tastatur, skjermleser, kontrast, trykkflater, kognitiv tilgjengelighet |
| **Treningsfaglig ekspert (fysioterapeut/PT)** | Er øvelsene forsvarlige, riktig beskrevet og trygge for de svakeste målgruppene? Er progresjon og hvile fornuftig dosert? |
| **Innholdsdesigner (norsk)** | Mikrotekst, knappetekster, tone, om språket lover noe appen ikke holder, bokmålskvalitet |
| **Lyd-/multimodal designer** | Stemmesystemet som opplevelse: timing, avbrytelser, verdi mot kostnad — og hva brukere som ikke hører får i stedet |
| **Medieproduksjons-ingeniør (ML/GPU)** | Produksjonslinjene for bilde, video og stemme: kapasitet, kostnad per enhet, lisens, reproduserbarhet og hva som skalerer når biblioteket vokser |
| **Frontend-arkitekt** | Om UI-strukturen understøtter eller motarbeider endring; hvor ny funksjonalitet «lander» og hvorfor |
| **Produktsjef** | Verdi per funksjon, hva som bør fjernes, hva som fortjener investering, hva som blokkerer lansering |
| **Utforskende tester** | Det som ryker utenfor lykkelig sti: avbrutt økt, mistet nett, skjerm som slukker, rask fram-og-tilbake, samtidige handlinger |

Tegn gjerne inn flere om systemet ber om det — men begrunn hvorfor de trengs.

---

## Del 1 — Begrunnelsesplikt (det bærende prinsippet)

Denne revisjonen har én organiserende idé: **hvert element i grensesnittet må kunne forsvare sin plass.** For alt som opptar skjermareal eller oppmerksomhet, still fire spørsmål:

1. **Hvem er det for?** Hvilken bruker, i hvilket øyeblikk?
2. **Hva erstatter det?** Hvilken annen vei til samme mål finnes allerede?
3. **Hva skjer om vi fjerner det?** Hvem savner det, og hvor fort?
4. **Hvorfor akkurat her?** Hva sier plasseringen om hva som er viktig?

Produkteier har allerede stilt fire slike spørsmål. De er **kalibreringsoppgaven din** — ikke fordi svarene er gitt, men fordi de viser hvilken *type* funn som etterspørres. Besvar dem konkret, og finn deretter flere av samme klasse:

**A. Hvorfor kan ikke øvelser man har laget selv merkes som favoritt?**
Favorittmerking finnes for programmer. Egne øvelser kan lages, men behandles annerledes. Er dette en glemt funksjon, eller et bevisst skille? Hva forteller det brukeren om hvor mye deres eget innhold er verdt i systemet? Se bredere: hvilke andre steder er brukerskapt innhold andrerangs?

**B. Hvorfor finnes det to TV-ikoner på forsiden?**
Verifisert: `TimerDisplay.tsx` linje 421 og 722 er to knapper med samme `Tv`-ikon, samme blåfarge og **identisk handling** (`setIsTvModeOpen(true)`), plassert ~300 linjer fra hverandre. Skjermlesertekstene skiller seg med én bindestrek. Spørsmålet er ikke bare «hvordan fjerner vi den ene» — det er **hvordan oppstår duplikater uten at noen oppdager dem**, og hvor mange flere finnes? Se særlig på topplinjen mot verktøymatrisen.

**C. Hvorfor starter treningsprogrammet på en ny side når man trykker «Start»?**
Vurder den mentale modellen: er økten et *sted man går til* eller en *tilstand skjermen går inn i*? Begge er forsvarbare — men hvilken har appen valgt, er valget konsekvent gjennomført, og hva skjer med brukerens orienteringsevne i overgangen? Merk at det ikke finnes URL-ruting: nettleserens tilbakeknapp lukker appen i stedet for å gå tilbake.

**D. Hvorfor har forsiden en stor nedtellingssirkel når økten uansett starter et annet sted?**
Sirkelen er det største elementet på startskjermen og viser en nedtelling som ikke går. Samtidig ligger favorittøktene — det brukeren faktisk skal velge mellom — under den. **Observert på live prod: i bredt format overlapper nedtellingslaget favorittlisten, og teksten kolliderer.** Spørsmålet: hva *bør* startskjermen bruke sin plass på, og hva sier dagens prioritering om hvem skjermen er laget for?

Behandle A–D som inngangsdøren, ikke som fasiten. **Finn minst fem funn til av samme klasse** — elementer som ikke kan forsvare sin plass, duplikater, funksjoner som lover mer enn de gjør, eller ting som er der fordi de ble bygget, ikke fordi de trengs.

---

## Del 2 — Analytiske pilarer

Bruk navngitte rammeverk, og oppgi hvilket når du begrunner et funn. Et funn uten begrunnelse er en smaksdom.

**1. Kognitiv arkitektur.** Cognitive Load Theory og Gestalt-prinsippene (nærhet, likhet, lukking, felles skjebne). Hvor mange valg møter brukeren på startskjermen, og er de gruppert slik at øyet finner mønsteret? **Hick's lov** på funksjonsmengden: hvordan påvirker antall inngangspunkter tiden til første trykk?

**2. Interaksjonsøkonomi.** **Fitts' lov** på trykkflater og plassering — særlig under aktiv trening, der brukeren er andpusten, kanskje svett, og holder telefonen på gulvet. Hvor mange trykk til de fem vanligste målene? Hva er tommelens faktiske rekkevidde på en 6,2-tommers skjerm?

**3. Universell utforming.** WCAG 2.2 AA er lovkrav i Norge. Vurder tastaturnavigasjon ende-til-ende, skjermleseropplevelse i dialoger, kontrastforhold med faktiske målinger, trykkflatestørrelser, og **kognitiv tilgjengelighet** — appen retter seg mot seniorer og barn. Vurder også hva en døv eller tunghørt bruker mister når en stor del av veiledningen er tale.

**4. Systemisk konsistens.** Er samme handling utført på samme måte overalt? Er navigasjonen forutsigbar? Finnes det ett designsystem, eller er hver skjerm forhandlet fram på nytt? Se på farge- og ikonbruk: betyr blå det samme to steder?

**5. Heuristisk evaluering.** Nielsens ti heuristikker, med vekt på systemstatus (vet brukeren hva som skjer, særlig ved lagring og synkronisering?), samsvar med den virkelige verden (er treningsspråket riktig?), brukerkontroll (kan man angre?), og feilforebygging.

**6. Trygghet og treningsfaglig forsvarlighet.** Instruksjonstekstene skal leses av folk som trener alene uten tilsyn. Er de riktige? Er progresjonen forsvarlig? Får de svakeste brukergruppene øvelser de faktisk kan gjøre? Vær særlig oppmerksom på hva som vises når systemet ikke finner den øvelsen et program ber om.

---

## Del 3 — Kontinuerlig innovasjon

Ikke en ønskeliste. Vi vil vite **hvordan produktet blir bedre av å bli brukt**, uten at noen skriver ny kode for hver forbedring.

**Kartlegg de eksisterende sløyfene.** Systemet samler allerede inn data: øktvurderinger («for lett / passe / for tungt»), anonym telemetri, personlige rekorder, treningshistorikk. For hver innsamling: *hvor går dataene, og hva endrer seg som følge av dem?* En sløyfe som samler inn uten å påvirke noe er ikke en sløyfe — den er en kostnad. Vær nådeløs her: finn de åpne endene.

**Foreslå lukking.** Hvilke sløyfer bør lukkes først, og hva er det minste inngrepet som lukker dem? Prioriter dem der dataene allerede finnes.

**Vurder tilbakemeldingens kvalitet.** Får brukeren vite at systemet har lært noe? En tilpasning som skjer usynlig oppleves ikke som intelligens — den oppleves som at appen er uforutsigbar.

**Moonshots.** Foreslå tre til fem visjonære grep som ville gjort produktet vanskelig å konkurrere med. Krav: hvert forslag skal (a) bygge på noe systemet allerede har, (b) navngi hva som må være på plass først, og (c) si hva som gjør det vanskelig å kopiere. Et moonshot uten fundament er en distraksjon, og vi har nok av dem.

**Én ærlig vurdering vi ber om spesielt:** stemmesystemet er den største enkeltinvesteringen i produktet. Er det en differensiator verdt å bygge videre på, eller en kompleksitetsdriver som bør fryses? Ta med i regnestykket at hver ny øvelse i biblioteket krever nye lydklipp per stemme.

---

## Del 4 — Bevegelse, stemme og lydbilde

Spørsmål fra produkteier som fortjener egen utredning. **Ingen løsning er valgt på forhånd, og ingen leverandør eller modell er gitt.** Vi ber om en reell alternativvurdering med en begrunnet anbefaling — ikke en bekreftelse av det vi allerede gjør.

Systemet har tilgang til en selvhostet GPU-maskin («kitor», RTX 3090 / 24 GB) med et modent økosystem. Dokumentasjonen ligger i `homelab-vault/02-Tjenester/AI/`. Relevante, verifiserte kapasiteter per i dag:

| Kapasitet | Verktøy | Målt ytelse | Lisens |
|---|---|---|---|
| Bilde | Flux Dev fp8 / SDXL i ComfyUI | ~30–60 s per bilde | Flux.1-dev: **ikke-kommersiell** |
| Video (i2v) | Wan 2.2 14B + Turbo-LoRA | 195–256 s per 5 s-klipp | apache-2.0 |
| Video (raskere) | LTX 13B 0.9.8 | **70 s** per 5 s-klipp | — |
| Video **med lyd** | MiniMax H3 | ~2 min generering per sekund video | ⚠️ **kun interne eksperimenter** — kan ikke brukes i offentlig app |
| Musikk/vokal | MiniMax Music 3 (via Tonefall) | ~8 s beregning per sekund lyd | **apache-2.0** |
| Stem-separasjon | Demucs 4.0.1 (htdemucs_ft), CPU | — | — |
| Stemmekloning/TTS | Chatterbox-TTS | — | — |

All eksklusiv GPU-bruk krever lease via `kitor-arbiter` og deles med andre prosjekter.

### 4A. Fra stillbilde til bevegelse

Øvelseskortene viser i dag to statiske bilder per øvelse — startposisjon og sluttposisjon. Spørsmålet er todelt, og de to delene må ikke slås sammen:

**Produksjonsspørsmålet:** hva er den beste måten å vise en bevegelse på? Utred minst disse, og gjerne flere:

- Kryssing mellom de to bildene som allerede finnes — den opprinnelige spesifikasjonen foreslo nettopp dette («veksle mellom dem for enkel animasjon»), og det er aldri bygget. Hva ville det kostet, og hvor langt rekker det?
- AI-generert video fra eksisterende stillbilder (i2v)
- Flere mellomliggende nøkkelposisjoner som sprite/APNG-sekvens
- Ekte videoopptak av en person
- Vektorbasert animasjon (SVG/Lottie) eller riggbasert 3D

Vurder hver mot: **produksjonskostnad** (GPU-timer nå og ved 80–120 øvelser), **filstørrelse** (dagens bilder er ~1,2 MB PNG per stk. — appen har nettopp presset installasjonskostnaden fra 90 MB til 1,5 MB, og bør ikke miste det igjen), **lisens** (produktet er åpent tilgjengelig), **redigerbarhet** når en øvelse skal rettes, og **treningsfaglig presisjon** — en video som viser feil utførelse er verre enn et bilde som viser riktig.

**Opplevelsesspørsmålet, som er det viktigste:** *bør* video vises mens øvelsen utføres?

Dette er ikke gitt. Under en økt konkurrerer alt om samme oppmerksomhet, og produktløftet er «én hånd, ett blikk». En løkke som spiller i bakgrunnen kan være instruerende — eller den kan stjele blikket fra nedtellingen og gjøre at brukeren mister rytmen. Vurder eksplisitt: er video mest verdifull **før** øvelsen (lære), **under** (korrigere), eller i **biblioteket** (utforske)? Kan svaret være ulikt for en nybegynner og en som har gjort øvelsen 40 ganger? Hva med brukeren som trener med telefonen på gulvet og ikke ser skjermen i det hele tatt?

Se dette i direkte sammenheng med spørsmål **D** i del 1. Begge handler om hva øktskjermen skal bruke sin plass på, og de bør besvares sammen.

**Kildespørsmålet: finnes materialet allerede?** Produkteier spør om det finnes åpne bilde- eller filmkilder som viser øvelsene, og om slikt materiale kan kjøres gjennom en generativ modell for å bli «vårt».

Utred hvilke åpent lisensierte kilder som faktisk finnes og holder kvalitetsmessig. Spesifikasjonen peker allerede på én: *free-exercise-db* (GitHub, yuhonas), oppgitt som offentlig eiendom med 800+ øvelser og tilhørende bilder — vektorientert, men bred. Finn flere, og vurder dem på dekning mot vårt bibliotek, bildekvalitet, konsistens i stil, og **faktisk lisens verifisert ved kilden** — ikke lisensen noen har oppgitt i en README.

Vær presis på det juridiske, for her er det lett å ta feil på en dyr måte:

- **Å kjøre andres materiale gjennom en generativ modell gjør det ikke automatisk til vårt.** Resultatet kan være et bearbeidet verk, og kildens lisens kan følge med. Vurderingen må gjøres per kilde og per bruksmåte, ikke som en generell antakelse.
- **Sjekk lisensen på selve modellen også.** Merk særlig at MiniMax H3 — den eneste videomodellen på kitor som produserer lyd — er dokumentert begrenset til *interne eksperimenter*. Den kan derfor ikke brukes til å produsere innhold i en offentlig app, uansett hvor godt resultatet blir.
- **Men instinktet bak spørsmålet er riktig, og det finnes en ren vei.** Vedlegg A beskriver den allerede: bruk et åpent lisensiert foto kun til å utlede en **positur** (OpenPose/DWPose-skjelett — et sett leddkoordinater uten gjenkjennbart innhold fra originalen), og generer deretter vårt eget bilde fra det skjelettet. Da arves posituren, ikke bildet. Vurder om dette mønsteret bør være hovedstrategien for å komme fra 25 til 80+ øvelser — og om det også kan brukes som utgangspunkt for bevegelse.

Konkluder med en anbefalt kildestrategi: hva bygger vi selv, hva henter vi åpent, og hvilken juridisk begrunnelse hviler hvert valg på.

### 4B. Coach-stemmen: produksjon og treffsikkerhet

Dagens løsning: fire syntetiske trenerstemmer med norsk dialekt, ~38 forhåndsgenererte klipp per stemme, produsert med stemmekloning fra en referanse-seed. Manuskriptet ligger i `scripts/voicebank-manuskript.json`, produksjonslinjen i `scripts/generatePersonaVoicebank.ts`.

**Produksjonsspørsmålet.** Seedene som stemmene er klonet fra, ble laget i en ekstern skytjeneste (Suno), og lisensgrunnlaget for kommersiell bruk og videredistribusjon er **uavklart** — kildesporene ligger dessuten i et offentlig kodelager. Samtidig finnes hele kjeden lokalt: en musikkmodell med apache-2.0-lisens (MiniMax Music 3, allerede i drift for et søsterprosjekt), stem-separasjon (Demucs) for å hente ut vokalen, og stemmekloning (Chatterbox). Vurder om en helt lokal seed-produksjon er praktisk gjennomførbar, hva den ville koste, om kvaliteten holder — og om den løser lisensspørsmålet. Se på søsterprosjektet **Tonefall** (`C:\dev\Tonefall`) for hvordan musikkmodellen allerede er tatt i bruk, inkludert jobbkø, arbiter-integrasjon og målt gjennomstrømning.

Vurder også dagens arbeidsflyt kritisk som *prosess*: manuskript, generering, kvalitetssikring, godkjenning og regenerering. Hvor mye manuelt lytting kreves per runde? Hva skjer når én replikk skal endres? Hvordan oppdages et dårlig take i dag, og kan det oppdages automatisk? Hva er den reelle kostnaden ved å legge til stemme nummer fem?

**Treffsikkerhetsspørsmålet, som er det mest interessante.** Dagens klipp er generiske: en velkomst, tre heiarop, «halvveis», «fem sekunder igjen», en pause-replikk og en avslutning — pluss øvelsesnavnene. Coachingen vet altså *hvilken fase* du er i, men ingenting om **hvor i programmet du er, hvordan det går, eller hva som kommer**. En ekte trener sier ikke det samme i runde én som i siste runde av åtte, og sier noe annet til den som har trent tre ganger denne uken enn til den som kommer tilbake etter en måned.

Utred hvordan coaching kan treffe *riktig innhold på riktig sted*:

- Hvilke kontekstvariabler er verdt å reagere på? (runde, gjenstående tid, øvelsestype, hvordan forrige økt ble vurdert, streak, tid på døgnet, om brukeren nettopp hoppet over en øvelse)
- Hvor går grensen mellom **forhåndsgenererte klipp** (rask, offline, forutsigbar — men stiv og kombinatorisk begrenset) og **sanntidsgenerert tale** (fleksibel — men treg, krever nett, og risikerer å komme for sent i en 10-sekunders pause)? Systemet har allerede en hybrid i liten skala: korte «bro»-klipp settes sammen med øvelsesnavn. Er det mønsteret verdt å utvide, og hvor langt?
- Hvor mange klipp kreves egentlig for at det skal føles variert framfor repetitivt — og når begynner en stemme å gå på nervene?
- Hva er den skjulte skaleringskostnaden? Hver stemme har i dag ett klipp per øvelse. Utvides biblioteket fra 25 til 80 øvelser, kreves flere hundre nye klipp per stemme. Bør navn og coaching produseres på ulike måter nettopp derfor?
- **Og motspørsmålet, som må stilles:** gjør mer coaching produktet bedre, eller bare mer masete? Hva sier den treningsfaglige stemmen i panelet — hjelper hyppige tilrop faktisk utøvelsen, eller forstyrrer de konsentrasjonen om teknikk?

Konkluder med en anbefalt arkitektur for coaching-innhold, og med det minste første steget som gir merkbar forskjell.

### 4C. Musikk og lydbilde under økten

De fleste trener til musikk. Appen har i dag ingen musikkfunksjon, men den har en `audioDuckingService` som demper til 25 % når stemmen snakker — og her ligger et spørsmål som må avklares før noe planlegges: **tjenesten demper `<audio>`- og `<video>`-elementer på appens egen side.** Den kan ikke røre lyd som spilles fra en annen app på telefonen. Verifiser om det stemmer, og hva den i praksis demper i dag.

**Grunnspørsmålet:** hva *er* det riktige lydbildet under en økt? Musikk som driver tempo, stillhet så stemmen står klart, eller brukerens egen musikk fra sin egen tjeneste? Skal appen levere lyd i det hele tatt, eller skal den holde seg til å være god på stemme og la musikken være brukerens sak? Vurder også om tempo bør styres: en intervalløkt har en puls, og musikk som følger den er en reell mulighet — men også en kompleksitetsdriver.

**Integrasjonsspørsmålet:** bør appen kobles til Spotify og/eller YouTube Music, med automatisk demping når treneren snakker? Her ber vi om en **ærlig teknisk realitetssjekk før produktdrøftingen**, fordi ønsket er lett å formulere og vanskelig å innfri fra en webapp:

- Hva kan en PWA faktisk gjøre med lyd som spilles av en annen app? Redegjør for hva Web Audio, MediaSession API og nettleserens autoplay-regler gir — og hva de ikke gir.
- Lydfokus og demping av andre apper er på Android og iOS styrt av operativsystemet (audio focus / `AVAudioSession`). Er det tilgjengelig for en PWA i det hele tatt? Hvis ikke: er dette et argument for **Capacitor-innpakking**, som allerede er beskrevet som exit-strategi i spesifikasjonen? Hva ville det koste, og hva mer ville vi fått på kjøpet?
- Spotify Web Playback SDK gir avspilling i nettleseren — men hva krever den av brukeren (abonnementsnivå), hvilke plattformer støttes reelt, og hva skjer for dem som ikke oppfyller kravet? Finnes noe tilsvarende for YouTube Music?
- Hva er avhengighetsrisikoen ved å knytte kjerneopplevelsen til en tredjeparts API-vilkår som kan endres?

**Og alternativet som må vurderes på like fot:** i stedet for å kjempe om kontroll over brukerens musikkapp — gjør stemmen tydelig nok til å bære gjennom musikk som spiller. Kortere replikker, høyere plassering i frekvensbildet, et lydsignal før tale. Det krever ingen integrasjon, ingen innpakking og ingen tredjepart. Er det godt nok? Hvis ja, bør det gjøres først uansett.

Konkluder med en anbefaling som skiller tydelig mellom *hva som er mulig i dag fra en PWA*, *hva som krever native innpakning*, og *hva som krever en tredjepartsavtale* — og si hvilket steg du ville tatt først.

### 4D. Undertekster og likeverdig opplevelse uten lyd

En stor del av veiledningen ligger i tale. En bruker som er døv eller tunghørt — eller som trener i et rom der lyd ikke er et alternativ, på tog, med sovende barn i naborommet — får i dag ikke den delen av produktet. Det er et likeverdighetsspørsmål, og under WCAG 2.2 også et lovkrav om tekstalternativ til lydinnhold.

**Utgangspunktet er bedre enn det ser ut:** teksten finnes allerede. Hvert lydklipp er generert fra et manuskript i `scripts/voicebank-manuskript.json`, der replikken står som ren tekst ved siden av filnavnet. Underteksting krever altså ikke transkribering — den krever at teksten vises. Vurder hvor stor jobben faktisk er, og om den er blant de billigste tilgjengelighetsgevinstene i produktet.

Utred deretter hva en likeverdig opplevelse krever, som er mer enn å vise ord:

- **Hva skal vises, og hvor?** Undertekst under nedtellingen konkurrerer med den om plass — og øktskjermen er allerede stridsområdet (se spørsmål D). Er en kort tekstlinje riktig, eller er et ikon eller en fargekode nok for de fleste signaler?
- **Dialektspørsmålet.** Replikkene er skrevet på dialekt («Gje gass!», «Gønne på!»). Skal underteksten gjengi dialekten, som er trofast mot stemmen og en del av personligheten — eller bokmål, som er lettere å lese raskt for alle? Finnes det en tredje vei?
- **Hva erstatter lydsignalene?** Faseskifter, nedtellingspip og «fem sekunder igjen» er i dag hørbare hendelser. Appen har allerede bakgrunnsfarge som skifter, og vibrasjon på Android — men ikke på iPhone. Hva er et fullverdig visuelt og taktilt signalsystem, og hvor mye av det finnes allerede uten å være satt i system?
- **Grensetilfellet som avslører designet:** brukeren som verken hører treneren *eller* ser skjermen, fordi telefonen ligger på gulvet under en planke. Hva får den brukeren? Svaret sier noe om hvor mye av produktet som egentlig hviler på én sansekanal.
- **Bør dette være en innstilling, eller alltid på?** En undertekst som alltid vises kan være til nytte for langt flere enn målgruppen — men den koster skjermplass hos alle.

Konkluder med et konkret forslag: hva vises, når, hvordan slås det av og på, og hva er den minste versjonen som gjør reell forskjell.

---

## Del 5 — Modell- og teknologivalg til revisjon

Produkteier ønsker at selve teknologivalgene settes på prøve, ikke bare måten de brukes på. Ingen valg er fredet.

**Dagens situasjon, verifisert:**

| Område | Dagens valg | Merknad |
|---|---|---|
| Bilde | Flux.1-dev + person-LoRA + ControlNet Union Pro | **Ikke-kommersiell lisens** — bevisst valgt, dokumentert i vedlegg A som en kjent kostnad den dagen produktet skal gi inntekt |
| Video | Ikke valgt | Backloggen foreslår Wan-familien; ingenting er bygget |
| Musikk | Ikke i bruk i appen | MiniMax Music 3 (apache-2.0) finnes i drift i søsterprosjektet |
| Stemme | Chatterbox-TTS med kloning fra ekstern seed | Se 4B om lisensgrunnlaget |
| «AI-trener» og «AI-øktgenerator» | **Ingen modell — rent regelbasert.** Null nettverkskall i `localAiCoachService` og `aiWorkoutGeneratorService` | Fungerer offline og forutsigbart, men navnet lover noe annet enn det som leveres |

Vurder hvert område mot **hva som faktisk skal produseres**, ikke mot benchmarklister. En modell som vinner en rangering er irrelevant hvis den ikke løser vår oppgave innenfor vår lisens, vårt VRAM-budsjett og vår tålmodighet.

For hvert område, ta stilling til:

1. **Er valget fortsatt riktig?** Hva har endret seg i tilbudet siden det ble tatt? Verifiser mot kilden — ikke gjett fra hukommelsen hvilke modeller som finnes.
2. **Lisens først.** Produktet er åpent tilgjengelig, og ambisjonen om inntekt er ikke lagt død. Hvilke valg låser den døren, og hva ville det koste å bytte senere kontra nå? Bildebiblioteket er det tydeligste eksempelet: hva er den reelle regningen for å regenerere alt på en kommersielt fri modell?
3. **Passer valget maskinen?** Én RTX 3090 med 24 GB deles med andre prosjekter gjennom en lease-mekanisme. En modell som krever eksklusiv tilgang i timevis har en kostnad utover sin egen kjøretid.
4. **Er det riktig sted å kjøre?** Skille mellom det som produseres én gang og pakkes med appen (bilder, lyd), og det som må skje mens brukeren venter (coaching, øktgenerering). De to har helt ulike krav.

**Om «micro LLM» spesielt.** Dagens regelbaserte tilnærming er ikke åpenbart feil — regler er raske, gratis, offline og forutsigbare, og en trener som sier noe rart er verre enn en som sier noe enkelt. Men vurder ærlig: hvor treffer reglene taket? Hvis en språkmodell skal inn, hvor skal den kjøre — **på enheten** (liten modell i nettleseren: hva koster det i nedlasting, minne og batteri på en fem år gammel telefon, og hva blir kvaliteten på norsk?) eller **på hjemmeserveren** (større modell, bedre norsk — men krever nett og bryter offline-løftet)? Kan de kombineres, slik at appen fungerer uten nett og blir bedre med? Og hvis svaret er at reglene holder: **bør funksjonene da slutte å kalle seg AI?**

Konkluder med en tabell: område, dagens valg, anbefaling (behold / bytt / utred videre), begrunnelse, og hva byttet ville koste.

---

## Del 6 — Plattformvalg: PWA, native, eller begge

Produktet er en progressiv webapp. Spesifikasjonen beskriver allerede en exit-strategi — pakke samme kodebase med Capacitor dersom native sensortilgang blir viktig — men valget er aldri tatt opp til ny vurdering etter at appen ble bygget. Nå er det grunnlag for å gjøre det.

**Begynn med å gjøre regnskapet konkret: hva koster PWA-valget i dag?** Ikke i teorien, men målt i denne appen. Kandidater å undersøke, og gjerne flere:

- Pulsbelte via Web Bluetooth finnes ikke på iOS i det hele tatt — funksjonen er bygget, men halvparten av brukerne ser den aldri
- Lydkonteksten suspenderes ved skjermlås på iOS, og kaldstart er en kjent risikosti i lydsystemet
- Demping av andre apper krever operativsystemets lydfokus (se 4C)
- Apple Health og Health Connect er utilgjengelige
- Push-varsler krever at brukeren har installert appen på hjemskjermen
- Funnbarhet: hvordan finner en ny bruker en PWA, sammenlignet med et søk i App Store?

**Vær like grundig på hva som ikke er plattformens skyld.** Timeren frøs tidligere i bakgrunnen, og det ble løst i web — med en worker-metronom og reankring mot veggklokke. Det er et viktig presedens: noen «PWA-begrensninger» viser seg å være løsbare med bedre webarkitektur. Skill derfor tydelig mellom det som er **umulig** på plattformen, det som er **vanskelig men gjort**, og det som bare **ikke er forsøkt**. En native-innpakning som begrunnes med problemer som kunne vært løst i web, er en dyr snarvei.

**Vurder så hva PWA gir som native ikke gir**, og hva det ville koste å miste: oppdatering samme sekund uten review-kø, delbare lenker rett inn i en økt, null installasjonsfriksjon for en som bare vil prøve, én kodebase, ingen utviklerkontoer eller årsavgifter, ingen plattformavgift den dagen produktet eventuelt skal tjene penger.

**Til slutt strategien.** Er svaret PWA, native, eller begge — og i så fall hvordan? En Capacitor-innpakning av samme kodebase er noe annet enn å skrive en native app. Hvis begge: hvilken er hovedkanalen, hvilke funksjoner er eksklusive for hvilken, og hvordan unngår dere at grensesnittet må vedlikeholdes to steder? Hvis PWA alene: hva må dere da si tydelig til brukerne om hva appen ikke kan, i stedet for at funksjoner bare er usynlige på iPhone?

Gi en anbefaling med **utløsende betingelser** — ikke «kanskje senere», men «vi bytter når X er sant». Eksempler på slike terskler kan være at pulsmåling blir avgjørende for produktet, at brukere faktisk etterspør Apple Health, eller at lydfokus viser seg umulig å leve uten.

---

## Del 7 — Forvaltning: admin-flaten som ikke finnes

Produkteier konstaterer at det ikke finnes noe administrasjonsgrensesnitt, og spør hvorfor — og hva det burde inneholde.

**Start med hvorfor, for svaret ligger i koden.** To observasjoner å ta stilling til:

- Sikkerhetsreglene definerer en felles øvelseskolleksjon i databasen med kommentaren om at bare backend eller admin kan endre den. **Kolleksjonen leses aldri av appen.** Datamodellen forutsetter altså et forvaltningslag som aldri ble bygget.
- Alle øvelser og programmer ligger hardkodet i kildefiler. Å rette en skrivefeil i en øvelsesinstruks krever kodeendring, kodegjennomgang, bygg og utrulling.

Vurder om dette forklarer noe større: øvelsesbiblioteket har stått stille på 25 øvelser gjennom hele utviklingsperioden, mens funksjonsmengden har vokst kraftig. **Er innholdsproduksjon blitt en utviklingsoppgave, og er det derfor den taper hver gang?** Hvis ja, er det et argument for at forvaltning ikke er en luksus, men flaskehalsen.

**Så hva bør flaten inneholde?** Ikke start med en funksjonsliste. Start med spørsmålet som avgrenser den:

> **Hvilke spørsmål om produktet kan produkteier ikke få svar på i dag — og hvor burde svaret bodd?**

Innholdsforvaltning er bare ett av områdene. Utred minst disse, prioritér dem, og suppler gjerne:

**Driftsinnsikt og telemetri.** Her er et konkret funn å bygge videre på. Appen skriver telemetri til seks dokumenter — oversikt, engasjement, ytelse, øvelser, vurderinger og klokkesynk — men henter bare tre av dem tilbake, og de tre vises til *sluttbrukeren* i øvelsesbiblioteket og innstillingene. **Ytelses- og engasjementsdataene leses aldri av noen.** Det er verdt å merke seg hva som ligger i ytelsesdokumentet: bøttene for lydavvik, som gjenopptakelsesnotatet gjør til selve go/no-go-kriteriet for produksjonslansering. Beslutningsgrunnlaget for å lansere skrives altså til en database ingen har et sted å lese det fra. Vurder hva som faktisk må kunne besvares løpende — er appen frisk, blir økter fullført, hvor mange avbryter og hvor, hvilke programmer brukes aldri — og hva som bare er tall det er hyggelig å se på.

**Feil og hendelser.** I dag ser brukeren en feilmelding; utvikleren ser ingenting. Det finnes ingen feilrapportering fra produksjon. Men vurder løsningen før dere bygger noe: en Sentry-kompatibel feiltjeneste kjører allerede i samme hjemmelab, og bruker-ID-fri feilrapportering er et løst problem med ferdige biblioteker. **Spørsmålet er neppe om dere skal bygge et feildashboard, men om dere skal koble dere på et som finnes.** Ta stilling til det, og til hva som må gjelde for personvern når feilrapporter sendes ut av appen.

**Tilbakemelding fra brukere.** Det finnes i dag ingen vei fra en bruker som oppdager noe galt, til den som kan rette det. For en app som er åpen for alle er det et reelt hull — men det er også en forpliktelse: en kanal som ingen svarer i, er verre enn ingen kanal. Utred hva slags kanal som passer omfanget (i appen, e-post, et skjema, en lenke til utgaveregisteret), hvordan tilbakemelding knyttes til kontekst uten å samle personopplysninger, og hvem som skal svare hvor raskt.

**Innholdshelse.** Et forvaltningsverktøy burde kunne vise at et program peker på øvelser som ikke finnes, at bilder mangler eller er merket med feil status, eller at en persona mangler klipp for en ny øvelse. Merk at nettopp den typen feil har fått stå lenge i dette produktet uten å bli oppdaget.

**Media og produksjon.** Godkjenne, avvise og bestille ny generering av bilder, video og lydklipp, med sporbar status per element, og innsyn i om en GPU-jobb kjører eller feilet. Det finnes allerede et embryo i bildekuratoren — vurder om det bør bygges ut, erstattes eller fjernes, og merk at det i dag er synlig for enhver innlogget bruker.

**Personvern og brukerstøtte.** Behandlingsansvarlig har plikter som forutsetter at noen kan finne, eksportere og slette data for en enkeltbruker på forespørsel — og kunne dokumentere at det ble gjort.

**Kostnad.** Tjenesten kjører på en betalingsmodell der bruk koster. Hvem oppdager en uventet regning, og hvor fort?

**Kontroll.** Slå funksjoner av eller på uten ny utrulling — særlig relevant for noe som viser seg å feile i felt.

**Moderering.** Foreløpig lite aktuelt, men blir det hvis brukerskapt innhold noen gang deles mellom brukere.

**Still så motspørsmålet, og mén det.** Mye av dette har allerede et sted å bo: databasens egen konsoll, plattformens driftsvisning, feiltjenesten i hjemmelaben, utgaveregisteret på kodeverten. **Å bygge et eget dashbord som duplikerer verktøy dere allerede har, er ny kode å vedlikeholde uten ny innsikt.** Skille derfor mellom:

- hva som må være **et eget grensesnitt**, fordi det ikke finnes noe sted i dag
- hva som bør **kobles til noe som allerede finnes**
- hva som holder som **et verktøy i terminalen** for én forvalter
- og hva som egentlig bare krever at **innholdet flyttes ut av kildekoden**

Det siste kan være grepet som frigjør mest, til lavest pris.

Konkluder med en anbefaling i tre nivåer: hva som trengs før lansering, hva som trengs når det er mer enn én forvalter, og hva som først blir relevant hvis produktet vokser. Si også hva som *ikke* bør bygges, og hvorfor.

---

## Del 8 — Varslinger og påminnelser

Appen har mekanikker som forutsetter at brukeren kommer tilbake — ukesmål, uke-streak, milepæler — men **ingen måte å minne noen på noe.** Verken push-varsler eller lokale varsler er implementert; arkitekturkapittelet i spesifikasjonen lister meldingstjenesten, men den er aldri tatt i bruk. En bruker som glemmer å trene, får aldri vite det, og oppdager først ved neste åpning at serien røk.

Samtidig har produktet allerede tatt stilling — og det er verdt å legge merke til hvordan. I koden som feirer en milepæl står det uttrykkelig at det **aldri** skal utløse et push-varsel. Streak-designet er gjennomgående utformet uten skam: et brudd omtales som en ny start, ikke som et tap. **Enhver anbefaling om varsling må være forenlig med det valget**, ikke overkjøre det. Undersøk begrunnelsen før du foreslår noe.

**Behovsspørsmålet først.** Hva vil en bruker faktisk ha beskjed om? Kandidater med svært ulik verdi: en avtalt treningstid som nærmer seg, en uke som går mot slutten uten at målet er nådd, en ukesoppsummering, at noen har invitert deg til et grupperom, eller at en økt ble avbrutt og kan gjenopptas. Vurder hver av dem på om den er **noe brukeren har bedt om**, eller noe appen ønsker seg på egne vegne.

**Den etiske grensen, som må trekkes eksplisitt.** Treningsapper er blant de verste på manipulerende varsling — «du mister serien din i kveld» er den klassiske formen. Produktet har bevisst valgt bort skam i streak-designet. Hvor går grensen mellom en nyttig påminnelse og et press? Hvem bestemmer hyppigheten? Hva skjer med en bruker som ikke har trent på tre uker — skal appen ta kontakt i det hele tatt, og i så fall hvordan uten å bli en dårlig samvittighet i lomma?

**Det tekniske regnskapet.** Vurder alternativene mot hverandre, ikke bare push mot ingenting:

- **Push-varsler** krever tillatelse fra brukeren, en serverkomponent, og på iPhone at appen først er lagt til hjemskjermen. Hvor mange av brukerne oppfyller egentlig det siste? Dette er også et tall som hører hjemme i plattformregnskapet i del 6.
- **Kalenderoppføringer** er en undervurdert vei: appen har allerede kalendereksport. En treningsavtale i brukerens egen kalender gir påminnelse uten at appen ber om varslingstillatelse, uten serverkomponent, og den virker selv om appen aldri åpnes. Brukeren eier den, kan flytte den og kan slette den. Er dette godt nok for det viktigste behovet?
- **Varsling i appen** — det brukeren møter ved neste åpning — koster ingenting og risikerer ingenting, men når bare den som allerede kommer tilbake.
- **Ingen varsling** er også et gyldig svar, og bør vurderes på like fot.

Konkluder med en anbefaling som sier hva som varsles, gjennom hvilken kanal, hvem som styrer det, og hvordan tonen holdes i tråd med resten av produktet. Ta med det minste steget — og hvis det minste steget er en kalenderoppføring fremfor et varslingssystem, si det.

---

## Metodekrav

- **Test den kjørende appen**, ikke bare koden. Gjennomfør en hel økt. Prøv den på mobil hvis mulig, i både stående og liggende format, med tastatur, og med skjermleser.
- **Kildekoden er bevis, ikke utgangspunkt.** Bruk den til å forklare *hvorfor* noe er som det er — etter at du har observert *at* det er det.
- **Mål, ikke anslå.** Kontrastforhold, pikselstørrelser, antall trykk, lastetid: oppgi tall og hvordan du målte dem.
- **Skill observasjon fra tolkning.** «Knappen er 20×20 px» er en observasjon. «Den er for liten» er en vurdering med et krav bak. Hold dem fra hverandre.
- **Ett funn = ett sted i koden.** Oppgi fil og linje der det er relevant, slik at funnet kan handles på uten detektivarbeid.
- **Vær kritisk, men løsningsorientert.** Hvert funn skal ha et forslag. Der du foreslår å fjerne noe, si hva som dekker behovet i stedet. Der du foreslår noe stort, oppgi det minste første steget.
- **Si også hva som er bra**, og hvorfor det er bra — vi trenger å vite hva som ikke må røres i en opprydding.

---

## Leveranse

**1. Førsteinntrykk (skriv denne før alt annet).**
Hva forsto du umiddelbart? Hva måtte du lete etter? Hva trodde du feil? Hva ga du opp? Rå notater fra de første 30 minuttene, ubearbeidet — verdien ligger i at de er uinformerte.

**2. Panelets sammendrag.**
Én til to sider. Modenhetsvurdering, den viktigste innsikten fra hver fagperson, og eventuelle uenigheter i panelet — med begge sider.

**3. Svar på A–D**, hver med: hva som faktisk skjer, hvorfor det trolig ble slik, hva det koster brukeren, og hva du anbefaler.

**4. Funnliste**, sortert etter alvorlighet:
- **Blokker** — hindrer bruk, bryter lov, eller gjør at brukeren mister data eller tillit
- **Alvorlig** — koster tid, skaper forvirring eller frustrasjon gjentatte ganger
- **Moderat** — inkonsistens og friksjon som tærer over tid
- **Polering** — kosmetikk og finpuss

Per funn: *observasjon · begrunnelse med rammeverk eller lovkrav · konsekvens for brukeren · konkret forslag · antatt innsats.*

**5. Redesign-forslag for startskjermen.**
Punkt D peker på et strukturelt spørsmål, ikke en detalj. Skissér hva startskjermen bør inneholde, i hvilken prioritert rekkefølge, og hva som bør flyttes eller fjernes. Beskriv i ord og gjerne som enkel wireframe. Begrunn ut fra hva brukeren faktisk gjør der.

**6. Innovasjonskapittel.** Sløyfekartet, forslagene til lukking, og moonshots med fundament.

**7. Medieutredning (del 4).** Tre beslutningsnotater vi kan handle på:
- **Bevegelse:** alternativene satt opp mot hverandre med kostnad, filstørrelse, lisens og redigerbarhet — og en klar anbefaling om *om*, *hvor* og *når* bevegelse skal vises. Ta stilling til om det minste steget (kryssing mellom de to bildene som allerede finnes) bør prøves før noe større bygges. Inkludér kildestrategien: hva bygges selv, hva hentes åpent, og på hvilket juridisk grunnlag.
- **Stemme:** vurdering av lokal seed-produksjon mot dagens eksterne, kritikk av produksjonsprosessen, og en anbefalt arkitektur for kontekstbevisst coaching — med det minste steget som gir merkbar forskjell.
- **Lydbilde:** hva appen skal levere av lyd under en økt, og et tydelig skille mellom hva som er mulig fra en PWA i dag, hva som krever native innpakning, og hva som krever en tredjepartsavtale.
- **Uten lyd:** konkret forslag til undertekster og visuelle/taktile signaler — hva vises, når, og hva er den minste versjonen som gjør reell forskjell.

Alle notatene skal oppgi hva som må være sant for at anbefalingen skal holde, og hva som ville fått deg til å ombestemme deg.

**8. Modellrevisjon (del 5).** Tabell over område, dagens valg, anbefaling (behold / bytt / utred videre), begrunnelse og byttekostnad. Lisens skal være eksplisitt vurdert for hvert valg. Ta også stilling til om de regelbaserte funksjonene bør kalle seg AI.

**9. Plattformnotat (del 6).** Regnskapet for hva PWA-valget koster i dag, skilt fra det som bare ikke er forsøkt løst i web — og en anbefaling med utløsende betingelser for et eventuelt bytte.

**10. Forvaltningsnotat (del 7).** Hvorfor admin-flaten mangler, og hvilke spørsmål om produktet som ikke kan besvares i dag. Del funnene i fire: bygg eget, koble til noe som finnes, hold det i terminalen, eller flytt innholdet ut av koden. Svar i tre nivåer (før lansering / flere forvaltere / ved vekst), og si også hva som *ikke* bør bygges.

**11. Varslingsnotat (del 8).** Hva som varsles, gjennom hvilken kanal, hvem som styrer det, og hvordan tonen holdes i tråd med streak-designets bevisste fravær av skam. Vurder kalenderveien på like fot med push — og «ingen varsling» som et gyldig svar.

**12. Prioritert veikart.**
- **Denne uken** — små inngrep, stor effekt
- **Før lansering** — det som må være på plass før appen deles bredt
- **Neste kvartal** — strukturelle grep
- **Fjern eller frys** — hva bør *tas bort*. Vi tar dette punktet like alvorlig som de andre.

**13. Kryssjekk mot tidligere revisjoner** (les dem først nå). Hva så du som de ikke så? Hva er du uenig i? Hvilke funn har de rapportert som fortsatt står åpne, og hva sier det om hvordan vi jobber?

---

## Til slutt

Vi ønsker oss ikke en snill rapport. Systemet er bygget fort, av få, med høy teknisk disiplin på noen områder og betydelig gjeld på andre. Det tåler å bli lest kritisk.

Det vi ønsker oss er **en revisjon som gjør oss i stand til å ta bedre beslutninger** — ikke bare en liste over ting som er galt, men en forståelse av *hvorfor* de ble slik, slik at neste ukes arbeid ikke produserer de samme feilene på nytt.

Om du må velge mellom å være grundig og å være tydelig: velg tydelig.

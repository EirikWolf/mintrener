# Revisjon A — Opplevelsen

**Objekt:** «Min Trener», norsk PWA for intervalltrening. Live: `https://mintrener.web.app` · Kode: `github.com/EirikWolf/mintrener` (offentlig) · Dokumentasjon i `docs/`.

Denne revisjonen handler om alt brukeren møter. Medieproduksjon, stemme og lisens dekkes i **Revisjon B1**; plattform, forvaltning og læringssløyfer i **Revisjon B2** — hold deg unna dem her.

---

## Metodekrav

**Bruk appen før du åpner én kildefil** — og gi det ordentlig tid; et menneske bør regne minst en halvtime. Rekkefølgen er det bindende, ikke minuttene. Gjennomfør en hel økt. Lag en egen øvelse. Bygg et program. Prøv å finne igjen noe du lagret. Skriv ned alt du lurer på underveis, også det som føles for dumt til å spørre om.

Deretter forankrer du funnene i koden. Observér først, forklar etterpå.

Den notatlisten er ditt mest verdifulle funn, og den kan ikke rekonstrueres senere: i det øyeblikket du forstår *hvorfor* noe er som det er, slutter du å se *at* det er rart.

Tidligere revisjoner ligger i `docs/`. Les dem **sist**, som kryssjekk.

Ellers: mål framfor anslå (kontrast, piksler, antall trykk). Skill observasjon fra vurdering. Oppgi fil og linje der det er relevant. Vær kritisk, men gi alltid et forslag — og si hva som er bra, så vi vet hva som ikke må røres.

**Når et spørsmål krever en fysisk enhet.** Emulert viewport er ikke det samme som en telefon i hånden. Skjermleser i praksis, lyd ved skjermlås, hvordan trykkflater treffer med tommelen, og hva som skjer når skjermen slukker midt i en økt — det må måles på en ekte iPhone og en ekte Android. **Har du ikke enhetene: si det, og la spørsmålet stå ubesvart.** En lærebokgjengivelse i revisjonsform er verre enn et hull, fordi den ser ut som et funn og blir behandlet som ett. Marker hva som gjenstår og hva slags utstyr som skal til.

---

## Systemet kort

Mobil først, installerbar, offline-orientert. React/TypeScript, ~40 000 linjer, 780 tester. Bygget svært raskt — hoveddelen på under en uke — med reell testdisiplin, men også kraftig funksjonstilvekst.

**Målgrupper:** enkeltbrukere, kontorpauser, barnefamilier, **seniorer (også sittende)**, kor, idrettslag.
**Enheter:** Samsung S21/Chrome er primær. iPhone/Safari skal fungere for alt kjernefunksjonelt.
**Særtrekk:** fire syntetiske trenerstemmer med norsk dialekt, omtrent 150 lydklipp.

Kravene systemet skal måles mot står i `docs/trening-app-spesifikasjon.md`.

---

## Fagperspektiver

Revisjonen skal dekke disse fagenes perspektiver. **Men ikke iscenesett et panel.** Én leser som spiller sju roller produserer teater, ikke innsikt — og en påstand blir ikke sannere av at den tillegges «visuell designer».

Bruk i stedet fagene som **motsetninger i saken**: der to hensyn faktisk trekker i hver sin retning, skal spenningen stå igjen i rapporten, med begge sider og hva som avgjør. Tilgjengelighet mot informasjonstetthet, tempo mot trygghet, dybde mot enkelhet. Vil dere ha ekte flerstemmighet, kjør fagene som separate revisjoner og flett resultatene — ikke som roller i én tekst.

| Fagperspektiv | Mandat |
|---|---|
| **Interaksjonsdesign** | Navigasjon, mentale modeller, hvor ting «bor» og om brukeren kan gjette det |
| **Visuell design** | Hierarki, typografi, farge som informasjonsbærer, hva øyet finner først |
| **Universell utforming** | WCAG 2.2 AA (norsk lov), tastatur, skjermleser, kontrast, trykkflater, kognitiv tilgjengelighet |
| **Treningsfaglig (fysioterapi/PT)** | Er øvelsene forsvarlige og trygge for de svakeste målgruppene? Er dosering og progresjon fornuftig? |
| **Innholdsdesign (norsk)** | Mikrotekst, tone, bokmålskvalitet — og om språket lover noe appen ikke holder |
| **Produktledelse** | Verdi per funksjon, hva som bør fjernes, hva som blokkerer lansering |
| **Utforskende testing** | Avbrutt økt, mistet nett, skjerm som slukker, raske gjentatte trykk |

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

## Del 1 — Begrunnelsesplikt

Den bærende ideen: **hvert element må kunne forsvare sin plass.** For alt som tar skjermareal eller oppmerksomhet — hvem er det for, hva erstatter det, hva skjer om vi fjerner det, og hvorfor står det akkurat der?

Produkteier har stilt fire slike spørsmål. De er kalibreringsoppgaven din — de viser hvilken *type* funn vi er ute etter.

**A. Hvorfor kan ikke egne øvelser merkes som favoritt?**
Favoritter finnes for programmer. Egne øvelser lages, men behandles annerledes. Glemt funksjon eller bevisst skille? Hva sier det om hvor mye brukerens eget innhold er verdt? Se bredere: hvor ellers er brukerskapt innhold andrerangs?

**B. Hvorfor er det to TV-ikoner på forsiden?**
Verifisert: `TimerDisplay.tsx` linje 421 og 722 — to knapper, samme ikon, samme farge, **identisk handling**, 300 linjer fra hverandre. Skjermlesertekstene skiller seg med én bindestrek. Det interessante er ikke hvilken som skal bort, men **hvordan duplikater oppstår uten at noen ser dem** — og hvor mange flere som finnes.

**C. Hvorfor føles det som at økten starter på en ny side?**
Produkteier opplevde det slik, men teknisk stemmer det ikke: økten er en tilstand i samme skjerm, ikke et eget sted. Opplevelsen kommer trolig av at bunnmenyen forsvinner når økten kjører. **Det er nettopp spriket som er interessant.** Er en økt et *sted man går til*, eller en *tilstand skjermen går inn i*? Hvilken modell har appen valgt, er valget gjennomført, og hva skjer med brukerens orientering når skjermen delvis bytter karakter uten å bytte sted? Merk: ingen URL-ruting, så tilbakeknappen lukker appen.

**D. Hva skal startskjermen egentlig bruke plassen på?**
Nedtellingssirkelen er skjermens største element, og den deler plass med favorittøktene — det brukeren faktisk skal velge mellom. **Observert på prod: i bredt format overlapper de to lagene og teksten kolliderer.** To informasjonsstrukturer okkuperer samme piksler uten at noen av dem viker. Hva bør skjermen prioritere, og hva sier dagens prioritering om hvem den er laget for?

**Finn minst fem funn til av samme klasse:** duplikater, elementer uten forsvar, funksjoner som lover mer enn de gir, ting som er der fordi de ble bygget.

---

## Del 2 — Analytiske pilarer

Bruk navngitte rammeverk og oppgi hvilket. Et funn uten begrunnelse er en smaksdom.

1. **Kognitiv arkitektur.** Cognitive Load Theory og Gestalt. Hvor mange valg møter brukeren på startskjermen, og finner øyet et mønster? **Hick's lov** på funksjonsmengden.
2. **Interaksjonsøkonomi.** **Fitts' lov** — særlig under økt, der brukeren er andpusten, svett, og telefonen kan ligge på gulvet. Antall trykk til de fem vanligste målene.
3. **Universell utforming.** WCAG 2.2 AA er lovkrav. Tastatur ende-til-ende, skjermleser i dialoger, målte kontrastverdier, trykkflater. Og **kognitiv tilgjengelighet** — appen retter seg mot seniorer og barn.
4. **Systemisk konsistens.** Gjøres samme handling likt overalt? Betyr blå det samme to steder? Finnes ett designsystem, eller forhandles hver skjerm på nytt?
5. **Heuristikk.** Nielsens ti, med vekt på systemstatus (vet brukeren at noe ble lagret?), brukerkontroll (kan man angre?) og feilforebygging.
6. **Treningsfaglig forsvarlighet.** Instruksene leses av folk som trener alene. Er de riktige? Er progresjonen trygg? Får de svakeste øvelser de faktisk kan gjøre? Se særlig hva som vises når systemet ikke finner øvelsen et program ber om.

---

## Del 3 — Opplevelsen uten lyd

> **Forutsetter at revisoren kan høre.** Kan du ikke spille av lyd, si det og hopp over vurderingen av *hva* stemmene gjør. Resten av delen — teksten som finnes, hvor den skal vises, hva som erstatter lydsignalene — kan besvares fra manuskriptet og grensesnittet alene. Ikke gjett deg til hvordan lyden oppleves.

Mye av veiledningen ligger i tale. En døv eller tunghørt bruker — eller en som trener der lyd ikke er et alternativ — får ikke den delen av produktet. Det er et likeverdighetsspørsmål og under WCAG også et krav om tekstalternativ.

**Utgangspunktet er bedre enn det ser ut:** teksten finnes allerede. Hvert lydklipp er generert fra `scripts/voicebank-manuskript.json`, der replikken står som ren tekst. Underteksting krever ingen transkribering, bare visning. Vurder hvor liten jobben egentlig er.

Utred så hva likeverdighet krever utover ord:

- **Hvor skal teksten stå?** Øktskjermen er allerede stridsområdet (se D). Trengs en tekstlinje, eller holder et ikon eller en farge for de fleste signaler?
- **Dialekt eller bokmål?** Replikkene er på dialekt («Gje gass!»). Trofast mot stemmen, eller lettere å lese raskt?
- **Hva erstatter lydsignalene?** Faseskifter og pip er hørbare hendelser. Bakgrunnsfargen skifter allerede, og Android har vibrasjon — iPhone ikke. Hva er et fullverdig visuelt og taktilt signalsystem?
- **Grensetilfellet som avslører designet:** brukeren som verken hører treneren eller ser skjermen, fordi telefonen ligger på gulvet under en planke. Hva får den brukeren?
- **Alltid på, eller innstilling?** Undertekst hjelper flere enn målgruppen, men koster skjermplass hos alle.

---

## Del 4 — Varslinger og påminnelser

Appen har ukesmål, streak og milepæler — mekanikker som forutsetter at brukeren kommer tilbake — men **ingen måte å minne noen på noe.** Verken push eller lokale varsler er implementert.

Samtidig har produktet allerede tatt stilling: koden som feirer en milepæl er uttrykkelig merket med at den *aldri* skal utløse push. Streak-designet er gjennomgående uten skam — et brudd omtales som ny start, ikke tap. **Enhver anbefaling må være forenlig med det valget.** Undersøk begrunnelsen før du foreslår noe.

- **Hva vil brukeren faktisk ha beskjed om?** En avtalt treningstid, en uke som ebber ut, en ukesoppsummering, en gruppeinvitasjon, en avbrutt økt. Vurder hver: er dette noe brukeren har bedt om, eller noe appen ønsker på egne vegne?
- **Den etiske grensen.** «Du mister serien i kveld» er sjangerens klassiske mørke mønster. Hvor går grensen mellom påminnelse og press? Hva gjør appen med en som ikke har trent på tre uker — tar den kontakt i det hele tatt, og hvordan uten å bli dårlig samvittighet i lomma?
- **Kanalene, vurdert mot hverandre.** Push krever tillatelse, en server, og på iPhone at appen er lagt til hjemskjermen. **Kalenderoppføring** er en undervurdert vei — appen har allerede kalendereksport, og en avtale i brukerens egen kalender gir påminnelse uten varslingstillatelse, uten server, og virker selv om appen aldri åpnes. Varsling i appen koster ingenting, men når bare den som allerede kommer tilbake. **Ingen varsling er også et gyldig svar.**

Hvis det minste steget er en kalenderoppføring fremfor et varslingssystem, si det.

---

## Leveranse

1. **Førsteinntrykk** — skriv denne før alt annet. Hva forsto du straks, hva måtte du lete etter, hva trodde du feil, hva ga du opp? Rå notater; verdien ligger i at de er uinformerte.
2. **Sammendrag** — én til to sider. Modenhet, viktigste innsikt, og de faglige motsetningene du støtte på, med begge sider og hva som avgjør.
3. **Svar på A–D** — hva som skjer, hvorfor det trolig ble slik, hva det koster brukeren, hva du anbefaler.
4. **Funnliste** sortert som *blokker / alvorlig / moderat / polering*. Per funn: observasjon · begrunnelse med rammeverk eller lovkrav · konsekvens · forslag · antatt innsats.
   **Blokker** betyr: hindrer en bruker i å fullføre noe sentralt, bryter lov, eller ødelegger data eller tillit. Et lovbrudd er en blokker selv om de fleste brukere ikke merker det. Er du i tvil, plassér det som blokker og si hvorfor du tvilte.
5. **Redesign av startskjermen** — spørsmål D er strukturelt, ikke kosmetisk. Hva bør skjermen inneholde, i hvilken rekkefølge, hva flyttes eller fjernes? Ord, gjerne enkel skisse. Begrunn ut fra hva brukeren faktisk gjør der.
6. **Veikart:** denne uken · før lansering · neste kvartal · **fjern eller frys**. Det siste punktet tas like alvorlig som de andre.
7. **Kryssjekk mot tidligere revisjoner** (les dem nå). Hva så du som de ikke så? Hva er du uenig i? Hvilke funn står fortsatt åpne, og hva sier det om hvordan vi jobber?

---

Vi ønsker oss ikke en snill rapport. Systemet er bygget fort, av få, med høy disiplin på noen områder og betydelig gjeld på andre. Det tåler å bli lest kritisk.

Vi vil ha en revisjon som gjør oss i stand til å ta bedre beslutninger — ikke bare en liste over feil, men en forståelse av *hvorfor* de oppsto, så neste ukes arbeid ikke lager dem på nytt.

Må du velge mellom grundig og tydelig: velg tydelig.

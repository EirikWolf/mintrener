# Revisjon A — Opplevelsen

**Objekt:** «Min Trener», norsk PWA for intervalltrening. Live: `https://mintrener.web.app` · Kode: `github.com/EirikWolf/mintrener` (offentlig) · Dokumentasjon i `docs/`.

Denne revisjonen handler om alt brukeren møter. Teknologivalg, medieproduksjon, plattform og forvaltning dekkes i **Revisjon B** — hold deg unna dem her.

---

## Metodekrav

**Bruk appen i minst 30 minutter før du åpner én kildefil.** Gjennomfør en hel økt. Lag en egen øvelse. Bygg et program. Prøv å finne igjen noe du lagret. Skriv ned alt du lurer på underveis, også det som føles for dumt til å spørre om.

Den notatlisten er ditt mest verdifulle funn, og den kan ikke rekonstrueres senere: i det øyeblikket du forstår *hvorfor* noe er som det er, slutter du å se *at* det er rart.

Tidligere revisjoner ligger i `docs/`. Les dem **sist**, som kryssjekk.

Ellers: mål framfor anslå (kontrast, piksler, antall trykk). Skill observasjon fra vurdering. Oppgi fil og linje der det er relevant. Vær kritisk, men gi alltid et forslag — og si hva som er bra, så vi vet hva som ikke må røres.

---

## Systemet kort

Mobil først, installerbar, offline-orientert. React/TypeScript, ~40 000 linjer, 780 tester. Bygget svært raskt — hoveddelen på under en uke — med reell testdisiplin, men også kraftig funksjonstilvekst.

**Målgrupper:** enkeltbrukere, kontorpauser, barnefamilier, **seniorer (også sittende)**, kor, idrettslag.
**Enheter:** Samsung S21/Chrome er primær. iPhone/Safari skal fungere for alt kjernefunksjonelt.
**Særtrekk:** fire syntetiske trenerstemmer med norsk dialekt, omtrent 150 lydklipp.

Kravene systemet skal måles mot står i `docs/trening-app-spesifikasjon.md`.

---

## Panelet

Lever som et tverrfaglig panel, ikke som én generalist. Hver stemme skal være gjenkjennelig, og uenighet skal stå igjen i rapporten — ikke glattes ut.

| Fagperson | Mandat |
|---|---|
| **Interaksjonsdesigner** | Navigasjon, mentale modeller, hvor ting «bor» og om brukeren kan gjette det |
| **Visuell designer** | Hierarki, typografi, farge som informasjonsbærer, hva øyet finner først |
| **Spesialist i universell utforming** | WCAG 2.2 AA (norsk lov), tastatur, skjermleser, kontrast, trykkflater, kognitiv tilgjengelighet |
| **Fysioterapeut / PT** | Er øvelsene forsvarlige og trygge for de svakeste målgruppene? Er dosering og progresjon fornuftig? |
| **Innholdsdesigner (norsk)** | Mikrotekst, tone, bokmålskvalitet — og om språket lover noe appen ikke holder |
| **Produktsjef** | Verdi per funksjon, hva som bør fjernes, hva som blokkerer lansering |
| **Utforskende tester** | Avbrutt økt, mistet nett, skjerm som slukker, raske gjentatte trykk |

---

## Del 1 — Begrunnelsesplikt

Den bærende ideen: **hvert element må kunne forsvare sin plass.** For alt som tar skjermareal eller oppmerksomhet — hvem er det for, hva erstatter det, hva skjer om vi fjerner det, og hvorfor står det akkurat der?

Produkteier har stilt fire slike spørsmål. De er kalibreringsoppgaven din — de viser hvilken *type* funn vi er ute etter.

**A. Hvorfor kan ikke egne øvelser merkes som favoritt?**
Favoritter finnes for programmer. Egne øvelser lages, men behandles annerledes. Glemt funksjon eller bevisst skille? Hva sier det om hvor mye brukerens eget innhold er verdt? Se bredere: hvor ellers er brukerskapt innhold andrerangs?

**B. Hvorfor er det to TV-ikoner på forsiden?**
Verifisert: `TimerDisplay.tsx` linje 421 og 722 — to knapper, samme ikon, samme farge, **identisk handling**, 300 linjer fra hverandre. Skjermlesertekstene skiller seg med én bindestrek. Det interessante er ikke hvilken som skal bort, men **hvordan duplikater oppstår uten at noen ser dem** — og hvor mange flere som finnes.

**C. Hvorfor starter økten på en ny side?**
Er en økt et *sted man går til*, eller en *tilstand skjermen går inn i*? Begge er forsvarbare. Hvilken har appen valgt, er den konsekvent, og hva skjer med brukerens orientering i overgangen? Merk: ingen URL-ruting, så tilbakeknappen lukker appen.

**D. Hvorfor har forsiden en stor nedtellingssirkel når økten starter et annet sted?**
Sirkelen er startskjermens største element og viser en nedtelling som ikke går. Favorittøktene — det brukeren faktisk skal velge mellom — ligger under. **Observert på prod: i bredt format overlapper nedtellingslaget favorittlisten og teksten kolliderer.** Hva *bør* startskjermen bruke plassen på?

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

## Del 5 — Lærer produktet av bruk?

Ikke en ønskeliste. Vi vil vite hvordan produktet blir bedre av å bli brukt, uten at noen skriver ny kode.

**Kartlegg sløyfene som finnes.** Systemet samler allerede inn øktvurderinger («for lett / passe / for tungt»), telemetri, personlige rekorder og historikk. For hver: *hvor går dataene, og hva endrer seg som følge av dem?* En innsamling som ikke påvirker noe er ikke en sløyfe — den er en kostnad. Finn de åpne endene.

**Foreslå lukking**, med det minste inngrepet først, og prioritér der dataene allerede finnes.

**Vurder tilbakemeldingen.** Får brukeren vite at systemet har lært noe? En tilpasning som skjer usynlig oppleves ikke som intelligens, men som uforutsigbarhet.

**Moonshots — tre til fem.** Hvert forslag skal bygge på noe som allerede finnes, navngi hva som må på plass først, og si hva som gjør det vanskelig å kopiere. Et moonshot uten fundament er en distraksjon.

---

## Leveranse

1. **Førsteinntrykk** — skriv denne før alt annet. Hva forsto du straks, hva måtte du lete etter, hva trodde du feil, hva ga du opp? Rå notater; verdien ligger i at de er uinformerte.
2. **Panelets sammendrag** — én til to sider. Modenhet, viktigste innsikt per fagperson, og uenigheter i panelet med begge sider.
3. **Svar på A–D** — hva som skjer, hvorfor det trolig ble slik, hva det koster brukeren, hva du anbefaler.
4. **Funnliste** sortert som *blokker / alvorlig / moderat / polering*. Per funn: observasjon · begrunnelse med rammeverk eller lovkrav · konsekvens · forslag · antatt innsats.
5. **Redesign av startskjermen** — spørsmål D er strukturelt, ikke kosmetisk. Hva bør skjermen inneholde, i hvilken rekkefølge, hva flyttes eller fjernes? Ord, gjerne enkel skisse. Begrunn ut fra hva brukeren faktisk gjør der.
6. **Innovasjonskapittel** — sløyfekart, forslag til lukking, moonshots med fundament.
7. **Veikart:** denne uken · før lansering · neste kvartal · **fjern eller frys**. Det siste punktet tas like alvorlig som de andre.
8. **Kryssjekk mot tidligere revisjoner** (les dem nå). Hva så du som de ikke så? Hva er du uenig i? Hvilke funn står fortsatt åpne, og hva sier det om hvordan vi jobber?

---

Vi ønsker oss ikke en snill rapport. Systemet er bygget fort, av få, med høy disiplin på noen områder og betydelig gjeld på andre. Det tåler å bli lest kritisk.

Vi vil ha en revisjon som gjør oss i stand til å ta bedre beslutninger — ikke bare en liste over feil, men en forståelse av *hvorfor* de oppsto, så neste ukes arbeid ikke lager dem på nytt.

Må du velge mellom grundig og tydelig: velg tydelig.

# Revisjon A — Opplevelsen: funn

**Revidert:** `https://mintrener.web.app`, prod i synk med main (`26c7fb5`)
**Dato:** 2026-08-26
**Metode:** appen brukt før én kildefil ble åpnet. Ingen tidligere revisjoner lest på forhånd.

---

## 0. Om metoden — les denne først

Bestillingen ber om ærlighet. Da må jeg begynne med hva denne revisjonen **ikke** er, ellers leser dere den som noe den ikke kan være.

**«Minst 30 minutter» kan jeg ikke etterleve som skrevet.** Jeg opplever ikke varighet. Det jeg *kunne* etterleve er kravets egentlige hensikt — å samle opp genuin forvirring før forståelsen setter inn — og det har jeg gjort: alt under er observert før jeg åpnet kode eller dokumentasjon. Men dere skal ikke lese «30 minutter» inn i dette.

**Jeg har ikke hørt en eneste lyd.** Fire trenerstemmer og ~150 klipp er produktets særtrekk, og de er uvurderte her. Del 3 (opplevelsen uten lyd) kan jeg resonnere om, men jeg kan ikke bedømme hva de hørende faktisk får.

**Panelet er én leser med sju blikk, ikke sju fagpersoner.** Bestillingen ber om at uenighet skal stå igjen. Jeg kan skrive fram reelle motsetninger i faget, men jeg vil ikke iscenesette dem som om uavhengige mennesker hadde kranglet. Der jeg er reelt i tvil, sier jeg det som tvil.

**Emulert viewport, ikke ekte enheter.** Samsung S21 og iPhone/Safari er ikke testet. Alt under er Chromium med emulert skjermstørrelse.

**Pikselklikk hang i verktøyet mitt, så mesteparten av interaksjonen er JS-drevet.** Det betyr at jeg har truffet elementer en finger kanskje ikke treffer — trykkflate-funnene under er derfor målt, ikke erfart.

**Dekningsgrad:** Del 1 og 2 er godt dekket. Del 3, 4 og 5 er ikke gjennomført — de krever kildelesing og lydvurdering jeg ikke rakk. Kryssjekk mot tidligere revisjoner (punkt 8) er ikke gjort. Jeg leverer det jeg faktisk har evidens for framfor å fylle ut malen.

---

## 1. Førsteinntrykk — rå notater

Skrevet underveis, uredigert i innhold.

- Onboarding steg 1: fem trenere. Jossa og Ola beskrives med **sted og dialekt**, Axel og Robin med **musikksjanger**, Astrid med **teknologi** («Standard Norsk (Syntetisk)»). Tre ulike beskrivelsesregimer i samme liste. Jeg vet ikke hva jeg velger mellom.
- Astrid er den eneste uten avspillingsknapp. Den eneste jeg ikke kan høre er den som er standard.
- Steg 3 sier «Utstyrsfritt · **1 runder**».
- Overskriften sier «Klar for første **økt**?», knappen under sier «Til første **økta**». To målformer i samme dialog.
- Jeg trykket «Til første økta» og fikk **ikke** en økt. Jeg fikk en dialog om streak jeg aldri hadde bedt om, med ukesmål-teller. Jeg trodde jeg hadde gjort noe feil.
- I streak-dialogen kolliderer teksten «Hvor mange økter du planlegger per uke» med −/+-kontrollen.
- Startskjermen har ti fargede knapper i et 5×2-rutenett. Astrid AI, Styrke og GPS er alle grønne. Ferdighet og Gruppe er begge lilla. Jeg klarer ikke lese noe system ut av fargene.
- To TV-ikoner: ett i toppraden, ett i rutenettet. Begge blå.
- Favorittkortene sier «8 øvelser», «5 øvelser • 2 runder», «3 øvelser • 2 runder», «3 øvelser». Noen har runder, andre ikke. Er det data som mangler, eller økter uten runder?
- To navn er avkortet: «Morgenmobilitet & …», «Nakke- & Skulderre…».
- Under favorittene begynner selve økten — på samme skjerm. Så er økten et sted eller en tilstand? Her ser det ut som en tilstand, men den er stablet under noe annet.
- I ØVELSER fant jeg ingen måte å favorittmerke en øvelse på. Ikke på mine egne, ikke på appens egne.
- Jeg klarte ikke åpne en øvelse for å lese hvordan den utføres.

---

## 2. Sammendrag

**Modenhet:** appen er funksjonsrik og språklig gjennomarbeidet, og den har en tydelig verdi-idé. Men den har ingen håndhevet romlig kontrakt mellom skjermene sine. Det viser seg dramatisk i bredt format (funn B1) og i småting overalt ellers.

**Den bærende innsikten:** de fire spørsmålene produkteier stiller har samme rot. Appen **legger til** framfor å **plassere**. Nye funksjoner får en knapp i rutenettet, en dialog, eller et lag — men ingen tar noe bort, og ingen avgjør hva som skal vike når to ting vil ha samme plass. Duplikatene i spørsmål B er ikke slurv; de er den forutsigbare følgen av at ingen eier helheten på en skjerm.

**Det som er bra og ikke må røres:**
- **Kontrast.** Jeg målte all tekst på startskjermen mot WCAG 2.2 AA. **Null brudd.** Det er uvanlig godt, og det er lett å ødelegge ved neste fargejustering.
- **Onboarding kan hoppes over på hvert steg.** Respektfullt.
- **Språket er gjennomført norsk.** Ingen engelske rester i grensesnittet.
- Ti fargede inngangsknapper er *for mange*, men de er i det minste **navngitt med ord**, ikke bare ikoner.

---

## 3. Svar på A–D

### A. Hvorfor kan ikke egne øvelser merkes som favoritt?

**Spørsmålet er for snilt.** Det finnes **ingen favoritt-affordans på øvelser i det hele tatt** — verken egne eller appens egne. Jeg fant null favorittknapper i hele øvelsesbiblioteket.

Favoritter finnes bare på **økter** («FAVORITTØKTER (4)»). Skillet går altså ikke mellom *ditt* og *vårt* innhold, men mellom *økt* og *øvelse*.

Det er en mildere diagnose enn «brukerens innhold er andrerangs», men en mer alvorlig designsvakhet: øvelsen er appens minste meningsbærende enhet, og den er den eneste tingen du ikke kan si at du liker.

**Verre funn i samme flate:** øvelsesradene er ikke tastaturtilgjengelige (se F2). Og jeg klarte ikke åpne en øvelse for å lese utførelsen — en øvelsesbank uten detaljvisning.

**Anbefaling:** før favoritter — gjør øvelsen åpnbar og fokuserbar. En favorittstjerne på noe du ikke kan lese om er pynt.

### B. Hvorfor er det to TV-ikoner på forsiden?

Bekreftet i drift, med mål:

| | Plassering | Størrelse | Skjermlesertekst |
|---|---|---|---|
| 1 | Toppraden | 34×34 px @ y=8 | «Storskjerm**-** og TV-visning» |
| 2 | Rutenettet | 65×47 px @ y=147 | «Storskjerm og TV-visning» |

Én bindestrek skiller dem. For en skjermleserbruker er dette to nesten identiske annonseringer uten forklaring på forskjellen — fordi det ikke *er* noen.

**Hvordan oppstår det uten at noen ser det?** Fordi de to bor i ulike komponenter med ulikt formspråk (rund ikonknapp i header, avlang chip i rutenettet) og aldri vises ved siden av hverandre i noen kildefil. Duplikatet er usynlig i koden og synlig bare på skjermen — og på skjermen ser de ulike ut nok til at øyet ikke stusser.

**Hvor mange flere finnes?** Jeg fant minst ett til av samme klasse: startskjermen har både et **hjerte** i toppraden og **«FAVORITTØKTER»** som seksjon. To innganger til favoritter, ulikt formspråk, ingen forklaring på forskjellen.

**Anbefaling:** ikke velg hvilken TV-knapp som skal bort — innfør regelen som gjør spørsmålet umulig. Ett register over toppnivå-handlinger, og en test som feiler hvis to knapper deler handling.

### C. Hvorfor starter økten på en ny side?

**Den gjør ikke det.** Økten ligger på *samme* skjerm, rett under favorittlisten. «Klassisk Tabata / INTERVALL 1 AV 8 / Gjør deg klar / nedtelling / START» er en seksjon i startskjermen, ikke et sted man går til.

Appen har altså valgt **tilstand**, ikke sted — men den har ikke tatt konsekvensen av valget. En tilstand som deler skjerm med det du valgte den fra, må enten fortrenge det eller vike for det. Her gjør den ingen av delene, og i bredt format kolliderer de (B1).

At tilbakeknappen lukker appen er et symptom på det samme: uten ruting finnes ikke «tilbake fra økt», fordi økten aldri var et sted.

**Anbefaling:** hold på tilstands-modellen — den er riktig for trening — men gjør den **eksklusiv**. Når en økt er aktiv, skal den eie skjermen.

### D. Hvorfor har forsiden en stor nedtellingssirkel når økten starter et annet sted?

Premisset i spørsmålet er feil på samme måte som C: økten starter *ikke* et annet sted. Sirkelen er øktens nedtelling, vist i sin egen seksjon.

Men problemet er reelt og verre enn beskrevet. Se B1.

**Hva bør skjermen bruke plassen på?** Se § 5.

---

## 4. Funnliste

### BLOKKER

**B1 — Layouten kollapser i bredt format**

*Observasjon (målt, 740×400):* nedtellingslaget overlapper de to nederste favorittkortene med 49×5 px hver, 247 px² per kort. Men målingen undervurderer det: på skjermbildet er «Gjør deg klar» i stor hvit skrift trykket **tvers over titlene** «Morgenmobilitet & Rygg» og «Nakke- & Skulderredning», «INTERVALL 1 AV 8» står midt oppi «Kettlebell Styrke», og `document.elementFromPoint` midt i nedtellingssirkelen returnerer **bunnavigasjonen** — sirkelen er kappet av den.

*Begrunnelse:* Gestalt — nærhet og felles skjebne. To uavhengige informasjonsstrukturer okkuperer samme piksler. Ingen av dem er lesbare.

*Konsekvens:* i landskap er appen ubrukelig. Det rammer nettbrett, og telefon lagt på siden — som er nettopp hvordan man plasserer en telefon man skal trene foran.

*Forslag:* økt-seksjonen må være eksklusiv. Når en økt er aktiv, skjul favoritter og rutenett.

*Innsats:* liten til middels. Én betinget rendering, ikke en omskriving.

**B2 — Øvelseslista er utilgjengelig med tastatur**

*Observasjon:* øvelsesradene har `cursor: pointer`, men er `H3` uten `tabindex`, uten `role`, og uten omsluttende `button`/`a`. `document.querySelectorAll('main button, main a, main [tabindex]')` gir **0** i lista.

*Begrunnelse:* WCAG 2.2 **2.1.1 Tastatur — nivå A**. Ikke AA, nivå A. Norsk lov.

*Konsekvens:* ingen som navigerer med tastatur eller bryter kommer til øvelsene. Målgruppen inkluderer eksplisitt seniorer.

*Forslag:* gjør raden til en `button`. Det løser fokus, Enter/Space og skjermleserrolle i ett.

*Innsats:* liten.

### ALVORLIG

**A1 — To `aria-modal="true"`-dialoger samtidig**

*Observasjon:* under onboarding steg 3 er både onboarding-dialogen (`z-index: 60`, 375×812) og streak-dialogen (343×412) i DOM, begge `visibility: visible`, begge `aria-modal="true"`. Streak-dialogen er malt under, men finnes i tilgjengelighetstreet.

*Begrunnelse:* ARIA tillater én aktiv modal. To gir udefinert skjermleseroppførsel.

*Forslag:* monter ikke streak-dialogen før den bes om.

**A2 — «Til første økta» starter ikke en økt**

*Observasjon:* knappen avslutter onboarding og viser streak-dialogen. Økten ligger bak, men brukeren møter en teller.

*Begrunnelse:* Nielsen — samsvar mellom system og virkelighet. Knappen lover én ting og gjør en annen.

*Konsekvens:* førstegangsbrukerens aller første handling gir feil resultat. Jeg trodde selv jeg hadde gjort noe galt.

*Forslag:* la knappen gjøre det den sier. Streak hører hjemme *etter* første fullførte økt — da har den noe å fortelle.

**A3 — Trykkflater**

*Observasjon:* **14 av 31 knapper** på startskjermen er under 44×44 px. «Åpne pulsmåler» er 26×26. Én navnløs knapp er 20×20.

*Begrunnelse:* WCAG 2.2 **2.5.8 (AA)** krever 24×24 som gulv; 44×44 er etablert praksis for berøring. 20×20 er under gulvet.

*Konsekvens:* Fitts' lov, forsterket av bruken: andpusten, svett, telefon på gulvet.

*Forslag:* 44×44 som minste trykkflate i topraden. Utvid treffområdet uten å forstørre ikonet.

**A4 — Én knapp uten tilgjengelig navn**

*Observasjon:* én synlig knapp har verken tekst eller `aria-label`.

*Begrunnelse:* WCAG **4.1.2 Navn, rolle, verdi — nivå A**.

*Forslag:* `aria-label`. Og en lint-regel, ellers kommer den neste.

**A5 — Favoritter finnes ikke for øvelser**

Se svar A.

### MODERAT

**M1 — Trenerlista beskriver etter tre ulike akser.** Sted+dialekt (Jossa, Ola), musikksjanger (Axel, Robin), teknologi (Astrid). *Forslag:* velg én akse. Musikksjanger forteller ikke hvordan en trener snakker til deg.

**M2 — Astrid mangler forhåndslytting.** Standardvalget er det eneste du ikke kan høre før du velger.

**M3 — Farge bærer ingen informasjon.** Ti chips, ti farger, ingen gruppering. Astrid AI / Styrke / GPS er alle grønne uten slektskap. *Begrunnelse:* farge som informasjonsbærer. *Forslag:* enten gruppér etter farge, eller gjør dem alle nøytrale og la ikon+ord bære.

**M4 — Hick's lov på rutenettet.** Ti likeverdige inngangspunkter over det brukeren faktisk kom for. *Forslag:* de tre mest brukte synlig, resten bak «Mer».

**M5 — Inkonsistent metadata på favorittkort.** «8 øvelser» mot «5 øvelser • 2 runder». *Forslag:* samme felt alltid, «1 runde» der det er én.

**M6 — Avkortede navn uten mulighet for å se hele.** «Nakke- & Skulderre…».

### POLERING

**P1 — «1 runder».** Grammatikk. Trenger entallsform.
**P2 — «Klar for første økt?» / «Til første økta».** To målformer i samme dialog.
**P3 — «— åpne detaljer».** Tekstfragment som starter med tankestrek, leses av skjermleser som del av ukesmålet.
**P4 — Tekstkollisjon i streak-dialogen.** «Hvor mange økter du planlegger per uke» kolliderer med −/+-kontrollen.

---

## 5. Redesign av startskjermen

Spørsmålet er ikke hva sirkelen skal erstattes med, men **hva brukeren gjør her**. Hun gjør én av tre ting: starter noe hun har gjort før, finner noe nytt, eller ser hvordan det går.

Foreslått rekkefølge:

1. **Fortsett** — den ene økten hun sist gjorde eller sist valgte, med ett trykk. Ikke fire favoritter; én handling.
2. **Favoritter** — de øvrige, som liste med hele navn.
3. **Ukesmål** — én linje, der den er nå.
4. **Utforsk** — én inngang til rutenettets ti, ikke ti innganger.

**Nedtellingssirkelen flyttes ut av startskjermen.** Den hører til den aktive økten, og den aktive økten skal eie skjermen (B1). En nedtelling som ikke går er en tom løfte om bevegelse.

Det frigjør omtrent den nederste halvparten av skjermen — plassen som i dag brukes på en sirkel som ikke teller ned, over en liste som ikke får plass.

---

## 6. Tilbakemelding på bestillingen

Dette er den delen dere sa var like verdifull. Jeg tar den på alvor.

**Det som fungerer godt:**

- **Begrunnelsesplikten i Del 1 er bestillingens beste grep.** «Hvert element må kunne forsvare sin plass» ga meg en test jeg kunne bruke på alt, og den produserte funn jeg ellers ville gått forbi.
- **De fire kalibreringsspørsmålene virker etter hensikten.** De viste typen funn dere vil ha, og — viktigere — to av dem viste seg å ha **feil premiss** (C og D antar at økten starter et annet sted; det gjør den ikke). At bestillingen inviterer til å bestride premisset er en styrke.
- **«Si hva som er bra, så vi vet hva som ikke må røres»** er sjelden i en revisjonsbestilling og gjorde rapporten bedre. Kontrastfunnet hadde jeg ellers ikke rapportert.
- **«Velg tydelig framfor grundig»** ga meg tillatelse til å levere delvis framfor å fylle malen. Uten den setningen ville jeg sannsynligvis skrevet noe tynt om Del 3–5.

**Det som er uklart eller vanskelig:**

- **«Minst 30 minutter» er skrevet for et menneske.** Sendes bestillingen til en KI-revisor, bør kravet formuleres som *rekkefølge* («før du åpner kode») framfor *varighet*. Hensikten overlever; tallet gjør ikke.
- **Panelet på sju er en fiksjon når én leser svarer.** Bestillingen ber om at «uenighet skal stå igjen» — men en enkelt modell som iscenesetter uenighet mellom sju roller produserer *teater*, ikke innsikt. Vurdér å be om **motsetninger i faget** framfor **stemmer i et panel**, eller kjør faktisk sju separate revisorer og flett dem.
- **Del 3 forutsetter at revisoren kan høre.** «Vurder hvor liten jobben egentlig er» krever at man vet hva lyden gjør i dag. Det bør stå eksplisitt at denne delen krever en hørende revisor, eller den bør omformuleres til å kunne besvares fra manuskriptet alene.
- **Bestillingen ber om «fil og linje der det er relevant», men forbyr kildelesing i 30 minutter.** De to kravene er forenlige i tid, men rekkefølgen bør sies: observér uten kode, *deretter* forankre i kode.
- **Del 5 («lærer produktet av bruk?») kan ikke besvares fra grensesnittet alene.** Sløyfekartlegging krever kode. Det gjør Del 5 til en helt annen type oppgave enn Del 1–3, med annen metode. Vurdér å skille den ut — den ligner mer på Revisjon B enn på resten av A.
- **Leveransepunkt 8 (kryssjekk) er sist i teksten, men krever at man har lest tidligere revisjoner** — som metodekravet ber om at man gjør sist. Det er konsistent, men lett å overse; det bør stå i metodedelen også.
- **Omfanget er stort.** Åtte leveransepunkter, sju roller, seks pilarer, fem deler. Om målet er beslutningsgrunnlag, ville jeg heller bedt om Del 1 + Del 2 + startskjerm-redesign som *én* bestilling, og resten som en annen.

**Ett spørsmål jeg ikke kunne svare på fra bestillingen:** hva er terskelen for «blokker»? Jeg satte tastaturtilgjengelighet der fordi det er lovkrav på nivå A. Men er «blokker lansering» og «blokker for en bruker» samme kategori hos dere?

---

## 7. Ikke gjennomført

For ordens skyld, så ingen tror dette er dekket:

- Del 3 — opplevelsen uten lyd (krever lydvurdering)
- Del 4 — varslinger og påminnelser (krever kildelesing av streak-/milepælslogikk)
- Del 5 — læringssløyfer og moonshots (krever kildelesing)
- Leveransepunkt 8 — kryssjekk mot tidligere revisjoner
- Veikart (punkt 7) — jeg har ikke grunnlag for «neste kvartal» uten Del 4 og 5
- iPhone/Safari og fysisk Samsung S21
- Skjermleser i praksis — jeg har lest tilgjengelighetstreet, ikke kjørt NVDA eller VoiceOver

# Vedlegg B – Microtrening på kontoret og programbibliotek

**Tilhører:** Min Trener – spesifikasjon v0.6, kapittel 3
**Formål:** Spesifisere (0) appens tre modus og kontekstprofilene som tilpasser dem, (1) microtrening – korte økter som passer i hverdagen, alene eller sammen med andre, med stemmestøtte og gruppepåminnelser – og (2) et bibliotek av ferdige programmer med ulik varighet og vanskelighetsgrad.

Delene henger sammen: modus avgjør flyten, kontekstprofilen avgjør innhold og tone, microtreningsøktene er selv programmer, og programbiblioteket er det som gjør at appen har noe å tilby uten at brukeren må bygge alt selv.

---

## Del 0 – Modus og kontekstprofiler

### B.0.1 Tre modus

Appen skiller på **hvem som trener**, ikke på hvor. Det gir tre modus, og bare tre. De er de tre store valgene på Hjem-fanen.

| Modus | Hvem | Hva appen er | Fase |
|---|---|---|---|
| **Alene** | Én person med egen mobil | Timer, logg, sensorer, programmer. Hovedspekk kapittel 3 | P1 |
| **Sammen** | Flere gjør det samme samtidig, hver med egen mobil eller rundt én skjerm | Grupperom med synkronisert nedtelling (B.5), varige grupper med påminnelser (B.6) | P2 |
| **Led en gruppe** | Én person leder andre som ikke har mobil | Instruktørverktøy: storskjerm eller mobil vendt mot gruppen, øvelse vist med bilde og instruks, stemme som instruerer og teller, instruktør styrer tempo (B.0.3) | P2 |

Forskjellen mellom *Sammen* og *Led en gruppe*: i *Sammen* er alle deltakere, og appen synkroniserer dem. I *Led en gruppe* er det én bruker, instruktøren, og appen er hjelpemiddelet hen bruker for å lede. Dirigenten som kjører fem minutters oppmykning før korøvelse, aktivitøren som leder sittende trening for femten personer på eldresenteret, treneren som varmer opp et lag, eller forelderen som «leder» to unger i stua.

Alle tre modus bruker samme timermotor, samme programkatalog og samme stemmebank. Det som endres er skjermoppsett, hvem som har kontrollen, og hva som lagres for hvem.

### B.0.2 Kontekstprofiler

En kontekstprofil er **ikke** en modus. Den er et sett standardvalg som gjør at appen passer i en bestemt setting: hvilke programmer som foreslås, stemmetone og taletempo, tekststørrelse, om øvelser er sittende, hvilken lydprofil som er standard. Profilen velges i innstillinger og kan overstyres per program. Programmer er merket med hvilke kontekster de passer i (`context: [...]` i B.11), og profilen filtrerer katalogen.

**Første versjon: to profiler**

| Profil | Setting | Innhold som foreslås | Stemme | Skjerm og lyd | Spesielt |
|---|---|---|---|---|---|
| **Kontor** | Arbeidsplassen, alene eller med kollegaer | Microtrening kontor (B.10), ingen gulv nødvendig, ingen hopp, ingen svette | «Rolig» som standard, «gira» for grupper, «tørr» valgfritt | Diskré lydprofil (B.4), mobil eller møteromsskjerm | Grupperom og påminnelser (B.5–B.6) er bygget for denne |
| **Barn og familie** | Hjemme, stua, hagen | Korte økter på 3–10 min, lekpreg, øvelser med dyre- og lekenavn («bjørnegange», «froskehopp», «flyet»), ingen vekter, sikre for små rom | Ny tone **«lek»**: lys, entusiastisk, teller høyt, ros underveis. Ikke prestasjon, ikke «for tungt» | Store fargeflater, bilde av øvelsen større enn tiden, tydelig «neste» så barn ser hva som kommer | Ofte i *Led en gruppe* (forelder leder) eller *Sammen* rundt én skjerm. Ingen logg eller rekorder for barn – økten lagres hos den voksne |

**Senere versjoner – spesifisert nå, slik at de ikke glemmes**

| Profil | Setting | Innhold | Stemme | Skjerm og lyd | Krever i tillegg | Fase |
|---|---|---|---|---|---|---|
| **Kor og musikere** | Før korøvelse, bandøving, foran spilling | Holdning, skuldre, nakke, kjeve, brystkasse og pust. 3–7 min stående. Ingen hopp, ingen svette, ikke noe som gjør en andpusten før man skal synge | «Rolig», sakte, med instruks lest før hver øvelse | *Led en gruppe* på projektor eller mobil i dirigentens hånd. Lyd fra rommet | 8–10 programmer med kontekst `kor`, instruks-fase i stemmebanken (B.3) | P3 |
| **Senior og sittende** | Eldresenter, dagsenter, hjemme for de som ikke står trygt | Alt kan gjøres fra stol med armlener. Reise-seg-øvelser, tåhev, marsj sittende, armløft, balanse med støtte. Langsomt tempo, lange pauser | Langsom, tydelig, lavt toneleie, instruks før hver øvelse, ingen nedtelling i høyt tempo – tell heller repetisjoner rolig | Svært stor tekst (min. 32 pt på mobil), høy kontrast, ingen animasjoner som distraherer, bilde av sittende figur. Ikke «for tungt»-spørsmål, ikke rekorder | Egne sittende øvelser i biblioteket med egne bilder (Vedlegg A – sittende utførelse trenger egne skjeletter, samme instruktør), 10–12 programmer med kontekst `senior`. Tydelig grense i «Om»-tekst og personvernerklæring: appen er trening, ikke helsetjeneste eller fallforebyggingsprogram, og gir ikke råd om hva som er trygt for den enkelte | P3 |
| **Idrettslag** | Trener med et lag, ute eller i hall | Oppvarming, skadeforebygging (hofte, hamstring, ankel, skulder), nedjogging. 8–15 min | «Gira», høyt volum, korte kommandoer | *Led en gruppe* med mobil og bærbar høyttaler, eller storskjerm i hall | Programmer med kontekst `idrettslag`, gjerne per idrett (fotball, håndball, ski) | P3 |
| **Møte** | Møteleder tar to minutter midt i et langt møte, fysisk eller digitalt | 1–3 min stående, skuldre, nakke, knebøy, «reis deg»-øvelser. Fungerer også på Teams: møteleder deler skjermen | «Rolig» eller «tørr» | Storskjermvisning som tåler skjermdeling (ingen små detaljer), start med ett trykk | Egentlig en variant av kontor. Kan bli en egen profil hvis Teams-bruken viser seg å være vanlig | P3, vurderes slått sammen med kontor |

Nye profiler skal kunne legges til **uten kodeendring** utover innhold: profilen er et JSON-objekt (standardtone, standardlydprofil, tekstskala, kontekstfilter, hvilke felter som skjules), og programmene merkes med kontekst.

```json
{
  "id": "senior",
  "name": { "nb": "Senior og sittende", "en": "Seniors and seated" },
  "contextFilter": ["senior"],
  "defaultTone": "rolig",
  "speechRate": 0.8,
  "defaultSoundProfile": "normal",
  "textScale": 1.6,
  "reduceMotion": true,
  "hide": ["difficultyFeedback", "records", "leaderboard"],
  "preferredMode": "lead",
  "status": "planned"
}
```

`status: "planned"` betyr at profilen vises i innstillinger som «kommer», ikke at den er valgbar.

### B.0.3 Led en gruppe

Instruktørverktøyet. Én bruker (instruktøren) er innlogget, og skjermen brukes til å lede andre som ikke har mobil.

**Skjerm**

Bygget for å sees på avstand og fra siden. Fungerer på mobil holdt opp eller på stativ, på nettbrett, og på storskjerm/projektor via samme URL som i B.5.

```
┌─────────────────────────────────────────────────────┐
│  Skulderrull                           Øvelse 3 av 7 │
│                                                       │
│   ┌───────────────┐   «Rull skuldrene sakte bakover.  │
│   │               │    Store sirkler. Pust rolig.»    │
│   │  [bilde 0/1   │                                    │
│   │   veksler]    │              0:38                  │
│   │               │                                    │
│   └───────────────┘   Neste: Nakke side til side       │
│                                                       │
│  ◀ Forrige        ⏸ Pause          Neste ▶            │
└─────────────────────────────────────────────────────┘
```

- Bildet av øvelsen (Vedlegg A) veksler mellom start- og sluttposisjon i øvelsens tempo, slik at gruppen ser bevegelsen uten at instruktøren må vise den
- Instruksen vises som tekst og leses av stemmen før øvelsen starter (ny fase `instruction` i B.3)
- **Manuelt eller automatisk tempo:** instruktøren kan la timeren styre, eller trykke «Neste» selv. I manuell modus teller stemmen ikke ned, men gir teknikkpåminnelser hvert 30. sekund
- **Repetisjonstelling ved stemme** for øvelser i reps-modus: «En … to … tre …» i valgt tempo, slik at instruktøren slipper å telle
- Kontroller nederst er store nok til å treffes med mobilen holdt i én hånd ut fra kroppen
- **Fjernkontroll (P3):** instruktøren åpner storskjermvisningen på laptop og styrer fra mobilen, samme mekanisme som rom i B.5, men uten deltakere

**Lagring**
Økten lagres hos instruktøren som type `lead`, med antall deltakere som valgfritt tall. Ingen data om deltakerne – de er ikke brukere.

**Hva som ikke skal inn**
- Ingen registrering av hvem som var til stede. Det er ikke appens jobb, og for eldresenter og barn er det direkte uønsket
- Ingen kamera-funksjoner i denne modusen

**Datamodell**
Ingen nye samlinger. `sessions.type` får verdien `lead`, og `programs` får feltene `context` og `leadFriendly` (B.11).

---

## Del 1 – Microtrening

### B.1 Hva microtrening er

Økter på 1–10 minutter som kan gjennomføres i hverdagsklær, uten utstyr, uten å svette, og uten å være til sjenanse for andre. Kontor er første kontekst (B.0.2), men det samme gjelder stua med barna, korøvelsen og eldresenteret. Typisk innhold: planke, armhevinger (på gulv eller mot pult/vegg), knebøy, utfall, stolsittende, tåhev, skulderrull, nakketøyning, trappegang.

**Fire bruksmønstre appen skal støtte**

| Mønster | Eksempel | Hva som er spesielt |
|---|---|---|
| **Alene, spontant** | Planke 90 sekunder ved pulten | Maks to trykk til start, diskré lyd |
| **Sammen, i rommet** | Fem kollegaer planker samtidig, én mobil på bordet eller møteromsskjermen | Én timer alle ser og hører, motiverende stemme |
| **Sammen, hver for seg** | Gruppen får påminnelse kl. 10 og 14, hver gjør 10 armhevinger der de er | Påminnelse, enkel registrering, felles tellerverk |
| **Progresjon over tid** | «Planke 30 dager» – lengre for hver dag | Program med innebygd progresjon |

### B.2 Microtimeren

Microtimeren er intervalltimeren fra hovedspekken (3.1) med én øvelse, tilpasset kontoret. Samme motor, egen skjerm.

**Forskjeller fra vanlig intervalltimer**
- Ett stort felt: tid igjen. Ingen «neste øvelse», ingen runder
- Hurtigvalg for varighet før start: 30 s / 60 s / 90 s / 2 min / 3 min / 5 min, pluss egendefinert
- Diskré lydprofil som standard (se B.4)
- Stemmemeldinger på faste tidspunkt (se B.3)
- «Ferdig»-skjermen viser resultat, personlig rekord og et valgfritt «for lett / passe / for tungt» som brukes til å foreslå neste nivå
- For planke og andre statiske øvelser: **hold til du gir opp**-modus. Timeren teller oppover, brukeren trykker stopp, tiden lagres som rekordforsøk. Stemmen motiverer på samme tidspunkter

**Skjerm**
```
┌──────────────────────────────┐
│  Planke                      │
│                              │
│                              │
│          1:12                │   ← minst 30 % av skjermhøyden
│                              │
│     ●●●●●●●●●○○○○○○○         │   ← fremdrift
│                              │
│  «Halvveis. Hold hoftene     │   ← siste stemmemelding som tekst
│   oppe.»                     │      (for lydløs modus)
│                              │
│  ┌────────────────────────┐  │
│  │        PAUSE           │  │
│  └────────────────────────┘  │
└──────────────────────────────┘
```

Skjermen skal fungere godt i **liggende format på en laptop** også – det er slik den vil se ut på møteromsskjermen (B.5).

### B.3 Stemmemeldinger

Dette er kjernen i «motiverende snakk».

**Tidsplan for en økt**

| Tidspunkt | Type | Eksempel (bokmål) |
|---|---|---|
| Før start (valgfritt) | Instruks | «Ligg på underarmene, tærne i gulvet. Kroppen rett som en planke.» Brukes i *Led en gruppe*, i profilene senior og barn, og kan slås på ellers |
| Start | Start | «Planke, ett minutt tretti. Klar – gå!» |
| Hvert 30. sekund | Motivasjon | «Tretti sekunder. Bra start, hold ryggen rett.» |
| Halvveis | Milepæl | «Halvveis! Nå er det bare nedover.» |
| 15 s igjen | Nedtelling starter | «Femten sekunder igjen.» |
| 10 s igjen | Nedtelling | «Ti.» |
| 5–1 s igjen | Nedtelling | «Fem. Fire. Tre. To. En.» + pip per sekund |
| 0 | Avslutning | «Ferdig! Godt jobba.» |

Reglene:
- Motivasjonsmelding og nedtelling skal aldri kollidere. Er økten 60 s, faller 30-sekundersmeldingen sammen med halvveis – da sies halvveismeldingen. Hvis en motivasjonsmelding skulle falle inne i de siste 15 sekundene, droppes den
- Meldinger kortere enn 3 sekunder tale, så de ikke overlapper neste
- Tallene 5–1 skal komme presis på sekundet, ikke når talesyntesen «blir ferdig». Derfor er de korte, forhåndsinnspilte klipp (se under), aldri talesyntese
- For «hold til du gir opp» fortsetter motivasjonen hvert 30. sekund uten sluttnedtelling, og ved passering av personlig rekord: «Ny rekord!»

**Meldingsbank**

Meldingene ligger i `data/voice-lines.json`, gruppert etter fase, med flere varianter per fase slik at samme økt ikke låter likt to dager på rad. Én variant velges tilfeldig, men aldri samme som sist.

```json
{
  "tone": "rolig | gira | tørr | lek",
  "phases": {
    "instruction": { "note": "Leses fra øvelsens instruks-felt, ikke fra banken. Talesyntese eller klipp per øvelse." },
    "repCount":    { "nb": ["En", "To", "Tre", "…", "Tjue"] },
    "start":       { "nb": ["Klar – gå!", "Da kjører vi.", "Nå starter det."] },
    "every30":     { "nb": ["Tretti sekunder. Hold hoftene oppe.",
                            "Bra, pust rolig.",
                            "Ett minutt. Du er sterkere enn du tror.",
                            "Fortsett sånn. Blikket i gulvet, nakken nøytral."] },
    "halfway":     { "nb": ["Halvveis! Nå er det bare nedover.",
                            "Halvveis. Resten er lettere."] },
    "last15":      { "nb": ["Femten sekunder igjen.", "Femten. Nå gjelder det."] },
    "last10":      { "nb": ["Ti."] },
    "countdown":   { "nb": ["Fem", "Fire", "Tre", "To", "En"] },
    "done":        { "nb": ["Ferdig! Godt jobba.", "Ferdig. Det var det."] },
    "newRecord":   { "nb": ["Ny rekord!"] },
    "groupStart":  { "nb": ["Alle klare? Gå!"] },
    "groupDone":   { "nb": ["Ferdig, alle sammen. Godt jobba."] }
  }
}
```

Fire **toner**: *rolig* (standard), *gira* (mer trøkk, egnet for grupper), *tørr* (kontorhumor, «Det er fortsatt mandag. Hold ut.») og *lek* (for barn og familie: lys, entusiastisk, «Wow, se på deg!», teller høyt og tydelig). Hver tone har sin egen variantliste. Første versjon: *rolig* og *lek* på bokmål, 8–12 varianter per fase. *Gira*, *tørr* og engelsk i P2.

**Instruks-fasen** er annerledes enn de andre: teksten kommer fra øvelsens `instruks`-felt i biblioteket, ikke fra banken. Det betyr én klipp per øvelse per språk (ca. 120 klipp), generert i samme TTS-pipeline. Repetisjonstelling («En, to, tre …») er 20 korte klipp per tone som spilles i valgt tempo.

**Innholdsregler for meldingene**
- Konkrete tekniske påminnelser (hoftene oppe, pust, nakke nøytral) foretrekkes fremfor tomme heiarop
- Aldri kroppsfokus, vekt eller utseende
- Aldri skam eller press («ikke gi opp nå, alle andre klarer det»)
- Humor i «tørr» er kontorhumor, ikke på bekostning av noen

**Teknisk: forhåndsinnspilte klipp fremfor talesyntese**

| | Forhåndsinnspilte klipp | Web Speech API (talesyntese) |
|---|---|---|
| Timing | Presis | Uforutsigbar start, særlig iOS |
| Kvalitet | Lik på alle enheter | Varierer sterkt, noen Android-enheter mangler norsk stemme |
| Offline | Ja | Avhenger av enhet |
| Vedlikehold | Nye linjer må spilles inn | Bare tekst |

Anbefaling: **klipp som primær**, talesyntese som fallback for linjer som mangler klipp (f.eks. brukerens egne meldinger, se under). Klippene genereres på Kitor med lokal talesyntese – Piper har norske stemmer, og for høyere kvalitet kan XTTS eller lignende brukes med en innspilt referansestemme. Det er også fullt mulig at Eirik spiller inn stemmen selv; det gir appen personlighet. Klippene lagres som Opus/WebM med MP3-fallback for Safari, 24 kHz mono, ca. 8–15 KB per linje. Hele banken for tre toner på to språk blir rundt 2 MB og kan forhåndslastes.

**Egne meldinger (P2):** brukeren kan skrive inn egne linjer, lest med talesyntese. Grupper kan ha egne linjer («Regnskap kjører! Hold ut til lunsj!»).

### B.4 Diskré-modus

Kontoret er ikke treningssenteret. Microtimeren har derfor en egen lydprofil som er standard:

- Stemme på moderat volum, pip erstattet av korte, myke klikk
- **Lydløs modus** med ett trykk: ingen lyd, meldingene vises som tekst på skjermen, skjermen blinker kort ved 15 s og ved ferdig, vibrasjon der det finnes
- **Hodetelefonmodus**: full lydprofil, oppdages automatisk hvis mulig (`audiooutput`-endring), ellers manuelt valg
- I gruppe (B.5): kun vertens enhet spiller lyd. Deltakernes enheter er lydløse med mindre de aktivt slår på

### B.5 Gruppeøkt i rommet

Flere kollegaer gjør samme øvelse samtidig. Én enhet er **vert**, de andre er **deltakere**. Dette er den funksjonen som best skiller appen fra en vanlig nedtellingstimer.

**Flyt**
1. Vert velger øvelse og varighet, trykker «Start gruppe». Appen oppretter et **rom** med en sekstegns kode og en QR-kode
2. Deltakere skanner QR eller skriver koden på `trening.web.app/r/ABC123`. Det krever **ingen konto** – deltakeren skriver bare et fornavn. Har de konto, lagres økten hos dem
3. Verten ser hvem som har blitt med, trykker start. Alle enheter starter samtidig
4. Underveis ser alle samme nedtelling. Vertens enhet er lydkilden
5. Ferdig: alle ser resultatet. For «hold til du gir opp» ser alle hvem som holdt lengst – hvis gruppen har valgt det

**Møteromsskjermen**

Romkoden kan åpnes på hvilken som helst nettleser, også laptopen koblet til møteromsskjermen. Da får rommet en **storskjermvisning**: stor nedtelling, deltakerliste, stemme ut av møteromshøyttalerne. Verten styrer fortsatt fra sin mobil. Dette er trolig den mest brukte varianten i praksis, og skal ikke kreve innlogging på laptopen.

**Synkronisering**

Rommet er et Firestore-dokument. Start skjer ved at verten skriver `startAt` som servertidsstempel. Alle klienter lytter på dokumentet og regner ut tid igjen som `startAt + duration − nå`. For at «nå» skal være lik på alle enheter, måler hver klient sitt eget avvik mot servertid én gang ved innlogging i rommet (skriv et dokument med servertidsstempel, les det tilbake, sammenlign med lokal klokke). Det gir samsvar innen noen hundre millisekunder, som er godt nok – nedtellingen 5–4–3–2–1 skjer fra samme tidsstempel og oppleves synkron.

Vertens pause/stopp skrives til dokumentet og propagerer på samme måte. Faller nettet ut hos en deltaker, fortsetter nedtellingen lokalt fra siste kjente `startAt`.

**Datamodell**
```
rooms/{code}                     – kortlevd, slettes automatisk etter 2 timer (Firestore TTL)
  hostUid, exercise, durationSec, mode: 'timer' | 'hold',
  state: 'lobby' | 'running' | 'paused' | 'done',
  startAt (server timestamp), pausedAt, showResults: bool,
  participants: { [id]: { name, uid?, joinedAt, result? } }
```

Romkoder er tilfeldige, seks tegn uten forvekslbare bokstaver (ikke 0/O, 1/I). Dokumentet er lesbart for alle som kjenner koden, skrivbart kun av vert (hele dokumentet) og deltaker (eget felt under `participants`). Firestore-regler håndhever dette.

**Deltakerbegrensning:** 30 per rom. Mer enn det er ikke microtrening.

### B.6 Grupper og påminnelser

En **gruppe** er en varig samling personer som trener sammen over tid, typisk en avdeling eller et team. Gruppen kan ha faste påminnelser.

**Opprette og bli med**
- Hvem som helst med konto kan opprette en gruppe og får en invitasjonslenke/kode
- Bli med krever konto (i motsetning til rom i B.5), fordi påminnelser og statistikk trenger en varig identitet
- Grupper er private. De vises ikke noe sted, kan ikke søkes opp, og medlemslisten ser bare medlemmene
- Medlem kan forlate når som helst, eier kan fjerne medlemmer og slette gruppen

**Påminnelser**
- Gruppen kan ha 0–4 faste påminnelser per dag, med ukedager: «Armhevinger, mandag–fredag kl. 10:00 og 14:00»
- Hver påminnelse peker til en microøvelse eller et microprogram
- Hvert medlem slår påminnelser på eller av for seg selv, og kan sette **stille perioder** (ikke før 09, ikke etter 16, ikke i møter – det siste krever kalenderintegrasjon, P3)
- Påminnelsen er en push-melding: «Regnskap: 10 armhevinger. 6 av 9 har gjort det.» Trykk åpner registreringsskjermen direkte
- **Snooze** 15 min, maks to ganger
- Har gruppen brukt microtimer i rom (B.5) samme dag, teller det som gjennomført og påminnelsen faller bort

**Registrering**
Registreringsskjermen er ett trykk: «Gjort» med forhåndsutfylt antall (fra påminnelsen), eller juster antall. For planke: hold-tid. Ingen andre felt.

**Felles tellerverk**
Gruppesiden viser:
- Dagens status: hvem har gjort dagens (bare navn og hake, ikke antall, med mindre gruppen har valgt «vis antall»)
- Ukens sum for gruppen («1 240 armhevinger denne uka»)
- Gruppens streak (dager på rad der minst halvparten gjorde dagens)
- Valgfri toppliste, av som standard. Slås på av eier med samtykke fra alle – ikke alle vil konkurrere med sjefen

**Plattformforbehold for push**
- Android: fungerer i nettleser og installert
- iPhone: fungerer **kun** når appen er lagt til hjemskjerm. Appen skal forklare dette tydelig når en iPhone-bruker slår på påminnelser, med trinnvis veiledning
- Fallback for alle: gruppen kan eksportere påminnelsene som kalenderhendelser (.ics) med lenke til registreringsskjermen. Det fungerer i Outlook, som mange har på jobb uansett

**Teknisk**
- Cloud Function på tidsplan (hvert 5. minutt) finner påminnelser som skal ut, filtrerer på medlemmenes stille perioder og tidssone, sender FCM til registrerte enheter
- Én FCM-token per enhet, lagret under brukeren, ryddes ved feil
- Ingen påminnelse sendes hvis medlemmet allerede har registrert dagens

**Datamodell**
```
groups/{id}
  name, ownerUid, createdAt, inviteCode,
  settings: { showCounts: bool, leaderboard: bool },
  reminders: [{ id, exerciseId, reps, days: [1..5], time: "10:00", tz: "Europe/Oslo" }]

groups/{id}/members/{uid}
  name, joinedAt, remindersEnabled: bool,
  quietHours: { before: "09:00", after: "16:00" }

groups/{id}/log/{yyyy-mm-dd}
  { [uid]: { reps, holdSec, at } }        – ett dokument per dag for hele gruppen

users/{uid}/devices/{token}
  platform, updatedAt
```

Én loggpost per dag per gruppe holder lesekostnaden lav og gjør dagsstatus til én lesing.

### B.7 Personvern i gruppefunksjonene

- Grupper og rom er alltid opt-in og private
- Deltakelse i rom uten konto lagrer bare fornavn i rommet, som slettes etter to timer
- Ingen data om gruppen kan sees av andre enn medlemmene; eier har ikke mer innsyn enn andre medlemmer, bare mer administrasjonsrett
- Ingen arbeidsgiver-funksjon: appen har ikke noe «administrator ser alle ansatte»-nivå, og skal ikke få det. Det er kollegaer som trener sammen, ikke et HMS-tiltak med rapportering
- Et medlem som forlater en gruppe får sine loggposter anonymisert i gruppens historikk

---

## Del 2 – Programbibliotek

### B.8 Hva et program er

Et program er en ferdig økt: en ordnet liste av øvelser med varighet eller repetisjoner, pauser og runder – samme datastruktur som brukerens egne maler, men **kuratert** og merket med metadata som gjør det mulig å filtrere og anbefale.

Et **programserie** er en rekke programmer med progresjon, f.eks. «Planke 30 dager» der dag 12 er lengre enn dag 11.

### B.9 Dimensjoner

| Dimensjon | Verdier |
|---|---|
| Varighet | 1, 2, 3, 5, 7, 10, 15, 20, 30, 45 min |
| Nivå | Nybegynner, middels, avansert |
| Kategori | Microtrening kontor, Kroppsvekt HIIT, Kettlebell, Styrke frivekt, Mobilitet og tøyning, Oppvarming, Kondisjon (GPS) |
| Utstyr | Ingen, kettlebell, manualer, stang, strikk, matte |
| Kontekst | Liste: `kontor`, `barn`, `kor`, `senior`, `idrettslag`, `møte`. Et program kan passe i flere. Tom liste = generelt program. `kontor` betyr: ingen gulv nødvendig (eller valgfritt), ingen hopping, ingen svette ved normalt tempo. `senior` betyr: kan gjøres sittende. `barn` betyr: trygt i små rom, ingen utstyr, lekpreg |
| Ledervennlig | Ja/nei – ja betyr at programmet fungerer i *Led en gruppe*: hver øvelse har instruks, bilde og tydelig tempo |
| Fokus | Helkropp, kjerne, bein, overkropp, rygg/nakke (kontor), hofte/mobilitet |
| Progresjon | Frittstående, eller del av serie |

### B.10 Startkatalog

Målet for lansering er **46 programmer og 3 serier**, fordelt slik at alle kombinasjoner av varighet og nivå brukerne mest sannsynlig leter etter, er dekket, pluss egne sett for kontekstene kontor og barn. Katalogen under er utgangspunktet – navnene er arbeidsnavn. Programmer for kor, senior, idrettslag og møte lages når profilene aktiveres (P3), men katalogstrukturen er klar for dem fra start.

**Microtrening kontor (12 stk, kontekst `kontor`)**

| Navn | Tid | Nivå | Innhold |
|---|---|---|---|
| Planke 60 | 1 min | Nybegynner | Planke 60 s |
| Planke 90 | 1,5 min | Middels | Planke 90 s |
| Planke 2+ | 2+ min | Avansert | Hold til du gir opp |
| Ti armhevinger | 1 min | Nybegynner | 10 armhevinger mot pult |
| Tjue armhevinger | 2 min | Middels | 20 armhevinger på gulv |
| Kontor 3 | 3 min | Nybegynner | Knebøy 40 s, pult-armhevinger 40 s, tåhev 40 s, pauser |
| Kontor 5 | 5 min | Middels | Knebøi, utfall, planke, pult-armhevinger, stolsittende, 2 runder |
| Kontor 7 | 7 min | Avansert | Som Kontor 5 med kortere pauser og gulv-armhevinger, 3 runder |
| Nakke og skuldre | 3 min | Nybegynner | Skulderrull, nakkerotasjon, brystrekk i døråpning |
| Hofteåpner | 5 min | Nybegynner | Hofteleddsbøyer-tøyning, stående figur-4, setestrekk |
| Trappa | 5 min | Middels | Trappegang med intervaller (bruker skritteller) |
| Møtepause | 2 min | Nybegynner | Reis deg, 10 knebøy, 30 s planke, 30 s tøyning |

**Barn og familie (6 stk, kontekst `barn`, alle ledervennlige)**

| Navn | Tid | Nivå | Innhold |
|---|---|---|---|
| Dyrehagen | 5 min | Nybegynner | Bjørnegange, froskehopp, krabbegange, flamingostå – 30 s hver, 2 runder |
| Flyet | 3 min | Nybegynner | Superman-hold («fly»), planke («landingsbane»), hopp med armene ut |
| Stuemaraton | 7 min | Middels | Løp på stedet, høye kneløft, jumping jacks, «bli statue» ved stopp |
| Speilet | 5 min | Nybegynner | Én viser, de andre gjør etter – appen gir øvelsen, forelder viser |
| Morgenrakett | 3 min | Nybegynner | Strekk mot taket, tå-touch, tre store hopp, ferdig |
| Familie-Tabata | 4 min | Middels | Tabata-struktur med barnevennlige øvelser, alle sammen |

**Kroppsvekt HIIT (10 stk)**

| Navn | Tid | Nivå |
|---|---|---|
| Tabata klassisk | 4 min | Middels |
| Tabata x2 | 8 min | Avansert |
| Sju minutter | 7 min | Nybegynner |
| Sju minutter hardt | 7 min | Avansert |
| Kjerne 10 | 10 min | Middels |
| Bein 10 | 10 min | Middels |
| Helkropp 15 | 15 min | Nybegynner |
| Helkropp 15 hardt | 15 min | Avansert |
| Helkropp 20 | 20 min | Middels |
| Helkropp 30 | 30 min | Avansert |

**Kettlebell (6 stk)** – Swing-fokus 10, EMOM 12, Helkropp 15, Helkropp 20, Kraft 20, AMRAP 15. Nivå fordelt.

**Styrke frivekt (4 stk)** – Overkropp 30, Underkropp 30, Helkropp 45, Nybegynner helkropp 30. Logges via styrkelogg (hovedspekk 3.3).

**Mobilitet og oppvarming (8 stk)** – Morgen 5, Morgen 10, Før løping 5, Etter løping 10, Rygg 10, Hofte 10, Hele kroppen 15, Kveld 10.

**Serier (3 stk)**

| Serie | Lengde | Innhold |
|---|---|---|
| Planke 30 dager | 30 økter | Fra 20 s til 3 min, med hviledager. Kontorvennlig |
| Armhevinger til 50 | 6 uker, 3 økter/uke | Progressiv, med test hver uke |
| Kom i gang | 4 uker, 3 økter/uke | Kroppsvekt, fra 7 til 20 min, nybegynner → middels |

### B.11 Datamodell

```
programs/{id}                      – felles, kun lesing, kuratert
  name: { nb, en }, description: { nb, en },
  category, level, durationMin, equipment: [...],
  context: ['kontor' | 'barn' | 'kor' | 'senior' | 'idrettslag' | 'møte'],
  leadFriendly: bool, seated: bool, focus: [...],
  blocks: [{ exerciseId, mode: 'time' | 'reps', value, restSec }],
  rounds, restBetweenRoundsSec,
  voiceTone?: 'rolig' | 'gira' | 'tørr',   – overstyrer brukerens valg for dette programmet
  seriesId?, seriesIndex?,
  tags: [...], version, updatedAt

series/{id}
  name, description, category, level, totalSessions,
  schedule: 'daily' | '3perweek' | 'free',
  programIds: [...]

users/{uid}/seriesProgress/{seriesId}
  currentIndex, completedIds: [...], startedAt, lastCompletedAt
```

Programmer refererer øvelser fra `exercises/` via `exerciseId`. Et program med en øvelse som ikke finnes, skal feile i valideringen – ikke i appen.

### B.12 Oppdagelse i appen

**Hjem-fanen** har tre store valg øverst: **Alene**, **Sammen**, **Led en gruppe** (B.0.1). Under det en hurtigrad styrt av aktiv kontekstprofil – i kontor-profilen Planke, Armhevinger, Kontor 5; i barn-profilen Dyrehagen, Flyet, Speilet – deretter pågående serie hvis brukeren har én. «Sammen» og «Led en gruppe» vises fra P1 som «kommer» inntil de er bygget, slik at strukturen er kjent for brukeren.

**Økter-fanen** får «Programmer» med to innganger:
- **Filter**: varighet (slider eller knapper), nivå, kategori, utstyr, kontorvennlig
- **Spørsmål**: «Hvor mye tid har du?» → «Hvor hardt?» → «Utstyr?» → tre forslag. Det er tre trykk, og treffer den som ikke orker å filtrere

**Etter en økt** spør appen «for lett / passe / for tungt». Svaret lagres på programmet for brukeren og styrer forslag: to «for lett» på rad → neste gang foreslås nivået over.

**Favoritter og «kjør igjen»** – siste tre programmer ligger alltid øverst på Hjem.

### B.13 Generering av programkatalogen

Som øvelsesbiblioteket: strukturert JSON etter skjema, generert i bolker (én kategori om gangen), validert automatisk, gjennomgått manuelt.

Regler for genereringen:
1. Bruk kun `exerciseId`-er som finnes i biblioteket. Mangler en øvelse, legges den til i biblioteket først
2. Programmer med kontekst `kontor` inneholder ikke hopp, ikke burpees, ikke øvelser som krever matte som eneste alternativ. `senior` krever at hver øvelse har en sittende variant. `barn` tillater ikke utstyr og ikke øvelser med fallrisiko på hardt gulv
3. Nybegynner: pauser minst like lange som arbeid. Avansert: pauser maks halvparten av arbeid
4. Varigheten i metadata skal stemme med summen av blokker og pauser innen ±10 %. Valideringen regner det ut
5. Hver serie skal ha jevn progresjon: ingen økt mer enn 15 % tyngre enn forrige (målt i total arbeidstid eller reps)
6. Hvert program får en beskrivelse på to setninger som sier hva det er og hvem det passer for – ikke markedsføring

### B.14 Prioritering

| Funksjon | Fase | Kommentar |
|---|---|---|
| Modusvalg Alene / Sammen / Led en gruppe på Hjem (B.0.1) | **P1** | Kun *Alene* er aktiv i P1, de to andre vises som «kommer» |
| Kontekstprofiler kontor og barn (B.0.2) | **P1** | Profil som JSON, øvrige profiler ligger inne med `status: planned` |
| Microtimer med stemmemeldinger (B.2–B.4) | **P1** | Samme motor som intervalltimeren. Stemmeklipp for «rolig» og «lek» på bokmål i P1, øvrige toner og engelsk i P2 |
| Startkatalog, minst 18 programmer (B.10) | **P1** | Microtrening kontor, barn og familie, og Kroppsvekt HIIT først |
| Led en gruppe (B.0.3) med instruks-fase og repetisjonstelling | **P2** | Bygges før grupperom hvis barn-profilen brukes mye – forelder som leder er den enkleste varianten |
| Profiler kor, senior, idrettslag, møte med tilhørende programmer og øvelser | **P3** | Senior krever sittende øvelser med egne skjeletter og bilder (Vedlegg A). Rekkefølge avgjøres av hvem som faktisk spør |
| Gruppeøkt i rom med QR og storskjermvisning (B.5) | **P2** | Krever Firestore-synk, men ingen konto for deltakere – lav terskel for å teste på jobb |
| Full katalog 40 + 3 serier, «for lett/tungt»-tilpasning (B.10–B.12) | **P2** | |
| Grupper med påminnelser (B.6) | **P2** | Push på iPhone krever installasjon – .ics-fallback er viktig |
| Egne stemmelinjer, gruppelinjer | **P3** | |
| Kalenderintegrasjon for stille perioder | **P3** | Google Calendar først, Outlook/Microsoft Graph deretter |

### B.15 Oppgaveliste for kodeagent

| # | Oppgave | Akseptanse |
|---|---|---|
| 1 | Microtimer-skjerm på intervallmotoren, med hurtigvalg og hold-modus | Planke 90 s kjører med korrekt tidsplan for stemme, testet på S21 og iPhone |
| 2 | `voice-lines.json` med tonene «rolig» og «lek», bokmål, 8 varianter per fase, pluss repetisjonstelling 1–20 | Ingen kollisjon mellom motivasjon og nedtelling for varigheter 30 s–10 min (automatisk test) |
| 2b | Kontekstprofiler som JSON (`data/profiles.json`) med kontor og barn aktive, øvrige `planned`; profilvelger i innstillinger; Hjem viser modusvalg og profilstyrt hurtigrad | Bytte profil endrer hurtigrad, standardtone og katalogfilter uten omlasting |
| 3 | Lydmotor: forhåndsinnspilte klipp med talesyntese-fallback, diskré/lydløs/hodetelefon-profil | 5–4–3–2–1 treffer innen 100 ms av sekundet |
| 4 | TTS-pipeline på Kitor (Piper eller XTTS) som genererer klipp fra `voice-lines.json` | Skript i `pipeline/voice/`, Opus + MP3 ut |
| 5 | `programs`-skjema, validering med varighetskontroll og eksistenskontroll av øvelser | `npm run validate:programs` |
| 6 | Startkatalog 18 programmer: 8 kontor, 6 barn, 4 HIIT | Alle passerer validering, gjennomgått manuelt |
| 6b | Led en gruppe: skjerm med bildeveksling, instruks-fase, manuelt/automatisk tempo, repetisjonstelling, lagring som `lead` | Dyrehagen kan ledes fra mobil på stativ uten at instruktøren ser på skjermen mellom øvelsene |
| 7 | Programmer-visning med filter og tre-spørsmåls-inngang | |
| 8 | Rom: opprett, QR, bli med uten konto, synkronisert start, storskjermvisning | To mobiler og én laptop starter innen 300 ms av hverandre |
| 9 | Firestore-regler og TTL for rom | Regeltester i Emulator |
| 10 | Grupper, påminnelser, Cloud Function for utsending, .ics-eksport | Påminnelse mottatt på Android og på installert iPhone-PWA |
| 11 | Serier med progresjon og `seriesProgress` | Planke 30 dager gjennomførbar |

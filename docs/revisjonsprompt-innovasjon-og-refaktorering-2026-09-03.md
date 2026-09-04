# PROMPT: REVISJON AV MIN TRENER — ARKITEKTUR, UI, FLYT, LOGIKK OG INNOVASJON

Kopier alt under streken inn som første melding til revisjonsagenten, startet i `C:\dev\Trening`.
Bygger på `C:\dev\Claude prompter\07_Prompt for Kontinuerlig Innovasjon og Refaktorering.md`, utvidet
med UI, brukerflyt og logikk, og tilpasset dette prosjektet.

---

## Rolle

Du er tre personer på én gang, og du skal la dem være uenige når de er det:

- **Senior frontend-arkitekt** med dyp erfaring i React 19, TypeScript strict, Vite, PWA/Workbox og Firebase. Du har sett hundre apper akkumulere funksjoner til de ble uhåndterlige, og du kjenner igjen mønsteret tidlig.
- **UX-lead for mobil under bevegelse.** Du designer for en hånd, ett blikk, svette fingre og en meters avstand. Du bruker Fitts, Hick, Cognitive Load Theory og WCAG 2.2 AA som verktøy, ikke som pynt.
- **Fysioterapeut og treningspedagog** som vet at et program som er teknisk elegant, men treningsfaglig feil, er verre enn ingenting.

Du skriver på norsk bokmål. Du er direkte. Du sier «jeg vet ikke» når du ikke vet.

## Systemet du reviderer

**Min Trener** (`C:\dev\Trening`, GitHub `EirikWolf/mintrener`, live på `mintrener.web.app`) er en installerbar PWA for intervalltrening, mikrotrening på kontoret, og ledede gruppeøkter. Åpen for alle med Google-konto. Mobil først, Samsung S21/Chrome som primær testenhet, iPhone/Safari skal være komplett.

**Fire designprinsipper** styrer alle valg (fra `docs/trening-app-spesifikasjon.md` § 1). Du skal måle hvert funn mot dem:

1. **Én hånd, ett blikk.** Under økt: lesbart på én meter, styrbart med tommelen.
2. **Sensorene gjør jobben.** Det brukeren kan slippe å taste, måler appen selv.
3. **Fungerer uten nett.** Økter starter, kjører og lagres lokalt.
4. **Best på Android, komplett på iPhone.** Android-tillegg er aldri forutsetninger.

**Tre modus** (`docs/vedlegg-b-microtrening-og-programmer.md`): *Alene*, *Sammen* (grupperom), *Led en gruppe* (instruktør/TV-visning). **Kontekstprofiler:** kontor, barn, kor, senior (Otago), idrettslag, møte.

**Omfang, målt 2026-09-03:**

| | |
|---|---|
| Kildelinjer (`src/`, uten tester) | ~38 000 |
| Komponentdomener (`src/components/*/`) | 36 |
| Tjenester (`src/services/*.ts`) | 66 |
| Testfiler | 110 (Vitest + Playwright) |
| Øvelser i biblioteket | 75 |
| Største filer | `AdminDashboardModal.tsx` 1 357 · `TimerDisplay.tsx` 1 331 · `audioDirector.ts` 1 170 · `SettingsMoreView.tsx` 978 · `timerEngine.ts` 855 · `WorkoutBuilderView.tsx` 846 |

**Kjernemekanismer du må forstå før du uttaler deg:** `timerEngine.ts` (framework-fri, Web Worker-metronom, reankring mot veggklokke ved `visibilitychange`), `audioDirector.ts` + `audioBufferEngine.ts` (fire innspilte persona-stemmer + Web Speech-fallback «Astrid»), offline-first persistens (IndexedDB + localStorage med Zod, `storageKeys.ts` er registeret), `streakService.ts`, `adaptiveProgressionService.ts` + `fatigueDeloadService.ts`, `skillTreeService.ts`, `challengeService.ts`, `exportDataService.ts` (GDPR art. 15/17/20).

## Det som allerede er revidert — ikke gjør det om igjen

Fire revisjoner ligger i `docs/` fra 2026-08-30: **A** (opplevelse), **B1** (medieproduksjon), **B2** (plattform) og **oppfølging** (herding, PII-lekkasje, GDPR). Les funnlistene deres først.

Din jobb med dem er ikke å gjenta, men å **etterprøve**: For hvert 🔴- og 🟡-funn der: er det rettet, delvis rettet, eller gjenoppstått ett steg til venstre? Oppfølgingsrevisjonen fant at «kjernen ble herdet, periferien uendret» og at en fargekonflikt «ble fikset og gjenoppsto ett steg til venstre». Se etter det mønsteret. Regresjoner er mer verdt enn nye funn.

Bildepipelinen (øvelsesillustrasjoner) er **utenfor** denne revisjonen — den har egen status i `homelab-vault/05-Prosjekter/MinTrener-bildepipeline-2026-09-03.md`. Kommenter den bare der den påvirker brukeropplevelsen i appen (bilder som mangler, bilder som viser feil øvelse).

## Oppdraget — sju pilarer

Vurder hvert modul-domene og systemet som helhet. For **hver** pilar leverer du funn med bevis. Et funn uten `fil:linje` eller uten en reproduserbar observasjon er en mening, og meninger går i et eget avsnitt merket som det.

### 1. Forenkling og teknisk eleganse

- Hvor er den akkumulerte kompleksiteten? 66 tjenester og 36 komponentdomener for én app er et signal. Hvilke tjenester gjør samme jobb? Hvilke kunne vært rene funksjoner? Hvilke er døde?
- De seks filene over 800 linjer: hva er den naturlige delingen, og hva koster det å ikke dele? Vær konkret om `TimerDisplay.tsx` — den er skjermen brukeren ser mest.
- Avhengigheter: kjør `npm ls --depth=0` og `npx vite build` med `--report` eller tilsvarende. Er klient-JS gzippet under 200 KB for første side (global konvensjon)? Hva drar mest?
- Foreslå endringer som reduserer kodelinjer eller avhengigheter **uten** å miste funksjonalitet. Bruk gjerne LaTeX for kompleksitetsreduksjon der det faktisk er en algoritme å snakke om, ikke som dekorasjon.

### 2. Brukergrensesnitt (UI)

Mål mot de fire prinsippene og WCAG 2.2 AA:

- **Én meter, én hånd:** Er alt som teller under økt lesbart på en meters avstand? Er skip/pause/stopp innenfor tommelens rekkevidde og minst 48 × 48 px? Fitts' lov, konkret: mål avstander og målstørrelser i de tre viktigste skjermene.
- **Hick:** Hvor mange valg møter brukeren på startskjermen, i økt, og etter økt? Revisjon A anbefalte tre primærsoner — er det gjort?
- **Kontrast og mørk modus:** verifiser faktiske kontrastverdier for de fem mest brukte tekst/bakgrunn-parene.
- **Bevegelse og lyd:** `prefers-reduced-motion` respektert? Fungerer appen fullverdig uten lyd (WCAG 1.2.2 — revisjon A foreslo undertekster fra `voicebank-manuskript.json`)?
- **Konsistens:** samme handling, samme sted, samme ord på tvers av 36 domener? Finn de tre verste avvikene.
- **Skjermleser:** kjør gjennom de tre mest brukte skjermene med tanke på NVDA/VoiceOver. Semantiske elementer, `aria-label` på ikon-knapper, fokusfeller på modaler (`useFocusTrap` er nå i 31 filer mot 19 i august — er hver modal og dialog dekket, og har noen fått den uten å trenge den?).

### 3. Brukerflyt

Gå gjennom disse reisene **i den kjørende appen** (`npm run dev`, nettleserpanelet), ikke bare i koden. Tell trykk, tell sekunder, noter hvert sted du nølte:

1. **Første gang:** installasjon → onboarding → første økt fullført. Hvor mange skjermer? Hvor mange valg kunne vært utsatt?
2. **Kontor-mikroøkt:** fra låst telefon til første øvelse i gang, diskré-modus. Kravet i vedlegg B er maks to trykk til start.
3. **Led en gruppe:** instruktør starter TV-visning, deltakere blir med i rom. Hva skjer når én deltaker mister nett?
4. **Tilbake etter tre uker:** hva sier appen? Er streaken død, og hvordan formidles det? (Oppfølgingsrevisjonen fant streak-mekanikken «etisk godt utformet» — holder det?)
5. **iPhone/Safari, lyd låst:** første trykk må låse opp `AudioContext`. Skjer det, og forstår brukeren hva som skjedde hvis ikke?
6. **Avbrutt økt:** telefonen ringer midt i runde 3 av 5. Gjenopprettes økten (`sessionRecoveryService`)? Hva ser brukeren?
7. **Egen økt → deling → mottaker:** delingslenke (`shareWorkoutService`) og kalendereksport (`calendarExportService`). Fungerer hele kjeden for en som ikke har appen?

For hver reise: et flytdiagram (Mermaid er fint), antall trykk, og det ene stedet der flyten bryter mest.

### 4. Logikk og korrekthet

Dette er der du skal være mest skeptisk. Les koden, skriv tester der du er i tvil, og kjør dem.

- **Timeren:** drift over 30 minutter med skjermen av. Hva skjer ved `visibilitychange` midt i et 3-2-1-pip? Ved klokkeendring (sommertid, NTP-justering)? Er alle timere i appen på `timerEngine`, eller finnes det fortsatt «fem parallelle timere med den gamle feilen» (oppfølgingsrevisjonen)?
- **Dato og streak:** UTC-midnattsfeilen ble rettet én gang med `toLocalDateString`. Finn alle andre steder dato beregnes og sjekk hver.
- **Progresjon:** `adaptiveProgressionService`, `fatigueDeloadService`, `strengthProgressionService`, `skillTreeService`. Er reglene treningsfaglig forsvarlige? Skriv ned reglene i klartekst og vurder dem som fysioterapeut. Finnes det en vei til å bli anbefalt *mer* belastning etter en rapportert skade?
- **Utfordringer:** «gulvet» — kan en bruker som planker 1:40 daglig starte en 30-dagers plankeutfordring på sitt nivå? (Åpent spørsmål fra 2026-09-02, ikke løst.)
- **Offline og synk:** to enheter, samme bruker, begge offline, begge fullfører en økt, begge kommer online. Hva vinner? Finnes det en konfliktregel, eller bare «siste skriver»?
- **GDPR:** `exportDataService` skal dekke hver nøkkel i `storageKeys.ts` (det finnes en test for det). Dekker slettingen det samme? Er Firestore-historikk med i begge? Reell anonymisering, ikke bare soft-delete?
- **Tilgang:** organisasjonsportalen og admin-dashbordet. Hvem kan se hvem sine data? Bevis det i kode.

### 5. Kontinuerlig fornying (feedback loops)

Hvilke mekanismer kan gjøre at appen **lærer av bruk** uten PII og uten mørke mønstre? Konkret per modul: hva kan måles lokalt, hva kan aggregeres anonymt, og hva skal aldri måles. Vurder det som finnes (`telemetryService`, `perfMonitorService`) mot det som mangler. Streak-mekanikken skal ikke bli en avhengighetsmaskin — si fra hvis et forslag krysser den grensen.

### 6. Markedsledende verdi

- Hva ville gjort de tre viktigste skjermene så intuitive at hjelpeteksten kan slettes?
- Hvilke problemer har brukeren som appen ennå ikke har sett? Ta utgangspunkt i konkurrentanalysen i `docs/vedlegg-c-konkurrentanalyse-og-neste-fase.md` og si hva som er posisjonen om tolv måneder.
- Persona-stemmene er differensiatoren (oppfølgingsrevisjonen kalte dem «en differensiator med en skjult brems»). Hva er bremsen, og er den løsnet?

### 7. Moonshots — tre per modul-domene

For hvert av de domenene du velger å gå dypt i (velg minst åtte av de 36): tre dristige forslag. **Hvert forslag skal ha den billigste testen som kan avkrefte det** — én dag, én bruker, én måling. Et moonshot uten en billig test er en drøm, og de går i et eget avsnitt.

## Tre akser som skal granskes spesielt

Disse kommer i tillegg til de sju pilarene og skal ha egne avsnitt i leveransen. Hver påstand under er sjekket mot koden 2026-09-04; der noe ikke ble funnet, står det.

### Akse 1 — Brukeropplevelse og interaksjon (forlengelse av revisjon A)

- **60-minutters WOD i praksis.** Kjør en hel times økt med skjermen av mesteparten av tiden. Fungerer `timerEngine` og framdriftssirkelen i `TimerDisplay.tsx` over den lengden, eller blir sirkelen meningsløs når én runde er 2 % av totalen? Trengs del-indikatorer per runde? Mål driften ved slutt mot veggklokka.
- **Storskjerm og gym-buzzer.** Fem sekunders nedtelling og Web Audio-buzzeren (`audioDirector.ts`, `audioService.ts`) i et rom med musikk, over ekstern høyttaler og på TV-visningen (`instructor/`). Hører man den? Kolliderer den med persona-stemmen? Test med `audioDuckingService` aktiv.
- **Filter-ergonomi i Programkatalogen.** Hurtigraden (`ProgramCatalogView.tsx:242–264`: «CrossFit & HIIT 30–60 min», «Intervall / Tabata 4–10 min», mobilitet) og utstyrsfilteret (kroppsvekt mot ekstra utstyr). På en 360 px bred skjerm: er raden synlig uten å scrolle, er trykkflatene 48 px, forstår man at et aktivt filter er aktivt, og hvordan nullstiller man?
- **Navigasjonskonsistens.** Overgangene mellom «I dag», «Programmer», «Øvelser», «Historikk» og «Mer» (`navigation/`, `useTabBackNavigation.ts`). Er de 100 % konsistente — samme animasjon, samme scrollposisjon-bevaring, samme oppførsel på maskinvare-tilbake på Android? Finn det ene stedet der de ikke er det.

### Akse 2 — B2B, sikkerhet og organisasjonsadministrasjon (forlengelse av revisjon B2)

- **Tilgangskontroll.** Bedriftsdashbordet (`admin/AdminDashboardModal.tsx`, `organization/`) skal være strengt begrenset til `isAdmin` (`adminService.ts`). Bevis det: hvor sjekkes det, kan sjekken omgås fra klienten, og håndhever Firestore-reglene det samme på serversiden? En klientsjekk alene er ikke tilgangskontroll.
- **1-klikks onboarding.** `?org=KODE` og `?tester=KODE` leses i `App.tsx:71–94` og slettes fra adresselinja etterpå. Verifiser ved **kaldstart** (lukket PWA, åpnet fra lenke), ved installert-på-hjemskjerm, og på iPhone/Safari. Hva skjer med en ugyldig kode, en utløpt kode, og en bruker som allerede er i en annen organisasjon?
- **Sletting og livssyklus.** Utløpsdato og fornying finnes (`organizationService.ts:273–295`, `validUntil`). Verifiser at fornying faktisk forlenger og ikke bare nullstiller. **Merk:** oppdraget nevner standardbedrifter `pilot` og `bedrift-as` som ikke skal kunne slettes ved uhell — i koden er `pilot` en avtaletype, og `bedrift-as` finnes ikke. Finn ut om et slikt slettevern eksisterer i det hele tatt, og hvis ikke: er det et hull?

### Akse 3 — Ytelse, ressursbruk og bundle (forlengelse av revisjon B1 / plattform)

- **Initial bundle.** Målt 2026-09-04 i `dist/assets/`: `index-*.js` **1 009 379 B (262 078 B gzip)**, `firebase-*.js` 559 039 B, `lucide-*.js` 59 664 B. Global konvensjon sier under 200 KB gzip for første side. `React.lazy` brukes **0 ganger** i dag. Vurder splitting av `AdminDashboardModal`, `OfficeKioskScreen` (`kiosk/`), `ExerciseImageCuratorView` (`curator/`) og TV-visningen — mål før og etter, og si hva som er igjen for en vanlig mobilbruker. Ikke foreslå Firebase-splitting uten å vise hva som faktisk importeres.
- **Syntetisert lyd uten nett.** Boks-buzzer og nedtellingspip skal fungere uavbrutt offline. Test det: flymodus, installert PWA, full økt. Skiller appen mellom syntetisert lyd (Web Audio, alltid tilgjengelig) og innspilte persona-klipp (Workbox-cache, kan mangle)? Hva skjer når et klipp mangler — stillhet, fallback til Astrid, eller feil?

## Metode og disiplin

- **Kjør appen.** Bruk nettleserpanelet. Ta skjermbilder som bevis. En revisjon som bare leser kode, ser ikke det brukeren ser.
- **Et tomt svar er ikke et funn.** Når du sier «ingen N+1», «alle modaler har fokusfelle» eller «ingen `any`», skriv hva du talte: «19 modaler, 19 med `useFocusTrap`, telt med grep -l». Et tomt resultat uten et antall kan like gjerne være et ødelagt filter.
- **Les definisjonen før du bestrider en måling.** Fasiten for hvordan noe telles ligger i koden som teller.
- **Skill mellom det du så, det du målte, og det du mener.** Tre ulike avsnitt, tre ulike vekter.
- **Ikke rett noe.** Dette er en revisjon. Skriv tester som viser feil hvis du vil, men commit ingenting. Rettelser er neste fase, og de skal gjennom TDD.
- **Verifiser før du påstår:** `npx tsc -b`, `npx vitest run`, `npx vite build`. Rapporter faktiske tall. To tester (`ExerciseLibraryView` tastatur, `Programkatalogen`) er kjent tidsflaky under full kjøring og grønne alene; alt annet rødt er ekte.
- **Tid:** sjekk faktisk klokke før du nevner tid. Ingen antakelser om arbeidsdag.

## Leveranse

Én fil: `docs/revisjon-C-innovasjon-<dato>.md`. Struktur:

1. **Dekning og forbehold** — hva du så på, hva du ikke rakk, hva som ikke var tilgjengelig. Denne seksjonen skrives *sist*, men står *først*.
2. **Førsteinntrykk** — rå notater fra første gjennomkjøring av appen, før du leste kode. Ti linjer.
3. **Sammendrag** — modenhet på fem områder (arkitektur, UI, flyt, logikk, verdi), hver med én setning og én karakter 1–5. Den bærende innsikten i ett avsnitt. Faglige motsetninger mellom de tre rollene, uavklart.
4. **Etterprøving av revisjonene fra august** — tabell: funn · status (rettet / delvis / regressert / ikke rettet) · bevis.
5. **Funn per pilar** — tabell for det tekniske (fil:linje · observasjon · konsekvens · forslag · innsats S/M/L), prosa for det som trenger resonnement.
6. **Sju brukerreiser** — diagram, trykk, bruddsted.
6b. **De tre aksene** — ett avsnitt hver, samme bevisregel: fil:linje eller reproduserbar observasjon.
7. **Moonshots** — inspirerende, men hver med sin billigste test.
8. **Roadmap** — prioritert etter verdi mot innsats, i tre horisonter: *denne uka*, *denne måneden*, *dette kvartalet*. Maks fem punkter per horisont. Første punkt i «denne uka» skal kunne startes i morgen tidlig av en agent med denne fila som eneste kontekst.
9. **Det jeg mener, men ikke kan bevise** — eget avsnitt, tydelig merket.

Alvorlighet: 🔴 blokker (lovbrudd, tap av data, feil treningsråd) · 🟡 alvorlig (strukturell, forvirrer) · 🟢 forbedring.

Avslutt med status og neste handling, ikke med oppmuntring.

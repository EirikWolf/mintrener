# Min Trener – spesifikasjon (utkast v1.2)

**Arbeidsnavn:** Min Trener

**URL:** trening.web.app (Firebase Hosting)
**Type:** Progressiv webapp (PWA), mobil først, installerbar på hjemskjerm
**Målgruppe:** Åpen for alle med Google-konto fra dag én
**Primær testenhet:** Samsung Galaxy S21 (Chrome). iPhone (Safari) skal fungere fullt ut for kjernefunksjonene.
**Hovedfokus:** Kroppsvekt, intervall og kondisjon, med **microtrening på kontoret** som en bærende bruksmåte. Styrke med vekter og kettlebells støttes, men prioriteres etter.

**Dokumenter i settet**
| Fil | Innhold |
|---|---|
| `00-README.md` | Overlevering til kodeagent, leserekkefølge, første prompt |
| `trening-app-spesifikasjon.md` | Dette dokumentet – krav, funksjoner, arkitektur, faseplan |
| `vedlegg-a-bildepipeline.md` | Generering av øvelsesillustrasjoner på Kitor via arbiter-lease (ComfyUI, Flux.1-dev, astrid_k-LoRA, ControlNet OpenPose) – v2 etter testbatcher |
| `vedlegg-c-konkurrentanalyse-og-neste-fase.md` | Konkurrentanalyse (Online Coach, Wakeout, MicroReps, norske apper, Sterk og stødig), posisjonering, og plan for neste fase: programmer på tvers av profiler, utvidelser for kontor og barn, innhold for kor, senior, idrettslag og møte |
| `vedlegg-b-microtrening-og-programmer.md` | Tre modus (Alene / Sammen / Led en gruppe), kontekstprofiler (kontor og barn først; kor, senior, idrettslag, møte senere), microtrening med stemme, grupperom, påminnelser, og programbibliotek |

---

## 1. Formål og prinsipper

Appen skal gjøre det enkelt å gjennomføre og loggføre trening fra mobilen, uten friksjon. Fire designprinsipper styrer alle valg:

1. **Én hånd, ett blikk.** Under en økt skal alt viktig være lesbart på én meters avstand, og styrbart med tommelen.
2. **Sensorene gjør jobben.** Det brukeren kan slippe å taste inn, skal appen måle selv.
3. **Fungerer uten nett.** Økter starter, kjører og lagres lokalt – synkronisering skjer når nett er tilgjengelig.
4. **Best på Android, komplett på iPhone.** Android-eksklusive funksjoner er tillegg, aldri forutsetninger. Ingen kjernefunksjon skal mangle på iPhone.

---

## 2. Plattformstrategi og sensorforbehold

En webapp har ikke samme sensortilgang som en native app. Dette er lagt til grunn for hele spekken:

| Sensor / funksjon | Android (Chrome, S21) | iOS (Safari) | Håndtering i appen |
|---|---|---|---|
| Akselerometer / gyro | Ja (DeviceMotion + Generic Sensor API) | Ja (DeviceMotion), krever tillatelse via knappetrykk | Felles kode via DeviceMotion. iOS får en «Aktiver bevegelsessensor»-knapp |
| Skritteller | Beregnes fra akselerometer | Samme | Teller kun under aktiv økt, ikke hele dagen |
| GPS | Ja | Ja | Fungerer i forgrunnen. Skjermen holdes våken under GPS-økt |
| Pulsbelte (Bluetooth) | Ja (Web Bluetooth) | Nei | Vises kun på enheter som støtter det |
| Vibrasjon | Ja | Nei | Lyd er alltid primærsignal, vibrasjon er tillegg |
| Lyd (Web Audio) | Ja | Ja, AudioContext låses opp ved første trykk | «Trykk for å starte» aktiverer lyd |
| Wake Lock | Ja | Ja (iOS 16.4+) | |
| Push-varsler | Ja | Kun når appen er lagt til hjemskjerm | Appen oppfordrer iPhone-brukere til å installere |
| Kamera (pose-estimering) | Ja | Ja | P3, eksperimentelt |

**Sensorstatus-skjerm (P1):** Under «Mer → Sensorer» viser appen hva som fungerer på akkurat denne enheten, med grønn/gul/rød status og forklaring. Da slipper brukeren å lure på hvorfor puls mangler på iPhone.

**Testmatrise:** Hver fase testes på S21 i Chrome, iPhone i Safari (både i nettleser og installert på hjemskjerm). iPhone-testing bør skje tidlig i fase 1, ikke som opprydding i etterkant.

**Exit-strategi:** Dersom bakgrunnsskritteller eller Apple Health/Health Connect blir viktig, pakkes samme kodebase med Capacitor. Det gir native sensortilgang uten omskriving av appen.

---

## 3. Funksjoner

**P1** = MVP, **P2** = neste steg, **P3** = senere.

### 3.1 Intervalltimer (P1) – kjernefunksjonen

- Bygg egne økter: liste av øvelser med varighet eller antall repetisjoner, pauser mellom øvelser, antall runder, pause mellom runder
- Ferdige maler: Tabata (20/10 × 8), EMOM, AMRAP, «7-minutters» – erstattes av programbiblioteket (3.1c) når det er på plass
- Nedtelling per øvelse med stor sirkulær fremdriftsindikator
- Viser nåværende øvelse stort, neste øvelse mindre under, runde X av Y og total tid igjen
- Lydsignaler: korte pip ved 3-2-1, langt pip ved bytte, egen tone for pause og arbeid, avslutningssignal
- Talebeskjeder (Web Speech API): «Neste: knebøy, 40 sekunder» – kan slås av
- Vibrasjon ved bytte (Android)
- Skjermen holdes våken under økt
- Hele bakgrunnen skifter farge: grønn under arbeid, oransje under pause
- Én stor knapp: Pause / Fortsett. Sveip for hopp over / gå tilbake
- Lås-modus mot utilsiktede trykk
- Timeren styres av tidsstempler, ikke tellende `setInterval` – ellers drifter den når mobilen struper JavaScript
- Lyder forhåndslastes og spilles via Web Audio, ikke `<audio>`-elementer

### 3.1a Tre modus og kontekstprofiler (P1) – se Vedlegg B, del 0

Appen har tre modus etter **hvem som trener**: **Alene** (P1), **Sammen** – grupperom og grupper (P2), og **Led en gruppe** – instruktørverktøy for én som leder andre uten mobil, med storskjerm, instruks lest av stemmen og repetisjonstelling (P2). Modusene er de tre store valgene på Hjem.

**Kontekstprofiler** tilpasser innhold, stemmetone, tekststørrelse og lydprofil til en setting, uten å være egne modus. Brukeren velger et **sett** profiler ved onboarding («Hvor skal du bruke Min Trener?»), og grensesnittet settes sammen av dem etter faste regler (Vedlegg B.0.4): union for innhold, per økt for tone, mest tilgjengelig for tilgjengelighet. Det som ikke er relevant for brukerens sammenhenger, ligger bak «Mer» til det er bedt om. Første versjon: **Kontor** og **Barn og familie**. Spesifisert for senere: Kor og musikere, Senior og sittende, Idrettslag, Møte. Profiler er JSON-objekter og programmer er merket med kontekst, slik at nye profiler kan legges til uten kodeendring.

### 3.1b Microtrening (P1) – se Vedlegg B, del 1

Korte økter på 1–10 minutter i hverdagsklær, alene eller sammen med andre – kontoret først, men samme mekanisme for stua, koret og eldresenteret. Bygger på intervalltimerens motor, men med egen skjerm, stemmemeldinger hvert 30. sekund, talt nedtelling de siste 15 sekundene, og en diskré lydprofil som standard.

- **Microtimer** med hurtigvalg for varighet og «hold til du gir opp»-modus for planke (P1)
- **Stemmemeldinger** fra forhåndsinnspilte klipp i tre toner, generert på Kitor (P1: «rolig» på bokmål)
- **Gruppeøkt i rommet**: vert oppretter rom med QR-kode, kollegaer blir med uten konto, synkronisert nedtelling, storskjermvisning på møteromsskjermen (P2)
- **Invitasjon dit folk er**: del romlenken via Teams, Outlook eller mobilens delingsark, med forhåndsvisning av lenken og mulighet for planlagt rom med starttid (P2, Vedlegg B.5b)
- **Grupper med påminnelser**: faste push-varsler («Armhevinger kl. 10»), ett-trykks registrering, felles ukesteller, valgfri toppliste (P2)

Detaljer, datamodell, personvernregler og oppgaveliste i Vedlegg B, del 1.

### 3.1c Programbibliotek (P1) – se Vedlegg B

Kuraterte, ferdige programmer merket med varighet (1–45 min), nivå (nybegynner/middels/avansert), kategori, utstyr og om de er kontorvennlige. Startkatalog på 40 programmer og 3 progresjonsserier («Planke 30 dager», «Armhevinger til 50», «Kom i gang»). Inngang via filter eller tre spørsmål (tid, hardhet, utstyr). «For lett / passe / for tungt» etter økt styrer forslag. P1: minst 15 programmer, P2: full katalog og serier.

Detaljer i Vedlegg B, del 2.

### 3.2 Øvelsesbibliotek (P1)

**Innhold**
- 80–120 øvelser ved lansering, fordelt omtrent slik: 50 % kroppsvekt, 20 % kettlebell, 15 % manualer/stang, 15 % mobilitet og oppvarming
- Per øvelse: navn (bokmål og engelsk), muskelgrupper, utstyr, nivå, kort instruks (3–5 punkter), vanlige feil, type (tid eller repetisjoner)
- Egne øvelser med bilde fra kamera eller galleri
- Søk og filter på muskelgruppe, utstyr og nivå
- Favoritter

**Generering med KI (Claude Code eller Gemini)**

Biblioteket genereres som strukturert JSON etter et fast skjema, ikke som fritekst. Anbefalt fremgangsmåte:

1. Definer JSON-skjemaet først (se datamodell under). Valider alle genererte øvelser mot skjemaet automatisk.
2. Generer i bolker på 15–20 øvelser per muskelgruppe/utstyr, med instruks om konsistent språk og detaljnivå. Én stor generering gir ujevn kvalitet.
3. Bruk en åpen datakilde som kryssjekk og eventuelt utgangspunkt. Datasettet *free-exercise-db* (GitHub, yuhonas) er offentlig eiendom, har over 800 øvelser i JSON med bilder og et definert skjema med felt for muskelgrupper, utstyr, nivå og instruksjoner. Det er mer vektorientert enn appens fokus, men dekker det meste av styrkedelen, og KI-en kan oversette og supplere med kroppsvekt/intervall.
4. Illustrasjoner genereres på Kitor (RTX 3090) med ComfyUI, Flux.1-dev og ControlNet OpenPose – to fotorealistiske bilder per øvelse (start/slutt) med samme fiktive instruktør (astrid_k-LoRA fra SynthIQ), portrettformat, studiobakgrunn. Tilgang via Tailscale og GPU-lease fra Kitors arbiter. Hele pipelinen er beskrevet i **Vedlegg A (v2)**. Ikoner for muskelgrupper og utstyr lages som SVG-kode.
5. Manuell gjennomgang av hele biblioteket før lansering, både tekst og bilder. Åpen app betyr at feil instruks når andre enn deg.

### 3.3 Styrkelogg og styrkeprogram (P2) – se Vedlegg C.17

Styrkeloggen er en del av styrkeprogrammene, ikke en egen skjerm: serier med valg av 2/3/4 økter i uken, logging inne i økten (reps, vekt, reps i reserve), og en eksplisitt progresjonsregel som foreslår neste belastning med begrunnelse. Første serie: «Sterkere 12 uker», kroppsvekt og kettlebell først. Alt bygger på dokumentert kunnskapsgrunnlag (`basis`, Vedlegg C.19) og skal gjennomgås av noen med fagbakgrunn før det åpnes for alle.

- Logg sett × reps × vekt × RIR per øvelse, med hviletimer mellom sett
- Forrige økt vises som forslag («sist: 3×8 @ 24 kg»)
- Kettlebell-spesifikt: registrer klokkevekt fra fast liste (8/12/16/20/24/28/32 kg), støtte for tidsbaserte sett (swings i 60 s)
- Automatisk personlig rekord og estimert 1RM (kun for stang/manual, ikke kettlebell)
- Progresjonsgraf per øvelse

### 3.4 Sensorbaserte funksjoner

**Skritt og kadens (P2)**
- Skritteller under gå-/løpeøkt beregnet fra akselerometer (toppdeteksjon på vertikal akse, filtrert)
- Kadens i sanntid
- Kalibrering: brukeren går 20 skritt, appen justerer terskel

**GPS-økter (P2)**
- Gå, løp, sykkel: distanse, tempo, snitt/maks fart, høydeprofil, kart over ruten
- Auto-pause ved stillstand
- Talebeskjed per kilometer
- Rundetider, manuelle og automatiske per km
- Eksport som GPX (grunnlaget for Strava-integrasjon, se 3.8)

**Automatisk repetisjonstelling (P3)**
- Øvelser med tydelig bevegelsesmønster: hopp, burpees, knebøy, hopptau – og kettlebell-swings med mobilen i lomma
- Egen deteksjonsprofil per øvelse, alltid med manuell korreksjon
- Kamera-basert telling med pose-estimering: eksperimentelt

**Puls (P3, kun Android)**
- Pulsbelte via Web Bluetooth (standard Heart Rate-profil)
- Pulssoner med fargekode, snitt/maks i oppsummering
- Lydvarsel ved sone over/under mål
- Skjules helt på iPhone, med forklaring på sensorstatus-skjermen

**Balanse og mobilitet (P3)**
- Balansetest med gyro over 30 sekunder, gir score over tid

### 3.5 Statistikk og motivasjon (P2)

- Ukesmål med fremdriftsring på forsiden
- Streak-teller og kalender-heatmap
- Grafer: økter per uke, minutter, volum, distanse
- Oppsummering etter hver økt, kalorianslag merket som estimat
- Ukentlig oppsummering som push-varsel

### 3.6 Sosialt (P3)

- Del en økt som lenke, mottaker kan kjøre den uten konto
- Utfordringer mellom venner, kun ved aktiv påmelding
- Ingen offentlige feeds

### 3.7 Innstillinger og plattform (P1)

- Lyd, tale, vibrasjon: av/på og volum
- Mørkt tema som standard, lyst tema valgfritt
- Språk: bokmål og engelsk
- Enheter: kg/lb, km/mi
- Innlogging: Google. Anonym prøvemodus (kjør en økt uten konto, lagres lokalt) kan vurderes senere som terskelsenker
- Eksport av alle data (JSON/CSV) og slett konto
- Offline-modus

### 3.8 Integrasjoner (P3)

Rekkefølge etter hvor realistisk det er fra en webapp:

| Tjeneste | Vurdering |
|---|---|
| **GPX/TCX-eksport** | Enkelt, universelt. Gjøres i P2 sammen med GPS-økter. Kan importeres manuelt i Strava, Garmin Connect og de fleste andre |
| **Strava** | Realistisk. OAuth-innlogging og opplasting av aktiviteter via Strava API. Krever registrering av appen hos Strava og at man følger deres API-vilkår. Naturlig første integrasjon |
| **Google Fit** | Uaktuelt. Google Fit-API-ene er avviklet, nye apper kan ikke registreres, og erstatningen Health Connect er kun tilgjengelig for native Android-apper |
| **Apple Health / Health Connect** | Kun via Capacitor-innpakking (se exit-strategi). Vurderes hvis appen pakkes native |
| **Garmin** | Krever godkjenning i Garmins utviklerprogram. Ikke prioritert |

---

## 4. Brukergrensesnitt

### Navigasjon

Bunnmeny med fire faner:

| Fane | Innhold |
|---|---|
| **Hjem** | Modusvalg Alene / Sammen / Led en gruppe (vektet etter profiler), én hurtigrad per valgt profil, pågående serie, ukesmål-ring, siste økter |
| **Økter** | Programmer (filter og tre-spørsmåls-inngang), mine maler, øvelsesbibliotek |
| **Historikk** | Kalender, grafer, PR-er |
| **Mer** | Innstillinger, sensorer, integrasjoner, eksport, konto |

### Øktskjermen

- Fullskjerm, ingen navigasjon synlig
- Nedtelling i skrifthøyde minst 25 % av skjermhøyden
- Nåværende øvelse øverst, neste øvelse nederst
- Hele bakgrunnen skifter farge mellom arbeid og pause
- Én stor knapp nederst innen tommelens rekkevidde
- Sensordata i en diskret stripe, aldri i konkurranse med nedtellingen
- Stående og liggende format

### Bygg økt-skjermen

- Legg til øvelse fra bibliotek eller skriv fritt
- Dra-og-slipp for rekkefølge
- Hurtigvalg for varighet (20/30/45/60 s) og pause (10/15/30 s)
- «Bruk samme innstilling på alle» for raske Tabata-oppsett
- Forhåndsvisning av total varighet

### Generelle regler

- Minste trykkflate 48×48 px, større på øktskjermen
- Høy kontrast, ingen tynne skrifter
- Ingen modaler under pågående økt
- Maks to trykk fra åpnet app til pågående økt
- iPhone: respekter safe area (notch og hjemindikator), unngå at bunnknapp havner under hjemlinjen

---

## 5. Åpen app fra dag én: sikkerhet, personvern og kostnad

Dette er konsekvensen av svar 1, og hører hjemme i P1:

**Sikkerhet**
- Firestore-regler: en bruker kan kun lese/skrive under egen `users/{uid}`. Standardbiblioteket er lesbart for innloggede. Reglene testes med Firebase Emulator før første deploy
- Firebase App Check aktiveres, så bare appen på trening.web.app kan snakke med backend
- Storage: maks filstørrelse for egne øvelsesbilder (f.eks. 2 MB), kun bildeformater, kun eier kan lese
- Ingen brukerdata i URL-er eller delingslenker, delte økter er kopier uten personopplysninger

**Personvern (GDPR)**
- Personvernerklæring og enkle vilkår på egen side før lansering
- Treningsdata er ikke helseopplysninger i særkategori-forstand så lenge det er skritt og økter, men puls og GPS-spor er sensitivt nok til at brukeren må samtykke eksplisitt til hver sensortype
- «Slett konto» sletter alt, inkludert Storage og lokal cache, og fungerer uten å kontakte deg
- Dataeksport via appen oppfyller innsynsretten
- Analytics: kun anonymiserte hendelser, ingen IP-lagring

**Kostnad**
- Firebase Spark (gratis) dekker Hosting, Auth og Firestore for et lite antall brukere. Cloud Functions og Storage-egress krever Blaze (betal etter bruk)
- Sett budsjettvarsel i Google Cloud på f.eks. 100 kr/mnd fra dag én
- Firestore-modell designes for få lesinger: én økt = ett dokument, ikke ett dokument per intervall. Statistikk aggregeres i brukerdokumentet, ikke beregnes ved å lese all historikk
- Offline-persistens reduserer lesinger betydelig

---

## 6. Arkitektur

### Frontend

- React + Vite + TypeScript (alternativt SvelteKit)
- Tailwind CSS
- Workbox for service worker, offline-caching av app og lyder
- Firestore offline-persistens som lokal database
- Leaflet + OpenStreetMap for kart
- Recharts for grafer

### Firebase

| Tjeneste | Bruk |
|---|---|
| Hosting | trening.web.app, HTTPS er påkrevd for sensor-API-er |
| Authentication | Google |
| App Check | Beskytter backend mot misbruk |
| Firestore | Brukerdata med offline-persistens |
| Cloud Functions | Ukesoppsummering, utfordringer, kontosletting, Strava-utveksling |
| Cloud Messaging | Push-varsler |
| Storage | Bilder til egne øvelser |
| Analytics | Anonymisert funksjonsbruk |

### Datamodell (Firestore)

```
users/{uid}
  profile: { navn, enheter, tema, språk, ukesmål }
  settings: { lyd, tale, vibrasjon, samtykker: { bevegelse, gps, puls } }
  stats: { aggregert ukes-/månedsdata, oppdateres ved hver økt }

users/{uid}/exercises/{id}        – egne øvelser
users/{uid}/templates/{id}        – øktmaler
users/{uid}/sessions/{id}         – gjennomførte økter, ett dokument per økt
users/{uid}/records/{exerciseId}  – personlige rekorder
users/{uid}/integrations/strava   – tokens (kun lesbar for Cloud Functions)
users/{uid}/devices/{token}       – FCM-tokens (Vedlegg B.6)
users/{uid}/seriesProgress/{id}   – fremdrift i programserier (Vedlegg B.11)

exercises/{id}                    – felles øvelsesbibliotek, kun lesing
programs/{id}                     – felles programkatalog, kun lesing (Vedlegg B.11)
series/{id}                       – programserier, kun lesing
rooms/{code}                      – kortlevde grupperom, TTL 2 t (Vedlegg B.5)
groups/{id}                       – varige grupper med påminnelser (Vedlegg B.6)
challenges/{id}                   – P3
organizations/{id}                – kommune, bedrift, instruktør, idrettslag (Vedlegg C.25) – tom til noen ber om den
```

### Skjema for øvelse (grunnlag for KI-generering)

```json
{
  "id": "kettlebell-swing",
  "navn": { "nb": "Kettlebell-swing", "en": "Kettlebell swing" },
  "type": "reps | tid",
  "kategori": "kroppsvekt | kettlebell | frivekt | mobilitet | kondisjon",
  "muskler": { "primær": ["hofte", "bakside lår"], "sekundær": ["korsrygg", "skuldre"] },
  "utstyr": ["kettlebell"],
  "nivå": "nybegynner | middels | avansert",
  "instruks": { "nb": ["..."], "en": ["..."] },
  "vanligeFeil": { "nb": ["..."], "en": ["..."] },
  "sensorProfil": "swing | hopp | ingen",
  "bildePrompt": { "0": "...", "1": "..." },
  "bildeVinkel": "side | front",
  "bildeStatus": "mangler | generert | godkjent | regenerer"
}
```

Bildefeltene er spesifisert i Vedlegg A.11. Ferdige bilder ligger som statiske filer under `/exercises/{id}/` i portrettformat 7:9, ikke i Storage.

### Sensormodul

```
SensorProvider
  ├─ StepCounter   (DeviceMotion → toppdeteksjon)
  ├─ GpsTracker    (Geolocation.watchPosition)
  ├─ HeartRate     (Web Bluetooth, kun der det finnes)
  └─ RepDetector   (DeviceMotion, per øvelsesprofil)
```

Hver leverer `{ verdi, tidsstempel, kvalitet }` og kan mangle uten at appen feiler. Funksjonsdeteksjon ved oppstart avgjør hva som vises.

---

## 7. Faseplan

**Fase 1 – MVP**
- Intervalltimer med lyd, tale, vibrasjon og Wake Lock
- Modusvalg på Hjem (kun Alene aktiv), kontekstprofiler kontor og barn som sett, onboarding-spørsmål
- Microtimer med stemmemeldinger («rolig» og «lek», bokmål) og diskré lydprofil
- Programkatalog med minst 18 programmer (kontor, barn og familie, kroppsvekt HIIT)
- Bygg og lagre egne økter
- Øvelsesbibliotek generert etter skjema, manuelt gjennomgått
- Øvelsesillustrasjoner fra bildepipelinen (Vedlegg A). Kan starte med muskelgruppe-ikon som fallback og fylle inn bilder etter hvert
- Google-innlogging, Firestore med sikkerhetsregler og App Check, offline
- Sensorstatus-skjerm
- Personvernerklæring, slett konto, budsjettvarsel
- Installerbar PWA, testet på S21 og iPhone

**Fase 2 – Sensorer, logg og grupper**
- Led en gruppe: instruktørskjerm, instruks-fase, repetisjonstelling
- Gruppeøkt i rom med QR og storskjermvisning, invitasjon via Teams/Outlook/deling, planlagt rom
- Grupper med påminnelser og .ics-fallback
- Full programkatalog (40 + 3 serier), «for lett/tungt»-tilpasning
- Stemmetoner «gira» og «tørr», engelsk
- Skritteller og kadens
- GPS-økter med kart og GPX-eksport
- Styrkelogg med kettlebell-støtte, PR og grafer
- Historikk, ukesmål, streak

**Fase 3 – Utvidelser**
- Kontekstprofiler kor, senior og sittende, idrettslag, møte – med tilhørende programmer og øvelser
- Strava-integrasjon
- Pulsbelte (Android)
- Automatisk repetisjonstelling
- Deling og utfordringer
- Push-varsler
- Vurder Capacitor hvis Apple Health/Health Connect blir viktig

---

## 8. Beslutninger tatt

| # | Spørsmål | Beslutning | Konsekvens |
|---|---|---|---|
| 1 | Åpen eller privat | Åpen for alle med Google-konto | Sikkerhetsregler, App Check, personvern og budsjettvarsel flyttet til P1 |
| 2 | Testenhet | S21 primært, iPhone må fungere | Android-eksklusivt bygges som tillegg, sensorstatus-skjerm, iPhone testes i fase 1 |
| 3 | Styrke | Relevant, men kroppsvekt/intervall/kondisjon viktigst | Styrkelogg forblir P2, kettlebell-støtte lagt inn, bibliotek vektet mot kroppsvekt |
| 4 | Øvelsesbibliotek | KI-generert | Fast JSON-skjema, generering i bolker, åpen datakilde som kryssjekk, manuell gjennomgang |
| 5 | Integrasjoner | Interessant | GPX i P2, Strava i P3, Google Fit avvist, Apple Health/Health Connect krever Capacitor |
| 6 | Øvelsesbilder | Genereres på Kitor | Eget vedlegg A. v1 valgte SDXL og vektorstil av lisenshensyn |
| 14 | Invitasjon til rom via Teams | Lenke, forhåndsvisning og planlagt rom – ikke Teams-app | Vedlegg B.5b. Web Share API på mobil, dyplenke og mailto på desktop, Open Graph via Cloud Function, `scheduledAt` på rom. Teams-app vurderes bare hvis en organisasjonskunde ber om det |
| 16 | Utfordringer som eget konsept | Serie med `kind: challenge`, daglig rutenett, hviledager, bom uten straff, maks tre aktive, gruppeutfordringer | Vedlegg C.5b og C.15b, lært av Hjemmetrening Pro. Tolv utfordringer i katalogen. Flipbok-animasjon fra bildepipelinen for øvelser der to bilder ikke holder |
| 15 | Kommersiell bildemodell | FLUX.2 klein 4B og Qwen-Image 2.0 er kandidatene, testbatch bestilt | Vedlegg A.12.1–A.12.2. Ikke regenerere før inntekt er aktuelt; skjelettene bærer over |
| 13 | Flere profiler per bruker | Profiler er et sett, ikke ett valg | Vedlegg B.0.4. Bygges i P1 fordi endringen er billig nå. Tre modus uansett. Sammensetting: union for innhold, per økt for tone, mest tilgjengelig for tilgjengelighet, snitt for skjuling |
| 12 | Inntekt | Mulig, via organisasjoner – ikke via brukere | Vedlegg C del 3. Kjernen fra P1 forblir gratis for alltid. Kommune/eldresenter, instruktørkonto og arbeidsplass uten innsyn er modellene; annonser aldri. Tom organisasjonsentitet inn i datamodellen nå. Bilder må regenereres kommersielt før første betaling |
| 11 | Styrkeprogram, fellesskap og kunnskapsgrunnlag | Vedlegg C.17–C.19 | 2/3/4 økter via ukemaler, dobbel progresjon med bom- og reduksjonsregel, logging i økt. Fellesskap som aggregerte tellere (terskel 3) og reaksjoner, tekst kun i grupper, offentlige kommentarer utsatt. `basis` og `reviewStatus` på alt som andre følger over tid |
| 10 | Neste fase etter MVP | Konkurrentanalyse og programplan i Vedlegg C | Øvelsesalternativer og profilregler gjør programmer gjenbrukbare på tvers; brukerens øvelsesbytter lagres for hele programmet; kosthold, trenerchat og arbeidsgivernivå holdes bevisst ute |
| 9 | Bildestil og modell, etter testbatcher på Kitor | Fotorealistisk Flux.1-dev med fast instruktør (astrid_k), godkjent av Eirik | Vedlegg A v2. Flux.1-dev er ikke-kommersiell: gratis app er innenfor, men skal appen gi inntekt må bildene regenereres. Bevisst valg, dokumenteres i DECISIONS.md. All GPU-bruk via arbiter-lease |
| 7 | Microtrening på kontoret og programbibliotek | Bærende bruksmåte, egen spekk | Vedlegg B. Microtimer og startkatalog inn i P1, grupperom og påminnelser i P2. Stemmeklipp genereres på Kitor. Ingen arbeidsgiver-/rapporteringsnivå i gruppene |
| 8 | Flere modus | Tre modus etter hvem som trener (Alene / Sammen / Led en gruppe), kontekstprofiler for setting | Kontor og Barn og familie i første versjon. Kor, senior, idrettslag og møte spesifisert i Vedlegg B.0.2 med `status: planned`, slik at de ikke glemmes |

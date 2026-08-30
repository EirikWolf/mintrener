# Revisjon B2 — Plattform, forvaltning og læring

**Utført:** 2026-08-31 · **Mot:** `main` = `18029f4` · **Metode:** kildelesing, egne målinger (testsuite, førmerge-sjekk, kitor-status, regelfil), fire parallelle kodekartlegginger med fil:linje-verifisering, webverifisering av plattform- og modellfakta. Ingen fysisk enhet.

---

## 1. Dekning

**Dekket med verifisert grunnlag:** Del 1 (modellvalg, inkl. fersk kitor-status og webverifiserte plattformfakta), Del 3 (forvaltning — regelfil, datasamlinger, skript, deploy-flyt, GDPR-verktøy lest i sin helhet), Del 4 (læringssløyfer — hver innsamling sporet fra skrivested til lesested med fil:linje). Del 2 (plattform) er dekket for alt som er lesbart i kode; enhetsavhengige spørsmål står ubesvart, se under.

**Egne målinger i denne kjøringen:** `npm test` (820 tester / 88 filer, alle grønne, 198 s), `npm run sjekk` (ingen automatiske funn), øvelsestelling (74 = 42+18+6+5+3), `firestore.rules` lest linje for linje, kitor-tjenestestatus over SSH (vLLM oppe med `Qwen3.6-27B`, GPU 22,5/24,6 GB, ingen Chatterbox-container kjørende), dobbelttelling i telemetrien verifisert i førstehånd, eksport- og sletterekkefølgen verifisert i førstehånd.

**Ubesvart — krever fysisk enhet:** lydfokus/demping ved skjermlås på iOS, autoplay-atferd, push-tillatelser på installert iPhone-PWA, Web Bluetooth i felt, worker-metronomens faktiske bakgrunnsatferd. Jeg har lest koden som håndterer disse; koden forteller hva som er *ment*, ikke hva som skjer.

**Ubesvart — krever konsoll-/prod-tilgang:** om TTL-policy for `rooms` faktisk er konfigurert (`gcloud firestore fields ttls list` ga PERMISSION_DENIED fra min tilgang), og om `firestore.rules` i repoet er identisk med den utrullede regelen (det finnes ingen deploy-pipeline som garanterer det, se § 4.5).

**Metodeforbehold:**
1. Jeg leste [revisjon-oppfolging-2026-08-30.md](revisjon-oppfolging-2026-08-30.md) *før* eget arbeid, under avklaringen av hvilken bestilling som gjaldt. Det er et brudd på «tidligere revisjoner sist»-regelen, og en ankringsrisiko for funnene som overlapper den (perf-blindveien, org-portalen). Funnene som er *nye* i denne rapporten (§ 6, blokker 1–3) er upåvirket — de står ikke i noe tidligere dokument.
2. Én kodekartlegging streifet `revisjon-B2-funn-2026-08-30.md` via et søketreff, tross instruks. Det den hentet derfra (at perf-blindveien var kjent, at `npm run tilstand` var foreslått) er deklarert i kryssjekken.
3. Jeg har ikke revidert de 820 testene innholdsmessig, ikke kjørt regeltestene mot emulator, og ikke hørt lyd.

---

## 2. Sammendrag

### Den viktigste innsikten: dokumentlaget har begynt å overrapportere — systematisk, og i samme retning

Kildehierarkiet i metodedokumentet sier at kjørende kode slår det som står skrevet. I denne kjøringen slo koden det som står skrevet **fire uavhengige ganger, og alle fire ganger i retning «mer ferdig enn sant»:**

| Påstand i dokumentlaget | Hva koden viser |
|---|---|
| Beslutning 40: «`exportFullUserDataset` henter et **fullstendig** GDPR Art. 20 JSON-datasett» | Eksporten leser 9 navngitte nøkler av ~30 i registeret. Fødselsår (eksplisitt merket «Personopplysning» i registeret), styrkelogger per øvelse, all utfordringsprogresjon og ferdighetstre-progresjon mangler ([exportDataService.ts:76-101](../src/services/exportDataService.ts)) |
| Beslutning 39: «bibliotek økt til 74 øvelser med **100 % referanseintegritet**» | Sant for de tre samlingene testen dekker — men `organizationService.ts:11,22` peker på to utfordrings-id-er som ikke finnes i `challenges.ts`. To av tre pilotorganisasjoner refererer spøkelser |
| Beslutning 44: «**klar B2B-infrastruktur** i tråd med Privacy by Design» | `getOrganizationStats` returnerer hardkodede konstanter (`activeMembersCount: 8`, `totalMinutesThisWeek: 142`) for alle organisasjoner, alltid ([organizationService.ts:107-116](../src/services/organizationService.ts)). Portalen viser oppdiktede tall som ekte statistikk |
| [backlog.md](backlog.md): åtte epiker 🟢, «komplett, moden … oppfyller alle krav» | Push finnes ikke, Cloud Functions finnes ikke, innholdet er hardkodet, fire funksjoner er bygget men aldri koblet inn (§ 3.2), og go/no-go-telemetrien leses fortsatt ikke av noen |

Dette er nøyaktig samme feilklasse som Flux-lisensen og LTX-tallet — **sammendrag som blir sannhetskilder uten å være det** — men nå er det ikke en delt tjenestekatalog som drifter, det er prosjektets egen beslutningslogg. Den er farligere, fordi metodedokumentet selv utpeker `DECISIONS.md` som «den viktigste enkeltfilen for å forstå hvorfor». En revisor eller en fremtidig sesjon som stoler på Beslutning 40 vil svare feil på en GDPR-henvendelse.

Rotårsaken er ikke slurv, men at **kvalitetsapparatet verifiserer feil lag.** 820 grønne tester verifiserer at koden gjør det koden sier. Ingenting verifiserer at *påstandene* om koden stemmer. Førmerge-sjekken (bygget i går, etter forrige revisjons forslag) fanger strukturelle feil — men den kjøres ikke i CI, og den kan per konstruksjon ikke fange «Beslutning N overdriver».

**Forslaget som følger av det:** hver Beslutning som inneholder ordene «fullstendig», «100 %», «klar» eller «fullført» skal peke på kommandoen som beviser det. «Fullstendig eksport» → en test som itererer `STORAGE_KEYS` og asserterer at hver nøkkel finnes i eksporten. Den testen er ~15 linjer, og den ville gjort Beslutning 40 usann i CI samme dag den ble skrevet.

### Den nest viktigste: sløyfene ble lukket — men tre av dem på liksom

Forrige B2 rapporterte at hovedsløyfen (vurdering → tilpasning) ble lukket 30. august. Det stemmer for intervalløkter. Men målt i denne kjøringen er tre nabosløyfer **koblet i den ene enden og løse i den andre:**

- **Øvelsesbytte i program** — selve svaret på Online Coach-kritikken (C.2/C.8), «byttet gjelder alle fremtidige økter» — har flettelogikk som kjøres ved hver øktstart ([ProgramCatalogView.tsx:309](../src/components/programs/ProgramCatalogView.tsx)), men **ingen UI-flate skriver noensinne et bytte**. Kartet er alltid tomt. Funksjonen appen ble designet rundt å gjøre bedre enn konkurrenten, kan ikke nås av en bruker.
- **Dobbel progresjon** regner ut «øk til 22,5 kg» og viser det — men neste økt forhåndsutfylles med *forrige* vekt, ikke forslaget ([StrengthWorkoutModal.tsx:56-65](../src/components/strength/StrengthWorkoutModal.tsx)). Brukeren får rådet og må huske det selv.
- **Skyhistorikken hydreres aldri ved innlogging** — bare når Historikk-fanen åpnes ([WorkoutHistoryView.tsx:39](../src/components/history/WorkoutHistoryView.tsx) er eneste kallsted utenom eksport). På ny enhet er streak, badges, ukesmål, adaptivt forslag og deload-vurdering tomme til brukeren tilfeldigvis besøker riktig fane.

### Den faglige motsetningen: fart som lukker kodefunn, og utsetter beslutningsfunn

Forrige B2-rapports billigste anbefalinger ble gjennomført **samme dag**: død tjeneste slettet, puls-instruks gated, Flux-premisset rettet, førmerge-sjekk bygget. Det er imponerende responstid. Men hvert funn som krevde en *beslutning* i stedet for en kodefiks står åpent: org-portalen mot C.6/C.25 (uavklart), «AI»-navnet (uendret), `perf`-lesing (fortsatt null lesere), innhold ut av koden (urørt), `exercises`-regelen (står fortsatt). **Mønsteret på tvers av fem revisjoner er nå entydig: alle lukkede funn er kodefikser, alle åpne funn er beslutninger.** Det som avgjør: beslutningsfunn må få en eier og en dato, ellers taper de mot neste kodefiks hver gang.

---

## 3. Del 1 — Modell- og teknologivalg

### 3.1 Modelltabell

Kitor-status verifisert live i denne kjøringen (SSH, 2026-08-31): vLLM oppe med `Qwen3.6-27B` (92K kontekst, int4), GPU 22,5/24,6 GB i bruk. Ingen Chatterbox-container kjører — stemmeproduksjon er en på-bestilling-tjeneste, ikke stående (relevant for § 4, ikke for lisens).

| Område | Dagens valg | Anbefaling | Begrunnelse | Byttekostnad · Lisens |
|---|---|---|---|---|
| Bilde (arkivet, 74 øvelser) | Flux.1-dev + LoRA + ControlNet | **Behold** | Beslutning 48 leste lisensteksten: utdata er kommersielt frie. Avgjort riktig | 0 · Avklart. Men se funn M1: vedlegg C.23/C.26 påstår fortsatt det motsatte |
| Bilde (ny generering ved inntekt) | Flux.1-dev | **Utred FLUX.2 [klein] 4B** — først når inntekt er konkret | Apache 2.0, deler GPU. Uendret fra forrige B2; ingenting nytt har endret det | LoRA må trenes på nytt — det er den reelle regningen |
| Video | Ikke valgt — men `buildAstridWanVideoWorkflow` + `--video`-flagg er bygget | **Behold nullalternativet. Frys workflow-koden** | B-revisjonens regnestykke står: 80 klipp = 40–160 MB mot 1,5 MB installasjon. Infrastruktur er nå bygget for en beslutning ingen har tatt — det er omvendt rekkefølge | 0 å la være. Wan 2.1-workflowen i repoet peker dessuten på en annen modellversjon enn flåten kjører (Wan 2.2) — enda et tall som drifter |
| Musikk | Ikke i bruk | **Behold ute** | Ingen etterspørsel. Konkurrerer med stemmen, som er differensiatoren | 0 |
| Stemme | Chatterbox på kitor, 152 klipp | (B1s domene) | Kun én B2-observasjon: tjenesten er ikke stående — regenerering krever at kitor-eier starter container. Det hører hjemme i forvaltningsnotatet, ikke i modellvalget | — |
| «AI-trener» / «AI-øktgenerator» | Rent regelbasert — verifisert: null nettverkskall, null AI-avhengigheter i `package.json` | **Behold reglene. Bytt navnet. Og koble på signalene som allerede finnes** (§ 3.2) | Se under | En strengfil + noen dagers kobling |

### 3.2 «AI»-spørsmålet — målt, ikke ment

Jeg bekreftet forrige B2s hovedpunkt (regelbasert er en styrke, navnet er en svakhet) og kan nå **kvantifisere hvor langt under taket reglene ligger:**

`generateCustomAiWorkout` ([aiWorkoutGeneratorService.ts](../src/services/aiWorkoutGeneratorService.ts), 128 linjer) er en deterministisk mal-skjærer: ingen tilfeldighet, ingen vekting — utvalget er `.slice(0, N)` av bibliotekets *filrekkefølge*. Ti trykk på «Sett sammen økt» gir ti identiske økter. I tillegg:

- `equipment`-parameteren er deklarert i typen, **aldri lest** i funksjonen, og aldri sendt fra UI — en bruker uten utstyr kan få kettlebell-øvelser, enda biblioteket har `utstyr`-felt og en ferdig filterfunksjon (`index.ts:57-59`).
- Skadefilteret er substring-heuristikk, og **forkastes stille** hvis færre enn 4 kandidater gjenstår (linje 48–50) — brukeren kan få nøyaktig øvelsene hun ba om å slippe, uten varsel. Det finnes samtidig et *strukturert* skadefilter med ekte erstatningsregler (`injuryAlternativeService.ts`) som generatoren ikke bruker.
- Fokus `'puls'` og `'styrke'` har ingen egen gren — begge gir identisk resultat som helkropp; bare tittelen endres.

UI-et lover «AI» ti steder («Astrid AI», «AI Økt», «Lokal AI», «Skreddersydd økt på sekunder»). Med målingene over er ikke det bare strategisk feilposisjonering (forrige B2s poeng) — det er en **falsifiserbar overlovnad**: «skreddersydd» er determinismens rake motsetning.

**Om micro-LLM — svaret på bestillingens spørsmål:**

- **På enheten:** teknisk mulig nå — WebGPU er skipet i alle store nettlesere, og WebLLM/Transformers.js kjører 1–8B-modeller i nettleser ([webllm.mlc.ai](https://webllm.mlc.ai/), verifisert aug. 2026). Men vektene er hundrevis av MB til flere GB mot appens 1,5 MB-installasjon — «et tall som er verdt å beskytte», sier bestillingen selv — og norskkvaliteten i ≤4B-klassen er udokumentert. **Nei.**
- **På hjemmeserveren:** vLLM med Qwen3.6-27B er live og OpenAI-kompatibel (verifisert). Men det bryter offline-løftet, gjør hjemmelaben til databehandler for treningsprat, og GPU-en står allerede på 100 % utnyttelse delt med bildeproduksjon. **Ikke nå.**
- **Det bestillingen ikke spør om, men burde:** «hvor treffer reglene taket?» forutsetter at taket er modellkvalitet. Målt er taket **kobling**: appen samler allerede historikk, vurderinger, utstyr, skadefilter, ukesmål og tid på døgnet i seks tjenester — og generatoren leser *ingen* av dem. Å koble tre av dem på (historikk-dedup så økter varierer, utstyrsfilteret som finnes, det strukturerte skadefilteret) gir mer opplevd intelligens enn noen 4B-modell, til null modellkostnad og uten å røre offline-løftet. **Det er anbefalingen.**

*Hva som må være sant for at dette holder:* at brukerne faktisk plages av repetisjon/feil utstyr (koblingene er verdiløse hvis generatoren knapt brukes — engagement-telemetrien som kunne svart på det, leses ikke, § 5). *Hva som ville endret min mening om LLM:* at brukere ber om fritekst-samtale med treneren, eller at en ≤4B-modell dokumenterer god norsk — ingen av delene er observert.

---

## 4. Del 2 — Plattformnotat

### 4.1 Regnskapet, i fire kolonner

Forrige B2 skilte umulig / vanskelig-men-gjort / ikke-forsøkt. Denne kjøringen legger til en fjerde kategori som viste seg å være den største: **bygget, men aldri koblet inn.**

| Kategori | Saker |
|---|---|
| **Umulig i web** | Web Bluetooth på iOS — reverifisert aug. 2026: ingen støtte, og Apple har uttalt at de ikke vil skipe det ([caniuse](https://caniuse.com/web-bluetooth), [WebBluetoothCG](https://github.com/WebBluetoothCG/web-bluetooth/blob/main/implementation-status.md)) · Apple Health / Health Connect · bakgrunnsskritteller · `orientation`-lås i manifest ignoreres av iOS |
| **Vanskelig, men gjort — og gjort riktig** | Worker-metronom + veggklokke-reankring · iOS `interrupted`-håndtering i lydmotoren ([audioBufferEngine.ts:255-271](../src/services/audioBufferEngine.ts) sjekker `state !== 'running'`, ikke bare `'suspended'`) · wake-lock-reakkvisisjon ved `visibilitychange` · puls-gating: alle ni UI-innganger verifisert gated eller forklarende på iOS — forrige revisjons funn er reelt lukket |
| **Bygget, men aldri koblet inn** | **(a)** `PwaInstallPromptModal` — komplett `beforeinstallprompt`-håndtering og trinnvis iPhone-A2HS-veiledning, **aldri importert eller rendret** noe sted. iPhone-installasjon forklares dermed ingen steder i den kjørende appen, enda spec kap. 2 krever det og push (når den kommer) forutsetter installasjon. **(b)** Stemmestyring — komplett tjeneste, men knappen som slår den på rendres kun når den allerede er på: ingen inngang finnes, på noen plattform. **(c)** `SensorStatusModal` fra økt-skjermen — state og render finnes i `TimerDisplay`, ingen kode setter den `true`. **(d)** Repetisjonstelling på iOS — `motionTrackerService.start()` lytter på `devicemotion` uten `requestPermission()`, som iOS krever i en user gesture. Telleren er stille død på iPhone med mindre brukeren først finner Mer → Sensordiagnostikk → «Aktiver bevegelsessensor» |
| **Ikke bygget** | Push/FCM i enhver form (null treff på hele API-flaten) · Cloud Functions (og dermed Open Graph-forhåndsvisning av romlenker — invitasjoner i Teams ser ut som nakne URL-er, som B.5b kaller «spam») · grupper med påminnelser (B.6) · `apple-touch-icon.png` (deklarert i `includeAssets`, fila finnes ikke; SVG-fallbacken virker ikke på iOS — hjemskjermikonet på iPhone blir en skjermdump) |

Precache målt fra `dist/`: **1,59 MB rå / 392 KB gzip** — 1,5 MB-løftet holder. Men hovedbundelen er én monolittisk chunk på 876 KB rå (kun firebase/lucide/kurator er splittet ut); det er neste sted å hente lastetid på treg mobil.

### 4.2 Anbefaling

**PWA alene — uendret fra forrige B2, og styrket.** Posisjoneringsargumentet (C.6: «sammen, i rommet» distribueres som delt lenke, ikke App Store-søk) står. Denne kjøringens funn *svekker* native-alternativet ytterligere: tre av fire «plattformhull» viste seg å være innkoblingsfeil i egen kode (§ 4.1, kategori 3), ikke plattformbegrensninger. En Capacitor-innpakning i dag ville pakket inn de samme frakoblede komponentene.

**Utløsende betingelser for å revurdere** (arver forrige B2s tre, som holder):
1. Apple Health/Health Connect etterspørres av faktiske brukere.
2. Push viser seg avgjørende for retensjon *og* hjemskjerm-installasjon måles under ~30 % — men merk: den betingelsen kan ikke engang måles i dag, siden installasjonsveiledningen er død kode og engagement-telemetrien ikke leses.
3. En organisasjonskunde krever App Store som innkjøpsbetingelse.
4. *(Ny)* iPhone-felttesten viser at `interrupted`-håndteringen ikke holder ved skjermlås — lyd er kjerneproduktet, og det er det ene stedet plattformen kan slå posisjoneringen. Krever fysisk enhet; står ubesvart her.

*Hva som må være sant:* at «ærlig fravær» faktisk kommuniseres — sensorstatus-skjermen finnes og er god, men den må være nåbar der brukeren lurer (funn A6). *Hva som ville endret min mening:* betingelse 4.

---

## 5. Del 3 — Forvaltningsnotat

### 5.1 Hvorfor flaten mangler — og hva som har skjedd siden sist

Diagnosen fra B- og B2-revisjonene står: datamodellen forutsatte et forvaltningslag (`exercises/` med `allow write: if false` — som heller ikke en forvalter kan skrive til uten Admin SDK, som ikke finnes i repoet) som aldri ble bygget, og alt innhold er byggetids-TypeScript. Nytt siden i går: innholdet vokste (74 øvelser, 28 programmer, 12 utfordringer, 4 ferdighetstrær, 4 styrkemaler) — fortsatt ved å redigere kildefiler inne i storfeatures. Og det finnes nå **to konkurrerende profilregistre** (`data/profiles/index.ts` med `idrettslag`, `data/contextProfiles.ts` med `idrett`) brukt av hver sine komponenter — duplikatet er selv et forvaltningsfunn: innhold i kode dupliseres når ingen eier det.

### 5.2 Spørsmål produkteier ikke kan få svar på i dag

| Spørsmål | Hvorfor ikke | Hvor svaret burde bodd |
|---|---|---|
| Er lydavviket godt nok til å lansere? (go/no-go) | `global_stats/perf` har null lesere — og tallene i `overview` er nå dessuten forurenset av dobbelttelling (funn B1) | Terminalskript |
| Får brukere feil i produksjon? | Ingen feilrapportering ut av appen overhodet — ikke engang `window.onerror`/`unhandledrejection`. `ErrorBoundary` er riktig montert i roten, men dekker per definisjon bare render-fasen: event-handlere, alle asynkrone Firestore-kall, og de to kallene som kjører *før* `createRoot` ([main.tsx:11-15](../src/main.tsx) — feiler historikk-migreringen der, blir det hvit skjerm uten feilside) er utenfor | GlitchTip, som allerede kjører i hjemmelaben |
| Fullførte noen onboarding? Valgte noen persona? | `global_stats/engagement` (24 tellere) har null lesere | Samme terminalskript |
| Er reglene i prod de samme som i repoet? | Ingen deploy-pipeline; `firebase deploy` kjøres manuelt uten spor. CI verifiserer repo-fila, ikke den utrullede | CI-deploy |
| Lever rooms-TTL-en? | Ikke sporbar i repo; min tilgang til konsollen var utilstrekkelig | Runbook + konsollsjekk |

### 5.3 Fire kategorier

**Flytt innholdet ut av koden** — fortsatt største spak, uendret anbefaling: til validert JSON i repoet (ikke Firestore — 1,5 MB-tallet og offline-løftet skal stå). Slå samtidig sammen de to profilregistrene. Førmerge-sjekken og referanseintegritetstesten er fundamentet for at dette er trygt nå.

**Koble til noe som finnes:**
- Feil → **GlitchTip** (`http://192.168.0.10:8000`, Sentry-kompatibel). Krav før første feilrapport: `sendDefaultPii` av, oppføring i [databehandlere.md](databehandlere.md). Uendret anbefaling fra forrige B2 — fortsatt ikke gjort, og den er forutsetningen for spørsmål 2 over.
- Deploy → **GitHub Actions hosting-deploy** på merge til `main` (offisiell Firebase-action). Lukker regel-drift-risikoen, gir revisjonsspor og preview-kanal gratis. Nytt funn/forslag i denne kjøringen.
- `npm run sjekk` → **inn i CI** som rapporterende steg. Den finnes, den virker, den kjøres bare når noen husker den.

**Hold det i terminalen:**
- **`npm run tilstand`** — les alle seks `global_stats`-dokumentene, skriv ut lydavviksfordelingen og engagement-traktene. Foreslått i forrige B2, fortsatt ikke gjort, og nå *mer* presserende: tallene må ikke bare leses, de må **renses** (dobbelttellingen i B1 må fikses først, ellers leses søppel). Fortsatt én ettermiddag.
- **Innholdshelse:** utvid `referenceIntegrity.test.ts` til også å dekke `organizationService` (den ville fanget de to spøkelses-utfordringene i dag) og manifest-mot-persona-dekning.
- **GDPR-runbook:** behandlingsansvarlig kan i dag ikke slette/eksportere for en bruker som har mistet kontotilgang — ingen admin-vei i regler, kode eller skript. Ikke bygg admin-UI; skriv en kort runbook for konsollveien, og fiks sletterekkefølgen (funn B3) så self-service-veien ikke kan etterlate foreldreløse data.

**Bygg eget: ingenting.** Uendret. Ikke dashbord (femte flaten ingen leser), ikke tilbakemeldingskanal utover `mailto:` med forhåndsutfylt kontekst, ikke remote config-plattform (kurator-flaggmønsteret holder for dagens behov; en Firestore-lest killswitch er ny kompleksitet uten påvist behov), ikke kuratoren videre (dens «Bestill ny (Kitor)»-knapp bestiller for øvrig ingenting — den setter en localStorage-status og viser en suksessmelding; skal den bestå bak flagget, bør knappen i det minste si sannheten).

### 5.4 Tre nivåer

| Nivå | Innhold |
|---|---|
| **Før lansering** | Fiks dobbelttelling → `npm run tilstand` → les go/no-go-tallene · GlitchTip + databehandler-oppføring · CI-deploy m/ preview · sletterekkefølge + eksportdekning (B2/B3) · org-portal-beslutning (A1) |
| **Flere forvaltere** | Innhold til validert JSON · GDPR-runbook · `mailto:`-tilbakemelding · sjekk i CI |
| **Ved vekst** | Først da en flate — formet av hvilke terminal-spørsmål som faktisk ble stilt oftest |

---

## 6. Del 4 — Læringssløyfer

### 6.1 Sløyfekart, målt

| Innsamling | Skrives | Leses | Endrer noe? |
|---|---|---|---|
| Øktvurdering («for lett/passe/for tungt») | localStorage + `users/{uid}/history` | `adaptiveProgressionService`, `fatigueDeloadService` | **Ja — lukket.** To like vurderinger → forslag med ett-klikks bytte. (Merk: tilpasningen er ±5 s arbeid/hvile på samme mal, ikke «nivået over» som B.12 spesifiserer — ærlig nok, men spec og kode sier ulike ting) |
| Samme vurdering, aggregert | `global_stats/ratings` | Hentes av `fetchGlobalStats` — **og kastes**: `ratingBreakdown` rendres ingen steder | Nei |
| Styrkelogg | localStorage + Firestore | Forhåndsutfyller neste økt — men med *forrige* vekt, ikke progresjonsforslaget | **Halvlukket** (funn A3) |
| Historikk | localStorage + Firestore | Streak, badges, ukesmål, deload — men skyen hydreres først ved Historikk-fanebesøk | **Lukket lokalt, brutt på tvers av enheter** (funn A4) |
| Personlige rekorder | localStorage; Firestore kun fra øktoppsummering | Micro-timeren sender `undefined` som bruker-id — dens PR-er synkes aldri | Halvlukket |
| Øvelsesbytte i program | `programOverrideService` — **ingen skriver** | Flettes ved hver øktstart | **Død sløyfe** (funn A2) |
| `global_stats/overview` | Skrives (dobbelt ved vurdering — funn B1) | Vises i innstillinger + populærsortering i biblioteket | Kun visning — og nå med forurensede tall |
| `overview.types`, `overview.shareLinkOpens` | Skrives | `types` mappes og rendres aldri; `shareLinkOpens` leses aldri | Nei |
| `global_stats/perf` (**go/no-go**) | Skrives | **Aldri** | Nei — åpen ende, tredje revisjon på rad |
| `global_stats/engagement` (24 tellere) | Skrives | **Aldri** | Nei |
| `users/{uid}.settings` (Firestore) | Hardkodede defaults ved nybruker | **Aldri** — parallell, død innstillingsmodell ved siden av den som virker (`settingsStorageService` hydrerer TimerEngine korrekt) | Nei |

**Lukking, minste inngrep først:**
1. Fjern dobbelttellingen (én betingelse i `handleRate` / gjør vurderingsskrivet rent, ~5 linjer) — *før* noe annet, ellers leses søppel.
2. Forhåndsutfyll styrkeøkten fra `calculateDoubleProgression`-resultatet i stedet for forrige logg (~10 linjer) — gjør et råd om til en sløyfe.
3. Hydrer historikk ved innlogging (flytt `getUserWorkoutHistory`-kallet til `AuthContext`, ~15 linjer) — reparerer identiteten på ny enhet.
4. `npm run tilstand` — lukker perf- og engagement-endene uten ny appkode.
5. Øvelsesbytte-UI (én knapp per blokk i programdetaljen) — **eller slett tjenesten**; en død flaggskipsfunksjon er verre enn ingen, for den står i veien for beslutningen.
6. Slett de døde endene: `shareLinkOpens`, `types`-mapping, `ratingBreakdown`-mapping, Firestore-`UserSettings` — hver av dem er lesekostnad og fremtidig forvirring uten funksjon.

### 6.2 Får brukeren vite at systemet har lært?

Adaptiv-banneret vises med tittel og handling — bra. Deload-vurderingen bor fortsatt i smerte-modalen (forrige B2s innvending står; uendret). Og den viktigste tilbakemeldingen mangler fortsatt: *hvorfor*, med tallet («Du vurderte de to siste øktene som for tunge»). Én setning per banner.

### 6.3 Moonshots

1. **«Treneren som kjenner deg» — uten modell.** Koble historikk, utstyr og det strukturerte skadefilteret inn i øktbyggeren (§ 3.2). *Fundament:* alle seks signaltjenestene finnes. *Krever først:* boot-hydrering (6.1 pkt. 3), ellers er «kjennskapen» tom på ny enhet. *Vanskelig å kopiere:* offline, deterministisk, privat — en API-basert konkurrent kan ikke love noen av delene.
2. **Presisjonen som produktbevis** *(arvet fra forrige B2 — står, fordi forutsetningen fortsatt mangler)*: appen måler faseovergangs-avvik i ms; ingen konkurrent kan dokumentere det. *Krever først:* at noen leser `perf` — og nå også funn B1, så tallene er sanne.
3. **Øvelsesbiblioteket som åpent norsk datasett** *(arvet — styrket av Beslutning 48)*: 74 øvelser, bokmålsinstrukser, kommersielt frie bilder. *Krever først:* innhold ut av TypeScript. *Vanskelig å kopiere:* arbeidet, ikke teknologien.
4. **Rommet med fast kode** *(arvet)*: gjenåpnbart rom = koret har et fast treningstidspunkt. *Krever først:* TTL-avklaringen (§ 1) — et gjenbrukbart rom og en 2-timers TTL er motstridende design som må avgjøres samlet.

---

## 7. Funnliste

### 🔴 Blokker

**B1 — Telemetrien dobbelteller hver vurderte økt.**
*Observasjon:* `recordWorkoutTelemetry` kalles ved mount ([WorkoutSummary.tsx:107](../src/components/timer/WorkoutSummary.tsx)) og på nytt i `handleRate` (:244). Steg 1–2 i [telemetryService.ts:205-242](../src/services/telemetryService.ts) inkrementerer `totalWorkouts`, `totalSecondsTrained`, `types` og hele øvelseskartet ubetinget i begge kall; kun ratings-steget er gated. Effekten re-fyrer i tillegg på `user`-endring (dep-array :117).
*Begrunnelse:* Beslutning 46 nedgraderte App Check med argumentet at forgiftet telemetri har «lav sannsynlighet» — men tallene er allerede forgiftet, innenfra: hver vurdert økt teller dobbelt.
*Konsekvens:* fellesskapstallene, populærsorteringen i biblioteket og hele go/no-go-grunnlaget (perf-dokumentets `sessions` er dog separat; overview/exercises rammes) er upålitelige. Alle beslutninger lest ut av `global_stats` arver feilen.
*Forslag:* gjør vurderingsskrivet rent (kun steg 3), eller send en `alreadyCounted`-flagg. Skriv én regeltest som asserterer at vurdering ikke øker `totalWorkouts`.
*Innsats:* under en time.

**B2 — Dataeksporten er ikke «fullstendig», og Beslutning 40 påstår at den er det.**
*Observasjon:* [exportDataService.ts:76-101](../src/services/exportDataService.ts) leser 9 navngitte nøkler. Registeret ([storageKeys.ts](../src/constants/storageKeys.ts)) har ~30, og blant de utelatte er `USER_BIRTH_YEAR` (kommentert «Personopplysning»), `STRENGTH_EXERCISE_LOGS` (reelle treningsdata), all utfordrings- og ferdighetsprogresjon, mållogg og samtykkeregistrering. Registeret advarer selv om nøyaktig denne asymmetrien: sletting tåler ufullstendighet (prefiks-skann), eksport gjør det ikke.
*Begrunnelse:* GDPR art. 15/20; [databehandlere.md](databehandlere.md) § 4.2 lover «fullstendig kopi»; Beslutning 40 hevder «fullstendig GDPR Art. 20».
*Konsekvens:* en innsynsforespørsel besvares med en ufullstendig fil som ser komplett ut. Dokumentlaget gjør at ingen vil oppdage det.
*Forslag:* la eksporten iterere registeret (som slettingen i praksis gjør), og skriv testen som asserterer at hver `STORAGE_KEYS`-nøkkel dekkes. Rett Beslutning 40 med en datert korreksjon.
*Innsats:* 2–3 timer inkl. test.

**B3 — Kontosletting sletter auth-kontoen før dataene.**
*Observasjon:* [AuthContext.tsx:114-117](../src/contexts/AuthContext.tsx): `deleteUser(currentUser)` kjøres før `deleteUserData(uid)`.
*Begrunnelse:* feiler nettet, lukkes fanen, eller utløper tokenet mellom de to await-ene, står alle Firestore-dataene igjen — og eieren kan aldri logge inn igjen for å slette dem. `isOwner`-reglene gjør dem utilgjengelige for alle. Det er permanent PII-retensjon uten self-service-utvei, i strid med art. 17-løftet i personvernerklæringen.
*Konsekvens:* lavfrekvent, men irreversibel når den inntreffer, og usynlig for forvalter (ingen feilrapportering, § 5.2).
*Forslag:* bytt rekkefølge — data først, auth-konto sist. Kommentaren på :98-99 viser at re-autentiseringsrisikoen allerede er håndtert med `reauthenticateWithPopup`, så den opprinnelige grunnen til rekkefølgen er borte.
*Innsats:* under en time.

### 🟡 Alvorlig

**A1 — Organisasjonsportalen viser oppdiktede tall som ekte statistikk, og beslutningen om den er fortsatt ikke tatt.**
*Observasjon:* `getOrganizationStats` returnerer konstanter (8 medlemmer, 142 minutter, 68 % utfordringsprogresjon) for alle organisasjoner, alltid ([organizationService.ts:107-116](../src/services/organizationService.ts)); enhver kode ≥4 tegn oppretter en organisasjon; to av tre presets peker på utfordringer som ikke finnes; alle tre join-kodene ligger i klartekst i bundelen og vises som hurtigknapper. Nåbar for enhver innlogget bruker.
*Begrunnelse:* Tidligere revisjoner dømte den mot C.6 («administratornivå for arbeidsgivere»). Jeg er delvis uenig: portalen viser aggregater til *medlemmer*, ikke innsyn til arbeidsgiver — det har faktisk dekning i C.25. Det C.25 også sier, er «tom til noen ber om den» og «ingen UI før noen ber om det» — og *det* er brutt. Uansett hvilken lesning som vinner: å vise simulerte tall som ekte («100 % Anonymt»-garantien står ved siden av fiktiv statistikk) er et integritetsproblem overfor brukeren.
*Konsekvens:* en reell organisasjonskunde som tester, tar beslutninger på fiksjon; en revisor som leser Beslutning 44, tror B2B-infrastrukturen finnes.
*Forslag:* sett portalen bak samme flaggmønster som kuratoren (av i prod) til beslutningen er tatt — det er 30 minutter og utsetter ingenting annet. Rett Beslutning 44.
*Innsats:* 30 min for flagget; beslutningen er produkteiers.

**A2 — Flaggskipsfunksjonen «byttet øvelse gjelder hele programmet» kan ikke nås.** *Observasjon:* flettingen kjøres ved hver øktstart ([ProgramCatalogView.tsx:309](../src/components/programs/ProgramCatalogView.tsx)); `setExerciseOverride`/`removeExerciseOverride` har **null kallsteder** utenfor tester. *Begrunnelse:* C.8/C.2 gjør dette til det konkrete svaret på konkurrentens svakhet; C.21 pkt. 2 har akseptansekriterium («Bytte i uke 1 står i uke 3») som aldri kan oppfylles. *Konsekvens:* differensiatoren finnes bare i tester. *Forslag:* bygg byttevalget i programdetaljen, eller slett tjenesten og før funksjonen tilbake til backlog som ærlig ugjort. *Innsats:* 1–2 dager for UI; 10 min for sletting.

**A3 — Progresjonsforslaget brukes ikke av neste økt.** *Observasjon:* [StrengthWorkoutModal.tsx:56-65](../src/components/strength/StrengthWorkoutModal.tsx) forhåndsutfyller fra forrige logg; `calculateDoubleProgression`-resultatet vises kun som tekst. *Begrunnelse:* C.17: «du ser … hva regelen foreslår nå»; hele poenget med dobbel progresjon er at rådet blir handling. *Konsekvens:* brukeren må huske rådet selv — sløyfen er visning, ikke læring. *Forslag:* seed fra forslaget, med forrige som synlig referanse («sist: 3×8 @ 20 kg»). *Innsats:* noen timer inkl. test.

**A4 — Skyhistorikken hydreres aldri ved innlogging.** *Observasjon:* `getUserWorkoutHistory` kalles kun fra Historikk-fanen og eksporten; `AuthContext` synker bare profildokumentet. Streak, badges, ukesmål, adaptivt forslag og deload leser localStorage direkte. *Begrunnelse:* «Fungerer uten nett … synkronisering skjer når nett er tilgjengelig» (spec kap. 1) — og kontoprompten selger nettopp «ta vare på fremgangen på tvers av enheter». *Konsekvens:* på ny enhet er brukerens identitet tom til hun tilfeldigvis åpner Historikk — kontoløftet ser brutt ut selv om dataene finnes. *Forslag:* kall hydrering i `AuthContext` ved innlogging (den fletter og skriver tilbake til localStorage allerede). *Innsats:* under en dag.

**A5 — Ingen deploy-pipeline: regel-drift kan ikke utelukkes, utrulling har ikke spor.** *Observasjon:* CI bygger og tester, men deployer aldri; `.firebaserc` har ett prosjekt, ingen preview-kanal; `firebase deploy` kjøres manuelt. *Begrunnelse:* regeltestene i CI verifiserer repo-fila — ikke det som faktisk håndhever tilgang i prod. Etter en PII-lekkasje som ble lukket med nettopp en regelendring, er «er prod-regelen den vi tror?» ikke et pedantisk spørsmål. *Konsekvens:* usporbar utrulling; rollback er manuell hukommelse. *Forslag:* GitHub Actions hosting+rules-deploy på merge, PR-preview-kanal. *Innsats:* en halv dag.

**A6 — Fire funksjoner bygget, aldri koblet inn** (§ 4.1: A2HS-veiledningen, stemmestyringens på-knapp, sensor-modalen fra økt, iOS-bevegelsestillatelsen). *Begrunnelse:* samme klasse som førmerge-sjekkens «tjenester ingen kaller», men på komponentnivå — sjekken ser bare `src/services/`. *Konsekvens:* spec-krav ser oppfylt ut i kodesøk og er det ikke i appen. *Forslag:* koble inn eller slett, per stk.; utvid førmerge-sjekken til komponenter uten render-sti der det er billig. *Innsats:* 1–3 timer per sak.

### 🟠 Moderat

**M1 — Vedlegg C motsier Beslutning 48 om Flux-lisensen.** C.23 («Første krone inn krever regenerering … før første betaling») og C.26 pkt. 1 bærer fortsatt det tilbakeviste premisset; Beslutning 48 rettet spec, vedlegg A og B1-bestillingen, men ikke vedlegg C. Nøyaktig feilklassen metodedokumentet § 3 ber meg rapportere: et delt dokument andre regner med. *Forslag:* rett de to avsnittene med henvisning til Beslutning 48. *Innsats:* minutter.

**M2 — `window.ai`-kallet i treneren er udeklarert.** `localAiCoachService.ts:95-106` sender brukerens prompt til Chrome innebygd AI når den finnes. On-device, men personvernerklæringens «100 % offline»-fortelling nevner det ikke, og svaret blir også kvalitativt annerledes enn reglene. *Forslag:* nevn det i erklæringen, eller fjern grenen (reglene er poenget, § 3.2). *Innsats:* minutter–time.

**M3 — «AI»-merkingen** (ti brukervendte strenger) mot målt determinisme — se § 3.2. *Forslag:* «Øktbygger»/«Treneren». *Innsats:* en strengfil.

**M4 — Øktbyggerens tre stille feil:** utstyrsparameter aldri lest, skadefilter forkastes stille under 4 kandidater, `puls`/`styrke` identisk med helkropp. *Forslag:* koble `filterExercises`, erstatt substring-filteret med `injuryAlternativeService`, si fra når filteret viker. *Innsats:* 1–2 dager samlet.

**M5 — Duplisert profilregister** (`idrettslag` vs `idrett`) brukt av hver sine komponenter. *Forslag:* slå sammen til ett. *Innsats:* timer.

**M6 — Førmerge-sjekken kjøres ikke i CI.** Den finnes, den virket i går (fanget-klassene er reelle), men den avhenger av at noen husker den. *Forslag:* rapporterende CI-steg. *Innsats:* minutter.

**M7 — Død `exercises/`-regel og døde telemetri-ender** (`shareLinkOpens`, `types`-, `ratingBreakdown`-mapping, Firestore-`UserSettings`). Gjentak fra tidligere revisjoner; fortsatt til stede. *Forslag:* slett. *Innsats:* timer.

**M8 — `clock_sync` er fortsatt en uautentisert flate med fritt ID-rom** — Beslutning 46 pkt. 2 utpekte den selv som gjenstående, uten frist. *Forslag:* begrens ID-rommet eller sett TTL; gi punktet en dato. *Innsats:* timer (+ konsoll).

**M9 — [databehandlere.md](databehandlere.md) er utdatert:** § 4.1 lister ikke `personal_records`-samlingen, og dokumentet daterer seg før engagement-telemetrien og persona-lyd. *Forslag:* oppdater ved neste GDPR-berøring (B2-funnet). *Innsats:* minutter.

**M10 — iPhone-hjemskjermikonet er brutt:** `apple-touch-icon.png` deklarert men mangler; SVG-fallback virker ikke på iOS. For en mobil-først-PWA er dette mer enn kosmetikk — det er det brukeren ser hver gang appen åpnes. *Forslag:* generer PNG-en (192/512), legg i `public/`. *Innsats:* minutter.

### ⚪ Polering

- Manifest `lang: "en"` mot `html lang="nb"`.
- `getExerciseTip` er død kode (kalles kun fra egen test).
- Kurator-nøkkelen er hardkodet i komponenten i stedet for å importere `STORAGE_KEYS.CURATOR_FEEDBACK`.
- Bestillingens tall «817 tester» → målt 820; «74 øvelser» stemmer.

### ✅ Det som er bra — og ikke må røres i en opprydding

- **Regelfila er blitt et forbilde:** delta-validering med allowlists, `get`/`list`-skillet gjennomført, serverstemplede tidsstempler, dokumenterte restrisikoer i kommentarene. Kommentaren «endres den ene, MÅ den andre endres» viser at forfatteren forstår koblingsrisikoen.
- **Puls-gatingen på iOS er komplett** — alle ni innganger verifisert. Gårsdagens funn er reelt lukket, med forklarende tekst, ikke bare skjuling.
- **Lydmotorens iOS-håndtering** (`interrupted`-tilstand, epoch-vakter, fallback-stiger) er grundig og riktig begrunnet i kommentarene.
- **`settingsStorageService` → TimerEngine-hydrering virker** — bryterne overlever nå omstart, målt i kode. Oppfølgingens H4 er reelt halvlukket (Firestore-tvillingen står igjen, M7).
- **Slettingen (`deleteUserData`) dekker nå alle seks Firestore-stier og hele localStorage-prefikset** — nøkkelregisteret gjorde jobben sin. (Det er *rekkefølgen* som gjenstår, B3 — ikke dekningen.)
- **Kvotevern-resonnementet i Beslutning 47** (Spark, `billingEnabled: false`, tilgjengelighets- ikke kostnadsrisiko) er verifiserbart og riktig, og Blaze-betingelsen forrige B2 ba om, står nå i teksten.
- 820 grønne tester, grønn build, og en førmerge-sjekk som allerede har vist at den fanger klassene den ble bygget for.

---

## 8. Veikart

**Denne uken**
1. B1 dobbelttelling (timer) — *før* noen leser tallene
2. B3 sletterekkefølge (timer)
3. B2 eksportdekning + register-test (2–3 t)
4. A1 org-portal bak flagg (30 min) + beslutningen til produkteier med frist
5. `npm run tilstand` (en ettermiddag) — les go/no-go-tallene, endelig

**Før lansering**
6. GlitchTip + databehandler-oppføring
7. CI-deploy med preview-kanal (A5)
8. Boot-hydrering (A4) og styrke-forhåndsutfylling (A3)
9. A6-firkanten: koble inn eller slett (A2HS-modalen først — den gater push-fortellingen)
10. M10 apple-touch-icon · M1 vedlegg C-rettelse · M8 clock_sync-dato
11. iPhone-felttest (lydfokus ved skjermlås) — eneste enhetsblokkerende spørsmål

**Neste kvartal**
12. Innhold ut av TypeScript til validert JSON (+ slå sammen profilregistrene, M5)
13. «AI» → «Øktbygger»/«Treneren» (M3) + koble signalene på (§ 3.2, M4)
14. A2: øvelsesbytte-UI eller sletting — ta beslutningen
15. «Bevis-kravet» i DECISIONS: fullførthetspåstander peker på kommandoen som beviser dem (§ 2)

**Fjern eller frys**
- **Frys:** video (inkl. den bygde Wan-workflowen) · musikk · micro-LLM · forvaltningsdashbord · org-portalen (bak flagg til beslutning)
- **Fjern:** `exercises/`-regelen · døde telemetri-ender og Firestore-`UserSettings` (M7) · `window.ai`-grenen (eller deklarer den, M2) · det duplicate profilregisteret · `getExerciseTip`
- **Ikke** regenerer bildebiblioteket (Beslutning 48 står)

---

## 9. Kryssjekk mot tidligere revisjoner

**Hva jeg så som de ikke så:** dobbelttellingen (B1), eksport-gapet og sletterekkefølgen (B2/B3), at org-portalens statistikk er oppdiktede konstanter med spøkelses-referanser (A1 — tidligere runder kalte den «localStorage-simulering», som underdrev), den døde øvelsesbytte-sløyfen (A2), den ubrukte progresjonsutregningen (A3), den manglende boot-hydreringen (A4), de fire frakoblede komponentene (A6), deploy-gapet (A5), `window.ai`-grenen (M2) og at vedlegg C aldri fikk Beslutning 48-rettelsen (M1).

**Hva jeg er uenig i:**
- *Forrige B2, sløyfekartet:* «hovedsløyfen ble lukket i dag» og «ratings … vises til bruker». Første er sant bare for intervalløkter (styrke- og bytte-sløyfene er brutt, A2/A3); andre er feil — `ratingBreakdown` hentes og rendres aldri. Små avvik, men de peker samme vei som hovedinnsikten: lukket-påstander må måles i lesenden, ikke skriveenden.
- *Forrige B2 og oppfølgingen om org-portalen:* begge dømte den ensidig mot C.6. C.25 gir konseptet dekning (aggregert, terskel 3, medlemssyn) — det som er brutt er C.25s egen rekkefølge («tom til noen ber om den») og ærligheten i tallene. Beslutningen bør tas mot riktig paragraf, ellers fremstår et gyldig fremtidig produkt (kommune/eldresenter, C.24) som forbudt.
- *Oppfølgingens H4:* «innstillinger overlever ikke reload» er nå fikset og verifisert — kryssjekken skal også registrere det som er blitt sant.

**Åpne funn på tvers av kjøringene, og hva det sier om hvordan vi jobber:** `perf`-lesing (tredje runde), GlitchTip (andre), innhold-ut-av-koden (tredje), AI-navnet (andre), `exercises`-regelen (andre), org-beslutningen (andre). Fellesnevneren er presis: **hvert åpent funn krever en beslutning eller en lesehandling; hvert lukket funn var en skrivehandling i kode.** Systemet er raskt til å skrive og trege til å beslutte og lese. Førmerge-sjekken (bygget på under et døgn etter forslaget!) beviser skrivehastigheten; at dens egen CI-kobling og `npm run tilstand` fortsatt mangler, beviser resten. Veikartets punkt 1–5 er derfor bevisst valgt slik at fire av fem er lese- eller beslutningshandlinger.

---

## 10. Tilbakemelding på bestillingen

**Det som virket.** Firedelingen (modell/plattform/forvaltning/læring) traff kodebasens faktiske sømmer. «Skill det umulige fra det uforsøkte» i Del 2 var det mest produktive enkeltpåbudet — det er den instruksen som avdekket den fjerde kategorien («bygget, men aldri koblet inn»), som viste seg å være størst. Kravet om utløsende betingelser tvang frem betingelse 4 (lydfokus-felttesten), som er den reelle lanserings-gaten.

**Det som var uklart.**
1. «Systemet kort» oppgir 817 tester; målt 820. Trivielt — men forrige runde foreslo å stemple bestillingen med commit-SHA, og det er fortsatt ikke gjort. Forslaget står.
2. «Telemetri … henter bare tre tilbake» var korrekt i denne runden (verifisert: overview/exercises/ratings). Ros for at fjorårets «nesten riktig»-tall ble rettet.

**Det som ikke lot seg besvare, og hva slags utstyr som skal til:** enhetsspørsmålene (§ 1) — to fysiske telefoner. Men denne runden avdekket en *tredje* utstyrsklasse bestillingen ikke nevner: **konsoll-/prod-tilgang.** TTL-status, utrullede regler og App Check-tilstand kan ikke verifiseres fra repoet, og min gcloud-tilgang var utilstrekkelig. Forslag: legg «krever konsolltilgang» til som egen markering i bestillingen, parallelt med «krever fysisk enhet».

**Det som burde vært formulert annerledes.** Del 4 ber meg kartlegge sløyfene og «foreslå lukking». Det viktigste jeg fant var at flere sløyfer *ser* lukket ut i skriveenden og er brutt i leseenden — og at prosjektets egne fullført-påstander har samme struktur (§ 2). Neste bestilling bør spørre direkte: **«for hver påstand om at noe er fullført i DECISIONS.md siden forrige revisjon: hva er beviskommandoen?»** Det spørsmålet ville funnet B2, A1 og A2 på minutter, og det generaliserer forbi denne kodebasen.

**Til slutt.** Forrige B2 ba dere om en femminutters sjekk i stedet for en fjerde revisjon — og dere bygde den samme dag. Denne femte revisjonen fant likevel tre blokkere. Ikke fordi sjekken er dårlig, men fordi den (med vilje) sjekker struktur, ikke påstander. Den naturlige neste utviklingen er ikke en sjettedels revisjon, men **bevis-kravet i § 2**: la fullført-påstander bære sin egen verifikasjon. Da blir revisjonens jobb det den bør være — å lete etter det ingen har påstått noe om.

---

## Kilder

- Web Bluetooth-status: [caniuse.com/web-bluetooth](https://caniuse.com/web-bluetooth) · [WebBluetoothCG implementation-status](https://github.com/WebBluetoothCG/web-bluetooth/blob/main/implementation-status.md)
- LLM-i-nettleser: [webllm.mlc.ai](https://webllm.mlc.ai/) · [WebGPU-inferens 2026](https://www.buildmvpfast.com/blog/webgpu-browser-ai-inference-cost-savings-2026)
- Kitor-status: SSH-måling 2026-08-31 (vLLM `Qwen3.6-27B`, `docker ps`, `nvidia-smi`)
- Alt øvrig: `mintrener`-repoet ved `18029f4`, med fil- og linjereferanser i teksten; egne kjøringer av `npm test` og `npm run sjekk`

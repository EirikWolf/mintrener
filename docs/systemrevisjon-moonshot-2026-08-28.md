# SYSTEMREVISJON OG MOONSHOT-STRATEGI: «MIN TRENER»

**Dato:** 28. august 2026
**Versjon revidert:** v1.3.0
**Revisjonspanel:** Sjefarkitekt · Senior UI/UX & Produktdesigner · Senior Systemutvikler & Ytelsesingeniør · Forretningsutvikler & Vekststrateg
**Grunnlag:** Full kodegjennomgang av `src/hooks/useIntervalTimer.ts` (556 linjer), 44 tjenester i `src/services/` (6 121 linjer), 38 komponenter (9 623 linjer), Firebase-konfigurasjon, samt dokumentasjonen i `docs/`. Bygger videre på UI-revisjonen i `C:\dev\mintrener\docs\ui-revisjon-2026-08-27.md`, som forblir det autoritative dokumentet for WCAG/UU-avvik.

---

## Innhold

1. [Executive Summary & Karakterbok](#1-executive-summary--karakterbok)
2. [Faganalyse: Sjefarkitekten](#2-faganalyse-sjefarkitekten)
3. [Faganalyse: UI/UX & Produktdesigneren](#3-faganalyse-uiux--produktdesigneren)
4. [Faganalyse: Systemutvikleren (Lyd & Low-Level)](#4-faganalyse-systemutvikleren-lyd--low-level)
5. [Faganalyse: Forretningsutvikleren](#5-faganalyse-forretningsutvikleren)
6. [Matematiske & tekniske beviser](#6-matematiske--tekniske-beviser)
7. [De fire Moonshot-initiativene](#7-de-fire-moonshot-initiativene)
8. [Prioritert handlingsplan](#8-prioritert-handlingsplan)

---

## 1. Executive Summary & Karakterbok

### 1.1 Overordnet dom

Min Trener er et **uvanlig ambisiøst soloprosjekt** som på funksjonsbredde matcher kommersielle apper med tosifrede utviklingsteam: millisekund-basert timermotor, hybrid lydpipeline med ekte innspilte trenerstemmer, Web Bluetooth-pulsstrøm, bevegelsesbasert rep-telling, offline-first Firestore, adaptiv progresjon og kontekstprofiler. Den arkitektoniske instinkten er gjennomgående sunn — tidsstempel-basert timing i stedet for tick-telling, `stateRef`-speiling mot stale closures, persona-lyd med talesyntese-fallback, `persistentLocalCache` for offline.

Men revisjonen avdekker et systemmønster: **hver enkelt løsning er 80 % ferdig, og de siste 20 prosentene er der de vanskelige feilene bor.** Timeren er deterministisk — helt til fanen legges i bakgrunn og faseovergangene kollapser i en catch-up-kaskade. Lyden er buffret — men spilles gjennom HTML5 Audio uten planlagt starttid, så sekvensering styres av et hardkodet `setTimeout(2300)`. Gruppetimeren synkroniserer — på klientens veggklokke, uten offsetkorreksjon. Og hovedloopen skriver hele øktobjektet synkront til `localStorage` **ti ganger i sekundet**.

Ingen av disse er synlige i en demo. Alle er synlige i uke 3 av reell bruk.

### 1.2 Karakterbok

| Disiplin | Terningkast | Én setning |
|:--|:--:|:--|
| **Arkitektur** | ⚄ **4** | Riktige mønstre valgt, men timermotoren bor fortsatt i React-treet, og synkroniseringsstrategien er «håp på at klokkene stemmer». |
| **UI/UX** | ⚂ **3** | Sterk visuell grunnmur trukket ned av overbefolket topplinje, ikonkollisjoner og 14 dokumenterte UU-avvik (se UI-revisjonen 27.08). |
| **Utvikling & Lyd** | ⚃ **4**⁻ | Web Audio-syntesen er korrekt og elegant; stemmeklipp-pipelinen og hot-loopens minneprofil er det ikke. |
| **Forretning** | ⚂ **3** | Reelt og forsvarbart «unfair advantage» (dialekt + kontekst + skånsomhet), men null monetiseringsmekanikk og null viral loop i produktet i dag. |

*Skala: 6 = bransjeledende, 4 = solid med kjente hull, 2 = krever omlegging.*

### 1.3 De fem funnene som betyr mest

1. **[KRITISK] Bakgrunns-throttling knekker timeren.** `setInterval(tick, 100)` på hovedtråden throttles til ≥ 1 s i skjulte faner og suspenderes helt på iOS. Tidsregnskapet overlever (tidsstempler), men faseoverganger, lydsignaler og vibrasjoner uteblir — og ved oppvåkning avfyres alle tapte overganger som en kaskade med full lyd. (§ 2.1, bevis § 6.1)
2. **[KRITISK] `localStorage`-skriving i hot-loopen.** `saveInterruptedSession` serialiserer hele øktobjektet synkront 10 ganger per sekund i partallssekunder. Dette er hovedmistenkt for auditiv/visuell hakking. (§ 4.2, bevis § 6.3)
3. **[ALVORLIG] Gruppesynkronisering på klientklokke.** `startTimestamp: Date.now()` uten server-offset gir deltakerskjevhet lik klokkedifferansen — sekunder, i verste fall. (§ 2.3, bevis § 6.2)
4. **[ALVORLIG] Stemmeklipp uten planlagt starttid.** HTML5 Audio-elementer gir 20–200 ms udeterministisk startlatens og kan ikke sample-synkroniseres; `setTimeout(2300)`-sekvensering er et symptom. (§ 4.1, bevis § 6.1)
5. **[STRATEGISK] Ingen inntekt, ingen viral loop.** Alt er gratis, delingslenker finnes men måles ikke, og det eneste aktivumet konkurrenter ikke kan kopiere (stemme-/dialektbiblioteket) er ikke produktisert. (§ 5)

---

## 2. Faganalyse: Sjefarkitekten

### 2.1 Tilstandsmotor vs. render-livssyklus

**Det som er riktig gjort.** Timerens sannhetskilde er tidsstempler (`phaseStartTime`, `workoutStartTime` i `stateRef`), ikke akkumulerte ticks. `phaseRemaining` avledes hver tick som `duration − (now − phaseStartTime)/1000`, og `resumeWorkout` rekonstruerer `phaseStartTime` baklengs slik at gjenværende tid bevares eksakt. `stateRef`-speilet eliminerer stale closures i loopen. Dette er riktig fundament — mange kommersielle timerapper gjør dette dårligere.

**Sårbarhet 1: Throttling og dvale.** Loopen kjører via `window.setInterval(tick, 100)` på hovedtråden (`useIntervalTimer.ts:384`). Nettleseratferden er:

| Tilstand | Faktisk tick-frekvens |
|:--|:--|
| Synlig fane | ~100 ms |
| Skjult fane (Chrome/Firefox) | ≥ 1 000 ms; Chrome «intensive throttling» etter 5 min: **1 tick/minutt** |
| iOS Safari, skjerm av eller app i bakgrunn | **0 — hele JS-konteksten suspenderes** |

Tidsstempel-designet redder *regnskapet*: når fanen våkner viser klokken riktig. Men alt som skjer *i* ticken uteblir mens den sover: 3-2-1-pip, faseovergangslyder, vibrasjon, persona-cues, `saveInterruptedSession`. En bruker som trener med skjermen av (lyd-drevet trening er et av appens hovedscenarier!) mister nøyaktig det signalet appen finnes for.

**Sårbarhet 2: Catch-up-kaskaden.** `tick()` kaller `advanceToNextPhase()` maksimalt én gang per tick når `remaining <= 0`. Våkner fanen etter at *n* faser har utløpt, avanserer motoren én fase per 100 ms — og **hver `setupPhase` avfyrer lyd, tale og vibrasjon usilent**. Etter 90 sekunder i lommen med 20/10-intervaller får brukeren tre arbeidsstarter, tre pausestarter og tilhørende taleannonseringer avfyrt i løpet av ~600 ms. Det finnes ingen «fast-forward silent»-vei i `advanceToNextPhase`.

**Sårbarhet 3: `Date.now()` er ikke monotonisk.** Veggklokken justeres av NTP, tidssonebytter og brukerinngrep. Et NTP-hopp midt i et intervall forskyver `phaseElapsed` tilsvarende. `performance.now()` er monotonisk og riktig verktøy for *varighet*; `Date.now()` hører kun hjemme i *lagrede* tidsstempler. Kommentaren i koden lover `performance.now()` — implementasjonen holder ikke løftet.

**Sårbarhet 4: Dobbel sannhet.** Hver tilstandsvariabel finnes to steder: React-state (for render) og `stateRef` (for loopen), synkronisert med ti manuelle tildelinger per render pluss eksplisitte speilinger inne i `setupPhase`. Det fungerer i dag, men hver ny tilstandsbit er en ny mulighet for at de to divergerer — og `restoreSession` demonstrerer allerede skjørheten: den kaller `setupPhase` *usilent-flagget utelatt*, slik at gjenoppretting av en avbrutt økt avfyrer lydsignaler mens status settes til `paused`.

**Anbefalt arkitektur — trinnvis, ikke big bang:**

1. **Nå:** Flytt tick-kilden til en dedikert **Web Worker** som poster `{type:'tick', now}` hver 100 ms. Workers throttles langt mildere enn hovedtrådens timere i skjulte faner (og ikke i det hele tatt i Chrome/Firefox desktop). Motorlogikken kan bli stående; kun `setInterval` byttes ut. Én dags arbeid.
2. **Neste:** Trekk hele fasemaskinen (`setupPhase`/`advanceToNextPhase` + `stateRef`) ut av hooken til en ren, rammeverksfri `TimerEngine`-klasse med `subscribe(listener)`. React-hooken blir et tynt `useSyncExternalStore`-bind. Da forsvinner dobbeltsannheten, og motoren blir testbar uten `renderHook`.
3. **Ikke nødvendig:** `SharedArrayBuffer`/`Atomics` er overkill her — det krever cross-origin isolation (COOP/COEP-headere som brekker tredjeparts-innhold) og løser et kontensjonsproblem appen ikke har. Én skrivende worker + meldingspassering er tilstrekkelig og uendelig mye enklere å feilsøke. **Riktig arkitektur er den enkleste som overlever throttling — ikke den mest imponerende.**
4. **Catch-up-politikk:** Gi `advanceToNextPhase` en `while (remaining <= 0)`-løkke med `silent=true` for alle unntatt siste fase, og spill ett enkelt oppsummerende signal («Du er nå på øvelse 4») ved oppvåkning.

### 2.2 Arkitektonisk modulering: lydkoblingene

`setupPhase` orkestrerer i dag **fire lydtjenester direkte**: `audioService` (pip), `speechService` (TTS), `audioClipService` (studioklipp) og `coachPersonaService` (Suno-stemmer) — med `if (persona !== 'standard')`-forgreninger flettet inn i selve fasemaskinen. Konsekvenser:

- **Prioriteringslogikken er implisitt.** Hva skjer når et persona-klipp fortsatt spiller idet 3-2-1-pipene skal starte? Svaret er spredt over fire filer og ett `setTimeout(2300)` (se § 4.1).
- **Fasemaskinen kan ikke testes uten å mocke fire tjenester.**
- **Hver ny lydkilde (musikk-ducking er allerede på vei inn via `audioDuckingService`) øker forgreningene multiplikativt.**

**Anbefaling: hendelsesbuss med én lyd-dirigent.** Fasemaskinen publiserer domenehendelser — `phase:start {phase, exercise, round}`, `countdown {n}`, `workout:complete` — på en enkel typed EventTarget. Én ny modul, `AudioDirector`, er *eneste* abonnent med lydansvar: den eier prioriteringsreglene (persona-klipp > studioklipp > TTS > pip), kansellering og ducking. Vibrasjon og MediaSession blir egne abonnenter. Dette er ikke arkitektur for arkitekturens skyld: det er den eneste strukturen der spørsmålet «hvorfor stotrer lyden ved faseovergang» har ett svar på ett sted.

### 2.3 Data- og synkroniseringsarkitektur

**Offline-first: bedre enn fryktet, verre enn nødvendig.** `firebase.ts` bruker `initializeFirestore` med `persistentLocalCache` — skriv i offline køes og synkes automatisk. Det er riktig. Men appen har i praksis **to sannhetskilder**: Firestore *og* en flora av `localStorage`-nøkler (`mintrener_local_workout_history`, `mintrener_custom_workouts`, `mintrener_local_strength_logs`, avbrutt-økt, favoritter, utfordringer). Flettingen mellom dem er ad hoc per tjeneste, og konfliktstrategien er gjennomgående «siste skriving vinner» uten vektorklokker eller tidsstempel-sammenligning.

**Trenger dere CRDT? Nesten ikke — og det er godt nytt.** Datamodellen er heldig: en fullført økt er **append-only** og immutable. To enheter som logger hver sin økt konflikterer aldri — de skal begge bevares. CRDT-formelt er dette en **G-Set (grow-only set)**, den enkleste CRDT som finnes, og den krever bare: (a) klientgenerert UUID per logg (i dag brukes `Date.now()` som id-frø — kollisjonsrisiko på tvers av enheter), (b) union ved fletting i stedet for overskriving. De eneste ekte konfliktkandidatene er *muterbare* objekter: egendefinerte maler og profilinnstillinger. Der holder «last-write-wins med felt-tidsstempel» — full CRDT-maskineri (Yjs/Automerge) er uberettiget kompleksitet for denne datamengden.

**Gruppetimeren har derimot et reelt klokkeproblem.** `groupRoomService.ts:130` skriver `startTimestamp: Date.now()` — *vertens* veggklokke — og deltakerne beregner presumptivt fremdrift mot sin egen. Skjevheten mellom to deltakere blir da `δ = clock_A − clock_B`, som på mobiltelefoner rutinemessig er 0,5–2 s og kan være mer. For en synkronisert Tabata er 2 sekunder forskjell fullt hørbart («hvorfor piper din før min?»). Løsningen er klassisk NTP-lignende offsetestimering mot Firestore `serverTimestamp` — utledet formelt i § 6.2. Tre timers arbeid, og det er forskjellen på «synkronisert» som markedsføringsord og som sannhet.

### 2.4 Feilhåndtering og robusthet

- `ErrorBoundary` finnes (bra), men fanger kun render-feil. Async-feil i tjenestene logges med `console.warn` og svelges — brukeren får aldri vite at økten *ikke* ble lagret. Minimum: en global feil-toast koblet til de tre kritiske skriveoperasjonene (øktlagring, mal-lagring, konto-sletting).
- BLE-frakobling (`gattserverdisconnected`) varsler callback, men det finnes **ingen automatisk reconnect med backoff** — pulsbeltet som mister kontakt i sekund 40 av en økt er borte for resten av økten med mindre brukeren åpner modal og parer på nytt. (Detaljer § 4.3.)
- `startWorkout` aksepterer `unknown` og runtime-sjekker formen — et symptom på at Zod-skjemaene som finnes i `src/schemas/` ikke håndheves ved systemgrensene (URL-import av delte økter, localStorage-lasting). Valider ved grensen, stol på typene innenfor.

### 2.5 Arkitektens vurdering

Terningkast **4**. Fundamentet (tidsstempler, offline-cache, tjenesteinndeling) er riktig tenkt. Trekkene som mangler — worker-tick, motor ut av React, lyd-dirigent, klokkeoffset — er alle *avgrensede* refaktoreringer, ikke omskrivinger. Det som hindrer 5 er at de tre mest sannsynlige produksjonsfeilene (bakgrunnskaskade, localStorage-jank, gruppeskjevhet) alle ligger i gapet mellom «fungerer i demo» og «fungerer i lomma».

---

## 3. Faganalyse: UI/UX & Produktdesigneren

*Denne analysen bygger på og henviser til UI-revisjonen av 27.08 (`docs/ui-revisjon-2026-08-27.md`), som dokumenterer 14 WCAG-avvik, ikonrevisjonen og topplinje-saneringen i detalj. Her behandles det UI-revisjonen ikke dekket: ergonomi under fysiologisk stress.*

### 3.1 Kognitiv belastning i sone 4/5

Ved 85–95 % av makspuls endres persepsjonen målbart: pupillene fokuserer dårligere, svette bryter lysbrytningen, oppmerksomhetsfeltet smalner («tunnelsyn»), og arbeidsminnet faller mot én enhet. Grensesnittet må derfor vurderes mot et hardere krav enn WCAG: **avlesbart på 1,5 meter, i bevegelse, på under 300 ms.**

**Det som består testen:** Selve nedtellingstallet (~76 px), den fargede fasebakgrunnen som flommer hele skjermen (grønn/rav/blå per fase — avkodbar i perifert syn uten fiksering), og den store START/PAUSE-knappen.

**Det som stryker:**

| Element | Problem i sone 4/5 |
|:--|:--|
| «RUNDE 2 AV 8 • ØVELSE 3 AV 8» | 10 px versaltekst — matematisk uleselig på 1,5 m (se § 6.4: krever ~26 px x-høyde; dette har ~7 px) |
| «Neste: Utfall»-pillen | 11 px — informasjonen brukeren trenger *mest* i siste 5 sekunder av en pause er den minste teksten på skjermen |
| Fase-badgen «JOBB»/«PAUSE» | 10–12 px, redundant med bakgrunnsfargen den flyter på |
| Topplinjens 9 brytere | Irrelevante under økt, men konkurrerer om perifer oppmerksomhet |

**Anbefaling — «Fokusmodus» som egen renderingsgren:** Når `status === 'running'`, bytt til en visning med maksimalt fire elementer: nedtellingstall (fyll 40 % av høyden), øvelsesnavn (≥ 28 px), «neste»-linje (≥ 20 px), fasefarge. Alt annet — toppbar, favoritter, ukesmål — hører hjemme i `idle`. Koden har allerede `state.status`-forgreninger overalt; dette er en omstrukturering av eksisterende betingelser, ikke ny arkitektur. TV-modusen (`TvBigScreenDisplay`) beviser at teamet kan bygge denne typen destillert visning — den mangler bare på mobilen, der den trengs mest.

### 3.2 Spatial ergonomi og haptikk

**Tommelsonene er riktig disponert** i bunnen (Forrige / START / Neste i naturlig bue). To reelle problemer:

1. **Haptikken er binær og uinformativ.** `vibrationService` skiller i dag knapt mellom hendelser. Under lyd-av-trening (kontor-profilen — et av appens uttalte bruksområder!) er vibrasjon eneste kanal, og da må mønstrene bære semantikk: forslag — arbeid-start `[80]`, pause-start `[40,60,40]`, 3-2-1 `[30]×3` med stigende intensitet umulig (API-et har ikke amplitude) men synkende mellomrom mulig, fullført `[100,50,100,50,300]`. Dette er en ren datatabell-endring i eksisterende tjeneste.
2. **Ingen gestflate under økt.** Skipp/forrige krever presisjonstreff på 26 px-soner i bevegelse. Hele hovedflaten (sirkelen) er passiv — den burde ta dobbelttrykk = pause, sveip venstre/høyre = neste/forrige, med haptisk kvittering. (Enkelttrykk må forbli inert av hensyn til feiltrykksfilosofien som låsefunksjonen allerede etablerer.)

### 3.3 Audiovisuell synestesi og dynamisk theming

I dag er koblingen mellom trenerpersona og visuell identitet **null**: Axel Metalcore og Astrid Rolig leverer diametralt ulike auditive kontrakter i nøyaktig samme emerald-på-zinc-flate. Det er en forspilt mulighet, fordi personavalget er appens mest særegne funksjon — og den er usynlig.

**Anbefaling i to ambisjonsnivåer:**

- **Nivå 1 (dager):** Per-persona aksentfarge og fasepalett via CSS-variabler (`--phase-work`, `--accent`), definert i `coachPersonaService` sammen med lydmanifestet. Metalcore får dypere rød-oransje arbeidsfase og hardere kontraster; Kveldsro får dempet teal og lengre fargetransisjoner. Persona blir synlig i samme sekund den er hørbar.
- **Nivå 2 (uker):** Pulssone-drevet ambiens når BLE er tilkoblet: bakgrunnens metning følger sonen (sone 5 = mettet, pulserende kant), slik at `heartRateZoneService`-dataene som allerede beregnes får en perifert avlesbar kanal. NB: pulsering må respektere `prefers-reduced-motion` (jf. UI-revisjonen § 3.7).

### 3.4 Treningspsykologien

Vurderingsknappene (For lett / Passe / For tungt), adaptiv progresjon med begrunnelse («fordi du fullførte 3 økter på rad») og «Fortsett der du slapp»-banneret er **genuint godt designet** — de lukker feedbacksløyfen datadrevet uten å moralisere. Svakheten er at all denne intelligensen munner ut i samme generiske avslutningsskjerm: Astrid sier én av to hardkodede setninger (`WorkoutSummary.tsx:167`), uavhengig av puls, PR, streak eller vurdering. Øyeblikket med høyest emosjonell mottakelighet i hele appen får det dummeste innholdet. `localAiCoachService` finnes allerede — koble den hit først.

### 3.5 UI-ekspertens vurdering

Terningkast **3**. Grunnmuren og psykologien er over snittet; eksekveringen på førstesiden (dokumentert 27.08) og fraværet av en dedikert under-økt-modus trekker ned. Ett sprint på Fokusmodus + persona-theming flytter denne til 5, fordi differensieringen allerede ligger ferdig i lydlaget og bare mangler visuell manifestasjon.

---

## 4. Faganalyse: Systemutvikleren (Lyd & Low-Level)

### 4.1 Lydpipelinen: to verdener, én naiv bro

Pipelinen består av to fundamentalt ulike motorer:

**Verden A — Web Audio-syntesen (`audioService.ts`): korrekt og elegant.** Oscillator-pipene bygges med `exponentialRampToValueAtTime`-envelopes (eliminerer klikk), planlegges med `ctx.currentTime + offset` (sample-nøyaktig), og iOS-opplåsingen med uhørbar tone er etter læreboken. Fanfaren, boksebjella, fløyta og syngeskålen er veldesignede additive synteser. **Ingen funn.**

**Verden B — stemmeklippene (`audioClipService`, `coachPersonaService`): HTML5 Audio uten tidsgaranti.** Her ligger stotringen brukerne hører:

1. **`HTMLAudioElement.play()` har udeterministisk startlatens.** Elementet dekoder ved behov, allokerer en mediepipeline per kall og starter «så snart som mulig» — i praksis 20–200 ms avhengig av enhet, cache-tilstand og GC-trykk. Det finnes **ingen API-flate for å si «start nøyaktig ved t»**. Sample-nøyaktig skjøting av `intro` → øvelsesnavn → `start_321` er *prinsipielt umulig* i denne arkitekturen — mikropausene er ikke en bug i koden, de er en egenskap ved API-valget. (Formelt argument i § 6.1.)
2. **`setTimeout(2300)`-broen** (`useIntervalTimer.ts:142`) er beviset: intro-klippets faktiske varighet er ukjent for koden, så sekvensen gjetter. Er intro 2,6 s, klippes den; er den 1,9 s, oppstår 400 ms død luft. Begge deler høres som stotring.
3. **Cache-strategien preloader ikke ved miss.** `audioCache` gjenbruker elementer, men første avspilling av hvert klipp betaler full nettverks- + dekodekostnad *i avspillingsøyeblikket* — midt i faseovergangen. `preloadPersonaAudio()` hjelper for persona-settet, men øvelsesannonseringene (`exercise_<id>`) preloades aldri mot den *faktiske* øktens øvelsesliste.
4. **Konkurrerende avspilling løses med brutal `pause()`** av forrige klipp — hørbart som kutt midt i ord når overganger kommer tett (skipp-knappen!).

**Anbefalt målarkitektur — én AudioContext-graf for alt:**

```
fetch(url) → ctx.decodeAudioData → AudioBuffer-cache (Map<key, AudioBuffer>)
     ved øktstart: dekod ALLE klipp øktens manifest trenger
     ved avspilling: new AudioBufferSourceNode → gain → destination
                     source.start(ctx.currentTime + δ)      // sample-nøyaktig
     sekvens: neste.start(forrige.startTime + forrige.buffer.duration − ε_crossfade)
```

`AudioBuffer.duration` gjør `setTimeout(2300)` overflødig: skjøtepunktet *beregnes* i stedet for å gjettes, og en 10 ms equal-power crossfade i gain-nodene fjerner skjøtelyden helt. Ducking flyttes fra imperativ volumfikling til en `GainNode` musikk-bussen allerede går gjennom. Dette er 2–3 dagers arbeid og eliminerer hele feilklassen — **Wasm og Worklets er ikke nødvendig for dette trinnet** (se Moonshot § 7.3 for når de blir det).

### 4.2 Event loop, GC og hot-loopens minneprofil

Tick-funksjonen kjører 10 ganger/sekund og gjør per kall: to `setState` (alltid, selv når verdien er uendret — React bailer riktignok på identisk verdi, men `phaseRemaining` er en flyttall som *alltid* endres, så hele komponenttreet under `TimerDisplay` re-rendres 10 ganger/sekund gjennom hele økten), pluss — og dette er hovedfunnet:

**`saveInterruptedSession` kalles fra tick-en når `wholeSecondsLeft % 2 === 0`** (`useIntervalTimer.ts:371`). Betingelsen er sann for *hver av de ti tickene* i hvert partallssekund. Det betyr `JSON.stringify` av hele øktobjektet (alle øvelser, alle felt) + synkron `localStorage.setItem` — **10 ganger per sekund, halvparten av tiden**. `localStorage` er synkron fil-I/O på hovedtråden; på en midlertidig treg Android-enhet er 5–20 ms per skriving realistisk. Det er nøyaktig profilen til «uforklarlig» hakking i animasjon og lydstart. (Kvantifisert i § 6.3.)

**Retting (30 minutter):** flytt lagringen ut av tick-en til en `setInterval(…, 5000)` som lever i samme effekt, eller gate-en på `lastSavedSecond !== wholeSecondsLeft`. Videre: rendre nedtellingstallet fra avrundet verdi (`Math.ceil`) slik at `setState` faktisk bailer 9 av 10 ticks, og la sirkelens jevne bevegelse drives av en CSS-transition eller `requestAnimationFrame` på et ikke-React-element.

Objektallokering for øvrig er akseptabel — `firedCues`-settet reallokeres per fase (fint), og det finnes ingen per-tick array-allokeringer av betydning. Object pooling og typed arrays er **ikke** berettiget her; flaskehalsen er I/O og re-render, ikke allokatoren. Motion-sporingen (`devicemotion` ved ~60 Hz) bør derimot verifiseres for per-event objektbygging når rep-telling er aktiv.

### 4.3 Web Bluetooth: parsing ok, livssyklus mangler

Tilkoblingssekvensen (`requestDevice` med `heart_rate`-filter → GATT → `startNotifications` på 0x2A37) er korrekt, og notifikasjonsmodellen betyr at BLE-trafikken *ikke* poller — hovedtråden får kun et lite event per hjerteslag-pakke (~1 Hz). Det er riktig og billig. Hullene:

1. **Ingen auto-reconnect.** `gattserverdisconnected` → callback → slutt. Pulsbelter mister rutinemessig kontakt (avstand, svette, interferens). Standardmønsteret er eksponentiell backoff-reconnect mot samme `device`-objekt (som forblir gyldig): forsøk ved 1 s, 2 s, 4 s, 8 s, gi opp etter 30 s med diskret UI-varsel. I dag: stille datadød.
2. **RR-intervaller kastes.** 0x2A37-pakken bærer valgfrie RR-intervaller (feltflagg bit 4) — grunnlaget for HRV-beregning, som er gull for restitusjonsrådgivning (`fatigueDeloadService` ville elsket dem). Parsingen bør bevare dem nå selv om de først brukes senere; historiske data kan ikke gjenskapes.
3. **Makspuls hardkodet til 190** med mindre eksplisitt satt — men appen *har* brukerens fødselsår i profilen. `220 − alder` (eller bedre: Tanaka `208 − 0,7·alder`) er en énlinjes forbedring som flytter alle sonegrenser til riktig sted for en 60-årig Senior-profilbruker (som med 190-antakelsen får sone 3 rapportert som sone 2 — direkte villedende for målgruppen appen nettopp har bygget programmer for).

### 4.4 Batteri og Wake Lock

Wake Lock håndteres riktig (request ved start, release ved pause/komplett). Men strategien er binær: skjermen står på full styrke gjennom hele økten. Skjermen er den dominerende forbrukeren (se § 6.3); en 40-minutters økt koster typisk 8–12 % batteri, hvorav ~70 % er panel. Lavthengende frukt: dimme-modus etter 10 s uten interaksjon under `running` (CSS `filter: brightness(0.6)` på rot-elementet — panelet på OLED skalerer forbruk nær lineært med luminans), full lysstyrke ved fasebytte og siste 5 sekunder. Estimert 20–30 % lengre øktkapasitet uten funksjonstap.

### 4.5 Utviklerens vurdering

Terningkast **4 minus**. Web Audio-syntesen og BLE-notifikasjonsvalget viser reell plattformforståelse. Trekket ned er at de to mest merkbare ytelsesfeilene (localStorage i hot-loop, HTML5-Audio-broen) begge er kjente antimønstre med veletablerte løsninger — og at 10 Hz full re-render av et 1 000-linjers komponenttre er unødvendig arbeid i nøyaktig den tilstanden der batteriet betyr mest.

---

## 5. Faganalyse: Forretningsutvikleren

### 5.1 Verdiforslag og markedsposisjonering

**Konkurransekartet er brutalt, men det finnes en åpen flanke.** Strava eier utholdenhets-sosialitet, Nike Training Club eier gratis produksjonskvalitet, Apple Fitness+ eier økosystem-integrasjon. Ingen av dem kan eller vil konkurrere på:

1. **Språklig og kulturell intimitet.** En trenerstemme på haugesundsk eller romsdalsk er ikke en «feature» — det er en relasjon. Globale aktører lokaliserer til bokmål i beste fall; de vil aldri produsere dialekter, kor-profiler eller «Metalcore-Axel». Dette er strukturelt uangripelig fordi markedet er for lite for dem og identiteten for spesifikk.
2. **Kontekst i stedet for kropp.** Konkurrentene segmenterer på treningsmål (styrke/kondis/vekt). Min Trener segmenterer på *livssituasjon*: kontoret, barna, koret, idrettslaget, senioren. «Nakke- og skulderredning» klokken 11 på et møterom er en økt Nike ikke har et konsept for.
3. **Skånsomhet som førsteklasses verdi.** Smerte-/skadefilter, deload-logikk og senior-programmer posisjonerer mot det voksende segmentet som *ikke* identifiserer seg med beast-mode-estetikken — og som har høyest betalingsvilje for trygghet.

**Men:** et unfair advantage som ikke kommuniseres, finnes ikke. I dag møter en ny bruker en generisk mørk timer-app; dialektstemmene er gjemt bak innstillinger. Posisjoneringen må fram i onboardingen: *første* spørsmål bør være «Hvem skal trene deg?» med lydprøver — ikke et kontekstvalg i tekst.

### 5.2 Atferdsøkonomi og gamification-kalibrering

Vurdert mot etablert atferdsøkonomi (tapsaversjon ~2:1, variable belønningsskjemaer, endowed progress):

| Mekanikk | Status | Kalibreringsvurdering |
|:--|:--|:--|
| Streak (dager på rad) | ✅ Finnes | **Underutnyttet tapsaversjon:** streaken vises i historikk-fanen — tapet er usynlig i beslutningsøyeblikket. Den må stå på førstesiden med eksplisitt innramming («🔥 12 dager — ryker i kveld»). Og: uten «streak freeze» (én gratis hviledag per uke) konverterer første sykedag lojale brukere til churnede — Duolingos viktigste enkeltlærdom. |
| 28/30-dagers utfordringer | ✅ Solid | Riktig lengde, dagskort på førstesiden er bra. Mangler *midtveis-milepæl* (dag 14-badge) — dropout topper statistisk i uke 2, nøyaktig der programmet i dag er stillest. |
| Skill Trees | ✅ Finnes | God struktur, men frikoblet fra øktflyten — mestring må *annonseres av treneren* («det der kvalifiserte til neste nivå i knebøy-stigen») for å kobles til dopaminøyeblikket. |
| Variable belønninger | ❌ Mangler | Alle belønninger er deterministiske. Ett uforutsigbart element — sjeldne «gull-økter», tilfeldig ros-klipp fra personaen — er den billigste retensjonsmekanikken som finnes. |
| Ukesmål | ✅ Godt plassert | Endowed progress utnyttes ikke: «0 av 3» er demotiverende innramming; oppvarmings-mikroøkter kunne telle 0,5 slik at uken aldri starter på null. |

**Uke 2-diagnosen:** Kombinasjonen «streak uten forsikring» + «stille midtfase i utfordringene» + «ingen variable belønninger» predikerer nøyaktig drop-off i uke 2. Alle tre er innholds-/logikkjusteringer, ikke nybygg.

### 5.3 Monetiseringsmodell

I dag: null inntekt, null betalingsinfrastruktur. Anbefalt hybridmodell i prioritert rekkefølge:

**Trinn 1 — «Stemmebutikken» (B2C, lavest friksjon).** Kjernen er gratis for alltid (timer, bibliotek, historikk — nødvendig for viralitet i et lite marked). Betalt lag: trenerpersonligheter. 1–2 stemmer gratis, resten à 49–79 kr engangskjøp eller alt-inkludert-abonnement 39 kr/mnd. Dette monetiserer nøyaktig det differensierende aktivumet, har marginalkostnad nær null per ny bruker, og prisankeret (en kaffe for en treningskompis på din dialekt, for alltid) er emosjonelt gunstig. Suno/Chatterbox-pipelinen som allerede er bygget *er* produksjonslinjen.

**Trinn 2 — B2B bedriftshelse (høyest ARPU, kortest vei i Norge).** Kontor-profilen + mikroøkter + TV-modus + gruppestatistikk er *allerede* et HMS-produkt. Norske bedrifter har budsjett og rapporteringsplikt for forebyggende arbeid; en lisens på 49–99 kr/ansatt/år med anonymisert aktivitetsrapport til HR er en enkel innkjøpsbeslutning. Én pilotbedrift på 50 ansatte validerer hele sporet. TV-modusen i lunsjrommet er distribusjonskanalen: hver felleøkt er en demo for alle tilstedeværende.

**Trinn 3 — Creator-markedsplass (senere; nettverkseffekt-motoren).** Åpne øktbyggeren for publisering: instruktører, fysioterapeuter og kortrenere publiserer program + eventuelt egen innspilt stemme, 70/30-deling. Dette konverterer appen fra produkt til plattform — men krever kritisk brukermasse først (se Moonshot § 7.4).

**Det som IKKE bør gjøres:** annonser (ødelegger treningsflyt og skånsomhets-merkevaren), betalingsmur på historikk/eksport (straffer lojalitet og kolliderer med GDPR-godviljen appen har opparbeidet), eller freemium-kvoter på antall økter (retention før monetisering i denne fasen).

### 5.4 Viralitet og delingsmekanikk

Delingslenker for økter finnes (`shareWorkoutService`) — men loopen er ikke instrumentert (ingen attribusjon av hvem som kom via lenke) og ikke insentivert (ingen grunn til å dele utover altruisme). Den sterkeste kandidaten for K-faktor er **P2P-utfordringen**: «Inviter en venn til 28-dagers-utfordringen — se hverandres fremdrift.» Treningsforpliktelse overfor en venn er samtidig appens sterkeste retensjonsmekanisme (sosial forpliktelse slår alle badges). Modellert i § 6.5.

### 5.5 Forretningsutviklerens vurdering

Terningkast **3**. Produktet har et sjeldent ærlig differensieringsgrunnlag og gamification-byggeklossene er på plass — men det finnes bokstavelig talt ingen inntektslinje, ingen målt viral loop og ingen aktivering av det sterkeste aktivumet i onboarding. Alt dette er besluttbart og byggbart på ett kvartal; karakteren reflekterer status, ikke potensial. Potensialet er 5.

---

## 6. Matematiske & tekniske beviser

### 6.1 Lydlatens og jitter: hvorfor HTML5 Audio ikke kan repareres, bare erstattes

**Modell.** Total tid fra beslutning («spill klipp K nå») til første hørbare sample:

$$T_{total} = T_{decode} + T_{pipeline} + T_{scheduling} + \Delta t_{buffer}$$

| Ledd | HTML5 `Audio.play()` | Web Audio `AudioBufferSourceNode` |
|:--|:--|:--|
| \(T_{decode}\) | 0–150 ms (lazy, ved første avspilling) | **0** (forhåndsdekodet til PCM ved øktstart) |
| \(T_{pipeline}\) | 5–50 ms (medieelement-oppsett per kall, udeterministisk) | **0** (grafen eksisterer allerede) |
| \(T_{scheduling}\) | «snarest mulig» — kvantisert av event loop; ingen API-flate for måltidspunkt | \(source.start(t)\): sample-indeksert mot audioklokken |
| \(\Delta t_{buffer}\) | ~20–90 ms utgangsbuffer, *ukjent for JS* | `ctx.baseLatency` + `outputLatency`: **kjent og kompenserbar** |

**Jitter-argumentet.** La \(\sigma\) være standardavviket i startavvik mellom to klipp som skal skjøtes. Med HTML5 Audio er startpunktet en funksjon av event-loop-tilstand og pipelinevarme; empirisk spredning på titalls millisekunder gir \(\sigma \sim 20\text{–}50\) ms — godt over psykoakustisk hørbarhetsterskel for skjøter i tale (~10–20 ms diskontinuitet oppfattes som «stotring»). Med `AudioBufferSourceNode` er startpunktet en *sampleindeks* i en klokke drevet av lydkortets DAC: neste klipp planlegges som

$$t_{n+1} = t_n + \frac{N_n}{f_s}$$

der \(N_n\) er antall samples i klipp \(n\) og \(f_s\) samplingsraten. Avviket begrenses da av klokkens oppløsning: \(\sigma \le 1/f_s = 1/48000 \approx 0{,}02\) ms — **tre størrelsesordener under hørbarhet**, og trivielt \(\sigma < 1\) ms som krevd. Merk presiseringen: dette oppnås med vanlig Web Audio buffer-planlegging; en **AudioWorklet** er kun nødvendig når *innholdet* må genereres/manipuleres i sanntid (tidsstrekking, beat-matching — se Moonshot § 7.3). Å hoppe rett på Worklet/Wasm for ren klipp-skjøting ville vært overengineering.

**Korollar for `setTimeout(2300)`:** setTimeout garanterer kun *tidligste* kjøring; under last er +50–500 ms forsinkelse normalt, og i throttlet fane er minimum 1000 ms. Konstruksjonen har dermed uunngåelig jitter på hundretalls millisekunder — konsistent med observert stotring — og bortfaller i sin helhet når skjøtetidspunkt beregnes fra `AudioBuffer.duration`.

### 6.2 Klokkesynkronisering for gruppetrening

**Problem.** Verten skriver \(t_{start}^{(A)} = \text{Date.now()}_A\). Deltaker B beregner fremdrift som \(\text{Date.now()}_B - t_{start}^{(A)}\). Feilen er klokkedifferansen \(\delta_{AB} = c_A - c_B\), typisk 100 ms–2 s på mobilklokker, ubegrenset i patologiske tilfeller.

**Løsning (NTP-forenklet via Firestore).** Hver klient estimerer sin offset mot Firestore-serverklokken: skriv et dokument med `serverTimestamp()`, mål lokal sendetid \(t_0\) og mottakstid \(t_1\) av kvitteringen med server-stempel \(T_s\), og estimer

$$\hat{\theta} = T_s - \frac{t_0 + t_1}{2}, \qquad \text{feilgrense } |\varepsilon| \le \frac{t_1 - t_0}{2} \text{ (halv RTT)}$$

Verten publiserer `startAtServer = now_server + 3000` (nedtelling gir slingringsmonn for propagering). Hver deltaker starter når \(\text{lokal klokke} + \hat{\theta} = startAtServer\). Med mobil-RTT på 60–200 ms blir garantert skjevhet \(\le\) 30–100 ms — **under persepsjonsgrensen for samtidighet i musikk/rytme (~100 ms)**, mot dagens sekund-klasse. Median av 3–5 målinger reduserer utliggere. Implementasjonskostnad: én funksjon, ett ekstra felt i rom-dokumentet.

### 6.3 Energi- og jankbudsjett

**Energimodell.**

$$E_{\text{økt}} = \int_0^{T} \left(P_{screen}(t) + P_{CPU}(t) + P_{radio}(t)\right)\,dt$$

Typiske effektbidrag under aktiv økt (moderne OLED-mobil, størrelsesordener fra plattformlitteratur):

| Kilde | Effekt | Andel |
|:--|:--|:--|
| Skjerm, full lysstyrke, Wake Lock | ~800–1500 mW | **~65–75 %** |
| CPU: 10 Hz tick + full React-rerender av `TimerDisplay`-treet | ~100–250 mW | ~10–15 % |
| BLE-notifikasjoner (1 Hz, ingen polling) | ~5–15 mW | < 2 % |
| Lyd (forsterker + DSP) | ~30–80 mW | ~5 % |

**To konsekvenser:** (1) BLE-optimalisering er irrelevant for batteri — arkitekturvalget (notify, ikke poll) var allerede riktig. (2) Dimming er den eneste store spaken: OLED-effekt skalerer tilnærmet lineært med luminans, så `brightness(0.6)` i rolige faser gir \(\Delta E \approx 0{,}4 \cdot 0{,}7 \cdot E_{screen} \approx 20\text{–}25\,\%\) av totalen — mer enn all CPU-optimalisering til sammen. Worker-flytting av ticken begrunnes derfor med **korrekthet under throttling** (§ 2.1), ikke batteri; batteriargumentet for den er sekundært (mindre re-render når UI-oppdatering frikobles fra motor-tick).

**Jankbudsjett for localStorage-skrivingen (§ 4.2).** Ved 60 FPS er rammebudsjettet 16,7 ms. En synkron `JSON.stringify` + `setItem` på 5–20 ms i partallssekunder konsumerer 30–120 % av ett rammebudsjett, 10 ganger på rad, annethvert sekund — en deterministisk, periodisk jankkilde som sammenfaller i tid med nedtellingsanimasjonen og (via hovedtrådsblokkering) forsinket `Audio.play()`-start. Én gate-linje (`if (sec !== lastSaved)`) reduserer skrivefrekvensen med faktor 20 og fjerner fenomenet.

### 6.4 Avlesbarhet på avstand (sone 4/5-kravet fra § 3.1)

Normalsyn oppløser detaljer ned til ~1 bueminutt; komfortabel lesing av tall under stress krever tegnhøyde ≥ 15–20 bueminutter. Ved avstand \(d = 1{,}5\) m:

$$h = d \cdot \tan(\theta) \approx 1{,}5 \cdot \tan(18') \approx 7{,}9 \text{ mm}$$

På en typisk mobil (~2,8 px/mm effektivt i CSS-piksler) er det **≥ ~22 CSS-px tegnhøyde som absolutt gulv i hvile** — og under fysiologisk stress (svette, bevegelse, tunnelsyn) bør marginen dobles til ~40 px. Konklusjon: nedtellingstallet (76 px) består; «RUNDE 2 AV 8» (10 px ≈ 3,6 mm ≈ 8 bueminutter) og «Neste:»-pillen (11 px) er matematisk uleselige på treningsavstand og må enten forstørres i Fokusmodus eller aksepteres som nærlesnings-elementer.

### 6.5 Retensjon, viralitet og LTV

**Kohortmodell.** La \(r\) være måned-til-måned-retensjon og ARPU månedlig snittinntekt per aktiv bruker. Forventet levetidsverdi per akkvirert bruker:

$$LTV = ARPU \cdot \sum_{t=0}^{\infty} r^t = \frac{ARPU}{1 - r}$$

Med stemmebutikk-abonnement 39 kr/mnd, 8 % betalende og \(r = 0{,}80\): \(LTV = \frac{0{,}08 \cdot 39}{0{,}20} \approx 15{,}6\) kr per gratisbruker — tynt. Løftes \(r\) til 0,90 (streak-forsikring + P2P-utfordringer + uke-2-fiksene fra § 5.2): \(LTV \approx 31\) kr, en dobling **uten å røre pris eller konvertering**. Dette er det kvantitative argumentet for at retensjonsarbeid går foran monetiseringsarbeid.

**Viral motor.** Med invitasjonsrate \(i\) (andel brukere som sender P2P-utfordring) og aksept \(a\): \(K = i \cdot a\). Effektiv vekst uten betalt akkvisisjon krever at organisk tilsig \(n_{t+1} = n_t \cdot (r + K)\) har \(r + K > 1\). Med \(r = 0{,}90\) trengs bare \(K > 0{,}10\) — f.eks. 25 % som inviterer med 40 % aksept. For en app hvis kjerneopplevelse («tren *sammen*») naturlig involverer en annen person, er dette et realistisk mål — men i dag er \(K\) umålt og uinsentivert, altså effektivt 0. **Første datapunkt er gratis: legg attribusjon på delingslenkene som allerede finnes.**

**B2B-flanken:** Én bedriftsavtale à 50 ansatte × 79 kr/år = 3 950 kr/år tilsvarer LTV-en til ~250 organiske gratisbrukere i basisscenariet. CAC for B2B i Norge er én demo i ett lunsjrom med TV-modusen som allerede er bygget.

---

## 7. De fire Moonshot-initiativene

Hvert moonshot vurderes på konsept, gjennomførbarhet (⚡ = byggbart på dagens stack) og ROI-logikk. De er rangert etter *forhold mellom radikalitet og risiko* — et godt moonshot for et soloprosjekt er ett som gjenbruker eksisterende aktiva i en ny konfigurasjon, ikke ett som krever ny grunnforskning.

### 7.1 Arkitektens Moonshot: «Puls-svermen» — serverløs sanntidssynkronisert gruppetrening med delt biometri

**Konsept.** Dagens grupperom deler timer-tilstand. Svermen deler *fysiologi*: hver deltakers pulssone (ikke rå puls — personvern ved design: sonen er relativ til egen maks) strømmes til rommet, og alle ser gruppens «energifelt» — et levende felt av fargede prikker der instruktøren (TV-modus) umiddelbart ser hvem som ligger i sone 5 og trenger nedskalering, og hvem som har mer å gi. Kombinert med klokkesynkroniseringen fra § 6.2 blir dette en treningsopplevelse ingen av gigantene tilbyr: *ekte samtidighet med ekte kroppsdata, uten dyre studio-abonnement*.

**Arkitektur.** Firestore er feil verktøy for > 1 Hz-strømmer (kostnad per skriving, ~sekundlatens). Riktig: WebRTC DataChannels i mesh for rom ≤ 8 deltakere (P2P, null serverkostnad, < 100 ms), med Firestore kun som signaleringskanal — den rollen kan dagens `groupRoomService` gjenbrukes til nesten uendret. For instruktør-scenarioet (én skjerm, mange sendere) er topologien stjerne mot TV-klienten. Edge-inferens (per-deltaker anbefaling «senk tempo») kjører lokalt på hver enhet mot egen pulskurve — ingen sentral ML-infrastruktur.

**Gjennomførbarhet:** ⚡⚡ Middels. WebRTC-signalering over Firestore er velkjent terreng; BLE-pulsen finnes; TV-visningen finnes. Estimat 4–6 uker. Risiko: NAT-traversering krever TURN-fallback (~gratis-tier holder for pilot).
**ROI:** Direkte føde til B2B-sporet (§ 5.3 trinn 2) — «se hele avdelingens energifelt i lunsjtreningen» er demoen som selger HMS-lisensen. Dette er moonshotet med kortest vei fra wow til faktura.

### 7.2 UI-ekspertens Moonshot: «Blindmodus» — økten uten skjerm

**Konsept.** Ikke AR-briller (feil kostnad/nytte for målgruppen), men det motsatte og mer radikale: **eliminér skjermen fullstendig**. En økt gjennomføres med telefonen i lomma: all tilstand formidles gjennom (a) sonisk bioguiding — kontinuerlig, subtilt lydlandskap der tonehøyde/tekstur koder fase og gjenværende tid (stigende tekstur siste 5 s — hjernen lærer koden på én økt), (b) semantisk haptikk (§ 3.2-mønstrene), (c) trenerstemmen som allerede finnes, og (d) stemmestyring som allerede finnes («pause», «neste»). Skjermen blir *valgfri* — og appen blir samtidig, som biprodukt, den mest tilgjengelige treningsappen på markedet for blinde og svaksynte: et moonshot som løser UU-topplisten (jf. UI-revisjonen) som bieffekt av et premiumkonsept.

**Hvorfor dette slår AR:** Målgruppene (kontor, senior, utendørs-GPS) trener *uten å ville se på noe*. Verdien ligger i frigjort oppmerksomhet, ikke i mer visuell informasjon. Og hele leveransekjeden finnes: lydmotor, TTS, stemmekommandoer, vibrasjon, MediaSession (låseskjermkontroll). Det som mangler er *komposisjonen*: et «Skjermfri økt»-toggle og det soniske kodespråket.

**Gjennomførbarhet:** ⚡⚡⚡ Høy — 2–3 uker på eksisterende byggeklosser, *forutsatt* at bakgrunns-throttlingen (§ 2.1) løses først; blindmodus er meningsløs hvis lyden dør når skjermen slukker. (Worker-tick + MediaSession holder lydkonteksten i live som «spilleren».)
**ROI:** Differensiering ingen konkurrent matcher, presseverdig tilgjengelighetshistorie, og direkte økt batterilevetid (§ 6.3: skjermen er 70 % av forbruket — blindmodus er også batterimoonshotet).

### 7.3 Utviklerens Moonshot: Beat-matched trenermotor (AudioWorklet + Wasm)

**Konsept.** Sanntids lydmotor der trenerstemmen og treningsmusikken smelter sammen: musikkens tempo detekteres (eller velges), intervallene kvantiseres til taktslag (arbeidsfasen starter *på* eneren), 3-2-1-nedtellingen lander på slagene, og stemmeklippene tidsstrekkes (uten pitch-endring, via phase-vocoder i Wasm) slik at «KJØR!» treffer nøyaktig på beatet. Metalcore-Axel som teller ned *i takt med* riffet er en opplevelse som i dag ikke finnes i noen kommersiell app.

**Arkitektur.** Dette er det legitime bruksområdet for verktøyene som ville vært overkill i § 4.1: en `AudioWorkletProcessor` (kjører på sanntids-lydtråden, immun mot hovedtråds-jank og GC) huser en Wasm-modul (Rust) med time-stretch (WSOLA/phase-vocoder) og beat-grid. Hovedtråden sender kun kommandoer («klipp K på neste ener»); all DSP skjer i 128-samples kvanter på lydtråden. Jitter-garantien fra § 6.1 (\(\sigma < 1\) ms) gjelder per konstruksjon.

**Gjennomførbarhet:** ⚡ Lav-middels — 2–3 måneder, krever DSP-kompetanse, og forutsetter at hele klipp-pipelinen først er migrert til AudioBuffer-grafen (§ 4.1), som uansett skal gjøres. Bygg trinnvis: (1) buffer-graf [uansett], (2) kvantiser fasegrenser til valgt BPM [enkelt], (3) Worklet-mikser [middels], (4) Wasm time-stretch [vanskelig].
**ROI:** Trinn 1–2 alene («intervaller i takt med musikken») er skipbar verdi på uker. Full motor er premium-innhold for stemmebutikken (§ 5.3) — beat-matched personas som betalt tier.

### 7.4 Forretningsutviklerens Moonshot: «Stemmefabrikken» — fra app til plattform for norske trenerstemmer

**Konsept.** Transformer produksjonspipelinen (Suno-generering, Chatterbox-TTS, silenceremove/afade-etterbehandling, manifest-systemet) fra internt verktøy til **markedsplass**: fysioterapeuter, PT-er, kortrenere og idrettslagstrenere spiller inn (eller AI-kloner, med samtykke og vederlag) sin egen stemme, kobler den til egne program, og selger dem i appen med 70/30-deling. Idrettslaget selger «trener Kjells oppkjøringsprogram» til egne medlemmer; fysioterapeuten selger «skulderrehab med min stemme» til pasienter mellom timer. Min Trener eier ikke lenger bare et stemmebibliotek — den eier *distribusjonskanalen for norsk trenings-lyd*, med dialektmangfoldet som vollgrav.

**Hvorfor dette er et ekte moonshot og ikke bare en butikk:** Nettverkseffekten er tosidig — hver ny stemme gjør appen mer verdt for lyttere, hver ny lytter gjør plattformen mer verdt for stemmer — og aktivumet (norske dialekt-treningsstemmer med tilhørende programmer) er verdiløst for globale aktører å kopiere men verdifullt for dem å *kjøpe*. Det er også den eneste modellen der innholdsproduksjonen skalerer uten grunnleggeren.

**Gjennomførbarhet:** ⚡ Krever rekkefølge: (1) stemmebutikk med *egne* personas først (validerer betalingsvilje, gjenbruker alt), (2) manuell «kuratert kreatør»-pilot med 3–5 håndplukkede instruktører (validerer tilbudssiden uten selvbetjeningsbygg), (3) selvbetjent pipeline sist. Juridisk må på plass fra dag én i steg 2: stemmerettigheter, samtykke til AI-kloning, MVA på digitale tjenester.
**ROI:** Trinn 1 er Q1-inntekt. Trinn 3 er exit-fortellingen.

---

## 8. Prioritert handlingsplan

### 8.1 Quick Wins (denne uken — timer, ikke dager)

| # | Tiltak | Ref. | Effekt |
|:--|:--|:--|:--|
| 1 | Gate `saveInterruptedSession` på sekundskifte (én `if`-linje) | § 4.2 | Fjerner 95 % av localStorage-I/O i hot-loopen — hovedmistenkt for hakking |
| 2 | Bytt `Date.now()` → `performance.now()` for faseregnskap | § 2.1 | Immun mot klokkejustering |
| 3 | `220 − alder`-fallback for makspuls fra profil | § 4.3 | Riktige pulssoner for senior-segmentet |
| 4 | `silent`-flagg i `restoreSession` | § 2.1 | Fjerner lydsalve ved gjenoppretting |
| 5 | Preload øvelsesklipp for *aktiv* økt ved `startWorkout` | § 4.1 | Fjerner dekodelatens ved første annonsering |
| 6 | Attribusjonsparameter på delingslenker + telemetri-event | § 6.5 | Første måling av K-faktor — gratis data |
| 7 | Sprint 1 fra UI-revisjonen 27.08 (zoom, kontrast, scrollbar, xs-breakpoint) | UI-rev § 10 | Fire WCAG-avvik lukket |

### 8.2 Q1-mål (neste kvartal — de strukturelle grepene)

**Teknisk spor (rekkefølgen er avhengighetsstyrt):**
1. **Worker-tick** for timermotoren → deretter catch-up-politikk med silent fast-forward (§ 2.1). *Forutsetning for alt lydarbeid i bakgrunn og for Blindmodus.*
2. **AudioBuffer-migrering** av klipp-pipelinen: dekod ved øktstart, planlagt starttid, beregnede skjøtepunkter, crossfade (§ 4.1). *Fjerner stotringen ved roten.*
3. **`TimerEngine` ut av React** + `AudioDirector` som eneste lydabonnent på hendelsesbussen (§ 2.2). *Gjør 1 og 2 testbare.*
4. **Klokkeoffset for grupperom** (§ 6.2) + BLE auto-reconnect med backoff (§ 4.3).
5. **Fokusmodus** under `running` + semantisk haptikk-tabell + persona-aksentfarger nivå 1 (§ 3.1–3.3).
6. UI-revisjonens Sprint 2 og 3 (ikonrevisjon, topplinje, ARIA/fokus).

**Forretningsspor:**
1. Streak til førstesiden + streak-forsikring + dag-14-milepæl i utfordringene (§ 5.2).
2. Onboarding om til «Hvem skal trene deg?» med lydprøver (§ 5.1).
3. Stemmebutikk MVP: betalingsintegrasjon (Vipps først — norsk marked), 2 gratis + 4 betalte personas (§ 5.3).
4. P2P-utfordringsinvitasjon med delt fremdrift (§ 6.5) — retensjon og viralitet i samme bygg.
5. Én B2B-pilotbedrift rekruttert med TV-modus-demo (§ 5.3).

### 8.3 Strategiske bautaer (6–18 måneder)

| Bauta | Innhold | Går i gang når |
|:--|:--|:--|
| **Puls-svermen** (§ 7.1) | WebRTC-biometrirom + instruktørfelt | Q1-teknisk 1–4 er levert |
| **Blindmodus** (§ 7.2) | Skjermfri økt: sonisk koding + haptikk + stemme | Worker-tick + AudioBuffer levert |
| **Beat-matched motor** (§ 7.3) | Trinn 1–2 (BPM-kvantiserte intervaller) i Q2; Worklet/Wasm når DSP-kapasitet finnes | AudioBuffer-migrering levert |
| **Stemmefabrikken** (§ 7.4) | Kuratert kreatør-pilot → selvbetjening | Stemmebutikken har validert betalingsvilje |

### 8.4 Målekortet (definér suksess nå, ikke etterpå)

| Måltall | I dag | Q1-mål |
|:--|:--|:--|
| Jank: lange tasks (> 50 ms) per økt-minutt | Umålt (instrumentér med `PerformanceObserver`) | < 1 |
| Faseovergangs-lydavvik (planlagt vs. faktisk) | Umålt | p95 < 20 ms |
| Gruppeskjevhet mellom deltakere | ~klokkediff (sekunder) | < 100 ms |
| D7-retensjon | Umålt | Baseline + målt |
| K-faktor (delingslenker) | 0 (uinstrumentert) | Målt; > 0,05 |
| Betalende andel | 0 % | Første 100 betalende |
| WCAG-avvik (UI-rev. § 9.1) | 14 | 0 i kategori A1 |

---

## Sluttord fra panelet

Min Trener lider ikke av mangel på ambisjon, funksjoner eller ideer — den lider av det motsatte: **bredden har løpt fra dybden.** De fire fagpanelene peker uavhengig av hverandre på samme resept: stopp tilførselen av nye funksjoner i ett kvartal, og bruk det på (1) å gjøre timerens og lydens kjerne *sann* under reelle forhold — lomme, dvale, svak enhet, (2) å gjøre det som allerede er unikt — stemmene, kontekstene, skånsomheten — *synlig, hørbar og kjøpbar*. Moonshotene er ikke avvik fra dette; alle fire er rekonfigurasjoner av aktiva som allerede ligger i kodebasen. Det er den beste attesten et soloprosjekt kan få.

---

*Systemrevisjon utført 28. august 2026. Kontrast- og latensverdier: beregnede modeller (§ 6); effekt- og markedstall: estimater basert på plattformlitteratur og bransjeerfaring — valider med måling (§ 8.4) før beslutninger med høy innsats. Selskapsnavn og API-atferd reflekterer status per revisjonsdato.*

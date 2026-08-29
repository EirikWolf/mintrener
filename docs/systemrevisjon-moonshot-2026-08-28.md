# SYSTEMREVISJON OG MOONSHOT-STRATEGI: «MIN TRENER»

**Dato:** 28. august 2026 (dokumentversjon 2.0, revidert samme kveld)
**App-versjon revidert:** v1.3.0
**Revisjonspanel:** Sjefarkitekt · Senior UI/UX & Produktdesigner · Senior Systemutvikler & Ytelsesingeniør · Sikkerhets- og personvernrevisor · Forretningsutvikler & Vekststrateg
**Grunnlag:** Full kodegjennomgang av `src/hooks/useIntervalTimer.ts` (659 linjer), 44 tjenester i `src/services/` (5 661 linjer), 46 komponenter (11 584 linjer), `firestore.rules`, CI-oppsett, 32 testfiler, samt dokumentasjonen i `docs/`. Bygger videre på UI-revisjonen i `docs/ui-revisjon-2026-08-27.md` (autoritativ for WCAG/UU-avvik) og `docs/databehandlere.md` (autoritativ for databehandleroversikten).

> **Om dokumentversjon 2.0:** Førsteutgaven (v1.0, samme dato) var en ren tilstandsanalyse. Denne utgaven er **etterprøvd linje for linje mot kodebasen** slik den står i kveld, på tvers av grenene `main` (@5ae3a11), `feat/q1-teknisk-spor` (@1d6fc45), `fix/a11y-etterslep` (@6709594) og `feat/fokusmodus` (@cba96c4). Alle funn har fått eksplisitt status (✅ levert / 🔶 på gren / ⬜ åpen), faktafeil er rettet, og to områder førsteutgaven ikke dekket — sikkerhet/personvern og teststrategi — har fått egen faganalyse (§ 5). Handlingsplanen (§ 9) er omprioritert deretter.

---

## Innhold

1. [Executive Summary & Karakterbok](#1-executive-summary--karakterbok)
2. [Faganalyse: Sjefarkitekten](#2-faganalyse-sjefarkitekten)
3. [Faganalyse: UI/UX & Produktdesigneren](#3-faganalyse-uiux--produktdesigneren)
4. [Faganalyse: Systemutvikleren (Lyd & Low-Level)](#4-faganalyse-systemutvikleren-lyd--low-level)
5. [Faganalyse: Sikkerhet, personvern & kvalitetssikring](#5-faganalyse-sikkerhet-personvern--kvalitetssikring)
6. [Faganalyse: Forretningsutvikleren](#6-faganalyse-forretningsutvikleren)
7. [Matematiske & tekniske beviser](#7-matematiske--tekniske-beviser)
8. [De fire Moonshot-initiativene](#8-de-fire-moonshot-initiativene)
9. [Prioritert handlingsplan](#9-prioritert-handlingsplan)

---

## 1. Executive Summary & Karakterbok

### 1.1 Overordnet dom

Min Trener er et **uvanlig ambisiøst soloprosjekt** som på funksjonsbredde matcher kommersielle apper med tosifrede utviklingsteam: millisekund-basert timermotor, hybrid lydpipeline med ekte innspilte trenerstemmer, Web Bluetooth-pulsstrøm, bevegelsesbasert rep-telling, offline-first Firestore, adaptiv progresjon og kontekstprofiler. Den arkitektoniske instinkten er gjennomgående sunn — tidsstempel-basert timing i stedet for tick-telling, `stateRef`-speiling mot stale closures, persona-lyd med talesyntese-fallback, `persistentLocalCache` for offline.

Førsteutgavens diagnose var at **hver enkelt løsning var 80 % ferdig, og de siste 20 prosentene er der de vanskelige feilene bor.** Etterprøvingen viser at diagnosen traff — og at responsen allerede er i gang: samtlige sju quick wins fra førsteutgaven er levert på `main` (commit 5ae3a11), og fire av seks Q1-tiltak i teknisk spor ligger implementert med tester på `feat/q1-teknisk-spor`. Det som *gjenstår* av førsteutgavens funn er dermed skarpere avgrenset: lydpipelinens HTML5 Audio-fundament (§ 4.1), motoren som fortsatt bor i React-treet (§ 2.1), og hele forretningssporet (§ 6).

Etterprøvingen avdekket samtidig det førsteutgaven ikke så: **`firestore.rules` har to reelle hull** — verdensskrivbar telemetri og uautentisert rom-mutasjon (§ 5.1) — og appen er på vei til å samle **helsedata i GDPR artikkel 9-forstand** (puls, og fra i kveld også RR-intervaller) uten at personverndokumentasjonen har tatt høyde for kategorien (§ 5.2). Ingen av delene er kritiske i dag; begge er blokkerende for Puls-svermen (§ 8.1).

Ingen av de gjenstående feilene er synlige i en demo. Alle er synlige i uke 3 av reell bruk — eller i første eksterne sikkerhetsgjennomgang.

### 1.2 Leveransestatus for førsteutgavens funn

Verifisert mot kode og git-historikk 28.08 kl. 22–23:

| # | Funn (v1.0) | Alvorlighet | Status | Belegg |
|:--|:--|:--|:--|:--|
| 1 | Bakgrunns-throttling knekker timeren | KRITISK | 🔶 **Levert på gren** | Worker-tick (`tickerService` + `timerTick.worker.ts`, commit cf10172, med `setInterval`-fallback) og catch-up-politikk med stille fast-forward (b6fcea1, a1dc749) på `feat/q1-teknisk-spor`. Gjenstår: merge til `main` + felttest på iOS. |
| 2 | `localStorage`-skriving 10×/s i hot-loopen | KRITISK | ✅ **Lukket** | Gating på `lastSessionSaveSecond` (`useIntervalTimer.ts:375–381`) — maks én skriving per partallssekund. |
| 3 | Gruppesynkronisering på klientklokke | ALVORLIG | 🔶 **Levert på gren** | `clockSyncService` (NTP-forenklet offset, median av målinger) + `startAtServerMs` i romdokumentet + rules-oppdatering (6e31bfa, cb6381d). |
| 4 | Stemmeklipp uten planlagt starttid | ALVORLIG | ⬜ **Åpen** | `audioClipService` er fortsatt HTML5 Audio; `setTimeout(2300)`-broen består (`useIntervalTimer.ts:153` på q1-grenen). Hovedgjenstående tekniske funn. |
| 5 | Ingen inntekt, ingen viral loop | STRATEGISK | ⬜ **Åpen** (delvis) | `ref=share`-attribusjon på delingslenker er levert (quick win 6); monetisering, onboarding og K-faktor-måling er urørt. |

Alle sju quick wins fra v1.0 (§ 8.1 i førsteutgaven) er verifisert levert: save-gating, `performance.now()` for faseregnskap, Tanaka-makspuls fra fødselsår (`heartRateZoneService.ts:12–13`), stille `restoreSession`, preload av øktens øvelsesklipp i `startWorkout`, delingsattribusjon, og UI-revisjonens Sprint 1 (på `fix/a11y-etterslep`). I tillegg er BLE auto-reconnect med backoff + RR-intervaller (4cf2aa6 → 1d6fc45) og semantisk haptikk-tabell (f5c37c8) levert på q1-grenen, og Fokusmodus ligger som utkast på egen gren (cba96c4).

### 1.3 Karakterbok

| Disiplin | Terningkast | Én setning |
|:--|:--:|:--|
| **Arkitektur** | ⚄ **4**⁺ | Riktige mønstre valgt, og q1-grenen tetter throttling- og klokkehullene — men motoren bor fortsatt i React-treet med dobbel sannhet. 5 ved merge + `TimerEngine`-uttrekk. |
| **UI/UX** | ⚂ **3**⁺ | Sterk visuell grunnmur; Sprint 1 av UU-avvikene lukket og Fokusmodus påbegynt — resten av UI-revisjonen og persona-theming gjenstår. |
| **Utvikling & Lyd** | ⚃ **4**⁻ | Web Audio-syntesen er korrekt og elegant; stemmeklipp-pipelinen er fortsatt appens mest hørbare tekniske gjeld. |
| **Sikkerhet & personvern** | ⚂ **3** | Solid grunnholdning (local-first, EU-region, databehandleroversikt) undergravd av to rules-hull og manglende artikkel 9-beredskap. |
| **Forretning** | ⚂ **3** | Reelt og forsvarbart «unfair advantage» (dialekt + kontekst + skånsomhet), men null monetiseringsmekanikk og umålt viral loop. |

*Skala: 6 = bransjeledende, 4 = solid med kjente hull, 2 = krever omlegging.*

### 1.4 De fem funnene som betyr mest nå

1. **[KRITISK] `global_stats` er verdensskrivbar.** `allow write: if true` i `firestore.rules` lar hvem som helst overskrive eller forfalske all aggregert statistikk — og bruke skriveoperasjonene som kostnadsvektor. (§ 5.1)
2. **[ALVORLIG] Stemmeklipp-pipelinen står på HTML5 Audio.** 20–200 ms udeterministisk startlatens, `setTimeout(2300)`-sekvensering og `pause()`-kutt er fortsatt hørbare i hver faseovergang med persona aktiv. Eneste gjenstående av v1.0s fire tekniske hovedfunn. (§ 4.1, bevis § 7.1)
3. **[ALVORLIG] Grupperom kan leses og muteres uten autentisering.** `allow read: if true` pluss `participantCount`-oppdatering uten auth-krav er akseptabelt for en timer — og diskvalifiserende for delt biometri. Må lukkes *før* Puls-svermen. (§ 5.1)
4. **[MODERAT] Motoren bor fortsatt i React.** Dobbel sannhet (state + `stateRef`), 10 Hz full re-render av timertreet (rå flyttall til `setPhaseRemaining`), og en fasemaskin som ikke kan testes uten `renderHook`. Worker-ticken (q1) løser throttling, ikke strukturen. (§ 2.1, § 4.2)
5. **[STRATEGISK] Ingen inntekt, ingen målt viral loop.** Attribusjonen er på plass — men ingenting leser den, alt er gratis, og stemme-/dialektbiblioteket er fortsatt ikke produktisert. (§ 6)

---

## 2. Faganalyse: Sjefarkitekten

### 2.1 Tilstandsmotor vs. render-livssyklus

**Det som er riktig gjort.** Timerens sannhetskilde er tidsstempler (`phaseStartTime`, `workoutStartTime` i `stateRef`), ikke akkumulerte ticks. `phaseRemaining` avledes hver tick som `duration − (now − phaseStartTime)/1000`, og `resumeWorkout` rekonstruerer `phaseStartTime` baklengs slik at gjenværende tid bevares eksakt (`useIntervalTimer.ts:464`). `stateRef`-speilet eliminerer stale closures i loopen. Faseregnskapet kjører nå på `performance.now()` (levert i 5ae3a11), og en `visibilitychange`-lytter re-ticker umiddelbart når skjermen vekkes. Dette er riktig fundament — mange kommersielle timerapper gjør dette dårligere.

**Sårbarhet 1: Throttling og dvale — 🔶 løst på q1-grenen, med felttest som gjenstående bevis.** På `main` kjører loopen fortsatt via `window.setInterval(tick, 100)` på hovedtråden (`useIntervalTimer.ts:391`), med kjent nettleseratferd:

| Tilstand | Faktisk tick-frekvens |
|:--|:--|
| Synlig fane | ~100 ms |
| Skjult fane (Chrome/Firefox) | ≥ 1 000 ms; Chrome «intensive throttling» etter 5 min: **1 tick/minutt** |
| iOS Safari, skjerm av eller app i bakgrunn | **0 — hele JS-konteksten suspenderes** |

Q1-grenens `tickerService` flytter tick-kilden til en Web Worker (mildere throttlet i skjulte faner, ikke i det hele tatt i desktop-Chrome/Firefox) med automatisk fallback til `setInterval` når Worker-konstruksjon feiler — riktig løsning, riktig utført, med tester. **Merk grensen:** en Worker hjelper ikke når iOS suspenderer hele JS-konteksten ved skjerm av. Der er strategien MediaSession + aktiv lydkontekst (appen som «spiller» holder konteksten i live) — nøyaktig samspillet Blindmodus (§ 8.2) trenger, og nøyaktig det bare en felttest på fysisk iPhone kan bevise. Den felttesten er nå den billigste forsikringen i hele porteføljen.

**Sårbarhet 2: Catch-up-kaskaden — 🔶 løst på q1-grenen.** I v1.0 avanserte motoren én fase per tick etter oppvåkning og avfyrte hver fases lyd, tale og vibrasjon usilent — tre arbeidsstarter og tre pausestarter på ~600 ms etter 90 sekunder i lommen. Q1-grenen leverer stille fast-forward med ett oppsummerende signal (b6fcea1), og en oppfølgingsfix vokter persona-321-cuen mot å fyre under catch-up (a1dc749). Gjenstår: samme felttest som over.

**Sårbarhet 3: Klokkevalgets nye nyanse.** Byttet til `performance.now()` fjernet NTP-hopp og brukerjustering fra faseregnskapet — riktig for *varighet*. Men vær klar over den symmetriske svakheten: `performance.now()` er monotonisk, men **plattformene er ikke enige om hvorvidt den tikker under dyp dvale** (Chromium har historisk ekskludert suspensjonstid). Konsekvensen er motsatt av v1.0-scenariet: der veggklokken hoppet *fremover*, kan monoklokken nå stå *stille* gjennom en dvaleperiode, slik at en økt «fryses» i stedet for å ta igjen tapt tid. Anbefaling: ved `visibilitychange` → synlig, sammenlign `Date.now()`-delta mot `performance.now()`-delta siden forrige tick; avviker de mer enn ~2 s, re-anker `phaseStartTime` mot veggklokke-deltaet før catch-up-politikken kjører. Én funksjon, og begge klokkefeilklassene er dekket.

**Sårbarhet 4: Dobbel sannhet — ⬜ åpen, og nå hovedsaken.** Hver tilstandsvariabel finnes to steder: React-state (for render) og `stateRef` (for loopen), synkronisert med manuelle tildelinger per render pluss eksplisitte speilinger inne i `setupPhase`. Det fungerer i dag, men hver ny tilstandsbit er en ny mulighet for divergens — og med worker-tick, catch-up-politikk og fokusmodus på vei inn øker trykket på nøyaktig dette punktet. Anbefalingen står: trekk fasemaskinen (`setupPhase`/`advanceToNextPhase` + `stateRef`) ut av hooken til en ren, rammeverksfri `TimerEngine`-klasse med `subscribe(listener)`; React-hooken blir et tynt `useSyncExternalStore`-bind. Da forsvinner dobbeltsannheten, motoren blir testbar uten `renderHook` (dagens `useIntervalTimer.test.ts` må gå gjennom hele React-livssyklusen for å teste ren faselogikk), og render-frekvensen kan styres uavhengig av tick-frekvensen (§ 4.2).

**Fortsatt ikke nødvendig:** `SharedArrayBuffer`/`Atomics` — krever cross-origin isolation (COOP/COEP-headere som brekker tredjeparts-innhold) og løser et kontensjonsproblem appen ikke har. Én skrivende worker + meldingspassering er tilstrekkelig og uendelig mye enklere å feilsøke. **Riktig arkitektur er den enkleste som overlever throttling — ikke den mest imponerende.** Q1-grenens fallback-design (Worker → `setInterval`) er et eksempel på nøyaktig denne dyden.

### 2.2 Arkitektonisk modulering: lydkoblingene — ⬜ åpen

`setupPhase` orkestrerer fortsatt **fire lydtjenester direkte**: `audioService` (pip), `speechService` (TTS), `audioClipService` (studioklipp) og `coachPersonaService` (persona-stemmer) — med `if (persona !== 'standard')`-forgreninger flettet inn i selve fasemaskinen (verifisert: `useIntervalTimer.ts:138–215`). Konsekvenser:

- **Prioriteringslogikken er implisitt.** Hva skjer når et persona-klipp fortsatt spiller idet 3-2-1-pipene skal starte? Svaret er spredt over fire filer og ett `setTimeout(2300)` (§ 4.1).
- **Fasemaskinen kan ikke testes uten å mocke fire tjenester.**
- **Hver ny lydkilde øker forgreningene multiplikativt** — og `audioDuckingService` er allerede i tjenestekatalogen.

**Anbefaling: hendelsesbuss med én lyd-dirigent.** Fasemaskinen publiserer domenehendelser — `phase:start {phase, exercise, round}`, `countdown {n}`, `workout:complete` — på en enkel typed EventTarget. Én ny modul, `AudioDirector`, er *eneste* abonnent med lydansvar: den eier prioriteringsreglene (persona-klipp > studioklipp > TTS > pip), kansellering og ducking. Vibrasjon og MediaSession blir egne abonnenter. Dette er ikke arkitektur for arkitekturens skyld: det er den eneste strukturen der spørsmålet «hvorfor stotrer lyden ved faseovergang» har ett svar på ett sted. Naturlig rekkefølge: gjør dette *sammen med* `TimerEngine`-uttrekket (§ 2.1) og AudioBuffer-migreringen (§ 4.1) — de tre er samme refaktorering sett fra hver sin kant.

### 2.3 Data- og synkroniseringsarkitektur

**Offline-first: bedre enn fryktet, verre enn nødvendig.** `firebase.ts` bruker `initializeFirestore` med `persistentLocalCache` — skriv i offline køes og synkes automatisk. Det er riktig. Men appen har i praksis **to sannhetskilder**: Firestore *og* en flora av `mintrener_`-prefiksede `localStorage`-nøkler spredt over **21 tjenestefiler** (historikk, egne maler, styrkelogger, avbrutt økt, favoritter, utfordringer, samtykker, fødselsår m.fl.). Flettingen mellom dem er ad hoc per tjeneste, og konfliktstrategien er gjennomgående «siste skriving vinner» uten felt-tidsstempler.

**Trenger dere CRDT? Nesten ikke — og det er godt nytt.** Datamodellen er heldig: en fullført økt er **append-only** og immutable. To enheter som logger hver sin økt konflikterer aldri — de skal begge bevares. CRDT-formelt er dette en **G-Set (grow-only set)**, den enkleste CRDT som finnes, og den krever bare klientgenererte kollisjonsfrie id-er pluss union ved fletting i stedet for overskriving. *Faktarettelse fra v1.0:* id-ene er ikke rene `Date.now()`-frø — de har allerede et tilfeldig suffiks (`log-${Date.now()}-${rand4}`, `firestoreService.ts:63`), så kollisjonsrisikoen på tvers av enheter er liten, ikke null. `crypto.randomUUID()` er likevel en énlinjes oppgradering som gjør spørsmålet matematisk uinteressant. De eneste ekte konfliktkandidatene er *muterbare* objekter: egendefinerte maler og profilinnstillinger. Der holder «last-write-wins med felt-tidsstempel» — full CRDT-maskineri (Yjs/Automerge) er uberettiget kompleksitet for denne datamengden.

**Gruppetimerens klokkeproblem — 🔶 løst på q1-grenen.** V1.0-funnet (vertens `Date.now()` som eneste sannhet, deltakerskjevhet lik klokkedifferansen, rutinemessig 0,5–2 s på mobil) er adressert nøyaktig som anbefalt: `clockSyncService` estimerer offset mot Firestore-serverklokken (median av flere målinger, feilgrense ± halv RTT — utledningen står i § 7.2), verten skriver `startAtServerMs = serverNå + ledetid`, og `startTimestamp` beholdes for bakoverkompatibilitet (`groupRoomService.ts:144–145` på q1). Review-syklusen (cb6381d) fanget kant-tilfellene. Dette er forskjellen på «synkronisert» som markedsføringsord og som sannhet — gjenstår kun å måle faktisk skjevhet i felt (§ 9.4).

### 2.4 Feilhåndtering og robusthet

- `ErrorBoundary` finnes (bra), men fanger kun render-feil. Async-feil i tjenestene logges med `console.warn` og svelges — brukeren får aldri vite at økten *ikke* ble lagret. Det finnes fortsatt ingen toast-/varslingsmekanisme i komponentkatalogen. Minimum: en global feil-toast koblet til de tre kritiske skriveoperasjonene (øktlagring, mal-lagring, konto-sletting). ⬜ Åpen.
- BLE-frakobling: **🔶 løst på q1-grenen** — auto-reconnect med eksponentiell backoff er levert og deretter herdet gjennom to review-fikser (duplikate disconnect-events, zombie-reconnect-race, backoff-rewind). At raceene ble funnet og lukket i review er et kvalitetstegn, ikke et ankepunkt. RR-intervaller bevares nå også fra 0x2A37-pakken — se § 5.2 for personvernkonsekvensen.
- `startWorkout` aksepterer `unknown` og runtime-sjekker formen manuelt (`useIntervalTimer.ts:409–415`) — et symptom på at Zod-skjemaene i `src/schemas/` (seks skjemafiler, brukt i ti tjenester) ikke håndheves konsekvent ved systemgrensene. URL-import av delte økter og `localStorage`-lasting er grensene som teller: valider der, stol på typene innenfor. ⬜ Åpen.

### 2.5 Arkitektens vurdering

Terningkast **4 pluss** — opp fra 4. Fundamentet (tidsstempler, offline-cache, tjenesteinndeling) var riktig tenkt, og de to farligste produksjonsfeilene (bakgrunnskaskade, gruppeskjevhet) er nå implementert bort på q1-grenen med tester og review-spor. Det som hindrer 5 er at leveransene står på en umerget gren uten felttest, og at motoren fortsatt bor i React med dobbel sannhet — den siste avgrensede refaktoreringen som skiller «fungerer i lomma» fra «kan videreutvikles trygt i årevis».

---

## 3. Faganalyse: UI/UX & Produktdesigneren

*Denne analysen bygger på og henviser til UI-revisjonen av 27.08 (`docs/ui-revisjon-2026-08-27.md`), som dokumenterer 14 WCAG-avvik, ikonrevisjonen og topplinje-saneringen i detalj. Sprint 1 derfra er levert på `fix/a11y-etterslep` (ikon-semantikk, switch-roller, label-assosiasjoner). Her behandles det UI-revisjonen ikke dekket: ergonomi under fysiologisk stress.*

### 3.1 Kognitiv belastning i sone 4/5

Ved 85–95 % av makspuls endres persepsjonen målbart: pupillene fokuserer dårligere, svette bryter lysbrytningen, oppmerksomhetsfeltet smalner («tunnelsyn»), og arbeidsminnet faller mot én enhet. Grensesnittet må derfor vurderes mot et hardere krav enn WCAG: **avlesbart på 1,5 meter, i bevegelse, på under 300 ms.**

**Det som består testen:** Selve nedtellingstallet (~76 px), den fargede fasebakgrunnen som flommer hele skjermen (grønn/rav/blå per fase — avkodbar i perifert syn uten fiksering), og den store START/PAUSE-knappen.

**Det som stryker:**

| Element | Problem i sone 4/5 |
|:--|:--|
| «RUNDE 2 AV 8 • ØVELSE 3 AV 8» | 10 px versaltekst — matematisk uleselig på 1,5 m (§ 7.4: krever ~22 px som gulv, ~40 px under stress; dette har ~10) |
| «Neste: Utfall»-pillen | 11 px — informasjonen brukeren trenger *mest* i siste 5 sekunder av en pause er den minste teksten på skjermen |
| Fase-badgen «JOBB»/«PAUSE» | 10–12 px, redundant med bakgrunnsfargen den flyter på |
| Topplinjens brytere | Irrelevante under økt, men konkurrerer om perifer oppmerksomhet |

**Anbefaling — «Fokusmodus» som egen renderingsgren: 🔶 påbegynt.** Utkastet ligger på `feat/fokusmodus` (cba96c4, +125 linjer i `TimerDisplay.tsx`): når `status === 'running'`, en visning med maksimalt fire elementer — nedtellingstall (fyll 40 % av høyden), øvelsesnavn (≥ 28 px), «neste»-linje (≥ 20 px), fasefarge. Alt annet — toppbar, favoritter, ukesmål — hører hjemme i `idle`. To råd til ferdigstillingen: (1) mål utkastet mot § 7.4-tallene før merge, ikke etter; (2) vurder om fokusmodus bør være *standard* under økt med opt-out, ikke omvendt — brukeren i sone 4 kommer ikke til å finne en toggle. TV-modusen (`TvBigScreenDisplay`) beviser allerede at destillert visning er innenfor rekkevidde.

### 3.2 Spatial ergonomi og haptikk

**Tommelsonene er riktig disponert** i bunnen (Forrige / START / Neste i naturlig bue). To funn, hvorav ett nå er levert:

1. **Semantisk haptikk — 🔶 levert på q1-grenen** (f5c37c8). Mønstertabellen skiller nå hendelsesklassene (arbeid-start, pause-start, nedtelling, fullført) — kritisk for lyd-av-trening i kontorprofilen, der vibrasjon er eneste kanal. Vibration API-et mangler amplitudestyring, så semantikken må bæres av rytme og varighet alene; verifiser mønstrene på fysisk enhet (emulatorer spiller dem ikke).
2. **Ingen gestflate under økt — ⬜ åpen.** Skipp/forrige krever presisjonstreff på små soner i bevegelse. Hele hovedflaten (sirkelen) er passiv — den burde ta dobbelttrykk = pause, sveip venstre/høyre = neste/forrige, med haptisk kvittering. (Enkelttrykk må forbli inert av hensyn til feiltrykksfilosofien som låsefunksjonen allerede etablerer.) Naturlig å bygge inn i Fokusmodus-grenen mens den er åpen.

### 3.3 Audiovisuell synestesi og dynamisk theming — ⬜ åpen

I dag er koblingen mellom trenerpersona og visuell identitet **null**: Axel Metalcore og Astrid Rolig leverer diametralt ulike auditive kontrakter i nøyaktig samme emerald-på-zinc-flate. Det er en forspilt mulighet, fordi personavalget er appens mest særegne funksjon — og den er usynlig.

- **Nivå 1 (dager):** Per-persona aksentfarge og fasepalett via CSS-variabler (`--phase-work`, `--accent`), definert i `coachPersonaService` sammen med lydmanifestet. Metalcore får dypere rød-oransje arbeidsfase og hardere kontraster; Kveldsro får dempet teal og lengre fargetransisjoner. Persona blir synlig i samme sekund den er hørbar.
- **Nivå 2 (uker):** Pulssone-drevet ambiens når BLE er tilkoblet: bakgrunnens metning følger sonen (sone 5 = mettet, pulserende kant), slik at `heartRateZoneService`-dataene som allerede beregnes får en perifert avlesbar kanal. NB: pulsering må respektere `prefers-reduced-motion` (jf. UI-revisjonen § 3.7).

### 3.4 Treningspsykologien

Vurderingsknappene (For lett / Passe / For tungt), adaptiv progresjon med begrunnelse («fordi du fullførte 3 økter på rad») og «Fortsett der du slapp»-banneret er **genuint godt designet** — de lukker feedbacksløyfen datadrevet uten å moralisere. Svakheten består (verifisert): all denne intelligensen munner ut i samme generiske avslutningsskjerm — Astrid sier én av to hardkodede setninger (`WorkoutSummary.tsx:178–181`), valgt utelukkende på om økten varte over ti minutter, uavhengig av puls, PR, streak og vurdering. Øyeblikket med høyest emosjonell mottakelighet i hele appen får det dummeste innholdet. `localAiCoachService` finnes allerede — koble den hit først. ⬜ Åpen, og fortsatt panelets billigste enkeltforbedring målt i opplevd kvalitet per time.

### 3.5 UI-ekspertens vurdering

Terningkast **3 pluss** — opp et hakk fra 3. Grunnmuren og psykologien er over snittet, Sprint 1 av UU-avvikene er lukket, haptikken er levert og Fokusmodus er påbegynt. Resten av regnestykket står: ferdigstilt Fokusmodus + persona-theming nivå 1 flytter denne til 5, fordi differensieringen allerede ligger ferdig i lydlaget og bare mangler visuell manifestasjon.

---

## 4. Faganalyse: Systemutvikleren (Lyd & Low-Level)

### 4.1 Lydpipelinen: to verdener, én naiv bro — ⬜ hovedfunnet som gjenstår

Pipelinen består av to fundamentalt ulike motorer:

**Verden A — Web Audio-syntesen (`audioService.ts`): korrekt og elegant.** Oscillator-pipene bygges med `exponentialRampToValueAtTime`-envelopes (eliminerer klikk), planlegges med `ctx.currentTime + offset` (sample-nøyaktig), og iOS-opplåsingen med uhørbar tone er etter læreboken. Fanfaren, boksebjella, fløyta og syngeskålen er veldesignede additive synteser. **Ingen funn.**

**Verden B — stemmeklippene (`audioClipService`, `coachPersonaService`): HTML5 Audio uten tidsgaranti.** Her ligger stotringen brukerne hører, og her er ingenting endret siden v1.0 (verifisert: `audioCache = Map<string, HTMLAudioElement>`, avspilling via `audio.play()`, forrige klipp kuttes med `pause()`):

1. **`HTMLAudioElement.play()` har udeterministisk startlatens.** Elementet dekoder ved behov, allokerer en mediepipeline per kall og starter «så snart som mulig» — i praksis 20–200 ms avhengig av enhet, cache-tilstand og GC-trykk. Det finnes **ingen API-flate for å si «start nøyaktig ved t»**. Sample-nøyaktig skjøting av `intro` → øvelsesnavn → `start_321` er *prinsipielt umulig* i denne arkitekturen — mikropausene er ikke en bug i koden, de er en egenskap ved API-valget. (Formelt argument i § 7.1.)
2. **`setTimeout(2300)`-broen** (`useIntervalTimer.ts:153` på q1) er beviset: intro-klippets faktiske varighet er ukjent for koden, så sekvensen gjetter. Er intro 2,6 s, klippes den; er den 1,9 s, oppstår 400 ms død luft. Begge deler høres som stotring. (Broen er nå i det minste voktet av fase-/statussjekk, så den ikke fyrer etter skipp — men gjetningen består.)
3. **Konkurrerende avspilling løses med brutal `pause()`** av forrige klipp — hørbart som kutt midt i ord når overganger kommer tett (skipp-knappen!).
4. ~~Cache-strategien preloader ikke ved miss~~ — **✅ lukket:** `startWorkout` preloader nå øktens faktiske øvelsesannonseringer (`useIntervalTimer.ts:421–424`), så punktet er redusert fra «dekodekostnad midt i faseovergangen» til «nettverkskostnad ved øktstart». Riktig sted.

**Anbefalt målarkitektur — én AudioContext-graf for alt (uendret, nå øverst i køen):**

```
fetch(url) → ctx.decodeAudioData → AudioBuffer-cache (Map<key, AudioBuffer>)
     ved øktstart: dekod ALLE klipp øktens manifest trenger
     ved avspilling: new AudioBufferSourceNode → gain → destination
                     source.start(ctx.currentTime + δ)      // sample-nøyaktig
     sekvens: neste.start(forrige.startTime + forrige.buffer.duration − ε_crossfade)
```

`AudioBuffer.duration` gjør `setTimeout(2300)` overflødig: skjøtepunktet *beregnes* i stedet for å gjettes, og en 10 ms equal-power crossfade i gain-nodene fjerner skjøtelyden helt. Ducking flyttes fra imperativ volumfikling til en `GainNode` musikk-bussen allerede går gjennom. Dette er 2–3 dagers arbeid og eliminerer hele feilklassen — **Wasm og Worklets er ikke nødvendig for dette trinnet** (§ 8.3 for når de blir det). Q1-loggen viser at «audio-batch» allerede er notert som neste oppgavebolk; dette dokumentet bekrefter prioriteringen.

### 4.2 Event loop, GC og hot-loopens minneprofil

**Hovedfunnet fra v1.0 er lukket:** `saveInterruptedSession` gates nå på `lastSessionSaveSecond` (`useIntervalTimer.ts:375–381`) — maks én synkron `localStorage`-skriving per partallssekund i stedet for ti per sekund. Jankbudsjettet i § 7.3 er oppdatert tilsvarende: den deterministiske, periodiske jankkilden er borte, og påstanden bør nå *bekreftes* med `PerformanceObserver`-måling (§ 9.4) i stedet for antas.

**Det som gjenstår er re-render-profilen.** Tick-funksjonen kaller fortsatt `setPhaseRemaining(remaining)` med rå flyttall 10 ganger/sekund — verdien er alltid ny, så React bailer aldri, og hele komponenttreet under `TimerDisplay` re-rendres 10 Hz gjennom hele økten. Det er ikke lenger *jank* (ingen synkron I/O i stien), men det er unødvendig arbeid i nøyaktig den tilstanden der batteriet betyr mest, og det setter et tak på hvor billig Fokusmodus kan bli. Retting i to trinn: (1) render nedtellingstallet fra `Math.ceil`-verdi slik at `setState` bailer 9 av 10 ticks; (2) la sirkelens jevne bevegelse drives av CSS-transition eller `requestAnimationFrame` på et ikke-React-element. Trinn 2 faller naturlig ut av `TimerEngine`-uttrekket (§ 2.1), der UI-abonnenten selv velger oppdateringsfrekvens.

Objektallokering for øvrig er akseptabel — `firedCues`-settet reallokeres per fase (fint), og det finnes ingen per-tick array-allokeringer av betydning. Object pooling og typed arrays er **ikke** berettiget her; flaskehalsen var I/O og er nå re-render, ikke allokatoren. Motion-sporingen (`devicemotion` ved ~60 Hz) bør fortsatt verifiseres for per-event objektbygging når rep-telling er aktiv.

### 4.3 Web Bluetooth: parsing ok, livssyklus tettet på gren

Tilkoblingssekvensen (`requestDevice` med `heart_rate`-filter → GATT → `startNotifications` på 0x2A37) er korrekt, og notifikasjonsmodellen betyr at BLE-trafikken *ikke* poller — hovedtråden får kun et lite event per hjerteslag-pakke (~1 Hz). Riktig og billig. Statusen på v1.0-hullene:

1. **Auto-reconnect — 🔶 levert på q1-grenen** (4cf2aa6), deretter herdet mot duplikate disconnect-events (bd45491) og zombie-reconnect/backoff-rewind (1d6fc45). Eksponentiell backoff mot samme `device`-objekt, gi-opp-grense, UI-varsel. Slik det skal gjøres.
2. **RR-intervaller — 🔶 bevares nå** (samme leveranse). Grunnlaget for HRV-beregning er dermed sikret for fremtiden (`fatigueDeloadService` er den naturlige konsumenten) — men merk at RR-serier er *mer* sensitive enn puls alene; § 5.2 setter rammen som må på plass før de forlater enheten.
3. **Makspuls — ✅ lukket:** Tanaka-formelen (`208 − 0,7·alder`) fra fødselsår i profilen, med 190 som fallback kun når fødselsår mangler (`heartRateZoneService.ts:12–17`). Sonegrensene stemmer nå for 60-åringen appen nettopp har bygget Senior-programmer for.

### 4.4 Batteri og Wake Lock — ⬜ åpen

Wake Lock håndteres riktig (request ved start, release ved pause/komplett). Men strategien er binær: skjermen står på full styrke gjennom hele økten. Skjermen er den dominerende forbrukeren (§ 7.3); en 40-minutters økt koster typisk 8–12 % batteri, hvorav ~70 % er panel. Lavthengende frukt: dimme-modus etter 10 s uten interaksjon under `running` (CSS `filter: brightness(0.6)` på rot-elementet — OLED-panelets forbruk skalerer nær lineært med luminans), full lysstyrke ved fasebytte og siste 5 sekunder. Estimert 20–30 % lengre øktkapasitet uten funksjonstap. Hører naturlig hjemme i Fokusmodus-leveransen.

### 4.5 Utviklerens vurdering

Terningkast **4** — opp fra 4 minus. Web Audio-syntesen og BLE-arbeidet (inkludert review-syklusen som fanget raceene) viser reell plattformforståelse, og hot-loopens I/O-problem er ryddet. Trekket som hindrer 5 er utelukkende Verden B: HTML5 Audio-broen er fortsatt appens mest hørbare svakhet, og den står i veien for både Blindmodus og beat-matching. Én fokusert uke fjerner den.

---

## 5. Faganalyse: Sikkerhet, personvern & kvalitetssikring

*Nytt kapittel i v2.0. Førsteutgaven vurderte aldri `firestore.rules`, trusselmodellen eller testporteføljen — et hull i revisjonen selv, all den tid appen håndterer pulsdata og har verdensleselige samlinger.*

### 5.1 Firestore-regler: to reelle hull

Reglene har riktig grunnstruktur — brukerdata er eier-låst (`isOwner` på `users/{userId}` med underkolleksjoner), øvelsesbiblioteket er lese-kun, og q1-grenen la korrekt til en egen match for `clock_sync/{clientId}`. Men to funn:

1. **[KRITISK] `global_stats`: `allow write: if true`.** Hvem som helst — uten autentisering — kan overskrive, nullstille eller forfalske hele den aggregerte statistikken, og bruke ubegrensede skriv som kostnadsvektor mot Firestore-fakturaen. At dataene er «anonyme» gjør dem ikke uviktige: de er tenkt som sosialt bevis («2 341 økter fullført denne uken») og blir verdiløse i det øyeblikk de kan være diktet. Retting, minst inngripende først: (a) valider at oppdateringen kun bruker `increment()` på kjente felt med rimelige verdier (rules kan uttrykke dette via `diff()`), eller (b) flytt aggregeringen til en Cloud Function og sett `allow write: if false`. Alternativ (a) er en kvelds arbeid og krever ingen backend.
2. **[ALVORLIG] `rooms`: `allow read: if true` + uautentisert mutasjon.** Romkoder er 6 tegn fra et 32-tegns alfabet (~10⁹ kombinasjoner, `Math.random`-generert) — god nok nøkkelplass for en timer, men lesetilgangen er global og `participantCount`-oppdateringen krever ikke engang innlogging (auth-kravet gjelder bare verts-grenen av `allow update`). I dag er skadepotensialet trolling (manipulert deltakertall, avlesing av vertsnavn). **I Puls-sverm-scenarioet (§ 8.1) blir samme samling transportkanal for sonedata — helseopplysninger.** Da er «alle med koden kan lese» ikke lenger akseptabelt: deltakerlisten må autentiseres (anonym Firebase-auth holder), `participantCount`-diffen må kreve auth + inkrement-på-én, og romdokumenter må få TTL/opprydding. Lukk dette *før* biometrien kobles på, ikke etter.

I tillegg, lav alvorlighet: `Math.random()` for romkoder er akseptabelt (kodene er ikke sikkerhetsbærende i dag), men bytt til `crypto.getRandomValues` samtidig med rooms-herdingen — gratis, og fjerner diskusjonen.

### 5.2 Personvern: appen er på vei inn i artikkel 9-territorium

Grunnholdningen er sterkere enn i de fleste soloprosjekter: local-first som prinsipp, Firestore i EU-region, en reell databehandleroversikt (`docs/databehandlere.md`, à jour per 27.08) og eksport/sletting på plass. Tre punkter krever skjerping:

1. **Puls og RR-intervaller er helseopplysninger (GDPR art. 9), ikke alminnelige personopplysninger.** I dag lever pulsen i UI-et og soneberegningen; fra q1-grenen bevares også RR-serier — råmaterialet for HRV, som kan indikere stress, restitusjon og i ytterste konsekvens patologi. I det øyeblikk puls/RR *lagres per bruker i skyen* eller *strømmes til et grupperom*, kreves eksplisitt samtykke for helsedata (art. 9 nr. 2 a), egen omtale i personvernerklæringen, og — for Puls-svermen — en DPIA (art. 35: systematisk overvåking av særlige kategorier). Anbefaling: gjør DPIA-en til en formell forutsetning i § 8.1, og hold RR-data på enheten til den er gjort.
2. **Telemetri-samtykket er opt-out** (`getTelemetryConsent` returnerer `true` når nøkkelen mangler). For aggregert, anonym statistikk er dette forsvarlig under berettiget interesse *hvis* aggregeringen faktisk er anonym — men da må den også være manipulasjonssikker (§ 5.1-funn 1: i dag kan hvem som helst skrive hva som helst dit, hvilket undergraver «anonymt og aggregert»-argumentet). Rydd begge samtidig, og dokumentér vurderingen i databehandlere-dokumentet.
3. **Fødselsår** lagres lokalt for Tanaka-formelen — uproblematisk i seg selv, men det er nok et felt i `localStorage`-floraen (§ 2.3) som følger med hvis synkronisering til sky utvides. Hold profilfelter i den eier-låste `users/`-strukturen når de først skal ut av enheten.

### 5.3 Teststrategi: god bunn, skjev dekning

Testporteføljen er reell, ikke pynt: **32 testfiler** (31 tjenester + `useIntervalTimer`-hooken) under Vitest, kjørt i CI på push/PR mot `main`, og q1-arbeidet drives synlig test-først (tickerService-fallbacken har egne tester; review-fiksene kom med regresjonstester). Det er langt over snittet for soloprosjekter. Dekningen er likevel skjev på tre målbare måter:

| Hull | Konsekvens | Billigste tetting |
|:--|:--|:--|
| **Ingen rules-tester** | § 5.1-hullene hadde vært fanget av første negative test | `@firebase/rules-unit-testing` mot emulator: ~10 tester (kan uinnlogget skrive global_stats? lese andres historikk? mutere rom?) |
| **Ingen komponent-/interaksjonstester** | 46 komponenter, 11 584 linjer — 0 tester; Fokusmodus-grenen endrer nettopp denne flaten | Testing Library på de tre kritiske flatene: TimerDisplay-statusgrener, gjenopprettingsbanner, gruppero­m-flyt |
| **Ingen ende-til-ende-røyk** | «Start økt → fullfør → se historikk» kan knekke uten at noen test rødmer | Én Playwright-flyt mot Firebase-emulator i CI |

Ambisjonen er ikke full pyramide — det er tre målrettede skjold rundt de flatene som beviselig endres oftest. Timermotor-testenes avhengighet av `renderHook` løses av `TimerEngine`-uttrekket (§ 2.1), som gjør faselogikken testbar som ren klasse.

### 5.4 Sikkerhetsrevisorens vurdering

Terningkast **3**. Grunninstinktene (local-first, EU-region, eier-låste brukerdata, databehandleroversikt, test-først-kultur) er riktige og uvanlig modne for prosjekttypen. Karakteren holdes nede av to konkrete rules-hull som er timer å tette, og av at helsedata-kategorien ennå ikke er erkjent i dokumentasjonen — begge deler må være lukket før Puls-svermen, og begge deler er innen rekkevidde i inneværende uke. Med det gjort er dette en 5: personvern som konkurransefortrinn er en troverdig posisjon for nøyaktig denne appens målgrupper (§ 6.1 punkt 3).

---

## 6. Faganalyse: Forretningsutvikleren

### 6.1 Verdiforslag og markedsposisjonering

**Konkurransekartet er brutalt, men det finnes en åpen flanke.** Strava eier utholdenhets-sosialitet, Nike Training Club eier gratis produksjonskvalitet, Apple Fitness+ eier økosystem-integrasjon. Ingen av dem kan eller vil konkurrere på:

1. **Språklig og kulturell intimitet.** En trenerstemme på haugesundsk eller romsdalsk er ikke en «feature» — det er en relasjon. Globale aktører lokaliserer til bokmål i beste fall; de vil aldri produsere dialekter, kor-profiler eller «Metalcore-Axel». Dette er strukturelt uangripelig fordi markedet er for lite for dem og identiteten for spesifikk.
2. **Kontekst i stedet for kropp.** Konkurrentene segmenterer på treningsmål (styrke/kondis/vekt). Min Trener segmenterer på *livssituasjon*: kontoret, barna, koret, idrettslaget, senioren. «Nakke- og skulderredning» klokken 11 på et møterom er en økt Nike ikke har et konsept for.
3. **Skånsomhet som førsteklasses verdi.** Smerte-/skadefilter, deload-logikk og senior-programmer posisjonerer mot det voksende segmentet som *ikke* identifiserer seg med beast-mode-estetikken — og som har høyest betalingsvilje for trygghet. Kombinert med § 5s local-first-holdning kan «appen som ikke selger kroppen din» gjøres til eksplisitt merkevareløfte.

**Men:** et unfair advantage som ikke kommuniseres, finnes ikke. I dag møter en ny bruker en generisk mørk timer-app; dialektstemmene er gjemt bak innstillinger. Posisjoneringen må fram i onboardingen: *første* spørsmål bør være «Hvem skal trene deg?» med lydprøver — ikke et kontekstvalg i tekst.

### 6.2 Atferdsøkonomi og gamification-kalibrering

Vurdert mot etablert atferdsøkonomi (tapsaversjon ~2:1, variable belønningsskjemaer, endowed progress):

| Mekanikk | Status | Kalibreringsvurdering |
|:--|:--|:--|
| Streak (dager på rad) | ✅ Finnes | **Underutnyttet tapsaversjon:** streaken vises i historikk-fanen — tapet er usynlig i beslutningsøyeblikket. Den må stå på førstesiden med eksplisitt innramming («🔥 12 dager — ryker i kveld»). Og: uten «streak freeze» (én gratis hviledag per uke) konverterer første sykedag lojale brukere til churnede — Duolingos viktigste enkeltlærdom. |
| 28/30-dagers utfordringer | ✅ Solid | Riktig lengde, dagskort på førstesiden er bra. Mangler *midtveis-milepæl* (dag 14-badge) — dropout topper statistisk i uke 2, nøyaktig der programmet i dag er stillest. |
| Skill Trees | ✅ Finnes | God struktur, men frikoblet fra øktflyten — mestring må *annonseres av treneren* («det der kvalifiserte til neste nivå i knebøy-stigen») for å kobles til dopaminøyeblikket. |
| Variable belønninger | ❌ Mangler | Alle belønninger er deterministiske. Ett uforutsigbart element — sjeldne «gull-økter», tilfeldig ros-klipp fra personaen — er den billigste retensjonsmekanikken som finnes. |
| Ukesmål | ✅ Godt plassert | Endowed progress utnyttes ikke: «0 av 3» er demotiverende innramming; oppvarmings-mikroøkter kunne telle 0,5 slik at uken aldri starter på null. |

**Uke 2-diagnosen:** Kombinasjonen «streak uten forsikring» + «stille midtfase i utfordringene» + «ingen variable belønninger» predikerer nøyaktig drop-off i uke 2. Alle tre er innholds-/logikkjusteringer, ikke nybygg.

### 6.3 Monetiseringsmodell

I dag: null inntekt, null betalingsinfrastruktur. Anbefalt hybridmodell i prioritert rekkefølge:

**Trinn 1 — «Stemmebutikken» (B2C, lavest friksjon).** Kjernen er gratis for alltid (timer, bibliotek, historikk — nødvendig for viralitet i et lite marked). Betalt lag: trenerpersonligheter. 1–2 stemmer gratis, resten à 49–79 kr engangskjøp eller alt-inkludert-abonnement 39 kr/mnd. Dette monetiserer nøyaktig det differensierende aktivumet, har marginalkostnad nær null per ny bruker, og prisankeret (en kaffe for en treningskompis på din dialekt, for alltid) er emosjonelt gunstig. Suno/Chatterbox-pipelinen som allerede er bygget *er* produksjonslinjen.

**Trinn 2 — B2B bedriftshelse (høyest ARPU, kortest vei i Norge).** Kontor-profilen + mikroøkter + TV-modus + gruppestatistikk er *allerede* et HMS-produkt. Norske bedrifter har budsjett og rapporteringsplikt for forebyggende arbeid; en lisens på 49–99 kr/ansatt/år med anonymisert aktivitetsrapport til HR er en enkel innkjøpsbeslutning. Én pilotbedrift på 50 ansatte validerer hele sporet. TV-modusen i lunsjrommet er distribusjonskanalen: hver felleøkt er en demo for alle tilstedeværende. Merk koblingen til § 5: en HMS-kunde *vil* stille personvernspørsmålene — rules-herdingen og art. 9-beredskapen er dermed også salgsmateriell.

**Trinn 3 — Creator-markedsplass (senere; nettverkseffekt-motoren).** Åpne øktbyggeren for publisering: instruktører, fysioterapeuter og kortrenere publiserer program + eventuelt egen innspilt stemme, 70/30-deling. Dette konverterer appen fra produkt til plattform — men krever kritisk brukermasse først (§ 8.4).

**Det som IKKE bør gjøres:** annonser (ødelegger treningsflyt og skånsomhets-merkevaren), betalingsmur på historikk/eksport (straffer lojalitet og kolliderer med GDPR-godviljen appen har opparbeidet), eller freemium-kvoter på antall økter (retention før monetisering i denne fasen).

### 6.4 Viralitet og delingsmekanikk

Delingslenker for økter finnes, og attribusjonen er nå på plass: `ref=share`-parameter settes ved deling og gjenkjennes ved import (`shareWorkoutService.ts:39, 102`). **Men ingenting *leser* målingen ennå** — det finnes ingen telemetri-hendelse eller dashbord som gjør attribusjonen til et K-faktor-tall, så løkken er instrumentert uten å være observert. Neste trinn koster en time: logg `share_import`-hendelsen i den (nå herdede, § 5.1) telemetrien. Deretter den sterkeste kandidaten for K-faktor: **P2P-utfordringen** — «Inviter en venn til 28-dagers-utfordringen — se hverandres fremdrift.» Treningsforpliktelse overfor en venn er samtidig appens sterkeste retensjonsmekanisme (sosial forpliktelse slår alle badges). Modellert i § 7.5.

### 6.5 Forretningsutviklerens vurdering

Terningkast **3**. Produktet har et sjeldent ærlig differensieringsgrunnlag, gamification-byggeklossene er på plass, og attribusjonsgrunnlaget er lagt — men det finnes fortsatt ingen inntektslinje, ingen lest viral måling og ingen aktivering av det sterkeste aktivumet i onboarding. Alt dette er besluttbart og byggbart på ett kvartal; karakteren reflekterer status, ikke potensial. Potensialet er 5.

---

## 7. Matematiske & tekniske beviser

### 7.1 Lydlatens og jitter: hvorfor HTML5 Audio ikke kan repareres, bare erstattes

**Modell.** Total tid fra beslutning («spill klipp K nå») til første hørbare sample:

$$T_{total} = T_{decode} + T_{pipeline} + T_{scheduling} + \Delta t_{buffer}$$

| Ledd | HTML5 `Audio.play()` | Web Audio `AudioBufferSourceNode` |
|:--|:--|:--|
| \(T_{decode}\) | 0–150 ms (lazy, ved første avspilling; preload ved øktstart demper, fjerner ikke) | **0** (forhåndsdekodet til PCM ved øktstart) |
| \(T_{pipeline}\) | 5–50 ms (medieelement-oppsett per kall, udeterministisk) | **0** (grafen eksisterer allerede) |
| \(T_{scheduling}\) | «snarest mulig» — kvantisert av event loop; ingen API-flate for måltidspunkt | \(source.start(t)\): sample-indeksert mot audioklokken |
| \(\Delta t_{buffer}\) | ~20–90 ms utgangsbuffer, *ukjent for JS* | `ctx.baseLatency` + `outputLatency`: **kjent og kompenserbar** |

**Jitter-argumentet.** La \(\sigma\) være standardavviket i startavvik mellom to klipp som skal skjøtes. Med HTML5 Audio er startpunktet en funksjon av event-loop-tilstand og pipelinevarme; empirisk spredning på titalls millisekunder gir \(\sigma \sim 20\text{–}50\) ms — godt over psykoakustisk hørbarhetsterskel for skjøter i tale (~10–20 ms diskontinuitet oppfattes som «stotring»). Med `AudioBufferSourceNode` er startpunktet en *sampleindeks* i en klokke drevet av lydkortets DAC: neste klipp planlegges som

$$t_{n+1} = t_n + \frac{N_n}{f_s}$$

der \(N_n\) er antall samples i klipp \(n\) og \(f_s\) samplingsraten. Avviket begrenses da av klokkens oppløsning: \(\sigma \le 1/f_s = 1/48000 \approx 0{,}02\) ms — **tre størrelsesordener under hørbarhet**. Merk presiseringen: dette oppnås med vanlig Web Audio buffer-planlegging; en **AudioWorklet** er kun nødvendig når *innholdet* må genereres/manipuleres i sanntid (tidsstrekking, beat-matching — § 8.3). Å hoppe rett på Worklet/Wasm for ren klipp-skjøting ville vært overengineering.

**Korollar for `setTimeout(2300)`:** setTimeout garanterer kun *tidligste* kjøring; under last er +50–500 ms forsinkelse normalt, og i throttlet fane er minimum 1000 ms. Konstruksjonen har dermed uunngåelig jitter på hundretalls millisekunder — konsistent med observert stotring — og bortfaller i sin helhet når skjøtetidspunkt beregnes fra `AudioBuffer.duration`.

### 7.2 Klokkesynkronisering for gruppetrening — 🔶 implementert på q1-grenen

**Problem.** Verten skriver \(t_{start}^{(A)} = \text{Date.now()}_A\). Deltaker B beregner fremdrift som \(\text{Date.now()}_B - t_{start}^{(A)}\). Feilen er klokkedifferansen \(\delta_{AB} = c_A - c_B\), typisk 100 ms–2 s på mobilklokker, ubegrenset i patologiske tilfeller.

**Løsning (NTP-forenklet via Firestore) — nå i `clockSyncService`.** Hver klient estimerer sin offset mot Firestore-serverklokken: skriv et dokument med `serverTimestamp()`, mål lokal sendetid \(t_0\) og mottakstid \(t_1\) av kvitteringen med server-stempel \(T_s\), og estimer

$$\hat{\theta} = T_s - \frac{t_0 + t_1}{2}, \qquad \text{feilgrense } |\varepsilon| \le \frac{t_1 - t_0}{2} \text{ (halv RTT)}$$

Verten publiserer `startAtServerMs = now_server + 3000` (nedtelling gir slingringsmonn for propagering). Hver deltaker starter når \(\text{lokal klokke} + \hat{\theta} = startAtServerMs\). Med mobil-RTT på 60–200 ms blir garantert skjevhet \(\le\) 30–100 ms — **under persepsjonsgrensen for samtidighet i musikk/rytme (~100 ms)**, mot tidligere sekund-klasse. Implementasjonen tar median av flere målinger (reduserer utliggere), cacher offset per klient, og faller tilbake til 0 (= gammel atferd, aldri verre) ved feil. Gjenstående bevisbyrde er empirisk, ikke matematisk: mål faktisk skjevhet mellom to fysiske enheter og før tallet inn i målekortet (§ 9.4).

### 7.3 Energi- og jankbudsjett

**Energimodell.**

$$E_{\text{økt}} = \int_0^{T} \left(P_{screen}(t) + P_{CPU}(t) + P_{radio}(t)\right)\,dt$$

Typiske effektbidrag under aktiv økt (moderne OLED-mobil, størrelsesordener fra plattformlitteratur):

| Kilde | Effekt | Andel |
|:--|:--|:--|
| Skjerm, full lysstyrke, Wake Lock | ~800–1500 mW | **~65–75 %** |
| CPU: 10 Hz tick + full React-rerender av `TimerDisplay`-treet | ~100–250 mW | ~10–15 % |
| BLE-notifikasjoner (1 Hz, ingen polling) | ~5–15 mW | < 2 % |
| Lyd (forsterker + DSP) | ~30–80 mW | ~5 % |

**To konsekvenser:** (1) BLE-optimalisering er irrelevant for batteri — arkitekturvalget (notify, ikke poll) var allerede riktig. (2) Dimming er den eneste store spaken: OLED-effekt skalerer tilnærmet lineært med luminans, så `brightness(0.6)` i rolige faser gir \(\Delta E \approx 0{,}4 \cdot 0{,}7 \cdot E_{screen} \approx 20\text{–}25\,\%\) av totalen — mer enn all CPU-optimalisering til sammen. Worker-flyttingen av ticken (levert på q1) begrunnes derfor med **korrekthet under throttling** (§ 2.1), ikke batteri; batteriargumentet for den er sekundært.

**Jankbudsjett — status etter fiks.** Ved 60 FPS er rammebudsjettet 16,7 ms. V1.0-funnet — synkron `JSON.stringify` + `setItem` på 5–20 ms, 10 ganger per sekund i partallssekunder, dvs. 30–120 % av et rammebudsjett i periodiske salver — er eliminert av sekundgatingen (verifisert i kode). Den teoretiske skrivefrekvensen er redusert med faktor 20. Restjobben er å *bekrefte* med `PerformanceObserver('longtask')` at lange tasks per øktminutt faktisk er < 1 (§ 9.4), slik at fremtidige regresjoner fanges av et tall og ikke av en bruker.

### 7.4 Avlesbarhet på avstand (sone 4/5-kravet fra § 3.1)

Normalsyn oppløser detaljer ned til ~1 bueminutt; komfortabel lesing av tall under stress krever tegnhøyde ≥ 15–20 bueminutter. Ved avstand \(d = 1{,}5\) m:

$$h = d \cdot \tan(\theta) \approx 1{,}5 \cdot \tan(18') \approx 7{,}9 \text{ mm}$$

På en typisk mobil (~2,8 px/mm effektivt i CSS-piksler) er det **≥ ~22 CSS-px tegnhøyde som absolutt gulv i hvile** — og under fysiologisk stress (svette, bevegelse, tunnelsyn) bør marginen dobles til ~40 px. Konklusjon: nedtellingstallet (76 px) består; «RUNDE 2 AV 8» (10 px ≈ 3,6 mm ≈ 8 bueminutter) og «Neste:»-pillen (11 px) er matematisk uleselige på treningsavstand og må enten forstørres i Fokusmodus eller aksepteres som nærlesnings-elementer. **Bruk disse tallene som akseptkriterium for Fokusmodus-grenen før merge.**

### 7.5 Retensjon, viralitet og LTV

**Kohortmodell.** La \(r\) være måned-til-måned-retensjon og ARPU månedlig snittinntekt per aktiv bruker. Forventet levetidsverdi per akkvirert bruker:

$$LTV = ARPU \cdot \sum_{t=0}^{\infty} r^t = \frac{ARPU}{1 - r}$$

Med stemmebutikk-abonnement 39 kr/mnd, 8 % betalende og \(r = 0{,}80\): \(LTV = \frac{0{,}08 \cdot 39}{0{,}20} \approx 15{,}6\) kr per gratisbruker — tynt. Løftes \(r\) til 0,90 (streak-forsikring + P2P-utfordringer + uke-2-fiksene fra § 6.2): \(LTV \approx 31\) kr, en dobling **uten å røre pris eller konvertering**. Dette er det kvantitative argumentet for at retensjonsarbeid går foran monetiseringsarbeid.

**Viral motor.** Med invitasjonsrate \(i\) (andel brukere som sender P2P-utfordring) og aksept \(a\): \(K = i \cdot a\). Effektiv vekst uten betalt akkvisisjon krever at organisk tilsig \(n_{t+1} = n_t \cdot (r + K)\) har \(r + K > 1\). Med \(r = 0{,}90\) trengs bare \(K > 0{,}10\) — f.eks. 25 % som inviterer med 40 % aksept. For en app hvis kjerneopplevelse («tren *sammen*») naturlig involverer en annen person, er dette et realistisk mål. Attribusjonen (`ref=share`) er nå på plass; **første datapunkt koster én telemetri-hendelse** (§ 6.4).

**B2B-flanken:** Én bedriftsavtale à 50 ansatte × 79 kr/år = 3 950 kr/år tilsvarer LTV-en til ~250 organiske gratisbrukere i basisscenariet. CAC for B2B i Norge er én demo i ett lunsjrom med TV-modusen som allerede er bygget.

---

## 8. De fire Moonshot-initiativene

Hvert moonshot vurderes på konsept, gjennomførbarhet (⚡ = byggbart på dagens stack) og ROI-logikk. De er rangert etter *forhold mellom radikalitet og risiko* — et godt moonshot for et soloprosjekt er ett som gjenbruker eksisterende aktiva i en ny konfigurasjon, ikke ett som krever ny grunnforskning. Q1-leveransene har flyttet startstreken: klokkesynk og BLE-livssyklus — to av forutsetningene — er allerede på gren.

### 8.1 Arkitektens Moonshot: «Puls-svermen» — serverløs sanntidssynkronisert gruppetrening med delt biometri

**Konsept.** Dagens grupperom deler timer-tilstand. Svermen deler *fysiologi*: hver deltakers pulssone (ikke rå puls — personvern ved design: sonen er relativ til egen maks) strømmes til rommet, og alle ser gruppens «energifelt» — et levende felt av fargede prikker der instruktøren (TV-modus) umiddelbart ser hvem som ligger i sone 5 og trenger nedskalering, og hvem som har mer å gi. Kombinert med klokkesynkroniseringen (§ 7.2, levert) blir dette en treningsopplevelse ingen av gigantene tilbyr: *ekte samtidighet med ekte kroppsdata, uten dyre studio-abonnement*.

**Arkitektur.** Firestore er feil verktøy for > 1 Hz-strømmer (kostnad per skriving, ~sekundlatens). Riktig: WebRTC DataChannels i mesh for rom ≤ 8 deltakere (P2P, null serverkostnad, < 100 ms), med Firestore kun som signaleringskanal — den rollen kan dagens `groupRoomService` gjenbrukes til nesten uendret. For instruktør-scenarioet (én skjerm, mange sendere) er topologien stjerne mot TV-klienten. Edge-inferens (per-deltaker anbefaling «senk tempo») kjører lokalt på hver enhet mot egen pulskurve — ingen sentral ML-infrastruktur.

**Gjennomførbarhet:** ⚡⚡ Middels. WebRTC-signalering over Firestore er velkjent terreng; BLE-pulsen finnes (nå med reconnect); klokkesynken finnes; TV-visningen finnes. Estimat 4–6 uker. Risiko: NAT-traversering krever TURN-fallback (~gratis-tier holder for pilot).
**Harde forutsetninger (nye i v2.0):** rooms-herding + autentisert deltakerliste (§ 5.1) og DPIA for sonedeling (§ 5.2) — selv «bare soner» er avledet av helsedata, og P2P-topologien må dokumenteres som personvernfordelen den faktisk er (dataene rører aldri serveren).
**ROI:** Direkte føde til B2B-sporet (§ 6.3 trinn 2) — «se hele avdelingens energifelt i lunsjtreningen» er demoen som selger HMS-lisensen. Dette er moonshotet med kortest vei fra wow til faktura.

### 8.2 UI-ekspertens Moonshot: «Blindmodus» — økten uten skjerm

**Konsept.** Ikke AR-briller (feil kostnad/nytte for målgruppen), men det motsatte og mer radikale: **eliminér skjermen fullstendig**. En økt gjennomføres med telefonen i lomma: all tilstand formidles gjennom (a) sonisk bioguiding — kontinuerlig, subtilt lydlandskap der tonehøyde/tekstur koder fase og gjenværende tid (stigende tekstur siste 5 s — hjernen lærer koden på én økt), (b) semantisk haptikk (levert, § 3.2), (c) trenerstemmen som allerede finnes, og (d) stemmestyring som allerede finnes («pause», «neste»). Skjermen blir *valgfri* — og appen blir samtidig, som biprodukt, den mest tilgjengelige treningsappen på markedet for blinde og svaksynte: et moonshot som løser UU-topplisten (jf. UI-revisjonen) som bieffekt av et premiumkonsept.

**Hvorfor dette slår AR:** Målgruppene (kontor, senior, utendørs-GPS) trener *uten å ville se på noe*. Verdien ligger i frigjort oppmerksomhet, ikke i mer visuell informasjon. Og hele leveransekjeden finnes: lydmotor, TTS, stemmekommandoer, vibrasjon, MediaSession (låseskjermkontroll). Det som mangler er *komposisjonen*: et «Skjermfri økt»-toggle og det soniske kodespråket.

**Gjennomførbarhet:** ⚡⚡⚡ Høy — 2–3 uker på eksisterende byggeklosser. Forutsetningskjeden er kortere enn i v1.0: worker-tick og catch-up er på gren; gjenstår AudioBuffer-migreringen (§ 4.1) og **felttesten som beviser at MediaSession + aktiv lydkontekst holder pipelinen i live på iOS med skjermen av** — blindmodus er meningsløs hvis lyden dør når skjermen slukker, så den testen er første leveranse i initiativet, ikke siste.
**ROI:** Differensiering ingen konkurrent matcher, presseverdig tilgjengelighetshistorie, og direkte økt batterilevetid (§ 7.3: skjermen er ~70 % av forbruket — blindmodus er også batterimoonshotet).

### 8.3 Utviklerens Moonshot: Beat-matched trenermotor (AudioWorklet + Wasm)

**Konsept.** Sanntids lydmotor der trenerstemmen og treningsmusikken smelter sammen: musikkens tempo detekteres (eller velges), intervallene kvantiseres til taktslag (arbeidsfasen starter *på* eneren), 3-2-1-nedtellingen lander på slagene, og stemmeklippene tidsstrekkes (uten pitch-endring, via phase-vocoder i Wasm) slik at «KJØR!» treffer nøyaktig på beatet. Metalcore-Axel som teller ned *i takt med* riffet er en opplevelse som i dag ikke finnes i noen kommersiell app.

**Arkitektur.** Dette er det legitime bruksområdet for verktøyene som ville vært overkill i § 4.1: en `AudioWorkletProcessor` (kjører på sanntids-lydtråden, immun mot hovedtråds-jank og GC) huser en Wasm-modul (Rust) med time-stretch (WSOLA/phase-vocoder) og beat-grid. Hovedtråden sender kun kommandoer («klipp K på neste ener»); all DSP skjer i 128-samples kvanter på lydtråden. Jitter-garantien fra § 7.1 (\(\sigma < 1\) ms) gjelder per konstruksjon.

**Gjennomførbarhet:** ⚡ Lav-middels — 2–3 måneder, krever DSP-kompetanse, og forutsetter at hele klipp-pipelinen først er migrert til AudioBuffer-grafen (§ 4.1), som uansett skal gjøres. Bygg trinnvis: (1) buffer-graf [uansett], (2) kvantiser fasegrenser til valgt BPM [enkelt], (3) Worklet-mikser [middels], (4) Wasm time-stretch [vanskelig].
**ROI:** Trinn 1–2 alene («intervaller i takt med musikken») er skipbar verdi på uker. Full motor er premium-innhold for stemmebutikken (§ 6.3) — beat-matched personas som betalt tier.

### 8.4 Forretningsutviklerens Moonshot: «Stemmefabrikken» — fra app til plattform for norske trenerstemmer

**Konsept.** Transformer produksjonspipelinen (Suno-generering, Chatterbox-TTS, silenceremove/afade-etterbehandling, manifest-systemet) fra internt verktøy til **markedsplass**: fysioterapeuter, PT-er, kortrenere og idrettslagstrenere spiller inn (eller AI-kloner, med samtykke og vederlag) sin egen stemme, kobler den til egne program, og selger dem i appen med 70/30-deling. Idrettslaget selger «trener Kjells oppkjøringsprogram» til egne medlemmer; fysioterapeuten selger «skulderrehab med min stemme» til pasienter mellom timer. Min Trener eier ikke lenger bare et stemmebibliotek — den eier *distribusjonskanalen for norsk trenings-lyd*, med dialektmangfoldet som vollgrav.

**Hvorfor dette er et ekte moonshot og ikke bare en butikk:** Nettverkseffekten er tosidig — hver ny stemme gjør appen mer verdt for lyttere, hver ny lytter gjør plattformen mer verdt for stemmer — og aktivumet (norske dialekt-treningsstemmer med tilhørende programmer) er verdiløst for globale aktører å kopiere men verdifullt for dem å *kjøpe*. Det er også den eneste modellen der innholdsproduksjonen skalerer uten grunnleggeren.

**Gjennomførbarhet:** ⚡ Krever rekkefølge: (1) stemmebutikk med *egne* personas først (validerer betalingsvilje, gjenbruker alt), (2) manuell «kuratert kreatør»-pilot med 3–5 håndplukkede instruktører (validerer tilbudssiden uten selvbetjeningsbygg), (3) selvbetjent pipeline sist. Juridisk må på plass fra dag én i steg 2: stemmerettigheter, samtykke til AI-kloning, MVA på digitale tjenester.
**ROI:** Trinn 1 er Q1-inntekt. Trinn 3 er exit-fortellingen.

---

## 9. Prioritert handlingsplan

*V1.0-planens quick wins er levert i sin helhet (verifisert, § 1.2), og Q1-sporet er i gang. Planen under er derfor ny: den starter fra kveldens faktiske tilstand.*

### 9.1 Quick Wins (denne uken — timer, ikke dager)

| # | Tiltak | Ref. | Effekt |
|:--|:--|:--|:--|
| 1 | Tett `global_stats`-regelen (increment-validering eller `write: if false`) | § 5.1 | Lukker det eneste KRITISK-funnet i v2.0 |
| 2 | Krev auth + inkrement-på-én for `participantCount`; `crypto`-romkoder | § 5.1 | Rom-herding før biometri; timer arbeid |
| 3 | `Math.ceil`-gating av nedtellingsrender | § 4.2 | React bailer 9 av 10 ticks — re-render-frekvens ned 90 % |
| 4 | Koble `localAiCoachService` til `WorkoutSummary` | § 3.4 | Appens billigste kvalitetsløft: avslutningen slutter å være dum |
| 5 | `PerformanceObserver('longtask')` + faseovergangs-avviksmåling inn i telemetrien | § 9.4 | Målekortet får sine to første tekniske tall |
| 6 | `share_import`-telemetrihendelse på `ref=share`-treff | § 6.4 | K-faktoren går fra instrumentert til observert |
| 7 | Dvale-reanker: `Date.now()`-kryssjekk ved `visibilitychange` | § 2.1 | Dekker monoklokke-frys etter dyp dvale |
| 8 | Felttest på fysisk iPhone + Android: skjerm av, lomme, 20 min | § 2.1, § 8.2 | Beviser (eller avkrefter) hele bakgrunnsstrategien før merge |

### 9.2 Q1-mål (neste kvartal — de strukturelle grepene)

**Teknisk spor (rekkefølgen er avhengighetsstyrt):**
1. **Merge `feat/q1-teknisk-spor` → `main`** bak felttesten (9.1 #8) — leveransene har ingen verdi på gren. Deretter `fix/a11y-etterslep` og ferdigstilt Fokusmodus (mot § 7.4-akseptkriteriene).
2. **AudioBuffer-migrering** av klipp-pipelinen: dekod ved øktstart, planlagt starttid, beregnede skjøtepunkter, crossfade (§ 4.1). *Fjerner stotringen ved roten; forutsetning for Blindmodus og beat-matching.*
3. **`TimerEngine` ut av React** + `AudioDirector` som eneste lydabonnent på hendelsesbussen (§ 2.1–2.2). *Fjerner dobbeltsannheten; gjør motor og lydprioritering testbare som rene enheter.*
4. **Testskjoldene fra § 5.3:** rules-tester mot emulator, Testing Library på de tre kritiske flatene, én Playwright-røykflyt i CI.
5. Zod-validering ved systemgrensene (URL-import, `localStorage`-lasting) + global feil-toast på kritiske skriv (§ 2.4).
6. Persona-aksentfarger nivå 1 + gestflate + dimme-modus i Fokusmodus (§ 3.2–3.3, § 4.4). UI-revisjonens Sprint 2 og 3.

**Forretningsspor:**
1. Streak til førstesiden + streak-forsikring + dag-14-milepæl i utfordringene (§ 6.2).
2. Onboarding om til «Hvem skal trene deg?» med lydprøver (§ 6.1).
3. Stemmebutikk MVP: betalingsintegrasjon (Vipps først — norsk marked), 2 gratis + 4 betalte personas (§ 6.3).
4. P2P-utfordringsinvitasjon med delt fremdrift (§ 7.5) — retensjon og viralitet i samme bygg.
5. Én B2B-pilotbedrift rekruttert med TV-modus-demo (§ 6.3). Art. 9-beredskapen (§ 5.2) klargjøres parallelt — pilotkunden kommer til å spørre.

### 9.3 Strategiske bautaer (6–18 måneder)

| Bauta | Innhold | Går i gang når |
|:--|:--|:--|
| **Puls-svermen** (§ 8.1) | WebRTC-biometrirom + instruktørfelt | Q1-teknisk 1–4 levert **+ rules-herding og DPIA (§ 5)** |
| **Blindmodus** (§ 8.2) | Skjermfri økt: sonisk koding + haptikk + stemme | iOS-felttest bestått + AudioBuffer levert |
| **Beat-matched motor** (§ 8.3) | Trinn 1–2 (BPM-kvantiserte intervaller) i Q2; Worklet/Wasm når DSP-kapasitet finnes | AudioBuffer-migrering levert |
| **Stemmefabrikken** (§ 8.4) | Kuratert kreatør-pilot → selvbetjening | Stemmebutikken har validert betalingsvilje |

### 9.4 Målekortet (definér suksess nå, ikke etterpå)

| Måltall | I dag | Q1-mål |
|:--|:--|:--|
| Jank: lange tasks (> 50 ms) per økt-minutt | Umålt (fiks levert; instrumentér med `PerformanceObserver`) | < 1, målt |
| Faseovergangs-lydavvik (planlagt vs. faktisk) | Umålt | p95 < 20 ms |
| Gruppeskjevhet mellom to fysiske enheter | Umålt (synk levert på gren) | < 100 ms, målt i felt |
| Bakgrunnsøkt (skjerm av, 20 min): faseoverganger levert | Umålt | 100 % på Android; dokumentert atferd på iOS |
| Rules-tester (negative adgangstester) | 0 | ≥ 10, grønne i CI |
| D7-retensjon | Umålt | Baseline + målt |
| K-faktor (delingslenker) | Instrumentert, ulest | Målt; > 0,05 |
| Betalende andel | 0 % | Første 100 betalende |
| WCAG-avvik (UI-rev. § 9.1) | 14 → Sprint 1 lukket | 0 i kategori A1 |

---

## Sluttord fra panelet

Min Trener lider ikke av mangel på ambisjon, funksjoner eller ideer — den lider av det motsatte: **bredden har løpt fra dybden.** Det panelet skrev i morges står seg i kveld, men med et viktig tillegg: responsen på førsteutgaven — sju quick wins på `main`, fire strukturtiltak med tester og review-spor på gren, samme dag — viser at *gjennomføringsmuskelen finnes*. Resepten er dermed uendret og skarpere: stopp tilførselen av nye funksjoner i ett kvartal, og bruk det på (1) å gjøre timerens og lydens kjerne *sann* under reelle forhold — lomme, dvale, svak enhet — og bevise det med felttest og målekort, (2) å tette sikkerhets- og personvernhullene *før* biometrien gjør dem dyre, (3) å gjøre det som allerede er unikt — stemmene, kontekstene, skånsomheten — *synlig, hørbar og kjøpbar*. Moonshotene er ikke avvik fra dette; alle fire er rekonfigurasjoner av aktiva som allerede ligger i kodebasen. Det er den beste attesten et soloprosjekt kan få.

---

*Systemrevisjon utført 28. august 2026; dokumentversjon 2.0 etterprøvd mot kodebasen samme kveld (grener og commits angitt i innledningen). Linjereferanser gjelder tilstanden per verifiseringstidspunktet og forskyves av videre utvikling. Kontrast- og latensverdier: beregnede modeller (§ 7); effekt- og markedstall: estimater basert på plattformlitteratur og bransjeerfaring — valider med måling (§ 9.4) før beslutninger med høy innsats.*

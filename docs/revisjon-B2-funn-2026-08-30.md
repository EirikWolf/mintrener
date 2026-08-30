# Revisjon B2 — Plattform, forvaltning og læring

**Utført:** 2026-08-30 · **Mot:** `05c8f77` (prod i synk) · **Metode:** kodelesing, git-historikk, lisenskilder. Ingen fysisk enhet, ingen emulator.

> **Les først:** to av funnene under overtar premisser dere har dokumentert som avgjort. Ett av dem sparer dere for et arbeid dere har budsjettert. Det andre gjelder noe som ble bygget i dag.

---

## 0. Sammendrag

Bestillingen spør hva forvaltningsflaten bør inneholde. Jeg mener det er feil spørsmål, og at det riktige er synlig i deres eget materiale: **dere har ikke et forvaltningsproblem, dere har et beslutningsproblem.** Forvaltningsflaten er en foreslått løsning på symptomet.

Beviset ligger i én commit fra i dag, `6d18b93`, 38 487 linjer:

- Den leverte en **organisasjonsportal** med forhåndsdefinerte bedrifter, deriblant «Bedrift AS (HMS-Pilot)». Deres eget posisjoneringsdokument, vedlegg C.6, lister under *«hva vi ikke skal la oss friste til»*: **«et administratornivå for arbeidsgivere».** Strategien ble ikke slått opp.
- Den leverte `communityStatsService` — 50 linjer kode og 42 linjer tester — som **ikke kan virke, av fire uavhengige grunner** (§3.1). Den har full testdekning og null funksjon.
- Den vokste øvelsesbiblioteket fra ~25 til 74. Det er bra. Men det skjedde ved å redigere TypeScript-filer inne i en storfeature — altså *bekrefter* det tesen i del 3 om at innholdsproduksjon er en utviklingsoppgave. Den sluttet ikke å tape; den vant én gang ved å sitte på fanget til noe annet.

Et forvaltningsdashbord ville ikke fanget noen av de tre. Alle tre er beslutninger tatt raskere enn de ble prøvd mot noe.

**Den faglige motsetningen jeg støtte på**, og som jeg ikke kan løse for dere: *hastighet mot etterprøvbarhet.* Farten her er ekte og verdifull — 74 øvelser, 817 tester, 90 MB til 1,5 MB. Den samme farten produserer død kode med full testdekning og funksjoner som motsier strategien. Et beslutningsgate ville kostet nettopp det som gjør prosjektet bra. **Det som avgjør:** gaten må være billig nok til ikke å bremse (minutter, ikke dager) og treffe bare det som er vanskelig å angre — nytt *innhold* trenger ingen gate, ny *retning* trenger én.

**Det nest viktigste:** lisensregningen dere har budsjettert finnes ikke (§2.1). FLUX.1 [dev]-lisensen gir eksplisitt kommersiell rett til utdataene. Bildene dere har er frie. Det er *pipelinen* som er heftet, ikke arkivet.

---

## 1. Hva jeg ikke fikk gjort

Sagt først, slik bestillingen ber om.

| Spørsmål | Hvorfor ubesvart | Hva som skal til |
|---|---|---|
| Lydfokus / demping av andre apper | Krever ekte iPhone og Android | To fysiske enheter, én iOS ≤ 17 |
| Autoplay-atferd ved skjermlås | Samme | Samme, pluss en femårig telefon |
| Web Bluetooth i felt (Android) | Samme | Android + faktisk pulsbelte |
| Push-tillatelser, hjemskjerm-krav | Samme | iOS 16.4+ installert som PWA |
| Bakgrunnsatferd for worker-metronomen | Samme — *jeg leste koden, men koden forteller hva som er ment* | Enhet, låst skjerm, klokke ved siden av |
| Om `counter_*`-skriv faktisk avvises av reglene | Firestore-emulatoren starter ikke her (netty-socketfeil på Windows + `NoClassDefFoundError`, selv med JDK 21) | En maskin der `npm run test:rules` går. Sonden er vedlagt i §3.1 |

**Jeg har ikke skrevet API-dokumentasjon om til funn.** Der jeg ikke kunne måle, står det ubesvart.

To ting til: jeg har ikke revidert de 817 testene, og jeg har ikke sett appen kjøre.

---

## 2. Modell- og teknologivalg

### 2.1 Lisens — premisset er feil, i deres favør

Bestillingen sier Flux.1-dev er *«dokumentert som kjent kostnad den dagen produktet skal gi inntekt»*, og spør hva det koster å regenerere biblioteket.

**Regningen for det eksisterende biblioteket er null.** Lisensteksten er utvetydig:

> «We claim no ownership rights in and to the Outputs. … **You may use Output for any purpose (including for commercial purposes)**»

Og «Non-Commercial Purpose» er definert som en begrensning på bruk av *modellen*, ikke av utdataene: «*only so far as you do not receive any direct or indirect payment arising from the use of the FLUX.1 [dev] Model*».

Skillet som gjelder dere:

| Hva | Status ved kommersialisering |
|---|---|
| De 74 bildene som allerede er generert | **Frie.** Eksplisitt kommersiell rett |
| Person-LoRA-en | **Heftet.** En LoRA trent på dev er et derivat, og arver restriksjonen |
| Å generere *nye* bilder etter at penger kommer inn | **Heftet.** Krever kommersiell avtale med Black Forest Labs |
| Å bruke bildene til å trene en konkurrerende modell | Forbudt (eneste output-restriksjon) |

Altså: **arkivet er fritt, pipelinen er heftet.** Det er en helt annen og mye billigere situasjon enn «regenerer 74 bilder».

*Hva som må være sant:* at dere ikke serverer modellen, og at bildene ble generert før inntekt. Begge holder i dag.

*Hva som ville fått meg til å ombestemme meg:* en jurist som leser «indirect payment arising from the use» strengt nok til å omfatte generering utført i påvente av inntekt. Det er verdt en halvtimes juridisk avklaring før første krone — ikke en regenerering.

**Det som faktisk har endret seg siden valget:** FLUX.2 [klein] 4B er utgitt under **Apache 2.0** — kommersielt fri, og 4B er lite nok til å dele GPU-en. Det er kandidaten den dagen dere trenger *ny* generering med inntekt i bildet. FLUX.1 [schnell] (Apache 2.0) er det samme argumentet med lavere kvalitet.

### 2.2 Modelltabell

| Område | Dagens valg | Anbefaling | Begrunnelse | Byttekostnad |
|---|---|---|---|---|
| Bilde (eksisterende arkiv) | Flux.1-dev + LoRA | **Behold** | Utdataene er kommersielt frie. Regenerering løser et problem dere ikke har | 0 |
| Bilde (fremtidig generering) | Flux.1-dev | **Utred FLUX.2 [klein] 4B** når inntekt nærmer seg | Apache 2.0, GPU-vennlig. Ikke før | LoRA må trenes på nytt — dét er den reelle regningen, ikke bildene |
| Video | Ikke valgt | **Behold null-alternativet** | Se §2.3 — spørsmålet er trolig feil stilt | 0 |
| Musikk | Ikke i bruk | **Behold** | Ingen etterspørsel påvist. Lyd konkurrerer med stemmen | 0 |
| Stemme | Chatterbox, klonet fra ekstern seed | **Utred proveniens** (B1) | Utenfor mitt mandat her | Se B1 |
| «AI-trener» / «AI-øktgenerator» | Regelbasert, verifisert null nettverkskall | **Behold reglene. Bytt navnet** | Se under | En strengfil |

### 2.3 Bør de regelbaserte funksjonene kalle seg AI?

**Nei — og grunnen er ikke pedantisk, den er strategisk.**

Jeg bekreftet at `aiWorkoutGeneratorService` og `localAiCoachService` ikke har nettverkskall. De er raske, gratis, offline og forutsigbare. Det er en *bedre* egenskap enn en språkmodell ville gitt, og den er umulig å kopiere for en konkurrent som ringer et API.

Ved å kalle det AI selger dere det på den ene aksen der dere taper mot alle, i stedet for den ene der dere vinner mot alle. En bruker som møter «AI-trener» forventer samtale og blir skuffet av regler. Den samme brukeren som møter «virker uten nett, alltid likt» får noe ingen abonnementsapp leverer.

Forslag: **«Øktbygger»** og **«Treneren»**. Minste første steg: bytt de brukervendte strengene, la tjenestenavnene ligge.

*Om «micro LLM»:* reglene treffer taket når brukeren vil ha noe som *ikke* er en variant av det dere har forhåndsdefinert. Jeg så ingen tegn til at brukerne ber om det. **Nullalternativet vinner klart her**, og hvis en språkmodell skal inn en dag, er svaret hybrid: regler er fasit, modellen er pynt — aldri motsatt, for en trener som sier noe rart er verre enn en som sier noe enkelt.

---

## 3. Forvaltningsnotat

### 3.1 Tre funn fra dagens commit

**(a) `communityStatsService` kan ikke virke — fire uavhengige grunner.**

Lagt inn i dag med 42 linjer tester. Ingen av grunnene er dekket av testene, fordi de alle ligger utenfor enhetsnivået:

1. **Ingen kaller den.** `recordCommunityCompletion` og `getCommunityWorkoutCount` importeres kun av testfila si.
2. **Ingen skriveregel.** `firestore.rules` har `match /global_stats/{statId}` med bare `allow read: if true; allow delete: if false;`. De fem navngitte dokumentene har egne `create`/`update`-regler. `counter_*` treffer bare wildcarden, som ikke innvilger skriv — og Firestore nekter det som ikke er innvilget.
3. **Feilen svelges.** `catch { /* Stille feilhåndtering ved offline */ }` — en `permission-denied` ser ut som offline.
4. **Feil tidsstempel-form.** Tjenesten sender `new Date().toISOString()`; alle andre regler i fila krever `lastUpdated == request.time` (server-tidsstempel).

Og selv om alle fire ble rettet: `formatThreshold3Count` returnerer `null` under 3, så telleren ville stått på 0 og aldri blitt vist.

Jeg fikk **ikke** målt punkt 2 (emulatoren starter ikke her). Punkt 1 er derimot avgjørende alene og verifiserbart med `grep`. Sonden jeg skrev, kjørbar der emulatoren virker:

```ts
it('skriv nøyaktig som recordCommunityCompletion gjør det', async () => {
  const db = testEnv.unauthenticatedContext().firestore();
  await assertFails(
    setDoc(doc(db, 'global_stats', 'counter_program-1'),
      { count: increment(1), lastUpdated: new Date().toISOString() },
      { merge: true }),
  );
});
```

**Dette er funnet i miniatyr:** en personvernbevisst funksjon (Terskel 3), gjennomtenkt og testet, sendt til prod uten at noen spurte om den var koblet til noe.

**(b) Organisasjonsportalen motsier vedlegg C.6.** Se §0. Den er `localStorage`-basert, altså en simulering — det demper konsekvensen, men ikke beslutningen.

**(c) Øvelsesbiblioteket vokste 25 → 74 i dag.** Bestillingens del 3 sier det har «stått stille på 25»; systembeskrivelsen sier 74. Begge var sanne, på hver sin side av `6d18b93`. Tesen holder likevel — øvelsene ligger fortsatt hardkodet i `src/data/exercises/*.ts`.

### 3.2 Telemetrien — 6 skrives, 4 leses, 2 er blindveier

Bestillingen sier «seks dokumenter skrives, tre leses». Målt tall:

| Dokument | Skrives | Leses | Av hvem |
|---|---|---|---|
| `overview` | ✔ | ✔ | Sluttbruker (`ExerciseLibraryView`, `SettingsMoreView`) |
| `exercises` | ✔ | ✔ | Sluttbruker |
| `ratings` | ✔ | ✔ | Sluttbruker |
| `counter_<id>` | (forsøkes) | (forsøkes) | Ingen — se §3.1 |
| **`perf`** | ✔ | **aldri** | — |
| **`engagement`** | ✔ | **aldri** | — |

Blindveiene er to, ikke tre. Men den ene av dem er alvorlig på en måte bestillingen selv peker på og bør ta helt inn over seg:

**`global_stats/perf` inneholder bøttene for lydavvik** (`deviationUnder20Ms`, `deviation20to50Ms`, `deviationOver50Ms`) — som gjenopptakelsesnotatet gjør til **go/no-go-kriteriet for produksjonslansering.** Beslutningsgrunnlaget for å lansere skrives til et dokument ingen leser, og det finnes ingen kode som leser det.

Dette er ikke et dashbord-behov. Det er **ett `curl`-kall**. Dokumentet er `allow read: if true`.

### 3.3 Svar i fire kategorier

Bestillingen ber om skillet, og det er her nullalternativet gjør mest arbeid.

**Flytt innholdet ut av koden** — størst effekt, lavest pris:

- Øvelser og programmer ut av `src/data/exercises/*.ts`. Men **ikke til Firestore ennå** — til JSON i repoet, med et skjema-valideringssteg i CI. Da kan en skrivefeil rettes uten å røre TypeScript, mens 1,5 MB-tallet og offline-løftet står urørt. Firestore-kolleksjonen `exercises` (som har `allow write: if false` og aldri leses) er et forvaltningslag som ble planlagt og ikke bygget — **slett den fra reglene** framfor å la den se ut som en plan.

**Koble til noe som finnes:**

- Feil og hendelser → **GlitchTip i hjemmelaben** (`http://192.168.0.10:8000`). Bestillingen har rett i at spørsmålet ikke er om dere skal bygge et feildashbord. Personvernkravet: skru av `sendDefaultPii`, og vær klar over at en Sentry-kompatibel klient er en databehandler som må inn i `docs/databehandlere.md` før første feilrapport.
- Driftsinnsikt → Firebase-konsollen dekker «er appen frisk». Den dekker ikke `perf`.

**Hold det i terminalen:**

- Et `npm run tilstand`-skript som henter de seks `global_stats`-dokumentene og skriver ut lydavvik-fordelingen, fullføringsrate og de programmene ingen bruker. **Dette er hele driftsinnsikts-behovet før lansering**, og det er en ettermiddags arbeid.
- Innholdshelse: et skript som sjekker at programmer peker på øvelser som finnes, at hvert bilde har status, at hver persona har klipp. Kjør det i CI. Nettopp den feiltypen har fått stå lenge her.

**Bygg eget: ingenting. Ikke nå.**

### 3.4 Hva som ikke bør bygges

- **Ikke et forvaltningsdashbord.** Det ville blitt den femte flaten ingen leser. Dere har ikke vist at dere leser de fire dere har.
- **Ikke en tilbakemeldingskanal ennå.** Bestillingen sier det selv: en kanal ingen svarer i er verre enn ingen kanal. Med én forvalter er en `mailto:`-lenke med forhåndsutfylt kontekst (versjon, øktnavn — ingen personopplysninger) riktig størrelse.
- **Ikke budsjettvarsel.** Se §3.5.
- **Ikke bildekuratoren videre.** Lukket, verifisert av dere.

### 3.5 Kostnad — deres omlegging er riktig, med ett forbehold

Peer-sesjonen la om fra kostnadsrisiko til tilgjengelighetsrisiko fordi `billingEnabled: false` (Spark). **Den omleggingen er riktig**, og jeg vil styrke den: uten betalingskonto *kan* et budsjettvarsel ikke opprettes, så det gamle tiltaket var ikke bare feil prioritert — det var ikke mulig.

Forbeholdet: konklusjonen hviler på at prosjektet *forblir* på Spark. Den dagen en betalingskonto knyttes til (f.eks. for Cloud Functions), snur risikoen tilbake til kostnad **samme dag**, og den uautentiserte telemetriflaten blir en regning i stedet for en nedetid. Jeg bekreftet at ingen `global_stats`-regel krever `request.auth` — bare `rooms` og `users` gjør det.

**Minste tiltak, uavhengig av plan:** skriv inn i Beslutning 47 at overgang til Blaze er en *utløsende betingelse* som reaktiverer kostnadssporet. Ellers råtner en riktig beslutning til en feil beslutning uten at noen merker det.

### 3.6 Tre nivåer

| Nivå | Hva |
|---|---|
| **Før lansering** | `npm run tilstand` (lydavvik!) · innholdshelse-skript i CI · GlitchTip · slett `exercises`-regelen · Blaze-betingelse i Beslutning 47 |
| **Flere forvaltere** | Innhold til JSON + skjemavalidering · `mailto:`-tilbakemelding |
| **Ved vekst** | *Da* — og bare da — en flate. Bygget på spørsmålene terminalskriptet viste seg å bli kjørt oftest |

---

## 4. Plattformnotat

### 4.1 Det målbare regnestykket — og et funn som ikke krever enhet

Jeg kan ikke måle det meste her (§1). Men ett tall er lesbart i koden, og det er verre enn det bestillingen antar.

`HeartRateWidget.tsx:84`:

```tsx
if (!isSupported) {
  return null; // Skjules i nettlesere uten Web Bluetooth (f.eks. iOS Safari)
}
```

Funksjonen er altså usynlig på iPhone — som bestillingen frykter. Men den er ikke *taus*:

| Sted | Tekst | Gated? |
|---|---|---|
| `AboutGuideModal.tsx:230` | «Under «Puls & Sensorer» kan du koble til Bluetooth pulsbelte (f.eks. Polar/Garmin)» | **Nei** |
| `SettingsMoreView.tsx:443` | «Sensordiagnostikk & Pulsbelte / Bluetooth pulsmåler, bevegelse og GPS» | **Nei** |

**En iPhone-bruker leser en instruks om å gjøre noe som er umulig, og navigerer til et sted der kontrollen ikke finnes.** Det er ikke en manglende funksjon — det er appen som forteller brukeren at feilen er deres.

Dette er den reelle kostnaden ved PWA-valget slik det er implementert i dag, og den koster **null** å fjerne: gate hjelpeteksten på `isSupported()`, og si hva som gjelder («Pulsbelte krever Android eller Chrome — iPhone støtter ikke Bluetooth i nettleser»). Ærlig fravær slår usynlig fravær.

### 4.2 Umulig / vanskelig-men-gjort / ikke forsøkt

| | Sak |
|---|---|
| **Umulig i web** | Web Bluetooth på iOS · Apple Health / Health Connect · bakgrunnsskritteller |
| **Vanskelig, men gjort** | Timerpresisjon i bakgrunn (worker-metronom + reankring mot veggklokke) |
| **Ikke forsøkt** | Ærlig kommunikasjon om det umulige (§4.1) — det billigste tiltaket i hele revisjonen |

Presedensen er verdt å ta på alvor: timeren var det vanskeligste, og den ble løst i web. **En native-innpakning begrunnet med problemer av den typen ville vært en dyr snarvei.**

### 4.3 Er PWA mot native en falsk todeling? Ja.

Bestillingen ber meg vurdere det, og svaret er ja — men ikke på den måten «begge» vanligvis betyr.

Capacitor er ikke en *plattform*, det er en *distribusjonskanal for samme kodebase*. Spørsmålet er ikke «PWA eller native», men **«er App Store-tilstedeværelse verdt review-køen»** — og det spørsmålet handler om funnbarhet, ikke om sensorer.

Her er det avgjørende, og det er posisjoneringen deres som avgjør det: vedlegg C.6, setning 2, sier at appen er bygget for at flere skal gjøre det *sammen, i rommet* — koret, eldresenteret, møterommet. **Den distribusjonen er en delt lenke, ikke et søk i App Store.** «Åpne denne på telefonen» virker for femten korister på tjue sekunder. «Last ned fra App Store» gjør det ikke.

For deres posisjonering er PWA ikke et kompromiss. Det er **mekanismen**.

### 4.4 Anbefaling med utløsende betingelser

**PWA alene.** Bytt når *én* av disse blir sann:

1. **Apple Health / Health Connect** blir etterspurt av folk som faktisk bruker appen (ikke antatt) — da er Capacitor riktig og eneste vei.
2. **Push viser seg avgjørende for retensjon** *og* hjemskjerm-installasjon måles under ~30 % — da taper dere kanalen på et installasjonskrav.
3. **En organisasjon krever App Store-distribusjon** som innkjøpsbetingelse. (Merk at dette blir mer sannsynlig nå som organisasjonsportalen finnes — se §0.)

Ingen av dem er sanne i dag, og ingen av dem kan avgjøres uten enhetsmåling.

*Hva ville fått meg til å ombestemme meg:* at lydfokus viser seg umulig i web på iOS *og* at demping er avgjørende for opplevelsen. Det er det ene stedet der plattformen kan slå posisjoneringen. **Det krever en iPhone å avgjøre, og det bør avgjøres før lansering.**

---

## 5. Læringssløyfer

### 5.1 Sløyfekart

| Innsamling | Går til | Endrer noe? |
|---|---|---|
| Øktvurdering (`for_lett`/`passe`/`for_tungt`) | `adaptiveProgressionService`, `fatigueDeloadService` | **Ja — lukket** (siden i dag) |
| Samme vurdering | `global_stats/ratings` | Ja — vises til bruker |
| Personlige rekorder, historikk | `WorkoutHistoryView` | Ja — vises |
| **Ytelsestelemetri (`perf`)** | Firestore | **Nei — åpen ende** |
| **Engasjement (`engagement`)** | Firestore | **Nei — åpen ende** |
| Fullføringsteller (`counter_*`) | Ingensteds | **Nei — virker ikke** (§3.1) |

Bildet er bedre enn bestillingen antar: **hovedsløyfen ble lukket i dag.** De åpne endene er de to som er drift, ikke produkt — og som §3.2 viser, trenger de en `curl`, ikke en funksjon.

### 5.2 Får brukeren vite at systemet har lært?

Delvis. `checkAdaptiveProgression` brukes i `TimerDisplay`, så forslaget vises. Men **`fatigueDeloadService` brukes i `PainFilterModal`** — altså i en modal som handler om smerte. En bruker som får redusert belastning der, kan lese det som «appen tror jeg er skadet» framfor «appen så at forrige økt var tung».

Minste inngrep: si hvorfor, med tallet. *«Du vurderte de to siste øktene som for tunge — jeg har lettet denne.»* Én setning gjør en usynlig tilpasning til noe som oppleves som oppmerksomhet.

### 5.3 Moonshots

Alle bygger på noe som finnes, per bestillingens krav.

**1. Rommet husker seg selv.** Gruppeøkter finnes (`rooms`), og C.6 sier dette er posisjonen. I dag er rommet en engangshendelse. Lar man verten gjenåpne samme rom neste uke med samme kode, har koret et *fast treningstidspunkt* i stedet for en app.
*Fundament:* `rooms`-kolleksjonen, romkoder, verts-UID. *Krever først:* at rom overlever `status: waiting`-opprydding. *Vanskelig å kopiere:* alle andre er bygget for én person med hodetelefoner.

**2. Lydavviket som produktegenskap.** Dere måler faseovergangs-presisjon i millisekunder allerede (`perf`). Ingen konkurrent gjør det. En timer som *kan dokumentere* at den er presis, er et argument mot enhver «god nok»-timer — særlig for instruktører som teller for andre.
*Fundament:* `perfMonitorService`. *Krever først:* at noen leser `perf` (§3.2).

**3. Øvelsesbiblioteket som fellesgode.** 74 norske øvelser med instruks på bokmål, fri lisens på bildene (§2.1). Publisert som et datasett er det den billigste distribusjonen dere kan få: andre norske helseaktører lenker til dere.
*Fundament:* øvelsesdataene, og lisensfunnet som gjør det lovlig. *Krever først:* innhold ut av TypeScript (§3.3). *Vanskelig å kopiere:* det er arbeid, ikke teknologi.

**4. «Sterk og stødig» som distribusjon, ikke konkurrent.** C.5 kaller det den viktigste referansen for senior. Det er et *kommunalt program med instruktører* — altså mennesker som allerede leder grupper og som mangler en timer bygget for rommet. Organisasjonsportalen som ble bygget i dag peker faktisk hit, om den rettes mot frivillighet i stedet for arbeidsgivere.
*Krever først:* en avklaring av §0 — er dette retningen, eller var det en avsporing?

---

## 6. Veikart

**Denne uken**

- Gate hjelpetekst og innstillingsrad på `isSupported()` (§4.1). Billigste tiltak i revisjonen
- Avgjør `communityStatsService`: koble til eller slett (§3.1). **Ikke la den bli stående**
- Ta stilling til organisasjonsportalen mot vedlegg C.6 (§0) — behold og oppdater C.6, eller frys

**Før lansering**

- `npm run tilstand` — les `perf`. **Dette blokkerer go/no-go** (§3.2)
- Innholdshelse-skript i CI
- GlitchTip + databehandler-oppføring
- Slett `exercises`-regelen fra `firestore.rules`
- Blaze-betingelse inn i Beslutning 47 (§3.5)
- Lydfokus målt på ekte iPhone (§1) — eneste plattformspørsmål som blokkerer

**Neste kvartal**

- Innhold ut av TypeScript til validert JSON (§3.3)
- Døp om «AI»-funksjonene (§2.3)
- `mailto:`-tilbakemelding

**Fjern eller frys**

- **Frys:** forvaltningsdashbord · budsjettvarsel · video · musikk · micro-LLM
- **Fjern:** `exercises`-regelen · `counter_*` hvis den ikke kobles · «AI» i brukervendt tekst
- **Ikke regenerer bildebiblioteket** (§2.1)

---

## 7. Tilbakemelding på bestillingen

**Det som virket.** Mandatet om å forkaste premisset kom midt i arbeidet og endret leveransen vesentlig — §0 og §2.1 ville ikke stått der uten. Kravet om å si hva jeg ikke fikk gjort er det som gjør §1 mulig å skrive uten å pynte. Behold begge, permanent.

**Det som var uklart.**

1. **Bestillingen motsier seg selv om øvelsestallet** (74 mot 25) fordi virkeligheten flyttet seg mens den ble skrevet. Det gjorde meg usikker på hvilke andre tall som var foreldet — og §3.2 viste at ett til var det (seks/tre). *Forslag: stemple bestillingen med en commit-SHA, slik dere gjør med prod.*
2. **«Seks dokumenter skrives, tre leses»** var nesten riktig og derfor farlig. Hadde jeg ikke telt selv, ville jeg gjengitt det. *Forslag: marker tall dere ikke har målt selv i denne runden.*

**Det som burde vært formulert annerledes.**

Del 3 spør «hva trengs?» og ber meg *utrede minst disse* åtte punktene. Den lista er selve skjevheten mandatet advarer mot — åtte forvaltningsbehov er et dashbord som allerede er tegnet. Jeg svarte på tvers av den, men det krevde at jeg brøt formen. *Forslag: still spørsmålet uten lista først, og legg lista ved som «det vi selv har tenkt».*

**Om konkurrentanalysen (vedlegg C).** Dere ba meg si om den er for smal. Den er det, men ikke der dere tror. C.1 innrømmer selv at kategori C og D er «tatt med fra generell kjennskap, ikke undersøkt på nytt» — og de globale lederne i loggekategorien (Strong, Hevy, Fitbod, Alpha Progression) er ikke nevnt. Viktigere: **analysen svarer på markedsposisjonering, og ingen av B2s tre spørsmål er markedsspørsmål.** Den hjalp meg ikke med plattform, forvaltning eller læringssløyfer, og det er ikke dens feil — den ble skrevet for noe annet.

Men C.6 inneholder det beste i hele dokumentsamlingen: lista over *hva dere ikke skal la dere friste til*. Den er nøyaktig den tenkningen mandatet etterspør. Problemet er ikke at den mangler — det er at den ikke ble lest før `6d18b93`.

**Det viktigste jeg vil gi tilbake.** Tre bestillinger på rad har spurt meg om å vurdere ting dere nettopp har bygget. Hver gang har det mest verdifulle funnet vært noe som *ble bygget i mellomtiden* — B1 fant dempingstjenesten, jeg fant `communityStatsService` og organisasjonsportalen. Det er ikke tilfeldig, og revisjonen er ikke riktig verktøy for det.

Revisjoner er dyre og kommer for sent. **Det dere trenger er ikke en fjerde revisjon, men en fem minutters sjekk før merge:** kalles den nye koden fra noe? har den en skriveregel? står den i strid med vedlegg C? Alle tre funnene mine ville falt ut av de tre spørsmålene, samme dag, gratis.

Om jeg fikk endre én ting ved hvordan vi jobber: **be meg om den sjekklista i stedet for neste revisjon.**

---

## Kilder

- FLUX.1 [dev] Non-Commercial License — [huggingface.co/black-forest-labs/FLUX.1-dev](https://huggingface.co/black-forest-labs/FLUX.1-dev) ([LICENSE.md](https://huggingface.co/black-forest-labs/FLUX.1-dev/blob/main/LICENSE.md))
- FLUX-variantenes lisenser (klein 4B = Apache 2.0) — [Flux 2 og Flux Kontext, august 2026](https://invideo.io/blog/flux-ai-image-generator/) · [Flux (text-to-image model), Wikipedia](https://en.wikipedia.org/wiki/Flux_(text-to-image_model))
- Alt øvrig: `mintrener`-repoet ved `05c8f77`, med fil- og linjereferanser i teksten

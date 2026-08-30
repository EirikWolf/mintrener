# Revisjon B — Fundamentet: funn

**Objekt:** Min Trener, prod i synk med main (`0402544`)
**Dato:** 2026-08-30
**Metode:** kildelesing fra start (ingen «bruk appen først»-regel i B). Kapasitets- og lisenspåstander etterprøvd mot `homelab-vault/02-Tjenester/AI/`, ikke mot hukommelse.

---

## 0. Dekning — les denne først

**Godt dekket, med verifisert grunnlag:** Del 1 (bevegelse), Del 4 (modellvalg), Del 6 (forvaltning), Del 7 (læringssløyfer).

**Delvis:** Del 2 (stemme) — produksjonslinjen er lest, men jeg har ikke hørt et eneste klipp, så kvalitetsvurdering av dagens stemmer mangler.

**Ikke gjennomført:** Del 3 (musikk og lydbilde) og Del 5 (plattform) i dybden. Begge krever testing på ekte iOS- og Android-enheter for å si noe holdbart om lydfokus, autoplay og bakgrunnsatferd. Jeg kan gjengi hva spesifikasjonene sier, men det ville vært lærebok, ikke revisjon. Dere ba om å få vite det framfor å få malen fylt.

Jeg har heller ikke lest `docs/trening-app-spesifikasjon.md` i sin helhet, så avvik mot krav er ikke systematisk kryssjekket.

---

## 1. Sammendrag

### Den viktigste innsikten

**Innholdsproduksjon er blitt en utviklingsoppgave, og taper derfor hver gang.** Bestillingen stiller dette som et spørsmål i Del 6. Svaret er ja, og det er verifiserbart i tre uavhengige spor:

1. Øvelsene ligger hardkodet i kildefiler — en skrivefeil krever kodeendring, review, bygg og utrulling.
2. Sikkerhetsreglene definerer `/exercises` med `allow read: if true; allow write: if false`. Altså en samling ingen kan skrive til fra klienten, og som **appen aldri leser**. Datamodellen forutsetter et forvaltningslag som aldri ble bygget.
3. Biblioteket har stått på 25 øvelser gjennom hele utviklingen, mens funksjonsmengden vokste til ti inngangspunkter på startskjermen.

Alt annet i denne revisjonen er nedstrøms av dette. Video-spørsmålet i Del 1 er i praksis «hvordan produserer vi mer innhold», og det spørsmålet har en billigere løsning enn GPU-timer: **flytt innholdet ut av koden først.**

### Faglige motsetninger jeg faktisk støtte på

**Kvalitet mot kostnad — og kostnad tapte.** Søsterprosjektet SynthIQ byttet 2026-08-11 fra LTX (70 s per 5-sekundsklipp) til Wan 2.2 14B + Turbo (195–256 s) — altså **tre ganger tregere, valgt med vilje** (ADR-0043). Det er den mest lærerike enkeltopplysningen for Del 1: da noen med samme maskin og samme klipplengde faktisk måtte velge, vant kvaliteten. Hvis Min Trener regner på LTX fordi den er rask, regner den på et alternativ naboen forkastet.

*Hva som avgjør:* om bevegelsen skal være instruktiv (da er artefakter dyre) eller bare antydende (da kan de aksepteres).

**Åpenhet mot lisens — og den ene modellen som kunne løst alt er sperret.** MiniMax H3 er den eneste videomodellen på kitor med lyd i samme pass. Lisensen er verre enn bestillingen gjengir, og mer uavklart:

> Territorie-klausulen ekskluderer USA, EU, Storbritannia og Korea. **Norge er EØS, ikke EU, og det er ikke avklart hvilken side vi havner på.** Fri bruk ellers ikke-kommersielt, og kommersielt under 20 MUSD omsetning med attribusjonskrav — der attribusjonsformen ikke er verifisert mot lisensteksten.

Beslutningen (SynthIQ-eier, 2026-08-04) er internt bruk til dette er avklart. Det er ikke «modellen er forbudt» — det er «ingen har lest ferdig». Forskjellen er verdt penger.

*Hva som avgjør:* om noen bruker en dag på lisensteksten. Det er billigere enn nesten alt annet i denne rapporten.

**Fleksibilitet mot offline-løftet.** De regelbaserte «AI»-funksjonene er raske, gratis, offline og forutsigbare. En språkmodell gir bedre norsk, men bryter offline-løftet eller koster nedlasting og batteri. Dette er en reell motsetning uten opplagt vinner — se Del 4.

---

## 2. Del 1 — Bevegelse

### Verifiserte tall

Fra `ComfyUI-Video.md`, målt 2026-08-03/07 på samme ankere, 81 frames:

| Modell | Tid / 5s-klipp | Lyd | Status |
|---|---:|---|---|
| LTX 13B 0.9.8 | **70 s** | nei | Rollback-kandidat, produksjon t.o.m. 11.08 |
| HunyuanVideo 1.5 480p i2v | 166–175 s | nei | Testet, ubrukt |
| **Wan 2.2 i2v 14B + Turbo** | **195–256 s** | nei | **SynthIQ-produksjon fra 11.08** |
| Wan 2.2 i2v 14B uten Turbo | 1437 s | nei | Ikke levedyktig |
| MiniMax H3 | 357–385 s | **ja** | Lisenssperret |

> **Dokumentasjonsavvik funnet underveis:** `Kitor-tjenester-katalog.md` oppgir LTX til «~4 s per 5-sek-klipp». `ComfyUI-Video.md` sier 70 s. Det er 17× forskjell mellom to av våre egne dokumenter. Benchmark-dokumentet er den grundigere kilden (oppgir målemetode), så jeg har brukt 70 s — men katalogen bør rettes, ellers regner neste prosjekt feil.

### Regnestykket som avgjør

Ved 80 øvelser, ett 5-sekundsklipp hver:

| Alternativ | GPU-tid | Merknad |
|---|---:|---|
| Kryssing mellom de to bildene som finnes | **0** | Ingen generering |
| LTX | ~1,6 t | Kvalitet forkastet av naboprosjekt |
| Wan 2.2 Turbo | **~5 t** | Eksklusiv lease på delt maskin |
| H3 | ~8 t | Lisenssperret uansett |

Men **GPU-tid er ikke bindeskranken. Filstørrelsen er.**

Installasjonskostnaden ble presset fra 90 MB til 1,5 MB. Et enkelt 5-sekunds videoklipp i brukbar kvalitet er typisk 0,5–2 MB. **Åtti klipp er 40–160 MB — tjuefem til hundre ganger hele dagens installasjon.**

Det betyr at video ikke kan pakkes med appen. Den må strømmes. Og da bryter den offline-løftet, som er et av produktets bærende premisser.

### Anbefaling

**Bygg kryssingen først.** Den står allerede i spesifikasjonen, er aldri bygget, koster null GPU-timer, null nye byte, og er trivielt redigerbar — retter du et bilde, er bevegelsen rettet. Den holder ikke for kompleks teknikk, men den svarer på det de fleste øvelseskort trenger: *hvilken vei går bevegelsen*.

**Om video: ja, men ikke under økten.** Bestillingen spør *hvor* bevegelse er verdt mest. Under økten konkurrerer alt om samme oppmerksomhet, og løftet er «én hånd, ett blikk» — en løkke i bakgrunnen stjeler blikket fra nedtellingen. Video hører hjemme i **biblioteket** (utforske) og eventuelt **før** øvelsen (lære), aldri **under**. Det løser samtidig filstørrelsen: bibliotekvideo kan strømmes, fordi biblioteket ikke er offline-kritisk.

**Om kilder og jus:** positur-utledning (vedlegg A) er den eneste strategien jeg vil anbefale for å komme fra 25 til 80+. Å kjøre andres foto gjennom en generativ modell gir et bearbeidet verk der kildens lisens kan følge med — å utlede kun leddkoordinater gjør det ikke, fordi et skjelett ikke bærer gjenkjennbart innhold.

**Hva må være sant:** at kryssing faktisk leser som bevegelse for de 25 øvelsene vi har. Test på fem før dere bygger for alle.
**Hva ville fått meg til å ombestemme meg:** hvis H3-lisensen avklares i vår favør. Da endres regnestykket, fordi lyd i samme pass fjerner et helt produksjonsledd.

---

## 3. Del 4 — Modelltabell

| Område | Dagens valg | Anbefaling | Begrunnelse | Byttekostnad |
|---|---|---|---|---|
| Bilde | Flux.1-dev + LoRA + ControlNet | **Behold, med frist** | Ikke-kommersiell lisens er bevisst valgt og dokumentert. Men «kjent kostnad den dagen produktet gir inntekt» er en gjeld uten forfallsdato | Regenerering av hele biblioteket. Billig ved 25 øvelser, dyr ved 120. **Ta beslutningen før biblioteket vokser, ikke etter** |
| Video | Ikke valgt | **Utred ikke — bygg kryssing** | Se Del 1 | — |
| Musikk | Ikke i bruk | Behold som ikke-i-bruk | Se Del 3-forbeholdet | — |
| Stemme | Chatterbox, ekstern seed | **Utred lokal seed** | Lisensgrunnlaget er uavklart *og* kildesporene ligger i et offentlig kodelager. Hele kjeden finnes lokalt med apache-2.0 | Én produksjonsrunde |
| «AI-trener» / «AI-øktgenerator» | Regelbasert, null nettverkskall | **Behold logikken, bytt navnet** | Se under | Tekstendring |

### Om navnet «AI»

Funksjonene gjør null nettverkskall og inneholder ingen modell. De er regelbaserte — og det er et **godt** valg: raskt, gratis, offline, forutsigbart. En trener som sier noe rart er verre enn en som sier noe enkelt.

Men navnet lover noe annet enn det som leveres. Det er ikke bare unøyaktig; det er en forventning appen selv vil måtte innfri senere. «Astrid AI» og «AI Økt» bør hete noe som beskriver hva de gjør — «Foreslå økt», «Tilpasset program». Da kan dere legge til en språkmodell den dagen det er riktig, uten at brukeren opplever det som at noe endelig begynte å virke.

**Hva må være sant:** at ingen markedsføring allerede lener seg på AI-begrepet.

---

## 4. Del 6 — Forvaltning

### Hvorfor flaten mangler — verifisert

`firestore.rules`:

```
match /exercises/{exerciseId} {
  allow read: if true;
  allow write: if false;
}
```

En offentlig lesbar samling som **ingen kan skrive til fra klienten** — ikke engang en admin. Den kan bare fylles serverside med Admin SDK. Og søk i `src/` viser at appen **aldri leser den**: eneste treff på `'exercises'` utenfor `custom_exercises` er fanenavnet i navigasjonen og `global_stats/exercises` i telemetrien.

Datamodellen ble altså designet for et forvaltningslag, reglene ble skrevet for det, og laget ble aldri bygget. Samlingen står tom og ubrukt som et fundament uten hus.

### Telemetrien skriver til seks, leser tre

Verifisert i `src/services/telemetryService.ts`:

| Dokument | Skrives | Leses tilbake |
|---|---|---|
| `overview` | ✅ | ✅ |
| `ratings` | ✅ | ✅ |
| `exercises` | ✅ | ✅ |
| `perf` | ✅ | ❌ |
| `engagement` | ✅ | ❌ |
| `counter_*` | ✅ | ❌ |

Og de tre som leses, leses av `ExerciseLibraryView`, `OnboardingFlow` og `SettingsMoreView` — **alle sluttbrukerflater**. Ingen forvalter ser noe som helst.

**Det alvorligste:** `perf` bærer bøttene for lydavvik, som gjenopptakelsesnotatet gjør til go/no-go-kriteriet for produksjonslansering. **Beslutningsgrunnlaget for å lansere skrives til et dokument ingen leser.** Det er ikke et forvaltningshull — det er et lanseringshull.

### Firedelingen bestillingen ber om

**Flytt innholdet ut av koden** *(størst gevinst, lavest pris)*
Øvelser og programmer til `/exercises`-samlingen som allerede er definert og regulert. Da blir en skrivefeil en dataendring, ikke en utrulling. Dette er den ene endringen som gjør resten billigere.

**Koble til noe som finnes**
Feilrapportering: GlitchTip kjører allerede i samme hjemmelab og er Sentry-API-kompatibelt. Ikke bygg et feildashbord — koble på. *(Merk fra en annen revisjon i dag: fem prosjekter i laben rapporterer allerede dit, men avhengigheten var usynlig i arkitekturgrafen fordi port 8000 var feilattribuert. Verdt å vite at koblingen er velprøvd.)*

**Hold det i terminalen**
Innholdshelse — program som peker på øvelser som ikke finnes, bilder som mangler, persona uten klipp. Dette er et skript som kjører i CI, ikke et grensesnitt. Nettopp den feilklassen har fått stå lenge her uten å bli oppdaget, og en rød test oppdager den billigere enn et dashbord noen må huske å åpne.

**Bygg eget** *(minst mulig)*
Kun to ting: personvern (finn, eksporter, slett for én bruker, med dokumentasjon) fordi det er lovpålagt og ingen andre verktøy kjenner datamodellen — og et sted å lese `perf`. Det siste kan være en enkel visning, ikke et dashbord.

**Ikke bygg:** et generelt driftsdashbord. Firebase-konsollen svarer allerede på «er appen frisk». Å duplikere den er ny kode uten ny innsikt.

**Bildekuratoren er synlig for enhver innlogget bruker.** Det er et funn i seg selv og bør lukkes uavhengig av alt annet.

---

## 5. Del 7 — Læringssløyfer

### Sløyfekart

| Innsamling | Går til | Endrer noe? |
|---|---|---|
| Øktvurdering (for lett/passe/for tungt) | `global_stats/ratings` | Leses tilbake — men **vises**, styrer ikke progresjon |
| Personlige rekorder | Lokalt + historikk | Vises |
| Øvelsesbruk | `global_stats/exercises` | Vises i biblioteket |
| Ytelse / lydavvik | `global_stats/perf` | **Åpen ende** |
| Engasjement | `global_stats/engagement` | **Åpen ende** |
| Tellere | `counter_*` | **Åpen ende** |

**Halvparten av innsamlingen er åpne ender.** Etter bestillingens egen definisjon er det ikke sløyfer — det er kostnad. Og for `perf` er det verre enn kostnad, siden lanseringsbeslutningen henger i det.

Selv de «lukkede» sløyfene er svake: vurderingen «for tungt» leses tilbake og *vises*, men den endrer ikke hva du får neste gang. Systemet spør hvordan det gikk, og gjør ingenting med svaret.

### Minste inngrep, i rekkefølge

1. **Les `perf`.** Dataene finnes. Én visning gjør lanseringskriteriet observerbart. Null ny innsamling.
2. **La «for tungt» påvirke neste økt.** Dataene finnes per bruker. Reduser ett hakk i varighet eller runder ved to påfølgende «for tungt». Regelbasert, offline, ingen modell.
3. **Fortell brukeren at det skjedde.** «Du syntes forrige var tung — denne er kortet ned.» En tilpasning som skjer usynlig oppleves ikke som intelligens, men som uforutsigbarhet.

### Moonshots med fundament

**A. Progresjon som følger av vurdering, ikke av kalender.** *Fundament:* vurderingsdata + historikk finnes. *Krever først:* punkt 2 over. *Vanskelig å kopiere:* fordi det krever den norske treningsfaglige kalibreringen dere allerede har lagt i øvelsesbeskrivelsene.

**B. Kontekstbevisst coaching fra klipp som allerede finnes.** *Fundament:* hybriden finnes i miniatyr (broklipp + øvelsesnavn). *Krever først:* at kontekstvariablene runde/gjenstående/forrige-vurdering eksponeres til lydlaget. *Vanskelig å kopiere:* fire dialektstemmer.

**C. Innholdshelse som CI-port.** *Fundament:* alt innhold er i repoet i dag. *Krever først:* innholdet ut av koden (Del 6). *Vanskelig å kopiere:* ikke særlig — men det er billig og fjerner en feilklasse permanent.

---

## 6. Tilbakemelding på bestillingen

**Endringene etter forrige runde virket.** Panelfiksjonen er borte, og det gjorde rapporten ærligere — jeg kunne skrive «her trekker to hensyn i hver sin retning» framfor å tildele meningen til en oppdiktet person. Flyttingen av Del 5→7 var riktig; den hører hjemme sammen med kodelesingen.

**Det som fungerte særlig godt:**
- **«Verifiser mot kilden — ikke gjett fra hukommelsen hvilke modeller som finnes.»** Den setningen fikk meg til å slå opp, og det avdekket at to av våre egne vault-dokumenter oppgir LTX med 17× forskjell. Uten kravet ville jeg sitert bestillingens tall og aldri sett det.
- **«Hva må være sant for at anbefalingen skal holde, og hva ville fått deg til å ombestemme deg.»** Dette er det beste enkeltgrepet i begge bestillingene. Det tvinger fram falsifiserbarhet og gjør anbefalingene reviderbare senere.
- **Motspørsmålene** («gjør mer coaching produktet bedre, eller bare mer masete?», «et eget dashbord som duplikerer verktøy dere har er ny kode uten ny innsikt») gjorde at jeg anbefalte *mindre* enn jeg ellers ville. Det er sjelden i en revisjonsbestilling.

**Det som er vanskelig:**
- **Del 3 og 5 krever fysiske enheter.** Bestillingen ber om «teknisk realitetssjekk» av lydfokus, autoplay og Web Bluetooth. Det kan ikke besvares holdbart fra kildelesing — det må måles på en iPhone og en Android. Bestillingen bør si det, ellers får dere lærebokgjengivelse i revisjonsform. Det er verre enn ingenting, fordi det ser ut som funn.
- **Omfanget er igjen stort.** Ni leveransepunkter der to krever utstyr revisoren kanskje ikke har, og resten krever dyp kodelesing. Vurdér å dele B i «B1 — produksjon og lisens» (Del 1, 2, 4) og «B2 — plattform og forvaltning» (Del 3, 5, 6, 7). De har ulik metode og ulikt utstyrsbehov.
- **Kapasitetstabellen i bestillingen bør oppgi kilde per rad.** Da hadde avviket jeg fant vært synlig for dere før dere sendte den.
- **«Ingen valg er fredet»** er befriende, men kolliderer litt med at Beslutning 46 eksplisitt ikke skal flagges uten å leses. Det er rimelig — men da er noe *nesten* fredet, og det bør sies som «disse er avgjort nylig, les vurderingen først» framfor å ligge som en praktisk merknad i følgebrevet.

**Ett spørsmål bestillingen ikke svarer på:** hva er tidshorisonten for «inntektsambisjonen er ikke lagt død»? Flux-gjelden koster nesten ingenting å innfri nå og mye senere, men jeg kan ikke anbefale når uten å vite om det er seks måneder eller tre år.

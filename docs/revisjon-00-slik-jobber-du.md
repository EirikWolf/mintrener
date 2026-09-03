# Slik gjennomfører du revisjonen

Les denne først. Den gjelder alle tre bestillingene og forklarer metode, leserekkefølge og leveranseform. Bestillingen din sier *hva* du skal vurdere; dette dokumentet sier *hvordan*.

---

## 1. Velg bestilling

Du er hyret til én av tre. De har ulik metode og ulikt utstyrsbehov — ikke bland dem.

| Bestilling | Handler om | Krever |
|---|---|---|
| [`revisjon-A-opplevelse.md`](revisjon-A-opplevelse.md) | Alt brukeren møter: grensesnitt, flyt, tilgjengelighet, tekst, varsling | Å bruke appen. Helst en ekte telefon |
| [`revisjon-B1-produksjon.md`](revisjon-B1-produksjon.md) | Bilder, video, stemme, lyd, lisenser, produksjonslinjer | Kildelesing. Lyd bør kunne spilles av |
| [`revisjon-B2-plattform.md`](revisjon-B2-plattform.md) | Modellvalg, PWA mot native, forvaltning, læringssløyfer | Kildelesing. Enkelte spørsmål krever fysisk enhet |

Systemet ligger live på **https://mintrener.web.app** og i **`github.com/EirikWolf/mintrener`** (offentlig). Repoet er også åpent lokalt.

---

## 2. Rekkefølgen — og hvorfor den er slik

### Revisjon A: bruk før du leser

**Fase 1 — appen, før én kildefil.** Gjennomfør en hel økt. Lag en egen øvelse. Bygg et program. Prøv å finne igjen noe du lagret. Skriv ned alt du lurer på, også det som virker for dumt å spørre om.

Grunnen er ikke pedagogisk: **notatlisten kan ikke rekonstrueres etterpå.** I det øyeblikket du forstår hvorfor noe er som det er, slutter du å se at det er rart. Dette er den eneste fasen som er umulig å ta igjen.

**Fase 2 — kravene.** Les [`trening-app-spesifikasjon.md`](trening-app-spesifikasjon.md), særlig kapittel 1 (prinsipper), 2 (plattformforbehold), 4 (grensesnittkrav) og 5 (sikkerhet og personvern). Nå vet du hva systemet skulle bli, og kan skille «feil» fra «bevisst valgt».

**Fase 3 — koden.** Nå, og først nå, forankrer du funnene. Bruk kildekoden til å forklare *hvorfor* noe er som det er — etter at du har observert *at* det er det.

**Fase 4 — tidligere revisjoner, som kryssjekk.** Se § 4.

### Revisjon B1 og B2: kilder fra start

Her er det ingen observasjonsfase å beskytte. Les fritt, men i denne rekkefølgen:

1. **Bestillingen din**, inkludert seksjonen om å forkaste premisset
2. **[`DECISIONS.md`](DECISIONS.md)** — 48 beslutninger med begrunnelse. Den viktigste enkeltfilen for å forstå *hvorfor* noe ble som det ble. Les i det minste de siste 15
3. **Kildekoden** for området du reviderer
4. **Vedleggene** som bestillingen peker på — A (bildepipeline) for B1, C (konkurrentanalyse) for begge
5. **Tidligere revisjoner**, sist

---

## 3. Kildehierarki: hva som gjelder når dokumenter motsier hverandre

Dette har vi gått på to ganger, og begge kostet oss beslutninger bygget på feil premiss.

**Rangeringen, sterkeste først:**

1. **Kjørende kode og faktisk måling.** Det som skjer er sterkere enn det som står skrevet
2. **Primærkilden.** Lisensteksten selv, ikke et sammendrag av den
3. **Dokument med oppgitt målemetode og dato.** En benchmark som sier hva den målte og når
4. **Spesifikasjon og vedlegg.** Hva som var intensjonen
5. **Katalog- og oversiktsdokumenter.** Nyttige, men de taper informasjon

To konkrete tilfeller å lære av:

> **Flux-lisensen.** Fire dokumenter slo fast at bildene måtte regenereres den dagen appen gir inntekt. Lisensteksten sier det motsatte — utdataene er kommersielt frie, det er kjøring av modellen som er sperret. Ingen hadde lest kilden. Se Beslutning 48.

> **LTX-ytelsen.** Benchmarken oppgir 70 sekunder per klipp med målemetode og dato. Tjenestekatalogen oppgir ~4 sekunder uten. Benchmarken vant, og katalogen skal rettes.

**Regelen:** finner du en motsigelse, rapporter den som funn — også når den ikke berører spørsmålet ditt. Et feil tall i et delt dokument koster mer enn en feil i denne appen, fordi andre prosjekter regner med det.

---

## 4. Tidligere revisjoner leses SIST

Fire revisjoner er gjennomført. De ligger i `docs/` som `revisjon-*-funn-*.md`.

**Ikke les dem før du har dannet ditt eget inntrykk.** Grunnen er ankring: har du lest at noen fant tre problemer på startskjermen, ser du de tre — ikke det fjerde.

Når du leser dem til slutt, rapporter eksplisitt:

- Hva så du som de ikke så?
- Hva er du uenig i, og hvorfor?
- Hvilke funn står fortsatt åpne, og hva sier det om hvordan vi jobber?

Det siste punktet har vært mer verdifullt enn funnlistene.

---

## 5. Dokumentene du trenger — og de du kan hoppe over

`docs/` har over tretti filer. Disse er relevante:

| Fil | Når |
|---|---|
| `trening-app-spesifikasjon.md` | Alltid. Kravene systemet måles mot |
| `DECISIONS.md` | Alltid. Hvorfor ting ble som de ble |
| `vedlegg-c-konkurrentanalyse-og-neste-fase.md` | Alltid, særlig § C.6 «hva vi ikke skal la oss friste til» |
| `vedlegg-a-bildepipeline.md` | B1 |
| `vedlegg-b-microtrening-og-programmer.md` | A og B2 |
| `databehandlere.md` | Personvernspørsmål |
| `foermerge-sjekk.md` | Forstå hvilke feilklasser vi allerede fanger automatisk |
| `revisjon-*-funn-*.md` | Sist, som kryssjekk |

**Hopp over** interne arbeidsdokumenter: `arbeidsordre-*`, `plan-*`, `spec-b3-*`, `spec-c1c2-*`, `kitor-*`, `manuskript-*`, `innlesing-*`, `gjenopptakelse-*`. De er øyeblikksbilder fra utviklingen og vil forvirre mer enn de opplyser. Trenger du dem, peker bestillingen på dem.

---

## 6. Slik leverer du

**Filnavn:** `docs/revisjon-<A|B1|B2>-funn-<ÅÅÅÅ-MM-DD>.md`

**Åpne med en dekningsseksjon.** Før alt annet: hva du dekket, hva du ikke rakk, og hva du bevisst lot stå. Leseren skal aldri lure på om et tomt område betyr «ingen funn» eller «ikke undersøkt».

**Struktur:**

1. **Dekning** — hva som er gjort, hva som gjenstår, hvilke metodeforbehold som gjelder
2. **Sammendrag** — én til to sider. Den viktigste innsikten, og de faglige motsetningene du støtte på, med begge sider
3. **Svar på bestillingens spørsmål** — i bestillingens rekkefølge
4. **Funnliste** — sortert *blokker / alvorlig / moderat / polering*
5. **Bestillingens øvrige leveransepunkter** — se din bestilling
6. **Kryssjekk mot tidligere revisjoner**
7. **Tilbakemelding på bestillingen** — hva var uklart, hva lot seg ikke besvare, hva burde vært formulert annerledes

Punkt 7 er ikke høflighet. Det har endret måten vi jobber på etter hver eneste kjøring.

**Per funn:**

> **Observasjon** — hva du så eller målte, med fil og linje der det er relevant
> **Begrunnelse** — hvilket rammeverk eller lovkrav som gjør det til et problem
> **Konsekvens** — hva det koster brukeren
> **Forslag** — hva du ville gjort
> **Innsats** — grovt anslag

---

## 7. Krav til arbeidet

**Mål framfor anslå.** Kontrastforhold, piksler, antall trykk, filstørrelse, sekunder. Oppgi tallet og hvordan du målte det.

**Skill observasjon fra vurdering.** «Knappen er 20×20 px» er en observasjon. «Den er for liten» er en vurdering med et krav bak. Hold dem fra hverandre.

**Verifiser før du påstår.** Et riktig svar av feil grunn er ikke et verifisert funn. Kommer du til en konklusjon uten å ha utelukket den nærliggende alternative forklaringen, si det.

**Si hva som er bra.** Vi trenger å vite hva som ikke må røres i en opprydding. En tidligere revisjon fant null kontrastbrudd på startskjermen — det funnet hindret en unødvendig «opprydding».

**Vær kritisk, men gi alltid et forslag.** Foreslår du å fjerne noe, si hva som dekker behovet i stedet.

**Si fra når du ikke kan svare.** Kan du ikke måle på fysisk enhet eller høre lyd, skal spørsmålet stå ubesvart. En lærebokgjengivelse i revisjonsform er verre enn et hull, fordi den ser ut som et funn og blir behandlet som ett.

---

## 8. Det vi setter høyest

Bestillingene er skrevet av folk som allerede har bygget en løsning, og de bærer preg av det. Spørsmålene tar utgangspunkt i vår tilnærming, og alternativene vi lister er ofte varianter av den.

**Du har mandat til å forkaste premisset.** De mest verdifulle funnene i alle fire kjøringene var av den typen: to kalibreringsspørsmål som bygget på en feilaktig antakelse, en dempingstjeneste som ikke dempet noe, en lisensregning som ikke fantes.

**Vi vil heller ha et godt begrunnet forslag som river opp planen vår, enn en pen gjennomføring av den.**

Må du velge mellom grundig og tydelig: velg tydelig.

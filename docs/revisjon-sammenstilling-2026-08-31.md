# Sammenstilling av revisjonene — status og prioritering

**Dato:** 2026-08-31 · **Grunnlag:** seks rapporter fra 30.–31. august · **Mot:** `main` @ `d57efcc`

| Rapport | Kilde | Linjer |
|---|---|---|
| `revisjon-oppfolging-2026-08-30.md` | intern | 202 |
| `revisjon-B-funn-2026-08-30.md` | Hermes, fundament | 219 |
| `revisjon-B1-funn-2026-08-30.md` | Hermes, produksjon | 256 |
| `revisjon-B2-funn-2026-08-30.md` | Hermes, plattform | 356 |
| `revisjon-A-funn-2026-08-30.md` | ekstern, opplevelse | 332 |
| `revisjon-B2-funn-2026-08-31.md` | ekstern, plattform | 353 |

Ekstern B1 er ikke levert. Dokumentet kompletteres når den kommer.

### Hvorfor bare seks

Fire eldre rapporter er utelatt etter en systematisk gjennomgang mot koden 31. august: `revisjon-2026-08-26.md`, `revisjon-A-funn-2026-08-26.md`, `ui-revisjon-2026-08-27.md` og `systemrevisjon-moonshot-2026-08-28.md`.

Funnene deres er innfridd. Testet i dag: UI-revisjonens seks systemiske tilgjengelighetsfunn er alle lukket — zoom-blokkering, live-regioner, `text-zinc-500`-kontrasten, fokusindikator, `prefers-reduced-motion`, `xs`-breakpointet. Systemrevisjonens «fem som betyr mest» er fire av fem lukket. Den interne revisjonens fem fundamentfunn er alle lukket.

To funn så ut til å overleve, men gjør det ikke som egne punkter:

- **Avslutningsskjermen** som «får det dummeste innholdet» — `localAiCoach.generateWorkoutSummaryFeedback` er nå koblet inn ([WorkoutSummary.tsx:213](../src/components/timer/WorkoutSummary.tsx)). Den gjenstående svakheten, at den leser vurdering fra komponentstate og ikke fra historikk, er dekket av Hermes B2.
- **Delingsattribusjon uten lesere** — `ref=share` telles nå via `recordShareLinkOpen()` ([shareWorkoutService.ts:113](../src/services/shareWorkoutService.ts)). Men tellingen havner i `engagement`, som ingen leser. Det er samme funn som § 3.2, ikke et eget.

At tre revisjoner på rad har fått funnene sine lukket, er i seg selv et resultat verdt å notere.

---

## 1. Den ene innsikten som gjelder alt annet

> **Alle lukkede funn er kodefikser. Alle åpne funn er beslutninger.**

Observasjonen kommer fra ekstern B2, og den holder over alle seks rapportene. Forrige runde fikk sine billigste anbefalinger gjennomført samme dag: død tjeneste slettet, puls-instruks gated, Flux-premisset rettet, førmerge-sjekk bygget. Alt som krevde et *valg* står fortsatt åpent — organisasjonsportalen mot vedlegg C.6, «AI»-navnet på regelbaserte funksjoner, `perf`-telemetrien ingen leser, innhold ut av kildekoden.

Det er ikke latskap. En kodefiks har en åpenbar neste handling; en beslutning har ingen, og taper derfor hver gang den møter en.

**Konsekvens for planen under:** beslutningspunktene er skilt ut som egen kategori. Uten eier og dato gjentar mønsteret seg i neste runde.

---

## 2. Det som er lukket — verifisert i kode i dag

Inkluderer funn fra de fire utelatte rapportene, slik at ingen mister sporet av hva som faktisk ble levert.

| Funn | Først rapportert | Bevis |
|---|---|---|
| `/rooms` kunne listes uautentisert (PII-lekkasje) | intern 30.08 | `allow list: if false`, testet mot prod |
| `global_stats` var verdensskrivbar | systemrev. 28.08 | Feltvalidering og delta-tak i reglene |
| Timeren bodde i React med dobbel sannhet | systemrev. 28.08 | `timerEngine.ts`, framework-fri |
| `requestAnimationFrame` frøs i bakgrunn | intern 26.08 | 0 treff i produksjonskode; worker-metronom |
| HTML5 Audio ga 20–200 ms startlatens | systemrev. 28.08 | `audioBufferEngine.ts` |
| Ingen gestflate under økt | systemrev. 28.08 | `useFocusGestures.ts` |
| Feil ble svelget i `console.warn` | systemrev. 28.08 | `errorToastService.ts` |
| 49 spøkelsesøvelser | intern 30.08 | 0 av 89 referanser; test i CI |
| Kuratoren synlig for alle innloggede | Hermes A og B2 | Funksjonsflagg og lat import, verifisert på prod |
| Flux-lisensen tvang regenerering | Hermes B2 | Lisensteksten lest; Beslutning 48 |
| App Check manglet | intern 26.08 | Implementert med e2e-guard |

**Dette må ikke røres i en opprydding:** null WCAG-kontrastbrudd på startskjermen (målt av to uavhengige revisorer), streak-mekanikkens bevisste fravær av skam, og `prefers-reduced-motion`-håndteringen.

---

## 3. Det som konvergerer — flere revisorer, samme sted

Der uavhengige revisorer peker samme vei, er funnet sterkere enn summen av dem.

### 3.1 Startskjermen bærer for mye — tre av seks, og to utelatte

Ekstern A ga det et navn: **«akkumulering fremfor arkitektur»** — hver ny funksjon har fått sin egen knapp, og startskjermen er blitt et kontrollpanel med over tjue klikkbare mål.

Hermes B2 fant det samme fra kodesiden, og intern oppfølging målte kollisjonen mellom nedtelling og favorittliste. De to utelatte rapportene pekte samme vei — UI-revisjonen fant tolv trykkflater i topplinjen «som bør ha fire».

Diagnosen er enstemmig på tvers av fire uavhengige lesninger, og ekstern A har levert en konkret soneinndeling å bygge etter.

### 3.2 Telemetrien skriver til et dokument ingen leser — tre rapporter

`perf` og `engagement` skrives, men leses aldri. `perf` er der lydavvik-bøttene bor — go/no-go-kriteriet for lansering, som `gjenopptakelse-2026-08-30.md` selv utpeker.

Hermes' ramme er skarpest: **dette er ikke et forvaltningshull, det er et lanseringshull.** Minste inngrep er ett kall, ikke et dashbord.

### 3.3 Innhold er blitt en utviklingsoppgave — to rapporter

Øvelser og programmer ligger hardkodet i TypeScript. Å rette en skrivefeil i en instruks krever kodeendring, review, bygg og utrulling. Firestore-reglene definerer en `exercises`-samling merket «kun backend/admin kan endre» — som appen aldri leser. Datamodellen forutsetter et forvaltningslag som aldri ble bygget.

Hermes' hypotese er verdt å ta på alvor: derfor sto biblioteket stille på 25 øvelser mens 33 nye tjenester ble bygget.

---

## 4. Det alvorligste nye: dokumentlaget overrapporterer

Ekstern B2 fant fire tilfeller der koden motsier vår egen dokumentasjon — **alle i samme retning, «mer ferdig enn sant»**. Verifisert i dag:

| Vår påstand | Målt |
|---|---|
| Beslutning 40: eksporten er «fullstendig» GDPR art. 20 | Leser **9 av 32** nøkler. Fødselsår — merket «Personopplysning» i vårt eget register — mangler |
| Beslutning 39: «100 % referanseintegritet» | `organizationService` peker på to utfordringer som ikke finnes |
| Beslutning 44: «klar B2B-infrastruktur» | `getOrganizationStats` returnerer alltid 8 medlemmer, 142 minutter. Kommentaren sier «Simulerer» |
| `backlog.md`: åtte epiker grønne, «komplett, moden» | Push finnes ikke, Cloud Functions finnes ikke, `perf` leses ikke |

Samme feilklasse som Flux-lisensen og LTX-tallet — men nå drifter **prosjektets egen beslutningslogg**. Det er farligere, fordi metodedokumentet utpeker `DECISIONS.md` som viktigste kilde til *hvorfor*. En fremtidig sesjon som stoler på Beslutning 40, vil svare feil på en innsynsforespørsel.

**Rotårsaken er presist formulert:** kvalitetsapparatet verifiserer feil lag. 820 tester bekrefter at koden gjør det koden sier. Ingenting bekrefter at påstandene *om* koden stemmer.

To hull i apparatet, begge verifisert i dag: førmerge-sjekken **kjøres ikke i CI**, og referanseintegritetstesten **dekker ikke `organizationService`** — som er nettopp derfor de to spøkelsene slapp gjennom.

---

## 5. Prioritert plan

### Nå — timer, ikke dager

| # | Tiltak | Kilde | Hvorfor først |
|---|---|---|---|
| 1 | Utvid referanseintegritetstesten til `organizationService` | ekstern B2 | To spøkelser står i prod nå. Testen finnes; den mangler én samling |
| 2 | Kjør `npm run sjekk` i CI | ekstern B2 | Verktøyet finnes, men ingen kjører det |
| 3 | Test som asserterer at eksporten dekker `STORAGE_KEYS` | ekstern B2 | ~15 linjer. Ville gjort Beslutning 40 usann i CI samme dag |
| 4 | Fjern «Simulerer»-tallene fra organisasjonsportalen | ekstern B2 | Oppdiktede tall vist som ekte statistikk er verre enn ingen statistikk |

### Før lansering

| # | Tiltak | Kilde | Merknad |
|---|---|---|---|
| 5 | Tilbakeknapp under aktiv økt (`popstate`) | ekstern A | Verifisert: 0 treff i kodebasen. Brukeren mister økten ved uhell |
| 6 | Les `perf`-telemetrien | Hermes B og B2 | Ett kall. Uten det er lanseringsbeslutningen udokumentert |
| 7 | Fullfør dataeksporten | ekstern B2 | GDPR art. 15/20. Forrige fiks rettet nøklene, ikke dekningen |
| 8 | Rydd startskjermen etter ekstern As soneinndeling | fire rapporter | Den mest brukersynlige enkeltendringen |
| 9 | Trykkflater under 44 px i topplinjen | UI-rev. og ekstern A | Fire knapper på 32 px, delingsknapp på 20 px |
| 10 | iPhone-felttest | alle | Aldri gjennomført. iOS er risikoplattformen |

### Beslutningspunkter — trenger eier og dato, ikke kode

Disse har stått åpne gjennom flere revisjoner fordi ingen av dem har en åpenbar neste handling.

| # | Spørsmål | Åpent siden |
|---|---|---|
| B1 | Skal organisasjonsportalen finnes? Vedlegg C.6 lister den under «hva vi ikke skal la oss friste til» | 30.08 |
| B2 | Skal regelbaserte funksjoner slutte å kalle seg «AI»? | 30.08 |
| B3 | Skal innhold ut av kildekoden — og i så fall hvor? | 30.08 |
| B4 | Skal H3-lisensen leses ferdig? Én dag kan åpne eneste videomodell med lyd | 30.08 |
| B5 | Skal demping bygges i det hele tatt? Tjenesten er inert i dag | 30.08 |
| B6 | Skal `backlog.md` skrives om? Den rapporterer åtte epiker grønne som ikke er det | 31.08 |

### Neste kvartal

Bevegelse i øvelseskortene — start med kryssing av de to bildene som allerede finnes, som koster null GPU og null nye byte. Video kun i biblioteket, aldri under økt. Kontekstbevisst coaching uten nye klipp. Øvelsesbiblioteket publisert som fritt datasett.

### Fjern eller frys

`groupStatsService` og `communityStatsService` er slettet. Vurder også ferdighetstreet (24 av 28 nivåer pekte på spøkelser før opprydding) og organisasjonsportalen, i påvente av B1.

---

## 6. Om metoden — det som endret arbeidsformen

Tre av fem revisjoner hadde sitt tyngste funn i kode skrevet **i mellomtiden**, ikke i gammel gjeld. Hermes' konklusjon var at revisjon er feil verktøy for den feilklassen: for dyrt, og uker for sent.

Førmerge-sjekken ble bygget etter det forslaget, og fant umiddelbart en GDPR-bug fem revisjoner hadde gått forbi — eksporten leste feil historikk-nøkkel, og tomme felt så ut som «ingen data».

Ekstern B2 tar det ett skritt videre, og forslaget bør adopteres: **hver Beslutning som inneholder «fullstendig», «100 %», «klar» eller «fullført» skal peke på kommandoen som beviser det.**

Det er den billigste forsikringen mot at neste revisjon igjen bruker halve kapasiteten på å oppdage at dokumentasjonen lyver.

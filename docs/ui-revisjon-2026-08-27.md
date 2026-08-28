# UI-revisjon: Min Trener

**Dato:** 27. august 2026
**Versjon revidert:** v1.3.0
**Omfang:** Hele løsningen — førsteside (Timer), alle undersider, undermenyer og modaler
**Metode:** Statisk kodegjennomgang av `src/components/**` (38 komponenter, 9 623 linjer), `index.html` og `src/index.css`, kombinert med utregnede WCAG-kontrastverdier og skjermbilde av førstesiden.

---

## Innhold

1. [Sammendrag](#1-sammendrag)
2. [Slik leser du dokumentet](#2-slik-leser-du-dokumentet)
3. [Systemiske funn — gjelder hele appen](#3-systemiske-funn--gjelder-hele-appen)
4. [Førstesiden (Timer)](#4-førstesiden-timer)
5. [Undersider](#5-undersider)
6. [Modaler og undermenyer](#6-modaler-og-undermenyer)
7. [Samlet ikonrevisjon](#7-samlet-ikonrevisjon)
8. [Farger og kontrast](#8-farger-og-kontrast)
9. [Universell utforming — samlet avviksliste](#9-universell-utforming--samlet-avviksliste)
10. [Prioritert arbeidsliste](#10-prioritert-arbeidsliste)
11. [Ikke verifisert / krever manuell test](#11-ikke-verifisert--krever-manuell-test)

---

## 1. Sammendrag

Min Trener har en **god visuell grunnstruktur**: konsekvent mørkt tema, gjennomtenkt komponentradius, tydelig primærfarge, og en fargebruk som stort sett har svært god kontrast (emerald-400 ligger på 10,4:1, amber-400 på 11,9:1 — begge langt over kravet). Timerskjermen er riktig prioritert med stor sirkelmåler og tommelvennlige knapper nederst.

De reelle problemene ligger tre steder:

**A. Topplinjen på førstesiden er overbefolket.** Tolv trykkflater i en 40 piksler høy stripe, hvorav fem er duplikater av innstillinger som allerede finnes under «Mer».

**B. Ikonspråket kolliderer med seg selv.** Fem ikoner brukes til flere ulike betydninger — `Trophy` betyr fire forskjellige ting, `Sparkles` tre, `Dumbbell` tre. To ikoner er direkte semantisk feil: mikrofonen brukes til talesyntese (lyd *ut*), og sol/måne brukes til skjermdvale (leses som mørk modus).

**C. Universell utforming holder ikke lovkravet.** Løsningen er omfattet av forskrift om universell utforming av IKT-løsninger, som krever WCAG 2.1 nivå AA. Jeg fant **fjorten avvik**, hvorav fire er alvorlige: zoom er blokkert, skjemaetiketter er ikke koblet til feltene sine, av/på-bryterne i innstillinger har verken navn eller tilstand for skjermleser, og appen har ingen live-regioner — en blind bruker får null beskjed når timeren skifter fase.

I tillegg fant jeg **fem konkrete feil i koden** som gir synlige defekter i produksjon i dag, blant annet to CSS-klasser som aldri er definert og et Tailwind-breakpoint som ikke finnes, slik at tekstetiketter forsvinner uten spor.

**Ingen av funnene krever omskriving av arkitekturen.** Den tunge jobben er ikonrevisjonen og topplinjen; resten er avgrensede rettinger.

---

## 2. Slik leser du dokumentet

Hvert funn er merket med alvorlighetsgrad:

| Merke | Betydning |
|:--|:--|
| **[A1]** | Lovkrav — dokumentert WCAG-avvik. Må rettes. |
| **[A2]** | Feil — noe fungerer ikke, eller viser feil innhold. |
| **[B]** | Vesentlig UX-problem. Bør rettes. |
| **[C]** | Forbedring / konsistens. Kan rettes når det passer. |

Filreferanser er absolutte, med linjenummer der det er relevant.

---

## 3. Systemiske funn — gjelder hele appen

Disse punktene går igjen i tjue–tretti filer. **Rett dem først** — de fjerner et stort antall enkeltfunn lenger ned i dokumentet på én gang.

### 3.1 [A1] Zoom er blokkert

`C:\dev\mintrener\index.html` linje 6:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
```

`maximum-scale=1.0` og `user-scalable=no` hindrer brukeren i å forstørre teksten. Dette er **brudd på WCAG 2.1 SC 1.4.4 (Endring av tekststørrelse, nivå AA)** og er det avviket som raskest fanges opp i en ekstern revisjon. Det er særlig alvorlig i denne appen, som har over 200 forekomster av tekst på 9–11 piksler.

**Rett til:**

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

`viewport-fit=cover` må beholdes — den styrer safe-area-håndteringen som brukes i bunnmenyen og timerens footer.

### 3.2 [A1] Ingen skjemaetiketter er koblet til feltene sine

Prosjektet har 15 `<label>`-elementer fordelt på 8 filer, og **null forekomster av `htmlFor`**. Ingen av dem er altså programmatisk knyttet til inputfeltet sitt. En skjermleser leser feltet uten å si hva det er.

Berørte filer:

- `C:\dev\mintrener\src\components\library\CreateCustomExerciseModal.tsx` (7 etiketter)
- `C:\dev\mintrener\src\components\micro\MicroWorkoutModal.tsx` (2)
- `C:\dev\mintrener\src\components\builder\WorkoutBuilderView.tsx` (1)
- `C:\dev\mintrener\src\components\calendar\CalendarExportModal.tsx` (1)
- `C:\dev\mintrener\src\components\curator\ExerciseImageCuratorView.tsx` (1)
- `C:\dev\mintrener\src\components\gps\GpsTrackerModal.tsx` (1)
- `C:\dev\mintrener\src\components\group\GroupRoomModal.tsx` (1)
- `C:\dev\mintrener\src\components\strength\StrengthLoggerModal.tsx` (1)

I tillegg har søkefeltet i `ExerciseLibraryView.tsx` linje 144 kun `placeholder` og ingen etikett i det hele tatt.

**Brudd på SC 1.3.1 (Informasjon og relasjoner), SC 3.3.2 (Ledetekster eller instruksjoner) og SC 4.1.2 (Navn, rolle, verdi).**

**Rett:** legg `id` på input og `htmlFor` på label. For søkefelt uten synlig etikett: `aria-label="Søk etter øvelse"` (placeholder er ikke en etikett — den forsvinner når brukeren begynner å skrive).

### 3.3 [A1] Ingen live-regioner i hele appen

Søk etter `aria-live`, `role="status"` og `role="alert"` gir **null treff i hele kodebasen**.

Konsekvensen er størst akkurat der appen har sin kjernefunksjon: **når timeren skifter fra «Klargjøring» til «Jobb» til «Pause», får en skjermleserbruker ingen beskjed.** Talesyntesen (TTS) dekker deler av dette, men den er en separat funksjon som kan være avslått, og den finnes ikke på undersidene.

Det samme gjelder alle statusmeldinger i appen, som i dag er helt stumme:

| Melding | Fil |
|:--|:--|
| «Økten er lagret!» | `WorkoutBuilderView.tsx` |
| «Kopiert!» (deling) | `TimerDisplay.tsx` |
| «Lagret!» (dataeksport) | `SettingsMoreView.tsx` |
| «Registrert!» (økt-vurdering) | `WorkoutSummary.tsx` |
| Søketreff-antall | `ExerciseLibraryView.tsx` |
| «Ingen programmer matcher valgt filter» | `ProgramCatalogView.tsx` |

**Brudd på SC 4.1.3 (Statusbeskjeder, nivå AA).**

**Rett:**
- Legg en `aria-live="assertive"` region rundt fase-badgen og øvelsestittelen i timeren.
- Legg `role="status"` på alle toast-meldinger.
- Legg `role="status"` på resultattelleren i lister som filtreres.

### 3.4 [A1] Av/på-brytere mangler navn, rolle og tilstand

Bryterne i `C:\dev\mintrener\src\components\settings\SettingsMoreView.tsx` er bygget slik:

```tsx
<button
  onClick={handleToggleTelemetry}
  className={`w-11 h-6 rounded-full ... ${telemetryEnabled ? 'bg-emerald-500' : 'bg-zinc-700'}`}
>
  <div className={`w-5 h-5 rounded-full bg-white ...`} />
</button>
```

Knappen har ingen tekst, ingen `aria-label`, ingen `role="switch"` og ingen `aria-checked`. En skjermleser annonserer den som **«knapp»** — uten navn og uten å si om den er på eller av. Dette gjelder samtlige brytere på Mer-siden: lyd, tale, vibrasjon, dvale og telemetri-samtykke.

Det samme mangler på de ni bryterne i timerens topplinje (`TimerDisplay.tsx` linje 288–384). Der endres riktignok `aria-label` etter tilstand, men mønsteret er inkonsekvent: lydknappen beskriver *handlingen* («Slå av lyd») mens dvaleknappen beskriver *tilstanden* («Skjerm holdes på»). Den siste er direkte misvisende — en knapp som heter «Skjerm holdes på» høres ut som den slår det på, ikke av.

**Brudd på SC 4.1.2 (Navn, rolle, verdi).**

**Rett — bruk samme mønster overalt:**

```tsx
<button
  role="switch"
  aria-checked={telemetryEnabled}
  aria-label="Del anonym bruksstatistikk"
  onClick={handleToggleTelemetry}
>
```

Med `role="switch"` skal `aria-label` alltid være **funksjonens navn**, aldri handlingen eller tilstanden — tilstanden kommer fra `aria-checked`.

### 3.5 [A1] `text-zinc-500` gir for lav kontrast, og brukes i 24 filer

`text-zinc-500` (#71717a) gir:

- **4,12:1** mot `bg-zinc-950` — kravet er 4,5:1 → **avvik**
- **3,67:1** mot `bg-zinc-900` — kravet er 4,5:1 → **avvik**

Fordeling (antall forekomster):

```
SettingsMoreView.tsx        11    ExerciseImageCuratorView.tsx  3
TimerDisplay.tsx             7    WorkoutBuilderView.tsx        3
BottomNav.tsx                6    + 15 andre filer med 1-2 hver
ProfileOnboardingModal.tsx   4
ExerciseLibraryView.tsx      3
WorkoutHistoryView.tsx       3
```

Verst i `BottomNav.tsx`, der de inaktive fanene bruker `text-zinc-500` **på 9 piksler tekst**. Kombinasjonen liten tekst, lav kontrast og blokkert zoom (punkt 3.1) gjør bunnmenyen praktisk talt uleselig for en bruker med nedsatt syn.

**Brudd på SC 1.4.3 (Kontrast, minimum).**

**Rett:** global erstatning `text-zinc-500` → `text-zinc-400` (7,76:1 — god margin). Behold `zinc-500` kun på rent dekorative ikoner som ikke bærer informasjon.

### 3.6 [A1] Ingen synlig fokusindikator, og `focus:outline-none` uten erstatning

Prosjektet har **ingen `focus-visible`-stiler**. Samtidig fjerner 14 inputfelt nettleserens fokusring med `focus:outline-none` og erstatter den kun med en endret rammefarge på 1 piksel. Alle knapper — og det er flere hundre — har ingen fokusbehandling i det hele tatt.

**Brudd på SC 2.4.7 (Synlig fokus)** for skjemafeltene, og en betydelig risiko for SC 2.4.11 (Fokusutseende).

**Rett — legg i `C:\dev\mintrener\src\index.css`:**

```css
@layer base {
  :where(button, a, input, textarea, select, [tabindex]):focus-visible {
    outline: 2px solid #34d399;
    outline-offset: 2px;
    border-radius: inherit;
  }
}
```

Og fjern `focus:outline-none` fra inputfeltene, eller behold det og legg til en tydelig `focus-visible:ring-2 focus-visible:ring-emerald-400`.

### 3.7 [A1] `prefers-reduced-motion` er ikke håndtert

Ingen treff på `prefers-reduced-motion`, `motion-safe` eller `motion-reduce` i kodebasen. Samtidig kjører flere animasjoner i **evig løkke uten stoppmulighet**:

| Animasjon | Fil |
|:--|:--|
| `animate-pulse` på Astrid-ikonet i topplinjen | `TimerDisplay.tsx:381` |
| `animate-pulse` + `ring` på stemmestyring når aktiv | `TimerDisplay.tsx:307` |
| `animate-ping` på timer-fanens aktivitetsprikk | `BottomNav.tsx:32` |
| `animate-pulse` på hjertet i pulsvisningen | `HeartRateWidget.tsx:103` |
| `animate-bounce` på «NY PERSONLIG REKORD» | `WorkoutSummary.tsx:66` |

**Berører SC 2.2.2 (Pause, stopp, skjul)** og er et vanlig krav i norske UU-revisjoner.

**Rett — legg i `index.css`:**

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 3.8 [A1] Språkkoden er statisk

`index.html` har `<html lang="no">`, som aldri oppdateres. Appen har språkvelger for bokmål, nynorsk og engelsk (`SettingsMoreView.tsx`, seksjonen «Lyd, tale & skjerm»), men `lang`-attributtet følger ikke med. En skjermleser leser engelsk innhold med norsk uttale, og motsatt.

I tillegg er `no` en makrokode. Bruk de spesifikke kodene.

**Brudd på SC 3.1.1 (Språk på siden).**

**Rett:** sett `document.documentElement.lang` til `nb`, `nn` eller `en` ved språkbytte, og endre standardverdien i `index.html` til `nb`.

### 3.9 [A2] To CSS-klasser som aldri er definert

Koden bruker to ulike navn for samme ikke-eksisterende hjelpeklasse:

| Klasse | Brukt i | Definert? |
|:--|:--|:--|
| `no-scrollbar` | `TimerDisplay.tsx` (5 steder) | **Nei** |
| `scrollbar-none` | `ProgramCatalogView.tsx`, `ExerciseLibraryView.tsx` | **Nei** |

Verken `index.css` eller noen Tailwind-config definerer dem. Resultatet er **synlige, ustilede scrollbarer** — det er nettopp den grå stripen under chip-raden på førstesiden i skjermbildet.

**Rett — velg ett navn og definer det i `index.css`:**

```css
@utility no-scrollbar {
  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar { display: none; }
}
```

Bytt deretter `scrollbar-none` → `no-scrollbar` i de to andre filene.

> **Merk:** Å skjule scrollbaren er i seg selv et tveegget valg. Den er den eneste visuelle indikasjonen på at det finnes mer innhold til høyre. Se punkt 4.3 for anbefalt alternativ.

### 3.10 [A2] Tailwind-breakpointet `xs` finnes ikke

Prosjektet kjører Tailwind v4 via `@import "tailwindcss"` i `index.css`, **uten `@theme`-blokk og uten `tailwind.config`**. Breakpointet `xs` er derfor udefinert, og alle `xs:`-klasser droppes stille under kompilering.

| Sted | Konsekvens |
|:--|:--|
| `TimerDisplay.tsx:622` — `hidden xs:inline` på «Alle» | Teksten vises **aldri**. Bare en naken `>`-pil står igjen ved siden av chip-raden. |
| `PwaInstallPromptModal.tsx:143` — `hidden xs:inline` på «Installer» | Teksten vises aldri. Knappen er en 20 px grønn prikk uten forklaring. |
| `TimerDisplay.tsx:722` — `text-xl xs:text-2xl sm:text-3xl` | Mellomtrinnet mangler; faller tilbake til `text-xl`. |
| `CircularProgress.tsx:65` — `max-w-[240px] xs:max-w-[270px]` | Mellomtrinnet mangler. |

Begge de to første er direkte synlige i skjermbildet av førstesiden.

**Rett — enten definer breakpointet:**

```css
@theme {
  --breakpoint-xs: 400px;
}
```

**eller** fjern `hidden xs:inline` slik at etikettene alltid vises (anbefalt for de to knappene — se punkt 4.2 og 7).

---

## 4. Førstesiden (Timer)

**Fil:** `C:\dev\mintrener\src\components\timer\TimerDisplay.tsx` (1 004 linjer)

### 4.1 [B] Topplinjen har tolv trykkflater — den bør ha fire

Slik ser topplinjen ut i dag:

```
[brukermeny] [Min Trener] [?]        [installer] [puls] [ 🎙 🤖 ☀ 🔊 📳 📺 ✨ 📊 🔒 ]
```

Det er **tolv trykkflater i en stripe på cirka 40 piksler**, der de ni siste er 26 × 26 piksler med 2 pikslers mellomrom.

Det avgjørende argumentet er at dette i stor grad er duplikater. `SettingsMoreView.tsx` har allerede seksjonen «Lyd, tale & skjerm» med nøyaktig de samme bryterne for **lyd, tale, vibrasjon og dvale**, og seksjonen «Sensorer & Maskinvare» dekker **sensorstatus**. Fem av ni knapper i topplinjen er altså en andre kopi av innstillinger som allerede har et hjem — med to kodeveier som må holdes i synk.

Filteret bør være: *trenger jeg denne midt i en økt, med én hånd, uten å tenke?*

| Ikon | Anbefaling | Begrunnelse |
|:--|:--|:--|
| Lås | **Behold** | Må nås i det øyeblikket mobilen legges ned. Eneste knappen med reell hastverk. |
| Lyd av/på | **Behold** | Eneste innstillingen som må endres akutt — kontoret, bussen, andre til stede. |
| Puls | **Behold betinget** | Vis kun når pulsbelte faktisk er tilkoblet. Ellers er den dødvekt. |
| Dvale | → Mer | Settes én gang. Ligger allerede i Mer. |
| Vibrasjon | → Mer | Settes én gang. Ligger allerede i Mer. |
| Tale | → Mer | Settes én gang. Ligger allerede i Mer. |
| Stemmestyring | → Mer | Slå på der. Vis kun en liten «lytter»-indikator i toppen mens den er aktiv. |
| TV/storskjerm | → Mer | Instruktørfunksjon. Settes opp *før* økten, av et lite mindretall. |
| Sensorstatus | **Fjern** | Rent duplikat av Mer-raden «Sensordiagnostikk & Pulsbelte». |
| Astrid AI-trener | → chip-raden | Dette er en hovedfunksjon. Den fortjener en chip med lesbar tekst, ikke en 26 px prikk mellom åtte andre. |
| Installer | → Mer + engangsbanner | Permanent plass til en engangshandling. Og etiketten vises aldri (punkt 3.10). |
| ? Hjelp | → Mer | Ligger allerede der: «Hjelpeguide & funksjoner». |

**Foreslått topplinje:**

```
[brukermeny] [Min Trener]                          [puls 142] [lyd] [lås]
```

Fra tolv til fire. Da er det plass til **44 × 44 piksler** per knapp i stedet for 26 — som er både Apples og Googles anbefaling, og som gir god margin til det kommende kravet i WCAG 2.2 SC 2.5.8.

### 4.2 [A1] Trykkflater under minstemålet

| Element | Faktisk størrelse | Fil |
|:--|:--|:--|
| «?»-knappen | **20 × 20 px** | `TimerDisplay.tsx:268` (`w-5 h-5`) |
| Installer-pillen | ca. **20 × 16 px** | `PwaInstallPromptModal.tsx:140` |
| Ni brytere i topplinjen | 26 × 26 px, 2 px mellomrom | `TimerDisplay.tsx:288–384` |
| Chip-raden («AI Økt» osv.) | ca. 18 px høy | `TimerDisplay.tsx:562–614` |

WCAG 2.2 SC 2.5.8 krever 24 × 24 CSS-piksler. De to første er **under**; de to siste ligger så vidt over uten margin.

> **Juridisk status:** WCAG 2.2 er ennå ikke tatt inn i den norske forskriften, som per i dag peker på WCAG 2.1. Kriteriet er imidlertid del av EN 301 549 og kommer inn ved neste revisjon. Rydder du topplinjen som beskrevet i 4.1, løses dette som en bieffekt.

### 4.3 [B] Chip-raden skjuler halvparten av innholdet sitt

Raden har sju chips — AI Økt, Ferdighet, Styrke, Utfordring, Micro, GPS, Gruppe — i horisontal scroll. **Bare fire er synlige**, og med Astrid flyttet ned hit blir det åtte. Det som ligger bak scroll-kanten blir i praksis aldri oppdaget. Micro, GPS og Gruppe er reelle funksjoner som i dag er usynlige for de fleste brukere.

Forsterkende faktorer:

- Scrollbaren skulle vært skjult, men klassen finnes ikke (punkt 3.9) — så den vises som en grå stripe.
- «Alle»-lenken til høyre viser aldri teksten sin (punkt 3.10) — bare en `>`-pil uten forklaring.

**Anbefaling:** bytt `overflow-x-auto` mot `flex-wrap` og la raden brytes over to linjer. Vertikal plass er billigere enn oppdagbarhet. Alternativt: behold scroll, men legg på en fade-maske i høyre kant som visuelt lover at det finnes mer.

### 4.4 [A1] «Mer»-fanen: ledetekst stemmer ikke med navnet

`C:\dev\mintrener\src\components\navigation\BottomNav.tsx` linje 96–107:

```tsx
aria-label="Gå til Innstillinger"   // tilgjengelig navn
...
<Settings className="w-4 h-4" />     // tannhjul-ikon
<span>Mer</span>                     // synlig tekst
```

Det tilgjengelige navnet **inneholder ikke** den synlige teksten «Mer». En bruker med talestyring som sier «trykk Mer» treffer ingenting.

**Brudd på SC 2.5.3 (Ledetekst i navn).**

Ikonet forsterker forvirringen: tannhjul lover «Innstillinger», teksten sier «Mer».

**Rett — velg én linje:**
- Enten `Ellipsis`-ikon + «Mer» + `aria-label="Mer"`
- Eller `Settings`-ikon + «Innstillinger» + `aria-label="Innstillinger"`

De øvrige fem fanene er i orden: «Program» er en delstreng av «Gå til Programmer», «Bygg» av «Gå til Bygg økt», og så videre.

### 4.5 [B] Bunnmenyen mangler `aria-current`

Ingen av de seks fanene markerer aktiv side programmatisk. Aktiv tilstand formidles kun visuelt, med farge og fet skrift. Legg `aria-current="page"` på den aktive fanen. `<nav>`-elementet bør også ha `aria-label="Hovedmeny"`.

### 4.6 [B] Ikonknappene har `title` men ingen synlig etikett — på en mobilapp

Tolv knapper i `TimerDisplay.tsx` bruker `title=""` som eneste forklaring. **`title` vises kun ved musepeker.** I en PWA som primært brukes på telefon, ser brukeren aldri disse tekstene. Ni ikoner i en rad, uten etiketter, uten tooltip, uten mulighet til å finne ut hva de gjør.

Løses i praksis av punkt 4.1 — når raden reduseres til to–tre kjente ikoner, er behovet for forklaring borte.

### 4.7 [C] Dobbelt opp og småfeil på skjermen

- **Øktnavnet vises to ganger.** «Klassisk Tabata» står både som valgt kort i favorittrutenettet og på infolinjen rett under. Fjern det ene.
- **Fase-informasjonen står dobbelt.** Badgen sier «KLARGJØRING» og overskriften rett under sier «Gjør deg klar». Behold én.
- **`capitalize` gir feil stor bokstav.** `TimerDisplay.tsx:661` produserer «8 **Ø**velser • 2 **R**nd». Norsk bruker liten forbokstav midt i setning. Klassen var ment for `tpl.type`, men treffer hele strengen.
- **«Rnd» er en uforklart forkortelse.** Skriv «runder». Kortene har god plass.
- **Overskriftsnivå hopper.** Filen går fra `<h1>` rett til `<h3>` — `<h2>` mangler. Brudd på SC 1.3.1.
- **`<h1>` er øvelsesnavnet**, som endres hvert tiende sekund. Sidens hovedoverskrift bør være stabil. Flytt `<h1>` til «Min Trener» og gjør øvelsesnavnet til en `aria-live`-region (se punkt 3.3).

---

## 5. Undersider

### 5.1 Programmer

**Fil:** `C:\dev\mintrener\src\components\programs\ProgramCatalogView.tsx`

#### [A2] Modusvelgeren gjør ingenting

Det mest fremtredende elementet på siden — segmentkontrollen **«Alene / Sammen / Led gruppe»** — er koblet til `trainingMode`, men **den variabelen leses aldri.** Filtreringen i `filteredPrograms` (linje 54–62) bruker kun `selectedProfileId` og `selectedCategory`.

Brukeren trykker på en stor, tydelig, tilsynelatende viktig kontroll, og ingenting skjer. Det er verre enn om den ikke fantes.

**Rett:** enten implementer filtreringen, eller fjern kontrollen inntil den virker.

#### [A2] `selectedCategory` er også død kode

`selectedCategory` settes kun til `'alle'`, aldri til noe annet — det finnes ingen kategorivelger i grensesnittet. Grenen i filteret er uoppnåelig. Filterlogikken har dessuten en tidlig `return` som gjør at profil og kategori aldri kan kombineres.

#### [A2] «Snart»-profiler er klikkbare og fører til blindvei

Profiler med `status === 'planned'` rendres nedtonet, men **er fullt klikkbare**. Trykker brukeren på en av dem, filtreres listen til null treff og skjermen sier «Ingen programmer matcher valgt filter». Ingenting forklarer at profilen ikke finnes ennå.

**Rett:** legg på `disabled` og `aria-disabled="true"`.

Fargen på disse chippene er dessuten `text-zinc-600` med `opacity-60` — under 2:1 i kontrast. Selv om deaktiverte elementer er unntatt kontrastkravet i WCAG, er dette langt under det som er lesbart.

#### [A2] Etterlatt død markup

Linje 75: `<User className="hidden" />` — et skjult ikon inne i tilbakeknappen. Rester fra en tidligere versjon. Slett.

#### [B] Favorittstjernen er for liten for jobben sin

Stjerneknappen er 26 × 26 px og er **den eneste måten å feste programmer til førstesiden på** — altså mekanismen bak hele favoritt-rutenettet i timeren. Den fortjener mer plass og en synlig etikett første gang. Den mangler også `aria-pressed` (den er en toggle) og har kun `title` som navn.

#### [B] Segmentkontrollene mangler semantikk

Både modusvelgeren og profilchippene er vanlige `<button>`-elementer uten `role="tablist"`/`role="radiogroup"` og uten `aria-pressed`. En skjermleserbruker får ingen beskjed om hvilket filter som er aktivt.

#### [C] Detaljer

- Tomtilstanden bruker `Sparkles` — AI-ikonet. Bruk `SearchX` eller `FilterX`.
- `Clock` er `text-cyan-400`. Cyan finnes ikke ellers i designsystemet unntatt i «Styrkelogg». Palettedrift.
- Kategorimerket viser `{prog.category}` rått — sannsynligvis en lowercase-id.
- `text-[8px]` på «snart»-merket. Åtte piksler.
- Overskriftshopp `h1` → `h3`.

### 5.2 Øvelser

**Fil:** `C:\dev\mintrener\src\components\library\ExerciseLibraryView.tsx`

#### [A1] Øvelseskortene er ikke tastaturtilgjengelige

Linje 185: hvert øvelseskort er en **`<div onClick>`** — ikke en knapp. Den kan ikke få tastaturfokus, har ingen rolle, og reagerer ikke på Enter eller mellomrom.

Dette er sidens primære interaksjon. En tastaturbruker eller skjermleserbruker kommer **ikke inn i øvelsesdetaljene i det hele tatt**.

**Brudd på SC 2.1.1 (Tastatur) og SC 4.1.2 (Navn, rolle, verdi).**

Mønsteret går igjen i hele kodebasen — jeg fant **78 `<div onClick>`** totalt. De fleste er modal-bakgrunner (som er akseptabelt når det finnes en Escape-håndtering ved siden av), men minst tre er reelle innholdskort:

| Sted | Fil |
|:--|:--|
| Øvelseskort | `ExerciseLibraryView.tsx:185` |
| Lagrede maler | `WorkoutBuilderView.tsx:430` |
| Øvelsesillustrasjon | `ExerciseIllustration.tsx:38` |

**Rett:** bytt til `<button type="button">` med `text-left w-full`. Det løser fokus, rolle og tastaturhåndtering på én gang.

#### [A1] Søkefeltet har ingen etikett

Linje 144: kun `placeholder="Søk på øvelse, muskel..."`. Placeholder er ikke en etikett — den forsvinner idet brukeren skriver. Legg `aria-label`. Farge `placeholder-zinc-500` gir dessuten 3,67:1 (punkt 3.5).

#### [B] Sletting bruker `window.confirm`

Linje 86. Native nettleserdialog, helt utenfor appens visuelle språk, og i en installert PWA på iOS ser den fremmed og skremmende ut. Appen har allerede et modalsystem — bruk det.

Merk inkonsistensen: sletting av en **øvelse** spør om bekreftelse, mens sletting av en **lagret mal** i øktbyggeren ikke gjør det (punkt 5.3).

#### [C] Detaljer

- Kategorichippen «🔥 Populære» er den eneste med emoji. Skjermlesere leser den som «ild». Inkonsekvent.
- Tomtilstanden bruker `Sparkles` igjen.
- Slettknappen har kun `title`, ingen `aria-label` — og teksten er usynlig på mobil.
- Overskriftshopp `h1` → `h3`.

### 5.3 Bygg økt

**Fil:** `C:\dev\mintrener\src\components\builder\WorkoutBuilderView.tsx`

#### [A2] Lagrede maler slettes uten bekreftelse

`handleDeleteSaved` (linje 182) sletter umiddelbart. Ingen bekreftelse, ingen angremulighet. Brukeren kan miste en egenbygget økt med ett feiltrykk — og slettknappen er 22 × 22 px, plassert rett ved siden av en start-knapp av samme størrelse.

Dette er den mest sannsynlige kilden til reelt datatap i appen. **Prioriter.**

#### [A1] Tidsjusteringene er for små

Arbeid- og pausechippene er `px-1.5 py-0.5` med `text-[9px]` — ca. **18 × 16 piksler**, seks stykker per øvelsesrad, tett i tett. Dette er byggerens hovedkontroll, og den er godt under 24 px-minstemålet.

#### [A1] Navnefeltet har en frittstående `<label>`

Linje 228–235: `<label>` uten `htmlFor`, input uten `id`. Se punkt 3.2.

#### [B] Knapper uten navn

- `+`/`−` for antall runder er tekstknapper uten `aria-label`. Skjermleser leser «pluss» og «minus» uten kontekst. Bruk `aria-label="Én runde mer"` / `"Én runde mindre"`.
- Flytt opp / flytt ned / slett per øvelse: `p-1` = 22 px, ingen `aria-label`.
- Slettknappen bruker `text-rose-500/70` — rose-500 på 70 % gjennomsiktighet mot zinc-900 gir svak kontrast på den mest destruktive handlingen i visningen.

#### [B] «Lagre som egen mal» ser aktiv ut når den er deaktivert

Knappen har `disabled={items.length === 0}` men mangler `disabled:opacity-40 disabled:pointer-events-none` — i motsetning til «Start økt»-knappen rett over, som har det. Brukeren trykker på en knapp som ser trykkbar ut, og ingenting skjer.

#### [C] Overskriftshopp `h1` → `h4`. To nivåer hoppet over.

### 5.4 Historikk

**Fil:** `C:\dev\mintrener\src\components\history\WorkoutHistoryView.tsx`

#### [A2] Heatmapet ignorerer brukerens ukesmål

Linje 175: `<WorkoutCalendarHeatmap history={history} weeklyGoal={3} />`

Ukesmålet er **hardkodet til 3**, mens Mer-siden har en egen innstilling for nettopp dette («Hvor mange økter du planlegger per uke»). Setter brukeren målet til 5, viser historikken fortsatt fremdrift mot 3. Timerens ukesmål-widget bruker riktig verdi — så de to skjermene viser motstridende tall.

#### [A2] Rå enum-verdier vises til brukeren

Linje 229: `{log.difficultyRating.replace('_', ' ')}` gir teksten **«for lett»**, **«for tungt»** — maskingenerert, med liten forbokstav. Samme gjelder `{log.workoutType}`. Legg inn en ordentlig etikettmapping.

#### [A1] Eksportknappene har ingen synlig etikett på mobil

CSV- og JSON-knappene har `hidden sm:inline` på teksten. Under 640 piksler — altså på **alle telefoner** — vises kun ikonet, med `title` som ikke fungerer ved berøring. To like store, like formede ikonknapper ved siden av hverandre, uten forklaring, for en handling som laster ned brukerens fulle datasett.

#### [B] Åtte piksler tekst

`text-[8px]` på både øktkategori-merket og vanskelighetsgrad-merket (linje 216, 221). Det er nær grensen for hva som lar seg lese på en telefon — og med zoom blokkert (punkt 3.1) er det ingen vei utenom.

#### [C] Detaljer

- `Trophy` brukes her for «Økter» — fjerde ulike betydning av samme ikon (se punkt 7).
- «Dagers streak» er en anglisisme. «Dager på rad» er norsk.
- `Flame` importeres to ganger, én gang som `FireIcon` (linje 8–18). Ryddes.
- `py-0.2` (linje 218, 223) gir 0,8 piksler. Nesten helt sikkert en skrivefeil for `py-0.5`.
- Tomtilstanden bruker `Sparkles` — tredje gang.
- Overskriftshopp `h1` → `h4`.

### 5.5 Mer / Innstillinger

**Fil:** `C:\dev\mintrener\src\components\settings\SettingsMoreView.tsx`

Dette er den **best strukturerte siden i appen**. Seksjonsinndelingen er logisk, hver rad har tittel og forklarende undertekst, og GDPR-delen er ryddig og ærlig. Den bør være mønsteret de andre sidene måles mot.

#### [A1] Bryterne mangler navn, rolle og tilstand

Se punkt 3.4. Dette er sidens alvorligste problem, og det rammer alle fem bryterne.

#### [A1] Bryterens av-tilstand er nesten usynlig

`bg-zinc-700` mot `bg-zinc-900` gir **1,70:1**. Kravet i SC 1.4.11 (Kontrast for ikke-tekstlig innhold) er 3:1 for komponenter som må kunne identifiseres. Bruk `bg-zinc-600` som minimum, helst lysere.

#### [B] «Slett konto & alle data» ser ut som en navigasjonsrad

Appens mest destruktive handling har `ChevronRight` til høyre — det samme ikonet som brukes på «Personvernerklæring» og «Hjelpeguide», som begge bare åpner noe. Pilen lover «dette tar deg videre», ikke «dette sletter alt du har».

Handlingen bekreftes med `window.confirm` (linje 124) — samme problem som i punkt 5.2.

**Rett:** bytt `ChevronRight` mot `Trash2` eller ingenting, og bruk en egen modal med skriftlig bekreftelse.

#### [B] Elleve forekomster av `text-zinc-500`

Flest i hele prosjektet. Se punkt 3.5.

#### [C] Siden har ingen tilbakeknapp, i motsetning til alle de andre undersidene. Inkonsekvent — se punkt 6.3.

### 5.6 Fullført økt (oppsummering)

**Fil:** `C:\dev\mintrener\src\components\timer\WorkoutSummary.tsx`

#### [A2] Astrids profilbilde er et bilde av en knebøy

Linje 160:

```tsx
<img src="/images/exercises/kneboy-0.png" alt="Astrid AI" ... />
```

AI-treneren «Astrid» presenteres med et rundt avatarbilde ved siden av navnet sitt — og bildet er øvelsesillustrasjonen for knebøy. Alt-teksten sier «Astrid AI». Dette er synlig for alle brukere hver eneste gang de fullfører en økt.

#### [B] Ingen vei videre enn «Ferdig / Ny økt»

`App.tsx` returnerer oppsummeringen som hele skjermen, uten bunnmeny. Brukeren har nettopp fullført en økt og er akkurat da mest motivert for å se historikk, streak eller neste utfordring — men den eneste utgangen fører tilbake til timeren.

#### [C] Detaljer

- `animate-bounce` i evig løkke på PR-banneret (punkt 3.7).
- Vurderingsknappene (For lett / Passe / For tungt) er **godt laget** — ikon, tekst og farge sammen. Men de mangler `role="radiogroup"` og `aria-pressed`.
- «Registrert!» annonseres ikke (punkt 3.3).
- `Trophy` igjen — femte betydning.
- Overskriftshopp `h1` → `h3`.

---

## 6. Modaler og undermenyer

Appen har **22 modaler**. Kvaliteten er delt rett i to.

### 6.1 [A1] Halvparten av modalene mangler all dialog-semantikk

**Har `role="dialog"`, `aria-modal`, `aria-labelledby` og Escape-håndtering (12):**

```
UserMenu · ExercisePickerModal · GpsTrackerModal · GroupRoomModal
AboutGuideModal · PrivacyPolicyModal · CreateCustomExerciseModal
ExerciseDetailModal · MicroWorkoutModal · SensorStatusModal
StrengthLoggerModal · ExerciseIllustration (mangler labelledby)
```

**Mangler alt (10):**

```
AiWorkoutGeneratorModal · CalendarExportModal · ChallengeCatalogModal
ChallengeDetailModal · AiCoachModal · ProfileOnboardingModal
PwaInstallPromptModal · SkillTreeModal · ShareCardModal
StrengthWorkoutModal
```

For de ti siste betyr det: ingen rolle, ingen tittel-kobling, **og ingen Escape-lukking**. En tastaturbruker som åpner AI-treneren eller ferdighetstreet kommer seg ikke ut med tastaturet.

Særlig alvorlig for `ProfileOnboardingModal` — den er det **aller første** en ny bruker møter, siden den åpnes automatisk fra `App.tsx` når onboarding ikke er fullført.

**Rett:** kopier mønsteret fra `SensorStatusModal.tsx` inn i de ti.

### 6.2 [A1] Ingen modal flytter eller fanger fokus

Søk etter `autoFocus` og `.focus()` gir **null treff i alle 22 modalene**. Ingen av dem:

- flytter fokus inn i dialogen når den åpnes,
- holder fokus inne mens den er åpen,
- eller returnerer fokus til utløserknappen ved lukking.

Konsekvens: en tastaturbruker åpner en modal, trykker Tab, og havner i bakgrunnssiden bak overlegget — som fortsatt er fokuserbar. Skjermleseren leser innhold brukeren ikke kan se.

**Brudd på SC 2.4.3 (Fokusrekkefølge).**

**Rett:** enten en liten felles `useFocusTrap`-hook, eller bytt til `<dialog>`-elementet med `showModal()`, som gir fokusfelle og Escape gratis i alle moderne nettlesere.

### 6.3 [C] Tre forskjellige tilbakeknapper på fire undersider

| Side | Utforming |
|:--|:--|
| Programmer | Tekstpil `← Timer` i grønt |
| Øvelser | Tekstpil `← Timer` i grønt |
| Historikk | Tekstpil `← Timer` i grønt |
| Bygg økt | `ArrowLeft`-ikon, **ingen tekst, ingen `aria-label`** |
| Mer | **Ingen tilbakeknapp** |

Byggerens variant er dessuten uten tilgjengelig navn — en skjermleser leser den som «knapp».

Merk også at alle disse tilbakeknappene er **redundante**: bunnmenyen vises på alle undersider, og Timer-fanen gjør nøyaktig det samme. Vurder å fjerne dem helt, eller behold dem konsekvent på alle fem sider.

### 6.4 [C] Overskriftsnivå starter vilkårlig

Modalene starter på `<h2>` (12 stk) eller `<h3>` (9 stk) uten system. `ExercisePickerModal` og `SensorStatusModal` går `h2` → `h4`. Standardiser: modal-tittel er alltid `<h2>`, underseksjoner `<h3>`.

---

## 7. Samlet ikonrevisjon

### 7.1 Ikoner som brukes til flere ulike betydninger

Dette er det største enkeltproblemet i appens visuelle språk. Fem ikoner bærer til sammen seksten forskjellige betydninger.

| Ikon | Brukes i dag om | Anbefaling |
|:--|:--|:--|
| **`Trophy`** | 1. Ferdighetstre<br>2. Utfordringer<br>3. Reserveikon for profiler<br>4. «Økter»-telleren i historikk<br>5. Fullført økt | Behold **kun** for Utfordringer og Fullført økt. Ferdighet → `TrendingUp` eller `Medal`. Historikk-telleren → `CheckCircle2`. Profil-reserve → `Users`. |
| **`Sparkles`** | 1. Astrid AI-trener<br>2. «AI Økt»-chip<br>3. Program-fanen i bunnmenyen<br>4. Kontekstprofiler i Mer<br>5. Tomtilstand i tre visninger | Behold **kun** for AI-funksjoner (1, 2). Program-fanen → `ClipboardList` eller `CalendarDays`. Profiler → `UserCog`. Tomtilstand → `SearchX`. |
| **`Dumbbell`** | 1. Logo ved «Min Trener»<br>2. «Styrke»-chip<br>3. Øvelser-fanen<br>4. Tittel i Bygg økt<br>5. Tittel i Mer | Behold for Øvelser og Styrke. Gi merkevaren et eget merke. Fjern fra sidetitler der den ikke betyr noe. |
| **`Activity`** | 1. Sensorstatus<br>2. Bevegelsesteller (reps)<br>3. Sensorrad i Mer | Behold for reps (pulslinje = bevegelse). Sensorstatus → `Bluetooth`. |
| **`Clock`** | 1. Programvarighet<br>2. Øvelsesvarighet<br>3. Totaltid i bygger<br>4. Minutter i historikk | Greit — betydningen er den samme overalt. Men fargen varierer (cyan i to visninger, emerald i to). Velg én. |

### 7.2 Ikoner som er semantisk feil

| Sted | I dag | Problem | Rett til |
|:--|:--|:--|:--|
| `TimerDisplay.tsx:288` | `Mic` / `MicOff` for **norsk talesyntese** | Mikrofon betyr lyd **inn**. Dette er lyd **ut**. | `Speech` eller `AudioLines` |
| `TimerDisplay.tsx:302` | `Bot` for **håndfri stemmestyring** | Dette *er* mikrofonfunksjonen. `Bot` er dessuten uleselig på 14 px — i skjermbildet ser den ut som en koffert. | `Mic` / `MicOff` |
| `TimerDisplay.tsx:317` | `Sun` / `Moon` for **skjermdvale** | Leses av nær sagt alle som lys/mørk tema-bryter. | `Eye` / `EyeOff`, eller `Lightbulb` / `LightbulbOff` |
| `TimerDisplay.tsx:341` | `Smartphone` for **vibrasjon** | Samme ikon av og på — **kun fargen endres**. Brudd på SC 1.4.1. | `Vibrate` / `VibrateOff` — løser begge problemene |
| `BottomNav.tsx:96` | `Settings` med teksten «Mer» | Ikon og etikett lover ulike ting. Brudd på SC 2.5.3. | `Ellipsis` + «Mer», eller `Settings` + «Innstillinger» |
| `SettingsMoreView.tsx:490` | `ChevronRight` på **«Slett konto»** | Pilen signaliserer navigasjon, ikke destruksjon. | Fjern pilen |
| `WorkoutSummary.tsx:160` | Knebøy-foto som **Astrids avatar** | Feil bilde. | Egen illustrasjon, eller `Bot`-ikon |

### 7.3 Tekstrettinger

| Sted | I dag | Rett til |
|:--|:--|:--|
| Øktkort på førstesiden | «8 Øvelser • 2 Rnd» | «8 øvelser • 2 runder» |
| Historikk, statistikk-kort | «Dagers streak» | «Dager på rad» |
| Historikk, vanskelighetsmerke | «for lett» / «for tungt» | «For lett» / «For tungt» |
| Historikk, kategorimerke | rå `workoutType`-verdi | oversatt etikett |
| Programmer, kategorimerke | rå `category`-verdi | oversatt etikett |
| Dvaleknappens `aria-label` | «Skjerm holdes på» | «Hold skjermen på» (funksjonsnavn, ikke tilstand) |

---

## 8. Farger og kontrast

### 8.1 Utregnede verdier

Målt mot appens to bakgrunner. Kravet i SC 1.4.3 er **4,5:1** for normal tekst og **3:1** for stor tekst (≥ 24 px, eller ≥ 18,66 px fet).

| Farge | Mot `zinc-950` | Mot `zinc-900` | Vurdering |
|:--|--:|--:|:--|
| `zinc-500` #71717a | **4,12:1** | **3,67:1** | **Avvik for tekst** |
| `zinc-400` #a1a1aa | 7,76:1 | 6,91:1 | God |
| `zinc-300` #d4d4d8 | 13,46:1 | 11,99:1 | Utmerket |
| `emerald-400` #34d399 | 10,35:1 | 9,22:1 | Utmerket |
| `emerald-500` #10b981 | 7,84:1 | 6,98:1 | God |
| `amber-400` #fbbf24 | 11,92:1 | 10,61:1 | Utmerket |
| `indigo-400` #818cf8 | 6,67:1 | 5,94:1 | God |
| `purple-400` #c084fc | 7,53:1 | 6,70:1 | God |
| `rose-400` #fb7185 | 7,39:1 | 6,58:1 | God |
| `blue-300` #93c5fd | 11,03:1 | 9,82:1 | Utmerket |
| `zinc-700` #3f3f46 | 1,91:1 | 1,70:1 | Kun dekor |
| `zinc-800` #27272a | 1,34:1 | 1,19:1 | Kun dekor |

**Kombinasjoner i fargede kort:**

| Kombinasjon | Forhold |
|:--|--:|
| `emerald-400` på `emerald-950` | 7,88:1 |
| `amber-400` på `amber-950` | 8,97:1 |
| `indigo-300` på `indigo-950` | 8,02:1 |
| `purple-400` på `purple-950` | 5,68:1 |
| `zinc-950` på `emerald-500` (primærknapp) | 7,84:1 |
| `zinc-950` på `amber-500` (pauseknapp) | 9,26:1 |
| `emerald-500` på `zinc-800` (fremdriftslinje) | 5,87:1 |

**Konklusjon: paletten er i utgangspunktet svært god.** Alt unntatt `zinc-500` klarer kravet med margin, og primærknappene ligger på 7,8–9,3:1. Det eneste kontrastproblemet er `zinc-500` som tekstfarge — og det er én global erstatning.

### 8.2 [B] Rammer under 3:1 der de er eneste avgrensning

`border-zinc-800` gir 1,19–1,34:1. Der rammen er det **eneste** som skiller en kontroll fra bakgrunnen, gjør det kontrollen visuelt usynlig:

- **Forrige/Neste-knappene** rundt START på timeren: `bg-zinc-900/80` på `bg-zinc-950` med `border-zinc-800`. Både fyll og ramme under 1,4:1.
- Øktkortene i favorittrutenettet.
- Bryter-sporet i av-tilstand (punkt 5.5).

Dette er ikke automatisk brudd på SC 1.4.11 for de to første — ikonene inni har god kontrast, og kriteriet gjelder komponenter som *må* kunne identifiseres via grensen. Men det er grunnen til at de to knappene ved siden av START forsvinner visuelt i skjermbildet. Bryter-sporet er derimot et reelt avvik, siden av-tilstanden ikke har noe annet visuelt anker enn sporet selv.

**Rett:** `border-zinc-700` som minimum på interaktive elementer, helst `border-zinc-600`.

### 8.3 [C] Palettedrift

Fargene `cyan-400` og `cyan-900` dukker opp tre steder — «Styrkelogg»-knappen, JSON-eksport-ikonet og Clock-ikonet i historikk og programmer — uten at cyan har noen definert rolle i designsystemet. `blue-*` brukes til «For lett»-vurderingen, `teal-*` i Astrid-gradienten. Definer hvilke farger som betyr hva, og luk ut resten.

### 8.4 Det som er gjort riktig

Verdt å merke seg, siden det ellers er lett å tro at alt er galt:

- **Fase formidles aldri med farge alene.** Badgen sier «KLARGJØRING» / «JOBB» i tekst ved siden av fargeendringen.
- **Ukesmålet viser både stolpe og prosenttall.**
- **Vurderingsknappene** i oppsummeringen kombinerer ikon, tekst og farge.
- **Lyd, tale, dvale og lås** bytter faktisk ikon mellom av og på — ikke bare farge.

Eneste unntak er vibrasjonsbryteren (punkt 7.2).

---

## 9. Universell utforming — samlet avviksliste

**Regelverk:** Forskrift om universell utforming av IKT-løsninger stiller krav om **WCAG 2.1 nivå AA** for nettløsninger rettet mot allmennheten, også for private aktører. Unntatt er kravene til lyd- og videobeskrivelse (SC 1.2.3, 1.2.4, 1.2.5), som uansett ikke er relevante her. Min Trener er omfattet.

### 9.1 Dokumenterte avvik

| # | SC | Kriterium | Funn | Punkt |
|:--|:--|:--|:--|:--|
| 1 | **1.4.4** | Endring av tekststørrelse | `user-scalable=no` blokkerer zoom | 3.1 |
| 2 | **1.3.1** | Informasjon og relasjoner | 15 etiketter uten `htmlFor`; overskriftshopp i 8 visninger | 3.2, 6.4 |
| 3 | **3.3.2** | Ledetekster eller instruksjoner | Skjemafelt uten etikett | 3.2 |
| 4 | **4.1.2** | Navn, rolle, verdi | Brytere uten navn/rolle/tilstand; `div onClick` som knapper | 3.4, 5.2 |
| 5 | **4.1.3** | Statusbeskjeder | Ingen live-regioner i hele appen | 3.3 |
| 6 | **1.4.3** | Kontrast (minimum) | `text-zinc-500` i 24 filer | 3.5 |
| 7 | **2.4.7** | Synlig fokus | Ingen fokusstiler; `focus:outline-none` uten erstatning | 3.6 |
| 8 | **2.2.2** | Pause, stopp, skjul | Fem uendelige animasjoner uten stopp | 3.7 |
| 9 | **3.1.1** | Språk på siden | `lang="no"` statisk, følger ikke språkvelgeren | 3.8 |
| 10 | **2.5.3** | Ledetekst i navn | «Mer»-fanen | 4.4 |
| 11 | **1.4.1** | Bruk av farge | Vibrasjonsbryteren | 7.2 |
| 12 | **2.1.1** | Tastatur | Øvelseskort og maler er `<div onClick>` | 5.2 |
| 13 | **2.4.3** | Fokusrekkefølge | Ingen modal fanger eller flytter fokus | 6.2 |
| 14 | **1.4.11** | Kontrast, ikke-tekstlig | Bryter-spor på 1,70:1 | 5.5 |

### 9.2 Kommende krav

WCAG 2.2 er ennå ikke tatt inn i den norske forskriften, men inngår i EN 301 549 og kommer ved neste revisjon. To kriterier treffer denne appen:

- **SC 2.5.8 Målstørrelse (minimum), 24 × 24 px** — «?»-knappen (20 px), installer-pillen (~16 px), tidschippene i byggeren (~18 × 16 px), flytt/slett-knappene i byggeren (22 px). Se punkt 4.2 og 5.3.
- **SC 3.2.6 Konsistent hjelp** — hjelpetilgangen er i dag et «?» på timeren og en rad i Mer, med ulik plassering per side.

### 9.3 Tilgjengelighetserklæring

Krav om publisert tilgjengelighetserklæring på uustatus.no gjelder i dag offentlig sektor. For private aktører er dette på vei inn via tilgjengelighetsdirektivet (EAA). Uavhengig av når det treffer dere formelt, er en erklæring nyttig — den tvinger frem nettopp den gjennomgangen dette dokumentet er.

---

## 10. Prioritert arbeidsliste

### Sprint 1 — Små endringer, stor effekt

Anslag: en halv til én dag. Fjerner fire WCAG-avvik og to synlige feil.

| # | Oppgave | Fil |
|:--|:--|:--|
| 1 | Fjern `maximum-scale` og `user-scalable=no` | `index.html` |
| 2 | Global erstatning `text-zinc-500` → `text-zinc-400` | 24 filer |
| 3 | Definer `no-scrollbar`, bytt ut `scrollbar-none` | `index.css` + 2 filer |
| 4 | Fjern `hidden xs:inline` (2 steder), eller definer `--breakpoint-xs` | `TimerDisplay.tsx`, `PwaInstallPromptModal.tsx` |
| 5 | Legg inn global `:focus-visible`-ring | `index.css` |
| 6 | Legg inn `prefers-reduced-motion`-blokk | `index.css` |
| 7 | Sett `lang` dynamisk ved språkbytte; standard `nb` | `index.html`, i18n-tjeneste |
| 8 | Bekreftelsesdialog før sletting av lagret mal | `WorkoutBuilderView.tsx` |
| 9 | Bytt Astrids avatar fra knebøy-bildet | `WorkoutSummary.tsx:160` |
| 10 | Koble heatmapet til brukerens faktiske ukesmål | `WorkoutHistoryView.tsx:175` |

### Sprint 2 — UI-revisjonen

Anslag: to til tre dager. Dette er den synlige opprydningen.

| # | Oppgave | Punkt |
|:--|:--|:--|
| 11 | Rydd topplinjen fra tolv til fire elementer; flytt resten til Mer | 4.1 |
| 12 | Bytt om `Mic` og `Bot`; erstatt `Sun`/`Moon`; bruk `Vibrate` | 7.2 |
| 13 | Løs opp ikonkollisjonene for `Trophy`, `Sparkles`, `Dumbbell`, `Activity` | 7.1 |
| 14 | Gi «Mer»-fanen ikon og navn som stemmer overens | 4.4 |
| 15 | Chip-raden: bryt over to linjer i stedet for skjult scroll | 4.3 |
| 16 | Implementer eller fjern modusvelgeren i Programmer | 5.1 |
| 17 | Deaktiver «snart»-profilene | 5.1 |
| 18 | Fjern død markup: `<User className="hidden" />`, dobbel `Flame`-import | 5.1, 5.4 |
| 19 | Ensrett tilbakeknappen på alle fem undersider — eller fjern den | 6.3 |
| 20 | Tekstrettinger: «runder», «Dager på rad», enum-mapping | 7.3 |
| 21 | Erstatt `window.confirm` med appens egen modal (2 steder) | 5.2, 5.5 |
| 22 | Forstørr tidschippene i byggeren og favorittstjernen | 5.3, 5.1 |

### Sprint 3 — Tilgjengelighet i dybden

Anslag: to til tre dager.

| # | Oppgave | Punkt |
|:--|:--|:--|
| 23 | `role="switch"` + `aria-checked` + `aria-label` på alle brytere | 3.4 |
| 24 | `htmlFor`/`id` på alle 15 etiketter; `aria-label` på søkefelt | 3.2 |
| 25 | `aria-live` på timerens fase; `role="status"` på alle toaster | 3.3 |
| 26 | Bytt `<div onClick>` → `<button>` på øvelseskort, maler, illustrasjoner | 5.2 |
| 27 | Legg dialog-semantikk og Escape på de ti manglende modalene | 6.1 |
| 28 | Fokusfelle i modaler — felles hook eller `<dialog>` | 6.2 |
| 29 | `aria-current="page"` i bunnmenyen; `aria-label` på `<nav>` | 4.5 |
| 30 | Rett overskriftsnivåene; ingen hopp | 4.7, 6.4 |
| 31 | Hev rammekontrast på interaktive elementer til minst 3:1 | 8.2 |
| 32 | Definer fargeroller; fjern cyan/blue/teal-drift | 8.3 |

---

## 11. Ikke verifisert / krever manuell test

Dette dokumentet bygger på statisk kodegjennomgang. Følgende må testes på ekte enhet før revisjonen kan regnes som fullstendig:

1. **Landskapsmodus (SC 1.3.4).** `h-[100dvh]` kombinert med `overflow-hidden` gjør at timerlayouten sannsynligvis klippes på en telefon i liggende posisjon. Ikke bekreftet.

2. **Reflow ved 320 px (SC 1.4.10).** Appen er `max-w-md` og mobil-først, så dette går trolig bra — men chip-raden og firekolonners preset-rutenett i byggeren bør sjekkes.

3. **Faktisk skjermleseradferd.** Bruk VoiceOver på iOS og TalkBack på Android. Kodegjennomgangen viser hvilke attributter som mangler, men ikke hvordan helheten faktisk oppleves.

4. **Talesyntesen som kompensasjon.** Appen har norsk TTS som delvis dekker mangelen på live-regioner. Hvor godt den fungerer i praksis — og hva som skjer når den er avslått — bør vurderes samlet.

5. **`select-none` på `<body>`.** Slår av tekstmarkering i hele appen, sammen med `-webkit-tap-highlight-color: transparent` som fjerner all berøringsrespons. Ikke et formelt avvik, men det hindrer brukere i å markere øvelsesnavn for oppslag eller opplesing i eksterne verktøy. Vurder å begrense `select-none` til timerskjermen alene.

6. **Automatisert kontroll.** Kjør axe DevTools eller Lighthouse mot et produksjonsbygg. Det fanger opp ting en kodegjennomgang ikke ser, og gir et tall å måle mot ved neste revisjon.

---

*Revisjon utført 27. august 2026. Alle kontrastverdier er utregnet etter WCAG 2.1 relative luminance-formel.*

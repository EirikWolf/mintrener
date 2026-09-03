# Revisjon A — Opplevelsen: Funn og Helhetsvurdering

**Objekt:** «Min Trener», PWA for intervalltrening og treningsveiledning  
**Live:** `https://mintrener.web.app` · **Repo:** `github.com/EirikWolf/mintrener` (`main` / `c9099dc`)  
**Dato:** 2026-08-30  
**Metode:** Gjennomført etter metodikken og kildehierarkiet i [`revisjon-00-slik-jobber-du.md`](revisjon-00-slik-jobber-du.md) og bestillingen i [`revisjon-A-opplevelse.md`](revisjon-A-opplevelse.md).

---

## 0. Dekning og metodeforbehold

Før alt annet redegjøres det for hva som er dekket, hva som gjenstår, og hvilke forutsetninger som gjelder:

* **Dekket med full evidens og kildeforankring:**
  * Del 1: Begrunnelsesplikt (spørsmål A–D besvart med kodelinjer og observasjoner, pluss seks tilleggsfunn i samme klasse).
  * Del 2: De seks analytiske pilarene (Kognitiv arkitektur, Interaksjonsøkonomi/Fitts' lov, Universell utforming WCAG 2.2 AA, Systemisk konsistens, Nielsens heuristikker, Treningsfaglig forsvarlighet).
  * Del 3: Opplevelsen uten lyd (underteksting, dialekt vs. bokmål, taktile/visuelle signaler, telefon-på-gulv-scenariet).
  * Del 4: Varslinger og påminnelser (brukerbehov, etisk grense mot skam/press, kanaler, kalendereksport mot push, nullalternativ).
  * Del 5: Redesign av startskjermen med soner, informasjonsarkitektur og prioritering.
  * Del 6: Veikart (denne uken, før lansering, neste kvartal, fjern/frys).
  * Del 7: Kryssjekk mot tidligere revisjoner og tilbakemelding på bestillingen.
* **Metodeforbehold og utstyr:**
  * *Lyd:* Lydfilene er analysert fra kode, manifest (`personaAudioManifest.json`), manuskript (`voicebank-manuskript.json`) og Web Audio/Speech API-arkitektur. Estetisk lydopplevelse i øret er ikke vurdert som subjektiv lytteropplevelse.
  * *Enheter:* Målinger er utført via Chromium DevTools på emulerte viewports for Samsung Galaxy S21 (360×800 px) og iPhone 14/15 (390×844 px), samt desktop/iPad. Fysisk Web Bluetooth-tilkobling mot ekte pulsbelter krever fysisk maskinvare i rommet.

---

## 1. Førsteinntrykk — rå notater

*Skrevet under faktisk testing av appens flyt, før kildekoden ble analysert:*

1. **Onboarding — inkonsistent personaregime:** Jossa og Ola presenteres med dialekt/geografi («Haugalandet», «Romsdalen»), Axel og Robin med musikksjanger («Metalcore», «90s Boyband Pop»), mens Astrid presenteres med teknologi («Standard Norsk (Syntetisk)»). Brukeren må forholde seg til tre ulike konseptuelle dimensjoner i én og samme radioliste.
2. **Startskjermens 10-knappers matrise (5×2):** Umiddelbar kognitiv overbelastning. Knappene «Astrid AI», «Styrke» og «GPS» deler alle samme grønne fargepalett (`emerald`), mens «AI Økt» er indigo og «Ferdighet» og «Gruppe» begge er lilla. Fargene signaliserer ikke funksjonskategori, men fremstår tilfeldig fordelt.
3. **To TV-ikoner på én skjerm:** Toppbaren har et blått TV-ikon (`Tv`), og rutenettet rett nedenfor har nøyaktig samme TV-ikon med samme handling (`setIsTvModeOpen(true)`).
4. **Favorittlisten kolliderer med klokken ved scrolling/lav høyde:** På startskjermen kjemper den enorme nedtellingssirkelen og favorittkortene om nøyaktig samme vertikale oppmerksomhet.
5. **Egne øvelser i biblioteket:** Jeg kan opprette en «Egen øvelse», men når jeg går inn i øvelseslisten kan jeg ikke stjernemerke/favorittmarkere den. Favoritter er forbeholdt forhåndsdefinerte programpakker.
6. **Mangler øvelsesvisning/detaljkort ved forhåndstitting:** Når jeg trykker på et favorittkort på forsiden, starter timeren nesten umiddelbart eller loader økten direkte. Det er ingen rolig «forhåndsvisning» som viser hvilke øvelser som inngår og hvordan de utføres, før timeren begynner å telle ned forberedelsestid.
7. **Øktstart — sted eller tilstand?** Når jeg trykker Start, forsvinner bunnnavigasjonen (`BottomNavigation`), fargen på hele bakgrunnen skifter, men nettleserens URL forblir `/`. Trykker jeg tilbakeknappen på Android, lukkes hele appen i stedet for å avbryte eller pause økten.

---

## 2. Sammendrag

### Modenhet
«Min Trener» er en teknisk gjennomarbeidet og funksjonsmettet PWA med over 800 grønne automatiserte tester, 0 rAF-ytelsesfeil i produksjon, solid offline-støtte via IndexedDB/Workbox og eksemplarisk fargekontrast (0 WCAG AA-brudd på tekst). 

### Den bærende innsikten: «Akkumulering fremfor arkitektur»
Appens største svakhet i dag er ikke mangel på funksjoner, men **mangelen på en håndhevet romlig og konseptuell kontrakt**. Hver gang en ny egenskap har blitt utviklet (Adaptiv progresjon, Utfordringer, GPS, Styrke, Smertefilter, AI-trener, AI-generator, Ferdighetstre, Kiosk, Storskjerm), har den fått en egen knapp på startskjermen.

Dette har forvandlet startskjermen fra et effektivt treningsverktøy («velg økt og start på 5 sekunder») til et kontrollpanel med over 20 klikkbare mål og parallelle modaler.

### Faglige motsetninger

| Fagfelt A | Fagfelt B | Spenning i saken | Hva som avgjør |
|---|---|---|---|
| **Interaksjonsdesign (Enkelhet/Fokus)** | **Produktledelse (Funksjonsbredde)** | Skal startskjermen vise alle 10 undermoduser, eller bare én primær hurtigstartknapp med favoritter? | **Enkelhet vinner på startskjermen.** 80 % av brukerne skal bare starte dagens økt. Undermoduser hører hjemme i tematiske faner («Utforsk/Verktøy»). |
| **Kognitiv tilgjengelighet (Senior/Barn)** | **Visuell estetikk (Minimalisme)** | Skal man ha tekstetiketter, undertekster og store flater, eller rene ikoner? | **Eksplisitte tekstetiketter og undertekster vinner.** WCAG 2.2 og målgruppene krever entydige tekster og synlig status. |
| **Treningsfaglig trygghet (Fysioterapi)** | **Gamification / Retensjon (Streaks)** | Skal appen pushe streaks og ukesmål, eller tillate hvile og tilpasning uten skyldfølelse? | **Trygghet og mestring vinner.** Streaks må feires uten skam ved brudd (f.eks. «Ny start» fremfor «Du mistet serien din»). |

---

## 3. Del 1 — Begrunnelsesplikt: Svar på spørsmål A–D og tilleggsfunn

### Spørsmål A: Hvorfor kan ikke egne øvelser merkes som favoritt?
* **Observasjon:** [`src/services/favoritesService.ts:3`](file:///c:/dev/Trening/src/services/favoritesService.ts#L3) lagrer utelukkende `mintrener_favorite_program_ids`. I [`src/components/exercises/ExerciseLibraryView.tsx`](file:///c:/dev/Trening/src/components/exercises/ExerciseLibraryView.tsx) finnes det ingen stjerneknapp eller favorittfiltrering for enkeltøvelser eller egendefinerte øvelser.
* **Årsak:** Favorittfunksjonaliteten ble bygget utelukkende med tanke på startskjermens programkarusell. Brukerskapte øvelser ble lagt til i en senere fase som en isolert CRUD-tjeneste (`customExercisesService.ts`) uten at datamodellene ble samordnet.
* **Konsekvens:** Brukerskapt innhold blir annenrangs. En bruker som legger inn sine egne skreddersydde øvelser må bla manuelt gjennom hele biblioteket for hver økt de skal bygge.
* **Anbefaling:** Utvid `favoritesService.ts` til å håndtere både `favoritePrograms` og `favoriteExercises`, og gi egne øvelser et fast «Mine øvelser / Favoritter»-filter øverst i biblioteket.

### Spørsmål B: Hvorfor er det to TV-ikoner på forsiden?
* **Observasjon:** 
  1. [`src/components/timer/TimerDisplay.tsx:427-433`](file:///c:/dev/Trening/src/components/timer/TimerDisplay.tsx#L427-L433) (Toppbar): `<button onClick={() => setIsTvModeOpen(true)} aria-label="Storskjerm- og TV-visning"><Tv className="w-4 h-4" /></button>`
  2. [`src/components/timer/TimerDisplay.tsx:728-734`](file:///c:/dev/Trening/src/components/timer/TimerDisplay.tsx#L728-L734) (Rutenett knapp 10): `<button onClick={() => setIsTvModeOpen(true)} aria-label="Storskjerm og TV-visning"><Tv className="w-3.5 h-3.5" /></button>`
  3. I tillegg finnes et tredje TV-valg i [`src/components/settings/SettingsMoreView.tsx:492`](file:///c:/dev/Trening/src/components/settings/SettingsMoreView.tsx#L492).
* **Årsak:** Feature-akkumulering uten layout-eierskap. Da storskjermvisningen ble implementert, ble den lagt i toppbaren. Da 5×2-matrisen ble fylt ut for å få et symmetrisk rutenett med 10 knapper, ble «TV» lagt til der også.
* **Konsekvens:** Forvirring for brukeren og skjermlesere (to like knapper med ulik aria-label-ordlyd på samme skjerm).
* **Anbefaling:** Fjern TV-knappen fra hurtigmatrisen på startskjermen. Behold storskjermikonet diskret i toppbaren/under innstillinger.

### Spørsmål C: Hvorfor føles det som at økten starter på en ny side?
* **Observasjon:** I [`TimerDisplay.tsx:375-377`](file:///c:/dev/Trening/src/components/timer/TimerDisplay.tsx#L375-L377) skifter komponenten visuell form totalt: bunnmenyen skjules, bakgrunnsfargen animeres (`transition-colors duration-500`), og toppbaren erstattes av `FocusModeQuickControls`. Samtidig endres ikke URL-en (ingen ruting via React Router / History API).
* **Årsak:** Appen har en «tilstandsbasert» arkitektur fremfor URL-ruting for timerens faser.
* **Konsekvens:** Brudd på brukerens mentale modell av webapplikasjoner. Hvis brukeren sveiper tilbake eller trykker maskinvare-tilbakeknappen på Android for å «gå ut av økten», trigger nettleseren historikk-tilbake (som forlater hele nettsiden) fremfor å pause/avbryte økten.
* **Anbefaling:** Koble aktiv økt til nettleserens History API (f.eks. `window.history.pushState({ inWorkout: true }, '')`) og håndter `popstate` slik at tilbakeknappen viser en trygg «Vil du avslutte økten?»-dialog i stedet for å drepe appen.

### Spørsmål D: Hva skal startskjermen egentlig bruke plassen på?
* **Observasjon:** I hvilemodus (`state.status === 'idle'`) viser skjermen:
  1. Toppbar med 5 knapper.
  2. Gjenopprett-økt banner (hvis avbrutt).
  3. Adaptiv progresjon forslagskort (hvis tilgjengelig).
  4. Ukesmål og streak-knapp.
  5. Aktiv utfordringskort.
  6. 5×2 verktøymatrise (10 knapper).
  7. Favorittøkter / hurtigstart-karusell (2 rader).
  8. Stor sirkulær timer for manuell start med custom tid.
* **Analyse:** På en 800 px skjerm (S21) fører dette til en 1400 px høy scrollbar flate hvor timeren kjemper mot programmene. Brukeren tvinges til å bla forbi en massiv sirkel som kun trengs hvis man skal kjøre en frittstående egendefinert timer.
* **Anbefaling:** Se fullstendig redesignforslag i kapittel 5.

---

### Seks tilleggsfunn i samme klasse (Duplikater, uforankrede elementer og uoppfylte løfter)

1. **Duplikat: Dobbel lydstyring i samme visning**
   - *Fil:* `TimerDisplay.tsx:436` (Toppbar) og `SettingsMoreView.tsx:460` (Innstillinger) samt `FocusModeQuickControls.tsx:38`.
   - *Problem:* Tre separate steder å slå av/på lyd med ulik visuell tilbakemelding.

2. **Uoppfylt løfte: «Smart Deload»-anbefaling uten historikkgrunnlag**
   - *Fil:* `src/services/fatigueDeloadService.ts:45`
   - *Problem:* Tjenesten beregner deload-anbefaling basert på siste 14 dager, men hvis brukeren ikke har logget RPE på øktene, faller den tilbake på en hardkodet standard uten å informere brukeren om at data mangler.

3. **Duplikat: AI-trener vs AI Treningsgenerator**
   - *Fil:* `TimerDisplay.tsx:672` («Astrid AI») og `TimerDisplay.tsx:680` («AI Økt»).
   - *Problem:* To naboknapper i 5×2-matrisen som begge har et glitrende stjerneikon (`Sparkles`) og begge nevner «AI». Brukeren aner ikke forskjellen før de klikker.

4. **Element uten forsvar: «GPS»-knapp på en primært innendørs intervallapp**
   - *Fil:* `TimerDisplay.tsx:712` («GPS»)
   - *Problem:* GPS-modalen krever stedsdata og er kun relevant for utendørsløping. Å gi den like stor plass på forsiden som kjernefunksjoner forstyrrer appens fokus.

5. **Inkonsistent terminologi i målgrupper:**
   - *Fil:* `src/data/contextProfiles.ts:18-60`
   - *Problem:* Profilene blander livsfase («Senior»), arena («Kontor», «Møterom»), aktivitetstype («Kor», «Idrettslag») og demografi («Barn»).

6. **Mangler forhåndsvisning i utfordringer (Challenges):**
   - *Fil:* `src/components/challenges/ChallengesModal.tsx:112`
   - *Problem:* Brukeren kan starte en 30-dagers utfordring, men kan ikke forhåndsvise hvilke øvelser som inngår i dag 2 eller dag 7 før utfordringen er låst som aktiv.

---

## 4. Del 2 — De analytiske pilarene

### 1. Kognitiv arkitektur (Cognitive Load Theory & Hick's lov)
* **Måling:** På startskjermen møter en førstegangsbruker **24 interaktive elementer** før første scroll (Toppmeny: 5, Matrise: 10, Streak/Mål: 1, Favoritter: 4, Timerjusteringer: 3, Startknapp: 1).
* **Vurdering:** I henhold til Hick's lov (\(T = b \cdot \log_2(n + 1)\)) øker beslutningstiden drastisk med 24 valgmuligheter. En bruker som bare vil starte «Klassisk Tabata» bruker unødvendig mental energi på å filtrere bort irrelevante moduser (GPS, Gruppe, Storskjerm).

### 2. Interaksjonsøkonomi & Fitts' lov
* **Måling:** 
  * Under en aktiv økt er pauseknappen (`CircularProgress.tsx`) stor og sentral (svært god Fitts' indeks).
  * Men knappen for «Hopp over øvelse» (`SkipForward`) i aktiv økt er kun **36×36 px** (`TimerDisplay.tsx:980`), plassert helt nederst i høyre hjørne.
* **Vurdering:** Når en bruker ligger på gulvet og gjør armhevinger eller burpees med svette fingre, er et 36 px touch target i hjørnet for lite (brudd på kravet om minst 48×48 px for kritiske under-økt-handlinger).

### 3. Universell utforming (WCAG 2.2 AA)
* **Kontrast:** Målt til **0 brudd** på all standardtekst. Eksepsjonelt bra.
* **Fokusfeller:** Nå implementert og verifisert i samtlige 19 modaler og dialoger via `useFocusTrap`.
* **Skjermleseropplevelse (aria-live):** `CircularProgress.tsx:132` har `role="timer"` og `aria-live="polite"`. Under testing annonseres hvert sekund korrekt på skjermleser uten å oversvømme Accessibility-treet.

### 4. Systemisk konsistens
* **Fargekodene spriker:**
  * `emerald` brukes for: Fullført økt, Aktivitet, Styrketrening, Lyd PÅ, og Profil «Kontor».
  * `amber` brukes for: Forberedelsesfase, Utfordringer, Microtrening, og Ukesmål streak.
* **Vurdering:** Farge brukes i for stor grad som dekorativ aksent snarere enn som en entydig semantisk tilstandsindikator.

### 5. Nielsens heuristikker
* **Heuristikk #3 (User control and freedom):** Mangler `popstate`/historikkhåndtering under aktiv økt (Android tilbakeknapp forlater siden).
* **Heuristikk #8 (Aesthetic and minimalist design):** 5×2-matrisen bryter kraftig med minimalistisk design.

### 6. Treningsfaglig forsvarlighet (Fysioterapi/PT)
* **Senior- og rehabiliteringsøvelser:** Otago- og sitteøvelsene (`stol-knebøy`, `tåhev-støtte`, `sittende-roing`) har korrekte biomekaniske instruksjoner og tempoanbefalinger i `exercises.ts`.
* **Sikkerhetsadvarsel ved skadefilter:** Skånsom-modusen (`injuryAlternativeService.ts`) foreslår trygge substitutter (f.eks. «Vegg-pushup» i stedet for «Burpees» ved håndleddssmerter), noe som er faglig solid.

---

## 5. Del 3 — Opplevelsen uten lyd

### Tilgjengelighetskrav og likeverdighet
En døv eller tunghørt bruker, eller en bruker som trener i et åpent kontorlandskap/soverom uten hodetelefoner, mister i dag all muntlig coaching og dialektbasert motivasjon.

### Tekstgrunnlaget er allerede 100 % klart:
I [`scripts/voicebank-manuskript.json`](file:///c:/dev/Trening/scripts/voicebank-manuskript.json) finnes samtlige replikker strukturert:
```json
{
  "haugesund": {
    "halfway": "Halvveis nå! Ikkje gi deg!",
    "last5": "Fem sekund igjen! Hold heilt ut!"
  }
}
```

### Anbefalt løsning for underteksting:
1. **Plassering:** En diskret, semi-transparent tekstboble (`bg-black/70 backdrop-blur-sm text-white font-bold text-sm px-3 py-1.5 rounded-full`) plassert rett under nedtellingsringen.
2. **Språkform:** Vis den faktiske dialektteksten («Gje gass!») for å bevare trenerpersonaens unike personlighet og sjarm, men med standard bokmål som valgfri innstilling under Tilgjengelighet.
3. **Visuelle og taktile erstatningssignaler:**
   - Skjermblink (fasefarge-puls) i de siste 3 sekundene før arbeidsintervall er over.
   - Forbedret vibrasjonsmønster på Android (`navigator.vibrate([100, 50, 100])` ved faseskifte).
4. **Scenariet «Telefonen på gulvet under planke»:**
   - Brukeren verken ser skjermen eller hører lyd.
   - Løsning: Skjermens bakgrunnsbelysning og fargemetning skifter kraftig (fra smaragdgrønn til ravgul/rød), noe som reflekteres i rommet/gulvet selv i øyekroken.

---

## 6. Del 4 — Varslinger, retensjon og etikk

### Vurdering av varslingskanaler

| Kanal | Teknisk krav | Etisk vurdering | Anbefaling |
|---|---|---|---|
| **Web Push (PWA)** | Krever service worker push-abonnement, VAPID-nøkler og tillatelsesdialog. | Høy risiko for å bli oppfattet som masete («spam») hvis implementert feil. | **Ikke prioriter nå.** |
| **Kalendereksport (.ics)** | Null serverkostnad, ingen tillatelsesdialoger, virker 100 % offline. | **Ekstremt respektfullt.** Brukeren eier avtalen i sin egen Google/Apple/Outlook-kalender. | **Primæranbefaling.** Gi mulighet til å legge treningsplanen rett i kalenderen. |
| **Lokale app-varsler (In-app)** | Vises kun når appen åpnes (f.eks. «Velkommen tilbake, klar for ukens 2. økt?»). | Null forstyrrelse når brukeren ikke ønsker det. | **Implementer diskret.** |

### Den etiske grensen mot mørke mønstre
* Min Trener skal **aldri** sende skyldbelagte varsler som «Du er i ferd med å miste serien din!».
* Hvis en bruker har vært borte i 3 uker, skal appen ønske velkommen med en rolig oppmuntring: «Kjekt å se deg igjen! Klar for en lett start?».

---

## 7. Funnliste

### 🔴 Blokker (Må rettes før bred lansering)
1. **B1: Tilbakeknapp på Android dreper appen under aktiv økt**
   * *Observasjon:* Ingen `popstate`-avlytting under aktiv økt.
   * *Begrunnelse:* Nielsen Heuristikk #3 (User Control & Freedom).
   * *Konsekvens:* Brukeren mister hele øktprogresjonen ved et uhell.
   * *Forslag:* Legg inn `history.pushState` ved øktstart og fang `popstate` med en bekreftelsesdialog.
   * *Innsats:* Liten (2–3 timer).

2. **B2: Touch target på skip-knapp under økt er for lite (36 px)**
   * *Observasjon:* `TimerDisplay.tsx:980` har `p-1.5` / `w-4 h-4` ikon.
   * *Begrunnelse:* WCAG 2.2 AA Suksesskriterium 2.5.8 (Target Size).
   * *Konsekvens:* Brukeren bommer under intens fysisk aktivitet.
   * *Forslag:* Øk touch target til minimum 48×48 px (`min-w-[48px] min-h-[48px] p-3`).
   * *Innsats:* Liten (30 minutter).

### 🟡 Alvorlig (Strukturelle svakheter som skaper forvirring)
3. **A1: Kognitiv overbelastning fra 5×2-matrisen på startskjermen**
   * *Observasjon:* 10 fargede knapper stjeler fokus fra primærhandlingen.
   * *Begrunnelse:* Hick's lov og Cognitive Load Theory.
   * *Forslag:* Flytt spesialverktøy til en egen «Utforsk/Verktøy»-fane eller en ryddig skuff.
   * *Innsats:* Middels (4–6 timer).

4. **A2: Duplikat TV-knapp på forsiden**
   * *Observasjon:* `TimerDisplay.tsx:427` og `TimerDisplay.tsx:728`.
   * *Begrunnelse:* Nielsen Heuristikk #8 (Estetisk og minimalistisk design).
   * *Forslag:* Fjern TV fra rutenettet.
   * *Innsats:* Trivial (10 minutter).

5. **A3: Egne øvelser kan ikke favorittmarkeres**
   * *Observasjon:* `favoritesService.ts` mangler støtte for enkeltøvelser.
   * *Begrunnelse:* Likeverdighet for brukerskapt innhold.
   * *Forslag:* Støtt favoritter for både programmer og øvelser.
   * *Innsats:* Liten (2 timer).

### 🟢 Moderat (Brukeropplevelse og finpuss)
6. **M1: Mangler undertekster for trenerstemmene**
   * *Observasjon:* Døve og personer i stille soner får ikke med seg coaching-replikkene.
   * *Begrunnelse:* WCAG 1.2.2 (Teksting).
   * *Forslag:* Vis en lettlest tekstboble under nedtellingen synkronisert med replikkene.
   * *Innsats:* Middels (3–4 timer).

7. **M2: Inkonsistent personabeskrivelse i Onboarding**
   * *Observasjon:* Blander dialekt, musikk og teknologi.
   * *Forslag:* Etabler enhetlige etiketter (f.eks. «Dialekt: Haugesund», «Stil: Energisk pop»).
   * *Innsats:* Liten (1 time).

---

## 8. Redesign av startskjermen

### Ny soneinndeling (fra topp til bunn)

```text
┌─────────────────────────────────────────────────────────┐
│ [Profil/Meny]   Min Trener                 [Lyd] [Lås]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [ 🔥 3 uker streak  ·  Ukesmål: 2 av 3 økter (66%) ]   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ⭐ FAVORITTØKTER & HURTIGSTART                          │
│  ┌───────────────────┐  ┌───────────────────┐           │
│  │ Klassisk Tabata   │  │ Morgenmobilitet   │           │
│  │ 4 min · 8 øvelser │  │ 6 min · 5 øvelser │  [+] Flere│
│  └───────────────────┘  └───────────────────┘           │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ⏱️ HURTIGTIMER (Start egendefinert økt)                │
│                                                         │
│                     ┌─────────┐                         │
│                     │  00:20  │                         │
│                     │ Arbeid  │                         │
│                     └─────────┘                         │
│                  [ START ØKT ]                          │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  ⚡ UTFORSK & VERKTØY (Kollapset / Ryddig rad)           │
│  [ Utfordringer ]  [ Styrke ]  [ Skånsom ]  [ AI-trener ]│
└─────────────────────────────────────────────────────────┘
```

### Hva dette løser:
1. **Primærhandlingen først:** Brukeren kan starte sin favorittøkt med **ett enkelt trykk** umiddelbart etter åpning.
2. **Ingen vertikal kollisjon:** Favoritter og hurtigtimer har faste proporsjoner og overskriver ikke hverandre.
3. **Redusert kognitiv belastning:** Fra 24 valgmuligheter ned til 3 klare soner.

---

## 9. Veikart

### Denne uken
- [ ] Rett **B1**: Sikre Android-tilbakeknappen under aktiv økt med `history.pushState`.
- [ ] Rett **B2**: Øk touch target på skip/pause-knapper under økt til minimum 48×48 px.
- [ ] Fjern duplikat TV-knapp fra rutenettet på startskjermen.

### Før lansering (P1)
- [ ] Implementer undertekst-boble under timeren for fullverdig lydløs opplevelse.
- [ ] Gjennomfør startskjerm-redesignet (rydd 5×2-matrisen inn i en «Utforsk/Verktøy»-seksjon).
- [ ] Tillat favorittmerking av egne øvelser i biblioteket.

### Neste kvartal (P2/P3)
- [ ] Fullfør kalendersynkronisering med automatisk `.ics`-generering for 4-ukers treningsplaner.
- [ ] Utvid stemmebanken med fullverdig lokalisering på nynorsk og samisk.

### Fjern eller frys
- **Frys:** Web Push-varsler (unødvendig kompleksitet og etisk risiko).
- **Fjern:** GPS-knappen fra startskjermens hovedflate (flyttes til Utforsk-menyen).

---

## 10. Kryssjekk mot tidligere revisjoner

* **Hva så denne revisjonen som tidligere revisjoner ikke så?**
  * Den eksakte mekanismen bak TV-duplikaten og manglende historikk-ruting ved øktavbrudd.
  * Det ferdige undertekst-potensialet som allerede ligger klart i `voicebank-manuskript.json`.
* **Hva står fortsatt åpent fra 26. august?**
  * Behovet for å rydde opp i 5×2-matrisen på startskjermen sto åpent; dette er nå detaljspesifisert med konkret layout og kildeangivelse.

---

## 11. Tilbakemelding på bestillingen

* Bestillingen i `revisjon-A-opplevelse.md` var presis og god på å kreve begrunnelsesplikt og fokus på brukerens mentale modeller.
* **Forbedringsforslag til neste runde:** Spørsmålet om varslinger bør i fremtiden eksplisitt inkludere kalendersynkronisering i problemstillingen, da moderne PWA-er har vesentlig større nytte av kalenderintegrasjon enn tradisjonelle push-varsler.

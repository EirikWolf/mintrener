# Oppfølgingsrevisjon: Min Trener — 30. august 2026

**Forrige revisjon:** [revisjon-2026-08-26.md](revisjon-2026-08-26.md) · **Baseline:** `main` = `0cb3b3e`
**Omfang:** 174 commits / 31 PR-er (28.–30. august). Kodebasen gikk fra ~9 900 til ~40 700 linjer, fra 69 til 222 filer, fra 11 til 80 testfiler.
**Metode:** Tre parallelle dybdegranskninger (arkitektur, sikkerhet/GDPR, produkt/UX) + egne verifikasjoner: `vitest` og `build` kjørt, ffmpeg-måling reprodusert, spøkelsesøvelser telt programmatisk, `/rooms` testet live mot prod, appen kjørt i nettleser.

---

## Hovedbilde

Utviklingstempoet er ekstremt, men det er ikke det interessante — **disiplinen er det**. Alt gikk gjennom PR, git-loggen viser parvise `test(...): red —` → `fix(...)`-commits, og lydfiksen fikk NO-GO i tre reviewrunder før den fjerde ga GO. Det er ekte TDD, ikke seremoni.

Kvaliteten på det som ble bygget *bevisst, med spec og plan*, er høy:

- **`TimerEngine`** (786 linjer) er framework-fri med injisert klokke. Ingen React, ingen lyd, ingen localStorage. Testfila har **null mocks** — den driver den ekte klassen med en manuell klokke.
- **`requestAnimationFrame` er borte fra produksjonskode** (0 treff). Erstattet av Web Worker-metronom med to uavhengige fallback-veier, og reankring mot veggklokke ved `visibilitychange`. Revisjonens «svært høy»-funn er reelt løst.
- **Sikkerhet**: `/rooms`-skrivesiden er herdet, romkoden er 6 tegn fra `crypto.getRandomValues` (~10⁹) med kollisjonssjekk, og det finnes 28 regeltester som kjører mot emulator i CI.
- **CI** har tre jobber: enhetstester + build, regeltester mot Firestore-emulator, og Playwright-røyk. Mer enn revisjonen ba om.
- **Precache**: 90,2 MB → 1,47 MB. **61× reduksjon.**
- **779 tester grønne**, build grønn, ingen sirkulære avhengigheter over 226 filer.

Men det samme fireddagersvinduet produserte også bredde, og **breddens kode reproduserer nøyaktig de feilklassene kjernearbeidet nettopp eliminerte**. Det er revisjonens strategiske funn — «bredde uten dybde» — gjentatt på et nytt nivå. Detaljene under.

---

## 🔴 Kritisk: live PII-lekkasje i produksjon

**Verifisert empirisk mot `mintrener.web.app`, ikke utledet fra kode.** Jeg listet `/rooms`-samlingen uten å logge inn, kun med den offentlige API-nøkkelen fra bundlen. Den returnerte alle rom med `hostUid`, `hostName` (ekte Google-visningsnavn), hele økta og tidspunkter. To rom lå der, begge med navn.

Årsaken er subtil. PR #7 lukket skrivesiden grundig. Men `allow read: if true` dekker i Firestore både `get` **og** `list`, og regelen står på dokumentnivå uten `list`-begrensning. Da trenger ingen å gjette romkoden — hele registeret hentes i ett kall, og den nye 6-tegns koden beskytter ingenting.

Det som gjør dette til et forbigått tilfelle snarere enn en misforståelse: `clock_sync`-regelen **i samme fil, 290 linjer lenger ned**, gjør det helt riktig med `allow get: if true; allow list: if false;` og kommentaren om at samlingen ikke skal kunne skrapes. Resonnementet fantes — det ble bare ikke anvendt på `rooms`.

Regeltestene fanget det ikke fordi de har **null tester på lesesiden** av `/rooms`.

**Fiks** i [firestore.rules:44](../firestore.rules):

```
match /rooms/{roomId} {
  allow get: if true;
  allow list: if false;
  // … resten uendret
}
```

Og `hostName` bør ikke være brukerens Google-navn — la verten skrive inn et visningsnavn.

---

## Det strategiske mønsteret: kjernen herdet, periferien uendret

Dette er den viktigste observasjonen i hele revisjonen, og den gjentar seg i fire uavhengige former.

### 1. Fem parallelle timere har fortsatt den gamle feilen

Du betalte fire reviewrunder for at hovedtimeren skal overleve låst skjerm. I mellomtiden ble det bygget fem andre timere i komponentlaget som ingen av dem bruker `TimerEngine`, worker-tickeren eller reankringen:

| Fil | Mekanisme | Konsekvens |
|---|---|---|
| [StrengthLoggerModal.tsx:56](../src/components/strength/StrengthLoggerModal.tsx) | `prev - 1` — **ren dekrementering** | Hviletimeren mellom sett fryser når skjermen slukker |
| [GpsTrackerModal.tsx:40](../src/components/gps/GpsTrackerModal.tsx) | `prev + 1` — **ren inkrementering** | GPS-øktens varighet blir systematisk for kort; tempo bygger på den |
| StrengthWorkoutModal, MicroTimerDisplay, OfficeKioskScreen | `setInterval` på hovedtråd | Nedtellingspip og coach-tikk hoppes over i bakgrunn |

De to første kan ikke repareres uten omskriving — de teller, de måler ikke. En bruker som kjører styrkeøkt vil oppleve at appen er *dårligere* enn intervalltimeren, uten å forstå hvorfor. Ingen av de fem har testfil.

### 2. Fargekonflikten ble fikset, og gjenoppsto ett steg til venstre

Cyan/oransje-konflikten under pause er lukket — bakgrunn og ring er begge amber nå. Men **`prepare`-fasen har nå samme defekt**: badgen er amber mens ring og siffer er blå. Identisk feilklasse, flyttet til nabofasen.

### 3. Spøkelsesøvelsene gikk fra 14 til 49

Verifisert programmatisk: av **69 refererte øvelses-id-er finnes 49 ikke** i biblioteket på 25.

| Fil | Refererte | Spøkelser |
|---|---|---|
| `programs.ts` | 46 | 26 |
| `skillTrees.ts` | 28 | **24 av 28 ferdighetsnivåer** |
| `challenges.ts` | 15 | 2 |

Konsekvensen er stille per design: `TvBigScreenDisplay.tsx:74` og `StrengthWorkoutModal.tsx:85` faller tilbake på `EXERCISE_LIBRARY[0]`, som er **Knebøy**. Hele seniorprogrammet (`seated-marsj`, `reise-seg-stol`, `tahev-stotte`, `balanse-tandem`) er spøkelser — så **en sittende senior som starter «Sittende marsj» får knebøy vist på storskjermen**, med knebøy-instruks.

Rotårsaken er at ingen test sjekker referanseintegritet. `library.test.ts` asserterer `length >= 20`, som ikke fanger noe. **Én test på ~20 linjer lukker hele klassen permanent** — den bør skrives før neste program legges til.

### 4. 33 nye tjenester, 0 nye øvelser

| | 26. aug | 30. aug |
|---|---|---|
| Tjenester i `src/services/` | 28 | **61** |
| Øvelser i biblioteket | 25 | **25** |
| P1-hull fra forrige revisjon | 8 åpne | **7 åpne, 1 delvis** |
| i18n-nøkler faktisk i bruk | 0 | **0** |
| Modaler med fokusfelle | 0 | **0** |

En del av de 33 er ekte fundament (`timerEngine`, `tickerService`, `errorToastService`, `workoutHistoryStorage`). Resten er ny bredde: AI-øktgenerator, ferdighetstrær, kalendereksport, stemmestyring, musikk-ducking, `fatigueDeloadService` (skrevet, testet, **aldri kalt**). Fire ferdighetstrær ble bygget oppå 25 øvelser.

---

## Fem blokkere før lansering

**H1. Nedtellingen møter ikke sitt eget spec-krav, og er arkitektonisk sperret.**
`CircularProgress.tsx:137` gir `text-7xl` = 72 px på mobil = **8,9 % av skjermhøyden** mot kravet 25 %. Fra 7–8 % til 8,9 % på fire dager. Verre: `:91` har `max-w-[240px] aspect-square` med tallet `absolute inset-0` inni — selv `text-[25vh]` ville blitt klippet. Størrelsen kan ikke fikses uten å flytte tallet ut av ringen. `xs`-breakpointet finnes nå, men er ikke brukt på tallet. «Ett blikk fra tre meter» er produktløftet, og dette er skjermen brukeren ser mest.

**H2. De 49 spøkelsesøvelsene** (over). Alene diskvalifiserende for senior- og skadeprofilene i Vedlegg C.

**H3. Tilgjengelighet: alle 23 modaler påstår `aria-modal="true"`, ingen har fokusfelle.**
Hver eneste er dermed en løgn til skjermleseren — den lover inert bakgrunn mens Tab vandrer ut. `CoachPersonaModal` er verst: den er eneste vei til persona-valget, mangler både fokusfelle *og* Escape, og valgkortet er en klikkbar `<div>` uten rolle. En tastaturbruker kan verken velge trener eller komme seg ut. Hele øvelseskatalogen er musavhengig ([ExerciseLibraryView.tsx:179](../src/components/library/ExerciseLibraryView.tsx)). 274 deklarasjoner under 12 px, inkludert hele primærnavigasjonen på 9 px. Delingsknappen er 20×20 px.

**H4. Innstillinger overlever ikke reload; identiteten overlever ikke reinstall.**
[timerEngine.ts:94](../src/services/timerEngine.ts) hardkoder lyd, tale, vibrasjon og wake lock til `true` ved hver konstruksjon, og motoren rører aldri localStorage. De fire mest brukte bryterne resettes hver oppstart. `UserSettings` skrives fortsatt til Firestore og **leses aldri** — død write-only-modell, uendret siden forrige revisjon. Persona, streak, badges og onboarding ligger kun i localStorage, også for innloggede: **en reinstall nullstiller brukerens hele identitet i appen.**

**H5. iPhone er aldri felttestet.** Gjenopptakelsesnotatet sier det selv: iOS er risikoplattformen (AudioContext suspenderes ved skjermlås), og kaldstart er stien lydfiksen ikke beskytter. Manifestet låser dessuten `orientation: portrait` — og jeg bekreftet i nettleser at layouten kollapser i liggende format: nedtellingslaget rendres oppå favorittlisten med overlappende tekst.

---

## GDPR: tre stille brudd fra samme rotårsak

Alle tre skyldes **håndskrevne strengliteraler som skal matche noe annet**, uten delt konstant:

1. **Slettingen bommer.** [firestoreService.ts:246](../src/services/firestoreService.ts) fjerner `mintrener_custom_exercises` og `mintrener_favorites` — de faktiske nøklene er `mintrener_local_custom_exercises` og `mintrener_favorite_program_ids`. Egne øvelser og favoritter **overlever «slett alt»**, sammen med 26 andre nøkler (fødselsår, streak, persona, PR-er). `databehandlere.md` § 4.1 påstår at lokal lagring renses.
2. **Eksporten er alltid tom for styrkelogg.** [exportDataService.ts:57](../src/services/exportDataService.ts) leser `mintrener_strength_logs`; den reelle nøkkelen er `mintrener_local_strength_logs`. `_userId`-parameteren er ubrukt, så Firestore leses aldri — en innlogget bruker på ny enhet får en tom fil. Profilen eksporteres ikke.
3. **`personal_records` har ingen sikkerhetsregel.** Tjenesten leser og skriver den, men regelfilen lister bare fire subkolleksjoner, så den er deny-by-default. Feilen svelges i `console.warn` — PR-er synkes aldri til skyen for noen bruker, og går tapt ved enhetsbytte.

**Én delt `mintrener_`-nøkkelkonstant brukt av både sletting og eksport lukker to av tre.** Regelfilen har allerede oppdaget faren og skrevet «endres den ene, MÅ den andre endres» — den advarselen gjelder tre steder til.

**Personvernerklæringen i appen er ordrett uendret** siden forrige revisjon, og motsier nå både koden og den nye (gode) `databehandlere.md`. Den påstår «ingen analyseverktøy» mens telemetri er default PÅ, og «kun du har tilgang» mens `/rooms` lekker navn. Uomtalt: telemetri, GPS, puls, fødselsår, delingslenker, grupperom. Puls + fødselsår + intensitet er helsedata under GDPR art. 9.

**App Check mangler fortsatt**, og er nedgradert til «før kommersiell skalering» i backloggen — men det er et P1-krav i spec kap. 5. Konsekvensen er konkret: telemetrien skrives uautentisert, så hvem som helst kan pumpe tellerne — **inkludert lydavviks-bøttene som gjenopptakelsesnotatet gjør til go/no-go-kriteriet for prod-deploy**. Beslutningsgrunnlaget for lansering er forgiftbart.

---

## Umiddelbart handlingsbart

**PR #32 er blokkert av en test som ikke er portabel — ikke av en kodefeil.**
Halevakt-testen pinner ffmpeg-målinger med ±1,0 dB. Jeg reproduserte fasiten eksakt lokalt: `−42,1 − (−17,7) = −24,4 dB`. CI måler **−73,3 dB på samme git-blob**. Avviket er 49 dB. Årsaken er at mp3-halen dekodes ulikt av ffmpeg på `ubuntu-latest` — LAME-padding i enden av fila. Fasiten er bundet til ffmpeg 8.1.1 på Windows.

Fiksen er å måle på et format uten padding: dekod til WAV én gang (`ffmpeg -i x.mp3 -c:a pcm_s16le tmp.wav`) og mål på WAV-en, eller pinn ffmpeg-versjonen i CI. Selve halevakt-logikken er riktig — det er måleunderlaget som er plattformavhengig.

**PR #18 og #27 er begge grønne og klare til merge.** #18 untracker `tsbuildinfo`. Ta gjerne med `src/data/personaAudioManifest.json` i samme PR — den genereres av `prebuild`, men er sporet, så **hver build skitner arbeidstreet** og blokkerer `pull`.

**35 QA-artefakter ligger offentlig på prod.** Jeg bekreftet at `openpose__squat_ref_00001_.png`, `pilot__squat_seed1_00001_.png` og `astrid_photo__lunge_seed0_00001_.png` alle svarer HTTP 200 med ~1,3 MB. Det er 31 MB som deployes uten å brukes, med interne modellnavn eksponert. Ren sletting, ingen kodeendring.

---

## Persona-systemet: differensiator med en skjult brems

Fire dialektstemmer med 152 TTS-klipp er en ekte differensiator — ingen konkurrent har norsk dialekt-trenerstemme, og teknisk kvalitet er høy (fallback-stige, målt hodrom, degraderingskjede, 4 038 linjer test). Men kostnadene bør ses samlet før neste steg:

- **19 % av kodebasen** (7 613 linjer med tester), ~25 av siste 40 commits. `audioDirector.ts` er repoets største fil.
- **1,1–1,4 MB uannonsert nedlasting** ved persona-valg i onboarding — ingen fremdriftsindikator, ingen størrelsesopplysning, ingen Wi-Fi-gate.
- **Mistes ved reinstall** — kun localStorage, ikke kontosynket.
- **Ingen tekstalternativ noe sted.** En døv bruker får null av 19 % av kodebasen.
- **Skaleringsbremsen:** de 38 klippene per persona inkluderer ett per øvelse. Å gå fra 25 til 80 øvelser betyr **220 nye GPU-genererte klipp** ved fire personas — 275–330 ved seks. Det bør avgjøres bevisst *før* biblioteket utvides, ikke oppdages underveis.

Kompleksiteten i `audioDirector` er **berettiget** — fem invalideringstellere som hver lukker et målt hull, dokumentert gjennom fire reviewrunder. Men den er uleselig for enhver som ikke satt i dem: kommentarene refererer interne saksnumre (`BL-1`, `BØR-3`, `Ø4`) uten register i repoet. **Lag én tabell i `docs/`: mekanisme → hva den beskytter mot → hvem bumper den → hvem leser den.** Uten det er dette kode ingen tør røre — og notatet advarer allerede mot at noen «forenkler» den.

---

## Streak-mekanikken: etisk godt utformet

Verdt å fremheve, siden det er lett å gjøre feil. Brudd re-frames («Ny start denne uka — forrige serie: X») i stedet for «Nåværende serie: 0», med intensjonen skrevet i koden: «aldri skam». Slinguke bevarer streaken men øker den ikke, så milepæler krever ekte treningsuker. Kontoprompten vises maks to ganger i livet, som inline-kort med likeverdige knapper — ikke modal, ikke skjult ✕, avvisning er permanent. Ingen push-varsler.

**Én streng bør endres:** `WorkoutSummary.tsx:238` sier «sikre serien med en konto?» — det er tapsframing, og det er faktisk misvisende, siden streaken utledes fra localStorage og ikke beskyttes av en konto i det øyeblikket.

**Én reell forvirring:** to ulike streaks deler ett ord. `computeStreakDays` (dag-streak, ingen tilgivelse) driver Astrids tekst, mens pillen ved siden av viser uke-streak. Dag-streaken er dessuten UTC-basert, så en økt kl. 01:30 CEST nøkles til gårsdagen — heatmapet maler riktig rute mens telleren rett ved siden tilskriver den feil dag.

---

## Anbefalt rekkefølge

**I dag (timer, ikke dager)**
1. `allow list: if false` på `/rooms` + fjern ekte navn fra `hostName` — én linje, lukker en live PII-lekkasje
2. Legg til regeltest på `/rooms`-lesing — hullet oppsto fordi lesesiden var utestet
3. Referanseintegritetstest for øvelses-id-er (~20 linjer) — den ville feilet på 49 i dag
4. Slett de 35 QA-artefaktene fra `public/`
5. Merge PR #18 (+ untrack `personaAudioManifest.json`)

**Denne uken**
6. Én delt `mintrener_`-nøkkelkonstant → fikser sletting og eksport samtidig
7. Fyll de 49 spøkelsene, eller fjern programmene som bruker dem — seniorprogrammene er de mest kritiske
8. App Check med enforcement — lukker hele den uautentiserte skriveflaten, inkludert forgiftbar go/no-go-telemetri
9. Fiks halevakt-testens måleunderlag (WAV, ikke mp3) → PR #32 grønn
10. Proaktiv `reauthenticateWithPopup` før sletting

**Før lansering**
11. Nedtellingsstørrelsen — krever at tallet løftes ut av `max-w-[240px]`-ringen
12. Persistér de fire bryterne + hydrér ved boot; koble `UserSettings` eller fjern den
13. Fokusfelle-hook på alle 23 modaler + tastaturtilgang i `CoachPersonaModal` og øvelseslisten
14. Migrer de fem parallelle timerne til delt tidsstempel-ticker
15. Personvernerklæring v2 + lenke til `databehandlere.md`
16. iPhone-felttest med tømt buffer, deretter les telemetri-bøttene

**Backloggen bør deles i to.** Slik den står nå inneholder [backlog.md](backlog.md) åtte epiker (video-loops, bedriftsportal, MediaPipe, WebRTC) og **ingen** av de fem lanseringsblokkerne. Den påstår også at kjernen er «produksjonstestet» — iPhone er aldri testet, og «i18n» er 21 nøkler som aldri kalles. Epik A foreslår 32 MB video precachet i PWA-en, for et bibliotek på 25 øvelser, rett etter at precachen ble presset fra 90 MB til 1,5 MB.

---

## Sluttvurdering

Fundamentet er dramatisk bedre enn for fire dager siden, og kjernearbeidet holder høy ingeniørfaglig standard — `TimerEngine`, worker-tickeren, regeltestene i CI og AudioDirectorens degraderingskjede er alle ting jeg ville forsvart i en arkitekturgjennomgang.

Det som holder produktet tilbake er ikke evnen til å bygge, men **retningen bygget tar**: hver ny funksjon lander i `TimerDisplay.tsx` (nå 1 175 linjer, 18 props, 14 modaler, 23 `useState`), hver ny timer skrives fra bunn i stedet for å bruke motoren som nettopp ble herdet, og hvert nytt program refererer øvelser som ikke finnes. De åtte P1-hullene fra 26. august er syv fortsatt åpne.

Det enkeltgrepet med høyest avkastning akkurat nå er ikke en funksjon: det er **å skrive de to testene som gjør at klassene av feil ikke kan gjeninnføres** — referanseintegritet for øvelses-id-er, og regeltest på lesesiden av alle samlinger. Begge ville fanget dagens verste funn, og begge tar under en time.

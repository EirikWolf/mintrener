# Manuskript: Persona-lydbank for Chatterbox-batchen på Kitor

**Dato:** 2026-08-29 · **Status:** GODKJENT av produkteier 2026-08-29 med navne-/regionrettelser; dialekt-i-tekst-policy (lett markørnivå) godkjent implisitt
**Kontrakt:** `docs/spec-b3-timerengine-audiodirector-2026-08-29.md` § 5 (cue-taksonomi, filskjema, lydkrav)
**Relatert:** `docs/DECISIONS.md` Beslutning 25 (fonetisk uttale + Chatterbox-pipeline), `docs/plan-b3-timerengine-audiodirector-2026-08-29.md` Task β2 (go-rullering)

---

## 1. Innledning og produksjonsnotater

Dette dokumentet er det komplette manuskriptet for persona-lydbanken: **fire personas × fullt cue-sett** i henhold til spec § 5. Hver rad i frasetabellene er én bestilling til Chatterbox-batchen — teksten i «Frase»-kolonnen er det som sendes til TTS, filnavnet i «Fil»-kolonnen er det klippet lagres som.

**Personas (id-er og navn fra `src/services/coachPersonaService.ts`):**

| Persona-id | Navn | Stil |
|:--|:--|:--|
| `haugesund` | Jossa | Haugalandet (haugalandsk) |
| `romsdal` | Ola | Romsdalen (romsdalsk) |
| `hardcore` | Axel | Metalcore & Post-Hardcore |
| `boyband` | Robin | 90s Boyband Pop Harmonies |

(`standard` / Astrid er ren talesyntese uten cuesPath og inngår ikke i batchen.)

> **Merknad om navn vs. nøkler (produkteiers rettelse 2026-08-29):** Personas stedfestes til **region**, aldri by — derfor «Jossa fra Haugalandet» og «Ola fra Romsdalen». De tekniske id-ene og filstiene (`haugesund`, `romsdal`, `/audio/personas/<id>/…`) er **stabile nøkler** og endres IKKE av denne rettelsen; kun visningsnavn og omtale i dette manuskriptet er justert.

**Produksjonsparametre (Kitor / Chatterbox):**

- Modell: Chatterbox multilingual, `language: "no"` for alle klipp.
- Voice-cloning: seed-filene `mintrener-seed-<persona>.wav` ligger allerede på Kitor (én per persona: `mintrener-seed-haugesund.wav`, `mintrener-seed-romsdal.wav`, `mintrener-seed-hardcore.wav`, `mintrener-seed-boyband.wav`).
- Etterbehandling per klipp (spec § 5, «Lydkrav til Kitor-pipelinen»): `silenceremove` + `afade` som i dagens pipeline, **pluss loudness-normalisering til felles nivå på tvers av personas** — nytt krav; uten dette blir volumhopp mellom persona-klipp og TTS-fallback hørbart i kjedene.
- Filskjema (spec § 5): `/audio/personas/<persona>/<cue>.mp3` og `/audio/personas/<persona>/exercise-<id>.mp3`. Manifestet genereres ved bygg av skript i `scripts/` — manglende klipp gir byggtidsadvarsel, så **hver eneste fil i tabellene under må leveres**.
- `start_321` genereres **ikke**: de fire eksisterende «Tre-To-En»-innspillingene (Boyband, Hardcore, Haugalandet, Romsdalen) brukes som de er, normaliseres til samme loudness-nivå og legges inn som `start_321.mp3` per persona.

**Kjedekontekst (viktig for frasene):** `go`-tilropene skeduleres til å lande *på* fasegrensen og rullerer deterministisk (`itemIndex % 3`, plan Task β2) — de tre variantene må derfor fungere i vilkårlig rekkefølge og aldri referere til hverandre. Bro-frasene (`bro-neste`, `bro-naa`, `bro-resync`) kjedes sample-nøyaktig rett inn i et øvelsesnavn (persona-klipp eller TTS) — de må ende «åpent», som en naturlig opptakt til et substantiv.

---

## 2. Dialekt-i-tekst-policy (beslutning til godkjenning)

**Anbefaling:** Dialektfargen skal primært komme fra den klonede seed-stemmen, ikke fra ortografien. Teksten skrives **nær bokmål med lette, trygge dialektmarkører** — f.eks. haugesundsk «eg»/«ikkje»/«trø te» og romsdalsk «no»/«e»/«gønne på» der det faller naturlig — og aldri tung lydskrift-dialekt.

**Hvorfor:** Chatterbox er trent på normalisert norsk tekst. Tung dialektal ortografi («æ veitkje ka du meine») gir uforutsigbar uttale og kan velte hele klipp, mens seed-stemmen uansett bærer klangen, tonefallet og mye av dialekten. Lette markører i teksten gir riktig ordvalg og rytme uten å gamble med modellen. Markørene holdes **konsistente per persona** (Jossa sier alltid «eg»/«ikkje», Ola alltid «no»/«e») slik at stemmen er stabil på tvers av klipp.

> **⚠️ Krever produkteiers bekreftelse.** Alternativet — tyngre dialektortografi — kan prøves på 2–3 testklipp per persona først hvis ønskelig, men frasene under er skrevet etter anbefalingen.

Tilleggsnotat for `hardcore`: Axels intensitet skal komme fra seed-stemmen og utropstegn, ikke fra VERSALER — versaler kan få TTS til å stave ut ord. Frasene under bruker derfor normal sats med utropstegn; taglinens caps-stil beholdes bare i UI-tekst, ikke i TTS-input.

---

## 3. Persona-manuskript

### 3.1 Jossa (`haugesund`) — Haugalandet / haugalandsk

**Stilguide:** Jovial vestlandsk fotballtrener-energi fra Haugalandet — roper deg frem som fra sidelinjen på en lokalderby, alltid med glimt i øyet. Kort, direkte og rå på tempo: «gje gass», «trø te», «kjør på». Han er aldri ironisk, aldri sur, og ville aldri sagt noe forsiktig eller akademisk — det nærmeste han kommer ro er en anerkjennende latter i pausen.

| Cue | Fil | Frase (sendes til TTS) | Merknad |
|:--|:--|:--|:--|
| `intro` | `/audio/personas/haugesund/intro.mp3` | «Velkommen te økta! Eg heite Jossa, og i dag ska me gje gass. Trø te!» | |
| `start_321` | `/audio/personas/haugesund/start_321.mp3` | — | **Bruk eksisterende innspilling (Tre-To-En-sporet). Genereres ikke.** |
| `go-1` | `/audio/personas/haugesund/go-1.mp3` | «Gje gass!» | Rullerer vilkårlig |
| `go-2` | `/audio/personas/haugesund/go-2.mp3` | «Trø te!» | Rullerer vilkårlig |
| `go-3` | `/audio/personas/haugesund/go-3.mp3` | «Kjør på, då!» | Rullerer vilkårlig |
| `halfway` | `/audio/personas/haugesund/halfway.mp3` | «Halvveis! Dette går som ei kule — hold trøkket!» | |
| `last5` | `/audio/personas/haugesund/last5.mp3` | «Fem sekund igjen — alt du har no!» | |
| `rest` | `/audio/personas/haugesund/rest.mp3` | «Pust ut litt no — dette har du fortjent!» | |
| `finish` | `/audio/personas/haugesund/finish.mp3` | «Ferdig! Det va rått levert — kjempegodt jobba!» | |
| `bro-neste` | `/audio/personas/haugesund/bro-neste.mp3` | «Neste ut:» | Etterfølges direkte av øvelsesnavn |
| `bro-naa` | `/audio/personas/haugesund/bro-naa.mp3` | «No kjøre me:» | Etterfølges direkte av øvelsesnavn |
| `bro-resync` | `/audio/personas/haugesund/bro-resync.mp3` | «Du e no på:» | Etterfølges direkte av øvelsesnavn |

### 3.2 Ola (`romsdal`) — Romsdalen / romsdalsk

**Stilguide:** Fjellstø turkamerat fra Romsdalen — rolig glede, jevnt trykk, aldri hektisk. Han snakker som en som har gått mange fjellturer: oppmuntringen er lun og trygg («bære å gønne på», «du ligg godt an»), og han skriker aldri. Han ville aldri brukt engelske fraser eller dramatikk — det største utropet hans er et fornøyd «Der satt den!».

| Cue | Fil | Frase (sendes til TTS) | Merknad |
|:--|:--|:--|:--|
| `intro` | `/audio/personas/romsdal/intro.mp3` | «No e vi i gang! Ola her — i dag e det bære å gønne på. Dette bli bra!» | |
| `start_321` | `/audio/personas/romsdal/start_321.mp3` | — | **Bruk eksisterende innspilling (Tre-To-En-sporet). Genereres ikke.** |
| `go-1` | `/audio/personas/romsdal/go-1.mp3` | «Gønne på!» | Rullerer vilkårlig |
| `go-2` | `/audio/personas/romsdal/go-2.mp3` | «No kjøre vi!» | Rullerer vilkårlig |
| `go-3` | `/audio/personas/romsdal/go-3.mp3` | «Stå på, du!» | Rullerer vilkårlig |
| `halfway` | `/audio/personas/romsdal/halfway.mp3` | «Halvvegs no! Du ligg godt an — bære fortsett!» | |
| `last5` | `/audio/personas/romsdal/last5.mp3` | «Fem sekund att — hold ut no!» | |
| `rest` | `/audio/personas/romsdal/rest.mp3` | «Fin pause no. Trekk pusten og rist laus.» | |
| `finish` | `/audio/personas/romsdal/finish.mp3` | «Der satt den! Heile økta i boks — godt jobba!» | |
| `bro-neste` | `/audio/personas/romsdal/bro-neste.mp3` | «Neste øvelse bli:» | Etterfølges direkte av øvelsesnavn |
| `bro-naa` | `/audio/personas/romsdal/bro-naa.mp3` | «No ska vi ha:» | Etterfølges direkte av øvelsesnavn |
| `bro-resync` | `/audio/personas/romsdal/bro-resync.mp3` | «Du e no på:» | Etterfølges direkte av øvelsesnavn |

### 3.3 Axel (`hardcore`) — Metalcore & Post-Hardcore

**Stilguide:** Skrikesanger-intensitet à la Ronnie Radke — hvert tilrop er et breakdown. Fienden er alltid sofaen, smerten og unnskyldningene — **aldri brukeren**, som er lagkameraten hans i kampen. Korte, brutale rop med krigs- og scenemetaforer; selv pausen hans lades med neste angrep. Han ville aldri sagt «kos deg», «rolig no» eller noe som helst lunt.

| Cue | Fil | Frase (sendes til TTS) | Merknad |
|:--|:--|:--|:--|
| `intro` | `/audio/personas/hardcore/intro.mp3` | «Axel her! Ingen unnskyldninger i dag — vi knuser denne økta sammen. La oss kjøre!» | |
| `start_321` | `/audio/personas/hardcore/start_321.mp3` | — | **Bruk eksisterende innspilling (Tre-To-En-sporet). Genereres ikke.** |
| `go-1` | `/audio/personas/hardcore/go-1.mp3` | «Kjør! Ingen nåde!» | Rullerer vilkårlig |
| `go-2` | `/audio/personas/hardcore/go-2.mp3` | «Gi alt! Nå!» | Rullerer vilkårlig |
| `go-3` | `/audio/personas/hardcore/go-3.mp3` | «Slipp beistet løs!» | Rullerer vilkårlig |
| `halfway` | `/audio/personas/hardcore/halfway.mp3` | «Halvveis! Smerten er midlertidig — press videre!» | |
| `last5` | `/audio/personas/hardcore/last5.mp3` | «Fem sekunder! Alt du har — nå!» | |
| `rest` | `/audio/personas/hardcore/rest.mp3` | «Pause. Pust. Om litt går vi til krig igjen.» | |
| `finish` | `/audio/personas/hardcore/finish.mp3` | «Ferdig! Du knuste den! Sånn bygges legender!» | |
| `bro-neste` | `/audio/personas/hardcore/bro-neste.mp3` | «Neste offer:» | Etterfølges direkte av øvelsesnavn |
| `bro-naa` | `/audio/personas/hardcore/bro-naa.mp3` | «Nå smeller det:» | Etterfølges direkte av øvelsesnavn |
| `bro-resync` | `/audio/personas/hardcore/bro-resync.mp3` | «Tilbake i kampen! Du er nå på:» | Etterfølges direkte av øvelsesnavn |

### 3.4 Robin (`boyband`) — 90s Boyband Pop Harmonies

**Stilguide:** Fløyelsmyk 90-talls popstjerne som nesten synger alt han sier — varm, flørtete og hundre prosent oppriktig. Han strør «ooh yeah» og «baby» med måte, kaller deg stjerne og superstjerne, og hvert tilrop lander som en refrenglinje. Han ville aldri ropt aggressivt, aldri vært streng — selv siste-fem-sekunder er en kjærlighetserklæring.

| Cue | Fil | Frase (sendes til TTS) | Merknad |
|:--|:--|:--|:--|
| `intro` | `/audio/personas/boyband/intro.mp3` | «Hei, det er Robin. Dette blir vår økt — bare du og jeg. Ooh yeah, nå skinner vi!» | |
| `start_321` | `/audio/personas/boyband/start_321.mp3` | — | **Bruk eksisterende innspilling (Tre-To-En-sporet). Genereres ikke.** |
| `go-1` | `/audio/personas/boyband/go-1.mp3` | «Kjør, baby!» | Rullerer vilkårlig |
| `go-2` | `/audio/personas/boyband/go-2.mp3` | «Ooh yeah, gi på!» | Rullerer vilkårlig |
| `go-3` | `/audio/personas/boyband/go-3.mp3` | «Nå glitrer vi!» | Rullerer vilkårlig |
| `halfway` | `/audio/personas/boyband/halfway.mp3` | «Halvveis, baby! Du er en stjerne — hold rytmen!» | |
| `last5` | `/audio/personas/boyband/last5.mp3` | «Fem sekunder — helt inn nå, du klarer det!» | |
| `rest` | `/audio/personas/boyband/rest.mp3` | «Pust rolig nå. Du fortjener denne pausen, superstjerne.» | |
| `finish` | `/audio/personas/boyband/finish.mp3` | «Wow, ferdig! Du var helt fantastisk i dag — ooh yeah!» | |
| `bro-neste` | `/audio/personas/boyband/bro-neste.mp3` | «Neste øvelse, baby:» | Etterfølges direkte av øvelsesnavn |
| `bro-naa` | `/audio/personas/boyband/bro-naa.mp3` | «Og nå:» | Etterfølges direkte av øvelsesnavn |
| `bro-resync` | `/audio/personas/boyband/bro-resync.mp3` | «Du er nå på:» | Etterfølges direkte av øvelsesnavn |

---

## 4. Øvelsesnavn (felles tabell — alle fire personas leser samme tekst)

Alle 25 øvelses-id-er er kryssjekket mot `src/data/exercises/` (bodyweight, cardio, dumbbells, kettlebell, mobility). Hver rad genereres **fire ganger** — én per persona-seed — til `/audio/personas/<persona>/exercise-<id>.mp3`.

**Viktig:** Kolonnen «Tekst til TTS» er det som faktisk sendes til Chatterbox; **filnavnet bruker alltid øvelses-id-en**, aldri teksten. Der «Tekst til TTS» er tom brukes annonseringsteksten uendret. Parentes-tillegg fra UI-navnene («(Push-ups)», «(Superman)» osv.) er strøket i annonseringen — de er lesestøtte i UI, ikke talespråk. Fonetiske omskrivinger følger prinsippet fra Beslutning 25 (Web Speech-uttaleordboken), tilpasset Chatterbox med `language: "no"`.

| Øvelses-id | Fil (per persona) | Annonseringstekst | Tekst til TTS (fonetisk, hvis avvik) | Merknad |
|:--|:--|:--|:--|:--|
| `kneboy` | `exercise-kneboy.mp3` | Knebøy | | |
| `push-ups` | `exercise-push-ups.mp3` | Armhevinger | | Norsk navn brukes (jf. Beslutning 25) |
| `utfall-forover` | `exercise-utfall-forover.mp3` | Utfall forover | | |
| `planke` | `exercise-planke.mp3` | Planke | | |
| `mountain-climbers` | `exercise-mountain-climbers.mp3` | Mountain Climbers | Mountain Climbers (engelsk uttale, `ttsLang: "en"`) | QA-runde 1: fonetisk omskriving forkastet; uttales på engelsk slik den skrives |
| `burpees` | `exercise-burpees.mp3` | Burpees | Burpees (engelsk uttale, `ttsLang: "en"`) | A/B-lytting 2026-08-30: «Børpis» forkastet av produkteier; uttales på engelsk slik den skrives (jf. Beslutning 39) |
| `sideplanke` | `exercise-sideplanke.mp3` | Sideplanke | | |
| `rygghev-superman` | `exercise-rygghev-superman.mp3` | Rygghev | | «(Superman)» strøket i tale |
| `dips-pa-stol` | `exercise-dips-pa-stol.mp3` | Dips på stol | «Dipps på stol» | |
| `hulekroppshold` | `exercise-hulekroppshold.mp3` | Hulekroppshold | | |
| `sprellmenn` | `exercise-sprellmenn.mp3` | Sprellmenn | | |
| `hoye-kneloft` | `exercise-hoye-kneloft.mp3` | Høye kneløft | | «på stedet» strøket i tale |
| `skoytehopp` | `exercise-skoytehopp.mp3` | Skøytehopp | | |
| `manualpress-bryst` | `exercise-manualpress-bryst.mp3` | Brystpress med manualer | | |
| `skulderpress-manualer` | `exercise-skulderpress-manualer.mp3` | Skulderpress med manualer | | |
| `rumensk-markloft-manualer` | `exercise-rumensk-markloft-manualer.mp3` | Rumensk markløft med manualer | | |
| `kettlebell-swing` | `exercise-kettlebell-swing.mp3` | Kettlebell-swing | «Kettelbell-sving» | ⚠️ Usikker — lytt spesielt på «swing» |
| `goblet-squat` | `exercise-goblet-squat.mp3` | Goblet Squat | «Gåblet skvått» | ⚠️ Usikker — QA-lytt |
| `kettlebell-press` | `exercise-kettlebell-press.mp3` | Kettlebell skulderpress | «Kettelbell skulderpress» | |
| `kettlebell-halo` | `exercise-kettlebell-halo.mp3` | Kettlebell Halo | «Kettelbell heilo» | ⚠️ Usikker — alternativ norsk uttale «halo» (som glorie) |
| `kettlebell-row` | `exercise-kettlebell-row.mp3` | Ettarms roing med kettlebell | «Ettarms roing med kettelbell» | |
| `katte-ku` | `exercise-katte-ku.mp3` | Katte-ku | | «(Ryggmobilitet)» strøket i tale |
| `verdens-beste-toyeovelse` | `exercise-verdens-beste-toyeovelse.mp3` | Verdens beste tøyeøvelse | | Engelsk parentes strøket i tale |
| `hofteapner-90-90` | `exercise-hofteapner-90-90.mp3` | Hofteåpner 90/90 | «Hofteåpner nitti nitti» | Tall skrives ut for TTS |
| `skulder-dislocates` | `exercise-skulder-dislocates.mp3` | Skulderrotasjon med strikk | | «/stang» strøket i tale — ⚠️ bekreft forkortingen |

---

## 5. Batch-oppsummering

**Genereres i Chatterbox-batchen (per persona):**

| Kategori | Antall |
|:--|:--|
| `intro` | 1 |
| `go-1`..`go-3` | 3 |
| `halfway`, `last5`, `rest`, `finish` | 4 |
| `bro-neste`, `bro-naa`, `bro-resync` | 3 |
| `exercise-<id>` (alle 25) | 25 |
| **Genererte klipp per persona** | **36** |

**Totalt:**

| | Antall |
|:--|:--|
| Genererte klipp (4 personas × 36) | **144** |
| Eksisterende innspillinger (`start_321` × 4) — normaliseres, genereres ikke | 4 |
| **Klipp i lydbanken totalt** | **148** |

Stemmer med spec § 5-estimatet «≈ 37 klipp/persona → ≈ 148 i batch».

**Åpne spørsmål til produkteier (før batchen kjøres):**

1. **Dialekt-i-tekst-policyen (§ 2):** bekreft «nær bokmål + lette markører», eller bestill testklipp med tyngre ortografi først.
2. **`mountain-climbers`:** engelsk navn med fonetisk omskriving («Mauntn klaimers») eller norsk «Fjellklatrere»? UI viser engelsk; Beslutning 25 pekte mot norsk.
3. **Axels engelske innslag:** intro/tagline-universet hans er engelskspråklig, men alle TTS-fraser her er holdt på norsk for uttalesikkerhet (`language: "no"`). Ønskes ett engelsk rop (f.eks. «No excuses!») må det testes separat.
4. **Robins «baby»/«ooh yeah»:** beholdes, dempes eller strykes? Lett å re-generere enkeltfraser.
5. Marker eventuelle enkeltfraser du vil ha omformulert — hver rad er én uavhengig bestilling, så re-voicing er billig.

**QA etter batch (fra spec § 5):** gjennomlytting per persona, med særlig fokus på radene merket ⚠️ i § 4.

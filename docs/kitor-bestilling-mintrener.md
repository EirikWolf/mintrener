# Bestilling: Chatterbox-TTS-tilgang for MinTrener

**Prosjekt:** MinTrener (`mintrener`)
**Dato:** 2026-08-27 (revidert samme dag etter verifisering mot kitor)
**Prioritet:** Normal — forbedring av stemmekvalitet for 75 kjerne-lydfiler
**Status:** ✅ Kitor-tilgang levert 2026-08-27. Stemmevalg pågår — se «Fremdrift» nederst.

**Referanse-runbooks:**
- `03-Runbooks/Bestille-kitor-tilgang.md`
- `02-Tjenester/AI/Chatterbox-TTS-deployed.md`
- `03-Runbooks/Autonom-GPU-batch.md`

---

## 1. Sammendrag

MinTrener vil erstatte robotisk Web Speech API-uttale («Bjørnegang», «Mountain
climbers», nedtellinger, tilbakemeldinger) med forhåndsgenererte norske MP3-filer
fra **Chatterbox-TTS** på kitor.

Batchen er en **engangsgenerering av 75 filer** til `public/audio/`. Filene
bundles inn i PWA-distribusjonen og caches via Service Worker — **null løpende
GPU-kall i produksjon**.

> **Revisjonsnotat:** Første utgave av denne bestillingen inneholdt åtte feil
> som ble avdekket ved verifisering mot faktisk tilstand på kitor. Rettet under.
> Volumtallet (75) var korrekt og er etterregnet.

---

## 2. Verifisert tilstand (2026-08-27)

Sjekket fra klient (BjornTor, via Tailscale) og med lesetilgang på kitor:

| Forhold | Status |
|---|---|
| `KITOR_TOKEN_MINTRENER` i `/srv/kitor/repo/.env` | ✅ Finnes (64 tegn) |
| `@token_mintrener`-matcher i Caddyfile (linje 44) | ✅ Finnes |
| mintrener autorisert for `/arbiter/*` (linje 167) | ✅ `GET /arbiter/status` → 200 |
| mintrener autorisert for `/comfy-mintrener/*` (linje 209) | ✅ |
| **mintrener autorisert for `/chatterbox/*` (linje 312–324)** | ❌ **401 — kun `@token_pondus` + `@token_sinnro`** |
| Chatterbox-container kjørende | ❌ Ikke kjørende — `profiles: ["tts"]`, `restart: "no"` (by design) |
| Norsk referanse-WAV på kitor | Kun `eirik-norsk-ref.wav` |
| GPU akkurat nå | 21583 / 24576 MiB (vLLM residente) |
| `config.yaml` | `repo_id: chatterbox-multilingual`, `language: no`, `default_voice_id: Emily.wav` |

**Konsekvens:** Bestillingen trenger ikke en ny token — den finnes. Den trenger
heller ikke arbiter-onboarding — den er på plass. Kun ett punkt gjenstår.

---

## 3. Hva vi faktisk trenger fra kitor-eier

**Én endring:** legg `@token_mintrener` inn i `/chatterbox/*`-blokka i
`/srv/kitor/repo/caddy/Caddyfile`, etter `@token_sinnro`-blokka:

```caddyfile
        handle @token_mintrener {
            uri strip_prefix /chatterbox
            reverse_proxy chatterbox-tts:8004
        }
```

Deretter:

```bash
docker compose exec caddy caddy validate --config /etc/caddy/Caddyfile
docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile
```

Estimat: ~5 min. Ingen ny token, ingen Vaultwarden-oppføring, ingen
`projects.yaml`-endring.

**Vi retter selv på klient-siden:** `C:\dev\mintrener\.env` inneholder fortsatt
placeholderen `ditt_kitor_token_her` fra `.env.example`. Ekte verdi hentes fra
Vaultwarden `homelab/mintrener/kitor-token`.

---

## 4. Endepunkt og payload

**URL:** `https://kitor.tail49f298.ts.net/chatterbox/tts`
(Caddy stripper prefikset → treffer `/tts` native-endepunktet i containeren.)

Bruk **native `/tts`**, ikke `/v1/audio/speech` — sistnevnte har kjent bug der
manglende `language`-param sender `language=False` → 500.

```json
{
  "text": "<tekst>",
  "voice_mode": "clone",
  "audio_prompt_path": "reference_audio/<valgt-ref>.wav",
  "language": "no",
  "output_format": "mp3"
}
```

> **Rettelse:** Første utgave anga `voice_mode: "predefined"` med `Emily.wav`,
> mens `scripts/generateVoiceAudioBatch.ts` faktisk sender `voice_mode: "clone"`
> mot `reference_audio/mintrener-astrid.wav` — en fil som ikke finnes på kitor.
> Full batch ville feilet på hvert eneste kall. Emily.wav ville dessuten gitt
> amerikansk r-lyd, jf. smoke-testen 2026-06-07 — altså nøyaktig defekten
> bestillingen finnes for å fjerne.

**`output_format: "mp3"` er uverifisert.** Smoke-testen 2026-06-07 dekket kun
WAV. Må bekreftes i piloten.

---

## 5. Kjøreflyt (rettet)

Chatterbox er profile-gated og **kan ikke startes fra klienten**. Batchen krever
derfor en kitor-side operatørhandling. Full sekvens:

```bash
# På kitor:
kitor-arbiter acquire image --requester mintrener --label "voice batch" --max-wait-s 300
docker compose --profile tts up -d chatterbox-tts
# vent på healthcheck (start_period 90 s)

# Fra klient:
npx tsx scripts/generateVoiceAudioBatch.ts --limit 8

# På kitor:
docker compose --profile tts down chatterbox-tts
kitor-arbiter release "$TOKEN"
```

> **Rettelse:** Første utgave viste `kitor-arbiter`-CLI kjørt fra klienten.
> Det er ikke mulig — runbooken er eksplisitt: «Du SSH-er aldri inn på kitor.»
> Klienter bruker HTTP: `POST /arbiter/acquire`, `/arbiter/heartbeat`,
> `/arbiter/release` (slik Nyttestyring gjør det).
>
> Første utgave utelot også helt at containeren må startes. Lease alene starter
> ingenting.

**VRAM:** Chatterbox 4,6 GB peak + vLLM 20 GB = 25 GB > 24 GB. Kan ikke kjøre
parallelt — derfor lease. Arbiter stopper vLLM ved eksklusiv `image`-lease og
restarter ved release.

**Tidsestimat (rettet):** 90 s container-warmup + 8,4 s første kall (kaldt) +
~2,5–3 s per klipp varmt. Full batch på 75 filer ≈ **6 minutter**, ikke 3.

---

## 6. Volum

Etterregnet fra `VOICE_LINES` og `EXERCISE_LIBRARY`:

| Tone | countdown | start | halfway | finish | sum |
|---|---|---|---|---|---|
| rolig | 5 | 4 | 3 | 3 | 15 |
| lek | 5 | 3 | 2 | 3 | 13 |
| gira | 5 | 3 | 2 | 2 | 12 |
| tørr | 5 | 2 | 1 | 2 | 10 |
| **Tone-klipp** | | | | | **50** |
| Øvelser (bodyweight 10, kettlebell 5, dumbbells 3, cardio 3, mobility 4) | | | | | **25** |
| **Totalt** | | | | | **75** ✅ |

---

## 7. Feil på klient-siden som vi retter selv

Ikke kitor-eiers ansvar, men dokumentert her fordi de påvirker akseptansen:

1. **`--pilot` gjør ikke det bestillingen påsto.** Flagget kutter kun
   `EXERCISE_LIBRARY` til 5; alle 50 tone-klipp genereres uansett → 55 filer,
   ikke 5. Erstattes med et ekte `--limit N`.
2. **Token-variabel:** skriptet leser `KITOR_TOKEN`, bestillingen omtalte
   `KITOR_TOKEN_MINTRENER`. Skriptets navn beholdes; verdien rettes i `.env`.
3. **Ingen lease-håndtering i skriptet.** `Autonom-GPU-batch.md` krever
   trap/finally-mønster. Uten det står leasen stale i 30 min ved krasj — samme
   form som SynthIQ-livelocken.
4. **Ingen `--limit 1`-måling før batch.** Runbookens TL;DR krever måling av
   én enhet før commit til 75.

---

## 8. Åpen blokker i appen (ikke kitor-relatert)

**Dette må løses for at bestillingen skal gi verdi i det hele tatt.**

`src/services/audioClipService.ts` har **null kallere**. Under en økt går
`voiceCoachService` → `speakMessage` → Web Speech API direkte. De 75 MP3-filene
ville blitt liggende ubrukt i `public/audio/`.

I tillegg:

- `audioClipService` slår opp nøklene `prepare-<tone>` og `rest-<tone>` — de
  genereres aldri av batchen.
- 8 `halfway`-klipp genereres, men konsumeres aldri.
- Batchen dekker ikke `every30`, `last15`, `last10`, `recordBeat`, `holdPrompt`
  — som utgjør mesteparten av praten under en økt.
- `getVoiceLine()` velger linje **tilfeldig ved kjøretid**. En indeksbasert
  manifest-nøkkel kan ikke slå opp den valgte linja. Utvelgelsen må gjøres
  deterministisk, eller nøkkelen må avledes fra teksten.

Premisset «erstatte robotisk Web Speech API-uttale» oppnås altså ikke av denne
batchen alene, uansett hvor godt kitor leverer.

---

## 9. Stemmevalg

Målpersona **Astrid er kvinne**. Eneste norske referanse på kitor i dag er
`eirik-norsk-ref.wav` — mannsstemme, og ønskes ikke brukt.

`voices/` har 28 forhåndsdefinerte stemmer, hvorav ca. elleve kvinnestemmer
(Abigail, Alice, Cora, Elena, Emily, Gianna, Jade, Layla, Olivia, samt Jordan
og Taylor som er mer androgyne). **Alle er amerikansk-engelske innspillinger.**
Chatterbox-multilingual bruker referansen til timbre og språk-tokenet til
uttale, men aksenten blør gjennom — dokumentert for Emily i smoke-testen.

**Besluttet plan:**

1. **Audition** — generer samme norske setning på 6–8 kvinnestemmer og lytt.
   Kun Emily er testet; de øvrige ti er ukjente. Koster under ett minutt GPU-tid
   og dobler som pilot som verifiserer token, `language: no`, mp3-output og
   lease-flyten.
2. Hvis ingen holder mål: hent ~10 s norsk kvinnestemme fra Nasjonalbibliotekets
   åpne talekorpus (NST/NPSC).
3. Endelig løsning: **egen innspilling** av `mintrener-astrid.wav`, SCP-es til
   `/srv/kitor/chatterbox-tts/reference_audio/`.

---

## 10. Akseptanse og verifikasjon (rettet)

1. Kitor-eier legger `@token_mintrener` i `/chatterbox/*` og reloader Caddy.
2. Vi retter `.env` med ekte token fra Vaultwarden.
3. **Audition-batch** (6–8 klipp, én setning per kvinnestemme) under
   `image`-lease. Verifiserer samtidig: 200-respons, `language: no`, gyldig
   mp3-output, lease acquire/release.
4. Stemme velges — eller vi går videre til Nasjonalbiblioteket/egen innspilling.
5. Appen wires opp (punkt 8) — ellers har batchen ingen effekt.
6. Full batch på 75 filer, `src/data/audioManifest.json` oppdateres.

---
---

# Svar fra kitor-eier — 2026-08-27

**Vurdering: Bestillingen godkjennes i revidert form.** Omfanget er langt mindre
enn opprinnelig antatt.

## Hva som allerede er på plass

Bestillingens punkt 1 og 3 i opprinnelig utgave (opprett token, arbiter-lease-
tilgang) var **allerede levert**. `KITOR_TOKEN_MINTRENER` har ligget i
`/srv/kitor/repo/.env` og `@token_mintrener` i Caddyfile siden ComfyUI-
onboardingen. `GET /arbiter/status` med det tokenet returnerer 200 med gyldig
lease- og queue-JSON, verifisert i dag.

401-en dere så kom av at `C:\dev\mintrener\.env` inneholder placeholderen
`ditt_kitor_token_her`, ikke av manglende tilgang. Merk at bildepipeline-
skriptene mot `/comfy-mintrener/*` dermed sannsynligvis heller aldri har
autentisert med denne fila — verdt å sjekke på deres side.

## Hva som gjenstår

Kun `@token_mintrener` inn i `/chatterbox/*`-blokka (Caddyfile linje 312–324).
Patchen i punkt 3 er korrekt og klar til å limes inn.

**Denne endringen er IKKE utført.** Den krever skrivetilgang til delt
infrastruktur på kitor, og ble stoppet av godkjenningskontrollen i den
autonome sesjonen. Må kjøres manuelt av kitor-eier.

## Merknader

**Container-start må avklares.** Chatterbox er `profiles: ["tts"]` med
`restart: "no"` — bevisst, for å unngå at den OOM-killer vLLM ved
`docker compose up`. Konsekvensen er at ingen batch kan kjøres helt fra
klient-siden. Enten tar kitor-eier start/stopp manuelt rundt hver batch, eller
så eksponeres det som en OliveTin-action tilsvarende `🎨 Start ComfyUI`. For en
engangsbatch er manuelt greit; skal dette gjentas, bør det automatiseres.

**Krav ved kjøring:** `image`-lease må holdes gjennom hele batchen, og
containeren tas ned med `--profile tts down` **før** release — arbiter-release
alene frigjør ikke Chatterbox sine 3,7 GB idle-VRAM, og vLLM får da ikke tilbake
sine 20 GB.

**Ingen kapasitetsinnvending.** 75 klipp ≈ 6 min GPU-tid, engangs, null løpende
last i produksjon. Arbiter er tom (0 leases, 0 i kø).

**Om stemmen:** ingen norsk kvinnestemme finnes på kitor i dag. De 28
predefinerte er alle engelske. Audition-planen i punkt 9 er fornuftig som
billig verifisering av kjeden, men forvent at aksenten blør gjennom på alle
elleve. Nasjonalbiblioteket er en reell kilde — men merk at det er ekte,
identifiserbare personers stemmer. Greit til utvikling og test; verdt en
ekstra tanke før en klonet stemme går i produksjon i en app rettet mot barn.
Egen innspilling er trygt og tar ti minutter.

**Til slutt:** blokkeren i punkt 8 er den som avgjør om dette blir noe av.
Kitor kan levere 75 perfekte filer i kveld, og appen vil fortsatt snakke med
Web Speech API. Anbefaler å ta wiringen først, eller minst parallelt.

---
---

# Fremdrift — 2026-08-27 kveld

## Levert

- **`/chatterbox/*`-ruten er åpen for mintrener.** `@token_mintrener` lagt inn i
  Caddyfile (linje 321–324), validert og aktivert med `docker compose restart caddy`
  (`caddy reload` virker ikke — global-blokka har `admin off`). Backup ligger i
  `/srv/kitor/repo/caddy/Caddyfile.bak`.
- **`output_format: "mp3"` er verifisert** — ID3v2.4 + MPEG ADTS, 20–30 KB per klipp.
  Var utestet før i kveld.
- **Lease- og container-flyten er verifisert end-to-end.** Arbiter stoppet vLLM ved
  acquire (GPU 21583 → 719 MiB) og restartet den ved release. Trap-mønsteret ryddet
  containeren før release i alle kjøringer, også den som feilet.
- Klient-token er fortsatt IKKE rettet i `C:\dev\mintrener\.env` — står på
  placeholderen. Gjøres når batchen skal kjøres fra klienten.

## Ny feil funnet i deploy-doccen

Klient-kontrakten i `02-Tjenester/AI/Chatterbox-TTS-deployed.md` var feil på to punkter:

| Doccen sa | Riktig (verifisert mot `models.py` + `server.py` på kitor) |
|---|---|
| `audio_prompt_path` | **`reference_audio_filename`** |
| `"reference_audio/<fil>.wav"` | **Bart filnavn** — serveren resolver selv via `safe_resolve_within` |

Ga HTTP 400 på alle fem første forsøk. **Doccen er rettet** (linje 92 og 106).

Merk også at `generateVoiceAudioBatch.ts` bruker det gamle, feile feltnavnet — må
rettes sammen med de øvrige klient-feilene i punkt 7.

Andre tunbare felter i `CustomTTSRequest` som blir aktuelle for tone-differensiering:
`exaggeration`, `cfg_weight`, `speed_factor`, `temperature`, `seed`.

## Stemmevalg — status

Predefined-auditionen (9 amerikanske kvinnestemmer) ble forkastet: alle for amerikanske.

**Nasjonalbiblioteket fungerer.** Kilde: `NbAiLab/NST` på Hugging Face, shard
`nst_no_test_close-0001-of-0003` (487 MB, CC0, nærmikrofon, 16 kHz fra 1999–2000).
Referanser bygget ved å konkatenere de fire lengste leste setningene per taler
(filtrert bort ytringer med opplest tegnsetting), 15 s, 24 kHz mono.

Auditionert så langt:

| Kandidat | Dialekt | Alder | Dom |
|---|---|---|---|
| 1 | Oslo-området | 42 | **Best** |
| 2 | Oslo-området | 30 | ok |
| 3 | Oslo-området | 20 | ok |
| 4 | Oslo-området | 27 | ok |
| 5 | Hedmark og Oppland | 42 | **Best** |
| 6–8 | Sunnmøre | 25 / 30 / 56 | bygget, ikke auditionert ennå |

16 kHz-kilden viste seg ikke å være noe problem — kvaliteten er god nok.

## Neste steg

1. Auditioner Sunnmøre-kandidatene (6–8) — referansene ligger klare i
   `C:\dev\mintrener\audition\referanser\`.
2. **Bygg referanser for alle gjenstående dialektområder** og kjør én samlet audition.
   Tilgjengelig i det nedlastede shardet: 39 kvinnelige talere over elleve områder —
   Oslo-området 9, Sør-Vestlandet 4, og tre hver av Troms, Trøndelag, Sunnmøre,
   Sørlandet, Nordland, Voss og omland, Hedmark og Oppland, Bergen og Ytre Vestland,
   pluss to fra Ytre Oslofjord. Flere finnes i de øvrige elleve shardene.
3. Velg stemme, kopier til `mintrener-astrid.wav`.
4. **Wire opp appen (punkt 8)** — fortsatt den avgjørende blokkeren. Uten den
   endrer ingen batch noe som helst.
5. Full batch på 75 filer.

## Verktøy som finnes

- `scripts/kitor-voice-audition.sh` — predefined-stemmer
- `scripts/kitor-voice-audition-clone.sh` — cloning fra referanser, plukker opp alle
  `mintrener-kandidat*.wav` i `reference_audio/` automatisk

Begge tar lease, starter og stopper containeren, og rydder via trap.

---
---

# Stemmesøk — konklusjon 2026-08-28

## Hva vi prøvde

| Kilde | Resultat |
|---|---|
| 28 predefinerte Chatterbox-stemmer | Forkastet — alle amerikansk-engelske |
| NST (opplest studio, 1999, 16 kHz) | Norsk og tydelig, men **flat**. Elleve dialektområder tilgjengelig med presis merking |
| Parametersveip (exaggeration × cfg_weight) | Se under |
| NB Samtale (podkast + liveopptak, spontan tale) | **Tydelig livligere** — men ingen vestlandskvinner i podkast |

## Det viktigste funnet

**Kilden er spaken, ikke parameterne.** Podkast-referanser ga merkbart mer liv enn
innleste NST-referanser ved identiske innstillinger. Voice-cloning overfører
talestil, ikke bare klang — en flat referanse gir en flat klone, uansett knotter.

Følgetrekk: referansen må spilles inn **i den energien man vil ha ut**.

## Parameterfunn

- `exaggeration` stod allerede på **1.3** i `config.yaml` (Chatterbox default er 0.5).
  Den var aldri problemet.
- Mistanken er at `cfg_weight: 0.5` låser prosodien til referansens leveringsmåte.
  Sveipet testet 0.2/0.3 mot 0.5 — se `audition-energi/`.
- Modellen tar også `temperature`, `speed_factor`, `seed`, og støtter **ikke-verbale
  tagger** i teksten (`[laugh]`, `[sigh]`, `[gasp]` — funnet i `ui_state` i config).

## Dialekt-ortografi

Modellen er grafem-drevet: skriver man «No e det», sies «No e det». «All in» på en
dialekt krever derfor at `voiceLines.ts` skrives om i dialekt — et produktvalg,
ikke bare et teknisk. Testet på bergensk i `audition-dialekter/` (`b-*`-filene).

## Korpus-begrensninger som ble kartlagt

- NB Samtale har grove dialektkoder: `e`, `n`, `sw`, `t`, `w`. `w` dekker alt fra
  Bergen via Sogn til Sunnmøre uten å skille dem.
- Kun fem kvinnelige vest/sørvest-talere finnes (P4, P5, P10, P15, P40),
  **alle liveopptak** — null podkast.
- NST har derimot presis dialektmerking, inkludert tre Sunnmøre-kvinner (25, 30, 56 år).
- Avveiningen er altså: eksakt dialekt med flat opplesning (NST), eller naturlig
  tale med usikker vestlandsdialekt (NB Samtale). Ingen gir begge deler.

### Tekniske fallgruver i NB Samtale
- `validation_*.tar.gz` er **ukomprimert tar** tross filnavnet — bruk `tar xf`, ikke `xzf`.
- Filstier i metadata har escapede skråstreker (`data\/test\/nn\/...`).
- Filtrer bort segmenter med `%`-markører (nølelyder) og `overlap_previous/next`.
- Målform er irrelevant for cloning — vestlandstalere ligger i **nn**-arkivene.

## Beslutning

Gratis-kildene er uttømt for formålet. **Neste steg er egen innspilling.**
Leseskript for fire toner (rolig, lek, gira, tørr) med opptakstips er utarbeidet —
se samtalelogg. Anbefaling: samme person leser alle fire, 15–20 s hver, i den
energien tonen skal ha. Serveren tar maks 30 s referanse.

## Uendret

Blokkeren i punkt 8 står fortsatt: `audioClipService.ts` har null kallere.
**Den er uavhengig av stemmevalget og kan gjøres nå.**

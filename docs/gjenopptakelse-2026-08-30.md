# Gjenopptakelse — Min Trener, 30. august 2026

Skrevet da produkteier dro fra hytta. Dette dokumentet er ment å lese på tre minutter og gi nok til å ta opp tråden uten å grave i historikk.

**Repo:** `C:\dev\mintrener` · **Beslutninger:** `C:\dev\mintrener\docs\DECISIONS.md` (1–39) · **Prosjektnotat:** `C:\Users\Eirik\Obsidian\homelab-vault\05-Prosjekter\MinTrener.md`

---

## 1. Hva som skjedde i går og i dag

### Felttesten på Samsung S21 avdekket to feil

Produkteier kjørte Klassisk Tabata på preview-kanalen og meldte:

1. Øvelsesnavnene ble aldri lest opp.
2. Øktstarten var rar — Jossa skrøt av innsatsen og sa «ikkje no knussel på slutten» ti sekunder før økta begynte.

**Begge er rettet og merget** ([PR #30](https://github.com/EirikWolf/mintrener/pull/30), Beslutning 38). Årsakene var:

Nedtellingsklippet (`start_321_short`) var de siste 8,5 sekundene av en 20 sekunders peptalk — derav den rare starten. I en Tabata-pause på 10 sekunder begynte det klippet 1,5 sekunder inn i fasen, og lydmotorens «én stemme om gangen»-regel fadet da ut annonseringskjeden før øvelsesnavnet rakk å bli sagt.

Under review dukket en **andre, uavhengig kilde til samme symptom** opp: timeren re-ankrer seg rutinemessig når skjermen er av på Android, og hver slik re-ankring planla en ny nedtelling uten beskyttelse, midt oppi en annonsering som fortsatt spilte.

Løsningen måler nå den faktiske annonseringskjeden i stedet for å bruke en gjettet margin, budsjetterer inn nedtellingen, og degraderer kjeden bro → pausesignal → navnet alene når det er trangt. Navnet vinner alltid. `start_321_short` er skrevet om til egne korte replikker per persona (2,7–4,4 s).

Verifisert med prober mot den ekte koden over alle 200 kombinasjoner av persona, øvelse og fase: navnet høres i 200/200, nedtellingen i 198/200. Unntakene er Axel med knebøy, det lengste klippet i banken.

**Tre reviewrunder ga NO-GO før den fjerde ga GO.** De to første fiksforsøkene var feil: det første brukte en konstant margin på 6 sekunder som var målt for lavt, det andre løste det men gjeninnførte problemet via re-ankringsveien og fjernet nedtellingen i ni av elleve tilfeller. Det er verdt å huske hvis noen senere vil «forenkle» denne koden.

### Nye stemmekandidater fra Suno

Produkteier laget to vokalspor i Suno og hentet ut vokalen: en stand-up-komiker og et militært befal. Begge er klonetestet på kitor og fungerer.

Seedene ligger nå i `audio/seeds/seed_komiker.wav` og `audio/seeds/seed_befal.wav`, og er lastet opp til kitor som `mintrener-seed-komiker.wav` / `mintrener-seed-befal.wav`. Kildefilene fra Suno ligger i `audio/`.

De nye stemmene snakker **vesentlig raskere** enn dagens fire — «Burpees» tar 0,87 s hos befalet mot 1,9–2,5 s hos de eksisterende. Det er gunstig for timingen i korte faser.

### To tabber fra assistentens side, verdt å kjenne til

**Manglende norske tegn.** De første åtte lytteklippene ble generert med et testskript der æ/ø/å var strippet for å unngå tegnsett-trøbbel over SSH. Chatterbox leste bokstavelig «kjor», «Hor etter», «dodd». Klippene var verdiløse og ble regenerert. *Lærdom: generer alltid via den ordinære produksjonslinja, som leser manuskript-JSON-en direkte.*

**«Burpees» stavet feil i test.** Manuskriptet staver øvelsen fonetisk som «Børpis», men testskriptet brukte engelsk «Burpees». Det utløste en unødvendig runde. Samme lærdom.

---

## 2. Tilstand akkurat nå

### Merget og deployet

`main` står på `b92e0ee`. Preview-kanalen er re-deployet derfra:

**https://mintrener--felttest-dfplt7uq.web.app** (utløper 6. september)

Kanalen inneholder lydfiksen, de nye nedtellingsklippene, og C1/C2 (uke-streak + onboarding).

### Arbeid som pågikk da vi stoppet

**Branch `chore/burpees-engelsk-og-halevakt`** i worktree `C:\dev\mintrener\.claude\worktrees\burpees-halevakt`. Ikke pushet, ingen PR.

Den inneholder to ting:

1. **Burpees uttales på engelsk.** Produkteier lyttet på ni A/B-varianter og valgte engelsk uttale framfor dagens fonetiske «Børpis». Manuskriptet er endret til `ttsText: "Burpees"` med `ttsLang: "en"`, samme mønster som `mountain-climbers` allerede bruker.

2. **Halevakt mot avkuttede klipp.** Chatterbox kutter av og til halen av et klipp — produkteier hørte «Burpees» bli til «burpii». Vakten måler energien i klippets siste 50 ms mot klippets eget snitt.

**En agent jobbet med å utvide vakten da vi stoppet.** Den første versjonen brukte bare en absolutt terskel på −15 dB, og implementeren påpekte korrekt at den ikke ville fanget funnet den ble bygget for: det avkuttede klippet lå på −24,4 dB, altså under terskelen. Det var **sammenligningen med søskenklippene** (samme replikk hos de andre personaene, −50 til −72 dB) som avslørte det. Oppfølgingsagenten legger til en søsken-relativ vakt ved siden av den absolutte.

Sjekk agentens tilstand med `git -C ".claude/worktrees/burpees-halevakt" log --oneline main..HEAD` og kjør `npx vitest run` i den worktreen før du går videre. Baseline før oppfølgingen var 797 tester.

### Andre åpne PR-er, ikke fra denne økta

- [PR #27](https://github.com/EirikWolf/mintrener/pull/27) — mocker `../firebase` i seks testsuiter som collect-feiler. Produkteier har aldri tatt stilling til om den skal gjennom review-regimet.
- [PR #18](https://github.com/EirikWolf/mintrener/pull/18) — untracker `tsbuildinfo`-byggeartefakter. Fila står i `.gitignore` men er sporet fra før, så den blir stadig skitten og blokkerer pull-er. Verdt å få inn.

### Lokale grener som kan ryddes

`feat/b5-zod-grenser`, `feat/b6-aksent-gest-dimme` og `worktree-agent-ab5a878d6bf3e5dd5` er merget og kan slettes lokalt.

---

## 3. Dette venter på produkteier

Ingenting kan gå videre på disse uten svar.

### A. Skal komiker og befal bli persona fem og seks?

Dette blokkerer en større produksjonsrunde. Lytteklippene ligger i `audio/lyttekandidater/` — fire per stemme: intro, nedtelling, «Burpees», fem-sekunders-varsel.

Får det ja, gjenstår: fulle manus for begge (komikeren trenger egne poeng, befalet kommandorop — «Neste offer» blir kanskje «Neste post!»), teknisk id (`komiker` / `befal` er foreslått), visningsnavn, registrering i persona-registeret og aksentfarge, og så én GPU-runde som produserer 38 klipp per stemme.

### B. De seks klippene med bråest avslutning

`audio/lyttekandidater/` har dem ikke — de ligger i produksjon under `public/audio/personas/`. Det er:

| Persona | Klipp | Fall |
|---|---|---|
| hardcore | `exercise-hulekroppshold.mp3` | −1,7 dB |
| hardcore | `bro-naa.mp3` | −4,1 dB |
| hardcore | `exercise-goblet-squat.mp3` | −9,4 dB |
| romsdal | `exercise-skulder-dislocates.mp3` | −11,4 dB |
| romsdal | `bro-naa.mp3` | −12,9 dB |
| boyband | `exercise-utfall-forover.mp3` | −13,2 dB |

Dette er kandidater, ikke bekreftede feil — noen ytringer slutter naturlig brått, særlig Axels. Men Axels «Hulekroppshold» er verdt et ekstra øre, siden det er det ordet produkteier reagerte på sist i den andre enden.

### C. Ny felttest, og denne gangen på iPhone

Android-testen bør gjentas mot fikset kode, og iPhone-testen er aldri kjørt. iOS er risikoplattformen — det er der AudioContext suspenderes ved skjermlås, og hele blindmodus-sperren i arbeidsordren peker på «bestått iOS-felttest».

**Kjør minst én økt med tømt nettleserbuffer.** Kaldstart er den eneste stien lydfiksen ikke beskytter: appen har da ingen klippelengder å regne på og faller tilbake på gjetting. Det er et bevisst designvalg, men det bør observeres i felt.

Etter felttesten leses lydavviks-bucketene (`under20` / `20-50` / `over50ms`) og longtask-tellerne fra telemetrien. Kravet er p95 under 20 ms. **Dette er det siste som gjenstår før prod-deploy.**

### D. Uttalekontroll av resten av øvelseslista

Flere øvelser er stavet fonetisk på samme måte som burpees var, og har aldri vært gjennom en systematisk kontroll: «Gåblet skvått», «Kettelbell heilo», «Kettelbell-sving», «Dipps på stol», «Ettarms roing med kettelbell». Det er billigere å rette alle i én runde enn én og én. Produkteier ble spurt, men rakk ikke svare.

---

## 4. Første kommandoer når du kommer hjem

```bash
cd C:/dev/mintrener && git checkout main && git pull
```

Sjekk at oppfølgingsagenten ble ferdig, og kjør testene i worktreen:

```bash
git -C .claude/worktrees/burpees-halevakt log --oneline main..HEAD
```

Når `chore/burpees-engelsk-og-halevakt` er reviewet og merget, regenerer burpees for alle fire personaer. Dette krever GPU-lease på kitor:

```bash
ssh kitor 'kitor-arbiter acquire image --requester mintrener --label "burpees engelsk"'
```

Så, med containeren oppe:

```bash
npx tsx scripts/generatePersonaVoicebank.ts --refetch --only burpees
```

---

## 5. Driftsfakta som er lett å snuble i

**SSH og HTTPS til kitor går via DERP-relay uten direkte tilkobling.** Bruk `-o ConnectTimeout=45`; kortere timeout gir falsk «Connection timed out» selv når maskinen er oppe. HTTPS trenger tilsvarende tålmodighet.

**Chatterbox-containerens healthcheck viser alltid `unhealthy`** fordi `curl` mangler i imaget. Sjekk i stedet:

```bash
ssh kitor 'docker exec chatterbox-tts python3 -c "import urllib.request; print(urllib.request.urlopen(\"http://localhost:8004/\", timeout=8).status)"'
```

**Arbiter restarter vLLM automatisk ved `release`** — ingen manuell opprydding nødvendig etter en TTS-runde.

**Nye worktrees trenger både `.env` og `.env.local` kopiert inn.** Firebase-variablene ligger i `.env`, ikke i `.env.local` som bare har kitor-tokenet. Uten begge collect-feiler seks testfiler med `auth/invalid-api-key`.

**Skip-eksisterende slår til før sidecar-sjekken** i lydbank-runneren. En tekstendring i manuskriptet alene overskriver derfor ikke en eksisterende fil — `--force` eller `--refetch` er påkrevd.

**Chatterbox avviser referanselyd over 30 sekunder.** Hardcore-seeden på kitor er en trimmet versjon (29,5 s) av repoets 32,9 s original. Ny opplasting av seeds må re-trimme den.

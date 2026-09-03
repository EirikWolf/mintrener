# Oppstartsprompt: øvelsesbilder i Min Trener

Kopier alt under streken inn som første melding til en ny agent i `C:\dev\Trening`.

---

Du overtar arbeidet med øvelsesbildene i **Min Trener** (`C:\dev\Trening`, React/Vite/TypeScript PWA, GitHub `EirikWolf/mintrener`). Forrige agent kom ikke videre. Målet ditt er å levere de resterende bildene med god nok kvalitet til at Eirik godkjenner dem — ikke å forske mer på metoden.

## Les først, i denne rekkefølgen

1. `C:\dev\Trening\CLAUDE.md` og `~/.claude/CLAUDE.md` — konvensjoner. Følg dem.
2. `C:\dev\homelab-vault\05-Prosjekter\MinTrener-bildepipeline-2026-09-03.md` — **full status, verktøykjede, alle målinger, og listen over feil forrige agent gjorde.** Dette er hoveddokumentet. Les det helt.
3. `docs/kurering-2026-09-03.json` — Eiriks kurering av alle 150 bilder. 25 godkjent, 31 «regenerer» med konkret kommentar per bilde, 10 kandidatvalg (alle allerede lagt inn i appen).
4. `docs/gjennomgang-promptbatch-2026-09-03.md` — hvilke av de 74 sist genererte som er feil, og hvorfor.
5. `scripts/hentReferanser.ts` — tabellen `REFERANSER` og `UTEN_KILDE`. Kommentarene der forklarer hvert valg.

## Hva som er sant nå

- **130 av 150 bilder** ligger i `public/images/exercises/`. 20 mangler (listet i vault-dokumentet § 7).
- **To ruter fungerer:** prompt alene for stående øvelser (`scripts/runFullKitorBatch.ts`), dybdestyring fra referansefoto for gulv- og apparatøvelser (`scripts/kjorDybdeBatch.ts`). Skjelett/OpenPose er nedlagt — ikke gjenopplive.
- **Kuratorsiden** (dev, innlogget, MER → «⭐ Treningskurator & Validering») viser kandidater og eksporterer valg. `scripts/anvendValg.ts` legger valgene inn. Hele løkka er bygd og verifisert.
- **19 commits på `main` er ikke pushet**, pluss 84 ucommitede bildefiler (10 endret av Eiriks valg, 74 nye fra promptbatchen). Ikke push, ikke commit bildene, uten at Eirik sier det.
- Referansefoto ligger i `pipeline/referanser/` (gitignored). Kandidater i `pipeline/candidates/dybdebatch/`. Begge overlever ikke et nytt klon — `hentReferanser.ts` gjenskaper det første.

## Det som skal gjøres, i prioritert rekkefølge

1. **Rett `diafragma-pust`-prompten** i `src/data/exercises/` — «belly expands on inhale» gir en utspilt mage som leser som graviditet. Formuler om, regenerer begge faser med promptruten, se på resultatet.
2. **De 31 «regenerer» fra kureringen.** Les Eiriks kommentar per bilde; den sier nøyaktig hva som er galt. Del dem etter rute: stående → prompt (juster prompten mot kommentaren først), gulv/apparat → dybde (finn referanse, SE på den før kjøring, legg den i `REFERANSER`). Tre seeds per bilde. Luk det som er objektivt galt i `scripts/avvisteKandidater.ts` med begrunnelse, publiser med `scripts/publiserKandidater.ts`, og si fra til Eirik når han kan velge.
3. **De 20 som mangler.** `pull-ups` har 4 kandidater klare. `bord-roing` (Inverted Row) og `muscle-up` (Muscle Up) har referanser i free-exercise-db som ikke er koblet ennå — bruk `gulv: false` som pull-ups. De uten kilde (dragon flag, l-sit, kne-pushup, copenhagen, stående ryggvri, planke-loft, rkc-planke): prøv promptruten med `--out pipeline/candidates/prompt/` så de ikke går rett i appen, og vurder. Ikke gjett en referanse som viser en annen øvelse — det styrer modellen bestemt feil.
4. **Hånd/fot-variantene** fra promptbatchen (`archer-pushup`, `one-arm-pushup`, `diamant-pushup`): begge faser ble like og generiske. Disse trenger sannsynligvis dybde, men basen har ingen archer/one-arm. Vurder om `Close-Grip Push-Up off of a Dumbbell` kan brukes for diamant. Ellers: si fra at de mangler kilde, ikke lever generiske bilder.

## Regler som ikke er forhandlingsbare

- **Se på alt du lager før du gir det videre.** Lag kontaktark (Pillow via Python, `pipeline/tmp/`), åpne dem, stryk det som er objektivt galt. Eirik skal bruke øynene på det som er vanskelig å avgjøre, ikke på bilder med to hoder. Forrige agent ble korrigert for nøyaktig dette.
- **Én variabel om gangen** når du måler. `--control-end`, `--lora`, `--seeds`, `--seed-fra`, `--suffiks` finnes for det. To seeds per arm, sammenlign mot basis.
- **Aldri regenerer samme seed med samme innstilling** — det gir samme bilde. Bruk `--seed-fra N` for nye kandidater.
- **GPU:** skriptene tar og frigir `kitor-arbiter`-lease selv. Sjekk `ssh kitor "kitor-arbiter status"` før du starter og etter at du er ferdig. Hvis det ligger en lease fra `mintrener` som ikke skulle vært der: `ssh kitor "kitor-arbiter release <token>"`. Aldri rediger noe under `/srv/kitor/repo`.
- **Kjør lange batcher i bakgrunnen** og vent på varselet; ikke poll med sleep. ASCII-variabelnavn i bash (`LISTE=`, ikke `ØVELSER=`).
- **Før du sier «ferdig»:** `npx tsc -b`, `npx vitest run`, og les navnet på enhver rød test før du avfeier den som flaky. To tester (`ExerciseLibraryView`, `Programkatalogen`) er kjent tidsflaky under full kjøring og grønne alene — alt annet rødt er ekte.
- **Commit bare når Eirik ber om det.** Commit-meldinger på norsk, konvensjonelle, ingen KI-attribusjon. `git status` etter stage — forrige agent committet en fil som importerte en usporet fil.
- **Ikke lag nye dokumenter** om metoden. Det finnes nok. Skriv i commit-meldinger og i kommentarer der en fremtidig leser ville lurt.

## Første handling

Kjør `ssh kitor "kitor-arbiter status"` og `git status --short | head`. Rapporter begge i én setning hver. Begynn så på punkt 1.

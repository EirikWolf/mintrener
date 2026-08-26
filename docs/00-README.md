# Min Trener – overlevering til kodeagent

Dette settet er skrevet for å tas rett inn i Claude Code eller Antigravity som prosjektkontekst. Legg alle tre filene i `docs/` i repoet.

## Leserekkefølge

1. `trening-app-spesifikasjon.md` – hele bildet. Kapittel 2 (plattformforbehold), 5 (sikkerhet og personvern) og 7 (faseplan) er de som styrer flest beslutninger.
2. `vedlegg-b-microtrening-og-programmer.md` – microtrening (stemme, grupperom, påminnelser) og programkatalogen. Leses før noe av dette bygges; del 1 er P1-relevant.
3. `vedlegg-a-bildepipeline.md` (v2) – kun når arbeidet gjelder øvelsesbiblioteket eller bilder. A.3 (kjøreregler mot Kitor) er obligatorisk lesning før noe skript kjøres mot Kitor.

## Faste rammer som gjelder uansett oppgave

- Produktet er en PWA på trening.web.app. Ingen native-kode i denne fasen.
- Stack: React + Vite + TypeScript, Tailwind, Firebase (Hosting, Auth, Firestore, App Check, Functions, Storage). Avvik fra dette skal begrunnes.
- Appen er åpen for alle med Google-konto. Sikkerhetsregler, App Check og sletting av konto er en del av MVP, ikke noe som legges på senere.
- Android (Samsung S21, Chrome) er primær testenhet. iPhone (Safari) skal fungere for alt merket P1. Android-eksklusive funksjoner (vibrasjon, Web Bluetooth) skjules på enheter uten støtte – aldri feilmeldinger, aldri knappe som ikke gjør noe.
- Språk i grensesnitt og kode-kommentarer: bokmål. Kodenavn (variabler, filer, Firestore-felt): engelsk, unntatt øvelsesskjemaet som har norske felt fordi det også leses av mennesker.
- Alt som kan gjøres offline skal gjøres offline.
- Timeren styres av tidsstempler, ikke tellende `setInterval`. Lyd via Web Audio med opplåsing ved første brukertrykk.
- Stemmemeldinger er forhåndsinnspilte klipp; talesyntese er kun fallback. Nedtellingen 5–4–3–2–1 skal treffe sekundet.
- Grupper og rom er private og opt-in. Det finnes ikke, og skal ikke lages, noe administratornivå som ser andre brukeres data.
- Tre modus, ikke flere: Alene, Sammen, Led en gruppe. Målgrupper (kontor, barn, kor, senior …) er kontekstprofiler i JSON, ikke modus og ikke kode. Ny profil = nytt JSON-objekt og nye programmer.
- Kun profilene kontor og barn er aktive i første versjon. De andre ligger inne som `planned` og skal ikke bygges før det er bestemt.

## Forslag til første prompt til kodeagenten

> Les `docs/trening-app-spesifikasjon.md` i sin helhet, og del 0 og 1 av `docs/vedlegg-b-microtrening-og-programmer.md`. Sett opp prosjektet etter kapittel 6 med Vite, React, TypeScript, Tailwind og Firebase. Lag deretter timermotoren med to skjermer: intervalltimeren fra kapittel 3.1 med en hardkodet Tabata-økt, og microtimeren fra Vedlegg B.2 med planke 90 sekunder og stemmemeldinger etter tidsplanen i B.3 (bruk talesyntese midlertidig, klippene kommer senere). Lyd via Web Audio, Wake Lock, fargeskifte på bakgrunnen. Ingen innlogging eller Firestore ennå – bare timerne, slik at de kan testes på mobil via `npm run dev --host` før noe annet bygges. Legg til en `docs/DECISIONS.md` der du noterer valg du tar som ikke står i spekken.

Grunnen til å starte med timeren isolert: det er der iOS-problemene med lyd og Wake Lock viser seg, og de er billigst å løse før resten av appen er bygget rundt dem.

## Neste prompter i rekkefølge

1. Google-innlogging, Firestore-modell fra kapittel 6, sikkerhetsregler testet i Emulator, App Check
2. Øvelsesskjema med JSON Schema-validering, deretter generering av biblioteket i bolker (kapittel 3.2 og Vedlegg A.5)
3. Kontekstprofiler som JSON, modusvalg på Hjem, profilvelger (Vedlegg B.0)
4. Programskjema og validering, startkatalog på 18 programmer (Vedlegg B.11–B.13), Programmer-visning
5. Stemmebank `voice-lines.json` (rolig og lek) og TTS-pipeline på Kitor (Vedlegg B.3, B.15 oppgave 2–4), bytt talesyntese mot klipp
6. Bygg økt-skjermen og lagring av maler
7. PWA: manifest, service worker, offline-test
8. Sensorstatus-skjerm og samtykker
9. Bildepipeline (Vedlegg A.13 – oppgave 3, 4 og 8: kopier verifisert graf fra Kitor, arbiter-flyt, pilot med tre øvelser × tre seeds)
10. Personvernerklæring, slett konto, budsjettvarsel – deretter første deploy
11. Fase 2 starter med Led en gruppe (Vedlegg B.0.3) eller grupperom (B.5) – velg etter hva som blir brukt mest av barn-profilen og kontor-profilen

## Ikke gjør

- Ikke legg til funksjoner merket P2/P3 før P1 er testet på begge plattformer.
- Bildene genereres med Flux.1-dev under ikke-kommersiell lisens – bevisst valg (Vedlegg A.12). Ikke legg til betalingsfunksjoner eller sponsing uten at bildespørsmålet er løst først.
- Aldri kall ComfyUI på Kitor uten aktiv `image`-lease fra arbiteren, alltid heartbeat, alltid release i `finally`. Token ligger i `.env`, aldri i repoet.
- Ikke lagre sensordata rått i Firestore – kun aggregater per økt.
- Ikke eksponer ComfyUI på Kitor utenfor hjemmenettet.

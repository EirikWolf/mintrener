# Treningsapp – overlevering til kodeagent

Dette settet er skrevet for å tas rett inn i Claude Code eller Antigravity som prosjektkontekst. Legg alle tre filene i `docs/` i repoet.

## Leserekkefølge

1. `trening-app-spesifikasjon.md` – hele bildet. Kapittel 2 (plattformforbehold), 5 (sikkerhet og personvern) og 7 (faseplan) er de som styrer flest beslutninger.
2. `vedlegg-a-bildepipeline.md` – kun når arbeidet gjelder øvelsesbiblioteket eller bilder.

## Faste rammer som gjelder uansett oppgave

- Produktet er en PWA på trening.web.app. Ingen native-kode i denne fasen.
- Stack: React + Vite + TypeScript, Tailwind, Firebase (Hosting, Auth, Firestore, App Check, Functions, Storage). Avvik fra dette skal begrunnes.
- Appen er åpen for alle med Google-konto. Sikkerhetsregler, App Check og sletting av konto er en del av MVP, ikke noe som legges på senere.
- Android (Samsung S21, Chrome) er primær testenhet. iPhone (Safari) skal fungere for alt merket P1. Android-eksklusive funksjoner (vibrasjon, Web Bluetooth) skjules på enheter uten støtte – aldri feilmeldinger, aldri knappe som ikke gjør noe.
- Språk i grensesnitt og kode-kommentarer: bokmål. Kodenavn (variabler, filer, Firestore-felt): engelsk, unntatt øvelsesskjemaet som har norske felt fordi det også leses av mennesker.
- Alt som kan gjøres offline skal gjøres offline.
- Timeren styres av tidsstempler, ikke tellende `setInterval`. Lyd via Web Audio med opplåsing ved første brukertrykk.

## Forslag til første prompt til kodeagenten

> Les `docs/trening-app-spesifikasjon.md` i sin helhet. Sett opp prosjektet etter kapittel 6 med Vite, React, TypeScript, Tailwind og Firebase. Lag deretter intervalltimeren fra kapittel 3.1 som første funksjon, med en hardkodet Tabata-økt, lydsignaler via Web Audio, Wake Lock og fargeskifte på bakgrunnen. Ingen innlogging eller Firestore ennå – bare timeren, slik at den kan testes på mobil via `npm run dev --host` før noe annet bygges. Legg til en `docs/DECISIONS.md` der du noterer valg du tar som ikke står i spekken.

Grunnen til å starte med timeren isolert: det er der iOS-problemene med lyd og Wake Lock viser seg, og de er billigst å løse før resten av appen er bygget rundt dem.

## Neste prompter i rekkefølge

1. Google-innlogging, Firestore-modell fra kapittel 6, sikkerhetsregler testet i Emulator, App Check
2. Øvelsesskjema med JSON Schema-validering, deretter generering av biblioteket i bolker (kapittel 3.2 og Vedlegg A.5)
3. Bygg økt-skjermen og lagring av maler
4. PWA: manifest, service worker, offline-test
5. Sensorstatus-skjerm og samtykker
6. Bildepipeline (Vedlegg A.13, oppgave 3 først med fem øvelser)
7. Personvernerklæring, slett konto, budsjettvarsel – deretter første deploy

## Ikke gjør

- Ikke legg til funksjoner merket P2/P3 før P1 er testet på begge plattformer.
- Ikke bruk Flux.1-dev til bilder (lisens).
- Ikke lagre sensordata rått i Firestore – kun aggregater per økt.
- Ikke eksponer ComfyUI på Kitor utenfor hjemmenettet.

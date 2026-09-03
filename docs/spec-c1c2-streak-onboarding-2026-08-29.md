# Spec: Uke-streak (C1) og onboarding (C2)

**Dato:** 2026-08-29
**Status:** Til produkteiers gjennomsyn (sparring gjennomført samme dag; alle valg under er avstemt)
**Kilde:** Arbeidsordre Bolk C pkt. 1–2; systemrevisjonen § 6.1–6.2
**Avviker bevisst fra revisjonen:** dagsstreak med tapsinnramming er byttet ut med uke-streak i støttende tone (produkteiers valg i sparringen).

## 1. Formål og målgruppe

To-trinns strategi: bygges for nær krets nå, lanseringsklart i design — tekster som tåler fremmede, og telemetri som gjør effekten målbar før bredere slipp. Suksesskriterier: onboarding-fullføringsrate og uke-2-raten (andel nye brukere som når streakens første milepæl).

## 2. C1 — Uke-streak

### 2.1 Mekanikk

- **Definisjon:** Streak = antall sammenhengende uker (ISO-uke, man–søn) der ukesmålet er nådd, regnet bakover fra og med forrige uke. Inneværende uke kan *øke* streaken så snart målet er nådd, men kan aldri *bryte* den før uka er omme (brudd konstateres først mandag).
- **Avledet, ikke lagret:** `beregnStreak(historikk, ukesmål, slingukeBank)` er en ren funksjon over eksisterende treningshistorikk. Ingen ny synk-tilstand; retroaktivt riktig for eksisterende brukere fra dag én. Kun to ting persisteres: slinguke-banken og feirede milepæler (mot gjentatt konfetti).
- **Slinguke-forsikring:** 1 slinguke opptjenes per 4. fullførte uke, maks 1 i banken. Brukes automatisk når en uke ryker, og feires i etterkant («Slinguka reddet streaken din — fortsatt 6 uker!»). Tom bank → nullstilling uten skam; beste serie huskes og vises alltid.
- **Ukesmål-endring midt i uka:** gjelder fra neste uke; inneværende uke dømmes etter målet ved ukestart.
- **Milepæler:** uke 2 (revisjonens dag-14-punkt), 4, 8, 12, 26, 52 — registreres i eksisterende utfordrings-/badge-system (kun registrering, ingen motorendring).

### 2.2 Førstesiden og tekster

- **Plassering (valgt A i mockup-runden):** ukesmål-pillen utvides: `🔥 4 uker · Ukesmål: 2 av 3` + eksisterende progresjonsbar. Flamme/uketall i varm gulltone, atskilt fra progresjonsgrønn; B6-aksentsystemet røres ikke. Ingen streak ennå → ingen flamme (ingen «0 uker»-skam).
- **Detaljark** (bottom sheet ved trykk på pillen): nåværende serie, beste serie, slinguke-status, neste milepæl, ukesmål-justering (flyttes frem fra innstillinger).
- **Tekstprinsipper (støttende tone):** fremover-rettet, aldri anklagende («1 økt igjen så er uke 5 i boks»); forsikring feires etterpå, truer aldri før; brudd = «Ny start denne uka — forrige serie: 6 uker. Beste: 9.»; milepæl-feiring i fullført-skjermen etter økta som sikret uka — ikke push-varsel.
- **UU:** flammen har tekstalternativ; farge bærer aldri informasjon alene; detaljarket er ordinær fokuserbar dialog.

## 3. C2 — Onboarding

- **Trigger:** kun første besøk (ingen lagret persona *og* ingen historikk); «Hopp over»-lenke på hvert steg; kan gjenåpnes fra innstillinger. Fullføring lagres i localStorage.
- **Steg 1 — «Hvem skal trene deg?» (valgt A i mockup-runden):** rutenett med Jossa (Haugalandet), Ola (Romsdalen), Axel (metalcore), Robin (boyband) + nedtonet «Standard». Hvert kort: navn, én-linjes karakteristikk, ▶-knapp som spiller `<persona>_preview.mp3` via eksisterende preview-mekanisme. Første ▶-trykk er også lyd-opplåsingen. Valg kaller `setActiveCoachPersona` (som fra B6/β6 også setter aksentfarge og preloader stemmen). Hopp over = Standard.
- **Steg 2 — «Hvor ofte vil du trene?»:** 2 / 3 (forhåndsvalgt) / 4+ økter per uke, fritt tall bak «Tilpass». Undertekst: «Dette blir ukesmålet ditt — og grunnlaget for streaken din.» Hopp over = 3.
- **Avslutning — foreslått førsteøkt:** ett anbefalt kort, utstyrsfritt program (f.eks. Klassisk Tabata) med «Start nå» (rett i timeren med personaen i ørene) og «Utforsk selv» (til førstesiden). Ingen konto-spørsmål i onboardingen.
- **Teknisk:** ren `OnboardingFlow`-komponent montert i `App.tsx` foran hovedvisningen, gated på triggeren. Ingen endringer i timer-/lydkjernen.

## 4. Utsatt konto-prompt

Innlogging tilbys ved første verdimoment, aldri som portvakt (anonym-først består):

1. **Etter første fullførte økt** (fullført-skjermen): «Vil du ta vare på fremgangen din på tvers av enheter? Lagre med konto» — avvisbar; gjentas ikke før neste moment.
2. **Ved uke 2-milepælen:** «6 økter og 2 uker på rad — sikre serien med en konto?»

Avvisning huskes per moment. Ingen andre konto-prompter innføres.

## 5. Telemetri

Samme anonyme, samtykke-gatede mønster som `global_stats` (nestede kart, increment-only, innenfor eksisterende rules-herding). Kun tellere — ingen persondata eller tidsserier per bruker:

- `onboarding.started / personaChosen / goalSet / firstWorkoutStarted / skipped`
- Persona-fordeling ved onboarding-valg (mater også stemmebutikk-beslutningen)
- `streak.weekCompleted / insuranceUsed / broken / milestone.uke2` (m.fl. per milepæl)
- `accountPrompt.shown / accepted / dismissed` per moment

## 6. Testing

- `beregnStreak`: uttømmende enhetstester — ukegrenser over nyttår, ISO-uke 53, slinguke-opptjening/-forbruk, målendring midt i uka, tom historikk, retroaktiv bootstrap fra eksisterende historikk.
- Onboarding og detaljark: Testing Library etter B4-mønsteret (oppførsel, tjenestegrense-mock).
- Playwright-røyken utvides med ett steg: førstegangsbruker ser onboarding → velger persona → lander i foreslått økt.
- Fasiten (23 hook-tester) og timer-/lydkjernen berøres ikke.

## 7. Utenfor scope nå — backlog for senere vurdering

Følgende er bevisst utelatt (YAGNI) og legges i backlog for senere vurdering:

- Push-varsler (streak-påminnelser m.m.)
- Streak-deling / sosiale funksjoner
- «Frys streaken»-kjøp (hører til stemmebutikk-diskusjonen, parkert noen måneder)
- Utstyr-/nivå-profilering i onboardingen
- Endringer i eksisterende utfordrings-/badge-motor utover registrering av streak-milepælene

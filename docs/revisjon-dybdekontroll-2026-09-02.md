# Revisjonsbestilling: er dybdestyrt bildegenerering verdt å bygge på?

**Prosjekt:** Min Trener · **Dato:** 2026-09-02 · **Lesetid:** ~5 min

---

## Spørsmålet

Vi trenger 150 øvelsesbilder (75 øvelser × start/slutt). Etter to mislykkede
runder har vi funnet en metode som **løser problemene vi trodde var uløselige**,
men som **treffer 1 av 3 ganger**.

> **Er en pipeline med 1-av-3 treffrate verdt å bygge et bibliotek på, eller er
> det et forskningsresultat vi bør notere og legge bort?**

Vi vil helst bli motsagt. Et svar som sier «dette er en blindvei, gjør X» er
fullverdig.

---

## Hva vi gjorde, kort

Vi genererer med Flux.1 Dev + en person-LoRA, styrt av ControlNet.

**Runde 1 — ren prompt:** 17 av 28 bildepar viste ikke øvelsen.

**Runde 2 — 2D-skjelett (OpenPose COCO-18):** posituren ble riktig, men tre
problemer lot seg ikke løse. Et 2D-punkt `(x, y)` er identisk enten brystet
peker opp eller ned, så *liggende på magen* og *liggende på ryggen* gir samme
skjelett. Vi testet og avkreftet fire hypoteser; en ekstern revisjon kom
uavhengig til samme konklusjon.

**Runde 3 — dybdekart fra et referansefoto.** Vi henter et fritt lisensiert
foto ([free-exercise-db](https://github.com/yuhonas/free-exercise-db), Unlicense),
trekker ut et dybdekart, forkaster pikslene, og bruker dybden som betingelse.

---

## Funnene, i rekkefølge

Hver rad er et bilde. Se dem — de forteller historien raskere enn teksten.

| # | Bilde | Hva det viser |
|---|---|---|
| 1 | [dybde umaskert](bilder/dybdekontroll-2026-09-02/1-dybde-umaskert.png) | **Orienteringen løst.** Første gang hun ligger på magen. Men stativer og vektstang fra kildefotoets gym kom med — dybdekartet bærer hele scenen |
| 2 | [terskelmaske](bilder/dybdekontroll-2026-09-02/2-terskelmaske-to-hoder.png) | Vi terskla bakgrunnen bort. **To hoder.** En terskel skjærer scenen i et avstandsplan og deler kroppen i flekker |
| 3 | [hard personmaske](bilder/dybdekontroll-2026-09-02/3-hard-maske-svever.png) | Ekte personsegmentering (BiRefNet). Rommet er rent — men hun **svever**: masken fjernet gulvet hun lå på |
| 4 | [superman, vellykket](bilder/dybdekontroll-2026-09-02/4-superman-vellykket.png) | Med syntetisk gulv og kortere kontrollvindu: **riktig**. Hendene er svake |
| 5 | [samme oppsett, neste seed](bilder/dybdekontroll-2026-09-02/5-superman-samme-oppsett-neste-seed.png) | **Identisk oppsett, seed +1. To hoder.** Dette er kjernen i spørsmålet |
| 6 | [sideplanke](bilder/dybdekontroll-2026-09-02/6-sideplanke-vellykket.png) | **Rotasjon om kroppsaksen løst** — det andre 2D ikke kunne uttrykke |
| 7 | [katte-ku](bilder/dybdekontroll-2026-09-02/7-katteku-feil-fase.png) | Riktig på alle fire, men den krumme «katt»-ryggen kom ut som svai «ku». Ryggkrumning bæres dårligere enn orientering |

**Kjeden vi endte med:** dybdekart → BiRefNet-personmaske (hard kant) →
syntetisk gulv → ControlNet-styrke 0,9 med kort vindu (`end_percent` 0,25–0,35).

Hvert ledd løste et konkret problem, og hvert ledd er målt.

---

## Det vi tror er årsaken til ustabiliteten

Den maskerte kroppen ligger som en **isolert flekk på et syntetisk gulv**, uten
omgivelser som forankrer hva som er hode og hva som er føtter. En vannrett figur
med armer ut den ene veien og bein ut den andre er nesten symmetrisk — og
modellen leser den som to kropper som møtes på midten.

Vi har ikke testet hypotesen.

---

## Det vi ber deg vurdere

1. **Er 1-av-3 akseptabelt?** 450 genereringer for 150 bilder er billig i
   GPU-tid. Men noen må se på alle 450. Er det en rimelig arbeidsflyt, eller er
   det et varsel om at metoden ikke er moden?

2. **Er hypotesen vår om symmetri riktig?** Og i så fall — ville det hjelpe å
   beholde litt av kildens gulvdybde rundt kroppen i stedet for å maskere alt
   bort? Eller å legge til et svakt sekundært signal (kant, positur) som
   forankrer retningen?

3. **Finnes det en bedre kontrollmodalitet?** Vi bruker ControlNet Union Pro 2.0
   med `depth`. Vi testet `normal` (dårligere — ga ryggleie). Vi har ikke testet
   flere samtidige betingelser, eller en modell trent spesifikt på mennesker.

4. **Er vi på feil spor?** En ekstern revisjon anbefalte tidligere å droppe
   generering til fordel for fotografering eller illustrasjon. Vi valgte å
   fortsette fordi dybdekartet løste noe vi trodde var umulig. Var det en god
   grunn, eller er det sunk cost i ny drakt?

---

## Rammer

- Én RTX 3090 (24 GB), delt med andre prosjekter. En generering tar ~40 s.
- Flux.1 Dev: **utdataene er fritt brukbare, også kommersielt** — det er kun
  kjøring av modellen som er ikke-kommersielt. Vi har lest lisensen fra kilden.
- Referansefotoene er Unlicense, og vi distribuerer dem ikke — vi avleder bare
  geometri. Merk at et dybdekart bærer mer av kilden enn leddkoordinater gjør;
  vi mener det er innenfor, men vil gjerne motsies hvis du ser det annerledes.
- Vi kan kode. Vi er ikke fotografer eller illustratører.

## Hva vi vil ha tilbake

En anbefaling, ikke en meny. Og si fra hvis noe i beskrivelsen er feil — vi har
vært tett på dette lenge.

# Gjennomgang: 74 bilder fra promptruten, 2026-09-03

37 øvelser som manglet bilder helt, generert med prompt alene (ingen
referansefoto). Alle ligger nå i appen — de erstattet ingenting.

## Sammendrag

**Omtrent 18 av 74 er tydelig feil.** Resten spenner fra gode til brukbare.
Feilene fordeler seg ikke tilfeldig.

## Mønsteret: hånd- og fotdetaljer, og kontakt med utstyr

Promptruten klarer helkroppsstillinger. Den klarer ikke to ting:

**1. Øvelser som defineres av en hånd- eller fotplassering.** Modellen lager en
generisk armheving og ignorerer det som skiller varianten.

| Bilde | Feil |
|---|---|
| `archer-pushup-0/1` | ingen archer-posisjon, og de to fasene er like |
| `one-arm-pushup-0/1` | begge armer i gulvet |
| `diamant-pushup-0/1` | hendene ikke i diamant |
| `balanse-tandem-1` | ikke tandemstilling (hæl mot tå) |

**2. Øvelser der kroppen henger i eller hviler på noe.** Utstyret forsvinner,
og stillingen blir stående i stedet.

| Bilde | Feil |
|---|---|
| `dead-hang-1` | står på gulvet, ingen stang |
| `negative-pullups-1` | står på gulvet, ingen stang |
| `dorkarm-trekk-1` | planke i stedet for roing |
| `bulgarsk-utfall-1` | bakre fot ikke hevet, benken ute av bildet |
| `seated-knestrekk-1` | på gulvet, ikke på stolen |
| `tahev-stotte-1` | benet løftet bak, ikke tåhev |
| `pistol-squat-1` | utfall, ikke ettbeins knebøy |

Begge klassene er nøyaktig det dybdestyringen løser: den setter geometrien,
inkludert hvor hendene og føttene er. Pull-up-prøven samme dag viste at også
apparatøvelser fungerer når det syntetiske gulvet slås av.

## Én feil av annen art

`diafragma-pust-0` og `-1` gir en utspilt mage som leser som graviditet.
Prompten ber om at magen utvider seg på innpust, og modellen tok det bokstavelig.
Det er ikke en positurfeil, men en formuleringsfeil, og bør rettes i prompten —
ikke ved å generere på nytt med samme ordlyd.

## Det som ble bra

Stående helkroppsøvelser uten utstyrskontakt traff jevnt godt: `utfall`,
`splitt-kneboy`, `lett-gange`, `jogging-sted`, `quad-stretch`,
`hamstring-stretch`, `reise-seg-stol`, `vegg-pushup`, `desk-push-up`,
`sidestrekk-pust`, `skater-squat`, `balanse-ettbein`.

Det stemmer med kureringen fra 2026-09-01: stående traff 62 %, gulv 22 %.

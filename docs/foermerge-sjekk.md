# Førmerge-sjekk

```bash
npm run sjekk
```

Tar sekunder. Kjør den før du merger noe som legger til kode.

---

## Hvorfor den finnes

Fire revisjoner er kjørt på dette prosjektet. **Tre av dem hadde sitt tyngste funn i kode som ble skrevet i mellomtiden** — ikke i gammel gjeld:

| Funn | Hva det var |
|---|---|
| `communityStatsService` | 50 linjer tjeneste, 34 linjer tester, **null kallsteder**. Kunne heller ikke virke: `counter_*`-dokumentene den skrev til hadde ingen skriveregel |
| Organisasjonsportalen | Levert i `6d18b93` — mens `vedlegg-c` § C.6 lister «administratornivå for arbeidsgivere» under *hva vi ikke skal la oss friste til* |
| Nøkkelstrengene | `deleteUserData` og eksporten bommet på feilstavede localStorage-nøkler. Brukerdata overlevde «slett alt» |

Revisjon er feil verktøy for den klassen. Den er dyr, den kommer uker for sent, og feilen har rukket å bli et premiss andre bygger videre på. Alle tre ville falt ut av noen få spørsmål stilt samme dag.

## Hva maskinen sjekker

1. **Tjenester ingen kaller.** En tjeneste med tester, men uten kallsteder, ser ut som funksjonalitet uten å være det. Testene gjør den verre, ikke bedre — de får den til å se verifisert ut.
2. **Firestore-samlinger uten regel.** Uten en `match`-blokk er de deny-by-default, og feilen svelges typisk som «offline» i en `catch`.
3. **localStorage-nøkler utenfor `storageKeys.ts`.** Sletting fanger dem via prefiks-skannet, men **dataeksporten leser registeret eksplisitt** — nøkler utenfor havner ikke i brukerens kopi. Det er en GDPR-forpliktelse.

Skriptet **blokkerer ikke**. Det rapporterer, og et funn kan være helt bevisst. Det er også bevisst konservativt: falske positiver gjør at folk slutter å kjøre det, så det heller slipper noe gjennom enn å rope om ingenting.

## Fire spørsmål maskinen ikke kan svare på

Disse må et menneske eller en agent svare på. Hvert av dem stammer fra et konkret funn:

**1. Står dette i strid med noe vi har bestemt oss for å ikke bygge?**
`vedlegg-c` § C.6 er den beste siden i hele dokumentsamlingen, og den ble ikke lest før organisasjonsportalen var bygget. Dokumentet fantes. Det var lesingen som manglet.

**2. Er et premiss her arvet fra dokumentasjon uten at kilden er lest?**
Vi trodde Flux-lisensen tvang oss til å regenerere alle bildene ved inntekt. Lisensteksten sier det motsatte, og hadde sagt det hele tiden. Tjenestekatalogen oppga LTX til ~4 s der benchmarken sier 70 s. **Sammendrag blir sannhetskilder uten å være det.**

**3. Lover UI-teksten noe enheten kanskje ikke har?**
Pulsmåleren skjuler seg selv på iPhone, men to andre skjermer sendte brukeren dit for å koble til et pulsbelte som ikke kunne finnes der.

**4. Skrives det data som ingen leser — eller leses det data ingen skriver?**
Telemetrien skriver til fem dokumenter og leser tre. `perf` er en av blindveiene — og det er der lydavvik-bøttene bor, altså go/no-go-kriteriet for produksjonslansering.

## Når den ikke holder

Sjekken fanger *strukturelle* feil, ikke feil vurderinger. Den ser ikke om en funksjon er verdt å bygge, om en tekst er forståelig, eller om en øvelse er trygg. Til det trengs fortsatt lesing — bare ikke som revisjon flere uker etterpå.

Referansetestene (`src/data/__tests__/referenceIntegrity.test.ts`) og regeltestene (`tests/rules/`) dekker to andre klasser og kjører i CI. Denne sjekken er supplementet som fanger det de ikke ser.

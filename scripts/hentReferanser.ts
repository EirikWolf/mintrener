/**
 * Henter referansefotoene dybdestyringen bygger på, fra free-exercise-db.
 *
 * HVORFOR HÅNDVALGT KOBLING. Automatisk matching mot basen ble prøvd og
 * forkastet 2026-09-01: terskel 0,50 ga 60 av 75 treff, men stort sett FEIL
 * øvelser; 0,70 pluss utstyrskompatibilitet ga 14 av 75, og flere av dem var
 * fortsatt feil. En referanse som viser feil øvelse er verre enn ingen, fordi
 * dybdekartet da styrer modellen bestemt i gal retning. Derfor er hver linje
 * her valgt for hånd og skal endres for hånd.
 *
 * HVORFOR DENNE FILA FINNES. Referansene lå i en midlertidig sesjonsmappe.
 * De forsvinner når sesjonen gjør det, og da er et forsøk ikke reproduserbart —
 * vi ville ikke kunne kjøre om igjen med samme kilde. Nå ligger de i
 * pipeline/referanser/, som er utenfor versjonskontroll: bildene er Unlicense
 * og fritt brukbare, men de er andres fotografier, og vi avleder bare geometri
 * fra dem. Vi distribuerer dem ikke videre.
 *
 * Kjør: npx tsx scripts/hentReferanser.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const UT = path.join(ROOT, 'pipeline', 'referanser');
const BASIS = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises';

/**
 * Øvelses-id + fase → mappe i free-exercise-db + bildenummer.
 *
 * Fasenummeret vårt og bildenummeret deres er IKKE alltid det samme. Basen
 * viser start på 0 og slutt på 1, men for øvelser der vår fase 0 er en hvile-
 * eller forberedelsesstilling, kan riktig kilde ligge i det andre bildet.
 */
/**
 * `vindu` er hvor lenge dybdekartet styrer, som andel av stegene.
 *
 * MÅLT 2026-09-02 på sideplanke høyre, én skrue om gangen, to seeds hver:
 *
 *   vindu 0,35 (standard)  løse joggebukser, kraftigere kropp, strak arm
 *   vindu 0,20             tights, atletisk kropp, underarm
 *   LoRA 1,0 i stedet      ingen forskjell fra standard
 *
 * Årsaken er at dybdekartet bærer KILDENS silhuett, ikke bare posituren.
 * Referansemannen går i vide collegebukser, og jo lenger kartet styrer, jo mer
 * av den formen blir bakt inn — enten som løse bukser eller som kroppsmasse.
 * At LoRA ikke hjalp, er selve beviset: formen settes av styringen, ikke av
 * identiteten.
 *
 * Men et kort vindu koster posituren. Samme kjøring viste superman vri seg ut
 * av mageleie og katte-ku fase 1 komme ut som «ku» ved 0,20. Der orienteringen
 * eller ryggkrumningen ER øvelsen, må vinduet være langt.
 *
 * Derfor per øvelse: kort der stillingen er utvetydig, langt der den ikke er.
 */
export const REFERANSER: Record<
  string,
  { mappe: string; bilde: 0 | 1; speil?: true; vindu?: number; gulv?: false }
> = {
  'planke-1': { mappe: 'Plank', bilde: 1 },
  'push-ups-0': { mappe: 'Pushups', bilde: 0 },
  'push-ups-1': { mappe: 'Pushups', bilde: 1 },
  'katte-ku-0': { mappe: 'Cat_Stretch', bilde: 0 },
  'katte-ku-1': { mappe: 'Cat_Stretch', bilde: 1 },
  'mountain-climbers-1': { mappe: 'Mountain_Climbers', bilde: 1 },
  'rygghev-superman-0': { mappe: 'Superman', bilde: 0 },
  'rygghev-superman-1': { mappe: 'Superman', bilde: 1 },
  // Sideplanke finnes som tre øvelser hos oss (nøytral, høyre, venstre), men
  // er én positur speilvendt. Basen har bare høyre side — verifisert ved å se
  // på fotoet: mannen ligger på HØYRE underarm.
  //
  // Første kjøring koblet samme referanse til alle tre og lot prompten («left
  // forearm») ordne resten. Den taper: dybdekartet bestemmer siden, så alle
  // seks venstre-bildene kom ut som høyre sideplanke. Derfor speiles kilden.
  'sideplanke-0': { mappe: 'Side_Bridge', bilde: 0, vindu: 0.2 },
  'sideplanke-1': { mappe: 'Side_Bridge', bilde: 1, vindu: 0.2 },
  'sideplanke-hoyre-0': { mappe: 'Side_Bridge', bilde: 0, vindu: 0.2 },
  'sideplanke-hoyre-1': { mappe: 'Side_Bridge', bilde: 1, vindu: 0.2 },
  'sideplanke-venstre-0': { mappe: 'Side_Bridge', bilde: 0, speil: true, vindu: 0.2 },
  'sideplanke-venstre-1': { mappe: 'Side_Bridge', bilde: 1, speil: true, vindu: 0.2 },
  // FASENE ER FORSKJØVET mot basens. Deres bilde 0 er et oppreist utfall med
  // hendene ledige; vår fase 0 krever begge håndflater i gulvet innenfor
  // fremre fot. Det er deres bilde 1 som viser den stillingen. Oppdaget ved å
  // se på referansene før kjøring — koblingen så riktig ut på navnet alene.
  'verdens-beste-toyeovelse-0': { mappe: 'Worlds_Greatest_Stretch', bilde: 1 },
  'manualpress-bryst-0': { mappe: 'Dumbbell_Bench_Press', bilde: 0 },
  'manualpress-bryst-1': { mappe: 'Dumbbell_Bench_Press', bilde: 1 },
  // Startstillingen er ryggliggende flat på matta, og det er nøyaktig bilde 0
  // av jackknife. Vi bruker den for orienteringen, ikke for øvelsen.
  'hulekroppshold-0': { mappe: 'Jackknife_Sit-Up', bilde: 0 },
  /**
   * PRØVE: apparatøvelser.
   *
   * Personmasken sletter alt som ikke er mennesket — det er grunnen til at
   * rommet ble rent. For en pull-up forsvinner da også stanga, og hun blir
   * hengende og holde i ingenting.
   *
   * Men for nettopp denne øvelsen er det å SVEVE riktig. Vi slår derfor av det
   * syntetiske gulvet (som ellers er der for å gi bakkekontakt) og lar
   * prompten levere stanga mens dybdekartet leverer den hengende kroppen.
   *
   * Virker det, åpner det de øvrige apparatøvelsene: bord-roing, muscle-up,
   * negative pull-ups. Virker det ikke, er grensen reell og skal skrives ned.
   */
  'pull-ups-0': { mappe: 'Pullups', bilde: 0, gulv: false },
  'pull-ups-1': { mappe: 'Pullups', bilde: 1, gulv: false },
};

/**
 * Uløst: mangler brukbar kilde i basen.
 *
 * Hulekroppshold fase 1 er en bananform med skuldrene løftet og beina svevende
 * lavt. Basen har crunch (knærne bøyd, ryggen krummer seg opp) og jackknife
 * (kroppen brettes sammen) — begge har feil ryggform, og ryggform er nettopp
 * det dybdekartet bærer dårligst. En omtrentlig referanse ville styrt modellen
 * bestemt til feil positur.
 *
 * Stående ryggvri: basen har ingen stående vridning uten redskap.
 */
export const UTEN_KILDE = [
  'hulekroppshold-1',
  // Basens bilde 0 er en halvknelende forberedelse med hånden på kneet. Vår
  // fase 0 er en plankeforberedelse på underarmer og knær. Alle tre
  // genereringene ble trofast mot referansen og dermed feil for oss — modellen
  // gjorde jobben sin, koblingen var gal. Basen har ingen slik forberedelse.
  'planke-0',
  // Fase 1 er en full brystryggsrotasjon med én arm rett opp. Basen har ingen
  // utfallsvridning: nærmeste treff er Russian Twist (sittende) og Windmills
  // (stående, uten utfall). Begge ville styrt modellen bestemt til feil kropp.
  'verdens-beste-toyeovelse-1',
  'staende-ryggvri-0',
  'staende-ryggvri-1',
];

async function hent(mappe: string, bilde: number, mål: string): Promise<boolean> {
  const url = `${BASIS}/${mappe}/${bilde}.jpg`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`  ✗ ${mappe}/${bilde}.jpg → HTTP ${res.status}`);
    return false;
  }
  fs.writeFileSync(mål, Buffer.from(await res.arrayBuffer()));
  return true;
}

async function main() {
  fs.mkdirSync(UT, { recursive: true });
  const oppgaver = Object.entries(REFERANSER);
  let hentet = 0;
  let fantes = 0;

  for (const [nøkkel, { mappe, bilde }] of oppgaver) {
    const mål = path.join(UT, `${nøkkel}.jpg`);
    if (fs.existsSync(mål) && fs.statSync(mål).size > 1000) {
      fantes++;
      continue;
    }
    if (await hent(mappe, bilde, mål)) {
      console.log(`  ✓ ${nøkkel.padEnd(28)} ← ${mappe}/${bilde}.jpg`);
      hentet++;
    }
  }

  console.log(`\n${hentet} hentet, ${fantes} fantes fra før, ${oppgaver.length} totalt.`);
  console.log(`Uten kilde (${UTEN_KILDE.length}): ${UTEN_KILDE.join(', ')}`);
  console.log(`Mappe: ${path.relative(ROOT, UT)}`);
}

if (process.argv[1]?.endsWith('hentReferanser.ts')) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

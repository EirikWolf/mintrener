import { byggCoco18Px, STATUR } from './poseBody.mjs';
import { POSE_CANVAS, POSE_CANVAS_LANDSCAPE } from './poseSkeleton.mjs';

/**
 * Positurene for øvelsesskjelettene, oppgitt som VINKLER på den felles kroppen
 * i poseBody.mjs.
 *
 * Fram til 2026-09-01 sto de her som absolutte koordinater, tegnet for hånd én
 * for én. Målt på resultatet varierte underarmen 2,20×, overarmen 1,65× og
 * torsoen 1,45× mellom øvelsene — skjelettene beskrev bokstavelig talt ulike
 * mennesker, og ControlNet gjengav det trofast. Vinkler fjerner hele feilklassen:
 * lengdene kan ikke avvike, fordi de ikke oppgis her.
 *
 * VINKLER: grader, 0 = mot høyre, positiv mot klokka slik det ser ut på skjermen.
 * Stående figur i profil mot høyre: torso 90, lår −90, overarm −90.
 *
 * ANTALL FASER ER EN PÅSTAND. En bevegelse har start og slutt; et statisk hold
 * har én posisjon. Katalogens `type` skiller ikke disse — planke og sprellmenn er
 * begge `tid`, men bare den ene er et hold. Derfor sier posedataene det.
 *
 * GULVLEDD er den andre påstanden: hvilke ledd som hviler på gulvet. Uten den
 * kunne en positur ha hendene i lufta og føttene i gulvet uten at noe sa fra —
 * den gamle armhevingen hadde håndleddet 122 px under ankelen.
 *
 * HÅNDREGELEN fra vedlegg A § A.6 er fulgt: hendene er opptatt eller nøytrale.
 * Åpne håndflater mot kamera er der artefaktene kommer.
 */

/** Symmetrisk positur: én side oppgis, den andre følger av kameravinkelen. */
const S = ({ navn, torso, hode, ansikt, gulvledd, ...ledd }) => ({
  navn,
  torso,
  hode,
  ansikt,
  gulvledd,
  symmetrisk: ledd,
});

// COCO-18-indekser, for gulvledd
const HÅNDLEDD_H = 4;
const ALBUE_H = 3;
const KNE_H = 9;
const ANKEL_H = 10;
const ANKEL_V = 13;
const HOFTE_H = 8;

export const POSES = {
  // --- Armhevinger og progresjonene fram til dem -------------------------

  'push-ups': {
    vinkel: 'side',
    gulvledd: [HÅNDLEDD_H, ANKEL_H],
    faser: [
      S({
        navn: 'Start — høy planke, strake armer',
        // Kroppen er én rett linje fra skulder til ankel. Hellingen er ikke et
        // valg: armen er 259 px og bærer skulderen, beina rekker 383 px bakover,
        // og da FØLGER 26° av proporsjonene. Den gamle posituren hadde 18° med
        // korte bein, og håndleddet havnet 122 px under ankelen — en planke med
        // hendene på en kasse.
        torso: 26,
        hode: 55,
        overarm: -88,
        underarm: -88,
        lår: -154,
        legg: -154,
      }),
      S({
        navn: 'Bunn — brystet like over gulvet, albuene bak',
        // I en armhevings bunnposisjon peker overarmen BAKOVER fra skulderen og
        // litt opp; bare hånden er i gulvet. Første forsøk la albuen 28 px over
        // gulvet, og ControlNet tegnet lydig en underarmsplanke.
        torso: 7,
        hode: 40,
        overarm: 168,
        underarm: -58,
        lår: -173,
        legg: -173,
      }),
    ],
  },

  'kne-pushup': {
    vinkel: 'side',
    gulvledd: [HÅNDLEDD_H, KNE_H],
    faser: [
      S({
        navn: 'Start — knærne i gulvet, strake armer',
        // Brattere enn en full armheving, og det er riktig: armen (259 px) er
        // lengre enn låret (191 px), så skulderen MÅ ligge høyere enn kneet.
        torso: 42,
        hode: 65,
        overarm: -88,
        underarm: -88,
        lår: -138,
        legg: 155, // leggen opp fra kneet — føttene i lufta
      }),
      S({
        navn: 'Bunn — brystet ned, hoften i linje med knærne',
        torso: 10,
        hode: 42,
        overarm: 168,
        underarm: -58,
        lår: -170,
        legg: 165,
      }),
    ],
  },

  'vegg-pushup': {
    vinkel: 'side',
    gulvledd: [ANKEL_H],
    faser: [
      S({
        navn: 'Start — strake armer mot veggen',
        torso: 72,
        hode: 78,
        overarm: 5,
        underarm: 5,
        lår: -99,
        legg: -97,
      }),
      S({
        navn: 'Bunn — brystet mot veggen, albuene bøyd',
        // Håndleddet blir stående i omtrent samme høyde som i start — hånden
        // ligger på veggen, og veggen flytter seg ikke mellom de to bildene.
        torso: 62,
        hode: 70,
        overarm: -30,
        underarm: 55,
        lår: -102,
        legg: -100,
      }),
    ],
  },

  'desk-push-up': {
    vinkel: 'side',
    gulvledd: [ANKEL_H],
    faser: [
      S({
        navn: 'Start — hendene på pultkanten, strake armer',
        torso: 54,
        hode: 68,
        overarm: -60,
        underarm: -60,
        lår: -108,
        legg: -105,
      }),
      S({
        navn: 'Bunn — brystet mot kanten',
        torso: 38,
        hode: 55,
        overarm: -118,
        underarm: -12,
        lår: -111,
        legg: -107,
      }),
    ],
  },

  // --- Planke og kjerne ---------------------------------------------------

  planke: {
    vinkel: 'side',
    hold: true,
    gulvledd: [ALBUE_H, HÅNDLEDD_H, ANKEL_H],
    faser: [
      S({
        navn: 'Underarmsplanke — rett linje fra hode til hæl',
        // Underarmen ligger FLATT på gulvet (0°), ikke skrått. Albue og håndledd
        // deler gulvhøyde med ankelen.
        torso: 14,
        hode: 45,
        overarm: -89,
        underarm: 0,
        lår: -166,
        legg: -166,
      }),
    ],
  },

  sideplanke: {
    vinkel: 'skrå',
    hold: true,
    gulvledd: [ALBUE_H, HÅNDLEDD_H, ANKEL_H],
    faser: [
      {
        navn: 'Sideplanke — hoften løftet, føttene stablet',
        torso: 14,
        hode: 48,
        // Albuen står PÅ gulvet, rett under skulderen, med underarmen langs
        // gulvet. Første utkast hadde albuen svevende, og posituren leste som en Y.
        høyre: { overarm: -89, underarm: 0, lår: -166, legg: -166 },
        venstre: { overarm: 72, underarm: 75, lår: -166, legg: -166 },
      },
    ],
  },

  hulekroppshold: {
    vinkel: 'side',
    hold: true,
    gulvledd: [HOFTE_H],
    faser: [
      S({
        navn: 'Hulekropp — korsryggen presset i gulvet, armer og bein løftet',
        // Hodet peker mot venstre, føttene mot høyre. Hakan er trukket mot
        // brystet, så hodeaksen er rullet ned fra ryggraden.
        torso: 166,
        hode: 140,
        overarm: 163,
        underarm: 159,
        lår: 27,
        legg: 25,
      }),
    ],
  },

  'rygghev-superman': {
    vinkel: 'side',
    // Liggende lerret: på portrett brukte skjelettet 4 % av høyden og ble tolket
    // som en sittende kvinne — to ganger, ved begge kontrollinnstillinger.
    lerret: 'liggende',
    gulvledd: [HOFTE_H],
    faser: [
      S({
        navn: 'Start — flatt på magen, armene strukket fram',
        // INGEN ansiktspunkter. DWPose på et ekte foto av en person på magen
        // finner ikke nese og øyne — de peker i gulvet. At vi tegnet dem, sa at
        // ansiktet var synlig, altså at hun lå på ryggen. Modellen gjorde
        // konsekvent nettopp det, ved begge renderere og begge kontrollverdier.
        // Øret beholdes: det ER synlig i profil på en mageliggende person.
        ansikt: 'skjult',
        torso: 6,
        hode: 6,
        overarm: 3,
        underarm: 4,
        lår: -177,
        legg: -177,
      }),
      S({
        navn: 'Slutt — armer og bein løftet samtidig',
        ansikt: 'skjult',
        torso: 20,
        hode: 30,
        overarm: 25,
        underarm: 32,
        lår: 145,
        legg: 140,
      }),
    ],
  },

  'mountain-climbers': {
    vinkel: 'side',
    gulvledd: [HÅNDLEDD_H, ANKEL_V],
    faser: [
      S({
        navn: 'Start — høy planke, beina strukket bak',
        torso: 26,
        hode: 55,
        overarm: -88,
        underarm: -88,
        lår: -154,
        legg: -154,
      }),
      {
        navn: 'Slutt — kneet trukket opp mot brystet',
        torso: 26,
        hode: 55,
        høyre: { overarm: -88, underarm: -88, lår: -15, legg: -145 },
        venstre: { overarm: -88, underarm: -88, lår: -154, legg: -154 },
      },
    ],
  },

  'katte-ku': {
    vinkel: 'side',
    gulvledd: [HÅNDLEDD_H, KNE_H, ANKEL_H],
    faser: [
      S({
        // COCO-18 har ingen ledd i midtryggen, så selve krumningen kan ikke
        // tegnes. Med bare hodet til å bære forskjellen ble de to fasene 0,41
        // fra hverandre — under grensen for «tydelig forskjellige», og altså to
        // nesten like bilder. BEKKENVIPPEN er det som faktisk skiller dem, og
        // den ER synlig i COCO-18: i ku står kneet foran hoften (halebeinet opp),
        // i katt bak den (bekkenet tucket under). Det gir 1,07.
        //
        // Torsovinkelen er ikke fri: kne og håndledd i gulvet pinner skulderen
        // til armlengden og hoften til lårlengden, og vinkelen følger av de to.
        navn: 'Ku — svai rygg, halebeinet opp, blikket opp',
        torso: 21,
        hode: 85,
        overarm: -90,
        underarm: -90,
        lår: -80,
        // Leggen ligger LANGS gulvet (180°), ikke skrått ned. På alle fire er
        // kneet kontaktpunktet og skinnleggen hviler bakover.
        legg: 180,
      }),
      S({
        navn: 'Katt — krum rygg, bekkenet tucket, haken mot brystet',
        torso: 25,
        hode: -60,
        overarm: -90,
        underarm: -90,
        lår: -112,
        legg: 180,
      }),
    ],
  },

  // --- Bein ---------------------------------------------------------------

  kneboy: {
    vinkel: 'side',
    gulvledd: [ANKEL_H],
    faser: [
      S({
        navn: 'Start — stående, hendene samlet ved brystet',
        torso: 90,
        hode: 90,
        overarm: -80,
        underarm: 40,
        lår: -90,
        legg: -90,
      }),
      S({
        navn: 'Bunn — lårene parallelle med gulvet',
        torso: 70,
        hode: 75,
        overarm: -60,
        underarm: 30,
        lår: 0,
        legg: -107,
      }),
    ],
  },

  'stol-kneboy': {
    vinkel: 'side',
    gulvledd: [ANKEL_H],
    faser: [
      S({
        navn: 'Start — stående foran stolen, armene fram',
        torso: 90,
        hode: 90,
        overarm: -35,
        underarm: -10,
        lår: -90,
        legg: -90,
      }),
      S({
        navn: 'Slutt — setet så vidt borti stolen',
        torso: 70,
        hode: 78,
        overarm: -35,
        underarm: -10,
        lår: -5,
        legg: -100,
      }),
    ],
  },

  'reise-seg-stol': {
    vinkel: 'side',
    gulvledd: [ANKEL_H],
    faser: [
      S({
        navn: 'Start — sittende, føttene under knærne',
        torso: 75,
        hode: 82,
        overarm: -35,
        underarm: -10,
        lår: 0,
        legg: -90,
      }),
      S({
        navn: 'Slutt — reist opp, strak hofte',
        torso: 90,
        hode: 90,
        overarm: -35,
        underarm: -10,
        lår: -90,
        legg: -90,
      }),
    ],
  },

  'utfall-forover': {
    vinkel: 'side',
    gulvledd: [ANKEL_H, ANKEL_V],
    faser: [
      S({
        navn: 'Start — stående, hendene på hoftene',
        torso: 90,
        hode: 90,
        overarm: -105,
        underarm: -60,
        lår: -90,
        legg: -90,
      }),
      {
        // Bakre bein er nesten strakt, ikke med kneet i gulvet. Med riktige
        // lemmelengder rekker ikke låret ned dit uten at fremre bein blir
        // absurd langt — den gamle posituren løste det med et lår på 352 px.
        // Å tegne en positur kroppen ikke kan innta er verre enn å navngi den
        // vi faktisk viser.
        navn: 'Slutt — fremre kne over ankelen, bakre bein strakt bakover',
        torso: 87,
        hode: 88,
        høyre: { overarm: -105, underarm: -60, lår: -112, legg: -128 },
        venstre: { overarm: -105, underarm: -60, lår: -48, legg: -80 },
      },
    ],
  },

  'hoye-kneloft': {
    vinkel: 'side',
    gulvledd: [ANKEL_V],
    faser: [
      {
        // Løpearmer: overarmen henger ned, underarmen svinger fram og tilbake,
        // motsatt arm av kneet som er oppe. Første utkast hadde begge hendene
        // over hodet — det leser som jubel, ikke som løping på stedet.
        //
        // Navnet sier ikke «høyre»/«venstre». I ren profil ligger nær og fjern
        // side nesten oppå hverandre, og et bilde kan ikke vise hvilken som er
        // anatomisk høyre. Det gamle navnet påsto det likevel — og var uenig med
        // sine egne koordinater.
        navn: 'Ett kne opp i hoftehøyde',
        torso: 88,
        hode: 88,
        høyre: { overarm: -105, underarm: -155, lår: 10, legg: -85 },
        venstre: { overarm: -70, underarm: 30, lår: -90, legg: -90 },
      },
      {
        navn: 'Motsatt kne opp, armene byttet',
        torso: 88,
        hode: 88,
        // Standbeinet bytter side, og da bytter gulvleddet det også. Med
        // øvelsens felles gulvledd sto figuren på det løftede beinet, og den
        // andre foten stakk 150 px gjennom gulvkanten.
        gulvledd: [ANKEL_H],
        høyre: { overarm: -70, underarm: 30, lår: -90, legg: -90 },
        venstre: { overarm: -105, underarm: -155, lår: 10, legg: -85 },
      },
    ],
  },

  'staende-ryggvri': {
    vinkel: 'front',
    gulvledd: [ANKEL_H, ANKEL_V],
    faser: [
      {
        // ÆRLIG FORBEHOLD: selve vridningen kan ikke uttrykkes i COCO-18. Det
        // finnes ingen ledd i ryggen, og et 2D-skjelett kan ikke vise at
        // skuldrene har rotert bort fra hoftene — samme grense som gjorde
        // sideplanke og katt/ku vanskelig.
        //
        // Det skjelettet KAN bære, er armene: i en pendel svinges begge til
        // samme side av kroppen, og det er signalet som leser som en vridning.
        // Resten må prompten gjøre. Skjelettet låser til gjengjeld ståstillingen,
        // innrammingen og lemmelengdene, som er grunnen til at det er verdt å ha.
        navn: 'Pendelen ute til én side — armene svinger med',
        torso: 90,
        hode: 90,
        høyre: { overarm: -55, underarm: -38, lår: -91, legg: -90 },
        venstre: { overarm: -72, underarm: -52, lår: -89, legg: -90 },
      },
      {
        // Speilbildet av fase 0: pendelen ute på motsatt side.
        navn: 'Pendelen ute til motsatt side',
        torso: 90,
        hode: 90,
        høyre: { overarm: -108, underarm: -128, lår: -91, legg: -90 },
        venstre: { overarm: -125, underarm: -142, lår: -89, legg: -90 },
      },
    ],
  },

  sprellmenn: {
    vinkel: 'front',
    gulvledd: [ANKEL_H, ANKEL_V],
    faser: [
      S({
        navn: 'Start — føttene samlet, armene langs siden',
        torso: 90,
        hode: 90,
        overarm: -97,
        underarm: -95,
        lår: -91,
        legg: -90,
      }),
      S({
        navn: 'Slutt — stjerne, armene over hodet og føttene ut',
        torso: 90,
        hode: 90,
        overarm: 147,
        underarm: 125,
        lår: -104,
        legg: -107,
      }),
    ],
  },
};

/**
 * Lerretet en øvelse tegnes på.
 *
 * Må gi nøyaktig samme svar som byggØvelse — tegnes skjelettet på ett format
 * mens latenten lages på et annet, forskyves posituren (vedlegg A § A.6).
 */
export function lerretFor(def) {
  if (def.lerret === 'liggende') return POSE_CANVAS_LANDSCAPE;
  const alle = def.faser.map((f) => byggCoco18Px(f, def.vinkel)).flat().filter(Boolean);
  const bredde = Math.max(...alle.map((p) => p[0])) - Math.min(...alle.map((p) => p[0]));
  const høyde = Math.max(...alle.map((p) => p[1])) - Math.min(...alle.map((p) => p[1]));
  return bredde > høyde ? POSE_CANVAS_LANDSCAPE : POSE_CANVAS;
}

/**
 * Bygger alle fasene til én øvelse som COCO-18 i normaliserte koordinater.
 *
 * TO FASTE STØRRELSER, OG DE ER IKKE DE SAMME:
 *
 * GULVET ligger stille, og det er per fase. Kroppen bygges fra hoften, men
 * hoften er nettopp det som beveger seg i et knebøy — forankret vi hele figuren
 * i hoften, sank gulvet med den, og i bunnposisjonen svevde føttene 200 px over
 * det de sto på i startbildet.
 *
 * KAMERAET ligger stille, og det er per øvelse. Vedlegg A § A.10 krever «start
 * og slutt … fra samme kameraposisjon», så den vannrette innrammingen regnes ut
 * én gang, over alle fasene, og rammer inn hele bevegelsen.
 */
export function byggØvelse(def, { gulv = 0.94, senter = 0.5, fyll = 0.86 } = {}) {
  const råFaser = def.faser.map((fase) => byggCoco18Px(fase, def.vinkel));

  // --- Lerretet velges av posituren, ikke av et flagg ---------------------
  //
  // Superman hadde `lerret: 'liggende'` satt for hånd fordi den feilet synlig.
  // Planke, armhevinger og mountain climbers er like vannrette og sto likevel
  // på portrett — figuren endte i nederste fjerdedel med tom vegg over seg.
  // Formatet følger nå av hvor bred posituren faktisk er.
  /**
   * Marg rundt skjelettet, fordi kroppen er større enn leddene.
   *
   * COCO-18 markerer LEDD, ikke ytterpunkter. Øverste ledd er øyet, ikke issen;
   * ytterste ledd er håndleddet, ikke fingertuppen. Skalerte vi mot leddene,
   * havnet det som stikker utenfor dem ute av bildet — stående ryggvri kom
   * tilbake med kronen avkuttet, sprellmenn med hendene kuttet i hjørnene.
   *
   * Én marg rundt hele, ikke bare på toppen: hendene i en stjerne peker opp OG
   * ut, og føttene stikker fram forbi ankelen.
   */
  const MARG = 0.10 * STATUR;
  const alle = råFaser.flat().filter(Boolean);
  const bredde =
    Math.max(...alle.map((p) => p[0])) - Math.min(...alle.map((p) => p[0])) + 2 * MARG;
  const høyde =
    Math.max(...alle.map((p) => p[1])) - Math.min(...alle.map((p) => p[1])) + 2 * MARG;
  const lerret = def.lerret === 'liggende' || bredde > høyde ? POSE_CANVAS_LANDSCAPE : POSE_CANVAS;

  // --- Kameraavstanden ----------------------------------------------------
  //
  // STATUR er lik for alle positurer, og det er RIKTIG for proporsjonene: det
  // var ulike lemmeforhold som gjorde at Astrid så ut som ulike mennesker.
  // Men absolutt størrelse er noe annet. Et knebøy er genuint kortere enn en
  // stående person, så med fast pikselstørrelse fylte det 35 % av bildet mens
  // resten var tom vegg.
  //
  // Skalaen regnes derfor per ØVELSE, over alle fasene samlet — kameraet står
  // stille mellom start og slutt (vedlegg A § A.10), men flytter seg mellom
  // øvelser, slik et kamera gjør. Forholdene mellom lemmene er urørt.
  const skala = Math.min(
    (fyll * lerret.width) / bredde,
    (fyll * lerret.height) / høyde
  );

  const faser = råFaser.map((joints, i) => {
    const skalert = joints.map((p) => p && [p[0] * skala, p[1] * skala]);
    const gulvledd = def.faser[i].gulvledd ?? def.gulvledd;
    const gulvY = gulvledd.map((k) => skalert[k][1]);
    // Gulvet forankres per FASE: kroppen bygges fra hoften, men hoften er
    // nettopp det som beveger seg i et knebøy.
    const dy = gulv * lerret.height - gulvY.reduce((a, b) => a + b, 0) / gulvY.length;
    return skalert.map((p) => p && [p[0], p[1] + dy]);
  });

  const xs = faser.flat().filter(Boolean).map((p) => p[0]);
  const dx = senter * lerret.width - (Math.min(...xs) + Math.max(...xs)) / 2;

  return faser.map((joints) =>
    joints.map((p) => (p ? [(p[0] + dx) / lerret.width, p[1] / lerret.height] : null))
  );
}

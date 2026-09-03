/**
 * Den felles kroppen bak alle øvelsesskjelettene.
 *
 * BAKGRUNNEN: de 29 positurene var tegnet for hånd, hver for seg, som absolutte
 * koordinater. Målt på de ferdige skjelettene varierte underarmen 2,20×, overarmen
 * 1,65× og torsoen 1,45× mellom øvelsene. ControlNet gjengir de proporsjonene
 * trofast — så Astrid så anorektisk ut i ett bilde og overvektig i det neste.
 * Ingen promptendring retter det: skjelettet bestemmer lemmelengdene.
 *
 * Her oppgir en positur derfor bare VINKLER. Lengdene kommer fra ett felles sett
 * nedenfor, så alle skjelettene beskriver samme person per konstruksjon.
 *
 * TO FELLER SOM VAR ÅRSAKEN, OG SOM MODELLEN LUKKER:
 *
 * 1. Normaliserte koordinater lyver om lengde. Lerretet er 896 × 1152, så et lem
 *    med normalisert lengde 0,2 er 179 px vannrett og 230 px loddrett — 28 %
 *    forskjell på det samme lemmet. All kinematikk her regnes derfor i PIKSLER,
 *    og normaliseres først til slutt.
 * 2. Sidene kunne være uenige om ryggraden. Torso og hode er nå felles for begge
 *    sider av en positur; bare armene og beina oppgis per side.
 *
 * VINKELKONVENSJON: grader, 0 = mot høyre, positiv mot klokka slik det SER ut på
 * skjermen (y peker nedover i bildet, så vi trekker fra sinus). Stående figur:
 * torso 90 (opp), lår −90 (ned), overarm −90 (hengende).
 */

/**
 * Figurens høyde i piksler, målt fra gulv til isse.
 *
 * Satt av det mest utstrakte skjelettet vi har — sprellmenn i stjernen, med
 * hendene over hodet — som må få plass i 1152 px med luft rundt. Alle andre
 * positurer blir da mindre av seg selv. Å skalere per øvelse i stedet ville
 * gjenskapt nøyaktig problemet modellen finnes for.
 */
export const STATUR = 780;

/**
 * Lemmelengder som andel av staturen (Drillis & Contini, tilpasset COCO-18 der
 * leddene ikke er de samme: «nakke» er midtpunktet mellom skuldrene, ikke C7).
 */
const ANDEL = {
  torso: 0.288, // hofte → nakke
  nakkeSkulder: 0.036, // nakke → skulder, langs ryggraden bakover
  /**
   * Kroppsbredden, og hvorfor den var feil.
   *
   * I SIDEPROFIL ligger skuldre og hofter oppå hverandre i skjelettet, så Flux
   * finner selv kroppsbredden ut fra prompten — og traff fint. I FRONTVINKEL
   * dikterer ControlNet bredden fra disse to tallene, og da slår en feil rett
   * inn i kroppsformen. Begge frontbildene 2026-09-01 kom tilbake med brede
   * hofter og smale skuldre; begge sideprofilene var slanke og atletiske.
   *
   * Feilen: `halvHofte` var satt fra BI-TROKANTÆR bredde (0,19 av statur), som
   * er avstanden mellom de ytre hoftebeina. COCO-18 sitt hofteledd er
   * LEDDSENTERET, og de ligger omtrent halvparten så langt fra hverandre.
   * Skulder/hofte-forholdet ble 1,32 der en trent kvinne ligger nærmere 1,8.
   */
  halvSkulder: 0.115, // biakromial bredde 0,23 av statur
  halvHofte: 0.062, // hofteleddsentre, ikke trokantere
  overarm: 0.186,
  underarm: 0.146,
  lår: 0.245,
  legg: 0.246,
};

export const LEMMER = Object.fromEntries(
  Object.entries(ANDEL).map(([navn, andel]) => [navn, andel * STATUR])
);

/**
 * Ansiktspunktene i hodets eget koordinatsystem: `opp` langs hodeaksen fra
 * nakkeleddet, `fram` i blikkretningen. Ett sett for alle positurer — hodet
 * skal ikke krympe fordi figuren bøyer seg.
 */
const HODE = {
  øre: { opp: 0.072, fram: 0.006 },
  øye: { opp: 0.086, fram: 0.036 },
  nese: { opp: 0.071, fram: 0.053 },
};

/** Sideveis avstand mellom øynene og mellom ørene sett rett forfra. */
const ANSIKT_BREDDE = { øye: 0.020, øre: 0.040 };

/**
 * Hvor mye den bortre siden forskyves i en ren profil.
 *
 * DWPose på et ekte profilfoto finner begge sider nesten oppå hverandre. Et
 * skjelett med bare én side leses som en halv kropp, så den bortre tegnes med et
 * lite avvik. I piksler, ikke normalisert — se felle 1 over.
 */
const SPEIL_PX = [-12, 6];

const rad = (grader) => (grader * Math.PI) / 180;

/** Ett steg langs et lem: fra `p`, `lengde` piksler i retning `grader`. */
const stepp = ([x, y], lengde, grader) => [
  x + lengde * Math.cos(rad(grader)),
  y - lengde * Math.sin(rad(grader)),
];

const flytt = ([x, y], [dx, dy]) => [x + dx, y + dy];

/** Speiling av en vinkel om loddaksen — brukt for symmetriske frontpositurer. */
const speilVinkel = (grader) => 180 - grader;

const speilLedd = (s) => ({
  overarm: speilVinkel(s.overarm),
  underarm: speilVinkel(s.underarm),
  lår: speilVinkel(s.lår),
  legg: speilVinkel(s.legg),
});

function armkjede(skulder, s) {
  const albue = stepp(skulder, LEMMER.overarm, s.overarm);
  return { albue, håndledd: stepp(albue, LEMMER.underarm, s.underarm) };
}

function beinkjede(hofte, s) {
  const kne = stepp(hofte, LEMMER.lår, s.lår);
  return { kne, ankel: stepp(kne, LEMMER.legg, s.legg) };
}

/**
 * Bygger de 18 COCO-punktene for én fase, i piksler, med hoftesenteret i (0, 0).
 *
 * Innrammingen — hvor figuren står på lerretet — er bevisst IKKE her. Den gjøres
 * per øvelse i poseData, slik at start- og sluttbildet får samme kameraposisjon.
 */
export function byggCoco18Px(fase, vinkel) {
  const front = vinkel === 'front';
  const torso = fase.torso;
  const hodeVinkel = fase.hode ?? torso;

  const hofteSenter = [0, 0];
  const nakke = stepp(hofteSenter, LEMMER.torso, torso);

  // På tvers av ryggraden, mot skjermens høyre når figuren står oppreist.
  const tvers = torso - 90;

  const høyreLedd = fase.høyre ?? fase.symmetrisk;
  if (!høyreLedd) throw new Error(`Fasen «${fase.navn}» mangler leddvinkler`);
  const venstreLedd =
    fase.venstre ?? (front ? speilLedd(høyreLedd) : høyreLedd);

  // Anatomisk høyre er skjermens VENSTRE når figuren ses forfra.
  const skulderH = front
    ? stepp(stepp(nakke, LEMMER.halvSkulder, tvers + 180), LEMMER.nakkeSkulder, torso + 180)
    : stepp(nakke, LEMMER.nakkeSkulder, torso + 180);
  const hofteH = front ? stepp(hofteSenter, LEMMER.halvHofte, tvers + 180) : hofteSenter;

  const skulderV = front
    ? stepp(stepp(nakke, LEMMER.halvSkulder, tvers), LEMMER.nakkeSkulder, torso + 180)
    : flytt(skulderH, SPEIL_PX);
  const hofteV = front ? stepp(hofteSenter, LEMMER.halvHofte, tvers) : flytt(hofteH, SPEIL_PX);

  const armH = armkjede(skulderH, høyreLedd);
  const armV = armkjede(skulderV, venstreLedd);
  const beinH = beinkjede(hofteH, høyreLedd);
  const beinV = beinkjede(hofteV, venstreLedd);

  // --- Hodet ------------------------------------------------------------
  const opp = hodeVinkel;
  const fram = fase.ansikt === 'venstre' ? hodeVinkel + 90 : hodeVinkel - 90;

  const ansiktspunkt = (nøkkel) =>
    stepp(stepp(nakke, HODE[nøkkel].opp * STATUR, opp), HODE[nøkkel].fram * STATUR, fram);

  // Ansiktet i gulvet: DWPose på et ekte foto av en person på magen finner ikke
  // nese og øyne. At vi tegnet dem, sa at hun lå på ryggen — og modellen gjorde
  // konsekvent nettopp det. Øret ER synlig i profil på en mageliggende person.
  const skjult = fase.ansikt === 'skjult';

  let nese, øyeH, øyeV, øreH, øreV;
  if (front) {
    const langsOpp = (nøkkel) => stepp(nakke, HODE[nøkkel].opp * STATUR, opp);
    nese = langsOpp('nese');
    øyeH = stepp(langsOpp('øye'), ANSIKT_BREDDE.øye * STATUR, tvers + 180);
    øyeV = stepp(langsOpp('øye'), ANSIKT_BREDDE.øye * STATUR, tvers);
    øreH = stepp(langsOpp('øre'), ANSIKT_BREDDE.øre * STATUR, tvers + 180);
    øreV = stepp(langsOpp('øre'), ANSIKT_BREDDE.øre * STATUR, tvers);
  } else {
    nese = ansiktspunkt('nese');
    øyeH = ansiktspunkt('øye');
    øreH = ansiktspunkt('øre');
    øyeV = flytt(øyeH, SPEIL_PX);
    øreV = flytt(øreH, SPEIL_PX);
  }

  return [
    skjult ? null : nese,
    nakke,
    skulderH,
    armH.albue,
    armH.håndledd,
    skulderV,
    armV.albue,
    armV.håndledd,
    hofteH,
    beinH.kne,
    beinH.ankel,
    hofteV,
    beinV.kne,
    beinV.ankel,
    skjult ? null : øyeH,
    skjult ? null : øyeV,
    øreH,
    øreV,
  ];
}

/**
 * Måler lemmene på et ferdig skjelett, i piksler.
 *
 * Finnes for testene: invarianten «alle skjeletter beskriver samme kropp» er
 * bare verdt noe hvis den måles på det som faktisk tegnes.
 */
export function lemmelengderPx(joints, lerret) {
  const px = (p) => p && [p[0] * lerret.width, p[1] * lerret.height];
  const lengde = (a, b) => {
    const [pa, pb] = [px(joints[a]), px(joints[b])];
    return pa && pb ? Math.hypot(pa[0] - pb[0], pa[1] - pb[1]) : null;
  };
  return {
    overarmH: lengde(2, 3),
    underarmH: lengde(3, 4),
    overarmV: lengde(5, 6),
    underarmV: lengde(6, 7),
    lårH: lengde(8, 9),
    leggH: lengde(9, 10),
    lårV: lengde(11, 12),
    leggV: lengde(12, 13),
  };
}

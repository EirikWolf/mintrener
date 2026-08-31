/**
 * Leddkoordinater for øvelsesskjelettene.
 *
 * Normaliserte (0–1) på lerretet i vedlegg A: x fra venstre, y fra topp.
 * Figuren står i profil mot HØYRE der ingenting annet er sagt.
 *
 * ANTALL FASER ER EN PÅSTAND. En bevegelse har start og slutt; et statisk hold
 * har én posisjon. Katalogens `type` skiller ikke disse — planke og sprellmenn
 * er begge `tid`, men bare den ene er et hold. Derfor sier posedataene det:
 * planke, sideplanke og hulekroppshold har én fase.
 *
 * Appen viser fortsatt to faneknapper for alle. Det er en UI-følge å ta
 * separat; å tegne det samme skjelettet to ganger for å fylle en fane ville
 * vært nøyaktig feilen bildekurateringen fant (sideplanke-0 og -1 var samme
 * fil).
 *
 * HÅNDREGELEN fra vedlegg A § A.6 er fulgt: hendene er opptatt eller nøytrale
 * — flate mot gulv, på hoftene, samlet ved brystet. Åpne håndflater mot kamera
 * er der artefaktene kommer.
 */

/**
 * Symmetrisk profil: én side oppgis, den andre speiles med et lite avvik.
 *
 * `navn` løftes ut av leddene. Uten det havnet fasenavnet inne i `symmetrisk`
 * og forsvant fra JSON-en som skrives ved siden av skjelettet — en positur som
 * må rettes, kunne da ikke omtales med navn.
 */
const S = ({ navn, ...ledd }) => ({ navn, symmetrisk: ledd });

export const POSES = {
  // --- Armhevinger og progresjonene fram til dem -------------------------

  'push-ups': {
    vinkel: 'side',
    faser: [
      S({
        navn: 'Start — høy planke, strake armer',
        nese: [0.735, 0.425], øye: [0.720, 0.415], øre: [0.680, 0.420],
        nakke: [0.675, 0.455], skulder: [0.655, 0.465],
        albue: [0.660, 0.590], håndledd: [0.665, 0.710],
        hofte: [0.415, 0.520], kne: [0.285, 0.595], ankel: [0.155, 0.700],
      }),
      S({
        navn: 'Bunn — brystet like over gulvet, albuene bak',
        // Albuen lå først 28 px over gulvet — altså praktisk talt PÅ det. Da
        // fulgte ControlNet skjelettet helt riktig og tegnet en underarmsplanke.
        // I en armhevings bunnposisjon peker overarmen BAKOVER og litt OPP fra
        // skulderen; bare hånden er i gulvet. A/B-testen på kontrollvinduet
        // (0,65 mot 0,9) ga ingen forskjell og utelukket den forklaringen.
        nese: [0.748, 0.620], øye: [0.734, 0.612], øre: [0.696, 0.618],
        nakke: [0.694, 0.643], skulder: [0.674, 0.658],
        albue: [0.588, 0.636], håndledd: [0.666, 0.712],
        hofte: [0.424, 0.662], kne: [0.292, 0.682], ankel: [0.156, 0.706],
      }),
    ],
  },

  'kne-pushup': {
    vinkel: 'side',
    faser: [
      S({
        navn: 'Start — knærne i gulvet, strake armer',
        nese: [0.730, 0.442], øye: [0.718, 0.433], øre: [0.680, 0.440],
        nakke: [0.672, 0.462], skulder: [0.650, 0.480],
        albue: [0.655, 0.590], håndledd: [0.660, 0.700],
        hofte: [0.440, 0.545], kne: [0.310, 0.690], ankel: [0.215, 0.610],
      }),
      S({
        navn: 'Bunn — brystet ned, hoften i linje med knærne',
        nese: [0.738, 0.588], øye: [0.726, 0.580], øre: [0.690, 0.586],
        nakke: [0.682, 0.605], skulder: [0.660, 0.620],
        albue: [0.592, 0.678], håndledd: [0.660, 0.702],
        hofte: [0.445, 0.648], kne: [0.312, 0.692], ankel: [0.218, 0.612],
      }),
    ],
  },

  'vegg-pushup': {
    vinkel: 'side',
    faser: [
      S({
        navn: 'Start — strake armer mot veggen',
        nese: [0.545, 0.310], øye: [0.534, 0.302], øre: [0.500, 0.310],
        nakke: [0.492, 0.330], skulder: [0.470, 0.360],
        albue: [0.592, 0.355], håndledd: [0.720, 0.350],
        hofte: [0.395, 0.560], kne: [0.360, 0.742], ankel: [0.330, 0.930],
      }),
      S({
        navn: 'Bunn — brystet mot veggen, albuene bøyd',
        nese: [0.622, 0.325], øye: [0.610, 0.317], øre: [0.576, 0.324],
        nakke: [0.568, 0.343], skulder: [0.545, 0.372],
        albue: [0.642, 0.432], håndledd: [0.720, 0.352],
        hofte: [0.420, 0.564], kne: [0.372, 0.744], ankel: [0.330, 0.930],
      }),
    ],
  },

  'desk-push-up': {
    vinkel: 'side',
    faser: [
      S({
        navn: 'Start — hendene på pultkanten, strake armer',
        nese: [0.606, 0.378], øye: [0.594, 0.370], øre: [0.560, 0.376],
        nakke: [0.552, 0.395], skulder: [0.530, 0.420],
        albue: [0.586, 0.508], håndledd: [0.645, 0.600],
        hofte: [0.375, 0.585], kne: [0.300, 0.760], ankel: [0.240, 0.930],
      }),
      S({
        navn: 'Bunn — brystet mot kanten',
        nese: [0.650, 0.468], øye: [0.638, 0.460], øre: [0.604, 0.466],
        nakke: [0.596, 0.482], skulder: [0.575, 0.505],
        albue: [0.546, 0.582], håndledd: [0.645, 0.602],
        hofte: [0.390, 0.592], kne: [0.305, 0.762], ankel: [0.240, 0.930],
      }),
    ],
  },

  // --- Planke og kjerne ---------------------------------------------------

  planke: {
    vinkel: 'side',
    hold: true,
    faser: [
      S({
        navn: 'Underarmsplanke — rett linje fra hode til hæl',
        nese: [0.720, 0.487], øye: [0.708, 0.478], øre: [0.672, 0.484],
        nakke: [0.665, 0.505], skulder: [0.640, 0.520],
        albue: [0.645, 0.685], håndledd: [0.748, 0.692],
        hofte: [0.400, 0.578], kne: [0.270, 0.632], ankel: [0.145, 0.692],
      }),
    ],
  },

  sideplanke: {
    vinkel: 'skrå',
    hold: true,
    faser: [
      {
        navn: 'Sideplanke — hoften løftet, føttene stablet',
        // Albuen står PÅ gulvet, rett under skulderen, med underarmen langs
        // gulvet — samme gulvhøyde som føttene. Første utkast hadde albuen
        // svevende over gulvlinja, og posituren leste som en Y.
        høyre: {
          nese: [0.700, 0.590], øye: [0.690, 0.582], øre: [0.660, 0.596],
          nakke: [0.648, 0.618], skulder: [0.632, 0.640],
          albue: [0.640, 0.795], håndledd: [0.748, 0.802],
          hofte: [0.450, 0.700], kne: [0.300, 0.752], ankel: [0.150, 0.802],
        },
        venstre: {
          nese: null, øye: [0.708, 0.580], øre: null,
          nakke: null, skulder: [0.648, 0.622],
          albue: [0.700, 0.500], håndledd: [0.742, 0.382],
          hofte: [0.462, 0.690], kne: [0.312, 0.742], ankel: [0.162, 0.792],
        },
      },
    ],
  },

  hulekroppshold: {
    vinkel: 'side',
    hold: true,
    faser: [
      S({
        navn: 'Hulekropp — korsryggen presset i gulvet, armer og bein løftet',
        nese: [0.420, 0.678], øye: [0.412, 0.672], øre: [0.392, 0.686],
        nakke: [0.385, 0.700], skulder: [0.360, 0.700],
        albue: [0.245, 0.672], håndledd: [0.135, 0.640],
        hofte: [0.560, 0.735], kne: [0.700, 0.680], ankel: [0.840, 0.630],
      }),
    ],
  },

  'rygghev-superman': {
    vinkel: 'side',
    // Liggende lerret: på portrett brukte skjelettet 4 % av høyden og ble tolket
    // som en sittende kvinne — to ganger, ved begge kontrollinnstillinger.
    lerret: 'liggende',
    faser: [
      S({
        navn: 'Start — flatt på magen, armene strukket fram',
        // INGEN ansiktspunkter. DWPose på et ekte foto av en person på magen
        // finner ikke nese og øyne — de peker i gulvet. At vi tegnet dem, sa at
        // ansiktet var synlig, altså at hun lå på ryggen. Modellen gjorde
        // konsekvent nettopp det, ved begge renderere og begge kontrollverdier.
        // Øret beholdes: det ER synlig i profil på en mageliggende person.
        nese: null, øye: null, øre: [0.586, 0.656],
        nakke: [0.574, 0.678], skulder: [0.600, 0.686],
        albue: [0.750, 0.680], håndledd: [0.910, 0.672],
        hofte: [0.360, 0.700], kne: [0.230, 0.706], ankel: [0.075, 0.712],
      }),
      S({
        navn: 'Slutt — armer og bein løftet samtidig',
        nese: null, øye: null, øre: [0.582, 0.560],
        nakke: [0.570, 0.600], skulder: [0.598, 0.620],
        albue: [0.752, 0.560], håndledd: [0.912, 0.480],
        hofte: [0.360, 0.690], kne: [0.230, 0.610], ankel: [0.075, 0.500],
      }),
    ],
  },

  'mountain-climbers': {
    vinkel: 'side',
    faser: [
      S({
        navn: 'Start — høy planke, beina strukket bak',
        nese: [0.730, 0.435], øye: [0.718, 0.426], øre: [0.680, 0.433],
        nakke: [0.672, 0.452], skulder: [0.650, 0.470],
        albue: [0.655, 0.585], håndledd: [0.660, 0.700],
        hofte: [0.420, 0.522], kne: [0.290, 0.592], ankel: [0.155, 0.690],
      }),
      {
        navn: 'Slutt — kneet trukket opp mot brystet',
        høyre: {
          nese: [0.730, 0.435], øye: [0.718, 0.426], øre: [0.680, 0.433],
          nakke: [0.672, 0.452], skulder: [0.650, 0.470],
          albue: [0.655, 0.585], håndledd: [0.660, 0.700],
          hofte: [0.428, 0.522], kne: [0.548, 0.588], ankel: [0.472, 0.662],
        },
        venstre: {
          nese: null, øye: [0.724, 0.424], øre: [0.688, 0.430],
          nakke: null, skulder: [0.640, 0.478],
          albue: [0.645, 0.590], håndledd: [0.650, 0.702],
          hofte: [0.418, 0.532], kne: [0.288, 0.598], ankel: [0.152, 0.694],
        },
      },
    ],
  },

  'katte-ku': {
    vinkel: 'side',
    faser: [
      S({
        navn: 'Ku — svai rygg, blikket opp',
        nese: [0.760, 0.520], øye: [0.748, 0.512], øre: [0.702, 0.532],
        nakke: [0.690, 0.570], skulder: [0.700, 0.585],
        albue: [0.700, 0.680], håndledd: [0.700, 0.775],
        hofte: [0.380, 0.545], kne: [0.360, 0.682], ankel: [0.310, 0.776],
      }),
      S({
        navn: 'Katt — krum rygg, haken mot brystet',
        // COCO-18 har ingen ledd i midtryggen, så krumningen kan ikke tegnes
        // direkte. Den bæres av haken presset ned og hoften rullet under.
        nese: [0.688, 0.688], øye: [0.686, 0.678], øre: [0.690, 0.632],
        nakke: [0.690, 0.608], skulder: [0.702, 0.605],
        albue: [0.700, 0.688], håndledd: [0.700, 0.776],
        hofte: [0.392, 0.598], kne: [0.362, 0.692], ankel: [0.310, 0.778],
      }),
    ],
  },

  // --- Bein ---------------------------------------------------------------

  kneboy: {
    vinkel: 'side',
    faser: [
      S({
        navn: 'Start — stående, hendene samlet ved brystet',
        nese: [0.530, 0.268], øye: [0.520, 0.260], øre: [0.488, 0.268],
        nakke: [0.480, 0.290], skulder: [0.478, 0.312],
        albue: [0.520, 0.402], håndledd: [0.558, 0.452],
        hofte: [0.480, 0.500], kne: [0.478, 0.700], ankel: [0.470, 0.930],
      }),
      S({
        navn: 'Bunn — lårene parallelle med gulvet',
        nese: [0.495, 0.478], øye: [0.484, 0.470], øre: [0.450, 0.480],
        nakke: [0.440, 0.500], skulder: [0.432, 0.522],
        albue: [0.500, 0.588], håndledd: [0.545, 0.612],
        hofte: [0.398, 0.700], kne: [0.558, 0.700], ankel: [0.470, 0.930],
      }),
    ],
  },

  'stol-kneboy': {
    vinkel: 'side',
    faser: [
      S({
        navn: 'Start — stående foran stolen, armene fram',
        nese: [0.530, 0.268], øye: [0.520, 0.260], øre: [0.488, 0.268],
        nakke: [0.480, 0.290], skulder: [0.478, 0.312],
        albue: [0.545, 0.372], håndledd: [0.612, 0.395],
        hofte: [0.480, 0.500], kne: [0.478, 0.700], ankel: [0.470, 0.930],
      }),
      S({
        navn: 'Slutt — setet så vidt borti stolen',
        nese: [0.505, 0.492], øye: [0.494, 0.484], øre: [0.460, 0.494],
        nakke: [0.450, 0.515], skulder: [0.442, 0.538],
        albue: [0.520, 0.578], håndledd: [0.600, 0.598],
        hofte: [0.362, 0.716], kne: [0.548, 0.716], ankel: [0.470, 0.930],
      }),
    ],
  },

  'reise-seg-stol': {
    vinkel: 'side',
    faser: [
      S({
        navn: 'Start — sittende, føttene under knærne',
        nese: [0.505, 0.492], øye: [0.494, 0.484], øre: [0.460, 0.494],
        nakke: [0.450, 0.515], skulder: [0.442, 0.538],
        albue: [0.520, 0.578], håndledd: [0.600, 0.598],
        hofte: [0.362, 0.716], kne: [0.548, 0.716], ankel: [0.470, 0.930],
      }),
      S({
        navn: 'Slutt — reist opp, strak hofte',
        nese: [0.530, 0.268], øye: [0.520, 0.260], øre: [0.488, 0.268],
        nakke: [0.480, 0.290], skulder: [0.478, 0.312],
        albue: [0.545, 0.372], håndledd: [0.612, 0.395],
        hofte: [0.480, 0.500], kne: [0.478, 0.700], ankel: [0.470, 0.930],
      }),
    ],
  },

  'utfall-forover': {
    vinkel: 'side',
    faser: [
      S({
        navn: 'Start — stående, hendene på hoftene',
        nese: [0.530, 0.268], øye: [0.520, 0.260], øre: [0.488, 0.268],
        nakke: [0.480, 0.290], skulder: [0.478, 0.312],
        albue: [0.428, 0.430], håndledd: [0.468, 0.500],
        hofte: [0.480, 0.500], kne: [0.478, 0.700], ankel: [0.470, 0.930],
      }),
      {
        navn: 'Slutt — fremre kne i 90 grader, bakre kne mot gulvet',
        høyre: {
          nese: [0.532, 0.330], øye: [0.522, 0.322], øre: [0.490, 0.330],
          nakke: [0.482, 0.352], skulder: [0.472, 0.372],
          albue: [0.422, 0.480], håndledd: [0.462, 0.552],
          hofte: [0.470, 0.562], kne: [0.332, 0.848], ankel: [0.250, 0.905],
        },
        venstre: {
          nese: null, øye: [0.540, 0.322], øre: null,
          nakke: null, skulder: [0.492, 0.372],
          albue: [0.542, 0.480], håndledd: [0.502, 0.552],
          hofte: [0.492, 0.562], kne: [0.642, 0.742], ankel: [0.642, 0.930],
        },
      },
    ],
  },

  'hoye-kneloft': {
    vinkel: 'side',
    faser: [
      {
        // Løpearmer: overarmen henger ned, underarmen svinger fram og tilbake.
        // Første utkast hadde begge hendene over hodet — det leser som jubel,
        // ikke som løping på stedet.
        navn: 'Høyre kne opp i hoftehøyde',
        høyre: {
          nese: [0.535, 0.288], øye: [0.524, 0.280], øre: [0.494, 0.290],
          nakke: [0.488, 0.315], skulder: [0.470, 0.335],
          albue: [0.442, 0.458], håndledd: [0.372, 0.502],
          hofte: [0.478, 0.520], kne: [0.478, 0.722], ankel: [0.472, 0.928],
        },
        venstre: {
          nese: null, øye: [0.542, 0.282], øre: null,
          nakke: null, skulder: [0.505, 0.335],
          albue: [0.522, 0.452], håndledd: [0.618, 0.410],
          hofte: [0.505, 0.518], kne: [0.628, 0.510], ankel: [0.604, 0.692],
        },
      },
      {
        navn: 'Venstre kne opp i hoftehøyde',
        høyre: {
          nese: [0.535, 0.288], øye: [0.524, 0.280], øre: [0.494, 0.290],
          nakke: [0.488, 0.315], skulder: [0.470, 0.335],
          albue: [0.492, 0.452], håndledd: [0.588, 0.410],
          hofte: [0.478, 0.518], kne: [0.600, 0.510], ankel: [0.576, 0.692],
        },
        venstre: {
          nese: null, øye: [0.542, 0.282], øre: null,
          nakke: null, skulder: [0.505, 0.335],
          albue: [0.472, 0.458], håndledd: [0.402, 0.502],
          hofte: [0.505, 0.520], kne: [0.505, 0.722], ankel: [0.500, 0.928],
        },
      },
    ],
  },

  sprellmenn: {
    vinkel: 'front',
    faser: [
      {
        navn: 'Start — føttene samlet, armene langs siden',
        høyre: {
          nese: [0.500, 0.115], øye: [0.482, 0.100], øre: [0.466, 0.112],
          nakke: [0.500, 0.185], skulder: [0.435, 0.200],
          albue: [0.415, 0.330], håndledd: [0.402, 0.455],
          hofte: [0.462, 0.480], kne: [0.458, 0.690], ankel: [0.456, 0.900],
        },
        venstre: {
          nese: null, øye: [0.518, 0.100], øre: [0.534, 0.112],
          nakke: null, skulder: [0.565, 0.200],
          albue: [0.585, 0.330], håndledd: [0.598, 0.455],
          hofte: [0.538, 0.480], kne: [0.542, 0.690], ankel: [0.544, 0.900],
        },
      },
      {
        navn: 'Slutt — stjerne, armene over hodet og føttene ut',
        høyre: {
          nese: [0.500, 0.115], øye: [0.482, 0.100], øre: [0.466, 0.112],
          nakke: [0.500, 0.185], skulder: [0.435, 0.200],
          albue: [0.332, 0.148], håndledd: [0.256, 0.062],
          hofte: [0.462, 0.480], kne: [0.396, 0.688], ankel: [0.322, 0.880],
        },
        venstre: {
          nese: null, øye: [0.518, 0.100], øre: [0.534, 0.112],
          nakke: null, skulder: [0.565, 0.200],
          albue: [0.668, 0.148], håndledd: [0.744, 0.062],
          hofte: [0.538, 0.480], kne: [0.604, 0.688], ankel: [0.678, 0.880],
        },
      },
    ],
  },
};

/**
 * Gjør en fase om til de 18 COCO-punktene ControlNet forventer.
 *
 * En symmetrisk profil speiles med et lite avvik: i en ekte sideprofil
 * detekterer DWPose begge sider nesten oppå hverandre, og et skjelett med bare
 * én side leses som en halv kropp.
 */
export function toCoco18(fase, offset = 0.014) {
  const h = fase.høyre ?? fase.symmetrisk;
  const v = fase.venstre ?? null;
  if (!h) throw new Error(`Fasen «${fase.navn}» mangler leddkoordinater`);

  const speil = (navn) => {
    if (v) return v[navn] ?? null;
    const p = h[navn];
    return p ? [p[0] - offset, p[1] + offset * 0.35] : null;
  };

  return [
    h.nese ?? null,
    h.nakke ?? null,
    h.skulder ?? null, h.albue ?? null, h.håndledd ?? null,
    speil('skulder'), speil('albue'), speil('håndledd'),
    h.hofte ?? null, h.kne ?? null, h.ankel ?? null,
    speil('hofte'), speil('kne'), speil('ankel'),
    h.øye ?? null, speil('øye'),
    h.øre ?? null, speil('øre'),
  ];
}

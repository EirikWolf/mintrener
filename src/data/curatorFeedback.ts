export interface FeedbackEntry {
  feedback: string;
  status: 'mangler' | 'generert' | 'godkjent' | 'regenerer' | 'ubehandlet';
  updatedAt: string;
}

export const INITIAL_CURATION_FEEDBACK: Record<string, FeedbackEntry> = {
  "kneboy-0": {
    "status": "godkjent",
    "feedback": "Godkjent: God oppreist startposisjon med samlede hender.",
    "updatedAt": "2026-09-02T18:30:00.000Z"
  },
  "kneboy-1": {
    "status": "godkjent",
    "feedback": "Godkjent: God dybde og nøytral rygg i bunnposisjon.",
    "updatedAt": "2026-09-02T18:30:00.000Z"
  },
  "push-ups-0": {
    "status": "godkjent",
    "feedback": "Godkjent (dybdekandidat s1): Ren plankestart i profil med strak kroppslinje og strake armer.",
    "updatedAt": "2026-09-04T08:15:00.000Z"
  },
  "push-ups-1": {
    "status": "godkjent",
    "feedback": "Godkjent (dybdekandidat s2): Nydelig 90 graders albuebøy og strak kroppslinje 2-3 cm over gulvet.",
    "updatedAt": "2026-09-04T08:15:00.000Z"
  },
  "burpees-0": {
    "status": "godkjent",
    "feedback": "Godkjent: Oppreist startposisjon.",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "burpees-1": {
    "status": "regenerer",
    "feedback": "Sluttposisjon: Spenstig opphopp med strake armer strukket over hodet, sett fra siden.",
    "updatedAt": "2026-09-02T18:30:00.000Z"
  },
  "dips-pa-stol-0": {
    "status": "godkjent",
    "feedback": "Godkjent: Dips-start støttet mot benk.",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "dips-pa-stol-1": {
    "status": "godkjent",
    "feedback": "Godkjent: 90 graders albuedybde foran benk.",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "goblet-squat-0": {
    "status": "regenerer",
    "feedback": "Startposisjon: Fullkroppsbilde stående med føtter i skulderbredde, hold kettlebell med begge hender inntil brystet.",
    "updatedAt": "2026-09-02T18:30:00.000Z"
  },
  "goblet-squat-1": {
    "status": "regenerer",
    "feedback": "Sluttposisjon: Dyp knebøy med kettlebell holdt fast mot brystet (ikke hvilende på gulvet), lår parallelle med gulv.",
    "updatedAt": "2026-09-02T18:30:00.000Z"
  },
  "hofteapner-90-90-0": {
    "status": "regenerer",
    "feedback": "Startposisjon: Sittende på gulvet med fremre ben bøyd 90° foran og bakre ben bøyd 90° ut til siden, oppreist overkropp.",
    "updatedAt": "2026-09-02T18:30:00.000Z"
  },
  "hofteapner-90-90-1": {
    "status": "regenerer",
    "feedback": "Sluttposisjon: Overkroppen lent kontrollert fremover over fremre lår for strekk i setet.",
    "updatedAt": "2026-09-02T18:30:00.000Z"
  },
  "hoye-kneloft-0": {
    "status": "godkjent",
    "feedback": "Godkjent: God stående startposisjon i profil.",
    "updatedAt": "2026-09-02T18:30:00.000Z"
  },
  "hoye-kneloft-1": {
    "status": "regenerer",
    "feedback": "Sluttposisjon: Det ene kneet må være løftet eksplosivt opp til 90 graders vinkel (hoftehøyde).",
    "updatedAt": "2026-09-02T18:30:00.000Z"
  },
  "hulekroppshold-0": {
    "status": "godkjent",
    "feedback": "Godkjent: Ryggliggende flat start på matte.",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "hulekroppshold-1": {
    "status": "regenerer",
    "feedback": "Sluttposisjon: Hollow body posisjon - skuldre og strake ben hevet 10-15 cm over gulvet i bananform.",
    "updatedAt": "2026-09-02T18:30:00.000Z"
  },
  "katte-ku-0": {
    "status": "godkjent",
    "feedback": "Godkjent (dybdekandidat s2): Fin firefotstående ku/nøytral posisjon.",
    "updatedAt": "2026-09-04T08:15:00.000Z"
  },
  "katte-ku-1": {
    "status": "godkjent",
    "feedback": "Godkjent (dybdekandidat s2): Tydelig krummet katt-rygg i profil.",
    "updatedAt": "2026-09-04T08:15:00.000Z"
  },
  "kettlebell-halo-0": {
    "status": "godkjent",
    "feedback": "Startposisjon: Stående med kettlebell holdt opp-ned (bunn opp) foran brystet.",
    "updatedAt": "2026-09-02T18:30:00.000Z"
  },
  "kettlebell-halo-1": {
    "status": "godkjent",
    "feedback": "Godkjent: Oppreist posisjon med kettlebell sirkulert rundt hodet bak nakken.",
    "updatedAt": "2026-09-03T20:30:00.000Z"
  },
  "kettlebell-press-0": {
    "status": "godkjent",
    "feedback": "Startposisjon: Kettlebell i rack-posisjon ved skulderen med albuen inntil kroppen.",
    "updatedAt": "2026-09-02T18:30:00.000Z"
  },
  "kettlebell-press-1": {
    "status": "godkjent",
    "feedback": "Sluttposisjon: Kettlebell presset på strak arm over hodet med låst albue.",
    "updatedAt": "2026-09-02T18:30:00.000Z"
  },
  "kettlebell-row-0": {
    "status": "godkjent",
    "feedback": "Godkjent (dybdekandidat): Foroverbøyd med nøytral rygg, kettlebell hengende i strak arm mot gulvet.",
    "updatedAt": "2026-09-03T20:30:00.000Z"
  },
  "kettlebell-row-1": {
    "status": "godkjent",
    "feedback": "Godkjent (dybdekandidat s2): Albuen trukket tett langs kroppen opp mot taket, kettlebell ved hoften.",
    "updatedAt": "2026-09-03T20:30:00.000Z"
  },
  "kettlebell-swing-0": {
    "status": "regenerer",
    "feedback": "Startposisjon (Hike): Kettlebell svunget bakover mellom lårene med bøyd hofte og rett rygg (hip hinge).",
    "updatedAt": "2026-09-02T18:30:00.000Z"
  },
  "kettlebell-swing-1": {
    "status": "godkjent",
    "feedback": "Sluttposisjon: Eksplosiv hofteutretting med kettlebell flytende i brysthøyde på strake armer.",
    "updatedAt": "2026-09-02T18:30:00.000Z"
  },
  "manualpress-bryst-0": {
    "status": "godkjent",
    "feedback": "Godkjent (dybdekandidat s0): Liggende på benk med manualer holdt ved brystet og 90° albuebøy.",
    "updatedAt": "2026-09-04T08:15:00.000Z"
  },
  "manualpress-bryst-1": {
    "status": "godkjent",
    "feedback": "Godkjent (dybdekandidat s0): Manualer presset opp på strake armer over brystet.",
    "updatedAt": "2026-09-04T08:15:00.000Z"
  },
  "mountain-climbers-0": {
    "status": "godkjent",
    "feedback": "Godkjent: Rettet til strak planke i profil.",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "mountain-climbers-1": {
    "status": "godkjent",
    "feedback": "Godkjent: Kne trukket eksplosivt frem under kroppen i profil.",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "planke-0": {
    "status": "godkjent",
    "feedback": "Godkjent: Høy plankestart i ren profil.",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "planke-1": {
    "status": "godkjent",
    "feedback": "Godkjent (dybdekandidat s0): Statisk underarmsplanke i ren sideprofil med strak linje fra hæl til skuldre.",
    "updatedAt": "2026-09-04T08:15:00.000Z"
  },
  "rumensk-markloft-manualer-0": {
    "status": "godkjent",
    "feedback": "Startposisjon: Stående oppreist med manualer foran lårene, stolt bryst.",
    "updatedAt": "2026-09-02T18:30:00.000Z"
  },
  "rumensk-markloft-manualer-1": {
    "status": "regenerer",
    "feedback": "Sluttposisjon: Hoften skjøvet bakover, nøytral rygg, manualene senket like under knehøyde i profil.",
    "updatedAt": "2026-09-02T18:30:00.000Z"
  },
  "rygghev-superman-0": {
    "status": "godkjent",
    "feedback": "Godkjent (dybdekandidat s2): Mageliggende flatt på matte med armer og ben strukket ut.",
    "updatedAt": "2026-09-04T08:15:00.000Z"
  },
  "rygghev-superman-1": {
    "status": "godkjent",
    "feedback": "Godkjent (dybdekandidat s0): Løft av bryst og lår i rygghev.",
    "updatedAt": "2026-09-04T08:15:00.000Z"
  },
  "seated-marsj-0": {
    "status": "godkjent",
    "feedback": "Startposisjon: Sittende oppreist på stol med begge føtter flatt på gulvet.",
    "updatedAt": "2026-09-02T18:30:00.000Z"
  },
  "seated-marsj-1": {
    "status": "godkjent",
    "feedback": "Sluttposisjon: Det ene kneet løftet kontrollert opp fra stolen.",
    "updatedAt": "2026-09-02T18:30:00.000Z"
  },
  "sideplanke-0": {
    "status": "godkjent",
    "feedback": "Godkjent (dybdekandidat s6): Liggende på siden med underarm og albue forberedt.",
    "updatedAt": "2026-09-04T08:15:00.000Z"
  },
  "sideplanke-1": {
    "status": "godkjent",
    "feedback": "Godkjent (dybdekandidat s7): Nydelig ren sideplanke med strak kroppslinje fra ankel til hode.",
    "updatedAt": "2026-09-04T08:15:00.000Z"
  },
  "sideplanke-hoyre-0": {
    "status": "godkjent",
    "feedback": "Godkjent: Liggende på høyre side klar for løft.",
    "updatedAt": "2026-09-04T08:15:00.000Z"
  },
  "sideplanke-hoyre-1": {
    "status": "godkjent",
    "feedback": "Godkjent: Høyre sideplanke med løftet hofte og strak kroppslinje.",
    "updatedAt": "2026-09-04T08:15:00.000Z"
  },
  "sideplanke-venstre-0": {
    "status": "godkjent",
    "feedback": "Godkjent: Liggende på venstre side klar for løft.",
    "updatedAt": "2026-09-04T08:15:00.000Z"
  },
  "sideplanke-venstre-1": {
    "status": "godkjent",
    "feedback": "Godkjent: Venstre sideplanke med løftet hofte og strak kroppslinje.",
    "updatedAt": "2026-09-04T08:15:00.000Z"
  },
  "skoytehopp-0": {
    "status": "godkjent",
    "feedback": "Startposisjon: Lett foroverbøyd på ett ben klar for sideveis fraspark.",
    "updatedAt": "2026-09-02T18:30:00.000Z"
  },
  "skoytehopp-1": {
    "status": "regenerer",
    "feedback": "Sluttposisjon: Landet dypt og stabilt på motsatt ben med bakre ben kryssende bak.",
    "updatedAt": "2026-09-02T18:30:00.000Z"
  },
  "skulder-dislocates-0": {
    "status": "godkjent",
    "feedback": "Startposisjon: Stående med pinne/strikk holdt med bredt grep foran hoftene.",
    "updatedAt": "2026-09-02T18:30:00.000Z"
  },
  "skulder-dislocates-1": {
    "status": "regenerer",
    "feedback": "Sluttposisjon: Pinnen/strikken ført med strake armer i bue over hodet og bak til korsryggen.",
    "updatedAt": "2026-09-02T18:30:00.000Z"
  },
  "skulderpress-manualer-0": {
    "status": "godkjent",
    "feedback": "Startposisjon: Manualer holdt i skulderhøyde med 90° bøy i albuer og stolt holdning.",
    "updatedAt": "2026-09-02T18:30:00.000Z"
  },
  "skulderpress-manualer-1": {
    "status": "godkjent",
    "feedback": "Sluttposisjon: Manualer presset opp på strake armer over hodet.",
    "updatedAt": "2026-09-02T18:30:00.000Z"
  },
  "sprellmenn-0": {
    "status": "godkjent",
    "feedback": "Startposisjon: Stående oppreist med samlede føtter og armene langs siden.",
    "updatedAt": "2026-09-02T18:30:00.000Z"
  },
  "sprellmenn-1": {
    "status": "godkjent",
    "feedback": "Sluttposisjon: Hopp med spredte ben og armer strukket ut og opp over hodet.",
    "updatedAt": "2026-09-02T18:30:00.000Z"
  },
  "utfall-forover-0": {
    "status": "godkjent",
    "feedback": "Startposisjon: Stående oppreist med føtter i hoftebredde og hender i siden.",
    "updatedAt": "2026-09-02T18:30:00.000Z"
  },
  "utfall-forover-1": {
    "status": "godkjent",
    "feedback": "Godkjent: Vinkelprøve med 90 graders dyp bøy i profil.",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "verdens-beste-toyeovelse-0": {
    "status": "regenerer",
    "feedback": "Startposisjon: Dyp utfallsposisjon med hendene på innsiden av fremre fot.",
    "updatedAt": "2026-09-02T18:30:00.000Z"
  },
  "verdens-beste-toyeovelse-1": {
    "status": "regenerer",
    "feedback": "Sluttposisjon: Rotasjon av overkroppen med innvendig arm strukket loddrett opp mot taket.",
    "updatedAt": "2026-09-02T18:30:00.000Z"
  },
  "vegg-pushup-0": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.811Z"
  },
  "vegg-pushup-1": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.812Z"
  },
  "desk-push-up-0": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.812Z"
  },
  "desk-push-up-1": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.812Z"
  },
  "kne-pushup-0": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.812Z"
  },
  "kne-pushup-1": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "diamant-pushup-0": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "diamant-pushup-1": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "archer-pushup-0": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "archer-pushup-1": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "one-arm-pushup-0": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "one-arm-pushup-1": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "stol-kneboy-0": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "stol-kneboy-1": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "splitt-kneboy-0": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "splitt-kneboy-1": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "bulgarsk-utfall-0": {
    "status": "godkjent",
    "feedback": "Godkjent: Bakre fot hevet på benk bak i profil.",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "bulgarsk-utfall-1": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "skater-squat-0": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "skater-squat-1": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "assistert-pistol-0": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "assistert-pistol-1": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "pistol-squat-0": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "pistol-squat-1": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "kneplanke-0": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "kneplanke-1": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "planke-loft-0": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "planke-loft-1": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "rkc-planke-0": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "rkc-planke-1": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "dragon-flag-0": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "dragon-flag-1": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "dorkarm-trekk-0": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "dorkarm-trekk-1": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "bord-roing-0": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "bord-roing-1": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "dead-hang-0": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "dead-hang-1": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "negative-pullups-0": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "negative-pullups-1": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "pull-ups-0": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "pull-ups-1": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "lsit-pullup-0": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "lsit-pullup-1": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "muscle-up-0": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "muscle-up-1": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "seated-knestrekk-0": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "seated-knestrekk-1": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "tahev-stotte-0": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "tahev-stotte-1": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "reise-seg-stol-0": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "reise-seg-stol-1": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "nordic-hamstring-0": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "nordic-hamstring-1": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "copenhagen-planke-0": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "copenhagen-planke-1": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "ettbeins-landing-0": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "ettbeins-landing-1": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "utfall-0": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "utfall-1": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "jogging-sted-0": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "jogging-sted-1": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "lett-gange-0": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "lett-gange-1": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "staende-ryggvri-0": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "staende-ryggvri-1": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "seated-armloft-0": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "seated-armloft-1": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "seated-skulder-rull-0": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "seated-skulder-rull-1": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "balanse-tandem-0": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "balanse-tandem-1": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "balanse-ettbein-0": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "balanse-ettbein-1": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "sidesteg-stotte-0": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "sidesteg-stotte-1": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "sidestrekk-pust-0": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "sidestrekk-pust-1": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "diafragma-pust-0": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "diafragma-pust-1": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "boks-pust-0": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "boks-pust-1": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "sugeror-pust-0": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "sugeror-pust-1": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "utpust-s-lyd-0": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "utpust-s-lyd-1": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "handledd-sirkler-0": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "handledd-sirkler-1": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "finger-strekk-0": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "finger-strekk-1": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "quad-stretch-0": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "quad-stretch-1": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "hamstring-stretch-0": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  },
  "hamstring-stretch-1": {
    "status": "ubehandlet",
    "feedback": "Må vurderes",
    "updatedAt": "2026-09-04T12:51:43.813Z"
  }
};

export const INITIAL_CURATOR_VALG: Record<string, string> = {
  "push-ups-0": "s1",
  "push-ups-1": "s2",
  "katte-ku-0": "s2",
  "katte-ku-1": "s2",
  "manualpress-bryst-0": "s0",
  "manualpress-bryst-1": "s0",
  "mountain-climbers-1": "s2",
  "planke-1": "s0",
  "sideplanke-0": "s6",
  "sideplanke-1": "s7",
  "rygghev-superman-0": "s2",
  "rygghev-superman-1": "s0",
  "verdens-beste-toyeovelse-0": "s2",
  "one-arm-pushup-0": "s1",
  "one-arm-pushup-1": "s0",
  "dips-pa-stol-0": "s1",
  "dips-pa-stol-1": "s0",
  "kettlebell-row-0": "s0",
  "kettlebell-row-1": "s2",
  "dead-hang-0": "s0",
  "dead-hang-1": "s1",
  "negative-pullups-0": "s0",
  "negative-pullups-1": "s0",
  "pull-ups-0": "s0",
  "pull-ups-1": "s0",
  "bord-roing-0": "s1",
  "bord-roing-1": "s0",
  "sideplanke-hoyre-0": "s0",
  "sideplanke-hoyre-1": "s0",
  "sideplanke-venstre-0": "s0",
  "sideplanke-venstre-1": "s0",
  "hulekroppshold-0": "s0"
};

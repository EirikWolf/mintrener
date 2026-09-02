export interface FeedbackEntry {
  feedback: string;
  status: 'mangler' | 'generert' | 'godkjent' | 'regenerer';
  updatedAt: string;
}

export const INITIAL_CURATION_FEEDBACK: Record<string, FeedbackEntry> = {
  'kneboy-0': { status: 'godkjent', feedback: 'Godkjent: God oppreist startposisjon med samlede hender.', updatedAt: '2026-09-02T18:30:00.000Z' },
  'kneboy-1': { status: 'godkjent', feedback: 'Godkjent: God dybde og nøytral rygg i bunnposisjon.', updatedAt: '2026-09-02T18:30:00.000Z' },

  'push-ups-0': { status: 'regenerer', feedback: 'Endre kameravinkel til full sideprofil som viser strak kroppslinje fra hæl til hode på strake armer.', updatedAt: '2026-09-02T18:30:00.000Z' },
  'push-ups-1': { status: 'regenerer', feedback: 'Bunnposisjon: Brystet skal senkes 2-3 cm over gulvet med 90 graders vinkel i albuene, strak kropp sett i profil.', updatedAt: '2026-09-02T18:30:00.000Z' },

  'burpees-0': { status: 'regenerer', feedback: 'Startposisjon: Stående oppreist med føttene i hoftebredde, klar for nedsprang (ikke planke).', updatedAt: '2026-09-02T18:30:00.000Z' },
  'burpees-1': { status: 'regenerer', feedback: 'Sluttposisjon: Spenstig opphopp med strake armer strukket over hodet, sett fra siden.', updatedAt: '2026-09-02T18:30:00.000Z' },

  'dips-pa-stol-0': { status: 'regenerer', feedback: 'Startposisjon: Ryggen vendt mot kanten av stolen/benken, hendene på kanten med strake armer og bøyde/strake ben foran.', updatedAt: '2026-09-02T18:30:00.000Z' },
  'dips-pa-stol-1': { status: 'regenerer', feedback: 'Sluttposisjon: Hoften senket ned foran stolen med 90 graders bøy i albuene, sett i profil.', updatedAt: '2026-09-02T18:30:00.000Z' },

  'goblet-squat-0': { status: 'regenerer', feedback: 'Startposisjon: Fullkroppsbilde stående med føtter i skulderbredde, hold kettlebell med begge hender inntil brystet.', updatedAt: '2026-09-02T18:30:00.000Z' },
  'goblet-squat-1': { status: 'regenerer', feedback: 'Sluttposisjon: Dyp knebøy med kettlebell holdt fast mot brystet (ikke hvilende på gulvet), lår parallelle med gulv.', updatedAt: '2026-09-02T18:30:00.000Z' },

  'hofteapner-90-90-0': { status: 'regenerer', feedback: 'Startposisjon: Sittende på gulvet med fremre ben bøyd 90° foran og bakre ben bøyd 90° ut til siden, oppreist overkropp.', updatedAt: '2026-09-02T18:30:00.000Z' },
  'hofteapner-90-90-1': { status: 'regenerer', feedback: 'Sluttposisjon: Overkroppen lent kontrollert fremover over fremre lår for strekk i setet.', updatedAt: '2026-09-02T18:30:00.000Z' },

  'hoye-kneloft-0': { status: 'godkjent', feedback: 'Godkjent: God stående startposisjon i profil.', updatedAt: '2026-09-02T18:30:00.000Z' },
  'hoye-kneloft-1': { status: 'regenerer', feedback: 'Sluttposisjon: Det ene kneet må være løftet eksplosivt opp til 90 graders vinkel (hoftehøyde).', updatedAt: '2026-09-02T18:30:00.000Z' },

  'hulekroppshold-0': { status: 'regenerer', feedback: 'Startposisjon: Liggende flatt på ryggen på matte med korsryggen presset i gulvet og strake armer over hodet.', updatedAt: '2026-09-02T18:30:00.000Z' },
  'hulekroppshold-1': { status: 'regenerer', feedback: 'Sluttposisjon: Hollow body posisjon - skuldre og strake ben hevet 10-15 cm over gulvet i bananform.', updatedAt: '2026-09-02T18:30:00.000Z' },

  'katte-ku-0': { status: 'regenerer', feedback: 'Startposisjon (Ku/Nøytral): På alle fire med hender under skuldre og knær under hofter, ryggen lett svai og hodet løftet, sett i profil.', updatedAt: '2026-09-02T18:30:00.000Z' },
  'katte-ku-1': { status: 'regenerer', feedback: 'Sluttposisjon (Katt): På alle fire i profil med maksimalt krummet rygg opp mot taket og haken trukket mot brystet.', updatedAt: '2026-09-02T18:30:00.000Z' },

  'kettlebell-halo-0': { status: 'godkjent', feedback: 'Startposisjon: Stående med kettlebell holdt opp-ned (bunn opp) foran brystet.', updatedAt: '2026-09-02T18:30:00.000Z' },
  'kettlebell-halo-1': { status: 'regenerer', feedback: 'Sluttposisjon: Kettlebell sirkulert rundt bakhodet med bøyde albuer og stabil kjerne.', updatedAt: '2026-09-02T18:30:00.000Z' },

  'kettlebell-press-0': { status: 'godkjent', feedback: 'Startposisjon: Kettlebell i rack-posisjon ved skulderen med albuen inntil kroppen.', updatedAt: '2026-09-02T18:30:00.000Z' },
  'kettlebell-press-1': { status: 'godkjent', feedback: 'Sluttposisjon: Kettlebell presset på strak arm over hodet med låst albue.', updatedAt: '2026-09-02T18:30:00.000Z' },

  'kettlebell-row-0': { status: 'regenerer', feedback: 'Startposisjon: Foroverbøyd med nøytral rygg (45 grader), kettlebell hengende i strak arm mot gulvet.', updatedAt: '2026-09-02T18:30:00.000Z' },
  'kettlebell-row-1': { status: 'regenerer', feedback: 'Sluttposisjon: Albuen trukket tett langs kroppen opp mot taket, kettlebell ved hoften.', updatedAt: '2026-09-02T18:30:00.000Z' },

  'kettlebell-swing-0': { status: 'regenerer', feedback: 'Startposisjon (Hike): Kettlebell svunget bakover mellom lårene med bøyd hofte og rett rygg (hip hinge).', updatedAt: '2026-09-02T18:30:00.000Z' },
  'kettlebell-swing-1': { status: 'godkjent', feedback: 'Sluttposisjon: Eksplosiv hofteutretting med kettlebell flytende i brysthøyde på strake armer.', updatedAt: '2026-09-02T18:30:00.000Z' },

  'manualpress-bryst-0': { status: 'regenerer', feedback: 'Startposisjon: Liggende på rygg på benk/matte med manualer holdt ved brystet/skuldrene, 90° bøy i albuer.', updatedAt: '2026-09-02T18:30:00.000Z' },
  'manualpress-bryst-1': { status: 'regenerer', feedback: 'Sluttposisjon: Manualer presset opp på strake armer over brystkassen.', updatedAt: '2026-09-02T18:30:00.000Z' },

  'mountain-climbers-0': { status: 'godkjent', feedback: 'Startposisjon: Strak plankeposisjon på hender med kroppen i rett linje.', updatedAt: '2026-09-02T18:30:00.000Z' },
  'mountain-climbers-1': { status: 'regenerer', feedback: 'Sluttposisjon: Det ene kneet trukket eksplosivt frem mot brystet mens det andre benet er strak.', updatedAt: '2026-09-02T18:30:00.000Z' },

  'planke-0': { status: 'regenerer', feedback: 'Startposisjon: Forberedelse på underarmer og knær/tær i profil.', updatedAt: '2026-09-02T18:30:00.000Z' },
  'planke-1': { status: 'regenerer', feedback: 'Sluttposisjon: Statisk underarmsplanke i full sideprofil med strak linje fra hæl, sete til skuldre (ikke høy planke forfra).', updatedAt: '2026-09-02T18:30:00.000Z' },

  'rumensk-markloft-manualer-0': { status: 'godkjent', feedback: 'Startposisjon: Stående oppreist med manualer foran lårene, stolt bryst.', updatedAt: '2026-09-02T18:30:00.000Z' },
  'rumensk-markloft-manualer-1': { status: 'regenerer', feedback: 'Sluttposisjon: Hoften skjøvet bakover, nøytral rygg, manualene senket like under knehøyde i profil.', updatedAt: '2026-09-02T18:30:00.000Z' },

  'rygghev-superman-0': { status: 'regenerer', feedback: 'Startposisjon: Liggende på magen på matte med strake armer strukket fremover og strake ben.', updatedAt: '2026-09-02T18:30:00.000Z' },
  'rygghev-superman-1': { status: 'regenerer', feedback: 'Sluttposisjon: Samtidig løft av bryst, armer og lår opp fra gulvet med blikk rett ned.', updatedAt: '2026-09-02T18:30:00.000Z' },

  'seated-marsj-0': { status: 'godkjent', feedback: 'Startposisjon: Sittende oppreist på stol med begge føtter flatt på gulvet.', updatedAt: '2026-09-02T18:30:00.000Z' },
  'seated-marsj-1': { status: 'godkjent', feedback: 'Sluttposisjon: Det ene kneet løftet kontrollert opp fra stolen.', updatedAt: '2026-09-02T18:30:00.000Z' },

  'sideplanke-0': { status: 'regenerer', feedback: 'Startposisjon: Liggende på siden med underarmen under skulderen og bøyde/strake ben.', updatedAt: '2026-09-02T18:30:00.000Z' },
  'sideplanke-1': { status: 'regenerer', feedback: 'Sluttposisjon: Hoften løftet opp fra gulvet med strak kroppslinje og støtte på underarm og føtter.', updatedAt: '2026-09-02T18:30:00.000Z' },

  'sideplanke-hoyre-0': { status: 'regenerer', feedback: 'Startposisjon: Liggende på høyre side klar for løft.', updatedAt: '2026-09-02T18:30:00.000Z' },
  'sideplanke-hoyre-1': { status: 'regenerer', feedback: 'Sluttposisjon: Høyre sideplanke med løftet hofte og strak kroppslinje.', updatedAt: '2026-09-02T18:30:00.000Z' },

  'sideplanke-venstre-0': { status: 'regenerer', feedback: 'Startposisjon: Liggende på venstre side klar for løft.', updatedAt: '2026-09-02T18:30:00.000Z' },
  'sideplanke-venstre-1': { status: 'regenerer', feedback: 'Sluttposisjon: Venstre sideplanke med løftet hofte og strak kroppslinje.', updatedAt: '2026-09-02T18:30:00.000Z' },

  'skoytehopp-0': { status: 'godkjent', feedback: 'Startposisjon: Lett foroverbøyd på ett ben klar for sideveis fraspark.', updatedAt: '2026-09-02T18:30:00.000Z' },
  'skoytehopp-1': { status: 'regenerer', feedback: 'Sluttposisjon: Landet dypt og stabilt på motsatt ben med bakre ben kryssende bak.', updatedAt: '2026-09-02T18:30:00.000Z' },

  'skulder-dislocates-0': { status: 'godkjent', feedback: 'Startposisjon: Stående med pinne/strikk holdt med bredt grep foran hoftene.', updatedAt: '2026-09-02T18:30:00.000Z' },
  'skulder-dislocates-1': { status: 'regenerer', feedback: 'Sluttposisjon: Pinnen/strikken ført med strake armer i bue over hodet og bak til korsryggen.', updatedAt: '2026-09-02T18:30:00.000Z' },

  'skulderpress-manualer-0': { status: 'godkjent', feedback: 'Startposisjon: Manualer holdt i skulderhøyde med 90° bøy i albuer og stolt holdning.', updatedAt: '2026-09-02T18:30:00.000Z' },
  'skulderpress-manualer-1': { status: 'godkjent', feedback: 'Sluttposisjon: Manualer presset opp på strake armer over hodet.', updatedAt: '2026-09-02T18:30:00.000Z' },

  'sprellmenn-0': { status: 'godkjent', feedback: 'Startposisjon: Stående oppreist med samlede føtter og armene langs siden.', updatedAt: '2026-09-02T18:30:00.000Z' },
  'sprellmenn-1': { status: 'godkjent', feedback: 'Sluttposisjon: Hopp med spredte ben og armer strukket ut og opp over hodet.', updatedAt: '2026-09-02T18:30:00.000Z' },

  'utfall-forover-0': { status: 'godkjent', feedback: 'Startposisjon: Stående oppreist med føtter i hoftebredde og hender i siden.', updatedAt: '2026-09-02T18:30:00.000Z' },
  'utfall-forover-1': { status: 'regenerer', feedback: 'Sluttposisjon: Ett langt steg frem med 90° bøy i begge knær og oppreist overkropp i profil.', updatedAt: '2026-09-02T18:30:00.000Z' },

  'verdens-beste-toyeovelse-0': { status: 'regenerer', feedback: 'Startposisjon: Dyp utfallsposisjon med hendene på innsiden av fremre fot.', updatedAt: '2026-09-02T18:30:00.000Z' },
  'verdens-beste-toyeovelse-1': { status: 'regenerer', feedback: 'Sluttposisjon: Rotasjon av overkroppen med innvendig arm strukket loddrett opp mot taket.', updatedAt: '2026-09-02T18:30:00.000Z' }
};

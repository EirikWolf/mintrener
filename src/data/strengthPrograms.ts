import { StrengthProgramTemplate } from '../schemas/strengthSchema';

/**
 * Vitenskapelig kunnskapsgrunnlag (basis) for periodisert styrketrening og muskelvekst.
 */
export const STRENGTH_EVIDENCE_BASIS = [
  {
    ref: 'Iversen, V. M., Norum, M., Schoenfeld, B. J., & Fimland, M. S. (2021). No Time to Lift? Designing Time-Efficient Training Programs for Strength and Hypertrophy: A Narrative Review. Sports Medicine, 51(10), 2079–2095.',
    note: 'Tidseffektiv styrketrening: Flerleddsøvelser (knebøy, press, roing, markløft) med 4–12 ukentlige sett per muskelgruppe gir nær maksimal styrkeøkning og muskelvekst, spesielt ved 2–4 dagers ukentlig frekvens.',
  },
  {
    ref: 'Schoenfeld, B. J., Ogborn, D., & Krieger, J. W. (2016). Effects of Resistance Training Frequency on Measures of Muscle Hypertrophy: A Systematic Review and Meta-Analysis. Sports Medicine, 46(11), 1689–1697.',
    note: 'Treningsfrekvens på 2–3 ganger per uke per muskelgruppe gir signifikant større muskelvekst enn 1 gang per uke ved tilsvarende ukentlig treningsvolum.',
  },
  {
    ref: 'Helms, E. R., et al. (2018). Application of the Repetitions in Reserve-Based Rating of Perceived Exertion Scale for Resistance Training of Trained Individuals.',
    note: 'Autoregulering med RIR (Repetitions in Reserve) / RPE sikrer optimal mekanisk spenning og forebygger overtrening i hver fase.',
  },
  {
    ref: 'Morton, R. W., et al. (2018). A systematic review, meta-analysis and meta-regression of the effect of protein supplementation and resistance training on muscle gains.',
    note: 'Progressiv overbelastning (dobbel progresjon) kombinert med fasestyrt periodisering er den viktigste driveren for langsiktig styrkeøkning.',
  },
];

/**
 * Standard 4-fasers periodiseringsmodell for Sterkere 12 uker.
 */
const STERKERE_12_UKER_PHASES: StrengthProgramTemplate['phases'] = [
  {
    phaseName: 'Fase 1: Grunntrening & Hypertrofi',
    weekRange: [1, 4],
    repRange: [8, 12],
    description: 'Bygg muskelvolum, bindevev og bevegelsesmønster med 3–4 arbeidssett á 8–12 repetisjoner (RPE 7–8) og 90s hvile.',
  },
  {
    phaseName: 'Fase 2: Styrkebygging',
    weekRange: [5, 8],
    repRange: [6, 8],
    description: 'Øk mekanisk spenning og råstyrke med 3–4 tyngre arbeidssett á 6–8 repetisjoner (RPE 8) og 2 minutters hvile.',
  },
  {
    phaseName: 'Fase 3: Topping & Maksimal Styrke',
    weekRange: [9, 11],
    repRange: [3, 5],
    description: 'Nevromuskulær tilpasning og personlige rekorder med 3–5 tunge sett á 3–5 reps (RPE 8.5–9) og 3 minutters hvile.',
  },
  {
    phaseName: 'Fase 4: Deload & Superkompensasjon',
    weekRange: [12, 12],
    repRange: [5, 6],
    description: 'Aktiv restitusjon og overskudd med 50 % redusert volum før ny treningssyklus.',
  },
];

/**
 * 2 dager i uken: Tidseffektiv helkroppsmodell (Iversen et al. 2021)
 */
export const STERKERE_12_UKER_2_DAGER: StrengthProgramTemplate = {
  id: 'sterkere-12-uker-2-dager',
  title: 'Sterkere på 12 uker (2 dager/uke)',
  durationWeeks: 12,
  daysPerWeek: 2,
  description:
    'Tidseffektivt helkroppsprogram for deg i tidsklemma. 2 ukentlige helkroppsøkter (Helkropp A & B) med fokus på essensielle flerleddsøvelser basert på Iversen et al. (2021).',
  phases: STERKERE_12_UKER_PHASES,
  basis: STRENGTH_EVIDENCE_BASIS,
};

/**
 * 3 dager i uken: Flaggskip-modellen for optimal muskelvekst og restitusjon (Schoenfeld 2016)
 */
export const STERKERE_12_UKER_3_DAGER: StrengthProgramTemplate = {
  id: 'sterkere-12-uker-3-dager',
  title: 'Sterkere på 12 uker (3 dager/uke)',
  durationWeeks: 12,
  daysPerWeek: 3,
  description:
    'Det vitenskapelig dokumenterte flaggskipprogrammet for helkroppsstyrke, muskelvekst og holdning. 3 dager/uke (Helkropp A, B, C) med optimal frekvens og restitusjon.',
  phases: STERKERE_12_UKER_PHASES,
  basis: STRENGTH_EVIDENCE_BASIS,
};

/**
 * 4 dager i uken: Overkropp / Underkropp-splitt for høyere treningsvolum
 */
export const STERKERE_12_UKER_4_DAGER: StrengthProgramTemplate = {
  id: 'sterkere-12-uker-4-dager',
  title: 'Sterkere på 12 uker (4 dager/uke)',
  durationWeeks: 12,
  daysPerWeek: 4,
  description:
    'Overkropp / Underkropp-splitt for deg som vil trene oftere med høyere volum per muskelgruppe. 4 dager/uke (Overkropp A, Underkropp A, Overkropp B, Underkropp B).',
  phases: STERKERE_12_UKER_PHASES,
  basis: STRENGTH_EVIDENCE_BASIS,
};

/**
 * Bakoverkompatibel standardreferanse for Sterkere 12 uker (3 dager/uke).
 */
export const STERKERE_12_UKER: StrengthProgramTemplate = {
  ...STERKERE_12_UKER_3_DAGER,
  id: 'sterkere-12-uker',
  title: 'Sterkere på 12 uker',
};

/**
 * Samlet liste over alle tilgjengelige styrkeprogram-maler.
 */
export const STRENGTH_PROGRAM_TEMPLATES: StrengthProgramTemplate[] = [
  STERKERE_12_UKER_2_DAGER,
  STERKERE_12_UKER_3_DAGER,
  STERKERE_12_UKER_4_DAGER,
];

import { StrengthProgramTemplate } from '../schemas/strengthSchema';

export const STERKERE_12_UKER: StrengthProgramTemplate = {
  id: 'sterkere-12-uker',
  title: 'Sterkere på 12 uker',
  durationWeeks: 12,
  daysPerWeek: 3,
  description:
    'Det vitenskapelig dokumenterte flaggskipprogrammet for helkroppsstyrke, muskelvekst og holdning. Periodisert i 4 faser med dobbel progresjonsmotor.',
  phases: [
    {
      phaseName: 'Fase 1: Grunntrening & Hypertrofi',
      weekRange: [1, 4],
      repRange: [8, 12],
      description: 'Bygg muskelvolum, bindevev og bevegelsesmønster med 3 sett á 8–12 repetisjoner og 90s hvile.',
    },
    {
      phaseName: 'Fase 2: Styrkebygging',
      weekRange: [5, 8],
      repRange: [6, 8],
      description: 'Øk mekanisk spenning og råstyrke med 4 sett á 6–8 repetisjoner og 2 minutters hvile.',
    },
    {
      phaseName: 'Fase 3: Topping & Maksimal Styrke',
      weekRange: [9, 11],
      repRange: [3, 5],
      description: 'Nevromuskulær tilpasning og personlige rekorder med 5 sett á 3–5 reps og 3 minutters hvile.',
    },
    {
      phaseName: 'Fase 4: Deload & Superkompensasjon',
      weekRange: [12, 12],
      repRange: [5, 6],
      description: 'Aktiv restitusjon og overskudd med redusert volum før ny treningssyklus.',
    },
  ],
  basis: [
    {
      ref: 'Schoenfeld, B. J., et al. (2016). Effects of Resistance Training Frequency on Measures of Muscle Hypertrophy.',
      note: 'Frekvens på 2–3 ganger i uken per muskelgruppe gir optimal muskelvekst og styrkefremgang sammenlignet med 1 gang.',
    },
    {
      ref: 'Helms, E. R., et al. (2018). Application of the Repetitions in Reserve-Based Rating of Perceived Exertion Scale.',
      note: 'Bruk av RPE/RIR for autoregulert belastningsstyring forebygger overtrening og sikrer jevn progresjon.',
    },
    {
      ref: 'Morton, R. W., et al. (2018). Systematic review and meta-analysis of protein and resistance training.',
      note: 'Progressiv overbelastning (dobbel progresjon) er den viktigste driveren for langsiktig styrkeøkning.',
    },
  ],
};

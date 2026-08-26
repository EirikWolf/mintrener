import { ExerciseItem } from '../../schemas/exerciseSchema';

export const CARDIO_EXERCISES: ExerciseItem[] = [
  {
    id: 'sprellmenn',
    navn: { nb: 'Sprellmenn (Jumping Jacks)', en: 'Jumping Jacks' },
    type: 'tid',
    kategori: 'kondisjon',
    muskler: { primær: ['kondisjon', 'legger'], sekundær: ['skuldre', 'lår'] },
    utstyr: ['ingen'],
    nivå: 'nybegynner',
    instruks: {
      nb: [
        'Start med beina samlet og armene ned langs sidene.',
        'Hopp ut med beina i bred stilling samtidig som armene klapper over hodet.',
        'Hopp tilbake til samlet startposisjon i en jevn, spretten rytme.',
      ],
    },
    vanligeFeil: {
      nb: ['Lander tungt på hælene (land mykt på tåballene)', 'Ufullstendig armbevegelse'],
    },
    sensorProfil: 'hopp',
    bildeVinkel: 'front',
    bildeStatus: 'mangler',
  },
  {
    id: 'hoye-kneloft',
    navn: { nb: 'Høye kneløft på stedet', en: 'High Knees' },
    type: 'tid',
    kategori: 'kondisjon',
    muskler: { primær: ['kondisjon', 'hofteleddsbøyere'], sekundær: ['legger', 'kjerne'] },
    utstyr: ['ingen'],
    nivå: 'nybegynner',
    instruks: {
      nb: [
        'Løp på stedet og trekk knærne opp mot hoftehøyde vekselvis.',
        'Bruk armene aktivt for fremdrift og rytme.',
        'Hold overkroppen lett fremoverlent og kjernen stram.',
      ],
    },
    vanligeFeil: {
      nb: ['Lener overkroppen bakover', 'Løfter ikke knærne høyt nok'],
    },
    sensorProfil: 'kadens',
    bildeVinkel: 'side',
    bildeStatus: 'mangler',
  },
  {
    id: 'skoytehopp',
    navn: { nb: 'Skøytehopp (Skater Hops)', en: 'Skater Hops' },
    type: 'tid',
    kategori: 'kondisjon',
    muskler: { primær: ['sete', 'side lår'], sekundær: ['balanse', 'kondisjon'] },
    utstyr: ['ingen'],
    nivå: 'middels',
    instruks: {
      nb: [
        'Hopp sideveis fra høyre fot til venstre fot med en dyp landing.',
        'Før det ledige beinet diagonalt bak det andre som en skøyteløper.',
        'Bruk armene aktivt for balanse og spenst.',
      ],
    },
    vanligeFeil: {
      nb: ['Ustabil landing på kneet', 'For korte hopp'],
    },
    sensorProfil: 'hopp',
    bildeVinkel: 'front',
    bildeStatus: 'mangler',
  },
];

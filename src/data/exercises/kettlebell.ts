import { ExerciseItem } from '../../schemas/exerciseSchema';

export const KETTLEBELL_EXERCISES: ExerciseItem[] = [
  {
    id: 'kettlebell-swing',
    navn: { nb: 'Kettlebell-swing', en: 'Kettlebell Swing' },
    type: 'reps',
    kategori: 'kettlebell',
    muskler: { primær: ['sete', 'bakside lår'], sekundær: ['korsrygg', 'skuldre', 'kjerne'] },
    utstyr: ['kettlebell'],
    nivå: 'middels',
    instruks: {
      nb: [
        'Stå med føttene litt bredere enn skulderbredde, plasser kulen 30 cm foran deg.',
        'Hengsel i hoften med rett rygg og grip kulen med begge hender.',
        'Dra kulen bakover mellom beina (som en fotballsenter) og skyt hoften eksplosivt frem.',
        'La kulen sveve til brysthøyde før den faller naturlig tilbake.',
      ],
    },
    vanligeFeil: {
      nb: ['Knebøyer i stedet for å hengsle i hoften', 'Løfter med armene i stedet for hoftedrivet', 'Overstrekker korsryggen i toppen'],
    },
    sensorProfil: 'swing',
    bildeVinkel: 'side',
    bildeStatus: 'mangler',
  },
  {
    id: 'goblet-squat',
    navn: { nb: 'Goblet Squat med kettlebell', en: 'Kettlebell Goblet Squat' },
    type: 'reps',
    kategori: 'kettlebell',
    muskler: { primær: ['forside lår', 'sete'], sekundær: ['kjerne', 'øvre rygg'] },
    utstyr: ['kettlebell'],
    nivå: 'nybegynner',
    instruks: {
      nb: [
        'Hold kettlebellen inntil brystet med begge hender i håndtaket (hornene).',
        'Stå i skulderbredde og bøy i knær og hofte ned mot en dyp knebøy.',
        'Hold brystet hevet og la albuene gå på innsiden av knærne.',
        'Press opp igjen til oppreist stilling.',
      ],
    },
    vanligeFeil: {
      nb: ['Kulen holdes for langt unna kroppen', 'Krummer brystryggen forover'],
    },
    sensorProfil: 'knebøy',
    bildeVinkel: 'side',
    bildeStatus: 'mangler',
  },
  {
    id: 'kettlebell-press',
    navn: { nb: 'Kettlebell skulderpress', en: 'Kettlebell Overhead Press' },
    type: 'reps',
    kategori: 'kettlebell',
    muskler: { primær: ['skuldre', 'triceps'], sekundær: ['kjerne', 'øvre rygg'] },
    utstyr: ['kettlebell'],
    nivå: 'middels',
    instruks: {
      nb: [
        'Hold kulen i rack-posisjon mot brystet med tommelen pekende innover.',
        'Stram kjernen og setet for å unngå svai i korsryggen.',
        'Press kulen rett opp over hodet i en bue til armen er helt strak.',
        'Senk kulen kontrollert tilbake til rack-posisjon.',
      ],
    },
    vanligeFeil: {
      nb: ['Lener overkroppen bakover under presset', 'Albuen sklir ut til siden'],
    },
    sensorProfil: 'ingen',
    bildeVinkel: 'front',
    bildeStatus: 'mangler',
  },
  {
    id: 'kettlebell-halo',
    navn: { nb: 'Kettlebell Halo (Skuldermobilitet)', en: 'Kettlebell Halo' },
    type: 'reps',
    kategori: 'kettlebell',
    muskler: { primær: ['skuldre', 'nakke'], sekundær: ['kjerne', 'mobilitet'] },
    utstyr: ['kettlebell'],
    nivå: 'nybegynner',
    instruks: {
      nb: [
        'Hold kulen opp-ned med bunnen opp foran brystet.',
        'Før kulen i en sirkel rundt hodet så tett inntil nakken og hodet som mulig.',
        'Hold overkroppen og hodet helt i ro mens armene gjør sirkelbevegelsen.',
        'Bytt retning etter ønsket antall repetisjoner.',
      ],
    },
    vanligeFeil: {
      nb: ['Beveger hodet i stedet for kulen', 'Svai i korsryggen'],
    },
    sensorProfil: 'ingen',
    bildeVinkel: 'front',
    bildeStatus: 'mangler',
  },
  {
    id: 'kettlebell-row',
    navn: { nb: 'Ettarms roing med kettlebell', en: 'Single Arm Kettlebell Row' },
    type: 'reps',
    kategori: 'kettlebell',
    muskler: { primær: ['den brede ryggmuskel', 'øvre rygg'], sekundær: ['biceps', 'bakside skulder'] },
    utstyr: ['kettlebell'],
    nivå: 'nybegynner',
    instruks: {
      nb: [
        'Stå i splittstilling eller støtt den ene hånden på et kne/benk.',
        'Hold ryggen strak og nesten parallell med underlaget.',
        'Trekk kulen opp mot hoften med albuen tett inntil kroppen.',
        'Senk kulen kontrollert helt ned til full strekk.',
      ],
    },
    vanligeFeil: {
      nb: ['Roterer overkroppen for å hjelpe kulen opp', 'Trekker med skulderen opp mot øret'],
    },
    sensorProfil: 'ingen',
    bildeVinkel: 'side',
    bildeStatus: 'mangler',
  },
];

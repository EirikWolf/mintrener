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
    bildePrompt: {
      '0': 'captured in side profile in a deep athletic hip-hinge position, bending at the hips with flat spine and proud chest, knees soft, both hands gripping a heavy black iron kettlebell positioned high between the thighs, focused forward gaze',
      '1': 'captured in side profile at the explosive top of a kettlebell swing, standing tall in full hip extension with squeezed glutes and braced core, black cast iron kettlebell weightlessly floating horizontally at chest height held with both straight arms extended',
    },
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
    bildePrompt: {
      '0': 'standing tall in profile, holding a heavy black kettlebell tightly against the chest by its side horns with both hands, elbows tucked tight, feet shoulder-width apart',
      '1': 'captured in side profile in a deep goblet squat, thighs parallel to the floor, chest high and upright holding kettlebell against sternum, elbows positioned inside the knees, heels flat, intense quad engagement',
    },
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
    bildePrompt: {
      '0': 'standing tall in front view, holding a black kettlebell tucked in a tight front rack position against the right shoulder, elbow tight to ribs, left fist clenched at side, tight core',
      '1': 'captured in front view at full vertical lockout of an overhead kettlebell press, right arm locked straight above the shoulder holding the kettlebell, head aligned, glutes braced, powerful shoulder exertion',
    },
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
    bildePrompt: {
      '0': 'standing tall in front view holding a black kettlebell upside down by the horns in front of the chest, braced core',
      '1': 'captured in front-diagonal angle rotating the upside-down kettlebell closely around the back of the neck and head, elbows bent tight, head upright and still, shoulder mobility action',
    },
    bildeVinkel: 'front',
    bildeStatus: 'mangler',
  },
  {
    id: 'kettlebell-row',
    navn: { nb: 'Ettarms roing med kettlebell', en: 'Single Arm Kettlebell Row' },
    type: 'reps',
    kategori: 'kettlebell',
    muskler: { primær: ['øvre rygg', 'brede ryggmuskel'], sekundær: ['biceps', 'kjerne'] },
    utstyr: ['kettlebell'],
    nivå: 'nybegynner',
    instruks: {
      nb: [
        'Stå i et utfall/splittstilling med flat rygg lent 45 grader forover.',
        'Støtt motsatt arm på fremre lår.',
        'Trekk kettlebellen opp mot hoften med albuen tett inntil kroppen.',
        'Senk kontrollert ned igjen.',
      ],
    },
    vanligeFeil: {
      nb: ['Krummer ryggen', 'Roterer overkroppen ukontrollert under draget'],
    },
    sensorProfil: 'ingen',
    bildePrompt: {
      '0': 'captured in side profile in a stable split-stance bent-over row position, flat back hinged at 45 degrees, left hand resting on forward knee, right arm hanging straight down gripping a black kettlebell',
      '1': 'captured in side profile pulling the black kettlebell up towards the right hip, elbow driven high past the ribs, scapula retracted, intense lat muscle contraction',
    },
    bildeVinkel: 'side',
    bildeStatus: 'mangler',
  },
];

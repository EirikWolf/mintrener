import { ExerciseInput } from '../../schemas/exerciseSchema';

export const DUMBBELL_EXERCISES: ExerciseInput[] = [
  {
    id: 'manualpress-bryst',
    navn: { nb: 'Brystpress med manualer', en: 'Dumbbell Chest Press' },
    type: 'reps',
    kategori: 'frivekt',
    muskler: { primær: ['bryst'], sekundær: ['triceps', 'fremre skuldre'] },
    utstyr: ['manualer', 'matte'],
    nivå: 'nybegynner',
    instruks: {
      nb: [
        'Ligg på ryggen på gulvet eller benk med en manual i hver hånd.',
        'Hold manualene i brysthøyde med albuene i 45-75 graders vinkel fra kroppen.',
        'Press vektene opp i en rett linje til armene er strake.',
        'Senk vektene rolig og kontrollert tilbake.',
      ],
    },
    vanligeFeil: {
      nb: ['Kolliderer manualene hardt i toppen', 'Lar albuene falle for langt ut til sidene'],
    },
    sensorProfil: 'ingen',
    bildePrompt: {
      '0': 'captured in front-diagonal view lying supine on a flat gym bench holding heavy black dumbbells at chest level, elbows flared at 45 degrees, feet flat on floor, ready to press',
      '1': 'captured in front-diagonal view at the top lockout of a dumbbell bench press, arms extended straight up over chest holding black dumbbells parallel, chest squeezed and flexed',
    },
    bildeVinkel: 'front',
    bildeStatus: 'mangler',
  },
  {
    id: 'skulderpress-manualer',
    navn: { nb: 'Skulderpress med manualer', en: 'Dumbbell Shoulder Press' },
    type: 'reps',
    kategori: 'frivekt',
    muskler: { primær: ['skuldre'], sekundær: ['triceps', 'øvre bryst'] },
    utstyr: ['manualer'],
    nivå: 'nybegynner',
    instruks: {
      nb: [
        'Stå med føttene i hoftebredde og manualene i skulderhøyde.',
        'Hold kjernen spent og press manualene opp over hodet.',
        'Lås ut armene kontrollert i toppen over midten av hodet.',
        'Senk rolig tilbake til ørehøyde.',
      ],
    },
    vanligeFeil: {
      nb: ['Svaier i korsryggen for å dytte vekten opp', 'Presser for langt foran hodet'],
    },
    sensorProfil: 'ingen',
    bildePrompt: {
      '0': 'standing tall in front view holding a pair of black dumbbells at shoulder height, palms facing forward, forearms vertical, braced core and proud chest',
      '1': 'captured in front view at full vertical lockout of an overhead dumbbell press, both arms locked straight overhead holding black dumbbells, intense deltoid muscle definition, focused expression',
    },
    bildeVinkel: 'front',
    bildeStatus: 'mangler',
  },
  {
    id: 'rumensk-markloft-manualer',
    navn: { nb: 'Rumensk markløft med manualer', en: 'Romanian Deadlift' },
    type: 'reps',
    kategori: 'frivekt',
    muskler: { primær: ['bakside lår', 'sete'], sekundær: ['korsrygg', 'grepsstyrke'] },
    utstyr: ['manualer'],
    nivå: 'middels',
    instruks: {
      nb: [
        'Stå oppreist med en manual i hver hånd foran lårene.',
        'Skyv hoften og rumpa bakover mens du holder en liten knekk i knærne.',
        'La manualene gli tett inntil beina ned til rett under knærne.',
        'Stram setet og før hoften eksplosivt frem igjen til stående.',
      ],
    },
    vanligeFeil: {
      nb: ['Krummer korsryggen', 'Bøyer knærne for mye slik at det blir en knebøy'],
    },
    sensorProfil: 'ingen',
    bildePrompt: {
      '0': 'standing tall in side profile holding a pair of heavy black dumbbells in front of thighs, shoulders pinned back, straight spine',
      '1': 'captured in side profile in a deep Romanian deadlift hip-hinge, hips pushed far back with flat neutral spine at 45 degrees, slight bend in knees, dumbbells hanging just below knee level close to shins, intense hamstring stretch',
    },
    bildeVinkel: 'side',
    bildeStatus: 'mangler',
  },
];

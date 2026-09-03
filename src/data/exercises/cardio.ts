import { ExerciseInput } from '../../schemas/exerciseSchema';

export const CARDIO_EXERCISES: ExerciseInput[] = [
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
    bildePrompt: {
      '0': 'standing tall in front view with feet together, arms resting relaxed by sides, athletic posture, poised to jump',
      '1': 'captured in front view mid-air in an explosive star-like jumping jack, legs spread wide in an athletic V-shape landing on balls of feet, both straight arms raised overhead in a wide V, energetic athletic exertion',
    },
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
    bildePrompt: {
      '0': 'captured in side profile standing on left foot, right knee driven high up to 90 degrees hip level, left arm pumping forward at 90 degrees, athletic sprinting stance',
      '1': 'captured in side profile mid-switch in high knees, explosive upward propulsion, left knee driven violently to chest height, right arm pumping forward, focused sprinting exertion, hair flying in ponytail',
    },
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
    bildePrompt: {
      '0': 'captured in front-diagonal angle in a deep athletic speed skater crouch on right leg, right knee bent deep, left leg swept back diagonally behind, left arm reaching across knee, focused intense gaze',
      '1': 'captured in front-diagonal angle leaping laterally through the air across the gym mat, arms driving for momentum, dynamic airborne athletic leap',
    },
    bildeVinkel: 'front',
    bildeStatus: 'mangler',
  },
  {
    id: 'seated-marsj',
    navn: { nb: 'Sittende marsj på stol', en: 'Seated Marching' },
    type: 'tid',
    kategori: 'kondisjon',
    muskler: { primær: ['hofteleddsbøyere', 'kondisjon'], sekundær: ['kjerne'] },
    utstyr: ['stol/benk'],
    nivå: 'nybegynner',
    instruks: {
      nb: [
        'Sitt oppreist på stolen med føttene i gulvet og stram magen lett.',
        'Løft knærne vekselvis opp i en jevn marsjrytme mens armene pendler naturlig.',
      ],
    },
    sensorProfil: 'ingen',
    bildePrompt: {
      '0': 'sitting firmly upright on a four-legged chair with back straight, feet flat on the floor, arms bent at 90 degrees by hips preparing to march',
      '1': 'seated firmly upright on a four-legged chair actively marching, lifting her right knee high up in the air towards chest at a 90 degree angle while the left foot stays flat on the floor, arms pumping in running motion',
    },
    bildeVinkel: 'skrå',
    bildeStatus: 'mangler',
  },
  {
    id: 'jogging-sted',
    navn: { nb: 'Lett jogg med armsirkler', en: 'Light Jog in Place' },
    type: 'tid',
    kategori: 'kondisjon',
    muskler: { primær: ['kondisjon', 'legger'], sekundær: ['skuldre'] },
    utstyr: ['ingen'],
    nivå: 'nybegynner',
    instruks: {
      nb: [
        'Jogg lett og spenstig på stedet med myke landinger på tåballene.',
        'Gjør store, rolige armsirkler forover og bakover for å varme opp skuldrene.',
      ],
    },
    sensorProfil: 'kadens',
    bildePrompt: {
      '0': 'full body captured in front view jogging lightly on the spot, springy step on balls of feet, arms bent at sides',
      '1': 'full body captured in front view jogging actively in place while circling straight arms in wide dynamic arcs, bouncy athletic cardio movement',
    },
    bildeVinkel: 'front',
    bildeStatus: 'mangler',
  },
  {
    id: 'lett-gange',
    navn: { nb: 'Rolig gange & restitusjonspust', en: 'Cooldown Walking' },
    type: 'tid',
    kategori: 'kondisjon',
    muskler: { primær: ['kondisjon', 'restitusjon'], sekundær: ['legger'] },
    utstyr: ['ingen'],
    nivå: 'nybegynner',
    instruks: {
      nb: [
        'Gå i et rolig og uanstrengt tempo på stedet eller rundt i rommet.',
        'Pust dypt inn med magen og slipp skuldrene ned for å senke hjerterytmen.',
      ],
    },
    sensorProfil: 'ingen',
    bildePrompt: {
      '0': 'full body captured in side profile walking calmly and naturally on gym floor, shoulders dropped and relaxed, peaceful breathing rhythm',
      '1': 'full body captured in side profile taking a gentle mindful stride with arms relaxed, deep restorative inhale expanding the chest, serene calm posture',
    },
    bildeVinkel: 'side',
    bildeStatus: 'mangler',
  },
];

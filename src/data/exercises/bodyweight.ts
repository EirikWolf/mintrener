import { ExerciseItem } from '../../schemas/exerciseSchema';

export const BODYWEIGHT_EXERCISES: ExerciseItem[] = [
  {
    id: 'kneboy',
    navn: { nb: 'Knebøy', en: 'Bodyweight Squat' },
    type: 'reps',
    kategori: 'kroppsvekt',
    muskler: { primær: ['forside lår', 'sete'], sekundær: ['kjerne', 'legger'] },
    utstyr: ['ingen'],
    nivå: 'nybegynner',
    instruks: {
      nb: [
        'Stå med føttene i skulderbredde, tærne pekende lett utover.',
        'Bøy i knær og hofte som om du setter deg på en stol.',
        'Gå ned til lårene er parallelle med gulvet, hold brystet stolt.',
        'Press gjennom hele foten for å reise deg opp igjen.',
      ],
      en: [
        'Stand with feet shoulder-width apart, toes pointed slightly out.',
        'Bend knees and hips as if sitting into a chair.',
        'Lower until thighs are parallel to the floor, keep chest up.',
        'Drive through feet to return to starting position.',
      ],
    },
    vanligeFeil: {
      nb: ['Knær faller innover (valgus)', 'Hælene løfter seg fra bakken', 'Krummer korsryggen'],
    },
    sensorProfil: 'knebøy',
    bildePrompt: {
      '0': 'standing tall in profile, feet shoulder-width apart firmly planted flat on floor, knees soft, core engaged, chest lifted high, both hands clasped firmly in front of chest in an athletic guard, looking straight ahead with determined focus',
      '1': 'captured in side profile at the bottom of a deep biomechanically perfect squat, thighs strictly parallel to the floor, hips pushed back, chest proud and spine neutral at a 45-degree forward lean, knees tracking over toes without caving in, feet flat on the floor, hands clasped tightly at chest, intense muscular tension in quadriceps and glutes',
    },
    bildeVinkel: 'side',
    bildeStatus: 'mangler',
  },
  {
    id: 'push-ups',
    navn: { nb: 'Armhevinger (Push-ups)', en: 'Push-ups' },
    type: 'reps',
    kategori: 'kroppsvekt',
    muskler: { primær: ['bryst', 'triceps'], sekundær: ['skuldre', 'kjerne'] },
    utstyr: ['ingen'],
    nivå: 'nybegynner',
    instruks: {
      nb: [
        'Start i høy plankeposisjon med hendene litt bredere enn skuldrene.',
        'Stram kjernen og setet slik at kroppen danner en rett linje.',
        'Senk brystet kontrollert ned mot gulvet (albuene i 45 graders vinkel).',
        'Press eksplosivt opp igjen til strake armer.',
      ],
    },
    vanligeFeil: {
      nb: ['Hofte henger ned (svai rygg)', 'Albuene peker 90 grader rett ut til siden'],
    },
    sensorProfil: 'ingen',
    bildePrompt: {
      '0': 'captured in side profile in a rigid high plank position on gym floor, palms flat under shoulders, straight arms, body in a strict straight diagonal line from head to heels, glutes and abs tensed, heels lifted, gazing slightly ahead at the floor',
      '1': 'captured in side profile hovering two inches above the gym floor at the bottom of a push-up, elbows bent back at 45 degrees, chest nearly touching the mat, perfectly straight rigid torso and legs, toes flexed on floor, intense exertion in chest and triceps',
    },
    bildeVinkel: 'side',
    bildeStatus: 'mangler',
  },
  {
    id: 'utfall-forover',
    navn: { nb: 'Utfall forover', en: 'Forward Lunges' },
    type: 'reps',
    kategori: 'kroppsvekt',
    muskler: { primær: ['forside lår', 'sete'], sekundær: ['bakside lår', 'balanse'] },
    utstyr: ['ingen'],
    nivå: 'nybegynner',
    instruks: {
      nb: [
        'Ta et stort skritt fremover med det ene beinet.',
        'Senk hoften til begge knær danner omtrent 90 graders vinkel.',
        'Bakre kne skal nesten berøre gulvet.',
        'Press fra med fremre fot for å gå tilbake til startposisjon.',
      ],
    },
    vanligeFeil: {
      nb: ['Fremre kne skyves for langt over tærne', 'Overkroppen lener seg forover'],
    },
    sensorProfil: 'ingen',
    bildePrompt: {
      '0': 'standing tall in side profile with feet hip-width apart, hands placed on hips, engaged core and proud chest, athletic ready stance',
      '1': 'captured in side profile in a deep forward lunge, front right knee bent at a strict 90-degree angle with shin vertical, back left knee hovering one inch above the gym mat with heel lifted, upright vertical torso, hands on hips, active tension in quads and glutes',
    },
    bildeVinkel: 'side',
    bildeStatus: 'mangler',
  },
  {
    id: 'planke',
    navn: { nb: 'Planke', en: 'Plank' },
    type: 'tid',
    kategori: 'kroppsvekt',
    muskler: { primær: ['kjerne', 'magemuskler'], sekundær: ['skuldre', 'sete'] },
    utstyr: ['ingen', 'matte'],
    nivå: 'nybegynner',
    instruks: {
      nb: [
        'Støtt deg på underarmene og tærne med albuene rett under skuldrene.',
        'Stram magen og setet, hold nakken nøytral.',
        'Hold en rett linje fra hode til hæler uten å svaie eller heve hoften.',
      ],
    },
    vanligeFeil: {
      nb: ['Hofte henger ned', 'Skyver baken for høyt opp', 'Holder pusten'],
    },
    sensorProfil: 'ingen',
    bildePrompt: {
      '0': 'captured in side profile in a low forearm plank on a gym mat, forearms parallel on floor with elbows directly under shoulders, body forming a perfect straight rigid plank from head to heels, neutral spine, tight abs and glutes, focused downward gaze',
      '1': 'captured in side profile holding a maximum-effort forearm plank, body trembling with exertion, perfectly straight line maintained from shoulders to ankles, tight core and engaged shoulders, sweat sheen on arms',
    },
    bildeVinkel: 'side',
    bildeStatus: 'mangler',
  },
  {
    id: 'mountain-climbers',
    navn: { nb: 'Mountain Climbers', en: 'Mountain Climbers' },
    type: 'reps',
    kategori: 'kroppsvekt',
    muskler: { primær: ['kjerne', 'hoftebøyere'], sekundær: ['skuldre', 'kondisjon'] },
    utstyr: ['ingen'],
    nivå: 'middels',
    instruks: {
      nb: [
        'Start i en høy plankeposisjon med strake armer.',
        'Driv det ene kneet eksplosivt opp mot brystet.',
        'Bytt bein i en rask, løpende bevegelse mens overkroppen holdes stabil.',
      ],
    },
    vanligeFeil: {
      nb: ['Hofte spretter for høyt opp og ned', 'Skuldrene glir bakover vekk fra hendene'],
    },
    sensorProfil: 'ingen',
    bildePrompt: {
      '0': 'captured in side profile in a high push-up plank, straight arms, right knee driven forward dynamically tight towards the chest beneath the hips, left leg extended straight back on ball of foot, active explosive running posture',
      '1': 'captured in side profile switching legs mid-air in mountain climbers, left knee driven up explosively towards chest, right leg extended back, flat back and rigid shoulders, dynamic athletic movement',
    },
    bildeVinkel: 'side',
    bildeStatus: 'mangler',
  },
  {
    id: 'burpees',
    navn: { nb: 'Burpees', en: 'Burpees' },
    type: 'reps',
    kategori: 'kroppsvekt',
    muskler: { primær: ['helkropp', 'kondisjon'], sekundær: ['bryst', 'lår', 'kjerne'] },
    utstyr: ['ingen'],
    nivå: 'avansert',
    instruks: {
      nb: [
        'Fra stående posisjon, bøy deg ned og sett hendene i gulvet.',
        'Hopp bakover med beina til en plankeposisjon og senk brystet helt ned i gulvet.',
        'Press deg opp, hopp beina frem mot hendene, og eksploder opp i et spenstig hopp med hendene over hodet.',
      ],
    },
    vanligeFeil: {
      nb: ['Svaier i korsryggen ved oppstøtet', 'Glemmer å hoppe opp på toppen'],
    },
    sensorProfil: 'ingen',
    bildePrompt: {
      '0': 'captured in side profile at the bottom of a burpee with chest and thighs resting flat on the gym mat, palms placed under shoulders ready to push up, toes tucked',
      '1': 'captured in side profile in an explosive high vertical leap at the top of a burpee, arms extended straight overhead towards ceiling, toes pointed down leaving the floor, dynamic airborne athletic jump',
    },
    bildeVinkel: 'side',
    bildeStatus: 'mangler',
  },
  {
    id: 'sideplanke',
    navn: { nb: 'Sideplanke', en: 'Side Plank' },
    type: 'tid',
    kategori: 'kroppsvekt',
    muskler: { primær: ['skrå magemuskler', 'kjerne'], sekundær: ['skuldre', 'sete'] },
    utstyr: ['matte', 'ingen'],
    nivå: 'middels',
    instruks: {
      nb: [
        'Ligg på siden og støtt deg på den ene underarmen med albuen under skulderen.',
        'Løft hoften fra gulvet slik at kroppen danner en rett linje fra skuldre til ankler.',
        'Hold posisjonen stabil uten at hoften faller ned eller roterer.',
      ],
    },
    vanligeFeil: {
      nb: ['Hoften synker ned mot gulvet', 'Overkroppen roterer forover'],
    },
    sensorProfil: 'ingen',
    bildePrompt: {
      '0': 'captured in front-diagonal profile in a side elbow plank, propped up on right forearm with elbow under shoulder, hips lifted high creating a straight diagonal line from head to feet, left arm extended straight up towards ceiling, stacked feet',
      '1': 'captured in side plank with left leg lifted upwards in a star plank variation, maintaining a high stable hip, intense oblique contraction, focused expression',
    },
    bildeVinkel: 'front',
    bildeStatus: 'mangler',
  },
  {
    id: 'rygghev-superman',
    navn: { nb: 'Rygghev (Superman)', en: 'Superman Back Extension' },
    type: 'reps',
    kategori: 'kroppsvekt',
    muskler: { primær: ['korsrygg', 'sete'], sekundær: ['øvre rygg', 'skuldre'] },
    utstyr: ['matte', 'ingen'],
    nivå: 'nybegynner',
    instruks: {
      nb: [
        'Ligg på magen med armene strakt foran deg og strake bein.',
        'Løft armer, bryst og lår samtidig opp fra gulvet ved å stramme rygg og sete.',
        'Hold topposisjonen i 1-2 sekunder før du senker rolig ned.',
      ],
    },
    vanligeFeil: {
      nb: ['Knekker i nakken ved å se for høyt opp', 'Bruker rykk i stedet for kontrollert løft'],
    },
    sensorProfil: 'ingen',
    bildePrompt: {
      '0': 'captured in side profile lying prone face down on gym mat with arms extended straight forward overhead and legs straight back flat on floor',
      '1': 'captured in side profile at the peak of a superman back extension, chest, shoulders, arms and thighs lifted high off the floor creating a concave arch, glutes and spinal erectors fully contracted, head in neutral alignment',
    },
    bildeVinkel: 'side',
    bildeStatus: 'mangler',
  },
  {
    id: 'dips-pa-stol',
    navn: { nb: 'Dips på stol / benk', en: 'Chair Dips' },
    type: 'reps',
    kategori: 'kroppsvekt',
    muskler: { primær: ['triceps'], sekundær: ['bryst', 'fremre skuldre'] },
    utstyr: ['stol/benk'],
    nivå: 'nybegynner',
    instruks: {
      nb: [
        'Plasser hendene på kanten av en stabil stol eller benk, med fingrene pekende forover.',
        'Flytt beina frem og senk kroppen ved å bøye i albuene til de danner ca. 90 grader.',
        'Hold ryggen nær stolen og press opp igjen til strake armer.',
      ],
    },
    vanligeFeil: {
      nb: ['Går for langt bort fra stolen slik at skuldrene overbelastes', 'Går for dypt ned'],
    },
    sensorProfil: 'ingen',
    bildePrompt: {
      '0': 'captured in side profile with hands gripping the edge of a sturdy gym bench behind hips, arms straight, torso upright, legs extended forward on heels',
      '1': 'captured in side profile at the bottom of a bench dip, elbows bent back at 90 degrees, hips hovering close in front of the bench, chest lifted, intense triceps contraction',
    },
    bildeVinkel: 'side',
    bildeStatus: 'mangler',
  },
  {
    id: 'hulekroppshold',
    navn: { nb: 'Hulekroppshold (Hollow Body Hold)', en: 'Hollow Body Hold' },
    type: 'tid',
    kategori: 'kroppsvekt',
    muskler: { primær: ['dype magemuskler', 'kjerne'], sekundær: ['hoftebøyere'] },
    utstyr: ['matte', 'ingen'],
    nivå: 'middels',
    instruks: {
      nb: [
        'Ligg på ryggen og press korsryggen flatt ned i gulvet (ingen glippe under ryggen).',
        'Løft skuldre og strake armer bakover, og løft strake bein noen centimeter fra gulvet.',
        'Hold denne "båt"-posisjonen med maksimal spenning i magen.',
      ],
    },
    vanligeFeil: {
      nb: ['Korsryggen slipper gulvet (svai rygg)', 'Holder pusten'],
    },
    sensorProfil: 'ingen',
    bildePrompt: {
      '0': 'captured in side profile lying supine on gym mat, preparing for hollow hold with arms at sides',
      '1': 'captured in side profile in a strict hollow body hold banana shape, lower back pressed firmly into the mat, shoulders and straight arms lifted off floor reaching overhead, straight legs hovering 6 inches above the ground, tight trembling abdominal wall',
    },
    bildeVinkel: 'side',
    bildeStatus: 'mangler',
  },
];

import { ExerciseItem } from '../../schemas/exerciseSchema';

export const MOBILITY_EXERCISES: ExerciseItem[] = [
  {
    id: 'katte-ku',
    navn: { nb: 'Katte-ku (Ryggmobilitet)', en: 'Cat-Cow Stretch' },
    type: 'tid',
    kategori: 'mobilitet',
    muskler: { primær: ['ryggsøyle', 'korsrygg'], sekundær: ['nakke', 'kjerne'] },
    utstyr: ['matte', 'ingen'],
    nivå: 'nybegynner',
    instruks: {
      nb: [
        'Start på alle fire med hendene under skuldrene og knærne under hoftene.',
        'Pust inn, svai ryggen forsiktig og løft blikket mot taket (Ku).',
        'Pust ut, krum ryggen maksimalt som en sint katt og trekk haken mot brystet (Katt).',
        'Beveg deg rolig i takt med pusten.',
      ],
    },
    vanligeFeil: {
      nb: ['Presser for hardt inn i ytterstilling', 'Beveger seg for fort uten pust'],
    },
    sensorProfil: 'ingen',
    bildePrompt: {
      '0': 'captured in side profile on all fours on a gym mat in cow pose, hands under shoulders, knees under hips, belly dipping softly towards the mat with an arched lower back, chest open, head tilted upward looking towards ceiling with relaxed focus',
      '1': 'captured in side profile on all fours on a gym mat in full cat pose, spine forcefully rounded upwards like a dome, pressing palms into floor, tailbone tucked under, chin tucked deeply to chest, intense back stretch',
    },
    bildeVinkel: 'side',
    bildeStatus: 'mangler',
  },
  {
    id: 'verdens-beste-toyeovelse',
    navn: { nb: "Verdens beste tøyeøvelse (World's Greatest Stretch)", en: "World's Greatest Stretch" },
    type: 'reps',
    kategori: 'mobilitet',
    muskler: { primær: ['hofteleddsbøyere', 'brystrygg'], sekundær: ['bakside lår', 'skuldre'] },
    utstyr: ['matte', 'ingen'],
    nivå: 'middels',
    instruks: {
      nb: [
        'Ta et dypt utfall fremover og sett begge hendene på innsiden av fremre fot.',
        'Før fremre sides albue ned mot gulvet ved siden av ankelen.',
        'Roter overkroppen og strekk samme arm rett opp mot taket mens du følger med blikket.',
        'Gjenta på begge sider.',
      ],
    },
    vanligeFeil: {
      nb: ['Holder pusten', 'Roterer kun nakken i stedet for brystryggen'],
    },
    sensorProfil: 'ingen',
    bildePrompt: {
      '0': 'captured in full body side profile in an active deep runner lunge on a gym mat, right knee bent 90 degrees forward with foot flat, left leg extended straight back with heel high, both palms planted flat on the floor inside the front foot, driving right elbow down towards right ankle, looking at the mat',
      '1': 'captured in full body side profile in a deep runner lunge, right arm pointing straight up to the ceiling in a full thoracic spine rotation, chest opened wide to the side, gazing upward along the raised fingertips, powerful athletic mobility stretch',
    },
    bildeVinkel: 'side',
    bildeStatus: 'mangler',
  },
  {
    id: 'hofteapner-90-90',
    navn: { nb: 'Hofteåpner 90/90', en: '90/90 Hip Mobility' },
    type: 'tid',
    kategori: 'mobilitet',
    muskler: { primær: ['hofteledd', 'setemuskulatur'], sekundær: ['korsrygg'] },
    utstyr: ['matte', 'ingen'],
    nivå: 'nybegynner',
    instruks: {
      nb: [
        'Sitt på gulvet med begge beina bøyd i 90 graders vinkel (ett foran, ett til siden).',
        'Hold overkroppen stolt og len deg forsiktig over det fremre kneet.',
        'Hold posisjonen eller veksle beina over til motsatt side uten å bruke hendene.',
      ],
    },
    vanligeFeil: {
      nb: ['Krummer ryggen', 'Lener seg for langt bort fra hoften'],
    },
    sensorProfil: 'ingen',
    bildePrompt: {
      '0': 'captured in front-diagonal angle sitting upright on gym floor in a 90-90 hip mobility position, front right leg bent at 90 degrees in external rotation flat on mat, back left leg bent at 90 degrees to the side in internal rotation, tall proud spine',
      '1': 'captured in front-diagonal angle hinging forward over the front knee in a 90-90 stretch, chest lowered towards shin with flat back, hands placed lightly on mat for support, intense hip and glute stretch',
    },
    bildeVinkel: 'front',
    bildeStatus: 'mangler',
  },
  {
    id: 'skulder-dislocates',
    navn: { nb: 'Skulderrotasjon med strikk/stang', en: 'Shoulder Dislocates' },
    type: 'reps',
    kategori: 'mobilitet',
    muskler: { primær: ['skuldre', 'bryst'], sekundær: ['øvre rygg'] },
    utstyr: ['strikk', 'stang'],
    nivå: 'nybegynner',
    instruks: {
      nb: [
        'Hold en lang stang eller et elastisk bånd foran deg med et bredt overhåndsgrep.',
        'Løft armene strakt opp over hodet og før dem bak ryggen i en kontrollert sirkel.',
        'Før armene tilbake samme vei uten å bøye i albuene.',
      ],
    },
    vanligeFeil: {
      nb: ['Bøyer albuene', 'Svaier ukontrollert i korsryggen'],
    },
    sensorProfil: 'ingen',
    bildePrompt: {
      '0': 'standing tall in profile holding a mobility stick in front of thighs with wide overhand grip, shoulders back and down',
      '1': 'captured in side profile mid-movement rotating the mobility stick smoothly overhead and behind the back with straight arms, chest expanded, shoulders in full comfortable range of motion',
    },
    bildeVinkel: 'side',
    bildeStatus: 'mangler',
  },
];

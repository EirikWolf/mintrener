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
    bildeVinkel: 'skrå',
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
    bildeVinkel: 'front',
    bildeStatus: 'mangler',
  },
];

import { WorkoutTemplate } from '../types/workout';

export interface TrainingProgram {
  id: string;
  name: string;
  category: 'kontor' | 'barn' | 'intervall' | 'styrke' | 'mobilitet';
  durationMinutes: number;
  intensity: 'lav' | 'middels' | 'høy';
  description: string;
  targetProfileId?: 'kontor' | 'barn';
  workout: WorkoutTemplate;
}

export const TRAINING_PROGRAMS: TrainingProgram[] = [
  // 1. KONTOR & MICRO-PROGRAMMER
  {
    id: 'kontor-nakke-skulder',
    name: 'Nakke- & Skulderredning',
    category: 'kontor',
    durationMinutes: 2,
    intensity: 'lav',
    description: 'Lindrer spenninger fra PC-arbeid med rolige sirkler, hodebøy og bryståpnere.',
    targetProfileId: 'kontor',
    workout: {
      id: 'prog-kontor-1',
      name: 'Nakke- & Skulderredning',
      description: 'Rolig kontor-avbrekk',
      type: 'custom',
      prepareDurationSeconds: 5,
      rounds: 1,
      roundRestDurationSeconds: 0,
      items: [
        { id: 'k1', exercise: { id: 'skulderrull', name: 'Skulderrulling bakover', category: 'mobility' }, workDurationSeconds: 30, restDurationSeconds: 5 },
        { id: 'k2', exercise: { id: 'nakketoy', name: 'Forsiktig nakkestrekk', category: 'mobility' }, workDurationSeconds: 30, restDurationSeconds: 5 },
        { id: 'k3', exercise: { id: 'brystapner', name: 'Bryståpner bak rygg', category: 'mobility' }, workDurationSeconds: 30, restDurationSeconds: 0 },
      ],
    },
  },
  {
    id: 'kontor-hofte-rygg',
    name: 'Hofte- & Ryggoppretter',
    category: 'kontor',
    durationMinutes: 3,
    intensity: 'lav',
    description: 'Åpner stive hoftebøyere og strekker ryggsøylen etter langvarig sitting.',
    targetProfileId: 'kontor',
    workout: {
      id: 'prog-kontor-2',
      name: 'Hofte- & Ryggoppretter',
      description: 'Stående mobilitet ved pulten',
      type: 'custom',
      prepareDurationSeconds: 5,
      rounds: 1,
      roundRestDurationSeconds: 0,
      items: [
        { id: 'h1', exercise: { id: 'staende-hofteapner', name: 'Stående hoftebøyerstrekk', category: 'mobility' }, workDurationSeconds: 40, restDurationSeconds: 10 },
        { id: 'h2', exercise: { id: 'ryggrotasjon', name: 'Stående ryggrotasjon', category: 'mobility' }, workDurationSeconds: 40, restDurationSeconds: 10 },
        { id: 'h3', exercise: { id: 'foroverboy', name: 'Rolig foroverbøy', category: 'mobility' }, workDurationSeconds: 40, restDurationSeconds: 0 },
      ],
    },
  },
  {
    id: 'kontor-planke-90s',
    name: 'Kontor Planke-utfordring',
    category: 'kontor',
    durationMinutes: 2,
    intensity: 'middels',
    description: '90 sekunder effektiv aktivering av kjerne og holdningsmuskler.',
    targetProfileId: 'kontor',
    workout: {
      id: 'prog-kontor-3',
      name: 'Planke 90s',
      description: 'Rask kjerneaktivering',
      type: 'custom',
      prepareDurationSeconds: 10,
      rounds: 1,
      roundRestDurationSeconds: 0,
      items: [
        { id: 'pl-1', exercise: { id: 'planke', name: 'Planke', category: 'bodyweight' }, workDurationSeconds: 90, restDurationSeconds: 0 },
      ],
    },
  },

  // 2. BARN & UNGDOM
  {
    id: 'barn-dyresafari',
    name: 'Dyre-safari',
    category: 'barn',
    durationMinutes: 3,
    intensity: 'middels',
    description: 'Hopp som frosk, gå som bjørn, stå som flamingo og sprett som kenguru!',
    targetProfileId: 'barn',
    workout: {
      id: 'prog-barn-1',
      name: 'Dyre-safari',
      description: 'Lekpreget bevegelse',
      type: 'custom',
      prepareDurationSeconds: 5,
      rounds: 1,
      roundRestDurationSeconds: 0,
      items: [
        { id: 'b1', exercise: { id: 'froskehopp', name: 'Froskehopp', category: 'cardio' }, workDurationSeconds: 25, restDurationSeconds: 10 },
        { id: 'b2', exercise: { id: 'bjornegang', name: 'Bjørnegang', category: 'bodyweight' }, workDurationSeconds: 25, restDurationSeconds: 10 },
        { id: 'b3', exercise: { id: 'flamingo', name: 'Flamingo-balanse', category: 'mobility' }, workDurationSeconds: 25, restDurationSeconds: 10 },
        { id: 'b4', exercise: { id: 'kenguru', name: 'Kenguru-sprett', category: 'cardio' }, workDurationSeconds: 25, restDurationSeconds: 0 },
      ],
    },
  },
  {
    id: 'barn-superhelt',
    name: 'Superhelt-trening',
    category: 'barn',
    durationMinutes: 4,
    intensity: 'høy',
    description: 'Fly som supermann, spark som en ninja og løp i overlydsfart!',
    targetProfileId: 'barn',
    workout: {
      id: 'prog-barn-2',
      name: 'Superhelt-trening',
      description: 'Full fart for superhelter',
      type: 'custom',
      prepareDurationSeconds: 5,
      rounds: 1,
      roundRestDurationSeconds: 0,
      items: [
        { id: 's1', exercise: { id: 'superman', name: 'Superhelt-flyvning (Superman)', category: 'bodyweight' }, workDurationSeconds: 30, restDurationSeconds: 10 },
        { id: 's2', exercise: { id: 'ninja-spark', name: 'Ninja-spark', category: 'cardio' }, workDurationSeconds: 30, restDurationSeconds: 10 },
        { id: 's3', exercise: { id: 'rakett-hopp', name: 'Rakett-hopp til himmelen', category: 'cardio' }, workDurationSeconds: 30, restDurationSeconds: 10 },
        { id: 's4', exercise: { id: 'overlyds-spurt', name: 'Overlydsfart (Høye kneløft)', category: 'cardio' }, workDurationSeconds: 30, restDurationSeconds: 0 },
      ],
    },
  },

  // 3. INTERVALL & STYRKE-PROGRAMMER
  {
    id: 'klassisk-tabata',
    name: 'Klassisk Tabata',
    category: 'intervall',
    durationMinutes: 4,
    intensity: 'høy',
    description: 'Gullstandarden for høyintensiv intervalltrening: 20s maks innsats, 10s hvile.',
    workout: {
      id: 'tabata-classic',
      name: 'Klassisk Tabata',
      description: '8 intervaller á 20s/10s',
      type: 'tabata',
      prepareDurationSeconds: 10,
      rounds: 1,
      roundRestDurationSeconds: 0,
      items: [
        { id: 't1', exercise: { id: 'kneboy', name: 'Knebøy', category: 'bodyweight' }, workDurationSeconds: 20, restDurationSeconds: 10 },
        { id: 't2', exercise: { id: 'push-ups', name: 'Push-ups', category: 'bodyweight' }, workDurationSeconds: 20, restDurationSeconds: 10 },
        { id: 't3', exercise: { id: 'mountain-climbers', name: 'Mountain Climbers', category: 'cardio' }, workDurationSeconds: 20, restDurationSeconds: 10 },
        { id: 't4', exercise: { id: 'burpees', name: 'Burpees', category: 'cardio' }, workDurationSeconds: 20, restDurationSeconds: 10 },
        { id: 't5', exercise: { id: 'utfall-forover', name: 'Utfall', category: 'bodyweight' }, workDurationSeconds: 20, restDurationSeconds: 10 },
        { id: 't6', exercise: { id: 'planke', name: 'Planke', category: 'bodyweight' }, workDurationSeconds: 20, restDurationSeconds: 10 },
        { id: 't7', exercise: { id: 'sprellmenn', name: 'Sprellmenn', category: 'cardio' }, workDurationSeconds: 20, restDurationSeconds: 10 },
        { id: 't8', exercise: { id: 'hoye-kneloft', name: 'Høye kneløft', category: 'cardio' }, workDurationSeconds: 20, restDurationSeconds: 0 },
      ],
    },
  },
  {
    id: 'kettlebell-fettforbrenning',
    name: 'Kettlebell Power & Styrke',
    category: 'styrke',
    durationMinutes: 12,
    intensity: 'høy',
    description: 'Eksplosiv styrke og kondisjon med swings, goblet squats, press og roing.',
    workout: {
      id: 'kettlebell-express',
      name: 'Kettlebell Styrke',
      description: '5 øvelser, 2 runder',
      type: 'custom',
      prepareDurationSeconds: 10,
      rounds: 2,
      roundRestDurationSeconds: 30,
      items: [
        { id: 'kb1', exercise: { id: 'kettlebell-swing', name: 'Kettlebell-swing', category: 'kettlebell' }, workDurationSeconds: 35, restDurationSeconds: 15 },
        { id: 'kb2', exercise: { id: 'goblet-squat', name: 'Goblet Squat', category: 'kettlebell' }, workDurationSeconds: 35, restDurationSeconds: 15 },
        { id: 'kb3', exercise: { id: 'kettlebell-press', name: 'Kettlebell skulderpress', category: 'kettlebell' }, workDurationSeconds: 35, restDurationSeconds: 15 },
        { id: 'kb4', exercise: { id: 'kettlebell-halo', name: 'Kettlebell Halo', category: 'kettlebell' }, workDurationSeconds: 35, restDurationSeconds: 15 },
        { id: 'kb5', exercise: { id: 'kettlebell-row', name: 'Ettarms roing', category: 'kettlebell' }, workDurationSeconds: 35, restDurationSeconds: 15 },
      ],
    },
  },
  {
    id: 'morgenmobilitet-rygg',
    name: 'Morgenmobilitet & Rygg',
    category: 'mobilitet',
    durationMinutes: 6,
    intensity: 'lav',
    description: 'Vekk kroppen med myke bevegelser for ryggsøyle, skuldre og hofter.',
    workout: {
      id: 'morning-mobility',
      name: 'Morgenmobilitet & Rygg',
      description: 'Myk start på dagen',
      type: 'custom',
      prepareDurationSeconds: 5,
      rounds: 2,
      roundRestDurationSeconds: 15,
      items: [
        { id: 'm1', exercise: { id: 'katte-ku', name: 'Katte-ku', category: 'mobility' }, workDurationSeconds: 45, restDurationSeconds: 15 },
        { id: 'm2', exercise: { id: 'verdens-beste-toyeovelse', name: 'Verdens beste tøyeøvelse', category: 'mobility' }, workDurationSeconds: 45, restDurationSeconds: 15 },
        { id: 'm3', exercise: { id: 'hofteapner-90-90', name: 'Hofteåpner 90/90', category: 'mobility' }, workDurationSeconds: 45, restDurationSeconds: 15 },
      ],
    },
  },
  {
    id: 'seven-minute-scientific',
    name: '7-minutters vitenskapelig økt',
    category: 'intervall',
    durationMinutes: 7,
    intensity: 'middels',
    description: 'Den velkjente helkroppsøkten med 12 øvelser á 30 sekunder.',
    workout: {
      id: 'seven-minute',
      name: '7-minutters økt',
      description: '12 øvelser helkropp',
      type: 'custom',
      prepareDurationSeconds: 10,
      rounds: 1,
      roundRestDurationSeconds: 0,
      items: [
        { id: 's1', exercise: { id: 'sprellmenn', name: 'Sprellmenn', category: 'cardio' }, workDurationSeconds: 30, restDurationSeconds: 10 },
        { id: 's2', exercise: { id: 'kneboy', name: 'Knebøy mot vegg/luft', category: 'bodyweight' }, workDurationSeconds: 30, restDurationSeconds: 10 },
        { id: 's3', exercise: { id: 'push-ups', name: 'Push-ups', category: 'bodyweight' }, workDurationSeconds: 30, restDurationSeconds: 10 },
        { id: 's4', exercise: { id: 'hulekroppshold', name: 'Hulekroppshold', category: 'bodyweight' }, workDurationSeconds: 30, restDurationSeconds: 10 },
        { id: 's5', exercise: { id: 'utfall-forover', name: 'Utfall forover', category: 'bodyweight' }, workDurationSeconds: 30, restDurationSeconds: 10 },
        { id: 's6', exercise: { id: 'dips-pa-stol', name: 'Dips på stol', category: 'bodyweight' }, workDurationSeconds: 30, restDurationSeconds: 10 },
        { id: 's7', exercise: { id: 'planke', name: 'Planke', category: 'bodyweight' }, workDurationSeconds: 30, restDurationSeconds: 10 },
        { id: 's8', exercise: { id: 'hoye-kneloft', name: 'Høye kneløft', category: 'cardio' }, workDurationSeconds: 30, restDurationSeconds: 10 },
        { id: 's9', exercise: { id: 'sideplanke', name: 'Sideplanke', category: 'bodyweight' }, workDurationSeconds: 30, restDurationSeconds: 0 },
      ],
    },
  },
];

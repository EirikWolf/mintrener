import { WorkoutTemplate } from '../types/workout';

export const TABATA_WORKOUT: WorkoutTemplate = {
  id: 'tabata-classic',
  name: 'Klassisk Tabata',
  description: '8 intervaller med 20 sekunder arbeid og 10 sekunder hvile. 4 minutter totalt.',
  type: 'tabata',
  prepareDurationSeconds: 10,
  rounds: 1,
  roundRestDurationSeconds: 0,
  items: [
    {
      id: 'tabata-1',
      exercise: { id: 'kneboy', name: 'Knebøy', nameEn: 'Squats', category: 'bodyweight' },
      workDurationSeconds: 20,
      restDurationSeconds: 10,
    },
    {
      id: 'tabata-2',
      exercise: { id: 'push-ups', name: 'Push-ups', nameEn: 'Push-ups', category: 'bodyweight' },
      workDurationSeconds: 20,
      restDurationSeconds: 10,
    },
    {
      id: 'tabata-3',
      exercise: { id: 'mountain-climbers', name: 'Mountain Climbers', nameEn: 'Mountain Climbers', category: 'cardio' },
      workDurationSeconds: 20,
      restDurationSeconds: 10,
    },
    {
      id: 'tabata-4',
      exercise: { id: 'utfall-forover', name: 'Utfall forover', nameEn: 'Lunges', category: 'bodyweight' },
      workDurationSeconds: 20,
      restDurationSeconds: 10,
    },
    {
      id: 'tabata-5',
      exercise: { id: 'planke', name: 'Planke', nameEn: 'Plank', category: 'bodyweight' },
      workDurationSeconds: 20,
      restDurationSeconds: 10,
    },
    {
      id: 'tabata-6',
      exercise: { id: 'burpees', name: 'Burpees', nameEn: 'Burpees', category: 'cardio' },
      workDurationSeconds: 20,
      restDurationSeconds: 10,
    },
    {
      id: 'tabata-7',
      exercise: { id: 'hoye-kneloft', name: 'Høye kneløft', nameEn: 'High Knees', category: 'cardio' },
      workDurationSeconds: 20,
      restDurationSeconds: 10,
    },
    {
      id: 'tabata-8',
      exercise: { id: 'rygghev-superman', name: 'Rygghev (Superman)', nameEn: 'Superman', category: 'bodyweight' },
      workDurationSeconds: 20,
      restDurationSeconds: 10,
    },
  ],
};

export const SEVEN_MINUTE_WORKOUT: WorkoutTemplate = {
  id: 'seven-minute',
  name: '7-minutters økt',
  description: '12 øvelser med 30 sekunders arbeid og 10 sekunders hvile.',
  type: 'custom',
  prepareDurationSeconds: 10,
  rounds: 1,
  roundRestDurationSeconds: 0,
  items: [
    {
      id: 'sm-1',
      exercise: { id: 'sprellmenn', name: 'Sprellmenn (Jumping Jacks)', category: 'cardio' },
      workDurationSeconds: 30,
      restDurationSeconds: 10,
    },
    {
      id: 'sm-2',
      exercise: { id: 'kneboy', name: 'Knebøy mot vegg/luft', category: 'bodyweight' },
      workDurationSeconds: 30,
      restDurationSeconds: 10,
    },
    {
      id: 'sm-3',
      exercise: { id: 'push-ups', name: 'Push-ups', category: 'bodyweight' },
      workDurationSeconds: 30,
      restDurationSeconds: 10,
    },
    {
      id: 'sm-4',
      exercise: { id: 'hulekroppshold', name: 'Hulekroppshold / Magemuskler', category: 'bodyweight' },
      workDurationSeconds: 30,
      restDurationSeconds: 10,
    },
    {
      id: 'sm-5',
      exercise: { id: 'utfall-forover', name: 'Utfall forover', category: 'bodyweight' },
      workDurationSeconds: 30,
      restDurationSeconds: 10,
    },
    {
      id: 'sm-6',
      exercise: { id: 'dips-pa-stol', name: 'Dips på stol', category: 'bodyweight' },
      workDurationSeconds: 30,
      restDurationSeconds: 10,
    },
    {
      id: 'sm-7',
      exercise: { id: 'planke', name: 'Planke', category: 'bodyweight' },
      workDurationSeconds: 30,
      restDurationSeconds: 10,
    },
    {
      id: 'sm-8',
      exercise: { id: 'hoye-kneloft', name: 'Høye kneløft', category: 'cardio' },
      workDurationSeconds: 30,
      restDurationSeconds: 10,
    },
    {
      id: 'sm-9',
      exercise: { id: 'sideplanke-hoyre', name: 'Sideplanke', category: 'bodyweight' },
      workDurationSeconds: 30,
      restDurationSeconds: 10,
    },
  ],
};

export const KETTLEBELL_EXPRESS: WorkoutTemplate = {
  id: 'kettlebell-express',
  name: 'Kettlebell Styrke',
  description: '5 effektive kettlebell-øvelser for styrke og forbrenning.',
  type: 'custom',
  prepareDurationSeconds: 10,
  rounds: 2,
  roundRestDurationSeconds: 30,
  items: [
    {
      id: 'kb-1',
      exercise: { id: 'kettlebell-swing', name: 'Kettlebell-swing', category: 'kettlebell' },
      workDurationSeconds: 35,
      restDurationSeconds: 15,
    },
    {
      id: 'kb-2',
      exercise: { id: 'goblet-squat', name: 'Goblet Squat', category: 'kettlebell' },
      workDurationSeconds: 35,
      restDurationSeconds: 15,
    },
    {
      id: 'kb-3',
      exercise: { id: 'kettlebell-press', name: 'Kettlebell skulderpress', category: 'kettlebell' },
      workDurationSeconds: 35,
      restDurationSeconds: 15,
    },
    {
      id: 'kb-4',
      exercise: { id: 'kettlebell-halo', name: 'Kettlebell Halo', category: 'kettlebell' },
      workDurationSeconds: 35,
      restDurationSeconds: 15,
    },
    {
      id: 'kb-5',
      exercise: { id: 'kettlebell-row', name: 'Ettarms roing', category: 'kettlebell' },
      workDurationSeconds: 35,
      restDurationSeconds: 15,
    },
  ],
};

export const MORNING_MOBILITY: WorkoutTemplate = {
  id: 'morning-mobility',
  name: 'Morgenmobilitet & Rygg',
  description: 'Rolig og god oppmykning for ryggsøyle, skuldre og hofter.',
  type: 'custom',
  prepareDurationSeconds: 5,
  rounds: 2,
  roundRestDurationSeconds: 15,
  items: [
    {
      id: 'mob-1',
      exercise: { id: 'katte-ku', name: 'Katte-ku (Ryggmobilitet)', category: 'mobility' },
      workDurationSeconds: 45,
      restDurationSeconds: 15,
    },
    {
      id: 'mob-2',
      exercise: { id: 'verdens-beste-toyeovelse', name: 'Verdens beste tøyeøvelse', category: 'mobility' },
      workDurationSeconds: 45,
      restDurationSeconds: 15,
    },
    {
      id: 'mob-3',
      exercise: { id: 'hofteapner-90-90', name: 'Hofteåpner 90/90', category: 'mobility' },
      workDurationSeconds: 45,
      restDurationSeconds: 15,
    },
  ],
};

export const PRESET_WORKOUTS: WorkoutTemplate[] = [
  TABATA_WORKOUT,
  SEVEN_MINUTE_WORKOUT,
  KETTLEBELL_EXPRESS,
  MORNING_MOBILITY,
];

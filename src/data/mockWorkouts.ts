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
      exercise: { id: 'ex-1', name: 'Knebøy', nameEn: 'Squats', category: 'bodyweight' },
      workDurationSeconds: 20,
      restDurationSeconds: 10,
    },
    {
      id: 'tabata-2',
      exercise: { id: 'ex-2', name: 'Push-ups', nameEn: 'Push-ups', category: 'bodyweight' },
      workDurationSeconds: 20,
      restDurationSeconds: 10,
    },
    {
      id: 'tabata-3',
      exercise: { id: 'ex-3', name: 'Mountain Climbers', nameEn: 'Mountain Climbers', category: 'cardio' },
      workDurationSeconds: 20,
      restDurationSeconds: 10,
    },
    {
      id: 'tabata-4',
      exercise: { id: 'ex-4', name: 'Utfall', nameEn: 'Lunges', category: 'bodyweight' },
      workDurationSeconds: 20,
      restDurationSeconds: 10,
    },
    {
      id: 'tabata-5',
      exercise: { id: 'ex-5', name: 'Planke', nameEn: 'Plank', category: 'bodyweight' },
      workDurationSeconds: 20,
      restDurationSeconds: 10,
    },
    {
      id: 'tabata-6',
      exercise: { id: 'ex-6', name: 'Burpees', nameEn: 'Burpees', category: 'cardio' },
      workDurationSeconds: 20,
      restDurationSeconds: 10,
    },
    {
      id: 'tabata-7',
      exercise: { id: 'ex-7', name: 'Høye kneløft', nameEn: 'High Knees', category: 'cardio' },
      workDurationSeconds: 20,
      restDurationSeconds: 10,
    },
    {
      id: 'tabata-8',
      exercise: { id: 'ex-8', name: 'Rygghev', nameEn: 'Superman', category: 'bodyweight' },
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
      exercise: { id: 'ex-9', name: 'Sprellmenn (Jumping Jacks)', category: 'cardio' },
      workDurationSeconds: 30,
      restDurationSeconds: 10,
    },
    {
      id: 'sm-2',
      exercise: { id: 'ex-10', name: 'Veggsitt', category: 'bodyweight' },
      workDurationSeconds: 30,
      restDurationSeconds: 10,
    },
    {
      id: 'sm-3',
      exercise: { id: 'ex-2', name: 'Push-ups', category: 'bodyweight' },
      workDurationSeconds: 30,
      restDurationSeconds: 10,
    },
    {
      id: 'sm-4',
      exercise: { id: 'ex-11', name: 'Magemuskler (Crunches)', category: 'bodyweight' },
      workDurationSeconds: 30,
      restDurationSeconds: 10,
    },
    {
      id: 'sm-5',
      exercise: { id: 'ex-12', name: 'Steg opp på stol / boks', category: 'bodyweight' },
      workDurationSeconds: 30,
      restDurationSeconds: 10,
    },
    {
      id: 'sm-6',
      exercise: { id: 'ex-1', name: 'Knebøy', category: 'bodyweight' },
      workDurationSeconds: 30,
      restDurationSeconds: 10,
    },
    {
      id: 'sm-7',
      exercise: { id: 'ex-13', name: 'Dips på stol', category: 'bodyweight' },
      workDurationSeconds: 30,
      restDurationSeconds: 10,
    },
    {
      id: 'sm-8',
      exercise: { id: 'ex-5', name: 'Planke', category: 'bodyweight' },
      workDurationSeconds: 30,
      restDurationSeconds: 10,
    },
    {
      id: 'sm-9',
      exercise: { id: 'ex-7', name: 'Høye kneløft', category: 'cardio' },
      workDurationSeconds: 30,
      restDurationSeconds: 10,
    },
    {
      id: 'sm-10',
      exercise: { id: 'ex-4', name: 'Utfall', category: 'bodyweight' },
      workDurationSeconds: 30,
      restDurationSeconds: 10,
    },
    {
      id: 'sm-11',
      exercise: { id: 'ex-14', name: 'Push-up med rotasjon', category: 'bodyweight' },
      workDurationSeconds: 30,
      restDurationSeconds: 10,
    },
    {
      id: 'sm-12',
      exercise: { id: 'ex-15', name: 'Sideplanke', category: 'bodyweight' },
      workDurationSeconds: 30,
      restDurationSeconds: 10,
    },
  ],
};

export const PRESET_WORKOUTS: WorkoutTemplate[] = [
  TABATA_WORKOUT,
  SEVEN_MINUTE_WORKOUT,
];

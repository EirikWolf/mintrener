import { BODYWEIGHT_EXERCISES } from './bodyweight';
import { KETTLEBELL_EXERCISES } from './kettlebell';
import { DUMBBELL_EXERCISES } from './dumbbells';
import { CARDIO_EXERCISES } from './cardio';
import { MOBILITY_EXERCISES } from './mobility';
import { ExerciseItem, validateExerciseList } from '../../schemas/exerciseSchema';

// Samle alle bolkene
export const ALL_RAW_EXERCISES: ExerciseItem[] = [
  ...BODYWEIGHT_EXERCISES,
  ...KETTLEBELL_EXERCISES,
  ...DUMBBELL_EXERCISES,
  ...CARDIO_EXERCISES,
  ...MOBILITY_EXERCISES,
];

// Automatisk validering av hele biblioteket mot JSON Schema
const validation = validateExerciseList(ALL_RAW_EXERCISES);

if (validation.invalid.length > 0) {
  console.error('Ugyldige øvelser funnet i biblioteket:', validation.invalid);
}

export const EXERCISE_LIBRARY: ExerciseItem[] = validation.valid;

/**
 * Hjelpefunksjon: Søk og filtrering i øvelsesbiblioteket
 */
export interface ExerciseFilterOptions {
  query?: string;
  kategori?: string;
  utstyr?: string;
  nivaa?: string;
  muskel?: string;
}

export function filterExercises(
  exercises: ExerciseItem[] = EXERCISE_LIBRARY,
  options: ExerciseFilterOptions = {}
): ExerciseItem[] {
  return exercises.filter((ex) => {
    // 1. Tekstsøk (Navn nb/en, muskler)
    if (options.query && options.query.trim() !== '') {
      const q = options.query.toLowerCase().trim();
      const matchName = ex.navn.nb.toLowerCase().includes(q) || (ex.navn.en && ex.navn.en.toLowerCase().includes(q));
      const matchMuscles = ex.muskler.primær.some((m) => m.toLowerCase().includes(q)) ||
        ex.muskler.sekundær.some((m) => m.toLowerCase().includes(q));
      if (!matchName && !matchMuscles) return false;
    }

    // 2. Kategori
    if (options.kategori && options.kategori !== 'alle') {
      if (ex.kategori !== options.kategori) return false;
    }

    // 3. Utstyr
    if (options.utstyr && options.utstyr !== 'alle') {
      if (!ex.utstyr.includes(options.utstyr as any)) return false;
    }

    // 4. Nivå
    if (options.nivaa && options.nivaa !== 'alle') {
      if (ex.nivå !== options.nivaa) return false;
    }

    return true;
  });
}

import { WorkoutTemplate } from '../types/workout';
import { EXERCISE_LIBRARY } from '../data/exercises';

const PROGRAM_OVERRIDES_STORAGE_KEY = 'mintrener_program_overrides_v1';

export type ProgramOverridesMap = Record<string, Record<string, string>>; // programId -> { originalExerciseId: substituteExerciseId }

/**
 * Henter alle overstyringer for et program
 */
export function getProgramOverrides(programId: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(PROGRAM_OVERRIDES_STORAGE_KEY);
    if (!raw) return {};
    const parsed: ProgramOverridesMap = JSON.parse(raw);
    return parsed[programId] || {};
  } catch (e) {
    console.error('Feil ved lesing av programOverrides:', e);
    return {};
  }
}

/**
 * Lagrer et øvelsesbytte for et gitt program
 */
export function setExerciseOverride(
  programId: string,
  originalExerciseId: string,
  substituteExerciseId: string
): void {
  try {
    const raw = localStorage.getItem(PROGRAM_OVERRIDES_STORAGE_KEY);
    const map: ProgramOverridesMap = raw ? JSON.parse(raw) : {};
    
    if (!map[programId]) {
      map[programId] = {};
    }
    map[programId][originalExerciseId] = substituteExerciseId;
    localStorage.setItem(PROGRAM_OVERRIDES_STORAGE_KEY, JSON.stringify(map));
  } catch (e) {
    console.error('Feil ved lagring av exerciseOverride:', e);
  }
}

/**
 * Fjerner et øvelsesbytte for et gitt program
 */
export function removeExerciseOverride(
  programId: string,
  originalExerciseId: string
): void {
  try {
    const raw = localStorage.getItem(PROGRAM_OVERRIDES_STORAGE_KEY);
    if (!raw) return;
    const map: ProgramOverridesMap = JSON.parse(raw);
    if (map[programId]) {
      delete map[programId][originalExerciseId];
      localStorage.setItem(PROGRAM_OVERRIDES_STORAGE_KEY, JSON.stringify(map));
    }
  } catch (e) {
    console.error('Feil ved sletting av exerciseOverride:', e);
  }
}

/**
 * Anvender lagrede øvelsesbytter på en WorkoutTemplate
 */
export function applyProgramOverrides(
  programId: string,
  workout: WorkoutTemplate
): WorkoutTemplate {
  const overrides = getProgramOverrides(programId);
  if (!overrides || Object.keys(overrides).length === 0) {
    return workout;
  }

  const updatedItems = workout.items.map((item) => {
    const subId = overrides[item.exercise.id];
    if (subId) {
      const subEx = EXERCISE_LIBRARY.find((e) => e.id === subId);
      if (subEx) {
        return {
          ...item,
          exercise: {
            id: subEx.id,
            name: subEx.navn.nb,
            nameEn: subEx.navn.en,
            category: subEx.kategori as any,
          },
        };
      }
    }
    return item;
  });

  return {
    ...workout,
    items: updatedItems,
  };
}

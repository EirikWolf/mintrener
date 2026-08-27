import { StrengthSetLog } from '../schemas/strengthSchema';

const STRENGTH_LOGS_STORAGE_KEY = 'mintrener_strength_exercise_logs_v1';

export interface ExerciseLogHistory {
  exerciseId: string;
  lastLoggedAt: string;
  weightKg: number;
  sets: Array<{ reps: number; weightKg: number; rpe?: number }>;
}

export interface DoubleProgressionResult {
  shouldIncreaseWeight: boolean;
  currentWeightKg: number;
  nextWeightKg: number;
  nextTargetReps: number;
  title: string;
  reason: string;
}

/**
 * Henter historikk for en gitt øvelse
 */
export function getLatestExerciseLog(exerciseId: string): ExerciseLogHistory | null {
  try {
    const raw = localStorage.getItem(STRENGTH_LOGS_STORAGE_KEY);
    if (!raw) return null;
    const map: Record<string, ExerciseLogHistory> = JSON.parse(raw);
    return map[exerciseId] || null;
  } catch (e) {
    console.error('Feil ved lesing av strength log:', e);
    return null;
  }
}

/**
 * Lagrer et fullført styrkesett for en øvelse
 */
export function saveExerciseSetsLog(
  exerciseId: string,
  sets: StrengthSetLog[],
  weightKg: number
): void {
  try {
    const raw = localStorage.getItem(STRENGTH_LOGS_STORAGE_KEY);
    const map: Record<string, ExerciseLogHistory> = raw ? JSON.parse(raw) : {};

    map[exerciseId] = {
      exerciseId,
      lastLoggedAt: new Date().toISOString(),
      weightKg,
      sets: sets.map((s) => ({
        reps: s.loggedReps ?? s.targetReps,
        weightKg: s.loggedWeightKg ?? weightKg,
        rpe: s.rpe,
      })),
    };

    localStorage.setItem(STRENGTH_LOGS_STORAGE_KEY, JSON.stringify(map));
  } catch (e) {
    console.error('Feil ved lagring av strength log:', e);
  }
}

/**
 * Dobbel Progresjonsmotor (Vedlegg C.17):
 * Beregner neste økts vekt og reps basert på gjennomførte sett.
 */
export function calculateDoubleProgression(
  loggedSets: StrengthSetLog[],
  repRange: [number, number] = [8, 12],
  isUpperBody: boolean = true,
  currentWeightKg: number = 0
): DoubleProgressionResult {
  const [minReps, maxReps] = repRange;
  const completedSets = loggedSets.filter((s) => s.isCompleted);

  if (completedSets.length === 0) {
    return {
      shouldIncreaseWeight: false,
      currentWeightKg,
      nextWeightKg: currentWeightKg,
      nextTargetReps: minReps,
      title: 'Hold vekten',
      reason: 'Ingen fullførte sett registrert.',
    };
  }

  // Sjekk om ALLE fullførte sett nådde toppmålet (maxReps)
  const allReachedTop = completedSets.every((s) => (s.loggedReps ?? s.targetReps) >= maxReps);

  if (allReachedTop) {
    // Øk vekt: +2.5 kg for overkropp, +5.0 kg for underkropp
    const increment = isUpperBody ? 2.5 : 5.0;
    const nextWeight = currentWeightKg + increment;

    return {
      shouldIncreaseWeight: true,
      currentWeightKg,
      nextWeightKg: nextWeight,
      nextTargetReps: minReps,
      title: `🎉 Progresjon! Øk til ${nextWeight} kg`,
      reason: `Du klarte ${maxReps} reps i alle sett! Neste økt økes vekten med +${increment} kg, og målet settes til ${minReps} reps.`,
    };
  } else {
    // Behold samme vekt, sikt mot å øke reps på de settene som mangler
    const lowestReps = Math.min(...completedSets.map((s) => s.loggedReps ?? s.targetReps));

    return {
      shouldIncreaseWeight: false,
      currentWeightKg,
      nextWeightKg: currentWeightKg,
      nextTargetReps: Math.min(maxReps, lowestReps + 1),
      title: `Behold ${currentWeightKg} kg`,
      reason: `Flott innsats! Fortsett på ${currentWeightKg} kg til du mestrer ${maxReps} reps i alle sett.`,
    };
  }
}

import { CompletedWorkoutLog } from '../types/models';
import { WorkoutTemplate } from '../types/workout';

export interface ProgressionSuggestion {
  type: 'increase' | 'decrease';
  title: string;
  reason: string;
  adaptedWorkout: WorkoutTemplate;
}

/**
 * Analyserer de siste vurderingene for en gitt øktmal og foreslår adaptiv tilpasning
 */
export function checkAdaptiveProgression(
  workout: WorkoutTemplate,
  history: CompletedWorkoutLog[]
): ProgressionSuggestion | null {
  // Finn de 3 siste gjennomføringene av denne malen
  const matchingLogs = history
    .filter((log) => log.workoutId === workout.id || log.workoutName === workout.name)
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .slice(0, 2);

  if (matchingLogs.length < 2) {
    return null; // Trenger minst 2 logger for å fastslå en trend
  }

  const ratings = matchingLogs.map((l) => l.difficultyRating);

  // 1. Progresjon oppover: 2 "for_lett" på rad
  if (ratings[0] === 'for_lett' && ratings[1] === 'for_lett') {
    const adaptedItems = workout.items.map((item) => ({
      ...item,
      workDurationSeconds: Math.min(item.workDurationSeconds + 5, 90),
      restDurationSeconds: Math.max(item.restDurationSeconds - 2, 5),
    }));

    return {
      type: 'increase',
      title: '🚀 Klar for neste nivå?',
      reason: 'Du har vurdert denne økten som «For lett» 2 ganger på rad.',
      adaptedWorkout: {
        ...workout,
        name: `${workout.name} (Tilpasset nivå +1)`,
        items: adaptedItems,
      },
    };
  }

  // 2. Progresjon nedover / avlastning: 2 "for_tungt" på rad
  if (ratings[0] === 'for_tungt' && ratings[1] === 'for_tungt') {
    const adaptedItems = workout.items.map((item) => ({
      ...item,
      workDurationSeconds: Math.max(item.workDurationSeconds - 5, 10),
      restDurationSeconds: Math.min(item.restDurationSeconds + 5, 60),
    }));

    return {
      type: 'decrease',
      title: '🌿 Trenger du mer pustepause?',
      reason: 'Du har vurdert denne økten som «For tungt» 2 ganger på rad.',
      adaptedWorkout: {
        ...workout,
        name: `${workout.name} (Mer hviletid)`,
        items: adaptedItems,
      },
    };
  }

  return null;
}

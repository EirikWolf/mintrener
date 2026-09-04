import { CompletedWorkoutLog } from '../types/models';
import { WorkoutTemplate } from '../types/workout';

export interface ProgressionSuggestion {
  type: 'increase' | 'decrease' | 'deload';
  title: string;
  reason: string;
  adaptedWorkout: WorkoutTemplate;
}

/**
 * Analyserer de siste vurderingene for en gitt øktmal og foreslår adaptiv tilpasning
 * Følger treningsfysiologiske prinsipper (overload-prinsippet trinnvis, aldri øke volum og kutte hvile samtidig)
 */
export function checkAdaptiveProgression(
  workout: WorkoutTemplate,
  history: CompletedWorkoutLog[]
): ProgressionSuggestion | null {
  // Finn de 3 siste gjennomføringene av denne malen
  const matchingLogs = history
    .filter((log) => log.workoutId === workout.id || log.workoutName === workout.name)
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .slice(0, 3);

  if (matchingLogs.length < 2) {
    return null; // Trenger minst 2 logger for å fastslå en trend
  }

  const ratings = matchingLogs.map((l) => l.difficultyRating);

  // 1. Progresjon oppover: 2 "for_lett" på rad
  // Treningsfysiologisk (Revisjon C § 4.3): Overload-prinsippet skal tas trinnvis.
  // Hvis hviletid allerede er kort (<= 15s), øker vi arbeidstiden (+5s).
  // Hvis hviletid er lang (> 20s), reduserer vi heller hviletiden (-2s, gulv 10s) for å øke tetthet.
  // Vi øker ALDRI arbeidstid og reduserer hviletid i samme steg.
  if (ratings[0] === 'for_lett' && ratings[1] === 'for_lett') {
    const avgRest = workout.items.reduce((sum, item) => sum + item.restDurationSeconds, 0) / (workout.items.length || 1);
    const shouldCutRest = avgRest > 20;

    const adaptedItems = workout.items.map((item) => {
      if (shouldCutRest) {
        return {
          ...item,
          restDurationSeconds: Math.max(item.restDurationSeconds - 2, 10),
        };
      }
      return {
        ...item,
        workDurationSeconds: Math.min(item.workDurationSeconds + 5, 90),
      };
    });

    return {
      type: 'increase',
      title: shouldCutRest ? '⚡ Øk tettheten?' : '🚀 Klar for neste nivå?',
      reason: shouldCutRest
        ? 'Du opplever økten som lett. Vi foreslår 2 sekunder kortere hvile mellom intervallene.'
        : 'Du har vurdert økten som «For lett» 2 ganger på rad. Vi legger på 5 sekunder arbeidstid.',
      adaptedWorkout: {
        ...workout,
        name: `${workout.name} (Nivå +1)`,
        items: adaptedItems,
      },
    };
  }

  // 2. Progresjon nedover / Deload ved overbelastning: 2 eller flere "for_tungt" på rad
  if (ratings[0] === 'for_tungt' && ratings[1] === 'for_tungt') {
    // Sjekk om det er akkumulert tretthet (3 på rad eller avbrutte runder)
    const isConsecutiveThree = matchingLogs.length >= 3 && ratings[2] === 'for_tungt';
    const hasIncompleteRounds = matchingLogs.some((l) => l.roundsCompleted < l.totalRounds);

    if (isConsecutiveThree || hasIncompleteRounds) {
      // Deload-anbefaling (aktiv restitusjon: 40 % reduksjon i volum/arbeidstid)
      const deloadItems = workout.items.map((item) => ({
        ...item,
        workDurationSeconds: Math.max(Math.round(item.workDurationSeconds * 0.6), 10),
        restDurationSeconds: Math.min(item.restDurationSeconds + 5, 60),
      }));

      return {
        type: 'deload',
        title: '🌿 Anbefalt Deload (Restitusjon)',
        reason: 'Flere tunge eller ufullstendige økter på rad indikerer akkumulert tretthet. La kroppen hente seg inn.',
        adaptedWorkout: {
          ...workout,
          name: `${workout.name} (Deload-økt)`,
          items: deloadItems,
        },
      };
    }

    // Normal justering nedover: øk hviletiden for bedre innhenting (uten å kutte for bratt i arbeid)
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

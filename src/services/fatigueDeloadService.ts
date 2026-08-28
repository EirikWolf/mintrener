import { WorkoutTemplate } from '../types/workout';
import { CompletedWorkoutLog } from '../types/models';

export interface DeloadAssessment {
  needsDeload: boolean;
  reason: string;
  suggestedAction: string;
  consecutiveHardWorkouts: number;
}

/**
 * Vurderer om brukeren bør kjøre en deload-økt basert på nylige tilbakemeldinger og øktlogger
 */
export function assessFatigueAndDeload(
  recentSessions: CompletedWorkoutLog[]
): DeloadAssessment {
  if (recentSessions.length < 2) {
    return {
      needsDeload: false,
      reason: 'For lite historikk til å vurdere tretthet.',
      suggestedAction: 'Fortsett med planlagt treningsprogram.',
      consecutiveHardWorkouts: 0,
    };
  }

  // Se på de 3 siste øktene
  const lastThree = recentSessions.slice(0, 3);
  let hardCount = 0;

  for (const session of lastThree) {
    if (session.difficultyRating === 'for_tungt' || session.roundsCompleted < session.totalRounds) {
      hardCount++;
    }
  }

  if (hardCount >= 2) {
    return {
      needsDeload: true,
      reason: 'Du har opplevd høy belastning eller avbrutt flere nylige økter.',
      suggestedAction:
        'Vi anbefaler en aktiv restitusjonsøkt (Deload) med lavere intensitet og mer fokus på mobilitet.',
      consecutiveHardWorkouts: hardCount,
    };
  }

  return {
    needsDeload: false,
    reason: 'Kroppen responderer fint på treningsmengden.',
    suggestedAction: 'Fortsett med normal progresjon.',
    consecutiveHardWorkouts: hardCount,
  };
}

/**
 * Konverterer en vanlig økt til en skånsom Deload-økt (50 % kortere arbeidstid, lavere runder)
 */
export function convertToDeloadWorkout(workout: WorkoutTemplate): WorkoutTemplate {
  return {
    ...workout,
    id: `${workout.id}-deload`,
    name: `${workout.name} (Deload Restitusjon)`,
    description: `Skånsom restitusjonsversjon av ${workout.name} for å gjenoppbygge overskudd og unngå overbelastning.`,
    rounds: Math.max(1, Math.min(workout.rounds, 2)),
    items: workout.items.map((item) => ({
      ...item,
      workDurationSeconds: Math.max(15, Math.round(item.workDurationSeconds * 0.6)),
      restDurationSeconds: Math.max(item.restDurationSeconds, 20),
    })),
  };
}

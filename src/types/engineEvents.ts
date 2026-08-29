import { IntervalPhase, WorkoutTemplate } from '../types/workout';
import { ExerciseItem } from '../schemas/exerciseSchema';
import { VoiceTone } from '../schemas/profileSchema';

/** Domenehendelser fra TimerEngine. Trigger aldri render — kun abonnenter (lyd/vibrasjon/persistens/MediaSession). */
export type EngineEvent =
  | { type: 'workout:started'; workout: WorkoutTemplate }
  | { type: 'phase:started'; phase: IntervalPhase; round: number; itemIndex: number;
      exercise: ExerciseItem | null; nextExercise: ExerciseItem | null;
      durationS: number; tone: VoiceTone; silent: boolean;
      /** Absolutt motortid (ms, samme klokke som engine.now) for fasegrensen; null for 'complete'. */
      endsAt: number | null }
  | { type: 'phase:deadlineChanged'; endsAt: number }
  | { type: 'phase:halfway' }
  | { type: 'countdown'; secondsLeft: 1 | 2 | 3 }
  | { type: 'resync'; skippedPhases: number; landingPhase: IntervalPhase;
      exercise: ExerciseItem | null; nextExercise: ExerciseItem | null; tone: VoiceTone }
  | { type: 'workout:paused' }
  | { type: 'workout:resumed'; endsAt: number }
  | { type: 'workout:reset' }
  | { type: 'workout:completed'; tone: VoiceTone };

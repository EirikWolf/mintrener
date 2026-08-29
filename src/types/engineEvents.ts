import { IntervalPhase, WorkoutTemplate } from '../types/workout';
import { Exercise } from '../types/workout';
import { VoiceTone } from '../schemas/profileSchema';

/** Domenehendelser fra TimerEngine. Trigger aldri render — kun abonnenter (lyd/vibrasjon/persistens/MediaSession). */
export type EngineEvent =
  | { type: 'workout:started'; workout: WorkoutTemplate }
  | { type: 'phase:started'; phase: IntervalPhase; round: number; itemIndex: number;
      exercise: Exercise | null; nextExercise: Exercise | null;
      durationS: number; tone: VoiceTone; silent: boolean;
      /** Absolutt motortid (ms, samme klokke som engine.now) for fasegrensen; null for 'complete'. */
      endsAt: number | null }
  | { type: 'phase:deadlineChanged'; endsAt: number }
  | { type: 'phase:halfway' }
  | { type: 'phase:endingSoon' }  // én gang per fase ved remaining <= 3.5s i prepare/rest/round_rest
                                  // (hookens persona-start_321-vindu; adapter filtrerer persona, beta ignorerer — lookahead overtar)
  | { type: 'countdown'; secondsLeft: 1 | 2 | 3 }
  | { type: 'resync'; skippedPhases: number; landingPhase: IntervalPhase;
      exercise: Exercise | null; nextExercise: Exercise | null; tone: VoiceTone }
  | { type: 'workout:paused' }
  | { type: 'workout:resumed'; endsAt: number }
  | { type: 'workout:reset' }
  | { type: 'workout:completed'; tone: VoiceTone }
  // restore-flyten bærer workout-data til abonnenter (MediaSession m.fl.) —
  // emitteres i TILLEGG til restore-stiens stille phase:started, som ikke
  // selv bærer navn/workout-referanse.
  | { type: 'workout:restored'; workout: WorkoutTemplate };

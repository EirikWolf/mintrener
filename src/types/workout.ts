export type IntervalPhase = 'prepare' | 'work' | 'rest' | 'round_rest' | 'complete';

export interface Exercise {
  id: string;
  name: string;
  nameEn?: string;
  // Ren metadata som kopieres gjennom (deling/visning) — ingen logikk brancher
  // på verdien. I praksis engelske verdier i preset-data (bodyweight/cardio/…)
  // og bibliotekets norske kategorier (kroppsvekt/frivekt/…) fra builderen.
  category?: string;
  description?: string;
}

export interface IntervalItem {
  id: string;
  exercise: Exercise;
  workDurationSeconds: number;
  restDurationSeconds: number;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  description: string;
  type: 'tabata' | 'emom' | 'amrap' | 'custom';
  prepareDurationSeconds: number;
  rounds: number;
  roundRestDurationSeconds: number;
  items: IntervalItem[];
  voiceTone?: 'rolig' | 'lek' | 'gira' | 'tørr';
}

export interface TimerState {
  status: 'idle' | 'running' | 'paused' | 'completed';
  phase: IntervalPhase;
  currentRound: number;
  totalRounds: number;
  currentItemIndex: number;
  totalItems: number;
  currentExercise: Exercise | null;
  nextExercise: Exercise | null;
  phaseRemainingSeconds: number;
  phaseTotalSeconds: number;
  phaseProgress: number; // 0 til 1 (1 = fullført)
  totalRemainingSeconds: number;
  totalElapsedSeconds: number;
  isLocked: boolean;
  soundEnabled: boolean;
  vibrateEnabled: boolean;
  wakeLockEnabled: boolean;
  speechEnabled: boolean;
  motionReps?: number;
}

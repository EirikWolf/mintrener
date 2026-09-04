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
  /**
   * Arbeidsfasens lengde. Er `targetReps` satt, er dette et ANSLAG som brukes
   * til å regne ut øktens totaltid — ikke en frist fasen avsluttes på.
   */
  workDurationSeconds: number;
  restDurationSeconds: number;
  /**
   * Antall repetisjoner øvelsen skal gjøres i, f.eks. 25 armhevinger.
   * Er den satt, teller ikke fasen ned: den venter til brukeren sier ifra.
   */
  targetReps?: number;
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
  countdownDurationSeconds?: 3 | 5;
  countdownAudioStyle?: 'beep' | 'buzzer';
  motionReps?: number;
  /**
   * Antall repetisjoner den pågående fasen venter på, eller undefined for en
   * vanlig tidsbasert fase. Visningen bruker den til å vise «ferdig»-knappen
   * i stedet for en nedtelling.
   */
  awaitingReps?: number;
}

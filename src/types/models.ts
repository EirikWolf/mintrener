export interface UserSettings {
  soundEnabled: boolean;
  vibrateEnabled: boolean;
  wakeLockEnabled: boolean;
  defaultPrepareSeconds: number;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: string;
  lastLoginAt: string;
  settings: UserSettings;
}

export interface CompletedWorkoutLog {
  id: string;
  userId: string;
  workoutId: string;
  workoutName: string;
  workoutType: string;
  durationSeconds: number;
  roundsCompleted: number;
  totalRounds: number;
  completedAt: string; // ISO string
}

export interface ExerciseDoc {
  id: string;
  navn: string;
  navnEngelsk?: string;
  muskelgrupper: string[];
  utstyr: 'ingen' | 'kettlebell' | 'manualer' | 'stang' | 'strikk' | 'annet';
  nivaa: 'nybegynner' | 'middels' | 'avansert';
  type: 'tid' | 'repetisjoner';
  instruksjoner: string[];
  vanligeFeil?: string[];
  bildeStartUrl?: string;
  bildeSluttUrl?: string;
}

import { CompletedWorkoutLog } from '../types/models';
import { CustomExerciseItem } from './customExercisesService';
import { WorkoutTemplate } from '../types/workout';
import { STORAGE_KEYS } from '../constants/storageKeys';

export interface FullExportPayload {
  exportedAt: string;
  appName: string;
  version: string;
  userProfile?: any;
  history: CompletedWorkoutLog[];
  customExercises: CustomExerciseItem[];
  customWorkouts: WorkoutTemplate[];
  strengthLogs: any[];
  personalRecords?: any;
  badges?: any;
  weeklyGoal?: any;
  coachPersona?: any;
}

/**
 * Eksporterer alle treningsdata til en formatert JSON-fil for nedlasting
 */
export function exportAllDataAsJson(
  history: CompletedWorkoutLog[],
  customExercises?: CustomExerciseItem[],
  customWorkouts?: WorkoutTemplate[],
  strengthLogs?: any[],
  additionalData?: Partial<FullExportPayload>
): void {
  const exportPayload: FullExportPayload = {
    exportedAt: new Date().toISOString(),
    appName: 'Min Trener',
    version: '1.0',
    history,
    customExercises: customExercises || [],
    customWorkouts: customWorkouts || [],
    strengthLogs: strengthLogs || [],
    ...additionalData,
  };

  const jsonStr = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `mintrener-eksport-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Henter alle data fra lokal lagring (og eventuelt Firestore) og eksporterer som JSON (GDPR Art. 20)
 */
export async function exportFullUserDataset(_userId?: string | null): Promise<void> {
  let history: CompletedWorkoutLog[] = [];
  let customExercises: CustomExerciseItem[] = [];
  let customWorkouts: WorkoutTemplate[] = [];
  let strengthLogs: any[] = [];
  let userProfile: any = null;
  let personalRecords: any = null;
  let badges: any = null;
  let weeklyGoal: any = null;
  let coachPersona: any = null;

  try {
    const rawHist = localStorage.getItem(STORAGE_KEYS.WORKOUT_HISTORY);
    if (rawHist) history = JSON.parse(rawHist);

    const rawEx = localStorage.getItem(STORAGE_KEYS.CUSTOM_EXERCISES) || localStorage.getItem(STORAGE_KEYS.LEGACY_CUSTOM_EXERCISES);
    if (rawEx) customExercises = JSON.parse(rawEx);

    const rawWo = localStorage.getItem(STORAGE_KEYS.CUSTOM_WORKOUTS) || localStorage.getItem(STORAGE_KEYS.LEGACY_CUSTOM_WORKOUTS);
    if (rawWo) customWorkouts = JSON.parse(rawWo);

    const rawStr = localStorage.getItem(STORAGE_KEYS.STRENGTH_LOGS) || localStorage.getItem(STORAGE_KEYS.LEGACY_STRENGTH_LOGS);
    if (rawStr) strengthLogs = JSON.parse(rawStr);

    const rawProf = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    if (rawProf) userProfile = JSON.parse(rawProf);

    const rawPr = localStorage.getItem(STORAGE_KEYS.PERSONAL_RECORDS);
    if (rawPr) personalRecords = JSON.parse(rawPr);

    const rawBadges = localStorage.getItem(STORAGE_KEYS.BADGES);
    if (rawBadges) badges = JSON.parse(rawBadges);

    const rawGoal = localStorage.getItem(STORAGE_KEYS.WEEKLY_GOAL);
    if (rawGoal) weeklyGoal = JSON.parse(rawGoal);

    coachPersona = localStorage.getItem(STORAGE_KEYS.COACH_PERSONA) || 'standard';
  } catch (e) {
    console.warn('Feil ved lesing av lokaldata for eksport:', e);
  }

  exportAllDataAsJson(history, customExercises, customWorkouts, strengthLogs, {
    userProfile,
    personalRecords,
    badges,
    weeklyGoal,
    coachPersona,
  });
}

/**
 * Eksporterer fullført treningshistorikk til en komma-separert CSV-fil
 */
export function exportHistoryAsCsv(history: CompletedWorkoutLog[]): void {
  if (history.length === 0) {
    alert('Ingen treningshistorikk å eksportere.');
    return;
  }

  const headers = ['Dato', 'Tidspunkt', 'Navn', 'Type', 'Varighet (sekunder)', 'Varighet (minutter)', 'Runder', 'Vurdering'];
  
  const rows = history.map((log) => {
    const d = new Date(log.completedAt);
    const dateStr = d.toLocaleDateString('nb-NO');
    const timeStr = d.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
    const durationMinutes = (log.durationSeconds / 60).toFixed(1);
    const rating = log.difficultyRating || 'Ikke vurdert';

    return [
      `"${dateStr}"`,
      `"${timeStr}"`,
      `"${log.workoutName.replace(/"/g, '""')}"`,
      `"${log.workoutType}"`,
      log.durationSeconds,
      durationMinutes,
      log.roundsCompleted,
      `"${rating}"`,
    ].join(';');
  });

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `mintrener-historikk-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

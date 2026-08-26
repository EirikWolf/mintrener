import { CompletedWorkoutLog } from '../types/models';
import { CustomExerciseItem } from './customExercisesService';
import { WorkoutTemplate } from '../types/workout';

/**
 * Eksporterer alle treningsdata til en formatert JSON-fil for nedlasting
 */
export function exportAllDataAsJson(
  history: CompletedWorkoutLog[],
  customExercises?: CustomExerciseItem[],
  customWorkouts?: WorkoutTemplate[],
  strengthLogs?: any[]
): void {
  const exportPayload = {
    exportedAt: new Date().toISOString(),
    appName: 'Min Trener',
    version: '1.0',
    history,
    customExercises: customExercises || [],
    customWorkouts: customWorkouts || [],
    strengthLogs: strengthLogs || [],
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

export interface GroupWorkoutLog {
  id: string;
  timestamp: string;
  profileId: string;
  workoutName: string;
  durationSeconds: number;
  participantCount: number;
}

export interface GroupStatsSummary {
  totalSeconds: number;
  totalWorkouts: number;
  totalParticipantSessions: number;
  thisWeekSeconds: number;
}

const GROUP_STATS_STORAGE_KEY = 'mintrener_group_stats_history_v1';

export function getGroupLogs(): GroupWorkoutLog[] {
  try {
    const raw = localStorage.getItem(GROUP_STATS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Feil ved lesing av gruppestatistikk:', e);
    return [];
  }
}

export function logGroupWorkout(
  profileId: string,
  workoutName: string,
  durationSeconds: number,
  participantCount: number = 1
): void {
  try {
    const logs = getGroupLogs();
    const newLog: GroupWorkoutLog = {
      id: `group-log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      profileId,
      workoutName,
      durationSeconds,
      participantCount,
    };
    logs.push(newLog);
    localStorage.setItem(GROUP_STATS_STORAGE_KEY, JSON.stringify(logs));
  } catch (e) {
    console.error('Feil ved lagring av gruppestatistikk:', e);
  }
}

export function getGroupStatsSummary(): GroupStatsSummary {
  const logs = getGroupLogs();
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  let totalSeconds = 0;
  let totalParticipantSessions = 0;
  let thisWeekSeconds = 0;

  logs.forEach((log) => {
    totalSeconds += log.durationSeconds;
    totalParticipantSessions += log.participantCount;

    const logDate = new Date(log.timestamp);
    if (logDate >= oneWeekAgo) {
      thisWeekSeconds += log.durationSeconds;
    }
  });

  return {
    totalSeconds,
    totalWorkouts: logs.length,
    totalParticipantSessions,
    thisWeekSeconds,
  };
}

import React, { useState, useEffect, useMemo } from 'react';
import { CompletedWorkoutLog } from '../../types/models';
import { getUserWorkoutHistory } from '../../services/firestoreService';
import { WorkoutCalendarHeatmap } from './WorkoutCalendarHeatmap';
import { exportAllDataAsJson, exportHistoryAsCsv } from '../../services/exportDataService';
import { computeStreakDays } from '../../services/streakService';
import { toLocalDateString } from '../../services/weekUtils';
import { getWeeklyGoal } from '../../services/weeklyGoalService';
import { useAuth } from '../../contexts/AuthContext';
import { BadgeShowcaseModal } from './BadgeShowcaseModal';
import { getAllUserBadges } from '../../services/badgeService';
import {
  History,
  Flame,
  Clock,
  CheckCircle2,
  Calendar,
  FileSpreadsheet,
  FileJson,
  Smile,
  ThumbsUp,
  Trophy,
} from 'lucide-react';

interface WorkoutHistoryViewProps {
  onNavigateToTimer?: () => void;
}

export const WorkoutHistoryView: React.FC<WorkoutHistoryViewProps> = ({
  onNavigateToTimer,
}) => {
  const { user } = useAuth();
  const [history, setHistory] = useState<CompletedWorkoutLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayCount, setDisplayCount] = useState<number>(20);
  const [isBadgesModalOpen, setIsBadgesModalOpen] = useState(false);

  useEffect(() => {
    getUserWorkoutHistory(user?.uid).then((logs) => {
      setHistory(logs);
      setLoading(false);
    });
  }, [user]);

  const userBadges = useMemo(() => {
    return getAllUserBadges(history);
  }, [history]);

  const unlockedBadgesCount = userBadges.filter((b) => b.isUnlocked).length;

  const stats = useMemo(() => {
    const totalWorkouts = history.length;
    const totalSeconds = history.reduce((acc, log) => acc + log.durationSeconds, 0);
    const totalMinutes = Math.round(totalSeconds / 60);

    const dates = history.map((log) => toLocalDateString(new Date(log.completedAt)));
    const streak = computeStreakDays(dates);

    return { totalWorkouts, totalMinutes, streak };
  }, [history]);

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString('nb-NO', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="flex flex-col h-full max-w-md mx-auto px-4 pt-2 pb-2 select-none overflow-hidden space-y-2.5">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          {onNavigateToTimer && (
            <button
              onClick={onNavigateToTimer}
              title="Tilbake til I dag / Forside"
              aria-label="Tilbake til I dag"
              className="p-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all flex items-center gap-1"
            >
              <span className="text-xs font-bold text-emerald-400">← I dag</span>
            </button>
          )}
          <div>
            <h1 className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
              <History className="w-4 h-4 text-emerald-400" />
              Treningshistorikk
            </h1>
            <p className="text-[10px] text-zinc-400">Dine fullførte økter og statistikk</p>
          </div>
        </div>

        {/* Knapper for Merkeskap og Dataeksport */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsBadgesModalOpen(true)}
            title="Se dine oppnådde merker og trofeer"
            className="px-2.5 py-1.5 rounded-xl bg-amber-950/80 hover:bg-amber-900 border border-amber-500/40 text-amber-300 text-[11px] font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm ring-1 ring-amber-400/20"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Merker ({unlockedBadgesCount}/{userBadges.length})</span>
          </button>

          <button
            onClick={() => exportHistoryAsCsv(history)}
            title="Last ned CSV (Excel)"
            className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-emerald-400 text-[10px] font-bold flex items-center gap-1 transition-all active:scale-95"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">CSV</span>
          </button>
          <button
            onClick={async () => {
              let customEx: any[] = [];
              let customWk: any[] = [];
              let strengthLogs: any[] = [];
              try {
                const storedEx = localStorage.getItem('mintrener_custom_exercises');
                if (storedEx) customEx = JSON.parse(storedEx);
                const storedWk = localStorage.getItem('mintrener_custom_workouts');
                if (storedWk) customWk = JSON.parse(storedWk);
                const storedSt = localStorage.getItem('mintrener_local_strength_logs');
                if (storedSt) strengthLogs = JSON.parse(storedSt);
              } catch (e) {}

              exportAllDataAsJson(history, customEx, customWk, strengthLogs);
            }}
            title="Last ned JSON (Alle data)"
            className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-cyan-400 text-[10px] font-bold flex items-center gap-1 transition-all active:scale-95"
          >
            <FileJson className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">JSON</span>
          </button>
        </div>
      </div>

      {/* 3 Statistikk-kort */}
      <div className="grid grid-cols-3 gap-2 shrink-0">
        {/* Fullførte økter */}
        <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-2 text-center shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto mb-0.5" />
          <span className="text-sm font-black text-white">{stats.totalWorkouts}</span>
          <p className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider">Økter</p>
        </div>

        {/* Total treningstid */}
        <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-2 text-center shadow-sm">
          <Clock className="w-4 h-4 text-emerald-400 mx-auto mb-0.5" />
          <span className="text-sm font-black text-white">{stats.totalMinutes}</span>
          <p className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider">Minutter</p>
        </div>

        {/* Streak */}
        <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-2 text-center shadow-sm">
          <Flame className="w-4 h-4 text-amber-400 mx-auto mb-0.5" />
          <span className="text-sm font-black text-white">{stats.streak}</span>
          <p className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider">Dager på rad</p>
        </div>
      </div>

      {/* Ukesmål & Kalender Heatmap (Steg 1) */}
      <div className="shrink-0">
        <WorkoutCalendarHeatmap history={history} weeklyGoal={getWeeklyGoal()} />
      </div>

      {/* Scrollbar liste over logger */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5 pb-4 min-h-0">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-zinc-900/50 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 space-y-1.5 text-zinc-400">
            <History className="w-6 h-6 mx-auto text-zinc-500" />
            <p className="text-xs">Ingen fullførte økter registrert ennå.</p>
            <p className="text-[10px] text-zinc-400">Fullfør en økt i timeren for å starte loggen!</p>
          </div>
        ) : (
          <>
            {history.slice(0, displayCount).map((log) => {
              const ratingLabel =
                log.difficultyRating === 'for_lett'
                  ? 'For lett'
                  : log.difficultyRating === 'passe'
                  ? 'Passe'
                  : log.difficultyRating === 'for_tungt'
                  ? 'For tungt'
                  : '';

              return (
                <div
                  key={log.id}
                  className="p-2.5 bg-zinc-900/70 border border-zinc-800/80 rounded-2xl flex items-center justify-between shadow-sm"
                >
                  <div className="space-y-0.5 overflow-hidden pr-2">
                    <div className="flex items-center gap-1.5 text-[9px] text-zinc-400">
                      <Calendar className="w-2.5 h-2.5 text-zinc-400" />
                      <span>{formatDate(log.completedAt)}</span>
                      <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[8px] uppercase font-bold text-zinc-300">
                        {log.workoutType}
                      </span>
                      {log.difficultyRating && (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[8px] uppercase font-bold flex items-center gap-0.5 ${
                            log.difficultyRating === 'for_lett'
                              ? 'bg-blue-950 text-blue-300 border border-blue-800/60'
                              : log.difficultyRating === 'passe'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                              : 'bg-amber-950 text-amber-300 border border-amber-800/60'
                          }`}
                        >
                          {log.difficultyRating === 'for_lett' && <Smile className="w-2.5 h-2.5" />}
                          {log.difficultyRating === 'passe' && <ThumbsUp className="w-2.5 h-2.5" />}
                          {log.difficultyRating === 'for_tungt' && <Flame className="w-2.5 h-2.5" />}
                          {ratingLabel}
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-bold text-white truncate">{log.workoutName}</h4>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-mono font-black text-emerald-400">
                      {formatDuration(log.durationSeconds)}
                    </span>
                    <p className="text-[9px] text-zinc-400 font-medium">
                      {log.roundsCompleted} {log.roundsCompleted === 1 ? 'runde' : 'runder'}
                    </p>
                  </div>
                </div>
              );
            })}

            {history.length > displayCount && (
              <button
                onClick={() => setDisplayCount((prev) => prev + 20)}
                className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold text-xs rounded-2xl transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5"
              >
                <span>Vis flere økter ({history.length - displayCount} gjenstår)</span>
              </button>
            )}
          </>
        )}
      </div>

      {/* Modal for trofé- og merkeskap */}
      {isBadgesModalOpen && (
        <BadgeShowcaseModal
          history={history}
          onClose={() => setIsBadgesModalOpen(false)}
        />
      )}
    </div>
  );
};

import React, { useMemo } from 'react';
import { CompletedWorkoutLog } from '../../types/models';
import { Calendar as CalendarIcon, Flame } from 'lucide-react';

interface WorkoutCalendarHeatmapProps {
  history: CompletedWorkoutLog[];
  weeklyGoal?: number; // Standard 3 økter per uke
}

export const WorkoutCalendarHeatmap: React.FC<WorkoutCalendarHeatmapProps> = ({
  history,
  weeklyGoal = 3,
}) => {
  // Finn fullførte økter denne uken (mandag til søndag)
  const weeklyStats = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = søndag, 1 = mandag ...
    const diffToMonday = (currentDay + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const workoutsThisWeek = history.filter((log) => {
      const d = new Date(log.completedAt);
      return d >= monday && d <= sunday;
    });

    const count = workoutsThisWeek.length;
    const progress = Math.min(Math.round((count / weeklyGoal) * 100), 100);

    return { count, progress, isGoalReached: count >= weeklyGoal };
  }, [history, weeklyGoal]);

  // Hjelpefunksjon for lokal datonøkkel (YYYY-MM-DD i lokal tidssone)
  const getLocalDateKey = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Generer de siste 28 dagene (4 uker) for heatmap
  const days = useMemo(() => {
    const list = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Lag map av datoer med antall økter
    const workoutDatesMap = new Map<string, number>();
    history.forEach((log) => {
      const dateKey = getLocalDateKey(new Date(log.completedAt));
      workoutDatesMap.set(dateKey, (workoutDatesMap.get(dateKey) || 0) + 1);
    });

    for (let i = 27; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateKey = getLocalDateKey(d);
      const count = workoutDatesMap.get(dateKey) || 0;
      const isToday = i === 0;

      list.push({
        date: d,
        dateKey,
        dayNumber: d.getDate(),
        count,
        isToday,
      });
    }

    return list;
  }, [history]);

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3.5 space-y-3 shadow-sm">
      {/* 1. Ukesmål Fremdriftslinje */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-zinc-300 flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-amber-400" />
            Ukesmål: {weeklyStats.count} av {weeklyGoal} økter
          </span>
          <span
            className={`font-mono font-bold text-[11px] ${
              weeklyStats.isGoalReached ? 'text-emerald-400' : 'text-zinc-400'
            }`}
          >
            {weeklyStats.progress}%
          </span>
        </div>

        <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden border border-zinc-800/80">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              weeklyStats.isGoalReached
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-sm shadow-emerald-500/50'
                : 'bg-gradient-to-r from-emerald-600 to-amber-500'
            }`}
            style={{ width: `${weeklyStats.progress}%` }}
          />
        </div>
      </div>

      {/* 2. Heatmap Siste 4 uker (28 dager) */}
      <div className="space-y-1.5 pt-1 border-t border-zinc-800/60">
        <div className="flex items-center justify-between text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
          <span className="flex items-center gap-1">
            <CalendarIcon className="w-3 h-3 text-zinc-500" />
            Aktivitets-heatmap (siste 4 uker)
          </span>
          <span className="text-[9px] text-zinc-500">Mørkere = Flere økter</span>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {days.map((d) => {
            const hasWorkout = d.count > 0;
            return (
              <div
                key={d.dateKey}
                title={`${d.date.toLocaleDateString('nb-NO')}: ${d.count} ${d.count === 1 ? 'økt' : 'økter'}`}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center text-[9px] font-mono font-bold transition-all relative ${
                  hasWorkout
                    ? d.count > 1
                      ? 'bg-emerald-500 text-zinc-950 shadow-sm shadow-emerald-500/30'
                      : 'bg-emerald-600/90 text-white'
                    : 'bg-zinc-950/80 text-zinc-600 border border-zinc-800/60'
                } ${d.isToday ? 'ring-2 ring-emerald-400 ring-offset-1 ring-offset-zinc-900' : ''}`}
              >
                <span>{d.dayNumber}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { WorkoutTemplate } from '../../types/workout';
import { Trophy, RotateCcw, Flame, CheckCircle2 } from 'lucide-react';

interface WorkoutSummaryProps {
  workout: WorkoutTemplate;
  totalElapsedSeconds: number;
  onRestart: () => void;
}

export const WorkoutSummary: React.FC<WorkoutSummaryProps> = ({
  workout,
  totalElapsedSeconds,
  onRestart,
}) => {
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins} min ${secs} sek`;
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto h-full space-y-8 animate-in fade-in zoom-in duration-300">
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/30">
          <Trophy className="w-12 h-12" />
        </div>
        <div className="absolute -bottom-2 -right-2 bg-zinc-900 border border-emerald-500 rounded-full p-1 text-emerald-400">
          <CheckCircle2 className="w-6 h-6" />
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-black tracking-tight text-white">
          Bravo! Økt fullført!
        </h1>
        <p className="text-zinc-400 text-sm">
          Du gjennomførte <strong className="text-zinc-200">{workout.name}</strong> med glans.
        </p>
      </div>

      {/* Oppsummeringskort */}
      <div className="grid grid-cols-2 gap-3 w-full">
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex flex-col items-center">
          <span className="text-xs uppercase tracking-wider text-zinc-400 font-medium">Tid brukt</span>
          <span className="text-xl font-bold text-white mt-1">{formatTime(totalElapsedSeconds)}</span>
        </div>
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex flex-col items-center">
          <span className="text-xs uppercase tracking-wider text-zinc-400 font-medium">Runder</span>
          <span className="text-xl font-bold text-emerald-400 mt-1">{workout.rounds} runder</span>
        </div>
      </div>

      {/* Øvelsesliste */}
      <div className="w-full bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 text-left">
        <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-3 flex items-center gap-2">
          <Flame className="w-4 h-4 text-amber-400" />
          Gjennomførte øvelser ({workout.items.length})
        </h3>
        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
          {workout.items.map((item, idx) => (
            <div key={item.id} className="flex justify-between items-center text-sm py-1 border-b border-zinc-800/50 last:border-0">
              <span className="text-zinc-300 font-medium">{idx + 1}. {item.exercise.name}</span>
              <span className="text-xs text-zinc-400 font-mono">{item.workDurationSeconds}s</span>
            </div>
          ))}
        </div>
      </div>

      {/* Start på nytt knapp */}
      <button
        onClick={onRestart}
        className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-3 text-lg"
      >
        <RotateCcw className="w-6 h-6" />
        Start ny økt
      </button>
    </div>
  );
};

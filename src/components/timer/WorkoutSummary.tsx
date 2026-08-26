import React, { useState, useEffect } from 'react';
import { WorkoutTemplate } from '../../types/workout';
import { useAuth } from '../../contexts/AuthContext';
import { updateWorkoutRating } from '../../services/firestoreService';
import { savePersonalRecord } from '../../services/personalRecordService';
import { recordWorkoutTelemetry } from '../../services/telemetryService';
import { Trophy, RotateCcw, Flame, CheckCircle2, ThumbsUp, Smile, Flame as FireIcon, Medal } from 'lucide-react';

interface WorkoutSummaryProps {
  workout: WorkoutTemplate;
  totalElapsedSeconds: number;
  workoutLogId?: string;
  onRestart: () => void;
}

export const WorkoutSummary: React.FC<WorkoutSummaryProps> = ({
  workout,
  totalElapsedSeconds,
  workoutLogId,
  onRestart,
}) => {
  const { user } = useAuth();
  const [selectedRating, setSelectedRating] = useState<'for_lett' | 'passe' | 'for_tungt' | null>(null);
  const [prStatus, setPrStatus] = useState<{ isNewPr: boolean; previousBest: number } | null>(null);

  // Send anonym telemetri og sjekk PR ved fullføring
  useEffect(() => {
    recordWorkoutTelemetry(workout, totalElapsedSeconds);

    if (workout.items.length === 1 && totalElapsedSeconds > 5) {
      const ex = workout.items[0].exercise;
      savePersonalRecord(user?.uid, ex.id, ex.name, totalElapsedSeconds).then((res) => {
        if (res.isNewPr) {
          setPrStatus(res);
        }
      });
    }
  }, [workout, totalElapsedSeconds, user]);

  const handleRate = async (rating: 'for_lett' | 'passe' | 'for_tungt') => {
    setSelectedRating(rating);
    recordWorkoutTelemetry(workout, totalElapsedSeconds, rating);
    if (workoutLogId) {
      await updateWorkoutRating(user?.uid, workoutLogId, rating);
    }
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins} min ${secs} sek`;
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 sm:p-6 text-center max-w-md mx-auto h-full space-y-4 sm:space-y-6 overflow-y-auto animate-in fade-in zoom-in duration-300">
      <div className="relative">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/30">
          <Trophy className="w-10 h-10 sm:w-12 sm:h-12" />
        </div>
        <div className="absolute -bottom-1 -right-1 bg-zinc-900 border border-emerald-500 rounded-full p-1 text-emerald-400">
          <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
      </div>

      {prStatus?.isNewPr && (
        <div className="w-full py-2.5 px-4 rounded-2xl bg-amber-500/20 border border-amber-500/60 text-amber-300 flex items-center justify-center gap-2 font-black text-sm animate-bounce shadow-md">
          <Medal className="w-5 h-5 text-amber-400 fill-current" />
          <span>🎉 NY PERSONLIG REKORD (PR)!</span>
        </div>
      )}

      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
          Bravo! Økt fullført!
        </h1>
        <p className="text-zinc-400 text-xs sm:text-sm">
          Du gjennomførte <strong className="text-zinc-200">{workout.name}</strong> med glans.
        </p>
      </div>

      {/* Oppsummeringskort */}
      <div className="grid grid-cols-2 gap-2.5 w-full">
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3 sm:p-4 flex flex-col items-center">
          <span className="text-[10px] sm:text-xs uppercase tracking-wider text-zinc-400 font-medium">Tid brukt</span>
          <span className="text-lg sm:text-xl font-bold text-white mt-0.5">{formatTime(totalElapsedSeconds)}</span>
        </div>
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3 sm:p-4 flex flex-col items-center">
          <span className="text-[10px] sm:text-xs uppercase tracking-wider text-zinc-400 font-medium">Runder</span>
          <span className="text-lg sm:text-xl font-bold text-emerald-400 mt-0.5">{workout.rounds} {workout.rounds === 1 ? 'runde' : 'runder'}</span>
        </div>
      </div>

      {/* Mestringsevaluering (Oppgave 3: For lett / Passe / For tungt) */}
      <div className="w-full bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3.5 space-y-2 text-left">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase font-bold text-zinc-300 tracking-wider">
            Hvordan føltes økten?
          </span>
          {selectedRating && (
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800/60">
              Registrert!
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleRate('for_lett')}
            className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 border ${
              selectedRating === 'for_lett'
                ? 'bg-blue-950/80 border-blue-500 text-blue-300 shadow-sm'
                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Smile className="w-4 h-4 text-blue-400" />
            <span>For lett</span>
          </button>

          <button
            onClick={() => handleRate('passe')}
            className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 border ${
              selectedRating === 'passe'
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-sm'
                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <ThumbsUp className="w-4 h-4 text-emerald-400" />
            <span>Passe</span>
          </button>

          <button
            onClick={() => handleRate('for_tungt')}
            className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 border ${
              selectedRating === 'for_tungt'
                ? 'bg-amber-950/80 border-amber-500 text-amber-300 shadow-sm'
                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <FireIcon className="w-4 h-4 text-amber-400" />
            <span>For tungt</span>
          </button>
        </div>
      </div>

      {/* Øvelsesliste */}
      <div className="w-full bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-3 text-left">
        <h3 className="text-[10px] sm:text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-2 flex items-center gap-1.5">
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          Gjennomførte øvelser ({workout.items.length})
        </h3>
        <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
          {workout.items.map((item, idx) => (
            <div key={item.id} className="flex justify-between items-center text-xs py-0.5 border-b border-zinc-800/40 last:border-0">
              <span className="text-zinc-300 truncate pr-2">{idx + 1}. {item.exercise.name}</span>
              <span className="text-zinc-400 font-mono text-[11px] shrink-0">{item.workDurationSeconds}s</span>
            </div>
          ))}
        </div>
      </div>

      {/* Astrid AI Trener Feedback */}
      <div className="w-full bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-teal-950/40 border border-emerald-500/30 rounded-2xl p-3 text-left flex items-start gap-2.5">
        <div className="w-8 h-8 rounded-full bg-emerald-500/20 p-0.5 shrink-0 border border-emerald-500/40">
          <img
            src="/images/exercises/kneboy-0.png"
            alt="Astrid AI"
            className="w-full h-full object-cover rounded-full"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
          />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-xs font-bold text-emerald-400">Astrid • AI-Trener</span>
            <span className="text-[10px] px-1 bg-emerald-500/20 text-emerald-300 rounded font-semibold">Smart Coach</span>
          </div>
          <p className="text-xs text-zinc-300 leading-snug">
            {totalElapsedSeconds > 600
              ? 'Fantastisk innsats og solid utholdenhet! Husk å drikke litt vann og ta 2 minutter med rolig tøying nå.'
              : 'Kjapt, effektivt og godt levert! Kontinuitet er nøkkelen til langsiktig styrke og form.'}
          </p>
        </div>
      </div>

      {/* Start på nytt knapp */}
      <button
        onClick={onRestart}
        className="w-full py-3 sm:py-3.5 px-6 bg-emerald-500 hover:bg-emerald-400 active:scale-95 transition-all text-zinc-950 font-black rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 text-sm sm:text-base shrink-0"
      >
        <RotateCcw className="w-5 h-5" />
        Ferdig / Ny økt
      </button>
    </div>
  );
};

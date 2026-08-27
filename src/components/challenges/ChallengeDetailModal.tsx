import React, { useState, useEffect } from 'react';
import { ChallengeItem, ChallengeUserProgress } from '../../schemas/challengeSchema';
import { WorkoutTemplate } from '../../types/workout';
import {
  getChallengeProgress,
  completeChallengeDay,
  getActiveChallengeId,
  setActiveChallengeId,
} from '../../services/challengeService';
import {
  X,
  Play,
  Check,
  Coffee,
  Trophy,
  Star,
} from 'lucide-react';

interface ChallengeDetailModalProps {
  challenge: ChallengeItem;
  onClose: () => void;
  onStartWorkout: (workout: WorkoutTemplate, dayNumber: number) => void;
}

export const ChallengeDetailModal: React.FC<ChallengeDetailModalProps> = ({
  challenge,
  onClose,
  onStartWorkout,
}) => {
  const [progress, setProgress] = useState<ChallengeUserProgress>(() =>
    getChallengeProgress(challenge.id)
  );
  const [isActive, setIsActive] = useState<boolean>(
    () => getActiveChallengeId() === challenge.id
  );

  useEffect(() => {
    const handler = () => {
      setProgress(getChallengeProgress(challenge.id));
      setIsActive(getActiveChallengeId() === challenge.id);
    };
    window.addEventListener('challenge-progress-changed', handler);
    return () => window.removeEventListener('challenge-progress-changed', handler);
  }, [challenge.id]);

  const handleToggleActive = () => {
    if (isActive) {
      setActiveChallengeId(null);
      setIsActive(false);
    } else {
      setActiveChallengeId(challenge.id);
      setIsActive(true);
    }
  };

  const handleDayClick = (dayNum: number) => {
    const dayData = challenge.dailyWorkouts.find((d) => d.day === dayNum);
    if (!dayData) return;

    if (dayData.isRestDay) {
      completeChallengeDay(challenge.id, dayNum);
      return;
    }

    if (dayData.workout) {
      onStartWorkout(dayData.workout, dayNum);
      onClose();
    }
  };

  const completedCount = progress.completedDays.length;
  const progressPercent = Math.round((completedCount / challenge.durationDays) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg max-h-[92vh] bg-zinc-950 border border-zinc-800 rounded-3xl p-5 shadow-2xl flex flex-col overflow-hidden text-white space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-850 pb-3 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                {challenge.durationDays} dagers utfordring
              </span>
              <span className="text-[10px] font-bold text-zinc-400 capitalize">
                {challenge.category}
              </span>
            </div>
            <h2 className="text-xl font-black text-white">{challenge.title}</h2>
            <p className="text-xs text-zinc-400 leading-relaxed">{challenge.description}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Lukk"
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Aktiv toggle & Fremdriftsbar */}
        <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl space-y-2 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="text-xl">{challenge.badgeReward.icon}</div>
              <div>
                <p className="text-xs font-bold text-white">
                  Fullført: <strong>{completedCount}</strong> / {challenge.durationDays} dager
                </p>
                <p className="text-[10px] text-zinc-400">
                  Premie: <span className="text-emerald-400 font-bold">{challenge.badgeReward.name}</span>
                </p>
              </div>
            </div>
            <button
              onClick={handleToggleActive}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                isActive
                  ? 'bg-amber-500 text-zinc-950 font-black shadow-md'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${isActive ? 'fill-current' : ''}`} />
              {isActive ? 'Aktiv på Hjem' : 'Sett som aktiv'}
            </button>
          </div>

          <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Faser */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 shrink-0">
          {challenge.phases.map((phase) => {
            const isCurrentPhase =
              progress.currentDay >= phase.dayRange[0] &&
              progress.currentDay <= phase.dayRange[1];
            return (
              <div
                key={phase.name}
                className={`p-2 rounded-xl border text-[10px] ${
                  isCurrentPhase
                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                    : 'bg-zinc-900/40 border-zinc-850 text-zinc-400'
                }`}
              >
                <p className="font-bold truncate">{phase.name}</p>
                <p className="text-[9px] text-zinc-500">
                  Dag {phase.dayRange[0]}–{phase.dayRange[1]}
                </p>
              </div>
            );
          })}
        </div>

        {/* 28/30-Dagers Interaktivt Rutenett */}
        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
            Dagsrutenett (Trykk for å starte dag)
          </span>
          <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 pt-1">
            {challenge.dailyWorkouts.map((dayData) => {
              const isCompleted = progress.completedDays.includes(dayData.day);
              const isCurrent = progress.currentDay === dayData.day && !isCompleted;
              const isRest = dayData.isRestDay;

              return (
                <button
                  key={dayData.day}
                  type="button"
                  onClick={() => handleDayClick(dayData.day)}
                  className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all active:scale-95 text-center ${
                    isCompleted
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-400 shadow-sm'
                      : isCurrent
                      ? 'bg-emerald-500 text-zinc-950 font-black border-white shadow-lg ring-2 ring-emerald-400/50'
                      : isRest
                      ? 'bg-zinc-900/40 border-zinc-850 text-amber-300/70 hover:bg-zinc-800'
                      : 'bg-zinc-900/80 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800'
                  }`}
                >
                  <span className={`text-[10px] font-black ${isCurrent ? 'text-zinc-950' : 'text-zinc-400'}`}>
                    Dag {dayData.day}
                  </span>

                  {isCompleted ? (
                    <Check className="w-4 h-4 stroke-[3]" />
                  ) : isRest ? (
                    <Coffee className="w-4 h-4 text-amber-400" />
                  ) : isCurrent ? (
                    <Play className="w-4 h-4 fill-current animate-pulse" />
                  ) : (
                    <span className="text-[10px] font-mono font-bold">{dayData.title.replace('Planke ', '').replace(' Push-ups', '').replace(' Knebøy', '')}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dagens Hurtigknapp */}
        <div className="pt-2 border-t border-zinc-850 shrink-0">
          {progress.isCompleted ? (
            <div className="p-3 bg-emerald-950/90 border border-emerald-500 rounded-2xl flex items-center justify-center gap-2 text-emerald-300 font-bold text-sm">
              <Trophy className="w-5 h-5 text-amber-400" />
              Gratulerer! Du har fullført hele utfordringen!
            </div>
          ) : (
            <button
              onClick={() => handleDayClick(progress.currentDay)}
              className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-zinc-950 font-black rounded-2xl shadow-lg shadow-emerald-950 flex items-center justify-center gap-2 text-sm transition-all"
            >
              <Play className="w-4 h-4 fill-current" />
              Start Dag {progress.currentDay} ({challenge.dailyWorkouts[progress.currentDay - 1]?.title || 'Økt'})
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

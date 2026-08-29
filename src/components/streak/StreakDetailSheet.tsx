import React, { useState } from 'react';
import { X, Flame, Trophy, Shield, Target, Milestone } from 'lucide-react';
import { WEEK_STREAK_MILESTONES, WeekStreakResult } from '../../services/streakService';
import { getWeeklyGoal, setWeeklyGoal } from '../../services/weeklyGoalService';

interface StreakDetailSheetProps {
  streak: WeekStreakResult;
  onClose: () => void;
}

/** «4 uker» / «1 uke» — tallene genereres alltid fra WeekStreakResult (aldri antatt vekst/stillstand). */
function formatWeeks(n: number): string {
  return `${n} ${n === 1 ? 'uke' : 'uker'}`;
}

/**
 * Detaljark for uke-streaken (spec § 2.2): nåværende serie, beste serie,
 * slinguke-status, neste milepæl og ukesmål-justering (flyttet frem fra
 * innstillinger). Støttende tone — fremover-rettet, aldri anklagende.
 *
 * Slinguke-status vises fra resultatet SOM DET ER: banken opptjenes først når
 * uka er avsluttet (mandag), så arket lover aldri «1 på lager» basert på
 * inneværende ukes fullføring.
 */
export const StreakDetailSheet: React.FC<StreakDetailSheetProps> = ({ streak, onClose }) => {
  const [weeklyGoal, setWeeklyGoalState] = useState<number>(() => getWeeklyGoal());
  const [goalChanged, setGoalChanged] = useState(false);

  // WCAG: Lukk ved trykk på Escape-tast (samme mønster som ProfileOnboardingModal)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleUpdateWeeklyGoal = (val: number) => {
    const clamped = Math.max(1, Math.min(14, val));
    if (clamped === weeklyGoal) return;
    setWeeklyGoalState(clamped);
    setWeeklyGoal(clamped);
    setGoalChanged(true);
  };

  const nextMilestone = WEEK_STREAK_MILESTONES.find((m) => m > streak.currentWeeks);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Din streak"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-4 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Flame className="w-5 h-5" />
            </div>
            <h2 className="text-base font-black text-white">Din streak</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Lukk"
            className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Serie-status */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
            <Flame className="w-4 h-4 text-amber-400 shrink-0" />
            <p className="text-sm font-bold text-white">{`Nåværende serie: ${formatWeeks(streak.currentWeeks)}`}</p>
          </div>
          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
            <Trophy className="w-4 h-4 text-amber-300 shrink-0" />
            <p className="text-sm font-bold text-white">{`Beste serie: ${formatWeeks(streak.bestWeeks)}`}</p>
          </div>

          {/* Slinguke-status (fra resultatet som det er — opptjenes først når uka er omme) */}
          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
            <Shield className="w-4 h-4 text-blue-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-zinc-300">Slinguke</p>
              <p className="text-sm font-bold text-white">
                {streak.insuranceInBank === 1 ? '1 slinguke på lager' : 'Opptjenes etter 4 fulle uker'}
              </p>
            </div>
          </div>

          {/* Neste milepæl */}
          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
            <Milestone className="w-4 h-4 text-emerald-400 shrink-0" />
            <p className="text-sm font-bold text-white">
              {nextMilestone !== undefined ? `Neste milepæl: ${formatWeeks(nextMilestone)}` : 'Alle milepæler nådd'}
            </p>
          </div>
        </div>

        {/* Ukesmål-justering (flyttet frem fra innstillinger; samme stepper-mønster) */}
        <div className="flex items-center justify-between py-2 border-t border-zinc-800/80">
          <div className="flex items-center gap-2.5">
            <Target className="w-4 h-4 text-emerald-400" />
            <div>
              <p className="text-xs font-bold text-white">Ukesmål for trening</p>
              <p className="text-[10px] text-zinc-400">
                {goalChanged ? 'Gjelder fra neste uke' : 'Hvor mange økter du planlegger per uke'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-zinc-950 px-2 py-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => handleUpdateWeeklyGoal(weeklyGoal - 1)}
              aria-label="Reduser ukesmål"
              className="w-6 h-6 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-black text-sm flex items-center justify-center transition-all active:scale-95"
            >
              -
            </button>
            <span className="text-xs font-black text-white w-8 text-center">{weeklyGoal} økt</span>
            <button
              onClick={() => handleUpdateWeeklyGoal(weeklyGoal + 1)}
              aria-label="Øk ukesmål"
              className="w-6 h-6 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center justify-center transition-all active:scale-95"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
